export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ConversionEngineRow = {
  id: string;
  queue_id: string | null;
  project_id: string | null;
  source_system: string | null;
  target_system: string | null;
  record_type: "conversion_engine" | "other_tool";
  tool_name: string | null;
  specialty: "tn_rc" | "protest" | "ri_td" | "other" | null;
  devops_url: string | null;
  notes: string | null;
  status: "in_development" | "maintenance" | "finished";
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversionEngineInsert = {
  id?: string;
  queue_id?: string | null;
  project_id?: string | null;
  source_system?: string | null;
  target_system?: string | null;
  record_type?: "conversion_engine" | "other_tool";
  tool_name?: string | null;
  specialty?: "tn_rc" | "protest" | "ri_td" | "other" | null;
  devops_url?: string | null;
  notes?: string | null;
  status?: "in_development" | "maintenance" | "finished";
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ConversionEngineUpdate = Partial<ConversionEngineInsert>;

export type ChamadoProcessoVendaRow = {
  numero_chamado: string;
  codigo_cliente: string | null;
  nome_cliente: string | null;
  razao_social_cliente: string | null;
  data_pedido_venda: string | null;
  numero_pedido_venda: string | null;
  titulo: string | null;
  descricao: string | null;
  natureza: string | null;
  status: string | null;
  software: string | null;
  produto: string | null;
  criticidade: string | null;
  equipe_responsavel: string | null;
  analista_responsavel: string | null;
  data_abertura: string | null;
  data_encerramento: string | null;
  aberto_em: string | null;
  encerrado_em: string | null;
  sla_primeira_resposta_prevista_em: string | null;
  sla_primeira_resposta_real_em: string | null;
  sla_vencimento_em: string | null;
  sla_vencimento_pausado: boolean;
  sla_vencimento_manual: boolean;
  sla_tempo_primeira_resposta_minutos: number | null;
  sla_tempo_vencimento_minutos: number | null;
  sla_tempo_restante_minutos: number | null;
  sla_retorno_previsto_em: string | null;
  sla_retorno_real_em: string | null;
  synced_at: string;
};

export type ChamadoProcessoVendaInsert = Partial<ChamadoProcessoVendaRow> & {
  numero_chamado: string;
};

export type ChamadoProcessoVendaUpdate = Partial<ChamadoProcessoVendaRow>;

export type MyDayTaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_at: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "completed";
  linked_path: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  reminder_minutes: number | null;
  snoozed_until: string | null;
  recurrence_parent_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MyDayTaskInsert = {
  id?: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_at: string;
  priority?: MyDayTaskRow["priority"];
  status?: MyDayTaskRow["status"];
  linked_path?: string | null;
  recurrence?: MyDayTaskRow["recurrence"];
  reminder_minutes?: number | null;
  snoozed_until?: string | null;
  recurrence_parent_id?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MyDayTaskUpdate = Partial<MyDayTaskInsert>;

export type MyDayPreferencesRow = {
  user_id: string;
  density: "compact" | "comfortable";
  widget_order: string[];
  hidden_widgets: string[];
  widget_layout: Json;
  quick_links: string[] | null;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type MyDayPreferencesInsert = {
  user_id: string;
  density?: MyDayPreferencesRow["density"];
  widget_order?: string[];
  hidden_widgets?: string[];
  widget_layout?: Json;
  quick_links?: string[] | null;
  notifications_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type MyDayPreferencesUpdate = Partial<MyDayPreferencesInsert>;

export type MyDayBoardRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type MyDayBoardInsert = {
  id?: string;
  user_id: string;
  name: string;
  description?: string | null;
  color?: string;
  is_default?: boolean;
  position?: number;
  created_at?: string;
  updated_at?: string;
};

export type MyDayBoardUpdate = Partial<MyDayBoardInsert>;

export type MyDayBoardColumnRow = {
  id: string;
  board_id: string;
  user_id: string;
  title: string;
  color: string;
  is_completion: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type MyDayBoardColumnInsert = {
  id?: string;
  board_id: string;
  user_id: string;
  title: string;
  color?: string;
  is_completion?: boolean;
  position?: number;
  created_at?: string;
  updated_at?: string;
};

export type MyDayBoardColumnUpdate = Partial<MyDayBoardColumnInsert>;

export type MyDayBoardCardRow = {
  id: string;
  board_id: string;
  column_id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  due_at: string | null;
  labels: string[];
  checklist: Json;
  linked_path: string | null;
  position: number;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MyDayBoardCardInsert = {
  id?: string;
  board_id: string;
  column_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  priority?: MyDayBoardCardRow["priority"];
  due_at?: string | null;
  labels?: string[];
  checklist?: Json;
  linked_path?: string | null;
  position?: number;
  archived_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MyDayBoardCardUpdate = Partial<MyDayBoardCardInsert>;

export type CsCxContactRow = {
  id: string;
  legacy_id: number | null;
  contact_date: string;
  notes: string | null;
  pending_items: string | null;
  product_id: string;
  contact_person: string;
  contact_details: string | null;
  registry_office_id: string;
  ticket_number: string | null;
  legacy_user_id: number | null;
  author_profile_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  source_hash: string | null;
  source_present: boolean;
  last_synced_at: string;
  origin: "legacy" | "hub";
  is_alert: boolean;
};

export type CsCxContactInsert = {
  id?: string;
  legacy_id?: number | null;
  contact_date: string;
  notes?: string | null;
  pending_items?: string | null;
  product_id: string;
  contact_person: string;
  contact_details?: string | null;
  registry_office_id: string;
  ticket_number?: string | null;
  legacy_user_id?: number | null;
  author_profile_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source_hash?: string | null;
  source_present?: boolean;
  last_synced_at?: string;
  origin?: CsCxContactRow["origin"];
  is_alert?: boolean;
};

export type CsCxContactUpdate = Partial<CsCxContactInsert>;

export type CsCxRegistryOfficeRow = {
  id: string;
  legacy_id: number | null;
  name: string;
  notary_name: string | null;
  sap_code: string | null;
  active: boolean;
  analysis_at: string | null;
  analysis_notes: string | null;
  notes: string | null;
  contact_details: string | null;
  legacy_analyst_user_id: number | null;
  analyst_profile_id: string | null;
  created_at: string | null;
  updated_at: string;
  source_hash: string | null;
  source_present: boolean;
  last_synced_at: string;
  origin: "legacy" | "hub";
  created_by: string | null;
  is_analyzed: boolean;
};

export type CsCxRegistryOfficeInsert = {
  id?: string;
  legacy_id?: number | null;
  name: string;
  notary_name?: string | null;
  sap_code?: string | null;
  active?: boolean;
  analysis_at?: string | null;
  analysis_notes?: string | null;
  notes?: string | null;
  contact_details?: string | null;
  legacy_analyst_user_id?: number | null;
  analyst_profile_id?: string | null;
  created_at?: string | null;
  updated_at?: string;
  source_hash?: string | null;
  source_present?: boolean;
  last_synced_at?: string;
  origin?: CsCxRegistryOfficeRow["origin"];
  created_by?: string | null;
  is_analyzed?: boolean;
};

export type CsCxRegistryOfficeUpdate = Partial<CsCxRegistryOfficeInsert>;

export type CsCxSaveRegistryOfficeV5Args = {
  p_id: string | null;
  p_name: string;
  p_sap_code: string | null;
  p_contact_details: string | null;
  p_notes: string | null;
  p_active: boolean;
  p_products: Json;
  p_responsibles: Json;
  p_responsible_profile_ids: string[];
  p_notary_name: string | null;
};

export type CsCxSaveRegistryOfficeV5Returns = string;

export type OrionUpdateProductRow = {
  id: number;
  name: string;
  slug: "oriontn" | "orionpro" | "orionreg";
  description: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
export type OrionUpdateProductInsert = Omit<OrionUpdateProductRow, "id" | "created_at" | "updated_at"> & {
  id?: number;
  created_at?: string;
  updated_at?: string;
};
export type OrionUpdateProductUpdate = Partial<OrionUpdateProductInsert>;

export type OrionUpdateVersionRow = {
  id: number;
  product_id: number;
  code: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type OrionUpdateVersionInsert = Omit<OrionUpdateVersionRow, "id" | "created_by" | "created_at" | "updated_at"> & {
  id?: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type OrionUpdateVersionUpdate = Partial<OrionUpdateVersionInsert>;

export type OrionUpdateMediaRow = {
  id: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
};
export type OrionUpdateMediaInsert = Omit<OrionUpdateMediaRow, "id" | "uploaded_by" | "created_at"> & {
  id?: string;
  uploaded_by?: string;
  created_at?: string;
};
export type OrionUpdateMediaUpdate = Partial<OrionUpdateMediaInsert>;

export type OrionUpdatePostRow = {
  id: number;
  version_id: number;
  title: string;
  subtitle: string;
  slug: string;
  post_type: "novidade" | "melhoria" | "correcao" | "aviso";
  body: string;
  cover_media_id: string | null;
  status: "rascunho" | "agendado" | "publicado" | "arquivado";
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};
export type OrionUpdatePostInsert = Omit<OrionUpdatePostRow, "id" | "subtitle" | "body" | "status" | "author_id" | "created_at" | "updated_at"> & {
  id?: number;
  subtitle?: string;
  body?: string;
  status?: OrionUpdatePostRow["status"];
  author_id?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type OrionUpdatePostUpdate = Partial<OrionUpdatePostInsert>;

export type OrionUpdateReadRow = {
  post_id: number;
  user_id: string;
  read_at: string;
};
export type OrionUpdateReadInsert = Omit<OrionUpdateReadRow, "user_id" | "read_at"> & {
  user_id?: string;
  read_at?: string;
};
export type OrionUpdateReadUpdate = Partial<OrionUpdateReadInsert>;

export type OrionUpdateReactionRow = {
  post_id: number;
  user_id: string;
  type: "like" | "dislike";
  reason: string | null;
  updated_at: string;
};
export type OrionUpdateReactionInsert = Omit<OrionUpdateReactionRow, "user_id" | "updated_at"> & {
  user_id?: string;
  updated_at?: string;
};
export type OrionUpdateReactionUpdate = Partial<OrionUpdateReactionInsert>;

export type OrionUpdateShareRow = {
  id: string;
  post_id: number;
  user_id: string;
  channel: "copiar" | "nativo";
  created_at: string;
};
export type OrionUpdateShareInsert = Omit<OrionUpdateShareRow, "user_id" | "created_at"> & {
  user_id?: string;
  created_at?: string;
};
export type OrionUpdateShareUpdate = Partial<OrionUpdateShareInsert>;

export type OrionUpdateSuggestionRow = {
  id: string;
  user_id: string;
  name: string;
  registry_office: string;
  suggestion: string;
  created_at: string;
};
export type OrionUpdateSuggestionInsert = Omit<OrionUpdateSuggestionRow, "user_id" | "created_at"> & {
  user_id?: string;
  created_at?: string;
};
export type OrionUpdateSuggestionUpdate = Partial<OrionUpdateSuggestionInsert>;

export type OrionUpdateAuditRow = {
  id: number;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: number | null;
  details: Json;
  created_at: string;
};
export type OrionUpdateAuditInsert = Omit<OrionUpdateAuditRow, "id" | "user_id" | "details" | "created_at"> & {
  id?: number;
  user_id?: string | null;
  details?: Json;
  created_at?: string;
};
export type OrionUpdateAuditUpdate = Partial<OrionUpdateAuditInsert>;

export type SecondaryTicketHubStatus =
  | "pending"
  | "in_progress"
  | "deployed_field"
  | "handed_to_sd"
  | "completed_sd"
  | "blocked_client"
  | "cancelled";

export type SecondaryProductCatalogRow = {
  id: string;
  code: string;
  name: string;
  category: "primary" | "secondary" | "ignored";
  match_patterns: string[];
  only_system_type: string | null;
  requires_orion_admin: boolean;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type SecondaryProductCatalogInsert = Omit<
  SecondaryProductCatalogRow,
  "id" | "match_patterns" | "requires_orion_admin" | "priority" | "active" | "created_at" | "updated_at"
> & {
  id?: string;
  match_patterns?: string[];
  requires_orion_admin?: boolean;
  priority?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};
export type SecondaryProductCatalogUpdate = Partial<SecondaryProductCatalogInsert>;

export type SecondaryTicketRow = {
  id: string;
  ticket_number: string;
  product_code: string | null;
  product_name: string;
  client_name: string;
  codigo_cliente: string | null;
  op_number: number | null;
  sales_order_number: number | null;
  titulo_chamado: string | null;
  hub_status: SecondaryTicketHubStatus;
  responsible: string | null;
  observations: string | null;
  tramited_to_cs: boolean;
  ellevo_status: string | null;
  ellevo_team: string | null;
  ellevo_analyst: string | null;
  ellevo_opened_at: string | null;
  ellevo_closed_at: string | null;
  ellevo_last_tramite: string | null;
  ellevo_last_tramite_at: string | null;
  ellevo_synced_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};
export type SecondaryTicketInsert = {
  id?: string;
  ticket_number: string;
  product_code?: string | null;
  product_name: string;
  client_name: string;
  codigo_cliente?: string | null;
  op_number?: number | null;
  sales_order_number?: number | null;
  titulo_chamado?: string | null;
  hub_status?: SecondaryTicketHubStatus;
  responsible?: string | null;
  observations?: string | null;
  tramited_to_cs?: boolean;
  ellevo_status?: string | null;
  ellevo_team?: string | null;
  ellevo_analyst?: string | null;
  ellevo_opened_at?: string | null;
  ellevo_closed_at?: string | null;
  ellevo_last_tramite?: string | null;
  ellevo_last_tramite_at?: string | null;
  ellevo_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
  updated_by?: string | null;
};
export type SecondaryTicketUpdate = Partial<SecondaryTicketInsert>;

export type ProjectSecondaryTicketLinkRow = {
  project_id: string;
  secondary_ticket_id: string;
  link_source: "auto" | "manual";
  created_at: string;
};
export type ProjectSecondaryTicketLinkInsert = {
  project_id: string;
  secondary_ticket_id: string;
  link_source?: "auto" | "manual";
  created_at?: string;
};
export type ProjectSecondaryTicketLinkUpdate = Partial<ProjectSecondaryTicketLinkInsert>;

export type AutomationDispatchRow = {
  id: string;
  project_id: string | null;
  client_name: string;
  system_type: string;
  automation_type: string;
  dispatched_at: string;
  dispatched_by: string | null;
  metadata: Json | null;
  created_at: string;
};
export type AutomationDispatchInsert = {
  id?: string;
  project_id?: string | null;
  client_name: string;
  system_type: string;
  automation_type?: string;
  dispatched_at?: string;
  dispatched_by?: string | null;
  metadata?: Json | null;
  created_at?: string;
};
export type AutomationDispatchUpdate = Partial<AutomationDispatchInsert>;

export type NotificationRow = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  type: string;
  category: "operational" | "changelog" | "alert" | "system";
  stage: "infra" | "adherence" | "conversion" | "environment" | "implementation" | "post" | "general" | null;
  priority: "urgent" | "high" | "normal" | "low";
  permission_resource: string | null;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
};

export type NotificationInsert = {
  id?: string;
  user_id?: string | null;
  project_id?: string | null;
  type: string;
  category?: NotificationRow["category"];
  stage?: NotificationRow["stage"];
  priority?: NotificationRow["priority"];
  permission_resource?: string | null;
  title: string;
  message: string;
  read?: boolean;
  action_url?: string | null;
  metadata?: Json | null;
  created_at?: string;
  updated_at?: string;
};

export type NotificationUpdate = Partial<NotificationInsert>;

export type UserTopicAffinityRow = {
  user_id: string;
  topic: string;
  action_count: number;
  total_dwell_seconds: number;
  affinity_score: number;
  last_interacted_at: string;
  updated_at: string;
};

export type UserTopicAffinityInsert = {
  user_id: string;
  topic: string;
  action_count?: number;
  total_dwell_seconds?: number;
  affinity_score?: number;
  last_interacted_at?: string;
  updated_at?: string;
};

export type UserTopicAffinityUpdate = Partial<UserTopicAffinityInsert>;

export type InternalIntegrationSecretRow = {
  key_name: string;
  secret_value: string;
  updated_at: string;
};

export type InternalIntegrationSecretInsert = {
  key_name: string;
  secret_value: string;
  updated_at?: string;
};

export type InternalIntegrationSecretUpdate = Partial<InternalIntegrationSecretInsert>;


/**
 * O arquivo gerado do projeto estava vazio antes desta mudança. Estes aliases
 * mantêm os consumidores legados sem tipagem até ser possível regenerar todo o
 * schema, enquanto o novo cadastro de motores permanece tipado explicitamente.
 */

type UntypedSupabaseShape = any;

export type Database = UntypedSupabaseShape;


export type AnalystAgendaEntryRow = {
  id: string;
  user_id: string;
  user_name: string;
  ticket_number: string;
  ticket_catalog: "orion" | "legacy";
  client_name: string;
  client_code: string | null;
  subject: string;
  activity_type: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  observations: string | null;
  ticket_data: Json;
  bulk_group_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalystAgendaEntryInsert = {
  id?: string;
  user_id: string;
  user_name: string;
  ticket_number: string;
  ticket_catalog?: "orion" | "legacy";
  client_name: string;
  client_code?: string | null;
  subject: string;
  activity_type?: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  is_all_day?: boolean;
  observations?: string | null;
  ticket_data?: Json;
  bulk_group_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AnalystAgendaEntryUpdate = Partial<AnalystAgendaEntryInsert>;


export type ProjectRow = {
  id: string;
  client_name: string;
  ticket_number?: string | null;
  system_type?: string | null;
  specialty?: string | null;
  global_status?: string | null;
  overall_progress?: number | null;
  priority?: string | null;
  project_leader?: string | null;
  client_primary_contact?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  start_date_actual?: string | null;
  end_date_actual?: string | null;
  infra_status?: string | null;
  infra_responsible?: string | null;
  infra_start_date?: string | null;
  infra_end_date?: string | null;
  infra_dispatched_at: string | null;
  infra_dispatch_done: boolean | null;
  infra_dispatched_by: string | null;
  adherence_status?: string | null;
  adherence_responsible?: string | null;
  adherence_start_date?: string | null;
  adherence_end_date?: string | null;
  adherence_dispatched_at: string | null;
  adherence_dispatch_done: boolean | null;
  adherence_dispatched_by: string | null;
  environment_status?: string | null;
  environment_responsible?: string | null;
  environment_start_date?: string | null;
  environment_end_date?: string | null;
  environment_dispatched_at: string | null;
  environment_dispatch_done: boolean | null;
  environment_dispatched_by: string | null;
  conversion_status?: string | null;
  conversion_responsible?: string | null;
  conversion_start_date?: string | null;
  conversion_end_date?: string | null;
  conversion_dispatched_at: string | null;
  conversion_dispatch_done: boolean | null;
  conversion_dispatched_by: string | null;
  is_deleted?: boolean | null;
  is_archived?: boolean | null;
  custom_fields?: Json | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

export type ProjectInsert = Partial<ProjectRow>;
export type ProjectUpdate = Partial<ProjectRow>;

export type AssistantKnowledgeFileRow = {
  id: string;
  article_id: string;
  file_path: string;
  file_name: string;
  modulo: string;
  secao: string;
  tem_video: boolean;
  categoria: string;
  sha256_hash: string;
  openai_file_id: string | null;
  vector_store_id: string;
  token_count: number | null;
  sync_status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssistantKnowledgeFileInsert = {
  id?: string;
  article_id: string;
  file_path: string;
  file_name: string;
  modulo: string;
  secao: string;
  tem_video?: boolean;
  categoria: string;
  sha256_hash: string;
  openai_file_id?: string | null;
  vector_store_id?: string;
  token_count?: number | null;
  sync_status?: string;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AssistantKnowledgeFileUpdate = Partial<AssistantKnowledgeFileInsert>;

export type Tables<TableName extends string> =
  TableName extends "projects" ? ProjectRow
    :
  TableName extends "analyst_agenda_entries" ? AnalystAgendaEntryRow
    : TableName extends "conversion_engines" ? ConversionEngineRow
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaRow
      : TableName extends "my_day_tasks" ? MyDayTaskRow
        : TableName extends "my_day_preferences" ? MyDayPreferencesRow
          : TableName extends "my_day_boards" ? MyDayBoardRow
            : TableName extends "my_day_board_columns" ? MyDayBoardColumnRow
              : TableName extends "my_day_board_cards" ? MyDayBoardCardRow
                : TableName extends "cs_cx_contacts" ? CsCxContactRow
                  : TableName extends "cs_cx_registry_offices" ? CsCxRegistryOfficeRow
                  : TableName extends "orion_update_products" ? OrionUpdateProductRow
                    : TableName extends "orion_update_versions" ? OrionUpdateVersionRow
                      : TableName extends "orion_update_media" ? OrionUpdateMediaRow
                        : TableName extends "orion_update_posts" ? OrionUpdatePostRow
                          : TableName extends "orion_update_reads" ? OrionUpdateReadRow
                            : TableName extends "orion_update_reactions" ? OrionUpdateReactionRow
                              : TableName extends "orion_update_shares" ? OrionUpdateShareRow
                                : TableName extends "orion_update_suggestions" ? OrionUpdateSuggestionRow
                                  : TableName extends "orion_update_audit" ? OrionUpdateAuditRow
                                    : TableName extends "secondary_product_catalog" ? SecondaryProductCatalogRow
                                      : TableName extends "secondary_tickets" ? SecondaryTicketRow
                                        : TableName extends "project_secondary_ticket_links" ? ProjectSecondaryTicketLinkRow
                                      : TableName extends "automation_dispatches" ? AutomationDispatchRow
                                         : TableName extends "notifications" ? NotificationRow
                                           : TableName extends "user_topic_affinities" ? UserTopicAffinityRow
                                             : TableName extends "assistant_knowledge_files" ? AssistantKnowledgeFileRow
                                    : UntypedSupabaseShape;

export type TablesInsert<TableName extends string> =
  TableName extends "projects" ? ProjectInsert
    :
  TableName extends "analyst_agenda_entries" ? AnalystAgendaEntryInsert
    : TableName extends "conversion_engines" ? ConversionEngineInsert
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaInsert
      : TableName extends "my_day_tasks" ? MyDayTaskInsert
        : TableName extends "my_day_preferences" ? MyDayPreferencesInsert
          : TableName extends "my_day_boards" ? MyDayBoardInsert
            : TableName extends "my_day_board_columns" ? MyDayBoardColumnInsert
              : TableName extends "my_day_board_cards" ? MyDayBoardCardInsert
                : TableName extends "cs_cx_contacts" ? CsCxContactInsert
                  : TableName extends "cs_cx_registry_offices" ? CsCxRegistryOfficeInsert
                  : TableName extends "orion_update_products" ? OrionUpdateProductInsert
                    : TableName extends "orion_update_versions" ? OrionUpdateVersionInsert
                      : TableName extends "orion_update_media" ? OrionUpdateMediaInsert
                        : TableName extends "orion_update_posts" ? OrionUpdatePostInsert
                          : TableName extends "orion_update_reads" ? OrionUpdateReadInsert
                            : TableName extends "orion_update_reactions" ? OrionUpdateReactionInsert
                              : TableName extends "orion_update_shares" ? OrionUpdateShareInsert
                                : TableName extends "orion_update_suggestions" ? OrionUpdateSuggestionInsert
                                  : TableName extends "orion_update_audit" ? OrionUpdateAuditInsert
                                    : TableName extends "secondary_product_catalog" ? SecondaryProductCatalogInsert
                                      : TableName extends "secondary_tickets" ? SecondaryTicketInsert
                                        : TableName extends "project_secondary_ticket_links" ? ProjectSecondaryTicketLinkInsert
                                      : TableName extends "automation_dispatches" ? AutomationDispatchInsert
                                         : TableName extends "notifications" ? NotificationInsert
                                           : TableName extends "user_topic_affinities" ? UserTopicAffinityInsert
                                             : TableName extends "assistant_knowledge_files" ? AssistantKnowledgeFileInsert
                                    : UntypedSupabaseShape;

export type TablesUpdate<TableName extends string> =
  TableName extends "projects" ? ProjectUpdate
    :
  TableName extends "analyst_agenda_entries" ? AnalystAgendaEntryUpdate
    : TableName extends "conversion_engines" ? ConversionEngineUpdate
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaUpdate
      : TableName extends "my_day_tasks" ? MyDayTaskUpdate
        : TableName extends "my_day_preferences" ? MyDayPreferencesUpdate
          : TableName extends "my_day_boards" ? MyDayBoardUpdate
            : TableName extends "my_day_board_columns" ? MyDayBoardColumnUpdate
              : TableName extends "my_day_board_cards" ? MyDayBoardCardUpdate
                : TableName extends "cs_cx_contacts" ? CsCxContactUpdate
                  : TableName extends "cs_cx_registry_offices" ? CsCxRegistryOfficeUpdate
                  : TableName extends "orion_update_products" ? OrionUpdateProductUpdate
                    : TableName extends "orion_update_versions" ? OrionUpdateVersionUpdate
                      : TableName extends "orion_update_media" ? OrionUpdateMediaUpdate
                        : TableName extends "orion_update_posts" ? OrionUpdatePostUpdate
                          : TableName extends "orion_update_reads" ? OrionUpdateReadUpdate
                            : TableName extends "orion_update_reactions" ? OrionUpdateReactionUpdate
                              : TableName extends "orion_update_shares" ? OrionUpdateShareUpdate
                                : TableName extends "orion_update_suggestions" ? OrionUpdateSuggestionUpdate
                                  : TableName extends "orion_update_audit" ? OrionUpdateAuditUpdate
                                    : TableName extends "secondary_product_catalog" ? SecondaryProductCatalogUpdate
                                      : TableName extends "secondary_tickets" ? SecondaryTicketUpdate
                                        : TableName extends "project_secondary_ticket_links" ? ProjectSecondaryTicketLinkUpdate
                                      : TableName extends "automation_dispatches" ? AutomationDispatchUpdate
                                         : TableName extends "notifications" ? NotificationUpdate
                                           : TableName extends "user_topic_affinities" ? UserTopicAffinityUpdate
                                             : TableName extends "assistant_knowledge_files" ? AssistantKnowledgeFileUpdate
                                    : UntypedSupabaseShape;
