import { supabase } from "./supabase.js";
import { config, Job, DtcJob, CopilotJob } from "./config.js";
import { processJob } from "./processJob.js";
import { processDtcJob } from "./processDtcJob.js";
import { processImproveJob } from "./processImproveJob.js";
import { processVoiceJob } from "./processVoiceJob.js";
import { processCopilotJob } from "./processCopilotJob.js";
import { generateDailyDigest } from "./processCopilotDigest.js";
import { startChamadosSync } from "./chamadosSync.js";

let busy = false;

/**
 * Heartbeat: o frontend le model_worker_heartbeat para mostrar "Gerador online/offline".
 * Upsert periodico + nas transicoes de ocupado/ocioso. Best-effort (nunca lanca).
 */
async function sendHeartbeat(status: "idle" | "busy" | "stopping", note?: string): Promise<void> {
  try {
    await supabase.from("model_worker_heartbeat").upsert({
      worker_id: config.workerId,
      status,
      last_seen: new Date().toISOString(),
      note: note ?? null,
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Recuperacao no boot: como so existe um worker, qualquer job em 'processing'
 * apos um restart esta orfao (o Claude foi morto junto). Devolve para a fila
 * imediatamente (sem esperar o timeout de 30 min do reaper), respeitando MAX_ATTEMPTS.
 */
async function recoverOwnStuckJobs(): Promise<void> {
  const { error: reqErr } = await supabase
    .from("model_generation_jobs")
    .update({ status: "pending", worker_id: null, started_at: null })
    .eq("status", "processing")
    .eq("worker_id", config.workerId)
    .lt("attempts", config.maxAttempts);
  if (reqErr) console.error("Erro ao recuperar jobs orfaos (requeue):", reqErr.message);

  const { error: errErr } = await supabase
    .from("model_generation_jobs")
    .update({
      status: "error",
      error_message: "Worker reiniciado durante a geracao (tentativas esgotadas).",
      finished_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .eq("worker_id", config.workerId)
    .gte("attempts", config.maxAttempts);
  if (errErr) console.error("Erro ao marcar jobs orfaos como erro:", errErr.message);

  // Mesma recuperacao para os jobs de resumo com IA (dtc_ai_jobs)
  const { error: dtcReqErr } = await supabase
    .from("dtc_ai_jobs")
    .update({ status: "pending", worker_id: null, started_at: null })
    .eq("status", "processing")
    .eq("worker_id", config.workerId)
    .lt("attempts", config.maxAttempts);
  if (dtcReqErr) console.error("Erro ao recuperar jobs DTC orfaos (requeue):", dtcReqErr.message);

  const { error: dtcErrErr } = await supabase
    .from("dtc_ai_jobs")
    .update({
      status: "error",
      error_message: "Worker reiniciado durante a geracao (tentativas esgotadas).",
      finished_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .eq("worker_id", config.workerId)
    .gte("attempts", config.maxAttempts);
  if (dtcErrErr) console.error("Erro ao marcar jobs DTC orfaos como erro:", dtcErrErr.message);

  // Mesma recuperacao para os jobs do Copiloto (copilot_jobs)
  const { error: coReqErr } = await supabase
    .from("copilot_jobs")
    .update({ status: "pending", worker_id: null, started_at: null })
    .eq("status", "processing")
    .eq("worker_id", config.workerId)
    .lt("attempts", config.maxAttempts);
  if (coReqErr) console.error("Erro ao recuperar jobs Copiloto orfaos (requeue):", coReqErr.message);

  const { error: coErrErr } = await supabase
    .from("copilot_jobs")
    .update({
      status: "error",
      error_message: "Worker reiniciado durante a geracao (tentativas esgotadas).",
      finished_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .eq("worker_id", config.workerId)
    .gte("attempts", config.maxAttempts);
  if (coErrErr) console.error("Erro ao marcar jobs Copiloto orfaos como erro:", coErrErr.message);
}

async function markError(table: "model_generation_jobs" | "dtc_ai_jobs" | "copilot_jobs", id: string, message: string) {
  await supabase
    .from(table)
    .update({
      status: "error",
      error_message: message.slice(0, 2000),
      finished_at: new Date().toISOString(),
    })
    .eq("id", id)
    .then(undefined, (e) => console.error("Falha ao marcar erro:", e));
}

// Assinatura de "acabaram os tokens": o Claude encerra com "session/usage limit"
// (ex.: "You've hit your session limit · resets 11:10pm"). NAO e bug do modelo,
// entao nao vale marcar erro definitivo -> vale reenfileirar e retentar depois.
const QUOTA_LIMIT_RE = /(session|usage) limit|hit your (session|usage) limit|limite de (sess|uso)/i;
function isQuotaExhausted(message: string): boolean {
  return QUOTA_LIMIT_RE.test(message);
}

/**
 * Bateu o limite de sessao: devolve o job para a fila (status 'pending') com
 * `retry_after` no futuro e SEM consumir a tentativa (desfaz o +1 do claim).
 * O claim so pega jobs cujo retry_after ja passou -> o worker retenta sozinho
 * assim que os tokens voltarem. O job aparece "na fila" no front (nao vira erro).
 */
async function requeueForQuota(
  table: "model_generation_jobs" | "dtc_ai_jobs" | "copilot_jobs",
  id: string,
  attempts: number
): Promise<void> {
  const retryAfter = new Date(Date.now() + config.quotaRetryMs).toISOString();
  const minutes = Math.round(config.quotaRetryMs / 60000);
  await supabase
    .from(table)
    .update({
      status: "pending",
      worker_id: null,
      started_at: null,
      attempts: Math.max(0, attempts - 1), // desfaz o incremento do claim
      retry_after: retryAfter,
      error_message: null,
      progress: `Limite de sessao do Claude atingido (tokens esgotados). Retomarei automaticamente assim que os tokens voltarem (nova tentativa em ~${minutes} min).`,
    })
    .eq("id", id)
    .then(undefined, (e) => console.error("Falha ao reenfileirar por quota:", e));
  console.log(`[job ${id}] limite de sessao -> reenfileirado, proxima tentativa apos ${retryAfter}`);
}

// Assinatura de "timeout": a geracao passou de JOB_TIMEOUT_MS e o runSkill abortou
// (ex.: "Timeout: a geracao excedeu 1800000 ms"). Diferente de quota: aqui a tentativa
// E consumida (o retry e limitado por MAX_ATTEMPTS para nao rodar 30 min em loop).
const TIMEOUT_RE = /geracao excedeu \d+ ms|timeout: a geracao/i;
function isTimeout(message: string): boolean {
  return TIMEOUT_RE.test(message);
}

/**
 * Erro retentavel (ex.: timeout): devolve o job para a fila (status 'pending')
 * mantendo o contador de tentativas (o claim ja incrementou), para retentar ate
 * MAX_ATTEMPTS. Retorna true se reenfileirou; false se as tentativas se esgotaram
 * (nesse caso o chamador marca 'error' definitivo).
 */
async function requeueForRetry(
  table: "model_generation_jobs" | "dtc_ai_jobs" | "copilot_jobs",
  id: string,
  attempts: number,
  reason: string
): Promise<boolean> {
  if (attempts >= config.maxAttempts) return false; // esgotou -> deixa virar erro
  await supabase
    .from(table)
    .update({
      status: "pending",
      worker_id: null,
      started_at: null,
      retry_after: new Date().toISOString(), // elegivel de imediato
      error_message: null,
      progress: `${reason} Retentando automaticamente (tentativa ${attempts + 1} de ${config.maxAttempts})...`,
    })
    .eq("id", id)
    .then(undefined, (e) => console.error("Falha ao reenfileirar para retry:", e));
  console.log(`[job ${id}] ${reason} -> reenfileirado (tentativa ${attempts}/${config.maxAttempts})`);
  return true;
}

// Reivindica e processa UM job de modelo. Retorna true se pegou algum.
async function claimOneModelJob(): Promise<boolean> {
  const { data: job, error } = await supabase.rpc("claim_model_generation_job", {
    p_worker_id: config.workerId,
  });
  if (error) {
    console.error("Erro no claim (modelo):", error.message);
    return false;
  }
  // Sem job pendente o PostgREST devolve null OU objeto com campos null.
  const typedJob = job as Job | null;
  if (!typedJob || !typedJob.id) return false;
  console.log(`[job ${typedJob.id}] iniciado (${typedJob.model_type}, tentativa ${typedJob.attempts})`);
  try {
    await processJob(typedJob);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isQuotaExhausted(msg)) {
      await requeueForQuota("model_generation_jobs", typedJob.id, typedJob.attempts);
    } else if (
      isTimeout(msg) &&
      (await requeueForRetry("model_generation_jobs", typedJob.id, typedJob.attempts, "Timeout na geracao do modelo."))
    ) {
      console.warn(`[job ${typedJob.id}] timeout -> reenfileirado para nova tentativa`);
    } else {
      console.error(`[job ${typedJob.id}] erro:`, msg);
      await markError("model_generation_jobs", typedJob.id, msg);
    }
  }
  return true;
}

// Reivindica e processa UM job de resumo com IA (DTC). Retorna true se pegou algum.
async function claimOneDtcJob(): Promise<boolean> {
  const { data: job, error } = await supabase.rpc("claim_dtc_ai_job", {
    p_worker_id: config.workerId,
  });
  if (error) {
    console.error("Erro no claim (dtc):", error.message);
    return false;
  }
  const typedJob = job as DtcJob | null;
  if (!typedJob || !typedJob.id) return false;
  // improve_text (melhorar um bloco) e summary_blocks (resumo geral da etapa 7)
  // compartilham o mesmo pipeline de texto avulso; voice_note transcreve+eleva um
  // audio; o restante e o resumo do DTC.
  const isVoiceJob = typedJob.job_type === "voice_note";
  const isTextJob = typedJob.job_type === "improve_text" || typedJob.job_type === "summary_blocks";
  const kind = isVoiceJob ? "voice" : isTextJob ? typedJob.job_type : "dtc";
  console.log(`[${kind} ${typedJob.id}] iniciado (tentativa ${typedJob.attempts})`);
  try {
    if (isVoiceJob) await processVoiceJob(typedJob);
    else if (isTextJob) await processImproveJob(typedJob);
    else await processDtcJob(typedJob);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isQuotaExhausted(msg)) {
      await requeueForQuota("dtc_ai_jobs", typedJob.id, typedJob.attempts);
    } else {
      console.error(`[dtc ${typedJob.id}] erro:`, msg);
      await markError("dtc_ai_jobs", typedJob.id, msg);
    }
  }
  return true;
}

// Reivindica e processa UM job do Copiloto. Retorna true se pegou algum.
async function claimOneCopilotJob(): Promise<boolean> {
  const { data: job, error } = await supabase.rpc("claim_copilot_job", {
    p_worker_id: config.workerId,
  });
  if (error) {
    console.error("Erro no claim (copilot):", error.message);
    return false;
  }
  const typedJob = job as CopilotJob | null;
  if (!typedJob || !typedJob.id) return false;
  console.log(`[copilot ${typedJob.id}] iniciado (tentativa ${typedJob.attempts})`);
  try {
    await processCopilotJob(typedJob);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isQuotaExhausted(msg)) {
      await requeueForQuota("copilot_jobs", typedJob.id, typedJob.attempts);
    } else {
      console.error(`[copilot ${typedJob.id}] erro:`, msg);
      await markError("copilot_jobs", typedJob.id, msg);
    }
  }
  return true;
}

/**
 * Drena as filas de forma atomica (FOR UPDATE SKIP LOCKED no banco), um job por
 * vez, sob o mesmo flag `busy` (so um Claude roda por vez). Prioriza modelos e
 * intercala com jobs de resumo (DTC) e do Copiloto ate todas as filas esvaziarem.
 */
async function claimAndProcess(): Promise<void> {
  if (busy) return;
  busy = true;
  void sendHeartbeat("busy");
  try {
    while (true) {
      // Modelos (lento) so se este worker tiver o papel 'models'.
      if (config.workerRoles.models && (await claimOneModelJob())) continue;
      // Texto/voz/copiloto (rapido) so se tiver o papel 'ai'.
      if (config.workerRoles.ai) {
        if (await claimOneDtcJob()) continue;
        if (await claimOneCopilotJob()) continue;
      }
      return; // nenhuma fila deste worker tem job pendente
    }
  } finally {
    busy = false;
    void sendHeartbeat("idle");
  }
}

/**
 * Resumo diario do portfolio: gera 1x/dia (a partir das 6h) quando o worker esta
 * ocioso. Usa o mesmo flag `busy` para nao rodar dois Claude ao mesmo tempo.
 */
async function maybeDailyDigest(): Promise<void> {
  if (busy) return;
  if (new Date().getHours() < 6) return; // evita gerar de madrugada
  busy = true;
  void sendHeartbeat("busy");
  try {
    await generateDailyDigest();
  } catch (err) {
    console.error("Erro no resumo diario:", err instanceof Error ? err.message : err);
  } finally {
    busy = false;
    void sendHeartbeat("idle");
  }
}

/**
 * Reaper: devolve jobs travados (worker morto em processing) para a fila,
 * respeitando MAX_ATTEMPTS. Roda junto do polling.
 */
async function reapStuckJobs(): Promise<void> {
  const { error } = await supabase.rpc("requeue_stuck_model_jobs", {
    p_timeout_seconds: Math.ceil(config.jobTimeoutMs / 1000),
    p_max_attempts: config.maxAttempts,
  });
  if (error) console.error("Erro no reaper:", error.message);

  const { error: dtcError } = await supabase.rpc("requeue_stuck_dtc_ai_jobs", {
    p_timeout_seconds: Math.ceil(config.jobTimeoutMs / 1000),
    p_max_attempts: config.maxAttempts,
  });
  if (dtcError) console.error("Erro no reaper (dtc):", dtcError.message);

  const { error: copilotError } = await supabase.rpc("requeue_stuck_copilot_jobs", {
    p_timeout_seconds: Math.ceil(config.jobTimeoutMs / 1000),
    p_max_attempts: config.maxAttempts,
  });
  if (copilotError) console.error("Erro no reaper (copilot):", copilotError.message);
}

// Encerramento limpo: marca o heartbeat como 'stopping' para o selo virar offline na hora.
function installShutdownHandlers() {
  const shutdown = async (sig: string) => {
    console.log(`Recebido ${sig}, encerrando...`);
    await sendHeartbeat("stopping", "Worker encerrando");
    process.exit(0);
  };
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
}

async function main() {
  const roles = [config.workerRoles.models && "models", config.workerRoles.ai && "ai"].filter(Boolean).join("+") || "nenhum";
  console.log(`SiplanHUB VM worker iniciado (worker_id=${config.workerId}, papeis=${roles}).`);
  console.log(`Bucket=${config.bucket} | poll=${config.pollIntervalMs}ms | timeout=${config.jobTimeoutMs}ms`);
  console.log(`Claude bin: ${config.claudeBin}`);

  installShutdownHandlers();

  // 0. Heartbeat imediato + periodico (o frontend mostra online/offline)
  await sendHeartbeat("idle", "Worker iniciado");
  setInterval(() => { void sendHeartbeat(busy ? "busy" : "idle"); }, config.heartbeatIntervalMs);

  // 0b. Recupera jobs que ficaram presos em 'processing' de um restart anterior
  await recoverOwnStuckJobs();

  // 0c. Espelho de chamados 0800 (Ellevo -> chamados_0800). Timer proprio, nao
  //     disputa o flag `busy` (nao envolve Claude). No-op sem MSSQL_* no .env.
  startChamadosSync();

  // 1. Realtime: acorda o worker assim que um job e inserido (conexao de SAIDA, sem
  //    tunel). So assina as tabelas das filas que ESTE worker processa (por papel).
  let channel = supabase.channel(`vm-worker-jobs-${config.workerId}`);
  if (config.workerRoles.models) {
    channel = channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "model_generation_jobs" },
      () => { void claimAndProcess(); }
    );
  }
  if (config.workerRoles.ai) {
    channel = channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dtc_ai_jobs" },
        () => { void claimAndProcess(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "copilot_jobs" },
        () => { void claimAndProcess(); }
      );
  }
  channel.subscribe((status) => console.log("Realtime:", status));

  // 2. Polling de fallback: pega jobs perdidos + roda o reaper + resumo diario
  const tick = async () => {
    await reapStuckJobs();
    await claimAndProcess();
    // O resumo diario do portfolio e tarefa do copiloto -> so o worker 'ai'.
    if (config.workerRoles.ai) await maybeDailyDigest();
  };
  void tick();
  setInterval(() => { void tick(); }, config.pollIntervalMs);
}

void main();
