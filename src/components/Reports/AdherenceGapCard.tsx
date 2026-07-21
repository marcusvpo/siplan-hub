import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileWarning } from "lucide-react";
import { hasAdherenceGap } from "@/utils/adherence-helpers";

interface AdherenceGapCardProps {
  projects: ProjectV2[];
}

export function AdherenceGapCard({ projects }: AdherenceGapCardProps) {
  const activeProjects = projects.filter(
    (p) => p.systemType !== "Modelos TN" && p.globalStatus !== "done" && p.globalStatus !== "archived" && p.globalStatus !== "canceled"
  );
  const projectsWithGap = activeProjects.filter(hasAdherenceGap);
  const gapCount = projectsWithGap.length;
  const total = activeProjects.length;
  const gapPercentage = total > 0 ? Math.round((gapCount / total) * 100) : 0;

  return (
    <Card className="hover:shadow-md transition-all border border-border bg-card/50 backdrop-blur-sm group">
      <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 text-muted-foreground/70">
          <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-md">
            <FileWarning className="h-3.5 w-3.5" />
          </div>
          Projetos com GAP
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 pt-0">
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-base font-black text-amber-600">{gapCount}</span>
          <span className="text-[9px] text-muted-foreground/50">({gapPercentage}%)</span>
        </div>
        <p className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-tighter">
          projetos com GAP de aderência
        </p>
        {gapCount > 0 && (
          <div className="mt-2.5 space-y-1">
            <p className="text-[9px] font-black uppercase text-muted-foreground/50">
              Clientes afetados:
            </p>
            <div className="flex flex-wrap gap-1">
              {projectsWithGap.slice(0, 5).map((p) => (
                <span
                  key={p.id}
                  className="text-[9px] uppercase font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40 px-2 py-0.5 rounded"
                >
                  {p.clientName}
                </span>
              ))}
              {gapCount > 5 && (
                <span className="text-[9px] font-bold text-muted-foreground uppercase self-center ml-1">
                  +{gapCount - 5}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
