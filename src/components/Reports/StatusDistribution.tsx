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
    <Card className="hover:shadow-lg transition-all border-primary/5 bg-card/50 backdrop-blur-sm group">
      <CardHeader className="pb-4">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 text-muted-foreground/70">
          <div className="p-1.5 bg-primary/5 rounded-md text-primary">
            <Activity className="h-3.5 w-3.5" />
          </div>
          Distribuição por Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Em andamento */}
          <div className="space-y-2 group/item">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <span className="text-emerald-600/80">Em andamento</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600">{inProgress}</span>
                <span className="text-[10px] text-muted-foreground/50">({getPercentage(inProgress)}%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/5">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 group-hover/item:brightness-110 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                style={{ width: `${getPercentage(inProgress)}%` }}
              />
            </div>
          </div>

          {/* Finalizado */}
          <div className="space-y-2 group/item">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <span className="text-blue-600/80">Finalizado</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-blue-600">{completed}</span>
                <span className="text-[10px] text-muted-foreground/50">({getPercentage(completed)}%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-blue-500/10 rounded-full overflow-hidden border border-blue-500/5">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 group-hover/item:brightness-110 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                style={{ width: `${getPercentage(completed)}%` }}
              />
            </div>
          </div>

          {/* Pausado */}
          <div className="space-y-2 group/item">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <span className="text-amber-600/80">Pausado/Bloqueado</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600">{paused}</span>
                <span className="text-[10px] text-muted-foreground/50">({getPercentage(paused)}%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-amber-500/10 rounded-full overflow-hidden border border-amber-500/5">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-1000 group-hover/item:brightness-110 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                style={{ width: `${getPercentage(paused)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
