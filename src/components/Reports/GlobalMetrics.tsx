import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

interface GlobalMetricsProps {
  projects: ProjectV2[];
}

export function GlobalMetrics({ projects }: GlobalMetricsProps) {
  const totalProjects = projects.length;
  const completedProjects = projects.filter(
    (p) => p.globalStatus === "done"
  ).length;
  const completionRate =
    totalProjects > 0
      ? Math.round((completedProjects / totalProjects) * 100)
      : 0;

  // Calculate average time for completed projects
  // STRICT RULE: Use Implementation Phase 1 End Date as completion
  const completedProjectsList = projects.filter((p) => {
    const implEndDate = p.stages.implementation.phase1?.endDate;
    return p.globalStatus === "done" && p.startDateActual && implEndDate;
  });

  const totalDuration = completedProjectsList.reduce((acc, p) => {
    const start = new Date(p.startDateActual!);
    const end = new Date(p.stages.implementation.phase1.endDate!);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return acc + diffDays;
  }, 0);
  const averageTime =
    completedProjectsList.length > 0
      ? Math.round(totalDuration / completedProjectsList.length)
      : 0;

  // Identify bottleneck (stage with highest average duration across all projects)
  const stages = [
    "infra",
    "adherence",
    "environment",
    "conversion",
    "implementation",
    "post",
  ] as const;
  let maxAvgDuration = 0;
  let bottleneckStage = "Nenhum";

  stages.forEach((stageKey) => {
    const projectsWithStageDates = projects.filter((p) => {
      const stage = p.stages[stageKey];
      return stage.startDate && stage.endDate;
    });

    if (projectsWithStageDates.length > 0) {
      const totalStageDuration = projectsWithStageDates.reduce((acc, p) => {
        const stage = p.stages[stageKey];
        const start = new Date(stage.startDate!);
        const end = new Date(stage.endDate!);
        const diffDays = Math.ceil(
          Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        return acc + diffDays;
      }, 0);
      const avgStageDuration =
        totalStageDuration / projectsWithStageDates.length;

      if (avgStageDuration > maxAvgDuration) {
        maxAvgDuration = avgStageDuration;
        bottleneckStage = stageKey.charAt(0).toUpperCase() + stageKey.slice(1);
        // Translate stage names
        if (stageKey === "adherence") bottleneckStage = "Aderência";
        if (stageKey === "environment") bottleneckStage = "Ambiente";
        if (stageKey === "conversion") bottleneckStage = "Conversão";
        if (stageKey === "implementation") bottleneckStage = "Implantação";
        if (stageKey === "post") bottleneckStage = "Pós-Implantação";
      }
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tempo Médio Total
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageTime} dias</div>
          <p className="text-xs text-muted-foreground">
            Em projetos concluídos
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Taxa de Conclusão
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">
            {completedProjects} de {totalProjects} projetos
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {projects.filter((p) => p.globalStatus === "in-progress").length}
          </div>
          <p className="text-xs text-muted-foreground">
            {projects.filter((p) => p.globalStatus === "blocked").length}{" "}
            bloqueados
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maior Gargalo</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {bottleneckStage}
          </div>
          <p className="text-xs text-muted-foreground">
            Média de {Math.round(maxAvgDuration)} dias
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
