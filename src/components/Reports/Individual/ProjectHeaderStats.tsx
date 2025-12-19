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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Saúde do Projeto
          </CardTitle>
          <Activity
            className={`h-4 w-4 ${getHealthColor(project.healthScore)}`}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">
            {project.healthScore}
          </div>
          <p className="text-xs text-muted-foreground">
            {isDone ? "Projeto Concluído" : "Status Atual"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Etapa Atual</CardTitle>
          <div className="h-4 w-4 text-muted-foreground">
            <div className="animate-pulse w-2 h-2 rounded-full bg-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize truncate">
            {isDone ? "Finalizado" : currentStage || "Em Espera"}
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{project.systemType}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            UAT (Última Atualização)
          </CardTitle>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {project.lastUpdatedAt
              ? format(new Date(project.lastUpdatedAt), "dd/MM/yy", {
                  locale: ptBR,
                })
              : "-"}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {project.lastUpdatedBy
              ? `Por: ${project.lastUpdatedBy}`
              : "Sistema"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Conclusão (Fase 1)
          </CardTitle>
          {phase1End ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {phase1End
              ? format(phase1End, "dd/MM/yy", { locale: ptBR })
              : "--/--"}
          </div>
          <p className="text-xs text-muted-foreground">Data Final da Fase 1</p>
        </CardContent>
      </Card>
    </div>
  );
}
