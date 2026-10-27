import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarStore } from "@/stores/calendarStore";
import {
  CALENDAR_MEMBERS,
  CalendarMember,
  CalendarStatusFilter,
  CalendarSystemFilter,
  CalendarViewMode,
} from "@/types/calendar";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  FolderKanban,
  GanttChartSquare,
  Layers,
  Palmtree,
  RotateCcw,
  Search,
  Table2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface CalendarKpiSummary {
  totalAllocations: number;
  uniqueClients: number;
  regCount: number;
  proCount: number;
  tnCount: number;
  confirmedCount: number;
  plannedCount: number;
  vacationsCount: number;
  unscheduledCount: number;
}

interface CalendarControlsProps {
  kpis?: CalendarKpiSummary;
  members?: CalendarMember[];
  memberAllocationCounts?: Record<string, number>;
  monthEventCounts?: number[];
  onJumpToMonth?: (monthIndex: number) => void;
  onJumpToToday?: () => void;
  onOpenVacationsAdmin?: () => void;
}

const QUARTER_OPTIONS: Array<{
  value: 1 | 2 | 3 | 4;
  shortLabel: string;
  fullLabel: string;
  monthsLabel: string;
}> = [
  {
    value: 1,
    shortLabel: "1º Tri",
    fullLabel: "1º Tri (Jan–Mar)",
    monthsLabel: "Janeiro a Março",
  },
  {
    value: 2,
    shortLabel: "2º Tri",
    fullLabel: "2º Tri (Abr–Jun)",
    monthsLabel: "Abril a Junho",
  },
  {
    value: 3,
    shortLabel: "3º Tri",
    fullLabel: "3º Tri (Jul–Set)",
    monthsLabel: "Julho a Setembro",
  },
  {
    value: 4,
    shortLabel: "4º Tri",
    fullLabel: "4º Tri (Out–Dez)",
    monthsLabel: "Outubro a Dezembro",
  },
];

const MONTH_SHORT_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function CalendarControls({
  kpis,
  members = CALENDAR_MEMBERS,
  memberAllocationCounts = {},
  monthEventCounts,
  onJumpToMonth,
  onJumpToToday,
  onOpenVacationsAdmin,
}: CalendarControlsProps) {
  const viewMode = useCalendarStore((state) => state.viewMode);
  const setViewMode = useCalendarStore((state) => state.setViewMode);
  const currentDate = useCalendarStore((state) => state.currentDate);
  const setCurrentDate = useCalendarStore((state) => state.setCurrentDate);
  const selectedYear = useCalendarStore((state) => state.selectedYear);
  const setSelectedYear = useCalendarStore((state) => state.setSelectedYear);
  const selectedQuarter = useCalendarStore((state) => state.selectedQuarter);
  const setSelectedQuarter = useCalendarStore(
    (state) => state.setSelectedQuarter
  );
  const displayTab = useCalendarStore((state) => state.displayTab);
  const setDisplayTab = useCalendarStore((state) => state.setDisplayTab);
  const searchQuery = useCalendarStore((state) => state.searchQuery);
  const setSearchQuery = useCalendarStore((state) => state.setSearchQuery);
  const systemFilter = useCalendarStore((state) => state.systemFilter);
  const setSystemFilter = useCalendarStore((state) => state.setSystemFilter);
  const statusFilter = useCalendarStore((state) => state.statusFilter);
  const setStatusFilter = useCalendarStore((state) => state.setStatusFilter);
  const onlyActiveMembers = useCalendarStore(
    (state) => state.onlyActiveMembers
  );
  const setOnlyActiveMembers = useCalendarStore(
    (state) => state.setOnlyActiveMembers
  );
  const hiddenResourceIds = useCalendarStore(
    (state) => state.hiddenResourceIds
  );
  const toggleResourceVisibility = useCalendarStore(
    (state) => state.toggleResourceVisibility
  );
  const clearHiddenResources = useCalendarStore(
    (state) => state.clearHiddenResources
  );
  const resetFilters = useCalendarStore((state) => state.resetFilters);
  const isInteractiveMode = useCalendarStore(
    (state) => state.isInteractiveMode
  );
  const setInteractiveMode = useCalendarStore(
    (state) => state.setInteractiveMode
  );
  const importRealDataToSandbox = useCalendarStore(
    (state) => state.importRealDataToSandbox
  );
  const realEvents = useCalendarStore((state) => state.realEvents);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fallback KPI calculation if not provided by parent
  const computedKpis = useMemo<CalendarKpiSummary>(() => {
    if (kpis) return kpis;

    let rangeStart: Date;
    let rangeEnd: Date;

    if (viewMode === "year") {
      rangeStart = startOfDay(new Date(selectedYear, 0, 1));
      rangeEnd = endOfDay(new Date(selectedYear, 11, 31));
    } else if (viewMode === "quarter") {
      const startMonth = (selectedQuarter - 1) * 3;
      rangeStart = startOfDay(new Date(selectedYear, startMonth, 1));
      rangeEnd = endOfDay(
        endOfMonth(new Date(selectedYear, startMonth + 2, 1))
      );
    } else {
      rangeStart = startOfMonth(currentDate);
      rangeEnd = endOfMonth(currentDate);
    }

    const inPeriod = realEvents.filter((evt) => {
      const s = startOfDay(new Date(evt.start));
      const e = endOfDay(new Date(evt.end));
      return e >= rangeStart && s <= rangeEnd;
    });

    const implEvents = inPeriod.filter((e) => e.type !== "vacation");
    const vacEvents = inPeriod.filter((e) => e.type === "vacation");

    const uniqueProjectIds = new Set<string>();
    const uniqueClientNames = new Set<string>();
    let regCount = 0;
    let proCount = 0;
    let tnCount = 0;
    let confirmedCount = 0;
    let plannedCount = 0;

    for (const evt of implEvents) {
      const key = evt.projectId || evt.id;
      if (evt.clientName) uniqueClientNames.add(evt.clientName);
      if (uniqueProjectIds.has(key)) continue;
      uniqueProjectIds.add(key);

      if (evt.systemCategory === "reg") {
        regCount += 1;
      } else if (evt.systemCategory === "pro") {
        proCount += 1;
      } else if (evt.systemCategory === "tn") {
        tnCount += 1;
      }

      if (evt.isConfirmed) {
        confirmedCount += 1;
      } else {
        plannedCount += 1;
      }
    }

    return {
      totalAllocations: implEvents.length,
      uniqueClients: uniqueClientNames.size || uniqueProjectIds.size,
      regCount,
      proCount,
      tnCount,
      confirmedCount,
      plannedCount,
      vacationsCount: vacEvents.length,
      unscheduledCount: 0,
    };
  }, [kpis, realEvents, viewMode, selectedYear, selectedQuarter, currentDate]);

  // Calcula quantidade de eventos por mês do ano selecionado (se não enviado via prop)
  const computedMonthCounts = useMemo<number[]>(() => {
    if (monthEventCounts && monthEventCounts.length === 12) {
      return monthEventCounts;
    }
    const counts = Array(12).fill(0);
    for (let m = 0; m < 12; m += 1) {
      const mStart = startOfDay(new Date(selectedYear, m, 1));
      const mEnd = endOfDay(endOfMonth(mStart));
      counts[m] = realEvents.filter((evt) => {
        const s = startOfDay(new Date(evt.start));
        const e = endOfDay(new Date(evt.end));
        return e >= mStart && s <= mEnd;
      }).length;
    }
    return counts;
  }, [monthEventCounts, realEvents, selectedYear]);

  const handlePreviousPeriod = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "year") {
      setSelectedYear(selectedYear - 1);
      return;
    }
    if (viewMode === "quarter") {
      if (selectedQuarter === 1) {
        setSelectedYear(selectedYear - 1);
        setSelectedQuarter(4);
      } else {
        setSelectedQuarter((selectedQuarter - 1) as 1 | 2 | 3 | 4);
      }
      return;
    }
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
      return;
    }
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
      return;
    }
    setCurrentDate(subDays(currentDate, 1));
  };

  const handleNextPeriod = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "year") {
      setSelectedYear(selectedYear + 1);
      return;
    }
    if (viewMode === "quarter") {
      if (selectedQuarter === 4) {
        setSelectedYear(selectedYear + 1);
        setSelectedQuarter(1);
      } else {
        setSelectedQuarter((selectedQuarter + 1) as 1 | 2 | 3 | 4);
      }
      return;
    }
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
      return;
    }
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
      return;
    }
    setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date());
    onJumpToToday?.();
  };

  const scopeBadgeText = useMemo(() => {
    if (viewMode === "year") {
      return `Ano ${selectedYear} • 12 Meses`;
    }
    if (viewMode === "quarter") {
      const q = QUARTER_OPTIONS.find((item) => item.value === selectedQuarter);
      return `${q?.fullLabel || `${selectedQuarter}º Tri`} / ${selectedYear}`;
    }
    if (viewMode === "month") {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return format(currentDate, "dd 'de' MMM, yyyy", { locale: ptBR });
  }, [viewMode, selectedYear, selectedQuarter, currentDate]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    systemFilter !== "all" ||
    statusFilter !== "all" ||
    onlyActiveMembers ||
    hiddenResourceIds.length > 0;

  return (
    <div
      className="z-30 grid min-w-0 max-w-full grid-cols-1 gap-2.5 border-b bg-background/95 px-2.5 py-2.5 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4 md:py-3"
      data-testid="calendar-controls"
    >
      {/* 1. CABEÇALHO EXECUTIVO + SELETOR DE ESCOPO (TEMA NATIVO SIPLAN HUB) */}
      <div className="flex min-w-0 flex-col justify-between gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-card-foreground shadow-xs border-l-4 border-l-primary lg:flex-row lg:items-center lg:px-4">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/25" />
            <span>SIPLAN HUB</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">
              DIRETORIA DE IMPLANTAÇÃO &amp; OPERAÇÕES
            </span>
          </div>
          <h1 className="min-w-0 break-words text-sm font-extrabold tracking-tight text-foreground sm:text-base md:text-lg">
            Planejamento Executivo de Implantações — Fase 1 (Treinamento &amp;
            Acompanhamento)
          </h1>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Timeline exclusiva da etapa <strong className="text-foreground">Fase 1</strong> dos projetos e{" "}
            <strong className="text-foreground">Férias cadastradas no Admin</strong>, sincronizada por
            semana útil (Seg–Sex) com alerta de feriados 2026/2027.
          </p>
        </div>

        {/* Controles rápidos de Ano / Período / Férias Admin no Header */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          {/* Seletor de Ano */}
          <div className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs text-foreground">
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              title="Ano anterior"
              aria-label="Ano anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-extrabold tracking-tight text-foreground">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              title="Próximo ano"
              aria-label="Próximo ano"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Navegação Período Anterior / Hoje / Próximo */}
          <div className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs text-foreground">
            <button
              type="button"
              onClick={handlePreviousPeriod}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Período anterior"
              title="Período anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleNextPeriod}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Próximo período"
              title="Próximo período"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Atalho Férias Admin */}
          {onOpenVacationsAdmin && (
            <button
              type="button"
              onClick={onOpenVacationsAdmin}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 transition-colors hover:bg-amber-500/20"
              title="Gerenciar Férias dos Implantadores no Admin"
            >
              <Palmtree className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Férias (Admin)</span>
            </button>
          )}

          {/* Pill de Escopo */}
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-xs">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{scopeBadgeText}</span>
          </span>
        </div>
      </div>

      {/* 2. FAIXA DE 6 KPIs EXECUTIVOS CLICÁVEIS (CORES OFICIAIS: REG=VERDE, PRO=AZUL, TN=VERMELHO) */}
      <div
        className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
        data-testid="calendar-kpi-strip"
      >
        {/* KPI 1: Total de Alocações */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter("all");
            setStatusFilter("all");
            setDisplayTab("timeline");
          }}
          className={cn(
            "group flex min-w-0 flex-col justify-between rounded-lg border border-t-4 border-t-primary bg-card p-2 text-left transition-all hover:shadow-md",
            systemFilter === "all" &&
              statusFilter === "all" &&
              displayTab === "timeline" &&
              "ring-2 ring-primary/25 bg-primary/5"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Alocações Fase 1
            </span>
            <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {computedKpis.totalAllocations}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              no período
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {computedKpis.uniqueClients} cartórios • Clique p/ ver todos
          </div>
        </button>

        {/* KPI 2: Orion REG = VERDE (Emerald) */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter(systemFilter === "reg" ? "all" : "reg");
            if (displayTab === "backlog") setDisplayTab("timeline");
          }}
          className={cn(
            "group flex min-w-0 flex-col justify-between rounded-lg border border-t-4 border-t-emerald-600 bg-card p-2 text-left transition-all hover:shadow-md",
            systemFilter === "reg" &&
              "ring-2 ring-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/25"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Orion REG
            </span>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300">
              REG
            </span>
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {computedKpis.regCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              implantações
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {systemFilter === "reg"
              ? "Filtro Orion REG ativo (clique p/ limpar)"
              : "Registro de Imóveis / TD&PJ"}
          </div>
        </button>

        {/* KPI 3: Orion PRO = AZUL (Blue) */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter(systemFilter === "pro" ? "all" : "pro");
            if (displayTab === "backlog") setDisplayTab("timeline");
          }}
          className={cn(
            "group flex min-w-0 flex-col justify-between rounded-lg border border-t-4 border-t-blue-600 bg-card p-2 text-left transition-all hover:shadow-md",
            systemFilter === "pro" &&
              "ring-2 ring-blue-600 bg-blue-50/60 dark:bg-blue-950/25"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Orion PRO
            </span>
            <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-700 dark:text-blue-300">
              PRO
            </span>
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {computedKpis.proCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              implantações
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {systemFilter === "pro"
              ? "Filtro Orion PRO ativo (clique p/ limpar)"
              : "Tabelionato de Protesto"}
          </div>
        </button>

        {/* KPI 4: Orion TN = VERMELHO (Bordô Siplan / Rose) */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter(systemFilter === "tn" ? "all" : "tn");
            if (displayTab === "backlog") setDisplayTab("timeline");
          }}
          className={cn(
            "group flex min-w-0 flex-col justify-between rounded-lg border border-t-4 border-t-[#d3123f] bg-card p-2 text-left transition-all hover:shadow-md",
            systemFilter === "tn" &&
              "ring-2 ring-[#d3123f] bg-rose-50/60 dark:bg-rose-950/25"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-[#d3123f] dark:text-rose-400">
              Orion TN
            </span>
            <span className="rounded bg-[#d3123f]/15 px-1.5 py-0.5 text-[9px] font-extrabold text-[#d3123f] dark:text-rose-300">
              TN
            </span>
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {computedKpis.tnCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              implantações
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {systemFilter === "tn"
              ? "Filtro Orion TN ativo (clique p/ limpar)"
              : "Tabelionato de Notas"}
          </div>
        </button>

        {/* KPI 5: Datas Confirmadas vs Previstas */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "confirmed" ? "all" : "confirmed");
            if (displayTab === "backlog") setDisplayTab("timeline");
          }}
          className={cn(
            "group flex min-w-0 flex-col justify-between rounded-lg border border-t-4 border-t-violet-600 bg-card p-2 text-left transition-all hover:shadow-md",
            statusFilter === "confirmed" &&
              "ring-2 ring-violet-600 bg-purple-50/60 dark:bg-purple-950/25"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-purple-400">
              Confirmadas ✓
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {computedKpis.confirmedCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              confirmadas
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {computedKpis.plannedCount} previstas na agenda dos analistas
          </div>
        </button>

        {/* KPI 6: Férias (Admin) & Pipeline Sem Data */}
        <button
          type="button"
          onClick={() =>
            setDisplayTab(displayTab === "backlog" ? "timeline" : "backlog")
          }
          className={cn(
            "group flex min-w-0 flex-col justify-between rounded-lg border border-t-4 border-t-amber-500 bg-card p-2 text-left transition-all hover:shadow-md",
            displayTab === "backlog" &&
              "ring-2 ring-amber-500 bg-amber-50/60 dark:bg-amber-950/25"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Fila Sem Data &amp; Férias
            </span>
            <Palmtree className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {computedKpis.unscheduledCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              sem data
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {computedKpis.vacationsCount} férias (Admin) • Clique p/ agendar
          </div>
        </button>
      </div>

      {/* 3. BARRA DE ESCOPO TEMPORAL (TRIMESTRE / 12 MESES / MÊS) + ABAS DE VISUALIZAÇÃO */}
      <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/25 p-2 xl:flex-row xl:items-center xl:justify-between">
        {/* Esquerda: Modo de Escopo (Trimestre vs 12 Meses vs Mês) + Seletor de Trimestre ou Mês */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* Botões de Escopo */}
          <div
            className="inline-flex min-w-0 flex-wrap items-center rounded-lg border bg-background p-0.5 shadow-2xs"
            role="group"
            aria-label="Escopo temporal da timeline"
          >
            <button
              type="button"
              onClick={() => setViewMode("quarter")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold transition-colors",
                viewMode === "quarter"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Por Trimestre</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("year")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold transition-colors",
                viewMode === "year"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>12 Meses (Ano Inteiro)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold transition-colors",
                viewMode === "month"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Mês</span>
            </button>
          </div>

          {/* Botões dos 4 Trimestres quando viewMode === 'quarter' */}
          {viewMode === "quarter" && (
            <div
              className="flex min-w-0 flex-wrap items-center gap-1"
              data-testid="calendar-quarter-selector"
            >
              {QUARTER_OPTIONS.map((q) => {
                const isSelected = selectedQuarter === q.value;
                return (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setSelectedQuarter(q.value)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[11px] font-bold transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="sm:hidden">{q.shortLabel}</span>
                    <span className="hidden sm:inline">{q.fullLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Barra Rápida dos 12 Meses com Contadores de Eventos quando viewMode === 'year' ou 'month' */}
          {(viewMode === "year" || viewMode === "month") && (
            <div
              className="flex min-w-0 flex-wrap items-center gap-1"
              data-testid="calendar-months-quickbar"
            >
              {MONTH_SHORT_NAMES.map((monthLabel, idx) => {
                const isCurrentMonthSelected =
                  viewMode === "month" && currentDate.getMonth() === idx;
                const countInMonth = computedMonthCounts[idx] || 0;
                return (
                  <button
                    key={monthLabel}
                    type="button"
                    onClick={() => {
                      if (viewMode === "year") {
                        onJumpToMonth?.(idx);
                      } else {
                        setCurrentDate(new Date(selectedYear, idx, 1));
                      }
                    }}
                    className={cn(
                      "inline-flex h-6 items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-bold transition-colors",
                      isCurrentMonthSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : countInMonth > 0
                          ? "border-border bg-background text-foreground hover:border-primary"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                    title={
                      viewMode === "year"
                        ? `Rolar timeline para ${monthLabel}/${selectedYear} (${countInMonth} alocações)`
                        : `Exibir ${monthLabel}/${selectedYear} (${countInMonth} alocações)`
                    }
                  >
                    <span>{monthLabel}</span>
                    {countInMonth > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1 text-[8.5px] font-extrabold leading-tight",
                          isCurrentMonthSelected
                            ? "bg-white/25 text-white"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        {countInMonth}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Select auxiliar para manter compatibilidade com leitores de tela */}
          <div className="sr-only">
            <Select
              value={viewMode}
              onValueChange={(v) => setViewMode(v as CalendarViewMode)}
            >
              <SelectTrigger
                className="h-10 min-w-0 flex-1 text-[11px] md:h-7 md:w-[100px] md:flex-none md:text-[10px]"
                aria-label="Visualização do calendário"
              >
                <SelectValue placeholder="Visualização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">12 Meses</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="day">Dia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Direita: Abas de Visão (Timeline Master / Simultaneidade Semanal / Pipeline Sem Data) + Playground */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 xl:justify-end">
          <div
            className="inline-flex min-w-0 flex-wrap items-center rounded-lg border bg-background p-0.5 shadow-2xs"
            data-testid="calendar-display-tabs"
          >
            <button
              type="button"
              onClick={() => setDisplayTab("timeline")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold transition-colors",
                displayTab === "timeline"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GanttChartSquare className="h-3.5 w-3.5 shrink-0" />
              <span>Timeline Master</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayTab("concurrency")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold transition-colors",
                displayTab === "concurrency"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Table2 className="h-3.5 w-3.5 shrink-0" />
              <span>Simultaneidade Semanal</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayTab("backlog")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold transition-colors",
                displayTab === "backlog"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FolderKanban className="h-3.5 w-3.5 shrink-0" />
              <span>Pipeline Sem Data</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[9px] font-extrabold",
                  displayTab === "backlog"
                    ? "bg-white/25 text-white"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                )}
              >
                {computedKpis.unscheduledCount}
              </span>
            </button>
          </div>

          {/* Toggle Real vs Playground */}
          <div className="flex items-center gap-1.5">
            <div className="inline-flex h-8 items-center rounded-lg border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setInteractiveMode(false)}
                className={cn(
                  "h-7 rounded-md px-2 text-[10px] font-bold transition-colors",
                  !isInteractiveMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Real
              </button>
              <button
                type="button"
                onClick={() => setInteractiveMode(true)}
                className={cn(
                  "h-7 rounded-md px-2 text-[10px] font-bold transition-colors",
                  isInteractiveMode
                    ? "bg-amber-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Playground
              </button>
            </div>

            {isInteractiveMode && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 border-amber-300 px-2 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                onClick={() => importRealDataToSandbox()}
              >
                <Copy className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Copiar dados reais</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2 text-[10px] md:hidden"
              onClick={() => setShowMobileFilters((prev) => !prev)}
            >
              <Filter className="h-3 w-3" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 4. BARRA DE FILTROS INSTANTÂNEOS (BUSCA, SISTEMA, STATUS E IMPLANTADORES) */}
      <div
        className={cn(
          "min-w-0 flex-col gap-2",
          showMobileFilters ? "flex" : "hidden md:flex"
        )}
      >
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          {/* Busca por Cartório, Chamado ou Implantador */}
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cartório, #chamado ou implantador..."
              className="h-8 pl-8 pr-7 text-xs bg-background"
              data-testid="calendar-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filtros de Sistema (REG=Verde, PRO=Azul, TN=Vermelho), Status e Apenas Ativos */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {/* Sistema */}
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
              {(
                [
                  { id: "all", label: "Todos Sistemas" },
                  { id: "reg", label: "Orion REG" },
                  { id: "pro", label: "Orion PRO" },
                  { id: "tn", label: "Orion TN" },
                ] as Array<{ id: CalendarSystemFilter; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSystemFilter(item.id)}
                  className={cn(
                    "h-6 rounded-md px-2 text-[10px] font-bold transition-colors",
                    systemFilter === item.id
                      ? item.id === "reg"
                        ? "bg-emerald-600 text-white"
                        : item.id === "pro"
                          ? "bg-blue-600 text-white"
                          : item.id === "tn"
                            ? "bg-[#d3123f] text-white"
                            : "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
              {(
                [
                  { id: "all", label: "Todos Status" },
                  { id: "confirmed", label: "✓ Confirmados" },
                  { id: "planned", label: "Previstos" },
                  { id: "in-progress", label: "Em Andamento" },
                  { id: "done", label: "Concluídos" },
                ] as Array<{ id: CalendarStatusFilter; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatusFilter(item.id)}
                  className={cn(
                    "h-6 rounded-md px-2 text-[10px] font-bold transition-colors",
                    statusFilter === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Apenas Implantadores com Alocação no Período */}
            <button
              type="button"
              onClick={() => setOnlyActiveMembers(!onlyActiveMembers)}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-bold transition-colors",
                onlyActiveMembers
                  ? "border-[#d3123f] bg-[#d3123f]/10 text-[#d3123f] dark:border-rose-400 dark:text-rose-300"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-3 w-3" />
              <span>Apenas com alocação</span>
            </button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 gap-1 px-2 text-[10px] font-bold text-[#d3123f] hover:bg-rose-50 hover:text-[#d3123f] dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpar filtros</span>
              </Button>
            )}
          </div>
        </div>

        {/* Chips de Implantadores (Ocultar / Exibir Raias) */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mr-1">
            Implantadores:
          </span>
          {members.map((member) => {
            const isHidden = hiddenResourceIds.includes(member.id);
            const count = memberAllocationCounts[member.id] ?? 0;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleResourceVisibility(member.id)}
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[10px] font-bold transition-all",
                  isHidden
                    ? "border-dashed border-border bg-muted/30 text-muted-foreground opacity-50 line-through"
                    : "border-border bg-background text-foreground shadow-2xs hover:border-slate-400"
                )}
                title={
                  isHidden
                    ? `Clique para exibir a raia de ${member.name}`
                    : `Clique para ocultar a raia de ${member.name}`
                }
              >
                <span
                  className={cn(
                    "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-extrabold text-white",
                    member.color || "bg-slate-600"
                  )}
                >
                  {member.initials || member.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate max-w-[120px]">{member.name}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[9px] font-extrabold"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
          {hiddenResourceIds.length > 0 && (
            <button
              type="button"
              onClick={clearHiddenResources}
              className="text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400 ml-1"
            >
              Mostrar todos ({hiddenResourceIds.length} oculto
              {hiddenResourceIds.length > 1 ? "s" : ""})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
