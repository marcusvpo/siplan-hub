import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { supabase } from "./supabase.js";
import { config, DtcJob } from "./config.js";
import { runSkill, ProgressStep } from "./runSkill.js";

const MAX_LOG_STEPS = 80;
const PROGRESS_FLUSH_MS = 2500;

// Prompt de polimento de ditado por voz. Diferente do 'improve_text' comum: a
// entrada e uma transcricao bruta de fala (sem pontuacao confiavel, com hesitacoes,
// repeticoes e possiveis erros do reconhecimento). Pedimos ao Claude que limpe e
// eleve, mas SEM inventar fatos.
function buildVoicePrompt(transcript: string): string {
  return `Voce e um redator profissional. O TEXTO ORIGINAL abaixo e a transcricao bruta de um audio ditado por um analista de implantacao (fala espontanea, transcrita automaticamente). Reescreva-o como um relato escrito rico, claro, bem estruturado, bem pontuado e com portugues formal e profissional.

REGRAS:
- Preserve INTEGRALMENTE o sentido, os fatos, nomes, datas e numeros ditados. NAO invente, NAO acrescente e NAO remova informacoes.
- Remova hesitacoes, repeticoes, muletas ("ne", "tipo", "entao assim") e falsos comecos tipicos da fala.
- Corrija provaveis erros de transcricao quando o contexto tornar a intencao obvia; na duvida, mantenha.
- Portugues do Brasil. Nao adicione preambulo, titulo geral, nem comentarios sobre o que voce mudou.
- Estruture o conteudo: agrupe por assunto em paragrafos e, sempre que houver enumeracao (etapas, itens, setores, pendencias), use listas.

FORMATACAO (Markdown leve — USE de forma ativa para destacar o que importa, sem exagerar a ponto de quase tudo ficar marcado):
- **negrito** para termos-chave, nomes de sistemas/setores, decisoes, entregas e resultados.
- __sublinhado__ para pontos criticos, prazos e pendencias que exigem atencao.
- *italico* para observacoes secundarias e ressalvas.
- Listas com "- " no inicio da linha; listas numeradas com "1." quando houver ordem/sequencia.
Nao use titulos com "#", nem tabelas, nem blocos de codigo.

Objetivo: um texto que um gestor leia e entenda rapidamente o que foi feito, com os pontos-chave saltando aos olhos pela formatacao — sempre fiel ao que foi ditado.

Responda SOMENTE com o texto reescrito, sem aspas e sem qualquer texto adicional.

=== TEXTO ORIGINAL (transcricao do audio) ===
${transcript}
=== FIM DO TEXTO ORIGINAL ===`;
}

// Executa um comando externo (ffmpeg / whisper-cli) e resolve com o codigo de
// saida e o stderr acumulado. Usado para converter o audio e transcrever.
function runCommand(
  bin: string,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      reject(err);
      return;
    }
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

/**
 * Pipeline de um job 'voice_note' (ja marcado 'processing' pelo claim):
 * baixa o audio do Storage -> converte para WAV 16kHz mono com ffmpeg ->
 * transcreve LOCALMENTE com whisper.cpp -> passa a transcricao pelo Claude para
 * gerar um texto profissional -> grava em result_text -> done.
 *
 * Claude Code headless nao ingere audio: quem "ouve" e o whisper.cpp; o Claude
 * apenas eleva o texto transcrito. Lanca em falha; o loop principal marca 'error'.
 */
export async function processVoiceJob(job: DtcJob): Promise<void> {
  const steps: ProgressStep[] = [];
  let currentText = "";
  let lastFlush = 0;

  const flushProgress = async (force = false): Promise<void> => {
    const now = Date.now();
    if (!force && now - lastFlush < PROGRESS_FLUSH_MS) return;
    lastFlush = now;
    try {
      await supabase
        .from("dtc_ai_jobs")
        .update({
          progress: currentText || null,
          progress_log: steps.slice(-MAX_LOG_STEPS),
          progress_updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    } catch {
      /* best-effort */
    }
  };

  const record = (step: ProgressStep): void => {
    currentText = step.text;
    steps.push(step);
    void flushProgress(false);
  };
  const pushStep = (text: string, kind: ProgressStep["kind"] = "system"): void =>
    record({ at: new Date().toISOString(), text, kind });

  if (!job.audio_path) {
    throw new Error("Job de voz sem audio_path (nenhum audio para transcrever).");
  }

  // Diretorio temporario isolado por job (limpo no final).
  const workDir = await mkdtemp(path.join(tmpdir(), "siplan-voice-"));
  const rawPath = path.join(workDir, "input" + (path.extname(job.audio_path) || ".webm"));
  const wavPath = path.join(workDir, "audio.wav");
  const outBase = path.join(workDir, "transcript");

  try {
    // 1. Baixar o audio do Storage
    pushStep("Baixando o audio gravado...");
    await flushProgress(true);
    const { data: blob, error: dlError } = await supabase.storage
      .from(config.bucket)
      .download(job.audio_path);
    if (dlError || !blob) {
      throw new Error(`Falha ao baixar o audio (${job.audio_path}): ${dlError?.message || "vazio"}`);
    }
    await writeFile(rawPath, Buffer.from(await blob.arrayBuffer()));

    // 2. Converter para WAV 16kHz mono (formato exigido pelo whisper.cpp)
    pushStep("Preparando o audio para transcricao...");
    await flushProgress(true);
    const ff = await runCommand(config.ffmpegBin, [
      "-y",
      "-i", rawPath,
      "-ar", "16000",
      "-ac", "1",
      "-f", "wav",
      wavPath,
    ]);
    if (ff.code !== 0) {
      throw new Error(`ffmpeg falhou (codigo ${ff.code}): ${ff.stderr.slice(-600)}`);
    }

    // 3. Transcrever localmente com whisper.cpp (sem chave, sem dado saindo da VM)
    pushStep("Transcrevendo o audio com o whisper (local)...");
    await flushProgress(true);
    const wh = await runCommand(config.whisperBin, [
      "-m", config.whisperModel,
      "-f", wavPath,
      "-l", config.whisperLanguage,
      "-otxt",
      "-of", outBase,
      "-nt", // sem timestamps: transcript limpo
    ]);
    if (wh.code !== 0) {
      throw new Error(`whisper.cpp falhou (codigo ${wh.code}): ${wh.stderr.slice(-600)}`);
    }

    // whisper-cli grava o texto em <outBase>.txt; fallback para stdout.
    let transcript = "";
    try {
      transcript = (await readFile(outBase + ".txt", "utf8")).trim();
    } catch {
      transcript = wh.stdout.trim();
    }
    if (transcript.replace(/[^a-zA-Z0-9]/g, "").length < 3) {
      throw new Error("Nao consegui entender o audio. Grave novamente em ambiente mais silencioso.");
    }

    // 4. Elevar a transcricao com o Claude (mesmo que ja roda na VM)
    pushStep("Gerando o texto profissional com IA...");
    await flushProgress(true);

    const shouldCancel = async (): Promise<boolean> => {
      const { data } = await supabase
        .from("dtc_ai_jobs")
        .select("cancel_requested")
        .eq("id", job.id)
        .single();
      return !!data?.cancel_requested;
    };

    const prompt = buildVoicePrompt(transcript);
    let { resultText, transcript: log, code, stderr, cancelled } = await runSkill(
      prompt,
      (step) => record(step),
      shouldCancel,
      { model: config.dtcModel || undefined }
    );
    await flushProgress(true);

    if (cancelled) {
      pushStep("Geracao cancelada pelo usuario.", "system");
      await flushProgress(true);
      await supabase
        .from("dtc_ai_jobs")
        .update({ status: "cancelled", finished_at: new Date().toISOString(), cancel_requested: false })
        .eq("id", job.id);
      console.log(`[voice ${job.id}] cancelado pelo usuario`);
      return;
    }

    // Fallback: limite de sessao da assinatura + API key -> tenta via API.
    const hitSessionLimit = /(session|usage) limit|hit your (session|usage) limit|limite de sess/i.test(
      `${stderr}\n${log}\n${resultText}`
    );
    if (code !== 0 && hitSessionLimit && config.fallbackApiKey) {
      pushStep("Limite de sessao atingido. Tentando novamente via API...", "system");
      await flushProgress(true);
      ({ resultText, transcript: log, code, stderr, cancelled } = await runSkill(
        prompt,
        (step) => record(step),
        shouldCancel,
        { model: config.dtcModel || undefined, env: { ANTHROPIC_API_KEY: config.fallbackApiKey } }
      ));
      await flushProgress(true);
      if (cancelled) {
        await supabase
          .from("dtc_ai_jobs")
          .update({ status: "cancelled", finished_at: new Date().toISOString(), cancel_requested: false })
          .eq("id", job.id);
        return;
      }
    }

    if (code !== 0) {
      if (hitSessionLimit && !config.fallbackApiKey) {
        throw new Error(
          "Limite de sessao do Claude atingido na VM. Aguarde o reset ou configure DTC_FALLBACK_API_KEY no .env para cobrar via API."
        );
      }
      const tail = (stderr || log || "").slice(-1200);
      throw new Error(`Claude encerrou com codigo ${code}. Fim da saida: ${tail}`);
    }

    // Se o Claude nao devolveu nada, cai para a transcricao crua (melhor que vazio).
    const generated = (resultText || "").trim() || transcript;

    pushStep("Texto pronto! Revise antes de aplicar.", "result");
    await flushProgress(true);
    const { error: doneError } = await supabase
      .from("dtc_ai_jobs")
      .update({
        status: "done",
        result_text: generated,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    if (doneError) throw new Error(`Falha ao concluir job: ${doneError.message}`);

    console.log(`[voice ${job.id}] concluido (${generated.length} chars)`);

    // Best-effort: remove o audio do Storage (ja transcrito, nao precisa guardar).
    try {
      await supabase.storage.from(config.bucket).remove([job.audio_path]);
    } catch {
      /* best-effort */
    }
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
