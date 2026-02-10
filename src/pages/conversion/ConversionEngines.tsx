import { useState } from "react";
import {
  useConversionEngines,
  EngineStatus,
} from "@/hooks/useConversionEngines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ENGINE_STATUS_CONFIG: Record<
  EngineStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending_engine: {
    label: "Aguardando Motor",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: Clock,
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editItem, setEditItem] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<EngineStatus>("pending_engine");
  const [editNotes, setEditNotes] = useState("");

  const filteredEngines = engines.filter((e) => {
    const matchesSearch =
      !search ||
      e.clientName.toLowerCase().includes(search.toLowerCase()) ||
      e.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.legacySystem.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || e.engineStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveStatus = async () => {
    if (!editItem) return;
    await updateEngineStatus(editItem, editStatus, editNotes || undefined);
    setEditItem(null);
    setEditNotes("");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            Motores de Conversão
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversões aguardando criação ou desenvolvimento do motor
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{kpis.pendingEngine}</p>
                <p className="text-xs text-muted-foreground">
                  Aguardando Motor
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{kpis.inDevelopment}</p>
                <p className="text-xs text-muted-foreground">
                  Em Desenvolvimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{kpis.ready}</p>
                <p className="text-xs text-muted-foreground">Prontos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cog className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{kpis.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, ticket ou sistema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending_engine">Aguardando Motor</SelectItem>
            <SelectItem value="engine_in_development">
              Em Desenvolvimento
            </SelectItem>
            <SelectItem value="engine_ready">Pronto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Engine List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredEngines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cog className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum motor encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredEngines.map((engine) => {
            const config = ENGINE_STATUS_CONFIG[engine.engineStatus];
            const StatusIcon = config.icon;

            return (
              <Card
                key={engine.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg truncate">
                          {engine.clientName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          #{engine.ticketNumber}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-xs gap-1", config.color)}
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Sistema: <strong>{engine.systemType}</strong>
                        </span>
                        <span>
                          Legado: <strong>{engine.legacySystem || "—"}</strong>
                        </span>
                        {engine.assignedToName && (
                          <span>
                            Responsável:{" "}
                            <strong>{engine.assignedToName}</strong>
                          </span>
                        )}
                        {engine.engineRequestedAt && (
                          <span>
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
                        <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                          {engine.engineNotes}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setEditItem(engine.id);
                        setEditStatus(engine.engineStatus);
                        setEditNotes(engine.engineNotes || "");
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Atualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editItem !== null}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status do Motor</DialogTitle>
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
                    Aguardando Motor
                  </SelectItem>
                  <SelectItem value="engine_in_development">
                    Em Desenvolvimento
                  </SelectItem>
                  <SelectItem value="engine_ready">Pronto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Observações
              </label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notas sobre o motor..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStatus}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
