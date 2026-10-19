import { useCalendarStore } from "@/stores/calendarStore";
import {
  CalendarEvent,
  CalendarMember,
  UnscheduledPhase1Project,
} from "@/types/calendar";
import type { ProjectV2 } from "@/types/ProjectV2";
import {
  deriveTimelineMembers,
  normalizeText,
  packEventsIntoLanes,
} from "@/lib/project-calendar-events";
import {
  formatWeekHolidayBadge,
  getWeekdayHoliday,
  getWeekdayHolidaysForWeek,
  getWeekdayHolidaysInRange,
  WeekdayHoliday,
} from "@/lib/calendar-holidays";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crosshair,
  Palmtree,
  Rocket,
  UserRound,
  ZoomIn,
} from "lucide-react";
import { MobileCalendarAgenda } from "./MobileCalendarAgenda";

interface CalendarGridProps {
  onEventClick?: (event: CalendarEvent) => void;
  onUnscheduledProjectClick?: (item: UnscheduledPhase1Project) => void;
  unscheduledProjects?: UnscheduledPhase1Project[];
  projects?: ProjectV2[];
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

interface TimelineWeekColumn {
  index: number;
  monday: Date;
  friday: Date;
  sunday: Date;
  code: string;
  label: string;
  rangeLabel: string;
  monthKey: string;
  monthTitle: string;
  monthIndex: number;
  year: number;
  weekdays: Array<{
    date: Date;
    dayNum: string;
    iso: string;
    holiday: WeekdayHoliday | null;
    isTodayDate: boolean;
  }>;
  holidays: WeekdayHoliday[];
  holidayBadge: string;
  holidaySummary?: string;
  containsToday: boolean;
}

type TimelineDensity = "compact" | "normal" | "wide";

const DENSITY_WEEK_WIDTH: Record<TimelineDensity, number> = {
  compact: 72,
  normal: 92,
  wide: 118,
};

/**
 * Padronização Oficial de Cores determinada pelo usuário:
 * - Orion REG = Verde (Emerald)
 * - Orion PRO = Azul (Blue)
 * - Orion TN = Vermelho (Bordô Siplan / Rose)
 * - Conjunta (PRO+REG) = Roxo (Violet)
 * - Férias (Admin) = Âmbar/Laranja Tracejado
 */
function getSystemBarClasses(event: CalendarEvent): string {
  if (event.type === "vacation") {
    return "border-2 border-dashed border-amber-500 bg-amber-50/95 dark:bg-amber-950/75 text-amber-950 dark:text-amber-100 shadow-xs hover:bg-amber-100/95 dark:hover:bg-amber-900/80";
  }

  switch (event.systemCategory) {
    case "reg":
      return "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-900 shadow-xs hover:brightness-110";
    case "pro":
      return "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-900 shadow-xs hover:brightness-110";
    case "tn":
      return "bg-gradient-to-r from-[#d3123f] to-[#be123c] text-white border border-[#881337] shadow-xs hover:brightness-110";
    case "shared":
      return "bg-gradient-to-r from-violet-600 to-purple-700 text-white border border-violet-950 ring-2 ring-purple-400/35 shadow-xs hover:brightness-110";
    default:
      return "bg-gradient-to-r from-slate-700 to-slate-800 text-white border border-slate-900 shadow-xs hover:brightness-110";
  }
}

function getSystemShortBadge(event: CalendarEvent): string {
  if (event.type === "vacation") return "FÉRIAS";
  switch (event.systemCategory) {
    case "reg":
      return "REG";
    case "pro":
      return "PRO";
    case "tn":
      return "TN";
    case "shared":
      return "PRO+REG";
    default:
      return event.systemType?.slice(0, 6).toUpperCase() || "FASE 1";
  }
}

/**
 * Cores do pill do sistema na coluna do implantador:
 * - Orion REG = Verde
 * - Orion PRO = Azul
 * - Orion TN = Vermelho
 * - Orion PRO & TN = Azul / Bordô
 */
function getMemberSystemPillClasses(defaultSystem?: string): string {
  const norm = normalizeText(defaultSystem);
  if (norm.includes("reg") && !norm.includes("pro")) {
    return "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800";
  }
  if (norm.includes("pro") && norm.includes("tn")) {
    return "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800";
  }
  if (norm.includes("pro")) {
    return "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800";
  }
  if (norm.includes("tn")) {
    return "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800";
  }
  return "bg-muted text-muted-foreground border-border";
}

function getStageStatusLabel(status?: CalendarEvent["stageStatus"]): string {
  switch (status) {
    case "done":
      return "Finalizado";
    case "in-progress":
      return "Em Andamento";
    case "blocked":
      return "Bloqueado";
    default:
      return "Planejado / Não Iniciado";
  }
}

function matchesEventFilters(
  event: CalendarEvent,
  searchQuery: string,
  systemFilter: string,
  statusFilter: string
): boolean {
  if (searchQuery.trim()) {
    const q = normalizeText(searchQuery);
    const haystack = normalizeText(
      [
        event.clientName,
        event.title,
        event.ticketNumber,
        event.responsibleName,
        ...(event.allResponsibles || []),
        event.systemType,
      ]
        .filter(Boolean)
        .join(" ")
    );
    if (!haystack.includes(q)) {
      return false;
    }
  }

  if (event.type === "vacation") {
    return true;
  }

  if (systemFilter !== "all") {
    if (systemFilter === "reg") {
      if (event.systemCategory !== "reg" && event.systemCategory !== "shared") {
        return false;
      }
    } else if (systemFilter === "pro") {
      if (event.systemCategory !== "pro" && event.systemCategory !== "shared") {
        return false;
      }
    } else if (systemFilter === "tn") {
      if (event.systemCategory !== "tn") {
        return false;
      }
    }
  }

  if (statusFilter !== "all") {
    if (statusFilter === "confirmed" && !event.isConfirmed) return false;
    if (statusFilter === "planned" && event.isConfirmed) return false;
    if (statusFilter === "in-progress" && event.stageStatus !== "in-progress")
      return false;
    if (statusFilter === "done" && event.stageStatus !== "done") return false;
  }

  return true;
}

function matchesBacklogFilters(
  item: UnscheduledPhase1Project,
  searchQuery: string,
  systemFilter: string,
  hiddenResourceIds: string[]
): boolean {
  if (
    item.resolvedMembers.length > 0 &&
    item.resolvedMembers.every((m) => hiddenResourceIds.includes(m.id))
  ) {
    return false;
  }

  if (searchQuery.trim()) {
    const q = normalizeText(searchQuery);
    const haystack = normalizeText(
      [
        item.clientName,
        item.ticketNumber,
        item.responsibleRaw,
        item.systemType,
      ]
        .filter(Boolean)
        .join(" ")
    );
    if (!haystack.includes(q)) return false;
  }

  if (systemFilter !== "all") {
    if (systemFilter === "reg") {
      if (item.systemCategory !== "reg" && item.systemCategory !== "shared")
        return false;
    } else if (systemFilter === "pro") {
      if (item.systemCategory !== "pro" && item.systemCategory !== "shared")
        return false;
    } else if (systemFilter === "tn") {
      if (item.systemCategory !== "tn") return false;
    }
  }

  return true;
}

function computeBarCoordinates(
  eventStart: Date,
  eventEnd: Date,
  firstMonday: Date,
  totalWeeks: number
): { leftPct: number; widthPct: number } {
  const totalUnits = totalWeeks * 5;
  const rangeStart = startOfDay(firstMonday);
  const rangeEnd = endOfDay(addDays(rangeStart, totalWeeks * 7 - 1));

  const clampedStart = isBefore(eventStart, rangeStart)
    ? rangeStart
    : startOfDay(eventStart);
  const clampedEnd = isAfter(eventEnd, rangeEnd)
    ? rangeEnd
    : startOfDay(eventEnd);

  const startDiffDays = Math.max(
    0,
    differenceInCalendarDays(clampedStart, rangeStart)
  );
  const endDiffDays = Math.max(
    startDiffDays,
    differenceInCalendarDays(clampedEnd, rangeStart)
  );

  const startWeekIdx = Math.min(
    totalWeeks - 1,
    Math.floor(startDiffDays / 7)
  );
  const startDayOfWeek = startDiffDays % 7;
  const startDayOffset = Math.min(Math.max(startDayOfWeek, 0), 4);

  const endWeekIdx = Math.min(totalWeeks - 1, Math.floor(endDiffDays / 7));
  const endDayOfWeek = endDiffDays % 7;
  const endDayOffset = Math.min(Math.max(endDayOfWeek, 0), 4);

  const startUnit = startWeekIdx * 5 + startDayOffset;
  const endUnit = Math.max(
    startUnit + 1,
    Math.min(totalUnits, endWeekIdx * 5 + endDayOffset + 1)
  );

  const leftPct = (startUnit / totalUnits) * 100;
  const widthPct = ((endUnit - startUnit) / totalUnits) * 100;

  return { leftPct, widthPct };
}

export function CalendarGrid({
  onEventClick,
  onUnscheduledProjectClick,
  unscheduledProjects = [],
  projects = [],
  scrollContainerRef,
}: CalendarGridProps) {
  const isMobile = useIsMobile();

  const currentDate = useCalendarStore((state) => state.currentDate);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const selectedYear = useCalendarStore((state) => state.selectedYear);
  const selectedQuarter = useCalendarStore((state) => state.selectedQuarter);
  const displayTab = useCalendarStore((state) => state.displayTab);
  const setDisplayTab = useCalendarStore((state) => state.setDisplayTab);
  const searchQuery = useCalendarStore((state) => state.searchQuery);
  const systemFilter = useCalendarStore((state) => state.systemFilter);
  const statusFilter = useCalendarStore((state) => state.statusFilter);
  const onlyActiveMembers = useCalendarStore(
    (state) => state.onlyActiveMembers
  );
  const hiddenResourceIds = useCalendarStore(
    (state) => state.hiddenResourceIds
  );
  const interactiveEvents = useCalendarStore(
    (state) => state.interactiveEvents
  );
  const realEvents = useCalendarStore((state) => state.realEvents);
  const isInteractiveMode = useCalendarStore(
    (state) => state.isInteractiveMode
  );

  const [density, setDensity] = useState<TimelineDensity>("normal");

  const internalScrollRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = scrollContainerRef || internalScrollRef;

  const baseEvents = isInteractiveMode ? interactiveEvents : realEvents;

  // 1. Calcula intervalo de datas do modo selecionado
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    if (viewMode === "year") {
      return {
        periodStart: startOfDay(new Date(selectedYear, 0, 1)),
        periodEnd: endOfDay(new Date(selectedYear, 11, 31)),
        periodLabel: `Janeiro a Dezembro de ${selectedYear} (12 Meses)`,
      };
    }

    if (viewMode === "quarter") {
      const startMonth = (selectedQuarter - 1) * 3;
      const start = startOfDay(new Date(selectedYear, startMonth, 1));
      const end = endOfDay(
        endOfMonth(new Date(selectedYear, startMonth + 2, 1))
      );
      const quarterNames: Record<number, string> = {
        1: `1º Trimestre ${selectedYear} (Janeiro a Março)`,
        2: `2º Trimestre ${selectedYear} (Abril a Junho)`,
        3: `3º Trimestre ${selectedYear} (Julho a Setembro)`,
        4: `4º Trimestre ${selectedYear} (Outubro a Dezembro)`,
      };
      return {
        periodStart: start,
        periodEnd: end,
        periodLabel: quarterNames[selectedQuarter] || `${selectedYear}`,
      };
    }

    if (viewMode === "month") {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return {
        periodStart: start,
        periodEnd: end,
        periodLabel: format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }),
      };
    }

    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        periodStart: start,
        periodEnd: end,
        periodLabel: `Semana de ${format(start, "dd/MM")} a ${format(
          end,
          "dd/MM/yyyy"
        )}`,
      };
    }

    return {
      periodStart: startOfDay(currentDate),
      periodEnd: endOfDay(currentDate),
      periodLabel: format(currentDate, "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      }),
    };
  }, [viewMode, selectedYear, selectedQuarter, currentDate]);

  // 2. Constrói as colunas de semanas (Seg a Sex) cobrindo todo o período + Feriados em dias úteis 2026/2027
  const timelineWeeks = useMemo<TimelineWeekColumn[]>(() => {
    const firstWeekMonday = startOfWeek(periodStart, { weekStartsOn: 1 });
    const lastWeekSunday = endOfWeek(periodEnd, { weekStartsOn: 1 });

    const weekMondays = eachWeekOfInterval(
      { start: firstWeekMonday, end: lastWeekSunday },
      { weekStartsOn: 1 }
    );

    return weekMondays.map((monday, index) => {
      const friday = addDays(monday, 4);
      const sunday = addDays(monday, 6);
      const dominantDate = addDays(monday, 2);
      const monthIndex = dominantDate.getMonth();
      const year = dominantDate.getFullYear();
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const monthTitle = format(dominantDate, "MMMM yyyy", {
        locale: ptBR,
      }).toUpperCase();

      const weekHolidays = getWeekdayHolidaysForWeek(monday);
      const holidayBadge = formatWeekHolidayBadge(weekHolidays);

      const weekdays = [0, 1, 2, 3, 4].map((offset) => {
        const d = addDays(monday, offset);
        const holiday = getWeekdayHoliday(d);
        return {
          date: d,
          dayNum: format(d, "dd"),
          iso: format(d, "yyyy-MM-dd"),
          holiday,
          isTodayDate: isToday(d),
        };
      });

      const holidaySummary =
        weekHolidays.length > 0
          ? weekHolidays
              .map((h) => `${h.shortDate} (${h.weekdayLabel}): ${h.name}`)
              .join(" • ")
          : undefined;

      return {
        index,
        monday,
        friday,
        sunday,
        code: `S${index + 1}`,
        label: `Sem ${format(monday, "dd/MM")}`,
        rangeLabel: `${format(monday, "dd/MM")}–${format(friday, "dd/MM")}`,
        monthKey,
        monthTitle,
        monthIndex,
        year,
        weekdays,
        holidays: weekHolidays,
        holidayBadge,
        holidaySummary,
        containsToday: weekdays.some((w) => w.isTodayDate),
      };
    });
  }, [periodStart, periodEnd]);

  // 3. Agrupamento de meses para a Faixa 1 do cabeçalho
  const monthHeaderGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      title: string;
      monthIndex: number;
      year: number;
      spanWeeks: number;
      firstWeekIndex: number;
    }> = [];

    for (const week of timelineWeeks) {
      const last = groups[groups.length - 1];
      if (last && last.key === week.monthKey) {
        last.spanWeeks += 1;
      } else {
        groups.push({
          key: week.monthKey,
          title: week.monthTitle,
          monthIndex: week.monthIndex,
          year: week.year,
          spanWeeks: 1,
          firstWeekIndex: week.index,
        });
      }
    }

    return groups;
  }, [timelineWeeks]);

  const timelineFirstMonday = useMemo(
    () =>
      timelineWeeks.length > 0
        ? startOfDay(timelineWeeks[0].monday)
        : startOfDay(periodStart),
    [timelineWeeks, periodStart]
  );

  const timelineLastSunday = useMemo(
    () =>
      timelineWeeks.length > 0
        ? endOfDay(timelineWeeks[timelineWeeks.length - 1].sunday)
        : endOfDay(periodEnd),
    [timelineWeeks, periodEnd]
  );

  // 4. Filtra os eventos visíveis de acordo com os filtros ativos
  const filteredEvents = useMemo(() => {
    return baseEvents.filter((evt) => {
      if (hiddenResourceIds.includes(evt.resourceId)) return false;
      const evtStart = startOfDay(new Date(evt.start));
      const evtEnd = endOfDay(new Date(evt.end));
      if (
        isBefore(evtEnd, timelineFirstMonday) ||
        isAfter(evtStart, timelineLastSunday)
      ) {
        return false;
      }
      return matchesEventFilters(evt, searchQuery, systemFilter, statusFilter);
    });
  }, [
    baseEvents,
    hiddenResourceIds,
    timelineFirstMonday,
    timelineLastSunday,
    searchQuery,
    systemFilter,
    statusFilter,
  ]);

  // 5. Filtra os projetos sem data na Fase 1
  const filteredBacklog = useMemo(() => {
    return unscheduledProjects.filter((item) =>
      matchesBacklogFilters(item, searchQuery, systemFilter, hiddenResourceIds)
    );
  }, [unscheduledProjects, searchQuery, systemFilter, hiddenResourceIds]);

  // 6. Lista de implantadores na Timeline
  const allMembers = useMemo(
    () => deriveTimelineMembers(projects, baseEvents),
    [projects, baseEvents]
  );

  const visibleMembers = useMemo(() => {
    return allMembers.filter((member) => {
      if (hiddenResourceIds.includes(member.id)) return false;
      if (onlyActiveMembers) {
        const hasEventInPeriod = filteredEvents.some(
          (evt) => evt.resourceId === member.id
        );
        const hasBacklog = filteredBacklog.some((item) =>
          item.resolvedMembers.some((m) => m.id === member.id)
        );
        return hasEventInPeriod || hasBacklog;
      }
      return true;
    });
  }, [
    allMembers,
    hiddenResourceIds,
    onlyActiveMembers,
    filteredEvents,
    filteredBacklog,
  ]);

  // 7. Pré-calcula os dados e a altura exata de cada raia (para sincronizar Painel Esquerdo e Painel Direito no Split-Pane!)
  const memberRowsData = useMemo(() => {
    return visibleMembers.map((member) => {
      const memberEvents = filteredEvents.filter(
        (evt) => evt.resourceId === member.id
      );
      const { lanes } = packEventsIntoLanes(memberEvents);
      const effectiveLanes = lanes.length > 0 ? lanes : [[]];

      const memberVacations = memberEvents.filter(
        (evt) => evt.type === "vacation"
      );
      const memberImplEvents = memberEvents.filter(
        (evt) => evt.type !== "vacation"
      );
      const memberBacklog = filteredBacklog.filter((item) =>
        item.resolvedMembers.some((m) => m.id === member.id)
      );

      const rowHeightPx = Math.max(92, effectiveLanes.length * 46 + 20);

      return {
        member,
        memberEvents,
        lanes,
        effectiveLanes,
        memberVacations,
        memberImplEvents,
        memberImplCount: memberImplEvents.length,
        memberBacklog,
        rowHeightPx,
      };
    });
  }, [visibleMembers, filteredEvents, filteredBacklog]);

  // Posição da linha vertical de Hoje (se hoje estiver no intervalo visível)
  const todayMarkerPct = useMemo(() => {
    const now = new Date();
    if (
      isBefore(now, timelineFirstMonday) ||
      isAfter(now, timelineLastSunday) ||
      timelineWeeks.length === 0
    ) {
      return null;
    }
    const { leftPct } = computeBarCoordinates(
      now,
      now,
      timelineFirstMonday,
      timelineWeeks.length
    );
    return leftPct;
  }, [timelineFirstMonday, timelineLastSunday, timelineWeeks.length]);

  // Auto-scroll para o mês atual quando muda para viewMode === 'year'
  // (No Split-Pane, activeScrollRef contém APENAS o painel direito, então offsetLeft é exato!)
  useEffect(() => {
    if (viewMode !== "year" || !activeScrollRef.current) return;
    const now = new Date();
    const targetMonth =
      now.getFullYear() === selectedYear ? now.getMonth() : 0;
    const monthEl = activeScrollRef.current.querySelector(
      `[data-month-index="${targetMonth}"]`
    ) as HTMLElement | null;
    if (monthEl) {
      const offsetLeft = Math.max(0, monthEl.offsetLeft);
      activeScrollRef.current.scrollTo({
        left: offsetLeft,
        behavior: "smooth",
      });
    }
  }, [viewMode, selectedYear, activeScrollRef]);

  const handleScrollHorizontal = (direction: "left" | "right") => {
    if (!activeScrollRef.current) return;
    const delta = direction === "left" ? -480 : 480;
    activeScrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Foca a timeline horizontal na primeira alocação de um implantador específico
  const handleFocusMemberFirstEvent = (eventsOfMember: CalendarEvent[]) => {
    if (
      !activeScrollRef.current ||
      eventsOfMember.length === 0 ||
      timelineWeeks.length === 0
    ) {
      return;
    }
    const sorted = [...eventsOfMember].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    const firstEvt = sorted[0];
    const { leftPct } = computeBarCoordinates(
      new Date(firstEvt.start),
      new Date(firstEvt.end),
      timelineFirstMonday,
      timelineWeeks.length
    );
    const scrollWidth = activeScrollRef.current.scrollWidth;
    const targetX = Math.max(0, (leftPct / 100) * scrollWidth - 48);
    activeScrollRef.current.scrollTo({
      left: targetX,
      behavior: "smooth",
    });
  };

  // Dias do intervalo para o MobileCalendarAgenda
  const mobileDays = useMemo(() => {
    if (viewMode === "month") {
      const mStart = startOfMonth(currentDate);
      const mEnd = endOfMonth(mStart);
      return eachDayOfInterval({
        start: startOfWeek(mStart),
        end: endOfWeek(mEnd),
      });
    }
    return eachDayOfInterval({
      start: periodStart,
      end: periodEnd,
    });
  }, [viewMode, currentDate, periodStart, periodEnd]);

  if (isMobile) {
    return (
      <MobileCalendarAgenda
        days={mobileDays}
        events={filteredEvents}
        isInteractiveMode={isInteractiveMode}
        onEventClick={onEventClick}
        members={visibleMembers}
        unscheduledProjects={filteredBacklog}
        onUnscheduledProjectClick={onUnscheduledProjectClick}
      />
    );
  }

  // Largura mínima do Painel Direito (apenas as semanas, pois a coluna esquerda de 228px fica fora!)
  const weekWidthPx = DENSITY_WEEK_WIDTH[density];
  const timelineTrackMinWidthPx =
    viewMode === "year"
      ? timelineWeeks.length * weekWidthPx
      : Math.max(760, timelineWeeks.length * weekWidthPx);

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className="flex min-w-0 max-w-full flex-col gap-3 select-none"
        data-testid="calendar-desktop-grid"
      >
        {/* =====================================================================
            ABA 1: TIMELINE MASTER (GANTT SPLIT-PANE SEM SOBREPOSIÇÃO NO SCROLL)
           ===================================================================== */}
        {displayTab === "timeline" && (
          <section className="flex min-w-0 max-w-full flex-col gap-2">
            {/* Barra de Seção Executiva + Controle de Densidade / Zoom */}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border border-l-4 border-l-primary bg-muted/40 px-3 py-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="rounded bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary-foreground">
                  TIMELINE FASE 1 &amp; FÉRIAS
                </span>
                <h2 className="truncate text-xs font-extrabold text-foreground sm:text-sm">
                  Gráfico Master de Agenda dos Implantadores —{" "}
                  <span className="capitalize">{periodLabel}</span>
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Seletor de Densidade / Zoom Horizontal */}
                <div
                  className="inline-flex items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-2xs"
                  title="Ajustar largura das semanas na Timeline"
                >
                  <ZoomIn className="ml-1.5 mr-1 h-3 w-3 text-muted-foreground" />
                  {(
                    [
                      { id: "compact", label: "Compacto" },
                      { id: "normal", label: "Normal" },
                      { id: "wide", label: "Amplo" },
                    ] as Array<{ id: TimelineDensity; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDensity(opt.id)}
                      className={cn(
                        "h-5 rounded px-2 text-[9.5px] font-bold transition-colors",
                        density === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Botões de rolagem horizontal */}
                <div className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScrollHorizontal("left")}
                    className="h-6 gap-1 px-2 text-[10px] font-bold"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    <span>Rolar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScrollHorizontal("right")}
                    className="h-6 gap-1 px-2 text-[10px] font-bold"
                  >
                    <span>Rolar</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* CONTAINER SPLIT-PANE DO GANTT:
                - Painel Esquerdo Fixo (w-[228px], fora do overflow-x-auto)
                - Painel Direito com Scroll Horizontal Isolado (flex-1 overflow-x-auto)
                Garante fisicamente que nenhuma barra jamais invada ou sobreponha os implantadores! */}
            {memberRowsData.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
                <p className="text-sm font-bold text-foreground">
                  Nenhum implantador com alocações para os filtros atuais.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajuste o filtro de sistema/status ou desmarque &ldquo;Apenas com
                  alocação&rdquo;.
                </p>
              </div>
            ) : (
              <div className="flex min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                {/* =========================================================
                    PAINEL 1 (ESQUERDO FIXO): COLUNA DE IMPLANTADORES (FORA DO SCROLL)
                   ========================================================= */}
                <div
                  className="z-30 flex w-[228px] shrink-0 flex-col border-r border-border bg-card shadow-[4px_0_14px_-4px_rgba(15,23,42,0.08)]"
                  data-testid="calendar-left-fixed-pane"
                >
                  {/* Cabeçalho Esquerdo (Altura Sincronizada h-[86px]) */}
                  <div className="flex h-[86px] shrink-0 flex-col justify-center border-b-2 border-primary bg-muted/60 px-3 py-2 text-foreground">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                      IMPLANTADOR / CARTEIRA
                    </div>
                    <div className="mt-0.5 text-[9.5px] font-medium text-muted-foreground">
                      Fase 1 &amp; Férias (Admin)
                    </div>
                  </div>

                  {/* Linhas de Implantadores (Alturas Sincronizadas rowHeightPx) */}
                  <div className="flex flex-col divide-y divide-border">
                    {memberRowsData.map((row, memberIdx) => {
                      const {
                        member,
                        lanes,
                        memberVacations,
                        memberImplEvents,
                        memberImplCount,
                        memberBacklog,
                        rowHeightPx,
                      } = row;

                      return (
                        <div
                          key={member.id}
                          data-analyst-row={member.id}
                          style={{ height: `${rowHeightPx}px` }}
                          className={cn(
                            "flex flex-col justify-center gap-1 px-3 py-2 transition-colors",
                            memberIdx % 2 === 1 ? "bg-muted/25" : "bg-card"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-2xs",
                                member.color || "bg-emerald-600"
                              )}
                            >
                              {member.initials ||
                                member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-extrabold text-foreground leading-tight">
                                {member.name}
                              </div>
                              <span
                                className={cn(
                                  "mt-0.5 inline-block rounded border px-1.5 py-0.2 text-[9px] font-bold leading-tight",
                                  getMemberSystemPillClasses(
                                    member.defaultSystem || member.role
                                  )
                                )}
                              >
                                {member.defaultSystem || member.role}
                              </span>
                            </div>
                          </div>

                          {/* Nota de Férias (Admin) ou Botão para Focar 1ª Alocação */}
                          {memberVacations.length > 0 ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              <Palmtree className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                Férias:{" "}
                                {format(memberVacations[0].start, "dd/MM")} a{" "}
                                {format(memberVacations[0].end, "dd/MM")}
                              </span>
                            </div>
                          ) : memberImplCount > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleFocusMemberFirstEvent(memberImplEvents)
                              }
                              className="inline-flex w-fit items-center gap-1 text-left text-[10px] font-bold text-muted-foreground hover:text-primary"
                              title="Clique para rolar a timeline até a 1ª alocação deste implantador"
                            >
                              <Crosshair className="h-2.5 w-2.5 shrink-0 text-primary" />
                              <span>
                                {memberImplCount}{" "}
                                {memberImplCount === 1
                                  ? "implantação (focar)"
                                  : "implantações (focar)"}
                              </span>
                            </button>
                          ) : (
                            <div className="text-[10px] font-semibold text-muted-foreground">
                              Disponível neste recorte
                            </div>
                          )}

                          {/* Tags de Raias + Atalho para Pipeline sem data */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="rounded border border-border bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground">
                              {lanes.length > 1
                                ? `${lanes.length} sub-raias`
                                : "Fase 1"}
                            </span>

                            {memberBacklog.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setDisplayTab("backlog")}
                                className="inline-flex items-center gap-0.5 rounded border border-amber-400/60 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
                                title="Ver projetos sem data na Fase 1 deste implantador"
                              >
                                <span>+{memberBacklog.length} s/ data</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* =========================================================
                    PAINEL 2 (DIREITO COM SCROLL HORIZONTAL ISOLADO): EIXO TEMPORAL E RAIAS
                   ========================================================= */}
                <div
                  ref={activeScrollRef}
                  className="relative z-10 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
                  data-testid="calendar-timeline-scroll"
                >
                  <div
                    className="flex flex-col"
                    style={{ minWidth: `${timelineTrackMinWidthPx}px` }}
                  >
                    {/* CABEÇALHO TEMPORAL DIREITO (Altura Sincronizada h-[86px]: 24px Meses + 62px Semanas/Feriados/Dias) */}
                    <div className="flex h-[86px] shrink-0 flex-col border-b-2 border-primary bg-muted/40 text-foreground">
                      {/* FAIXA 1: MESES (h-[24px]) */}
                      <div className="flex h-[24px] shrink-0 border-b border-border bg-muted/70">
                        {monthHeaderGroups.map((mGroup) => (
                          <div
                            key={mGroup.key}
                            data-month-index={mGroup.monthIndex}
                            data-month-key={mGroup.key}
                            style={{
                              width: `${
                                (mGroup.spanWeeks / timelineWeeks.length) * 100
                              }%`,
                            }}
                            className="flex items-center justify-center border-r border-border px-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-foreground last:border-r-0 truncate"
                          >
                            {mGroup.title}
                          </div>
                        ))}
                      </div>

                      {/* FAIXA 2 & 3: SEMANAS + ALERTA DE FERIADO + DIAS ÚTEIS SEG A SEX (h-[62px]) */}
                      <div className="flex h-[62px] shrink-0">
                        {timelineWeeks.map((week) => {
                          const hasWeekHoliday = week.holidays.length > 0;
                          return (
                            <div
                              key={week.code + week.monday.toISOString()}
                              data-week-has-holiday={
                                hasWeekHoliday ? "true" : undefined
                              }
                              style={{
                                width: `${100 / timelineWeeks.length}%`,
                              }}
                              className={cn(
                                "flex flex-col justify-between border-r border-border px-1 py-1 text-center last:border-r-0",
                                hasWeekHoliday &&
                                  "bg-amber-500/15 dark:bg-amber-500/20 ring-1 ring-inset ring-amber-500/50",
                                week.containsToday &&
                                  "bg-primary/15 ring-1 ring-inset ring-primary"
                              )}
                            >
                              <div className="flex items-center justify-center gap-1 leading-none">
                                <span
                                  className={cn(
                                    "text-[10px] font-extrabold",
                                    hasWeekHoliday
                                      ? "text-amber-900 dark:text-amber-200"
                                      : "text-foreground"
                                  )}
                                >
                                  {week.label}
                                </span>
                                {hasWeekHoliday && (
                                  <span
                                    className="cursor-help text-[10px] text-amber-600 dark:text-amber-400"
                                    title={week.holidaySummary}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </span>
                                )}
                              </div>

                              {hasWeekHoliday ? (
                                <span
                                  className="mx-auto inline-flex max-w-full items-center gap-0.5 truncate rounded border border-amber-500/50 bg-amber-500/25 px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-tight text-amber-900 dark:bg-amber-500/30 dark:text-amber-200"
                                  title={week.holidaySummary}
                                >
                                  ⚠️ {week.holidayBadge}
                                </span>
                              ) : (
                                <div className="text-[8.5px] font-medium leading-none text-muted-foreground">
                                  {week.rangeLabel}
                                </div>
                              )}

                              <div className="grid grid-cols-5 border-t border-border/70 pt-0.5">
                                {week.weekdays.map((wd) => (
                                  <span
                                    key={wd.iso}
                                    title={
                                      wd.holiday
                                        ? `FERIADO (${wd.holiday.weekdayLabel}): ${wd.holiday.shortDate}/${wd.holiday.year} — ${wd.holiday.name}`
                                        : format(wd.date, "EEEE, dd/MM/yyyy", {
                                            locale: ptBR,
                                          })
                                    }
                                    className={cn(
                                      "text-[8.5px] font-semibold leading-tight",
                                      wd.isTodayDate
                                        ? "rounded bg-primary font-extrabold text-primary-foreground shadow-2xs"
                                        : wd.holiday
                                          ? "rounded bg-amber-500 font-extrabold text-white shadow-2xs ring-1 ring-amber-600"
                                          : "text-muted-foreground"
                                    )}
                                  >
                                    {wd.dayNum}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CORPO DIREITO: RAIAS TEMPORAIS DE CADA IMPLANTADOR (Altura Sincronizada rowHeightPx + overflow-hidden) */}
                    <div className="flex flex-col divide-y divide-border">
                      {memberRowsData.map((row, memberIdx) => {
                        const {
                          member,
                          effectiveLanes,
                          memberBacklog,
                          rowHeightPx,
                        } = row;

                        return (
                          <div
                            key={member.id}
                            style={{ height: `${rowHeightPx}px` }}
                            className={cn(
                              "relative flex flex-col justify-center overflow-hidden py-1.5",
                              memberIdx % 2 === 1
                                ? "bg-muted/15"
                                : "bg-background"
                            )}
                          >
                            {/* CAMADA DE FUNDO: Colunas de Semanas e Subgrid de 5 Dias Úteis */}
                            <div className="pointer-events-none absolute inset-0 flex">
                              {timelineWeeks.map((week) => (
                                <div
                                  key={week.code + week.monday.toISOString()}
                                  style={{
                                    width: `${100 / timelineWeeks.length}%`,
                                  }}
                                  className={cn(
                                    "relative h-full border-r border-border/70 last:border-r-0",
                                    week.index % 2 === 1 && "bg-muted/20",
                                    week.holidays.length > 0 &&
                                      "bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
                                    week.containsToday && "bg-primary/5"
                                  )}
                                >
                                  <div className="grid h-full grid-cols-5">
                                    {week.weekdays.map((wd) => (
                                      <span
                                        key={wd.iso}
                                        className={cn(
                                          "h-full border-r border-dashed border-border/45 last:border-r-0",
                                          wd.holiday &&
                                            "bg-amber-500/15 dark:bg-amber-500/20"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* LINHA GUIA VERTICAL DE HOJE */}
                            {todayMarkerPct !== null && (
                              <div
                                style={{ left: `${todayMarkerPct}%` }}
                                className="pointer-events-none absolute top-0 bottom-0 z-10 w-[2px] bg-primary/80 shadow-[0_0_6px_rgba(211,18,63,0.45)]"
                                title="Hoje"
                              />
                            )}

                            {/* CAMADA DE DROP (Apenas quando Modo Playground está ativo) */}
                            {isInteractiveMode && (
                              <div className="absolute inset-0 z-10 flex">
                                {timelineWeeks.map((week) => (
                                  <div
                                    key={week.code}
                                    style={{
                                      width: `${100 / timelineWeeks.length}%`,
                                    }}
                                    className="grid h-full grid-cols-5"
                                  >
                                    {week.weekdays.map((wd) => (
                                      <DayDroppableZone
                                        key={`${member.id}-${wd.iso}`}
                                        day={wd.date}
                                        isInteractiveMode={isInteractiveMode}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* CAMADA DE SUB-RAIAS EMPILHADAS (LANES) */}
                            <div className="relative z-20 flex flex-col gap-1.5 py-0.5">
                              {effectiveLanes.map((laneEvents, laneIdx) => (
                                <div
                                  key={laneIdx}
                                  className="relative h-[44px] w-full"
                                >
                                  {laneEvents.length === 0 && laneIdx === 0 && (
                                    <div className="flex h-full items-center px-3 text-[11px] italic text-muted-foreground/60">
                                      Sem alocações agendadas neste período.
                                      {memberBacklog.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onUnscheduledProjectClick?.(
                                              memberBacklog[0]
                                            )
                                          }
                                          className="ml-2 not-italic font-bold text-primary hover:underline"
                                        >
                                          Agendar {memberBacklog[0].clientName}{" "}
                                          (#{memberBacklog[0].ticketNumber}) →
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {laneEvents.map((event) => {
                                    const { leftPct, widthPct } =
                                      computeBarCoordinates(
                                        new Date(event.start),
                                        new Date(event.end),
                                        timelineFirstMonday,
                                        timelineWeeks.length
                                      );

                                    const isVacation =
                                      event.type === "vacation";
                                    const badgeText =
                                      getSystemShortBadge(event);
                                    const displayTitle = isVacation
                                      ? event.title
                                      : event.clientName || event.title;
                                    const dateRangeShort = `${format(
                                      new Date(event.start),
                                      "dd/MM"
                                    )}–${format(
                                      new Date(event.end),
                                      "dd/MM"
                                    )}`;
                                    const subtitleParts = [
                                      event.ticketNumber
                                        ? `#${event.ticketNumber}`
                                        : null,
                                      dateRangeShort,
                                    ].filter(Boolean);

                                    const eventHolidays = isVacation
                                      ? []
                                      : getWeekdayHolidaysInRange(
                                          event.start,
                                          event.end
                                        );

                                    return (
                                      <Tooltip key={event.id}>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onEventClick?.(event)
                                            }
                                            style={{
                                              left: `calc(${leftPct.toFixed(
                                                4
                                              )}% + 2px)`,
                                              width: `calc(${widthPct.toFixed(
                                                4
                                              )}% - 4px)`,
                                              ...(isVacation
                                                ? {
                                                    backgroundImage:
                                                      "repeating-linear-gradient(-45deg, rgba(245,158,11,0.08), rgba(245,158,11,0.08) 6px, rgba(245,158,11,0.22) 6px, rgba(245,158,11,0.22) 12px)",
                                                  }
                                                : {}),
                                            }}
                                            className={cn(
                                              "group absolute top-0.5 bottom-0.5 flex flex-col justify-center overflow-hidden rounded-md px-2 py-0.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                                              getSystemBarClasses(event),
                                              event.hasVacationConflict &&
                                                "ring-2 ring-amber-400"
                                            )}
                                            data-testid="calendar-gantt-bar"
                                          >
                                            {/* Linha 1 da Barra: Badge + Confirmado + Alerta Conflito + Nome do Cartório */}
                                            <div className="flex min-w-0 items-center gap-1">
                                              <span
                                                className={cn(
                                                  "shrink-0 rounded px-1 py-0.2 text-[8.5px] font-extrabold uppercase tracking-wider",
                                                  isVacation
                                                    ? "bg-amber-600 text-white"
                                                    : "bg-white/25 text-white"
                                                )}
                                              >
                                                {badgeText}
                                              </span>

                                              {!isVacation &&
                                                event.isConfirmed && (
                                                  <span
                                                    className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-extrabold text-emerald-700 shadow-2xs"
                                                    title="Implantação Confirmada com o Cliente"
                                                  >
                                                    ✓
                                                  </span>
                                                )}

                                              {event.hasVacationConflict && (
                                                <span
                                                  className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-400 px-1 text-[8px] font-extrabold text-slate-950"
                                                  title={
                                                    event.vacationConflictText ||
                                                    "Conflito com período de férias"
                                                  }
                                                >
                                                  ⚠️ FÉRIAS
                                                </span>
                                              )}

                                              <span className="truncate text-[10.5px] font-extrabold uppercase tracking-tight leading-tight">
                                                {displayTitle}
                                              </span>
                                            </div>

                                            {/* Linha 2 da Barra: #Chamado + Período + Indicador de Feriado na Semana */}
                                            <div className="mt-0.5 flex min-w-0 items-center justify-between gap-1 text-[9.5px] font-semibold opacity-95">
                                              <span className="truncate">
                                                {subtitleParts.join(" • ")}
                                              </span>
                                              {eventHolidays.length > 0 && (
                                                <span
                                                  className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-400/95 px-1 text-[8px] font-extrabold text-slate-950"
                                                  title={`Semana com feriado em dia útil: ${eventHolidays
                                                    .map(
                                                      (h) =>
                                                        `${h.shortDate} (${h.name})`
                                                    )
                                                    .join(", ")}`}
                                                >
                                                  ⚠️ FERIADO
                                                </span>
                                              )}
                                            </div>
                                          </button>
                                        </TooltipTrigger>

                                        {/* POPOVER / TOOLTIP EXECUTIVO NO TEMA NATIVO SIPLAN HUB (SEM FUNDO PRETO) */}
                                        <TooltipContent
                                          side="top"
                                          align="center"
                                          className="z-50 w-80 max-w-[92vw] rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-xl sm:w-96"
                                        >
                                          <div className="space-y-2.5">
                                            {/* Badges Superiores */}
                                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                {event.ticketNumber && (
                                                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-extrabold text-foreground">
                                                    #{event.ticketNumber}
                                                  </span>
                                                )}
                                                <span
                                                  className={cn(
                                                    "rounded px-2 py-0.5 text-[10px] font-extrabold uppercase text-white",
                                                    isVacation
                                                      ? "bg-amber-600"
                                                      : event.systemCategory ===
                                                          "reg"
                                                        ? "bg-emerald-600"
                                                        : event.systemCategory ===
                                                            "pro"
                                                          ? "bg-blue-600"
                                                          : event.systemCategory ===
                                                              "shared"
                                                            ? "bg-violet-600"
                                                            : "bg-[#d3123f]"
                                                  )}
                                                >
                                                  {isVacation
                                                    ? "Férias (Admin)"
                                                    : event.systemType ||
                                                      "Fase 1"}
                                                </span>
                                              </div>

                                              {!isVacation && (
                                                <span
                                                  className={cn(
                                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase",
                                                    event.isConfirmed
                                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                                      : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                                                  )}
                                                >
                                                  {event.isConfirmed ? (
                                                    <>
                                                      <CheckCircle2 className="h-3 w-3" />
                                                      Confirmada pelo Cliente
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Clock className="h-3 w-3" />
                                                      Data Prevista
                                                    </>
                                                  )}
                                                </span>
                                              )}
                                            </div>

                                            {/* Alerta de Conflito com Férias no Tooltip */}
                                            {event.hasVacationConflict && (
                                              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                <span>
                                                  {event.vacationConflictText ||
                                                    "Atenção: Conflito com período de férias cadastrado no Admin."}
                                                </span>
                                              </div>
                                            )}

                                            {/* Alerta de Feriado em Dia Útil (2026/2027) no Tooltip */}
                                            {eventHolidays.length > 0 && (
                                              <div className="flex flex-col gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                  Semana com Feriado em Dia Útil:
                                                </span>
                                                {eventHolidays.map((h) => (
                                                  <span key={h.date}>
                                                    • {h.shortDate}/{h.year} (
                                                    {h.weekdayLabel}) — {h.name}
                                                  </span>
                                                ))}
                                              </div>
                                            )}

                                            {/* Nome Completo do Cartório */}
                                            <div>
                                              <h4 className="text-sm font-extrabold leading-snug text-popover-foreground">
                                                {displayTitle}
                                              </h4>
                                              {!isVacation && (
                                                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                                                  Status Fase 1:{" "}
                                                  <strong className="text-foreground">
                                                    {getStageStatusLabel(
                                                      event.stageStatus
                                                    )}
                                                  </strong>
                                                  {event.soldHours
                                                    ? ` • ${event.soldHours}h`
                                                    : ""}
                                                  {event.trainingLocation
                                                    ? ` • ${event.trainingLocation}`
                                                    : ""}
                                                </p>
                                              )}
                                            </div>

                                            {/* Implantador e Período Exato */}
                                            <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-border bg-muted/40 p-2 text-[11px] sm:grid-cols-2">
                                              <div className="flex items-start gap-1.5">
                                                <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                                <div className="min-w-0">
                                                  <div className="text-[9px] font-bold uppercase text-muted-foreground">
                                                    Implantador(es)
                                                  </div>
                                                  <div className="font-bold text-foreground break-words">
                                                    {event.allResponsibles &&
                                                    event.allResponsibles
                                                      .length > 1
                                                      ? event.allResponsibles.join(
                                                          " + "
                                                        )
                                                      : event.responsibleName ||
                                                        member.name}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex items-start gap-1.5">
                                                <CalendarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                                <div className="min-w-0">
                                                  <div className="text-[9px] font-bold uppercase text-muted-foreground">
                                                    {isVacation
                                                      ? "Período de Férias"
                                                      : "Período Fase 1"}
                                                  </div>
                                                  <div className="font-bold text-foreground">
                                                    {format(
                                                      new Date(event.start),
                                                      "dd/MM/yyyy"
                                                    )}{" "}
                                                    a{" "}
                                                    {format(
                                                      new Date(event.end),
                                                      "dd/MM/yyyy"
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Call to action */}
                                            <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] font-bold text-primary">
                                              <span className="flex items-center gap-1">
                                                <Rocket className="h-3 w-3" />
                                                {isVacation
                                                  ? "Clique para ver detalhes ou gerenciar em Férias (Admin)"
                                                  : "Clique para editar Fase 1 (Datas, Responsável e Confirmação)"}
                                              </span>
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            ABA 2: MAPA DE SIMULTANEIDADE SEMANAL POR IMPLANTADOR
           ===================================================================== */}
        {displayTab === "concurrency" && (
          <section
            className="flex min-w-0 max-w-full flex-col gap-2"
            data-testid="calendar-concurrency-view"
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border border-l-4 border-l-primary bg-muted/40 px-3 py-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="rounded bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary-foreground">
                  SIMULTANEIDADE DIA / SEMANA
                </span>
                <h2 className="truncate text-xs font-extrabold text-foreground sm:text-sm">
                  Mapa de Simultaneidade Semanal por Implantador (Fase 1 &amp;
                  Férias Admin)
                </h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Cruzamento direto das implantações da Fase 1 e férias na mesma
                janela de calendário • Clique em um card para editar
              </span>
            </div>

            <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[960px] border-collapse text-left">
                  <thead>
                    <tr className="border-b-2 border-primary bg-muted/70 text-foreground">
                      <th className="sticky left-0 z-20 w-[195px] border-r border-border bg-muted px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                        Semana / Período
                      </th>
                      {visibleMembers.map((member) => (
                        <th
                          key={member.id}
                          className="min-w-[175px] border-r border-border px-3 py-2.5 last:border-r-0"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold text-white",
                                member.color || "bg-emerald-600"
                              )}
                            >
                              {member.initials ||
                                member.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-extrabold text-foreground">
                                {member.name}
                              </div>
                              <div className="truncate text-[9.5px] font-semibold text-muted-foreground">
                                {member.defaultSystem || member.role}
                              </div>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {timelineWeeks.map((week) => {
                      const weekStart = startOfDay(week.monday);
                      const weekEnd = endOfDay(week.sunday);

                      const weekAllEvents = filteredEvents.filter((evt) => {
                        const s = startOfDay(new Date(evt.start));
                        const e = endOfDay(new Date(evt.end));
                        return e >= weekStart && s <= weekEnd;
                      });

                      const activeImplInWeek = new Set(
                        weekAllEvents
                          .filter((e) => e.type !== "vacation")
                          .map((e) => e.projectId || e.id)
                      ).size;

                      const vacationsInWeek = weekAllEvents.filter(
                        (e) => e.type === "vacation"
                      ).length;

                      const hasWeekHoliday = week.holidays.length > 0;

                      return (
                        <tr
                          key={week.code + week.monday.toISOString()}
                          className={cn(
                            "align-top transition-colors hover:bg-muted/20",
                            hasWeekHoliday &&
                              "bg-amber-500/[0.05] dark:bg-amber-500/[0.08]",
                            week.containsToday && "bg-primary/5"
                          )}
                        >
                          <td className="sticky left-0 z-10 border-r border-border bg-card px-3 py-2.5">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-extrabold text-foreground">
                                {week.label}
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-muted-foreground">
                                {format(week.monday, "MMM/yy", {
                                  locale: ptBR,
                                }).toUpperCase()}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                              {week.rangeLabel} (Seg–Sex)
                            </div>
                            {hasWeekHoliday && (
                              <div
                                className="mt-1 inline-flex items-center gap-1 rounded border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800 dark:text-amber-300"
                                title={week.holidaySummary}
                              >
                                <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                                <span>Feriado: {week.holidayBadge}</span>
                              </div>
                            )}
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[9px] font-extrabold",
                                  activeImplInWeek > 0
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {activeImplInWeek}{" "}
                                {activeImplInWeek === 1
                                  ? "implantação"
                                  : "simultâneas"}
                              </span>
                              {vacationsInWeek > 0 && (
                                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800 dark:text-amber-300">
                                  {vacationsInWeek} em férias
                                </span>
                              )}
                            </div>
                          </td>

                          {visibleMembers.map((member) => {
                            const cellEvents = weekAllEvents.filter(
                              (evt) => evt.resourceId === member.id
                            );

                            return (
                              <td
                                key={member.id}
                                className="border-r border-border p-2 last:border-r-0"
                              >
                                {cellEvents.length === 0 ? (
                                  <div className="flex h-full min-h-[46px] items-center justify-center rounded-lg border border-dashed border-border px-2 py-1.5 text-center text-[10px] text-muted-foreground/60">
                                    Disponível
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {cellEvents.map((evt) => {
                                      const isVac = evt.type === "vacation";
                                      return (
                                        <button
                                          key={evt.id}
                                          type="button"
                                          onClick={() => onEventClick?.(evt)}
                                          className={cn(
                                            "flex flex-col gap-0.5 rounded-lg p-2 text-left transition-all hover:scale-[1.01]",
                                            getSystemBarClasses(evt)
                                          )}
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="rounded bg-black/20 px-1 py-0.2 text-[8.5px] font-extrabold uppercase">
                                              {getSystemShortBadge(evt)}
                                            </span>
                                            {!isVac && evt.isConfirmed && (
                                              <span className="rounded bg-white px-1 text-[8px] font-extrabold text-emerald-700">
                                                ✓ CONF
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] font-extrabold leading-snug break-words">
                                            {evt.clientName || evt.title}
                                          </div>
                                          <div className="text-[9.5px] font-semibold opacity-90">
                                            {evt.ticketNumber
                                              ? `#${evt.ticketNumber} • `
                                              : ""}
                                            {format(
                                              new Date(evt.start),
                                              "dd/MM"
                                            )}{" "}
                                            a{" "}
                                            {format(new Date(evt.end), "dd/MM")}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            ABA 3: PIPELINE SEM DATA NA FASE 1 (FILA DE AGENDAMENTO DIRETO)
           ===================================================================== */}
        {displayTab === "backlog" && (
          <section
            className="flex min-w-0 max-w-full flex-col gap-3"
            data-testid="calendar-backlog-view"
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                    PIPELINE FASE 1 SEM DATA ({filteredBacklog.length})
                  </span>
                  <h2 className="text-xs font-extrabold text-foreground sm:text-sm">
                    Projetos Aguardando Definição de Cronograma da Fase 1
                  </h2>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Estes projetos estão ativos no Siplan HUB, mas ainda não
                  possuem data de Início/Término preenchida na Fase 1
                  (Treinamento &amp; Acompanhamento). Clique em{" "}
                  <strong>Agendar Fase 1</strong> para definir as datas e
                  fazê-los aparecer imediatamente na Timeline!
                </p>
              </div>
            </div>

            {filteredBacklog.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-sm font-extrabold text-foreground">
                  Nenhum projeto pendente de data para os filtros selecionados!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Todas as implantações correspondentes já possuem cronograma
                  definido na Fase 1.
                </p>
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredBacklog.map((item) => {
                  // Padronização Oficial: REG = Verde, PRO = Azul, TN = Vermelho
                  const borderClass =
                    item.systemCategory === "reg"
                      ? "border-l-emerald-600"
                      : item.systemCategory === "pro"
                        ? "border-l-blue-600"
                        : item.systemCategory === "tn"
                           ? "border-l-[#d3123f]"
                          : "border-l-amber-500";

                  const badgeColorClass =
                    item.systemCategory === "reg"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : item.systemCategory === "pro"
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        : item.systemCategory === "tn"
                          ? "border-[#d3123f]/40 bg-[#d3123f]/10 text-[#d3123f] dark:text-rose-300"
                          : "";

                  return (
                    <article
                      key={item.projectId}
                      onClick={() => onUnscheduledProjectClick?.(item)}
                      className={cn(
                        "group flex min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-xl border border-l-4 bg-card p-3.5 shadow-xs transition-all hover:shadow-md",
                        borderClass
                      )}
                      data-testid="calendar-backlog-card"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-extrabold text-foreground">
                              #{item.ticketNumber || "S/N"}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-extrabold uppercase",
                                badgeColorClass
                              )}
                            >
                              {item.systemType}
                            </Badge>
                          </div>

                          <Badge
                            variant="secondary"
                            className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9.5px] font-bold"
                          >
                            Sem Data Fase 1
                          </Badge>
                        </div>

                        <h3 className="break-words text-sm font-extrabold text-foreground group-hover:text-primary transition-colors">
                          {item.clientName}
                        </h3>

                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-foreground">
                            <UserRound className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {item.responsibleRaw || "Responsável a Definir"}
                            </span>
                          </span>
                          {item.soldHours && (
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {item.soldHours}h contratadas
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t pt-2.5">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Status: {getStageStatusLabel(item.stageStatus)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnscheduledProjectClick?.(item);
                          }}
                          className="h-7 gap-1.5 bg-primary px-3 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          <Rocket className="h-3 w-3" />
                          Agendar Fase 1
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </TooltipProvider>
  );
}

// Zona de Drop para o Modo Playground
function DayDroppableZone({
  day,
  isInteractiveMode,
}: {
  day: Date;
  isInteractiveMode: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, "yyyy-MM-dd"),
    data: { date: day },
    disabled: !isInteractiveMode,
  });

  return (
    <div
      ref={setNodeRef}
      data-date={format(day, "yyyy-MM-dd")}
      className={cn(
        "h-full w-full transition-colors",
        isOver &&
          isInteractiveMode &&
          "bg-primary/15 ring-2 ring-inset ring-primary/40"
      )}
    />
  );
}
