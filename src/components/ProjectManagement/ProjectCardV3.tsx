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
      className="w-full hover:shadow-md transition-all cursor-pointer flex flex-row items-center p-3 gap-4 h-24 relative overflow-hidden"
      onClick={() => onClick(project)}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-md",
          getHealthColor(project.healthScore)
        )}
      />

      {/* Selection Checkbox */}
      {onSelect && (
        <div className="mr-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={selected} 
            onCheckedChange={(checked) => onSelect(checked as boolean)} 
          />
        </div>
      )}

      {/* 1. Info Principal */}
      <div className="flex flex-col justify-center min-w-[200px] max-w-[250px]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0",
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
            className="font-bold text-base leading-none truncate"
            title={project.clientName}
          >
            {project.clientName}
          </h3>
          {project.healthScore === "warning" && (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 text-[10px] px-1 py-0 h-4"
            >
              Atenção
            </Badge>
          )}
          {project.healthScore === "critical" && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
              Crítico
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="font-medium">{project.systemType}</span>
          <span>•</span>
          <span>#{project.ticketNumber}</span>
        </p>
        
        <div className="flex flex-col gap-0.5 mt-1">
           {/* Follow Up Indicator */}
           {project.nextFollowUpDate && (
            <div className={cn(
              "flex items-center gap-1 text-[10px]",
              isFollowUpOverdue ? "text-destructive font-bold" : "text-muted-foreground"
            )}>
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(project.nextFollowUpDate), "dd/MM", { locale: ptBR })}
              </span>
              {isFollowUpOverdue && <span>(Vencido)</span>}
            </div>
          )}

          {/* Project Leader */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`Líder: ${project.projectLeader}`}>
            <div className="h-3.5 w-3.5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
              {project.projectLeader.substring(0, 2).toUpperCase()}
            </div>
            <span className="truncate max-w-[100px]">{project.projectLeader}</span>
          </div>
        </div>
      </div>

      {/* 2. Pipeline Visual (Expandido) */}
      <div className="flex-1 flex flex-col justify-center px-4 border-l border-r border-border/50 h-full">
        <div className="flex items-center justify-between gap-2 relative">
          {/* Linha de conexão (fundo) */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800 -z-10 transform -translate-y-1/2" />

          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex flex-col items-center gap-1.5 z-0 bg-background px-2 group relative"
            >
              <div
                className={cn(
                  "h-5 w-5 rounded-full ring-4 ring-background transition-all shadow-sm cursor-help",
                  getStageColor(stage.status)
                )}
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight whitespace-nowrap">
                {stage.label}
              </span>
              
              {/* Hover Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 bg-popover text-popover-foreground text-xs rounded-md border shadow-md p-2">
                <p className="font-bold mb-1">{stage.label}</p>
                <p>Status: {stage.status === 'done' ? 'Concluído' : stage.status === 'in-progress' ? 'Em Andamento' : 'Pendente'}</p>
                {/* We would need to pass responsible data here if available in the stages array mapping */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Metricas & Ações */}
      <div className="flex items-center gap-6 min-w-[150px] justify-end">
        {/* UAT (Última Atualização) */}
        <div className="flex flex-col items-end min-w-[80px]">
          <span className="text-[12px] text-muted-foreground uppercase tracking-wider font-semibold">
            UAT
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-foreground">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>
              {format(new Date(project.lastUpdatedAt), "dd/MM HH:mm", {
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
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction("duplicate", project)}>
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("archive", project)}>
              Arquivar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAction("delete", project)}
              className="text-red-600"
            >
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
