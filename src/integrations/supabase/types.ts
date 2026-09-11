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
      : UntypedSupabaseShape;

export type TablesInsert<TableName extends string> =
  TableName extends "conversion_engines" ? ConversionEngineInsert
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaInsert
      : UntypedSupabaseShape;

export type TablesUpdate<TableName extends string> =
  TableName extends "conversion_engines" ? ConversionEngineUpdate
    : TableName extends "chamados_processo_venda" ? ChamadoProcessoVendaUpdate
      : UntypedSupabaseShape;
