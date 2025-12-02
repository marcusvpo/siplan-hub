import { ProjectV2 } from "@/types/ProjectV2";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
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
import { Checkbox } from "@/components/ui/checkbox";

interface ProjectCardV3Props {
  project: ProjectV2;
  onClick: (project: ProjectV2) => void;
  onAction: (action: string, project: ProjectV2) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function ProjectCardV3({
  project,
  onClick,
  onAction,
  selected,
  onSelect,
}: ProjectCardV3Props) {
  const isFollowUpOverdue =
    project.nextFollowUpDate && new Date(project.nextFollowUpDate) < new Date();

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

  const stages = [
    { id: "infra", label: "Infra", status: project.stages.infra.status },
    {
      id: "adherence",
      label: "Aderência",
      status: project.stages.adherence.status,
    },
    {
      id: "environment",
      label: "Ambiente",
      status: project.stages.environment.status,
    },
    {
      id: "conversion",
      label: "Conversão",
      status: project.stages.conversion.status,
    },
    {
      id: "implementation",
      label: "Implantação",
      status: project.stages.implementation.status,
    },
    { id: "post", label: "Pós", status: project.stages.post.status },
  ];

  return (
    <Card
      className="w-full hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-row items-center p-4 gap-6 h-28 relative overflow-hidden group bg-card/50 backdrop-blur-sm"
      onClick={() => onClick(project)}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300",
          getHealthColor(project.healthScore),
          "group-hover:w-2"
        )}
      />

      {/* Selection Checkbox */}
      {onSelect && (
        <div className="mr-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={selected} 
            onCheckedChange={(checked) => onSelect(checked as boolean)} 
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
      )}

      {/* 1. Info Principal */}
      <div className="flex flex-col justify-center min-w-[220px] max-w-[280px] space-y-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-3 w-3 rounded-full shrink-0 shadow-sm ring-2 ring-background",
              getHealthColor(project.healthScore)
            )}
            title={`Saúde: ${
              project.healthScore === "ok"
                ? "OK"
                : project.healthScore === "warning"
                ? "Atenção"
                : "Crítico"
            }`}
          />
          <h3
            className="font-bold text-lg leading-none truncate tracking-tight text-foreground/90"
            title={project.clientName}
          >
            {project.clientName}
          </h3>
          {project.healthScore === "warning" && (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0.5 h-5 font-semibold"
            >
              Atenção
            </Badge>
          )}
          {project.healthScore === "critical" && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-5 font-semibold shadow-sm">
              Crítico
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
           <Badge variant="outline" className="font-medium bg-muted/50 text-muted-foreground border-border/50">
             {project.systemType}
           </Badge>
           <span className="font-mono text-xs opacity-70">#{project.ticketNumber}</span>
        </div>
        
        <div className="flex items-center gap-3 mt-1">
           {/* Follow Up Indicator */}
           {project.nextFollowUpDate && (
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-muted/30 border border-border/50",
              isFollowUpOverdue ? "text-destructive bg-destructive/5 border-destructive/20 font-semibold" : "text-muted-foreground"
            )}>
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(project.nextFollowUpDate), "dd/MM", { locale: ptBR })}
              </span>
              {isFollowUpOverdue && <span>!</span>}
            </div>
          )}

          {/* Project Leader */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground" title={`Líder: ${project.projectLeader}`}>
            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary ring-1 ring-primary/20">
              {project.projectLeader.substring(0, 2).toUpperCase()}
            </div>
            <span className="truncate max-w-[100px] font-medium">{project.projectLeader}</span>
          </div>
        </div>
      </div>

      {/* 2. Pipeline Visual (Modernizado - Estático) */}
      <div className="flex-1 flex flex-col justify-center px-6 border-l border-r border-border/40 h-full bg-gradient-to-r from-transparent via-muted/5 to-transparent">
        <div className="flex items-center justify-between gap-2 relative w-full max-w-2xl mx-auto">
          {/* Linha de conexão (fundo) */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-muted-foreground/10 -z-10 transform -translate-y-1/2 rounded-full" />

          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex flex-col items-center gap-2 z-0 group/stage relative cursor-help"
            >
              <div
                className={cn(
                  "h-3.5 w-3.5 rounded-full ring-4 ring-background shadow-sm",
                  getStageColor(stage.status)
                )}
              />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                stage.status === 'done' ? "text-emerald-600/70 dark:text-emerald-400/70" :
                stage.status === 'in-progress' ? "text-primary" :
                "text-muted-foreground/50"
              )}>
                {stage.label}
              </span>
              
              {/* Hover Tooltip */}
              <div className="absolute bottom-full mb-3 hidden group-hover/stage:block z-50 min-w-[120px] bg-popover text-popover-foreground text-xs rounded-lg border shadow-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                <p className="font-bold mb-1 text-sm">{stage.label}</p>
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", getStageColor(stage.status))} />
                  <p className="capitalize text-muted-foreground">
                    {stage.status === 'done' ? 'Concluído' : 
                     stage.status === 'in-progress' ? 'Em Andamento' : 
                     stage.status === 'blocked' ? 'Bloqueado' :
                     stage.status === 'waiting_adjustment' ? 'Em Adequação' : 'Pendente'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Metricas & Ações */}
      <div className="flex items-center gap-6 min-w-[160px] justify-end pl-2">
        {/* UAT (Última Atualização) */}
        <div className="flex flex-col items-end min-w-[90px]">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60 mb-0.5">
            Atualizado
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/50">
            <Clock className="h-3 w-3 text-primary/70" />
            <span>
              {format(new Date(project.lastUpdatedAt), "dd MMM HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>
        </div>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAction("delete", project);
              }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
