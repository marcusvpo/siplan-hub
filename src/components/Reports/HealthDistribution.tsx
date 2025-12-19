import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

interface HealthDistributionProps {
  projects: ProjectV2[];
}

export function HealthDistribution({ projects }: HealthDistributionProps) {
  const ok = projects.filter((p) => p.healthScore === "ok").length;
  const warning = projects.filter((p) => p.healthScore === "warning").length;
  const critical = projects.filter(
    (p) => p.healthScore === "critical" && p.globalStatus !== "blocked"
  ).length;
  const total = projects.length;

  const getPercentage = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="h-4 w-4 text-muted-foreground" />
          Saúde dos Projetos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* OK */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Em Dia (OK)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-600">{ok}</span>
              <span className="text-xs text-muted-foreground">
                ({getPercentage(ok)}%)
              </span>
            </div>
          </div>

          {/* Atenção */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Atenção</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-600">
                {warning}
              </span>
              <span className="text-xs text-muted-foreground">
                ({getPercentage(warning)}%)
              </span>
            </div>
          </div>

          {/* Crítico */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium">Crítico</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-rose-600">
                {critical}
              </span>
              <span className="text-xs text-muted-foreground">
                ({getPercentage(critical)}%)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
