import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useChamadosSearch,
  useSolicitarSyncProcessoVenda,
  isProcessoVendaSyncSupersededError,
  fetchAllChamados,
  fetchAllChamadosForReport,
  Chamado0800,
  useChamadosClientOptions,
  type ChamadosClientOption,
  type ProcessoVendaSyncFilters,
} from "@/hooks/useChamados0800";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Chamado0800DetailDialog, fmtDateBr, statusBadgeClass } from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { 
  ClipboardList, Search, CalendarDays, Filter, X, ChevronLeft, ChevronRight, ChevronsUpDown, Check, Eye, FileDown, Loader2, BarChart3, Timer, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/utils/normalize-search";
import {
  getDefaultChamadosDateRange,
} from "@/lib/chamados-date-range";
import {
  CHAMADOS_ORION_PRODUCTS,
  getOrionProductPattern,
} from "@/lib/chamados-product-filter";
import {
  CHAMADOS_CATALOG_CONFIG,
  CHAMADOS_LEGACY_PRODUCT_GROUPS,
  LEGACY_PRODUCT_FAMILIES,
  formatChamadosProductLabel,
  type ChamadosCatalog,
} from "@/lib/chamados-catalog";
import { CHAMADO_STATUS_OPTIONS } from "@/lib/chamados-status";
import { generateChamadosReportPdf } from "@/lib/chamados-report-pdf";
import {
  generateTicketsAiAnalysisPdf,
  type TicketsAiReportAnalysis,
} from "@/lib/tickets-ai-report-pdf";
import { toast } from "sonner";
import { TicketsAiAnalysis } from "@/components/DeploymentsTickets/TicketsAiAnalysis";
import { TicketsSlaAnalysis } from "@/components/DeploymentsTickets/TicketsSlaAnalysis";
import { TicketsSlaSectorAnalysis } from "@/components/DeploymentsTickets/TicketsSlaSectorAnalysis";

const FILTER_SYNC_DEBOUNCE_MS = 700;
const FILTER_SYNC_FRESHNESS_MS = 5 * 60_000;
const MAX_SYNC_SNAPSHOT_TICKETS = 250;

interface DeploymentsTicketsProps {
  catalog?: ChamadosCatalog;
}

interface TicketFilterOption {
  value: string;
  label: string;
}

function TicketFilterMultiSelect({
  values,
  options,
  placeholder,
  searchPlaceholder,
  onChange,
  disabled = false,
}: {
  values: string[];
  options: TicketFilterOption[];
  placeholder: string;
  searchPlaceholder: string;
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);
  const label = selectedLabels.length === 0
    ? placeholder
    : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} selecionados`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between px-2 text-[11px] font-normal md:h-7"
        >
          <span className={cn("truncate", values.length === 0 && "text-muted-foreground")}>{label}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={(value, search) => (
          normalizeSearchText(value).includes(normalizeSearchText(search)) ? 1 : 0
        )}>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandList className="max-h-[260px] overflow-y-auto">
            <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={placeholder}
                className="py-1.5 text-xs"
                onSelect={() => onChange([])}
              >
                <Check className={cn("mr-2 h-3.5 w-3.5", values.length === 0 ? "opacity-100" : "opacity-0")} />
                {placeholder}
              </CommandItem>
              {options.map((option) => {
                const selected = values.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    className="py-1.5 text-xs"
                    onSelect={() => onChange(
                      selected
                        ? values.filter((value) => value !== option.value)
                        : [...values, option.value],
                    )}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function DeploymentsTickets({ catalog = "orion" }: DeploymentsTicketsProps) {
  const catalogConfig = CHAMADOS_CATALOG_CONFIG[catalog];
  const isLegacy = catalog === "legacy";
  const defaultDateRange = useMemo(() => getDefaultChamadosDateRange(), []);

  // Filtros
  const [dataInicio, setDataInicio] = useState<string>(defaultDateRange.startDate);
  const [dataFim, setDataFim] = useState<string>(defaultDateRange.endDate);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [produto, setProduto] = useState<string>("todos");
  const [selectedLegacyProducts, setSelectedLegacyProducts] = useState<string[]>([]);
  const [selectedLegacySoftware, setSelectedLegacySoftware] = useState<string[]>([]);
  const [natureza, setNatureza] = useState<string>("todas");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [busca, setBusca] = useState<string>("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modais e Diálogos
  const [selectedChamado, setSelectedChamado] = useState<Chamado0800 | null>(null);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [statusSearchOpen, setStatusSearchOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "analysis" | "sla" | "sla-sector">("list");
  const [analysisResult, setAnalysisResult] = useState<TicketsAiReportAnalysis | null>(null);
  const [syncSnapshot, setSyncSnapshot] = useState<{
    key: string;
    syncedAt: number;
    ticketNumbers: string[];
  } | null>(null);
  const firstFilterSync = useRef(true);
  const syncedQueries = useRef(new Map<string, {
    syncedAt: number;
    ticketNumbers: string[];
  }>());
  const syncingRanges = useRef(new Set<string>());
  const { solicitarSync: solicitarSyncPeriodo, syncing: syncingPeriodo } =
    useSolicitarSyncProcessoVenda(catalog);

  const legacyProductOptions = useMemo<TicketFilterOption[]>(
    () => LEGACY_PRODUCT_FAMILIES.map((family) => ({ value: family, label: family })),
    [],
  );
  const legacySoftwareOptions = useMemo<TicketFilterOption[]>(() => {
    const selectedFamilies = selectedLegacyProducts.length > 0
      ? new Set(selectedLegacyProducts)
      : null;
    const systems = CHAMADOS_LEGACY_PRODUCT_GROUPS
      .filter((group) => !selectedFamilies || selectedFamilies.has(group.family))
      .flatMap((group) => [...group.products]);
    return [...new Set(systems)]
      .sort((left, right) => left.localeCompare(right, "pt-BR"))
      .map((software) => ({ value: software, label: software }));
  }, [selectedLegacyProducts]);

  const { data: clientOptions = [], isLoading: loadingClients } =
    useChamadosClientOptions(catalog);

  const clients = useMemo(
    () => clientOptions.map((option) => option.nomeCliente),
    [clientOptions],
  );
  const clientOptionByName = useMemo(
    () => new Map(clientOptions.map((option) => [option.nomeCliente, option])),
    [clientOptions],
  );
  const clientOptionByAlias = useMemo(() => {
    const optionsByAlias = new Map<string, ChamadosClientOption>();
    for (const option of clientOptions) {
      optionsByAlias.set(normalizeSearchText(option.nomeCliente), option);
      for (const alias of option.aliases) {
        optionsByAlias.set(normalizeSearchText(alias), option);
      }
    }
    return optionsByAlias;
  }, [clientOptions]);
  const canonicalSelectedClients = useMemo(
    () => [...new Set(selectedClients.map((client) => (
      clientOptionByAlias.get(normalizeSearchText(client))?.nomeCliente ?? client
    )))],
    [clientOptionByAlias, selectedClients],
  );
  const selectedClientCodes = useMemo(
    () => [...new Set(canonicalSelectedClients
      .map((client) => clientOptionByAlias.get(normalizeSearchText(client))?.codigoCliente)
      .filter((code): code is string => Boolean(code)))],
    [canonicalSelectedClients, clientOptionByAlias],
  );
  const selectedClientFilterNames = useMemo(
    () => [...new Set(canonicalSelectedClients.flatMap((client) => {
      const option = clientOptionByAlias.get(normalizeSearchText(client));
      return option ? [option.nomeCliente, ...option.aliases] : [client];
    }))],
    [canonicalSelectedClients, clientOptionByAlias],
  );

  // Uma aba aberta pode manter um alias antigo em memoria. Quando as opcoes
  // chegam, converte a selecao para o nome atual antes do proximo sync.
  useEffect(() => {
    if (clientOptions.length === 0 || selectedClients.length === 0) return;

    if (canonicalSelectedClients.length !== selectedClients.length
      || canonicalSelectedClients.some((client, index) => client !== selectedClients[index])) {
      setSelectedClients(canonicalSelectedClients);
      setPage(1);
    }
  }, [canonicalSelectedClients, clientOptions.length, selectedClients]);

  const syncFilters = useMemo<ProcessoVendaSyncFilters>(() => ({
    clientCodes: selectedClientCodes.length > 0 ? selectedClientCodes : null,
    // Os aliases mantem compatibilidade com workers anteriores; os workers
    // atualizados priorizam clientCodes e deixam de depender do nome.
    clientNames: selectedClientFilterNames.length > 0 ? selectedClientFilterNames : null,
    product: produto,
    products: isLegacy && selectedLegacyProducts.length > 0 ? selectedLegacyProducts : null,
    softwares: isLegacy && selectedLegacySoftware.length > 0 ? selectedLegacySoftware : null,
    nature: natureza,
    statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
    searchTerm: busca || null,
  }), [
    busca,
    isLegacy,
    natureza,
    produto,
    selectedClientCodes,
    selectedClientFilterNames,
    selectedLegacyProducts,
    selectedLegacySoftware,
    selectedStatuses,
  ]);

  const filterSyncKey = useMemo(
    () => JSON.stringify([catalog, dataInicio, dataFim, syncFilters]),
    [catalog, dataInicio, dataFim, syncFilters]
  );

  useEffect(() => {
    if (!dataInicio || !dataFim || dataInicio > dataFim) return;
    if (selectedClients.length > 0 && loadingClients) return;
    // A abertura da tela usa o espelho horario imediatamente. O worker so e
    // acionado depois que o usuario realmente altera algum filtro.
    if (firstFilterSync.current) {
      firstFilterSync.current = false;
      return;
    }

    const cached = syncedQueries.current.get(filterSyncKey);
    if (cached && Date.now() - cached.syncedAt < FILTER_SYNC_FRESHNESS_MS) {
      setSyncSnapshot({ key: filterSyncKey, ...cached });
      return;
    }

    const timer = window.setTimeout(() => {
      if (syncingRanges.current.has(filterSyncKey)) return;

      syncingRanges.current.add(filterSyncKey);
      void solicitarSyncPeriodo(dataInicio, dataFim, syncFilters)
        .then((result) => {
          const snapshot = {
            syncedAt: Date.now(),
            ticketNumbers: result.ticketNumbers,
          };
          syncedQueries.current.set(filterSyncKey, snapshot);
          setSyncSnapshot({ key: filterSyncKey, ...snapshot });
        })
        .catch((error) => {
          if (isProcessoVendaSyncSupersededError(error)) return;
          toast.error(
            error instanceof Error
              ? error.message
              : "Nao foi possivel atualizar o periodo selecionado."
          );
        })
        .finally(() => {
          syncingRanges.current.delete(filterSyncKey);
        });
    }, FILTER_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    dataInicio,
    dataFim,
    filterSyncKey,
    loadingClients,
    selectedClients.length,
    solicitarSyncPeriodo,
    syncFilters,
  ]);

  const { data: naturezas = [], isLoading: loadingNaturezas } = useQuery<string[]>({
    queryKey: [
      "distinctProcessoVendaNaturezas",
      catalog,
      dataInicio,
      dataFim,
      selectedClientCodes,
      selectedClientFilterNames,
      produto,
      selectedLegacyProducts,
      selectedLegacySoftware,
    ],
    queryFn: async () => {
      let q = supabase
        .from("chamados_processo_venda")
        .select("natureza")
        .not("natureza", "is", null);

      if (isLegacy) {
        q = q.in(
          "produto",
          selectedLegacyProducts.length > 0
            ? selectedLegacyProducts
            : [...LEGACY_PRODUCT_FAMILIES],
        );
        if (selectedLegacySoftware.length > 0) {
          q = q.in("software", selectedLegacySoftware);
        }
      } else {
        q = q.ilike("software", getOrionProductPattern(produto));
      }

      if (dataInicio) q = q.gte("data_abertura", dataInicio);
      if (dataFim) q = q.lte("data_abertura", dataFim);
      if (selectedClientCodes.length > 0) {
        q = q.in("codigo_cliente", selectedClientCodes);
      } else if (selectedClientFilterNames.length > 0) {
        q = q.in("nome_cliente", selectedClientFilterNames);
      }

      const { data, error } = await q;
      if (error) throw error;

      const values = (data ?? [])
        .map((row: { natureza?: string | null }) => row.natureza?.trim())
        .filter((value): value is string => Boolean(value));
      return [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    staleTime: 5 * 60_000,
  });

  const statusList = CHAMADO_STATUS_OPTIONS;
  const syncedTicketNumbers =
    syncSnapshot?.key === filterSyncKey &&
    syncSnapshot.ticketNumbers.length <= MAX_SYNC_SNAPSHOT_TICKETS
      ? syncSnapshot.ticketNumbers
      : null;

  // Query principal dos chamados usando o hook recém-criado
  const { chamados, totalCount, isLoading, error } = useChamadosSearch({
    catalog,
    startDate: dataInicio || null,
    endDate: dataFim || null,
    clientCodes: selectedClientCodes.length > 0 ? selectedClientCodes : null,
    clientNames: selectedClientFilterNames.length > 0 ? selectedClientFilterNames : null,
    product: produto,
    products: isLegacy && selectedLegacyProducts.length > 0 ? selectedLegacyProducts : null,
    softwares: isLegacy && selectedLegacySoftware.length > 0 ? selectedLegacySoftware : null,
    nature: natureza,
    searchTerm: busca || null,
    statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
    ticketNumbers: syncedTicketNumbers,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const hasActiveFilters =
    dataInicio !== defaultDateRange.startDate ||
    dataFim !== defaultDateRange.endDate ||
    selectedClients.length > 0 ||
    produto !== "todos" ||
    selectedLegacyProducts.length > 0 ||
    selectedLegacySoftware.length > 0 ||
    natureza !== "todas" ||
    selectedStatuses.length > 0 ||
    !!busca;

  const activeFilterCount = [
    dataInicio !== defaultDateRange.startDate || dataFim !== defaultDateRange.endDate,
    selectedClients.length > 0,
    produto !== "todos" || selectedLegacyProducts.length > 0,
    selectedLegacySoftware.length > 0,
    natureza !== "todas",
    selectedStatuses.length > 0,
  ].filter(Boolean).length;

  const toggleClient = (clientName: string) => {
    setSelectedClients(prev => {
      const next = prev.includes(clientName)
        ? prev.filter(c => c !== clientName)
        : [...prev, clientName];
      setPage(1); // Reseta a página para a primeira ao mudar filtros
      return next;
    });
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((current) => {
      const next = current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status];
      setPage(1);
      return next;
    });
  };

  const clearAllFilters = () => {
    setDataInicio(defaultDateRange.startDate);
    setDataFim(defaultDateRange.endDate);
    setSelectedClients([]);
    setProduto("todos");
    setSelectedLegacyProducts([]);
    setSelectedLegacySoftware([]);
    setNatureza("todas");
    setSelectedStatuses([]);
    setBusca("");
    setPage(1);
  };

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  const handleGeneratePdf = async () => {
    if (generatingPdf || !dataInicio || !dataFim || dataInicio > dataFim) return;

    if (activeView === "analysis" && !analysisResult) {
      toast.info("Gere as considerações da IA antes de emitir o relatório da análise.");
      return;
    }

    setGeneratingPdf(true);
    try {
      const toastId = activeView === "analysis" ? "tickets-ai-report-pdf" : "chamados-report-pdf";
      let reportTicketNumbers: string[] | null = null;
      let cached = syncedQueries.current.get(filterSyncKey);

      if (!cached || Date.now() - cached.syncedAt >= FILTER_SYNC_FRESHNESS_MS) {
        toast.loading("Atualizando os dados do relatório...", { id: toastId });
        const result = await solicitarSyncPeriodo(dataInicio, dataFim, syncFilters);
        cached = {
          syncedAt: Date.now(),
          ticketNumbers: result.ticketNumbers,
        };
        syncedQueries.current.set(filterSyncKey, cached);
        setSyncSnapshot({ key: filterSyncKey, ...cached });
      }

      if (cached.ticketNumbers.length <= MAX_SYNC_SNAPSHOT_TICKETS) {
        reportTicketNumbers = cached.ticketNumbers;
      }

      toast.loading(
        activeView === "analysis"
          ? "Montando o relatório executivo com gráficos e análise..."
          : "Montando o relatório PDF...",
        { id: toastId }
      );

      const reportFilters = {
        catalog,
        startDate: dataInicio,
        endDate: dataFim,
        clients: selectedClients,
        product: produto,
        products: selectedLegacyProducts,
        softwares: selectedLegacySoftware,
        nature: natureza,
        statuses: selectedStatuses,
        searchTerm: busca,
      };
      const reportSearchFilters = {
        catalog,
        startDate: dataInicio,
        endDate: dataFim,
        clientCodes: selectedClientCodes.length > 0 ? selectedClientCodes : null,
        clientNames: selectedClientFilterNames.length > 0 ? selectedClientFilterNames : null,
        product: produto,
        products: isLegacy && selectedLegacyProducts.length > 0 ? selectedLegacyProducts : null,
        softwares: isLegacy && selectedLegacySoftware.length > 0 ? selectedLegacySoftware : null,
        nature: natureza,
        searchTerm: busca || null,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
        ticketNumbers: reportTicketNumbers,
      };

      if (activeView === "analysis") {
        const reportRows = await fetchAllChamados(reportSearchFilters);
        if (reportRows.length === 0) {
          toast.info("Nenhum chamado encontrado para gerar o relatório.", { id: toastId });
          return;
        }
        await generateTicketsAiAnalysisPdf(reportRows, reportFilters, analysisResult as TicketsAiReportAnalysis);
        toast.success(`Relatório de análise gerado com ${reportRows.length} chamado(s).`, {
          id: toastId,
        });
        return;
      }

      const reportRows = await fetchAllChamadosForReport(reportSearchFilters);

      if (reportRows.length === 0) {
        toast.info("Nenhum chamado encontrado para gerar o relatório.", {
          id: toastId,
        });
        return;
      }

      await generateChamadosReportPdf(reportRows, reportFilters);
      toast.success(`Relatório gerado com ${reportRows.length} chamado(s).`, {
        id: toastId,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório de chamados:", error);
      toast.error(
        error instanceof Error ? error.message : "Não foi possível gerar o relatório PDF.",
        { id: activeView === "analysis" ? "tickets-ai-report-pdf" : "chamados-report-pdf" }
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="container mx-auto w-full min-w-0 space-y-3 px-0 pb-4 pt-2 sm:p-3 md:p-4">
      {/* Cabeçalho */}
      <div className="flex min-w-0 flex-col gap-3 border-b border-muted pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-x-3 lg:flex-row lg:items-baseline">
          <h1 className="flex min-w-0 items-start gap-1.5 break-words text-lg font-bold leading-tight text-foreground">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" style={{ color: "hsl(346, 84%, 45%)" }} />
            <span className="break-words">{catalogConfig.title}</span>
          </h1>
          <p className="mt-1 break-words text-[10px] leading-relaxed text-muted-foreground lg:mt-0">
            {catalogConfig.description}
          </p>
        </div>
        
        <div className="flex w-full min-w-0 items-center justify-between gap-1.5 md:w-auto md:justify-end">
          {activeView !== "sla" && activeView !== "sla-sector" && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 px-2 text-[10px] sm:h-7"
              onClick={handleGeneratePdf}
              disabled={generatingPdf || syncingPeriodo || !dataInicio || !dataFim || dataInicio > dataFim}
              title={activeView === "analysis"
                ? "Gerar PDF executivo com gráficos e parecer da IA"
                : "Gerar PDF com todos os chamados filtrados"}
            >
              {generatingPdf ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileDown className="h-3 w-3" />
              )}
              {generatingPdf
                ? "Gerando PDF..."
                : activeView === "analysis"
                ? "Relatório da análise"
                : "Relatório PDF"}
            </Button>
          )}

          {/* Indicador de Status/Sync rápido */}
          <Badge variant="outline" className="flex h-6 min-w-0 items-center gap-1.5 px-2 py-0 text-[9px] font-normal text-muted-foreground sm:text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="sm:hidden">{syncingPeriodo ? "Sincronizando..." : "Ellevo ativo"}</span>
            <span className="hidden sm:inline">
              {syncingPeriodo
                ? "Consultando filtro na origem..."
                : "Ellevo ativo (1h + filtros sob demanda)"}
            </span>
          </Badge>
        </div>
      </div>

      {/* Seção de Filtros Compacta */}
      <Card className="border border-muted/80 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="p-2.5 space-y-1.5">
          
          {/* Header do Filtro Inline com Limpeza de Filtros */}
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-muted/40 pb-2 md:pb-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Filter className="h-2.5 w-2.5 text-primary" style={{ color: "hsl(346, 84%, 45%)" }} />
                Filtros
              </div>
              <span className="hidden lg:block truncate text-[9px] leading-none text-muted-foreground/80">
                Período padrão: últimos 30 dias; datas anteriores consultam somente a faixa escolhida na origem.
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="flex h-7 items-center gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-primary sm:text-[11px] md:h-5"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2 text-[10px] md:hidden"
                aria-expanded={mobileFiltersOpen}
                onClick={() => setMobileFiltersOpen((open) => !open)}
              >
                {mobileFiltersOpen ? "Ocultar" : "Mais filtros"}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-4 justify-center px-1 text-[9px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <div className="relative md:hidden">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar chamado, título ou termo..."
              value={busca}
              onChange={(e) => handleFilterChange(setBusca, e.target.value)}
              className="h-10 min-w-0 pl-9 pr-8 text-sm"
            />
            {busca && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => handleFilterChange(setBusca, "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Grid de Filtros: Linha 1 compacta, Linha 2 com Clientes (Full Width) */}
          <div className={cn("space-y-2 md:space-y-1.5", !mobileFiltersOpen && "hidden md:block")}>
            {/* Linha 1: Datas, Produto, Natureza, Status, Busca */}
            <div className={cn(
              "grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3",
              isLegacy ? "xl:grid-cols-7" : "xl:grid-cols-6",
            )}>
              {/* Data Início */}
              <div className="space-y-0">
                <label className="text-[10px] leading-none font-medium text-muted-foreground">
                  Abertura (Início)
                </label>
                <Input
                  type="date"
                  value={dataInicio}
                  max={dataFim || undefined}
                  onChange={(e) => handleFilterChange(setDataInicio, e.target.value)}
                  className="h-10 w-full text-[11px] md:h-7"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-0">
                <label className="text-[10px] leading-none font-medium text-muted-foreground">
                  Abertura (Fim)
                </label>
                <Input
                  type="date"
                  value={dataFim}
                  min={dataInicio || undefined}
                  onChange={(e) => handleFilterChange(setDataFim, e.target.value)}
                  className="h-10 w-full text-[11px] md:h-7"
                />
              </div>

              {isLegacy ? (
                <>
                  <div className="space-y-0">
                    <label className="text-[10px] leading-none font-medium text-muted-foreground">Produto</label>
                    <TicketFilterMultiSelect
                      values={selectedLegacyProducts}
                      options={legacyProductOptions}
                      placeholder="Todos os produtos"
                      searchPlaceholder="Buscar produto..."
                      onChange={(values) => {
                        const allowedSoftware = new Set<string>(
                          CHAMADOS_LEGACY_PRODUCT_GROUPS
                            .filter((group) => values.length === 0 || values.includes(group.family))
                            .flatMap((group) => [...group.products]),
                        );
                        setSelectedLegacyProducts(values);
                        setSelectedLegacySoftware((current) => current.filter((item) => allowedSoftware.has(item)));
                        setNatureza("todas");
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="space-y-0">
                    <label className="text-[10px] leading-none font-medium text-muted-foreground">Software</label>
                    <TicketFilterMultiSelect
                      values={selectedLegacySoftware}
                      options={legacySoftwareOptions}
                      placeholder="Todos os softwares"
                      searchPlaceholder="Buscar software..."
                      onChange={(values) => {
                        setSelectedLegacySoftware(values);
                        setNatureza("todas");
                        setPage(1);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-0">
                  <label className="text-[10px] leading-none font-medium text-muted-foreground">Produto / Software</label>
                  <Select
                    value={produto}
                    onValueChange={(val) => {
                      setProduto(val);
                      setNatureza("todas");
                      setPage(1);
                    }}
                  >
                    <SelectTrigger aria-label="Filtrar por produto" className="h-10 w-full text-[11px] md:h-7">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAMADOS_ORION_PRODUCTS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Natureza */}
              <div className="space-y-0">
                <label className="text-[10px] leading-none font-medium text-muted-foreground">Natureza</label>
                <Select
                  value={natureza}
                  onValueChange={(val) => handleFilterChange(setNatureza, val)}
                  disabled={loadingNaturezas}
                >
                  <SelectTrigger aria-label="Filtrar por natureza" className="h-10 w-full text-[11px] md:h-7">
                    <SelectValue placeholder={loadingNaturezas ? "Carregando..." : "Todas as naturezas"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as naturezas</SelectItem>
                    {naturezas.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-0">
                <label className="text-[10px] leading-none font-medium text-muted-foreground">Status</label>
                <Popover open={statusSearchOpen} onOpenChange={setStatusSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="h-10 w-full justify-between text-[11px] font-normal md:h-7"
                    >
                      <span className="truncate">
                        {selectedStatuses.length === 1
                          ? selectedStatuses[0]
                          : selectedStatuses.length > 1
                          ? `${selectedStatuses.length} selecionados`
                          : "Todos os status"}
                      </span>
                      <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar status..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="todos os status"
                            className="py-1.5 text-xs"
                            onSelect={() => {
                              setSelectedStatuses([]);
                              setPage(1);
                            }}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <div className={cn(
                                "flex h-3.5 w-3.5 items-center justify-center rounded border border-primary/50",
                                selectedStatuses.length === 0 ? "bg-primary text-primary-foreground border-primary" : "opacity-50"
                              )}>
                                {selectedStatuses.length === 0 && <Check className="h-2.5 w-2.5" />}
                              </div>
                              <span>Todos os status</span>
                            </div>
                          </CommandItem>
                          {statusList.map((status) => (
                            <CommandItem
                              key={status}
                              value={status}
                              className="py-1.5 text-xs"
                              onSelect={() => toggleStatus(status)}
                            >
                              <div className="flex items-center gap-1.5 w-full">
                                <div className={cn(
                                  "flex h-3.5 w-3.5 items-center justify-center rounded border border-primary/50",
                                  selectedStatuses.includes(status)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "opacity-50"
                                )}>
                                  {selectedStatuses.includes(status) && <Check className="h-2.5 w-2.5" />}
                                </div>
                                <span className="truncate">{status}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Busca Rápida */}
              <div className="hidden space-y-0 md:block">
                <label className="text-[10px] leading-none font-medium text-muted-foreground">
                  Busca Rápida
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Chamado, título, termo..."
                    value={busca}
                    onChange={(e) => handleFilterChange(setBusca, e.target.value)}
                    className="h-7 w-full pr-7 text-[11px]"
                  />
                  {busca && (
                    <button
                      onClick={() => handleFilterChange(setBusca, "")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {selectedStatuses.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Status:</span>
                {selectedStatuses.map((status) => (
                  <Badge
                    key={status}
                    variant="secondary"
                    className="text-[10px] bg-muted/60 text-foreground py-0 pl-1.5 pr-1 flex items-center gap-1 h-4"
                  >
                    <span>{status}</span>
                    <button
                      type="button"
                      onClick={() => toggleStatus(status)}
                      className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={`Remover status ${status}`}
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStatuses([]);
                    setPage(1);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-primary h-4 px-1 ml-1"
                >
                  Limpar Status
                </Button>
              </div>
            )}

            {/* Linha 2: Clientes / Serventias (Full Width) */}
            <div className="space-y-0">
              <div className="flex min-h-4 flex-wrap items-center gap-1">
                <label className="mr-1 text-[10px] leading-none font-medium text-muted-foreground">Clientes / Serventias</label>
                {selectedClients.length > 0 && (
                  <>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Selecionados:</span>
                    {selectedClients.map((client) => (
                      <Badge
                        key={client}
                        variant="secondary"
                        className="h-4 max-w-[190px] gap-0.5 bg-muted/60 py-0 pl-1.5 pr-0.5 text-[9px] text-foreground"
                      >
                        <span className="truncate">{client}</span>
                        <button
                          type="button"
                          onClick={() => toggleClient(client)}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
                          aria-label={`Remover cliente ${client}`}
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedClients([]);
                        setPage(1);
                      }}
                      className="h-4 px-1 text-[9px] text-muted-foreground hover:text-primary"
                    >
                      Limpar Clientes
                    </Button>
                  </>
                )}
              </div>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="h-10 w-full justify-between text-[11px] font-normal md:h-7"
                    disabled={loadingClients}
                  >
                    <span className="truncate">
                      {selectedClients.length === 1
                        ? selectedClients[0]
                        : selectedClients.length > 1
                        ? `${selectedClients.length} selecionados`
                        : "Selecionar Clientes..."}
                    </span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command filter={(value, search) => {
                    const val = normalizeSearchText(value);
                    const searchVal = normalizeSearchText(search);
                    return val.includes(searchVal) ? 1 : 0;
                  }}>
                    <CommandInput placeholder="Buscar cliente..." className="h-8 text-xs" />
                    <CommandList className="max-h-[220px] overflow-y-auto">
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => {
                          const option = clientOptionByName.get(client);
                          const searchValue = [
                            client,
                            option?.codigoCliente,
                            ...(option?.aliases ?? []),
                          ].filter(Boolean).join(" ").toLowerCase();
                          return (
                            <CommandItem
                              key={client}
                              value={searchValue}
                              className="py-1.5 text-xs"
                              onSelect={() => toggleClient(client)}
                            >
                            <div className="flex items-center gap-1.5 w-full">
                              <div className={cn(
                                "flex h-3.5 w-3.5 items-center justify-center rounded border border-primary/50 transition-colors",
                                selectedClients.includes(client) ? "bg-primary text-primary-foreground border-primary" : "opacity-50"
                              )}
                              style={selectedClients.includes(client) ? { backgroundColor: "hsl(346, 84%, 45%)", borderColor: "hsl(346, 84%, 45%)" } : {}}
                              >
                                {selectedClients.includes(client) && (
                                  <Check className="h-2.5 w-2.5" />
                                )}
                              </div>
                              <span className="truncate">{client}</span>
                            </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

        </CardContent>
      </Card>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "list" | "analysis" | "sla" | "sla-sector")}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border border-muted/80 bg-muted/40 p-1 md:flex md:h-8 md:w-auto md:gap-0 md:p-0.5">
          <TabsTrigger value="list" className="h-10 min-w-0 gap-1.5 px-2 text-[10px] leading-tight md:h-7 md:px-3 md:text-[11px]">
            <ClipboardList className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">Consulta</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="h-10 min-w-0 gap-1.5 px-2 text-[10px] leading-tight md:h-7 md:px-3 md:text-[11px]">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">Análise IA</span>
          </TabsTrigger>
          <TabsTrigger value="sla" className="h-10 min-w-0 gap-1.5 px-2 text-[10px] leading-tight md:h-7 md:px-3 md:text-[11px]">
            <Timer className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">Tempos e SLA</span>
          </TabsTrigger>
          <TabsTrigger value="sla-sector" className="h-10 min-w-0 gap-1.5 px-2 text-[10px] leading-tight md:h-7 md:px-3 md:text-[11px]">
            <Building2 className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">SLA por setor</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeView === "list" ? (
        <>
        {/* Resultados */}
        <Card className="border border-muted/80 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" style={{ borderColor: "hsl(346, 84%, 45%) transparent" }}></div>
              <p className="text-sm text-muted-foreground">Carregando chamados...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 space-y-2">
              <p className="font-semibold">Erro ao carregar dados.</p>
              <p className="text-xs text-muted-foreground">{(error as Error).message || "Ocorreu um erro no servidor."}</p>
            </div>
          ) : chamados.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-sm">Nenhum chamado encontrado.</p>
              <p className="text-xs">Tente ajustar seus filtros ou termos de pesquisa.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border md:hidden" data-testid="tickets-mobile-list">
                {chamados.map((chamado) => (
                  <button
                    key={chamado.numeroChamado}
                    type="button"
                    onClick={() => setSelectedChamado(chamado)}
                    className="block w-full min-w-0 px-3 py-3.5 text-left transition-colors active:bg-muted/50"
                    aria-label={`Abrir chamado ${chamado.numeroChamado}: ${chamado.titulo || chamado.nomeCliente || "sem título"}`}
                  >
                    <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: "hsl(346, 84%, 45%)" }}>
                        #{chamado.numeroChamado}
                      </span>
                      <span className={cn("inline-flex max-w-full rounded-md px-1.5 py-0 text-[9px] font-semibold", statusBadgeClass(chamado.status))}>
                        <span className="truncate">{chamado.status || "—"}</span>
                      </span>
                    </span>

                    <span className="mt-2 block break-words text-sm font-bold leading-snug text-foreground">
                      {chamado.nomeCliente || "—"}
                    </span>
                    <span className="mt-1 block break-words text-xs leading-relaxed text-muted-foreground">
                      {chamado.titulo || "—"}
                    </span>

                    <span className="mt-3 grid min-w-0 grid-cols-1 gap-1.5 text-[11px] text-muted-foreground">
                      <span className="flex min-w-0 items-start gap-1.5">
                        <Filter className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="break-words">{chamado.natureza || "Sem natureza"}</span>
                      </span>
                      <span className="flex min-w-0 items-start gap-1.5">
                        <ClipboardList className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="break-words">
                          {isLegacy
                            ? chamado.produto || "Sem produto"
                            : formatChamadosProductLabel(chamado.software, catalog)}
                          {isLegacy && chamado.software ? ` · ${chamado.software}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        Abertura: {fmtDateBr(chamado.dataAbertura)}
                      </span>
                    </span>

                    <span className="mt-3 flex items-center justify-end gap-1 text-[10px] font-semibold text-primary">
                      Ver detalhes <Eye className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 w-[120px] px-3 text-xs">Chamado</TableHead>
                    <TableHead className="h-9 min-w-[200px] px-3 text-xs">Serventia / Cliente</TableHead>
                    <TableHead className="h-9 min-w-[150px] px-3 text-xs">Natureza</TableHead>
                    <TableHead className="h-9 w-[140px] px-3 text-xs">Produto</TableHead>
                    {isLegacy && (
                      <TableHead className="h-9 min-w-[180px] px-3 text-xs">Software</TableHead>
                    )}
                    <TableHead className="h-9 w-[120px] px-3 text-center text-xs">Status</TableHead>
                    <TableHead className="h-9 w-[120px] px-3 text-xs">Abertura</TableHead>
                    <TableHead className="h-9 w-[80px] px-3 text-center text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => (
                    <TableRow key={chamado.numeroChamado} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="px-3 py-2 font-mono font-medium text-[11px] text-primary" style={{ color: "hsl(346, 84%, 45%)" }}>
                        #{chamado.numeroChamado}
                      </TableCell>
                      <TableCell className="max-w-[300px] px-3 py-2">
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <span className="truncate text-xs font-semibold text-foreground" title={chamado.nomeCliente}>
                            {chamado.nomeCliente || "—"}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground" title={chamado.titulo}>
                            {chamado.titulo || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate px-3 py-2 text-xs font-normal text-muted-foreground" title={chamado.natureza}>
                        {chamado.natureza || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs" title={isLegacy ? chamado.produto : chamado.software}>
                        {isLegacy
                          ? chamado.produto || "—"
                          : formatChamadosProductLabel(chamado.software, catalog)}
                      </TableCell>
                      {isLegacy && (
                        <TableCell className="px-3 py-2 text-xs" title={chamado.software}>
                          {chamado.software || "—"}
                        </TableCell>
                      )}
                      <TableCell className="px-3 py-2 text-center">
                        <Badge className={cn("pointer-events-none px-1.5 py-0 text-[9px] font-semibold", statusBadgeClass(chamado.status))}>
                          {chamado.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                        {fmtDateBr(chamado.dataAbertura)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setSelectedChamado(chamado)}
                          title="Visualizar chamado"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Seção de Paginação */}
              <div className="flex min-w-0 flex-col items-stretch justify-between gap-3 border-t border-muted bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:py-2.5">
                <span className="break-words text-center text-xs text-muted-foreground sm:text-left">
                  Mostrando <strong className="font-medium text-foreground">{chamados.length}</strong> de <strong className="font-medium text-foreground">{totalCount}</strong> chamados encontrados.
                </span>

                <div className="flex min-w-0 flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <span>Exibir</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger aria-label="Itens por página" className="h-8 w-[68px] text-xs sm:h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 25, 50].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>por página</span>
                  </div>

                  {totalPages > 1 && (
                    <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 sm:flex sm:gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7"
                        aria-label="Página anterior"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>

                      <div className="flex items-center justify-center gap-1 px-2 text-xs text-muted-foreground">
                        <span>Página</span>
                        <strong className="font-medium text-foreground">{page}</strong>
                        <span>de</span>
                        <strong className="font-medium text-foreground">{totalPages}</strong>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7"
                        aria-label="Próxima página"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
        </Card>

        {/* Modal de Detalhes do Chamado */}
        {selectedChamado && (
          <Chamado0800DetailDialog
            chamado={selectedChamado}
            onClose={() => setSelectedChamado(null)}
            showTramites
            catalog={catalog}
          />
        )}
        </>
      ) : activeView === "analysis" ? (
        <TicketsAiAnalysis
          active
          catalog={catalog}
          filterKey={filterSyncKey}
          syncedAt={syncSnapshot?.key === filterSyncKey ? syncSnapshot.syncedAt : undefined}
          syncing={syncingPeriodo}
          filters={{
            catalog,
            startDate: dataInicio || null,
            endDate: dataFim || null,
            clientCodes: selectedClientCodes.length > 0 ? selectedClientCodes : null,
            clientNames: selectedClientFilterNames.length > 0 ? selectedClientFilterNames : null,
            product: produto,
            products: isLegacy && selectedLegacyProducts.length > 0 ? selectedLegacyProducts : null,
            softwares: isLegacy && selectedLegacySoftware.length > 0 ? selectedLegacySoftware : null,
            nature: natureza,
            searchTerm: busca || null,
            statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
            ticketNumbers: syncedTicketNumbers,
          }}
          filterDescription={{
            startDate: dataInicio,
            endDate: dataFim,
            clients: selectedClients,
            product: produto,
            products: selectedLegacyProducts,
            softwares: selectedLegacySoftware,
            nature: natureza,
            statuses: selectedStatuses,
            searchTerm: busca,
          }}
          onAnalysisResultChange={setAnalysisResult}
        />
      ) : activeView === "sla" ? (
        <TicketsSlaAnalysis
          active
          filterKey={filterSyncKey}
          syncedAt={syncSnapshot?.key === filterSyncKey ? syncSnapshot.syncedAt : undefined}
          syncing={syncingPeriodo}
          filters={{
            catalog,
            startDate: dataInicio || null,
            endDate: dataFim || null,
            clientCodes: selectedClientCodes.length > 0 ? selectedClientCodes : null,
            clientNames: selectedClientFilterNames.length > 0 ? selectedClientFilterNames : null,
            product: produto,
            products: isLegacy && selectedLegacyProducts.length > 0 ? selectedLegacyProducts : null,
            softwares: isLegacy && selectedLegacySoftware.length > 0 ? selectedLegacySoftware : null,
            nature: natureza,
            searchTerm: busca || null,
            statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
            ticketNumbers: syncedTicketNumbers,
          }}
          reportFilters={{
            catalog,
            startDate: dataInicio,
            endDate: dataFim,
            clients: selectedClients,
            product: produto,
            products: selectedLegacyProducts,
            softwares: selectedLegacySoftware,
            nature: natureza,
            statuses: selectedStatuses,
            searchTerm: busca,
          }}
        />
      ) : (
        <TicketsSlaSectorAnalysis
          active
          filterKey={filterSyncKey}
          syncedAt={syncSnapshot?.key === filterSyncKey ? syncSnapshot.syncedAt : undefined}
          syncing={syncingPeriodo}
          filters={{
            catalog,
            startDate: dataInicio || null,
            endDate: dataFim || null,
            clientCodes: selectedClientCodes.length > 0 ? selectedClientCodes : null,
            clientNames: selectedClientFilterNames.length > 0 ? selectedClientFilterNames : null,
            product: produto,
            products: isLegacy && selectedLegacyProducts.length > 0 ? selectedLegacyProducts : null,
            softwares: isLegacy && selectedLegacySoftware.length > 0 ? selectedLegacySoftware : null,
            nature: natureza,
            searchTerm: busca || null,
            statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
            ticketNumbers: syncedTicketNumbers,
          }}
        />
      )}
    </div>
  );
}
