import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { isActiveProject, normalizeAssignment } from "@/lib/my-day";
import { buildProjectCalendarEvents } from "@/lib/project-calendar-events";
import type { ProjectV2 } from "@/types/ProjectV2";
import type { CalendarEvent } from "@/types/calendar";

export type MyDayAgendaEventSource = "cs_cx" | "implementation" | "board";

export interface MyDayAgendaEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  context: string;
  source: MyDayAgendaEventSource;
  sourceLabel: string;
  path: string;
  isOverdue: boolean;
  allDay: boolean;
  projectId?: string;
  eventType?: CalendarEvent["type"];
}

const IMPLEMENTATION_EVENT_LABELS: Partial<Record<CalendarEvent["type"], string>> = {
  implementation: "Implantação",
  training: "Treinamento",
  adherence: "Aderência",
  homologation: "Homologação",
};

function responsibleMatchesIdentities(
  responsible: string | undefined,
  identities: Array<string | null | undefined>,
) {
  const normalizedResponsible = normalizeAssignment(responsible);
  if (!normalizedResponsible) return false;

  const normalizedIdentities = new Set(
    identities.map(normalizeAssignment).filter(Boolean),
  );
  if (normalizedIdentities.has(normalizedResponsible)) return true;

  return normalizedResponsible
    .split(/[,;/|]+/)
    .map((part) => part.trim())
    .some((part) => normalizedIdentities.has(part));
}

export function isMyDayAgendaEventOnDay(
  event: MyDayAgendaEvent,
  day: Date,
) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  return event.startsAt.getTime() <= dayEnd && event.endsAt.getTime() >= dayStart;
}

export function buildMyDayImplementationEvents(
  projects: ProjectV2[],
  identities: Array<string | null | undefined>,
  options?: {
    now?: Date;
    rangeStart?: Date;
    rangeEnd?: Date;
    projectPath?: (projectId: string) => string;
  },
): MyDayAgendaEvent[] {
  const now = options?.now ?? new Date();
  const rangeStart = options?.rangeStart ?? startOfDay(subDays(now, 30));
  const rangeEnd = options?.rangeEnd ?? endOfDay(addDays(now, 7));

  return buildProjectCalendarEvents(projects.filter(isActiveProject))
    .filter((event) =>
      responsibleMatchesIdentities(event.responsibleName, identities),
    )
    .filter(
      (event) =>
        event.end.getTime() >= rangeStart.getTime() &&
        event.start.getTime() <= rangeEnd.getTime(),
    )
    .map((event) => ({
      id: `implementation-${event.id}`,
      title: IMPLEMENTATION_EVENT_LABELS[event.type] ?? event.title,
      startsAt: event.start,
      endsAt: event.end,
      status: event.status ?? "confirmed",
      context: event.clientName ?? "Projeto de implantação",
      source: "implementation" as const,
      sourceLabel: "Implantação",
      path: event.projectId
        ? options?.projectPath?.(event.projectId) ?? "/calendar"
        : "/calendar",
      isOverdue:
        event.status !== "completed" && event.end.getTime() < now.getTime(),
      allDay: true,
      projectId: event.projectId,
      eventType: event.type,
    }))
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}
