import { ProjectV2 } from "@/types/ProjectV2";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PosSaudeBadge } from "@/components/ProjectManagement/PosSaudeBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Cog,
  PlayCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePermissions } from "@/hooks/usePermissions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getStageReadiness,
  identifyBottleneck,
  identifyBottlenecks,
  getBottleneckColor,
  getBottleneckIcon,
} from "@/lib/predictability-utils";

interface ProjectCardV3Props {
  project: ProjectV2;
  onClick: (project: ProjectV2) => void;
  onAction: (action: string, project: ProjectV2) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  engineStatus?: string | null;
}

export function ProjectCardV3({
  project,
  onClick,
  onAction,
  selected,
  onSelect,
  engineStatus,
}: ProjectCardV3Props) {
  const { canDeleteProjects } = usePermissions();


  // Predictability: Detect bottleneck(s) and stage readiness
  const bottleneck = identifyBottleneck(project);
  const bottlenecks = identifyBottlenecks(project); // Array of all bottlenecks
  const stageReadiness = getStageReadiness(project);

  const isModelosTN = project.systemType === "Modelos TN";

  const isImplementationInProgress =
    !isModelosTN && project.stages?.implementation?.status === "in-progress";
  const isConfirmed =
    !isModelosTN && !!project.stages?.implementation?.phase1?.isConfirmed;
  const phase1 = project.stages?.implementation?.phase1;
  const startDate = phase1?.startDate || project.stages?.implementation?.startDate;
  const endDate = phase1?.endDate || project.stages?.implementation?.endDate;
  const hasForecastDates = Boolean(startDate && endDate);

  const isForecastScheduled =
    !isModelosTN && !isImplementationInProgress && !isConfirmed && hasForecastDates;

  const hasTopLeftTag =
    !isModelosTN && (isImplementationInProgress || isConfirmed || isForecastScheduled);

  const getVerticalBarColor = () => {
    if (project.healthScore === "critical") return "bg-rose-500";
    if (project.healthScore === "warning") return "bg-amber-500";

    if (isImplementationInProgress) {
      return "bg-blue-600";
    }
    if (isConfirmed) {
      return "bg-emerald-500";
    }
    if (isForecastScheduled) {
      return "bg-slate-600 dark:bg-slate-500";
    }
    return "bg-[#0dcaf0]";
  };

  const getHealthColor = (score: string) => {
    switch (score) {
      case "ok":
        return "bg-emerald-500";
      case "warning":
        return "bg-amber-500";
      case "critical":
        return "bg-rose-500";
      default:
        return "bg-slate-500";
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-emerald-500";
      case "in-progress":
        return "bg-blue-500";
      case "blocked":
        return "bg-amber-500";
      case "waiting_adjustment":
        return "bg-orange-500";
      default:
        return "bg-slate-200 dark:bg-slate-700";
    }
  };

  const getGlobalStatusBadge = (status: ProjectV2["globalStatus"]) => {
    switch (status) {
      case "done":
        return {
          label: "Finalizado",
          className: "bg-slate-700 hover:bg-slate-800 text-white border-slate-800",
        };
      case "blocked":
        return {
          label: "Pausado",
          className: "bg-amber-500 hover:bg-amber-600 text-white border-amber-600",
        };
      default: {
        let colorClass = "bg-[#0dcaf0] hover:bg-[#0bb5d8] text-white border-[#0dcaf0] font-extrabold shadow-[#0dcaf0]/20";
        if (isImplementationInProgress) {
          colorClass = "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-500/20";
        } else if (isConfirmed) {
          colorClass = "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-500/20";
        } else if (isForecastScheduled) {
          colorClass = "bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 text-white border-slate-600 shadow-slate-600/20";
        }
        return {
          label: "Projeto Ativo",
          className: colorClass,
        };
      }
    }
  };

  const globalStatusBadge = getGlobalStatusBadge(project.globalStatus);

  const isOrionTN =
    project.systemType === "Orion TN" ||
    project.systemType === "Modelos TN" ||
    project.products?.includes("Orion TN") ||
    project.products?.includes("OrionTN");

  const baseStages = isModelosTN ? [] : [
    { id: "infra", label: "Infra", status: project.stages.infra.status },
    {
      id: "adherence",
      label: "Aderência",
      status: project.stages.adherence.status,
    },
    {
      id: "conversion",
      label: "Conversão",
      status: project.stages.conversion.status,
    },
    {
      id: "environment",
      label: "Ambiente",
      status: project.stages.environment.status,
    },
  ];

  const orionStages = isOrionTN ? [{
    id: "modelosEditor",
    label: "Modelos",
    status: project.stages.modelosEditor?.status || "todo",
  }] : [];

  const endStages = [
    {
      id: "implementation",
      label: "Implantação",
      status: project.stages.implementation.status,
    },
    ...(isModelosTN ? [] : [{ id: "post", label: "Pós", status: project.stages.post.status }]),
  ];

  const stages = [...baseStages, ...orionStages, ...endStages];

  const isFromAutomacao = project.TituloChamado || 
                          project.descricaotramite || 
                          project.ResponsavelAtividade || 
                          project.EtapasProjeto;

  return (
    <Card
      className="w-full hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-stretch md:items-center p-3 md:p-3 gap-3 md:gap-4 min-h-[5.5rem] h-auto relative overflow-visible group bg-card/50 backdrop-blur-sm"
      onClick={() => onClick(project)}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5",
          getVerticalBarColor(),
        )}
      />

      {/* Top Left Tag - Floating over Top Border */}
      {hasTopLeftTag && (
        <div className="absolute -top-2.5 left-2 z-10">
          {isImplementationInProgress ? (
            <Badge className="text-[9px] px-2 py-0.5 font-bold shadow-lg border-2 border-background bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 flex items-center gap-1">
              <PlayCircle className="w-2.5 h-2.5" />
              Implantação em Andamento
            </Badge>
          ) : isConfirmed ? (
            <Badge className="text-[9px] px-2 py-0.5 font-bold shadow-lg border-2 border-background bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Implantação Confirmada
            </Badge>
          ) : (
            <Badge className="text-[9px] px-2 py-0.5 font-bold shadow-lg border-2 border-background bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white shadow-slate-600/20 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-slate-200" />
              Previsão Agendada
            </Badge>
          )}
        </div>
      )}

      {/* Project Status Badges - Floating over Top Right Corner */}
      <div className="absolute -top-1.5 -right-1.5 z-10 flex items-center gap-1.5">
        <PosSaudeBadge projectId={project.id} />
        {isFromAutomacao && (
          <Badge className="text-[9px] px-2 py-0.5 font-bold shadow-lg border-2 border-background bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20">
            Autom. N8N
          </Badge>
        )}
        <Badge
          className={cn(
            "text-[9px] px-2 py-0.5 font-bold shadow-lg border-2 border-background",
            globalStatusBadge.className,
          )}
        >
          {globalStatusBadge.label}
        </Badge>
      </div>

      {/* Selection Checkbox */}
      {onSelect && (
        <div className="mr-1 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(checked as boolean)}
            className="h-3.5 w-3.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
      )}

      {/* 1. Info Principal */}
      <div className={cn("flex flex-col justify-center flex-[1.5] w-full md:w-auto min-w-0 space-y-1", hasTopLeftTag && "pt-1 sm:pt-2 md:pt-2.5")}>
        <div className="flex items-center gap-2 w-full min-w-0">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0 shadow-sm ring-1 ring-background",
              getVerticalBarColor(),
            )}
            title={`Status: ${
              isImplementationInProgress
                ? "Implantação em Andamento"
                : isConfirmed
                ? "Implantação Confirmada"
                : "Projeto Ativo"
            } | Saúde: ${
              project.healthScore === "ok"
                ? "OK"
                : project.healthScore === "warning"
                ? "Atenção"
                : "Crítico"
            }`}
          />
          <h3
            className="font-bold text-sm sm:text-base leading-tight truncate tracking-tight text-foreground/90 w-full min-w-0"
            title={project.clientName}
          >
            {project.clientName}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground w-full min-w-0">
          <Badge
            variant="outline"
            className="font-medium bg-muted/50 text-muted-foreground border-border/50 px-1 py-0 text-[10px] shrink-0"
          >
            {project.systemType}
          </Badge>
          <span className="font-mono opacity-70 shrink-0">
            #{project.ticketNumber}
          </span>
        </div>

        {project.TituloChamado && (
          <div className="text-[11px] font-medium text-muted-foreground/90 truncate leading-snug w-full min-w-0" title={project.TituloChamado}>
            {project.TituloChamado}
          </div>
        )}
        
        {project.EtapasProjeto && (
          <div className="text-[10px] text-muted-foreground/80 truncate flex items-center gap-1.5 w-full min-w-0 bg-muted/40 rounded-md px-1.5 py-0.5 border border-border/30" title={project.EtapasProjeto}>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 animate-pulse shrink-0"></div>
            <span className="truncate">0800: <span className="font-medium text-foreground/80">{project.EtapasProjeto}</span></span>
          </div>
        )}
      </div>

      {/* 2. Pipeline Visual */}
      <div className="flex-[2.5] w-full md:w-auto flex flex-col justify-center px-2 sm:px-4 md:border-l md:border-r border-border/40 min-h-[2.5rem] bg-gradient-to-r from-transparent via-muted/5 to-transparent overflow-x-auto scrollbar-none py-1">
        <div className="flex items-center justify-between gap-1 relative w-full min-w-[280px] sm:min-w-0 max-w-2xl mx-auto">
          {/* Linha de conexão (fundo) */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-muted-foreground/10 -z-10 transform -translate-y-1/2 rounded-full" />

          {stages.map((stage) => {
            const readiness = stageReadiness.find(
              (r) => r.stageId === stage.id,
            );
            const isReady = readiness?.isReady || false;

            return (
              <div
                key={stage.id}
                className="flex flex-col items-center gap-1 z-0 group/stage relative cursor-help"
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full ring-2 ring-background shadow-sm transition-all",
                    getStageColor(stage.status),
                    isReady && stage.status === "todo" && "animate-pulse-ring",
                  )}
                />
                <span
                  className={cn(
                    "text-[8px] md:text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                    stage.status === "done"
                      ? "text-emerald-600/70 dark:text-emerald-400/70"
                      : stage.status === "in-progress"
                        ? "text-primary"
                        : isReady && stage.status === "todo"
                          ? "text-primary font-extrabold"
                          : "text-muted-foreground/40",
                  )}
                >
                  {stage.label}
                </span>

                {/* Enhanced Tooltip */}
                <div className="absolute bottom-full mb-3 hidden group-hover/stage:block z-50 min-w-[150px] bg-popover text-popover-foreground text-xs rounded-lg border shadow-xl p-2 animate-in fade-in zoom-in-95 duration-200">
                  <p className="font-bold text-[11px]">{stage.label}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {stage.status === "done" ? "Concluído" : stage.status === "in-progress" ? "Em Andamento" : "Pendente"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Gargalo Atual */}
      <div className="flex-[1.2] w-full md:w-auto flex flex-col justify-center px-2 sm:px-4 md:border-r border-border/40 min-w-0 bg-gradient-to-r from-transparent via-muted/3 to-transparent">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold opacity-60 mb-1 whitespace-nowrap overflow-hidden">
          Gargalo{bottlenecks.length > 1 ? "s" : ""}
        </span>
        {bottlenecks.length === 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px]">🟢</span>
            <span className="text-[10px] text-muted-foreground">Nenhum</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 overflow-hidden">
            {bottlenecks.slice(0, 1).map((b, idx) => (
              <div key={idx} className="flex items-center gap-1 min-w-0">
                <span className="text-[10px] shrink-0">
                  {getBottleneckIcon(b.severity)}
                </span>
                <div className="flex flex-col min-w-0">
                  <span
                    className={cn(
                      "text-[11px] font-bold leading-tight truncate",
                      getBottleneckColor(b.severity),
                    )}
                  >
                    {b.stageName}
                  </span>
                  {b.daysStuck > 0 && (
                    <span className="text-[8px] text-muted-foreground whitespace-nowrap">
                      há {b.daysStuck}d
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Metricas & Ações */}
      <div className="flex-[1.2] w-full md:w-auto flex items-center gap-3 justify-between md:justify-end pl-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/30">
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-bold opacity-60 mb-0.5">
            UAT
          </span>
          <div className="flex items-center gap-1 text-[9px] font-semibold text-foreground bg-muted/30 px-1 py-0.5 rounded-md border border-border/50">
            <Clock className="h-2.5 w-2.5 text-primary/70 shrink-0" />
            <span className="whitespace-nowrap">
              {format(new Date(project.lastUpdatedAt), "dd/MM HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            {canDeleteProjects && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAction("delete", project);
              }}
              className="text-red-600 focus:text-red-600 cursor-pointer text-[11px] py-1"
            >
              Excluir
            </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
