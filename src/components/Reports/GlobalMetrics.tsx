import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 border-primary/10 hover:border-primary/30 hover:shadow-xl bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-150 transition-transform duration-500">
          <Clock className="h-12 w-12 text-primary" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
            Tempo Médio Total
          </CardTitle>
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-[0_0_15px_-5px_rgba(var(--primary),0.4)]">
            <Clock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight mb-1">{averageTime} dias</div>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
            Média de projetos concluídos
          </p>
          <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[70%] rounded-full animate-in slide-in-from-left duration-1000" />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 border-emerald-500/10 hover:border-emerald-500/30 hover:shadow-xl bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-150 transition-transform duration-500">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
            Taxa de Conclusão
          </CardTitle>
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-[0_0_15px_-5px_rgba(16,185,129,0.4)]">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight text-emerald-600 mb-1">{completionRate}%</div>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
            {completedProjects} de {totalProjects} projetos entregues
          </p>
          <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full animate-in slide-in-from-left duration-1000" 
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 border-blue-500/10 hover:border-blue-500/30 hover:shadow-xl bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-150 transition-transform duration-500">
          <TrendingUp className="h-12 w-12 text-blue-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
            Fila de Produção
          </CardTitle>
          <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)]">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight text-blue-600 mb-1">
            {projects.filter((p) => p.globalStatus === "in-progress").length}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
            {projects.filter((p) => p.globalStatus === "blocked").length}{" "}
            bloqueados aguardando
          </p>
          <div className="mt-4 flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                   "h-1.5 flex-1 rounded-full",
                   i < 8 ? "bg-blue-500" : "bg-muted"
                )} 
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 border-destructive/10 hover:border-destructive/30 hover:shadow-xl bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-150 transition-transform duration-500">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
            Maior Gargalo
          </CardTitle>
          <div className="p-2 bg-destructive/10 text-destructive rounded-lg group-hover:bg-destructive group-hover:text-white transition-colors shadow-[0_0_15px_-5px_rgba(239,68,68,0.4)]">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tight text-destructive mb-1">
            {bottleneckStage}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
            Retenção média de {Math.round(maxAvgDuration)} dias
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-3 bg-destructive/10 rounded-full border border-destructive/20 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
            </div>
            <span className="text-[10px] font-black text-destructive italic">CRÍTICO</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
