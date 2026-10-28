import { describe, it, expect } from "vitest";
import { ImplementationStageV2, ProjectV2 } from "@/types/ProjectV2";
import {
  buildProjectCalendarEvents,
  deriveTimelineMembers,
} from "@/lib/project-calendar-events";
import { transformToDB, transformToProjectV3 } from "@/utils/project-transformers";
import { CALENDAR_MEMBERS, getMemberShortName } from "@/types/calendar";
import { startOfDay, endOfDay } from "date-fns";

interface MockProjectOverrides extends Omit<Partial<ProjectV2>, "stages"> {
  implementation?: Partial<ImplementationStageV2>;
}

function createMockProject(overrides: MockProjectOverrides = {}): ProjectV2 {
  const now = new Date("2026-01-10T12:00:00Z");
  const { implementation, ...rest } = overrides;

  return {
    id: rest.id || "proj-guarulhos-01",
    clientName: rest.clientName || "1º Tabelião de Protesto de Letras e Títulos de Guarulhos",
    ticketNumber: rest.ticketNumber || "763001",
    systemType: rest.systemType || "Orion PRO",
    implantationType: "new",
    tags: [],
    priority: rest.priority || "normal",
    projectType: "new",
    healthScore: "ok",
    globalStatus: rest.globalStatus || "in-progress",
    overallProgress: 50,
    projectLeader: "Líder",
    createdAt: now,
    lastUpdatedAt: now,
    lastUpdatedBy: "Tester",
    isDeleted: rest.isDeleted ?? false,
    isArchived: rest.isArchived ?? false,
    soldHours: rest.soldHours ?? 40,
    specialty: rest.specialty ?? "Protesto",
    ...rest,
    stages: {
      infra: { status: "done" },
      adherence: {
        status: "done",
        responsible: "Ricardo Vieira",
        endDate: new Date("2026-01-05T12:00:00"),
        hasProductGap: false,
        analysisComplete: true,
      },
      environment: {
        status: "done",
        approvedByInfra: true,
        testAvailable: true,
      },
      conversion: {
        status: "done",
        homologationResponsible: "Rodrigo Brites",
        finishedAt: new Date("2026-01-08T12:00:00"),
      },
      implementation: {
        status: implementation?.status || "in-progress",
        responsible: implementation?.responsible || "Rodrigo Mizuno",
        observations: implementation?.observations,
        phase1: {
          status: "in-progress",
          responsible: "Rodrigo Mizuno",
          startDate: new Date("2026-10-26T12:00:00Z"),
          endDate: new Date("2026-11-06T12:00:00Z"),
          isConfirmed: true,
          additionalResponsibles: [
            {
              id: "assign-brites-01",
              responsible: "Rodrigo Brites",
              startDate: new Date("2026-11-02T12:00:00Z"),
              endDate: new Date("2026-11-06T12:00:00Z"),
              role: "Apoio",
            },
          ],
          ...implementation?.phase1,
        },
        phase2: {
          status: "todo",
          responsible: "",
          ...implementation?.phase2,
        },
      },
      post: {
        status: "todo",
        followupNeeded: false,
      },
    },
  };
}

describe("Múltiplos Responsáveis na Fase 1 e Sincronização com a Timeline", () => {
  const guarulhosProject = createMockProject();

  it("deve gerar eventos independentes na timeline para o titular e para o de apoio com suas próprias datas", () => {
    const events = buildProjectCalendarEvents([guarulhosProject]);

    // Deve gerar 2 eventos na timeline para o mesmo projeto (um na raia do Mizuno e outro na raia do Brites)
    expect(events).toHaveLength(2);

    // Evento do Titular (Rodrigo Mizuno)
    const mizunoEvent = events.find((e) => e.resourceId === "rodrigo-mizuno");
    expect(mizunoEvent).toBeDefined();
    expect(mizunoEvent?.resourceId).toBe("rodrigo-mizuno");
    expect(mizunoEvent?.isSupport).toBe(false);
    expect(mizunoEvent?.systemCategory).toBe("pro"); // DEVE ser 'pro' e NUNCA 'shared' (PRO+REG)
    expect(mizunoEvent?.start).toEqual(new Date("2026-10-26T12:00:00Z"));
    expect(mizunoEvent?.end).toEqual(new Date("2026-11-06T12:00:00Z"));
    expect(mizunoEvent?.clientName).toBe(guarulhosProject.clientName);
    expect(mizunoEvent?.ticketNumber).toBe("763001");
    expect(mizunoEvent?.allResponsibles).toContain("Rodrigo Mizuno");
    expect(mizunoEvent?.allResponsibles).toContain("Rodrigo Brites");

    // Evento do Apoio (Rodrigo Brites)
    const britesEvent = events.find((e) => e.resourceId === "rodrigo-brites");
    expect(britesEvent).toBeDefined();
    expect(britesEvent?.resourceId).toBe("rodrigo-brites");
    expect(britesEvent?.isSupport).toBe(true);
    expect(britesEvent?.systemCategory).toBe("pro"); // DEVE ser 'pro' (Orion PRO) e NUNCA 'shared' (PRO+REG)
    expect(britesEvent?.primaryResponsible).toBe("Rodrigo Mizuno");
    expect(britesEvent?.start).toEqual(new Date("2026-11-02T12:00:00Z"));
    expect(britesEvent?.end).toEqual(new Date("2026-11-06T12:00:00Z"));
    expect(britesEvent?.clientName).toBe(guarulhosProject.clientName);
    expect(britesEvent?.ticketNumber).toBe("763001");
  });

  it("deve mapear os membros de apoio corretamente em deriveTimelineMembers", () => {
    const events = buildProjectCalendarEvents([guarulhosProject]);
    const members = deriveTimelineMembers([guarulhosProject], events);
    const memberIds = members.map((m) => m.id);

    expect(memberIds).toContain("rodrigo-mizuno");
    expect(memberIds).toContain("rodrigo-brites");
  });

  it("deve isolar o conflito de férias por implantador e datas da sua alocação", () => {
    const events = buildProjectCalendarEvents([guarulhosProject]);
    const mizunoEvent = events.find((e) => e.resourceId === "rodrigo-mizuno")!;
    const britesEvent = events.find((e) => e.resourceId === "rodrigo-brites")!;

    expect(mizunoEvent).toBeDefined();
    expect(britesEvent).toBeDefined();

    // Função de verificação idêntica à do Calendar.tsx
    const checkConflict = (
      evt: typeof mizunoEvent,
      vacation: { resourceId: string; start: string; end: string }
    ) => {
      if (vacation.resourceId !== evt.resourceId) return false;
      const implStart = startOfDay(new Date(evt.start));
      const implEnd = endOfDay(new Date(evt.end));
      const vacStart = startOfDay(new Date(vacation.start + "T12:00:00"));
      const vacEnd = endOfDay(new Date(vacation.end + "T12:00:00"));
      return vacEnd >= implStart && vacStart <= implEnd;
    };

    // Cenário 1: Rodrigo Brites de férias na 1ª semana (26/10 a 30/10)
    // O apoio dele é só na 2ª semana (02/11 a 06/11) -> NÃO há conflito para Brites nem para Mizuno!
    const vacBritesW1 = {
      resourceId: "rodrigo-brites",
      start: "2026-10-26",
      end: "2026-10-30",
    };
    expect(checkConflict(britesEvent, vacBritesW1)).toBe(false);
    expect(checkConflict(mizunoEvent, vacBritesW1)).toBe(false);

    // Cenário 2: Rodrigo Brites de férias na 2ª semana (02/11 a 06/11)
    // Conflita com a atuação do Brites, mas NÃO afeta o evento do Mizuno!
    const vacBritesW2 = {
      resourceId: "rodrigo-brites",
      start: "2026-11-02",
      end: "2026-11-06",
    };
    expect(checkConflict(britesEvent, vacBritesW2)).toBe(true);
    expect(checkConflict(mizunoEvent, vacBritesW2)).toBe(false);
  });

  it("deve serializar e desserializar additionalResponsibles no transformer de banco", () => {
    const dbPayload = transformToDB(guarulhosProject);
    const p1Raw = dbPayload.implementation_phase1 as any;

    expect(p1Raw).toBeDefined();
    expect(p1Raw.additionalResponsibles).toHaveLength(1);
    expect(p1Raw.additionalResponsibles[0].responsible).toBe("Rodrigo Brites");

    // Reversão
    const transformed = transformToProjectV3({
      id: "proj-guarulhos-01",
      client_name: "1º Tabelião de Protesto de Letras e Títulos de Guarulhos",
      system_type: "Orion PRO",
      ticket_number: "763001",
      global_status: "in-progress",
      implementation_phase1: p1Raw,
    } as any);

    const reloadedAdditionals =
      transformed.stages?.implementation?.phase1?.additionalResponsibles;
    expect(reloadedAdditionals).toHaveLength(1);
    expect(reloadedAdditionals?.[0].responsible).toBe("Rodrigo Brites");
    expect(reloadedAdditionals?.[0].startDate).toBeInstanceOf(Date);
    expect(reloadedAdditionals?.[0].endDate).toBeInstanceOf(Date);
  });

  it("deve identificar os implantadores pelo padrão falado 'viva voz' (Mizuno e Brites)", () => {
    expect(getMemberShortName("Rodrigo Mizuno")).toBe("Mizuno");
    expect(getMemberShortName("Rodrigo Brites")).toBe("Brites");
    expect(getMemberShortName("Julio Araujo")).toBe("Julio");
    expect(getMemberShortName("Ricardo Vieira")).toBe("Ricardo");
    expect(getMemberShortName("Erik Marques")).toBe("Erik");

    const mizunoMember = CALENDAR_MEMBERS.find((m) => m.id === "rodrigo-mizuno");
    const britesMember = CALENDAR_MEMBERS.find((m) => m.id === "rodrigo-brites");
    expect(mizunoMember?.shortName).toBe("Mizuno");
    expect(britesMember?.shortName).toBe("Brites");
  });
});
