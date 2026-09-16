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
import type { MyDayAppointment, MyDayShortcut } from "@/hooks/useMyDay";
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
  appointments: MyDayAppointment[];
  shortcuts: MyDayShortcut[];
  filter: MyDayAgendaFilter;
  compact?: boolean;
  canViewAppointments: boolean;
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

function AppointmentRow({ appointment, compact, now }: { appointment: MyDayAppointment; compact: boolean; now: Date }) {
  const today = isSameDay(appointment.startsAt, now);
  return (
    <Link
      to="/cs-cx/agendamentos"
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-lg border border-border/70 transition-colors hover:border-primary/40 hover:bg-muted/20",
        compact ? "p-2" : "p-3",
      )}
    >
      <div
        className={cn(
          "flex w-11 shrink-0 flex-col items-center rounded-md px-1 py-1.5 text-center",
          appointment.isOverdue
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
            : today
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
        )}
      >
        <span className="text-[8px] font-black uppercase">
          {appointment.isOverdue ? "Atraso" : format(appointment.startsAt, "EEE", { locale: ptBR })}
        </span>
        <span className="text-xs font-black">{format(appointment.startsAt, "HH:mm")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{appointment.title}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {appointment.officeName} · {format(appointment.startsAt, "dd/MM")}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </Link>
  );
}

export function MyDayAgenda({
  tasks,
  appointments,
  shortcuts,
  filter,
  compact = true,
  canViewAppointments,
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
  const [expanded, setExpanded] = useState(false);

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
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
    [filter, now, statusFilter, tasks],
  );

  const visibleAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (statusFilter === "completed") return false;
        if (statusFilter === "overdue" && !appointment.isOverdue) return false;
        if (filter === "today") return isSameDay(appointment.startsAt, now);
        if (filter === "critical") return appointment.isOverdue;
        return true;
      }),
    [appointments, filter, now, statusFilter],
  );

  const totalItems = visibleTasks.length + (canViewAppointments ? visibleAppointments.length : 0);
  const taskLimit = expanded ? visibleTasks.length : 8;
  const appointmentLimit = expanded ? visibleAppointments.length : 5;
  const shownItems = Math.min(visibleTasks.length, taskLimit) +
    (canViewAppointments ? Math.min(visibleAppointments.length, appointmentLimit) : 0);

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
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              Tarefas pessoais e compromissos em um só lugar.
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
          <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Filtrar tarefas da agenda">
            {([
              ["all", "Tudo"],
              ["pending", "Pendentes"],
              ["overdue", "Atrasadas"],
              ["completed", "Concluídas"],
            ] as const).map(([value, label]) => (
              <Button key={value} type="button" size="sm" variant={statusFilter === value ? "secondary" : "ghost"} className="h-7 px-2 text-[10px]" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>
                {label}
              </Button>
            ))}
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">{totalItems} {totalItems === 1 ? "item" : "itens"}</span>
          </div>

          {visibleTasks.slice(0, taskLimit).map((task) => {
            const overdue = isMyDayTaskOverdue(task, now);
            const attentionAt = getMyDayTaskAttentionAt(task);
            const snoozed = Boolean(task.snoozedUntil && task.snoozedUntil.getTime() > task.dueAt.getTime());
            return (
              <div
                key={task.id}
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

          {canViewAppointments && visibleAppointments.slice(0, appointmentLimit).map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} compact={compact} now={now} />
          ))}

          {visibleTasks.length === 0 && visibleAppointments.length === 0 && (
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
