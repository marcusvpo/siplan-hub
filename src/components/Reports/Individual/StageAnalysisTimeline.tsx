import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { Activity, Zap, Sparkles } from "lucide-react";

interface StageAnalysisTimelineProps {
  project: ProjectV2;
  allProjects: ProjectV2[]; // To calculate benchmarks
}

export function StageAnalysisTimeline({
  project,
  allProjects,
}: StageAnalysisTimelineProps) {
  const STAGES = [
    "infra",
    "adherence",
    "environment",
    "conversion",
    "implementation",
  ];
  const STAGE_LABELS: Record<string, string> = {
    infra: "Infra",
    adherence: "Aderência",
    environment: "Ambiente",
    conversion: "Conversão",
    implementation: "Implantação",
  };

  // Helper to get duration in days of a stage for a project
  const getStageDuration = (p: ProjectV2, stageKey: string) => {
    let start: Date | undefined | null;
    let end: Date | undefined | null;

    if (stageKey === "implementation") {
      start = p.stages.implementation.phase1.startDate;
      end = p.stages.implementation.phase1.endDate;
    } else if (stageKey === "conversion") {
      start = p.stages.conversion.sentAt || p.stages.conversion.startDate;
      end = p.stages.conversion.finishedAt || p.stages.conversion.endDate;
    } else {
      // Type-safe dynamic access to stages
      type StageKey = keyof typeof p.stages;
      if (stageKey in p.stages) {
        const stage = p.stages[stageKey as StageKey];
        start = "startDate" in stage ? stage.startDate : undefined;
        end = "endDate" in stage ? stage.endDate : undefined;
      }
    }

    if (start && end) {
      return Math.ceil(
        Math.abs(new Date(end).getTime() - new Date(start).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }
    return 0;
  };

  const data = STAGES.map((stageKey) => {
    const projectDuration = getStageDuration(project, stageKey);

    // Calculate Benchmark (Average of all other projects)
    const otherProjects = allProjects.filter((p) => p.id !== project.id);
    const durations = otherProjects
      .map((p) => getStageDuration(p, stageKey))
      .filter((d) => d > 0);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return {
      name: STAGE_LABELS[stageKey],
      Project: projectDuration,
      Benchmark: avgDuration,
      deviation: projectDuration - avgDuration,
    };
  }).filter((item) => item.Project > 0 || item.Benchmark > 0);

  interface TooltipPayload {
    name: string;
    value: number;
    payload: {
      name: string;
      Project: number;
      Benchmark: number;
      deviation: number;
    };
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const pVal = payload.find((p) => p.dataKey === "Project")?.value || 0;
      const bVal = payload.find((p) => p.dataKey === "Benchmark")?.value || 0;
      const dev = pVal - bVal;

      return (
        <div className="bg-background/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-primary/20 animate-in fade-in zoom-in-95 duration-200 min-w-[200px]">
          <p className="font-black text-[10px] uppercase tracking-widest text-primary mb-3 border-b border-primary/10 pb-1">{label}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
               <span className="text-[10px] font-bold text-muted-foreground uppercase">Este Projeto</span>
               <span className="text-sm font-black text-blue-600">{pVal} dias</span>
            </div>
            <div className="flex items-center justify-between gap-4">
               <span className="text-[10px] font-bold text-muted-foreground uppercase">Média Geral</span>
               <span className="text-sm font-black text-muted-foreground/60">{bVal} dias</span>
            </div>
          </div>
          
          <div className={cn(
            "mt-4 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-center border",
            dev > 0 
              ? "bg-red-500/10 text-red-500 border-red-500/20" 
              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          )}>
            <div className="flex items-center justify-center gap-1.5 font-bold">
              {dev > 0 ? (
                <>
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  <span>+{dev} dias acima da média</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>{Math.abs(dev)} dias abaixo da média</span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-2 border-primary/5 bg-card/40 backdrop-blur-sm hover:shadow-lg transition-all overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Fluxo de Retenção</CardTitle>
          <h3 className="text-sm font-bold">Comparativo de Duração por Etapa</h3>
        </div>
        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 pr-6">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
              barGap={8}
            >
              <defs>
                <linearGradient id="projectBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8}/>
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodOpacity="0.2"/>
                </filter>
              </defs>
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={90}
                tick={{ fontSize: 10, fontWeight: 700, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0, 0, 0, 0.04)", radius: 10 }}
                content={<CustomTooltip />}
              />
              <Bar
                dataKey="Benchmark"
                fill="currentColor"
                className="text-muted-foreground/10"
                radius={[0, 10, 10, 0]}
                barSize={12}
              />
              <Bar
                dataKey="Project"
                fill="url(#projectBarGradient)"
                radius={[0, 10, 10, 0]}
                barSize={12}
                filter="url(#shadow)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-6 p-3 bg-muted/20 rounded-xl border border-primary/5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-6 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">Este Projeto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-6 rounded-full bg-muted/30" />
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">Média (Benchmark)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
