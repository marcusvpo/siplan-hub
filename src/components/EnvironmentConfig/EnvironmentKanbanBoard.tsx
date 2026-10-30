import { useState, useMemo, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectV2 } from "@/types/ProjectV2";
import { EnvironmentKanbanCard } from "./EnvironmentKanbanCard";
import {
  EnvironmentKanbanColumnId,
  calculateEnvironmentTargetDate,
} from "@/lib/environment-config";
import { cn } from "@/lib/utils";

interface EnvironmentKanbanBoardProps {
  projects: ProjectV2[];
  canEdit: boolean;
  onMoveCard: (
    projectId: string,
    sourceCol: EnvironmentKanbanColumnId,
    destinationCol: EnvironmentKanbanColumnId
  ) => Promise<void>;
  onCardClick: (project: ProjectV2, columnId: EnvironmentKanbanColumnId) => void;
}

interface ColumnConfig {
  id: EnvironmentKanbanColumnId;
  title: string;
  subtitle: string;
  icon: typeof Clock;
  headerColor: string;
  badgeBg: string;
  accentBorder: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "not_started",
    title: "Não Iniciados",
    subtitle: "Aguardando início / atribuição",
    icon: Clock,
    headerColor: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    accentBorder: "border-t-4 border-t-amber-500",
  },
  {
    id: "in_progress",
    title: "Em Andamento",
    subtitle: "Configuração ativa em execução",
    icon: PlayCircle,
    headerColor: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30",
    accentBorder: "border-t-4 border-t-blue-500",
  },
  {
    id: "completed",
    title: "Concluídos",
    subtitle: "Ambientes prontos e homologados",
    icon: CheckCircle2,
    headerColor: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    accentBorder: "border-t-4 border-t-emerald-500",
  },
];

/**
 * Função de ordenação por prioridade da Data Final Limite:
 * 1. Menor data (mais próxima ou já vencida) fica no topo.
 * 2. Sem data ("Aguardando Datas") fica no final da fila.
 */
function sortCardsByPriority(projectsList: ProjectV2[]): ProjectV2[] {
  return [...projectsList].sort((a, b) => {
    const aP1 = a.stages?.implementation?.phase1 as any;
    const bP1 = b.stages?.implementation?.phase1 as any;

    const aStart = aP1?.startDate || aP1?.start_date;
    const bStart = bP1?.startDate || bP1?.start_date;

    const aTarget = calculateEnvironmentTargetDate(aStart);
    const bTarget = calculateEnvironmentTargetDate(bStart);

    // Se ambos têm data: ordem crescente de timestamp (mais urgente primeiro)
    if (aTarget && bTarget) {
      return aTarget.getTime() - bTarget.getTime();
    }

    // Quem tem data fica na frente de quem não tem
    if (aTarget && !bTarget) return -1;
    if (!aTarget && bTarget) return 1;

    // Se nenhum tem data, ordena alfabeticamente pelo nome do cliente
    return (a.clientName || "").localeCompare(b.clientName || "");
  });
}

export function EnvironmentKanbanBoard({
  projects,
  canEdit,
  onMoveCard,
  onCardClick,
}: EnvironmentKanbanBoardProps) {
  // Controle de expansão da seção retrátil "Finalizados" dentro da coluna "Concluídos"
  const [isFinalizedExpanded, setIsFinalizedExpanded] = useState(false);

  // Distribuir projetos pelas 3 colunas com base em kanbanStatus e environment_status
  const columnsData = useMemo(() => {
    const notStarted: ProjectV2[] = [];
    const inProgress: ProjectV2[] = [];
    const completedWithPendings: ProjectV2[] = [];
    const completedWithoutPendings: ProjectV2[] = [];

    projects.forEach((proj) => {
      const env = proj.stages?.environment;
      const kanbanStatus = env?.kanbanStatus;
      const envStatus = env?.status || "todo";
      const hasPendings = Boolean(env?.hasPendings);

      // Determina a coluna
      let targetCol: EnvironmentKanbanColumnId = "not_started";

      if (kanbanStatus === "completed" || envStatus === "done") {
        targetCol = "completed";
      } else if (kanbanStatus === "in_progress") {
        targetCol = "in_progress";
      } else {
        // Padrão: "not_started"
        targetCol = "not_started";
      }

      if (targetCol === "not_started") {
        notStarted.push(proj);
      } else if (targetCol === "in_progress") {
        inProgress.push(proj);
      } else {
        // Coluna Concluídos
        if (hasPendings) {
          completedWithPendings.push(proj);
        } else {
          completedWithoutPendings.push(proj);
        }
      }
    });

    return {
      not_started: sortCardsByPriority(notStarted),
      in_progress: sortCardsByPriority(inProgress),
      completed_pendings: sortCardsByPriority(completedWithPendings),
      completed_finalized: sortCardsByPriority(completedWithoutPendings),
      completed_total_count: completedWithPendings.length + completedWithoutPendings.length,
    };
  }, [projects]);

  // Handler de Drag and Drop
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination || !canEdit) return;

      const sourceCol = source.droppableId as EnvironmentKanbanColumnId;
      const destCol = destination.droppableId as EnvironmentKanbanColumnId;

      if (sourceCol === destCol && source.index === destination.index) {
        return;
      }

      await onMoveCard(draggableId, sourceCol, destCol);
    },
    [canEdit, onMoveCard]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full min-w-0">
        {COLUMNS.map((col) => {
          const ColIcon = col.icon;
          const isCompletedCol = col.id === "completed";

          const cardsList =
            col.id === "not_started"
              ? columnsData.not_started
              : col.id === "in_progress"
              ? columnsData.in_progress
              : [];

          const totalCardsCount = isCompletedCol
            ? columnsData.completed_total_count
            : cardsList.length;

          return (
            <div
              key={col.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-muted/20 shadow-sm overflow-hidden",
                col.accentBorder
              )}
            >
              {/* Cabeçalho da Coluna */}
              <div className="p-3.5 sm:p-4 border-b bg-card/70 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("p-1.5 rounded-lg bg-background border shadow-xs", col.headerColor)}>
                    <ColIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {col.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {col.subtitle}
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className={cn("text-xs font-bold px-2 py-0.5", col.badgeBg)}>
                  {totalCardsCount}
                </Badge>
              </div>

              {/* Área Droppable da Coluna */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 sm:p-3.5 space-y-3 min-h-[450px] transition-colors overflow-y-auto",
                      snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                    )}
                  >
                    {/* Se não for coluna de Concluídos, renderiza os cards normais */}
                    {!isCompletedCol &&
                      cardsList.map((project, idx) => (
                        <EnvironmentKanbanCard
                          key={project.id}
                          project={project}
                          index={idx}
                          columnId={col.id}
                          canEdit={canEdit}
                          onClick={() => onCardClick(project, col.id)}
                        />
                      ))}

                    {/* Coluna Concluídos com Tratamento Especial para Pendências e Finalizados Retráteis */}
                    {isCompletedCol && (
                      <div className="space-y-3">
                        {/* 1. Cards com Pendências (Sempre Visíveis fora da seção retraída) */}
                        {columnsData.completed_pendings.map((project, idx) => (
                          <EnvironmentKanbanCard
                            key={project.id}
                            project={project}
                            index={idx}
                            columnId="completed"
                            canEdit={canEdit}
                            onClick={() => onCardClick(project, "completed")}
                          />
                        ))}

                        {/* 2. Seção Retrátil para os 100% Finalizados */}
                        <div className="mt-4 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsFinalizedExpanded(!isFinalizedExpanded)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Finalizados ({columnsData.completed_finalized.length})</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              <span>{isFinalizedExpanded ? "Recolher" : "Expandir"}</span>
                              {isFinalizedExpanded ? (
                                <ChevronDown className="h-4 w-4 transition-transform" />
                              ) : (
                                <ChevronRight className="h-4 w-4 transition-transform" />
                              )}
                            </div>
                          </button>

                          {/* Cards Finalizados Expansíveis */}
                          {isFinalizedExpanded && (
                            <div className="mt-3 space-y-3 pl-1">
                              {columnsData.completed_finalized.map((project, idx) => (
                                <EnvironmentKanbanCard
                                  key={project.id}
                                  project={project}
                                  index={columnsData.completed_pendings.length + idx}
                                  columnId="completed"
                                  canEdit={canEdit}
                                  onClick={() => onCardClick(project, "completed")}
                                />
                              ))}

                              {columnsData.completed_finalized.length === 0 && (
                                <p className="text-center py-4 text-xs text-muted-foreground italic">
                                  Nenhum ambiente 100% finalizado nesta visualização.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Estado Vazio da Coluna */}
                    {totalCardsCount === 0 && (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-border/60">
                        <FolderKanban className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground">
                          Nenhum projeto nesta etapa
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {col.id === "not_started"
                            ? "Projetos enviados para preparação de ambiente aparecerão aqui."
                            : col.id === "in_progress"
                            ? "Arraste os cards para cá para iniciar a atuação."
                            : "Cards concluídos serão listados aqui."}
                        </p>
                      </div>
                    )}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
