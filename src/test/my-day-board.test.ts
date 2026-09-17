import { describe, expect, it } from "vitest";
import {
  buildMyDayBoardCardInputFromInbox,
  buildMyDayBoardAgendaEvents,
  buildMyDayBoardInboxItems,
  calculateBoardPosition,
  getDefaultMyDayBoard,
  isMyDayBoardCardCompleted,
  type MyDayBoard,
  type MyDayBoardCard,
  type MyDayBoardColumn,
} from "@/lib/my-day-board";
import type { MyDayAgendaEvent } from "@/lib/my-day-agenda";
import type { MyDayTask } from "@/lib/my-day-workspace";

const now = new Date("2026-09-17T12:00:00");

const boards: MyDayBoard[] = [
  {
    id: "board-1",
    name: "Planejamento",
    description: null,
    color: "#e11d48",
    isDefault: true,
    position: 1024,
    createdAt: now,
    updatedAt: now,
  },
];

const columns: MyDayBoardColumn[] = [
  {
    id: "doing",
    boardId: "board-1",
    title: "Em andamento",
    color: "#f59e0b",
    position: 1024,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "done",
    boardId: "board-1",
    title: "Concluído",
    color: "#10b981",
    position: 2048,
    createdAt: now,
    updatedAt: now,
  },
];

function card(overrides: Partial<MyDayBoardCard> = {}): MyDayBoardCard {
  return {
    id: "card-1",
    boardId: "board-1",
    columnId: "doing",
    title: "Preparar apresentação",
    description: null,
    priority: "high",
    dueAt: new Date("2026-09-16T12:00:00"),
    labels: [],
    checklist: [],
    linkedPath: null,
    position: 1024,
    archivedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Meu Quadro", () => {
  it("calcula posições sem renumerar todos os cartões", () => {
    expect(calculateBoardPosition()).toBe(1024);
    expect(calculateBoardPosition(null, 2048)).toBe(1024);
    expect(calculateBoardPosition(1024, null)).toBe(2048);
    expect(calculateBoardPosition(1024, 2048)).toBe(1536);
  });

  it("seleciona o quadro principal", () => {
    expect(getDefaultMyDayBoard(boards)?.id).toBe("board-1");
    expect(getDefaultMyDayBoard([{ ...boards[0], isDefault: false }])?.id).toBe("board-1");
  });

  it("considera concluído o cartão movido para uma coluna de conclusão", () => {
    expect(isMyDayBoardCardCompleted(card({ columnId: "done" }), columns)).toBe(true);
    expect(isMyDayBoardCardCompleted(card(), columns)).toBe(false);
  });

  it("integra somente cartões com prazo e mantém o link direto", () => {
    const events = buildMyDayBoardAgendaEvents(
      [card(), card({ id: "without-date", dueAt: null })],
      boards,
      columns,
      now,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({
      source: "board",
      sourceLabel: "Meu Quadro",
      isOverdue: true,
      path: "/meu-dia/quadro?board=board-1&card=card-1",
    }));
  });

  it("não mantém concluído como atrasado", () => {
    const [event] = buildMyDayBoardAgendaEvents(
      [card({ columnId: "done" })],
      boards,
      columns,
      now,
    );
    expect(event.status).toBe("completed");
    expect(event.isOverdue).toBe(false);
  });

  it("monta a entrada da agenda sem repetir itens já convertidos em cartão", () => {
    const task: MyDayTask = {
      id: "task-1",
      title: "Revisar pauta",
      description: "Conferir os tópicos",
      dueAt: new Date("2026-09-18T10:00:00"),
      priority: "high",
      status: "pending",
      linkedPath: null,
      recurrence: "none",
      reminderMinutes: null,
      snoozedUntil: null,
      recurrenceParentId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const appointment: MyDayAgendaEvent = {
      id: "appointment-1",
      title: "Reunião de acompanhamento",
      startsAt: new Date("2026-09-19T14:00:00"),
      endsAt: new Date("2026-09-19T15:00:00"),
      status: "AGENDADO",
      context: "Cartório Central",
      source: "cs_cx",
      sourceLabel: "CS/CX",
      path: "/cs-cx/agendamentos",
      isOverdue: false,
      allDay: false,
    };

    const initial = buildMyDayBoardInboxItems([task], [appointment], [], now);
    expect(initial.map((item) => item.source)).toEqual(["personal", "cs_cx"]);

    const linkedInput = buildMyDayBoardCardInputFromInbox(
      initial[0],
      "board-1",
      "doing",
    );
    const afterImport = buildMyDayBoardInboxItems(
      [task],
      [appointment],
      [card({ linkedPath: linkedInput.linkedPath ?? null })],
      now,
    );

    expect(linkedInput.labels).toEqual(["Agenda", "Pessoal"]);
    expect(linkedInput.linkedPath).toContain("myDaySource=personal%3Atask-1");
    expect(afterImport.map((item) => item.source)).toEqual(["cs_cx"]);
  });

  it("não duplica na agenda um cartão que veio da própria agenda", () => {
    const imported = card({
      linkedPath: "/cs-cx/agendamentos?myDaySource=cs_cx%3Aappointment-1",
    });

    expect(buildMyDayBoardAgendaEvents([imported], boards, columns, now)).toEqual([]);
  });
});
