import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Loader2,
  MessageSquareText,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  fetchChamadosTramites,
  type ChamadosSearchFilters,
} from "@/hooks/useChamados0800";
import { normalizeTicketText } from "@/lib/tickets-ai-analytics";
import {
  buildTicketSectorAnalysis,
  formatSlaDuration,
  getOfficialSlaState,
  getSlaCheckpointDisplay,
  type TicketAreaStage,
  type TicketSectorEntry,
  type TicketSectorVerdict,
} from "@/lib/tickets-sla";
import { cn } from "@/lib/utils";

interface TicketsSlaSectorAnalysisProps {
  active: boolean;
  filterKey: string;
  syncedAt?: number;
  syncing: boolean;
  filters: Omit<ChamadosSearchFilters, "page" | "pageSize">;
}

type SectorResultFilter = "all" | TicketSectorVerdict;

const ALL_SECTORS = "__all_sectors__";

const RESULT_FILTER_LABELS: Record<SectorResultFilter, string> = {
  all: "Todos os resultados",
  outside: "SLA final fora do prazo",
  within: "SLA final cumprido",
  inProgress: "SLA final em curso",
  paused: "SLA final pausado",
  unavailable: "Sem etapa final no setor",
};

const OUTCOME_DISPLAY: Record<TicketAreaStage["outcome"], { label: string; className: string }> = {
  handedOffBeforeDeadline: { label: "Repasse no prazo", className: "bg-emerald-100 text-emerald-700" },
  handedOffAfterDeadline: { label: "Repasse após vencimento", className: "bg-rose-100 text-rose-700" },
  resolvedWithin: { label: "Resolvido no prazo", className: "bg-emerald-100 text-emerald-700" },
  resolvedOutside: { label: "Resolvido fora do SLA", className: "bg-rose-100 text-rose-700" },
  activeWithin: { label: "Etapa atual no prazo", className: "bg-blue-100 text-blue-700" },
  activeOutside: { label: "Etapa atual vencida", className: "bg-rose-100 text-rose-700" },
  activePaused: { label: "Etapa atual pausada", className: "bg-violet-100 text-violet-700" },
  unavailable: { label: "Sem comparação", className: "bg-muted text-muted-foreground" },
};

function entryEvidence(entry: TicketSectorEntry) {
  const evidence = new Map<string, { label: string; className: string }>();
  entry.stages.forEach((stage) => {
    if (stage.firstResponseStatus) {
      const met = stage.firstResponseStatus === "met";
      evidence.set(`first-${stage.firstResponseStatus}`, {
        label: `1º contato ${met ? "no prazo" : "fora do SLA"}`,
        className: met ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
      });
    }
    evidence.set(stage.outcome, OUTCOME_DISPLAY[stage.outcome]);
  });
  return [...evidence.values()];
}

export function TicketsSlaSectorAnalysis({
  active,
  filterKey,
  syncedAt,
  syncing,
  filters,
}: TicketsSlaSectorAnalysisProps) {
  const [selectedSector, setSelectedSector] = useState(ALL_SECTORS);
  const [resultFilter, setResultFilter] = useState<SectorResultFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    data: chamados = [],
    isLoading: loadingTickets,
    error: ticketsError,
  } = useQuery({
    queryKey: ["ticketsSlaAnalysis", filterKey, syncedAt],
    enabled: active && !syncing,
    staleTime: 30_000,
    queryFn: () => fetchAllChamados(filters),
  });

  const {
    data: tramitesPorChamado,
    isLoading: loadingTramites,
    error: tramitesError,
  } = useQuery({
    queryKey: ["ticketsSlaSectorTramites", filterKey, syncedAt],
    enabled: active && !syncing && !loadingTickets && chamados.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => fetchChamadosTramites(chamados.map((chamado) => chamado.numeroChamado)),
  });

  const analysis = useMemo(() => buildTicketSectorAnalysis(
    chamados.map((chamado) => ({
      chamado,
      tramites: tramitesPorChamado?.get(chamado.numeroChamado) ?? [],
    })),
  ), [chamados, tramitesPorChamado]);

  const selectedSummary = selectedSector === ALL_SECTORS
    ? null
    : analysis.sectors.find((sector) => sector.sector === selectedSector) ?? null;

  const entries = useMemo(() => analysis.entries.filter((entry) => {
    if (selectedSector !== ALL_SECTORS && entry.sector !== selectedSector) return false;
    if (resultFilter !== "all" && entry.verdict !== resultFilter) return false;
    const term = normalizeTicketText(search.trim());
    if (!term) return true;
    return normalizeTicketText([
      entry.chamado.numeroChamado,
      entry.chamado.nomeCliente,
      entry.chamado.titulo,
      entry.sector,
      ...entry.sourceAreas,
    ].filter(Boolean).join(" ")).includes(term);
  }), [analysis.entries, resultFilter, search, selectedSector]);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const visibleEntries = entries.slice((page - 1) * pageSize, page * pageSize);
  const failedTickets = useMemo(() => new Set(
    analysis.entries
      .filter((entry) => entry.verdict === "outside")
      .map((entry) => entry.chamado.numeroChamado),
  ).size, [analysis.entries]);
  const journeyAlerts = selectedSummary
    ? selectedSummary.firstResponseOutside + selectedSummary.lateHandoffs
    : analysis.sectors.reduce((total, sector) => (
      total + sector.firstResponseOutside + sector.lateHandoffs
    ), 0);

  useEffect(() => {
    setSelectedSector(ALL_SECTORS);
    setResultFilter("all");
    setSearch("");
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    setPage(1);
  }, [selectedSector, resultFilter, search]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const isLoading = syncing || loadingTickets || (chamados.length > 0 && loadingTramites);
  const error = ticketsError || tramitesError;

  return (
    <div className="space-y-3">
      <Card className="border-muted/80 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-end">
          <div className="mr-auto">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Building2 className="h-4 w-4 text-primary" /> Análise indicativa de SLA por setor
            </h2>
            <p className="mt-0.5 max-w-3xl text-[10px] leading-relaxed text-muted-foreground">
              A falha e a aderência consideram somente o SLA final de resolução. Primeiro contato e repasses atrasados permanecem como alertas da jornada, sem reprovar o setor no resultado final.
            </p>
          </div>
          <div className="flex min-w-[230px] flex-col gap-1">
            <span className="text-[9px] font-semibold text-muted-foreground">Setor para analisar</span>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SECTORS}>Todos os setores</SelectItem>
                {analysis.sectors.map((sector) => (
                  <SelectItem key={sector.sector} value={sector.sector}>{sector.sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="h-8 w-fit border-amber-300 bg-amber-50 px-3 text-[9px] text-amber-800">
            Indicativo — não substitui o SLA oficial
          </Badge>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-muted/80 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-20 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Carregando os trâmites dos {chamados.length || ""} chamados filtrados...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30 shadow-sm">
          <CardContent className="py-16 text-center text-xs text-destructive">
            Não foi possível carregar a análise setorial de SLA.
          </CardContent>
        </Card>
      ) : chamados.length === 0 ? (
        <Card className="border-muted/80 shadow-sm">
          <CardContent className="py-16 text-center text-xs text-muted-foreground">
            Nenhum chamado encontrado no filtro atual.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: selectedSummary ? "Chamados que passaram no setor" : "Chamados do filtro",
                value: selectedSummary?.tickets ?? analysis.totalTickets,
                detail: selectedSummary ? selectedSummary.sector : `${analysis.totalStages} passagem(ns) setoriais`,
                icon: MessageSquareText,
                color: "text-primary",
              },
              {
                label: selectedSummary ? "Aderência final indicativa" : "Setores envolvidos",
                value: selectedSummary?.complianceRate === null
                  ? "—"
                  : selectedSummary
                    ? `${selectedSummary.complianceRate}%`
                    : analysis.sectors.length,
                detail: selectedSummary ? "Entre chamados comparáveis" : "Equipes agrupadas por área",
                icon: BarChart3,
                color: "text-blue-600",
              },
              {
                label: "Chamados com SLA final fora",
                value: selectedSummary?.failedTickets ?? failedTickets,
                detail: selectedSummary ? `resolução atribuída a ${selectedSummary.sector}` : "Resolução encerrada ou atual vencida",
                icon: ShieldAlert,
                color: "text-rose-600",
              },
              {
                label: "Alertas da jornada",
                value: journeyAlerts,
                detail: "1º contato e repasses; não alteram a aderência final",
                icon: CircleAlert,
                color: "text-amber-600",
              },
            ].map((metric) => (
              <Card key={metric.label} className="border-muted/80 shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <metric.icon className={cn("h-5 w-5 shrink-0", metric.color)} />
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{metric.value}</p>
                    <p className="mt-1 text-[9px] font-semibold">{metric.label}</p>
                    <p className="truncate text-[8px] text-muted-foreground" title={metric.detail}>{metric.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-muted/80 shadow-sm">
            <CardContent className="p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold">Comparativo dos setores</h3>
                  <p className="text-[9px] text-muted-foreground">Ordenado pelos setores com mais chamados fora do SLA final de resolução.</p>
                </div>
                <span className="text-[9px] text-muted-foreground">Clique em um setor para abrir seus chamados.</span>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[900px] text-left text-[10px]">
                  <thead className="bg-muted/35 text-[8px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Setor</th>
                      <th className="px-3 py-2 font-semibold">Chamados</th>
                      <th className="px-3 py-2 font-semibold">SLA final no prazo</th>
                      <th className="px-3 py-2 font-semibold">Com falha final</th>
                      <th className="px-3 py-2 font-semibold">Em curso / sem base</th>
                      <th className="px-3 py-2 font-semibold">Diagnóstico da jornada</th>
                      <th className="px-3 py-2 font-semibold">Aderência final</th>
                      <th className="px-3 py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.sectors.map((sector) => (
                      <tr key={sector.sector} className={cn("border-t", selectedSector === sector.sector && "bg-primary/[0.04]") }>
                        <td className="px-3 py-2">
                          <button type="button" className="text-left font-semibold hover:text-primary" onClick={() => setSelectedSector(sector.sector)}>
                            {sector.sector}
                          </button>
                          <p className="max-w-[230px] truncate text-[8px] text-muted-foreground" title={sector.sourceAreas.join(" · ")}>
                            {sector.sourceAreas.join(" · ")}
                          </p>
                        </td>
                        <td className="px-3 py-2 font-semibold">{sector.tickets}</td>
                        <td className="px-3 py-2 text-emerald-700">{sector.compliantTickets}</td>
                        <td className="px-3 py-2 font-semibold text-rose-700">{sector.failedTickets}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {sector.inProgressTickets + sector.pausedTickets + sector.unavailableTickets}
                        </td>
                        <td className="px-3 py-2 text-[9px] text-muted-foreground">
                          1º contato: {sector.firstResponseOutside} · Repasse: {sector.lateHandoffs} · Finalizada fora: {sector.lateResolutions} · Atual vencida: {sector.activeOutside}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={cn(
                            "border-0 text-[9px]",
                            sector.complianceRate === null
                              ? "bg-muted text-muted-foreground"
                              : sector.complianceRate >= 90
                                ? "bg-emerald-100 text-emerald-700"
                                : sector.complianceRate >= 70
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-700",
                          )}>
                            {sector.complianceRate === null ? "Sem base" : `${sector.complianceRate}%`}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px]" onClick={() => setSelectedSector(sector.sector)}>
                            Analisar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/80 shadow-sm">
            <CardContent className="p-3">
              <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end">
                <div className="mr-auto">
                  <h3 className="text-xs font-semibold">
                    {selectedSummary ? `Chamados analisados em ${selectedSummary.sector}` : "Participações dos chamados por setor"}
                  </h3>
                  <p className="text-[9px] text-muted-foreground">Um chamado aparece uma vez para cada setor pelo qual passou.</p>
                </div>
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar chamado, cliente ou equipe..." className="h-8 pl-8 text-[10px]" />
                </div>
                <Select value={resultFilter} onValueChange={(value) => setResultFilter(value as SectorResultFilter)}>
                  <SelectTrigger className="h-8 w-[210px] text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_FILTER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1020px] text-left text-[10px]">
                  <thead className="bg-muted/35 text-[8px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Chamado</th>
                      <th className="px-3 py-2 font-semibold">Cliente / título</th>
                      <th className="px-3 py-2 font-semibold">Setor / equipes</th>
                      <th className="px-3 py-2 font-semibold">Permanência</th>
                      <th className="px-3 py-2 font-semibold">Evidências na jornada</th>
                      <th className="px-3 py-2 font-semibold">SLA oficial do chamado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEntries.map((entry) => {
                      const official = getOfficialSlaState(entry.chamado);
                      const firstDisplay = getSlaCheckpointDisplay(official.firstResponse, "firstResponse");
                      const resolutionDisplay = getSlaCheckpointDisplay(official.resolution, "resolution");
                      return (
                        <tr key={`${entry.chamado.numeroChamado}:${entry.sector}`} className="border-t align-top">
                          <td className="px-3 py-2 font-mono font-semibold text-primary">#{entry.chamado.numeroChamado}</td>
                          <td className="max-w-[260px] px-3 py-2">
                            <p className="truncate font-semibold" title={entry.chamado.nomeCliente}>{entry.chamado.nomeCliente || "—"}</p>
                            <p className="truncate text-[8px] text-muted-foreground" title={entry.chamado.titulo}>{entry.chamado.titulo || "—"}</p>
                          </td>
                          <td className="max-w-[220px] px-3 py-2">
                            <p className="font-semibold">{entry.sector}</p>
                            <p className="truncate text-[8px] text-muted-foreground" title={entry.sourceAreas.join(" · ")}>{entry.sourceAreas.join(" · ")}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-semibold">{formatSlaDuration(entry.hours)}</p>
                            <p className="text-[8px] text-muted-foreground">{entry.stages.length} passagem(ns)</p>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex max-w-[360px] flex-wrap gap-1">
                              {entryEvidence(entry).map((evidence) => (
                                <Badge key={evidence.label} className={cn("h-4 border-0 px-1.5 text-[8px]", evidence.className)}>{evidence.label}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              <Badge className={cn("h-4 border-0 px-1.5 text-[8px]", firstDisplay.className)}>1º contato: {firstDisplay.label}</Badge>
                              <Badge className={cn("h-4 border-0 px-1.5 text-[8px]", resolutionDisplay.className)}>Resolução: {resolutionDisplay.label}</Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {entries.length === 0 && (
                  <div className="flex flex-col items-center gap-1 py-12 text-xs text-muted-foreground">
                    <Clock3 className="h-5 w-5" /> Nenhum chamado encontrado nesta combinação.
                  </div>
                )}
              </div>

              {entries.length > 0 && (
                <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t pt-3 text-[10px] text-muted-foreground sm:flex-row">
                  <span>Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, entries.length)} de {entries.length}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span>Exibir</span>
                      <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                        <SelectTrigger className="h-7 w-[68px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                        </SelectContent>
                      </Select>
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

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[9px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            <strong>Como interpretar:</strong> “Com falha final” conta apenas o setor que encerrou o chamado após o vencimento ou que mantém a etapa atual com o prazo final vencido. Primeiro contato e repasses atrasados aparecem no diagnóstico da jornada, mas não reduzem a aderência final. Setores anteriores, que somente repassaram o chamado, ficam sem base de SLA final. O Ellevo não fornece a fotografia histórica da regra em cada transferência; por isso, esta visão continua indicativa.
          </div>
        </>
      )}
    </div>
  );
}
