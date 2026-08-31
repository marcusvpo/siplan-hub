import { useState, useMemo } from "react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectModal } from "@/components/ProjectManagement/ProjectModal";
import { ProjectV2 } from "@/types/ProjectV2";
import { 
  Loader2, 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  User,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

type KanbanStatus = "todo" | "in-progress" | "done" | "blocked";

interface Column {
  id: KanbanStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const COLUMNS: Column[] = [
  { 
    id: "todo", 
    title: "Não Iniciado", 
    icon: <Circle className="h-4 w-4" />, 
    color: "text-slate-500 bg-slate-500/10 border-slate-200" 
  },
  { 
    id: "in-progress", 
    title: "Em Andamento", 
    icon: <PlayCircle className="h-4 w-4" />, 
    color: "text-blue-500 bg-blue-500/10 border-blue-200" 
  },
  { 
    id: "done", 
    title: "Concluído", 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-200" 
  },
  { 
    id: "blocked", 
    title: "Bloqueado", 
    icon: <AlertCircle className="h-4 w-4" />, 
    color: "text-red-500 bg-red-500/10 border-red-200" 
  }
];

export default function ProjectsKanban() {
  const { projects, isLoading, updateProject } = useProjectsV2();
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(null);
  const [activeMobileColumn, setActiveMobileColumn] = useState<KanbanStatus>("in-progress");
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEditKanban = hasPermission("kanban", "edit");

  const groupedProjects = useMemo(() => {
    const groups: Record<KanbanStatus, ProjectV2[]> = {
      "todo": [],
      "in-progress": [],
      "done": [],
      "blocked": []
    };

    projects.forEach(project => {
      const status = project.globalStatus as KanbanStatus;
      if (groups[status]) {
        groups[status].push(project);
      } else if (project.globalStatus === "archived") {
        groups["done"].push(project); // Map archived to done for visualization
      }
    });

    return groups;
  }, [projects]);

  const moveProject = (project: ProjectV2, newStatus: KanbanStatus) => {
    if (!canEditKanban) return;

    const currentStatus = project.globalStatus === "archived" ? "done" : project.globalStatus;
    if (currentStatus === newStatus) return;

    updateProject.mutate({
      projectId: project.id,
      updates: {
        ...project,
        globalStatus: newStatus
      }
    });

    const destination = COLUMNS.find(column => column.id === newStatus)?.title ?? newStatus;
    toast({
      title: "Status Atualizado",
      description: `O projeto "${project.clientName}" foi movido para ${destination}.`,
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!canEditKanban) return;

    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as KanbanStatus;
    const project = projects.find(p => p.id === draggableId);

    if (project) moveProject(project, newStatus);
  };

  const mobileColumn = COLUMNS.find(column => column.id === activeMobileColumn) ?? COLUMNS[0];
  const mobileProjects = groupedProjects[activeMobileColumn];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col space-y-4 px-0 pb-4 pt-2 sm:px-4 md:h-[calc(100vh-100px)] md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight">Quadro Kanban</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-70">
            Acompanhamento visual do fluxo de projetos
          </p>
        </div>
      </div>

      <section className="space-y-4 md:hidden" data-testid="mobile-kanban">
        <div className="grid grid-cols-2 gap-2" aria-label="Etapas do Kanban">
          {COLUMNS.map(column => {
            const isActive = column.id === activeMobileColumn;

            return (
              <button
                key={column.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveMobileColumn(column.id)}
                className={cn(
                  "min-w-0 rounded-xl border px-3 py-2.5 text-left shadow-sm transition-colors",
                  isActive
                    ? column.color
                    : "border-border/60 bg-card text-muted-foreground"
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-start gap-2">
                    <span className="shrink-0">{column.icon}</span>
                    <span className="break-words text-[10px] font-bold uppercase leading-tight tracking-wide">
                      {column.title}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className="h-5 min-w-5 shrink-0 justify-center border-current/20 bg-background/60 px-1.5 text-[10px]"
                  >
                    {groupedProjects[column.id].length}
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 px-1">
          <div className={cn("flex min-w-0 items-center gap-2", mobileColumn.color.split(" ")[0])}>
            {mobileColumn.icon}
            <h3 className="truncate text-sm font-black uppercase tracking-wide">
              {mobileColumn.title}
            </h3>
          </div>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {mobileProjects.length} {mobileProjects.length === 1 ? "projeto" : "projetos"}
          </span>
        </div>

        <div className="space-y-3">
          {mobileProjects.map(project => {
            const visualStatus = project.globalStatus === "archived"
              ? "done"
              : project.globalStatus as KanbanStatus;

            return (
              <Card
                key={project.id}
                className="min-w-0 overflow-hidden border-border/60 bg-card/90 shadow-sm"
              >
                <button
                  type="button"
                  className="block w-full p-4 text-left active:bg-muted/40"
                  onClick={() => setSelectedProject(project)}
                >
                  <span className="mb-2 flex min-w-0 flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="h-5 border-primary/20 bg-primary/5 px-1.5 text-[9px] text-primary">
                      #{project.ticketNumber}
                    </Badge>
                    <Badge variant="secondary" className="h-5 max-w-full bg-slate-700 px-1.5 text-[9px] text-white">
                      <span className="truncate">{project.systemType}</span>
                    </Badge>
                  </span>

                  <span className="block break-words text-sm font-bold leading-snug text-foreground">
                    {project.clientName}
                  </span>

                  <span className="mt-4 block space-y-1.5">
                    <span className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-medium uppercase tracking-wider">Progresso</span>
                      <span className="font-bold text-primary">{project.overallProgress}%</span>
                    </span>
                    <Progress value={project.overallProgress} className="h-1.5" />
                  </span>

                  <span className="mt-3 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{project.projectLeader || "Sem Líder"}</span>
                  </span>
                </button>

                {canEditKanban && (
                  <div className="flex items-center gap-3 border-t border-border/60 bg-muted/20 px-4 py-2.5">
                    <label
                      htmlFor={`mobile-status-${project.id}`}
                      className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Mover para
                    </label>
                    <select
                      id={`mobile-status-${project.id}`}
                      aria-label={`Status de ${project.clientName}`}
                      value={visualStatus}
                      onChange={event => moveProject(project, event.target.value as KanbanStatus)}
                      className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                    >
                      {COLUMNS.map(column => (
                        <option key={column.id} value={column.id}>
                          {column.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </Card>
            );
          })}

          {mobileProjects.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center text-muted-foreground">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                {mobileColumn.icon}
              </div>
              <p className="text-sm font-bold text-foreground">Nenhum projeto nesta etapa</p>
              <p className="mt-1 text-xs">Escolha outra etapa acima para continuar.</p>
            </div>
          )}
        </div>
      </section>

      <div className="hidden min-h-0 flex-1 overflow-x-auto md:block">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max pb-4">
            {COLUMNS.map(column => (
              <div key={column.id} className="w-80 flex flex-col gap-4">
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border shadow-sm",
                  column.color
                )}>
                  <div className="flex items-center gap-2">
                    {column.icon}
                    <span className="font-bold text-sm uppercase tracking-wider">{column.title}</span>
                  </div>
                  <Badge variant="outline" className="bg-background/50 border-current/20">
                    {groupedProjects[column.id].length}
                  </Badge>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 overflow-y-auto space-y-3 bg-muted/20 p-2 rounded-xl border border-dashed border-muted-foreground/20 transition-colors",
                        snapshot.isDraggingOver && "bg-muted/40 border-primary/30"
                      )}
                    >
                      {groupedProjects[column.id].map((project, index) => (
                        <Draggable
                          key={project.id}
                          draggableId={project.id}
                          index={index}
                          isDragDisabled={!canEditKanban}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                               <Card 
                                 className={cn(
                                   "cursor-pointer border border-border/50 dark:border-white/5 hover:border-primary/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.015] hover:-translate-y-0.5 bg-card/75 backdrop-blur-sm shadow-md group",
                                   snapshot.isDragging && "ring-2 ring-primary shadow-2xl scale-[1.03] rotate-1.5"
                                 )}
                                 onClick={() => setSelectedProject(project)}
                               >
                                <CardHeader className="p-3 pb-1 space-y-0 flex flex-row items-start justify-between">
                                  <div className="flex-1 min-w-0 mr-2">
                                     <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/20 bg-primary/5 text-primary">
                                          #{project.ticketNumber}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-slate-700 text-white">
                                          {project.systemType}
                                        </Badge>
                                     </div>
                                     <h4 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                       {project.clientName}
                                     </h4>
                                  </div>
                                  <MoreVertical className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
                                </CardHeader>
                                <CardContent className="p-3 pt-2 space-y-3">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                      <span className="font-medium uppercase tracking-wider opacity-70 italic">Progresso</span>
                                      <span className="font-bold text-primary">{project.overallProgress}%</span>
                                    </div>
                                    <Progress value={project.overallProgress} className="h-1" />
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                       <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50 max-w-[120px]">
                                          <User className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{project.projectLeader || "Sem Líder"}</span>
                                       </div>
                                    </div>

                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {groupedProjects[column.id].length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-30 select-none">
                          <ArrowRight className="h-8 w-8 mb-2 rotate-90" />
                          <span className="text-xs font-bold uppercase tracking-widest">Vazio</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      <ProjectModal
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        onUpdate={(updatedProject) => {
          updateProject.mutate({
            projectId: updatedProject.id,
            updates: updatedProject
          });
        }}
      />
    </div>
  );
}
