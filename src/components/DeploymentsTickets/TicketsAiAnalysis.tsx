import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Headset,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownLite } from "@/components/MarkdownLite";
import {
  fetchAllChamadosForReport,
  fetchAllChamados,
  type ChamadoReportRow,
  type ChamadosSearchFilters,
} from "@/hooks/useChamados0800";
import { useTicketsAiAnalysis } from "@/hooks/useTicketsAiAnalysis";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { useAuth } from "@/hooks/useAuth";
import { formatOrionProductLabel } from "@/lib/chamados-product-filter";

const STATUS_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#64748b", "#e11d48"];
const CHART_COLOR = "hsl(346, 84%, 45%)";

interface TicketsAiAnalysisProps {
  active: boolean;
  filterKey: string;
  syncedAt?: number;
  syncing: boolean;
  filters: Omit<ChamadosSearchFilters, "page" | "pageSize">;
  filterDescription: {
    startDate: string;
    endDate: string;
    clients: string[];
    product: string;
    nature: string;
    statuses: string[];
    searchTerm: string;
  };
}

const normalize = (value?: string): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isCompleted = (row: ChamadoReportRow): boolean =>
  normalize(row.status).includes("concluido");

const isBugLike = (row: ChamadoReportRow): boolean =>
  /(bug|erro|falha|reclamacao|incidente)/.test(normalize(row.natureza));

const daysBetween = (start?: string, end?: string): number | null => {
  if (!start || !end) return null;
  const difference = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(difference) ? Math.max(0, Math.round(difference / 86_400_000)) : null;
};

const daysOpen = (start?: string): number => {
  if (!start) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(start).getTime()) / 86_400_000));
};

function countBy(rows: ChamadoReportRow[], selector: (row: ChamadoReportRow) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = selector(row).trim() || "Nao informado";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "pt-BR"));
}

function buildAnalytics(rows: ChamadoReportRow[]) {
  const completed = rows.filter(isCompleted);
  const open = rows.filter((row) => !isCompleted(row));
  const bugLike = rows.filter(isBugLike);
  const clients = new Set(rows.map((row) => row.nomeCliente).filter(Boolean));
  const resolutionDays = completed
    .map((row) => daysBetween(row.dataAbertura, row.dataEncerramento))
    .filter((value): value is number => value !== null);

  const timelineCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.dataAbertura) continue;
    const key = row.dataAbertura.slice(0, 7);
    timelineCounts.set(key, (timelineCounts.get(key) ?? 0) + 1);
  }

  return {
    total: rows.length,
    completed: completed.length,
    open: open.length,
    bugLike: bugLike.length,
    clients: clients.size,
    completionRate: rows.length ? Math.round((completed.length / rows.length) * 100) : 0,
    averageResolutionDays: resolutionDays.length
      ? Math.round(resolutionDays.reduce((sum, value) => sum + value, 0) / resolutionDays.length)
      : null,
    byStatus: countBy(rows, (row) => row.status || "Nao informado"),
    byNature: countBy(rows, (row) => row.natureza || "Nao informado"),
    byClient: countBy(rows, (row) => row.nomeCliente || "Nao informado"),
    byProduct: countBy(rows, (row) => formatOrionProductLabel(row.software || row.produto)),
    timeline: [...timelineCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, total]) => ({ month: month.split("-").reverse().join("/"), total })),
    oldestOpen: [...open]
      .sort((left, right) => daysOpen(right.dataAbertura) - daysOpen(left.dataAbertura))
      .slice(0, 8),
  };
}

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

const truncate = (value?: string, max = 500): string | null => {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
};

export function TicketsAiAnalysis({
  active,
  filterKey,
  syncedAt,
  syncing,
  filters,
  filterDescription,
}: TicketsAiAnalysisProps) {
  const [preparingAi, setPreparingAi] = useState(false);
  const { user } = useAuth();
  const { online: workerOnline } = useModelWorkerStatus();
  const { generate, active: activeJob, latest, latestError } = useTicketsAiAnalysis(
    filterKey,
    user?.id
  );

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["ticketsAiDashboard", filterKey, syncedAt, filters.ticketNumbers],
    enabled: active,
    staleTime: 30_000,
    queryFn: () => fetchAllChamados(filters),
  });

  const analytics = useMemo(() => buildAnalytics(rows), [rows]);

  const handleGenerate = async () => {
    if (!rows.length || activeJob || syncing || preparingAi) return;
    setPreparingAi(true);
    try {
      const enrichedRows = await fetchAllChamadosForReport(filters);
      const priorityRows = [...enrichedRows].sort((left, right) => {
        const leftScore = (!isCompleted(left) ? 4 : 0) + (isBugLike(left) ? 2 : 0) + Math.min(daysOpen(left.dataAbertura) / 30, 2);
        const rightScore = (!isCompleted(right) ? 4 : 0) + (isBugLike(right) ? 2 : 0) + Math.min(daysOpen(right.dataAbertura) / 30, 2);
        return rightScore - leftScore;
      });
      const detailedSample = priorityRows.slice(0, 120).map((row) => ({
        chamado: row.numeroChamado,
        cliente: row.nomeCliente || null,
        titulo: row.titulo || null,
        descricao_abertura: truncate(row.descricao, 350),
        natureza: row.natureza || null,
        status: row.status || null,
        produto: formatOrionProductLabel(row.software || row.produto),
        abertura: row.dataAbertura || null,
        encerramento: row.dataEncerramento || null,
        dias_em_aberto: isCompleted(row) ? null : daysOpen(row.dataAbertura),
        ultimo_tramite: row.ultimoTramite
          ? {
              data: row.ultimoTramite.dataTramite || null,
              responsavel: row.ultimoTramite.responsavel || null,
              atividade: row.ultimoTramite.atividade || null,
              descricao: truncate(row.ultimoTramite.descricao, 550),
            }
          : null,
      }));

      const payload = {
        filtros: filterDescription,
        indicadores: {
          total_chamados: analytics.total,
          clientes: analytics.clients,
          concluidos: analytics.completed,
          em_aberto: analytics.open,
          taxa_conclusao_percentual: analytics.completionRate,
          bugs_erros_reclamacoes: analytics.bugLike,
          media_dias_resolucao: analytics.averageResolutionDays,
        },
        distribuicoes: {
          status: analytics.byStatus,
          natureza: analytics.byNature,
          clientes: analytics.byClient,
          produtos: analytics.byProduct,
          evolucao_mensal: analytics.timeline,
        },
        amostra_detalhada: detailedSample,
        registros_detalhados: detailedSample.length,
        registros_omitidos_da_amostra: Math.max(0, rows.length - detailedSample.length),
      };

      await generate(JSON.stringify(payload));
      toast.success("Análise enfileirada. A IA está lendo o recorte selecionado.");
    } catch (generationError) {
      console.error("Erro ao gerar analise de chamados:", generationError);
      toast.error(
        generationError instanceof Error
          ? generationError.message
          : "Não foi possível iniciar a análise com IA."
      );
    } finally {
      setPreparingAi(false);
    }
  };

  if (isLoading) {
    return (
      <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Preparando indicadores do filtro...</CardContent></Card>
    );
  }

  if (error) {
    return <Card><CardContent className="py-12 text-center text-sm text-red-500">Não foi possível carregar os dados da análise.</CardContent></Card>;
  }

  if (!rows.length) {
    return <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">Nenhum chamado no recorte atual para analisar.</CardContent></Card>;
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {[
          { label: "Chamados", value: analytics.total, icon: Headset, color: "text-rose-600" },
          { label: "Clientes", value: analytics.clients, icon: Building2, color: "text-violet-500" },
          { label: "Concluídos", value: `${analytics.completed} (${analytics.completionRate}%)`, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Em aberto", value: analytics.open, icon: Clock3, color: "text-blue-500" },
          { label: "Bugs/erros", value: analytics.bugLike, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Média de resolução", value: analytics.averageResolutionDays === null ? "-" : `${analytics.averageResolutionDays} d`, icon: BarChart3, color: "text-cyan-500" },
        ].map((item) => (
          <Card key={item.label} className="border-muted/80">
            <CardContent className="flex items-center gap-2 p-2.5">
              <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-none">{item.value}</p>
                <p className="mt-1 truncate text-[9px] text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-2">
        <Card>
          <CardHeader className="px-3 py-2"><CardTitle className="text-xs">Distribuição por status</CardTitle></CardHeader>
          <CardContent className="h-[240px] px-2 pb-2 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.byStatus} dataKey="total" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                  {analytics.byStatus.map((item, index) => <Cell key={item.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} chamado(s)`, "Total"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="-mt-7 flex flex-wrap justify-center gap-x-3 gap-y-1">
              {analytics.byStatus.map((item, index) => (
                <span key={item.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                  {item.name}: <strong className="text-foreground">{item.total}</strong>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 py-2"><CardTitle className="text-xs">Principais naturezas</CardTitle></CardHeader>
          <CardContent className="h-[240px] px-2 pb-2 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byNature.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 30, bottom: 0, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={155} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
                <Bar dataKey="total" fill={CHART_COLOR} barSize={14} radius={[0, 4, 4, 0]}><LabelList dataKey="total" position="right" className="fill-foreground text-[10px]" /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 py-2"><CardTitle className="text-xs">Clientes com maior volume</CardTitle></CardHeader>
          <CardContent className="h-[240px] px-2 pb-2 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byClient.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 30, bottom: 0, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={190} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickFormatter={(value: string) => value.length > 28 ? `${value.slice(0, 28)}...` : value} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
                <Bar dataKey="total" fill="#6366f1" barSize={14} radius={[0, 4, 4, 0]}><LabelList dataKey="total" position="right" className="fill-foreground text-[10px]" /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 py-2"><CardTitle className="text-xs">Evolução mensal de aberturas</CardTitle></CardHeader>
          <CardContent className="h-[240px] px-2 pb-2 pt-0">
            {analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.timeline} margin={{ top: 18, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
                  <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]}><LabelList dataKey="total" position="top" className="fill-foreground text-[10px]" /></Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-16 text-center text-xs text-muted-foreground">Sem datas suficientes para a tendencia.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader className="px-3 py-2"><CardTitle className="text-xs">Chamados em aberto há mais tempo</CardTitle></CardHeader>
          <CardContent className="space-y-1 px-3 pb-3 pt-0">
            {analytics.oldestOpen.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhum chamado em aberto no filtro.</p>
            ) : analytics.oldestOpen.map((row) => (
              <div key={row.numeroChamado} className="flex items-center justify-between gap-2 rounded-md border border-muted/70 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium"><span className="font-mono text-rose-600">#{row.numeroChamado}</span> {row.titulo || "Sem titulo"}</p>
                  <p className="truncate text-[9px] text-muted-foreground">{row.nomeCliente || "Cliente não informado"}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[9px]">{daysOpen(row.dataAbertura)} dias</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
            <CardTitle className="flex items-center gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5 text-violet-500" />Considerações da IA</CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={handleGenerate} disabled={Boolean(activeJob) || preparingAi || syncing || !workerOnline || !rows.length}>
              {activeJob || preparingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {preparingAi ? "Preparando dados..." : latest ? "Atualizar análise" : "Gerar considerações"}
            </Button>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {preparingAi ? (
              <div className="flex min-h-[120px] items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando os últimos trâmites do recorte...</div>
            ) : activeJob ? (
              <div className="flex min-h-[120px] items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{activeJob.progress || "Gerando parecer do recorte..."}</div>
            ) : latest?.resultText ? (
              <div className="text-xs"><MarkdownLite text={latest.resultText} /><p className="mt-2 text-[9px] text-muted-foreground">Gerado em {new Date(latest.createdAt).toLocaleString("pt-BR")} para esta combinacao de filtros.</p></div>
            ) : latestError ? (
              <p className="py-8 text-center text-xs text-red-500">Falha na ultima analise: {latestError.errorMessage}</p>
            ) : (
              <div className="min-h-[120px] space-y-2 py-5 text-xs text-muted-foreground">
                <p>A IA cruza os indicadores do recorte com títulos, descrições e últimos trâmites para apontar recorrências, riscos, soluções e ações recomendadas.</p>
                {!workerOnline && <p className="text-amber-600">O worker de IA está offline no momento.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
