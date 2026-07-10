import { supabase } from "./supabase.js";
import { config, CopilotJob } from "./config.js";
import { runSkill, ProgressStep } from "./runSkill.js";

// Mantem apenas os ultimos N passos no banco (evita payloads gigantes no Realtime).
const MAX_LOG_STEPS = 80;
const PROGRESS_FLUSH_MS = 2500;

// Limites do contexto (economia de token): teto de projetos e de caracteres enviados
// ao Claude. O retrieval e ESTRUTURADO (linhas compactas), nao embeddings.
const MAX_PROJECTS = 300;
const MAX_CONTEXT_CHARS = 60000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

// Etapas do projeto (prefixo da coluna -> rotulo curto). Cada etapa expoe
// <prefixo>_status/_responsible/_start_date/_end_date na linha da tabela projects.
const STAGES: [string, string][] = [
  ["infra", "infra"],
  ["adherence", "aderencia"],
  ["conversion", "conversao"],
  ["environment", "ambiente"],
  ["modelos_editor", "modelos"],
  ["implementation", "implantacao"],
  ["post", "pos"],
];

// Formata data ISO (YYYY-MM-DD...) para dd/mm; vazio se ausente.
function fmtDate(v: unknown): string {
  if (!v) return "";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}` : "";
}

function short(v: unknown, n = 40): string {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim().slice(0, n);
}

// Monta UMA linha compacta por projeto com o status de cada etapa (+ responsavel/periodo).
function projectLine(proj: AnyObj): string {
  const client = short(proj.client_name, 60) || "(sem nome)";
  const ticket = short(proj.ticket_number, 20);
  const parts: string[] = [];
  for (const [prefix, label] of STAGES) {
    const status = short(proj[`${prefix}_status`], 24);
    if (!status) continue;
    const resp = short(proj[`${prefix}_responsible`], 24);
    const periodo = [fmtDate(proj[`${prefix}_start_date`]), fmtDate(proj[`${prefix}_end_date`])]
      .filter(Boolean)
      .join("-");
    let seg = `${label}=${status}`;
    if (resp) seg += `(${resp})`;
    if (periodo) seg += `[${periodo}]`;
    parts.push(seg);
  }
  const head = ticket ? `${client} [${ticket}]` : client;
  const overall = short(proj.status, 24);
  const overallSeg = overall ? ` status_geral=${overall} ::` : " ::";
  return `- ${head}${overallSeg} ${parts.join(" | ")}`.trim();
}

function buildPrompt(question: string, portfolio: string): string {
  return `Voce e o Copiloto Operacional do SiplanHUB, sistema de gestao de projetos de implantacao de sistemas para cartorios/serventias. Responda a PERGUNTA do usuario usando APENAS os dados do portfolio abaixo.

Cada linha do portfolio e um projeto (cliente/cartorio) com o status de cada etapa do pipeline: infra (infraestrutura), aderencia, conversao (conversao de dados), ambiente (preparacao de ambiente), modelos (Modelos Editor), implantacao (implantacao e treinamento) e pos (pos-implantacao). O formato de cada etapa e: etapa=status(responsavel)[inicio-fim].

Regras:
- Responda em portugues do Brasil, de forma direta e objetiva.
- Cite os nomes dos cartorios/clientes exatamente como aparecem.
- Quando listar varios projetos, use uma lista com marcadores "- ".
- Se a informacao pedida NAO estiver no portfolio, diga isso claramente; NAO invente dados.
- Nao repita o portfolio inteiro; responda so o que foi perguntado.
- Considere "travado/pendente/parado" as etapas cujo status indique nao concluido (ex.: pendente, em andamento, bloqueado) e "concluido" as finalizadas (ex.: concluido, finalizado, adequado).

=== PORTFOLIO DE PROJETOS ===
${portfolio}
=== FIM DO PORTFOLIO ===

=== PERGUNTA ===
${question}
=== FIM DA PERGUNTA ===

Responda SOMENTE com a resposta final, sem preambulo.`;
}

/**
 * Pipeline de um job do Copiloto (ja marcado 'processing' pelo claim):
 * valida a cota do usuario -> monta o contexto compacto do portfolio ->
 * roda o Claude -> grava a resposta + tokens consumidos -> done.
 * Lanca em falha; o loop principal marca o job como 'error'.
 */
export async function processCopilotJob(job: CopilotJob): Promise<void> {
  const steps: ProgressStep[] = [];
  let currentText = "";
  let lastFlush = 0;

  const flushProgress = async (force = false): Promise<void> => {
    const now = Date.now();
    if (!force && now - lastFlush < PROGRESS_FLUSH_MS) return;
    lastFlush = now;
    try {
      await supabase
        .from("copilot_jobs")
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

  // 1. Cota: bloqueia se o usuario nao esta habilitado ou ja estourou o teto do dia.
  //    (a RLS ja barra o INSERT, mas reforcamos aqui pois o consumo e contabilizado
  //    apos a resposta e um job grande pode ultrapassar o teto.)
  const { data: access } = await supabase
    .from("copilot_access")
    .select("enabled, daily_token_limit, tokens_used_today, period_reset_at")
    .eq("user_id", job.user_id)
    .single();

  if (!access || !access.enabled) {
    throw new Error("Copiloto nao habilitado para este usuario.");
  }
  const today = new Date().toISOString().slice(0, 10);
  const sameDay = String(access.period_reset_at || "").slice(0, 10) === today;
  const limit = Number(access.daily_token_limit) || 0;
  const used = sameDay ? Number(access.tokens_used_today) || 0 : 0;
  if (limit > 0 && used >= limit) {
    throw new Error(
      `Cota diaria de tokens atingida (${used}/${limit}). Tente novamente amanha ou peca ao administrador para ajustar o limite.`
    );
  }

  // 2. Montar o contexto compacto do portfolio (retrieval estruturado)
  pushStep("Lendo o portfolio de projetos...");
  await flushProgress(true);

  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .order("client_name", { ascending: true })
    .limit(MAX_PROJECTS);
  if (projErr) throw new Error(`Falha ao ler os projetos: ${projErr.message}`);

  const lines: string[] = [];
  let chars = 0;
  let truncated = false;
  for (const proj of projects || []) {
    const line = projectLine(proj);
    if (chars + line.length > MAX_CONTEXT_CHARS) {
      truncated = true;
      break;
    }
    lines.push(line);
    chars += line.length + 1;
  }
  if (lines.length === 0) {
    throw new Error("Nao ha projetos cadastrados para consultar.");
  }
  let portfolio = lines.join("\n");
  if (truncated) {
    portfolio += `\n(observacao: lista truncada por tamanho; ${(projects || []).length - lines.length} projeto(s) omitido(s).)`;
  }

  // 3. Rodar o Claude
  pushStep("Analisando com IA...");
  await flushProgress(true);

  const shouldCancel = async (): Promise<boolean> => {
    const { data } = await supabase
      .from("copilot_jobs")
      .select("cancel_requested")
      .eq("id", job.id)
      .single();
    return !!data?.cancel_requested;
  };

  const prompt = buildPrompt(job.question, portfolio);
  const { resultText, transcript, code, stderr, cancelled, tokensIn, tokensOut } = await runSkill(
    prompt,
    (step) => record(step),
    shouldCancel,
    { model: config.copilotModel || undefined }
  );
  await flushProgress(true);

  if (cancelled) {
    await supabase
      .from("copilot_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString(), cancel_requested: false })
      .eq("id", job.id);
    console.log(`[copilot ${job.id}] cancelado pelo usuario`);
    return;
  }

  // Contabiliza o consumo real de tokens ANTES de tratar erro/sucesso (o custo ocorreu).
  const totalTokens = (tokensIn || 0) + (tokensOut || 0);
  if (totalTokens > 0) {
    await supabase
      .rpc("add_copilot_tokens", { p_user_id: job.user_id, p_tokens: totalTokens })
      .then(undefined, (e) => console.error("Falha ao contabilizar tokens do copiloto:", e));
  }

  if (code !== 0) {
    const tail = (stderr || transcript || "").slice(-1200);
    throw new Error(`Claude encerrou com codigo ${code}. Fim da saida: ${tail}`);
  }

  const answer = (resultText || "").trim();
  if (!answer) {
    throw new Error(`O Claude nao retornou texto. Fim da saida: ${(transcript || "").slice(-800)}`);
  }

  pushStep("Resposta pronta.", "result");
  await flushProgress(true);
  const { error: doneError } = await supabase
    .from("copilot_jobs")
    .update({
      status: "done",
      result_text: answer,
      tokens_in: tokensIn || 0,
      tokens_out: tokensOut || 0,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (doneError) throw new Error(`Falha ao concluir job: ${doneError.message}`);

  console.log(`[copilot ${job.id}] concluido (${answer.length} chars, ${totalTokens} tokens)`);
}
