import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileDown,
  Loader2,
  MessageSquareText,
  Timer,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAllChamados,
  type Chamado0800,
  type ChamadosSearchFilters,
  useChamadoTramites,
} from "@/hooks/useChamados0800";
import {
  buildTicketFlowAnalysis,
  chronologicalTramites,
  elapsedHours,
  formatSlaDuration,
  getResolutionSlaState,
  parseSlaDate,
} from "@/lib/tickets-sla";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import { generateTicketSlaDetailPdf } from "@/lib/tickets-sla-detail-pdf";
import { generateTicketsSlaReportPdf } from "@/lib/tickets-sla-report-pdf";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TicketsSlaAnalysisProps {
  active: boolean;
  filterKey: string;
  syncedAt?: number;
  syncing: boolean;
  filters: Omit<ChamadosSearchFilters, "page" | "pageSize">;
  reportFilters: ChamadosReportFilters;
}

type SlaCardFilter = "all" | "within" | "outside" | "inProgress";

function formatDateTime(value?: string): string {
  const date = parseSlaDate(value);
  if (!date) return "—";
  const hasTime = Boolean(value && !/^\d{4}-\d{2}-\d{2}$/.test(value));
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(hasTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

function TicketSlaRow({
  chamado,
  resolutionDays,
  firstResponseHours,
}: {
  chamado: Chamado0800;
  resolutionDays: number;
  firstResponseHours: number;
}) {
  const [open, setOpen] = useState(false);
  const [generatingDetailPdf, setGeneratingDetailPdf] = useState(false);
  const { tramites, isLoading, error } = useChamadoTramites(chamado.numeroChamado, open);
  const timeline = useMemo(() => chronologicalTramites(tramites), [tramites]);
  const flowAnalysis = useMemo(
    () => buildTicketFlowAnalysis(chamado, timeline),
    [chamado, timeline],
  );
  const resolution = getResolutionSlaState(chamado, resolutionDays);
  const openedAt = parseSlaDate(chamado.abertoEm || chamado.dataAbertura);
  const firstResponse = timeline.find((item) => (
    parseSlaDate(item.dataTramite)
    && Boolean(item.responsavel || item.equipeResponsavel || item.atividade)
  ));
  const firstResponseElapsed = elapsedHours(openedAt, parseSlaDate(firstResponse?.dataTramite));
  const firstResponseWithin = firstResponseElapsed !== null
    && firstResponseElapsed <= firstResponseHours;

  const gaps = timeline.map((item, index) => {
    const current = parseSlaDate(item.dataTramite);
    const previous = index === 0
      ? openedAt
      : parseSlaDate(timeline[index - 1]?.dataTramite);
    return elapsedHours(previous, current);
  });
  const largestGap = gaps.reduce<number | null>(
    (largest, gap) => gap !== null && (largest === null || gap > largest) ? gap : largest,
    null,
  );

  const handleGenerateDetailPdf = async () => {
    setGeneratingDetailPdf(true);
    const toastId = `ticket-sla-detail-${chamado.numeroChamado}`;
    try {
      toast.loading(`Montando análise detalhada do chamado #${chamado.numeroChamado}...`, { id: toastId });
      await generateTicketSlaDetailPdf(chamado, timeline, {
        firstResponseHours,
        resolutionDays,
      });
      toast.success("Relatório detalhado gerado.", { id: toastId });
    } catch (pdfError) {
      console.error("Erro ao gerar relatório detalhado do chamado:", pdfError);
      toast.error(
        pdfError instanceof Error ? pdfError.message : "Não foi possível gerar o relatório detalhado.",
        { id: toastId },
      );
    } finally {
      setGeneratingDetailPdf(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card transition-colors hover:bg-muted/20">
        <CollapsibleTrigger asChild>
          <button type="button" className="grid w-full min-w-[900px] grid-cols-[28px_90px_minmax(220px,1fr)_120px_120px_110px_120px] items-center gap-2 px-3 py-2 text-left text-xs">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            <span className="font-mono font-semibold text-primary">#{chamado.numeroChamado}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold" title={chamado.nomeCliente}>{chamado.nomeCliente || "—"}</span>
              <span className="block truncate text-[10px] text-muted-foreground" title={chamado.titulo}>{chamado.titulo || "—"}</span>
            </span>
            <span>{formatDateTime(chamado.abertoEm || chamado.dataAbertura)}</span>
            <span>{formatDateTime(chamado.encerradoEm || chamado.dataEncerramento)}</span>
            <span className="font-medium">{formatSlaDuration(resolution.hours)}</span>
            <Badge className={cn("w-fit border-0 text-[9px]", resolution.className)}>{resolution.label}</Badge>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t bg-muted/10 px-4 py-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando trâmites...
              </div>
            ) : error ? (
              <p className="py-6 text-center text-xs text-destructive">Não foi possível carregar os trâmites.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">Análise do fluxo do atendimento</p>
                    <p className="text-[10px] text-muted-foreground">Tempos estimados pela equipe registrada em cada trâmite.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-[10px]"
                    onClick={handleGenerateDetailPdf}
                    disabled={generatingDetailPdf}
                  >
                    {generatingDetailPdf
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <FileDown className="h-3 w-3" />}
                    {generatingDetailPdf ? "Gerando..." : "Relatório detalhado"}
                  </Button>
                </div>

                <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-md border bg-background p-2.5">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Primeiro atendimento</p>
                    <p className="mt-1 text-sm font-bold">{formatSlaDuration(firstResponseElapsed)}</p>
                    <Badge className={cn(
                      "mt-1 border-0 text-[9px]",
                      firstResponseElapsed === null
                        ? "bg-muted text-muted-foreground"
                        : firstResponseWithin
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700",
                    )}>
                      {firstResponseElapsed === null
                        ? "Sem trâmite de atendimento"
                        : firstResponseWithin ? "Dentro do SLA" : "Fora do SLA"}
                    </Badge>
                  </div>
                  <div className="rounded-md border bg-background p-2.5">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Maior intervalo</p>
                    <p className="mt-1 text-sm font-bold">{formatSlaDuration(largestGap)}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Entre abertura e trâmites consecutivos</p>
                  </div>
                  <div className="rounded-md border bg-background p-2.5">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Transferências</p>
                    <p className="mt-1 text-sm font-bold">{flowAnalysis.transfers.length}</p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground" title={flowAnalysis.longestTransfer ? `${flowAnalysis.longestTransfer.fromArea} → ${flowAnalysis.longestTransfer.toArea}` : undefined}>
                      {flowAnalysis.longestTransfer
                        ? `Maior: ${formatSlaDuration(flowAnalysis.longestTransfer.waitHours)}`
                        : "Nenhuma troca de área"}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background p-2.5">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Maior permanência</p>
                    <p className="mt-1 truncate text-sm font-bold" title={flowAnalysis.bottleneck?.area}>{flowAnalysis.bottleneck?.area || "—"}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatSlaDuration(flowAnalysis.bottleneck?.hours ?? null)}</p>
                  </div>
                  <div className="rounded-md border bg-background p-2.5">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Movimentações</p>
                    <p className="mt-1 text-sm font-bold">{timeline.length}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Trâmites sincronizados</p>
                  </div>
                </div>

                <div className="mb-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold"><Building2 className="h-3.5 w-3.5 text-primary" />Tempo acumulado por área</h3>
                    <div className="mt-2 space-y-2">
                      {flowAnalysis.areaTimes.map((area) => {
                        const participation = flowAnalysis.totalTrackedHours > 0
                          ? Math.round((area.hours / flowAnalysis.totalTrackedHours) * 100)
                          : 0;
                        return (
                          <div key={area.area}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-[10px]">
                              <span className="truncate font-medium" title={area.area}>{area.area}</span>
                              <span className="shrink-0 font-semibold">{formatSlaDuration(area.hours)} · {participation}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(participation, 1)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-background p-3">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold"><ArrowRight className="h-3.5 w-3.5 text-primary" />Transferências entre áreas</h3>
                    <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Estimativa entre o último trâmite da origem e o primeiro da área de destino; o Ellevo não registra envio e aceite separadamente.</p>
                    {flowAnalysis.transfers.length === 0 ? (
                      <p className="py-5 text-center text-[10px] text-muted-foreground">Nenhuma troca de área identificada.</p>
                    ) : (
                      <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto pr-1">
                        {flowAnalysis.transfers.map((transfer, index) => (
                          <div key={`${transfer.transferredAt}-${index}`} className="rounded-md border bg-muted/20 p-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                              <span>{transfer.fromArea}</span>
                              <ArrowRight className="h-3 w-3 text-primary" />
                              <span>{transfer.toArea}</span>
                              <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[9px]">{formatSlaDuration(transfer.waitHours)}</Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground">
                              <span>{formatDateTime(transfer.transferredAt)}</span>
                              {transfer.activity && <span>{transfer.activity}</span>}
                              {transfer.responsible && <span>{transfer.responsible}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {timeline.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Nenhum trâmite sincronizado.</p>
                ) : (
                  <div className="relative ml-2 border-l border-border pl-5">
                    {timeline.map((tramite, index) => (
                      <div key={tramite.sequenciaTramite} className="relative pb-4 last:pb-0">
                        <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[11px] font-semibold">{formatDateTime(tramite.dataTramite)}</span>
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                            +{formatSlaDuration(gaps[index] ?? null)}
                          </Badge>
                          {tramite.atividade && <span className="text-[10px] text-muted-foreground">{tramite.atividade}</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                          {tramite.responsavel && <span className="flex items-center gap-1"><UserRound className="h-3 w-3" />{tramite.responsavel}</span>}
                          {tramite.equipeResponsavel && <span>{tramite.equipeResponsavel}</span>}
                        </div>
                        {tramite.descricao && (
                          <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-background p-2 text-[11px] leading-relaxed text-foreground/90">
                            {tramite.descricao}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function TicketsSlaAnalysis({
  active,
  filterKey,
  syncedAt,
  syncing,
  filters,
  reportFilters,
}: TicketsSlaAnalysisProps) {
  const [firstResponseHours, setFirstResponseHours] = useState(8);
  const [resolutionDays, setResolutionDays] = useState(5);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [slaCardFilter, setSlaCardFilter] = useState<SlaCardFilter>("all");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["ticketsSlaAnalysis", filterKey, syncedAt],
    enabled: active && !syncing,
    staleTime: 30_000,
    queryFn: () => fetchAllChamados(filters),
  });

  const metrics = useMemo(() => rows.reduce((summary, chamado) => {
    const state = getResolutionSlaState(chamado, resolutionDays);
    if (state.label === "Dentro do SLA") summary.within += 1;
    if (state.label === "Fora do SLA" || state.label === "SLA estourado") summary.outside += 1;
    if (state.label === "SLA em curso") summary.inProgress += 1;
    return summary;
  }, { within: 0, outside: 0, inProgress: 0 }), [resolutionDays, rows]);

  const filteredRows = useMemo(() => rows.filter((chamado) => {
    if (slaCardFilter === "all") return true;
    const state = getResolutionSlaState(chamado, resolutionDays);
    if (slaCardFilter === "within") return state.label === "Dentro do SLA";
    if (slaCardFilter === "outside") {
      return state.label === "Fora do SLA" || state.label === "SLA estourado";
    }
    return state.label === "SLA em curso";
  }), [resolutionDays, rows, slaCardFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filterKey, resolutionDays, slaCardFilter]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleGeneratePdf = async () => {
    if (filteredRows.length === 0) {
      toast.info("Nenhum chamado encontrado para gerar o relatório de SLA.");
      return;
    }

    setGeneratingPdf(true);
    const toastId = "tickets-sla-report-pdf";
    try {
      toast.loading("Montando o relatório de tempos e SLA...", { id: toastId });
      await generateTicketsSlaReportPdf(filteredRows, {
        ...reportFilters,
        firstResponseHours,
        resolutionDays,
        slaClassification: {
          all: "Todos",
          within: "Dentro do SLA",
          outside: "Fora / estourado",
          inProgress: "SLA em curso",
        }[slaCardFilter],
      });
      toast.success(`Relatório de SLA gerado com ${filteredRows.length} chamado(s).`, { id: toastId });
    } catch (pdfError) {
      console.error("Erro ao gerar relatório de SLA:", pdfError);
      toast.error(
        pdfError instanceof Error ? pdfError.message : "Não foi possível gerar o relatório de SLA.",
        { id: toastId },
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="border-muted/80 shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-3 p-3">
          <div className="mr-auto min-w-[260px]">
            <h2 className="flex items-center gap-1.5 text-sm font-bold"><Timer className="h-4 w-4 text-primary" />Tempos de atendimento e SLA</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Cálculo em horas e dias corridos. Ajuste os limites conforme o contrato analisado.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[10px]"
            onClick={handleGeneratePdf}
            disabled={generatingPdf || syncing || isLoading || filteredRows.length === 0}
          >
            {generatingPdf
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <FileDown className="h-3 w-3" />}
            {generatingPdf ? "Gerando PDF..." : "Relatório SLA"}
          </Button>
          <label className="space-y-1 text-[10px] font-medium text-muted-foreground">
            SLA primeiro atendimento (horas)
            <Input type="number" min={1} max={720} value={firstResponseHours} onChange={(event) => setFirstResponseHours(Math.max(1, Number(event.target.value) || 1))} className="h-7 w-28 text-xs" />
          </label>
          <label className="space-y-1 text-[10px] font-medium text-muted-foreground">
            SLA resolução (dias)
            <Input type="number" min={1} max={365} value={resolutionDays} onChange={(event) => setResolutionDays(Math.max(1, Number(event.target.value) || 1))} className="h-7 w-24 text-xs" />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-4">
        {[
          { filter: "all" as const, label: "Chamados analisados", value: rows.length, icon: MessageSquareText, color: "text-primary" },
          { filter: "within" as const, label: "Dentro do SLA", value: metrics.within, icon: CheckCircle2, color: "text-emerald-600" },
          { filter: "outside" as const, label: "Fora/estourado", value: metrics.outside, icon: CircleAlert, color: "text-rose-600" },
          { filter: "inProgress" as const, label: "SLA em curso", value: metrics.inProgress, icon: Clock3, color: "text-blue-600" },
        ].map((item) => (
          <button
            key={item.filter}
            type="button"
            aria-pressed={slaCardFilter === item.filter}
            aria-label={`Filtrar por ${item.label}`}
            onClick={() => setSlaCardFilter(item.filter)}
            className="rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Card className={cn(
              "h-full cursor-pointer border-muted/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              slaCardFilter === item.filter && "border-primary/70 bg-primary/[0.03] ring-1 ring-primary/25",
            )}>
              <CardContent className="flex items-center gap-2 p-3">
                <item.icon className={cn("h-4 w-4", item.color)} />
                <div><p className="text-base font-bold leading-none">{item.value}</p><p className="mt-1 text-[9px] text-muted-foreground">{item.label}</p></div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card className="border-muted/80 shadow-sm">
        <CardContent className="overflow-x-auto p-3">
          <div className="mb-1 grid min-w-[900px] grid-cols-[28px_90px_minmax(220px,1fr)_120px_120px_110px_120px] gap-2 px-3 text-[9px] font-semibold uppercase text-muted-foreground">
            <span /><span>Chamado</span><span>Cliente / título</span><span>Abertura</span><span>Encerramento</span><span>Duração</span><span>SLA resolução</span>
          </div>

          {syncing || isLoading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando análise...</div>
          ) : error ? (
            <p className="py-14 text-center text-xs text-destructive">Não foi possível carregar os chamados para análise.</p>
          ) : rows.length === 0 ? (
            <p className="py-14 text-center text-xs text-muted-foreground">Nenhum chamado encontrado no filtro atual.</p>
          ) : filteredRows.length === 0 ? (
            <p className="py-14 text-center text-xs text-muted-foreground">Nenhum chamado encontrado nesta classificação de SLA.</p>
          ) : (
            <div className="space-y-1.5">
              {visibleRows.map((chamado) => (
                <TicketSlaRow key={chamado.numeroChamado} chamado={chamado} resolutionDays={resolutionDays} firstResponseHours={firstResponseHours} />
              ))}
            </div>
          )}

          {filteredRows.length > 0 && (
            <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t pt-3 text-[10px] text-muted-foreground sm:flex-row">
              <span>Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} de {filteredRows.length}</span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Exibir</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[68px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 25, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>por página</span>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <span>Página <strong className="text-foreground">{page}</strong> de {totalPages}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
