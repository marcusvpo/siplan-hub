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
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, Activity } from "lucide-react";

interface TimePerStageChartProps {
  projects: ProjectV2[];
}

// Helper function to get valid dates for each stage
function getStartAndEndDates(
  project: ProjectV2,
  stageKey:
    | "infra"
    | "adherence"
    | "environment"
    | "conversion"
    | "implementation"
    | "post"
): { startDate: Date | null; endDate: Date | null } {
  const stage = project.stages[stageKey];

  if (stageKey === "conversion") {
    // For Conversion, use ONLY sentAt and finishedAt (not homologation dates)
    const convStage = project.stages.conversion;
    const start = convStage.sentAt;
    const end = convStage.finishedAt;
    return {
      startDate: start ? new Date(start) : null,
      endDate: end ? new Date(end) : null,
    };
  }

  if (stageKey === "implementation") {
    // For Implementation, use ONLY phase1 dates (Início and Término from Fase 1)
    const implStage = project.stages.implementation;
    const start = implStage.phase1?.startDate;
    const end = implStage.phase1?.endDate;
    return {
      startDate: start ? new Date(start) : null,
      endDate: end ? new Date(end) : null,
    };
  }

  // Default for infra, adherence, environment, post: use startDate and endDate
  // These are displayed as "Enviado em" / "Finalizado em" in the UI
  return {
    startDate: stage.startDate ? new Date(stage.startDate) : null,
    endDate: stage.endDate ? new Date(stage.endDate) : null,
  };
}

export function TimePerStageChart({ projects }: TimePerStageChartProps) {
  const stages = [
    { key: "infra" as const, label: "Infra" },
    { key: "adherence" as const, label: "Aderência" },
    { key: "environment" as const, label: "Ambiente" },
    { key: "conversion" as const, label: "Conversão" },
  ];

  const data = stages.map((stage) => {
    // Filter projects that have BOTH start and end dates for this stage
    const projectsWithCompleteDates = projects.filter((p) => {
      const { startDate, endDate } = getStartAndEndDates(p, stage.key);
      // Only include if BOTH dates are present
      return startDate !== null && endDate !== null;
    });

    let avgDays = 0;
    const projectCount = projectsWithCompleteDates.length;

    if (projectCount > 0) {
      const totalDays = projectsWithCompleteDates.reduce((acc, p) => {
        const { startDate, endDate } = getStartAndEndDates(p, stage.key);
        if (startDate && endDate) {
          // Calculate difference in days (use Math.abs to handle any date order)
          const diffDays = Math.ceil(
            Math.abs(endDate.getTime() - startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return acc + diffDays;
        }
        return acc;
      }, 0);
      avgDays = Math.round(totalDays / projectCount);
    }

    // Define thresholds for status
    let status = "ok";
    if (avgDays > 15) status = "critical";
    else if (avgDays > 10) status = "warning";

    return {
      name: stage.label,
      days: avgDays,
      count: projectCount, // Number of projects used in calculation
      status: status,
    };
  });

  const getBarColor = (status: string) => {
    if (status === "critical") return "#ef4444"; // red-500
    if (status === "warning") return "#f59e0b"; // amber-500
    return "#3b82f6"; // blue-500
  };

  // Custom tooltip to show more info
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { name: string; days: number; count: number; status: string };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
          <p className="font-black text-[10px] uppercase tracking-widest text-primary mb-2 line-clamp-1 border-b border-primary/10 pb-1">{data.name}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
               <span className="text-[10px] font-bold text-muted-foreground uppercase">Média Retenção</span>
               <span className="text-sm font-black text-foreground">{data.days} dias</span>
            </div>
            <div className="flex items-center justify-between gap-8">
               <span className="text-[10px] font-bold text-muted-foreground uppercase">Amostra</span>
               <span className="text-sm font-black text-foreground">{data.count} proj.</span>
            </div>
          </div>
          <div className={cn(
            "mt-3 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter text-center",
            data.status === "critical" ? "bg-red-500/20 text-red-500" : 
            data.status === "warning" ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500"
          )}>
            Status: {data.status === "critical" ? "CRÍTICO" : data.status === "warning" ? "ATENÇÃO" : "ESTÁVEL"}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-1 border-primary/5 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
           <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Performance por Etapa</CardTitle>
           <h4 className="text-sm font-bold">Tempo Médio de Retenção (Dias)</h4>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 pr-6 pl-2">
        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradientDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="barGradientWarning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="barGradientCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={10}
                fontWeight={700}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#888888"
                fontSize={10}
                fontWeight={700}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}d`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0, 0, 0, 0.04)", radius: 8 }}
              />
              <Bar dataKey="days" radius={[6, 6, 0, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.status === "critical" ? "url(#barGradientCritical)" : 
                      entry.status === "warning" ? "url(#barGradientWarning)" : "url(#barGradientDone)"
                    }
                    className="hover:opacity-80 transition-opacity cursor-pointer shadow-xl"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-8 p-3 bg-muted/30 rounded-xl border border-primary/5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500/80" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Atenção</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Gargalo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
