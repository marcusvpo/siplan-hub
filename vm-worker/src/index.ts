import { supabase } from "./supabase.js";
import { config, Job } from "./config.js";
import { processJob } from "./processJob.js";

let busy = false;

async function markError(job: Job, message: string) {
  await supabase
    .from("model_generation_jobs")
    .update({
      status: "error",
      error_message: message.slice(0, 2000),
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .then(undefined, (e) => console.error("Falha ao marcar erro:", e));
}

/**
 * Reivindica UM job pendente de forma atomica (FOR UPDATE SKIP LOCKED no banco)
 * e o processa. Nunca dois workers pegam o mesmo job.
 */
async function claimAndProcess(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    // Loop enquanto houver jobs pendentes
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: job, error } = await supabase.rpc("claim_model_generation_job", {
        p_worker_id: config.workerId,
      });
      if (error) {
        console.error("Erro no claim:", error.message);
        return;
      }
      // A RPC retorna um composite; sem job pendente o PostgREST devolve
      // null OU um objeto com todos os campos null. Tratamos os dois casos.
      const typedJob = job as Job | null;
      if (!typedJob || !typedJob.id) return;
      console.log(`[job ${typedJob.id}] iniciado (${typedJob.model_type}, tentativa ${typedJob.attempts})`);
      try {
        await processJob(typedJob);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[job ${typedJob.id}] erro:`, msg);
        await markError(typedJob, msg);
      }
    }
  } finally {
    busy = false;
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
}

function main() {
  console.log(`SiplanHUB VM worker iniciado (worker_id=${config.workerId}).`);
  console.log(`Bucket=${config.bucket} | poll=${config.pollIntervalMs}ms | timeout=${config.jobTimeoutMs}ms`);

  // 1. Realtime: acorda o worker assim que um job e inserido (conexao de SAIDA, sem tunel)
  supabase
    .channel("vm-worker-jobs")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "model_generation_jobs" },
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

main();
