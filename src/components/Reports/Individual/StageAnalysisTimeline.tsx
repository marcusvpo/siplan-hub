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
      // Dynamic access to stages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      start = (p.stages as any)[stageKey]?.startDate;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      end = (p.stages as any)[stageKey]?.endDate;
    }

    if (start && end) {
      return Math.ceil(
        Math.abs(new Date(end).getTime() - new Date(start).getTime()) /
          (1000 * 60 * 60 * 24)
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
    payload?: TooltipPayload[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const pVal = payload.find((p) => p.name === "Project")?.value || 0;
      const bVal = payload.find((p) => p.name === "Benchmark")?.value || 0;
      const dev = pVal - bVal;

      return (
        <div className="bg-white p-3 border rounded shadow-lg text-sm">
          <p className="font-bold mb-2">{label}</p>
          <p className="text-blue-600">Este Projeto: {pVal} dias</p>
          <p className="text-gray-500">Média Geral: {bVal} dias</p>
          <div
            className={`mt-2 font-medium ${
              dev > 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            {dev > 0
              ? `+${dev} dias acima da média`
              : `${Math.abs(dev)} dias abaixo da média`}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Comparativo de Duração por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={<CustomTooltip />}
              />
              <Bar
                dataKey="Benchmark"
                fill="#e5e7eb"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
              <Bar
                dataKey="Project"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Comparação da duração (em dias) deste projeto vs a média geral de
          todos os projetos.
        </p>
      </CardContent>
    </Card>
  );
}
