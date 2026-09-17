import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import type {
  MyDayAgendaEvent,
  MyDayAgendaEventSource,
} from "@/lib/my-day-agenda";
import type { MyDayTask } from "@/lib/my-day-workspace";

export type MyDayBoardCardPriority = "low" | "medium" | "high" | "critical";

export interface MyDayBoard {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MyDayBoardColumn {
  id: string;
  boardId: string;
  title: string;
  color: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MyDayBoardChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface MyDayBoardCard {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: MyDayBoardCardPriority;
  dueAt: Date | null;
  labels: string[];
  checklist: MyDayBoardChecklistItem[];
  linkedPath: string | null;
  position: number;
  archivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MyDayBoardCardInput {
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  priority: MyDayBoardCardPriority;
  dueAt?: Date | null;
  labels?: string[];
  checklist?: MyDayBoardChecklistItem[];
  linkedPath?: string | null;
}

export type MyDayBoardInboxSource =
  | "personal"
  | Exclude<MyDayAgendaEventSource, "board">;

export interface MyDayBoardInboxItem {
  id: string;
  source: MyDayBoardInboxSource;
  sourceId: string;
  sourceLabel: string;
  title: string;
  context: string;
  description: string | null;
  dueAt: Date;
  priority: MyDayBoardCardPriority;
  path: string;
  allDay: boolean;
  isOverdue: boolean;
}

const MY_DAY_BOARD_SOURCE_PARAM = "myDaySource";

export const MY_DAY_BOARD_COLORS = [
  "#e11d48",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#64748b",
] as const;

export const MY_DAY_BOARD_PRIORITY_LABELS: Record<MyDayBoardCardPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export function calculateBoardPosition(
  previous?: number | null,
  next?: number | null,
) {
  if (previous == null && next == null) return 1024;
  if (previous == null) return (next as number) - 1024;
  if (next == null) return previous + 1024;
  return (previous + next) / 2;
}

export function getDefaultMyDayBoard(boards: MyDayBoard[]) {
  return boards.find((board) => board.isDefault) ?? boards[0] ?? null;
}

export function isMyDayBoardCardCompleted(
  card: MyDayBoardCard,
  columns: MyDayBoardColumn[],
) {
  if (card.completedAt) return true;
  const column = columns.find((item) => item.id === card.columnId);
  return Boolean(column && /conclu|finaliz|feito|done/i.test(column.title));
}

export function getMyDayBoardInboxSourceKey(
  source: MyDayBoardInboxSource,
  sourceId: string,
) {
  return `${source}:${sourceId}`;
}

export function buildMyDayBoardLinkedPath(
  path: string | null | undefined,
  source: MyDayBoardInboxSource,
  sourceId: string,
) {
  const fallbackPath = source === "personal" ? "/meu-dia" : "/calendar";

  try {
    const url = new URL(path || fallbackPath, "https://siplan.local");
    url.searchParams.set(
      MY_DAY_BOARD_SOURCE_PARAM,
      getMyDayBoardInboxSourceKey(source, sourceId),
    );
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return `${fallbackPath}?${MY_DAY_BOARD_SOURCE_PARAM}=${encodeURIComponent(
      getMyDayBoardInboxSourceKey(source, sourceId),
    )}`;
  }
}

export function getMyDayBoardInboxSourceKeyFromPath(
  path: string | null | undefined,
) {
  if (!path) return null;

  try {
    return new URL(path, "https://siplan.local").searchParams.get(
      MY_DAY_BOARD_SOURCE_PARAM,
    );
  } catch {
    return null;
  }
}

function isCompletedAgendaEvent(event: MyDayAgendaEvent) {
  return /complet|conclu|finaliz|cancel/i.test(event.status);
}

export function buildMyDayBoardInboxItems(
  tasks: MyDayTask[],
  events: MyDayAgendaEvent[],
  cards: MyDayBoardCard[],
  now = new Date(),
) {
  const linkedSourceKeys = new Set(
    cards
      .map((card) => getMyDayBoardInboxSourceKeyFromPath(card.linkedPath))
      .filter((key): key is string => Boolean(key)),
  );
  const rangeStart = startOfDay(subDays(now, 30)).getTime();
  const rangeEnd = endOfDay(addDays(now, 7)).getTime();

  const taskItems: MyDayBoardInboxItem[] = tasks
    .filter((task) => task.status === "pending")
    .filter(
      (task) =>
        task.dueAt.getTime() >= rangeStart && task.dueAt.getTime() <= rangeEnd,
    )
    .map((task) => ({
      id: `agenda-personal-${task.id}`,
      source: "personal",
      sourceId: task.id,
      sourceLabel: "Pessoal",
      title: task.title,
      context: "Minha agenda",
      description: task.description,
      dueAt: task.dueAt,
      priority: task.priority,
      path: task.linkedPath || "/meu-dia",
      allDay: false,
      isOverdue: task.dueAt.getTime() < now.getTime(),
    }));

  const eventItems: MyDayBoardInboxItem[] = events
    .filter(
      (event): event is MyDayAgendaEvent & {
        source: Exclude<MyDayAgendaEventSource, "board">;
      } => event.source !== "board",
    )
    .filter((event) => !isCompletedAgendaEvent(event))
    .filter(
      (event) =>
        event.startsAt.getTime() >= rangeStart &&
        event.startsAt.getTime() <= rangeEnd,
    )
    .map((event) => ({
      id: `agenda-${event.source}-${event.id}`,
      source: event.source,
      sourceId: event.id,
      sourceLabel: event.sourceLabel,
      title: event.title,
      context: event.context,
      description: event.context,
      dueAt: event.startsAt,
      priority: event.isOverdue ? "high" : "medium",
      path: event.path,
      allDay: event.allDay,
      isOverdue: event.isOverdue,
    }));

  return [...taskItems, ...eventItems]
    .filter(
      (item) =>
        !linkedSourceKeys.has(
          getMyDayBoardInboxSourceKey(item.source, item.sourceId),
        ),
    )
    .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())
    .slice(0, 50);
}

export function buildMyDayBoardCardInputFromInbox(
  item: MyDayBoardInboxItem,
  boardId: string,
  columnId: string,
): MyDayBoardCardInput {
  return {
    boardId,
    columnId,
    title: item.title,
    description: item.description,
    priority: item.priority,
    dueAt: item.dueAt,
    labels: ["Agenda", item.sourceLabel],
    checklist: [],
    linkedPath: buildMyDayBoardLinkedPath(
      item.path,
      item.source,
      item.sourceId,
    ),
  };
}

export function buildMyDayBoardAgendaEvents(
  cards: MyDayBoardCard[],
  boards: MyDayBoard[],
  columns: MyDayBoardColumn[],
  now = new Date(),
): MyDayAgendaEvent[] {
  return cards
    .filter(
      (card) =>
        !card.archivedAt &&
        card.dueAt &&
        !getMyDayBoardInboxSourceKeyFromPath(card.linkedPath),
    )
    .map((card) => {
      const dueAt = card.dueAt as Date;
      const board = boards.find((item) => item.id === card.boardId);
      const column = columns.find((item) => item.id === card.columnId);
      const completed = isMyDayBoardCardCompleted(card, columns);

      return {
        id: `board-${card.id}`,
        title: card.title,
        startsAt: startOfDay(dueAt),
        endsAt: endOfDay(dueAt),
        status: completed ? "completed" : "pending",
        context: [board?.name, column?.title].filter(Boolean).join(" · ") || "Meu Quadro",
        source: "board" as const,
        sourceLabel: "Meu Quadro",
        path: `/meu-dia/quadro?board=${card.boardId}&card=${card.id}`,
        isOverdue: !completed && endOfDay(dueAt).getTime() < now.getTime(),
        allDay: true,
      };
    })
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}
