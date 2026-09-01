import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Columns3,
  Database,
  GripVertical,
  History,
  List,
  Maximize2,
  MoreHorizontal,
  Minimize2,
  MessageSquareText,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCsCxRecordPermissions } from "@/hooks/useCsCxRecordPermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type CsCxRequest,
  type CsCxRequestInput,
  type CsCxRequestStatusConfig,
  type CsCxRequestUpdate,
  useCsCxRegistryOffices,
  useCsCxRequests,
} from "@/hooks/useCsCxCore";
import { cn } from "@/lib/utils";
import { printCsCxRequestsReport } from "@/lib/cs-cx-requests-report";

const emptyForm: CsCxRequestInput = {
  ticket_number: "",
  description: "",
  module: "",
  requester: "",
  responsible: "",
  requested_on: "",
  expected_delivery_on: "",
  delivered_on: "",
  status: "Aguardando",
  new_observation: "",
  registry_office_id: "",
};

const DEFAULT_PAGE_SIZE = 5;
const EXECUTION_FILTER_VALUE = "__execution";
const UNASSIGNED_RESPONSIBLE_FILTER_VALUE = "__unassigned";
const EXECUTION_STATUSES = ["Projeto", "Desenvolvimento", "Em andamento"];

const REQUEST_STATUS_STYLES: Record<
  string,
  { column: string; header: string; badge: string; card: string }
> = {
  Aguardando: {
    column:
      "border-amber-200 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/15",
    header:
      "border-amber-200 bg-amber-100/70 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100",
    badge:
      "bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
    card: "border-l-2 border-l-amber-400 bg-amber-50/30 dark:border-l-amber-600 dark:bg-amber-950/10",
  },
  Projeto: {
    column:
      "border-violet-200 bg-violet-50/40 dark:border-violet-900/70 dark:bg-violet-950/15",
    header:
      "border-violet-200 bg-violet-100/70 text-violet-950 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-100",
    badge:
      "bg-violet-200/80 text-violet-900 dark:bg-violet-900 dark:text-violet-100",
    card: "border-l-2 border-l-violet-400 bg-violet-50/30 dark:border-l-violet-600 dark:bg-violet-950/10",
  },
  Desenvolvimento: {
    column:
      "border-blue-200 bg-blue-50/40 dark:border-blue-900/70 dark:bg-blue-950/15",
    header:
      "border-blue-200 bg-blue-100/70 text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100",
    badge: "bg-blue-200/80 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
    card: "border-l-2 border-l-blue-400 bg-blue-50/30 dark:border-l-blue-600 dark:bg-blue-950/10",
  },
  "Em andamento": {
    column:
      "border-cyan-200 bg-cyan-50/40 dark:border-cyan-900/70 dark:bg-cyan-950/15",
    header:
      "border-cyan-200 bg-cyan-100/70 text-cyan-950 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-100",
    badge: "bg-cyan-200/80 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100",
    card: "border-l-2 border-l-cyan-400 bg-cyan-50/30 dark:border-l-cyan-600 dark:bg-cyan-950/10",
  },
  Sustentação: {
    column:
      "border-orange-200 bg-orange-50/40 dark:border-orange-900/70 dark:bg-orange-950/15",
    header:
      "border-orange-200 bg-orange-100/70 text-orange-950 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-100",
    badge:
      "bg-orange-200/80 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
    card: "border-l-2 border-l-orange-400 bg-orange-50/30 dark:border-l-orange-600 dark:bg-orange-950/10",
  },
  FastTrack: {
    column:
      "border-fuchsia-200 bg-fuchsia-50/40 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/15",
    header:
      "border-fuchsia-200 bg-fuchsia-100/70 text-fuchsia-950 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/40 dark:text-fuchsia-100",
    badge:
      "bg-fuchsia-200/80 text-fuchsia-900 dark:bg-fuchsia-900 dark:text-fuchsia-100",
    card: "border-l-2 border-l-fuchsia-400 bg-fuchsia-50/30 dark:border-l-fuchsia-600 dark:bg-fuchsia-950/10",
  },
  Finalizado: {
    column:
      "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/15",
    header:
      "border-emerald-200 bg-emerald-100/70 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100",
    badge:
      "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
    card: "border-l-2 border-l-emerald-400 bg-emerald-50/30 dark:border-l-emerald-600 dark:bg-emerald-950/10",
  },
  Negado: {
    column:
      "border-rose-200 bg-rose-50/40 dark:border-rose-900/70 dark:bg-rose-950/15",
    header:
      "border-rose-200 bg-rose-100/70 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-100",
    badge: "bg-rose-200/80 text-rose-900 dark:bg-rose-900 dark:text-rose-100",
    card: "border-l-2 border-l-rose-400 bg-rose-50/30 dark:border-l-rose-600 dark:bg-rose-950/10",
  },
};

const REQUEST_TONE_STYLES: Record<
  string,
  { column: string; header: string; badge: string; card: string }
> = {
  amber: REQUEST_STATUS_STYLES.Aguardando,
  violet: REQUEST_STATUS_STYLES.Projeto,
  blue: REQUEST_STATUS_STYLES.Desenvolvimento,
  cyan: REQUEST_STATUS_STYLES["Em andamento"],
  orange: REQUEST_STATUS_STYLES.Sustentação,
  fuchsia: REQUEST_STATUS_STYLES.FastTrack,
  emerald: REQUEST_STATUS_STYLES.Finalizado,
  red: REQUEST_STATUS_STYLES.Negado,
};

export default function CsCxRequests() {
  const {
    requests,
    statuses = FALLBACK_STATUS_CONFIGS,
    isLoading,
    error,
    refetch,
    saveRequest,
    updateStatus,
    updateRequestObservation,
    deleteRequestObservation,
    deleteRequest,
  } = useCsCxRequests();
  const { offices, error: officesError } = useCsCxRegistryOffices();
  const { canCreate, canEditRecord, canDeleteRecord } =
    useCsCxRecordPermissions("cs_cx_registros");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [form, setForm] = useState<CsCxRequestInput>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxRequest | null>(null);
  const [editingObservation, setEditingObservation] =
    useState<CsCxRequestUpdate | null>(null);
  const [observationText, setObservationText] = useState("");
  const [deletingObservation, setDeletingObservation] =
    useState<CsCxRequestUpdate | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const boardStatuses = useMemo(() => {
    const configured = statuses.filter((status) => status.active);
    const used = requests
      .map((request) => request.status)
      .filter((status): status is string => Boolean(status));
    const missing = used.filter(
      (name) => !configured.some((status) => status.name === name),
    );
    return [
      ...configured,
      ...[...new Set(missing)].map((name, index) => ({
        id: name,
        name,
        color: "slate",
        sort_order: 1000 + index,
        active: true,
        is_system: false,
      })),
    ];
  }, [requests, statuses]);
  const statusNames = boardStatuses.map((status) => status.name);
  const currentRequest = form.id
    ? (requests.find((request) => request.id === form.id) ?? null)
    : null;
  const responsibleOptions = useMemo(() => {
    const names = new Map<string, string>();
    requests.forEach((request) => {
      const name = request.responsible?.trim();
      if (name) names.set(name.toLocaleLowerCase("pt-BR"), name);
    });
    return [...names.entries()]
      .sort(([, left], [, right]) => left.localeCompare(right, "pt-BR"))
      .map(([value, label]) => ({ value, label }));
  }, [requests]);
  const hasUnassignedResponsible = requests.some(
    (request) => !request.responsible?.trim(),
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return requests.filter((request) => {
      const matchesSearch =
        !term ||
        [
          request.ticket_number,
          request.description,
          request.module,
          request.requester,
          request.responsible,
          request.registry_office?.name,
          ...(request.updates ?? []).map((update) => update.observation),
          ...(request.status_history ?? []).map((entry) => entry.status),
        ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === EXECUTION_FILTER_VALUE
          ? EXECUTION_STATUSES.includes(request.status ?? "")
          : request.status === statusFilter);
      const matchesOffice =
        officeFilter === "all" || request.registry_office_id === officeFilter;
      const responsible = request.responsible?.trim();
      const matchesResponsible =
        responsibleFilter === "all" ||
        (responsibleFilter === UNASSIGNED_RESPONSIBLE_FILTER_VALUE
          ? !responsible
          : responsible?.toLocaleLowerCase("pt-BR") === responsibleFilter);
      const requestDate =
        request.requested_on ?? request.created_at?.slice(0, 10) ?? "";
      const matchesPeriod =
        (!periodStart && !periodEnd) ||
        (Boolean(requestDate) &&
          (!periodStart || requestDate >= periodStart) &&
          (!periodEnd || requestDate <= periodEnd));
      return (
        matchesSearch &&
        matchesStatus &&
        matchesOffice &&
        matchesResponsible &&
        matchesPeriod
      );
    });
  }, [requests, search, statusFilter, officeFilter, responsibleFilter, periodStart, periodEnd]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRequests = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };
  const updateOfficeFilter = (value: string) => {
    setOfficeFilter(value);
    setPage(1);
  };
  const updateResponsibleFilter = (value: string) => {
    setResponsibleFilter(value);
    setPage(1);
  };
  const updatePeriodStart = (value: string) => {
    setPeriodStart(value);
    setPage(1);
  };
  const updatePeriodEnd = (value: string) => {
    setPeriodEnd(value);
    setPage(1);
  };
  const updatePageSize = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const reportFilterDescription = useMemo(() => {
    const office = offices.find((item) => item.id === officeFilter)?.name;
    const period =
      periodStart || periodEnd
        ? `Período da solicitação: ${periodStart ? formatDate(periodStart) : "início"} até ${periodEnd ? formatDate(periodEnd) : "hoje"}`
        : "Período da solicitação: todos";
    return [
      period,
      `Status: ${statusFilter === "all" ? "todos" : statusFilter === EXECUTION_FILTER_VALUE ? "Em execução" : statusFilter}`,
      `Cartório: ${office ?? "todos"}`,
      `Responsável: ${responsibleFilter === "all" ? "todos" : responsibleFilter === UNASSIGNED_RESPONSIBLE_FILTER_VALUE ? "sem responsável" : responsibleOptions.find((item) => item.value === responsibleFilter)?.label ?? responsibleFilter}`,
      ...(search.trim() ? [`Busca: ${search.trim()}`] : []),
    ].join(" · ");
  }, [offices, officeFilter, periodEnd, periodStart, responsibleFilter, responsibleOptions, search, statusFilter]);

  const openCreate = () => {
    setEditingObservation(null);
    setObservationText("");
    setDeletingObservation(null);
    setForm({
      ...emptyForm,
      requested_on: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const openEdit = (request: CsCxRequest) => {
    setEditingObservation(null);
    setObservationText("");
    setDeletingObservation(null);
    setForm({
      id: request.id,
      ticket_number: request.ticket_number ?? "",
      description: request.description ?? "",
      module: request.module ?? "",
      requester: request.requester ?? "",
      responsible: request.responsible ?? "",
      requested_on: request.requested_on ?? "",
      expected_delivery_on: request.expected_delivery_on ?? "",
      delivered_on: request.delivered_on ?? "",
      status: request.status ?? "Aguardando",
      new_observation: "",
      registry_office_id: request.registry_office_id,
    });
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.description.trim() || !form.registry_office_id) return;
    try {
      await saveRequest.mutateAsync(form);
      changeDialogOpen(false);
      toast({
        title: "Solicitação salva",
        description: "Os dados foram atualizados com sucesso.",
      });
    } catch (mutationError) {
      toast({
        title: "Não foi possível salvar",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const changeStatus = async (request: CsCxRequest, status: string) => {
    if (status === request.status) return;
    try {
      await updateStatus.mutateAsync({ id: request.id, status });
      toast({
        title: "Status atualizado",
        description: `${request.ticket_number || "Solicitação"}: ${status}`,
      });
    } catch (mutationError) {
      toast({
        title: "Não foi possível atualizar",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteRequest.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Solicitação excluída" });
    } catch (mutationError) {
      toast({
        title: "Não foi possível excluir",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const startObservationEdit = (update: CsCxRequestUpdate) => {
    setEditingObservation(update);
    setObservationText(update.observation);
  };

  const cancelObservationEdit = () => {
    setEditingObservation(null);
    setObservationText("");
  };

  const saveObservationEdit = async () => {
    const observation = observationText.trim();
    if (!editingObservation || !observation) return;
    try {
      await updateRequestObservation.mutateAsync({
        id: editingObservation.id,
        observation,
      });
      cancelObservationEdit();
      toast({
        title: "Observação atualizada",
        description: "O histórico foi atualizado com sucesso.",
      });
    } catch (mutationError) {
      toast({
        title: "Não foi possível atualizar a observação",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const confirmObservationDelete = async () => {
    if (!deletingObservation) return;
    try {
      await deleteRequestObservation.mutateAsync(deletingObservation.id);
      if (editingObservation?.id === deletingObservation.id)
        cancelObservationEdit();
      setDeletingObservation(null);
      toast({ title: "Observação excluída" });
    } catch (mutationError) {
      toast({
        title: "Não foi possível excluir a observação",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const changeDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      cancelObservationEdit();
      setDeletingObservation(null);
    }
  };

  const printReport = async () => {
    const targetWindow = window.open("", "_blank");
    if (targetWindow) {
      targetWindow.opener = null;
      targetWindow.document.title = "Preparando relatório de solicitações";
      targetWindow.document.body.innerHTML =
        '<p style="font:14px Arial;padding:24px">Preparando relatório para impressão...</p>';
    }
    setIsPrinting(true);
    try {
      await printCsCxRequestsReport(
        filtered,
        reportFilterDescription,
        targetWindow,
      );
      if (!targetWindow)
        toast({
          title: "Relatório gerado",
          description:
            "O navegador bloqueou a janela de impressão; o PDF foi baixado.",
        });
    } catch (reportError) {
      targetWindow?.close();
      toast({
        title: "Não foi possível gerar o relatório",
        description: errorMessage(reportError),
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const dataError = error ?? officesError;

  return (
    <div data-testid="cs-cx-requests-page" className="container mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-hidden px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
              <ClipboardList className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-2xl font-black leading-none tracking-tight">
                Solicitações
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Registros operacionais dos cartórios
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:flex md:flex-wrap">
          <Button
            size="sm"
            variant="outline"
            disabled={!filtered.length || isPrinting}
            onClick={() => void printReport()}
            className="w-full gap-2 md:w-auto"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? "Gerando..." : "Imprimir relatório"}
          </Button>
          {canCreate && (
            <Button size="sm" onClick={openCreate} className="w-full gap-2 md:w-auto">
              <Plus className="h-4 w-4" /> Nova solicitação
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total"
          value={requests.length}
          active={statusFilter === "all"}
          onClick={() => updateStatusFilter("all")}
        />
        <Metric
          label="Aguardando"
          value={requests.filter((item) => item.status === "Aguardando").length}
          active={statusFilter === "Aguardando"}
          onClick={() => updateStatusFilter("Aguardando")}
        />
        <Metric
          label="Em execução"
          value={
            requests.filter((item) =>
              EXECUTION_STATUSES.includes(item.status ?? ""),
            ).length
          }
          active={statusFilter === EXECUTION_FILTER_VALUE}
          onClick={() => updateStatusFilter(EXECUTION_FILTER_VALUE)}
        />
        <Metric
          label="Finalizadas"
          value={requests.filter((item) => item.status === "Finalizado").length}
          active={statusFilter === "Finalizado"}
          onClick={() => updateStatusFilter("Finalizado")}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_190px_190px_350px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Buscar chamado, descrição, módulo ou responsável..."
                className="h-9 pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={updateStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value={EXECUTION_FILTER_VALUE}>
                  Em execução (grupo)
                </SelectItem>
                {statusNames.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={officeFilter} onValueChange={updateOfficeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos os cartórios" />
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
            <Select
              value={responsibleFilter}
              onValueChange={updateResponsibleFilter}
            >
              <SelectTrigger
                aria-label="Filtrar solicitações por responsável"
                className="h-9"
              >
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {hasUnassignedResponsible && (
                  <SelectItem value={UNASSIGNED_RESPONSIBLE_FILTER_VALUE}>
                    Sem responsável
                  </SelectItem>
                )}
                {responsibleOptions.map((responsible) => (
                  <SelectItem key={responsible.value} value={responsible.value}>
                    {responsible.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div
              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-1 rounded-md border bg-background px-2 py-1 sm:h-9 sm:flex sm:py-0"
              title="Período da solicitação"
            >
              <CalendarClock
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <span className="sr-only">Período da solicitação</span>
              <Input
                aria-label="Período inicial da solicitação"
                type="date"
                value={periodStart}
                max={periodEnd || undefined}
                onChange={(event) => updatePeriodStart(event.target.value)}
                className="h-7 min-w-0 border-0 px-1 text-xs shadow-none focus-visible:ring-0 sm:w-[132px] sm:min-w-[132px]"
              />
              <span className="shrink-0 text-[11px] text-muted-foreground">
                até
              </span>
              <Input
                aria-label="Período final da solicitação"
                type="date"
                value={periodEnd}
                min={periodStart || undefined}
                onChange={(event) => updatePeriodEnd(event.target.value)}
                className="h-7 min-w-0 border-0 px-1 text-xs shadow-none focus-visible:ring-0 sm:w-[132px] sm:min-w-[132px]"
              />
              {(periodStart || periodEnd) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  aria-label="Limpar período"
                  onClick={() => {
                    setPeriodStart("");
                    setPeriodEnd("");
                    setPage(1);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : dataError ? (
            <DataError error={dataError} onRetry={() => void refetch()} />
          ) : (
            <Tabs defaultValue="list">
              <TabsList className="h-9">
                <TabsTrigger value="list" className="h-7 gap-2">
                  <List className="h-3.5 w-3.5" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="board" className="h-7 gap-2">
                  <Columns3 className="h-3.5 w-3.5" />
                  Quadro
                </TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="mt-3 space-y-3">
                <RequestTable
                  requests={pagedRequests}
                  canEdit={canEditRecord}
                  canDelete={canDeleteRecord}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
                <PaginationBar
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onPageSizeChange={updatePageSize}
                />
              </TabsContent>
              <TabsContent value="board" className="mt-3">
                <RequestBoard
                  requests={filtered}
                  statuses={boardStatuses}
                  canEdit={canEditRecord}
                  onEdit={openEdit}
                  onStatusChange={changeStatus}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={changeDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-4 sm:max-h-[92vh] sm:max-w-5xl sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar solicitação" : "Nova solicitação"}
            </DialogTitle>
            <DialogDescription>
              Campos preservados do fluxo de registros do SistemaRegistro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cartório *">
                <Select
                  value={form.registry_office_id}
                  onValueChange={(value) =>
                    setForm({ ...form, registry_office_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cartório" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices
                      .filter(
                        (office) =>
                          office.active ||
                          office.id === form.registry_office_id,
                      )
                      .map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Chamado">
                <Input
                  value={form.ticket_number}
                  onChange={(event) =>
                    setForm({ ...form, ticket_number: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Descrição *">
              <Textarea
                required
                maxLength={1500}
                className="min-h-24"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Módulo">
                <Input
                  value={form.module}
                  onChange={(event) =>
                    setForm({ ...form, module: event.target.value })
                  }
                />
              </Field>
              <Field label="Solicitante">
                <Input
                  value={form.requester}
                  onChange={(event) =>
                    setForm({ ...form, requester: event.target.value })
                  }
                />
              </Field>
              <Field label="Responsável">
                <Input
                  value={form.responsible}
                  onChange={(event) =>
                    setForm({ ...form, responsible: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Solicitação">
                <Input
                  type="date"
                  value={form.requested_on}
                  onChange={(event) =>
                    setForm({ ...form, requested_on: event.target.value })
                  }
                />
              </Field>
              <Field label="Previsão">
                <Input
                  type="date"
                  value={form.expected_delivery_on}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      expected_delivery_on: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Entrega">
                <Input
                  type="date"
                  value={form.delivered_on}
                  onChange={(event) =>
                    setForm({ ...form, delivered_on: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label={currentRequest ? "Adicionar novo status" : "Status"}>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger
                  aria-label={
                    currentRequest
                      ? "Adicionar novo status"
                      : "Status da solicitação"
                  }
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusNames.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentRequest && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ao selecionar outro status e salvar, o status atual será
                  preservado no histórico abaixo.
                </p>
              )}
            </Field>
            {currentRequest && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-rose-500" />
                  <Label>Histórico de status</Label>
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {currentRequest.status_history?.length ?? 0}
                  </Badge>
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                  {currentRequest.status_history?.length ? (
                    currentRequest.status_history.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-2 rounded-md border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px]"
                          >
                            Status {index + 1}
                          </Badge>
                          <StatusBadge status={entry.status} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {entry.author?.full_name ||
                            entry.author?.email ||
                            (entry.origin === "legacy"
                              ? "Sistema legado"
                              : "Usuário removido")}
                          {" · "}
                          {formatDateTime(entry.occurred_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      O status atual será o primeiro item deste histórico.
                    </p>
                  )}
                </div>
              </div>
            )}
            {currentRequest && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-rose-500" />
                  <Label>Histórico de observações</Label>
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {currentRequest.updates?.length ?? 0}
                  </Badge>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                  {currentRequest.updates?.length ? (
                    currentRequest.updates.map((update) => {
                      const isEditing = editingObservation?.id === update.id;
                      const canEditObservation = canEditRecord(
                        update.author_profile_id,
                      );
                      const canDeleteObservation = canDeleteRecord(
                        update.author_profile_id,
                      );
                      return (
                        <div
                          key={update.id}
                          className="rounded-md border bg-background px-3 py-2"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                aria-label="Texto da observação"
                                autoFocus
                                value={observationText}
                                onChange={(event) =>
                                  setObservationText(event.target.value)
                                }
                                className="min-h-24"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelObservationEdit}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={
                                    !observationText.trim() ||
                                    updateRequestObservation.isPending
                                  }
                                  onClick={() => void saveObservationEdit()}
                                >
                                  {updateRequestObservation.isPending
                                    ? "Salvando..."
                                    : "Salvar observação"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="whitespace-pre-wrap text-sm">
                                  {update.observation}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {update.author?.full_name ||
                                    update.author?.email ||
                                    (update.origin === "legacy"
                                      ? "Sistema legado"
                                      : "Usuário removido")}{" "}
                                  · {formatDateTime(update.occurred_at)}
                                </p>
                              </div>
                              {(canEditObservation || canDeleteObservation) && (
                                <div className="flex shrink-0 items-start gap-1">
                                  {canEditObservation && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      aria-label="Editar observação"
                                      onClick={() =>
                                        startObservationEdit(update)
                                      }
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDeleteObservation && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      aria-label="Excluir observação"
                                      onClick={() =>
                                        setDeletingObservation(update)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      Nenhuma observação registrada.
                    </p>
                  )}
                </div>
              </div>
            )}
            <Field
              label={currentRequest ? "Nova observação" : "Observação inicial"}
            >
              <Textarea
                value={form.new_observation ?? ""}
                onChange={(event) =>
                  setForm({ ...form, new_observation: event.target.value })
                }
                placeholder="A observação será adicionada ao histórico sem apagar as anteriores."
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => changeDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveRequest.isPending}>
                {saveRequest.isPending ? "Salvando..." : "Salvar solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o registro do HUB. Enquanto o sistema legado for
              a fonte oficial, itens importados podem reaparecer na próxima
              sincronização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingObservation}
        onOpenChange={(open) => !open && setDeletingObservation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta observação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove definitivamente a observação do histórico da
              solicitação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteRequestObservation.isPending}
              onClick={() => void confirmObservationDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRequestObservation.isPending
                ? "Excluindo..."
                : "Excluir observação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RequestTable({
  requests,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  requests: CsCxRequest[];
  canEdit: (ownerId: string | null) => boolean;
  canDelete: (ownerId: string | null) => boolean;
  onEdit: (request: CsCxRequest) => void;
  onDelete: (request: CsCxRequest) => void;
}) {
  const isMobile = useIsMobile();
  const headClass = "h-9 px-3 text-xs";
  const cellClass = "px-3 py-2";
  return (
    <>
      {isMobile && <div data-testid="cs-cx-requests-mobile-list" className="space-y-2 md:hidden">
        {requests.length === 0 ? (
          <div className="rounded-lg border px-3 py-10 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </div>
        ) : requests.map((request) => {
          const editable = canEdit(request.author_profile_id);
          const deletable = canDelete(request.author_profile_id);
          return (
            <article key={request.id} className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Chamado</p>
                  <p className="truncate text-sm font-bold">
                    {request.ticket_number || `#${request.legacy_id ?? request.id.slice(0, 8)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={request.status} />
                  {(editable || deletable) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações da solicitação">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {editable && <DropdownMenuItem onClick={() => onEdit(request)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}
                        {deletable && <DropdownMenuItem className="text-destructive" onClick={() => onDelete(request)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <p className="mt-2 break-words text-sm font-medium">{request.registry_office?.name ?? "—"}</p>
              <p className="mt-1 line-clamp-3 break-words text-xs leading-5 text-muted-foreground">{request.description || "Sem descrição"}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2 text-xs">
                <div className="min-w-0"><span className="block text-[10px] uppercase text-muted-foreground">Responsável</span><span className="block truncate">{request.responsible || "—"}</span></div>
                <div><span className="block text-[10px] uppercase text-muted-foreground">Previsão</span>{formatDate(request.expected_delivery_on)}</div>
              </div>
            </article>
          );
        })}
      </div>}
      {!isMobile && <div className="hidden overflow-x-auto rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={headClass}>Chamado</TableHead>
            <TableHead className={headClass}>Cartório</TableHead>
            <TableHead className={headClass}>Descrição</TableHead>
            <TableHead className={headClass}>Responsável</TableHead>
            <TableHead className={headClass}>Previsão</TableHead>
            <TableHead className={headClass}>Status</TableHead>
            <TableHead className="h-9 w-12 px-2" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma solicitação encontrada.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const editable = canEdit(request.author_profile_id);
              const deletable = canDelete(request.author_profile_id);
              return (
                <TableRow key={request.id}>
                  <TableCell className={cn(cellClass, "font-medium")}>
                    {request.ticket_number ||
                      `#${request.legacy_id ?? request.id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {request.registry_office?.name ?? "—"}
                  </TableCell>
                  <TableCell className={cellClass}>
                    <p
                      className="max-w-md truncate"
                      title={request.description ?? ""}
                    >
                      {request.description || "Sem descrição"}
                    </p>
                    <p className="text-[11px] leading-4 text-muted-foreground">
                      {request.module || "Módulo não informado"}
                    </p>
                  </TableCell>
                  <TableCell className={cellClass}>
                    {request.responsible || "—"}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {formatDate(request.expected_delivery_on)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {(editable || deletable) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {editable && (
                            <DropdownMenuItem onClick={() => onEdit(request)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {deletable && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDelete(request)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>}
    </>
  );
}

function PaginationBar({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span
        aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} solicitações`}
      >
        Mostrando{" "}
        <strong className="font-semibold text-foreground">
          {firstItem}–{lastItem}
        </strong>{" "}
        de{" "}
        <strong className="font-semibold text-foreground">{totalItems}</strong>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span>Por página</span>
        <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
          <SelectTrigger aria-label="Itens por página" className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="min-w-[92px] text-center">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Página anterior"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Próxima página"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RequestBoard({
  requests,
  statuses,
  canEdit,
  onEdit,
  onStatusChange,
}: {
  requests: CsCxRequest[];
  statuses: CsCxRequestStatusConfig[];
  canEdit: (ownerId: string | null) => boolean;
  onEdit: (request: CsCxRequest) => void;
  onStatusChange: (request: CsCxRequest, status: string) => void;
}) {
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileStatus, setMobileStatus] = useState(statuses[0]?.name ?? "");
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const finishDrag = () => {
    setDraggedRequestId(null);
    setDragOverStatus(null);
  };

  const dropRequest = (status: string) => {
    const request = requests.find((item) => item.id === draggedRequestId);
    finishDrag();
    if (request && request.status !== status)
      void onStatusChange(request, status);
  };
  const draggedRequest = requests.find((item) => item.id === draggedRequestId);
  const canEditDragged = Boolean(
    draggedRequest && canEdit(draggedRequest.author_profile_id),
  );
  const canEditAny = requests.some((request) =>
    canEdit(request.author_profile_id),
  );

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFullscreen]);

  return (
    <section
      aria-label="Quadro de solicitações"
      className={cn(
        "relative flex min-h-0 flex-col gap-2",
        isFullscreen && "fixed inset-0 z-50 bg-background p-3 sm:p-4",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-3",
          !isFullscreen && "md:absolute md:-top-12 md:left-[190px] md:right-0",
        )}
      >
        <div>
          <p className="text-sm font-semibold">Fluxo das solicitações</p>
          <p className="text-[11px] text-muted-foreground">
            {canEditAny
              ? "Arraste os cartões permitidos entre as colunas para alterar o status."
              : "Role cada coluna separadamente para consultar as solicitações."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-2"
          aria-label={
            isFullscreen ? "Sair da tela cheia" : "Abrir quadro em tela cheia"
          }
          onClick={() => setIsFullscreen((current) => !current)}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          </span>
        </Button>
      </div>

      <Select value={mobileStatus || statuses[0]?.name} onValueChange={setMobileStatus}>
        <SelectTrigger data-testid="cs-cx-requests-mobile-status" className="h-9 w-full md:hidden" aria-label="Etapa do quadro"><SelectValue placeholder="Selecione uma etapa" /></SelectTrigger>
        <SelectContent>{statuses.map((status) => <SelectItem key={status.id} value={status.name}>{status.name} ({requests.filter((request) => request.status === status.name).length})</SelectItem>)}</SelectContent>
      </Select>

      <div
        className={cn(
          "flex h-[calc(100dvh-340px)] min-h-[380px] max-h-[620px] gap-2 overflow-hidden overscroll-contain rounded-lg border bg-muted/10 p-2 md:overflow-x-auto",
          isFullscreen && "h-auto max-h-none flex-1",
        )}
      >
        {statuses.filter((statusConfig) => !isMobile || statusConfig.name === (mobileStatus || statuses[0]?.name)).map((statusConfig) => {
          const status = statusConfig.name;
          const items = requests.filter((request) => request.status === status);
          const styles =
            REQUEST_TONE_STYLES[statusConfig.color] ??
            REQUEST_STATUS_STYLES[status] ??
            NEUTRAL_STATUS_STYLES;
          const isDropTarget =
            canEditDragged &&
            dragOverStatus === status &&
            draggedRequest?.status !== status;
          return (
            <div
              key={status}
              aria-label={`${status}: ${items.length} solicitações`}
              className={cn(
                "h-full w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border transition-all md:flex md:w-[260px]",
                status === (mobileStatus || statuses[0]?.name) ? "flex" : "hidden",
                styles.column,
                isDropTarget &&
                  "scale-[0.99] border-rose-400 bg-rose-50/80 ring-2 ring-rose-400 ring-offset-1 dark:border-rose-500 dark:bg-rose-950/30 dark:ring-rose-500",
              )}
              onDragEnter={(event) => {
                if (!canEditDragged || !draggedRequestId) return;
                event.preventDefault();
                setDragOverStatus(status);
              }}
              onDragOver={(event) => {
                if (!canEditDragged || !draggedRequestId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverStatus(status);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (canEditDragged) dropRequest(status);
              }}
            >
              <div
                className={cn(
                  "flex h-10 shrink-0 items-center justify-between border-b px-3",
                  styles.header,
                )}
              >
                <span className="truncate text-xs font-semibold">{status}</span>
                <Badge
                  className={cn(
                    "h-5 min-w-6 justify-center border-0 px-1.5 text-[10px] hover:bg-inherit",
                    styles.badge,
                  )}
                >
                  {items.length}
                </Badge>
              </div>
              <div
                aria-label={`Solicitações em ${status}`}
                className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5"
              >
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-[11px] text-muted-foreground">
                    Sem itens
                  </div>
                ) : (
                  items.map((request) => {
                    const editable = canEdit(request.author_profile_id);
                    return (
                      <Card
                        key={request.id}
                        draggable={editable}
                        aria-label={
                          editable
                            ? `Arrastar ${request.ticket_number || "solicitação"}`
                            : undefined
                        }
                        className={cn(
                          "shadow-none transition-opacity",
                          styles.card,
                          editable && "cursor-grab active:cursor-grabbing",
                          draggedRequestId === request.id && "opacity-40",
                        )}
                        onDragStart={(event) => {
                          if (!editable) return;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", request.id);
                          setDraggedRequestId(request.id);
                        }}
                        onDragEnd={finishDrag}
                      >
                        <CardHeader className="space-y-1 p-2 pb-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1">
                              <GripVertical
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 text-muted-foreground",
                                  !editable && "hidden",
                                )}
                              />
                              <Badge
                                variant="outline"
                                className="h-5 max-w-[165px] truncate bg-background/70 px-1.5 font-mono text-[9px]"
                              >
                                {request.ticket_number ||
                                  `#${request.legacy_id ?? request.id.slice(0, 6)}`}
                              </Badge>
                            </div>
                            {editable && (
                              <Button
                                aria-label={`Editar ${request.ticket_number || "solicitação"}`}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => onEdit(request)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <CardTitle
                            className="line-clamp-2 text-xs leading-4"
                            title={request.description ?? ""}
                          >
                            {request.description || "Sem descrição"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 p-2 pt-0">
                          <p
                            className="truncate text-[10px] leading-4 text-muted-foreground"
                            title={request.registry_office?.name}
                          >
                            {request.registry_office?.name ??
                              "Cartório não informado"}
                          </p>
                          {editable && (
                            <Select
                              value={request.status ?? "Aguardando"}
                              onValueChange={(value) =>
                                void onStatusChange(request, value)
                              }
                            >
                              <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statuses.map((item) => (
                                  <SelectItem key={item.id} value={item.name}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "Finalizado" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "Negado" && "border-red-200 bg-red-50 text-red-700",
        ["Projeto", "Desenvolvimento", "Em andamento"].includes(status ?? "") &&
          "border-blue-200 bg-blue-50 text-blue-700",
        status === "Sustentação" &&
          "border-orange-200 bg-orange-50 text-orange-700",
        status === "FastTrack" &&
          "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
      )}
    >
      {status || "Aguardando"}
    </Badge>
  );
}

function Metric({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Filtrar por ${label}: ${value} solicitações`}
      aria-pressed={active}
      onClick={onClick}
      className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
    >
      <Card
        className={cn(
          "h-full transition-colors hover:border-rose-300 hover:bg-rose-50/40",
          active &&
            "border-rose-400 bg-rose-50 ring-1 ring-rose-300 dark:bg-rose-950/20",
        )}
      >
        <CardContent className="flex items-center justify-between px-3 py-2.5">
          <div>
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                active && "text-rose-700 dark:text-rose-300",
              )}
            >
              {label}
            </p>
            <p className="text-xl font-bold leading-6">{value}</p>
          </div>
          <CalendarClock
            className={cn("h-4 w-4 text-rose-500", active && "fill-rose-100")}
          />
        </CardContent>
      </Card>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-14 w-full" />
      ))}
    </div>
  );
}

function DataError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
      <Database className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Base CS/CX ainda não disponível</p>
        <p className="max-w-lg text-sm text-muted-foreground">
          Aplique as migrations desta branch antes de usar a tela.{" "}
          {errorMessage(error)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const NEUTRAL_STATUS_STYLES = {
  column:
    "border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-950/15",
  header:
    "border-slate-200 bg-slate-100/70 text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
  badge: "bg-slate-200/80 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  card: "border-l-2 border-l-slate-400 bg-slate-50/30 dark:border-l-slate-600 dark:bg-slate-950/10",
};

const FALLBACK_STATUS_CONFIGS: CsCxRequestStatusConfig[] = [
  "Aguardando",
  "Projeto",
  "Desenvolvimento",
  "Em andamento",
  "Sustentação",
  "FastTrack",
  "Finalizado",
  "Negado",
].map((name, index) => ({
  id: name,
  name,
  color: "slate",
  sort_order: index,
  active: true,
  is_system: true,
}));

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
