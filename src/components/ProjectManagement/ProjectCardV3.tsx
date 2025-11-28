import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectCardV3Props {
  project: ProjectV2;
  onClick: (project: ProjectV2) => void;
  onAction: (action: string, project: ProjectV2) => void;
}

export function ProjectCardV3({ project, onClick, onAction }: ProjectCardV3Props) {
  const isFollowUpOverdue = project.nextFollowUpDate && new Date(project.nextFollowUpDate) < new Date();
  
  const getHealthColor = (score: string) => {
    switch (score) {
      case "ok": return "bg-emerald-500";
      case "warning": return "bg-amber-500";
      case "critical": return "bg-rose-500";
      default: return "bg-slate-500";
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case "done": return "bg-emerald-500";
      case "in-progress": return "bg-blue-500";
      case "blocked": return "bg-amber-500";
      default: return "bg-slate-200 dark:bg-slate-700";
    }
  };

  const stages = [
    { id: 'infra', label: 'Infra', status: project.stages.infra.status },
    { id: 'adherence', label: 'Aderência', status: project.stages.adherence.status },
    { id: 'environment', label: 'Ambiente', status: project.stages.environment.status },
    { id: 'conversion', label: 'Conversão', status: project.stages.conversion.status },
    { id: 'implementation', label: 'Implantação', status: project.stages.implementation.status },
    { id: 'post', label: 'Pós', status: project.stages.post.status },
  ];

  return (
    <Card 
      className="w-full hover:shadow-md transition-all cursor-pointer border-l-4 flex flex-row items-center p-3 gap-4 h-24"
      style={{ borderLeftColor: getHealthColor(project.healthScore).replace('bg-', 'var(--') }}
      onClick={() => onClick(project)}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-md", getHealthColor(project.healthScore))} />
      
      {/* 1. Info Principal */}
      <div className="flex flex-col justify-center min-w-[200px] max-w-[250px]">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-base leading-none truncate" title={project.clientName}>{project.clientName}</h3>
          {project.healthScore === 'warning' && <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] px-1 py-0 h-4">Atenção</Badge>}
          {project.healthScore === 'critical' && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Crítico</Badge>}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="font-medium">{project.systemType}</span>
          <span>•</span>
          <span>#{project.ticketNumber}</span>
        </p>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
           <Clock className="h-3 w-3" />
           <span>{format(new Date(project.lastUpdatedAt), "dd/MM HH:mm", { locale: ptBR })}</span>
        </div>
      </div>

      {/* 2. Pipeline Visual (Expandido) */}
      <div className="flex-1 flex flex-col justify-center px-4 border-l border-r border-border/50 h-full">
        <div className="flex items-center justify-between gap-2 relative">
          {/* Linha de conexão (fundo) */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800 -z-10 transform -translate-y-1/2" />
          
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col items-center gap-1.5 z-0 bg-background px-2">
              <div 
                className={cn(
                  "h-5 w-5 rounded-full ring-4 ring-background transition-all shadow-sm", 
                  getStageColor(stage.status)
                )} 
                title={`${stage.label}: ${stage.status === 'todo' ? 'To-Do' : stage.status}`}
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight whitespace-nowrap">
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Metricas & Ações */}
      <div className="flex items-center gap-6 min-w-[150px] justify-end">
        {/* UAT (Última Atualização) */}
        <div className="flex flex-col items-end min-w-[80px]">
           <span className="text-[12px] text-muted-foreground uppercase tracking-wider font-semibold">UAT</span>
           <div className="flex items-center gap-1 text-xs font-bold text-foreground">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(project.lastUpdatedAt), "dd/MM HH:mm", { locale: ptBR })}</span>
           </div>
        </div>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction('duplicate', project)}>Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('archive', project)}>Arquivar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('delete', project)} className="text-red-600">Deletar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
