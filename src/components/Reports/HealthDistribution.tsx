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
    <Card className="hover:shadow-lg transition-all border-primary/5 bg-card/50 backdrop-blur-sm group text-foreground">
      <CardHeader className="pb-4">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 text-muted-foreground/70">
          <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-md">
            <Heart className="h-3.5 w-3.5 shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
          </div>
          Saúde dos Projetos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* OK */}
          <div className="space-y-2 group/item">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600/80">Estável (OK)</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600">{ok}</span>
                <span className="text-[10px] text-muted-foreground/50">({getPercentage(ok)}%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 group-hover/item:brightness-110" 
                style={{ width: `${getPercentage(ok)}%` }}
              />
            </div>
          </div>

          {/* Atenção */}
          <div className="space-y-2 group/item">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600/80">Atenção</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600">{warning}</span>
                <span className="text-[10px] text-muted-foreground/50">({getPercentage(warning)}%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-amber-500/10 rounded-full overflow-hidden border border-amber-500/5">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000 group-hover/item:brightness-110" 
                style={{ width: `${getPercentage(warning)}%` }}
              />
            </div>
          </div>

          {/* Crítico */}
          <div className="space-y-2 group/item">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-600/80">Crítico</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-600">{critical}</span>
                <span className="text-[10px] text-muted-foreground/50">({getPercentage(critical)}%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-rose-500/10 rounded-full overflow-hidden border border-rose-500/5">
              <div 
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-1000 group-hover/item:brightness-110 shadow-[0_0_15px_rgba(225,29,72,0.3)]" 
                style={{ width: `${getPercentage(critical)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
