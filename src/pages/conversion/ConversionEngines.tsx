import { useEffect, useMemo, useState } from "react";
import {
  useConversionEngines,
  EngineStatus,
  EngineSpecialty,
  ConversionEngineItem,
} from "@/hooks/useConversionEngines";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cog,
  Search,
  Loader2,
  CheckCircle2,
  Code2,
  Wrench,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  ArrowRight,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConversionPostDrawer } from "@/components/conversion/ConversionPostDrawer";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

const ENGINE_STATUS_CONFIG: Record<
  EngineStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  in_development: {
    label: "Em desenvolvimento",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: Code2,
  },
  maintenance: {
    label: "Em manutenção",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: Wrench,
  },
  finished: {
    label: "Finalizado",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: CheckCircle2,
  },
};

const ENGINE_SPECIALTY_LABELS: Record<EngineSpecialty, string> = {
  tn_rc: "TN/RC",
  protest: "Protesto",
  ri_td: "RI/TD",
};

export default function ConversionEngines() {
  const {
    engines,
    loading,
    creating,
    updating,
    deleting,
    kpis,
    createEngine,
    updateEngine,
    deleteEngine,
  } = useConversionEngines();
  const isMobile = useIsMobile();
  const { fullName, user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<ConversionEngineItem | null>(null);
  const [editSourceSystem, setEditSourceSystem] = useState("");
  const [editTargetSystem, setEditTargetSystem] = useState("");
  const [editSpecialty, setEditSpecialty] = useState<EngineSpecialty | "">("");
  const [editStatus, setEditStatus] = useState<EngineStatus>("in_development");
  const [editDevopsUrl, setEditDevopsUrl] = useState("");
  const [editDevopsUrlError, setEditDevopsUrlError] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deletingItem, setDeletingItem] = useState<ConversionEngineItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sourceSystem, setSourceSystem] = useState("");
  const [targetSystem, setTargetSystem] = useState("");
  const [createSpecialty, setCreateSpecialty] = useState<EngineSpecialty | "">("");
  const [createStatus, setCreateStatus] = useState<EngineStatus>("in_development");
  const [devopsUrl, setDevopsUrl] = useState("");
  const [devopsUrlError, setDevopsUrlError] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [drawerEngine, setDrawerEngine] = useState<ConversionEngineItem | null>(
    null,
  );

  const { hasPermission } = usePermissions();
  const canCreateEngines = hasPermission("conversion_engines", "create");
  const canEditEngines = hasPermission("conversion_engines", "edit");
  const canDeleteEngines = hasPermission("conversion_engines", "delete");

  const itemsPerPage = selectedPageSize ?? (isMobile ? 3 : 9);
  const filteredEngines = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return engines.filter((engine) => {
      const matchesSearch =
        !normalizedSearch ||
        engine.sourceSystem.toLowerCase().includes(normalizedSearch) ||
        engine.targetSystem.toLowerCase().includes(normalizedSearch) ||
        (engine.specialty &&
          ENGINE_SPECIALTY_LABELS[engine.specialty]
            .toLowerCase()
            .includes(normalizedSearch)) ||
        engine.devopsUrl?.toLowerCase().includes(normalizedSearch) ||
        engine.clientName?.toLowerCase().includes(normalizedSearch) ||
        engine.ticketNumber?.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" || engine.engineStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [engines, search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredEngines.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEngines = filteredEngines.slice(startIndex, startIndex + itemsPerPage);
  const firstVisibleItem = filteredEngines.length === 0 ? 0 : startIndex + 1;
  const lastVisibleItem = Math.min(startIndex + itemsPerPage, filteredEngines.length);
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const closeEditDialog = () => {
    setEditItem(null);
    setEditSourceSystem("");
    setEditTargetSystem("");
    setEditSpecialty("");
    setEditStatus("in_development");
    setEditDevopsUrl("");
    setEditDevopsUrlError("");
    setEditNotes("");
  };

  const openEditDialog = (engine: ConversionEngineItem) => {
    setEditItem(engine);
    setEditSourceSystem(engine.sourceSystem);
    setEditTargetSystem(engine.targetSystem);
    setEditSpecialty(engine.specialty || "");
    setEditStatus(engine.engineStatus);
    setEditDevopsUrl(engine.devopsUrl || "");
    setEditDevopsUrlError("");
    setEditNotes(engine.engineNotes || "");
  };

  const handleSaveEngine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !canEditEngines ||
      !editItem ||
      !editSourceSystem.trim() ||
      !editTargetSystem.trim() ||
      !editSpecialty
    ) return;
    if (editDevopsUrl.trim() && !/^https?:\/\//i.test(editDevopsUrl.trim())) {
      setEditDevopsUrlError("Informe um link completo começando com http:// ou https://.");
      return;
    }
    setEditDevopsUrlError("");

    const updated = await updateEngine(editItem.id, {
      sourceSystem: editSourceSystem,
      targetSystem: editTargetSystem,
      specialty: editSpecialty,
      status: editStatus,
      devopsUrl: editDevopsUrl,
      notes: editNotes,
    });
    if (updated) closeEditDialog();
  };

  const handleDeleteEngine = async () => {
    if (!canDeleteEngines || !deletingItem) return;
    const deleted = await deleteEngine(deletingItem.id);
    if (deleted) {
      if (drawerEngine?.id === deletingItem.id) setDrawerEngine(null);
      setDeletingItem(null);
    }
  };

  const resetCreateForm = () => {
    setSourceSystem("");
    setTargetSystem("");
    setCreateSpecialty("");
    setCreateStatus("in_development");
    setDevopsUrl("");
    setDevopsUrlError("");
    setCreateNotes("");
  };

  const handleCreateEngine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !canCreateEngines ||
      !sourceSystem.trim() ||
      !targetSystem.trim() ||
      !createSpecialty
    ) return;
    if (devopsUrl.trim() && !/^https?:\/\//i.test(devopsUrl.trim())) {
      setDevopsUrlError("Informe um link completo começando com http:// ou https://.");
      return;
    }
    setDevopsUrlError("");

    const created = await createEngine(
      {
        sourceSystem,
        targetSystem,
        specialty: createSpecialty,
        status: createStatus,
        devopsUrl,
        notes: createNotes,
      },
      fullName || user?.email || "Usuário",
    );

    if (created) {
      setCreateOpen(false);
      resetCreateForm();
    }
  };

  return (
    <div
      className="min-w-0 space-y-2.5 overflow-x-hidden py-1 sm:space-y-3 sm:py-2"
      data-testid="conversion-engines-page"
    >
      {/* Header */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-1.5 text-lg font-bold sm:text-xl">
            <Cog className="h-5 w-5 shrink-0 text-primary" />
            Motores de Conversão
          </h1>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-muted-foreground sm:text-xs">
            Cadastro e acompanhamento do ciclo de vida dos motores
          </p>
        </div>
        {canCreateEngines && (
          <Button
            size="sm"
            className="h-10 shrink-0 gap-1.5 px-3 sm:h-8"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Motor
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div
        className="grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4"
        data-testid="conversion-engines-kpis"
      >
        <Card className="border-l-[3px] border-l-blue-500">
          <CardContent className="p-2 sm:p-2.5">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <Code2 className="h-5 w-5 shrink-0 text-blue-500" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-5">{kpis.inDevelopment}</p>
                <p className="text-[10px] leading-3.5 text-muted-foreground sm:text-[11px]">
                  Em desenvolvimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-orange-500">
          <CardContent className="p-2 sm:p-2.5">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <Wrench className="h-5 w-5 shrink-0 text-orange-500" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-5">{kpis.maintenance}</p>
                <p className="text-[10px] leading-3.5 text-muted-foreground sm:text-[11px]">
                  Em manutenção
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-green-500">
          <CardContent className="p-2 sm:p-2.5">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-5">{kpis.finished}</p>
                <p className="text-[10px] leading-3.5 text-muted-foreground sm:text-[11px]">Finalizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-purple-500">
          <CardContent className="p-2 sm:p-2.5">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <Cog className="h-5 w-5 shrink-0 text-purple-500" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-5">{kpis.total}</p>
                <p className="text-[10px] leading-3.5 text-muted-foreground sm:text-[11px]">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div
        className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-muted/20 p-1.5 sm:flex-row sm:items-center"
        data-testid="conversion-engines-filters"
      >
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar motores"
            placeholder="Buscar por sistema ou repositório..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-8 text-xs sm:h-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger aria-label="Filtrar motores por status" className="h-10 w-full min-w-0 text-xs sm:h-8 sm:w-[210px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="in_development">Em desenvolvimento</SelectItem>
            <SelectItem value="maintenance">Em manutenção</SelectItem>
            <SelectItem value="finished">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-full gap-1.5 text-xs sm:h-8 sm:w-auto"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Engine List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredEngines.length === 0 ? (
        <Card data-testid="conversion-engines-empty-state">
          <CardContent className="flex flex-col items-center justify-center px-4 py-10 text-center sm:py-12">
            <Cog className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum motor encontrado</p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="link"
                className="mt-2"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            )}
            {!hasActiveFilters && canCreateEngines && (
              <Button type="button" size="sm" className="mt-3 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Cadastrar primeiro motor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="min-w-0 space-y-2">
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3" data-testid="conversion-engines-grid">
          {paginatedEngines.map((engine) => {
            const config = ENGINE_STATUS_CONFIG[engine.engineStatus];
            const StatusIcon = config.icon;

            return (
              <Card
                key={engine.id}
                className={cn(
                  "h-full min-w-0 overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  engine.projectId && "cursor-pointer",
                )}
                onClick={() => engine.projectId && setDrawerEngine(engine)}
                onKeyDown={(event) => {
                  if (engine.projectId && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setDrawerEngine(engine);
                  }
                }}
                role={engine.projectId ? "button" : undefined}
                tabIndex={engine.projectId ? 0 : undefined}
                aria-label={engine.projectId ? `Abrir detalhes do motor de ${engine.clientName}` : undefined}
                data-testid="conversion-engine-card"
              >
                <CardContent className="h-full min-w-0 p-2.5 sm:p-3">
                  <div className="flex h-full min-w-0 flex-col gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn("h-auto min-h-5 max-w-full gap-1 whitespace-normal break-words px-1.5 text-left text-[10px]", config.color)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="h-5 max-w-full px-1.5 text-[10px]"
                        >
                          {engine.specialty
                            ? ENGINE_SPECIALTY_LABELS[engine.specialty]
                            : "Sem especialidade"}
                        </Badge>
                        {engine.ticketNumber && (
                          <Badge variant="outline" className="h-5 max-w-full shrink-0 px-1.5 text-[10px]">
                            #{engine.ticketNumber}
                          </Badge>
                        )}
                      </div>
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-md border bg-muted/25 p-2" data-testid="conversion-engine-route">
                        <div className="min-w-0">
                          <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Sistema de origem
                          </span>
                          <h3 className="line-clamp-2 min-w-0 break-words text-sm font-bold leading-5" data-testid="conversion-engine-name">
                            {engine.sourceSystem}
                          </h3>
                        </div>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Sistema de conversão
                          </span>
                          <p className="line-clamp-2 min-w-0 break-words text-sm font-bold leading-5">
                            {engine.targetSystem}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1.5 grid min-w-0 grid-cols-1 gap-x-3 gap-y-0.5 text-[11px] leading-4 text-muted-foreground sm:grid-cols-2" data-testid="conversion-engine-metadata">
                        {engine.clientName && (
                          <span className="min-w-0 break-words">
                            Projeto: <strong>{engine.clientName}</strong>
                          </span>
                        )}
                        {engine.assignedToName && (
                          <span className="min-w-0 break-words">
                            Responsável:{" "}
                            <strong>{engine.assignedToName}</strong>
                          </span>
                        )}
                        {engine.engineRequestedAt && (
                          <span className="min-w-0 break-words">
                            Solicitado em:{" "}
                            <strong>
                              {format(engine.engineRequestedAt, "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </strong>
                          </span>
                        )}
                        {engine.devopsUrl && (
                          <a
                            href={engine.devopsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 font-medium text-primary hover:underline sm:col-span-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">Abrir repositório no DevOps</span>
                          </a>
                        )}
                      </div>
                      {engine.engineNotes && (
                        <p className="mt-1.5 line-clamp-2 min-w-0 whitespace-pre-wrap break-words rounded bg-muted/50 p-1.5 text-[11px] leading-4 text-muted-foreground">
                          {engine.engineNotes}
                        </p>
                      )}
                    </div>

                    {(canEditEngines || canDeleteEngines) && (
                      <div className="flex min-w-0 gap-1.5">
                        {canEditEngines && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 min-w-0 flex-1 gap-1 text-xs sm:h-8"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditDialog(engine);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        )}
                        {canDeleteEngines && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 min-w-0 flex-1 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeletingItem(engine);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          <div
            className="flex min-w-0 flex-col gap-2 border-t pt-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
            data-testid="conversion-engines-pagination"
          >
            <span>
              Mostrando <strong className="text-foreground">{firstVisibleItem}–{lastVisibleItem}</strong> de{" "}
              <strong className="text-foreground">{filteredEngines.length}</strong>
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span>Por página</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => setSelectedPageSize(Number(value))}
              >
                <SelectTrigger aria-label="Motores por página" className="h-10 w-[68px] text-xs sm:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 9, 12].map((option) => (
                    <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="min-w-[88px] text-center">Página {currentPage} de {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 sm:h-8 sm:w-8"
                aria-label="Página anterior de motores"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 sm:h-8 sm:w-8"
                aria-label="Próxima página de motores"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-2xl overflow-hidden p-0"
          data-testid="conversion-engine-create-dialog"
        >
          <form className="flex max-h-[calc(100dvh-1rem)] min-w-0 flex-col" onSubmit={handleCreateEngine}>
            <div className="min-w-0 overflow-y-auto p-4 sm:p-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-7">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Cog className="h-4 w-4" />
                  </span>
                  Cadastrar motor
                </DialogTitle>
                <DialogDescription>
                  Informe o caminho da conversão e, se disponível, o repositório do motor.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" data-testid="conversion-engine-create-route">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-source-system" className="text-xs font-medium">
                    Sistema de origem <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="engine-source-system"
                    value={sourceSystem}
                    onChange={(event) => setSourceSystem(event.target.value)}
                    placeholder="Ex.: Sistema legado"
                    autoComplete="off"
                    autoFocus
                    className="h-10"
                    required
                  />
                </div>

                <span className="mx-auto flex h-8 w-8 rotate-90 items-center justify-center rounded-full bg-primary/10 text-primary sm:mb-1 sm:rotate-0" aria-hidden="true">
                  <ArrowRight className="h-4 w-4" />
                </span>

                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-target-system" className="text-xs font-medium">
                    Sistema de conversão <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="engine-target-system"
                    value={targetSystem}
                    onChange={(event) => setTargetSystem(event.target.value)}
                    placeholder="Ex.: Orion TN"
                    autoComplete="off"
                    className="h-10"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-create-specialty" className="text-xs font-medium">
                    Especialidade <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={createSpecialty}
                    onValueChange={(value) => setCreateSpecialty(value as EngineSpecialty)}
                  >
                    <SelectTrigger
                      id="engine-create-specialty"
                      aria-label="Especialidade do motor"
                      className="h-10 w-full"
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tn_rc">TN/RC</SelectItem>
                      <SelectItem value="protest">Protesto</SelectItem>
                      <SelectItem value="ri_td">RI/TD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-create-status" className="text-xs font-medium">
                    Status <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={createStatus}
                    onValueChange={(value) => setCreateStatus(value as EngineStatus)}
                  >
                    <SelectTrigger id="engine-create-status" aria-label="Status do motor" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_development">Em desenvolvimento</SelectItem>
                      <SelectItem value="maintenance">Em manutenção</SelectItem>
                      <SelectItem value="finished">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 min-w-0 space-y-1.5">
                <label htmlFor="engine-devops-url" className="text-xs font-medium">
                  Link DevOps
                </label>
                <div className="relative min-w-0">
                  <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="engine-devops-url"
                    type="url"
                    inputMode="url"
                    value={devopsUrl}
                    onChange={(event) => {
                      setDevopsUrl(event.target.value);
                      if (devopsUrlError) setDevopsUrlError("");
                    }}
                    placeholder="https://dev.azure.com/..."
                    className="h-10 pl-9"
                    aria-describedby={devopsUrlError ? "engine-devops-url-error" : undefined}
                    aria-invalid={Boolean(devopsUrlError)}
                  />
                </div>
                {devopsUrlError && (
                  <p id="engine-devops-url-error" role="alert" className="text-xs text-destructive">
                    {devopsUrlError}
                  </p>
                )}
              </div>

              <div className="mt-4 min-w-0 space-y-1.5">
                <label htmlFor="engine-create-notes" className="text-xs font-medium">
                  Observações
                </label>
                <Textarea
                  id="engine-create-notes"
                  value={createNotes}
                  onChange={(event) => setCreateNotes(event.target.value)}
                  placeholder="Detalhes técnicos, particularidades ou pendências..."
                  className="min-h-24 resize-y"
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-muted/20 p-4 sm:flex-row sm:px-5">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full sm:w-auto"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-10 w-full gap-1.5 sm:w-auto"
                disabled={
                  creating ||
                  !sourceSystem.trim() ||
                  !targetSystem.trim() ||
                  !createSpecialty ||
                  !canCreateEngines
                }
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Cadastrar motor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editItem !== null}
        onOpenChange={(open) => !open && closeEditDialog()}
      >
        <DialogContent
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-2xl overflow-hidden p-0"
          data-testid="conversion-engine-dialog"
        >
          <form
            className="flex max-h-[calc(100dvh-1rem)] min-w-0 flex-col"
            onSubmit={handleSaveEngine}
          >
            <div className="min-w-0 overflow-y-auto p-4 sm:p-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-7">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Pencil className="h-4 w-4" />
                  </span>
                  Editar motor
                </DialogTitle>
                <DialogDescription>
                  Atualize os sistemas, a especialidade, o status e os dados técnicos.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-edit-source-system" className="text-xs font-medium">
                    Sistema de origem <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="engine-edit-source-system"
                    value={editSourceSystem}
                    onChange={(event) => setEditSourceSystem(event.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                <span className="mx-auto flex h-8 w-8 rotate-90 items-center justify-center rounded-full bg-primary/10 text-primary sm:mb-1 sm:rotate-0" aria-hidden="true">
                  <ArrowRight className="h-4 w-4" />
                </span>

                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-edit-target-system" className="text-xs font-medium">
                    Sistema de conversão <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="engine-edit-target-system"
                    value={editTargetSystem}
                    onChange={(event) => setEditTargetSystem(event.target.value)}
                    className="h-10"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-edit-specialty" className="text-xs font-medium">
                    Especialidade <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={editSpecialty}
                    onValueChange={(value) => setEditSpecialty(value as EngineSpecialty)}
                  >
                    <SelectTrigger
                      id="engine-edit-specialty"
                      aria-label="Editar especialidade do motor"
                      className="h-10 w-full"
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tn_rc">TN/RC</SelectItem>
                      <SelectItem value="protest">Protesto</SelectItem>
                      <SelectItem value="ri_td">RI/TD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="engine-edit-status" className="text-xs font-medium">
                    Status <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={editStatus}
                    onValueChange={(value) => setEditStatus(value as EngineStatus)}
                  >
                    <SelectTrigger id="engine-edit-status" aria-label="Editar status do motor" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_development">Em desenvolvimento</SelectItem>
                      <SelectItem value="maintenance">Em manutenção</SelectItem>
                      <SelectItem value="finished">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 min-w-0 space-y-1.5">
                <label htmlFor="engine-edit-devops-url" className="text-xs font-medium">
                  Link DevOps
                </label>
                <div className="relative min-w-0">
                  <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="engine-edit-devops-url"
                    type="url"
                    inputMode="url"
                    value={editDevopsUrl}
                    onChange={(event) => {
                      setEditDevopsUrl(event.target.value);
                      if (editDevopsUrlError) setEditDevopsUrlError("");
                    }}
                    placeholder="https://dev.azure.com/..."
                    className="h-10 pl-9"
                    aria-describedby={editDevopsUrlError ? "engine-edit-devops-url-error" : undefined}
                    aria-invalid={Boolean(editDevopsUrlError)}
                  />
                </div>
                {editDevopsUrlError && (
                  <p id="engine-edit-devops-url-error" role="alert" className="text-xs text-destructive">
                    {editDevopsUrlError}
                  </p>
                )}
              </div>

              <div className="mt-4 min-w-0 space-y-1.5">
                <label htmlFor="engine-edit-notes" className="text-xs font-medium">
                  Observações
                </label>
                <Textarea
                  id="engine-edit-notes"
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  placeholder="Registre detalhes sobre o desenvolvimento do motor..."
                  className="min-h-24 resize-y"
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-muted/20 p-4 sm:flex-row sm:px-5">
              <Button
                type="button"
                className="h-10 w-full sm:w-auto"
                variant="outline"
                onClick={closeEditDialog}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-10 w-full gap-1.5 sm:w-auto"
                disabled={
                  updating ||
                  !editSourceSystem.trim() ||
                  !editTargetSystem.trim() ||
                  !editSpecialty ||
                  !canEditEngines
                }
              >
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                {updating ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingItem !== null}
        onOpenChange={(open) => !open && !deleting && setDeletingItem(null)}
      >
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir motor?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              O motor de <strong>{deletingItem?.sourceSystem}</strong> para{" "}
              <strong>{deletingItem?.targetSystem}</strong> será removido do cadastro. Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || !canDeleteEngines}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteEngine();
              }}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleting ? "Excluindo..." : "Excluir motor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post History Drawer */}
      <ConversionPostDrawer
        isOpen={drawerEngine !== null}
        onClose={() => setDrawerEngine(null)}
        projectId={drawerEngine?.projectId || null}
        clientName={drawerEngine?.clientName || ""}
        ticketNumber={drawerEngine?.ticketNumber ?? undefined}
        queueStatus={drawerEngine?.queueStatus || "pending"}
        assignedToName={drawerEngine?.assignedToName}
      />
    </div>
  );
}
