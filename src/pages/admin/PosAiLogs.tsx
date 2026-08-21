import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Bot,
  User,
  Search,
  RefreshCw,
  Download,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Coins,
  MessageSquare,
  Building2,
  Sparkles,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Gauge,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  DollarSign,
  Layers,
  MessageCircle,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Eye,
  UsersRound,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  usePosAiAdminAnalytics,
  useActivePosAiProjectsList,
  PosAiAdminLogItem,
  PosAiFeedbackItem,
  PosAiLatencyRankItem,
} from "@/hooks/usePosAiAdminAnalytics";
import { usePosAiVisitorAnalytics } from "@/hooks/usePosAiVisitorAnalytics";
import { PosAiVisitorAnalytics } from "@/components/Admin/PosAiVisitorAnalytics";
import { PosChatMessageContent } from "@/components/pos-chat/PosChatMessageContent";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "0", label: "Todo o histórico" },
];

const FEEDBACK_COLORS = {
  helpful: "hsl(142, 76%, 36%)",
  unhelpful: "hsl(346, 84%, 45%)",
  none: "hsl(215, 16%, 47%)",
};

const LIBRARY_PAGE_SIZE = 10;

interface MessagePair {
  id: string;
  project_id: string;
  client_name: string;
  system_type: string;
  session_id: string;
  user_message?: PosAiAdminLogItem;
  assistant_message?: PosAiAdminLogItem;
  created_at: string;
  feedback?: "helpful" | "unhelpful" | null;
  feedback_comment?: string | null;
  latency_ms?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
}

export default function PosAiLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get("projectId");

  const [selectedProject, setSelectedProject] = useState<string>(urlProjectId || "all");
  const [days, setDays] = useState<string>("30");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [libraryMode, setLibraryMode] = useState<"pairs" | "assistant" | "user" | "all">("pairs");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [feedbackFilter, setFeedbackFilter] = useState<string>("all");
  const [visitorFilter, setVisitorFilter] = useState<string>("all");
  const [libraryPage, setLibraryPage] = useState(1);
  const [expandedPairIds, setExpandedPairIds] = useState<Set<string>>(() => new Set());
  const [inspectingLog, setInspectingLog] = useState<
    PosAiAdminLogItem | PosAiFeedbackItem | PosAiLatencyRankItem | MessagePair | null
  >(null);

  // Sync selectedProject when URL searchParams change
  useEffect(() => {
    if (urlProjectId) {
      setSelectedProject(urlProjectId);
    } else {
      setSelectedProject("all");
    }
  }, [urlProjectId]);

  const projectIdParam = selectedProject === "all" ? null : selectedProject;

  const { data, isLoading, refetch, isRefetching } = usePosAiAdminAnalytics(
    projectIdParam,
    Number(days)
  );
  const {
    data: visitorAnalytics,
    isLoading: isVisitorAnalyticsLoading,
    refetch: refetchVisitorAnalytics,
    isRefetching: isVisitorAnalyticsRefetching,
  } = usePosAiVisitorAnalytics(projectIdParam, Number(days));

  const { data: activeProjects } = useActivePosAiProjectsList();

  // Synchronize URL param
  const handleProjectChange = (val: string) => {
    setSelectedProject(val);
    if (val === "all") {
      searchParams.delete("projectId");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ projectId: val });
    }
  };

  const handleClearProjectFilter = () => {
    handleProjectChange("all");
  };

  const kpis = data?.kpis;
  const timeline = data?.timeline || [];
  const projectsActivityList = data?.by_project || [];
  const hourlyData = data?.hourly_distribution || [];
  const logs = data?.logs || [];
  const slowestResponses = data?.slowest_responses || [];
  const fastestResponses = data?.fastest_responses || [];
  const helpfulResponses = data?.helpful_responses || [];
  const unhelpfulResponses = data?.unhelpful_responses || [];
  const latencyDist = data?.latency_distribution || { fast_count: 0, moderate_count: 0, slow_count: 0 };

  // Current selected project info
  const selectedProjectInfo = useMemo(() => {
    if (selectedProject === "all") return null;
    return (
      activeProjects?.find((p) => p.id === selectedProject) ||
      projectsActivityList.find((p) => p.project_id === selectedProject)
    );
  }, [selectedProject, activeProjects, projectsActivityList]);

  // Combined project options for dropdown (only activated projects)
  const dropdownProjects = useMemo(() => {
    const list = activeProjects || [];
    return list
      .map((p) => ({
        id: p.id,
        name: p.client_name,
        msgCount:
          projectsActivityList.find((act) => act.project_id === p.id)?.messages_count || 0,
      }))
      .sort(
        (a, b) =>
          (b.msgCount || 0) - (a.msgCount || 0) || a.name.localeCompare(b.name)
      );
  }, [activeProjects, projectsActivityList]);

  const libraryVisitorOptions = useMemo(() => {
    const activeVisitorIds = new Set(
      logs.map((log) => log.visitor_id).filter((id): id is string => Boolean(id)),
    );

    return (visitorAnalytics?.by_user || [])
      .filter((visitor) => activeVisitorIds.has(visitor.visitor_id))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [logs, visitorAnalytics?.by_user]);

  const hasUnidentifiedLibraryLogs = useMemo(
    () => logs.some((log) => !log.visitor_id),
    [logs],
  );

  useEffect(() => {
    if (
      visitorFilter !== "all" &&
      visitorFilter !== "unidentified" &&
      !libraryVisitorOptions.some((visitor) => visitor.visitor_id === visitorFilter)
    ) {
      setVisitorFilter("all");
    }
  }, [libraryVisitorOptions, visitorFilter]);

  // Group logs into Dialog Pairs (User Question ➡️ Assistant Reply)
  const messagePairs = useMemo(() => {
    const pairs: MessagePair[] = [];
    const logsChronological = [...logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const sessionMap = new Map<string, PosAiAdminLogItem[]>();
    logsChronological.forEach((l) => {
      if (!sessionMap.has(l.session_id)) {
        sessionMap.set(l.session_id, []);
      }
      sessionMap.get(l.session_id)!.push(l);
    });

    sessionMap.forEach((sessionLogs) => {
      let pendingUser: PosAiAdminLogItem | undefined = undefined;

      sessionLogs.forEach((item) => {
        if (item.role === "user") {
          if (pendingUser) {
            // Unanswered previous question
            pairs.push({
              id: pendingUser.id,
              project_id: pendingUser.project_id,
              client_name: pendingUser.client_name,
              system_type: pendingUser.system_type,
              session_id: pendingUser.session_id,
              user_message: pendingUser,
              created_at: pendingUser.created_at,
            });
          }
          pendingUser = item;
        } else if (item.role === "assistant") {
          pairs.push({
            id: item.id,
            project_id: item.project_id,
            client_name: item.client_name,
            system_type: item.system_type,
            session_id: item.session_id,
            user_message: pendingUser,
            assistant_message: item,
            created_at: item.created_at,
            feedback: item.feedback,
            feedback_comment: item.feedback_comment,
            latency_ms: item.latency_ms,
            total_tokens: item.total_tokens,
            estimated_cost_usd: item.estimated_cost_usd,
          });
          pendingUser = undefined;
        }
      });

      if (pendingUser) {
        pairs.push({
          id: (pendingUser as PosAiAdminLogItem).id,
          project_id: (pendingUser as PosAiAdminLogItem).project_id,
          client_name: (pendingUser as PosAiAdminLogItem).client_name,
          system_type: (pendingUser as PosAiAdminLogItem).system_type,
          session_id: (pendingUser as PosAiAdminLogItem).session_id,
          user_message: pendingUser,
          created_at: (pendingUser as PosAiAdminLogItem).created_at,
        });
      }
    });

    return pairs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [logs]);

  // Filtered pairs for the Library
  const filteredPairs = useMemo(() => {
    return messagePairs.filter((pair) => {
      const pairVisitorId =
        pair.user_message?.visitor_id ?? pair.assistant_message?.visitor_id ?? null;

      if (visitorFilter === "unidentified" && pairVisitorId) return false;
      if (
        visitorFilter !== "all" &&
        visitorFilter !== "unidentified" &&
        pairVisitorId !== visitorFilter
      ) {
        return false;
      }

      // Feedback filter
      if (feedbackFilter === "helpful" && pair.feedback !== "helpful") return false;
      if (feedbackFilter === "unhelpful" && pair.feedback !== "unhelpful") return false;
      if (feedbackFilter === "with_comment" && !pair.feedback_comment) return false;

      // Text search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesClient = pair.client_name?.toLowerCase().includes(term);
        const matchesUser = pair.user_message?.content?.toLowerCase().includes(term);
        const matchesAssistant = pair.assistant_message?.content?.toLowerCase().includes(term);
        const matchesSession = pair.session_id?.toLowerCase().includes(term);
        if (!matchesClient && !matchesUser && !matchesAssistant && !matchesSession) {
          return false;
        }
      }

      return true;
    });
  }, [messagePairs, feedbackFilter, searchTerm, visitorFilter]);

  // Filter raw logs for table view
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (libraryMode === "assistant" && log.role !== "assistant") return false;
      if (libraryMode === "user" && log.role !== "user") return false;

      if (visitorFilter === "unidentified" && log.visitor_id) return false;
      if (
        visitorFilter !== "all" &&
        visitorFilter !== "unidentified" &&
        log.visitor_id !== visitorFilter
      ) {
        return false;
      }

      if (feedbackFilter === "helpful" && log.feedback !== "helpful") return false;
      if (feedbackFilter === "unhelpful" && log.feedback !== "unhelpful") return false;
      if (feedbackFilter === "with_comment" && !log.feedback_comment) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesClient = log.client_name?.toLowerCase().includes(term);
        const matchesContent = log.content?.toLowerCase().includes(term);
        const matchesSession = log.session_id?.toLowerCase().includes(term);
        if (!matchesClient && !matchesContent && !matchesSession) {
          return false;
        }
      }

      return true;
    });
  }, [logs, libraryMode, feedbackFilter, searchTerm, visitorFilter]);

  const libraryTotalItems =
    libraryMode === "pairs" ? filteredPairs.length : filteredLogs.length;
  const libraryTotalPages = Math.max(
    1,
    Math.ceil(libraryTotalItems / LIBRARY_PAGE_SIZE),
  );

  const paginatedPairs = useMemo(() => {
    const start = (libraryPage - 1) * LIBRARY_PAGE_SIZE;
    return filteredPairs.slice(start, start + LIBRARY_PAGE_SIZE);
  }, [filteredPairs, libraryPage]);

  const paginatedLogs = useMemo(() => {
    const start = (libraryPage - 1) * LIBRARY_PAGE_SIZE;
    return filteredLogs.slice(start, start + LIBRARY_PAGE_SIZE);
  }, [filteredLogs, libraryPage]);

  useEffect(() => {
    setLibraryPage(1);
    setExpandedPairIds(new Set());
  }, [days, feedbackFilter, libraryMode, searchTerm, selectedProject, visitorFilter]);

  useEffect(() => {
    if (libraryPage > libraryTotalPages) {
      setLibraryPage(libraryTotalPages);
      setExpandedPairIds(new Set());
    }
  }, [libraryPage, libraryTotalPages]);

  const togglePair = (pairId: string) => {
    setExpandedPairIds((current) => {
      const next = new Set(current);
      if (next.has(pairId)) next.delete(pairId);
      else next.add(pairId);
      return next;
    });
  };

  const changeLibraryPage = (nextPage: number) => {
    setLibraryPage(Math.min(Math.max(nextPage, 1), libraryTotalPages));
    setExpandedPairIds(new Set());
  };

  const libraryPagination =
    libraryTotalPages > 1 ? (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground">
        <span>
          {(libraryPage - 1) * LIBRARY_PAGE_SIZE + 1}–
          {Math.min(libraryPage * LIBRARY_PAGE_SIZE, libraryTotalItems)} de {libraryTotalItems}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={libraryPage === 1}
            onClick={() => changeLibraryPage(libraryPage - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-20 text-center font-medium text-foreground">
            Página {libraryPage} de {libraryTotalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={libraryPage === libraryTotalPages}
            onClick={() => changeLibraryPage(libraryPage + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    ) : null;

  // Export CSV
  const handleExportCsv = () => {
    if (!logs.length) return;

    const headers = [
      "ID",
      "Data/Hora",
      "Cartorio",
      "Sistema",
      "Sessao",
      "Papel",
      "Tokens_Entrada",
      "Tokens_Saida",
      "Tokens_Total",
      "Tokens_Raciocinio",
      "Latencia_ms",
      "Custo_Estimado_USD",
      "Modelo",
      "Avaliacao",
      "Comentario_Cliente",
      "Mensagem",
    ];

    const csvRows = logs.map((log) => [
      log.id,
      log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : "",
      `"${(log.client_name || "").replace(/"/g, '""')}"`,
      `"${(log.system_type || "").replace(/"/g, '""')}"`,
      log.session_id,
      log.role,
      log.input_tokens || 0,
      log.output_tokens || 0,
      log.total_tokens || 0,
      log.reasoning_tokens || 0,
      log.latency_ms || 0,
      log.estimated_cost_usd ? `$${log.estimated_cost_usd.toFixed(4)}` : "$0.0000",
      log.model || "gpt-5-nano",
      log.feedback || "sem_avaliacao",
      `"${(log.feedback_comment || "").replace(/"/g, '""')}"`,
      `"${(log.content || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `pos-ai-logs-${selectedProject}-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pie chart data for feedback
  const feedbackPieData = useMemo(() => {
    if (!kpis) return [];
    const helpful = kpis.helpful_count || 0;
    const unhelpful = kpis.unhelpful_count || 0;
    const none = Math.max(0, kpis.assistant_messages - helpful - unhelpful);
    return [
      { name: "Útil (👍)", value: helpful, color: FEEDBACK_COLORS.helpful },
      { name: "Não ajudou (👎)", value: unhelpful, color: FEEDBACK_COLORS.unhelpful },
      { name: "Sem avaliação", value: none, color: FEEDBACK_COLORS.none },
    ].filter((item) => item.value > 0);
  }, [kpis]);

  // Project Cost Ranking Data
  const projectCostData = useMemo(() => {
    return projectsActivityList
      .map((p) => ({
        name: p.client_name.length > 22 ? p.client_name.substring(0, 22) + "..." : p.client_name,
        fullName: p.client_name,
        cost: p.estimated_cost_usd || 0,
        messages: p.messages_count,
        tokens: p.total_tokens,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 6);
  }, [projectsActivityList]);

  // Latency bar data
  const latencyBarData = useMemo(() => {
    return [
      { name: "Rápida (< 5s)", count: latencyDist.fast_count, fill: "hsl(142, 76%, 36%)" },
      { name: "Normal (5s - 10s)", count: latencyDist.moderate_count, fill: "hsl(217, 91%, 60%)" },
      { name: "Demorada (> 10s)", count: latencyDist.slow_count, fill: "hsl(346, 84%, 45%)" },
    ];
  }, [latencyDist]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-3 font-sans sm:p-4 lg:p-5">
      {/* Header */}
      <div className="grid gap-3 border-b pb-3 xl:grid-cols-[minmax(340px,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-600/10 text-rose-600 shadow-xs dark:bg-rose-900/30 dark:text-rose-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Logs & Analytics do Assistente IA
                </h1>
                <Badge variant="outline" className="shrink-0 border-rose-200 bg-rose-500/10 px-1.5 py-0 text-[9px] font-semibold text-rose-600 dark:border-rose-800">
                  Orion TN · GPT-5-nano
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Auditoria de conversas, custos em USD ($), telemetria de tokens e satisfação dos clientes
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 sm:flex sm:flex-wrap xl:flex-nowrap xl:justify-end">
          {/* Project Filter (Activated Only) */}
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="col-span-3 h-8 w-full text-xs sm:w-[250px]">
              <Building2 className="h-3.5 w-3.5 mr-1.5 text-rose-600 shrink-0" />
              <SelectValue placeholder="Selecione o Cartório" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all" className="font-semibold">
                Todos os Cartórios Ativados ({dropdownProjects.length})
              </SelectItem>
              {dropdownProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.msgCount ? `(${p.msgCount} msgs)` : "(Ativado)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period Filter */}
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-[145px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void Promise.all([refetch(), refetchVisitorAnalytics()])}
            title="Atualizar métricas"
            disabled={
              isLoading ||
              isRefetching ||
              isVisitorAnalyticsLoading ||
              isVisitorAnalyticsRefetching
            }
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isRefetching || isVisitorAnalyticsRefetching ? "animate-spin" : ""
              }`}
            />
            <span className="sr-only">Atualizar métricas</span>
          </Button>

          {/* Export CSV */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleExportCsv}
            disabled={!logs.length}
            title="Exportar CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Selected Project Banner */}
      {selectedProject !== "all" && selectedProjectInfo && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/60 animate-in fade-in-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 rounded-lg bg-rose-600 text-white items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                Filtrando métricas de: {selectedProjectInfo.client_name || (selectedProjectInfo as any).name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Exibindo apenas custos e interações deste cartório.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearProjectFilter}
            className="h-7 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 gap-1 shrink-0"
          >
            <X className="h-3 w-3" />
            Ver todos os cartórios
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
          <p className="text-sm font-medium">Carregando telemetria e métricas analíticas...</p>
        </div>
      ) : (
        <>
          {/* Interactive KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Cost in USD ($) */}
            <Card
              className="cursor-pointer hover:border-emerald-500 transition-all hover:shadow-xs border-emerald-200/80 dark:border-emerald-950/60 bg-emerald-50/15 dark:bg-emerald-950/10"
              onClick={() => setActiveTab("overview")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Custo Total ($ USD)</span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  ${kpis?.estimated_cost_usd ? kpis.estimated_cost_usd.toFixed(4) : "0.0000"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Média: ${kpis?.avg_cost_per_answer_usd ? kpis.avg_cost_per_answer_usd.toFixed(4) : "0.0000"}/resp
                </p>
              </CardContent>
            </Card>

            {/* Total Messages */}
            <Card
              className="cursor-pointer hover:border-blue-400 transition-all hover:shadow-xs"
              onClick={() => setActiveTab("library")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Total Mensagens</span>
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{kpis?.total_messages || 0}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {kpis?.user_messages || 0} perguntas · {kpis?.assistant_messages || 0} respostas
                </p>
              </CardContent>
            </Card>

            {/* Total Tokens */}
            <Card
              className="cursor-pointer hover:border-amber-400 transition-all hover:shadow-xs"
              onClick={() => setActiveTab("library")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Tokens Utilizados</span>
                  <Coins className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold font-mono">
                  {kpis?.total_tokens ? (kpis.total_tokens / 1000).toFixed(1) + "k" : "0"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  In: {kpis?.input_tokens ? (kpis.input_tokens / 1000).toFixed(1) + "k" : "0"} · Out:{" "}
                  {kpis?.output_tokens ? (kpis.output_tokens / 1000).toFixed(1) + "k" : "0"}
                </p>
              </CardContent>
            </Card>

            {/* Reasoning Tokens */}
            <Card
              className="cursor-pointer hover:border-indigo-400 transition-all hover:shadow-xs"
              onClick={() => setActiveTab("latency")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Tokens Raciocínio</span>
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold font-mono">
                  {kpis?.reasoning_tokens ? (kpis.reasoning_tokens / 1000).toFixed(1) + "k" : "0"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Reasoning effort low
                </p>
              </CardContent>
            </Card>

            {/* Avg Latency */}
            <Card
              className="cursor-pointer hover:border-emerald-400 transition-all hover:shadow-xs"
              onClick={() => setActiveTab("latency")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Latência Média</span>
                  <Clock className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono">
                  {kpis?.avg_latency_ms
                    ? (kpis.avg_latency_ms / 1000).toFixed(1) + "s"
                    : "0s"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Min: {kpis?.min_latency_ms ? (kpis.min_latency_ms / 1000).toFixed(1) + "s" : "0s"} ·
                  Max: {kpis?.max_latency_ms ? (kpis.max_latency_ms / 1000).toFixed(1) + "s" : "0s"}
                </p>
              </CardContent>
            </Card>

            {/* Satisfaction Rate */}
            <Card
              className="cursor-pointer hover:border-rose-400 transition-all hover:shadow-xs"
              onClick={() => setActiveTab("feedbacks")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Satisfação (% Útil)</span>
                  <ThumbsUp className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-2xl font-bold">
                  {kpis?.satisfaction_rate !== null && kpis?.satisfaction_rate !== undefined
                    ? `${kpis.satisfaction_rate}%`
                    : "N/A"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  👍 {kpis?.helpful_count || 0} · 👎 {kpis?.unhelpful_count || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
              <TabsTrigger value="overview" className="text-xs gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                Visão Geral & Gráficos
              </TabsTrigger>
              <TabsTrigger value="library" className="text-xs gap-1.5">
                <Layers className="h-3.5 w-3.5 text-rose-600" />
                Biblioteca de Registro ({messagePairs.length})
              </TabsTrigger>
              <TabsTrigger value="feedbacks" className="text-xs gap-1.5">
                <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                Avaliações dos Clientes ({kpis?.total_feedbacks || 0})
              </TabsTrigger>
              <TabsTrigger value="latency" className="text-xs gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Performance & Latência
              </TabsTrigger>
              <TabsTrigger value="visitors" className="text-xs gap-1.5">
                <UsersRound className="h-3.5 w-3.5 text-violet-600" />
                Usuários & Setores ({visitorAnalytics?.kpis.active_users || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visitors" className="space-y-4">
              <PosAiVisitorAnalytics
                data={visitorAnalytics}
                isLoading={isVisitorAnalyticsLoading}
                showProject={selectedProject === "all"}
              />
            </TabsContent>

            {/* TAB 1: VISÃO GERAL & GRÁFICOS */}
            <TabsContent value="overview" className="space-y-4">
              {/* Row 1: Timeline Messages + Cost ($ USD) & Feedback Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Evolution: Messages & Cost in USD */}
                <Card className="lg:col-span-2">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Evolução Diária de Atividade & Custo ($ USD)</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        GPT-5-nano + File Search
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Volume diário de perguntas respondidas e custo financeiro estimado em dólares
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-5 pb-4">
                    {timeline.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                        Sem dados no período selecionado
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={timeline} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(val) => {
                                try {
                                  const parts = val.split("-");
                                  return `${parts[2]}/${parts[1]}`;
                                } catch {
                                  return val;
                                }
                              }}
                              fontSize={11}
                            />
                            <YAxis yAxisId="left" fontSize={11} allowDecimals={false} />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              fontSize={11}
                              tickFormatter={(val) => `$${Number(val).toFixed(3)}`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                              formatter={(value: any, name: string) => {
                                if (name === "Custo ($ USD)") return [`$${Number(value).toFixed(4)}`, name];
                                return [`${value} mensagens`, name];
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                            <Bar
                              yAxisId="left"
                              dataKey="messages_count"
                              name="Mensagens"
                              fill="hsl(346, 84%, 45%)"
                              radius={[4, 4, 0, 0]}
                              barSize={22}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="estimated_cost_usd"
                              name="Custo ($ USD)"
                              stroke="hsl(142, 76%, 36%)"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: "hsl(142, 76%, 36%)" }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Feedback Donut Chart */}
                <Card>
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-sm font-semibold">
                      Satisfação dos Clientes
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Distribuição de avaliações das respostas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {feedbackPieData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                        Sem avaliações registradas ainda
                      </div>
                    ) : (
                      <div className="h-64 w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={feedbackPieData}
                              innerRadius={48}
                              outerRadius={72}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {feedbackPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-3 text-[11px] mt-2">
                          {feedbackPieData.map((item) => (
                            <div key={item.name} className="flex items-center gap-1">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>
                                {item.name}: <strong>{item.value}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Tokens Breakdown & Cost by Project */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tokens Breakdown by Category */}
                <Card>
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-sm font-semibold">
                      Composição de Tokens por Categoria
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Distribuição diária entre Entrada (Prompt), Saída (Resposta) e Raciocínio (Reasoning)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-5 pb-4">
                    {timeline.length === 0 ? (
                      <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                        Sem dados de tokens no período
                      </div>
                    ) : (
                      <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timeline} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(val) => {
                                try {
                                  const parts = val.split("-");
                                  return `${parts[2]}/${parts[1]}`;
                                } catch {
                                  return val;
                                }
                              }}
                              fontSize={11}
                            />
                            <YAxis fontSize={11} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                              formatter={(value: any, name: string) => [
                                `${Number(value).toLocaleString("pt-BR")} tokens`,
                                name,
                              ]}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                            <Bar
                              dataKey="input_tokens"
                              name="Entrada (Prompt + Doc)"
                              fill="hsl(217, 91%, 60%)"
                              stackId="a"
                              barSize={20}
                            />
                            <Bar
                              dataKey="output_tokens"
                              name="Saída (Resposta)"
                              fill="hsl(346, 84%, 45%)"
                              stackId="a"
                              barSize={20}
                            />
                            <Bar
                              dataKey="reasoning_tokens"
                              name="Raciocínio (Reasoning)"
                              fill="hsl(271, 91%, 65%)"
                              stackId="a"
                              radius={[4, 4, 0, 0]}
                              barSize={20}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost ($ USD) by Cartório */}
                <Card>
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-sm font-semibold">
                      Consumo e Custo ($ USD) por Cartório
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Investimento estimado nos principais cartórios que utilizaram o assistente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-5 pb-4">
                    {projectCostData.length === 0 ? (
                      <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                        Sem dados de projetos no período
                      </div>
                    ) : (
                      <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={projectCostData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                            <XAxis
                              type="number"
                              fontSize={11}
                              tickFormatter={(val) => `$${val.toFixed(3)}`}
                            />
                            <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                              formatter={(val: any, name: string, item: any) => [
                                `$${Number(val).toFixed(4)} USD (${item.payload.messages} msgs)`,
                                "Custo Estimado",
                              ]}
                            />
                            <Bar dataKey="cost" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} barSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Hourly Distribution (Picos de Atendimento) */}
              {hourlyData.length > 0 && (
                <Card>
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Picos de Atendimento (Distribuição por Horário do Dia)</span>
                      <Badge variant="outline" className="text-[10px]">
                        Horário de Brasília
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Horários em que os clientes mais enviam dúvidas operacionais durante o expediente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-5 pb-4">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis dataKey="hour_label" fontSize={11} />
                          <YAxis fontSize={11} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                            formatter={(val: any) => [`${val} perguntas`, "Volume"]}
                          />
                          <Bar
                            dataKey="questions_count"
                            name="Perguntas"
                            fill="hsl(217, 91%, 60%)"
                            radius={[4, 4, 0, 0]}
                            barSize={20}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 2: BIBLIOTECA DE REGISTRO DE MENSAGENS */}
            <TabsContent value="library" className="space-y-4">
              <Card>
                <CardHeader className="border-b px-4 py-3">
                  <div className="grid gap-2.5 xl:grid-cols-[minmax(300px,1fr)_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CardTitle className="text-sm font-semibold">
                          Biblioteca de Registro de Mensagens
                        </CardTitle>
                        <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                          {libraryMode === "pairs"
                            ? `${filteredPairs.length} interações completas`
                            : `${filteredLogs.length} registros`}
                        </Badge>
                      </div>
                      <CardDescription className="mt-0.5 text-[11px] leading-4">
                        Turnos de diálogo com custo, latência e avaliações por interação.
                      </CardDescription>
                    </div>

                    {/* View Modes & Filters */}
                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center xl:flex-nowrap xl:justify-end">
                      {/* Search Input */}
                      <div className="relative col-span-2 w-full sm:w-52 xl:w-56">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          aria-label="Buscar na biblioteca de registros"
                          placeholder="Buscar por dúvida, resposta..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-8 pl-8 text-xs"
                        />
                      </div>

                      {/* Mode Selector */}
                      <div className="col-span-2 flex rounded-lg border bg-muted/40 p-0.5 sm:col-span-1">
                        <button
                          type="button"
                          onClick={() => setLibraryMode("pairs")}
                          className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors ${
                            libraryMode === "pairs"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <MessageCircle className="h-3 w-3" />
                          Diálogos
                        </button>
                        <button
                          type="button"
                          onClick={() => setLibraryMode("assistant")}
                          className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors ${
                            libraryMode === "assistant"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Bot className="h-3 w-3" />
                          Respostas IA
                        </button>
                        <button
                          type="button"
                          onClick={() => setLibraryMode("user")}
                          className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors ${
                            libraryMode === "user"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <User className="h-3 w-3" />
                          Dúvidas
                        </button>
                      </div>

                      {/* Feedback filter */}
                      <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                        <SelectTrigger aria-label="Filtrar por avaliação" className="h-8 w-full text-xs sm:w-[125px]">
                          <SelectValue placeholder="Avaliação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas avaliações</SelectItem>
                          <SelectItem value="helpful">Apenas Útil</SelectItem>
                          <SelectItem value="unhelpful">Não Ajudou</SelectItem>
                          <SelectItem value="with_comment">Com Comentário</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Visitor filter */}
                      <Select value={visitorFilter} onValueChange={setVisitorFilter}>
                        <SelectTrigger
                          aria-label="Filtrar por usuário"
                          className="h-8 w-full text-xs sm:w-44"
                        >
                          <User className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <SelectValue placeholder="Usuário" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[340px]">
                          <SelectItem value="all">Todos os usuários</SelectItem>
                          {libraryVisitorOptions.map((visitor) => (
                            <SelectItem key={visitor.visitor_id} value={visitor.visitor_id}>
                              {visitor.name} · {visitor.sector}
                              {selectedProject === "all" ? ` · ${visitor.client_name}` : ""}
                            </SelectItem>
                          ))}
                          {hasUnidentifiedLibraryLogs && (
                            <SelectItem value="unidentified">Não identificado</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {/* MODE 1: PAIRED VIEW (Question ➡️ Answer) */}
                  {libraryMode === "pairs" && (
                    <div className="space-y-4">
                      {filteredPairs.length === 0 ? (
                        <div className="py-16 text-center text-xs text-muted-foreground">
                          Nenhum diálogo encontrado com os filtros aplicados.
                        </div>
                      ) : (
                        paginatedPairs.map((pair) => {
                          const isExpanded = expandedPairIds.has(pair.id);

                          return (
                          <div
                            key={pair.id}
                            className="overflow-hidden rounded-xl border bg-card/70 px-4 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-neutral-700"
                          >
                            {/* Card Header: Cartório, Data, Custo $, Latência, Feedback */}
                            <div className={`flex flex-wrap items-center justify-between gap-2 py-3 text-xs ${isExpanded ? "border-b" : ""}`}>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-rose-600" />
                                    {pair.client_name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    · {pair.created_at ? format(new Date(pair.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ""}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                  {pair.user_message?.content || "Conversa sem pergunta registrada"}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Cost in USD */}
                                {pair.estimated_cost_usd !== undefined && pair.estimated_cost_usd > 0 && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-[11px] py-0.5">
                                    ${pair.estimated_cost_usd.toFixed(4)} USD
                                  </Badge>
                                )}

                                {/* Latency */}
                                {pair.latency_ms && (
                                  <Badge variant="outline" className="font-mono text-[11px] py-0.5">
                                    {(pair.latency_ms / 1000).toFixed(1)}s
                                  </Badge>
                                )}

                                {/* Tokens */}
                                {pair.total_tokens && (
                                  <Badge variant="secondary" className="font-mono text-[11px] py-0.5">
                                    {pair.total_tokens} tokens
                                  </Badge>
                                )}

                                {/* Feedback */}
                                {pair.feedback === "helpful" && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px] py-0.5">
                                    <ThumbsUp className="h-2.5 w-2.5 mr-1" /> Útil
                                  </Badge>
                                )}
                                {pair.feedback === "unhelpful" && (
                                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[11px] py-0.5">
                                    <ThumbsDown className="h-2.5 w-2.5 mr-1" /> Não ajudou
                                  </Badge>
                                )}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                  onClick={() => setInspectingLog(pair.assistant_message || pair.user_message || (pair as any))}
                                >
                                  <Eye className="h-3 w-3 mr-1" /> Detalhes
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                  onClick={() => togglePair(pair.id)}
                                  aria-expanded={isExpanded}
                                  aria-label={isExpanded ? "Recolher conversa" : "Expandir conversa"}
                                >
                                  <span className="hidden sm:inline">
                                    {isExpanded ? "Recolher" : "Expandir"}
                                  </span>
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </Button>
                              </div>
                            </div>

                            <div
                              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                                isExpanded
                                  ? "grid-rows-[1fr] opacity-100"
                                  : "grid-rows-[0fr] opacity-0"
                              }`}
                              aria-hidden={!isExpanded}
                            >
                              <div className="overflow-hidden">
                                <div className="space-y-3 pb-4 pt-3">
                            {/* Section 1: User Question */}
                            {pair.user_message && (
                              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                                <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                                  <User className="h-3.5 w-3.5" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    Pergunta do Cliente:
                                  </span>
                                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                                    {pair.user_message.content}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Section 2: Assistant Response */}
                            {pair.assistant_message && (
                              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50">
                                <div className="h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                  <Bot className="h-3.5 w-3.5" />
                                </div>
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                                      Resposta do Especialista IA:
                                    </span>
                                  </div>
                                  <div className="text-xs text-foreground leading-relaxed">
                                    <PosChatMessageContent content={pair.assistant_message.content} />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Feedback comment if exists */}
                            {pair.feedback_comment && (
                              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
                                💬 Comentário do cliente: &quot;{pair.feedback_comment}&quot;
                              </div>
                            )}
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                      {libraryPagination}
                    </div>
                  )}

                  {/* MODE 2, 3, 4: TABLE VIEW */}
                  {libraryMode !== "pairs" && (
                    <div className="space-y-3">
                      <div className="max-h-[600px] overflow-x-auto">
                        <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow className="text-xs">
                            <TableHead className="w-[130px]">Data/Hora</TableHead>
                            <TableHead className="w-[180px]">Cartório</TableHead>
                            <TableHead className="w-[80px]">Papel</TableHead>
                            <TableHead>Mensagem</TableHead>
                            <TableHead className="w-[90px] text-right">Custo ($ USD)</TableHead>
                            <TableHead className="w-[100px] text-right">Tokens</TableHead>
                            <TableHead className="w-[80px] text-right">Latência</TableHead>
                            <TableHead className="w-[90px] text-center">Feedback</TableHead>
                            <TableHead className="w-[70px] text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {paginatedLogs.map((log) => {
                            const isUser = log.role === "user";
                            return (
                              <TableRow
                                key={log.id}
                                className="hover:bg-muted/40 transition-colors cursor-pointer"
                                onClick={() => setInspectingLog(log)}
                              >
                                <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                                  {log.created_at
                                    ? format(new Date(log.created_at), "dd/MM/yy HH:mm", {
                                        locale: ptBR,
                                      })
                                    : "—"}
                                </TableCell>

                                <TableCell className="font-medium truncate max-w-[180px]" title={log.client_name}>
                                  {log.client_name || "Desconhecido"}
                                </TableCell>

                                <TableCell>
                                  {isUser ? (
                                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-[10px] py-0">
                                      <User className="h-2.5 w-2.5 mr-1" /> Usuário
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 text-[10px] py-0">
                                      <Bot className="h-2.5 w-2.5 mr-1" /> IA
                                    </Badge>
                                  )}
                                </TableCell>

                                <TableCell className="max-w-[360px]">
                                  <p className="truncate text-foreground font-mono text-[11px]">
                                    {log.content}
                                  </p>
                                  {log.feedback_comment && (
                                    <p className="text-[10px] text-amber-600 italic truncate mt-0.5">
                                      &quot;{log.feedback_comment}&quot;
                                    </p>
                                  )}
                                </TableCell>

                                <TableCell className="text-right whitespace-nowrap font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                  {isUser || !log.estimated_cost_usd ? (
                                    "—"
                                  ) : (
                                    `$${log.estimated_cost_usd.toFixed(4)}`
                                  )}
                                </TableCell>

                                <TableCell className="text-right whitespace-nowrap font-mono text-[11px]">
                                  {isUser ? "—" : log.total_tokens?.toLocaleString("pt-BR") || 0}
                                </TableCell>

                                <TableCell className="text-right whitespace-nowrap font-mono text-[11px]">
                                  {isUser || !log.latency_ms ? "—" : `${(log.latency_ms / 1000).toFixed(1)}s`}
                                </TableCell>

                                <TableCell className="text-center">
                                  {log.feedback === "helpful" && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] py-0">
                                      <ThumbsUp className="h-2.5 w-2.5 mr-1" /> Útil
                                    </Badge>
                                  )}
                                  {log.feedback === "unhelpful" && (
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] py-0">
                                      <ThumbsDown className="h-2.5 w-2.5 mr-1" /> Ruim
                                    </Badge>
                                  )}
                                  {!log.feedback && <span className="text-[10px] text-muted-foreground">—</span>}
                                </TableCell>

                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInspectingLog(log);
                                    }}
                                  >
                                    Ver
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        </Table>
                      </div>
                      {libraryPagination}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: AVALIAÇÕES DOS CLIENTES */}
            <TabsContent value="feedbacks" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Respostas Positivas (Útil) */}
                <Card className="border-emerald-200 dark:border-emerald-950/60">
                  <CardHeader className="py-4 px-5 bg-emerald-50/40 dark:bg-emerald-950/20 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 rounded-lg bg-emerald-600 text-white items-center justify-center">
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                            Respostas Avaliadas como Útil (👍)
                          </CardTitle>
                          <CardDescription className="text-[11px]">
                            {helpfulResponses.length} resposta{helpfulResponses.length === 1 ? "" : "s"} resolveram a dúvida do cliente
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-emerald-300">
                        {helpfulResponses.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {helpfulResponses.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        Nenhuma resposta avaliada positivamente no período.
                      </div>
                    ) : (
                      helpfulResponses.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setInspectingLog(item)}
                          className="p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors cursor-pointer space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground truncate max-w-[200px]">
                              {item.client_name}
                            </span>
                            <span>{item.created_at ? format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                          </div>
                          <p className="line-clamp-2 text-muted-foreground font-mono text-[11px]">
                            {item.content}
                          </p>
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t text-muted-foreground">
                            <span>
                              Custo: <strong className="text-emerald-600 font-mono">${item.estimated_cost_usd ? item.estimated_cost_usd.toFixed(4) : "0.0000"}</strong> · Latência: {(item.latency_ms / 1000).toFixed(1)}s
                            </span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <ThumbsUp className="h-2.5 w-2.5" /> Útil
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Respostas Negativas (Não Ajudou) */}
                <Card className="border-rose-200 dark:border-rose-950/60">
                  <CardHeader className="py-4 px-5 bg-rose-50/40 dark:bg-rose-950/20 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 rounded-lg bg-rose-600 text-white items-center justify-center">
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-rose-900 dark:text-rose-300">
                            Respostas que Não Ajudaram (👎)
                          </CardTitle>
                          <CardDescription className="text-[11px]">
                            {unhelpfulResponses.length} resposta{unhelpfulResponses.length === 1 ? "" : "s"} para refinar base de conhecimento
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border-rose-300">
                        {unhelpfulResponses.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {unhelpfulResponses.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        Nenhuma avaliação negativa registrada!
                      </div>
                    ) : (
                      unhelpfulResponses.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setInspectingLog(item)}
                          className="p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-card hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors cursor-pointer space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-foreground truncate max-w-[200px]">
                              {item.client_name}
                            </span>
                            <span className="text-muted-foreground">{item.created_at ? format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                          </div>

                          {/* Comentário do Cliente em Destaque */}
                          {item.feedback_comment && (
                            <div className="p-2 rounded-lg bg-rose-100/70 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 text-xs font-medium border border-rose-200">
                              💬 Comentário: &quot;{item.feedback_comment}&quot;
                            </div>
                          )}

                          <p className="line-clamp-2 text-muted-foreground font-mono text-[11px]">
                            {item.content}
                          </p>
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t text-muted-foreground">
                            <span>
                              Custo: <strong className="text-emerald-600 font-mono">${item.estimated_cost_usd ? item.estimated_cost_usd.toFixed(4) : "0.0000"}</strong> · Latência: {(item.latency_ms / 1000).toFixed(1)}s
                            </span>
                            <span className="text-rose-600 font-semibold flex items-center gap-1">
                              <ThumbsDown className="h-2.5 w-2.5" /> Não ajudou
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 4: PERFORMANCE & LATÊNCIA */}
            <TabsContent value="latency" className="space-y-4">
              {/* Distribution Bar Chart */}
              <Card>
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Distribuição de Tempo de Resposta (Faixas de Latência)</span>
                    <Badge variant="outline" className="text-[10px]">
                      Média Geral: {kpis?.avg_latency_ms ? (kpis.avg_latency_ms / 1000).toFixed(1) + "s" : "0s"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Classificação das respostas por velocidade de atendimento
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={latencyBarData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                        <XAxis type="number" fontSize={11} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(val: any) => [`${val} respostas`, "Quantidade"]}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                          {latencyBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Slowest vs Fastest Rankings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Respostas Mais Lentas */}
                <Card className="border-amber-200 dark:border-amber-950/60">
                  <CardHeader className="py-4 px-5 bg-amber-50/40 dark:bg-amber-950/20 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 rounded-lg bg-amber-600 text-white items-center justify-center">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-300">
                            Respostas Mais Lentas (Possíveis Gargalos)
                          </CardTitle>
                          <CardDescription className="text-[11px]">
                            Maior tempo de processamento / raciocínio
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        Top {slowestResponses.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {slowestResponses.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        Nenhuma resposta registrada no período.
                      </div>
                    ) : (
                      slowestResponses.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => setInspectingLog(item)}
                          className="p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors cursor-pointer space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate max-w-[200px]">
                              #{idx + 1} · {item.client_name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-[11px]">
                                ${item.estimated_cost_usd ? item.estimated_cost_usd.toFixed(4) : "0.0000"} USD
                              </Badge>
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-mono text-xs">
                                {(item.latency_ms / 1000).toFixed(1)}s
                              </Badge>
                            </div>
                          </div>
                          <p className="line-clamp-2 text-muted-foreground font-mono text-[11px]">
                            {item.content}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                            <span>Tokens: {item.total_tokens || 0} ({item.reasoning_tokens || 0} reasoning)</span>
                            <span>{item.created_at ? format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Respostas Mais Rápidas */}
                <Card className="border-blue-200 dark:border-blue-950/60">
                  <CardHeader className="py-4 px-5 bg-blue-50/40 dark:bg-blue-950/20 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 rounded-lg bg-blue-600 text-white items-center justify-center">
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-blue-900 dark:text-blue-300">
                            Respostas Mais Rápidas
                          </CardTitle>
                          <CardDescription className="text-[11px]">
                            Menor tempo de resposta gerado
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        Top {fastestResponses.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {fastestResponses.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        Nenhuma resposta registrada no período.
                      </div>
                    ) : (
                      fastestResponses.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => setInspectingLog(item)}
                          className="p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors cursor-pointer space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate max-w-[200px]">
                              #{idx + 1} · {item.client_name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-[11px]">
                                ${item.estimated_cost_usd ? item.estimated_cost_usd.toFixed(4) : "0.0000"} USD
                              </Badge>
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-xs">
                                {(item.latency_ms / 1000).toFixed(1)}s
                              </Badge>
                            </div>
                          </div>
                          <p className="line-clamp-2 text-muted-foreground font-mono text-[11px]">
                            {item.content}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                            <span>Tokens: {item.total_tokens || 0}</span>
                            <span>{item.created_at ? format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Inspect Log Dialog */}
      <Dialog open={!!inspectingLog} onOpenChange={(open) => !open && setInspectingLog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(inspectingLog as any)?.role === "assistant" || (inspectingLog as any)?.feedback !== undefined ? (
                  <div className="flex h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-base font-bold">
                    {(inspectingLog as any)?.role === "user" ? "Mensagem do Cliente" : "Resposta do Especialista IA"}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {inspectingLog?.client_name} · {inspectingLog?.created_at ? format(new Date(inspectingLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) : ""}
                  </DialogDescription>
                </div>
              </div>

              {inspectingLog?.feedback && (
                <div>
                  {inspectingLog.feedback === "helpful" ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs py-0.5">
                      <ThumbsUp className="h-3 w-3 mr-1" /> Avaliado como Útil
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-xs py-0.5">
                      <ThumbsDown className="h-3 w-3 mr-1" /> Avaliado como Não Ajudou
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="p-5 overflow-y-auto space-y-4">
            {/* Financial & Technical Telemetry Card */}
            {((inspectingLog as any)?.role === "assistant" || (inspectingLog as any)?.latency_ms > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-muted/40 rounded-xl border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Custo Estimado ($ USD)</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    ${(inspectingLog as any)?.estimated_cost_usd ? (inspectingLog as any).estimated_cost_usd.toFixed(4) : "0.0000"} USD
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Latência Total</span>
                  <span className="font-mono font-semibold">
                    {inspectingLog?.latency_ms ? `${(inspectingLog.latency_ms / 1000).toFixed(2)}s (${inspectingLog.latency_ms}ms)` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Tokens (In / Out / Total)</span>
                  <span className="font-mono font-semibold">
                    {(inspectingLog as any)?.input_tokens || 0} / {(inspectingLog as any)?.output_tokens || 0} ({inspectingLog?.total_tokens || 0})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Raciocínio (Reasoning)</span>
                  <span className="font-mono font-semibold">
                    {(inspectingLog as any)?.reasoning_tokens || 0} tokens
                  </span>
                </div>
              </div>
            )}

            {/* Comment by user if exists */}
            {inspectingLog?.feedback_comment && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs">
                <span className="font-semibold text-amber-900 dark:text-amber-200 block mb-0.5">
                  Comentário do cliente:
                </span>
                <p className="italic text-amber-800 dark:text-amber-300">
                  &quot;{inspectingLog.feedback_comment}&quot;
                </p>
              </div>
            )}

            {/* Full Message Content */}
            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Conteúdo da Mensagem
              </span>
              {(inspectingLog as any)?.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{inspectingLog?.content}</p>
              ) : (
                <PosChatMessageContent content={inspectingLog?.content || ""} />
              )}
            </div>

            {/* Technical Identifiers & Pricing Formula Details */}
            <div className="text-[10px] text-muted-foreground font-mono space-y-1 border-t pt-2.5">
              <div>Session ID: {inspectingLog?.session_id}</div>
              <div>Modelo: {(inspectingLog as any)?.model || "gpt-5-nano"} (Responses API + File Search Tool)</div>
              <div>Precificação: Input $0.05/1M · Output $0.20/1M · File Search Fee: $0.0025/busca</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
