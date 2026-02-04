import { useState, useMemo } from "react";
import {
  Database,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  ArrowRight,
  Filter,
  Search,
  MoreVertical,
  UserPlus,
  Send,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useConversionQueue,
  ConversionQueueItem,
} from "@/hooks/useConversionQueue";
import { useTeamAreas } from "@/hooks/useTeamAreas";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MyQueueDetailedCard } from "./MyQueueDetailedCard";

// Status labels and colors
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  awaiting_homologation: "Aguard. Homologação",
  homologation: "Em Homologação",
  done: "Concluído",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  awaiting_homologation: "bg-purple-100 text-purple-700 border-purple-300",
  homologation: "bg-purple-100 text-purple-700 border-purple-300",
  done: "bg-green-100 text-green-700 border-green-300",
};

export default function Conversion() {
  const { user, team } = useAuth();
  const isConversionTeam = team === "conversion";

  // Current user info from auth
  const currentUserId = user?.id || "";
  const currentUserName =
    user?.user_metadata?.full_name || user?.email || "Usuário";

  const {
    queue,
    myQueue,
    generalQueue,
    homologationQueue,
    kpis,
    loading,
    assignToMe,
    transferTo,
    updateQueueStatus,
    sendToHomologation,
    approveHomologation,
    refetch,
  } = useConversionQueue({ userId: currentUserId });

  const { members } = useTeamAreas();
  const conversionMembers = useMemo(
    () => members.filter((m) => m.area === "conversion"),
    [members],
  );

  const [activeTab, setActiveTab] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    item?: ConversionQueueItem;
  }>({ open: false });
  const [homologationDialog, setHomologationDialog] = useState<{
    open: boolean;
    item?: ConversionQueueItem;
  }>({ open: false });
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  // Filter queue items
  const filterItems = (items: ConversionQueueItem[]) => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || item.queueStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const handleAssign = async (item: ConversionQueueItem) => {
    const success = await assignToMe(
      item.id,
      currentUserId,
      currentUserName,
      item.projectId,
    );
    if (success) {
      toast.success("Projeto assumido com sucesso!");
    } else {
      toast.error("Erro ao assumir projeto");
    }
  };

  const handleTransfer = async () => {
    if (!transferDialog.item || !selectedNewOwner) return;

    const member = conversionMembers.find((m) => m.id === selectedNewOwner);
    if (!member) return;

    const success = await transferTo(
      transferDialog.item.id,
      member.id,
      member.name,
    );

    if (success) {
      toast.success(`Projeto transferido para ${member.name}`);
      setTransferDialog({ open: false });
      setSelectedNewOwner("");
      setTransferNotes("");
    } else {
      toast.error("Erro ao transferir projeto");
    }
  };

  const handleSendToHomologation = async () => {
    if (!homologationDialog.item) return;

    const success = await sendToHomologation(homologationDialog.item.id);

    if (success) {
      toast.success("Enviado para homologação!");
      setHomologationDialog({ open: false });
    } else {
      toast.error("Erro ao enviar para homologação");
    }
  };

  const handleStatusChange = async (
    item: ConversionQueueItem,
    status: string,
  ) => {
    const success = await updateQueueStatus(item.id, status);
    if (success) {
      toast.success("Status atualizado!");
    } else {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleApproveHomologation = async (item: ConversionQueueItem) => {
    const success = await approveHomologation(item.id);
    if (success) {
      toast.success("Homologação aprovada!");
    } else {
      toast.error("Erro ao aprovar homologação");
    }
  };

  // KPI Cards
  const renderKPIs = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">
              Minha Fila
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {kpis.myQueueCount}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/20 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">
              Pendentes
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{kpis.pending}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              Em Andamento
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{kpis.inProgress}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-600">
              Finalizados
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700">{kpis.completed}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">
              Total na Fila
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {kpis.totalInQueue}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Queue Item Card
  const renderQueueItem = (
    item: ConversionQueueItem,
    showAssignButton = false,
  ) => {
    const daysInQueue = Math.floor(
      (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
      <Card
        key={item.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg truncate">
                  {item.clientName}
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    STATUS_COLORS[item.queueStatus] || "",
                  )}
                >
                  {STATUS_LABELS[item.queueStatus] || item.queueStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">#{item.ticketNumber}</span>
                <span>{item.systemType}</span>
                {item.legacySystem && (
                  <span className="text-xs">← {item.legacySystem}</span>
                )}
              </div>
              {/* Assignment Status - Prominent Display */}
              <div className="mt-3">
                {item.assignedToName ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
                    <UserCheck className="h-3 w-3" />
                    Assumido por: {item.assignedToName}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-300 gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    Não assumido
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  Enviado{" "}
                  {formatDistanceToNow(item.sentAt, {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>

            {/* Priority & Days */}
            <div className="flex flex-col items-end gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  item.priority <= 2
                    ? "bg-red-100 text-red-700 border-red-300"
                    : item.priority <= 4
                      ? "bg-orange-100 text-orange-700 border-orange-300"
                      : "bg-slate-100 text-slate-700 border-slate-300",
                )}
              >
                P{item.priority}
              </Badge>
              <span
                className={cn(
                  "text-xs font-medium",
                  daysInQueue > 5
                    ? "text-red-600"
                    : daysInQueue > 3
                      ? "text-orange-600"
                      : "text-muted-foreground",
                )}
              >
                {daysInQueue}d na fila
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {showAssignButton && isConversionTeam && (
                <Button
                  size="sm"
                  onClick={() => handleAssign(item)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assumir
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.queueStatus === "in_progress" && (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          setHomologationDialog({ open: true, item })
                        }
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar p/ Homologação
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {(item.queueStatus === "awaiting_homologation" ||
                    item.queueStatus === "homologation") && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleApproveHomologation(item)}
                        className="text-green-600"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aprovar Homologação
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isConversionTeam && (
                    <DropdownMenuItem
                      onClick={() => setTransferDialog({ open: true, item })}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Transferir
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      if (item.projectId) {
                        window.location.href = `/projects?id=${item.projectId}`;
                      }
                    }}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Database className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestão de Atividades</h1>
            <p className="text-muted-foreground">
              Fila de conversão e homologação
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Minha Fila Button - Only for conversion team */}
          {isConversionTeam && (
            <Button
              onClick={() => setActiveTab("my-queue")}
              variant={activeTab === "my-queue" ? "default" : "outline"}
              className={cn(
                "gap-2",
                activeTab === "my-queue"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "border-purple-300 text-purple-600 hover:bg-purple-50",
              )}
            >
              <User className="h-4 w-4" />
              Minha Fila
              {myQueue.length > 0 && (
                <Badge
                  variant={activeTab === "my-queue" ? "secondary" : "default"}
                  className={cn(
                    "ml-1",
                    activeTab === "my-queue"
                      ? "bg-white/20 text-white"
                      : "bg-purple-600 text-white",
                  )}
                >
                  {myQueue.length}
                </Badge>
              )}
            </Button>
          )}
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {renderKPIs()}

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="awaiting_homologation">
              Aguard. Homolog.
            </SelectItem>
            <SelectItem value="done">Concluídos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="gap-2">
            <Users className="h-4 w-4" />
            Fila Geral
            {generalQueue.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {generalQueue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="homologation" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Homologação
            {homologationQueue.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {homologationQueue.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Queue Tab - Detailed View */}
        <TabsContent value="my-queue">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : filterItems(myQueue).length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed border-purple-200 bg-purple-50/30">
              <Database className="h-12 w-12 mx-auto text-purple-400/50 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-purple-900">
                Sua fila está vazia
              </h3>
              <p className="text-muted-foreground mb-4">
                Assuma projetos da fila geral para começar a trabalhar
              </p>
              <Button
                onClick={() => setActiveTab("general")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Ver Fila Geral
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filterItems(myQueue).map((item) => (
                <MyQueueDetailedCard
                  key={item.id}
                  item={item}
                  onSendToHomologation={(i) =>
                    setHomologationDialog({ open: true, item: i })
                  }
                  onTransfer={(i) => setTransferDialog({ open: true, item: i })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* General Queue Tab */}
        <TabsContent value="general">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : filterItems(generalQueue).length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhuma conversão na fila
              </h3>
              <p className="text-muted-foreground">
                Não há conversões ativas no momento
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filterItems(generalQueue).map((item) =>
                renderQueueItem(item, !item.assignedTo),
              )}
            </div>
          )}
        </TabsContent>

        {/* Homologation Tab */}
        <TabsContent value="homologation">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : filterItems(homologationQueue).length === 0 ? (
            <Card className="p-12 text-center">
              <Send className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum projeto em homologação
              </h3>
              <p className="text-muted-foreground">
                Projetos aparecerão aqui quando enviados para validação
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filterItems(homologationQueue).map((item) =>
                renderQueueItem(item),
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      <Dialog
        open={transferDialog.open}
        onOpenChange={(open) => setTransferDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Projeto</DialogTitle>
            <DialogDescription>
              Transferir "{transferDialog.item?.clientName}" para outro membro
              da equipe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Responsável</Label>
              <Select
                value={selectedNewOwner}
                onValueChange={setSelectedNewOwner}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {conversionMembers
                    .filter((m) => m.id !== currentUserId)
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Motivo da transferência..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button onClick={handleTransfer} disabled={!selectedNewOwner}>
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Homologation Dialog */}
      <Dialog
        open={homologationDialog.open}
        onOpenChange={(open) => setHomologationDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Homologação</DialogTitle>
            <DialogDescription>
              Confirmar envio de "{homologationDialog.item?.clientName}" para
              validação?
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <p className="text-sm text-purple-700 dark:text-purple-400">
              O projeto será marcado como "Aguardando Homologação" e poderá ser
              validado pelo analista responsável.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHomologationDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendToHomologation}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Enviar para Homologação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
