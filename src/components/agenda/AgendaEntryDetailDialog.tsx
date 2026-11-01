import React, { useState, useMemo, useCallback } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Clock3,
  Trash2,
  Edit3,
  Rocket,
  Palmtree,
  Info,
  ArrowUpRight,
  Loader2,
  Building2,
  Laptop,
  Phone,
  Mail,
  MessageCircle,
  Check,
  ExternalLink,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  Users,
  User,
  Share2,
  Link2,
  MapPin,
  Sparkles,
  Layers,
  UserCheck,
  CalendarDays,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { buildEllevoTicketUrl, normalizeEllevoTicketNumber } from "@/lib/ellevo-ticket";
import type { UnifiedAgendaEvent, AgendaEventOrigin } from "@/types/agenda";
import type { ProjectV2, HealthScore, GlobalStatus } from "@/types/ProjectV2";
import {
  useChamado0800ByNumber,
  useChamadoTramites,
  type ChamadoTramite,
} from "@/hooks/useChamados0800";
import { useAgendaPermissions } from "@/hooks/useAgendaPermissions";
import { useAnalystAgenda } from "@/hooks/useAnalystAgenda";
import { useHubCollaborators } from "@/hooks/useHubCollaborators";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { getCollaboratorMeta, cleanRichTextOrJson } from "@/lib/agenda-view-helpers";
import {
  getAgendaEventCategory,
  AGENDA_CATEGORY_STYLES,
  getCatalogBadge,
  formatActivityType,
} from "@/components/agenda/AgendaCard";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

// ============================================================================
// HELPERS DE CRITICIDADE, CONTATO E FORMATAÇÃO
// ============================================================================

export interface CriticidadeBadgeConfig {
  label: string;
  className: string;
  dotClass: string;
}

export function getCriticidadeBadgeConfig(criticidade?: string | null): CriticidadeBadgeConfig {
  const norm = (criticidade || "").toLowerCase().trim();
  if (
    norm.includes("crit") ||
    norm.includes("urg") ||
    norm.includes("altíssima") ||
    norm.includes("altissima")
  ) {
    return {
      label: criticidade || "Crítica",
      className:
        "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800",
      dotClass: "bg-rose-500 animate-pulse",
    };
  }
  if (norm.includes("alta")) {
    return {
      label: criticidade || "Alta",
      className:
        "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-500",
    };
  }
  if (norm.includes("baix")) {
    return {
      label: criticidade || "Baixa",
      className:
        "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700",
      dotClass: "bg-slate-400",
    };
  }
  return {
    label: criticidade || "Normal",
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-500",
  };
}

export interface SolicitanteContactData {
  nome: string;
  telefone?: string;
  whatsappUrl?: string;
  email?: string;
}

/**
 * Extrai contatos do solicitante de campos estruturados ou de anotações no corpo
 */
export function extractContactDetails(
  rawSolicitante?: string | null,
  rawDescricao?: string | null,
  extraTicketData?: any
): SolicitanteContactData {
  let nome = (rawSolicitante || "").trim();
  let telefone: string | undefined =
    extraTicketData?.telefone ||
    extraTicketData?.celular ||
    extraTicketData?.phone ||
    extraTicketData?.contato_telefone;
  let email: string | undefined =
    extraTicketData?.email || extraTicketData?.contato_email;

  if (nome) {
    const emailMatch = nome.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !email) {
      email = emailMatch[0];
      nome = nome.replace(emailMatch[0], "").trim();
    }

    const phoneMatch = nome.match(/(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/);
    if (phoneMatch && !telefone) {
      telefone = phoneMatch[0].trim();
      nome = nome.replace(phoneMatch[0], "").trim();
    }

    nome = nome.replace(/[-–()]/g, " ").replace(/\s+/g, " ").trim();
  }

  if (!telefone && rawDescricao) {
    const descPhoneMatch = rawDescricao.match(
      /(?:telefone|celular|fone|whatsapp|contato|whats|wpp)[:\s]+(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/i
    );
    if (descPhoneMatch) {
      const matchOnlyNum = descPhoneMatch[0].match(/(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/);
      if (matchOnlyNum) {
        telefone = matchOnlyNum[0].trim();
      }
    }
  }

  let whatsappUrl: string | undefined;
  if (telefone) {
    const digitsOnly = telefone.replace(/\D/g, "");
    if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      whatsappUrl = `https://wa.me/55${digitsOnly}`;
    }
  }

  return {
    nome: nome || "Não informado",
    telefone,
    whatsappUrl,
    email,
  };
}

/**
 * Extrai Cidade e UF do nome do cartório ou custom_fields
 */
function extractCityState(
  clientName?: string | null,
  customFields?: Record<string, unknown> | null
): { city?: string; state?: string; formatted: string } {
  if (customFields) {
    const rawCity = (customFields.cidade || customFields.city) as string | undefined;
    const rawState = (customFields.uf || customFields.estado || customFields.state) as string | undefined;
    if (rawCity && rawState) {
      return {
        city: rawCity,
        state: rawState.toUpperCase(),
        formatted: `${rawCity} - ${rawState.toUpperCase()}`,
      };
    }
  }

  if (!clientName) return { formatted: "Localidade não informada" };

  const ufs = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO";
  const regexHyphen = new RegExp(`(?:[-–/]\\s*)([A-Za-zÀ-ÿ\\s]+?)(?:\\s*[-–/]\\s*|\\s*\\()(${ufs})(?:\\)?)$`, "i");
  const matchHyphen = clientName.match(regexHyphen);

  if (matchHyphen && matchHyphen[1] && matchHyphen[2]) {
    const city = matchHyphen[1].trim();
    const state = matchHyphen[2].trim().toUpperCase();
    return { city, state, formatted: `${city} - ${state}` };
  }

  const regexUfOnly = new RegExp(`(?:[-–/]\\s*|\\()(${ufs})(?:\\)?)$`, "i");
  const matchUf = clientName.match(regexUfOnly);
  if (matchUf && matchUf[1]) {
    const state = matchUf[1].trim().toUpperCase();
    const matchCityDe = clientName.match(/(?:de|em)\s+([A-Za-zÀ-ÿ\\s]+?)(?:\s*[-–/]\s*[A-Z]{2}|\s*\([A-Z]{2}\))/i);
    if (matchCityDe && matchCityDe[1]) {
      const city = matchCityDe[1].trim();
      return { city, state, formatted: `${city} - ${state}` };
    }
    return { state, formatted: state };
  }

  return { formatted: "Não especificada" };
}

function getHealthScoreConfig(score?: HealthScore) {
  switch (score) {
    case "ok":
      return {
        label: "Saudável",
        dotClass: "bg-emerald-500",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "warning":
      return {
        label: "Atenção (> 3d sem mov.)",
        dotClass: "bg-amber-500",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    case "critical":
      return {
        label: "Crítico (> 7d sem mov.)",
        dotClass: "bg-rose-500",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      };
    default:
      return {
        label: "Normal",
        dotClass: "bg-slate-400",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

function getGlobalStatusConfig(status?: GlobalStatus) {
  switch (status) {
    case "done":
      return {
        label: "Finalizado",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
      };
    case "blocked":
      return {
        label: "Pausado / Bloqueado",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      };
    case "in-progress":
      return {
        label: "Em Andamento",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      };
    case "todo":
      return {
        label: "A Iniciar",
        badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
      };
    default:
      return {
        label: "Projeto Ativo",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

interface StageResolution {
  isProjectOrigin: boolean;
  stageName: string;
  stepNumber: string;
  stepId: "implementation" | "adherence" | "conversion" | "environment" | null;
  ruleExplanation: string;
  badgeLabel: string;
  badgeClass: string;
  stageStatusText?: string;
  locationMode?: string;
  isConfirmed?: boolean;
}

function resolveStageOrigin(
  origin: AgendaEventOrigin,
  project?: ProjectV2 | null,
  event?: UnifiedAgendaEvent | null
): StageResolution {
  const isOrionTN =
    project?.systemType === "Orion TN" ||
    project?.systemType === "Modelos TN" ||
    project?.products?.includes("Orion TN") ||
    project?.products?.includes("OrionTN");

  switch (origin) {
    case "phase1_implementation": {
      const p1 = project?.stages?.implementation?.phase1;
      const isConfirmed = Boolean(p1?.isConfirmed || event?.isConfirmed);
      const location = p1?.trainingLocation || (event?.subject?.toLowerCase().includes("remot") ? "Remota" : "Presencial");

      return {
        isProjectOrigin: true,
        stageName: "Fase 1 — Treinamento & Acompanhamento",
        stepNumber: isOrionTN ? "Etapa 6" : "Etapa 5",
        stepId: "implementation",
        badgeLabel: "Fase 1 Implantação",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
        locationMode: location,
        isConfirmed,
        stageStatusText: isConfirmed ? "Confirmada" : "Prevista",
        ruleExplanation:
          "Este agendamento é gerado e atualizado de forma 100% autônoma a partir das datas da Fase 1 cadastradas na Etapa de Implantação. Para alterar datas, modalidade (Presencial/Remoto) ou analistas alocados, altere diretamente a etapa do projeto no HUB.",
      };
    }

    case "adherence": {
      const adh = project?.stages?.adherence;
      const statusText = adh?.status === "done" ? "Concluída" : adh?.status === "in-progress" ? "Em Andamento" : "Agendada";

      return {
        isProjectOrigin: true,
        stageName: "Análise de Aderência",
        stepNumber: "Etapa 2",
        stepId: "adherence",
        badgeLabel: "Etapa 2 — Aderência",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
        stageStatusText: statusText,
        ruleExplanation:
          "Agendamento sincronizado diretamente da data de agendamento da Análise de Aderência (Etapa 2). Para reagendar ou substituir o analista responsável, realize a modificação diretamente no fluxo do projeto.",
      };
    }

    case "conversion_homologation": {
      const conv = project?.stages?.conversion;
      const statusText = conv?.homologationStatus || (conv?.status === "done" ? "Concluída" : "Agendada");

      return {
        isProjectOrigin: true,
        stageName: "Homologação da Conversão de Dados",
        stepNumber: "Etapa 3",
        stepId: "conversion",
        badgeLabel: "Etapa 3 — Homologação",
        badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300",
        stageStatusText: statusText,
        ruleExplanation:
          "Agendamento originado da Etapa 3 (Homologação da Conversão). Representa a sessão de validação do banco convertido com o cliente. Reprogramações de analistas e datas devem ser realizadas na Fila/Etapa de Conversão.",
      };
    }

    case "environment_preparation": {
      const env = project?.stages?.environment;
      const statusText = env?.status === "done" ? "Concluída" : env?.status === "in-progress" ? "Em Andamento" : "Agendada";

      return {
        isProjectOrigin: true,
        stageName: "Preparação de Ambiente & Infraestrutura",
        stepNumber: "Etapa 4",
        stepId: "environment",
        badgeLabel: "Etapa 4 — Ambiente",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300",
        stageStatusText: statusText,
        ruleExplanation:
          "Agendamento sincronizado diretamente com a Etapa 4 (Preparação de Ambiente & Infraestrutura). Atualizações de analistas de infraestrutura (Alex Silva, Bruno Fernandes e demais responsáveis) refletem diretamente na esteira e no projeto.",
      };
    }

    case "manual_entry": {
      return {
        isProjectOrigin: false,
        stageName: "Lançamento Manual da Gestão",
        stepNumber: "Agenda",
        stepId: null,
        badgeLabel: "Lançamento Manual",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
        ruleExplanation:
          "Atividade inserida manualmente pela coordenação (Maria/Lunna/Admin). Pode ser editada, reprogramada ou excluída livremente nesta tela.",
      };
    }

    case "vacation": {
      return {
        isProjectOrigin: false,
        stageName: "Escala de Ausência / Férias RH",
        stepNumber: "RH",
        stepId: null,
        badgeLabel: "Férias RH",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
        ruleExplanation:
          "Lançamento sincronizado da escala oficial de férias dos implantadores (implantador_vacations). Modificações devem ser alinhadas com o RH.",
      };
    }
  }
}

function getTramiteIcon(atividade?: string, descricao?: string) {
  const text = `${atividade || ""} ${descricao || ""}`.toLowerCase();
  if (text.includes("conclu") || text.includes("encerr") || text.includes("finaliz")) {
    return {
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
    };
  }
  if (
    text.includes("encaminh") ||
    text.includes("transfer") ||
    text.includes("atribui") ||
    text.includes("alocad")
  ) {
    return {
      icon: ArrowRight,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800",
    };
  }
  if (
    text.includes("contato") ||
    text.includes("cliente") ||
    text.includes("solicit") ||
    text.includes("resposta")
  ) {
    return {
      icon: MessageSquare,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800",
    };
  }
  if (text.includes("aguard") || text.includes("pendent")) {
    return {
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
    };
  }
  return {
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  };
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const date = parseISO(isoString);
    if (isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

// ============================================================================
// COMPONENTE: ITEM DA LINHA DO TEMPO DOS TRÂMITES
// ============================================================================

interface TimelineItemProps {
  tramite: ChamadoTramite;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function TimelineItem({
  tramite,
  index,
  total,
  isExpanded,
  onToggleExpand,
}: TimelineItemProps) {
  const iconConfig = getTramiteIcon(tramite.atividade, tramite.descricao);
  const IconComponent = iconConfig.icon;
  const relativeTime = formatRelativeTime(tramite.dataTramite);

  const formattedDateTime = useMemo(() => {
    if (!tramite.dataTramite) return "Data não informada";
    try {
      return format(parseISO(tramite.dataTramite), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    } catch {
      return tramite.dataTramite;
    }
  }, [tramite.dataTramite]);

  const rawText = tramite.descricao || "Trâmite sem descrição registrada.";
  const isLongText = rawText.length > 280;
  const displayText =
    !isExpanded && isLongText ? `${rawText.slice(0, 280)}...` : rawText;

  return (
    <div className="relative pl-6 sm:pl-8 pb-6 last:pb-2 group">
      {/* Linha vertical conectora */}
      {index !== total - 1 && (
        <span
          className="absolute left-[11px] sm:left-[15px] top-6 -bottom-1 w-0.5 bg-border/70 group-hover:bg-primary/40 transition-colors"
          aria-hidden="true"
        />
      )}

      {/* Nó com ícone semântico */}
      <span
        className={cn(
          "absolute left-0 sm:left-1 top-0.5 h-6 w-6 sm:h-7 sm:w-7 rounded-full border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105",
          iconConfig.bg
        )}
      >
        <IconComponent className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", iconConfig.color)} />
      </span>

      {/* Card do Trâmite */}
      <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 text-xs shadow-xs space-y-2 hover:border-primary/30 transition-colors">
        {/* Cabeçalho do Trâmite */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold text-foreground text-xs">
              Trâmite #{tramite.numeroTramite ?? total - index}
            </span>

            {tramite.atividade && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-medium bg-muted/30 border-border/60 text-foreground/90 max-w-[200px] truncate"
              >
                {tramite.atividade}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto shrink-0">
            <Clock3 className="h-3 w-3 text-muted-foreground/70" />
            <span className="font-medium text-foreground/80">{formattedDateTime}</span>
            {relativeTime && (
              <span className="text-[10px] text-muted-foreground">({relativeTime})</span>
            )}
          </div>
        </div>

        {/* Metadados: Autor e Equipe */}
        {(tramite.responsavel || tramite.equipeResponsavel) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {tramite.responsavel && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground/80" />
                <strong className="text-foreground/90 font-medium">
                  {tramite.responsavel}
                </strong>
              </span>
            )}

            {tramite.equipeResponsavel && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground/80" />
                <span>{tramite.equipeResponsavel}</span>
              </span>
            )}
          </div>
        )}

        {/* Texto do Trâmite com Sanitização e Expansão */}
        <div className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
          {displayText}
        </div>

        {isLongText && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="h-6 px-1.5 text-[11px] text-primary hover:text-primary/90 font-semibold gap-1 hover:bg-transparent p-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Recolher texto
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Ver texto completo
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export interface AgendaEntryDetailDialogProps {
  /** Evento selecionado para exibição detalhada */
  event: UnifiedAgendaEvent | null;
  /** Estado de abertura do modal */
  open: boolean;
  /** Callback para alternar abertura */
  onOpenChange: (open: boolean) => void;
  /** Callback para editar o lançamento (abre o NewAgendaEntryDialog em modo edição) */
  onEdit?: (event: UnifiedAgendaEvent) => void;
  /** Callback opcional de sucesso após exclusão */
  onDeleteSuccess?: () => void;
  /** Callback opcional customizado para abrir projeto */
  onProjectClick?: (projectId: string, stepId?: string) => void;
}

export function AgendaEntryDetailDialog({
  event,
  open,
  onOpenChange,
  onEdit,
  onDeleteSuccess,
  onProjectClick,
}: AgendaEntryDetailDialogProps) {
  const navigate = useNavigate();
  const { canEdit, canDelete, restrictedTooltip } = useAgendaPermissions();

  // Lazy loading dos dados do projeto (Split Query Estrito)
  const { project, isLoading: isProjectLoading } = useProjectDetails(
    open && event?.projectId ? event.projectId : null
  );

  // Instância do hook de agenda com mutações
  const { deleteEntry, isDeleting, updateEntry, isUpdating } = useAnalystAgenda({
    startDate: event?.date ? new Date(`${event.date}T12:00:00`) : new Date(),
    endDate: event?.date ? new Date(`${event.date}T12:00:00`) : new Date(),
  });

  // Estados de confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBulkMode, setDeleteBulkMode] = useState<"single" | "all">("single");

  // Estado para Reatribuição rápida de analista
  const [reassignOpen, setReassignOpen] = useState(false);

  // Estados da Linha do Tempo de Trâmites
  const [searchTramites, setSearchTramites] = useState("");
  const [expandedTramites, setExpandedTramites] = useState<Set<number>>(new Set());

  // Estado de feedback dos botões de copiar
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Colaboradores cadastrados no Siplan HUB
  const { data: hubCollaborators = [] } = useHubCollaborators();

  const collaboratorInfo = useMemo(() => {
    if (!event?.userName) return null;
    const meta = getCollaboratorMeta(event.userName);
    const profile = hubCollaborators.find(
      (c) =>
        c.id === event.userId ||
        c.name.toLowerCase() === event.userName.toLowerCase() ||
        c.fullName?.toLowerCase() === event.userName.toLowerCase()
    );
    return {
      id: event.userId || profile?.id || "",
      name: event.userName,
      initials: meta.initials,
      team: profile?.team || meta.member?.role || "Equipe de Implantação",
      email: profile?.email || "",
      colorClass: meta.colorClass,
    };
  }, [event?.userName, event?.userId, hubCollaborators]);

  // Consulta enriquecida dos dados do Chamado 0800 se houver ticketNumber
  const ticketNumber = (
    event?.ticketNumber ||
    project?.ticketNumber ||
    (event?.ticketData as any)?.numeroChamado ||
    (event?.ticketData as any)?.numero_chamado ||
    ""
  ).trim();
  const { data: chamadoEnriquecido, isLoading: chamadoLoading } = useChamado0800ByNumber(
    ticketNumber,
    Boolean(ticketNumber && open)
  );

  const fullTicket = useMemo(() => {
    const raw = (event?.ticketData as any) || {};
    return {
      numeroChamado: ticketNumber || chamadoEnriquecido?.numeroChamado || raw.numeroChamado,
      codigoCliente: chamadoEnriquecido?.codigoCliente || raw.codigoCliente,
      nomeCliente: chamadoEnriquecido?.nomeCliente || raw.nomeCliente || event?.clientName,
      solicitante: chamadoEnriquecido?.solicitante || raw.solicitante,
      titulo: chamadoEnriquecido?.titulo || raw.titulo || event?.subject,
      descricao: chamadoEnriquecido?.descricao || raw.descricao || event?.observations,
      natureza: chamadoEnriquecido?.natureza || raw.natureza,
      status: chamadoEnriquecido?.status || raw.status || (event as any)?.status,
      criticidade: chamadoEnriquecido?.criticidade || raw.criticidade,
      software: chamadoEnriquecido?.software || raw.software || project?.systemType || event?.systemType,
      produto: chamadoEnriquecido?.produto || raw.produto,
      equipeResponsavel: chamadoEnriquecido?.equipeResponsavel || raw.equipeResponsavel,
      analistaResponsavel: chamadoEnriquecido?.analistaResponsavel || raw.analistaResponsavel,
      dataAbertura: chamadoEnriquecido?.dataAbertura || raw.dataAbertura,
      dataEncerramento: chamadoEnriquecido?.dataEncerramento || raw.dataEncerramento,
      abertoEm: chamadoEnriquecido?.abertoEm || raw.abertoEm,
      encerradoEm: chamadoEnriquecido?.encerradoEm || raw.encerradoEm,
      slaPrimeiraRespostaPrevistaEm: chamadoEnriquecido?.slaPrimeiraRespostaPrevistaEm,
      slaVencimentoEm: chamadoEnriquecido?.slaVencimentoEm,
      slaTempoRestanteMinutos: chamadoEnriquecido?.slaTempoRestanteMinutos,
    };
  }, [chamadoEnriquecido, event?.ticketData, ticketNumber, project?.systemType, event?.clientName, event?.subject, event?.observations]);

  // Consulta dos trâmites recentes do chamado
  const { tramites = [], isLoading: tramitesLoading, error: tramitesError } =
    useChamadoTramites(ticketNumber, Boolean(ticketNumber && open));

  // Busca reativa da quantidade de dias na sequência em lote
  const { data: bulkGroupInfo } = useQuery({
    queryKey: ["analystAgendaBulkGroup", event?.bulkGroupId],
    queryFn: async () => {
      if (!event?.bulkGroupId) return null;
      const { data, count, error } = await supabase
        .from("analyst_agenda_entries")
        .select("id, date", { count: "exact" })
        .eq("bulk_group_id", event.bulkGroupId)
        .order("date", { ascending: true });

      if (error) {
        console.error("Erro ao buscar grupo de agendamentos em lote:", error);
        return null;
      }

      return {
        count: count || data?.length || 0,
        entries: data || [],
        startDate: data?.[0]?.date,
        endDate: data?.[data.length - 1]?.date,
      };
    },
    enabled: Boolean(open && event?.bulkGroupId),
    staleTime: 15_000,
  });

  // Resolução do sistema/software e descrições
  const effectiveSoftware =
    fullTicket?.software ||
    fullTicket?.produto ||
    project?.systemType ||
    event?.systemType ||
    "Orion";

  const cleanDescription = useMemo(() => {
    const raw =
      fullTicket?.descricao ||
      (event?.ticketData as any)?.descricao ||
      (event?.ticketData as any)?.assunto ||
      event?.subject;
    return cleanRichTextOrJson(raw);
  }, [fullTicket, event?.ticketData, event?.subject]);

  const cleanObservations = useMemo(() => {
    return cleanRichTextOrJson(event?.observations);
  }, [event?.observations]);

  const effectiveDescription = cleanDescription || cleanObservations;

  // Extração inteligente de contatos do solicitante
  const contactInfo = useMemo(() => {
    const rawSolicitante =
      chamadoEnriquecido?.solicitante ||
      (event?.ticketData as any)?.solicitante;
    return extractContactDetails(
      rawSolicitante,
      effectiveDescription,
      event?.ticketData
    );
  }, [chamadoEnriquecido, event?.ticketData, effectiveDescription]);

  // Criticidade Temática
  const criticidadeConfig = useMemo(() => {
    return getCriticidadeBadgeConfig(
      chamadoEnriquecido?.criticidade || (event?.ticketData as any)?.criticidade
    );
  }, [chamadoEnriquecido?.criticidade, event?.ticketData]);

  // Resolução da Etapa de Origem
  const stageMeta = useMemo(() => {
    if (!event) return null;
    return resolveStageOrigin(event.origin, project, event);
  }, [event, project]);

  // Metadados Geográficos e de Saúde
  const cityState = useMemo(() => {
    return extractCityState(
      project?.clientName || event?.clientName,
      project?.customFields
    );
  }, [project, event?.clientName]);

  const healthConfig = useMemo(() => {
    return getHealthScoreConfig(project?.healthScore);
  }, [project?.healthScore]);

  const globalStatusConfig = useMemo(() => {
    return getGlobalStatusConfig(project?.globalStatus);
  }, [project?.globalStatus]);

  // Formatação de data e horários
  const formattedDate = useMemo(() => {
    if (!event?.date) return "";
    try {
      const d = new Date(`${event.date}T12:00:00`);
      const text = format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      return text.charAt(0).toUpperCase() + text.slice(1);
    } catch {
      return event.date;
    }
  }, [event?.date]);

  const singleDayFormattedDate = useMemo(() => {
    if (!event?.date) return "";
    try {
      return format(new Date(`${event.date}T12:00:00`), "dd/MM/yyyy");
    } catch {
      return event.date;
    }
  }, [event?.date]);

  const formattedTime = useMemo(() => {
    if (!event) return "";
    if (event.isAllDay) return "Dia Inteiro (Expediente Comercial)";
    if (event.startTime && event.endTime) {
      return `${event.startTime.slice(0, 5)} às ${event.endTime.slice(0, 5)}`;
    }
    if (event.startTime) return `A partir de ${event.startTime.slice(0, 5)}`;
    return "Horário não especificado";
  }, [event]);

  // URL Direta do Ellevo
  const ellevoDirectUrl = useMemo(() => {
    return buildEllevoTicketUrl(ticketNumber);
  }, [ticketNumber]);

  // Filtro de trâmites
  const filteredTramites = useMemo(() => {
    if (!searchTramites.trim()) return tramites;
    const q = searchTramites.toLowerCase();
    return tramites.filter((t) => {
      return (
        t.responsavel?.toLowerCase().includes(q) ||
        t.equipeResponsavel?.toLowerCase().includes(q) ||
        t.atividade?.toLowerCase().includes(q) ||
        t.descricao?.toLowerCase().includes(q) ||
        String(t.numeroTramite || "").includes(q) ||
        String(t.sequenciaTramite || "").includes(q)
      );
    });
  }, [tramites, searchTramites]);

  const toggleTramiteExpand = useCallback((seq: number) => {
    setExpandedTramites((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) {
        next.delete(seq);
      } else {
        next.add(seq);
      }
      return next;
    });
  }, []);

  if (!event || !stageMeta) return null;

  const isManualEntry = event.origin === "manual_entry";
  const category = getAgendaEventCategory(event);
  const visualConfig = AGENDA_CATEGORY_STYLES[category];
  const catalogBadge = getCatalogBadge(event);
  const totalBulkDays = bulkGroupInfo?.count || 2;

  // Ação 1: Copiar Resumo Executivo
  const handleCopySummary = async () => {
    try {
      const lines: string[] = [
        "📋 *AGENDAMENTO - SIPLAN HUB*",
        `📅 *Data:* ${formattedDate}`,
        `⏰ *Horário:* ${formattedTime}`,
        `👤 *Responsável:* ${collaboratorInfo?.name || event.userName}${
          collaboratorInfo?.team ? ` (${collaboratorInfo.team})` : ""
        }`,
        `🏛 *Cliente:* ${event.clientName || "Cliente não informado"}`,
      ];

      if (ticketNumber) {
        lines.push(`🎫 *Chamado 0800:* #${normalizeEllevoTicketNumber(ticketNumber)}`);
      }

      lines.push(`💻 *Software:* ${effectiveSoftware}`);
      lines.push(
        `🎯 *Atividade:* ${event.subject || formatActivityType(event.activityType)}`
      );

      if (chamadoEnriquecido?.criticidade) {
        lines.push(`⚡ *Criticidade:* ${chamadoEnriquecido.criticidade}`);
      }

      if (contactInfo.nome && contactInfo.nome !== "Não informado") {
        lines.push(`🙋 *Solicitante:* ${contactInfo.nome}`);
      }

      if (contactInfo.telefone) {
        lines.push(`📞 *Contato:* ${contactInfo.telefone}`);
      }

      if (cleanObservations) {
        lines.push(`📝 *Observações:* ${cleanObservations}`);
      }

      if (ellevoDirectUrl) {
        lines.push(`🔗 *Link do Chamado 0800:* ${ellevoDirectUrl}`);
      }

      const summaryText = lines.join("\n");
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      toast.success("Resumo do agendamento copiado para a área de transferência!");
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      toast.error("Não foi possível copiar o resumo.");
    }
  };

  // Ação 2: Copiar Link do Chamado
  const handleCopyTicketLink = async () => {
    if (!ellevoDirectUrl) {
      toast.error("Link do chamado não disponível.");
      return;
    }
    try {
      await navigator.clipboard.writeText(ellevoDirectUrl);
      setCopiedLink(true);
      toast.success("Link do chamado copiado com sucesso!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Falha ao copiar link.");
    }
  };

  // Ação 3: Abrir no Ellevo SAC
  const handleOpenEllevoSac = () => {
    if (!ellevoDirectUrl) return;
    window.open(ellevoDirectUrl, "_blank", "noopener,noreferrer");
  };

  // Ação 4: Reatribuição Rápida de Analista
  const handleQuickReassign = async (newUserId: string, newUserName: string) => {
    if (!event || !canEdit || !isManualEntry) return;
    try {
      const idToUpdate = event.rawEntryId || event.id.replace(/^manual-/, "");
      await updateEntry({
        id: idToUpdate,
        updates: {
          userId: newUserId,
          userName: newUserName,
        },
      });
      setReassignOpen(false);
      onOpenChange(false);
      onDeleteSuccess?.();
    } catch (err: any) {
      console.error("Erro ao reatribuir analista:", err);
    }
  };

  // Ação 5: Exclusão com Salvaguardas
  const handleConfirmDelete = async () => {
    if (!event) return;
    try {
      const idToDelete = event.rawEntryId || event.id.replace(/^manual-/, "");
      const deleteAllInBulk = Boolean(deleteBulkMode === "all" && event.bulkGroupId);

      await deleteEntry({
        id: idToDelete,
        deleteAllInBulk,
        bulkGroupId: event.bulkGroupId,
      });

      setDeleteConfirmOpen(false);
      onOpenChange(false);
      onDeleteSuccess?.();
    } catch (err: any) {
      console.error("Erro ao excluir agendamento:", err);
    }
  };

  // Ação 6: Navegação Inteligente (Deep Link) para o projeto
  const handleOpenProject = (stepId?: string | null) => {
    if (!event.projectId) return;
    onOpenChange(false);
    if (onProjectClick) {
      onProjectClick(event.projectId, stepId || undefined);
    } else {
      const targetUrl = stepId
        ? `/projects/${event.projectId}?tab=steps&step=${stepId}`
        : `/projects/${event.projectId}`;
      navigate(targetUrl);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl border border-border shadow-2xl">
          {/* CABEÇALHO EXECUTIVO */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                    visualConfig.badgeClass
                  )}
                >
                  {visualConfig.label}
                </span>

                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                    catalogBadge.className
                  )}
                >
                  {catalogBadge.label}
                </span>

                {stageMeta.isProjectOrigin && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold border px-2 py-0.5 uppercase tracking-wider",
                      stageMeta.badgeClass
                    )}
                  >
                    {stageMeta.stepNumber}
                  </Badge>
                )}

                {event.status && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {event.status}
                  </Badge>
                )}

                {event.bulkGroupId && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 gap-1"
                  >
                    <Layers className="h-3 w-3" />
                    Lote ({totalBulkDays} dias)
                  </Badge>
                )}
              </div>

              {/* Botão de Copiar Resumo Executivo */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                className="h-7 px-2.5 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground border-border/70 shadow-2xs"
                title="Copiar resumo formatado para WhatsApp ou e-mail"
              >
                {copiedSummary ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-primary" />
                    <span>Copiar Resumo</span>
                  </>
                )}
              </Button>
            </div>

            <DialogTitle className="text-lg sm:text-xl font-bold text-foreground mt-2 leading-snug">
              {event.subject || cleanDescription || formatActivityType(event.activityType)}
            </DialogTitle>

            <DialogDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
              <span className="font-semibold text-foreground/90">
                {event.clientName || "Cliente não informado"}
              </span>
              {cityState.city && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {cityState.formatted}
                  </span>
                </>
              )}
              {event.clientCode && (
                <span className="text-xs text-muted-foreground font-mono">
                  (Cód: {event.clientCode})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* CORPO DO MODAL COM ROLAGEM SUAVE */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* GRID PRINCIPAL: RESPONSÁVEL E HORÁRIO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 text-xs shadow-xs">
              {/* Responsável com Ação Rápida de Troca */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 border border-border shrink-0">
                    <AvatarFallback
                      className={cn(
                        "font-bold text-white text-xs",
                        collaboratorInfo?.colorClass || "bg-primary"
                      )}
                    >
                      {collaboratorInfo?.initials || "AN"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Responsável
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {collaboratorInfo?.name || "Não atribuído"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {collaboratorInfo?.team}
                    </p>
                  </div>
                </div>

                {/* Botão de Trocar Analista (Apenas Gestores/Admins) */}
                {isManualEntry && canEdit && (
                  <Popover open={reassignOpen} onOpenChange={setReassignOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUpdating}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        title="Reatribuir outro analista responsável"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Trocar</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Pesquisar analista..." className="h-9 text-xs" />
                        <CommandList>
                          <CommandEmpty>Nenhum analista encontrado.</CommandEmpty>
                          <CommandGroup heading="Colaboradores">
                            {hubCollaborators.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => handleQuickReassign(c.id, c.name)}
                                className="text-xs flex items-center justify-between cursor-pointer"
                              >
                                <span>{c.name}</span>
                                {c.name.toLowerCase() === event.userName.toLowerCase() && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                    Atual
                                  </Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Data e Horário */}
              <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-border/60 pt-3 sm:pt-0 sm:pl-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Data & Horário
                  </p>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {formattedDate}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {formattedTime}
                  </p>
                </div>
              </div>
            </div>

            {/* CARD ENRIQUECIDO DE VÍNCULO COM CHAMADO 0800 (ELLEVO) */}
            {ticketNumber ? (
              <div className="rounded-xl border border-primary/30 bg-card overflow-hidden shadow-sm">
                {/* Cabeçalho do Bloco do Chamado com Ações */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-primary/5 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Laptop className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground">
                      Chamado 0800 #
                    </span>
                    <EllevoTicketLink
                      ticketNumber={ticketNumber}
                      className="text-xs font-bold text-primary hover:underline"
                    />
                  </div>

                  {/* Ações Rápidas do Chamado */}
                  <div className="flex items-center gap-2 ml-auto">
                    {ellevoDirectUrl && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyTicketLink}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                          title="Copiar link direto do chamado 0800"
                        >
                          {copiedLink ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Link2 className="h-3 w-3 text-primary" />
                          )}
                          <span className="hidden sm:inline">Copiar Link</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleOpenEllevoSac}
                          className="h-7 px-2.5 text-xs text-primary font-semibold border-primary/30 hover:bg-primary/10 gap-1.5"
                        >
                          <span>Abrir no SAC 0800</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* DESTAQUE PRINCIPAL: DESCRIÇÃO COMPLETA DA SOLICITAÇÃO DO CLIENTE NO 0800 */}
                {cleanDescription ? (
                  <div className="border-b border-primary/20 bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent p-3.5 sm:p-4.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                        Descrição Completa da Solicitação do Cliente no 0800
                      </span>
                      <Badge variant="outline" className="text-[9px] font-bold border-primary/30 bg-background text-primary px-1.5 py-0">
                        Principal
                      </Badge>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-foreground leading-snug break-words">
                      {cleanDescription}
                    </p>
                  </div>
                ) : null}

                {/* Abas: Detalhes do Chamado & Trâmites Recentes */}
                <Tabs defaultValue="detalhes" className="w-full">
                  <div className="px-4 pt-2 border-b border-border/40 overflow-hidden">
                    <TabsList className="h-8 p-0 bg-transparent gap-4 overflow-hidden scrollbar-none select-none">
                      <TabsTrigger
                        value="detalhes"
                        className="h-full py-0 px-2 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
                      >
                        Informações do Chamado
                      </TabsTrigger>
                      <TabsTrigger
                        value="tramites"
                        className="h-full py-0 px-2 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none gap-1.5"
                      >
                        Linha do Tempo de Trâmites
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-bold"
                        >
                          {tramites.length}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Aba 1: Detalhes Enriquecidos */}
                  <TabsContent value="detalhes" className="p-4 space-y-4 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                      {/* Solicitante & Contato */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Solicitante & Contato
                        </p>
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground">
                            {contactInfo.nome}
                          </span>
                        </div>

                        {(contactInfo.telefone || contactInfo.email) && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                            {contactInfo.telefone && (
                              <a
                                href={`tel:${contactInfo.telefone.replace(/\D/g, "")}`}
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors font-medium"
                                title="Discar telefone"
                              >
                                <Phone className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>{contactInfo.telefone}</span>
                              </a>
                            )}

                            {contactInfo.whatsappUrl && (
                              <a
                                href={contactInfo.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/20 transition-colors"
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                                WhatsApp
                              </a>
                            )}

                            {contactInfo.email && (
                              <a
                                href={`mailto:${contactInfo.email}`}
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                                title="Enviar e-mail"
                              >
                                <Mail className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span className="truncate max-w-[170px]">
                                  {contactInfo.email}
                                </span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Criticidade Temática */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Criticidade 0800
                        </p>
                        <div className="pt-0.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                              criticidadeConfig.className
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                criticidadeConfig.dotClass
                              )}
                            />
                            {criticidadeConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Natureza */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Natureza da Solicitação
                        </p>
                        <p className="font-semibold text-foreground">
                          {chamadoEnriquecido?.natureza || "Atendimento Geral / Implantação"}
                        </p>
                      </div>

                      {/* Analista 0800 */}
                      {fullTicket?.analistaResponsavel && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Analista no 0800
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{fullTicket.analistaResponsavel}</span>
                          </div>
                        </div>
                      )}

                      {/* Datas de Abertura / Encerramento */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Abertura & Encerramento
                        </p>
                        <p className="text-xs text-foreground">
                          Aberto em: <strong>{fullTicket?.dataAbertura || fullTicket?.abertoEm?.slice(0, 10) || "—"}</strong>
                        </p>
                        {fullTicket?.dataEncerramento && (
                          <p className="text-xs text-muted-foreground">
                            Encerrado em: <strong>{fullTicket.dataEncerramento}</strong>
                          </p>
                        )}
                      </div>

                      {/* Software / Módulo */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Software / Módulo
                        </p>
                        <div className="pt-0.5">
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold border-primary/30 bg-primary/5 text-primary"
                          >
                            {effectiveSoftware}
                          </Badge>
                        </div>
                      </div>

                      {/* Equipe Ellevo Responsável */}
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Equipe 0800
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {chamadoEnriquecido?.equipeResponsavel ||
                              "Implantação / Suporte Técnico"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Descrição / Solicitação Original */}
                    {effectiveDescription && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-primary" />
                          Descrição Completa da Solicitação do Cliente no 0800
                        </p>
                        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-56 overflow-y-auto">
                          {effectiveDescription}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Aba 2: Linha do Tempo dos Trâmites (1:N) */}
                  <TabsContent value="tramites" className="p-4 space-y-3 mt-0">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Filtrar por texto, autor, equipe ou atividade..."
                          value={searchTramites}
                          onChange={(e) => setSearchTramites(e.target.value)}
                          className="h-8 pl-8 pr-7 text-xs"
                        />
                        {searchTramites && (
                          <button
                            type="button"
                            onClick={() => setSearchTramites("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <span className="text-[11px] text-muted-foreground shrink-0 text-right">
                        Exibindo{" "}
                        <strong className="text-foreground">{filteredTramites.length}</strong> de{" "}
                        {tramites.length} trâmites
                      </span>
                    </div>

                    {tramitesLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span>Carregando linha do tempo de trâmites do Ellevo...</span>
                      </div>
                    ) : tramitesError ? (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive text-center">
                        Não foi possível carregar os trâmites deste chamado.
                      </div>
                    ) : tramites.length === 0 ? (
                      <div className="py-10 text-center text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground/80">
                          Nenhum trâmite sincronizado
                        </p>
                        <p>Ainda não há movimentações registradas no Ellevo para este chamado.</p>
                      </div>
                    ) : filteredTramites.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                        <p>Nenhum trâmite encontrado para "{searchTramites}".</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchTramites("")}
                          className="text-xs text-primary font-semibold h-7"
                        >
                          Limpar filtro de busca
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-2 max-h-[44vh] overflow-y-auto pr-1">
                        {filteredTramites.map((tramite, idx) => {
                          const seqKey =
                            tramite.numeroTramite ?? tramite.sequenciaTramite ?? idx;
                          return (
                            <TimelineItem
                              key={seqKey}
                              tramite={tramite}
                              index={idx}
                              total={filteredTramites.length}
                              isExpanded={expandedTramites.has(seqKey)}
                              onToggleExpand={() => toggleTramiteExpand(seqKey)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}

            

            {/* CARD DO PROJETO SIPLAN HUB (MINIMALISTA + DESTAQUE EM PRODUTOS SECUNDÁRIOS) */}
            {event.projectId && (
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3.5 sm:px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Rocket className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground">
                      Projeto Siplan HUB
                    </span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenProject(stageMeta.stepId)}
                    className="h-7 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 border-primary/30 gap-1.5 shrink-0"
                  >
                    <span>Abrir no HUB</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="p-3.5 sm:p-4 space-y-3">
                  {isProjectLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : (
                    <>
                      {/* GRID MINIMALISTA: Apenas Sistema Principal e Status (Cidade-UF e Health Score removidos) */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-border/60 bg-muted/10 p-2.5 space-y-0.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Sistema Principal
                          </p>
                          <p className="font-semibold text-foreground truncate" title={effectiveSoftware}>
                            {effectiveSoftware}
                          </p>
                        </div>

                        <div className="rounded-lg border border-border/60 bg-muted/10 p-2.5 space-y-0.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Status do Projeto
                          </p>
                          <span
                            className={cn(
                              "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border",
                              globalStatusConfig.label ? globalStatusConfig.badgeClass : "bg-muted text-muted-foreground"
                            )}
                          >
                            {globalStatusConfig.label || "Em Andamento"}
                          </span>
                        </div>
                      </div>

                      {/* DESTAQUE VISUAL ALTO: PRODUTOS SECUNDÁRIOS VINCULADOS */}
                      {((project?.products && project.products.length > 0) ||
                        (project?.secondaryProductsNames && project.secondaryProductsNames.length > 0)) && (
                        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" />
                              Produtos Secundários Vinculados
                            </span>
                            <Badge variant="outline" className="text-[10px] font-bold bg-background text-primary border-primary/30">
                              {(project?.secondaryProductsNames || project?.products || []).length}{" "}
                              {(project?.secondaryProductsNames || project?.products || []).length === 1 ? "produto" : "produtos"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {(project?.secondaryProductsNames || project?.products || []).map((prod) => (
                              <Badge
                                key={prod}
                                variant="secondary"
                                className="text-xs py-1 px-2.5 font-semibold bg-background border border-primary/30 text-foreground shadow-2xs gap-1.5 hover:border-primary transition-colors"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                {prod}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Etapa do projeto (se originado do HUB) */}
                      {stageMeta.isProjectOrigin && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-primary">
                                {stageMeta.stepNumber}: {stageMeta.stageName}
                              </span>
                              {stageMeta.stageStatusText && (
                                <Badge variant="outline" className="text-[10px] font-semibold bg-background">
                                  {stageMeta.stageStatusText}
                                </Badge>
                              )}
                            </div>
                            {stageMeta.locationMode && (
                              <p className="text-[11px] text-muted-foreground">
                                Modalidade: <strong>{stageMeta.locationMode}</strong>
                              </p>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenProject(stageMeta.stepId)}
                            className="h-7 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1 p-0 sm:px-2 justify-start sm:justify-center"
                          >
                            <span>Ir para a etapa no projeto</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* BANNER DE INSTRUÇÕES E REGRA DE NEGÓCIO CLARA (SINCRONIZAÇÃO AUTÔNOMA) */}
            {stageMeta.isProjectOrigin ? (
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-xs leading-snug text-blue-900 dark:text-blue-100">
                      Sincronização 100% Autônoma com o HUB
                    </p>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-blue-200/80 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                      Integridade de Dados
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-900/90 dark:text-blue-200/90">
                    {stageMeta.ruleExplanation}
                  </p>
                  {event.projectId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      onClick={() => handleOpenProject(stageMeta.stepId)}
                      className="p-0 h-auto text-xs font-bold text-blue-700 dark:text-blue-300 gap-1 hover:underline"
                    >
                      Abrir {stageMeta.stepNumber} no Projeto
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ) : event.origin === "vacation" ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <Palmtree className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">Período de Ausência / Férias</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Lançamento sincronizado da escala de férias e ausências programadas da equipe.
                  </p>
                </div>
              </div>
            ) : null}

            {/* OBSERVAÇÕES INTERNAS DO AGENDAMENTO (SANITIZADO CONTRA JSON LEXICAL) */}
            {cleanObservations ? (
              <div className="rounded-xl border border-border/70 bg-muted/10 p-3.5 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Observações / Notas Internas
                </p>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
                  {cleanObservations}
                </p>
              </div>
            ) : null}
          </div>

          {/* RODAPÉ EXECUTIVO COM AÇÕES DE GESTÃO E RBAC */}
          <DialogFooter className="p-3 sm:p-4 border-t border-border/80 bg-muted/20 flex-col sm:flex-row gap-2 sm:justify-between items-center">
            {/* Lado Esquerdo: Ações Destrutivas ou Atalhos do Projeto */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isManualEntry && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canDelete || isDeleting}
                          onClick={() => {
                            if (!canDelete) return;
                            setDeleteBulkMode("single");
                            setDeleteConfirmOpen(true);
                          }}
                          className={cn(
                            "gap-1.5 text-xs w-full sm:w-auto border-destructive/30",
                            canDelete
                              ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                              : "opacity-50 cursor-not-allowed text-muted-foreground"
                          )}
                        >
                          {!canDelete && <Lock className="h-3 w-3" />}
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canDelete && (
                      <TooltipContent side="top">
                        <p className="text-xs">{restrictedTooltip}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}

              {event.projectId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenProject(stageMeta.stepId)}
                  className="gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 border-primary/30 w-full sm:w-auto"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Abrir no HUB
                  {stageMeta.stepNumber && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({stageMeta.stepNumber})
                    </span>
                  )}
                </Button>
              )}
            </div>

            {/* Lado Direito: Editar ou Fechar */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isManualEntry && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          disabled={!canEdit}
                          onClick={() => {
                            if (!canEdit) return;
                            onOpenChange(false);
                            onEdit?.(event);
                          }}
                          className={cn(
                            "gap-1.5 text-xs w-full sm:w-auto",
                            canEdit
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                              : "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {!canEdit && <Lock className="h-3 w-3" />}
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar Agendamento
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canEdit && (
                      <TooltipContent side="top">
                        <p className="text-xs">{restrictedTooltip}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs w-full sm:w-auto"
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO SEGURO DE CONFIRMAÇÃO DE EXCLUSÃO (ALERT DIALOG) */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md p-4 sm:p-6 rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Agendamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Tem certeza que deseja remover o agendamento de{" "}
              <strong className="text-foreground font-semibold">
                {event.clientName || "Cliente não informado"}
              </strong>{" "}
              atribuído a{" "}
              <strong className="text-foreground font-semibold">{event.userName}</strong>{" "}
              no dia{" "}
              <strong className="text-foreground font-semibold">{formattedDate}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Opção Especial para Exclusão em Lote */}
          {event.bulkGroupId && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-3 mt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Agendamento vinculado a uma sequência em lote</span>
              </div>

              <RadioGroup
                value={deleteBulkMode}
                onValueChange={(val) => setDeleteBulkMode(val as "single" | "all")}
                className="gap-2.5"
              >
                <label
                  htmlFor="radio-delete-single"
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer text-xs transition-all",
                    deleteBulkMode === "single"
                      ? "border-primary bg-primary/5 text-foreground font-medium shadow-2xs"
                      : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <RadioGroupItem value="single" id="radio-delete-single" className="mt-0.5" />
                  <div className="space-y-0.5 leading-tight">
                    <p className="font-semibold text-foreground">
                      Excluir apenas o agendamento deste dia ({singleDayFormattedDate})
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Os demais agendamentos da sequência permanecerão preservados na agenda.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="radio-delete-all"
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer text-xs transition-all",
                    deleteBulkMode === "all"
                      ? "border-destructive bg-destructive/10 text-destructive font-medium shadow-2xs"
                      : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <RadioGroupItem
                    value="all"
                    id="radio-delete-all"
                    className="mt-0.5 border-destructive text-destructive"
                  />
                  <div className="space-y-0.5 leading-tight">
                    <p className="font-semibold text-destructive flex items-center gap-1.5">
                      Excluir toda a sequência de agendamentos em lote ({totalBulkDays} dias)
                    </p>
                    <p className="text-[11px] text-destructive/80">
                      Atenção: removerá em definitivo todos os {totalBulkDays} agendamentos gerados
                      simultaneamente neste lote.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-3">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-xs"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Confirmar Exclusão
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
