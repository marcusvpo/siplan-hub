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
  source_system: string;
  target_system: string;
  specialty: "tn_rc" | "protest" | "ri_td" | null;
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
  source_system: string;
  target_system: string;
  specialty?: "tn_rc" | "protest" | "ri_td" | null;
  devops_url?: string | null;
  notes?: string | null;
  status?: "in_development" | "maintenance" | "finished";
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ConversionEngineUpdate = Partial<ConversionEngineInsert>;

/**
 * O arquivo gerado do projeto estava vazio antes desta mudança. Estes aliases
 * mantêm os consumidores legados sem tipagem até ser possível regenerar todo o
 * schema, enquanto o novo cadastro de motores permanece tipado explicitamente.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tables<TableName extends string> = TableName extends "conversion_engines" ? ConversionEngineRow : any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TablesInsert<TableName extends string> = TableName extends "conversion_engines" ? ConversionEngineInsert : any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TablesUpdate<TableName extends string> = TableName extends "conversion_engines" ? ConversionEngineUpdate : any;
