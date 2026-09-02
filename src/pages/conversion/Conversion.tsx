import { useState, useMemo } from "react";
import type { ElementType } from "react";
import { normalizeText } from "@/lib/utils";
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
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const isConversionTeam = team === "conversion";

  // Permissões do perfil (ortogonais ao gate de time acima)
  const { hasPermission } = usePermissions();
  const canEditConversion = hasPermission("conversion_home", "edit");
  const canDeleteConversion = hasPermission("conversion_home", "delete");
  const canExecuteConversion = hasPermission("conversion_home", "execute");

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
    sendToHomologation,
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
  const IMPLANTADORES_NOMES = useMemo(() => [
    "Rodrigo Brites",
    "Bruno Matos",
    "Ricardo Vieira",
    "Rodrigo Mizuno",
    "Julio Araujo",
    "Fernando Cruz"
  ], []);

  const implementationMembers = useMemo(
    () => members.filter((m) =>
      IMPLANTADORES_NOMES.some(nome => m.name.toLowerCase().trim() === nome.toLowerCase().trim())
    ),
    [members, IMPLANTADORES_NOMES],
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
    const normQuery = normalizeText(searchQuery);
    return items.filter((item) => {
      const matchesSearch =
        !normQuery ||
        normalizeText(item.clientName).includes(normQuery) ||
        normalizeText(item.ticketNumber).includes(normQuery);
      const matchesStatus =
        statusFilter === "all" || item.queueStatus === statusFilter;
      const matchesSystem =
        systemFilter === "all" || item.systemType === systemFilter;
      return matchesSearch && matchesStatus && matchesSystem;
    });
  };

  const filterKanbanItems = filterItems;
  const isKanbanColumnVisible = (...statuses: string[]) =>
    statusFilter === "all" || statuses.includes(statusFilter);
  const isSingleStatusView = statusFilter !== "all";

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
        data-testid="conversion-queue-card"
        className={cn(
          "group relative min-w-0 overflow-hidden border-l-[3px] border-border bg-card text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
          statusVisual.borderColor
        )}
      >
        <CardContent className="space-y-1.5 p-2.5">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-1">
            <h4 className="line-clamp-2 min-w-0 text-[13px] font-bold leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">
              {item.clientName}
            </h4>
            
            {/* Action Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Mais a\u00e7\u00f5es para ${item.clientName}`}
                  className="h-8 w-8 shrink-0 transition-opacity duration-200 hover:bg-muted md:h-7 md:w-7 md:opacity-60 md:group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.projectId) window.location.href = `/projects?id=${item.projectId}`;
                  }}
                >
                  <Database className="h-3.5 w-3.5 mr-1.5" />
                  Ver projeto
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!item.engineStatus && isConversionTeam && canExecuteConversion && (
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
                {isConversionTeam && canEditConversion && (
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
                {isConversionTeam && canDeleteConversion && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canDeleteConversion) return;
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
              variant="outline"
              className={cn("px-1.5 py-0 text-[9px] font-semibold", STATUS_COLORS[item.queueStatus])}
            >
              {STATUS_LABELS[item.queueStatus] || item.queueStatus}
            </Badge>
            <Badge
              className={cn(
                "text-[10px] font-bold py-0 px-1.5",
                item.priority <= 2
                  ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400"
                  : item.priority <= 4
                    ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400"
                    : "border-border bg-muted text-muted-foreground",
              )}
            >
              P{item.priority}
            </Badge>
            <span
              className={cn(
                "rounded bg-muted px-1.5 py-0 text-[9px] font-medium",
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
          <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="rounded border border-border bg-muted/50 px-1 py-0.2 font-mono text-[10px]">
              #{item.ticketNumber}
            </span>
            <span>{item.systemType}</span>
            {item.legacySystem && (
              <span className="max-w-[90px] truncate text-slate-400">
                ← {item.legacySystem}
              </span>
            )}
          </div>

          {/* Responsável / Previsão */}
          <div className="space-y-0.5 border-t border-dashed border-border/60 pt-1 text-[10px] text-muted-foreground">
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
          <div className="flex gap-1 pt-1">
            {/* Botão Assumir */}
            {!item.assignedTo && isConversionTeam && canEditConversion && (
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
            {item.queueStatus === "in_progress" && canExecuteConversion && (
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
              className="h-7 grow border-border px-2 text-[10px] hover:bg-muted"
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
    if (!canEditConversion) return;

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
    if (!canEditConversion) return;
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
    if (!canExecuteConversion) return;
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

  // Indicadores compactos: continuam abrindo o detalhamento sem dominar a tela.
  const renderKPIs = () => {
    const cards: Array<{
      title: string;
      color: string;
      value: number;
      items: ConversionQueueItem[];
      icon: ElementType;
      className: string;
      textClassName: string;
    }> = [
      {
        title: "Minha Fila",
        color: "primary",
        value: kpis.myQueueCount,
        items: myQueue,
        icon: User,
        className: "border-primary/20 bg-primary/5",
        textClassName: "text-primary",
      },
      {
        title: "Pendentes",
        color: "slate",
        value: kpis.pending,
        items: queue.filter((item) => item.queueStatus === "pending"),
        icon: Clock,
        className: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30",
        textClassName: "text-slate-700 dark:text-slate-300",
      },
      {
        title: "Em andamento",
        color: "blue",
        value: kpis.inProgress,
        items: queue.filter((item) => item.queueStatus === "in_progress"),
        icon: RefreshCw,
        className: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20",
        textClassName: "text-blue-700 dark:text-blue-400",
      },
      {
        title: "Finalizados",
        color: "green",
        value: kpis.completed,
        items: queue.filter((item) => item.queueStatus === "done"),
        icon: CheckCircle2,
        className: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20",
        textClassName: "text-emerald-700 dark:text-emerald-400",
      },
      {
        title: "Total na fila",
        color: "amber",
        value: kpis.totalInQueue,
        items: queue,
        icon: Database,
        className: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20",
        textClassName: "text-amber-700 dark:text-amber-400",
      },
    ];

    return (
      <div
        className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        data-testid="conversion-activities-kpis"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              role="button"
              tabIndex={0}
              aria-label={`Ver detalhes de ${card.title}`}
              className={cn(
                "min-w-0 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                card.className,
              )}
              onClick={() => openKpiModal(card.title, card.color, card.items)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openKpiModal(card.title, card.color, card.items);
                }
              }}
            >
              <CardContent className="flex min-w-0 items-center justify-between gap-2 p-2.5 sm:p-3">
                <div className={cn("flex min-w-0 items-center gap-1.5", card.textClassName)}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-[11px] font-medium sm:text-xs">{card.title}</span>
                </div>
                <strong className={cn("shrink-0 text-xl leading-none", card.textClassName)}>{card.value}</strong>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Configuração visual de status da fila
  const queueStatusConfig: Record<string, { icon: ElementType; bgColor: string; borderColor: string }> = {
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

  const renderHomologationItem = (item: ConversionQueueItem) => {
    const daysInQueue = Math.floor(
      (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
      <Card
        key={item.id}
        data-testid="conversion-homologation-card"
        className={cn(
          "border-l-4 border-l-indigo-500 border-border bg-card text-card-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        )}
      >
        <CardContent className="min-w-0 p-3">
          <div className="flex flex-col justify-between gap-2.5 lg:flex-row lg:items-center">
            {/* Left Column: Info & Indicators */}
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              {/* Distinctive Icon for Homologation */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 ring-1 ring-indigo-300 dark:bg-indigo-950/30 dark:ring-indigo-800">
                <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              {/* Main Info */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                    Esteira de Homologação
                  </span>
                  <h3 className="-order-1 basis-full truncate text-sm font-bold text-foreground">
                    {item.clientName}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-1.5 py-0 text-[10px] font-semibold",
                      STATUS_COLORS[item.queueStatus] || "",
                    )}
                  >
                    {STATUS_LABELS[item.queueStatus] || item.queueStatus}
                  </Badge>
                  <Badge
                    className={cn(
                      "px-1.5 py-0 text-[10px] font-bold",
                      item.priority <= 2
                        ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                        : item.priority <= 4
                          ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50"
                          : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800",
                    )}
                  >
                    P{item.priority}
                  </Badge>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {daysInQueue}d na fila
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">#{item.ticketNumber}</span>
                  <span>{item.systemType}</span>
                  {item.legacySystem && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="text-muted-foreground/50">←</span> {item.legacySystem}
                    </span>
                  )}
                </div>

                {/* Assignment Status (Converter & Implantador) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Conversor responsável */}
                  {item.assignedToName && (
                    <Badge variant="secondary" className="gap-1 border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/10 dark:text-emerald-400">
                      <UserCheck className="h-3 w-3" />
                      Conversor: {item.assignedToName}
                    </Badge>
                  )}

                  {/* Implantador responsável (Aguardando ou Vinculado) */}
                  {item.homologationAnalystName ? (
                    <Badge variant="secondary" className="gap-1 border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/10 dark:text-blue-400">
                      <User className="h-3 w-3" />
                      Implantador: {item.homologationAnalystName}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="animate-pulse gap-1 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-bold text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-400"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Fila em Aberto / Pendente
                    </Badge>
                  )}

                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 border-t border-border pt-2 lg:w-auto lg:flex-nowrap lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
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
                  className="h-8 w-full justify-center gap-1.5 bg-red-600 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-red-700 active:scale-95 sm:w-auto"
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
                  className="h-8 w-full justify-center gap-1.5 bg-emerald-600 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 active:scale-95 sm:w-auto"
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
                className="h-8 w-full justify-center gap-1.5 border-border text-[11px] transition-colors duration-200 hover:bg-muted sm:w-auto"
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
                className="h-8 w-full justify-center gap-1.5 border-border text-[11px] transition-colors duration-200 hover:bg-muted sm:w-auto"
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
    <div
      className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-background to-muted/30 md:h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] md:flex md:flex-none md:flex-col md:overflow-hidden"
      data-testid="conversion-activities-page"
      data-viewport={isMobile ? "mobile" : "desktop"}
    >
      {/* Fixed Header Area */}
      <div className="min-w-0 space-y-3 p-3 pb-0 sm:p-4 sm:pb-0 md:flex-shrink-0">
        {/* Header */}
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 sm:p-2">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">Gestão de Atividades</h1>
              <p className="truncate text-[11px] text-muted-foreground sm:text-sm">
                Fila de conversão e homologação
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Minha Fila Button - Only for conversion team */}
            {isConversionTeam && (
              <Button
                onClick={() => setActiveTab("my-queue")}
                variant={activeTab === "my-queue" ? "default" : "outline"}
                className={cn(
                  "relative h-9 w-9 justify-center gap-1.5 p-0 sm:w-auto sm:px-3",
                  activeTab === "my-queue"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "border-primary/30 text-primary hover:bg-primary/5",
                )}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Minha Fila</span>
                {myQueue.length > 0 && (
                  <span className="hidden items-center gap-1.5 sm:flex">
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
            <Button onClick={() => setHelpOpen(true)} variant="outline" size="sm" className="h-9 w-9 gap-1.5 border-primary/20 p-0 text-primary hover:bg-primary/5 sm:w-auto sm:px-3">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ajuda</span>
            </Button>
            <Button onClick={refetch} variant="outline" size="sm" className="h-9 w-9 p-0 sm:w-auto sm:px-3">
              <RefreshCw className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* KPIs */}
        {renderKPIs()}

        {/* Search and Filters */}
        <div
          className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-background/80 p-1.5 shadow-sm sm:flex-row sm:items-center sm:p-1"
          data-testid="conversion-activities-filters"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar atividades"
              placeholder="Buscar cliente ou ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-8 text-sm shadow-none sm:h-8 sm:text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filtrar atividades por status" className="h-10 w-full min-w-0 px-2 text-xs shadow-none sm:h-8 sm:w-[165px]">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
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
                <SelectItem value="homologation">{"Em homologa\u00e7\u00e3o"}</SelectItem>
                <SelectItem value="homologation_issues">{"Com inconsist\u00eancias"}</SelectItem>
              </SelectContent>
          </Select>

          <Select value={systemFilter} onValueChange={setSystemFilter}>
            <SelectTrigger aria-label="Filtrar atividades por sistema" className="h-10 w-full min-w-0 px-2 text-xs shadow-none sm:h-8 sm:w-[165px]">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
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
          {(searchQuery || statusFilter !== "all" || systemFilter !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-full shrink-0 gap-1 px-2 text-xs text-muted-foreground sm:h-8 sm:w-auto"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSystemFilter("all");
              }}
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs - with fixed trigger and scrollable content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="min-w-0 px-3 pt-1 sm:px-4 md:flex md:min-h-0 md:flex-1 md:flex-col md:overflow-hidden"
      >
        <TabsList className="mb-1 grid h-auto w-full min-w-0 grid-cols-3 gap-0.5 rounded-lg p-0.5 md:inline-flex md:w-auto md:flex-shrink-0 md:self-start">
          <TabsTrigger value="general" className="relative min-h-8 min-w-0 gap-1 px-1.5 text-[10px] sm:min-h-7 sm:px-2.5 sm:text-xs">
            <Users className="h-3.5 w-3.5" />
            Fila Geral
            {generalQueue.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1 text-[10px]">
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
          <TabsTrigger value="homologations" className="relative min-h-8 min-w-0 gap-1 px-1.5 text-[10px] sm:min-h-7 sm:px-2.5 sm:text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Homologações
            {homologationQueue.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1 text-[10px]">
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
          <TabsTrigger value="issues" className="relative min-h-8 min-w-0 gap-1 px-1.5 text-[10px] sm:min-h-7 sm:px-2.5 sm:text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            Pendências
            {activeIssuesCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Badge variant="destructive" className="ml-0.5 h-5 min-w-5 animate-pulse px-1 py-0 text-[10px]">
                  {activeIssuesCount}
                </Badge>
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Scrollable Content Area */}
        <div className="relative min-w-0 pb-[calc(1rem+env(safe-area-inset-bottom))] md:min-h-0 md:flex-1 md:overflow-hidden md:pr-1">
          {/* My Queue Tab - Detailed View */}
          <TabsContent value="my-queue" className="mt-0 min-w-0 data-[state=inactive]:hidden md:absolute md:inset-0 md:overflow-y-auto">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando...
              </div>
            ) : filterItems(myQueue).length === 0 ? (
              <Card className="border-2 border-dashed border-primary/20 bg-primary/5 p-6 text-center sm:p-12">
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
          <TabsContent value="general" className="mt-0 min-w-0 data-[state=inactive]:hidden md:absolute md:inset-0 md:overflow-y-auto xl:data-[state=active]:flex xl:flex-col xl:overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground flex-grow flex items-center justify-center min-h-[300px]">
                <div className="space-y-2">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="text-xs">Carregando quadro Kanban...</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={statusFilter}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.992, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.992, y: -6 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                }
                style={{ transformOrigin: "top center" }}
                className={cn(
                  "grid min-w-0 grid-cols-1 items-start gap-2 xl:min-h-0 xl:flex-1 xl:items-stretch",
                  isSingleStatusView
                    ? "xl:grid-cols-1"
                    : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
                )}
                data-testid="conversion-mobile-kanban"
                data-filter-transition={shouldReduceMotion ? "reduced" : "smooth"}
              >
                {/* 1. Pendentes Section */}
                <div className={cn(
                  "min-w-0 space-y-1.5",
                  isKanbanColumnVisible("pending")
                    ? "xl:flex xl:min-h-0 xl:flex-col xl:gap-1.5 xl:space-y-0"
                    : "hidden",
                )} data-testid="conversion-kanban-column-pending">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100/80 px-2 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        1. Pendentes
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-slate-55 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400">
                        {filterKanbanItems(queue.filter((i) => i.queueStatus === "pending")).length}
                      </Badge>
                    </div>
                  </div>
                  <div className={cn(
                    "grid min-w-0 grid-cols-1 content-start gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/30 p-1.5 dark:border-slate-800 dark:bg-slate-900/20 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 xl:scrollbar-thin xl:scrollbar-thumb-slate-300 dark:xl:scrollbar-thumb-slate-700",
                    isSingleStatusView && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  )} data-testid="conversion-kanban-lane">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "pending")).length === 0 ? (
                      <div className="col-span-full flex min-h-[56px] w-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/30 p-2.5 text-center text-[11px] text-muted-foreground dark:border-slate-800/50 dark:bg-slate-900/10">
                        Nenhuma demanda pendente
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "pending")).map((item) => (
                        <div key={item.id} className="min-w-0 w-full">
                          {renderKanbanCard(item)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Em Andamento Section */}
                <div className={cn(
                  "min-w-0 space-y-1.5",
                  isKanbanColumnVisible("in_progress")
                    ? "xl:flex xl:min-h-0 xl:flex-col xl:gap-1.5 xl:space-y-0"
                    : "hidden",
                )} data-testid="conversion-kanban-column-in-progress">
                  <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        2. Em Andamento
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-blue-50 text-blue-650 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400">
                        {filterKanbanItems(queue.filter((i) => i.queueStatus === "in_progress")).length}
                      </Badge>
                    </div>
                  </div>
                  <div className={cn(
                    "grid min-w-0 grid-cols-1 content-start gap-1.5 rounded-lg border border-dashed border-blue-200/70 bg-blue-50/20 p-1.5 dark:border-blue-900/50 dark:bg-blue-950/10 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 xl:scrollbar-thin xl:scrollbar-thumb-blue-300 dark:xl:scrollbar-thumb-blue-800",
                    isSingleStatusView && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  )} data-testid="conversion-kanban-lane">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "in_progress")).length === 0 ? (
                      <div className="col-span-full flex min-h-[56px] w-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/30 p-2.5 text-center text-[11px] text-muted-foreground dark:border-slate-800/50 dark:bg-slate-900/10">
                        Nenhuma conversão em andamento
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "in_progress")).map((item) => (
                        <div key={item.id} className="min-w-0 w-full">
                          {renderKanbanCard(item)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Em Homologação Section */}
                <div className={cn(
                  "min-w-0 space-y-1.5",
                  isKanbanColumnVisible("awaiting_homologation", "homologation")
                    ? "xl:flex xl:min-h-0 xl:flex-col xl:gap-1.5 xl:space-y-0"
                    : "hidden",
                )} data-testid="conversion-kanban-column-homologation">
                  <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-2 py-1.5 shadow-sm dark:border-purple-900/60 dark:bg-purple-950/30">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        3. Em Homologação
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-purple-50 text-purple-650 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400">
                        {filterKanbanItems(queue.filter((i) => i.queueStatus === "awaiting_homologation" || i.queueStatus === "homologation")).length}
                      </Badge>
                    </div>
                  </div>
                  <div className={cn(
                    "grid min-w-0 grid-cols-1 content-start gap-1.5 rounded-lg border border-dashed border-purple-200/70 bg-purple-50/20 p-1.5 dark:border-purple-900/50 dark:bg-purple-950/10 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 xl:scrollbar-thin xl:scrollbar-thumb-purple-300 dark:xl:scrollbar-thumb-purple-800",
                    isSingleStatusView && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  )} data-testid="conversion-kanban-lane">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "awaiting_homologation" || i.queueStatus === "homologation")).length === 0 ? (
                      <div className="col-span-full flex min-h-[56px] w-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/30 p-2.5 text-center text-[11px] text-muted-foreground dark:border-slate-800/50 dark:bg-slate-900/10">
                        Nenhum projeto em homologação
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "awaiting_homologation" || i.queueStatus === "homologation")).map((item) => (
                        <div key={item.id} className="min-w-0 w-full">
                          {renderKanbanCard(item)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Com Inconsistências Section */}
                <div className={cn(
                  "min-w-0 space-y-1.5",
                  isKanbanColumnVisible("homologation_issues")
                    ? "xl:flex xl:min-h-0 xl:flex-col xl:gap-1.5 xl:space-y-0"
                    : "hidden",
                )} data-testid="conversion-kanban-column-issues">
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        4. Com Inconsistências
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-red-50 text-red-655 border-red-205 dark:bg-red-950/20 dark:text-red-400">
                        {filterKanbanItems(queue.filter((i) => i.queueStatus === "homologation_issues")).length}
                      </Badge>
                    </div>
                  </div>
                  <div className={cn(
                    "grid min-w-0 grid-cols-1 content-start gap-1.5 rounded-lg border border-dashed border-red-200/70 bg-red-50/20 p-1.5 dark:border-red-900/50 dark:bg-red-950/10 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 xl:scrollbar-thin xl:scrollbar-thumb-red-300 dark:xl:scrollbar-thumb-red-800",
                    isSingleStatusView && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  )} data-testid="conversion-kanban-lane">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "homologation_issues")).length === 0 ? (
                      <div className="col-span-full flex min-h-[56px] w-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/30 p-2.5 text-center text-[11px] text-muted-foreground dark:border-slate-800/50 dark:bg-slate-900/10">
                        Nenhum projeto com inconsistências
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "homologation_issues")).map((item) => (
                        <div key={item.id} className="min-w-0 w-full">
                          {renderKanbanCard(item)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 5. Concluídos Section */}
                <div className={cn(
                  "min-w-0 space-y-1.5",
                  isKanbanColumnVisible("done")
                    ? "xl:flex xl:min-h-0 xl:flex-col xl:gap-1.5 xl:space-y-0"
                    : "hidden",
                )} data-testid="conversion-kanban-column-done">
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        5. Concluídos
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-emerald-50 text-emerald-650 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400">
                        {filterKanbanItems(queue.filter((i) => i.queueStatus === "done")).length}
                      </Badge>
                    </div>
                  </div>
                  <div className={cn(
                    "grid min-w-0 grid-cols-1 content-start gap-1.5 rounded-lg border border-dashed border-emerald-200/70 bg-emerald-50/20 p-1.5 dark:border-emerald-900/50 dark:bg-emerald-950/10 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 xl:scrollbar-thin xl:scrollbar-thumb-emerald-300 dark:xl:scrollbar-thumb-emerald-800",
                    isSingleStatusView && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  )} data-testid="conversion-kanban-lane">
                    {filterKanbanItems(queue.filter((i) => i.queueStatus === "done")).length === 0 ? (
                      <div className="col-span-full flex min-h-[56px] w-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/30 p-2.5 text-center text-[11px] text-muted-foreground dark:border-slate-800/50 dark:bg-slate-900/10">
                        Nenhuma conversão finalizada
                      </div>
                    ) : (
                      filterKanbanItems(queue.filter((i) => i.queueStatus === "done")).map((item) => (
                        <div key={item.id} className="min-w-0 w-full">
                          {renderKanbanCard(item)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Homologations Queue Tab */}
          <TabsContent value="homologations" className="mt-0 min-w-0 data-[state=inactive]:hidden md:absolute md:inset-0 md:overflow-y-auto" data-testid="conversion-homologations-panel">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando...
              </div>
            ) : filterItems(homologationQueue).length === 0 ? (
              <Card className="border border-dashed border-slate-200 bg-slate-50/20 p-6 text-center dark:border-slate-800 dark:bg-slate-900/10 sm:p-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma homologação na fila
                </h3>
                <p className="text-muted-foreground">
                  Não há homologações ativas ou concluídas registradas
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filterItems(homologationQueue).map((item) =>
                  renderHomologationItem(item),
                )}
              </div>
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="mt-0 min-w-0 data-[state=inactive]:hidden md:absolute md:inset-0 md:overflow-y-auto" data-testid="conversion-issues-panel">
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
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-lg overflow-y-auto">
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
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {transferDialog.item && canDeleteConversion && (
              <Button
                variant="ghost"
                className="w-full whitespace-normal text-red-550 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-900/20 sm:w-auto font-semibold"
                onClick={() => {
                  if (!canDeleteConversion) return;
                  const isAssigned = !!transferDialog.item?.assignedTo;
                  const confirmMsg = isAssigned
                    ? `Deseja desassumir "${transferDialog.item?.clientName}" e devolvê-lo para a fila de Pendentes?`
                    : `Tem certeza que deseja remover "${transferDialog.item?.clientName}" da fila?`;
                  if (confirm(confirmMsg)) {
                    removeFromQueue(
                      transferDialog.item.id,
                      transferDialog.item.projectId,
                    );
                    setTransferDialog({ open: false });
                  }
                }}
              >
                {transferDialog.item?.assignedTo ? "Devolver para Pendentes" : "Remover da Fila"}
              </Button>
            )}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setTransferDialog({ open: false })}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={!selectedNewOwner || !canEditConversion}
              >
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
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-lg overflow-y-auto">
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
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setHomologationDialog({ open: false });
                setSelectedImplantador("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendToHomologation}
              disabled={!canExecuteConversion}
              className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
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
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-lg overflow-y-auto">
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
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setEngineDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!canExecuteConversion) return;
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
              disabled={!canExecuteConversion}
              className="w-full bg-orange-600 hover:bg-orange-700 sm:w-auto"
            >
              <Cog className="h-4 w-4 mr-2" />
              Enviar para Criação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Detail Dialog */}
      <Dialog open={kpiModal.open} onOpenChange={(open) => !open && setKpiModal((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-2xl overflow-hidden p-4 sm:p-6 flex flex-col" data-testid="conversion-kpi-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{kpiModal.title}</span>
              <Badge variant="secondary">{kpiModal.items.length}</Badge>
            </DialogTitle>
            <DialogDescription>
              Projetos incluídos neste indicador
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 min-w-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
                    className="flex min-w-0 flex-col gap-2 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="break-words text-sm font-semibold sm:truncate">{item.clientName}</p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">#{item.ticketNumber}</span>
                        <span className="text-[10px] text-muted-foreground">{item.systemType}</span>
                      </div>
                      {item.assignedToName && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ✓ {item.assignedToName}
                        </p>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
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
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-2xl overflow-y-auto p-4 sm:p-6">
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
