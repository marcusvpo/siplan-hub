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
  FileSearch,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  Timer,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAllChamados,
  fetchChamadosTramites,
  type Chamado0800,
  type ChamadosSearchFilters,
  useChamadoTramites,
} from "@/hooks/useChamados0800";
import {
  buildTicketFlowAnalysis,
  chronologicalTramites,
  elapsedHours,
  formatSlaDuration,
  getOfficialSlaState,
  getSlaCheckpointDisplay,
  parseSlaDate,
  type TicketAreaStage,
  type SlaCheckpointDisplay,
} from "@/lib/tickets-sla";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import { generateTicketSlaDetailPdf } from "@/lib/tickets-sla-detail-pdf";
import { generateTicketsSlaAnalyticalReportPdf } from "@/lib/tickets-sla-analytical-report-pdf";
import { generateTicketsSlaReportPdf } from "@/lib/tickets-sla-report-pdf";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TicketsSlaInfoDialog } from "./TicketsSlaInfoDialog";

interface TicketsSlaAnalysisProps {
  active: boolean;
  filterKey: string;
  syncedAt?: number;
  syncing: boolean;
  filters: Omit<ChamadosSearchFilters, "page" | "pageSize">;
  reportFilters: ChamadosReportFilters;
}

type SlaCardFilter =
  | "all"
  | "firstWithin"
  | "firstOutside"
  | "resolutionWithin"
  | "resolutionOutside"
  | "inProgress"
  | "unavailable";

const SLA_FILTER_LABELS: Record<SlaCardFilter, string> = {
  all: "Todos",
  firstWithin: "1ª resposta no prazo",
  firstOutside: "1ª resposta fora do SLA",
  resolutionWithin: "Resolução no prazo",
  resolutionOutside: "Resolução fora do SLA",
  inProgress: "SLA em curso ou pausado",
  unavailable: "Sem SLA na origem",
};

const MAX_ANALYTICAL_REPORT_TICKETS = 250;

function formatDateTime(value?: string | Date | null): string {
  const date = value instanceof Date ? value : parseSlaDate(value || undefined);
  if (!date) return "—";
  const hasTime = value instanceof Date || Boolean(value && !/^\d{4}-\d{2}-\d{2}$/.test(value));
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(hasTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

function matchesSlaCardFilter(chamado: Chamado0800, filter: SlaCardFilter) {
  if (filter === "all") return true;
  const sla = getOfficialSlaState(chamado);
  if (filter === "firstWithin") return sla.firstResponse.status === "met";
  if (filter === "firstOutside") return sla.firstResponse.status === "breached";
  if (filter === "resolutionWithin") return sla.resolution.status === "met";
  if (filter === "resolutionOutside") return sla.resolution.status === "breached";
  if (filter === "inProgress") {
    return (
      sla.firstResponse.status === "pending" ||
      sla.resolution.status === "pending" ||
      sla.resolution.status === "paused"
    );
  }
  return sla.classification === "unavailable";
}

function SlaCheckpointCell({
  display,
  deadline,
}: {
  display: SlaCheckpointDisplay;
  deadline: Date | null;
}) {
  return (
    <span className="min-w-0">
      <Badge className={cn("w-fit border-0 text-[9px]", display.className)}>
        {display.label}
      </Badge>
      <span
        className="mt-0.5 block truncate text-[9px] text-muted-foreground"
        title={deadline ? formatDateTime(deadline) : undefined}
      >
        {deadline ? `até ${formatDateTime(deadline)}` : "Prazo não informado"}
      </span>
    </span>
  );
}

const AREA_STAGE_OUTCOME: Record<TicketAreaStage["outcome"], {
  label: string;
  className: string;
}> = {
  handedOffBeforeDeadline: {
    label: "Repasse antes do vencimento",
    className: "bg-emerald-100 text-emerald-700",
  },
  handedOffAfterDeadline: {
    label: "Repasse após o vencimento",
    className: "bg-rose-100 text-rose-700",
  },
  resolvedWithin: {
    label: "Resolvido no prazo",
    className: "bg-emerald-100 text-emerald-700",
  },
  resolvedOutside: {
    label: "Resolvido fora do SLA",
    className: "bg-rose-100 text-rose-700",
  },
  activeWithin: {
    label: "Etapa atual dentro do prazo",
    className: "bg-blue-100 text-blue-700",
  },
  activeOutside: {
    label: "SLA vencido na etapa atual",
    className: "bg-rose-100 text-rose-700",
  },
  activePaused: {
    label: "Etapa atual pausada",
    className: "bg-violet-100 text-violet-700",
  },
  unavailable: {
    label: "Sem comparação disponível",
    className: "bg-muted text-muted-foreground",
  },
};

function AreaJourneyRow({ stage, visit }: { stage: TicketAreaStage; visit: number }) {
  const outcome = AREA_STAGE_OUTCOME[stage.outcome];
  return (
    <div className="grid gap-2 border-b px-3 py-2 last:border-0 md:grid-cols-[minmax(150px,1fr)_190px_90px_minmax(220px,1.2fr)] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold" title={stage.area}>{stage.area}</p>
        <p className="text-[8px] text-muted-foreground">Passagem {visit}</p>
      </div>
      <p className="text-[9px] text-muted-foreground">
        {formatDateTime(stage.startedAt)} → {stage.endKind === "current" ? "agora" : formatDateTime(stage.endedAt)}
      </p>
      <p className="text-[10px] font-semibold">{formatSlaDuration(stage.hours)}</p>
      <div className="flex flex-wrap items-center gap-1">
        <Badge className={cn("h-4 border-0 px-1.5 text-[8px]", outcome.className)}>
          {outcome.label}
        </Badge>
        {stage.firstResponseStatus && (
          <Badge className={cn(
            "h-4 border-0 px-1.5 text-[8px]",
            stage.firstResponseStatus === "met"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700",
          )}>
            1ª resposta {stage.firstResponseStatus === "met" ? "no prazo" : "fora do SLA"}
          </Badge>
        )}
      </div>
    </div>
  );
}

function TicketSlaRow({
  chamado,
}: {
  chamado: Chamado0800;
}) {
  const [open, setOpen] = useState(false);
  const [generatingDetailPdf, setGeneratingDetailPdf] = useState(false);
  const { tramites, isLoading, error } = useChamadoTramites(chamado.numeroChamado, open);
  const timeline = useMemo(() => chronologicalTramites(tramites), [tramites]);
  const flowAnalysis = useMemo(
    () => buildTicketFlowAnalysis(chamado, timeline),
    [chamado, timeline],
  );
  const areaStagesWithVisits = useMemo(() => {
    const visits = new Map<string, number>();
    return flowAnalysis.areaStages.map((stage) => {
      const visit = (visits.get(stage.area) || 0) + 1;
      visits.set(stage.area, visit);
      return { stage, visit };
    });
  }, [flowAnalysis.areaStages]);
  const sla = getOfficialSlaState(chamado);
  const firstResponseDisplay = getSlaCheckpointDisplay(
    sla.firstResponse,
    "firstResponse",
  );
  const resolutionDisplay = getSlaCheckpointDisplay(
    sla.resolution,
    "resolution",
  );
  const openedAt = parseSlaDate(chamado.abertoEm || chamado.dataAbertura);
  const firstResponseElapsed = elapsedHours(openedAt, sla.firstResponse.completedAt);

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
      await generateTicketSlaDetailPdf(chamado, timeline);
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
          <button type="button" className="grid w-full min-w-[1040px] grid-cols-[28px_85px_minmax(210px,1fr)_112px_112px_90px_125px_125px] items-center gap-2 px-3 py-2 text-left text-xs">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            <span className="font-mono font-semibold text-primary">#{chamado.numeroChamado}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold" title={chamado.nomeCliente}>{chamado.nomeCliente || "—"}</span>
              <span className="block truncate text-[10px] text-muted-foreground" title={chamado.titulo}>{chamado.titulo || "—"}</span>
            </span>
            <span>{formatDateTime(chamado.abertoEm || chamado.dataAbertura)}</span>
            <span>{formatDateTime(chamado.encerradoEm || chamado.dataEncerramento)}</span>
            <span className="font-medium">{formatSlaDuration(sla.hours)}</span>
            <SlaCheckpointCell
              display={firstResponseDisplay}
              deadline={sla.firstResponse.deadline}
            />
            <SlaCheckpointCell
              display={resolutionDisplay}
              deadline={sla.resolution.deadline}
            />
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

                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span><strong className="text-foreground">Criticidade:</strong> {chamado.criticidade || "Não informada"}</span>
                  <span><strong className="text-foreground">Equipe atual:</strong> {chamado.equipeResponsavel || "Não informada"}</span>
                  {chamado.slaVencimentoManual && <Badge className="border-0 bg-amber-100 text-[9px] text-amber-800">Vencimento ajustado manualmente no Ellevo</Badge>}
                </div>

                <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-md border bg-background p-2.5">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Primeira resposta</p>
                    <p className="mt-1 text-sm font-bold">{formatSlaDuration(firstResponseElapsed)}</p>
                    <Badge className={cn("mt-1 border-0 text-[9px]", firstResponseDisplay.className)}>
                      {firstResponseDisplay.label}
                    </Badge>
                    <p className="mt-1 text-[9px] text-muted-foreground">Prazo: {formatDateTime(sla.firstResponse.deadline)}</p>
                  </div>
                  <div className="rounded-md border bg-background p-2.5">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">SLA de resolução</p>
                    <p className="mt-1 truncate text-sm font-bold" title={sla.phaseLabel}>{sla.phaseLabel}</p>
                    <Badge className={cn("mt-1 border-0 text-[9px]", resolutionDisplay.className)}>{resolutionDisplay.label}</Badge>
                    <p className="mt-1 text-[9px] text-muted-foreground">Vencimento: {formatDateTime(sla.resolution.deadline)}</p>
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

                <div className="mb-4 overflow-hidden rounded-lg border bg-background">
                  <div className="flex flex-col gap-1 border-b bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Jornada setorial do SLA
                      </h3>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                        Indica onde ocorreram a primeira resposta, os repasses e o encerramento em relação ao vencimento oficial atualmente conhecido.
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit border-amber-300 bg-amber-50 text-[8px] text-amber-800">
                      Indicativo — não é SLA oficial por setor
                    </Badge>
                  </div>
                  <div className="hidden grid-cols-[minmax(150px,1fr)_190px_90px_minmax(220px,1.2fr)] gap-2 border-b px-3 py-1.5 text-[8px] font-semibold uppercase text-muted-foreground md:grid">
                    <span>Área/setor</span><span>Período estimado</span><span>Permanência</span><span>Situação na saída/etapa atual</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {areaStagesWithVisits.map(({ stage, visit }, index) => (
                      <AreaJourneyRow
                        key={`${stage.area}-${stage.startedAt?.toISOString() || index}`}
                        stage={stage}
                        visit={visit}
                      />
                    ))}
                  </div>
                  <p className="border-t bg-muted/20 px-3 py-1.5 text-[8px] leading-relaxed text-muted-foreground">
                    O prazo histórico no instante de cada transferência não é fornecido pelo espelho atual. Por isso, os repasses são comparados ao vencimento vigente hoje; se o Ellevo recalculou ou ajustou o prazo depois, a atribuição setorial pode mudar.
                  </p>
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [slaCardFilter, setSlaCardFilter] = useState<SlaCardFilter>("all");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingAnalyticalPdf, setGeneratingAnalyticalPdf] = useState(false);
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["ticketsSlaAnalysis", filterKey, syncedAt],
    enabled: active && !syncing,
    staleTime: 30_000,
    queryFn: () => fetchAllChamados(filters),
  });

  const metrics = useMemo(() => rows.reduce((summary, chamado) => {
    const state = getOfficialSlaState(chamado);
    if (state.firstResponse.status === "met") summary.firstWithin += 1;
    if (state.firstResponse.status === "breached") summary.firstOutside += 1;
    if (state.resolution.status === "met") summary.resolutionWithin += 1;
    if (state.resolution.status === "breached") summary.resolutionOutside += 1;
    if (
      state.firstResponse.status === "pending" ||
      state.resolution.status === "pending" ||
      state.resolution.status === "paused"
    ) {
      summary.inProgress += 1;
    }
    if (state.classification === "unavailable") summary.unavailable += 1;
    return summary;
  }, {
    firstWithin: 0,
    firstOutside: 0,
    resolutionWithin: 0,
    resolutionOutside: 0,
    inProgress: 0,
    unavailable: 0,
  }), [rows]);

  const filteredRows = useMemo(() => rows.filter((chamado) => {
    return matchesSlaCardFilter(chamado, slaCardFilter);
  }), [rows, slaCardFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filterKey, slaCardFilter]);

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
        slaClassification: SLA_FILTER_LABELS[slaCardFilter],
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

  const handleGenerateAnalyticalPdf = async () => {
    if (filteredRows.length === 0) {
      toast.info("Nenhum chamado encontrado para gerar o relatório SLA analítico.");
      return;
    }
    if (filteredRows.length > MAX_ANALYTICAL_REPORT_TICKETS) {
      toast.warning(
        `O relatório analítico aceita até ${MAX_ANALYTICAL_REPORT_TICKETS} chamados por vez. Refine os filtros ou selecione um card de SLA.`,
      );
      return;
    }

    setGeneratingAnalyticalPdf(true);
    const toastId = "tickets-sla-analytical-report-pdf";
    try {
      toast.loading(`Carregando os trâmites de ${filteredRows.length} chamado(s)...`, { id: toastId });
      const tramitesPorChamado = await fetchChamadosTramites(
        filteredRows.map((chamado) => chamado.numeroChamado),
      );
      toast.loading("Montando o relatório SLA analítico...", { id: toastId });
      await generateTicketsSlaAnalyticalReportPdf(
        filteredRows.map((chamado) => ({
          chamado,
          tramites: tramitesPorChamado.get(chamado.numeroChamado) ?? [],
        })),
        {
          ...reportFilters,
          slaClassification: SLA_FILTER_LABELS[slaCardFilter],
        },
      );
      toast.success(
        `Relatório SLA analítico gerado com ${filteredRows.length} chamado(s).`,
        { id: toastId },
      );
    } catch (pdfError) {
      console.error("Erro ao gerar relatório SLA analítico:", pdfError);
      toast.error(
        pdfError instanceof Error
          ? pdfError.message
          : "Não foi possível gerar o relatório SLA analítico.",
        { id: toastId },
      );
    } finally {
      setGeneratingAnalyticalPdf(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="border-muted/80 shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-3 p-3">
          <div className="mr-auto min-w-[260px]">
            <div className="flex items-center gap-1">
              <h2 className="flex items-center gap-1.5 text-sm font-bold"><Timer className="h-4 w-4 text-primary" />Tempos de atendimento e SLA</h2>
              <TicketsSlaInfoDialog chamados={rows} />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Prazos e pausas sincronizados da origem; não podem ser alterados nesta tela.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[10px]"
            onClick={handleGenerateAnalyticalPdf}
            disabled={generatingAnalyticalPdf || generatingPdf || syncing || isLoading || filteredRows.length === 0}
            title={`Detalha até ${MAX_ANALYTICAL_REPORT_TICKETS} chamados por relatório`}
          >
            {generatingAnalyticalPdf
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <FileSearch className="h-3 w-3" />}
            {generatingAnalyticalPdf ? "Gerando analítico..." : "Relatório SLA (Analítico)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[10px]"
            onClick={handleGeneratePdf}
            disabled={generatingPdf || generatingAnalyticalPdf || syncing || isLoading || filteredRows.length === 0}
          >
            {generatingPdf
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <FileDown className="h-3 w-3" />}
            {generatingPdf ? "Gerando PDF..." : "Relatório SLA"}
          </Button>
          <div className="flex h-9 items-center gap-2 rounded-md border bg-emerald-50 px-3 text-[10px] text-emerald-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span><strong>SLA automático do Ellevo</strong><br />Criticidade, equipe, calendário e pausas oficiais</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { filter: "all" as const, label: "Chamados analisados", value: rows.length, icon: MessageSquareText, color: "text-primary" },
          { filter: "firstWithin" as const, label: "1ª resposta no prazo", value: metrics.firstWithin, icon: CheckCircle2, color: "text-emerald-600" },
          { filter: "firstOutside" as const, label: "1ª resposta fora", value: metrics.firstOutside, icon: CircleAlert, color: "text-rose-600" },
          { filter: "resolutionWithin" as const, label: "Resolução no prazo", value: metrics.resolutionWithin, icon: CheckCircle2, color: "text-emerald-600" },
          { filter: "resolutionOutside" as const, label: "Resolução fora", value: metrics.resolutionOutside, icon: CircleAlert, color: "text-rose-600" },
          { filter: "inProgress" as const, label: "Em curso/pausado", value: metrics.inProgress, icon: Clock3, color: "text-blue-600" },
          { filter: "unavailable" as const, label: "Sem SLA na origem", value: metrics.unavailable, icon: ShieldCheck, color: "text-slate-500" },
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
          <div className="mb-1 grid min-w-[1040px] grid-cols-[28px_85px_minmax(210px,1fr)_112px_112px_90px_125px_125px] gap-2 px-3 text-[9px] font-semibold uppercase text-muted-foreground">
            <span /><span>Chamado</span><span>Cliente / título</span><span>Abertura</span><span>Encerramento</span><span>Duração</span><span>1ª resposta</span><span>Resolução</span>
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
                <TicketSlaRow key={chamado.numeroChamado} chamado={chamado} />
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
