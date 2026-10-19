import { startOfDay } from "date-fns";
import type { ProjectV2, StageStatus } from "@/types/ProjectV2";
import {
  CALENDAR_MEMBERS,
  type CalendarEvent,
  type CalendarMember,
  type CalendarSystemCategory,
  type UnscheduledPhase1Project,
} from "@/types/calendar";

export type { UnscheduledPhase1Project };

export const UNASSIGNED_CALENDAR_MEMBER: CalendarMember = {
  id: "a-definir",
  name: "Responsável a Definir",
  initials: "AD",
  role: "Aguardando Alocação",
  color: "bg-slate-500",
  defaultSystem: "Indefinido",
};

const MEMBER_ALIASES: Record<string, string> = {
  julio: "julio-araujo",
  "julio araujo": "julio-araujo",
  araujo: "julio-araujo",
  mizuno: "rodrigo-mizuno",
  "rodrigo mizuno": "rodrigo-mizuno",
  brites: "rodrigo-brites",
  "rodrigo brites": "rodrigo-brites",
  ricardo: "ricardo-vieira",
  vieira: "ricardo-vieira",
  "ricardo vieira": "ricardo-vieira",
  erik: "erik-marques",
  "erik marques": "erik-marques",
  marques: "erik-marques",
};

const EXCLUDED_TIMELINE_TOKENS = new Set([
  "bruno-matos",
  "luan-caldeira",
  "bruno matos",
  "luan caldeira",
  "bruno",
  "matos",
  "luan",
  "caldeira",
]);

const UNASSIGNED_TOKENS = new Set([
  "a definir",
  "adefinir",
  "indefinido",
  "sem responsavel",
  "nao definido",
  "n/a",
  "na",
  "none",
  "tbd",
  "-",
]);

export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isExcludedTimelineMember(
  idOrName: string | null | undefined
): boolean {
  const cleaned = (idOrName ?? "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = normalizeText(cleaned);
  if (!normalized) return false;
  if (EXCLUDED_TIMELINE_TOKENS.has(normalized)) return true;
  const slug = normalized.replace(/\s+/g, "-");
  if (EXCLUDED_TIMELINE_TOKENS.has(slug)) return true;
  if (
    normalized.includes("bruno matos") ||
    normalized.includes("luan caldeira") ||
    normalized.includes("bruno-matos") ||
    normalized.includes("luan-caldeira")
  ) {
    return true;
  }
  return false;
}

function getFallbackColor(name: string): string {
  const colors = [
    "bg-emerald-600",
    "bg-blue-600",
    "bg-rose-600",
    "bg-blue-700",
    "bg-teal-600",
  ];
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function buildInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "IM";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function slugifyMemberId(name: string): string {
  const normalized = normalizeText(name)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "implantador";
}

function matchSingleCalendarMember(rawToken: string): CalendarMember | null {
  const cleanedDisplay = rawToken
    .replace(/\(.*?\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = normalizeText(cleanedDisplay);

  if (
    !normalized ||
    UNASSIGNED_TOKENS.has(normalized) ||
    isExcludedTimelineMember(cleanedDisplay)
  ) {
    return null;
  }

  // 1. Direct alias lookup
  const aliasTargetId = MEMBER_ALIASES[normalized];
  if (aliasTargetId) {
    const foundByAlias = CALENDAR_MEMBERS.find((m) => m.id === aliasTargetId);
    if (foundByAlias) return foundByAlias;
  }

  // 2. Exact match by ID or normalized full name
  const exactMatch = CALENDAR_MEMBERS.find(
    (member) =>
      member.id === normalized || normalizeText(member.name) === normalized
  );
  if (exactMatch) return exactMatch;

  // 3. Token-level alias or surname match
  const tokenWords = normalized.split(" ").filter(Boolean);
  for (const word of tokenWords) {
    const wordAliasId = MEMBER_ALIASES[word];
    if (wordAliasId) {
      const foundByWordAlias = CALENDAR_MEMBERS.find(
        (m) => m.id === wordAliasId
      );
      if (foundByWordAlias) return foundByWordAlias;
    }
  }

  // 4. Partial name inclusion
  const partialMatches = CALENDAR_MEMBERS.filter((member) => {
    const normMember = normalizeText(member.name);
    const memberWords = normMember.split(" ");
    return (
      normMember.includes(normalized) ||
      normalized.includes(normMember) ||
      tokenWords.every((w) => memberWords.includes(w))
    );
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  // 5. Dynamic member fallback
  const id = slugifyMemberId(cleanedDisplay);
  if (isExcludedTimelineMember(id)) {
    return null;
  }

  return {
    id,
    name: cleanedDisplay,
    initials: buildInitials(cleanedDisplay),
    role: "Implantador",
    color: getFallbackColor(cleanedDisplay),
  };
}

function splitResponsibleTokens(responsibleRaw: string): string[] {
  return responsibleRaw
    .split(/(?:\s+e\s+|\s*[,/&+;]\s*)/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasOnlyExcludedMembers(
  responsibleRaw: string | null | undefined
): boolean {
  if (!responsibleRaw || !responsibleRaw.trim()) return false;
  const parts = splitResponsibleTokens(responsibleRaw);
  if (parts.length === 0) return false;
  return parts.every((part) => isExcludedTimelineMember(part));
}

export function resolveCalendarMembersForResponsible(
  responsibleRaw: string | null | undefined
): CalendarMember[] {
  if (!responsibleRaw || !responsibleRaw.trim()) {
    return [];
  }

  const parts = splitResponsibleTokens(responsibleRaw);
  const resolved: CalendarMember[] = [];
  const seenIds = new Set<string>();

  for (const part of parts) {
    if (isExcludedTimelineMember(part)) {
      continue;
    }
    const member = matchSingleCalendarMember(part);
    if (
      member &&
      !isExcludedTimelineMember(member.id) &&
      !isExcludedTimelineMember(member.name) &&
      !seenIds.has(member.id)
    ) {
      seenIds.add(member.id);
      resolved.push(member);
    }
  }

  return resolved;
}

function collectTextFromRichNode(node: unknown, chunks: string[]): void {
  if (!node) return;
  if (typeof node === "string") {
    chunks.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectTextFromRichNode(item, chunks);
    }
    return;
  }
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.text === "string") {
      chunks.push(record.text);
    }
    if (typeof record.content === "string") {
      chunks.push(record.content);
      chunks.push("\n");
    } else if (Array.isArray(record.content)) {
      collectTextFromRichNode(record.content, chunks);
      chunks.push("\n");
    }
    if (Array.isArray(record.children)) {
      collectTextFromRichNode(record.children, chunks);
      chunks.push("\n");
    }
    if (Array.isArray(record.blocks)) {
      collectTextFromRichNode(record.blocks, chunks);
      chunks.push("\n");
    }
    if (record.root && typeof record.root === "object") {
      collectTextFromRichNode(record.root, chunks);
    }
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function extractCleanObservations(
  raw: string | null | undefined
): { text: string; items: string[] } {
  if (!raw || !raw.trim()) {
    return { text: "", items: [] };
  }

  let workingText = raw.trim();

  // 1. Check if JSON (Tiptap / Lexical / RichContent blocks)
  if (
    (workingText.startsWith("{") && workingText.endsWith("}")) ||
    (workingText.startsWith("[") && workingText.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(workingText);
      const chunks: string[] = [];
      collectTextFromRichNode(parsed, chunks);
      const joined = chunks.join("");
      if (joined.trim()) {
        workingText = joined;
      }
    } catch {
      // Keep raw string if invalid JSON
    }
  }

  // 2. Strip HTML tags if present
  if (/<[a-z][\s\S]*>/i.test(workingText)) {
    workingText = workingText
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
    workingText = decodeHtmlEntities(workingText);
  }

  // Normalize lines
  const rawLines = workingText
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s•*\-–—]+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const items: string[] = [];
  const seen = new Set<string>();

  const pushItem = (value: string) => {
    const cleaned = value
      .replace(/^\(+|\)+$/g, "")
      .replace(/^[\s•*\-–—:;,.]+|[\s;:]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return;
    const key = normalizeText(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push(cleaned);
  };

  for (const line of rawLines) {
    const parentheticalMatches = Array.from(line.matchAll(/\(([^()]+)\)/g))
      .map((m) => m[1].trim())
      .filter((m) => m.length >= 2);

    if (parentheticalMatches.length > 0) {
      const outsideText = line
        .replace(/\([^()]+\)/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (outsideText) {
        outsideText
          .split(/\s*;\s*/)
          .filter(Boolean)
          .forEach(pushItem);
      }

      for (const match of parentheticalMatches) {
        pushItem(match);
      }
    } else {
      line
        .split(/\s*;\s*/)
        .filter(Boolean)
        .forEach(pushItem);
    }
  }

  const cleanText = rawLines.join("\n").trim();
  return {
    text: cleanText,
    items,
  };
}

export function classifySystemCategory(
  systemType: string | null | undefined,
  isShared?: boolean
): CalendarSystemCategory {
  if (isShared) {
    return "shared";
  }

  const normalized = normalizeText(systemType);
  if (!normalized) {
    return "other";
  }

  const hasReg =
    /\breg\b/.test(normalized) ||
    normalized.includes("orion reg") ||
    normalized.includes("registro");
  const hasPro =
    /\bpro\b/.test(normalized) ||
    normalized.includes("orion pro") ||
    normalized.includes("protesto");
  const hasTn =
    /\btn\b/.test(normalized) ||
    normalized.includes("orion tn") ||
    normalized.includes("notas") ||
    normalized.includes("modelo");

  if (hasReg && hasPro) {
    return "shared";
  }
  if (hasReg) {
    return "reg";
  }
  if (hasPro) {
    return "pro";
  }
  if (hasTn) {
    return "tn";
  }

  return "other";
}

function toLocalCalendarDate(
  value: Date | string | null | undefined
): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T12:00:00`)
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStageStatus(
  status: StageStatus | undefined
): "todo" | "in-progress" | "done" | "blocked" {
  if (status === "in-progress" || status === "done" || status === "blocked") {
    return status;
  }
  if (status === "waiting_adjustment") {
    return "in-progress";
  }
  return "todo";
}

function resolvePhase1ResponsibleRaw(project: ProjectV2): string {
  const phase1 = project.stages?.implementation?.phase1;
  return (
    phase1?.responsible?.trim() ||
    project.stages?.implementation?.responsible?.trim() ||
    ""
  );
}

export function buildProjectCalendarEvents(
  projects: ProjectV2[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  projects.forEach((project) => {
    if (!project || project.isDeleted) return;

    const phase1 = project.stages?.implementation?.phase1;
    const rawStart = toLocalCalendarDate(phase1?.startDate);
    const rawEnd = toLocalCalendarDate(phase1?.endDate);

    if (!rawStart && !rawEnd) {
      return;
    }

    const responsibleRaw = resolvePhase1ResponsibleRaw(project);
    if (hasOnlyExcludedMembers(responsibleRaw)) {
      return;
    }

    let startDate = rawStart ?? rawEnd!;
    let endDate = rawEnd ?? rawStart!;

    if (endDate.getTime() < startDate.getTime()) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const resolvedMembers =
      resolveCalendarMembersForResponsible(responsibleRaw);
    const members =
      resolvedMembers.length > 0
        ? resolvedMembers
        : [UNASSIGNED_CALENDAR_MEMBER];

    const isShared = members.length > 1;
    const allResponsibles = members.map((member) => member.name);
    const systemCategory = classifySystemCategory(project.systemType, isShared);
    const stageStatus = normalizeStageStatus(phase1?.status);
    const isConfirmed = Boolean(phase1?.isConfirmed);
    const eventStatus: CalendarEvent["status"] =
      stageStatus === "done"
        ? "completed"
        : isConfirmed
          ? "confirmed"
          : "planned";

    const rawObservations =
      phase1?.observations || project.stages?.implementation?.observations;
    const { text: cleanNotes, items: observationsList } =
      extractCleanObservations(rawObservations);

    const soldHours = project.soldHours ?? project.workHours;

    members.forEach((member) => {
      const eventId =
        members.length > 1
          ? `real-${project.id}-p1-${member.id}`
          : `real-${project.id}-p1`;

      events.push({
        id: eventId,
        resourceId: member.id,
        title: `Implantação: ${project.clientName}`,
        clientName: project.clientName,
        start: startDate,
        end: endDate,
        type: "implementation",
        status: eventStatus,
        projectId: project.id,
        responsibleName:
          resolvedMembers.length > 0
            ? allResponsibles.join(" & ")
            : member.name,
        notes: cleanNotes || undefined,
        color: member.color,
        ticketNumber: project.ticketNumber,
        systemType: project.systemType,
        systemCategory,
        allResponsibles,
        isShared,
        isConfirmed,
        stageStatus,
        observationsList,
        trainingLocation: phase1?.trainingLocation,
        soldHours,
        specialty: project.specialty,
      });
    });
  });

  return events;
}

export function extractUnscheduledPhase1Projects(
  projects: ProjectV2[]
): UnscheduledPhase1Project[] {
  const unscheduled: UnscheduledPhase1Project[] = [];

  projects.forEach((project) => {
    if (
      !project ||
      project.isDeleted ||
      project.isArchived ||
      project.globalStatus === "done" ||
      project.globalStatus === "archived"
    ) {
      return;
    }

    const phase1 = project.stages?.implementation?.phase1;
    if (phase1?.status === "done") {
      return;
    }

    const hasStart = Boolean(toLocalCalendarDate(phase1?.startDate));
    const hasEnd = Boolean(toLocalCalendarDate(phase1?.endDate));

    if (hasStart || hasEnd) {
      return;
    }

    const responsibleRaw = resolvePhase1ResponsibleRaw(project);
    if (hasOnlyExcludedMembers(responsibleRaw)) {
      return;
    }

    const resolvedMembers =
      resolveCalendarMembersForResponsible(responsibleRaw);
    const isShared = resolvedMembers.length > 1;
    const allResponsibles = resolvedMembers.map((m) => m.name);
    const systemCategory = classifySystemCategory(project.systemType, isShared);
    const stageStatus = normalizeStageStatus(phase1?.status);
    const rawObservations =
      phase1?.observations || project.stages?.implementation?.observations;
    const { text: cleanObservations, items: observationsList } =
      extractCleanObservations(rawObservations);

    unscheduled.push({
      project,
      projectId: project.id,
      clientName: project.clientName,
      ticketNumber: project.ticketNumber,
      systemType: project.systemType,
      systemCategory,
      specialty: project.specialty,
      soldHours: project.soldHours ?? project.workHours,
      responsibleRaw,
      resolvedMembers,
      allResponsibles,
      isShared,
      isConfirmed: Boolean(phase1?.isConfirmed),
      stageStatus,
      cleanObservations,
      observationsList,
      trainingLocation: phase1?.trainingLocation,
      priority: project.priority,
      globalStatus: project.globalStatus,
    });
  });

  return unscheduled;
}

export function deriveTimelineMembers(
  projects: ProjectV2[],
  events: CalendarEvent[]
): CalendarMember[] {
  const memberMap = new Map<string, CalendarMember>();

  for (const member of CALENDAR_MEMBERS) {
    if (
      !isExcludedTimelineMember(member.id) &&
      !isExcludedTimelineMember(member.name)
    ) {
      memberMap.set(member.id, member);
    }
  }

  for (const project of projects) {
    if (!project || project.isDeleted) continue;
    const responsibleRaw = resolvePhase1ResponsibleRaw(project);
    if (!responsibleRaw || hasOnlyExcludedMembers(responsibleRaw)) continue;
    const resolved = resolveCalendarMembersForResponsible(responsibleRaw);
    for (const member of resolved) {
      if (
        !isExcludedTimelineMember(member.id) &&
        !isExcludedTimelineMember(member.name) &&
        !memberMap.has(member.id)
      ) {
        memberMap.set(member.id, member);
      }
    }
  }

  let hasUnassignedEvent = false;
  for (const event of events) {
    if (!event) continue;
    if (
      isExcludedTimelineMember(event.resourceId) ||
      isExcludedTimelineMember(event.responsibleName)
    ) {
      continue;
    }
    if (event.resourceId === UNASSIGNED_CALENDAR_MEMBER.id) {
      hasUnassignedEvent = true;
      continue;
    }
    if (!memberMap.has(event.resourceId)) {
      const resolved = resolveCalendarMembersForResponsible(
        event.responsibleName || event.resourceId
      );
      const matched =
        resolved.find((m) => m.id === event.resourceId) || resolved[0];
      if (
        matched &&
        !isExcludedTimelineMember(matched.id) &&
        !isExcludedTimelineMember(matched.name)
      ) {
        memberMap.set(matched.id, matched);
      } else if (
        event.resourceId &&
        event.resourceId !== "unknown" &&
        !isExcludedTimelineMember(event.resourceId)
      ) {
        const displayName = event.responsibleName || event.resourceId;
        if (!isExcludedTimelineMember(displayName)) {
          memberMap.set(event.resourceId, {
            id: event.resourceId,
            name: displayName,
            initials: buildInitials(displayName),
            role: "Implantador",
            color: event.color || getFallbackColor(displayName),
          });
        }
      }
    }
  }

  if (hasUnassignedEvent) {
    memberMap.set(UNASSIGNED_CALENDAR_MEMBER.id, UNASSIGNED_CALENDAR_MEMBER);
  }

  return Array.from(memberMap.values());
}

export function packEventsIntoLanes(events: CalendarEvent[]): {
  lanes: CalendarEvent[][];
  laneCount: number;
} {
  if (!events || events.length === 0) {
    return { lanes: [], laneCount: 0 };
  }

  const validEvents = events.filter(
    (evt) =>
      evt &&
      evt.start instanceof Date &&
      !Number.isNaN(evt.start.getTime()) &&
      evt.end instanceof Date &&
      !Number.isNaN(evt.end.getTime())
  );

  const sorted = [...validEvents].sort((a, b) => {
    const aStart = startOfDay(a.start).getTime();
    const bStart = startOfDay(b.start).getTime();
    if (aStart !== bStart) {
      return aStart - bStart;
    }

    const aEnd = Math.max(aStart, startOfDay(a.end).getTime());
    const bEnd = Math.max(bStart, startOfDay(b.end).getTime());
    const aDuration = aEnd - aStart;
    const bDuration = bEnd - bStart;
    if (bDuration !== aDuration) {
      return bDuration - aDuration;
    }

    if (a.type === "vacation" && b.type !== "vacation") return -1;
    if (b.type === "vacation" && a.type !== "vacation") return 1;

    return a.id.localeCompare(b.id);
  });

  const lanes: CalendarEvent[][] = [];
  const laneLastEndTimes: number[] = [];

  for (const event of sorted) {
    const eventStart = startOfDay(event.start).getTime();
    const eventEnd = Math.max(eventStart, startOfDay(event.end).getTime());

    let placedLaneIndex = -1;
    for (let i = 0; i < lanes.length; i += 1) {
      if (laneLastEndTimes[i] < eventStart) {
        placedLaneIndex = i;
        break;
      }
    }

    if (placedLaneIndex !== -1) {
      lanes[placedLaneIndex].push(event);
      laneLastEndTimes[placedLaneIndex] = eventEnd;
    } else {
      lanes.push([event]);
      laneLastEndTimes.push(eventEnd);
    }
  }

  return {
    lanes,
    laneCount: lanes.length,
  };
}
