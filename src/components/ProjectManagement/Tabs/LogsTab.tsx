import { useMemo, useState } from "react";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Check,
  Eye,
  FileText,
  FilterX,
  Globe,
  GraduationCap,
  History,
  Loader2,
  MessageSquare,
  MousePointerClick,
  PackageCheck,
  PenLine,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { ProjectV2 } from "@/types/ProjectV2";
import { useTimelineEvents, type TimelineEventRecord } from "@/hooks/useTimelineEvents";
import type {
  ProjectLogActionType,
  ProjectLogCategory,
  ProjectLogChangeItem,
  ProjectLogMetadata,
} from "@/services/projectLogService";
import { extractReadableText } from "@/utils/project-audit-diff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LogsTabProps {
  project: ProjectV2;
}

type CategoryFilter = "all" | ProjectLogCategory;
type ActionFilter = "all" | ProjectLogActionType | "files";
type StageFilter =
  | "all"
  | "infra"
  | "adherence"
  | "conversion"
  | "environment"
  | "modelosEditor"
  | "implementation"
  | "post";
type PeriodFilter = "all" | "today" | "7d" | "30d" | "custom";

export interface NormalizedLogEntry {
  id: string;
  projectId: string;
  rawType: string;
  author: string;
  userEmail?: string | null;
  userRole?: string | null;
  timestamp: Date;
  message: string;
  category: ProjectLogCategory;
  actionType: ProjectLogActionType;
  tabLabel: string;
  stageId?: string;
  stageLabel?: string;
  fieldLabel?: string;
  buttonLabel?: string;
  source?: string;
  changes: ProjectLogChangeItem[];
  legacyDetails: Array<{ key: string; value: string }>;
  searchableText: string;
}

const CATEGORY_LABELS: Record<ProjectLogCategory, string> = {
  view: "Visualizações",
  general: "Informações Gerais",
  edit: "Edição do Projeto",
  stages: "Etapas",
  secondary_products: "Produtos Secundários",
  chamado_0800: "Chamado 0800",
  files: "Arquivos",
  roadmap: "Roadmap",
  pos_analysis: "Análise Pós-Implantação",
  skills: "Siplan Skills",
  automation: "Automação",
  comment: "Comentários",
};

const ACTION_TYPE_LABELS: Record<ProjectLogActionType, string> = {
  project_view: "Visualização",
  field_change: "Alteração de Campo",
  status_change: "Mudança de Status",
  button_action: "Ação / Botão",
  file_upload: "Upload de Arquivo",
  file_delete: "Exclusão de Arquivo",
  secondary_product: "Produto Secundário",
  roadmap_change: "Roadmap",
  skills_action: "Siplan Skills",
  ai_action: "Uso de IA",
  sync_action: "Sincronização",
  project_created: "Criação do Projeto",
  comment: "Comentário",
};

const STAGE_FILTER_OPTIONS: Array<{ value: StageFilter; label: string }> = [
  { value: "all", label: "Todas as Etapas" },
  { value: "infra", label: "1. Análise de Infraestrutura" },
  { value: "adherence", label: "2. Análise de Aderência" },
  { value: "conversion", label: "3. Conversão de Dados" },
  { value: "environment", label: "4. Preparação de Ambiente" },
  { value: "modelosEditor", label: "5. Modelos Editor" },
  { value: "implementation", label: "5/6. Implantação & Treinamento" },
  { value: "post", label: "6/7. Pós-Implantação" },
];

function inferStageFromText(text: string): { stageId?: string; stageLabel?: string } {
  const lower = text.toLowerCase();
  if (lower.includes("infraestrutura") || lower.includes("infra")) {
    return { stageId: "infra", stageLabel: "1. Análise de Infraestrutura" };
  }
  if (lower.includes("aderência") || lower.includes("aderencia") || lower.includes("adherence")) {
    return { stageId: "adherence", stageLabel: "2. Análise de Aderência" };
  }
  if (lower.includes("conversão") || lower.includes("conversao") || lower.includes("conversion")) {
    return { stageId: "conversion", stageLabel: "3. Conversão de Dados" };
  }
  if (lower.includes("ambiente") || lower.includes("environment") || lower.includes("orion admin")) {
    return { stageId: "environment", stageLabel: "4. Preparação de Ambiente" };
  }
  if (lower.includes("modelos editor") || lower.includes("modelos_editor")) {
    return { stageId: "modelosEditor", stageLabel: "5. Modelos Editor" };
  }
  if (
    lower.includes("pós-implantação") ||
    lower.includes("pos-implantacao") ||
    lower.includes("pós implantação") ||
    lower.includes("pos implantacao") ||
    lower.includes("post")
  ) {
    return { stageId: "post", stageLabel: "Pós-Implantação" };
  }
  if (lower.includes("implantação") || lower.includes("implantacao") || lower.includes("fase 1") || lower.includes("fase 2")) {
    return { stageId: "implementation", stageLabel: "Implantação & Treinamento" };
  }
  return {};
}

function formatLegacyDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "(vazio)";
  if (/password|senha|secret|token/i.test(key)) return "••••••••";
  if (typeof value === "string") {
    const readable = extractReadableText(value);
    return readable || "(vazio)";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return format(value, "dd/MM/yyyy HH:mm", { locale: ptBR });
  }
  if (typeof value === "object") {
    const readable = extractReadableText(value);
    if (readable && readable !== "[object Object]") return readable;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function flattenLegacyDetails(details: unknown): Array<{ key: string; value: string }> {
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];
  const entries: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(details as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (k === "stages" && v && typeof v === "object") {
      for (const [stageKey, stageVal] of Object.entries(v as Record<string, unknown>)) {
        if (stageVal && typeof stageVal === "object") {
          for (const [sk, sv] of Object.entries(stageVal as Record<string, unknown>)) {
            if (sv !== undefined && sk !== "lastUpdatedAt" && sk !== "lastUpdatedBy") {
              entries.push({
                key: `${stageKey}.${sk}`,
                value: formatLegacyDetailValue(sk, sv),
              });
            }
          }
        }
      }
      continue;
    }
    entries.push({
      key: k,
      value: formatLegacyDetailValue(k, v),
    });
  }
  return entries.slice(0, 12);
}

function normalizeTimelineEvent(event: TimelineEventRecord): NormalizedLogEntry {
  const meta: ProjectLogMetadata = (event.metadata || {}) as ProjectLogMetadata;
  const rawType = event.type || "auto";
  const message = event.message || "Registro de atividade";
  const author = event.author || "Sistema";
  const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

  // Inferir actionType
  let actionType: ProjectLogActionType = "field_change";
  if (meta.actionType && meta.actionType in ACTION_TYPE_LABELS) {
    actionType = meta.actionType;
  } else if (rawType in ACTION_TYPE_LABELS) {
    actionType = rawType as ProjectLogActionType;
  } else if (rawType === "stage_change") {
    actionType = "status_change";
  } else if (rawType === "comment") {
    actionType = "comment";
  } else if (meta.action === "project_created" || message.toLowerCase().includes("projeto criado")) {
    actionType = "project_created";
  } else if (
    message.toLowerCase().startsWith("status") ||
    message.toLowerCase().includes("status ")
  ) {
    actionType = "status_change";
  }

  // Inferir stageId / stageLabel
  const inferredStage = inferStageFromText(`${meta.stageLabel || ""} ${message}`);
  const stageId = meta.stageId || inferredStage.stageId;
  const stageLabel = meta.stageLabel || inferredStage.stageLabel;

  // Inferir category
  let category: ProjectLogCategory = "general";
  if (meta.category && meta.category in CATEGORY_LABELS) {
    category = meta.category;
  } else if (actionType === "project_view") {
    category = "view";
  } else if (actionType === "comment") {
    category = "comment";
  } else if (actionType === "file_upload" || actionType === "file_delete") {
    category = "files";
  } else if (actionType === "secondary_product") {
    category = "secondary_products";
  } else if (actionType === "roadmap_change") {
    category = "roadmap";
  } else if (actionType === "skills_action") {
    category = "skills";
  } else if (stageId) {
    category = "stages";
  } else if (
    author.toLowerCase().includes("automação") ||
    author.toLowerCase().includes("sistema")
  ) {
    category = "automation";
  } else if (
    message.toLowerCase().includes("produto") ||
    message.toLowerCase().includes("sistema") ||
    message.toLowerCase().includes("projeto")
  ) {
    category = "edit";
  }

  const tabLabel = meta.tabLabel || CATEGORY_LABELS[category] || "Geral";

  // Extrair changes estruturados
  let changes: ProjectLogChangeItem[] = [];
  if (Array.isArray(meta.changes) && meta.changes.length > 0) {
    changes = meta.changes.map((c) => ({
      field: String(c.field || ""),
      label: String(c.label || c.field || "Campo"),
      oldValue: String(c.oldValue ?? "(vazio)"),
      newValue: String(c.newValue ?? "(vazio)"),
    }));
  } else if (meta.oldValue !== undefined || meta.newValue !== undefined) {
    changes = [
      {
        field: meta.fieldLabel || "campo",
        label: meta.fieldLabel || "Campo alterado",
        oldValue: meta.oldValue !== undefined ? String(meta.oldValue) : "(vazio)",
        newValue: meta.newValue !== undefined ? String(meta.newValue) : "(vazio)",
      },
    ];
  }

  const legacyDetails =
    changes.length === 0 && meta.details ? flattenLegacyDetails(meta.details) : [];

  const searchableParts = [
    message,
    author,
    meta.userEmail || "",
    meta.userRole || "",
    tabLabel,
    stageLabel || "",
    meta.fieldLabel || "",
    meta.buttonLabel || "",
    ACTION_TYPE_LABELS[actionType] || "",
    ...changes.flatMap((c) => [c.label, c.field, c.oldValue, c.newValue]),
    ...legacyDetails.flatMap((d) => [d.key, d.value]),
  ];

  return {
    id: event.id,
    projectId: event.project_id,
    rawType,
    author,
    userEmail: meta.userEmail ?? null,
    userRole: meta.userRole ?? null,
    timestamp,
    message,
    category,
    actionType,
    tabLabel,
    stageId,
    stageLabel,
    fieldLabel: meta.fieldLabel,
    buttonLabel: meta.buttonLabel,
    source: meta.source,
    changes,
    legacyDetails,
    searchableText: searchableParts.join(" ").toLowerCase(),
  };
}

function getActionVisuals(actionType: ProjectLogActionType) {
  switch (actionType) {
    case "project_view":
      return {
        icon: Eye,
        bgClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
        badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
      };
    case "status_change":
      return {
        icon: ArrowRightLeft,
        bgClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
        badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
      };
    case "field_change":
      return {
        icon: PenLine,
        bgClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
      };
    case "button_action":
      return {
        icon: MousePointerClick,
        bgClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
        badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
      };
    case "file_upload":
      return {
        icon: Upload,
        bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      };
    case "file_delete":
      return {
        icon: Trash2,
        bgClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
        badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
      };
    case "secondary_product":
      return {
        icon: PackageCheck,
        bgClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25",
        badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
      };
    case "roadmap_change":
      return {
        icon: Globe,
        bgClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
        badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
      };
    case "skills_action":
      return {
        icon: GraduationCap,
        bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      };
    case "ai_action":
      return {
        icon: Sparkles,
        bgClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
        badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      };
    case "sync_action":
      return {
        icon: RefreshCw,
        bgClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
        badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
      };
    case "project_created":
      return {
        icon: PlusCircle,
        bgClass: "bg-primary/10 text-primary border-primary/25",
        badgeClass: "bg-primary/10 text-primary border-primary/30",
      };
    case "comment":
    default:
      return {
        icon: MessageSquare,
        bgClass: "bg-muted text-muted-foreground border-border",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SI";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function truncatePreview(text: string, maxLen = 65): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLen) return singleLine;
  return `${singleLine.slice(0, maxLen - 1)}…`;
}

export function LogsTab({ project }: LogsTabProps) {
  const { data: timelineEvents = [], isLoading } = useTimelineEvents(project.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const normalizedLogs = useMemo(
    () =>
      timelineEvents
        .map(normalizeTimelineEvent)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [timelineEvents],
  );

  const availableAuthors = useMemo(() => {
    const authors = new Set<string>();
    for (const log of normalizedLogs) {
      if (log.author) authors.add(log.author);
    }
    return [...authors].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [normalizedLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStart = startOfDay(now);

    return normalizedLogs.filter((log) => {
      if (query && !log.searchableText.includes(query)) return false;

      if (categoryFilter !== "all" && log.category !== categoryFilter) return false;

      if (actionFilter !== "all") {
        if (actionFilter === "files") {
          if (log.actionType !== "file_upload" && log.actionType !== "file_delete") {
            return false;
          }
        } else if (log.actionType !== actionFilter) {
          return false;
        }
      }

      if (stageFilter !== "all" && log.stageId !== stageFilter) return false;

      if (authorFilter !== "all" && log.author !== authorFilter) return false;

      if (periodFilter === "today") {
        if (isBefore(log.timestamp, todayStart)) return false;
      } else if (periodFilter === "7d") {
        if (isBefore(log.timestamp, startOfDay(subDays(now, 6)))) return false;
      } else if (periodFilter === "30d") {
        if (isBefore(log.timestamp, startOfDay(subDays(now, 29)))) return false;
      } else if (periodFilter === "custom") {
        if (customStartDate) {
          const start = startOfDay(new Date(`${customStartDate}T12:00:00`));
          if (isBefore(log.timestamp, start)) return false;
        }
        if (customEndDate) {
          const end = endOfDay(new Date(`${customEndDate}T12:00:00`));
          if (isAfter(log.timestamp, end)) return false;
        }
      }

      return true;
    });
  }, [
    normalizedLogs,
    searchQuery,
    categoryFilter,
    actionFilter,
    stageFilter,
    authorFilter,
    periodFilter,
    customStartDate,
    customEndDate,
  ]);

  const kpis = useMemo(() => {
    const total = filteredLogs.length;
    const fieldOrStatusChanges = filteredLogs.filter((l) =>
      [
        "field_change",
        "status_change",
        "secondary_product",
        "roadmap_change",
        "project_created",
      ].includes(l.actionType),
    ).length;
    const views = filteredLogs.filter((l) => l.actionType === "project_view").length;
    const actionsAndButtons = filteredLogs.filter((l) =>
      [
        "button_action",
        "file_upload",
        "file_delete",
        "skills_action",
        "ai_action",
        "sync_action",
      ].includes(l.actionType),
    ).length;
    const uniqueUsers = new Set(filteredLogs.map((l) => l.author).filter(Boolean)).size;

    return {
      total,
      fieldOrStatusChanges,
      views,
      actionsAndButtons,
      uniqueUsers,
    };
  }, [filteredLogs]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    categoryFilter !== "all" ||
    actionFilter !== "all" ||
    stageFilter !== "all" ||
    authorFilter !== "all" ||
    periodFilter !== "all";

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const resetPageAndSet = <T,>(setter: (val: T) => void) => (val: T) => {
    setter(val);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setActionFilter("all");
    setStageFilter("all");
    setAuthorFilter("all");
    setPeriodFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setCurrentPage(1);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllVisible = () => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      currentLogs.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Conteúdo copiado para a área de transferência!");
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      toast.error("Não foi possível copiar o conteúdo.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-xs font-medium">Carregando histórico completo do projeto...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 pb-6" data-testid="project-logs-tab">
      {/* KPIs Rápidos */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="bg-card/70 shadow-2xs">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                Total Filtrado
              </p>
              <p className="text-lg font-extrabold text-foreground leading-tight mt-0.5">
                {kpis.total}
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 shadow-2xs">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                Campos & Status
              </p>
              <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 leading-tight mt-0.5">
                {kpis.fieldOrStatusChanges}
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <PenLine className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 shadow-2xs">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                Visualizações
              </p>
              <p className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400 leading-tight mt-0.5">
                {kpis.views}
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Eye className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 shadow-2xs">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                Ações / Botões
              </p>
              <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">
                {kpis.actionsAndButtons}
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <MousePointerClick className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1 bg-card/70 shadow-2xs">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                Usuários Envolvidos
              </p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                {kpis.uniqueUsers}
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel Principal: Filtros Avançados + Lista */}
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="border-b bg-muted/20 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              <CardTitle className="text-sm font-bold tracking-tight">
                Histórico Completo de Auditoria & Visualizações
              </CardTitle>
              <Badge variant="secondary" className="text-[11px] font-bold">
                {filteredLogs.length}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {currentLogs.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={expandAllVisible}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    Expandir todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                    Retrair todos
                  </Button>
                </>
              )}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Busca Textual */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => resetPageAndSet(setSearchQuery)(e.target.value)}
              placeholder="Buscar por mensagem, usuário, campo, valor anterior/novo, etapa ou aba..."
              className="pl-9 h-9 text-xs bg-background"
              aria-label="Buscar nos logs"
            />
          </div>

          {/* Filtros Avançados */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="logs-filter-category" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Aba / Módulo
              </Label>
              <Select
                value={categoryFilter}
                onValueChange={(v) => resetPageAndSet(setCategoryFilter)(v as CategoryFilter)}
              >
                <SelectTrigger id="logs-filter-category" aria-label="Filtrar por Aba ou Módulo" className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Todas as abas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todas as Abas / Módulos</SelectItem>
                  <SelectItem value="view" className="text-xs">Visualizações</SelectItem>
                  <SelectItem value="general" className="text-xs">Informações Gerais</SelectItem>
                  <SelectItem value="edit" className="text-xs">Edição do Projeto</SelectItem>
                  <SelectItem value="stages" className="text-xs">Etapas</SelectItem>
                  <SelectItem value="secondary_products" className="text-xs">Produtos Secundários</SelectItem>
                  <SelectItem value="chamado_0800" className="text-xs">Chamado 0800</SelectItem>
                  <SelectItem value="files" className="text-xs">Arquivos</SelectItem>
                  <SelectItem value="roadmap" className="text-xs">Roadmap</SelectItem>
                  <SelectItem value="pos_analysis" className="text-xs">Análise Pós-Implantação</SelectItem>
                  <SelectItem value="skills" className="text-xs">Siplan Skills</SelectItem>
                  <SelectItem value="automation" className="text-xs">Automação</SelectItem>
                  <SelectItem value="comment" className="text-xs">Comentários</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="logs-filter-action" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tipo de Ação
              </Label>
              <Select
                value={actionFilter}
                onValueChange={(v) => resetPageAndSet(setActionFilter)(v as ActionFilter)}
              >
                <SelectTrigger id="logs-filter-action" aria-label="Filtrar por Tipo de Ação" className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os Tipos</SelectItem>
                  <SelectItem value="project_view" className="text-xs">Visualização</SelectItem>
                  <SelectItem value="field_change" className="text-xs">Alteração de Campo</SelectItem>
                  <SelectItem value="status_change" className="text-xs">Mudança de Status</SelectItem>
                  <SelectItem value="button_action" className="text-xs">Ação / Botão</SelectItem>
                  <SelectItem value="files" className="text-xs">Arquivos (Upload / Exclusão)</SelectItem>
                  <SelectItem value="secondary_product" className="text-xs">Produtos Secundários</SelectItem>
                  <SelectItem value="ai_action" className="text-xs">Uso de IA</SelectItem>
                  <SelectItem value="sync_action" className="text-xs">Sincronização</SelectItem>
                  <SelectItem value="roadmap_change" className="text-xs">Roadmap</SelectItem>
                  <SelectItem value="skills_action" className="text-xs">Siplan Skills</SelectItem>
                  <SelectItem value="project_created" className="text-xs">Criação do Projeto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="logs-filter-stage" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Etapa
              </Label>
              <Select
                value={stageFilter}
                onValueChange={(v) => resetPageAndSet(setStageFilter)(v as StageFilter)}
              >
                <SelectTrigger id="logs-filter-stage" aria-label="Filtrar por Etapa" className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="logs-filter-author" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Usuário / Autor
              </Label>
              <Select
                value={authorFilter}
                onValueChange={(v) => resetPageAndSet(setAuthorFilter)(v)}
              >
                <SelectTrigger id="logs-filter-author" aria-label="Filtrar por Usuário" className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os Usuários</SelectItem>
                  {availableAuthors.map((author) => (
                    <SelectItem key={author} value={author} className="text-xs">
                      {author}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="logs-filter-period" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Período
              </Label>
              <Select
                value={periodFilter}
                onValueChange={(v) => resetPageAndSet(setPeriodFilter)(v as PeriodFilter)}
              >
                <SelectTrigger id="logs-filter-period" aria-label="Filtrar por Período" className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Todo o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todo o período</SelectItem>
                  <SelectItem value="today" className="text-xs">Hoje</SelectItem>
                  <SelectItem value="7d" className="text-xs">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d" className="text-xs">Últimos 30 dias</SelectItem>
                  <SelectItem value="custom" className="text-xs">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {periodFilter === "custom" && (
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 max-w-md">
              <div className="space-y-1">
                <Label htmlFor="logs-custom-start" className="text-[10px] font-bold uppercase text-muted-foreground">
                  Data Inicial
                </Label>
                <Input
                  id="logs-custom-start"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => resetPageAndSet(setCustomStartDate)(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logs-custom-end" className="text-[10px] font-bold uppercase text-muted-foreground">
                  Data Final
                </Label>
                <Input
                  id="logs-custom-end"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => resetPageAndSet(setCustomEndDate)(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-3 sm:p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs font-semibold text-foreground">
                {normalizedLogs.length === 0
                  ? "Nenhuma atividade registrada neste projeto até o momento."
                  : "Nenhum registro encontrado com os filtros aplicados."}
              </p>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {currentLogs.map((log) => {
                const isExpanded = expandedIds.has(log.id);
                const visuals = getActionVisuals(log.actionType);
                const Icon = visuals.icon;
                const firstChange = log.changes[0];

                return (
                  <div
                    key={log.id}
                    data-testid={`log-row-${log.id}`}
                    className={cn(
                      "rounded-xl border bg-card transition-all overflow-hidden",
                      isExpanded ? "border-primary/30 shadow-sm" : "hover:border-border/80",
                    )}
                  >
                    {/* Linha Resumida (Clicável para expandir/retrair) */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      aria-expanded={isExpanded}
                      className="w-full text-left p-3 sm:p-3.5 hover:bg-muted/30 transition-colors flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5",
                            visuals.bgClass,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs sm:text-sm font-semibold text-foreground break-words leading-snug">
                            {log.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {log.tabLabel}
                            </Badge>
                            {log.stageLabel && (
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                {log.stageLabel}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-semibold", visuals.badgeClass)}
                            >
                              {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                            </Badge>
                          </div>

                          {!isExpanded && firstChange && (
                            <p className="text-[11px] text-muted-foreground break-words">
                              <span className="font-medium text-foreground/80">
                                {firstChange.label}:
                              </span>{" "}
                              <span className="line-through opacity-75">
                                {truncatePreview(firstChange.oldValue, 40)}
                              </span>{" "}
                              →{" "}
                              <span className="font-medium text-foreground">
                                {truncatePreview(firstChange.newValue, 45)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end sm:shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0"
                            aria-hidden="true"
                          >
                            {getAuthorInitials(log.author)}
                          </span>
                          <div className="min-w-0 sm:text-right">
                            <p className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[180px]">
                              {log.author}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 sm:justify-end">
                              <Calendar className="h-3 w-3 shrink-0" />
                              {format(log.timestamp, "dd/MM/yyyy 'às' HH:mm:ss", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>

                        <span className="h-7 w-7 rounded-md border bg-background flex items-center justify-center text-muted-foreground shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Área Expandida */}
                    {isExpanded && (
                      <div
                        data-testid={`log-details-${log.id}`}
                        className="border-t bg-muted/20 p-3 sm:p-4 space-y-3"
                      >
                        {/* Grade de Metadados */}
                        <div className="grid grid-cols-1 gap-2 rounded-lg border bg-background/80 p-2.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                          <div className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Usuário
                            </span>
                            <span className="font-semibold text-foreground break-words">
                              {log.author}
                            </span>
                          </div>

                          {(log.userEmail || log.userRole) && (
                            <div className="min-w-0">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                E-mail / Perfil
                              </span>
                              <span className="text-foreground/90 break-words">
                                {[log.userEmail, log.userRole].filter(Boolean).join(" • ")}
                              </span>
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Data e Hora Exata
                            </span>
                            <span className="font-mono text-[11px] text-foreground">
                              {format(log.timestamp, "dd/MM/yyyy 'às' HH:mm:ss", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Aba / Seção
                            </span>
                            <span className="text-foreground">{log.tabLabel}</span>
                          </div>

                          {log.stageLabel && (
                            <div className="min-w-0">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Etapa
                              </span>
                              <span className="text-foreground">{log.stageLabel}</span>
                            </div>
                          )}

                          {(log.fieldLabel || log.buttonLabel || log.source) && (
                            <div className="min-w-0">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {log.buttonLabel
                                  ? "Botão / Ação"
                                  : log.source
                                    ? "Origem da Visualização"
                                    : "Campo / Elemento"}
                              </span>
                              <span className="text-foreground break-words">
                                {log.buttonLabel ||
                                  (log.source === "modal"
                                    ? "Modal do Projeto"
                                    : log.source === "page"
                                      ? "Página de Detalhes"
                                      : log.source) ||
                                  log.fieldLabel}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Comparação Antes x Depois */}
                        {log.changes.length > 0 && (
                          <div className="space-y-2.5">
                            {log.changes.map((change, idx) => {
                              const oldCopyKey = `${log.id}-${idx}-old`;
                              const newCopyKey = `${log.id}-${idx}-new`;
                              return (
                                <div key={`${change.field}-${idx}`} className="space-y-1.5">
                                  <p className="text-[11px] font-bold text-foreground">
                                    Campo alterado:{" "}
                                    <span className="text-primary">{change.label}</span>
                                  </p>
                                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                                    {/* Como estava antes */}
                                    <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.04] p-2.5 space-y-1.5 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                          Como estava antes
                                        </span>
                                        {change.oldValue.length > 30 && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopyText(change.oldValue, oldCopyKey)}
                                            className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                          >
                                            {copiedKey === oldCopyKey ? (
                                              <Check className="h-3 w-3 text-emerald-600" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                            Copiar
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                                        {change.oldValue}
                                      </p>
                                    </div>

                                    {/* Como ficou depois */}
                                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] p-2.5 space-y-1.5 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                          Como ficou depois
                                        </span>
                                        {change.newValue.length > 30 && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopyText(change.newValue, newCopyKey)}
                                            className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                          >
                                            {copiedKey === newCopyKey ? (
                                              <Check className="h-3 w-3 text-emerald-600" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                            Copiar
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed">
                                        {change.newValue}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Compatibilidade com logs legados */}
                        {log.changes.length === 0 && log.legacyDetails.length > 0 && (
                          <div className="rounded-lg border bg-background/80 p-2.5 space-y-1.5">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Detalhes Registrados (Legado)
                            </span>
                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                              {log.legacyDetails.map((item, idx) => (
                                <div key={`${item.key}-${idx}`} className="text-xs rounded border bg-muted/20 p-2 min-w-0">
                                  <span className="block text-[10px] font-semibold text-muted-foreground break-words">
                                    {item.key}
                                  </span>
                                  <span className="text-foreground whitespace-pre-wrap break-words">
                                    {item.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação */}
          {filteredLogs.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="text-[11px]">
                  Página {safePage} de {totalPages} ({filteredLogs.length}{" "}
                  {filteredLogs.length === 1 ? "registro" : "registros"})
                </span>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="logs-page-size" className="text-[11px]">
                    Por página:
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="logs-page-size" aria-label="Registros por página" className="h-7 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10" className="text-xs">10</SelectItem>
                      <SelectItem value="20" className="text-xs">20</SelectItem>
                      <SelectItem value="50" className="text-xs">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    Próximo
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
