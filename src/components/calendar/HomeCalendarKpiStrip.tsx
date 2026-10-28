import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { QueryClientContext } from "@tanstack/react-query";
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Layers,
  Palmtree,
} from "lucide-react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useVacations } from "@/hooks/useVacations";
import { useCalendarStore } from "@/stores/calendarStore";
import {
  buildProjectCalendarEvents,
  extractUnscheduledPhase1Projects,
  isExcludedTimelineMember,
  resolveCalendarMembersForResponsible,
} from "@/lib/project-calendar-events";
import { CalendarEvent } from "@/types/calendar";

const QUARTER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "1º Tri (Jan–Mar)",
  2: "2º Tri (Abr–Jun)",
  3: "3º Tri (Jul–Set)",
  4: "4º Tri (Out–Dez)",
};

function HomeCalendarKpiStripContent() {
  const navigate = useNavigate();
  const { projects = [], isLoading } = useProjectsV2();
  const { vacations = [] } = useVacations();

  const viewMode = useCalendarStore((state) => state.viewMode);
  const selectedYear = useCalendarStore((state) => state.selectedYear);
  const selectedQuarter = useCalendarStore((state) => state.selectedQuarter);
  const currentDate = useCalendarStore((state) => state.currentDate);
  const setSystemFilter = useCalendarStore((state) => state.setSystemFilter);
  const setStatusFilter = useCalendarStore((state) => state.setStatusFilter);
  const setDisplayTab = useCalendarStore((state) => state.setDisplayTab);

  const { periodStart, periodEnd, scopeLabel } = useMemo(() => {
    if (viewMode === "year") {
      return {
        periodStart: startOfDay(new Date(selectedYear, 0, 1)),
        periodEnd: endOfDay(new Date(selectedYear, 11, 31)),
        scopeLabel: `Ano ${selectedYear} • 12 Meses`,
      };
    }
    if (viewMode === "quarter") {
      const startMonth = (selectedQuarter - 1) * 3;
      return {
        periodStart: startOfDay(new Date(selectedYear, startMonth, 1)),
        periodEnd: endOfDay(
          endOfMonth(new Date(selectedYear, startMonth + 2, 1))
        ),
        scopeLabel: `${QUARTER_LABELS[selectedQuarter]} / ${selectedYear}`,
      };
    }
    return {
      periodStart: startOfMonth(currentDate),
      periodEnd: endOfMonth(currentDate),
      scopeLabel: format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  }, [viewMode, selectedYear, selectedQuarter, currentDate]);

  const kpis = useMemo(() => {
    if (!projects || isLoading) {
      return {
        totalAllocations: 0,
        uniqueClients: 0,
        regCount: 0,
        proCount: 0,
        tnCount: 0,
        confirmedCount: 0,
        plannedCount: 0,
        vacationsCount: 0,
        unscheduledCount: 0,
      };
    }

    const events = buildProjectCalendarEvents(projects);
    const vacationEvents: CalendarEvent[] = [];

    if (vacations && Array.isArray(vacations)) {
      vacations.forEach((vacation) => {
        if (!vacation.start_date || !vacation.end_date) return;
        if (
          isExcludedTimelineMember(vacation.implantador_id) ||
          isExcludedTimelineMember(vacation.implantador_name)
        ) {
          return;
        }

        const startDate = new Date(vacation.start_date + "T12:00:00");
        const endDate = new Date(vacation.end_date + "T12:00:00");
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

        const resolvedMember = resolveCalendarMembersForResponsible(
          vacation.implantador_name
        )[0];
        const resourceId =
          vacation.implantador_id || resolvedMember?.id || "unknown";
        if (isExcludedTimelineMember(resourceId)) return;

        vacationEvents.push({
          id: `vacation-${vacation.id}`,
          vacationId: vacation.id,
          resourceId,
          title: `FÉRIAS ${vacation.implantador_name.toUpperCase()}`,
          clientName: `FÉRIAS ${vacation.implantador_name.toUpperCase()}`,
          responsibleName: vacation.implantador_name,
          start: startDate,
          end: endDate,
          type: "vacation",
          status: "confirmed",
          isConfirmed: true,
          color: "bg-amber-500",
        });
      });
    }

    const allEvents = [...events, ...vacationEvents];
    const eventsInPeriod = allEvents.filter((evt) => {
      const s = startOfDay(new Date(evt.start));
      const e = endOfDay(new Date(evt.end));
      return e >= periodStart && s <= periodEnd;
    });

    const implEvents = eventsInPeriod.filter((evt) => evt.type !== "vacation");
    const vacEvents = eventsInPeriod.filter((evt) => evt.type === "vacation");

    const uniqueProjectIds = new Set<string>();
    const uniqueClients = new Set<string>();
    let regCount = 0;
    let proCount = 0;
    let tnCount = 0;
    let confirmedCount = 0;
    let plannedCount = 0;

    implEvents.forEach((evt) => {
      if (evt.clientName) uniqueClients.add(evt.clientName);
      const key = evt.projectId || evt.id;
      if (uniqueProjectIds.has(key)) return;
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
    });

    const unscheduledProjects = extractUnscheduledPhase1Projects(projects);

    return {
      totalAllocations: implEvents.length,
      uniqueClients: uniqueClients.size || uniqueProjectIds.size,
      regCount,
      proCount,
      tnCount,
      confirmedCount,
      plannedCount,
      vacationsCount: vacEvents.length,
      unscheduledCount: unscheduledProjects.length,
    };
  }, [projects, isLoading, vacations, periodStart, periodEnd]);

  return (
    <section
      className="space-y-2.5"
      aria-label="Indicadores do Calendário de Projetos (Fase 1)"
      data-testid="home-calendar-kpi-strip"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-foreground">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            Agenda de Implantações — Fase 1
          </span>
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
            {scopeLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/calendar")}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:underline"
        >
          <span>Abrir Calendário de Projetos</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Alocações Fase 1 */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter("all");
            setStatusFilter("all");
            setDisplayTab("timeline");
            navigate("/calendar");
          }}
          className="group flex min-w-0 flex-col justify-between rounded-xl border border-t-4 border-t-primary bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Alocações Fase 1
            </span>
            <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {kpis.totalAllocations}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              no período
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {kpis.uniqueClients} cartórios • Ver timeline
          </div>
        </button>

        {/* KPI 2: Orion REG = VERDE */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter("reg");
            setDisplayTab("timeline");
            navigate("/calendar");
          }}
          className="group flex min-w-0 flex-col justify-between rounded-xl border border-t-4 border-t-emerald-600 bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
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
            {kpis.regCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              implantações
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            Registro de Imóveis / TD&amp;PJ
          </div>
        </button>

        {/* KPI 3: Orion PRO = AZUL */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter("pro");
            setDisplayTab("timeline");
            navigate("/calendar");
          }}
          className="group flex min-w-0 flex-col justify-between rounded-xl border border-t-4 border-t-blue-600 bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md"
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
            {kpis.proCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              implantações
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            Tabelionato de Protesto
          </div>
        </button>

        {/* KPI 4: Orion TN = VERMELHO */}
        <button
          type="button"
          onClick={() => {
            setSystemFilter("tn");
            setDisplayTab("timeline");
            navigate("/calendar");
          }}
          className="group flex min-w-0 flex-col justify-between rounded-xl border border-t-4 border-t-[#d3123f] bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-[#d3123f]/40 hover:shadow-md"
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
            {kpis.tnCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              implantações
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            Tabelionato de Notas
          </div>
        </button>

        {/* KPI 5: Confirmadas ✓ */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("confirmed");
            setDisplayTab("timeline");
            navigate("/calendar");
          }}
          className="group flex min-w-0 flex-col justify-between rounded-xl border border-t-4 border-t-violet-600 bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-purple-400">
              Confirmadas ✓
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {kpis.confirmedCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              confirmadas
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {kpis.plannedCount} previstas na agenda dos analistas
          </div>
        </button>

        {/* KPI 6: Fila Sem Data & Férias */}
        <button
          type="button"
          onClick={() => {
            setDisplayTab("backlog");
            navigate("/calendar");
          }}
          className="group flex min-w-0 flex-col justify-between rounded-xl border border-t-4 border-t-amber-500 bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Fila Sem Data &amp; Férias
            </span>
            <Palmtree className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          </div>
          <div className="my-0.5 text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {kpis.unscheduledCount}{" "}
            <span className="text-xs font-bold text-muted-foreground">
              sem data
            </span>
          </div>
          <div className="truncate text-[10px] font-medium text-muted-foreground">
            {kpis.vacationsCount} férias (Admin) • Clique p/ agendar
          </div>
        </button>
      </div>
    </section>
  );
}

export function HomeCalendarKpiStrip() {
  const queryClient = useContext(QueryClientContext);
  if (!queryClient) return null;
  return <HomeCalendarKpiStripContent />;
}
