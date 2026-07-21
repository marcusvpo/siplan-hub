import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ProjectV2 } from "@/types/ProjectV2";
import { ChartEmptyState } from "./ChartEmptyState";

interface WorkloadChartProps {
  projects: ProjectV2[];
}

export const WorkloadChart = ({ projects }: WorkloadChartProps) => {
  // Contar projetos por líder
  const leaderWorkload: Record<string, number> = {};

  projects.forEach((project) => {
    if (project.systemType === "Modelos TN" || project.globalStatus === "done" || project.globalStatus === "archived" || project.globalStatus === "canceled") {
      return;
    }
    const leader = project.projectLeader || "Sem Líder";
    leaderWorkload[leader] = (leaderWorkload[leader] || 0) + 1;
  });

  const data = Object.entries(leaderWorkload)
    .map(([name, value], index) => ({
      name,
      value,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }))
    .sort((a, b) => b.value - a.value);

  const chartConfig = Object.fromEntries(
    data.map((item, index) => [
      item.name,
      { label: item.name, color: `hsl(var(--chart-${(index % 5) + 1}))` },
    ])
  );

  return (
    <Card className="border-0 shadow-none bg-transparent h-full">
      <CardHeader className="py-2 px-4 border-b">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Projetos por Líder</CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-40px)]">
        {data.length === 0 ? (
          <ChartEmptyState
            className="h-full"
            message="Nenhum projeto atribuído"
            hint="A distribuição por líder aparece quando houver projetos."
          />
        ) : (
        <ChartContainer
          config={chartConfig}
          className="h-full w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ left: -20, right: 40, top: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                className="text-[10px] sm:text-[11px] font-black"
                tick={{ fill: "hsl(var(--foreground))" }}
                width={140}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
