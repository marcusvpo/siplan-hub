import { supabase } from "./supabase.js";
import { config, DtcJob } from "./config.js";
import { runSkill, ProgressStep } from "./runSkill.js";
import { lexToText } from "./processDtcJob.js";

// Mantem apenas os ultimos N passos no banco (evita payloads gigantes no Realtime).
const MAX_LOG_STEPS = 80;
const PROGRESS_FLUSH_MS = 2500;

// Prompt de melhoria: reescreve o texto do analista mantendo sentido e fatos.
// Regras de formatacao espelham o conversor plainTextToLexicalJson do frontend
// (**negrito**, __sublinhado__, *italico*, listas com "- "/"1.").
function buildImprovePrompt(text: string): string {
  return `Voce e um revisor de texto profissional. Reescreva o TEXTO ORIGINAL abaixo deixando-o mais claro, coeso, bem estruturado e com portugues correto (gramatica, pontuacao, concordancia), mantendo um tom formal e profissional.

REGRAS:
- Preserve INTEGRALMENTE o sentido, os fatos, nomes, datas e numeros do original. NAO invente nem remova informacoes.
- Mantenha o mesmo idioma do original (portugues do Brasil).
- Nao adicione preambulo, titulo, comentarios nem explicacoes sobre o que voce mudou.
- Pode organizar em paragrafos e, quando fizer sentido, em listas.

FORMATACAO (Markdown leve, use com moderacao e apenas quando agregar clareza):
- **negrito** para termos-chave.
- __sublinhado__ para enfase pontual em algo critico.
- *italico* para observacoes secundarias.
- Listas com "- " no inicio da linha; listas numeradas com "1." quando houver ordem.
Nao use titulos com "#", nem tabelas, nem blocos de codigo.

Responda SOMENTE com o texto reescrito, sem aspas e sem qualquer texto adicional.

=== TEXTO ORIGINAL ===
${text}
=== FIM DO TEXTO ORIGINAL ===`;
}

// Prompt de resumo: sintetiza TODOS os blocos de Observacoes & Detalhes da etapa 7
// (Pos-Implantacao) em um texto unico, rico e bem estruturado.
function buildSummaryPrompt(text: string): string {
  return `Voce e um analista de implantacao redigindo o "Resumo Geral" da etapa de Pos-Implantacao de um projeto para cartorio/serventia.

Abaixo estao TODOS os blocos de "Observacoes & Detalhes" registrados nesta etapa (cada bloco pode tratar de um assunto diferente: chamados, ajustes, treinamentos complementares, pendencias, feedback do cliente etc.).

Com base APENAS nesses blocos, escreva um resumo consolidado, coeso, rico e bem estruturado de tudo o que foi registrado. Organize por assunto quando fizer sentido, destaque o que foi resolvido e o que ficou pendente, e mantenha um tom formal e profissional.

REGRAS:
- Preserve os fatos, nomes, datas e numeros exatamente como aparecem. NAO invente nem contradiga os blocos.
- Se houver pendencias ou itens em aberto, mencione-os EXPLICITAMENTE.
- Portugues do Brasil. Nao adicione preambulo, titulo geral, nem comentarios sobre o que voce fez.

FORMATACAO (Markdown leve, com moderacao):
- **negrito** para termos-chave. __sublinhado__ para enfase critica. *italico* para observacoes secundarias.
- Listas com "- " para enumerar itens; "1." para itens com ordem.
Nao use titulos com "#", nem tabelas, nem blocos de codigo.

Responda SOMENTE com o texto do resumo, sem aspas e sem qualquer texto adicional.

=== BLOCOS DE OBSERVACOES & DETALHES ===
${text}
=== FIM DOS BLOCOS ===`;
}

/**
 * Pipeline de um job 'improve_text' (ja marcado 'processing' pelo claim):
 * le o texto de entrada (input_text) -> roda o Claude para reescrever ->
 * grava o texto melhorado em result_text -> done. Lanca em falha; o loop
 * principal marca o job como 'error'.
 */
export async function processImproveJob(job: DtcJob): Promise<void> {
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

  const isSummary = job.job_type === "summary_blocks";

  pushStep(isSummary ? "Lendo os blocos de observacoes..." : "Lendo o texto para melhorar...");
  await flushProgress(true);

  // 1. Texto de entrada: pode vir como JSON do Lexical ou texto puro.
  const raw = job.input_text || "";
  const text = (lexToText(raw) || raw).trim();
  if (text.replace(/[^a-zA-Z0-9]/g, "").length < 10) {
    throw new Error(
      isSummary
        ? "Nao ha texto suficiente nos blocos para gerar um resumo."
        : "O texto e muito curto para ser melhorado."
    );
  }

  // 2. Rodar o Claude para reescrever/resumir
  pushStep(isSummary ? "Gerando o resumo com IA..." : "Melhorando o texto com IA...");
  await flushProgress(true);

  const shouldCancel = async (): Promise<boolean> => {
    const { data } = await supabase
      .from("dtc_ai_jobs")
      .select("cancel_requested")
      .eq("id", job.id)
      .single();
    return !!data?.cancel_requested;
  };

  const prompt = isSummary ? buildSummaryPrompt(text) : buildImprovePrompt(text);
  let { resultText, transcript, code, stderr, cancelled } = await runSkill(
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
    console.log(`[improve ${job.id}] cancelado pelo usuario`);
    return;
  }

  // Fallback: bateu o limite de sessao da assinatura e ha API key -> tenta via API.
  const hitSessionLimit = /(session|usage) limit|hit your (session|usage) limit|limite de sess/i.test(
    `${stderr}\n${transcript}\n${resultText}`
  );
  if (code !== 0 && hitSessionLimit && config.fallbackApiKey) {
    pushStep("Limite de sessao atingido. Tentando novamente via API...", "system");
    await flushProgress(true);
    ({ resultText, transcript, code, stderr, cancelled } = await runSkill(
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
    const tail = (stderr || transcript || "").slice(-1200);
    throw new Error(`Claude encerrou com codigo ${code}. Fim da saida: ${tail}`);
  }

  const improved = (resultText || "").trim();
  if (!improved) {
    throw new Error(`O Claude nao retornou texto. Fim da saida: ${(transcript || "").slice(-800)}`);
  }

  // 3. Concluir job com o texto gerado
  pushStep(
    isSummary ? "Resumo pronto! Revise antes de aplicar." : "Texto pronto! Revise antes de aplicar.",
    "result"
  );
  await flushProgress(true);
  const { error: doneError } = await supabase
    .from("dtc_ai_jobs")
    .update({
      status: "done",
      result_text: improved,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (doneError) throw new Error(`Falha ao concluir job: ${doneError.message}`);

  console.log(`[${isSummary ? "summary" : "improve"} ${job.id}] concluido (${improved.length} chars)`);
}
