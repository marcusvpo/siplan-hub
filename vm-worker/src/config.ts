import "dotenv/config";
import path from "node:path";
import os from "node:os";
import { existsSync, readdirSync } from "node:fs";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}. Veja o .env.example.`);
  }
  return value;
}

// Chave secreta do Supabase (ignora RLS). Preferimos a nova, revogavel (sb_secret_...),
// via SUPABASE_SECRET_KEY; aceitamos SUPABASE_SERVICE_ROLE_KEY por compatibilidade.
function secretKey(): string {
  const value = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error(
      "Variavel de ambiente obrigatoria ausente: SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY). Veja o .env.example."
    );
  }
  return value;
}

// Resolve o binario do Claude Code. Se CLAUDE_BIN estiver setado e existir, usa.
// Senao (ou se o caminho ficou obsoleto apos um update da extensao), procura o
// binario nativo MAIS NOVO da extensao do VS Code automaticamente -> zero manutencao
// quando a extensao atualiza e o numero de versao no caminho muda.
function resolveClaudeBin(): string {
  const explicit = process.env.CLAUDE_BIN;
  if (explicit && existsSync(explicit)) return explicit;

  const extDir =
    process.env.VSCODE_EXT_DIR ||
    path.join(os.homedir(), ".vscode-server", "extensions");
  try {
    const found = readdirSync(extDir)
      .filter((d) => d.startsWith("anthropic.claude-code-"))
      .map((d) => path.join(extDir, d, "resources", "native-binary", "claude"))
      .filter((bin) => existsSync(bin))
      // ordena pela versao no nome da pasta (desc) -> mais novo primeiro
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    if (found.length > 0) return found[0];
  } catch {
    /* pasta de extensoes inexistente: cai no erro abaixo */
  }

  throw new Error(
    explicit
      ? `CLAUDE_BIN (${explicit}) nao existe e nao encontrei o binario da extensao em ${extDir}. Reconfira o .env.`
      : `Nao encontrei o binario do Claude Code em ${extDir}. Instale a extensao ou defina CLAUDE_BIN no .env.`
  );
}

const orionProjectDir = process.env.ORION_PROJECT_DIR || "/opt/Orion.Modelos";

export const config = {
  // Supabase
  supabaseUrl: required("SUPABASE_URL"),
  secretKey: secretKey(),
  bucket: process.env.STORAGE_BUCKET || "project-files",

  // Operacional
  workerId: process.env.WORKER_ID || "vm-worker",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 15000),
  jobTimeoutMs: Number(process.env.JOB_TIMEOUT_MS || 1800000),
  maxAttempts: Number(process.env.MAX_ATTEMPTS || 3),
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 30000),

  // Modelo usado no resumo com IA das "Consideracoes finais" (tarefa leve -> modelo
  // mais rapido que o padrao). Override via DTC_MODEL. Vazio = usa o padrao da CLI.
  dtcModel: process.env.DTC_MODEL || "sonnet",

  // Chave de API opcional para fallback quando a assinatura bate o limite de sessao.
  // Se definida (DTC_FALLBACK_API_KEY), o resumo tenta de novo cobrando via API.
  fallbackApiKey: process.env.DTC_FALLBACK_API_KEY || "",

  // Geracao headless (Claude Code + skill criar-modelo-mesclado)
  claudeBin: resolveClaudeBin(),
  orionProjectDir,
  modelosCriadosDir: process.env.MODELOS_CRIADOS_DIR || path.join(orionProjectDir, "modelos_criados"),
  entradaDir: process.env.ENTRADA_DIR || "/home/administrator/siplan_entrada",
};

export type ModelType = "minutas" | "traslado" | "livro" | "qualificacao_partes" | "qualificacao_imovel" | "clausulas";

export interface Job {
  id: string;
  project_id: string;
  source_file_path: string;
  source_file_name: string;
  model_type: ModelType;
  status: string;
  attempts: number;
}

// Job de geracao com IA das "Consideracoes finais" da Transicao (DTC).
export interface DtcJob {
  id: string;
  project_id: string;
  target_field: string;
  status: string;
  attempts: number;
}
