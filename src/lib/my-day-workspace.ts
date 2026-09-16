export const MY_DAY_WIDGETS = [
  {
    id: "priorities",
    title: "Fila de prioridades",
    description: "Projetos, tarefas e compromissos que pedem ação primeiro.",
  },
  {
    id: "projects",
    title: "Projetos para acompanhar",
    description: "Projetos, riscos, etapas e prazos sob sua responsabilidade.",
  },
  {
    id: "insights",
    title: "Gráficos da carteira",
    description: "Distribuição por situação e pelas próximas etapas.",
  },
  {
    id: "agenda",
    title: "Minha agenda",
    description: "Tarefas pessoais e compromissos de CS/CX.",
  },
  {
    id: "conversion",
    title: "Pendências de conversão",
    description: "Pendências atribuídas a você na fila de conversão.",
  },
  {
    id: "shortcuts",
    title: "Acessos rápidos",
    description: "Atalhos personalizados para as telas liberadas.",
  },
  {
    id: "copilot",
    title: "Resumo do Copiloto",
    description: "Resumo diário e acesso à conversa com o Copiloto.",
  },
] as const;

export type MyDayWidgetId = (typeof MY_DAY_WIDGETS)[number]["id"];
export type MyDayDensity = "compact" | "comfortable";
export type MyDayWidgetWidth = "half" | "full";
export type MyDayWidgetLayout = Record<MyDayWidgetId, MyDayWidgetWidth>;
export type MyDayTaskPriority = "low" | "medium" | "high" | "critical";
export type MyDayTaskStatus = "pending" | "completed";
export type MyDayTaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export interface MyDayTask {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  priority: MyDayTaskPriority;
  status: MyDayTaskStatus;
  linkedPath: string | null;
  recurrence: MyDayTaskRecurrence;
  reminderMinutes: number | null;
  snoozedUntil: Date | null;
  recurrenceParentId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MyDayTaskInput {
  title: string;
  description?: string | null;
  dueAt: Date;
  priority: MyDayTaskPriority;
  linkedPath?: string | null;
  recurrence: MyDayTaskRecurrence;
  reminderMinutes?: number | null;
}

export interface MyDayPreferences {
  density: MyDayDensity;
  widgetOrder: MyDayWidgetId[];
  hiddenWidgets: MyDayWidgetId[];
  widgetLayout: MyDayWidgetLayout;
  quickLinks: string[] | null;
  notificationsEnabled: boolean;
}

export const DEFAULT_MY_DAY_WIDGET_ORDER: MyDayWidgetId[] = [
  "priorities",
  "agenda",
  "insights",
  "projects",
  "shortcuts",
  "conversion",
  "copilot",
];

export const DEFAULT_MY_DAY_WIDGET_LAYOUT: MyDayWidgetLayout = {
  priorities: "full",
  agenda: "half",
  insights: "half",
  projects: "full",
  shortcuts: "full",
  conversion: "full",
  copilot: "full",
};

export const DEFAULT_MY_DAY_PREFERENCES: MyDayPreferences = {
  density: "compact",
  widgetOrder: DEFAULT_MY_DAY_WIDGET_ORDER,
  hiddenWidgets: [],
  widgetLayout: DEFAULT_MY_DAY_WIDGET_LAYOUT,
  quickLinks: null,
  notificationsEnabled: false,
};

const WIDGET_IDS = new Set<MyDayWidgetId>(DEFAULT_MY_DAY_WIDGET_ORDER);

function isWidgetId(value: string): value is MyDayWidgetId {
  return WIDGET_IDS.has(value as MyDayWidgetId);
}

export function normalizeMyDayPreferences(
  value?: Partial<{
    density: string | null;
    widgetOrder: string[] | null;
    hiddenWidgets: string[] | null;
    widgetLayout: Record<string, string> | null;
    quickLinks: string[] | null;
    notificationsEnabled: boolean | null;
  }> | null,
): MyDayPreferences {
  const requestedOrder = (value?.widgetOrder ?? []).filter(isWidgetId);
  const widgetOrder = [
    ...new Set([...requestedOrder, ...DEFAULT_MY_DAY_WIDGET_ORDER]),
  ];
  const widgetLayout = Object.fromEntries(
    DEFAULT_MY_DAY_WIDGET_ORDER.map((widgetId) => {
      const requestedWidth = value?.widgetLayout?.[widgetId];
      return [
        widgetId,
        requestedWidth === "half" || requestedWidth === "full"
          ? requestedWidth
          : DEFAULT_MY_DAY_WIDGET_LAYOUT[widgetId],
      ];
    }),
  ) as MyDayWidgetLayout;

  return {
    density: value?.density === "comfortable" ? "comfortable" : "compact",
    widgetOrder,
    hiddenWidgets: [...new Set((value?.hiddenWidgets ?? []).filter(isWidgetId))],
    widgetLayout,
    quickLinks: value?.quickLinks === null || value?.quickLinks === undefined
      ? null
      : [...new Set(value.quickLinks.filter(Boolean))],
    notificationsEnabled: value?.notificationsEnabled === true,
  };
}

export function getMyDayTaskAttentionAt(task: MyDayTask) {
  if (task.snoozedUntil && task.snoozedUntil.getTime() > task.dueAt.getTime()) {
    return task.snoozedUntil;
  }
  return task.dueAt;
}

export function isMyDayTaskOverdue(task: MyDayTask, now = new Date()) {
  return task.status === "pending" && getMyDayTaskAttentionAt(task).getTime() < now.getTime();
}
