import { useMemo } from "react";
import { addHours, format } from "date-fns";
import { Link } from "react-router-dom";
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Database,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyDayConversionIssue } from "@/hooks/useMyDay";
import type { MyDayAgendaEvent } from "@/lib/my-day-agenda";
import type { MyDayProject } from "@/lib/my-day";
import {
  getMyDayTaskAttentionAt,
  isMyDayTaskOverdue,
  type MyDayTask,
} from "@/lib/my-day-workspace";
import { cn } from "@/lib/utils";

type PriorityItem =
  | { kind: "project"; id: string; title: string; detail: string; score: number; at: Date; path: string }
  | { kind: "task"; id: string; title: string; detail: string; score: number; at: Date; task: MyDayTask }
  | { kind: "event"; id: string; title: string; detail: string; score: number; at: Date; path: string }
  | { kind: "issue"; id: string; title: string; detail: string; score: number; at: Date; path: string };

const ICONS = {
  project: AlertTriangle,
  task: AlarmClock,
  event: CalendarClock,
  issue: Database,
};

export function MyDayPriorityQueue({
  projects,
  tasks,
  events,
  issues,
  projectPath,
  compact = true,
  canEditTask,
  isSaving,
  onCompleteTask,
  onSnoozeTask,
}: {
  projects: MyDayProject[];
  tasks: MyDayTask[];
  events: MyDayAgendaEvent[];
  issues: MyDayConversionIssue[];
  projectPath: (project: MyDayProject) => string;
  compact?: boolean;
  canEditTask: boolean;
  isSaving: boolean;
  onCompleteTask: (id: string) => Promise<unknown>;
  onSnoozeTask: (id: string, until: Date) => Promise<unknown>;
}) {
  const items = useMemo<PriorityItem[]>(() => {
    const now = new Date();
    return [
      ...projects
        .filter((project) => project.tone === "critical")
        .map((project) => ({
          kind: "project" as const,
          id: project.id,
          title: project.clientName,
          detail: `${project.attentionLabel} · ${project.nextStage?.label ?? "Fluxo concluído"}`,
          score: project.isOverdue ? 5 : 4,
          at: project.nextStage?.endDate ?? project.lastUpdatedAt,
          path: projectPath(project),
        })),
      ...tasks
        .filter((task) => task.status === "pending" && (task.priority === "critical" || task.priority === "high" || isMyDayTaskOverdue(task, now)))
        .map((task) => {
          const at = getMyDayTaskAttentionAt(task);
          return {
            kind: "task" as const,
            id: task.id,
            title: task.title,
            detail: `${isMyDayTaskOverdue(task, now) ? "Atrasada" : "Tarefa"} · ${format(at, "dd/MM 'às' HH:mm")}`,
            score: isMyDayTaskOverdue(task, now) ? 5 : task.priority === "critical" ? 4 : 3,
            at,
            task,
          };
        }),
      ...events
        .filter((event) => event.isOverdue)
        .map((event) => ({
          kind: "event" as const,
          id: event.id,
          title: event.title,
          detail: `${event.context} · ${event.sourceLabel} · ${format(event.startsAt, event.allDay ? "dd/MM" : "dd/MM 'às' HH:mm")}`,
          score: 5,
          at: event.startsAt,
          path: event.path,
        })),
      ...issues
        .filter((issue) => issue.priority === "critical" || issue.priority === "high")
        .map((issue) => ({
          kind: "issue" as const,
          id: issue.id,
          title: issue.title,
          detail: `${issue.clientName} · conversão`,
          score: issue.priority === "critical" ? 4 : 3,
          at: issue.updatedAt,
          path: "/conversion/atividades",
        })),
    ].sort((left, right) => right.score - left.score || left.at.getTime() - right.at.getTime());
  }, [events, issues, projectPath, projects, tasks]);

  return (
    <Card className="h-full min-w-0 overflow-hidden border-border/70 shadow-sm" data-testid="my-day-priority-queue">
      <CardHeader className={cn("flex flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/15", compact ? "p-3" : "p-4")}>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-500" /> Fila de prioridades
          </CardTitle>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">O que pede sua ação primeiro, reunido em uma única lista.</p>
        </div>
        <Badge variant={items.length ? "destructive" : "secondary"} className="shrink-0">{items.length}</Badge>
      </CardHeader>
      <CardContent className={cn("min-w-0 space-y-1.5", compact ? "p-2.5" : "p-4")}>
        {items.slice(0, compact ? 8 : 6).map((item) => {
          const Icon = ICONS[item.kind];
          const content = (
            <>
              <span className="shrink-0 rounded-md bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-300"><Icon className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{item.title}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{item.detail}</span>
              </span>
            </>
          );

          if (item.kind !== "task") {
            return (
              <Link key={`${item.kind}-${item.id}`} to={item.path} className={cn("group flex min-w-0 items-center gap-2 rounded-lg border border-border/70 hover:border-primary/40 hover:bg-muted/20", compact ? "p-2" : "p-3")}>
                {content}<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            );
          }

          return (
            <div key={`task-${item.id}`} className={cn("flex min-w-0 items-center gap-2 rounded-lg border border-border/70", compact ? "p-2" : "p-3")}>
              {content}
              {canEditTask && (
                <div className="flex shrink-0 gap-0.5">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Adiar por uma hora" disabled={isSaving} onClick={() => void onSnoozeTask(item.id, addHours(new Date(Math.max(Date.now(), item.at.getTime())), 1)).catch(() => undefined)}>
                    <AlarmClock className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Concluir tarefa" disabled={isSaving} onClick={() => void onCompleteTask(item.id).catch(() => undefined)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="py-7 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
            <p className="mt-2 text-xs font-semibold">Nenhuma prioridade crítica agora.</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Sua fila está sob controle.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
