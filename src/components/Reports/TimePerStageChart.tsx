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
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Média: <span className="font-medium">{data.days} dias</span>
          </p>
          <p className="text-sm text-gray-500">Projetos: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Tempo Médio por Etapa (Dias)</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}d`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "transparent" }}
              />
              <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.status)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Apenas etapas com datas de início e término completas são
          contabilizadas
        </p>
      </CardContent>
    </Card>
  );
}
