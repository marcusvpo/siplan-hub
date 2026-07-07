import "dotenv/config";
import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}. Veja o .env.example.`);
  }
  return value;
}

const orionProjectDir = process.env.ORION_PROJECT_DIR || "/opt/Orion.Modelos";

export const config = {
  // Supabase
  supabaseUrl: required("SUPABASE_URL"),
  serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  bucket: process.env.STORAGE_BUCKET || "project-files",

  // Operacional
  workerId: process.env.WORKER_ID || "vm-worker",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 15000),
  jobTimeoutMs: Number(process.env.JOB_TIMEOUT_MS || 1800000),
  maxAttempts: Number(process.env.MAX_ATTEMPTS || 3),

  // Geracao headless (Claude Code + skill criar-modelo-mesclado)
  claudeBin: required("CLAUDE_BIN"),
  orionProjectDir,
  modelosCriadosDir: process.env.MODELOS_CRIADOS_DIR || path.join(orionProjectDir, "modelos_criados"),
  entradaDir: process.env.ENTRADA_DIR || "/home/administrator/siplan_entrada",
};

export type ModelType = "minutas" | "qualificacao_partes" | "qualificacao_imovel" | "clausulas";

export interface Job {
  id: string;
  project_id: string;
  source_file_path: string;
  source_file_name: string;
  model_type: ModelType;
  status: string;
  attempts: number;
}
