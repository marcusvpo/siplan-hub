import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardCheck,
  Clock3,
  Database,
  Eye,
  FileDown,
  ListChecks,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import {
  type CsCxOfficeRoutine,
  type CsCxRoutineItemConfig,
  type CsCxRoutineModel,
  useCsCxRoutines,
} from "@/hooks/useCsCxRoutines";
import { useCsCxRecordPermissions } from "@/hooks/useCsCxRecordPermissions";
import { useToast } from "@/hooks/use-toast";
import { generateCsCxRoutinePdf } from "@/lib/cs-cx-routines-report";
import {
  decodeRoutineObservations,
  encodeRoutineObservations,
  normalizeRoutineObservations,
} from "@/lib/cs-cx-routine-observations";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/utils/normalize-search";

const STATUS_OPTIONS = [
  { value: "analisar", label: "Analisar" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
] as const;
const DEFAULT_PAGE_SIZE = 5;
const UNASSIGNED_PRODUCT_ID = "__without_product__";

interface RoutineProductOption {
  id: string;
  name: string;
}

function getRoutineProductOptions(
  officeRoutines: CsCxOfficeRoutine[],
  modelsById: Map<string, CsCxRoutineModel>,
): RoutineProductOption[] {
  const productsById = new Map<string, string>();
  let hasRoutineWithoutProduct = false;

  officeRoutines.forEach((routine) => {
    const products = modelsById.get(routine.routine_model_id)?.products ?? [];
    if (!products.length) hasRoutineWithoutProduct = true;
    products.forEach((product) => productsById.set(product.id, product.name));
  });

  const options = [...productsById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  if (hasRoutineWithoutProduct) {
    options.push({ id: UNASSIGNED_PRODUCT_ID, name: "Sem produto" });
  }
  return options;
}

export interface CsCxOfficeRoutineSummary {
  registryOfficeId: string;
  registryOfficeName: string;
  routines: CsCxOfficeRoutine[];
  activeItems: number;
  inactiveItems: number;
  pendingItems: number;
  totalItems: number;
  lastAnalysis: string | null;
  analyzed: boolean;
}

export function summarizeOfficeRoutines(
  routines: CsCxOfficeRoutine[],
): CsCxOfficeRoutineSummary[] {
  const grouped = new Map<string, CsCxOfficeRoutine[]>();
  routines.forEach((routine) => {
    const current = grouped.get(routine.registry_office_id) ?? [];
    current.push(routine);
    grouped.set(routine.registry_office_id, current);
  });

  return [...grouped.entries()].map(([registryOfficeId, officeRoutines]) => {
    const items = officeRoutines.flatMap((routine) => routine.items);
    const analysisDates = items
      .map((item) => item.analyzed_at)
      .filter((value): value is string => Boolean(value))
      .sort();
    return {
      registryOfficeId,
      registryOfficeName:
        officeRoutines[0]?.registry_office?.name ?? "Cartório removido",
      routines: officeRoutines,
      activeItems: items.filter((item) => item.active === true).length,
      inactiveItems: items.filter((item) => item.active === false).length,
      pendingItems: items.filter((item) => item.active === null).length,
      totalItems: items.length,
      lastAnalysis: analysisDates.at(-1) ?? null,
      analyzed:
        items.length > 0 && items.every((item) => Boolean(item.analyzed_at)),
    };
  });
}

function includeOfficesWithoutRoutines(
  summaries: CsCxOfficeRoutineSummary[],
  offices: Array<{ id: string; name: string }>,
) {
  const summariesByOffice = new Map(
    summaries.map((summary) => [summary.registryOfficeId, summary]),
  );
  const officeIds = new Set(offices.map((office) => office.id));

  return [
    ...offices.map(
      (office): CsCxOfficeRoutineSummary =>
        summariesByOffice.get(office.id) ?? {
          registryOfficeId: office.id,
          registryOfficeName: office.name,
          routines: [],
          activeItems: 0,
          inactiveItems: 0,
          pendingItems: 0,
          totalItems: 0,
          lastAnalysis: null,
          analyzed: false,
        },
    ),
    ...summaries.filter((summary) => !officeIds.has(summary.registryOfficeId)),
  ];
}

export default function CsCxRoutines() {
  const {
    models,
    routines,
    history,
    isLoading,
    error,
    refetch,
    applyRoutine,
    setRoutineItem,
    setAllRoutineItems,
    deleteRoutine,
  } = useCsCxRoutines();
  const { offices } = useCsCxRegistryOffices();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [applicationPage, setApplicationPage] = useState(1);
  const [applicationPageSize, setApplicationPageSize] =
    useState(DEFAULT_PAGE_SIZE);
  const [modelPage, setModelPage] = useState(1);
  const [modelPageSize, setModelPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    registryOfficeId: "",
    routineModelId: "",
    observations: [""],
  });
  const [editingItem, setEditingItem] = useState<{
    routine: CsCxOfficeRoutine;
    item: CsCxRoutineItemConfig;
  } | null>(null);
  const [itemStatus, setItemStatus] = useState("analisar");
  const [itemBeforeObservations, setItemBeforeObservations] = useState<
    string[]
  >([""]);
  const [itemAfterObservations, setItemAfterObservations] = useState<string[]>([
    "",
  ]);
  const [itemAnalysisDate, setItemAnalysisDate] = useState(todayKey());
  const [openedOfficeId, setOpenedOfficeId] = useState<string | null>(null);
  const [analysisProductId, setAnalysisProductId] = useState("all");
  const [analysisFullscreen, setAnalysisFullscreen] = useState(false);
  const [analysisSearch, setAnalysisSearch] = useState("");
  const [analysisPage, setAnalysisPage] = useState(1);
  const [analysisPageSize, setAnalysisPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [bulkAnalysisOpen, setBulkAnalysisOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("analisar");
  const [bulkObservations, setBulkObservations] = useState<string[]>([""]);
  const [bulkAnalysisDate, setBulkAnalysisDate] = useState(todayKey());
  const [deleting, setDeleting] = useState<CsCxOfficeRoutine | null>(null);
  const [exportingRoutineId, setExportingRoutineId] = useState<string | null>(
    null,
  );
  const [historySearch, setHistorySearch] = useState("");
  const [historyAction, setHistoryAction] = useState("all");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { canCreate, canEditRecord, canDeleteRecord } =
    useCsCxRecordPermissions("cs_cx_rotinas");
  const openedOfficeRoutines = useMemo(
    () =>
      openedOfficeId
        ? routines.filter(
            (routine) => routine.registry_office_id === openedOfficeId,
          )
        : [],
    [openedOfficeId, routines],
  );
  const routineModelsById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );
  const openedOfficeProducts = useMemo(
    () => getRoutineProductOptions(openedOfficeRoutines, routineModelsById),
    [openedOfficeRoutines, routineModelsById],
  );
  const analysisRoutines = useMemo(() => {
    if (analysisProductId === "all") return openedOfficeRoutines;
    return openedOfficeRoutines.filter((routine) => {
      const products =
        routineModelsById.get(routine.routine_model_id)?.products ?? [];
      return analysisProductId === UNASSIGNED_PRODUCT_ID
        ? products.length === 0
        : products.some((product) => product.id === analysisProductId);
    });
  }, [analysisProductId, openedOfficeRoutines, routineModelsById]);
  const analysisProductName =
    openedOfficeProducts.find((product) => product.id === analysisProductId)
      ?.name ?? null;
  const openedOfficeItems = useMemo(() => {
    const term = analysisSearch.trim().toLocaleLowerCase("pt-BR");
    return analysisRoutines
      .flatMap((routine) => routine.items.map((item) => ({ routine, item })))
      .filter(
        ({ routine, item }) =>
          !term ||
          [
            routine.routine_model?.name,
            item.model_item?.name,
            item.model_item?.category?.name,
            item.model_item?.routine_type?.name,
            item.notes,
            item.analysis_notes,
          ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)),
      );
  }, [analysisRoutines, analysisSearch]);
  const analysisTotalPages = Math.max(
    1,
    Math.ceil(openedOfficeItems.length / analysisPageSize),
  );
  const currentAnalysisPage = Math.min(analysisPage, analysisTotalPages);
  const pagedOfficeItems = useMemo(
    () =>
      openedOfficeItems.slice(
        (currentAnalysisPage - 1) * analysisPageSize,
        currentAnalysisPage * analysisPageSize,
      ),
    [analysisPageSize, currentAnalysisPage, openedOfficeItems],
  );
  const analysisTotals = useMemo(() => {
    const items = analysisRoutines.flatMap((routine) => routine.items);
    return {
      routines: analysisRoutines.length,
      items: items.length,
      analyzed: items.filter((item) => item.analyzed_at).length,
    };
  }, [analysisRoutines]);

  const appliedOfficeSummaries = useMemo(
    () => summarizeOfficeRoutines(routines),
    [routines],
  );
  const allOfficeSummaries = useMemo(
    () => includeOfficesWithoutRoutines(appliedOfficeSummaries, offices),
    [appliedOfficeSummaries, offices],
  );
  const filteredOffices = useMemo(() => {
    const term = normalizeSearchText(search);
    const candidates =
      term || officeFilter !== "all"
        ? allOfficeSummaries
        : appliedOfficeSummaries;
    return candidates.filter((summary) => {
      const matchesTerm =
        !term ||
        [
          summary.registryOfficeName,
          ...summary.routines.flatMap((routine) => [
            routine.routine_model?.name,
            routine.notes,
          ]),
        ].some((value) => normalizeSearchText(value ?? "").includes(term));
      return (
        matchesTerm &&
        (officeFilter === "all" || summary.registryOfficeId === officeFilter)
      );
    });
  }, [allOfficeSummaries, appliedOfficeSummaries, officeFilter, search]);
  const applicationTotalPages = Math.max(
    1,
    Math.ceil(filteredOffices.length / applicationPageSize),
  );
  const currentApplicationPage = Math.min(
    applicationPage,
    applicationTotalPages,
  );
  const pagedOfficeSummaries = useMemo(
    () =>
      filteredOffices.slice(
        (currentApplicationPage - 1) * applicationPageSize,
        currentApplicationPage * applicationPageSize,
      ),
    [applicationPageSize, currentApplicationPage, filteredOffices],
  );
  const modelTotalPages = Math.max(1, Math.ceil(models.length / modelPageSize));
  const currentModelPage = Math.min(modelPage, modelTotalPages);
  const pagedModels = useMemo(
    () =>
      models.slice(
        (currentModelPage - 1) * modelPageSize,
        currentModelPage * modelPageSize,
      ),
    [currentModelPage, modelPageSize, models],
  );

  const totals = useMemo(() => {
    const analyzed = appliedOfficeSummaries.filter(
      (summary) => summary.analyzed,
    ).length;
    return {
      offices: appliedOfficeSummaries.length,
      analyzed,
      notAnalyzed: appliedOfficeSummaries.length - analyzed,
    };
  }, [appliedOfficeSummaries]);

  const historyActions = useMemo(
    () =>
      [...new Set(history.map((entry) => entry.action))].sort((a, b) =>
        actionLabel(a).localeCompare(actionLabel(b), "pt-BR"),
      ),
    [history],
  );

  const filteredHistory = useMemo(() => {
    const term = historySearch.trim().toLocaleLowerCase("pt-BR");
    return history.filter((entry) => {
      const matchesTerm =
        !term ||
        [
          entry.registry_office_name,
          entry.routine_model_name,
          entry.model_item_name,
          entry.actor_name,
          entry.notes,
          entry.action,
        ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      const day = localDateKey(entry.occurred_at);
      return (
        matchesTerm &&
        (historyAction === "all" || entry.action === historyAction) &&
        (!historyStart || day >= historyStart) &&
        (!historyEnd || day <= historyEnd)
      );
    });
  }, [history, historyAction, historyEnd, historySearch, historyStart]);
  const historyTotalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / historyPageSize),
  );
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = useMemo(
    () =>
      filteredHistory.slice(
        (currentHistoryPage - 1) * historyPageSize,
        currentHistoryPage * historyPageSize,
      ),
    [currentHistoryPage, filteredHistory, historyPageSize],
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    setApplicationPage(1);
  };
  const updateOfficeFilter = (value: string) => {
    setOfficeFilter(value);
    setApplicationPage(1);
  };
  const updateApplicationPageSize = (value: string) => {
    setApplicationPageSize(Number(value));
    setApplicationPage(1);
  };
  const updateModelPageSize = (value: string) => {
    setModelPageSize(Number(value));
    setModelPage(1);
  };
  const updateHistorySearch = (value: string) => {
    setHistorySearch(value);
    setHistoryPage(1);
  };
  const updateHistoryAction = (value: string) => {
    setHistoryAction(value);
    setHistoryPage(1);
  };
  const updateHistoryStart = (value: string) => {
    setHistoryStart(value);
    setHistoryPage(1);
  };
  const updateHistoryEnd = (value: string) => {
    setHistoryEnd(value);
    setHistoryPage(1);
  };
  const updateHistoryPageSize = (value: string) => {
    setHistoryPageSize(Number(value));
    setHistoryPage(1);
  };
  const updateAnalysisSearch = (value: string) => {
    setAnalysisSearch(value);
    setAnalysisPage(1);
  };
  const updateAnalysisPageSize = (value: string) => {
    setAnalysisPageSize(Number(value));
    setAnalysisPage(1);
  };
  const updateAnalysisProduct = (value: string) => {
    setAnalysisProductId(value);
    setAnalysisSearch("");
    setAnalysisPage(1);
    setBulkAnalysisOpen(false);
  };

  function openOfficeAnalysis(officeId: string) {
    const officeRoutines = routines.filter(
      (routine) => routine.registry_office_id === officeId,
    );
    const productOptions = getRoutineProductOptions(
      officeRoutines,
      routineModelsById,
    );
    setOpenedOfficeId(officeId);
    setAnalysisProductId(
      productOptions.length > 1 ? productOptions[0].id : "all",
    );
    setAnalysisFullscreen(false);
    setAnalysisSearch("");
    setAnalysisPage(1);
  }

  function openApplyRoutine(officeId = "") {
    setApplyForm({
      registryOfficeId: officeId,
      routineModelId: "",
      observations: [""],
    });
    setApplyOpen(true);
  }

  function closeOfficeAnalysis() {
    setOpenedOfficeId(null);
    setAnalysisProductId("all");
    setAnalysisFullscreen(false);
    setAnalysisSearch("");
    setAnalysisPage(1);
    setBulkAnalysisOpen(false);
  }

  function openBulkAnalysis() {
    setBulkStatus("analisar");
    setBulkObservations([""]);
    setBulkAnalysisDate(todayKey());
    setBulkAnalysisOpen(true);
  }

  async function handleApply() {
    try {
      await applyRoutine.mutateAsync({
        registryOfficeId: applyForm.registryOfficeId,
        routineModelId: applyForm.routineModelId,
        notes: encodeRoutineObservations(applyForm.observations),
      });
      setApplyOpen(false);
      setApplyForm({
        registryOfficeId: "",
        routineModelId: "",
        observations: [""],
      });
      toast({
        title: "Rotina aplicada",
        description: "Os itens do modelo foram vinculados ao cartório.",
      });
    } catch (mutationError) {
      toast({
        title: "Não foi possível aplicar a rotina",
        description: messageOf(mutationError),
        variant: "destructive",
      });
    }
  }

  function openItem(routine: CsCxOfficeRoutine, item: CsCxRoutineItemConfig) {
    setEditingItem({ routine, item });
    setItemStatus(
      item.active === true
        ? "ativo"
        : item.active === false
          ? "inativo"
          : "analisar",
    );
    setItemBeforeObservations(
      withEmptyObservation(decodeRoutineObservations(item.notes)),
    );
    setItemAfterObservations(
      withEmptyObservation(decodeRoutineObservations(item.analysis_notes)),
    );
    setItemAnalysisDate(
      item.analyzed_at ? localDateKey(item.analyzed_at) : todayKey(),
    );
  }

  async function handleItemSave() {
    if (!editingItem) return;
    try {
      await setRoutineItem.mutateAsync({
        id: editingItem.item.id,
        active:
          itemStatus === "ativo"
            ? true
            : itemStatus === "inativo"
              ? false
              : null,
        notes: encodeRoutineObservations(itemBeforeObservations),
        analysisNotes: encodeRoutineObservations(itemAfterObservations),
        historyNotes: formatObservationHistory(
          itemBeforeObservations,
          itemAfterObservations,
        ),
        analyzedAt: itemAnalysisDate,
      });
      setEditingItem(null);
      toast({ title: "Análise atualizada" });
    } catch (mutationError) {
      toast({
        title: "Não foi possível atualizar o item",
        description: messageOf(mutationError),
        variant: "destructive",
      });
    }
  }

  async function handleBulkAnalysisSave() {
    if (!openedOfficeId) return;
    try {
      const changed = await setAllRoutineItems.mutateAsync({
        registryOfficeId: openedOfficeId,
        routineModelIds:
          analysisProductId === "all"
            ? undefined
            : [
                ...new Set(
                  analysisRoutines.map((routine) => routine.routine_model_id),
                ),
              ],
        active:
          bulkStatus === "ativo"
            ? true
            : bulkStatus === "inativo"
              ? false
              : null,
        analysisNotes: encodeRoutineObservations(bulkObservations),
        historyNotes: formatObservationHistory([], bulkObservations),
        analyzedAt: bulkAnalysisDate,
      });
      setBulkAnalysisOpen(false);
      toast({
        title: "Análise em massa concluída",
        description: `${changed} item${changed === 1 ? "" : "s"} atualizado${changed === 1 ? "" : "s"}.`,
      });
    } catch (mutationError) {
      toast({
        title: "Não foi possível atualizar todas as rotinas",
        description: messageOf(mutationError),
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteRoutine.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Rotina desvinculada" });
    } catch (mutationError) {
      toast({
        title: "Não foi possível desvincular",
        description: messageOf(mutationError),
        variant: "destructive",
      });
    }
  }

  async function handleRoutinePdf(routine: CsCxOfficeRoutine) {
    setExportingRoutineId(routine.id);
    try {
      await generateCsCxRoutinePdf(routine);
      toast({ title: "PDF da rotina gerado" });
    } catch (exportError) {
      toast({
        title: "Não foi possível gerar o PDF",
        description: messageOf(exportError),
        variant: "destructive",
      });
    } finally {
      setExportingRoutineId(null);
    }
  }

  if (isLoading)
    return (
      <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );

  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            <ListChecks className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight">
              Rotinas
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Modelos aplicados aos cartórios, análise dos itens e histórico
              operacional
            </p>
          </div>
        </div>
        {canCreate && (
          <Button
            size="sm"
            onClick={() => openApplyRoutine()}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Aplicar rotina
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4" />
              {messageOf(error)}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <Metric
          icon={Database}
          label="Cartórios com rotinas"
          value={totals.offices}
        />
        <Metric
          icon={CheckCircle2}
          label="Analisados"
          value={totals.analyzed}
        />
        <Metric
          icon={ClipboardCheck}
          label="Não analisados"
          value={totals.notAnalyzed}
        />
      </div>

      <Tabs defaultValue="applications" className="space-y-3">
        <TabsList className="h-9">
          <TabsTrigger className="h-7" value="applications">
            Aplicações
          </TabsTrigger>
          <TabsTrigger className="h-7" value="models">
            Modelos
          </TabsTrigger>
          <TabsTrigger className="h-7" value="history">
            Histórico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="applications" className="space-y-3">
          <Card>
            <CardContent className="grid gap-2 p-3 md:grid-cols-[minmax(260px,1fr)_260px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                  placeholder="Buscar cartório, modelo ou observação..."
                  className="h-9 pl-9"
                />
              </div>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 py-2.5">
              <CardTitle className="text-sm">
                Cartórios e suas rotinas
              </CardTitle>
              <CardDescription className="text-xs">
                Visão consolidada dos itens e da situação da análise por
                cartório.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 min-w-56 px-3 text-xs">
                        Cartório
                      </TableHead>
                      <TableHead className="h-9 px-3 text-center text-xs">
                        Rotinas
                      </TableHead>
                      <TableHead className="h-9 px-3 text-center text-xs">
                        Itens ativos
                      </TableHead>
                      <TableHead className="h-9 px-3 text-center text-xs">
                        Itens inativos
                      </TableHead>
                      <TableHead className="h-9 min-w-32 px-3 text-xs">
                        Data da análise
                      </TableHead>
                      <TableHead className="h-9 min-w-32 px-3 text-xs">
                        Status
                      </TableHead>
                      <TableHead className="h-9 min-w-52 px-3 text-right text-xs">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedOfficeSummaries.map((summary) => (
                      <TableRow key={summary.registryOfficeId}>
                        <TableCell className="px-3 py-2">
                          <p className="font-medium">
                            {summary.registryOfficeName}
                          </p>
                          <p
                            className="max-w-72 truncate text-[11px] leading-4 text-muted-foreground"
                            title={summary.routines
                              .map(
                                (routine) =>
                                  routine.routine_model?.name ??
                                  "Modelo removido",
                              )
                              .join(", ")}
                          >
                            {summary.routines.length
                              ? summary.routines
                                  .map(
                                    (routine) =>
                                      routine.routine_model?.name ??
                                      "Modelo removido",
                                  )
                                  .join(", ")
                              : "Nenhuma rotina vinculada"}
                          </p>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Badge
                            variant="secondary"
                            className="h-5 min-w-7 justify-center px-1.5 text-[10px]"
                          >
                            {summary.routines.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Badge
                            variant="outline"
                            className="h-5 min-w-7 justify-center border-emerald-200 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
                          >
                            {summary.activeItems}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Badge
                            variant="outline"
                            className="h-5 min-w-7 justify-center border-rose-200 bg-rose-50 px-1.5 text-[10px] text-rose-700"
                          >
                            {summary.inactiveItems}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                          {!summary.routines.length ? (
                            <span className="text-muted-foreground">—</span>
                          ) : summary.lastAnalysis ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(summary.lastAnalysis)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Não analisado
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={
                              !summary.routines.length
                                ? "h-5 border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-600"
                                : summary.analyzed
                                  ? "h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
                                  : "h-5 border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-700"
                            }
                          >
                            {summary.analyzed && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {!summary.routines.length
                              ? "Sem rotina"
                              : summary.analyzed
                                ? "Analisado"
                                : "Não analisado"}
                          </Badge>
                          {!summary.analyzed && summary.pendingItems > 0 && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {summary.pendingItems} pendente
                              {summary.pendingItems === 1 ? "" : "s"}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {summary.routines.length ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5"
                                aria-label={`Analisar ${summary.registryOfficeName} e suas rotinas`}
                                onClick={() =>
                                  openOfficeAnalysis(summary.registryOfficeId)
                                }
                              >
                                <Eye className="mr-1.5 h-4 w-4" />
                                Analisar cartório
                              </Button>
                            ) : (
                              canCreate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5"
                                  aria-label={`Aplicar rotina em ${summary.registryOfficeName}`}
                                  onClick={() =>
                                    openApplyRoutine(summary.registryOfficeId)
                                  }
                                >
                                  <Plus className="mr-1.5 h-4 w-4" />
                                  Aplicar rotina
                                </Button>
                              )
                            )}
                            {summary.routines.map((routine) => (
                              <div
                                key={routine.id}
                                className="flex items-center"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label={`Exportar PDF da rotina ${routine.routine_model?.name ?? "sem nome"}`}
                                  title={`Exportar ${routine.routine_model?.name ?? "rotina"}`}
                                  disabled={exportingRoutineId === routine.id}
                                  onClick={() => handleRoutinePdf(routine)}
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                                {canDeleteRecord(routine.applied_by) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={`Desvincular rotina ${routine.routine_model?.name ?? "sem nome"}`}
                                    title={`Desvincular ${routine.routine_model?.name ?? "rotina"}`}
                                    onClick={() => setDeleting(routine)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredOffices.length && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-28 text-center text-sm text-muted-foreground"
                        >
                          Nenhum cartório ou rotina encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="px-3 pb-3">
                <RoutinePaginationBar
                  currentPage={currentApplicationPage}
                  pageSize={applicationPageSize}
                  totalItems={filteredOffices.length}
                  totalPages={applicationTotalPages}
                  itemLabel="cartórios"
                  selectLabel="Cartórios por página"
                  onPageChange={setApplicationPage}
                  onPageSizeChange={updateApplicationPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pagedModels.map((model) => (
              <Card key={model.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle
                        className="truncate text-sm"
                        title={model.name}
                      >
                        {model.name}
                      </CardTitle>
                      <CardDescription
                        className="mt-0.5 line-clamp-2 text-xs"
                        title={model.description ?? ""}
                      >
                        {model.description || "Sem descrição"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={model.active ? "default" : "secondary"}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      {model.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  <p className="text-xs">
                    <strong>{model.item_count}</strong> itens configurados
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {model.products.map((product) => (
                      <Badge
                        key={product.id}
                        variant="outline"
                        className="h-5 px-1.5 text-[10px]"
                      >
                        {product.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!models.length && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum modelo encontrado.
              </CardContent>
            </Card>
          )}
          <RoutinePaginationBar
            currentPage={currentModelPage}
            pageSize={modelPageSize}
            totalItems={models.length}
            totalPages={modelTotalPages}
            itemLabel="modelos"
            selectLabel="Modelos por página"
            onPageChange={setModelPage}
            onPageSizeChange={updateModelPageSize}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock3 className="h-4 w-4 text-rose-600" />
                Histórico de alterações
              </CardTitle>
              <CardDescription className="text-xs">
                Registro completo das aplicações e mudanças nos itens de rotina.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-1 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_210px_155px_155px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(event) => updateHistorySearch(event.target.value)}
                  placeholder="Buscar cartório, modelo, item ou responsável..."
                  className="h-9 pl-9"
                />
              </div>
              <Select value={historyAction} onValueChange={updateHistoryAction}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {historyActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {actionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-9"
                type="date"
                aria-label="Data inicial do histórico"
                value={historyStart}
                onChange={(event) => updateHistoryStart(event.target.value)}
              />
              <Input
                className="h-9"
                type="date"
                aria-label="Data final do histórico"
                value={historyEnd}
                onChange={(event) => updateHistoryEnd(event.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 py-2.5">
              <CardTitle className="text-sm">
                {filteredHistory.length} registro
                {filteredHistory.length === 1 ? "" : "s"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 px-3 text-xs">
                        Data e hora
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Responsável
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">Ação</TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Cartório / modelo
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">Item</TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Alteração
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Observação
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                          {formatDateTime(entry.occurred_at)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <p className="max-w-40 truncate text-xs font-medium">
                            {entry.actor_name ??
                              (entry.legacy_user_id
                                ? `Usuário legado #${entry.legacy_user_id}`
                                : "Sistema")}
                          </p>
                          {entry.origin === "legacy" && (
                            <span className="text-[10px] leading-4 text-muted-foreground">
                              Legado
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <ActionBadge action={entry.action} />
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <p className="max-w-56 truncate text-xs font-medium">
                            {entry.registry_office_name ??
                              "Cartório não vinculado"}
                          </p>
                          <p className="max-w-56 truncate text-[10px] leading-4 text-muted-foreground">
                            {entry.routine_model_name ?? "Modelo não informado"}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-56 px-3 py-2 text-xs">
                          <p
                            className="line-clamp-2"
                            title={entry.model_item_name ?? "Modelo completo"}
                          >
                            {entry.model_item_name ?? "Modelo completo"}
                          </p>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {hasStatusTransition(
                            entry.action,
                            entry.previous_status,
                            entry.new_status,
                          ) ? (
                            <div className="flex items-center gap-1">
                              <StatusBadge active={entry.previous_status} />
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <StatusBadge active={entry.new_status} />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-64 px-3 py-2 text-xs text-muted-foreground">
                          <p className="line-clamp-2" title={entry.notes ?? ""}>
                            {entry.notes || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          {entry.ip_address || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredHistory.length && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-32 text-center text-muted-foreground"
                        >
                          Nenhum registro encontrado para os filtros
                          selecionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="px-3 pb-3">
                <RoutinePaginationBar
                  currentPage={currentHistoryPage}
                  pageSize={historyPageSize}
                  totalItems={filteredHistory.length}
                  totalPages={historyTotalPages}
                  itemLabel="registros"
                  selectLabel="Registros por página"
                  onPageChange={setHistoryPage}
                  onPageSizeChange={updateHistoryPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aplicar rotina</DialogTitle>
            <DialogDescription>
              Vincule um modelo e registre uma ou mais observações anteriores à
              análise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cartório</Label>
              <RoutineOfficeCombobox
                offices={offices}
                value={applyForm.registryOfficeId}
                onChange={(value) =>
                  setApplyForm((current) => ({
                    ...current,
                    registryOfficeId: value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Select
                value={applyForm.routineModelId}
                onValueChange={(value) =>
                  setApplyForm((current) => ({
                    ...current,
                    routineModelId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {models
                    .filter((model) => model.active)
                    .map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <ObservationListEditor
              label="Observações antes da análise"
              observations={applyForm.observations}
              onChange={(observations) =>
                setApplyForm((current) => ({ ...current, observations }))
              }
              addLabel="Adicionar observação"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !applyForm.registryOfficeId ||
                !applyForm.routineModelId ||
                applyRoutine.isPending
              }
              onClick={handleApply}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(openedOfficeId)}
        onOpenChange={(open) => !open && closeOfficeAnalysis()}
      >
        <DialogContent
          className={cn(
            "flex max-h-[96vh] flex-col gap-2 overflow-hidden p-3 sm:max-w-6xl sm:p-4",
            analysisFullscreen &&
              "h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none sm:max-w-none",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-14 top-3 z-[70] h-9 w-9 rounded-full sm:right-16 sm:top-4"
            aria-label={
              analysisFullscreen
                ? "Sair da análise em tela cheia"
                : "Abrir análise em tela cheia"
            }
            title={analysisFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            onClick={() => setAnalysisFullscreen((current) => !current)}
          >
            {analysisFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <DialogHeader className="space-y-0.5 pr-20 sm:pr-24">
            <DialogTitle className="text-base">
              Análise das rotinas do cartório
            </DialogTitle>
            <DialogDescription className="text-xs leading-4">
              {openedOfficeRoutines[0]?.registry_office?.name ?? "Cartório"} ·
              consulte e analise os itens sem sair da lista principal.
            </DialogDescription>
          </DialogHeader>

          {openedOfficeProducts.length > 1 && (
            <div className="flex min-w-0 items-center gap-2">
              <Label className="shrink-0 text-xs text-muted-foreground">
                Produto
              </Label>
              <Tabs
                className="min-w-0 flex-1"
                value={analysisProductId}
                onValueChange={updateAnalysisProduct}
              >
                <TabsList className="h-8 w-full justify-start gap-0.5 overflow-x-auto p-0.5">
                  {openedOfficeProducts.map((product) => {
                    const routineCount = openedOfficeRoutines.filter(
                      (routine) => {
                        const products =
                          routineModelsById.get(routine.routine_model_id)
                            ?.products ?? [];
                        return product.id === UNASSIGNED_PRODUCT_ID
                          ? products.length === 0
                          : products.some(
                              (candidate) => candidate.id === product.id,
                            );
                      },
                    ).length;
                    return (
                      <TabsTrigger
                        key={product.id}
                        value={product.id}
                        className="h-7 min-w-fit gap-1.5 px-3"
                      >
                        {product.name}
                        <Badge
                          variant="secondary"
                          className="h-4 min-w-4 justify-center px-1 text-[9px]"
                        >
                          {routineCount}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                  <TabsTrigger
                    value="all"
                    className="h-7 min-w-fit gap-1.5 px-3"
                  >
                    Todas
                    <Badge
                      variant="secondary"
                      className="h-4 min-w-4 justify-center px-1 text-[9px]"
                    >
                      {openedOfficeRoutines.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <AnalysisMetric label="Rotinas" value={analysisTotals.routines} />
            <AnalysisMetric label="Itens" value={analysisTotals.items} />
            <AnalysisMetric
              label="Analisados"
              value={analysisTotals.analyzed}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar itens da análise"
                className="h-8 pl-9"
                placeholder="Buscar item, modelo, categoria ou tipo..."
                value={analysisSearch}
                onChange={(event) => updateAnalysisSearch(event.target.value)}
              />
            </div>
            {analysisRoutines.length > 0 &&
              analysisRoutines.every((routine) =>
                canEditRecord(routine.applied_by),
              ) && (
                <Button
                  type="button"
                  className="h-8"
                  onClick={openBulkAnalysis}
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  {analysisProductName
                    ? `Alterar status do ${analysisProductName}`
                    : "Alterar status de todos"}
                </Button>
              )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {pagedOfficeItems.length > 0 && (
              <div className="mb-1.5 hidden grid-cols-[minmax(0,1fr)_minmax(8rem,0.32fr)_minmax(7rem,0.28fr)_minmax(7rem,0.28fr)_auto] items-center gap-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                <span>Rotina e observações</span>
                <span>Tipo</span>
                <span>Ideal</span>
                <span>Status</span>
                <span className="sr-only">Ações</span>
              </div>
            )}
            <div className="space-y-1.5">
              {pagedOfficeItems.map(({ routine, item }) => (
                <RoutineItemRow
                  key={item.id}
                  routine={routine}
                  item={item}
                  canEdit={canEditRecord(routine.applied_by)}
                  onEdit={openItem}
                />
              ))}
              {!openedOfficeItems.length && (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Nenhum item encontrado neste produto para esta busca.
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <RoutinePaginationBar
                compact
                currentPage={currentAnalysisPage}
                pageSize={analysisPageSize}
                totalItems={openedOfficeItems.length}
                totalPages={analysisTotalPages}
                itemLabel="itens da análise"
                selectLabel="Itens da análise por página"
                onPageChange={setAnalysisPage}
                onPageSizeChange={updateAnalysisPageSize}
              />
            </div>
            <Button
              className="h-8 shrink-0"
              variant="outline"
              onClick={closeOfficeAnalysis}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAnalysisOpen} onOpenChange={setBulkAnalysisOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {analysisProductName
                ? `Alterar status das rotinas de ${analysisProductName}`
                : "Alterar status de todas as rotinas"}
            </DialogTitle>
            <DialogDescription>
              A alteração será aplicada aos {analysisTotals.items} itens
              {analysisProductName ? ` de ${analysisProductName}` : ""}{" "}
              vinculados a{" "}
              {openedOfficeRoutines[0]?.registry_office?.name ??
                "este cartório"}
              , independentemente da busca ou página atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger aria-label="Status de todas as rotinas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bulk-analysis-date">Data da análise</Label>
                <Input
                  id="bulk-analysis-date"
                  type="date"
                  required
                  value={bulkAnalysisDate}
                  onChange={(event) => setBulkAnalysisDate(event.target.value)}
                />
              </div>
            </div>
            <ObservationListEditor
              label="Observações depois da análise"
              observations={bulkObservations}
              onChange={setBulkObservations}
              addLabel="Adicionar observação"
              description={
                analysisProductName
                  ? `As observações serão registradas apenas nos itens de ${analysisProductName}.`
                  : "As observações serão registradas em todos os itens do cartório."
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkAnalysisOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                !bulkAnalysisDate ||
                !analysisTotals.items ||
                setAllRoutineItems.isPending
              }
              onClick={handleBulkAnalysisSave}
            >
              {analysisProductName
                ? `Salvar em ${analysisProductName} (${analysisTotals.items})`
                : `Salvar em todos (${analysisTotals.items})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Analisar item</DialogTitle>
            <DialogDescription>
              {editingItem?.routine.registry_office?.name} ·{" "}
              {editingItem?.item.model_item?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select value={itemStatus} onValueChange={setItemStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="analysis-date">Data da análise</Label>
                <Input
                  id="analysis-date"
                  type="date"
                  required
                  value={itemAnalysisDate}
                  onChange={(event) => setItemAnalysisDate(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ObservationListEditor
                label="Observações antes da análise"
                observations={itemBeforeObservations}
                onChange={setItemBeforeObservations}
                addLabel="Adicionar observação anterior"
              />
              <ObservationListEditor
                label="Observações depois da análise"
                observations={itemAfterObservations}
                onChange={setItemAfterObservations}
                addLabel="Adicionar observação da análise"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!itemAnalysisDate || setRoutineItem.isPending}
              onClick={handleItemSave}
            >
              Salvar análise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular rotina?</AlertDialogTitle>
            <AlertDialogDescription>
              O vínculo com {deleting?.registry_office?.name}, suas análises e
              configurações serão excluídos do HUB.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoutineOfficeCombobox({
  offices,
  value,
  onChange,
}: {
  offices: Array<{ id: string; name: string }>;
  value: string;
  onChange: (officeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOffice = offices.find((office) => office.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Selecionar cartório para aplicar rotina"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedOffice?.name ?? "Selecione um cartório"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command
          filter={(optionValue, searchValue) =>
            normalizeSearchText(optionValue).includes(
              normalizeSearchText(searchValue),
            )
              ? 1
              : 0
          }
        >
          <CommandInput
            aria-label="Buscar cartório para aplicar rotina"
            placeholder="Buscar cartório..."
          />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhum cartório encontrado.</CommandEmpty>
            <CommandGroup>
              {offices.map((office) => (
                <CommandItem
                  key={office.id}
                  value={office.name}
                  onSelect={() => {
                    onChange(office.id);
                    setOpen(false);
                  }}
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

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-black leading-6">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-black leading-5">{value}</p>
    </div>
  );
}

function ObservationListEditor({
  label,
  observations,
  onChange,
  addLabel,
  description,
}: {
  label: string;
  observations: string[];
  onChange: (observations: string[]) => void;
  addLabel: string;
  description?: string;
}) {
  const visibleObservations = observations.length ? observations : [""];
  const updateObservation = (index: number, value: string) =>
    onChange(
      visibleObservations.map((observation, currentIndex) =>
        currentIndex === index ? value : observation,
      ),
    );
  const removeObservation = (index: number) => {
    const next = visibleObservations.filter(
      (_, currentIndex) => currentIndex !== index,
    );
    onChange(next.length ? next : [""]);
  };
  return (
    <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <div>
        <Label>{label}</Label>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-2">
        {visibleObservations.map((observation, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-2.5 w-5 shrink-0 text-right text-xs font-medium text-muted-foreground">
              {index + 1}.
            </span>
            <Textarea
              aria-label={`${label} ${index + 1}`}
              className="min-h-20 resize-y"
              value={observation}
              onChange={(event) => updateObservation(index, event.target.value)}
              placeholder="Digite a observação..."
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0"
              aria-label={`Remover ${label.toLocaleLowerCase("pt-BR")} ${index + 1}`}
              disabled={visibleObservations.length === 1 && !observation}
              onClick={() => removeObservation(index)}
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full border-dashed"
        onClick={() => onChange([...visibleObservations, ""])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

function RoutineItemRow({
  routine,
  item,
  canEdit,
  onEdit,
}: {
  routine: CsCxOfficeRoutine;
  item: CsCxRoutineItemConfig;
  canEdit: boolean;
  onEdit: (routine: CsCxOfficeRoutine, item: CsCxRoutineItemConfig) => void;
}) {
  const beforeObservations = decodeRoutineObservations(item.notes);
  const afterObservations = decodeRoutineObservations(item.analysis_notes);
  return (
    <div className="grid gap-2 rounded-md border px-3 py-2 md:grid-cols-[minmax(0,1fr)_minmax(8rem,0.32fr)_minmax(7rem,0.28fr)_minmax(7rem,0.28fr)_auto] md:items-center md:gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">
            {item.model_item?.name ?? "Item removido"}
          </span>
          {item.model_item?.required && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              Obrigatório
            </Badge>
          )}
        </div>
        <RoutineObservationsPreview
          before={beforeObservations}
          after={afterObservations}
        />
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
          Tipo
        </span>
        {item.model_item?.routine_type ? (
          <Badge
            variant="secondary"
            className="h-5 max-w-full truncate px-1.5 text-[10px] font-normal"
            title={item.model_item.routine_type.name}
          >
            {item.model_item.routine_type.name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
          Ideal
        </span>
        {item.model_item?.category ? (
          <Badge
            variant="outline"
            className="h-5 max-w-full truncate px-1.5 text-[10px] font-normal"
            style={{ borderColor: item.model_item.category.display_color }}
            title={item.model_item.category.name}
          >
            {item.model_item.category.name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
          Status
        </span>
        <StatusBadge active={item.active} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {item.analyzed_at && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {formatDate(item.analyzed_at)}
          </span>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onEdit(routine, item)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>
    </div>
  );
}

function RoutineObservationsPreview({
  before,
  after,
}: {
  before: string[];
  after: string[];
}) {
  const observations = [
    ...before.map((text) => ({ label: "Inicial", text })),
    ...after.map((text) => ({ label: "Análise", text })),
  ];

  if (!observations.length) {
    return (
      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
        Sem observações
      </p>
    );
  }

  return (
    <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-muted-foreground">
      {observations.map(({ label, text }, index) => (
        <p
          key={`${label}-${index}-${text}`}
          className="flex min-w-0 items-start gap-1"
          title={`${label}: ${text}`}
        >
          <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">
            <span className="font-medium text-foreground/70">{label}:</span>{" "}
            {text}
          </span>
        </p>
      ))}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean | null }) {
  if (active === true)
    return (
      <Badge className="h-5 bg-emerald-600 px-1.5 text-[10px] font-normal hover:bg-emerald-600">
        Ativo
      </Badge>
    );
  if (active === false)
    return (
      <Badge
        variant="destructive"
        className="h-5 px-1.5 text-[10px] font-normal"
      >
        Inativo
      </Badge>
    );
  return (
    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
      Analisar
    </Badge>
  );
}

function ActionBadge({ action }: { action: string }) {
  const className = "h-5 whitespace-nowrap px-1.5 text-[10px] font-normal";
  if (action === "ATIVADO")
    return (
      <Badge className={`${className} bg-emerald-600 hover:bg-emerald-600`}>
        {actionLabel(action)}
      </Badge>
    );
  if (
    action === "DESATIVADO" ||
    action === "DESVINCULADO" ||
    action.startsWith("REMOVIDO")
  )
    return (
      <Badge variant="destructive" className={className}>
        {actionLabel(action)}
      </Badge>
    );
  if (action === "APLICADO" || action === "ITEM_ADICIONADO")
    return <Badge className={className}>{actionLabel(action)}</Badge>;
  return (
    <Badge variant="secondary" className={className}>
      {actionLabel(action)}
    </Badge>
  );
}

function RoutinePaginationBar({
  compact = false,
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  itemLabel,
  selectLabel,
  onPageChange,
  onPageSizeChange,
}: {
  compact?: boolean;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  itemLabel: string;
  selectLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  return (
    <div
      className={cn(
        "flex flex-col text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        compact ? "gap-1" : "gap-2 border-t pt-3",
      )}
    >
      <span
        aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} ${itemLabel}`}
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
          <SelectTrigger aria-label={selectLabel} className="h-8 w-[72px]">
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
          aria-label={`Página anterior de ${itemLabel}`}
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
          aria-label={`Próxima página de ${itemLabel}`}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    APLICADO: "Rotina aplicada",
    ATIVADO: "Item ativado",
    DESATIVADO: "Item desativado",
    ANALISAR: "Marcado para análise",
    ITEM_ADICIONADO: "Item adicionado",
    REMOVIDO: "Item removido",
    REMOVIDO_POR_EXCLUSAO_MODELO: "Item removido do modelo",
    DESVINCULADO: "Rotina desvinculada",
    ANALISADO: "Item analisado",
    ANALISE_CARTORIO: "Análise do cartório",
  };
  return (
    labels[action] ??
    action
      .toLocaleLowerCase("pt-BR")
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("pt-BR"))
  );
}

function hasStatusTransition(
  action: string,
  previous: boolean | null,
  next: boolean | null,
) {
  return (
    previous !== null ||
    next !== null ||
    ["ATIVADO", "DESATIVADO", "ANALISAR"].includes(action)
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function localDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function todayKey() {
  return localDateKey(new Date().toISOString());
}

function withEmptyObservation(observations: string[]) {
  return observations.length ? observations : [""];
}

function formatObservationHistory(before: string[], after: string[]) {
  const beforeLines = normalizeRoutineObservations(before);
  const afterLines = normalizeRoutineObservations(after);
  return [
    ...(beforeLines.length
      ? [
          `Antes da análise:\n${beforeLines.map((observation) => `- ${observation}`).join("\n")}`,
        ]
      : []),
    ...(afterLines.length
      ? [
          `Depois da análise:\n${afterLines.map((observation) => `- ${observation}`).join("\n")}`,
        ]
      : []),
  ].join("\n\n");
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
