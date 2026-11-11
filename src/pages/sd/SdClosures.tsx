import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck,
  FilterX,
  Loader2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  TimerOff,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Chamado0800DetailsButton } from "@/components/sd/Chamado0800DetailsButton";
import { CsCxMultiSelect } from "@/components/cs-cx/CsCxMultiSelect";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useSdClosuresReport,
  useSyncSdClosures,
  type SdClosureSlaStatus,
  type SdClosuresFilters,
} from "@/hooks/useSdClosures";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SdClosuresReportMode } from "@/modules/pdf/templates/SdClosuresReportTemplate";

const DETAILS_PER_PAGE = 10;

export default function SdClosures() {
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const today = useMemo(() => new Date(), []);
  const initialPeriod = useMemo(() => ({
    startDate: format(subDays(today, 29), "yyyy-MM-dd"),
    endDate: format(today, "yyyy-MM-dd"),
  }), [today]);

  const [startDate, setStartDate] = useState(initialPeriod.startDate);
  const [endDate, setEndDate] = useState(initialPeriod.endDate);
  const [products, setProducts] = useState<string[]>([]);
  const [analysts, setAnalysts] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [reportMode, setReportMode] = useState<SdClosuresReportMode>("consolidated");
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768,
  );
  const [page, setPage] = useState(1);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<SdClosuresFilters>({
    ...initialPeriod,
    products: [],
    analysts: [],
    clients: [],
    groups: [],
  });

  const report = useSdClosuresReport(appliedFilters);
  const { syncClosures, isSyncing } = useSyncSdClosures();
  const data = report.data;
  const metrics = data?.metrics;
  const details = data?.details ?? [];
  const pageCount = Math.max(1, Math.ceil(details.length / DETAILS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const paginatedDetails = details.slice(
    (currentPage - 1) * DETAILS_PER_PAGE,
    currentPage * DETAILS_PER_PAGE,
  );
  const eligibleForSla = (metrics?.within_sla ?? 0) + (metrics?.outside_sla ?? 0);
  const slaRate = eligibleForSla
    ? Math.round(((metrics?.within_sla ?? 0) / eligibleForSla) * 100)
    : 0;
  const hasDimensionFilters = Boolean(
    products.length || analysts.length || clients.length || groups.length,
  );
  const activeFilterCount = products.length + analysts.length + clients.length + groups.length;

  const option = (value: string) => ({ value, label: value });
  const productOptions = useMemo(() => (data?.filters.products ?? []).map(option), [data?.filters.products]);
  const analystOptions = useMemo(() => (data?.filters.analysts ?? []).map(option), [data?.filters.analysts]);
  const clientOptions = useMemo(() => (data?.filters.clients ?? []).map(option), [data?.filters.clients]);
  const groupOptions = useMemo(() => (data?.filters.groups ?? []).map(option), [data?.filters.groups]);

  useEffect(() => setPage(1), [appliedFilters, reportMode]);

  const buildFilters = (): SdClosuresFilters => ({
    startDate,
    endDate,
    products,
    analysts,
    clients,
    groups,
  });

  const applyFilters = async () => {
    if (!startDate || !endDate || endDate < startDate) {
      toast.error("Informe um período de encerramento válido.");
      return;
    }

    const nextFilters = buildFilters();
    setAppliedFilters(nextFilters);

    try {
      await syncClosures(startDate, endDate);
      toast.success("Encerramentos atualizados com os dados do Ellevo.");
    } catch (error) {
      toast.warning(
        error instanceof Error
          ? `${error.message} Exibindo o último espelho disponível.`
          : "Não foi possível atualizar o Ellevo. Exibindo o último espelho disponível.",
      );
    }
  };

  const clearDimensions = () => {
    setProducts([]);
    setAnalysts([]);
    setClients([]);
    setGroups([]);
  };

  const exportPdf = async () => {
    if (!data || !metrics?.total_closed) return;
    setGeneratingPdf(true);
    try {
      const [{ downloadPdfDocument }, { SdClosuresReportTemplate }] = await Promise.all([
        import("@/modules/pdf/services/pdfService"),
        import("@/modules/pdf/templates/SdClosuresReportTemplate"),
      ]);
      await downloadPdfDocument(
        <SdClosuresReportTemplate data={data} filters={appliedFilters} mode={reportMode} />,
        `encerramentos-sd-${reportMode === "consolidated" ? "consolidado" : "analitico"}-${appliedFilters.startDate}-${appliedFilters.endDate}.pdf`,
      );
      toast.success("Relatório PDF gerado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div
      data-testid="sd-closures-page"
      className="mx-auto h-full w-full min-w-0 max-w-7xl space-y-3 overflow-x-hidden overflow-y-auto px-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 md:px-3"
    >
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-background to-slate-50 px-4 py-3 shadow-sm dark:border-rose-950/70 dark:from-rose-950/25 dark:via-background dark:to-slate-950"
      >
        <FileCheck className="pointer-events-none absolute -bottom-8 -right-4 h-28 w-28 text-rose-500/10" />
        <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-1 gap-1 border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
              <CheckCircle2 className="h-3 w-3" /> SD · Ellevo/0800
            </Badge>
            <h1 className="break-words text-xl font-black tracking-tight">Encerramentos</h1>
            <p className="mt-0.5 break-words text-xs text-muted-foreground">
              Chamados fechados por analista, produto, cliente e período, com visão consolidada e analítica.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1.5 bg-background/90 text-xs sm:w-auto"
              disabled={isSyncing}
              onClick={() => void applyFilters()}
            >
              {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isSyncing ? "Atualizando 0800..." : "Atualizar relatório"}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 w-full gap-1.5 text-xs sm:w-auto"
              disabled={!metrics?.total_closed || generatingPdf}
              onClick={() => void exportPdf()}
            >
              {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exportar PDF
            </Button>
          </div>
        </div>
      </motion.section>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card className="min-w-0 overflow-hidden">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-between rounded-none px-3 py-2 text-left hover:bg-muted/50"
              aria-label={filtersOpen ? "Recolher filtros de encerramentos" : "Abrir filtros de encerramentos"}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="rounded-md bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-300">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">Filtros do relatório</span>
                  <span className="block truncate text-[10px] font-normal text-muted-foreground">
                    Encerrados de {format(parseISO(startDate), "dd/MM/yy")} a {format(parseISO(endDate), "dd/MM/yy")}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {activeFilterCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{activeFilterCount} ativo(s)</Badge>}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t">
            <CardContent className="space-y-2 p-2.5">
              <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-[140px_140px_minmax(180px,1fr)_minmax(180px,1fr)]">
                <FilterField label="Data inicial">
                  <Input aria-label="Data inicial dos encerramentos" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="h-9 px-2 text-xs" />
                </FilterField>
                <FilterField label="Data final">
                  <Input aria-label="Data final dos encerramentos" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="h-9 px-2 text-xs" />
                </FilterField>
                <FilterField label="Produtos">
                  <CsCxMultiSelect ariaLabel="Filtrar encerramentos por produto" options={productOptions} values={products} onChange={setProducts} placeholder="Todos os produtos" searchPlaceholder="Buscar produto..." />
                </FilterField>
                <FilterField label="Analistas">
                  <CsCxMultiSelect ariaLabel="Filtrar encerramentos por analista" options={analystOptions} values={analysts} onChange={setAnalysts} placeholder="Todos os analistas" searchPlaceholder="Buscar analista..." />
                </FilterField>
              </div>
              <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(200px,1fr)_auto_auto] xl:items-end">
                <FilterField label="Clientes">
                  <CsCxMultiSelect ariaLabel="Filtrar encerramentos por cliente" options={clientOptions} values={clients} onChange={setClients} placeholder="Todos os clientes" searchPlaceholder="Buscar cliente..." />
                </FilterField>
                <FilterField label="Grupos de atendimento">
                  <CsCxMultiSelect ariaLabel="Filtrar encerramentos por grupo" options={groupOptions} values={groups} onChange={setGroups} placeholder="Todos os grupos" searchPlaceholder="Buscar grupo..." />
                </FilterField>
                <Button type="button" variant="ghost" size="sm" className="h-9 w-full gap-1.5 text-xs xl:w-auto" disabled={!hasDimensionFilters} onClick={clearDimensions}>
                  <FilterX className="h-3.5 w-3.5" /> Limpar seleções
                </Button>
                <Button type="button" size="sm" className="h-9 w-full gap-1.5 text-xs xl:w-auto" disabled={isSyncing} onClick={() => void applyFilters()}>
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Aplicar filtros
                </Button>
              </div>
              <p className="break-words text-[10px] leading-4 text-muted-foreground">
                O período considera a data real de encerramento. Ao aplicar, o HUB solicita ao worker a atualização desse recorte na origem Ellevo e mantém o último espelho disponível como contingência.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={reportMode} onValueChange={(value) => setReportMode(value as SdClosuresReportMode)}>
          <TabsList className="grid h-10 w-full grid-cols-2 p-1 sm:w-[360px]">
            <TabsTrigger value="consolidated" className="gap-1.5 text-xs"><UsersRound className="h-3.5 w-3.5" /> Consolidado</TabsTrigger>
            <TabsTrigger value="analytical" className="gap-1.5 text-xs"><FileCheck className="h-3.5 w-3.5" /> Analítico</TabsTrigger>
          </TabsList>
        </Tabs>
        {(report.isFetching || isSyncing) && (
          <span role="status" aria-live="polite" className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> {isSyncing ? "Sincronizando com o 0800" : "Atualizando indicadores"}
          </span>
        )}
      </div>

      {report.isLoading ? (
        <StateCard icon={<Loader2 className="animate-spin" />} title="Carregando encerramentos" description="Consolidando os dados disponíveis no espelho do Ellevo." />
      ) : report.isError ? (
        <StateCard icon={<TimerOff />} title="Não foi possível carregar o relatório" description="Confirme sua permissão ou tente atualizar novamente." action={<Button size="sm" variant="outline" onClick={() => void report.refetch()}>Tentar novamente</Button>} danger />
      ) : !metrics?.total_closed ? (
        <StateCard icon={<CalendarCheck2 />} title="Nenhum encerramento encontrado" description="Altere o período ou remova parte dos filtros selecionados." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
            <MetricCard label="Encerrados" value={metrics.total_closed} detail={`${metrics.client_count} clientes`} icon={<FileCheck />} />
            <MetricCard label="No prazo" value={metrics.within_sla} detail={`${slaRate}% dos chamados com SLA`} icon={<CheckCircle2 />} tone="success" />
            <MetricCard label="Fora do prazo" value={metrics.outside_sla} detail="encerrados após o vencimento" icon={<TimerOff />} tone="danger" />
            <MetricCard label="Sem vencimento" value={metrics.without_deadline} detail="sem prazo oficial no Ellevo" icon={<CalendarCheck2 />} tone="warning" />
            <MetricCard label="Reabertos" value={metrics.reopened} detail={`${metrics.analyst_count} analistas no recorte`} icon={<RotateCcw />} />
          </div>

          {reportMode === "consolidated" ? (
            <ConsolidatedView data={data!} isMobile={isMobile} onSelectAnalyst={setAnalysts} />
          ) : (
            <AnalyticalView
              details={paginatedDetails}
              isMobile={isMobile}
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function ConsolidatedView({ data, isMobile, onSelectAnalyst }: {
  data: NonNullable<ReturnType<typeof useSdClosuresReport>["data"]>;
  isMobile: boolean;
  onSelectAnalyst: (values: string[]) => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-[1.35fr_0.65fr]">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Encerramentos por analista</CardTitle><p className="text-[11px] text-muted-foreground">Clique em um analista para aplicar o filtro correspondente.</p></CardHeader>
        <CardContent className="min-w-0 p-2 pt-1">
          {isMobile ? (
            <div data-testid="sd-closures-analyst-mobile-list" className="space-y-2">
              {data.by_analyst.map((item) => (
                <button key={`${item.analyst_name}-${item.group_name}`} type="button" className="w-full rounded-lg border p-3 text-left active:bg-muted" onClick={() => onSelectAnalyst([item.analyst_name])}>
                  <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-xs font-semibold">{item.analyst_name}</p><p className="break-words text-[10px] text-muted-foreground">{item.group_name}</p></div><Badge className="shrink-0">{item.total_closed}</Badge></div>
                  <div className="mt-2 grid grid-cols-4 gap-1 border-t pt-2 text-center text-[9px] text-muted-foreground"><span><strong className="block text-xs text-emerald-600">{item.within_sla}</strong>No prazo</span><span><strong className="block text-xs text-red-600">{item.outside_sla}</strong>Fora</span><span><strong className="block text-xs text-amber-600">{item.without_deadline}</strong>Sem venc.</span><span><strong className="block text-xs text-foreground">{item.reopened}</strong>Reabertos</span></div>
                </button>
              ))}
            </div>
          ) : (
            <Table className="text-[11px] [&_td]:px-2 [&_td]:py-2 [&_th]:h-9 [&_th]:px-2 [&_th]:text-[10px]">
              <TableHeader><TableRow><TableHead>Atendente</TableHead><TableHead>Grupo</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Sem venc.</TableHead><TableHead className="text-right">No prazo</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">Fora</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">Reabertos</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.by_analyst.map((item) => (
                  <TableRow key={`${item.analyst_name}-${item.group_name}`} className="cursor-pointer" onClick={() => onSelectAnalyst([item.analyst_name])}>
                    <TableCell className="font-semibold">{item.analyst_name}</TableCell><TableCell className="text-muted-foreground">{item.group_name}</TableCell><TableCell className="text-right font-bold tabular-nums">{item.total_closed}</TableCell><TableCell className="text-right tabular-nums">{item.without_deadline}</TableCell><TableCell className="text-right font-semibold tabular-nums text-emerald-600">{item.within_sla}</TableCell><TableCell className="text-right tabular-nums">{formatPercent(item.within_percent)}</TableCell><TableCell className="text-right font-semibold tabular-nums text-red-600">{item.outside_sla}</TableCell><TableCell className="text-right tabular-nums">{formatPercent(item.outside_percent)}</TableCell><TableCell className="text-right tabular-nums">{item.reopened}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Distribuição por produto</CardTitle><p className="text-[11px] text-muted-foreground">Volume e comportamento do SLA no período.</p></CardHeader>
        <CardContent className="space-y-3 p-3 pt-2">
          {data.by_product.map((item) => {
            const rate = item.total_closed ? (item.within_sla / item.total_closed) * 100 : 0;
            return <div key={item.product} className="space-y-1.5"><div className="flex min-w-0 items-center justify-between gap-3 text-xs"><span className="min-w-0 break-words font-medium">{item.product}</span><span className="shrink-0 font-bold tabular-nums">{item.total_closed}</span></div><Progress value={rate} className="h-1.5" /><p className="text-[10px] text-muted-foreground">{item.within_sla} no prazo · {item.outside_sla} fora · {item.without_deadline} sem vencimento</p></div>;
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticalView({ details, isMobile, currentPage, pageCount, onPageChange }: {
  details: NonNullable<ReturnType<typeof useSdClosuresReport>["data"]>["details"];
  isMobile: boolean;
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Chamados encerrados</CardTitle><p className="text-[11px] text-muted-foreground">Detalhamento por cliente, responsável, datas e cumprimento do SLA.</p></CardHeader>
      <CardContent className="min-w-0 p-2 pt-1">
        {isMobile ? (
          <div data-testid="sd-closures-detail-mobile-list" className="space-y-2">
            {details.map((item) => (
              <article key={item.ticket_number} className="min-w-0 rounded-lg border p-3">
                <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><EllevoTicketLink ticketNumber={item.ticket_number} className="text-[10px] font-bold text-rose-600" /><p className="break-words text-xs font-semibold">{item.ticket_title}</p><p className="break-words text-[10px] text-muted-foreground">{item.client_name}</p></div><Chamado0800DetailsButton ticketNumber={item.ticket_number} variant="outline" className="h-10 w-10 shrink-0" /></div>
                <div className="mt-2 flex flex-wrap gap-1.5"><Badge variant="outline" className="max-w-full whitespace-normal text-left text-[10px]">{item.product}</Badge><SlaBadge status={item.sla_status} /><Badge variant="secondary" className="text-[10px]">{item.analyst_name}</Badge></div>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2 text-[10px] text-muted-foreground"><span><strong className="block text-foreground">Abertura</strong>{formatDateTime(item.opened_at)}</span><span><strong className="block text-foreground">Encerramento</strong>{formatDateTime(item.closed_at)}</span><span><strong className="block text-foreground">Grupo</strong>{item.group_name}</span><span><strong className="block text-foreground">Duração</strong>{formatDuration(item.duration_minutes)}</span></div>
              </article>
            ))}
          </div>
        ) : (
          <Table className="text-[11px] [&_td]:px-2 [&_td]:py-2 [&_th]:h-9 [&_th]:px-2 [&_th]:text-[10px]">
            <TableHeader><TableRow><TableHead>Chamado</TableHead><TableHead>Cliente / título</TableHead><TableHead>Produto</TableHead><TableHead>Analista / grupo</TableHead><TableHead>Abertura</TableHead><TableHead>Encerramento</TableHead><TableHead>Duração</TableHead><TableHead>SLA</TableHead><TableHead className="w-14 text-center">Detalhes</TableHead></TableRow></TableHeader>
            <TableBody>
              {details.map((item) => (
                <TableRow key={item.ticket_number}><TableCell className="font-bold"><EllevoTicketLink ticketNumber={item.ticket_number} /></TableCell><TableCell className="max-w-[320px]"><p className="truncate font-medium" title={item.ticket_title}>{item.ticket_title}</p><p className="truncate text-[10px] text-muted-foreground">{item.client_name}</p></TableCell><TableCell>{item.product}</TableCell><TableCell><p>{item.analyst_name}</p><p className="text-[10px] text-muted-foreground">{item.group_name}</p></TableCell><TableCell className="whitespace-nowrap">{formatDateTime(item.opened_at)}</TableCell><TableCell className="whitespace-nowrap">{formatDateTime(item.closed_at)}</TableCell><TableCell className="whitespace-nowrap">{formatDuration(item.duration_minutes)}</TableCell><TableCell><SlaBadge status={item.sla_status} /></TableCell><TableCell className="text-center"><Chamado0800DetailsButton ticketNumber={item.ticket_number} className="h-8 w-8" /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination currentPage={currentPage} pageCount={pageCount} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="min-w-0 space-y-1 [&_[role=combobox]]:h-9 [&_[role=combobox]]:w-full [&_[role=combobox]]:px-2 [&_[role=combobox]]:text-xs"><span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}

function MetricCard({ label, value, detail, icon, tone = "default" }: { label: string; value: number; detail: string; icon: React.ReactElement; tone?: "default" | "success" | "danger" | "warning" }) {
  const tones = { default: "bg-rose-500/10 text-rose-600", success: "bg-emerald-500/10 text-emerald-600", danger: "bg-red-500/10 text-red-600", warning: "bg-amber-500/10 text-amber-600" };
  return <Card className="min-w-0"><CardContent className="flex items-start justify-between gap-2 p-3"><div className="min-w-0"><p className="truncate text-[10px] font-medium text-muted-foreground">{label}</p><p className="text-xl font-black leading-7 tabular-nums">{value}</p><p className="break-words text-[10px] leading-4 text-muted-foreground">{detail}</p></div><span className={`shrink-0 rounded-md p-1.5 [&>svg]:h-4 [&>svg]:w-4 ${tones[tone]}`}>{icon}</span></CardContent></Card>;
}

function StateCard({ icon, title, description, action, danger = false }: { icon: React.ReactElement; title: string; description: string; action?: React.ReactNode; danger?: boolean }) {
  return <Card className={danger ? "border-destructive/40" : undefined}><CardContent className="flex flex-col items-center gap-2 py-16 text-center"><span className={`[&>svg]:h-8 [&>svg]:w-8 ${danger ? "text-destructive" : "text-muted-foreground"}`}>{icon}</span><p className="font-semibold">{title}</p><p className="max-w-lg break-words text-sm text-muted-foreground">{description}</p>{action}</CardContent></Card>;
}

function SlaBadge({ status }: { status: SdClosureSlaStatus }) {
  const config = status === "within"
    ? { label: "No prazo", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" }
    : status === "outside"
      ? { label: "Fora do prazo", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" }
      : { label: "Sem vencimento", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300" };
  return <Badge variant="outline" className={`whitespace-nowrap text-[10px] ${config.className}`}>{config.label}</Badge>;
}

function Pagination({ currentPage, pageCount, onPageChange }: { currentPage: number; pageCount: number; onPageChange: (page: number) => void }) {
  return <div className="mt-2 flex items-center justify-between gap-2 border-t px-1 py-2 text-[10px] text-muted-foreground sm:justify-end"><span>Página {currentPage} de {pageCount}</span><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Página anterior dos encerramentos" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Próxima página dos encerramentos" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button></div>;
}

function formatPercent(value: number) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return "—";
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${rest}min`;
  return `${rest}min`;
}
