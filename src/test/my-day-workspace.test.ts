import { describe, expect, it } from "vitest";
import {
  DEFAULT_MY_DAY_WIDGET_ORDER,
  isMyDayTaskOverdue,
  normalizeMyDayPreferences,
  type MyDayTask,
} from "@/lib/my-day-workspace";

describe("preferências e tarefas do Meu Dia", () => {
  it("normaliza a ordem e elimina widgets e atalhos inválidos ou duplicados", () => {
    const preferences = normalizeMyDayPreferences({
      density: "comfortable",
      widgetOrder: ["agenda", "agenda", "inexistente", "projects"],
      hiddenWidgets: ["copilot", "copilot", "inexistente"],
      widgetLayout: {
        agenda: "full",
        insights: "invalid",
      },
      quickLinks: ["/calendar", "/calendar", "/projects"],
    });

    expect(preferences.density).toBe("comfortable");
    expect(preferences.widgetOrder.slice(0, 2)).toEqual(["agenda", "projects"]);
    expect(preferences.widgetOrder).toHaveLength(DEFAULT_MY_DAY_WIDGET_ORDER.length);
    expect(preferences.hiddenWidgets).toEqual(["copilot"]);
    expect(preferences.widgetLayout.agenda).toBe("full");
    expect(preferences.widgetLayout.insights).toBe("half");
    expect(preferences.widgetLayout.board).toBe("full");
    expect(preferences.quickLinks).toEqual(["/calendar", "/projects"]);
  });

  it("mantém quickLinks nulo para representar os atalhos padrão do perfil", () => {
    const preferences = normalizeMyDayPreferences(null);

    expect(preferences.quickLinks).toBeNull();
    expect(preferences.widgetOrder.slice(0, 5)).toEqual([
      "priorities",
      "agenda",
      "board",
      "insights",
      "projects",
    ]);
    expect(preferences.widgetLayout).toEqual(
      expect.objectContaining({
        agenda: "half",
        board: "full",
        priorities: "full",
        insights: "half",
        projects: "full",
        shortcuts: "full",
      }),
    );
  });

  it("considera atrasada somente uma tarefa pendente com prazo vencido", () => {
    const task: MyDayTask = {
      id: "task-1",
      title: "Validar retorno",
      description: null,
      dueAt: new Date("2026-09-15T08:00:00"),
      priority: "high",
      status: "pending",
      linkedPath: null,
      recurrence: "none",
      reminderMinutes: null,
      snoozedUntil: null,
      recurrenceParentId: null,
      completedAt: null,
      createdAt: new Date("2026-09-14T08:00:00"),
      updatedAt: new Date("2026-09-14T08:00:00"),
    };

    expect(isMyDayTaskOverdue(task, new Date("2026-09-16T08:00:00"))).toBe(true);
    expect(
      isMyDayTaskOverdue({ ...task, status: "completed" }, new Date("2026-09-16T08:00:00")),
    ).toBe(false);
    expect(
      isMyDayTaskOverdue(
        { ...task, snoozedUntil: new Date("2026-09-16T09:00:00") },
        new Date("2026-09-16T08:00:00"),
      ),
    ).toBe(false);
  });
});
