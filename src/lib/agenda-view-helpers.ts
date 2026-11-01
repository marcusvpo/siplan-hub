import {
  format,
  startOfDay,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UnifiedAgendaEvent, AgendaActivityType } from "@/types/agenda";
import { CALENDAR_MEMBERS, CalendarMember } from "@/types/calendar";
import { getWeekdayHoliday, WeekdayHoliday } from "@/lib/calendar-holidays";
import { normalizeText } from "./project-calendar-events";

export interface AgendaBirthday {
  date: string; // MM-DD ou YYYY-MM-DD
  name: string;
  shortName?: string;
  role?: string;
  avatar?: string;
}

export interface DayTimelineSlot {
  event: UnifiedAgendaEvent;
  topPercent: number;
  heightPercent: number;
  displayStart: string;
  displayEnd: string;
  isAllDayComputed: boolean;
}

/**
 * Minutos a partir das 08:00 (Início da régua: 08:00 = 0m, 22:00 = 840m)
 */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 22;
export const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60; // 840 minutos

export function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Converte minutos absolutos do dia em porcentagem de posição na régua 08:00-22:00
 */
export function minutesToPercent(minutes: number): number {
  const baseMinutes = DAY_START_HOUR * 60; // 480
  const clamped = Math.max(baseMinutes, Math.min(DAY_END_HOUR * 60, minutes));
  return ((clamped - baseMinutes) / TOTAL_MINUTES) * 100;
}

/**
 * Retorna as informações visuais e cores do colaborador
 */
export function getCollaboratorMeta(userName?: string | null): {
  member?: CalendarMember;
  shortName: string;
  initials: string;
  colorClass: string;
} {
  const safeName = (userName || "Colaborador").trim();
  const norm = safeName.toLowerCase();
  const found = CALENDAR_MEMBERS.find((m) => {
    const mNorm = m.name.toLowerCase();
    const shortNorm = m.shortName?.toLowerCase() || "";
    return norm.includes(mNorm) || mNorm.includes(norm) || (shortNorm && norm.includes(shortNorm));
  });

  if (found) {
    return {
      member: found,
      shortName: found.shortName || found.name.split(" ")[0],
      initials: found.initials || found.name.slice(0, 2).toUpperCase(),
      colorClass: found.color,
    };
  }

  // Fallback para analistas não mapeados na constante estática
  const parts = safeName.split(" ").filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0] || "AN").slice(0, 2).toUpperCase();

  return {
    shortName: parts[0] || safeName,
    initials,
    colorClass: "bg-slate-600",
  };
}

/**
 * Estilização semântica por tipo de atividade
 */
export function getActivityBadgeStyles(activity: AgendaActivityType): {
  badgeBg: string;
  borderAccent: string;
  label: string;
} {
  switch (activity) {
    case "aderencia":
      return {
        badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/50",
        borderAccent: "border-l-purple-500",
        label: "Aderência",
      };
    case "homologacao":
      return {
        badgeBg: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700/50",
        borderAccent: "border-l-violet-500",
        label: "Homologação",
      };
    case "implantacao":
      return {
        badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50",
        borderAccent: "border-l-emerald-500",
        label: "Implantação",
      };
    case "visita_qualidade":
      return {
        badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/50",
        borderAccent: "border-l-rose-500",
        label: "Visita de Qualidade",
      };
    case "chamado":
      return {
        badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/50",
        borderAccent: "border-l-blue-500",
        label: "Chamado",
      };
    case "treinamento":
      return {
        badgeBg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/50",
        borderAccent: "border-l-cyan-500",
        label: "Treinamento",
      };
    case "configuracao":
    case "migracao":
      return {
        badgeBg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/50",
        borderAccent: "border-l-indigo-500",
        label: "Configuração",
      };
    case "compensacao_horas":
      return {
        badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/50",
        borderAccent: "border-l-purple-500",
        label: "Compensação",
      };
    case "apoio_sd":
      return {
        badgeBg: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700/50",
        borderAccent: "border-l-teal-500",
        label: "Apoio SD",
      };
    default:
      return {
        badgeBg: "bg-muted text-foreground border-border",
        borderAccent: "border-l-primary",
        label: "Outro",
      };
  }
}

/**
 * Calcula a posição e a divisão proporcional de horários para a visão diária
 */
export function calculateDayTimelineSlots(events: UnifiedAgendaEvent[]): DayTimelineSlot[] {
  const fixedSlots: DayTimelineSlot[] = [];
  const allDayEvents: UnifiedAgendaEvent[] = [];

  events.forEach((evt) => {
    const sMin = timeStringToMinutes(evt.startTime);
    const eMin = timeStringToMinutes(evt.endTime);

    if (!evt.isAllDay && sMin !== null && eMin !== null && eMin > sMin) {
      const top = minutesToPercent(sMin);
      const bottom = minutesToPercent(eMin);
      fixedSlots.push({
        event: evt,
        topPercent: top,
        heightPercent: Math.max(6, bottom - top),
        displayStart: evt.startTime!,
        displayEnd: evt.endTime!,
        isAllDayComputed: false,
      });
    } else {
      allDayEvents.push(evt);
    }
  });

  if (allDayEvents.length === 0) {
    return fixedSlots;
  }

  const computedSlots: DayTimelineSlot[] = [];

  if (allDayEvents.length === 1) {
    // 1 Chamado = Expediente integral (08:30 - 17:30)
    const top = minutesToPercent(8 * 60 + 30);
    const bottom = minutesToPercent(17 * 60 + 30);
    computedSlots.push({
      event: allDayEvents[0],
      topPercent: top,
      heightPercent: bottom - top,
      displayStart: "08:30",
      displayEnd: "17:30",
      isAllDayComputed: true,
    });
  } else if (allDayEvents.length === 2) {
    // 2 Chamados = Manhã (08:30-12:30) e Tarde (13:30-17:30)
    const mTop = minutesToPercent(8 * 60 + 30);
    const mBot = minutesToPercent(12 * 60 + 30);
    computedSlots.push({
      event: allDayEvents[0],
      topPercent: mTop,
      heightPercent: mBot - mTop,
      displayStart: "08:30",
      displayEnd: "12:30",
      isAllDayComputed: true,
    });

    const aTop = minutesToPercent(13 * 60 + 30);
    const aBot = minutesToPercent(17 * 60 + 30);
    computedSlots.push({
      event: allDayEvents[1],
      topPercent: aTop,
      heightPercent: aBot - aTop,
      displayStart: "13:30",
      displayEnd: "17:30",
      isAllDayComputed: true,
    });
  } else {
    // 3 Chamados ou mais = Divisão em 1/3 do dia
    const slots = [
      { start: "08:30", end: "11:30", sMin: 8 * 60 + 30, eMin: 11 * 60 + 30 },
      { start: "11:30", end: "14:30", sMin: 11 * 60 + 30, eMin: 14 * 60 + 30 },
      { start: "14:30", end: "17:30", sMin: 14 * 60 + 30, eMin: 17 * 60 + 30 },
    ];

    allDayEvents.forEach((evt, idx) => {
      const slotDef = slots[Math.min(idx, slots.length - 1)];
      const top = minutesToPercent(slotDef.sMin);
      const bottom = minutesToPercent(slotDef.eMin);
      computedSlots.push({
        event: evt,
        topPercent: top,
        heightPercent: bottom - top,
        displayStart: slotDef.start,
        displayEnd: slotDef.end,
        isAllDayComputed: true,
      });
    });
  }

  return [...computedSlots, ...fixedSlots];
}

export interface PositionedTimelineSlot extends DayTimelineSlot {
  colIndex: number;
  totalCols: number;
}

/**
 * Régua horária completa das 08:00 às 22:00 (14 horas)
 */
export const TIMELINE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

/**
 * Ordena eventos por prioridade de atendimento:
 * 1. Aderência e Homologação
 * 2. Implantação
 * 3. Demais chamados
 */
export function sortEventsByPriority(evts: UnifiedAgendaEvent[]): UnifiedAgendaEvent[] {
  return [...evts].sort((a, b) => {
    const isPriorityA =
      a.activityType === "aderencia" ||
      a.activityType === "homologacao" ||
      a.origin === "adherence" ||
      a.origin === "conversion_homologation";
    const isPriorityB =
      b.activityType === "aderencia" ||
      b.activityType === "homologacao" ||
      b.origin === "adherence" ||
      b.origin === "conversion_homologation";

    if (isPriorityA && !isPriorityB) return -1;
    if (!isPriorityA && isPriorityB) return 1;

    const isPhase1A = a.activityType === "implantacao" || a.origin === "phase1_implementation";
    const isPhase1B = b.activityType === "implantacao" || b.origin === "phase1_implementation";

    if (isPhase1A && !isPhase1B) return -1;
    if (!isPhase1A && isPhase1B) return 1;

    const timeA = timeStringToMinutes(a.startTime) ?? 9999;
    const timeB = timeStringToMinutes(b.startTime) ?? 9999;
    if (timeA !== timeB) return timeA - timeB;

    return (a.clientName || "").localeCompare(b.clientName || "");
  });
}

/**
 * Algoritmo estilo Google Calendar para calcular sobreposição de eventos no mesmo horário
 * e dividir a largura em sub-colunas harmoniosas sem ocultar nenhum card.
 */
export function computeOverlappingLayout(slots: DayTimelineSlot[]): PositionedTimelineSlot[] {
  if (slots.length === 0) return [];

  const sorted = [...slots].sort((a, b) => {
    if (Math.abs(a.topPercent - b.topPercent) > 0.1) {
      return a.topPercent - b.topPercent;
    }
    return b.heightPercent - a.heightPercent;
  });

  const clusters: DayTimelineSlot[][] = [];
  let currentCluster: DayTimelineSlot[] = [];
  let clusterEnd = -1;

  for (const slot of sorted) {
    const slotEnd = slot.topPercent + slot.heightPercent;
    if (currentCluster.length === 0) {
      currentCluster.push(slot);
      clusterEnd = slotEnd;
    } else if (slot.topPercent < clusterEnd - 0.5) {
      currentCluster.push(slot);
      clusterEnd = Math.max(clusterEnd, slotEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [slot];
      clusterEnd = slotEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedTimelineSlot[] = [];

  for (const cluster of clusters) {
    const columnEndTimes: number[] = [];
    const clusterPositioned: PositionedTimelineSlot[] = [];

    for (const slot of cluster) {
      let placedCol = -1;
      const slotEnd = slot.topPercent + slot.heightPercent;

      for (let col = 0; col < columnEndTimes.length; col++) {
        if (slot.topPercent >= columnEndTimes[col] - 0.5) {
          placedCol = col;
          columnEndTimes[col] = slotEnd;
          break;
        }
      }

      if (placedCol === -1) {
        placedCol = columnEndTimes.length;
        columnEndTimes.push(slotEnd);
      }

      clusterPositioned.push({
        ...slot,
        colIndex: placedCol,
        totalCols: 1,
      });
    }

    const totalCols = columnEndTimes.length;
    for (const item of clusterPositioned) {
      result.push({
        ...item,
        totalCols,
      });
    }
  }

  return result;
}

export interface AnalystVisualPalette {
  index: number;
  chipBg: string;
  border: string;
  borderLeftClass: string;
  text: string;
  avatarBg: string;
  ringClass: string;
  badgeBg: string;
}

export const ANALYST_PALETTES = [
  {
    chipBg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-400 dark:border-blue-700",
    borderLeftClass: "border-l-4 border-l-blue-600 dark:border-l-blue-400",
    text: "text-blue-900 dark:text-blue-200",
    avatarBg: "bg-blue-600 text-white",
    ringClass: "ring-2 ring-blue-500/40 ring-offset-1",
    badgeBg: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
  },
  {
    chipBg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-400 dark:border-emerald-700",
    borderLeftClass: "border-l-4 border-l-emerald-600 dark:border-l-emerald-400",
    text: "text-emerald-900 dark:text-emerald-200",
    avatarBg: "bg-emerald-700 text-white dark:bg-emerald-800 dark:text-emerald-100",
    ringClass: "ring-2 ring-emerald-500/40 ring-offset-1",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  },
  {
    chipBg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-400 dark:border-purple-700",
    borderLeftClass: "border-l-4 border-l-purple-600 dark:border-l-purple-400",
    text: "text-purple-900 dark:text-purple-200",
    avatarBg: "bg-purple-700 text-white dark:bg-purple-800 dark:text-purple-100",
    ringClass: "ring-2 ring-purple-500/40 ring-offset-1",
    badgeBg: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800",
  },
  {
    chipBg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-400 dark:border-amber-700",
    borderLeftClass: "border-l-4 border-l-amber-600 dark:border-l-amber-400",
    text: "text-amber-900 dark:text-amber-200",
    avatarBg: "bg-amber-600 text-white",
    ringClass: "ring-2 ring-amber-500/40 ring-offset-1",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  },
];

export function getAnalystPalette(
  userName?: string | null,
  selectedUserNames: string[] = []
): AnalystVisualPalette | null {
  if (!userName || selectedUserNames.length <= 1) return null;
  const normUser = normalizeText(userName);
  const idx = selectedUserNames.findIndex((s) => {
    const normS = normalizeText(s);
    return normUser.includes(normS) || normS.includes(normUser);
  });
  if (idx >= 0) {
    return {
      index: idx,
      ...ANALYST_PALETTES[idx % ANALYST_PALETTES.length],
    };
  }
  return null;
}

export function cleanRichTextOrJson(raw?: string | null): string {
  if (!raw || !raw.trim()) return "";
  const trimmed = raw.trim();

  // Se for JSON (ex: Lexical, Tiptap, blocks)
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      const chunks: string[] = [];
      const extractChunks = (node: any) => {
        if (!node) return;
        if (typeof node === "string") {
          chunks.push(node);
          return;
        }
        if (typeof node.text === "string") {
          chunks.push(node.text);
        }
        if (node.root) {
          extractChunks(node.root);
        }
        if (Array.isArray(node.children)) {
          node.children.forEach(extractChunks);
        }
        if (Array.isArray(node.content)) {
          node.content.forEach(extractChunks);
        }
      };
      extractChunks(parsed);
      return chunks.join(" ").replace(/\s+/g, " ").trim();
    } catch {
      // Ignora erro e continua
    }
  }

  // Remove tags HTML
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  return trimmed;
}
