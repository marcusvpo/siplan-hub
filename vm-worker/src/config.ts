import "dotenv/config";
import path from "node:path";
import os from "node:os";
import { existsSync, readdirSync, mkdirSync } from "node:fs";

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

// Cache com revalidacao. Reusa o binario ja resolvido, mas se ele sumir (a
// extensao do VS Code atualizou e apagou a pasta da versao antiga), re-descobre
// o mais novo. Evita `spawn ... ENOENT` em workers de longa duracao apos um
// update da extensao, sem precisar reiniciar o worker.
let cachedClaudeBin: string | null = null;
export function getClaudeBin(): string {
  if (cachedClaudeBin && existsSync(cachedClaudeBin)) return cachedClaudeBin;
  cachedClaudeBin = resolveClaudeBin();
  return cachedClaudeBin;
}

// Papeis deste worker: quais filas ele processa. Permite rodar 2 processos na
// MESMA assinatura (custo zero) sem que a geracao de modelo (lenta, ate 30 min)
// bloqueie melhorar-texto/voz/copiloto.
//   WORKER_ROLES=models  -> so model_generation_jobs
//   WORKER_ROLES=ai      -> so dtc_ai_jobs (texto/voz) + copilot_jobs
//   vazio / 'all'        -> todas as filas (comportamento atual, 1 worker unico)
function parseWorkerRoles(raw?: string): { models: boolean; ai: boolean } {
  const set = new Set(
    (raw || "all").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean)
  );
  const all = set.size === 0 || set.has("all");
  return { models: all || set.has("models"), ai: all || set.has("ai") };
}

const orionProjectDir = process.env.ORION_PROJECT_DIR || "/opt/Orion.Modelos";

// Diretorio NEUTRO (vazio) onde o copiloto roda a CLI. Evita que o Claude Code
// carregue no contexto o CLAUDE.md e as skills de /opt/Orion.Modelos (irrelevantes
// para o Q&A e caros em tokens). Criado no boot.
function ensureCopilotCwd(): string {
  const dir = process.env.COPILOT_CWD || path.join(os.tmpdir(), "siplan-copilot");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* ja existe / sem permissao: cai no default do runSkill */
  }
  return dir;
}

export const config = {
  // Supabase
  supabaseUrl: required("SUPABASE_URL"),
  secretKey: secretKey(),
  bucket: process.env.STORAGE_BUCKET || "project-files",

  // Operacional
  workerId: process.env.WORKER_ID || "vm-worker",
  workerRoles: parseWorkerRoles(process.env.WORKER_ROLES),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 15000),
  jobTimeoutMs: Number(process.env.JOB_TIMEOUT_MS || 1800000),
  maxAttempts: Number(process.env.MAX_ATTEMPTS || 3),
  // Quando o Claude bate o limite de sessao (tokens), o job NAO vira erro: volta
  // para a fila e e retentado automaticamente apos este intervalo (default 15 min),
  // sem consumir tentativa. O worker fica sondando ate os tokens voltarem.
  quotaRetryMs: Number(process.env.QUOTA_RETRY_MS || 900000),
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 30000),

  // Espelho de chamados 0800 (Ellevo -> public.chamados_0800). O SQL Server so
  // e alcancavel de dentro da rede, por isso o sync roda aqui. Desligado quando
  // MSSQL_HOST esta vazio; com 2 workers na mesma VM, configure as vars em UM so
  // (senao os dois sincronizam em dobro, inofensivo mas inutil).
  mssqlHost: process.env.MSSQL_HOST || "",
  mssqlPort: Number(process.env.MSSQL_PORT || 1433),
  mssqlDatabase: process.env.MSSQL_DATABASE || "Siplan_AcessoIA",
  mssqlUser: process.env.MSSQL_USER || "",
  mssqlPassword: process.env.MSSQL_PASSWORD || "",
  chamadosSyncIntervalMs: Number(process.env.CHAMADOS_SYNC_INTERVAL_MS || 300000),
  // Cliente sai do escopo do sync quando todo pos-implantacao dele terminou ha
  // mais dias que isto (o historico ja espelhado permanece).
  chamadosSyncGraceDays: Number(process.env.CHAMADOS_SYNC_GRACE_DAYS || 60),
  // Modelo da classificacao de temas dos chamados (tarefa leve em lote -> haiku).
  chamadosTemaModel: process.env.CHAMADOS_TEMA_MODEL || "haiku",

  // Modelo usado no resumo com IA das "Consideracoes finais" (tarefa leve -> modelo
  // mais rapido que o padrao). Override via DTC_MODEL. Vazio = usa o padrao da CLI.
  dtcModel: process.env.DTC_MODEL || "sonnet",

  // Modelo do Copiloto Operacional (chat sobre o portfolio). Roda pela CLI do
  // Claude Code (mesma assinatura do gerador de modelos, sem chave de API).
  // Tarefa leve de Q&A -> Haiku por padrao. Override via COPILOT_MODEL.
  copilotModel: process.env.COPILOT_MODEL || "haiku",
  // Diretorio neutro para rodar o copiloto/digest (sem CLAUDE.md/skills do Orion).
  copilotCwd: ensureCopilotCwd(),

  // Chave de API opcional para fallback quando a assinatura bate o limite de sessao.
  // Se definida (DTC_FALLBACK_API_KEY), o resumo tenta de novo cobrando via API.
  fallbackApiKey: process.env.DTC_FALLBACK_API_KEY || "",

  // Transcricao de voz (jobs 'voice_note'). whisper.cpp roda LOCALMENTE na VM:
  // sem chave, custo zero por uso, audio nao sai da VM. whisper-cli exige WAV
  // 16kHz mono, entao o audio do navegador (webm/opus, mp4/aac) e convertido
  // antes com ffmpeg. Ajuste os caminhos no .env conforme a instalacao.
  //   WHISPER_BIN    -> binario whisper-cli (ou main) do whisper.cpp compilado
  //   WHISPER_MODEL  -> arquivo ggml do modelo (ex.: ggml-large-v3-turbo.bin)
  //   WHISPER_LANGUAGE -> idioma forcado (default 'pt' -> pt-BR)
  //   FFMPEG_BIN     -> binario do ffmpeg para converter o audio em WAV 16k mono
  whisperBin: process.env.WHISPER_BIN || "whisper-cli",
  whisperModel: process.env.WHISPER_MODEL || "/opt/whisper.cpp/models/ggml-large-v3-turbo.bin",
  whisperLanguage: process.env.WHISPER_LANGUAGE || "pt",
  ffmpegBin: process.env.FFMPEG_BIN || "ffmpeg",

  // Geracao headless (Claude Code + skill criar-modelo-mesclado)
  // Valor inicial (log de boot). O spawn usa getClaudeBin(), que revalida.
  claudeBin: getClaudeBin(),
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
// job_type distingue 'dtc_summary' (padrao) de 'improve_text' (melhorar um texto
// avulso, ex.: Observacoes & Detalhes da etapa 7). input_text carrega o texto de
// entrada nos jobs 'improve_text'.
export interface DtcJob {
  id: string;
  project_id: string;
  target_field: string;
  status: string;
  attempts: number;
  job_type?: string;
  input_text?: string | null;
  // Caminho do audio no Storage (bucket project-files) para jobs 'voice_note'.
  audio_path?: string | null;
}

// Job do Copiloto Operacional: uma pergunta em linguagem natural sobre o portfolio.
// O worker monta um contexto compacto com as etapas dos projetos e roda o Claude.
export interface CopilotJob {
  id: string;
  user_id: string;
  question: string;
  status: string;
  attempts: number;
  // Escopo opcional do portfolio: 'ativos' (so projetos com etapa nao concluida)
  // ou 'todos'/vazio (portfolio inteiro).
  scope?: string | null;
}
