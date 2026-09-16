import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyDayProject, MyDayProjectTone } from "@/lib/my-day";
import { cn } from "@/lib/utils";

const TONES: Array<{
  key: MyDayProjectTone;
  label: string;
  color: string;
}> = [
  { key: "critical", label: "Críticos", color: "#f43f5e" },
  { key: "warning", label: "Atenção", color: "#f59e0b" },
  { key: "neutral", label: "Regulares", color: "#10b981" },
];

interface MyDayInsightsProps {
  projects: MyDayProject[];
  activeTone: MyDayProjectTone | null;
  activeStage: string | null;
  onToneFilter: (tone: MyDayProjectTone | null) => void;
  onStageFilter: (stage: string | null) => void;
  compact?: boolean;
}

export function MyDayInsights({
  projects,
  activeTone,
  activeStage,
  onToneFilter,
  onStageFilter,
  compact = true,
}: MyDayInsightsProps) {
  const toneData = useMemo(
    () =>
      TONES.map((tone) => ({
        ...tone,
        value: projects.filter((project) => project.tone === tone.key).length,
      })),
    [projects],
  );

  const stageData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const project of projects) {
      const stage = project.nextStage?.label ?? "Concluído";
      totals.set(stage, (totals.get(stage) ?? 0) + 1);
    }

    return [...totals.entries()]
      .map(([stage, value]) => ({
        stage,
        shortStage: stage.length > 12 ? `${stage.slice(0, 11)}…` : stage,
        value,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [projects]);

  return (
    <Card className="h-full min-w-0 overflow-hidden border-border/70 shadow-sm" data-testid="my-day-insights">
      <CardHeader className={cn("border-b bg-muted/15", compact ? "p-3" : "p-4")}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-primary" />
          Visão da carteira
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Clique nas legendas para filtrar os projetos.
        </p>
      </CardHeader>
      <CardContent className={cn("grid min-w-0 gap-3", compact ? "p-3" : "p-4", "xl:grid-cols-2")}>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Situação
          </p>
          <div className="h-36 min-w-0" aria-label="Gráfico de situação dos projetos">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={toneData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={56}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {toneData.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, "Projetos"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {toneData.map((item) => (
              <Button
                key={item.key}
                type="button"
                size="sm"
                variant={activeTone === item.key ? "secondary" : "ghost"}
                className="h-7 gap-1.5 px-2 text-[10px]"
                aria-pressed={activeTone === item.key}
                onClick={() => onToneFilter(activeTone === item.key ? null : item.key)}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label} ({item.value})
              </Button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Próxima etapa
          </p>
          <div className="h-36 min-w-0" aria-label="Gráfico de projetos por próxima etapa">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="shortStage"
                  width={78}
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Projetos"]}
                  labelFormatter={(_, payload) => payload[0]?.payload?.stage ?? "Etapa"}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {stageData.slice(0, 3).map((item) => (
              <Button
                key={item.stage}
                type="button"
                size="sm"
                variant={activeStage === item.stage ? "secondary" : "outline"}
                className="h-7 max-w-full px-2 text-[10px]"
                aria-pressed={activeStage === item.stage}
                title={item.stage}
                onClick={() => onStageFilter(activeStage === item.stage ? null : item.stage)}
              >
                <span className="truncate">{item.stage}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
