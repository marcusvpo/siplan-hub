import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BrainCircuit,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Loader2,
  Maximize2,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { MarkdownLite } from "@/components/MarkdownLite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CsCxNpsResponse } from "@/hooks/useCsCxExperience";
import { useCsCxNpsAiReport } from "@/hooks/useCsCxNpsAiReport";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  buildNpsAiSource,
  buildNpsAnalytics,
  EMPTY_NPS_FILTERS,
  npsFilterDescription,
  type NpsAttentionClient,
  type NpsAnalyticsFilters,
  type NpsOfficeAnalytics,
} from "@/lib/cs-cx-nps-analytics";
import { generateCsCxNpsAnalysisPdf } from "@/lib/cs-cx-experience-pdf";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/utils/normalize-search";

interface NpsAnalyticsPanelProps {
  responses: CsCxNpsResponse[];
  canGenerate: boolean;
}

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 11,
};

const DISTRIBUTION_COLORS = ["#10b981", "#f59e0b", "#e11d48"];
const DETAIL_PAGE_SIZE = 5;

type NpsDrilldown =
  | { kind: "classification"; value: CsCxNpsResponse["classification"]; title: string; description: string }
  | { kind: "office"; value: string; title: string; description: string }
  | { kind: "month"; value: string; title: string; description: string }
  | { kind: "score"; value: string; title: string; description: string }
  | { kind: "response"; value: string; title: string; description: string };

type ExpandedNpsChart = "attention" | "ranking";
type AttentionChartItem = NpsAttentionClient & { attentionLabel: string };
type RankingChartItem = NpsOfficeAnalytics & { rankingLabel: string };

export function NpsAnalyticsPanel({
  responses,
  canGenerate,
}: NpsAnalyticsPanelProps) {
  const [filters, setFilters] =
    useState<NpsAnalyticsFilters>(EMPTY_NPS_FILTERS);
  const [isExporting, setIsExporting] = useState(false);
  const [drilldown, setDrilldown] = useState<NpsDrilldown | null>(null);
  const [expandedChart, setExpandedChart] = useState<ExpandedNpsChart | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { online: workerOnline } = useModelWorkerStatus();

  const offices = useMemo(
    () => {
      const entries = responses.reduce((map, response) => {
          if (response.registry_office_id) {
            map.set(
              response.registry_office_id,
              response.registry_office?.name ||
                response.respondent_office ||
                "Cartório não informado",
            );
          }
          return map;
        }, new Map<string, string>());
      return Array.from(entries.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
    },
    [responses],
  );
  const selectedOffice = offices.find(
    (office) => office.id === filters.officeId,
  );
  const analytics = useMemo(
    () => buildNpsAnalytics(responses, filters),
    [filters, responses],
  );
  const filterDescription = npsFilterDescription(
    filters,
    selectedOffice?.name,
  );
  const source = useMemo(
    () => buildNpsAiSource(analytics, filterDescription),
    [analytics, filterDescription],
  );
  const reportKey = useMemo(
    () =>
      JSON.stringify({
        filters,
        responses: analytics.responses.map((response) => [
          response.id,
          response.responded_at,
          response.score,
          response.classification,
          response.score_reason,
          response.improvement_suggestion,
        ]),
      }),
    [analytics.responses, filters],
  );
  const { generate, active, latest, latestError } = useCsCxNpsAiReport(
    reportKey,
    user?.id,
  );

  const distribution: Array<{
    name: string;
    value: number;
    classification: CsCxNpsResponse["classification"];
    color: string;
  }> = [
    { name: "Promotores", value: analytics.promoters, classification: "PROMOTOR", color: DISTRIBUTION_COLORS[0] },
    { name: "Neutros", value: analytics.neutrals, classification: "NEUTRO", color: DISTRIBUTION_COLORS[1] },
    { name: "Detratores", value: analytics.detractors, classification: "DETRATOR", color: DISTRIBUTION_COLORS[2] },
  ];
  const fullOfficeRanking: RankingChartItem[] = analytics.byOffice.map((office) => ({
    ...office,
    rankingLabel: `${office.name}|${formatRankingDate(office.latestResponseAt)}`,
  }));
  const officeRanking = fullOfficeRanking.slice(0, 12);
  const fullAttentionClients: AttentionChartItem[] = analytics.attentionClients.map((client) => ({
    ...client,
    attentionLabel: `${client.name}|${formatRankingDate(client.respondedAt)}`,
  }));
  const attentionClients = fullAttentionClients.slice(0, 10);

  function openClassification(item: (typeof distribution)[number]) {
    setDrilldown({
      kind: "classification",
      value: item.classification,
      title: `Clientes ${item.name.toLocaleLowerCase("pt-BR")}`,
      description: `Respostas classificadas como ${item.name.toLocaleLowerCase("pt-BR")} no recorte atual.`,
    });
  }

  function openOffice(officeId: string, name: string) {
    setDrilldown({
      kind: "office",
      value: officeId,
      title: name,
      description: "Desempenho e respostas deste cartório no recorte atual.",
    });
  }

  function openMonth(key: string, label: string) {
    setDrilldown({
      kind: "month",
      value: key,
      title: `NPS de ${label}`,
      description: "Clientes e indicadores que compõem este ponto da evolução mensal.",
    });
  }

  function openScore(score: number) {
    setDrilldown({
      kind: "score",
      value: String(score),
      title: `Clientes com nota ${score}`,
      description: `Respostas com nota ${score} no recorte atual.`,
    });
  }

  async function handleGenerate() {
    if (!analytics.total || active) return;
    try {
      await generate(source);
      toast({
        title: "Relatório em processamento",
        description: "A IA está analisando os indicadores e comentários do recorte.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível iniciar o relatório",
        description: messageOf(error),
        variant: "destructive",
      });
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await generateCsCxNpsAnalysisPdf(
        analytics,
        filterDescription,
        latest?.resultText,
      );
    } catch (error) {
      toast({
        title: "Não foi possível exportar o relatório",
        description: messageOf(error),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <Card>
        <CardContent className="grid gap-2 p-3 lg:grid-cols-[160px_160px_minmax(220px,1fr)_auto] lg:items-end">
          <div className="space-y-1">
            <Label htmlFor="nps-bi-start" className="text-[11px]">
              Data inicial
            </Label>
            <Input
              id="nps-bi-start"
              type="date"
              className="h-8"
              value={filters.startDate}
              max={filters.endDate || undefined}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nps-bi-end" className="text-[11px]">
              Data final
            </Label>
            <Input
              id="nps-bi-end"
              type="date"
              className="h-8"
              value={filters.endDate}
              min={filters.startDate || undefined}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nps-bi-office" className="text-[11px]">
              Cartório
            </Label>
            <OfficeFilterCombobox
              id="nps-bi-office"
              offices={offices}
              value={filters.officeId}
              onChange={(officeId) =>
                setFilters((current) => ({ ...current, officeId }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={
                !filters.startDate &&
                !filters.endDate &&
                filters.officeId === "all"
              }
              onClick={() => setFilters({ ...EMPTY_NPS_FILTERS })}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Limpar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!analytics.total || isExporting}
              onClick={handleExport}
            >
              {isExporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Exportar relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <AnalyticsMetric
          icon={Star}
          label="NPS do recorte"
          value={analytics.nps}
          tone={npsTone(analytics.nps)}
        />
        <AnalyticsMetric
          icon={BarChart3}
          label="Nota média"
          value={analytics.averageScore}
          suffix="/10"
        />
        <AnalyticsMetric
          icon={Users}
          label="Respostas"
          value={analytics.total}
        />
        <AnalyticsMetric
          icon={Building2}
          label="Cartórios"
          value={analytics.officesCount}
        />
        <AnalyticsMetric
          icon={
            (analytics.trendDelta ?? 0) >= 0 ? TrendingUp : TrendingDown
          }
          label="Variação mensal"
          value={
            analytics.trendDelta === null
              ? "Sem comparação"
              : `${analytics.trendDelta > 0 ? "+" : ""}${analytics.trendDelta}`
          }
          tone={
            analytics.trendDelta === null
              ? "muted"
              : analytics.trendDelta >= 0
                ? "positive"
                : "negative"
          }
        />
      </div>

      {!analytics.total ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma resposta de NPS no recorte selecionado.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-2.5 xl:grid-cols-[1.7fr_1fr]">
            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-xs">Evolução mensal do NPS</CardTitle>
                <CardDescription className="text-[10px]">Clique em um ponto para analisar os clientes do mês</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] px-2 pb-2 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.monthly}
                    margin={{ top: 12, right: 20, bottom: 0, left: 0 }}
                    className="cursor-pointer"
                    onClick={(event) => {
                      const point = event?.activePayload?.[0]?.payload as
                        | (typeof analytics.monthly)[number]
                        | undefined;
                      if (point) openMonth(point.key, point.label);
                    }}
                  >
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="nps"
                      domain={[-100, 100]}
                      ticks={[-100, -50, 0, 50, 100]}
                      tickLine={false}
                      axisLine={false}
                      width={34}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                    />
                    <YAxis
                      yAxisId="score"
                      orientation="right"
                      domain={[0, 10]}
                      ticks={[0, 5, 10]}
                      tickLine={false}
                      axisLine={false}
                      width={24}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                    />
                    <ReferenceLine yAxisId="nps" y={0} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="nps"
                      yAxisId="nps"
                      name="NPS"
                      stroke="#e11d48"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#e11d48" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="averageScore"
                      yAxisId="score"
                      name="Nota média"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={{ r: 2, fill: "#6366f1" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-xs">Distribuição das respostas</CardTitle>
                <CardDescription className="text-[10px]">Clique em uma cor para ver os respectivos clientes</CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-0">
                <div className="h-[185px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={76}
                        paddingAngle={2}
                      >
                        {distribution.map((item) => (
                          <Cell
                            key={item.name}
                            fill={item.color}
                            className="cursor-pointer outline-none"
                            onClick={() => openClassification(item)}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {distribution.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      aria-label={`Analisar ${item.name}`}
                      onClick={() => openClassification(item)}
                      className="rounded-md border px-1.5 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="mt-0.5 block text-xs font-bold">
                        {item.value} <span className="font-normal text-muted-foreground">({percentage(item.value, analytics.total)}%)</span>
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2.5 xl:grid-cols-[1.45fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-3 py-2">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                    Clientes que precisam de atenção
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Pior nota de cada cartório, da menor para a maior · clique para detalhar
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-[10px]"
                  aria-label="Ampliar clientes que precisam de atenção"
                  onClick={() => setExpandedChart("attention")}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Tela cheia
                </Button>
              </CardHeader>
              <CardContent className="h-[310px] px-2 pb-2 pt-0">
                <AttentionClientsChart data={attentionClients} onOpenOffice={openOffice} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <MessageSquareText className="h-3.5 w-3.5 text-rose-500" />
                  Voz do cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[310px] space-y-1.5 overflow-y-auto px-3 pb-3 pt-0">
                {analytics.feedback.slice(0, 12).map((feedback) => (
                  <button
                    key={feedback.id}
                    type="button"
                    aria-label={`Analisar resposta de ${feedback.office} em ${formatResponseDate(feedback.respondedAt)}`}
                    className="block w-full rounded-md border p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    onClick={() => setDrilldown({
                      kind: "response",
                      value: feedback.id,
                      title: feedback.office,
                      description: "Detalhes da resposta selecionada.",
                    })}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold">
                          {feedback.office}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          Respondida em {formatResponseDate(feedback.respondedAt)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${classificationClass(feedback.classification)}`}
                      >
                        Nota {feedback.score}
                      </Badge>
                    </div>
                    <p className="line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
                      {feedback.reason || feedback.suggestion}
                    </p>
                  </button>
                ))}
                {!analytics.feedback.length && (
                  <p className="py-12 text-center text-xs text-muted-foreground">
                    Não há comentários textuais neste recorte.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2.5 xl:grid-cols-[1.45fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-3 py-2">
                <div>
                  <CardTitle className="text-xs">Ranking de NPS por cartório</CardTitle>
                  <CardDescription className="text-[10px]">
                    Maior NPS primeiro · empates: resposta mais recente · clique para detalhar
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-[10px]"
                  aria-label="Ampliar ranking de NPS por cartório"
                  onClick={() => setExpandedChart("ranking")}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Tela cheia
                </Button>
              </CardHeader>
              <CardContent className="h-[310px] px-2 pb-2 pt-0">
                <OfficeRankingChart data={officeRanking} onOpenOffice={openOffice} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-xs">Distribuição por nota</CardTitle>
                <CardDescription className="text-[10px]">
                  Volume de respostas de 0 a 10 · clique em uma barra para detalhar
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[310px] px-2 pb-2 pt-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={analytics.scoreDistribution}
                    margin={{ top: 18, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="responses" name="Respostas" radius={[4, 4, 0, 0]}>
                      {analytics.scoreDistribution.map((item) => (
                        <Cell
                          key={item.score}
                          fill={scoreColor(item.score)}
                          className="cursor-pointer outline-none"
                          onClick={() => openScore(item.score)}
                        />
                      ))}
                      <LabelList
                        dataKey="responses"
                        position="top"
                        fill="hsl(var(--foreground))"
                        fontSize={9}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {analytics.additionalQuestions.length > 0 && (
            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-xs">
                  Resultados das perguntas adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
                {analytics.additionalQuestions.map((question) => (
                  <div key={question.key} className="rounded-md border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold leading-snug">
                        {question.title}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-[9px]">
                        {question.answers}
                      </Badge>
                    </div>
                    {question.averageScore !== null && (
                      <p className="mt-2 text-lg font-black text-rose-600">
                        {question.averageScore}
                        <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                          /10
                        </span>
                      </p>
                    )}
                    {question.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {question.options.slice(0, 6).map((option) => (
                          <Badge key={option.label} variant="outline" className="text-[9px]">
                            {option.label}: {option.total}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {question.textSamples[0] && (
                      <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
                        {question.textSamples[0].answer}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-violet-200 dark:border-violet-900">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-3 py-2">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <BrainCircuit className="h-3.5 w-3.5 text-violet-500" />
                  Relatório executivo com IA
                </CardTitle>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Cruza indicadores, evolução, cartórios prioritários e comentários.
                </p>
              </div>
              {canGenerate && (
                <Button
                  size="sm"
                  className="h-8"
                  disabled={Boolean(active) || !workerOnline || !analytics.total}
                  onClick={handleGenerate}
                >
                  {active ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {latest ? "Atualizar relatório" : "Gerar relatório com IA"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {active ? (
                <div className="flex min-h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {active.progress || "Analisando o recorte de NPS..."}
                </div>
              ) : latest?.resultText ? (
                <div className="rounded-md bg-violet-50/60 p-3 text-xs dark:bg-violet-950/20">
                  <MarkdownLite text={latest.resultText} />
                  <p className="mt-2 text-[9px] text-muted-foreground">
                    Gerado em {new Date(latest.createdAt).toLocaleString("pt-BR")} para {filterDescription.toLocaleLowerCase("pt-BR")}.
                  </p>
                </div>
              ) : latestError ? (
                <p className="py-10 text-center text-xs text-destructive">
                  Falha no último relatório: {latestError.errorMessage}
                </p>
              ) : (
                <div className="min-h-28 space-y-2 py-6 text-xs text-muted-foreground">
                  <p>
                    Gere uma leitura gerencial com resumo executivo, tendências,
                    riscos, voz do cliente e plano de ação baseado somente neste
                    recorte.
                  </p>
                  {!workerOnline && (
                    <p className="text-amber-600">
                      O worker de IA está offline no momento. O BI e o PDF sem IA
                      continuam disponíveis.
                    </p>
                  )}
                  {!canGenerate && (
                    <p>Seu perfil pode consultar o BI, mas não gerar novos relatórios com IA.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {expandedChart && (
        <NpsExpandedChartDialog
          chart={expandedChart}
          attentionClients={fullAttentionClients}
          officeRanking={fullOfficeRanking}
          onClose={() => setExpandedChart(null)}
          onOpenOffice={(officeId, name) => {
            setExpandedChart(null);
            openOffice(officeId, name);
          }}
        />
      )}

      {drilldown && (
        <NpsDrilldownDialog
          key={`${drilldown.kind}:${drilldown.value}`}
          drilldown={drilldown}
          responses={analytics.responses}
          onClose={() => setDrilldown(null)}
          onSelectClassification={(classification) => {
            const item = distribution.find((entry) => entry.classification === classification);
            if (item) openClassification(item);
          }}
        />
      )}
    </div>
  );
}

function OfficeFilterCombobox({
  id,
  offices,
  value,
  onChange,
}: {
  id: string;
  offices: Array<{ id: string; name: string }>;
  value: string;
  onChange: (officeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOffice = offices.find((office) => office.id === value);
  const label = selectedOffice?.name ?? "Todos os cartórios";

  const selectOffice = (officeId: string) => {
    onChange(officeId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Filtrar NPS por cartório"
          aria-expanded={open}
          className="h-8 w-full justify-between px-3 font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command
          filter={(optionValue, search) =>
            normalizeSearchText(optionValue).includes(
              normalizeSearchText(search),
            )
              ? 1
              : 0
          }
        >
          <CommandInput
            aria-label="Buscar cartório pelo nome"
            placeholder="Buscar cartório..."
            className="h-9"
          />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhum cartório encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Todos os cartórios"
                onSelect={() => selectOffice("all")}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "all" ? "opacity-100" : "opacity-0",
                  )}
                />
                Todos os cartórios
              </CommandItem>
              {offices.map((office) => (
                <CommandItem
                  key={office.id}
                  value={office.name}
                  onSelect={() => selectOffice(office.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === office.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {office.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AttentionClientsChart({
  data,
  onOpenOffice,
}: {
  data: AttentionChartItem[];
  onOpenOffice: (officeId: string, name: string) => void;
}) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Nenhum cliente com nota entre 0 e 8 neste recorte.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 34, bottom: 8, left: 8 }}
      >
        <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 8, 10]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
        />
        <YAxis
          type="category"
          dataKey="attentionLabel"
          width={180}
          interval={0}
          minTickGap={0}
          tickLine={false}
          axisLine={false}
          tick={<DatedNpsAxisTick dateLabel="Resposta" />}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(value) => {
            const [name, date] = String(value).split("|");
            return `${name} · Resposta: ${date}`;
          }}
        />
        <Bar dataKey="score" name="Nota" radius={4}>
          {data.map((client) => (
            <Cell
              key={client.key}
              fill={scoreColor(client.score)}
              className="cursor-pointer outline-none"
              onClick={() => onOpenOffice(client.officeId, client.name)}
            />
          ))}
          <LabelList
            dataKey="score"
            position="right"
            fill="hsl(var(--foreground))"
            fontSize={9}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function OfficeRankingChart({
  data,
  onOpenOffice,
}: {
  data: RankingChartItem[];
  onOpenOffice: (officeId: string, name: string) => void;
}) {
  const domain: [number, number] = data.some((office) => office.nps < 0)
    ? data.some((office) => office.nps > 0)
      ? [-100, 100]
      : [-100, 0]
    : [0, 100];
  const ticks = domain[0] === 0
    ? [0, 25, 50, 75, 100]
    : domain[1] === 0
      ? [-100, -75, -50, -25, 0]
      : [-100, -50, 0, 50, 100];

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Nenhum cartório avaliado neste recorte.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 34, bottom: 8, left: 8 }}
      >
        <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          domain={domain}
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
        />
        <YAxis
          type="category"
          dataKey="rankingLabel"
          width={180}
          interval={0}
          minTickGap={0}
          tickLine={false}
          axisLine={false}
          tick={<DatedNpsAxisTick dateLabel="Última NPS" />}
        />
        <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(value) => {
            const [name, date] = String(value).split("|");
            return `${name} · Última NPS: ${date}`;
          }}
        />
        <Bar dataKey="nps" name="NPS" radius={4}>
          {data.map((office) => (
            <Cell
              key={office.key}
              fill={officeNpsColor(office.nps)}
              className="cursor-pointer outline-none"
              onClick={() => onOpenOffice(office.officeId, office.name)}
            />
          ))}
          <LabelList
            dataKey="nps"
            position="right"
            fill="hsl(var(--foreground))"
            fontSize={9}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function NpsExpandedChartDialog({
  chart,
  attentionClients,
  officeRanking,
  onClose,
  onOpenOffice,
}: {
  chart: ExpandedNpsChart;
  attentionClients: AttentionChartItem[];
  officeRanking: RankingChartItem[];
  onClose: () => void;
  onOpenOffice: (officeId: string, name: string) => void;
}) {
  const isAttention = chart === "attention";
  const total = isAttention ? attentionClients.length : officeRanking.length;
  const chartHeight = Math.max(560, total * 38);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] max-w-[96vw] flex-col overflow-hidden p-4 sm:max-w-[96vw] sm:p-5">
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>
            {isAttention ? "Clientes que precisam de atenção" : "Ranking de NPS por cartório"}
          </DialogTitle>
          <DialogDescription>
            {isAttention
              ? "Todos os clientes com nota entre 0 e 8, ordenados da menor para a maior nota."
              : "Todos os cartórios, ordenados pelo maior NPS e pela resposta mais recente nos empates."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{total} cartório(s) no recorte</span>
          <span>Clique em uma barra para abrir os detalhes</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card p-2">
          <div className="min-w-[820px]" style={{ height: chartHeight }}>
            {isAttention ? (
              <AttentionClientsChart data={attentionClients} onOpenOffice={onOpenOffice} />
            ) : (
              <OfficeRankingChart data={officeRanking} onOpenOffice={onOpenOffice} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NpsDrilldownDialog({
  drilldown,
  responses,
  onClose,
  onSelectClassification,
}: {
  drilldown: NpsDrilldown;
  responses: CsCxNpsResponse[];
  onClose: () => void;
  onSelectClassification: (classification: CsCxNpsResponse["classification"]) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const selectedResponses = useMemo(
    () => responses
      .filter((response) => matchesDrilldown(response, drilldown))
      .sort((left, right) => right.responded_at.localeCompare(left.responded_at)),
    [drilldown, responses],
  );
  const detailAnalytics = useMemo(
    () => buildNpsAnalytics(selectedResponses, EMPTY_NPS_FILTERS),
    [selectedResponses],
  );
  const contextAnalytics = useMemo(
    () => buildNpsAnalytics(responses, EMPTY_NPS_FILTERS),
    [responses],
  );
  const searchedResponses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return selectedResponses;
    return selectedResponses.filter((response) => [
      response.respondent_name,
      responseOfficeName(response),
      response.score_reason,
      response.improvement_suggestion,
      String(response.score),
      classificationLabel(response.classification),
    ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)));
  }, [search, selectedResponses]);
  const totalPages = Math.max(1, Math.ceil(searchedResponses.length / DETAIL_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedResponses = searchedResponses.slice(
    (currentPage - 1) * DETAIL_PAGE_SIZE,
    currentPage * DETAIL_PAGE_SIZE,
  );
  const firstItem = searchedResponses.length ? (currentPage - 1) * DETAIL_PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(currentPage * DETAIL_PAGE_SIZE, searchedResponses.length);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-6xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>{drilldown.title}</DialogTitle>
          <DialogDescription>{drilldown.description}</DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
          <AnalyticsMetric icon={Users} label="Respostas" value={detailAnalytics.total} />
          <AnalyticsMetric icon={Building2} label="Cartórios" value={detailAnalytics.officesCount} />
          <AnalyticsMetric icon={Star} label="NPS" value={detailAnalytics.nps} tone={npsTone(detailAnalytics.nps)} />
          <AnalyticsMetric icon={BarChart3} label="Nota média" value={detailAnalytics.averageScore} suffix="/10" />
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2">
          <ClassificationSummary label="Promotores" value={contextAnalytics.promoters} total={contextAnalytics.total} tone="positive" active={drilldown.kind === "classification" && drilldown.value === "PROMOTOR"} onClick={() => onSelectClassification("PROMOTOR")} />
          <ClassificationSummary label="Neutros" value={contextAnalytics.neutrals} total={contextAnalytics.total} tone="neutral" active={drilldown.kind === "classification" && drilldown.value === "NEUTRO"} onClick={() => onSelectClassification("NEUTRO")} />
          <ClassificationSummary label="Detratores" value={contextAnalytics.detractors} total={contextAnalytics.total} tone="negative" active={drilldown.kind === "classification" && drilldown.value === "DETRATOR"} onClick={() => onSelectClassification("DETRATOR")} />
        </div>

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Buscar clientes no detalhamento"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Buscar cliente, cartório, nota ou comentário..."
            className="h-9 pl-9"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="h-9 min-w-[120px] text-xs">Data</TableHead>
                <TableHead className="h-9 min-w-[180px] text-xs">Cartório</TableHead>
                <TableHead className="h-9 min-w-[150px] text-xs">Cliente</TableHead>
                <TableHead className="h-9 min-w-[130px] text-xs">Avaliação</TableHead>
                <TableHead className="h-9 min-w-[320px] text-xs">Voz do cliente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!pagedResponses.length ? (
                <TableRow><TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">Nenhum cliente encontrado neste recorte.</TableCell></TableRow>
              ) : pagedResponses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell className="px-3 py-2 text-xs">{formatResponseDate(response.responded_at)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs font-semibold">{responseOfficeName(response)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs">{response.respondent_name || "Não informado"}</TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black">{response.score}</span>
                      <Badge variant="outline" className={classificationClass(response.classification)}>{classificationLabel(response.classification)}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="space-y-1 px-3 py-2 text-[11px] leading-relaxed">
                    <p><span className="font-semibold">Motivo:</span> {response.score_reason?.trim() || "Não informado"}</p>
                    {response.improvement_suggestion?.trim() && <p className="text-muted-foreground"><span className="font-semibold text-foreground">Sugestão:</span> {response.improvement_suggestion}</p>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex shrink-0 flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Mostrando <strong className="text-foreground">{firstItem}–{lastItem}</strong> de <strong className="text-foreground">{searchedResponses.length}</strong> cliente(s)</span>
          <div className="flex items-center justify-end gap-2">
            <span>Página {currentPage} de {totalPages}</span>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Página anterior do detalhamento" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Próxima página do detalhamento" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClassificationSummary({ label, value, total, tone, active, onClick }: { label: string; value: number; total: number; tone: "positive" | "neutral" | "negative"; active: boolean; onClick: () => void }) {
  const styles = {
    positive: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
    neutral: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    negative: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  }[tone];
  return <button type="button" aria-label={`Exibir clientes ${label.toLocaleLowerCase("pt-BR")}`} aria-pressed={active} disabled={!value} onClick={onClick} className={`rounded-md border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${active ? "ring-2 ring-current ring-offset-2" : ""}`}><p className="text-[9px] font-semibold uppercase tracking-wide">{label}</p><p className="text-sm font-black">{value} <span className="font-medium opacity-75">({percentage(value, total)}%)</span></p></button>;
}

function AnalyticsMetric({
  icon: Icon,
  label,
  value,
  suffix,
  tone = "default",
}: {
  icon: typeof Star;
  label: string;
  value: string | number;
  suffix?: string;
  tone?: "default" | "positive" | "negative" | "muted";
}) {
  const toneClass = {
    default: "text-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-rose-600 dark:text-rose-400",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-3">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={`mt-0.5 text-xl font-black ${toneClass}`}>
            {value}
            {suffix && (
              <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                {suffix}
              </span>
            )}
          </p>
        </div>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </CardContent>
    </Card>
  );
}

function npsTone(nps: number): "positive" | "negative" | "muted" {
  if (nps >= 50) return "positive";
  if (nps < 0) return "negative";
  return "muted";
}

function officeNpsColor(nps: number) {
  if (nps >= 50) return "#10b981";
  if (nps < 0) return "#e11d48";
  return "#f59e0b";
}

function classificationClass(classification: CsCxNpsResponse["classification"]) {
  if (classification === "PROMOTOR")
    return "border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (classification === "DETRATOR")
    return "border-rose-200 bg-rose-50 text-[9px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300";
  return "border-amber-200 bg-amber-50 text-[9px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
}

function scoreColor(score: number) {
  if (score <= 6) return "#e11d48";
  if (score <= 8) return "#f59e0b";
  return "#10b981";
}

function matchesDrilldown(response: CsCxNpsResponse, drilldown: NpsDrilldown) {
  if (drilldown.kind === "classification") return response.classification === drilldown.value;
  if (drilldown.kind === "office") return (response.registry_office_id || responseOfficeName(response)) === drilldown.value;
  if (drilldown.kind === "month") return response.responded_at.slice(0, 7) === drilldown.value;
  if (drilldown.kind === "score") return response.score === Number(drilldown.value);
  return response.id === drilldown.value;
}

function responseOfficeName(response: CsCxNpsResponse) {
  return response.registry_office?.name || response.respondent_office || "Cartório não informado";
}

function classificationLabel(classification: CsCxNpsResponse["classification"]) {
  if (classification === "PROMOTOR") return "Promotor";
  if (classification === "DETRATOR") return "Detrator";
  return "Neutro";
}

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function formatResponseDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRankingDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

interface DatedNpsAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
  dateLabel: string;
}

function DatedNpsAxisTick({
  x = 0,
  y = 0,
  payload,
  dateLabel,
}: DatedNpsAxisTickProps) {
  const [rawName = "", date = ""] = String(payload?.value ?? "").split("|");
  const name = rawName.length > 28 ? `${rawName.slice(0, 28)}…` : rawName;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={-4} textAnchor="end" fill="hsl(var(--foreground))" fontSize={9}>
        {name}
      </text>
      <text x={-8} y={7} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={8}>
        {dateLabel}: {date}
      </text>
    </g>
  );
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
