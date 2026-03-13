import { useState, useMemo } from "react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectModal } from "@/components/ProjectManagement/ProjectModal";
import { ProjectV2, StageStatus } from "@/types/ProjectV2";
import { 
  Loader2, 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";

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
    title: "A Fazer", 
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
  const { toast } = useToast();

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

  const onDragEnd = (result: DropResult) => {
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

    if (project && project.globalStatus !== newStatus) {
      updateProject.mutate({
        projectId: project.id,
        updates: {
          ...project,
          globalStatus: newStatus
        }
      });

      toast({
        title: "Status Atualizado",
        description: `O projeto "${project.clientName}" foi movido para ${newStatus === "todo" ? "A Fazer" : newStatus === "in-progress" ? "Em Andamento" : newStatus === "done" ? "Concluído" : "Bloqueado"}.`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] pt-2 pb-6 px-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight">Quadro Kanban</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-70">
            Acompanhamento visual do fluxo de projetos
          </p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto">
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
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Card 
                                className={cn(
                                  "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all border-none shadow-md group",
                                  snapshot.isDragging && "ring-2 ring-primary shadow-xl rotate-2"
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
                                    {project.nextFollowUpDate && (
                                       <div className={cn(
                                         "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border",
                                         new Date(project.nextFollowUpDate) < new Date() 
                                          ? "bg-red-50 text-red-600 border-red-200" 
                                          : "bg-blue-50 text-blue-600 border-blue-200"
                                       )}>
                                          <Calendar className="h-3 w-3" />
                                          <span className="font-medium">
                                            {new Date(project.nextFollowUpDate).toLocaleDateString()}
                                          </span>
                                       </div>
                                    )}
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
        </div>
      </DragDropContext>

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
