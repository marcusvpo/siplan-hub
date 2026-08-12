import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  Download,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { MarkdownLite } from "@/components/MarkdownLite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type NpsAnalyticsFilters,
} from "@/lib/cs-cx-nps-analytics";
import { generateCsCxNpsAnalysisPdf } from "@/lib/cs-cx-experience-pdf";

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

export function NpsAnalyticsPanel({
  responses,
  canGenerate,
}: NpsAnalyticsPanelProps) {
  const [filters, setFilters] =
    useState<NpsAnalyticsFilters>(EMPTY_NPS_FILTERS);
  const [isExporting, setIsExporting] = useState(false);
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

  const distribution = [
    { name: "Promotores", value: analytics.promoters },
    { name: "Neutros", value: analytics.neutrals },
    { name: "Detratores", value: analytics.detractors },
  ];

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
            <Label className="text-[11px]">Cartório</Label>
            <Select
              value={filters.officeId}
              onValueChange={(officeId) =>
                setFilters((current) => ({ ...current, officeId }))
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cartórios</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              </CardHeader>
              <CardContent className="h-[250px] px-2 pb-2 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.monthly}
                    margin={{ top: 12, right: 20, bottom: 0, left: 0 }}
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
              </CardHeader>
              <CardContent className="h-[250px] px-2 pb-2 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {distribution.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={DISTRIBUTION_COLORS[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2.5 xl:grid-cols-[1.45fr_1fr]">
            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-xs">NPS por cartório</CardTitle>
              </CardHeader>
              <CardContent className="h-[310px] px-2 pb-2 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.byOffice.slice(0, 12)}
                    layout="vertical"
                    margin={{ top: 4, right: 24, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[-100, 100]} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                      tickFormatter={(value: string) =>
                        value.length > 28 ? `${value.slice(0, 28)}…` : value
                      }
                    />
                    <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="nps" name="NPS" fill="#e11d48" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
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
                  <div key={feedback.id} className="rounded-md border p-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-[10px] font-semibold">
                        {feedback.office}
                      </p>
                      <Badge
                        variant="outline"
                        className={classificationClass(feedback.classification)}
                      >
                        Nota {feedback.score}
                      </Badge>
                    </div>
                    <p className="line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
                      {feedback.reason || feedback.suggestion}
                    </p>
                  </div>
                ))}
                {!analytics.feedback.length && (
                  <p className="py-12 text-center text-xs text-muted-foreground">
                    Não há comentários textuais neste recorte.
                  </p>
                )}
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
    </div>
  );
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

function classificationClass(classification: CsCxNpsResponse["classification"]) {
  if (classification === "PROMOTOR")
    return "border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (classification === "DETRATOR")
    return "border-rose-200 bg-rose-50 text-[9px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300";
  return "border-amber-200 bg-amber-50 text-[9px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
