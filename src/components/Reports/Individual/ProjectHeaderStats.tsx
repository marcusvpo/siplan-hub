import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  User,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectHeaderStatsProps {
  project: ProjectV2;
}

export function ProjectHeaderStats({ project }: ProjectHeaderStatsProps) {
  const getHealthColor = (score: string) => {
    if (score === "critical") return "text-red-500";
    if (score === "warning") return "text-amber-500";
    return "text-green-500";
  };

  const currentStage = Object.entries(project.stages).find(
    ([_, stage]) => stage.status === "in-progress"
  )?.[0];

  const phase1End = project.stages.implementation.phase1.endDate;
  const isDone = project.globalStatus === "done";

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="relative overflow-hidden group hover:shadow-md transition-all border-primary/5 bg-card/40 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
            Saúde do Projeto
          </CardTitle>
          <Activity
            className={`h-4 w-4 ${getHealthColor(project.healthScore)} animate-pulse`}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black capitalize tracking-tight">
            {project.healthScore === 'ok' ? 'Estável' : project.healthScore === 'warning' ? 'Atenção' : 'Crítico'}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase mt-1">
            {isDone ? "Projeto Concluído" : "Status de Risco"}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:shadow-md transition-all border-primary/5 bg-card/40 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Etapa Atual</CardTitle>
          <div className="h-4 w-4 flex items-center justify-center">
            <div className="animate-ping absolute h-2 w-2 rounded-full bg-blue-500 opacity-20" />
            <div className="relative h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black capitalize truncate tracking-tight">
            {isDone ? "Finalizado" : currentStage || "Em Espera"}
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-2 tracking-tighter bg-primary/5 border-primary/10">
              {project.systemType}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:shadow-md transition-all border-primary/5 bg-card/40 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
            Última Atualização
          </CardTitle>
          <CalendarClock className="h-4 w-4 text-muted-foreground/50" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tight">
            {project.lastUpdatedAt
              ? format(new Date(project.lastUpdatedAt), "dd/MM/yy", {
                  locale: ptBR,
                })
              : "-"}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase mt-1 line-clamp-1">
            {project.lastUpdatedBy
              ? `Por: ${project.lastUpdatedBy}`
              : "Automatizado"}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:shadow-md transition-all border-primary/5 bg-card/40 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
            Entrega Estimada
          </CardTitle>
          {phase1End ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tight">
            {phase1End
              ? format(phase1End, "dd/MM/yy", { locale: ptBR })
              : "--/--"}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase mt-1 italic">Expectativa Fase 1</p>
        </CardContent>
      </Card>
    </div>
  );
}
