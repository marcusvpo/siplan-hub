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

interface WorkloadChartProps {
  projects: ProjectV2[];
}

export const WorkloadChart = ({ projects }: WorkloadChartProps) => {
  // Contar projetos por líder
  const leaderWorkload: Record<string, number> = {};

  projects.forEach((project) => {
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
      <CardContent className="p-4 h-[calc(100%-40px)]">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                className="text-[11px] font-bold"
                tick={{ fill: "hsl(var(--foreground))" }}
                width={120}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
