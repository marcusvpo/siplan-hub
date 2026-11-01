import React, { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { UnifiedAgendaEvent } from "@/types/agenda";
import {
  getWeekdayHolidaysInRange,
  type WeekdayHoliday,
} from "@/lib/calendar-holidays";
import {
  Activity,
  Rocket,
  Sparkles,
  Scale,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AgendaKpiStripProps {
  events: UnifiedAgendaEvent[];
  selectedDate?: Date;
  selectedUserNames?: string[];
  holidays?: WeekdayHoliday[];
  isLoading?: boolean;
  onFilterClick?: (filterType: "all" | "phase1") => void;
  activeFilter?: string;
  className?: string;
}

export interface AgendaKpiMetrics {
  totalEvents: number;
  orionTicketsCount: number;
  legacyTicketsCount: number;
  analystsCount: number;
  totalPhase1: number;
  phase1Confirmed: number;
  phase1Planned: number;
  phase1ConfirmationRate: number;
  totalAdherenceAndHomolog: number;
  adherenceCount: number;
  homologationCount: number;
  totalBusinessDays: number;
  activeBusinessDays: number;
  occupancyRate: number;
  forensicHolidays: WeekdayHoliday[];
}

/**
 * Calcula metricamente os 4 indicadores do topo da Agenda com base no mês e nos eventos selecionados.
 */
export function computeAgendaKpiMetrics(
  events: UnifiedAgendaEvent[],
  selectedDate: Date = new Date(),
  customHolidays?: WeekdayHoliday[]
): AgendaKpiMetrics {
  const mStart = startOfMonth(selectedDate);
  const mEnd = endOfMonth(selectedDate);
  const monthPrefix = format(selectedDate, "yyyy-MM");

  // Filtra apenas eventos do mês atual de referência
  const monthEvents = events.filter((e) => e.date?.startsWith(monthPrefix));

  // CARD 1: Total de Atividades / Chamados no Mês
  const totalEvents = monthEvents.length;
  const orionTicketsCount = monthEvents.filter(
    (e) => e.ticketCatalog !== "legacy" && e.activityType === "chamado"
  ).length;
  const legacyTicketsCount = monthEvents.filter(
    (e) => e.ticketCatalog === "legacy" && e.activityType === "chamado"
  ).length;
  const analystsSet = new Set(monthEvents.map((e) => e.userName).filter(Boolean));
  const analystsCount = analystsSet.size;

  // CARD 2: Implantações Fase 1 (Confirmadas vs Previstas)
  const phase1Events = monthEvents.filter(
    (e) => e.origin === "phase1_implementation" || e.activityType === "implantacao"
  );
  const phase1Confirmed = phase1Events.filter(
    (e) => e.isConfirmed || (e.status && /confirmad/i.test(e.status))
  ).length;
  const phase1Planned = phase1Events.length - phase1Confirmed;
  const phase1ConfirmationRate =
    phase1Events.length > 0
      ? Math.round((phase1Confirmed / phase1Events.length) * 100)
      : 0;

  // CARD 3: Análises de Aderência & Homologações
  const adherenceCount = monthEvents.filter(
    (e) => e.origin === "adherence" || e.activityType === "aderencia"
  ).length;
  const homologationCount = monthEvents.filter(
    (e) => e.origin === "conversion_homologation" || e.activityType === "homologacao"
  ).length;
  const totalAdherenceAndHomolog = adherenceCount + homologationCount;

  // CARD 4: Dias Úteis Ativos no Mês vs Feriados Forenses
  const allDaysInMonth = eachDayOfInterval({ start: mStart, end: mEnd });
  const weekdaysInMonth = allDaysInMonth.filter((d) => !isWeekend(d));

  const forensicHolidays = customHolidays || getWeekdayHolidaysInRange(mStart, mEnd);
  const holidayDateSet = new Set(forensicHolidays.map((h) => h.date));

  const availableWorkingDays = weekdaysInMonth.filter(
    (d) => !holidayDateSet.has(format(d, "yyyy-MM-dd"))
  );
  const totalBusinessDays = availableWorkingDays.length;

  const activeDaysSet = new Set(
    monthEvents
      .map((e) => e.date)
      .filter((dateStr) => {
        const d = new Date(`${dateStr}T12:00:00`);
        return !isWeekend(d) && !holidayDateSet.has(dateStr);
      })
  );
  const activeBusinessDays = activeDaysSet.size;
  const occupancyRate =
    totalBusinessDays > 0
      ? Math.min(100, Math.round((activeBusinessDays / totalBusinessDays) * 100))
      : 0;

  return {
    totalEvents,
    orionTicketsCount,
    legacyTicketsCount,
    analystsCount,
    totalPhase1: phase1Events.length,
    phase1Confirmed,
    phase1Planned,
    phase1ConfirmationRate,
    totalAdherenceAndHomolog,
    adherenceCount,
    homologationCount,
    totalBusinessDays,
    activeBusinessDays,
    occupancyRate,
    forensicHolidays,
  };
}

export function AgendaKpiStrip({
  events,
  selectedDate = new Date(),
  selectedUserNames = [],
  holidays,
  isLoading = false,
  onFilterClick,
  activeFilter,
  className,
}: AgendaKpiStripProps) {
  const metrics = useMemo(
    () => computeAgendaKpiMetrics(events, selectedDate, holidays),
    [events, selectedDate, holidays]
  );

  const monthLabel = useMemo(
    () => format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR }),
    [selectedDate]
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-w-xl",
          className
        )}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg border border-border/60 bg-card p-2.5 shadow-2xs animate-pulse flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <div className="h-2.5 w-20 rounded bg-muted" />
              <div className="h-4 w-12 rounded bg-muted" />
            </div>
            <div className="h-7 w-7 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Indicadores da Agenda dos Analistas"
      className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-w-xl", className)}
    >
      {/* CARD 1: Total de Atividades */}
      <div
        role={onFilterClick ? "button" : "group"}
        tabIndex={onFilterClick ? 0 : undefined}
        onClick={() => onFilterClick?.("all")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onFilterClick?.("all");
        }}
        className={cn(
          "group relative flex min-w-0 items-center justify-between rounded-lg border border-border/70 bg-card/90 px-3 py-2 shadow-2xs transition-all duration-150 text-left overflow-hidden",
          onFilterClick &&
            "cursor-pointer hover:border-blue-500/40 hover:bg-card active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          activeFilter === "all" && "ring-1.5 ring-blue-500 border-blue-500"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total de Atividades
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-black tracking-tight text-foreground">
              {metrics.totalEvents}
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="inline-flex items-center rounded bg-blue-50 px-1 py-0.2 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {metrics.orionTicketsCount} Orion
              </span>
              <span className="inline-flex items-center rounded bg-orange-50 px-1 py-0.2 font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                {metrics.legacyTicketsCount} Legado
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 ml-2">
          <Activity className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* CARD 2: Implantações */}
      <div
        role={onFilterClick ? "button" : "group"}
        tabIndex={onFilterClick ? 0 : undefined}
        onClick={() => onFilterClick?.("phase1")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onFilterClick?.("phase1");
        }}
        className={cn(
          "group relative flex min-w-0 items-center justify-between rounded-lg border border-border/70 bg-card/90 px-3 py-2 shadow-2xs transition-all duration-150 text-left overflow-hidden",
          onFilterClick &&
            "cursor-pointer hover:border-emerald-500/40 hover:bg-card active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
          activeFilter === "phase1" && "ring-1.5 ring-emerald-500 border-emerald-500"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Implantações
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-black tracking-tight text-foreground">
              {metrics.totalPhase1}
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100/70 px-1 py-0.2 font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                {metrics.phase1Confirmed} Conf.
              </span>
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-100/70 px-1 py-0.2 font-semibold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                <Clock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                {metrics.phase1Planned} Prev.
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ml-2">
          <Rocket className="h-3.5 w-3.5" />
        </div>
      </div>
    </section>
  );
}
