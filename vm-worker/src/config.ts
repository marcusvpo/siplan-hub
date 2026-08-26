import "dotenv/config";
import path from "node:path";
import os from "node:os";
import { existsSync, mkdirSync } from "node:fs";

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

// Resolve o Codex CLI instalado como dependencia local do worker. CODEX_BIN
// continua disponivel para instalacoes globais/customizadas na VM.
function resolveCodexBin(): string {
  const explicit = process.env.CODEX_BIN;
  if (explicit) return explicit;

  const localBin = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "codex.cmd" : "codex"
  );
  if (existsSync(localBin)) return localBin;
  return "codex";
}

export function getCodexBin(): string {
  return resolveCodexBin();
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

// Diretorio NEUTRO (vazio) onde o copiloto roda a CLI. Evita que o Codex
// carregue no contexto as instrucoes e skills de /opt/Orion.Modelos (irrelevantes
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
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 60000),
  jobTimeoutMs: Number(process.env.JOB_TIMEOUT_MS || 1800000),
  maxAttempts: Number(process.env.MAX_ATTEMPTS || 3),
  // Quando o Codex bate o limite de sessao/uso, o job NAO vira erro: volta
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
  processoVendaRequestTimeoutMs: Number(process.env.PROCESSO_VENDA_REQUEST_TIMEOUT_MS || 300000),
  chamadosSyncIntervalMs: Number(process.env.CHAMADOS_SYNC_INTERVAL_MS || 300000),
  // Consulta de Chamados usa um espelho separado: atualizacao de fundo mais
  // economica, complementada pelo sync sob demanda disparado pelos filtros.
  processoVendaSyncIntervalMs: Number(process.env.PROCESSO_VENDA_SYNC_INTERVAL_MS || 3600000),
  processoVendaSyncDays: Number(process.env.PROCESSO_VENDA_SYNC_DAYS || 30),
  // Cliente sai do escopo do sync quando todo pos-implantacao dele terminou ha
  // mais dias que isto (o historico ja espelhado permanece).
  chamadosSyncGraceDays: Number(process.env.CHAMADOS_SYNC_GRACE_DAYS || 60),
  // Modelos Codex por carga. Vazios usam o modelo configurado/autenticado na CLI.
  // CODEX_MODEL funciona como default comum; os overrides permitem otimizar custo
  // e latencia sem alterar o codigo do worker.
  chamadosTemaCodexModel:
    process.env.CHAMADOS_TEMA_CODEX_MODEL || process.env.CODEX_MODEL || "",
  dtcCodexModel: process.env.DTC_CODEX_MODEL || process.env.CODEX_MODEL || "",
  copilotCodexModel: process.env.COPILOT_CODEX_MODEL || process.env.CODEX_MODEL || "",
  // Consultas operacionais usam dados estruturados; low reduz latencia e tokens
  // de raciocinio sem afetar a configuracao da geracao de modelos.
  copilotCodexReasoningEffort: process.env.COPILOT_CODEX_REASONING_EFFORT || "low",
  // Diretorio neutro para rodar o copiloto/digest (sem instrucoes/skills do Orion).
  copilotCwd: ensureCopilotCwd(),

  // Ollama e a contingencia local automatica das tarefas de texto.
  ollamaHost: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.1",

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

  // Geracao headless de modelos: sempre Codex, com skill e ferramentas.
  modelCodexModel: process.env.MODEL_CODEX_MODEL || process.env.CODEX_MODEL || "",
  // Texto/copiloto nao precisam escrever arquivos. A geracao de modelos recebe
  // um sandbox separado porque a skill cria artefatos no projeto Orion.
  codexSandbox: process.env.CODEX_SANDBOX || "read-only",
  modelCodexSandbox: process.env.MODEL_CODEX_SANDBOX || "danger-full-access",
  codexBin: getCodexBin(),
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
  project_id: string | null;
  target_field: string;
  status: string;
  attempts: number;
  job_type?: string;
  input_text?: string | null;
  // Caminho do audio no Storage (bucket project-files) para jobs 'voice_note'.
  audio_path?: string | null;
}

// Job do Copiloto Operacional: uma pergunta em linguagem natural sobre o portfolio.
// O worker monta um contexto compacto com as etapas dos projetos e roda o Codex.
export interface CopilotJob {
  id: string;
  user_id: string;
  question: string;
  status: string;
  attempts: number;
  created_at?: string | null;
  // Escopo opcional do portfolio: 'ativos' (so projetos com etapa nao concluida)
  // ou 'todos'/vazio (portfolio inteiro).
  scope?: string | null;
}
