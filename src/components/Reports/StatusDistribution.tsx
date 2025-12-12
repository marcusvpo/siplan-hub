import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Pause, CheckCircle2, TrendingUp } from "lucide-react";

interface StatusDistributionProps {
  projects: ProjectV2[];
}

export function StatusDistribution({ projects }: StatusDistributionProps) {
  const inProgress = projects.filter(
    (p) => p.globalStatus === "in-progress"
  ).length;
  const completed = projects.filter((p) => p.globalStatus === "done").length;
  const paused = projects.filter((p) => p.globalStatus === "blocked").length;
  const total = projects.length;

  const getPercentage = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Distribuição por Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Em andamento */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium">Em andamento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {inProgress}
              </span>
              <span className="text-xs text-muted-foreground">
                ({getPercentage(inProgress)}%)
              </span>
            </div>
          </div>

          {/* Finalizado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Finalizado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">
                {completed}
              </span>
              <span className="text-xs text-muted-foreground">
                ({getPercentage(completed)}%)
              </span>
            </div>
          </div>

          {/* Pausado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-sm font-medium">Pausado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-600">
                {paused}
              </span>
              <span className="text-xs text-muted-foreground">
                ({getPercentage(paused)}%)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
