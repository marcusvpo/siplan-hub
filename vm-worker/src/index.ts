import { supabase } from "./supabase.js";
import { config, Job, DtcJob } from "./config.js";
import { processJob } from "./processJob.js";
import { processDtcJob } from "./processDtcJob.js";
import { processImproveJob } from "./processImproveJob.js";

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
}

async function markError(table: "model_generation_jobs" | "dtc_ai_jobs", id: string, message: string) {
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
    console.error(`[job ${typedJob.id}] erro:`, msg);
    await markError("model_generation_jobs", typedJob.id, msg);
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
  // compartilham o mesmo pipeline de texto avulso; o restante e o resumo do DTC.
  const isTextJob = typedJob.job_type === "improve_text" || typedJob.job_type === "summary_blocks";
  console.log(`[${isTextJob ? typedJob.job_type : "dtc"} ${typedJob.id}] iniciado (tentativa ${typedJob.attempts})`);
  try {
    if (isTextJob) await processImproveJob(typedJob);
    else await processDtcJob(typedJob);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[dtc ${typedJob.id}] erro:`, msg);
    await markError("dtc_ai_jobs", typedJob.id, msg);
  }
  return true;
}

/**
 * Drena as filas de forma atomica (FOR UPDATE SKIP LOCKED no banco), um job por
 * vez, sob o mesmo flag `busy` (so um Claude roda por vez). Prioriza modelos e
 * intercala com jobs de resumo (DTC) ate ambas as filas esvaziarem.
 */
async function claimAndProcess(): Promise<void> {
  if (busy) return;
  busy = true;
  void sendHeartbeat("busy");
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const gotModel = await claimOneModelJob();
      if (gotModel) continue;
      const gotDtc = await claimOneDtcJob();
      if (!gotDtc) return; // ambas as filas vazias
    }
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
  console.log(`SiplanHUB VM worker iniciado (worker_id=${config.workerId}).`);
  console.log(`Bucket=${config.bucket} | poll=${config.pollIntervalMs}ms | timeout=${config.jobTimeoutMs}ms`);
  console.log(`Claude bin: ${config.claudeBin}`);

  installShutdownHandlers();

  // 0. Heartbeat imediato + periodico (o frontend mostra online/offline)
  await sendHeartbeat("idle", "Worker iniciado");
  setInterval(() => { void sendHeartbeat(busy ? "busy" : "idle"); }, config.heartbeatIntervalMs);

  // 0b. Recupera jobs que ficaram presos em 'processing' de um restart anterior
  await recoverOwnStuckJobs();

  // 1. Realtime: acorda o worker assim que um job e inserido (conexao de SAIDA, sem tunel)
  supabase
    .channel("vm-worker-jobs")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "model_generation_jobs" },
      () => { void claimAndProcess(); }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dtc_ai_jobs" },
      () => { void claimAndProcess(); }
    )
    .subscribe((status) => console.log("Realtime:", status));

  // 2. Polling de fallback: pega jobs perdidos + roda o reaper
  const tick = async () => {
    await reapStuckJobs();
    await claimAndProcess();
  };
  void tick();
  setInterval(() => { void tick(); }, config.pollIntervalMs);
}

void main();
