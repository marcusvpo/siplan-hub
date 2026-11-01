import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  UnifiedAgendaEvent,
  AgendaActivityType,
} from "@/types/agenda";
import {
  Clock,
  User,
  ChevronRight,
  Briefcase,
  FileText,
  Laptop,
  Rocket,
  ArrowUpRight,
  Info,
  Layers,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getAnalystPalette,
  cleanRichTextOrJson,
} from "@/lib/agenda-view-helpers";

export type AgendaDensity = "compact" | "normal" | "expanded";

export type AgendaEventCategory =
  | "implantacao_confirmada"
  | "implantacao_prevista"
  | "visita_qualidade"
  | "chamado_orion"
  | "chamado_legado"
  | "aderencia_homologacao"
  | "apoio_configuracao"
  | "ferias_ausencia";

export interface AgendaCategoryVisual {
  category: AgendaEventCategory;
  label: string;
  borderClass: string;
  borderLeftClass: string;
  bgSurfaceClass: string;
  bgHoverClass: string;
  badgeClass: string;
  dotColorClass: string;
  textAccentClass: string;
}

/**
 * Mapeamento das categorias de agendamento conforme diretriz de design e WCAG 2.1 AA:
 * Cores vibrantes com fundo translúcido (bgSurfaceClass), bordas contrastantes e tarja lateral de 4px
 */
export const AGENDA_CATEGORY_STYLES: Record<AgendaEventCategory, AgendaCategoryVisual> = {
  implantacao_confirmada: {
    category: "implantacao_confirmada",
    label: "Implantação Confirmada",
    borderClass: "border-emerald-300 dark:border-emerald-800",
    borderLeftClass: "border-l-4 border-l-emerald-600 dark:border-l-emerald-400",
    bgSurfaceClass: "bg-emerald-50/90 dark:bg-emerald-950/45",
    bgHoverClass: "hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50",
    badgeClass:
      "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700",
    dotColorClass: "bg-emerald-500",
    textAccentClass: "text-emerald-700 dark:text-emerald-300",
  },
  implantacao_prevista: {
    category: "implantacao_prevista",
    label: "Implantação Prevista",
    borderClass: "border-amber-300 dark:border-amber-800",
    borderLeftClass: "border-l-4 border-l-amber-500 dark:border-l-amber-400",
    bgSurfaceClass: "bg-amber-50/90 dark:bg-amber-950/45",
    bgHoverClass: "hover:bg-amber-100/90 dark:hover:bg-amber-900/50",
    badgeClass:
      "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
    dotColorClass: "bg-amber-500",
    textAccentClass: "text-amber-800 dark:text-amber-300",
  },
  visita_qualidade: {
    category: "visita_qualidade",
    label: "Visita de Qualidade",
    borderClass: "border-rose-300 dark:border-rose-800",
    borderLeftClass: "border-l-4 border-l-rose-500 dark:border-l-rose-400",
    bgSurfaceClass: "bg-rose-50/90 dark:bg-rose-950/45",
    bgHoverClass: "hover:bg-rose-100/90 dark:hover:bg-rose-900/50",
    badgeClass:
      "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700",
    dotColorClass: "bg-rose-500",
    textAccentClass: "text-rose-700 dark:text-rose-300",
  },
  chamado_orion: {
    category: "chamado_orion",
    label: "Chamado Orion",
    borderClass: "border-blue-300 dark:border-blue-800",
    borderLeftClass: "border-l-4 border-l-blue-600 dark:border-l-blue-400",
    bgSurfaceClass: "bg-blue-50/90 dark:bg-blue-950/45",
    bgHoverClass: "hover:bg-blue-100/90 dark:hover:bg-blue-900/50",
    badgeClass:
      "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700",
    dotColorClass: "bg-blue-600",
    textAccentClass: "text-blue-700 dark:text-blue-300",
  },
  chamado_legado: {
    category: "chamado_legado",
    label: "Chamado Legado",
    borderClass: "border-orange-300 dark:border-orange-800",
    borderLeftClass: "border-l-4 border-l-orange-500 dark:border-l-orange-400",
    bgSurfaceClass: "bg-orange-50/90 dark:bg-orange-950/45",
    bgHoverClass: "hover:bg-orange-100/90 dark:hover:bg-orange-900/50",
    badgeClass:
      "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700",
    dotColorClass: "bg-orange-500",
    textAccentClass: "text-orange-700 dark:text-orange-300",
  },
  aderencia_homologacao: {
    category: "aderencia_homologacao",
    label: "Aderência / Homologação",
    borderClass: "border-indigo-300 dark:border-indigo-800",
    borderLeftClass: "border-l-4 border-l-indigo-600 dark:border-l-indigo-400",
    bgSurfaceClass: "bg-indigo-50/90 dark:bg-indigo-950/45",
    bgHoverClass: "hover:bg-indigo-100/90 dark:hover:bg-indigo-900/50",
    badgeClass:
      "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700",
    dotColorClass: "bg-indigo-600",
    textAccentClass: "text-indigo-700 dark:text-indigo-300",
  },
  apoio_configuracao: {
    category: "apoio_configuracao",
    label: "Apoio SD / Configuração",
    borderClass: "border-teal-300 dark:border-teal-800",
    borderLeftClass: "border-l-4 border-l-teal-500 dark:border-l-teal-400",
    bgSurfaceClass: "bg-teal-50/90 dark:bg-teal-950/45",
    bgHoverClass: "hover:bg-teal-100/90 dark:hover:bg-teal-900/50",
    badgeClass:
      "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-700",
    dotColorClass: "bg-teal-500",
    textAccentClass: "text-teal-700 dark:text-teal-300",
  },
  ferias_ausencia: {
    category: "ferias_ausencia",
    label: "Férias / Ausência",
    borderClass: "border-amber-300 dark:border-amber-800",
    borderLeftClass: "border-l-4 border-l-amber-500 dark:border-l-amber-400",
    bgSurfaceClass: "bg-amber-100/90 dark:bg-amber-950/60",
    bgHoverClass: "hover:bg-amber-200/90 dark:hover:bg-amber-900/60",
    badgeClass:
      "bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
    dotColorClass: "bg-amber-500",
    textAccentClass: "text-amber-800 dark:text-amber-300",
  },
};

/**
 * Classifica um evento unificado na sua categoria visual correspondente.
 */
export function getAgendaEventCategory(event: UnifiedAgendaEvent): AgendaEventCategory {
  if (event.origin === "vacation" || (event.activityType as string) === "ferias" || (event.activityType as string) === "banco_horas" || event.activityType === "compensacao_horas") {
    return "ferias_ausencia";
  }

  if (
    (event.origin as string) === "adherence_stage" ||
    event.origin === "adherence" ||
    event.origin === "conversion_homologation" ||
    event.activityType === "aderencia" ||
    event.activityType === "homologacao"
  ) {
    return "aderencia_homologacao";
  }

  if (event.origin === "phase1_implementation" || event.activityType === "implantacao") {
    if (event.isConfirmed) {
      return "implantacao_confirmada";
    }
    return "implantacao_prevista";
  }

  if (event.activityType === "visita_qualidade") {
    return "visita_qualidade";
  }

  if (event.ticketCatalog === "legacy" || (event.activityType as string) === "chamado_legado") {
    return "chamado_legado";
  }

  if (
    event.activityType === "apoio_sd" ||
    event.activityType === "configuracao" ||
    event.activityType === "migracao"
  ) {
    return "apoio_configuracao";
  }

  return "chamado_orion";
}

/**
 * Traduz o tipo de atividade para exibição limpa.
 */
export function formatActivityType(type?: AgendaActivityType | string): string {
  switch (type) {
    case "chamado":
    case "chamado_orion":
      return "Chamado Orion";
    case "chamado_legado":
      return "Chamado Legado";
    case "implantacao":
      return "Implantação";
    case "visita_qualidade":
      return "Visita de Qualidade";
    case "aderencia":
      return "Análise de Aderência";
    case "homologacao":
      return "Homologação de Conversão";
    case "apoio_sd":
      return "Apoio ao SD";
    case "treinamento":
      return "Treinamento";
    case "configuracao":
      return "Configuração";
    case "migracao":
      return "Migração";
    case "banco_horas":
      return "Compensação de Horas";
    case "ferias":
      return "Férias";
    case "reuniao":
      return "Reunião";
    case "outros":
      return "Outros";
    default:
      return type || "Atividade";
  }
}

export interface AgendaCardProps {
  /** Evento unificado da agenda */
  event: UnifiedAgendaEvent;
  /** Densidade visual do card: compact (mês), normal (semana/dia), expanded (destaque) */
  density?: AgendaDensity;
  /** Callback acionado ao clicar no card */
  onClick?: (event: UnifiedAgendaEvent) => void;
  /** Classes CSS adicionais */
  className?: string;
  /** Se deve forçar a exibição do nome do analista */
  showAnalyst?: boolean;
  /** Se deve exibir horário de início/fim */
  showTime?: boolean;
  /** Se deve desativar o hover card de tooltip */
  showTooltip?: boolean;
  /** Lista de responsáveis filtrados na toolbar (para distinção visual multicolor) */
  selectedUserNames?: string[];
}

export function getCatalogBadge(event: { origin?: string; ticketCatalog?: string }) {
  if (event.origin === "vacation") {
    return {
      label: "RH",
      className:
        "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200",
    };
  }
  if (event.ticketCatalog === "legacy") {
    return {
      label: "Legado",
      className:
        "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-200",
    };
  }
  return {
    label: "Orion",
    className:
      "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200",
  };
}

export function AgendaCard({
  event,
  density = "normal",
  onClick,
  className,
  showAnalyst = false,
  showTime = true,
  showTooltip = true,
  selectedUserNames = [],
}: AgendaCardProps) {
  const category = useMemo(() => getAgendaEventCategory(event), [event]);
  const visualConfig = AGENDA_CATEGORY_STYLES[category];

  // Paleta multicolor para distinção clara quando há mais de 1 analista filtrado
  const analystPalette = useMemo(
    () => getAnalystPalette(event.userName, selectedUserNames),
    [event.userName, selectedUserNames]
  );

  const cleanObservations = useMemo(
    () => cleanRichTextOrJson(event.observations),
    [event.observations]
  );

  const ticketDesc = useMemo(() => {
    const raw =
      (event.ticketData as any)?.descricao ||
      (event.ticketData as any)?.assunto ||
      (event.ticketData as any)?.titulo;
    return cleanRichTextOrJson(raw);
  }, [event.ticketData]);

  const systemBadge = useMemo(() => {
    return (
      event.systemType ||
      (event.ticketData as any)?.software ||
      (event.ticketData as any)?.produto ||
      null
    );
  }, [event.systemType, event.ticketData]);

  const contactName = useMemo(() => {
    const raw = (event.ticketData as any)?.solicitante;
    if (!raw) return null;
    return String(raw).split(" ")[0];
  }, [event.ticketData]);

  // Identifica exclusivamente atividades de Implantação (Fase 1 Treinamento & Acompanhamento)
  const isImplementationEvent = useMemo(() => {
    return (
      event.origin === "phase1_implementation" ||
      event.activityType === "implantacao"
    );
  }, [event.origin, event.activityType]);

  // Desativa tooltips flutuantes em larguras touch (< 768px) para evitar conflitos de toque
  const isTouchScreen = typeof window !== "undefined" && window.innerWidth < 768;
  const enableTooltip = showTooltip && !isTouchScreen;

  // Rótulo de horário amigável
  const timeLabel = useMemo(() => {
    if (!showTime) return null;
    if (event.isAllDay) return "Dia todo";
    if (event.startTime && event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    }
    if (event.startTime) return `${event.startTime}`;
    return null;
  }, [event.isAllDay, event.startTime, event.endTime, showTime]);

  // Badge do catálogo / sistema
  const catalogBadge = useMemo(() => getCatalogBadge(event), [event.origin, event.ticketCatalog]);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(event);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Não intercepta se o foco estiver explicitamente no link do chamado
    if ((e.target as HTMLElement).tagName.toLowerCase() === "a") {
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(event);
    }
  };

  const ariaLabel = `${event.clientName || "Cliente"} - ${
    event.ticketNumber ? "Chamado #" + event.ticketNumber : visualConfig.label
  } - ${event.subject || formatActivityType(event.activityType)}`;

  // Estrutura principal do card
  const cardBody = (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className={cn(
        "group relative flex flex-col justify-start rounded-lg border shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99] select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:shadow-md hover:ring-1 hover:ring-primary/25 touch-manipulation",
        visualConfig.borderClass,
        analystPalette ? analystPalette.borderLeftClass : visualConfig.borderLeftClass,
        analystPalette ? analystPalette.ringClass : "",
        visualConfig.bgSurfaceClass,
        visualConfig.bgHoverClass,
        density === "compact" && "p-1.5 gap-1 min-h-[54px]",
        density === "normal" && "p-2.5 gap-1.5 min-h-[82px]",
        density === "expanded" && "p-3 gap-2 min-h-[110px]",
        className
      )}
    >
      {/* LINHA 1: Nome do Cliente com truncamento suave + badge sutil de catálogo & Analista */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span
          className={cn(
            "truncate font-bold text-foreground text-left leading-tight",
            density === "compact" && "text-[11px]",
            density === "normal" && "text-xs",
            density === "expanded" && "text-sm"
          )}
          title={event.clientName || "Cliente não informado"}
        >
          {event.clientName || "Cliente não informado"}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {analystPalette && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] font-bold border shadow-2xs select-none",
                analystPalette.badgeBg
              )}
              title={`Responsável: ${event.userName}`}
            >
              <span
                className={cn(
                  "h-3 w-3 rounded-full flex items-center justify-center text-[7px] font-extrabold text-white shrink-0",
                  analystPalette.avatarBg
                )}
              >
                {event.userName
                  ? event.userName
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()
                  : "??"}
              </span>
              <span className="truncate max-w-[55px] sm:max-w-[75px]">
                {event.userName ? event.userName.split(" ")[0] : "Analista"}
              </span>
            </span>
          )}

          <span
            className={cn(
              "shrink-0 rounded-[4px] border font-bold uppercase tracking-wider leading-none select-none",
              catalogBadge.className,
              density === "compact" ? "text-[9px] px-1 py-0.5" : "text-[9px] px-1.5 py-0.5"
            )}
          >
            {catalogBadge.label}
          </span>
        </div>
      </div>

      {/* LINHA 2: #Número do Chamado (EllevoTicketLink com stopPropagation) + Horário / Metadados */}
      <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
        {event.ticketNumber ? (
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <EllevoTicketLink
              ticketNumber={event.ticketNumber}
              className={cn(
                "font-semibold text-primary hover:text-primary transition-colors hover:underline min-w-0 truncate py-0.5",
                density === "compact" ? "text-[10px]" : "text-[11px]"
              )}
              title={`Abrir chamado #${event.ticketNumber} no Ellevo`}
            />
          </div>
        ) : (
          <span className="text-[10px] italic text-muted-foreground truncate">
            {event.origin === "vacation"
              ? "Ausência RH"
              : event.origin === "phase1_implementation"
              ? "Implantação HUB"
              : "Sem chamado"}
          </span>
        )}

        {timeLabel && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-foreground/85 bg-background/60 px-1.5 py-0.5 rounded border border-border/50 shrink-0">
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
            {timeLabel}
          </span>
        )}
      </div>

      {/* LINHA 3: Assunto / Atividade */}
      <div className="min-w-0">
        <p
          className={cn(
            "text-foreground/90 leading-snug",
            density === "compact" && "truncate text-[10px]",
            density === "normal" && "line-clamp-2 text-[11px] font-medium",
            density === "expanded" && "text-xs font-semibold text-foreground mt-0.5 line-clamp-2"
          )}
          title={event.subject || formatActivityType(event.activityType)}
        >
          {event.subject || formatActivityType(event.activityType)}
        </p>
      </div>

      {/* Complemento para Modo Expandido: Preenchimento Executivo Rico para Cards Longos / Dia Todo */}
      {density === "expanded" && (
        <div className="flex-1 flex flex-col justify-between pt-1 gap-2 min-h-0 z-10">
          <div className="space-y-2">
            {/* ROTEIRO OPERACIONAL DA JORNADA INTEGRAL (EXCLUSIVO PARA CARDS DE IMPLANTAÇÃO / FASE 1) */}
            {event.isAllDay && isImplementationEvent && (
              <div className="rounded-lg border border-border/60 bg-background/75 backdrop-blur-xs p-2.5 space-y-2 text-left shadow-2xs">
                <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1.5">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Briefcase className="h-3 w-3" />
                    Expediente Integral
                  </span>
                  <span className="text-foreground/90 font-mono font-bold text-[10px]">08:30 às 17:30</span>
                </div>

                {/* Timeline vertical minimalista e limpa dos marcos operacionais */}
                <div className="relative pl-3 space-y-1.5 text-[9px] before:absolute before:left-1 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary/25">
                  <div className="relative flex items-center">
                    <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="font-medium text-foreground/90">08:30 — Início & Alinhamento</span>
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="font-medium text-amber-700 dark:text-amber-300">12:30 — Almoço / Pausa</span>
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="font-medium text-foreground/90">13:30 — Retomada de Atividades</span>
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">17:30 — Encerramento do Dia</span>
                  </div>
                </div>
              </div>
            )}

            {/* ESCOPO DA ATIVIDADE / SOLICITAÇÃO DO CLIENTE */}
            {ticketDesc && ticketDesc !== event.subject && (
              <div className="rounded-md border border-border/40 bg-background/50 p-2 space-y-0.5 text-left">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5 text-primary" />
                  Escopo da Atividade
                </span>
                <p className="text-[10px] text-foreground/85 leading-relaxed line-clamp-3">
                  {ticketDesc}
                </p>
              </div>
            )}

            {/* CHIPS DE METADADOS: SISTEMA / CÓDIGO / SOLICITANTE */}
            <div className="flex flex-wrap items-center gap-1 text-[9px]">
              {systemBadge && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/70 text-foreground font-semibold border border-border/50">
                  <Laptop className="h-2.5 w-2.5 text-primary" />
                  {systemBadge}
                </span>
              )}
              {event.clientCode && (
                <span className="px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground font-mono border border-border/40">
                  Cód: {event.clientCode}
                </span>
              )}
              {contactName && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground border border-border/40 truncate max-w-[140px]">
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                  {contactName}
                </span>
              )}
              {event.bulkGroupId && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-300/40 font-bold">
                  <Layers className="h-2.5 w-2.5" />
                  Lote
                </span>
              )}
            </div>

            {/* OBSERVAÇÕES / NOTAS INTERNAS */}
            {cleanObservations && (
              <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-1.5 text-[10px] space-y-0.5">
                <span className="font-bold text-[9px] text-primary uppercase tracking-wider flex items-center gap-1">
                  <Info className="h-2.5 w-2.5" />
                  Nota Interna
                </span>
                <p className="text-muted-foreground line-clamp-3 italic">
                  "{cleanObservations}"
                </p>
              </div>
            )}
          </div>

          {/* RODAPÉ DO CARD EXPANDIDO: ANALISTA, STATUS E LINK DE AÇÃO */}
          <div className="mt-auto pt-2 border-t border-border/50 flex items-center justify-between gap-1 text-muted-foreground text-[10px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="h-5 w-5 shrink-0 text-[8px] border border-border/60">
                <AvatarFallback className={cn("font-bold text-white", analystPalette?.avatarBg || "bg-primary")}>
                  {event.userName
                    ? event.userName
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()
                    : "??"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-semibold text-foreground text-[11px]">
                {event.userName || "Não atribuído"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {event.status && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    visualConfig.badgeClass
                  )}
                >
                  {event.status}
                </span>
              )}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* MARCA D'ÁGUA TEMÁTICA TRANSLÚCIDA NO FUNDO (PREENCHE A PROFUNDIDADE VISUAL) */}
      {density === "expanded" && (
        <div className="absolute right-1 bottom-1 pointer-events-none opacity-[0.035] dark:opacity-[0.05] group-hover:opacity-[0.07] transition-opacity duration-300">
          {event.activityType === "implantacao" || event.origin === "phase1_implementation" ? (
            <Rocket className="h-24 w-24 text-foreground" />
          ) : event.activityType === "aderencia" || event.activityType === "homologacao" ? (
            <FileText className="h-24 w-24 text-foreground" />
          ) : (
            <Laptop className="h-24 w-24 text-foreground" />
          )}
        </div>
      )}

      {/* Micro-indicação de Analista em modo Normal quando showAnalyst = true */}
      {density === "normal" && showAnalyst && event.userName && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate pt-0.5">
          <User className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate font-medium">{event.userName}</span>
        </div>
      )}
    </div>
  );

  if (!enableTooltip) {
    return cardBody;
  }

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{cardBody}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="z-50 max-w-xs p-3 text-xs shadow-md border bg-popover text-popover-foreground rounded-lg animate-in fade-in-50 duration-150"
        >
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
              <span className="font-bold text-foreground truncate max-w-[190px]">
                {event.clientName || "Cliente"}
              </span>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase",
                  catalogBadge.className
                )}
              >
                {catalogBadge.label}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{event.ticketNumber ? `Chamado #${event.ticketNumber}` : "Sem chamado"}</span>
              <span className="font-medium text-foreground/80">
                {timeLabel || "Dia todo"}
              </span>
            </div>

            <p className="font-semibold text-foreground/95 leading-tight pt-0.5">
              {event.subject || formatActivityType(event.activityType)}
            </p>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{event.userName}</span>
            </div>

            {cleanObservations && (
              <p className="border-t border-border/40 pt-1 text-[10px] italic text-muted-foreground line-clamp-3">
                "{cleanObservations}"
              </p>
            )}

            <div className="border-t border-border/60 pt-1.5 flex items-center justify-between text-[10px]">
              <span className={cn("font-bold", visualConfig.textAccentClass)}>
                {visualConfig.label}
              </span>
              <span className="font-medium text-muted-foreground flex items-center gap-0.5">
                Clique para mais detalhes <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
