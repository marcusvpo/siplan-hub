import { memo, useMemo } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  Calendar,
  User,
  AlertTriangle,
  Server,
  Layers,
  Sparkles,
  Cpu,
  Clock,
  ShieldAlert,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectV2 } from "@/types/ProjectV2";
import {
  EnvironmentKanbanColumnId,
  calculateEnvironmentTargetDate,
  formatEnvironmentTargetDate,
  getEnvironmentUrgency,
} from "@/lib/environment-config";
import { getProjectOrionAdminStatus } from "@/lib/secondary-products";
import { cn } from "@/lib/utils";

interface EnvironmentKanbanCardProps {
  project: ProjectV2;
  index: number;
  columnId: EnvironmentKanbanColumnId;
  canEdit: boolean;
  onClick: (project: ProjectV2) => void;
}

export const EnvironmentKanbanCard = memo(function EnvironmentKanbanCard({
  project,
  index,
  columnId,
  canEdit,
  onClick,
}: EnvironmentKanbanCardProps) {
  // 1. Extrair data de início da Fase 1
  const phase1 = project.stages?.implementation?.phase1 as any;
  const phase1StartDate = phase1?.startDate || phase1?.start_date;
  const targetDate = useMemo(
    () => calculateEnvironmentTargetDate(phase1StartDate),
    [phase1StartDate]
  );
  const formattedTargetDate = useMemo(
    () => formatEnvironmentTargetDate(targetDate),
    [targetDate]
  );

  const envStage = project.stages?.environment;
  const responsible = envStage?.responsible?.trim() || "";
  const hasPendings = Boolean(envStage?.hasPendings);

  // 2. Cores e urgência calculadas
  const urgency = useMemo(
    () => getEnvironmentUrgency(targetDate, columnId, hasPendings),
    [targetDate, columnId, hasPendings]
  );

  // 3. Produtos secundários e Orion Admin
  const secondaryCount = project.secondaryTicketsCount || 0;
  const secondaryNames = project.secondaryProductsNames || [];
  const orionAdminStatus = useMemo(
    () => getProjectOrionAdminStatus(project),
    [project]
  );

  const isUnassigned = !responsible && columnId === "not_started";

  return (
    <Draggable
      draggableId={project.id}
      index={index}
      isDragDisabled={!canEdit}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(project)}
          data-testid={`kanban-card-${project.id}`}
          className={cn(
            "group relative rounded-xl border p-3.5 shadow-sm transition-all duration-200 select-none",
            "cursor-pointer hover:shadow-lg active:cursor-grabbing",
            urgency.cardBorderClass,
            urgency.cardBgClass,
            snapshot.isDragging && "scale-[1.02] shadow-2xl ring-2 ring-primary rotate-1 z-50",
            urgency.isPulsing && "shadow-red-500/25 ring-1 ring-red-500/50"
          )}
        >
          {/* Badge superior Flutuante para Urgência Crítica / Atrasada */}
          {urgency.isPulsing && (
            <div className="absolute -top-3 right-3 flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-lg animate-bounce border border-white/40">
              <ShieldAlert className="h-3 w-3 shrink-0" />
              <span>{urgency.badgeLabel}</span>
            </div>
          )}

          {/* Cabeçalho do Card: Cliente e Chamado */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4
                className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
                title={project.clientName}
              >
                {project.clientName}
              </h4>
            </div>

            {project.ticketNumber && (
              <Badge
                variant="outline"
                className="shrink-0 font-mono text-[10px] bg-background/90 font-bold px-1.5 py-0.5 text-foreground shadow-xs border-foreground/20"
              >
                #{project.ticketNumber}
              </Badge>
            )}
          </div>

          {/* Status e Tags Especiais */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* Tag de Pendências (quando ativada em Concluídos) */}
            {hasPendings && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 shadow-sm border border-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
                Pendências
              </Badge>
            )}

            {/* Indicador de Etapa 4 Aguardando Início (Planejamento Futuro / Fase 1) */}
            {project.stages?.environment?.status === "todo" && (
              <Badge
                variant="outline"
                className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/40 text-[10px] font-bold px-1.5 py-0.5"
                title="Etapa 4 ainda não iniciada formalmente no projeto. Exibido na esteira devido à data de implantação prevista cadastrada na Fase 1."
              >
                <Clock className="h-3 w-3 mr-1 shrink-0 text-slate-500" />
                Aguardando Início Etapa 4
              </Badge>
            )}

            {/* Badge de Situação de Prazo na coluna Não Iniciados */}
            {columnId === "not_started" && targetDate && (
              <Badge className={cn("text-[10px] px-2 py-0.5 shadow-xs", urgency.badgeClass)}>
                {urgency.badgeLabel}
              </Badge>
            )}

            {/* Sistema Principal */}
            {project.systemType && (
              <Badge
                variant="secondary"
                className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold flex items-center gap-1 px-2 py-0.5"
              >
                <Cpu className="h-3 w-3 shrink-0" />
                {project.systemType}
              </Badge>
            )}

            {/* Orion Admin Badge */}
            {orionAdminStatus.required && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5",
                  orionAdminStatus.isConfigured
                    ? "bg-emerald-600 text-white border-emerald-700"
                    : "bg-blue-600 text-white border-blue-700"
                )}
                title={
                  orionAdminStatus.isConfigured
                    ? "Orion Admin já configurado"
                    : `Necessita Orion Admin (${orionAdminStatus.dependentProducts.join(", ")})`
                }
              >
                <Server className="h-3 w-3 mr-1 shrink-0" />
                {orionAdminStatus.isConfigured ? "Orion OK" : "Req. Orion"}
              </Badge>
            )}

            {/* Badges de Produtos Secundários */}
            {secondaryCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-background/90 text-foreground border border-foreground/20 font-bold flex items-center gap-1 px-1.5 py-0.5 shadow-xs"
                    >
                      <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                      +{secondaryCount} sec.
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-xs">
                    <p className="font-semibold mb-1">Produtos Secundários vinculados:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {secondaryNames.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Alerta de Responsável Necessário (Vibrante) */}
          {isUnassigned && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500/20 p-2 text-amber-900 dark:text-amber-100 animate-pulse shadow-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-black leading-tight">
                Sem responsável definido — Assumir configuração!
              </span>
            </div>
          )}

          {/* Rodapé do Card: Responsável e Data Final */}
          <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5 text-xs text-muted-foreground">
            {/* Responsável */}
            <div className="flex items-center gap-1.5 min-w-0 max-w-[55%]">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs",
                  responsible
                    ? "bg-slate-800 dark:bg-slate-700"
                    : "bg-red-600 text-white animate-pulse"
                )}
              >
                {responsible ? (
                  responsible.slice(0, 2).toUpperCase()
                ) : (
                  <User className="h-3 w-3" />
                )}
              </div>
              <span
                className={cn(
                  "truncate font-bold text-[11px]",
                  responsible ? "text-foreground" : "text-red-600 dark:text-red-400 italic"
                )}
                title={responsible || "Pendente de atribuição"}
              >
                {responsible || "Sem responsável"}
              </span>
            </div>

            {/* Data Final e Urgência */}
            <div className="flex items-center gap-1.5 text-right">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "text-[11px] font-bold px-1.5 py-0.5 rounded-md",
                        targetDate
                          ? "bg-background/90 text-foreground border border-border shadow-xs"
                          : "text-muted-foreground italic"
                      )}
                    >
                      {formattedTargetDate}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-bold">Data Limite (Último dia útil pré-implantação)</p>
                    <p className="text-muted-foreground mt-0.5">
                      {targetDate
                        ? `Configuração deve ser concluída até ${formattedTargetDate}.`
                        : "Datas da Fase 1 (Treinamento & Acompanhamento) ainda não preenchidas."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});
