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
          : UntypedSupabaseShape;

export type TablesInsert<TableName extends string> =
  TableName extends "conversion_engines" ? ConversionEngineInsert
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaInsert
      : TableName extends "my_day_tasks" ? MyDayTaskInsert
        : TableName extends "my_day_preferences" ? MyDayPreferencesInsert
          : UntypedSupabaseShape;

export type TablesUpdate<TableName extends string> =
  TableName extends "conversion_engines" ? ConversionEngineUpdate
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaUpdate
      : TableName extends "my_day_tasks" ? MyDayTaskUpdate
        : TableName extends "my_day_preferences" ? MyDayPreferencesUpdate
          : UntypedSupabaseShape;
