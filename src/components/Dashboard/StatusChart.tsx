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
} from "recharts";
import { ProjectV2 } from "@/types/ProjectV2";

interface StatusChartProps {
  projects: ProjectV2[];
}

export const StatusChart = ({ projects }: StatusChartProps) => {
  const statusCount = {
    todo: 0,
    "in-progress": 0,
    done: 0,
    blocked: 0,
    archived: 0,
  };

  projects.forEach((project) => {
    if (project.globalStatus in statusCount) {
      statusCount[project.globalStatus]++;
    }
  });

  const data = [
    {
      name: "Não Iniciado",
      value: statusCount.todo,
      fill: "hsl(var(--chart-1))",
    },
    {
      name: "Em Andamento",
      value: statusCount["in-progress"],
      fill: "hsl(var(--chart-2))",
    },
    {
      name: "Finalizado",
      value: statusCount.done,
      fill: "hsl(var(--chart-3))",
    },
    {
      name: "Bloqueado",
      value: statusCount.blocked,
      fill: "hsl(var(--chart-4))",
    },
    {
      name: "Arquivado",
      value: statusCount.archived,
      fill: "hsl(var(--chart-5))",
    },
  ];

  const chartConfig = {
    todo: { label: "Não Iniciado", color: "hsl(var(--chart-1))" },
    "in-progress": { label: "Em Andamento", color: "hsl(var(--chart-2))" },
    done: { label: "Finalizado", color: "hsl(var(--chart-3))" },
    blocked: { label: "Bloqueado", color: "hsl(var(--chart-4))" },
    archived: { label: "Arquivado", color: "hsl(var(--chart-5))" },
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="py-2 px-4 border-b">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status Geral</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ChartContainer
          config={chartConfig}
          className="h-[180px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-[10px]"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-[10px]"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
