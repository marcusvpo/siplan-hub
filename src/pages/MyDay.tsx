import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Database,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  RefreshCw,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleMarkdown } from "@/components/Copilot/SimpleMarkdown";
import { MyDayAgenda, type MyDayAgendaFilter } from "@/components/my-day/MyDayAgenda";
import { MyDayBoardWidget } from "@/components/my-day/MyDayBoardWidget";
import { MyDayInsights } from "@/components/my-day/MyDayInsights";
import { MyDayPriorityQueue } from "@/components/my-day/MyDayPriorityQueue";
import { MyDayWidgetError } from "@/components/my-day/MyDayWidgetError";
import { PersonalizeMyDayDialog } from "@/components/my-day/PersonalizeMyDayDialog";
import { useMyDay, type MyDayConversionIssue } from "@/hooks/useMyDay";
import { useMyDayBoard } from "@/hooks/useMyDayBoard";
import { useMyDayReminders } from "@/hooks/useMyDayReminders";
import { useMyDayWorkspace } from "@/hooks/useMyDayWorkspace";
import { humanizeCopilotText } from "@/lib/copilot-language";
import type { MyDayProject, MyDayProjectTone } from "@/lib/my-day";
import { isMyDayAgendaEventOnDay } from "@/lib/my-day-agenda";
import { buildMyDayBoardAgendaEvents } from "@/lib/my-day-board";
import {
  isMyDayTaskOverdue,
  type MyDayWidgetId,
} from "@/lib/my-day-workspace";
import { cn } from "@/lib/utils";

type Scope = "mine" | "portfolio";
type MetricFilter = "all" | "projects" | "critical" | "issues" | "today";

const TONE_CLASSES: Record<MyDayProjectTone, string> = {
  critical:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
};

const ISSUE_CLASSES: Record<MyDayConversionIssue["priority"], string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  high: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  low: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
};

const FILTER_LABELS: Record<Exclude<MetricFilter, "all">, string> = {
  projects: "Projetos",
  critical: "Prioridades críticas",
  issues: "Pendências de conversão",
  today: "Agenda de hoje",
};

const WIDGET_WIDTH_CLASSES = {
  half: "xl:col-span-1",
  full: "xl:col-span-2",
};

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function shortName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "por aqui";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  active,
  tone = "default",
  onClick,
}: {
  icon: typeof ListTodo;
  label: string;
  value: number;
  detail: string;
  active: boolean;
  tone?: "default" | "danger" | "warning" | "success";
  onClick: () => void;
}) {
  const tones = {
    default: "bg-primary/10 text-primary",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  };

  return (
    <button type="button" className="min-w-0 text-left" aria-pressed={active} onClick={onClick}>
      <Card
        className={cn(
          "h-full min-w-0 overflow-hidden border-border/70 shadow-sm transition-all hover:border-primary/40 hover:bg-muted/20",
          active && "border-primary bg-primary/[0.04] ring-1 ring-primary/20",
        )}
      >
        <CardContent className="flex min-w-0 items-center gap-2.5 p-2.5 sm:p-3">
          <div className={cn("shrink-0 rounded-lg p-2", tones[tone])}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black leading-none tracking-tight">{value}</p>
              <p className="truncate text-[11px] font-bold">{label}</p>
            </div>
            <p className="mt-1 truncate text-[9px] text-muted-foreground">{detail}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function ProjectRow({
  project,
  path,
  compact,
}: {
  project: MyDayProject;
  path: string;
  compact: boolean;
}) {
  return (
    <Link
      to={path}
      className={cn(
        "group block min-w-0 rounded-lg border border-border/70 bg-card transition-colors hover:border-primary/40 hover:bg-muted/20",
        compact ? "p-2.5" : "p-4",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate text-xs font-bold sm:text-sm">{project.clientName}</h3>
            <Badge variant="outline" className={cn("h-5 px-1.5 text-[8px]", TONE_CLASSES[project.tone])}>
              {project.attentionLabel}
            </Badge>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-muted-foreground">
            <span className="truncate">{project.ticketNumber || "Sem chamado"} · {project.systemType || "Sistema não informado"}</span>
            <span className="font-semibold text-foreground/70">{project.nextStage?.label ?? "Fluxo concluído"}</span>
            <span>
              {project.nextStage?.endDate
                ? `${project.isOverdue ? "Venceu" : "Prazo"} ${format(project.nextStage.endDate, "dd/MM")}`
                : `Atualizado ${format(project.lastUpdatedAt, "dd/MM")}`}
            </span>
          </div>
        </div>
        <span className="w-16 shrink-0 sm:w-24">
          <span className="mb-1 flex items-center justify-between text-[8px] text-muted-foreground">
            <span>Progresso</span>
            <span>{Math.round(project.overallProgress)}%</span>
          </span>
          <Progress value={project.overallProgress} className="h-1.5" />
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function IssueRow({ issue, compact }: { issue: MyDayConversionIssue; compact: boolean }) {
  return (
    <Link
      to="/conversion/atividades"
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-lg border border-border/70 transition-colors hover:border-primary/40 hover:bg-muted/20",
        compact ? "p-2" : "p-3",
      )}
    >
      <div className={cn("shrink-0 rounded-md border p-1.5", ISSUE_CLASSES[issue.priority])}>
        <Database className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-bold">{issue.title}</p>
          <Badge variant="outline" className={cn("h-5 px-1.5 text-[8px]", ISSUE_CLASSES[issue.priority])}>
            {issue.priority === "critical" ? "Crítica" : issue.priority === "high" ? "Alta" : issue.priority === "medium" ? "Média" : "Baixa"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{issue.clientName} · {issue.ticketNumber}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-label="Carregando Central de Trabalho">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-xl lg:col-span-8" />
        <Skeleton className="h-80 rounded-xl lg:col-span-4" />
      </div>
    </div>
  );
}

function WidgetLoading({ label }: { label: string }) {
  return (
    <Card className="h-full min-h-48 min-w-0 overflow-hidden border-border/70 shadow-sm" aria-label={`Carregando ${label}`}>
      <CardHeader className="border-b p-3"><Skeleton className="h-4 w-40" /></CardHeader>
      <CardContent className="space-y-2 p-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-4/5" />
      </CardContent>
    </Card>
  );
}

export default function MyDay() {
  const data = useMyDay();
  const workspace = useMyDayWorkspace();
  const boardWorkspace = useMyDayBoard();
  const [scope, setScope] = useState<Scope>("mine");
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");
  const [toneFilter, setToneFilter] = useState<MyDayProjectTone | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const dataRefreshRef = useRef(data.refresh);
  const workspaceRefreshRef = useRef(workspace.refresh);
  const boardRefreshRef = useRef(boardWorkspace.refresh);

  useEffect(() => {
    dataRefreshRef.current = data.refresh;
    workspaceRefreshRef.current = workspace.refresh;
    boardRefreshRef.current = boardWorkspace.refresh;
  }, [boardWorkspace.refresh, data.refresh, workspace.refresh]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const reminders = useMyDayReminders({
    userId: data.userId,
    tasks: workspace.tasks,
    enabled: workspace.preferences.notificationsEnabled,
  });

  const compact = workspace.preferences.density === "compact";
  const boardAgendaEvents = useMemo(
    () => buildMyDayBoardAgendaEvents(
      boardWorkspace.cards,
      boardWorkspace.boards,
      boardWorkspace.columns,
      now,
    ),
    [boardWorkspace.boards, boardWorkspace.cards, boardWorkspace.columns, now],
  );
  const unifiedAgendaEvents = useMemo(
    () => [...data.agendaEvents, ...boardAgendaEvents].sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime()),
    [boardAgendaEvents, data.agendaEvents],
  );
  const projects = scope === "portfolio" ? data.portfolioProjects : data.myProjects;
  const urgentProjects = useMemo(
    () => projects.filter((project) => project.tone === "critical"),
    [projects],
  );
  const criticalTasks = useMemo(
    () => workspace.tasks.filter((task) => task.status === "pending" && (task.priority === "critical" || isMyDayTaskOverdue(task, now))),
    [now, workspace.tasks],
  );
  const overdueAgendaEvents = useMemo(
    () => unifiedAgendaEvents.filter((event) => event.isOverdue),
    [unifiedAgendaEvents],
  );
  const criticalIssues = useMemo(
    () => data.issues.filter((issue) => issue.priority === "critical" || issue.priority === "high"),
    [data.issues],
  );
  const todayAgendaEvents = useMemo(
    () => unifiedAgendaEvents.filter((event) => isMyDayAgendaEventOnDay(event, now)),
    [now, unifiedAgendaEvents],
  );
  const todayTasks = useMemo(
    () => workspace.tasks.filter((task) => task.status === "pending" && isSameDay(task.dueAt, now)),
    [now, workspace.tasks],
  );

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (metricFilter === "critical") result = result.filter((project) => project.tone === "critical");
    if (toneFilter) result = result.filter((project) => project.tone === toneFilter);
    if (stageFilter) result = result.filter((project) => project.nextStage?.label === stageFilter);
    return result;
  }, [metricFilter, projects, stageFilter, toneFilter]);

  const availableWidgetIds = useMemo(() => {
    const widgets: MyDayWidgetId[] = ["priorities", "agenda", "shortcuts"];
    if (boardWorkspace.permissions.canView) widgets.push("board");
    if (data.permissions.canViewProjects) widgets.push("projects", "insights");
    if (data.permissions.canViewConversion) widgets.push("conversion");
    if (data.hasCopilotAccess) widgets.push("copilot");
    return widgets;
  }, [boardWorkspace.permissions.canView, data.hasCopilotAccess, data.permissions.canViewConversion, data.permissions.canViewProjects]);

  const orderedWidgetIds = workspace.preferences.widgetOrder.filter((id) => availableWidgetIds.includes(id));
  const effectiveQuickLinkPaths = workspace.preferences.quickLinks ?? data.defaultQuickLinkPaths;
  const quickActions = effectiveQuickLinkPaths
    .map((path) => data.availableShortcuts.find((shortcut) => shortcut.path === path))
    .filter(Boolean) as typeof data.availableShortcuts;

  const showWidget = (widgetId: MyDayWidgetId) => {
    if (!availableWidgetIds.includes(widgetId)) return false;
    if (metricFilter === "projects") return widgetId === "projects" || widgetId === "insights";
    if (metricFilter === "critical") return widgetId === "priorities" || widgetId === "projects" || widgetId === "agenda";
    if (metricFilter === "issues") return widgetId === "conversion";
    if (metricFilter === "today") return widgetId === "agenda";
    return !workspace.preferences.hiddenWidgets.includes(widgetId);
  };

  const selectMetricFilter = (filter: MetricFilter) => {
    setMetricFilter((current) => (current === filter ? "all" : filter));
    setToneFilter(null);
    setStageFilter(null);
  };

  const agendaFilter: MyDayAgendaFilter =
    metricFilter === "today" ? "today" : metricFilter === "critical" ? "critical" : "all";

  const refreshAll = useCallback(async () => {
    await Promise.all([dataRefreshRef.current(), workspaceRefreshRef.current(), boardRefreshRef.current()]);
    setRefreshedAt(new Date());
    setNow(new Date());
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => void refreshAll(), 5 * 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshAll();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshAll]);

  const enableReminders = async () => {
    const granted = await reminders.requestPermission();
    if (!granted) return;
    await workspace.savePreferences({
      ...workspace.preferences,
      notificationsEnabled: true,
    });
    reminders.checkReminders();
  };

  const disableReminders = async () => {
    await workspace.savePreferences({
      ...workspace.preferences,
      notificationsEnabled: false,
    });
  };

  if (workspace.loading?.preferences ?? workspace.isLoading) {
    return (
      <div className="container mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-3">
        <LoadingState />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "container mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-3 md:pb-6",
        compact ? "space-y-3" : "space-y-5",
      )}
      data-testid="my-day-page"
      data-density={workspace.preferences.density}
    >
      <section className="relative min-w-0 overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.08] via-background to-amber-50 px-3 py-3 shadow-sm dark:to-amber-950/10 sm:px-4">
        <ListTodo className="pointer-events-none absolute -bottom-8 -right-4 h-32 w-32 text-primary/[0.05]" />
        <div className="relative z-10 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Badge variant="outline" className="h-5 gap-1 border-primary/20 bg-background/70 px-1.5 text-[9px] text-primary">
                <Sparkles className="h-3 w-3" /> Central de Trabalho
              </Badge>
              <p className="flex items-center gap-1 text-[10px] font-semibold capitalize text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                {` · ${format(now, "HH:mm")}`}
                {data.team ? ` · ${data.team}` : ""}
              </p>
            </div>
            <h1 className="mt-1.5 break-words text-xl font-black tracking-tight sm:text-2xl">
              {greeting(now)}, {shortName(data.fullName)}!
            </h1>
            <p className="mt-0.5 max-w-2xl truncate text-[11px] text-muted-foreground sm:text-xs">
              Prioridades, agenda, indicadores e atalhos · atualizado às {format(refreshedAt, "HH:mm")}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {data.isAdmin && (
              <div className="grid grid-cols-2 rounded-lg border bg-background/80 p-0.5 shadow-sm" aria-label="Escopo da Central de Trabalho">
                <Button type="button" size="sm" variant={scope === "mine" ? "secondary" : "ghost"} className="h-7 px-2 text-[10px]" onClick={() => setScope("mine")}>
                  Meu trabalho
                </Button>
                <Button type="button" size="sm" variant={scope === "portfolio" ? "secondary" : "ghost"} className="h-7 px-2 text-[10px]" onClick={() => setScope("portfolio")}>
                  Portfólio
                </Button>
              </div>
            )}
            {workspace.permissions.canPersonalize && (
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 bg-background/80 px-2 text-[10px]" onClick={() => setPersonalizeOpen(true)}>
                <Settings2 className="h-3.5 w-3.5" /> Personalizar
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 bg-background/80 px-2 text-[10px]" disabled={data.isRefreshing || workspace.isRefreshing || boardWorkspace.isRefreshing} onClick={() => void refreshAll()}>
              <RefreshCw className={cn("h-3.5 w-3.5", (data.isRefreshing || workspace.isRefreshing || boardWorkspace.isRefreshing) && "animate-spin")} /> Atualizar
            </Button>
          </div>
        </div>
      </section>

      {workspace.errors?.preferences && (
        <MyDayWidgetError label="suas preferências do Meu Dia" onRetry={workspace.refreshPreferences} />
      )}

      <section className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Resumo do dia">
        <MetricCard icon={FolderKanban} label={scope === "portfolio" ? "Projetos ativos" : "Meus projetos"} value={projects.length} detail="clique para ver a carteira" active={metricFilter === "projects"} onClick={() => selectMetricFilter("projects")} />
        <MetricCard icon={AlertTriangle} label="Prioridades críticas" value={urgentProjects.length + criticalTasks.length + overdueAgendaEvents.length + criticalIssues.length} detail="projetos, tarefas e atrasos" tone="danger" active={metricFilter === "critical"} onClick={() => selectMetricFilter("critical")} />
        <MetricCard icon={Database} label="Pendências" value={data.issues.length} detail="abertas na conversão" tone="warning" active={metricFilter === "issues"} onClick={() => selectMetricFilter("issues")} />
        <MetricCard icon={CalendarDays} label="Agenda de hoje" value={todayAgendaEvents.length + todayTasks.length} detail="tarefas e compromissos" tone="success" active={metricFilter === "today"} onClick={() => selectMetricFilter("today")} />
      </section>

      {(metricFilter !== "all" || toneFilter || stageFilter) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2 text-[10px]">
          <span className="font-semibold text-muted-foreground">Filtros ativos:</span>
          {metricFilter !== "all" && <Badge variant="secondary">{FILTER_LABELS[metricFilter]}</Badge>}
          {toneFilter && <Badge variant="secondary">Situação: {toneFilter === "critical" ? "Críticos" : toneFilter === "warning" ? "Atenção" : "Regulares"}</Badge>}
          {stageFilter && <Badge variant="secondary">Etapa: {stageFilter}</Badge>}
          <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2 text-[10px]" onClick={() => { setMetricFilter("all"); setToneFilter(null); setStageFilter(null); }}>
            <X className="h-3 w-3" /> Limpar
          </Button>
        </div>
      )}

      <section className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2" aria-label="Blocos personalizados do Meu Dia">
        {orderedWidgetIds.map((widgetId) => {
          if (!showWidget(widgetId)) return null;
          const widgetWidth = workspace.preferences.widgetLayout[widgetId];
          const widgetClassName = cn(
            "h-full min-w-0",
            WIDGET_WIDTH_CLASSES[widgetWidth],
          );

          if (widgetId === "priorities") {
            return (
              <div key={widgetId} className={cn(widgetClassName, "space-y-2")} data-widget-id={widgetId} data-widget-width={widgetWidth}>
                {data.errors?.projects && <MyDayWidgetError label="os projetos prioritários" onRetry={data.refreshers.projects} />}
                {workspace.errors?.tasks && <MyDayWidgetError label="as tarefas prioritárias" onRetry={workspace.refreshTasks} />}
                {data.errors?.agenda && <MyDayWidgetError label="os compromissos prioritários" onRetry={data.refreshers.agenda} />}
                {boardWorkspace.error && <MyDayWidgetError label="os cartões prioritários" onRetry={boardWorkspace.refresh} />}
                {data.errors?.conversion && <MyDayWidgetError label="as pendências prioritárias" onRetry={data.refreshers.conversion} />}
                {(data.loading?.projects || workspace.loading?.tasks) && !projects.length && !workspace.tasks.length ? (
                  <WidgetLoading label="fila de prioridades" />
                ) : (
                  <MyDayPriorityQueue
                    projects={projects}
                    tasks={workspace.tasks}
                    events={unifiedAgendaEvents}
                    issues={data.issues}
                    projectPath={(project) => data.permissions.canOpenProjectDetails ? `/projects/${project.id}` : data.permissions.projectOverviewPath}
                    compact={compact}
                    canEditTask={workspace.permissions.canEditTask}
                    isSaving={workspace.isSavingTask}
                    onCompleteTask={(id) => workspace.setTaskStatus(id, "completed")}
                    onSnoozeTask={workspace.snoozeTask}
                  />
                )}
              </div>
            );
          }

          if (widgetId === "projects") {
            return (
              <div key={widgetId} className={cn(widgetClassName, "space-y-2")} data-widget-id={widgetId} data-widget-width={widgetWidth}>
                {data.errors?.projects && <MyDayWidgetError label="os projetos" onRetry={data.refreshers.projects} />}
                {data.loading?.projects && !projects.length ? <WidgetLoading label="projetos" /> : <Card className="h-full min-w-0 overflow-hidden border-border/70 shadow-sm">
                  <CardHeader className={cn("flex min-w-0 flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/15", compact ? "p-3" : "p-4")}>
                    <div className="min-w-0">
                      <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                        <LayoutDashboard className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{scope === "portfolio" ? "Prioridades do portfólio" : "Projetos para acompanhar"}</span>
                      </CardTitle>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Críticos e desatualizados aparecem primeiro.</p>
                    </div>
                    {data.permissions.canOpenProjectDetails && (
                      <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[10px]">
                        <Link to="/projects">Ver todos <ArrowRight className="h-3 w-3" /></Link>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className={cn("min-w-0 space-y-1.5", compact ? "p-2.5" : "p-4")}>
                    {filteredProjects.slice(0, compact ? 8 : 6).map((project) => (
                      <ProjectRow key={project.id} project={project} compact={compact} path={data.permissions.canOpenProjectDetails ? `/projects/${project.id}` : data.permissions.projectOverviewPath} />
                    ))}
                    {filteredProjects.length === 0 && (
                      <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        <p className="text-xs font-bold">Nenhum projeto encontrado para este filtro.</p>
                        <p className="max-w-md text-[10px] text-muted-foreground">Limpe os filtros ou aguarde uma nova atribuição.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>}
              </div>
            );
          }

          if (widgetId === "insights") {
            return (
              <div key={widgetId} className={cn(widgetClassName, "space-y-2")} data-widget-id={widgetId} data-widget-width={widgetWidth}>
                {data.errors?.projects && <MyDayWidgetError label="os gráficos da carteira" onRetry={data.refreshers.projects} />}
                {data.loading?.projects && !projects.length ? <WidgetLoading label="gráficos da carteira" /> : <MyDayInsights
                  projects={projects}
                  activeTone={toneFilter}
                  activeStage={stageFilter}
                  compact={compact}
                  onToneFilter={(tone) => { setMetricFilter("projects"); setToneFilter(tone); }}
                  onStageFilter={(stage) => { setMetricFilter("projects"); setStageFilter(stage); }}
                />}
              </div>
            );
          }

          if (widgetId === "agenda") {
            return (
              <div key={widgetId} className={cn(widgetClassName, "space-y-2")} data-widget-id={widgetId} data-widget-width={widgetWidth}>
                {workspace.errors?.tasks && <MyDayWidgetError label="suas tarefas" onRetry={workspace.refreshTasks} />}
                {data.errors?.agenda && <MyDayWidgetError label="os compromissos" onRetry={data.refreshers.agenda} />}
                {boardWorkspace.error && <MyDayWidgetError label="os cartões com prazo" onRetry={boardWorkspace.refresh} />}
                {(workspace.loading?.tasks && data.loading?.agenda && boardWorkspace.isLoading) && !workspace.tasks.length && !unifiedAgendaEvents.length ? <WidgetLoading label="agenda" /> : <MyDayAgenda
                  tasks={workspace.tasks}
                  events={unifiedAgendaEvents}
                  shortcuts={data.availableShortcuts}
                  filter={agendaFilter}
                  compact={compact}
                  canViewCsCx={data.permissions.canViewAppointments}
                  canViewImplementation={data.permissions.canViewCalendar}
                  canViewBoard={boardWorkspace.permissions.canView}
                  canCreateTask={workspace.permissions.canCreateTask}
                  canEditTask={workspace.permissions.canEditTask}
                  canDeleteTask={workspace.permissions.canDeleteTask}
                  isSaving={workspace.isSavingTask}
                  now={now}
                  notificationsEnabled={workspace.preferences.notificationsEnabled}
                  notificationPermission={reminders.permission}
                  onEnableReminders={enableReminders}
                  onDisableReminders={disableReminders}
                  onCreateTask={workspace.createTask}
                  onUpdateTask={workspace.updateTask}
                  onSetTaskStatus={workspace.setTaskStatus}
                  onSnoozeTask={workspace.snoozeTask}
                  onDeleteTask={workspace.deleteTask}
                />}
              </div>
            );
          }

          if (widgetId === "board") {
            return (
              <div key={widgetId} className={cn(widgetClassName, "space-y-2")} data-widget-id={widgetId} data-widget-width={widgetWidth}>
                {boardWorkspace.error && <MyDayWidgetError label="seu quadro pessoal" onRetry={boardWorkspace.refresh} />}
                {boardWorkspace.isLoading ? <WidgetLoading label="Meu Quadro" /> : <MyDayBoardWidget
                  boards={boardWorkspace.boards}
                  columns={boardWorkspace.columns}
                  cards={boardWorkspace.cards}
                  compact={compact}
                  canCreate={boardWorkspace.permissions.canCreate}
                />}
              </div>
            );
          }

          if (widgetId === "conversion") {
            return (
              <div key={widgetId} className={cn(widgetClassName, "space-y-2")} data-widget-id={widgetId} data-widget-width={widgetWidth}>
                {data.errors?.conversion && <MyDayWidgetError label="as pendências de conversão" onRetry={data.refreshers.conversion} />}
                {data.loading?.conversion && !data.issues.length ? <WidgetLoading label="pendências de conversão" /> : <Card className="h-full min-w-0 overflow-hidden border-border/70 shadow-sm">
                  <CardHeader className={cn("flex min-w-0 flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/15", compact ? "p-3" : "p-4")}>
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-primary" /> Pendências de conversão</CardTitle>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Itens abertos atribuídos a você.</p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[10px]"><Link to="/conversion/atividades">Abrir fila <ArrowRight className="h-3 w-3" /></Link></Button>
                  </CardHeader>
                  <CardContent className={cn("min-w-0 space-y-1.5", compact ? "p-2.5" : "p-4")}>
                    {data.issues.slice(0, compact ? 7 : 5).map((issue) => <IssueRow key={issue.id} issue={issue} compact={compact} />)}
                    {data.issues.length === 0 && <p className="py-7 text-center text-xs text-muted-foreground">Nenhuma pendência de conversão aberta.</p>}
                  </CardContent>
                </Card>}
              </div>
            );
          }

          if (widgetId === "shortcuts") {
            return (
              <div key={widgetId} className={widgetClassName} data-widget-id={widgetId} data-widget-width={widgetWidth}>
                <Card className="h-full min-w-0 overflow-hidden border-border/70 shadow-sm">
                  <CardHeader className={cn("border-b bg-muted/15", compact ? "p-3" : "p-4")}>
                    <CardTitle className="flex items-center gap-2 text-sm"><ListTodo className="h-4 w-4 text-primary" /> Acessos rápidos</CardTitle>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Seu menu pessoal, limitado às permissões do perfil.</p>
                  </CardHeader>
                  <CardContent className={cn("grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2", compact ? "p-2.5" : "p-4")}>
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button key={action.path} asChild variant="outline" className="h-auto min-h-12 min-w-0 justify-start gap-2 whitespace-normal px-2 py-2 text-left">
                          <Link to={action.path}>
                            <span className="shrink-0 rounded-md bg-primary/10 p-1.5 text-primary"><Icon className="h-3.5 w-3.5" /></span>
                            <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold">{action.label}</span><span className="block truncate text-[8px] font-normal text-muted-foreground">{action.group}</span></span>
                          </Link>
                        </Button>
                      );
                    })}
                    {quickActions.length === 0 && <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">Personalize este bloco para adicionar atalhos.</p>}
                  </CardContent>
                </Card>
              </div>
            );
          }

          return (
            <div key={widgetId} className={cn(widgetClassName, "space-y-2")} data-widget-id={widgetId} data-widget-width={widgetWidth}>
              {data.errors?.copilot && <MyDayWidgetError label="o resumo do Copiloto" onRetry={data.refreshers.copilot} />}
              {data.loading?.copilot && !data.digest ? <WidgetLoading label="resumo do Copiloto" /> : <Card className="h-full min-w-0 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.05] via-card to-card shadow-sm">
                <CardHeader className={cn("flex min-w-0 flex-row items-start justify-between gap-2 space-y-0", compact ? "p-3" : "p-4")}>
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> Resumo do Copiloto</CardTitle>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{data.digest?.for_date ? `Atualizado em ${format(new Date(`${data.digest.for_date}T12:00:00`), "dd/MM/yyyy")}` : "Resumo diário do seu portfólio"}</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[10px]"><Link to="/copilot">Conversar <ArrowRight className="h-3 w-3" /></Link></Button>
                </CardHeader>
                <CardContent className={cn("min-w-0 pt-0", compact ? "px-3 pb-3" : "px-4 pb-4")}>
                  {data.digest?.content ? (
                    <div className="min-w-0 break-words rounded-lg border border-primary/10 bg-background/70 p-3 text-xs"><SimpleMarkdown text={humanizeCopilotText(data.digest.content)} /></div>
                  ) : (
                    <div className="flex min-w-0 items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="break-words">O resumo diário ainda não foi gerado. Abra o Copiloto para consultar riscos, atrasos e responsáveis.</p></div>
                  )}
                </CardContent>
              </Card>}
            </div>
          );
        })}
      </section>

      <PersonalizeMyDayDialog
        open={personalizeOpen}
        onOpenChange={setPersonalizeOpen}
        preferences={workspace.preferences}
        availableWidgetIds={availableWidgetIds}
        availableShortcuts={data.availableShortcuts}
        defaultQuickLinkPaths={data.defaultQuickLinkPaths}
        isSaving={workspace.isSavingPreferences}
        onSave={workspace.savePreferences}
      />
    </div>
  );
}
