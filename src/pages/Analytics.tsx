import { useProjectsList } from "@/hooks/useProjectsList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Analytics() {
  const { projects, isLoading } = useProjectsList();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Metrics Calculation ---
  const totalProjects = projects.length;
  const completedProjects = projects.filter(
    (p) => p.globalStatus === "done"
  ).length;
  const inProgressProjects = projects.filter(
    (p) => p.globalStatus === "in-progress"
  ).length;
  const blockedProjects = projects.filter(
    (p) => p.globalStatus === "blocked"
  ).length;

  const completionRate =
    totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

  // Average Lead Time (Cycle Time)
  // RULE: Use Implementation Phase 1 End Date as completion marker
  const doneProjectsData = projects.filter(
    (p) => p.globalStatus === "done" && p.stages.implementation.phase1?.endDate
  );

  const totalLeadTime = doneProjectsData.reduce((acc, p) => {
    const endDate = p.stages.implementation.phase1!.endDate!;
    // Fallback to createdAt if startDateActual is missing, though unlikely for done projects
    const startDate = p.startDateActual || p.createdAt;
    return acc + differenceInDays(endDate, startDate);
  }, 0);
  const avgLeadTime =
    doneProjectsData.length > 0
      ? Math.round(totalLeadTime / doneProjectsData.length)
      : 0;

  // --- Charts Data ---

  // 1. Deliveries per Month (Bar Chart)
  // Group 'done' projects by Implementation Phase 1 End Date
  const deliveriesByMonth = doneProjectsData.reduce((acc, p) => {
    const endDate = p.stages.implementation.phase1!.endDate!;
    const month = format(endDate, "MMM/yy", { locale: ptBR });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barChartData = Object.entries(deliveriesByMonth).map(
    ([name, value]) => ({ name, value })
  );

  // 2. Reasons for Blocking (Pie Chart)
  // We don't have explicit "block reason" column in list view easily,
  // but we can look at "healthScore" or just distribution of statuses of ACTIVE projects.
  // Or if we implemented blocking reasons, we would use that.
  // Let's visualize Global Status Distribution instead as a proxy for ecosystem health.
  const statusDist = projects.reduce((acc, p) => {
    acc[p.globalStatus] = (acc[p.globalStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = [
    { name: "Concluído", value: statusDist["done"] || 0, color: "#10b981" },
    {
      name: "Em Andamento",
      value: statusDist["in-progress"] || 0,
      color: "#3b82f6",
    },
    { name: "A Fazer", value: statusDist["todo"] || 0, color: "#f59e0b" },
    { name: "Bloqueado", value: statusDist["blocked"] || 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard Executivo
        </h2>
        <p className="text-muted-foreground mt-1">
          Visão estratégica e indicadores de performance (KPIs) da operação.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conclusão
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedProjects} de {totalProjects} projetos entregues
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lead Time Médio
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLeadTime} dias</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo médio de entrega
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projetos Ativos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em execução no momento
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bloqueios</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Projetos paralisados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Entregas por Mês</CardTitle>
            <CardDescription>
              Volume de projetos concluídos nos últimos meses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Visão geral da saúde do portfólio</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
