import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { StageRadarEntry } from "@/hooks/useImplementerReport";

interface ImplementerChartsProps {
  statusDistribution?: Record<string, number>;
  healthDistribution?: Record<string, number>;
  systemTypeDistribution?: Record<string, number>;
  implantationTypeDistribution?: Record<string, number>;
  projectsByMonth?: { month: string; count: number }[];
  stageRadarData?: StageRadarEntry[];
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}

const statusColors: Record<string, string> = {
  "in-progress": "#3b82f6",
  done: "#22c55e",
  blocked: "#ef4444",
  archived: "#6b7280",
};

const statusLabels: Record<string, string> = {
  "in-progress": "Em Andamento",
  done: "Finalizado",
  blocked: "Bloqueado",
  archived: "Arquivado",
};

const healthColors: Record<string, string> = {
  ok: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
};

const healthLabels: Record<string, string> = {
  ok: "Estável",
  warning: "Atenção",
  critical: "Crítico",
};

export function ImplementerCharts({
  statusDistribution = {},
  healthDistribution = {},
  systemTypeDistribution = {},
  projectsByMonth = [],
  stageRadarData = [],
}: ImplementerChartsProps) {
  const statusData = Object.entries(statusDistribution || {})
    .map(([key, value]) => ({
      name: statusLabels[key] || key,
      value,
      color: statusColors[key] || "#94a3b8",
    }))
    .filter((d) => d.value > 0);

  const healthData = Object.entries(healthDistribution || {})
    .map(([key, value]) => ({
      name: healthLabels[key] || key,
      value,
      color: healthColors[key] || "#94a3b8",
    }))
    .filter((d) => d.value > 0);

  const systemData = Object.entries(systemTypeDistribution || {})
    .map(([key, value]) => ({
      name: key,
      count: value,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const monthData = (projectsByMonth || []).map((d) => {
    const parts = d.month ? d.month.split("-") : ["2026", "01"];
    const year = parts[0];
    const month = parts[1] || "01";
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const label = date
      .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      .replace(" de ", "/");
    return {
      name: label.charAt(0).toUpperCase() + label.slice(1),
      count: d.count,
    };
  });

  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-popover-foreground text-xs font-semibold">
          <p className="font-bold text-foreground mb-1">{label || payload[0].name}</p>
          <p className="text-primary font-bold">
            {payload[0].value} {payload[0].value === 1 ? "projeto" : "projetos"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2" data-testid="implementer-charts">
      {/* Chart 1: Status Distribution */}
      <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
        <CardHeader className="py-3.5 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">
            Distribuição de Status dos Projetos
          </CardTitle>
          <CardDescription className="text-xs">
            Projetos sob liderança direta por estado global
          </CardDescription>
        </CardHeader>
        <CardContent className="px-1 pt-4 sm:px-6">
          <div className="h-[230px] min-h-[230px] w-full min-w-0 sm:h-[260px] sm:min-h-[260px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                Nenhum dado de status disponível
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Health Score Distribution */}
      <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
        <CardHeader className="py-3.5 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">
            Saúde Operacional dos Projetos
          </CardTitle>
          <CardDescription className="text-xs">
            Classificação por nível de atenção e risco
          </CardDescription>
        </CardHeader>
        <CardContent className="px-1 pt-4 sm:px-6">
          <div className="h-[230px] min-h-[230px] w-full min-w-0 sm:h-[260px] sm:min-h-[260px]">
            {healthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-health-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                Nenhum dado de saúde disponível
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart 3: Volume por Sistema */}
      <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
        <CardHeader className="py-3.5 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">
            Volume de Implantações por Sistema
          </CardTitle>
          <CardDescription className="text-xs">
            Distribuição entre Orion TN, Orion PRO, WebRI e outros
          </CardDescription>
        </CardHeader>
        <CardContent className="px-1 pt-4 sm:px-6">
          <div className="h-[230px] min-h-[230px] w-full min-w-0 sm:h-[260px] sm:min-h-[260px]">
            {systemData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={systemData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorSystem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(346, 84%, 45%)" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="hsl(346, 84%, 45%)" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", opacity: 0.8, fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", opacity: 0.8, fontSize: 11 }}
                  />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="url(#colorSystem)" radius={[6, 6, 0, 0]} maxBarSize={55} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                Nenhum dado de sistema disponível
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart 4: Radar / Spider Chart de Atuação por Etapa */}
      <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
        <CardHeader className="py-3.5 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">
            Matriz de Atuação Versátil por Etapa
          </CardTitle>
          <CardDescription className="text-xs">
            Volume de participações em cada uma das etapas do ciclo
          </CardDescription>
        </CardHeader>
        <CardContent className="px-1 pt-4 sm:px-6">
          <div className="h-[230px] min-h-[230px] w-full min-w-0 sm:h-[260px] sm:min-h-[260px]">
            {stageRadarData && stageRadarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <RadarChart cx="50%" cy="50%" outerRadius={80} data={stageRadarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="Atuações"
                    dataKey="count"
                    stroke="hsl(346, 84%, 45%)"
                    fill="hsl(346, 84%, 45%)"
                    fillOpacity={0.4}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                Nenhum dado de atuação cadastrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart 5: Evolução Mensal (Full width) */}
      <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm md:col-span-2">
        <CardHeader className="py-3.5 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">
            Evolução Temporal de Projetos Iniciados
          </CardTitle>
          <CardDescription className="text-xs">
            Volume mensal de novos cartórios sob liderança
          </CardDescription>
        </CardHeader>
        <CardContent className="px-1 pt-4 sm:px-6">
          <div className="h-[230px] min-h-[230px] w-full min-w-0 sm:h-[260px] sm:min-h-[260px]">
            {monthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={monthData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(346, 84%, 45%)" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="hsl(346, 84%, 45%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", opacity: 0.8, fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", opacity: 0.8, fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(346, 84%, 45%)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMonth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                Nenhum dado temporal mensal disponível
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
