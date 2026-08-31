import { useEffect, useMemo, useState } from "react";
import {
  useConversionEngines,
  EngineStatus,
  ConversionEngineItem,
} from "@/hooks/useConversionEngines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cog,
  Search,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConversionPostDrawer } from "@/components/conversion/ConversionPostDrawer";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";

const ENGINE_STATUS_CONFIG: Record<
  EngineStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending_engine: {
    label: "Aguardando Extração da Base",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: Database,
  },
  engine_in_development: {
    label: "Motor em Desenvolvimento",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: Loader2,
  },
  engine_ready: {
    label: "Motor Pronto",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: CheckCircle2,
  },
};

export default function ConversionEngines() {
  const { engines, loading, kpis, updateEngineStatus } = useConversionEngines();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<EngineStatus>("pending_engine");
  const [editNotes, setEditNotes] = useState("");
  const [drawerEngine, setDrawerEngine] = useState<ConversionEngineItem | null>(
    null,
  );

  const { hasPermission } = usePermissions();
  const canEditEngines = hasPermission("conversion_engines", "edit");

  const itemsPerPage = selectedPageSize ?? (isMobile ? 3 : 9);
  const filteredEngines = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return engines.filter((engine) => {
      const matchesSearch =
        !normalizedSearch ||
        engine.clientName.toLowerCase().includes(normalizedSearch) ||
        engine.ticketNumber.toLowerCase().includes(normalizedSearch) ||
        engine.legacySystem.toLowerCase().includes(normalizedSearch);
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

  const handleSaveStatus = async () => {
    if (!canEditEngines) return;
    if (!editItem) return;
    await updateEngineStatus(editItem, editStatus, editNotes || undefined);
    setEditItem(null);
    setEditNotes("");
  };

  return (
    <div
      className="min-w-0 space-y-4 overflow-x-hidden p-4 sm:space-y-6 sm:p-6"
      data-testid="conversion-engines-page"
    >
      {/* Header */}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-xl font-bold sm:text-2xl">
            <Cog className="h-6 w-6 shrink-0 text-primary" />
            Motores de Conversão
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Conversões aguardando criação ou desenvolvimento do motor
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div
        className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4"
        data-testid="conversion-engines-kpis"
      >
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Database className="h-6 w-6 shrink-0 text-orange-500 sm:h-8 sm:w-8" />
              <div className="min-w-0">
                <p className="text-xl font-bold sm:text-2xl">{kpis.pendingEngine}</p>
                <p className="text-xs text-muted-foreground">
                  Aguard. Extração da Base
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Loader2 className="h-6 w-6 shrink-0 text-blue-500 sm:h-8 sm:w-8" />
              <div className="min-w-0">
                <p className="text-xl font-bold sm:text-2xl">{kpis.inDevelopment}</p>
                <p className="text-xs text-muted-foreground">
                  Em Desenvolvimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500 sm:h-8 sm:w-8" />
              <div className="min-w-0">
                <p className="text-xl font-bold sm:text-2xl">{kpis.ready}</p>
                <p className="text-xs text-muted-foreground">Prontos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Cog className="h-6 w-6 shrink-0 text-purple-500 sm:h-8 sm:w-8" />
              <div className="min-w-0">
                <p className="text-xl font-bold sm:text-2xl">{kpis.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div
        className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center"
        data-testid="conversion-engines-filters"
      >
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Buscar motores"
            placeholder="Buscar por cliente, ticket ou sistema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger aria-label="Filtrar motores por status" className="w-full min-w-0 sm:w-[220px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending_engine">
              Aguardando Extração da Base
            </SelectItem>
            <SelectItem value="engine_in_development">
              Em Desenvolvimento
            </SelectItem>
            <SelectItem value="engine_ready">Pronto</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
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
          </CardContent>
        </Card>
      ) : (
        <div className="min-w-0 space-y-3">
          <div className="grid min-w-0 gap-3">
          {paginatedEngines.map((engine) => {
            const config = ENGINE_STATUS_CONFIG[engine.engineStatus];
            const StatusIcon = config.icon;

            return (
              <Card
                key={engine.id}
                className="min-w-0 cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => setDrawerEngine(engine)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setDrawerEngine(engine);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Abrir detalhes do motor de ${engine.clientName}`}
                data-testid="conversion-engine-card"
              >
                <CardContent className="min-w-0 p-3 sm:p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="min-w-0 basis-full break-words text-base font-bold sm:basis-auto sm:text-lg" data-testid="conversion-engine-name">
                          {engine.clientName}
                        </h3>
                        <Badge variant="outline" className="max-w-full shrink-0 text-xs">
                          #{engine.ticketNumber}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("h-auto max-w-full whitespace-normal break-words text-left text-xs gap-1", config.color)}
                        >
                          <StatusIcon
                            className={cn(
                              "h-3 w-3",
                              engine.engineStatus === "engine_in_development" &&
                                "animate-spin",
                            )}
                          />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2 lg:flex lg:flex-wrap lg:text-sm" data-testid="conversion-engine-metadata">
                        <span className="min-w-0 break-words">
                          Sistema: <strong>{engine.systemType}</strong>
                        </span>
                        <span className="min-w-0 break-words">
                          Legado: <strong>{engine.legacySystem || "—"}</strong>
                        </span>
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
                      </div>
                      {engine.engineNotes && (
                        <p className="mt-2 min-w-0 whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs text-muted-foreground sm:text-sm">
                          {engine.engineNotes}
                        </p>
                      )}
                    </div>

                    {canEditEngines && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 sm:w-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditItem(engine.id);
                          setEditStatus(engine.engineStatus);
                          setEditNotes(engine.engineNotes || "");
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Atualizar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          <div
            className="flex min-w-0 flex-col gap-3 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
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
                <SelectTrigger aria-label="Motores por página" className="h-8 w-[68px]">
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
                className="h-8 w-8"
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
                className="h-8 w-8"
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

      {/* Edit Dialog */}
      <Dialog
        open={editItem !== null}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-lg overflow-hidden p-0"
          data-testid="conversion-engine-dialog"
        >
          <div className="min-w-0 overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="break-words pr-6">Atualizar Status do Motor</DialogTitle>
            <DialogDescription>
              Altere o andamento e registre observações sobre o motor selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as EngineStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_engine">
                    Aguardando Extração da Base
                  </SelectItem>
                  <SelectItem value="engine_in_development">
                    Em Desenvolvimento
                  </SelectItem>
                  <SelectItem value="engine_ready">Pronto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="engine-notes" className="mb-2 block text-sm font-medium">
                Observações
              </label>
              <Textarea
                id="engine-notes"
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="Registre detalhes sobre o desenvolvimento do motor..."
                className="min-h-24 resize-y"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSaveStatus} disabled={!canEditEngines}>
              Salvar
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post History Drawer */}
      <ConversionPostDrawer
        isOpen={drawerEngine !== null}
        onClose={() => setDrawerEngine(null)}
        projectId={drawerEngine?.projectId || null}
        clientName={drawerEngine?.clientName || ""}
        ticketNumber={drawerEngine?.ticketNumber}
        queueStatus={drawerEngine?.queueStatus || "pending"}
        assignedToName={drawerEngine?.assignedToName}
      />
    </div>
  );
}
