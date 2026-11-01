import type { Chamado0800 } from "@/hooks/useChamados0800";

export type TicketCatalog = "orion" | "legacy";

export type AgendaActivityType =
  | "chamado"
  | "implantacao"
  | "visita_qualidade"
  | "aderencia"
  | "homologacao"
  | "configuracao"
  | "migracao"
  | "treinamento"
  | "apoio_sd"
  | "compensacao_horas"
  | "reuniao"
  | "outro";

export interface AnalystAgendaEntry {
  id: string;
  userId: string;
  userName: string;
  ticketNumber: string;
  ticketCatalog: TicketCatalog;
  clientName: string;
  clientCode?: string | null;
  subject: string;
  activityType: AgendaActivityType;
  date: string; // yyyy-mm-dd
  startTime?: string | null; // hh:mm ou hh:mm:ss
  endTime?: string | null;
  isAllDay: boolean;
  observations?: string | null;
  ticketData?: Partial<Chamado0800> | Record<string, unknown> | null;
  bulkGroupId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewAgendaEntryInput {
  userId: string;
  userName: string;
  ticketNumber: string;
  ticketCatalog: TicketCatalog;
  clientName: string;
  clientCode?: string | null;
  subject: string;
  activityType: AgendaActivityType;
  date: string; // yyyy-mm-dd (ou data inicial para bulk)
  endDate?: string | null; // Para cadastro em lote (bulk)
  startTime?: string | null;
  endTime?: string | null;
  isAllDay: boolean;
  observations?: string | null;
  ticketData?: Partial<Chamado0800> | Record<string, unknown> | null;
  includeWeekendsAndHolidays?: boolean;
}

/**
 * Evento unificado renderizado no calendário da Agenda Siplan.
 * Pode ser originado de:
 * - 'manual_entry': Lançamento manual gravado na tabela analyst_agenda_entries
 * - 'phase1_implementation': Fase 1 do HUB (desdobrado 1 card por dia)
 * - 'adherence': Etapa 2 de Análise de Aderência
 * - 'conversion_homologation': Etapa 3 de Homologação da Conversão
 * - 'environment_preparation': Etapa 4 de Preparação de Ambiente & Infraestrutura
 * - 'vacation': Férias cadastradas em implantador_vacations
 */
export type AgendaEventOrigin =
  | "manual_entry"
  | "phase1_implementation"
  | "adherence"
  | "conversion_homologation"
  | "environment_preparation"
  | "vacation";

export interface UnifiedAgendaEvent {
  id: string;
  origin: AgendaEventOrigin;
  date: string; // yyyy-mm-dd
  userId?: string;
  userName: string;
  ticketNumber?: string;
  ticketCatalog?: TicketCatalog;
  clientName: string;
  clientCode?: string | null;
  subject: string;
  activityType: AgendaActivityType;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay: boolean;
  status?: string; // status do chamado ou da implantação
  colorClass?: string;
  observations?: string | null;
  projectId?: string;
  systemType?: string;
  isConfirmed?: boolean;
  ticketData?: Partial<Chamado0800> | null;
  rawEntryId?: string; // ID da linha em analyst_agenda_entries, se houver
  bulkGroupId?: string | null;
}

/**
 * Converte um UnifiedAgendaEvent em um AnalystAgendaEntry completo para edição
 */
export function unifiedEventToAgendaEntry(
  event: UnifiedAgendaEvent,
  extraTicketData?: Partial<Chamado0800> | null
): AnalystAgendaEntry {
  const rawId = event.rawEntryId || event.id.replace(/^manual-/, "");
  const mergedTicketData = (event.ticketData || extraTicketData || null) as any;

  return {
    id: rawId,
    userId: event.userId || "",
    userName: event.userName,
    ticketNumber: event.ticketNumber || "",
    ticketCatalog: event.ticketCatalog || "orion",
    clientName: event.clientName || mergedTicketData?.nomeCliente || "",
    clientCode: event.clientCode || mergedTicketData?.codigoCliente || null,
    subject: event.subject || mergedTicketData?.titulo || "",
    activityType: event.activityType,
    date: event.date,
    startTime: event.startTime || null,
    endTime: event.endTime || null,
    isAllDay: event.isAllDay,
    observations: event.observations || null,
    ticketData: mergedTicketData,
    bulkGroupId: event.bulkGroupId || null,
    createdBy: null,
    createdAt: "",
    updatedAt: "",
  };
}
