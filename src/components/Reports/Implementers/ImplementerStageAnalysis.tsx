import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { StageTimeEntry } from "@/hooks/useImplementerReport";

interface ImplementerStageAnalysisProps {
  stageTimeAnalysis: StageTimeEntry[];
}

interface StageTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

export function ImplementerStageAnalysis({
  stageTimeAnalysis,
}: ImplementerStageAnalysisProps) {
  const data = stageTimeAnalysis.map((s) => ({
    name: s.label || s.stage,
    Implantador: s.avgDays,
    Benchmark: s.benchmarkDays,
    diferenca: s.avgDays - s.benchmarkDays,
  }));

  const CustomTooltip = ({ active, payload, label }: StageTooltipProps) => {
    if (active && payload && payload.length >= 2) {
      const imp = payload[0].value;
      const bench = payload[1].value;
      const diff = imp - bench;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg space-y-1">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary">Implantador: {imp.toFixed(1)} dias</p>
          <p className="text-sm text-muted-foreground">
            Benchmark: {bench.toFixed(1)} dias
          </p>
          <p
            className={`text-sm font-medium ${
              diff > 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            {diff > 0
              ? `+${diff.toFixed(1)} dias (Lento)`
              : `${diff.toFixed(1)} dias (Rápido)`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>Performance por Etapa</CardTitle>
        <CardDescription>Comparação com média geral</CardDescription>
      </CardHeader>
      <CardContent className="px-1 pb-4 sm:px-6 sm:pb-6">
        <div className="h-[330px] w-full min-w-0 sm:h-[380px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 20, right: 8, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                className="stroke-muted"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", opacity: 0.7 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", opacity: 0.7, fontSize: 12 }}
                width={72}
              />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.1)" }} content={<CustomTooltip />} />
              <Bar
                dataKey="Implantador"
                fill="hsl(346, 84%, 45%)"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="Benchmark"
                fill="hsl(215, 16%, 47%)"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Sem dados de etapas para análise
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}
