import { useEffect, useMemo, useState } from "react";
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
  Eye,
  Headset,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownLite } from "@/components/MarkdownLite";
import { Chamado0800DetailDialog } from "@/components/ProjectManagement/Chamado0800DetailDialog";
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
import {
  buildTicketsAiAnalytics,
  isTicketBugLike,
  isTicketCompleted,
  ticketDaysBetween,
  ticketDaysOpen,
} from "@/lib/tickets-ai-analytics";

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
  onAnalysisResultChange?: (result: { text: string; createdAt: string } | null) => void;
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
  onAnalysisResultChange,
}: TicketsAiAnalysisProps) {
  const [preparingAi, setPreparingAi] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<ChamadoReportRow | null>(null);
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

  const analytics = useMemo(() => buildTicketsAiAnalytics(rows), [rows]);

  useEffect(() => {
    onAnalysisResultChange?.(
      latest?.resultText ? { text: latest.resultText, createdAt: latest.createdAt } : null
    );
  }, [latest?.createdAt, latest?.resultText, onAnalysisResultChange]);

  const handleGenerate = async () => {
    if (!rows.length || activeJob || syncing || preparingAi) return;
    setPreparingAi(true);
    try {
      const enrichedRows = await fetchAllChamadosForReport(filters);
      const priorityRows = [...enrichedRows].sort((left, right) => {
        const leftScore = (!isTicketCompleted(left) ? 4 : 0) + (isTicketBugLike(left) ? 2 : 0) + Math.min(ticketDaysOpen(left.dataAbertura) / 30, 2);
        const rightScore = (!isTicketCompleted(right) ? 4 : 0) + (isTicketBugLike(right) ? 2 : 0) + Math.min(ticketDaysOpen(right.dataAbertura) / 30, 2);
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
        dias_em_aberto: isTicketCompleted(row) ? null : ticketDaysOpen(row.dataAbertura),
        dias_ate_encerramento: isTicketCompleted(row)
          ? ticketDaysBetween(row.dataAbertura, row.dataEncerramento)
          : null,
        equipe_responsavel: row.equipeResponsavel || null,
        solicitante: row.solicitante || null,
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
          bugs_resolvidos: analytics.bugCompleted,
          bugs_em_aberto: analytics.bugOpen,
          taxa_resolucao_bugs_percentual: analytics.bugResolutionRate,
          media_dias_resolucao: analytics.averageResolutionDays,
          media_dias_dos_abertos: analytics.averageOpenDays,
          abertos_mais_30_dias: analytics.openOver30Days,
          abertos_mais_60_dias: analytics.openOver60Days,
        },
        distribuicoes: {
          status: analytics.byStatus,
          natureza: analytics.byNature,
          clientes: analytics.byClient,
          produtos: analytics.byProduct,
          envelhecimento_dos_abertos: analytics.aging,
          fluxo_mensal_aberturas_encerramentos: analytics.monthlyFlow,
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
          { label: "Bugs resolvidos", value: `${analytics.bugCompleted}/${analytics.bugLike}`, icon: AlertTriangle, color: "text-amber-500" },
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
          <CardHeader className="px-3 py-2"><CardTitle className="text-xs">Evolução mensal: abertos x concluídos</CardTitle></CardHeader>
          <CardContent className="h-[240px] px-2 pb-2 pt-0">
            {analytics.monthlyFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyFlow} margin={{ top: 18, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
                  <Bar dataKey="opened" name="Abertos" fill="#0ea5e9" radius={[4, 4, 0, 0]}><LabelList dataKey="opened" position="top" className="fill-foreground text-[9px]" /></Bar>
                  <Bar dataKey="closed" name="Concluídos" fill="#10b981" radius={[4, 4, 0, 0]}><LabelList dataKey="closed" position="top" className="fill-foreground text-[9px]" /></Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-16 text-center text-xs text-muted-foreground">Sem datas suficientes para a tendência.</p>}
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
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant="outline" className="text-[9px]">{ticketDaysOpen(row.dataAbertura)} dias</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title={`Ver detalhes do chamado ${row.numeroChamado}`}
                    aria-label={`Ver detalhes e trâmites do chamado ${row.numeroChamado}`}
                    onClick={() => setSelectedChamado(row)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
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

      <Chamado0800DetailDialog
        chamado={selectedChamado}
        onClose={() => setSelectedChamado(null)}
        showTramites
      />
    </div>
  );
}
