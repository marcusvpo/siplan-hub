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

/**
 * O arquivo gerado do projeto estava vazio antes desta mudança. Estes aliases
 * mantêm os consumidores legados sem tipagem até ser possível regenerar todo o
 * schema, enquanto o novo cadastro de motores permanece tipado explicitamente.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabaseShape = any;

export type Database = UntypedSupabaseShape;

export type Tables<TableName extends string> =
  TableName extends "conversion_engines" ? ConversionEngineRow
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaRow
      : TableName extends "my_day_tasks" ? MyDayTaskRow
        : TableName extends "my_day_preferences" ? MyDayPreferencesRow
          : TableName extends "my_day_boards" ? MyDayBoardRow
            : TableName extends "my_day_board_columns" ? MyDayBoardColumnRow
              : TableName extends "my_day_board_cards" ? MyDayBoardCardRow
                : TableName extends "cs_cx_contacts" ? CsCxContactRow
                  : UntypedSupabaseShape;

export type TablesInsert<TableName extends string> =
  TableName extends "conversion_engines" ? ConversionEngineInsert
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaInsert
      : TableName extends "my_day_tasks" ? MyDayTaskInsert
        : TableName extends "my_day_preferences" ? MyDayPreferencesInsert
          : TableName extends "my_day_boards" ? MyDayBoardInsert
            : TableName extends "my_day_board_columns" ? MyDayBoardColumnInsert
              : TableName extends "my_day_board_cards" ? MyDayBoardCardInsert
                : TableName extends "cs_cx_contacts" ? CsCxContactInsert
                  : UntypedSupabaseShape;

export type TablesUpdate<TableName extends string> =
  TableName extends "conversion_engines" ? ConversionEngineUpdate
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaUpdate
      : TableName extends "my_day_tasks" ? MyDayTaskUpdate
        : TableName extends "my_day_preferences" ? MyDayPreferencesUpdate
          : TableName extends "my_day_boards" ? MyDayBoardUpdate
            : TableName extends "my_day_board_columns" ? MyDayBoardColumnUpdate
              : TableName extends "my_day_board_cards" ? MyDayBoardCardUpdate
                : TableName extends "cs_cx_contacts" ? CsCxContactUpdate
                  : UntypedSupabaseShape;
