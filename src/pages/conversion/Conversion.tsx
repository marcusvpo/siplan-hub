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
  MessageSquare,
  Cog,
  HelpCircle,
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
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MyQueueDetailedCard } from "./MyQueueDetailedCard";
import { ConversionPostDrawer } from "@/components/conversion/ConversionPostDrawer";
import { useConversionEngines } from "@/hooks/useConversionEngines";
import { useConversionIssues } from "@/hooks/useConversionIssues";
import { ConversionIssuesTab } from "@/components/conversion/ConversionIssuesTab";

// Status labels and colors
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  awaiting_homologation: "Aguard. Homologação",
  homologation: "Em Homologação",
  homologation_issues: "Com Inconsistências",
  done: "Concluído",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800",
  awaiting_homologation: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800",
  homologation: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800",
  homologation_issues: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
  done: "bg-green-100 text-green-700 border-green-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
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
    removeFromQueue,
    refetch,
  } = useConversionQueue({ userId: currentUserId });

  const { issues } = useConversionIssues();
  const activeIssuesCount = useMemo(
    () => issues.filter((i) => i.status === "open" || i.status === "in_progress").length,
    [issues]
  );

  const { members } = useTeamAreas();
  const conversionMembers = useMemo(
    () => members.filter((m) => m.area === "conversion"),
    [members],
  );
  const implementationMembers = useMemo(
    () => members.filter((m) => m.area === "implementation"),
    [members],
  );

  const { requestEngine } = useConversionEngines();

  const [activeTab, setActiveTab] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [systemFilter, setSystemFilter] = useState("all");
  const [drawerDefaultTab, setDrawerDefaultTab] = useState<"posts" | "homologations">("posts");
  const [helpOpen, setHelpOpen] = useState(false);

  const systemTypes = useMemo(() => {
    const types = new Set<string>();
    queue.forEach((item) => {
      if (item.systemType) types.add(item.systemType);
    });
    return Array.from(types);
  }, [queue]);



  // Dialog states
  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    item?: ConversionQueueItem;
  }>({ open: false });
  const [homologationDialog, setHomologationDialog] = useState<{
    open: boolean;
    item?: ConversionQueueItem;
  }>({ open: false });
  const [engineDialog, setEngineDialog] = useState<{
    open: boolean;
    item?: ConversionQueueItem;
  }>({ open: false });
  const [engineNotes, setEngineNotes] = useState("");
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [selectedImplantador, setSelectedImplantador] = useState("");

  // Drawer state for post history
  const [drawerItem, setDrawerItem] = useState<ConversionQueueItem | null>(
    null,
  );

  // KPI detail modal
  const [kpiModal, setKpiModal] = useState<{
    open: boolean;
    title: string;
    color: string;
    items: ConversionQueueItem[];
  }>({ open: false, title: "", color: "", items: [] });

  const openKpiModal = (
    title: string,
    color: string,
    items: ConversionQueueItem[],
  ) => setKpiModal({ open: true, title, color, items });

  // Filter queue items
  const filterItems = (items: ConversionQueueItem[]) => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || item.queueStatus === statusFilter;
      const matchesSystem =
        systemFilter === "all" || item.systemType === systemFilter;
      return matchesSearch && matchesStatus && matchesSystem;
    });
  };

  // Filter queue items for Kanban (ignoring statusFilter)
  const filterKanbanItems = (items: ConversionQueueItem[]) => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSystem =
        systemFilter === "all" || item.systemType === systemFilter;
      return matchesSearch && matchesSystem;
    });
  };

  // Render Kanban Card (Compact version)
  const renderKanbanCard = (item: ConversionQueueItem) => {
    const daysInQueue = Math.floor(
      (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const statusVisual = queueStatusConfig[item.queueStatus] || queueStatusConfig.pending;
    const StatusIcon = statusVisual.icon;

    return (
      <Card
        key={item.id}
        className={cn(
          "transition-all duration-300 border-l-[5px] hover:shadow-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 relative group",
          statusVisual.borderColor
        )}
      >
        <CardContent className="p-3.5 space-y-2">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight group-hover:text-primary transition-colors duration-200 line-clamp-2">
              {item.clientName}
            </h4>
            
            {/* Action Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                {!item.engineStatus && isConversionTeam && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEngineDialog({ open: true, item });
                    }}
                  >
                    <Cog className="h-3.5 w-3.5 mr-1.5" />
                    Enviar p/ Conversor
                  </DropdownMenuItem>
                )}
                {isConversionTeam && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setTransferDialog({ open: true, item });
                    }}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                    Transferir
                  </DropdownMenuItem>
                )}
                {isConversionTeam && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remover "${item.clientName}"?`)) {
                        removeFromQueue(item.id, item.projectId);
                      }
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                    Remover da Fila
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges Info */}
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              className={cn(
                "text-[10px] font-bold py-0 px-1.5",
                item.priority <= 2
                  ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400"
                  : item.priority <= 4
                    ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400"
                    : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              P{item.priority}
            </Badge>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800",
                daysInQueue > 5
                  ? "text-red-600 dark:text-red-400 font-semibold"
                  : daysInQueue > 3
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-muted-foreground",
              )}
            >
              {daysInQueue}d na fila
            </span>
            {item.engineStatus && (
              <Badge
                variant="outline"
                className={cn(
                  "py-0 px-1.5 text-[9px] gap-0.5",
                  item.engineStatus === "pending_engine" && "bg-orange-50 text-orange-700 border-orange-200",
                  item.engineStatus === "engine_in_development" && "bg-blue-50 text-blue-700 border-blue-200",
                  item.engineStatus === "engine_ready" && "bg-green-50 text-green-700 border-green-200",
                )}
              >
                <Cog className="h-2.5 w-2.5" />
                {item.engineStatus === "pending_engine" && "Aguard. Base"}
                {item.engineStatus === "engine_in_development" && "Motor em Dev"}
                {item.engineStatus === "engine_ready" && "Motor Pronto"}
              </Badge>
            )}
          </div>

          {/* Ticket and Systems */}
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground font-medium">
            <span className="font-mono bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-1 py-0.2 rounded text-[10px]">
              #{item.ticketNumber}
            </span>
            <span>{item.systemType}</span>
            {item.legacySystem && (
              <span className="truncate max-w-[120px] text-slate-400">
                ← {item.legacySystem}
              </span>
            )}
          </div>

          {/* Responsável / Previsão */}
          <div className="text-[11px] text-muted-foreground pt-1 border-t border-dashed border-slate-100 dark:border-slate-800 space-y-1">
            {item.assignedToName ? (
              <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-450">
                <UserCheck className="h-3 w-3" />
                <span>Ad: {item.assignedToName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-450 font-semibold">
                <Clock className="h-3 w-3" />
                <span>Aguardando analista</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Impl: {item.deploymentDate ? format(new Date(item.deploymentDate), "dd/MM/yyyy") : "Sem prev."}</span>
              <span>Env: {formatDistanceToNow(item.sentAt, { addSuffix: true, locale: ptBR })}</span>
            </div>
          </div>

          {/* Ações Rápidas do Card */}
          <div className="flex gap-1.5 pt-1.5">
            {/* Botão Assumir */}
            {!item.assignedTo && isConversionTeam && (
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-1 text-[10px] h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssign(item);
                }}
              >
                <UserPlus className="h-3 w-3" />
                Assumir
              </Button>
            )}

            {/* Botão Enviar p/ Homologação */}
            {item.queueStatus === "in_progress" && (
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-1 text-[10px] h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setHomologationDialog({ open: true, item });
                }}
              >
                <Send className="h-3 w-3" />
                Homologar
              </Button>
            )}

            {/* Botão Ver Inconsistências */}
            {item.queueStatus === "homologation_issues" && (
              <Button
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-1 text-[10px] h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerDefaultTab("homologations");
                  setDrawerItem(item);
                }}
              >
                <AlertCircle className="h-3 w-3" />
                Inconsistências
              </Button>
            )}

            {/* Botão Ver Parecer Final */}
            {item.queueStatus === "done" && item.homologationStatus === "approved" && (
              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1 text-[10px] h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerDefaultTab("homologations");
                  setDrawerItem(item);
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Parecer Final
              </Button>
            )}

            {/* Botão Ver Publicações */}
            <Button
              size="sm"
              variant="outline"
              className="px-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center text-[10px] h-7 grow"
              onClick={(e) => {
                e.stopPropagation();
                setDrawerDefaultTab("posts");
                setDrawerItem(item);
              }}
              title="Ver publicações e posts"
            >
              <MessageSquare className="h-3 w-3 text-primary mr-1" />
              Feed
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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

    const analyst = selectedImplantador && selectedImplantador !== "unassigned_open"
      ? members.find((m) => m.id === selectedImplantador)
      : null;

    const success = await sendToHomologation(
      homologationDialog.item.id,
      homologationDialog.item.projectId,
      analyst?.id || null,
      analyst?.name || null,
      currentUserName
    );

    if (success) {
      toast.success("Enviado para homologação!");
      setHomologationDialog({ open: false });
      setSelectedImplantador("");
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
      <Card
        className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border-primary/20 dark:border-primary/30 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openKpiModal("Minha Fila", "primary", myQueue)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Minha Fila</span>
          </div>
          <p className="text-2xl font-bold text-primary">{kpis.myQueueCount}</p>
        </CardContent>
      </Card>

      <Card
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/20 border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openKpiModal("Pendentes", "slate", queue.filter((i) => i.queueStatus === "pending"))}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">Pendentes</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{kpis.pending}</p>
        </CardContent>
      </Card>

      <Card
        className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openKpiModal("Em Andamento", "blue", queue.filter((i) => i.queueStatus === "in_progress"))}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Em Andamento</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{kpis.inProgress}</p>
        </CardContent>
      </Card>

      <Card
        className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openKpiModal("Finalizados", "green", queue.filter((i) => i.queueStatus === "done"))}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-600">Finalizados</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{kpis.completed}</p>
        </CardContent>
      </Card>

      <Card
        className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openKpiModal("Total na Fila", "amber", queue)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Total na Fila</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{kpis.totalInQueue}</p>
        </CardContent>
      </Card>
    </div>
  );

  // Configuração visual de status da fila
  const queueStatusConfig: Record<string, { icon: any; bgColor: string; borderColor: string }> = {
    pending: {
      icon: Clock,
      bgColor: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
      borderColor: "border-l-slate-400 dark:border-l-slate-600",
    },
    in_progress: {
      icon: RefreshCw,
      bgColor: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
      borderColor: "border-l-blue-500",
    },
    awaiting_homologation: {
      icon: Database,
      bgColor: "bg-purple-50 text-purple-650 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
      borderColor: "border-l-primary",
    },
    homologation: {
      icon: Database,
      bgColor: "bg-purple-50 text-purple-650 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
      borderColor: "border-l-primary",
    },
    homologation_issues: {
      icon: AlertCircle,
      bgColor: "bg-red-50 text-red-650 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30",
      borderColor: "border-l-red-500",
    },
    done: {
      icon: CheckCircle2,
      bgColor: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      borderColor: "border-l-emerald-500",
    },
  };

  // Queue Item Card
  const renderQueueItem = (
    item: ConversionQueueItem,
    showAssignButton = false,
  ) => {
    const daysInQueue = Math.floor(
      (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const statusVisual = queueStatusConfig[item.queueStatus] || queueStatusConfig.pending;
    const StatusIcon = statusVisual.icon;

    return (
      <Card
        key={item.id}
        className={cn(
          "transition-all duration-300 border-l-8 hover:-translate-y-0.5 hover:shadow-md",
          statusVisual.borderColor
        )}
      >
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Column: Info & Indicators */}
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Status Icon Badge */}
              <div className={cn(
                "flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border shadow-sm",
                statusVisual.bgColor
              )}>
                <StatusIcon className={cn(
                  "h-5 w-5",
                  item.queueStatus === "in_progress" && "animate-[spin_4s_linear_infinite]"
                )} />
              </div>
              {/* Engine Dependency Indicator */}
              {item.engineStatus && (
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl",
                    item.engineStatus === "pending_engine" &&
                      "bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-300 dark:ring-orange-700",
                    item.engineStatus === "engine_in_development" &&
                      "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 dark:ring-blue-700",
                    item.engineStatus === "engine_ready" &&
                      "bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-300 dark:ring-emerald-700",
                  )}
                >
                  <Cog
                    className={cn(
                      "h-7 w-7",
                      item.engineStatus === "pending_engine" &&
                        "text-orange-600 animate-[spin_3s_linear_infinite]",
                      item.engineStatus === "engine_in_development" &&
                        "text-blue-600 animate-spin",
                      item.engineStatus === "engine_ready" && "text-emerald-600",
                    )}
                  />
                </div>
              )}

              {/* Main Info */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">
                    {item.clientName}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5",
                      STATUS_COLORS[item.queueStatus] || "",
                    )}
                  >
                    {STATUS_LABELS[item.queueStatus] || item.queueStatus}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-xs font-bold",
                      item.priority <= 2
                        ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                        : item.priority <= 4
                          ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50"
                          : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800",
                    )}
                  >
                    P{item.priority}
                  </Badge>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800",
                      daysInQueue > 5
                        ? "text-red-600 dark:text-red-400 font-semibold"
                        : daysInQueue > 3
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {daysInQueue}d na fila
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">#{item.ticketNumber}</span>
                  <span>{item.systemType}</span>
                  {item.legacySystem && (
                    <span className="text-xs flex items-center gap-1">
                      <span className="text-muted-foreground/50">←</span> {item.legacySystem}
                    </span>
                  )}
                </div>

                {/* Assignment Status & Deadlines */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {item.assignedToName ? (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30 gap-1 text-xs">
                      <UserCheck className="h-3 w-3" />
                      Assumido por: {item.assignedToName}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50/50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30 gap-1 text-xs"
                    >
                      <Clock className="h-3 w-3" />
                      Não assumido
                    </Badge>
                  )}

                  {item.engineStatus && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 text-xs",
                        item.engineStatus === "pending_engine" &&
                          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/10 dark:text-orange-400",
                        item.engineStatus === "engine_in_development" &&
                          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/10 dark:text-blue-400",
                        item.engineStatus === "engine_ready" &&
                          "bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/10 dark:text-emerald-400",
                      )}
                    >
                      <Cog className="h-3 w-3" />
                      {item.engineStatus === "pending_engine" && "Aguard. Extração da Base"}
                      {item.engineStatus === "engine_in_development" && "Motor em Dev"}
                      {item.engineStatus === "engine_ready" && "Motor Pronto"}
                    </Badge>
                  )}

                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    📅 Prev. Implantação:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {item.deploymentDate
                        ? format(new Date(item.deploymentDate), "dd/MM/yyyy", { locale: ptBR })
                        : "Ainda Sem Previsão"}
                    </strong>
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Enviado {formatDistanceToNow(item.sentAt, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column / Actions Panel */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:pl-4 border-slate-100 dark:border-slate-800 shrink-0 w-full lg:w-auto justify-end">
              {/* Action 1: Assumir (Assign to Me) */}
              {!item.assignedTo && isConversionTeam && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssign(item);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-200 active:scale-95 text-xs h-9 w-full lg:w-auto justify-center"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Assumir
                </Button>
              )}

              {/* Action 2: Enviar p/ Homologação */}
              {item.queueStatus === "in_progress" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHomologationDialog({ open: true, item });
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-200 active:scale-95 text-xs h-9 w-full lg:w-auto justify-center"
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar p/ Homologação
                </Button>
              )}

              {/* Action 3: Ver Parecer de Inconsistências */}
              {item.queueStatus === "homologation_issues" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerDefaultTab("homologations");
                    setDrawerItem(item);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-200 active:scale-95 text-xs h-9 w-full lg:w-auto justify-center"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Ver Inconsistências
                </Button>
              )}

              {/* Action 3b: Ver Parecer Final */}
              {item.queueStatus === "done" && item.homologationStatus === "approved" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerDefaultTab("homologations");
                    setDrawerItem(item);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-200 active:scale-95 text-xs h-9 w-full lg:w-auto justify-center"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ver Parecer Final
                </Button>
              )}

              {/* Action 4: Ver Publicações */}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerDefaultTab("posts");
                  setDrawerItem(item);
                }}
                className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-1.5 transition-colors duration-200 text-xs h-9 w-full lg:w-auto justify-center"
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Ver Publicações
              </Button>

              {/* Action 5: Ver Detalhes */}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.projectId) {
                    window.location.href = `/projects?id=${item.projectId}`;
                  }
                }}
                className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-1.5 transition-colors duration-200 text-xs h-9 w-full lg:w-auto justify-center"
              >
                <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                Ver Detalhes
              </Button>

              {/* Secondary Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 h-9 w-9"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!item.engineStatus && isConversionTeam && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEngineDialog({ open: true, item });
                      }}
                    >
                      <Cog className="h-4 w-4 mr-2" />
                      Enviar para criação do Conversor
                    </DropdownMenuItem>
                  )}
                  {isConversionTeam && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferDialog({ open: true, item });
                      }}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Transferir
                    </DropdownMenuItem>
                  )}
                  {isConversionTeam && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Tem certeza que deseja remover "${item.clientName}" da fila?`
                          )
                        ) {
                          removeFromQueue(item.id, item.projectId);
                        }
                      }}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Remover da Fila
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Dedicated Card for Homologation Items
  const renderHomologationItem = (item: ConversionQueueItem) => {
    const daysInQueue = Math.floor(
      (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
      <Card
        key={item.id}
        className={cn(
          "transition-all duration-300 border-l-4 hover:-translate-y-0.5 hover:shadow-md border-l-indigo-500 bg-gradient-to-br from-indigo-50/20 via-transparent to-transparent dark:from-indigo-950/10 dark:via-transparent dark:to-transparent"
        )}
      >
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Column: Info & Indicators */}
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Distinctive Icon for Homologation */}
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-300 dark:ring-indigo-700">
                <CheckCircle2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>

              {/* Main Info */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
                    Esteira de Homologação
                  </span>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">
                    {item.clientName}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5",
                      STATUS_COLORS[item.queueStatus] || "",
                    )}
                  >
                    {STATUS_LABELS[item.queueStatus] || item.queueStatus}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-xs font-bold",
                      item.priority <= 2
                        ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                        : item.priority <= 4
                          ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50"
                          : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800",
                    )}
                  >
                    P{item.priority}
                  </Badge>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                    {daysInQueue}d na fila
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">#{item.ticketNumber}</span>
                  <span>{item.systemType}</span>
                  {item.legacySystem && (
                    <span className="text-xs flex items-center gap-1">
                      <span className="text-muted-foreground/50">←</span> {item.legacySystem}
                    </span>
                  )}
                </div>

                {/* Assignment Status (Converter & Implantador) */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {/* Conversor responsável */}
                  {item.assignedToName && (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30 gap-1 text-xs">
                      <UserCheck className="h-3 w-3" />
                      Conversor: {item.assignedToName}
                    </Badge>
                  )}

                  {/* Implantador responsável (Aguardando ou Vinculado) */}
                  {item.homologationAnalystName ? (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/30 gap-1 text-xs font-semibold">
                      <User className="h-3 w-3" />
                      Implantador: {item.homologationAnalystName}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30 gap-1 text-xs font-bold animate-pulse"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Fila em Aberto / Pendente
                    </Badge>
                  )}

                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    📅 Prev. Implantação:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {item.deploymentDate
                        ? format(new Date(item.deploymentDate), "dd/MM/yyyy", { locale: ptBR })
                        : "Ainda Sem Previsão"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column / Actions Panel */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:pl-4 border-slate-100 dark:border-slate-800 shrink-0 w-full lg:w-auto justify-end">
              {/* Action 1: Ver Inconsistências */}
              {item.queueStatus === "homologation_issues" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerDefaultTab("homologations");
                    setDrawerItem(item);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-200 active:scale-95 text-xs h-9 w-full lg:w-auto justify-center"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Ver Inconsistências
                </Button>
              )}

              {/* Action 2: Ver Parecer Final */}
              {item.queueStatus === "done" && item.homologationStatus === "approved" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerDefaultTab("homologations");
                    setDrawerItem(item);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-200 active:scale-95 text-xs h-9 w-full lg:w-auto justify-center"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ver Parecer Final
                </Button>
              )}

              {/* Action 3: Ver Publicações */}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerDefaultTab("posts");
                  setDrawerItem(item);
                }}
                className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-1.5 transition-colors duration-200 text-xs h-9 w-full lg:w-auto justify-center"
              >
                <MessageSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Ver Publicações
              </Button>

              {/* Action 4: Ver Detalhes */}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.projectId) {
                    window.location.href = `/projects?id=${item.projectId}`;
                  }
                }}
                className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-1.5 transition-colors duration-200 text-xs h-9 w-full lg:w-auto justify-center"
              >
                <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                Ver Detalhes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background to-muted/30 overflow-hidden">
      {/* Fixed Header Area */}
      <div className="flex-shrink-0 p-6 pb-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
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
                  "gap-2 relative",
                  activeTab === "my-queue"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "border-primary/30 text-primary hover:bg-primary/5",
                )}
              >
                <User className="h-4 w-4" />
                Minha Fila
                {myQueue.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Badge
                      variant={activeTab === "my-queue" ? "secondary" : "default"}
                      className={cn(
                        "ml-1",
                        activeTab === "my-queue"
                          ? "bg-white/20 text-white"
                          : "bg-primary text-white",
                      )}
                    >
                      {myQueue.length}
                    </Badge>
                    <span className="relative flex h-2 w-2">
                      <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        activeTab === "my-queue" ? "bg-white" : "bg-primary"
                      )}></span>
                      <span className={cn(
                        "relative inline-flex rounded-full h-2 w-2",
                        activeTab === "my-queue" ? "bg-white" : "bg-primary"
                      )}></span>
                    </span>
                  </span>
                )}
              </Button>
            )}
            <Button onClick={() => setHelpOpen(true)} variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/5 gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Ajuda / Tutorial
            </Button>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        {renderKPIs()}

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeTab !== "general" && (
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
          )}

          <Select value={systemFilter} onValueChange={setSystemFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Sistemas</SelectItem>
              {systemTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs - with fixed trigger and scrollable content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden px-6 pt-4"
      >
        <TabsList className="mb-4 flex-shrink-0">
          <TabsTrigger value="general" className="gap-2 relative">
            <Users className="h-4 w-4" />
            Fila Geral
            {generalQueue.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Badge variant="secondary" className="ml-1">
                  {generalQueue.length}
                </Badge>
                {generalQueue.some((item) => !item.assignedTo) && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="homologations" className="gap-2 relative">
            <CheckCircle2 className="h-4 w-4" />
            Homologações
            {homologationQueue.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Badge variant="secondary" className="ml-1">
                  {homologationQueue.length}
                </Badge>
                {homologationQueue.some((item) => item.queueStatus === "homologation_issues") && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2 relative">
            <AlertCircle className="h-4 w-4" />
            Pendências
            {activeIssuesCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Badge variant="destructive" className="ml-1 animate-pulse px-1.5 py-0 text-[10px]">
                  {activeIssuesCount}
                </Badge>
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-6 space-y-4">
          {/* My Queue Tab - Detailed View */}
          <TabsContent value="my-queue" className="mt-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando...
              </div>
            ) : filterItems(myQueue).length === 0 ? (
              <Card className="p-12 text-center border-2 border-dashed border-primary/20 bg-primary/5">
                <Database className="h-12 w-12 mx-auto text-primary/40 mb-4" />
                <h3 className="text-lg font-medium mb-2 text-primary">
                  Sua fila está vazia
                </h3>
                <p className="text-muted-foreground mb-4">
                  Assuma projetos da fila geral para começar a trabalhar
                </p>
                <Button
                  onClick={() => setActiveTab("general")}
                  className="bg-primary hover:bg-primary/90"
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
                    onTransfer={(i) =>
                      setTransferDialog({ open: true, item: i })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* General Queue Tab */}
          {/* General Queue Tab - Kanban Layout */}
          <TabsContent value="general" className="mt-0 overflow-hidden flex-1 flex flex-col">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground flex-grow flex items-center justify-center min-h-[300px]">
                <div className="space-y-2">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="text-xs">Carregando quadro Kanban...</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 flex-1 items-stretch select-none h-[calc(100vh-290px)] min-h-[500px]">
                {/* 1. Pendentes Column */}
                <div className="w-[300px] shrink-0 bg-slate-50/70 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-150 dark:border-slate-800/80 flex flex-col h-full shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-pulse" />
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Pendentes
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                      {filterKanbanItems(queue.filter((i) => i.queueStatus === "pending")).length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "pending")).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs bg-white dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800/50 rounded-lg p-4">
                        Nenhuma pendente
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "pending")).map(renderKanbanCard)
                    )}
                  </div>
                </div>

                {/* 2. Em Andamento Column */}
                <div className="w-[300px] shrink-0 bg-slate-50/70 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-150 dark:border-slate-800/80 flex flex-col h-full shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Em Andamento
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                      {filterKanbanItems(queue.filter((i) => i.queueStatus === "in_progress")).length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "in_progress")).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs bg-white dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800/50 rounded-lg p-4">
                        Nenhuma em andamento
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "in_progress")).map(renderKanbanCard)
                    )}
                  </div>
                </div>

                {/* 3. Em Homologação Column */}
                <div className="w-[300px] shrink-0 bg-slate-50/70 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-150 dark:border-slate-800/80 flex flex-col h-full shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Homologação
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                      {filterKanbanItems(queue.filter((i) => i.queueStatus === "awaiting_homologation" || i.queueStatus === "homologation")).length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "awaiting_homologation" || i.queueStatus === "homologation")).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs bg-white dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800/50 rounded-lg p-4">
                        Nenhuma em homologação
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "awaiting_homologation" || i.queueStatus === "homologation")).map(renderKanbanCard)
                    )}
                  </div>
                </div>

                {/* 4. Com Inconsistências Column */}
                <div className="w-[300px] shrink-0 bg-slate-50/70 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-150 dark:border-slate-800/80 flex flex-col h-full shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Inconsistências
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                      {filterKanbanItems(queue.filter((i) => i.queueStatus === "homologation_issues")).length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "homologation_issues")).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs bg-white dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800/50 rounded-lg p-4">
                        Nenhuma inconsistência
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "homologation_issues")).map(renderKanbanCard)
                    )}
                  </div>
                </div>

                {/* 5. Concluídos Column */}
                <div className="w-[300px] shrink-0 bg-slate-50/70 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-150 dark:border-slate-800/80 flex flex-col h-full shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-850">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Concluídos
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                      {filterKanbanItems(queue.filter((i) => i.queueStatus === "done")).length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "done")).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs bg-white dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800/50 rounded-lg p-4">
                        Nenhum concluído
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "done")).map(renderKanbanCard)
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Homologations Queue Tab */}
          <TabsContent value="homologations" className="mt-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando...
              </div>
            ) : filterItems(homologationQueue).length === 0 ? (
              <Card className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma homologação na fila
                </h3>
                <p className="text-muted-foreground">
                  Não há homologações ativas ou concluídas registradas
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filterItems(homologationQueue).map((item) =>
                  renderHomologationItem(item),
                )}
              </div>
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="mt-0">
            <ConversionIssuesTab
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              isConversionTeam={isConversionTeam}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Post History Drawer */}
      <ConversionPostDrawer
        isOpen={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        projectId={drawerItem?.projectId || null}
        clientName={drawerItem?.clientName || ""}
        ticketNumber={drawerItem?.ticketNumber}
        queueStatus={drawerItem?.queueStatus || "pending"}
        assignedToName={drawerItem?.assignedToName}
        defaultTab={drawerDefaultTab}
      />

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
          <DialogFooter className="sm:justify-between">
            {transferDialog.item && (
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => {
                  if (
                    confirm(
                      `Tem certeza que deseja remover "${transferDialog.item?.clientName}" da fila?`,
                    )
                  ) {
                    removeFromQueue(
                      transferDialog.item.id,
                      transferDialog.item.projectId,
                    );
                    setTransferDialog({ open: false });
                  }
                }}
              >
                Remover da Fila
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setTransferDialog({ open: false })}
              >
                Cancelar
              </Button>
              <Button onClick={handleTransfer} disabled={!selectedNewOwner}>
                Transferir
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Homologation Dialog */}
      <Dialog
        open={homologationDialog.open}
        onOpenChange={(open) => {
          setHomologationDialog({ open });
          if (!open) setSelectedImplantador("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Homologação</DialogTitle>
            <DialogDescription>
              Confirmar envio de "{homologationDialog.item?.clientName}" para
              validação?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm text-primary dark:text-primary-light">
                O projeto será marcado como "Aguardando Homologação" e entrará na fila de validação dos implantadores.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Vincular Implantador (Opcional)</Label>
              <Select
                value={selectedImplantador}
                onValueChange={setSelectedImplantador}
              >
                <SelectTrigger className="w-full border-2">
                  <SelectValue placeholder="Selecione um implantador ou deixe em aberto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned_open">Deixar em Aberto (Fila Geral)</SelectItem>
                  {implementationMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHomologationDialog({ open: false });
                setSelectedImplantador("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendToHomologation}
              className="bg-primary hover:bg-primary/90"
            >
              Enviar para Homologação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Engine Request Dialog */}
      <Dialog
        open={engineDialog.open}
        onOpenChange={(open) => {
          if (!open) setEngineDialog({ open: false });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Criação do Conversor</DialogTitle>
            <DialogDescription>
              Solicitar criação do motor de conversão para "
              {engineDialog.item?.clientName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-400">
                A conversão será marcada como "Aguardando Extração da Base" e
                ficará visível na tela de Motores até que o conversor esteja
                pronto.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={engineNotes}
                onChange={(e) => setEngineNotes(e.target.value)}
                placeholder="Sistema legado, requisitos do motor..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEngineDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (engineDialog.item) {
                  await requestEngine(
                    engineDialog.item.id,
                    engineNotes,
                    currentUserName,
                  );
                  setEngineDialog({ open: false });
                  setEngineNotes("");
                  refetch();
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Cog className="h-4 w-4 mr-2" />
              Enviar para Criação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Detail Dialog */}
      <Dialog open={kpiModal.open} onOpenChange={(open) => !open && setKpiModal((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{kpiModal.title}</span>
              <Badge variant="secondary">{kpiModal.items.length}</Badge>
            </DialogTitle>
            <DialogDescription>
              Projetos incluídos neste indicador
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2">
            {kpiModal.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum item nesta categoria.</p>
              </div>
            ) : (
              kpiModal.items.map((item) => {
                const daysInQueue = Math.floor(
                  (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.clientName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">#{item.ticketNumber}</span>
                        <span className="text-[10px] text-muted-foreground">{item.systemType}</span>
                      </div>
                      {item.assignedToName && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ✓ {item.assignedToName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[item.queueStatus] || "")}
                      >
                        {STATUS_LABELS[item.queueStatus] || item.queueStatus}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
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
                          "text-[10px] font-medium whitespace-nowrap",
                          daysInQueue > 5 ? "text-red-600" : daysInQueue > 3 ? "text-orange-600" : "text-muted-foreground",
                        )}
                      >
                        {daysInQueue}d na fila
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tutorial / Ajuda da Esteira */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary border-b border-slate-100 dark:border-slate-800 pb-2">
              <Database className="h-5 w-5 text-primary animate-pulse" />
              Manual da Esteira de Conversão & Pendências
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Guia rápido sobre o fluxo de migração de dados e o reporte de pendências pós-entrega.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-350">
            {/* Fluxo de Etapas */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                🔄 Esteira Principal (Passo a Passo)
              </h3>
              
              <div className="grid grid-cols-1 gap-2.5">
                {/* Passo 1 */}
                <div className="flex gap-3 items-start p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-xs text-foreground">Fila de Entrada (Aguardando Analista)</p>
                    <p className="text-muted-foreground leading-normal">
                      Os novos projetos iniciam com o status <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800 text-[10px] py-0 px-1.5">Pendente</Badge>. Vá na aba <strong>Fila Geral</strong> e clique no botão <strong className="text-primary font-semibold">Assumir</strong> para trazer o projeto para sua fila.
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex gap-3 items-start p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-xs text-foreground">Execução da Conversão</p>
                    <p className="text-muted-foreground leading-normal">
                      O projeto passa para <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 px-1.5">Em Andamento</Badge> na aba <strong>Minha Fila</strong>. Utilize o botão <strong className="text-foreground font-semibold">Ver Publicações</strong> no canto do card para postar logs de progresso, observações e anexar arquivos.
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex gap-3 items-start p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-xs text-foreground">Envio para Homologação</p>
                    <p className="text-muted-foreground leading-normal">
                      Ao finalizar a importação/validação primária, clique no botão <strong className="text-primary font-semibold">Enviar p/ Homologação</strong>. O status muda para <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] py-0 px-1.5">Aguard. Homologação</Badge>, notificando o implantador responsável.
                    </p>
                  </div>
                </div>

                {/* Passo 4 */}
                <div className="flex gap-3 items-start p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</div>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-xs text-foreground">Homologação e Conclusão</p>
                    <p className="text-muted-foreground leading-normal">
                      O implantador valida os dados. Se aprovado, ele clica em <strong className="text-emerald-600 font-semibold">Aprovar Homologação</strong> mudando o status para <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] py-0 px-1.5">Concluído</Badge>. Se houver falhas, muda para <Badge variant="outline" className="bg-red-50 text-red-750 border-red-200 text-[10px] py-0 px-1.5">Com Inconsistências</Badge> e o projeto retorna para o analista.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pendências de Conversão */}
            <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                ⚠️ Pendências de Conversão (Erros no uso prático)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quando a conversão e implantação já foram finalizadas há tempos, mas o cliente detecta erros de saldo ou divergências de dados ao usar o sistema no dia a dia:
              </p>
              
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
                <li><strong>Onde Reportar:</strong> As pendências são registradas diretamente pelo time de conversão clicando no botão <strong className="text-primary font-semibold">Relatar Pendência</strong> no topo da aba de <strong>Pendências</strong> nesta tela.</li>
                <li><strong>Acompanhamento Centralizado:</strong> O time de conversão monitora e gerencia as pendências criadas na aba <strong>Pendências</strong> desta tela.</li>
                <li><strong>Fluxo de Resolução:</strong> Analistas podem assumir a pendência, delegá-la para outro colega ou marcá-la como resolvida fornecendo notas de solução.</li>
                <li><strong>Timeline do Cliente:</strong> O cadastro e a resolução de pendências inserem eventos automaticamente na linha do tempo geral do cliente para fins de auditoria histórica.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
