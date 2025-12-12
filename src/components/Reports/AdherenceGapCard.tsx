import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileWarning } from "lucide-react";

interface AdherenceGapCardProps {
  projects: ProjectV2[];
}

export function AdherenceGapCard({ projects }: AdherenceGapCardProps) {
  const projectsWithGap = projects.filter(
    (p) => p.stages.adherence.hasProductGap === true
  );
  const gapCount = projectsWithGap.length;
  const total = projects.length;
  const gapPercentage = total > 0 ? Math.round((gapCount / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Projetos com GAP</CardTitle>
        <FileWarning className="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-amber-600">{gapCount}</div>
        <p className="text-xs text-muted-foreground">
          {gapPercentage}% dos projetos têm GAP de aderência
        </p>
        {gapCount > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Clientes afetados:
            </p>
            <div className="flex flex-wrap gap-1">
              {projectsWithGap.slice(0, 5).map((p) => (
                <span
                  key={p.id}
                  className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
                >
                  {p.clientName}
                </span>
              ))}
              {gapCount > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{gapCount - 5} outros
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
