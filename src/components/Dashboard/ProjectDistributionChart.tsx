import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { ProjectV2 } from "@/types/ProjectV2";

interface ProjectDistributionChartProps {
  projects: ProjectV2[];
}

export const ProjectDistributionChart = ({
  projects,
}: ProjectDistributionChartProps) => {
  // Contar projetos por etapa atual
  const stageCount = {
    infra: 0,
    adherence: 0,
    environment: 0,
    conversion: 0,
    implementation: 0,
    post: 0,
  };

  projects.forEach((project) => {
    const stages = Object.entries(project.stages);
    const currentStage =
      stages.find(([_, stage]) => stage.status === "in-progress")?.[0] ||
      "infra";
    if (currentStage in stageCount) {
      stageCount[currentStage as keyof typeof stageCount]++;
    }
  });

  const data = [
    {
      name: "Infraestrutura",
      value: stageCount.infra,
      fill: "hsl(var(--chart-1))",
    },
    {
      name: "Aderência",
      value: stageCount.adherence,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: "Conversão",
      value: stageCount.conversion,
      fill: "hsl(var(--chart-3))",
    },
    {
      name: "Ambiente",
      value: stageCount.environment,
      fill: "hsl(var(--chart-4))",
    },
    {
      name: "Implantação",
      value: stageCount.implementation,
      fill: "hsl(var(--chart-5))",
    },
    {
      name: "Pós-Implantação",
      value: stageCount.post,
      fill: "hsl(var(--chart-6))",
    },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    infra: { label: "Infraestrutura", color: "hsl(var(--chart-1))" },
    adherence: { label: "Aderência", color: "hsl(var(--chart-2))" },
    conversion: { label: "Conversão", color: "hsl(var(--chart-3))" },
    environment: { label: "Ambiente", color: "hsl(var(--chart-4))" },
    implementation: { label: "Implantação", color: "hsl(var(--chart-5))" },
    post: { label: "Pós-Implantação", color: "hsl(var(--chart-6))" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[300px] min-h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
