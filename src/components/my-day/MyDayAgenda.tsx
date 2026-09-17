import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  AlarmClock,
  ArrowRight,
  Bell,
  BellOff,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { MyDayShortcut } from "@/hooks/useMyDay";
import {
  isMyDayAgendaEventOnDay,
  type MyDayAgendaEvent,
  type MyDayAgendaEventSource,
} from "@/lib/my-day-agenda";
import {
  getMyDayTaskAttentionAt,
  isMyDayTaskOverdue,
  type MyDayTask,
  type MyDayTaskInput,
  type MyDayTaskStatus,
} from "@/lib/my-day-workspace";
import { cn } from "@/lib/utils";
import { MyDayTaskDialog } from "./MyDayTaskDialog";
import type { MyDayNotificationPermission } from "@/hooks/useMyDayReminders";

export type MyDayAgendaFilter = "all" | "today" | "critical";
type TaskStatusFilter = "all" | "pending" | "overdue" | "completed";
type AgendaSourceFilter = "all" | "personal" | MyDayAgendaEventSource;

const PRIORITY_LABELS: Record<MyDayTask["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const PRIORITY_CLASSES: Record<MyDayTask["priority"], string> = {
  low: "border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300",
  medium: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300",
  high: "border-orange-200 text-orange-700 dark:border-orange-900 dark:text-orange-300",
  critical: "border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-300",
};

interface MyDayAgendaProps {
  tasks: MyDayTask[];
  events: MyDayAgendaEvent[];
  shortcuts: MyDayShortcut[];
  filter: MyDayAgendaFilter;
  compact?: boolean;
  canViewCsCx: boolean;
  canViewImplementation: boolean;
  canViewBoard: boolean;
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  isSaving: boolean;
  now: Date;
  notificationsEnabled: boolean;
  notificationPermission: MyDayNotificationPermission;
  onEnableReminders: () => Promise<void>;
  onDisableReminders: () => Promise<void>;
  onCreateTask: (input: MyDayTaskInput) => Promise<unknown>;
  onUpdateTask: (id: string, input: MyDayTaskInput) => Promise<unknown>;
  onSetTaskStatus: (id: string, status: MyDayTaskStatus) => Promise<unknown>;
  onSnoozeTask: (id: string, until: Date) => Promise<unknown>;
  onDeleteTask: (id: string) => Promise<unknown>;
}

function AgendaEventRow({ event, compact, now }: { event: MyDayAgendaEvent; compact: boolean; now: Date }) {
  const today = isMyDayAgendaEventOnDay(event, now);
  const period = event.allDay
    ? isSameDay(event.startsAt, event.endsAt)
      ? format(event.startsAt, "dd/MM")
      : `${format(event.startsAt, "dd/MM")} a ${format(event.endsAt, "dd/MM")}`
    : format(event.startsAt, "dd/MM 'às' HH:mm");

  return (
    <Link
      to={event.path}
      data-agenda-source={event.source}
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-lg border border-border/70 transition-colors hover:border-primary/40 hover:bg-muted/20",
        compact ? "p-2" : "p-3",
      )}
    >
      <div
        className={cn(
          "flex w-11 shrink-0 flex-col items-center rounded-md px-1 py-1.5 text-center",
          event.isOverdue
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
            : today
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
        )}
      >
        <span className="text-[8px] font-black uppercase">
          {event.isOverdue ? "Atraso" : today ? "Hoje" : format(event.startsAt, "EEE", { locale: ptBR })}
        </span>
        <span className="text-xs font-black">
          {event.allDay ? format(event.startsAt, "dd/MM") : format(event.startsAt, "HH:mm")}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-xs font-bold">{event.title}</p>
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-[8px]",
              event.source === "implementation"
                ? "border-indigo-200 text-indigo-700 dark:border-indigo-900 dark:text-indigo-300"
                : event.source === "board"
                  ? "border-violet-200 text-violet-700 dark:border-violet-900 dark:text-violet-300"
                  : "border-sky-200 text-sky-700 dark:border-sky-900 dark:text-sky-300",
            )}
          >
            {event.sourceLabel}
          </Badge>
        </div>
        <p className="truncate text-[10px] text-muted-foreground">{event.context} · {period}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </Link>
  );
}

export function MyDayAgenda({
  tasks,
  events,
  shortcuts,
  filter,
  compact = true,
  canViewCsCx,
  canViewImplementation,
  canViewBoard,
  canCreateTask,
  canEditTask,
  canDeleteTask,
  isSaving,
  now,
  notificationsEnabled,
  notificationPermission,
  onEnableReminders,
  onDisableReminders,
  onCreateTask,
  onUpdateTask,
  onSetTaskStatus,
  onSnoozeTask,
  onDeleteTask,
}: MyDayAgendaProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MyDayTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<MyDayTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<AgendaSourceFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (sourceFilter !== "all" && sourceFilter !== "personal") return false;
        const matchesPageFilter = filter === "today"
          ? isSameDay(task.dueAt, now)
          : filter === "critical"
            ? task.status === "pending" &&
              (task.priority === "critical" || isMyDayTaskOverdue(task, now))
            : task.status === "pending" || isSameDay(task.completedAt ?? task.dueAt, now);
        if (!matchesPageFilter) return false;
        if (statusFilter === "pending") return task.status === "pending";
        if (statusFilter === "overdue") return isMyDayTaskOverdue(task, now);
        if (statusFilter === "completed") return task.status === "completed";
        return true;
      }),
    [filter, now, sourceFilter, statusFilter, tasks],
  );

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        if (sourceFilter !== "all" && sourceFilter !== event.source) return false;
        const matchesPageFilter = filter === "today"
          ? isMyDayAgendaEventOnDay(event, now)
          : filter === "critical"
            ? event.isOverdue
            : event.status !== "completed" || isMyDayAgendaEventOnDay(event, now);
        if (!matchesPageFilter) return false;
        if (statusFilter === "completed") return event.status === "completed";
        if (statusFilter === "pending" && event.status === "completed") return false;
        if (statusFilter === "overdue" && !event.isOverdue) return false;
        return true;
      }),
    [events, filter, now, sourceFilter, statusFilter],
  );

  const totalItems = visibleTasks.length + visibleEvents.length;
  const taskLimit = expanded ? visibleTasks.length : 8;
  const eventLimit = expanded ? visibleEvents.length : 5;
  const shownItems = Math.min(visibleTasks.length, taskLimit) +
    Math.min(visibleEvents.length, eventLimit);

  const openNewTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEditTask = (task: MyDayTask) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="h-full min-w-0 overflow-hidden border-border/70 shadow-sm" data-testid="my-day-agenda">
        <CardHeader
          className={cn(
            "flex min-w-0 flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/15",
            compact ? "p-3" : "p-4",
          )}
        >
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-primary" />
              Minha agenda
            </CardTitle>
            <p className="mt-0.5 break-words text-[10px] leading-tight text-muted-foreground">
              Tarefas pessoais, Meu Quadro, CS/CX e Implantação em um só lugar.
            </p>
          </div>
          {canCreateTask && (
            <Button type="button" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs" onClick={openNewTask}>
              <Plus className="h-3.5 w-3.5" />
              Nova tarefa
            </Button>
          )}
        </CardHeader>
        <CardContent className={cn("min-w-0 space-y-2", compact ? "p-2.5" : "p-4")}>
          <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Filtrar agenda por status">
            {([
              ["all", "Tudo"],
              ["pending", "Pendentes"],
              ["overdue", "Atrasadas"],
              ["completed", "Concluídas"],
            ] as const).map(([value, label]) => (
              <Button key={value} type="button" size="sm" variant={statusFilter === value ? "secondary" : "ghost"} className="h-8 px-2.5 text-[10px]" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>
                {label}
              </Button>
            ))}
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">{totalItems} {totalItems === 1 ? "item" : "itens"}</span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Filtrar agenda por origem">
            <span className="mr-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Origem</span>
            {(["all", "personal"] as const).map((value) => (
              <Button key={value} type="button" size="sm" variant={sourceFilter === value ? "secondary" : "ghost"} className="h-8 px-2.5 text-[10px]" aria-pressed={sourceFilter === value} onClick={() => setSourceFilter(value)}>
                {value === "all" ? "Todas" : "Pessoal"}
              </Button>
            ))}
            {canViewCsCx && (
              <Button type="button" size="sm" variant={sourceFilter === "cs_cx" ? "secondary" : "ghost"} className="h-8 px-2.5 text-[10px]" aria-pressed={sourceFilter === "cs_cx"} onClick={() => setSourceFilter("cs_cx")}>
                CS/CX
              </Button>
            )}
            {canViewImplementation && (
              <Button type="button" size="sm" variant={sourceFilter === "implementation" ? "secondary" : "ghost"} className="h-8 px-2.5 text-[10px]" aria-pressed={sourceFilter === "implementation"} onClick={() => setSourceFilter("implementation")}>
                Implantação
              </Button>
            )}
            {canViewBoard && (
              <Button type="button" size="sm" variant={sourceFilter === "board" ? "secondary" : "ghost"} className="h-8 px-2.5 text-[10px]" aria-pressed={sourceFilter === "board"} onClick={() => setSourceFilter("board")}>
                Meu Quadro
              </Button>
            )}
          </div>

          {visibleTasks.slice(0, taskLimit).map((task) => {
            const overdue = isMyDayTaskOverdue(task, now);
            const attentionAt = getMyDayTaskAttentionAt(task);
            const snoozed = Boolean(task.snoozedUntil && task.snoozedUntil.getTime() > task.dueAt.getTime());
            return (
              <div
                key={task.id}
                data-agenda-source="personal"
                className={cn(
                  "group flex min-w-0 items-center gap-2 rounded-lg border border-border/70",
                  compact ? "p-2" : "p-3",
                  overdue && "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
                  task.status === "completed" && "opacity-60",
                )}
              >
                <Checkbox
                  checked={task.status === "completed"}
                  disabled={!canEditTask || isSaving}
                  aria-label={`${task.status === "completed" ? "Reabrir" : "Concluir"} ${task.title}`}
                  onCheckedChange={(checked) =>
                    void onSetTaskStatus(task.id, checked ? "completed" : "pending").catch(() => undefined)
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <p className={cn("truncate text-xs font-bold", task.status === "completed" && "line-through")}>
                      {task.title}
                    </p>
                    <Badge variant="outline" className={cn("h-5 px-1.5 text-[8px]", PRIORITY_CLASSES[task.priority])}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge variant="outline" className="h-5 border-emerald-200 px-1.5 text-[8px] text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">Pessoal</Badge>
                    {overdue && <Badge variant="destructive" className="h-5 px-1.5 text-[8px]">Atrasada</Badge>}
                    {task.recurrence !== "none" && <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[8px]"><Repeat2 className="h-2.5 w-2.5" /> Recorrente</Badge>}
                    {task.reminderMinutes !== null && <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[8px]"><Bell className="h-2.5 w-2.5" /> Lembrete</Badge>}
                    {snoozed && <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[8px]"><AlarmClock className="h-2.5 w-2.5" /> Adiada</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {format(attentionAt, "dd/MM 'às' HH:mm")}
                    {task.description ? ` · ${task.description}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canEditTask && task.status === "pending" && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Adiar por uma hora" disabled={isSaving} onClick={() => void onSnoozeTask(task.id, new Date(Math.max(now.getTime(), attentionAt.getTime()) + 60 * 60_000)).catch(() => undefined)}>
                      <AlarmClock className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {task.linkedPath && (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Abrir tela vinculada">
                      <Link to={task.linkedPath}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  {canEditTask && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar tarefa"
                      onClick={() => openEditTask(task)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDeleteTask && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Excluir tarefa"
                      onClick={() => setDeletingTask(task)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {visibleEvents.slice(0, eventLimit).map((event) => (
            <AgendaEventRow key={event.id} event={event} compact={compact} now={now} />
          ))}

          {visibleTasks.length === 0 && visibleEvents.length === 0 && (
            <div className="py-7 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
              <p className="mt-2 text-xs font-semibold">Agenda livre para este filtro.</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Adicione uma tarefa para não perder o próximo passo.
              </p>
            </div>
          )}

          {totalItems > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 border-t pt-2">
              <span className="text-[10px] text-muted-foreground">Exibindo {shownItems} de {totalItems}</span>
              {shownItems < totalItems && (
                <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2 text-[10px]" onClick={() => setExpanded(true)}>
                  Ver toda agenda <ChevronDown className="h-3 w-3" />
                </Button>
              )}
              {expanded && totalItems > 8 && (
                <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2 text-[10px]" onClick={() => setExpanded(false)}>
                  Mostrar menos <ChevronUp className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-dashed p-2.5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {notificationsEnabled && notificationPermission === "granted" ? <Bell className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              <p className="text-[10px] text-muted-foreground">
                {notificationsEnabled && notificationPermission === "granted"
                  ? "Lembretes ativos enquanto o HUB ou PWA estiver aberto."
                  : notificationPermission === "denied"
                    ? "Notificações bloqueadas no navegador. Libere-as nas configurações do site."
                    : notificationPermission === "unsupported"
                      ? "Este navegador não oferece notificações locais."
                      : "Ative lembretes locais para receber avisos enquanto o HUB estiver aberto."}
              </p>
            </div>
            {!notificationsEnabled && notificationPermission !== "denied" && notificationPermission !== "unsupported" && (
              <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[10px]" onClick={() => void onEnableReminders()}>
                <Bell className="h-3 w-3" /> Ativar lembretes
              </Button>
            )}
            {notificationsEnabled && notificationPermission === "granted" && (
              <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-[10px]" onClick={() => void onDisableReminders()}>
                Desativar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <MyDayTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        shortcuts={shortcuts}
        isSaving={isSaving}
        onSave={(input) =>
          editingTask ? onUpdateTask(editingTask.id, input) : onCreateTask(input)
        }
      />

      <AlertDialog open={Boolean(deletingTask)} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deletingTask?.title}” será removida definitivamente da sua agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
              onClick={() => {
                if (!deletingTask) return;
                void onDeleteTask(deletingTask.id)
                  .then(() => setDeletingTask(null))
                  .catch(() => undefined);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
