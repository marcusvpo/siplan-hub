import {
  Building2,
  CircleDollarSign,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PosAiVisitorAnalyticsData } from "@/hooks/usePosAiVisitorAnalytics";

interface PosAiVisitorAnalyticsProps {
  data?: PosAiVisitorAnalyticsData;
  isLoading: boolean;
  showProject: boolean;
}

const integerFormatter = new Intl.NumberFormat("pt-BR");
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatLastActivity(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
      {initials || "US"}
    </span>
  );
}

export function PosAiVisitorAnalytics({
  data,
  isLoading,
  showProject,
}: PosAiVisitorAnalyticsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
          Carregando uso por usuário e setor...
        </CardContent>
      </Card>
    );
  }

  const kpis = data?.kpis;
  const users = data?.by_user || [];
  const sectors = data?.by_sector || [];
  const chartData = users.slice(0, 10).map((user) => ({
    label: user.name.length > 24 ? `${user.name.slice(0, 22)}…` : user.name,
    perguntas: user.user_questions,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Usuários ativos</span>
              <UsersRound className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold">{integerFormatter.format(kpis?.active_users || 0)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {integerFormatter.format(kpis?.registered_users || 0)} cadastrados no filtro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Setores ativos</span>
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{integerFormatter.format(kpis?.active_sectors || 0)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {integerFormatter.format(kpis?.avg_questions_per_user || 0)} perguntas por usuário
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Perguntas identificadas</span>
              <MessageSquareText className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold">{integerFormatter.format(kpis?.user_questions || 0)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {integerFormatter.format(kpis?.total_sessions || 0)} conversas distintas
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-950/60 dark:bg-emerald-950/10">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <span>Custo atribuído</span>
              <CircleDollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {usdFormatter.format(kpis?.estimated_cost_usd || 0)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {integerFormatter.format(kpis?.total_tokens || 0)} tokens identificados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200/70 bg-blue-50/30 dark:border-blue-950/60 dark:bg-blue-950/10">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Cobertura de identificação</p>
              <Badge variant="outline" className="bg-background font-mono text-xs">
                {Number(kpis?.identification_rate || 0).toFixed(1)}%
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {integerFormatter.format(kpis?.identified_messages || 0)} mensagens atribuídas a pessoas ·{" "}
              {integerFormatter.format(kpis?.unidentified_messages || 0)} sem identificação
              {(kpis?.unidentified_cost_usd || 0) > 0
                ? ` (${usdFormatter.format(kpis?.unidentified_cost_usd || 0)} sem atribuição)`
                : ""}
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950 sm:w-48">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, kpis?.identification_rate || 0))}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <UsersRound className="mb-3 h-9 w-9 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Nenhum uso identificado neste período</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Os dados aparecerão aqui quando pessoas identificadas iniciarem conversas no assistente.
              Mensagens anteriores à identificação permanecem contabilizadas como uso sem atribuição.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="px-5 py-4">
                <CardTitle className="text-sm">Usuários que mais perguntaram</CardTitle>
                <CardDescription className="text-xs">
                  Ranking de perguntas dentro do cartório e período selecionados
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                <div className="w-full" style={{ height: Math.max(230, chartData.length * 34) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} />
                      <YAxis type="category" dataKey="label" width={120} fontSize={11} />
                      <ChartTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="perguntas" fill="hsl(346, 84%, 45%)" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-5 py-4">
                <CardTitle className="text-sm">Uso consolidado por setor</CardTitle>
                <CardDescription className="text-xs">
                  Pessoas, demanda e custo estimado agrupados pela área informada
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="space-y-2.5">
                  {sectors.map((sector, index) => (
                    <div key={sector.sector} className="rounded-xl border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{sector.sector}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {sector.active_users} usuário{sector.active_users === 1 ? "" : "s"} · {sector.total_sessions} conversas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{sector.user_questions} perguntas</p>
                          <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                            {usdFormatter.format(sector.estimated_cost_usd)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="text-sm">Detalhamento por usuário</CardTitle>
              <CardDescription className="text-xs">
                Quem utilizou o assistente, em qual setor e quanto consumiu
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[210px]">Usuário</TableHead>
                      {showProject && <TableHead className="min-w-[210px]">Cartório</TableHead>}
                      <TableHead className="text-right">Perguntas</TableHead>
                      <TableHead className="text-right">Conversas</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-center">Satisfação</TableHead>
                      <TableHead className="min-w-[125px] text-right">Último acesso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow key={user.visitor_id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                              {index + 1}
                            </span>
                            <UserInitials name={user.name} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{user.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{user.sector}</p>
                            </div>
                          </div>
                        </TableCell>
                        {showProject && (
                          <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {user.client_name}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-semibold">{user.user_questions}</TableCell>
                        <TableCell className="text-right">{user.total_sessions}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {integerFormatter.format(user.total_tokens)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {usdFormatter.format(user.estimated_cost_usd)}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.satisfaction_rate === null ? (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          ) : (
                            <Badge variant="outline" className="text-[11px]">
                              {Number(user.satisfaction_rate).toFixed(1)}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[11px] text-muted-foreground">
                          {formatLastActivity(user.last_activity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
