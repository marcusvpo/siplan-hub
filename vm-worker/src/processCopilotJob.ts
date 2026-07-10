import { supabase } from "./supabase.js";
import { config, CopilotJob } from "./config.js";
import { runSkill, ProgressStep } from "./runSkill.js";

// Mantem apenas os ultimos N passos no banco (evita payloads gigantes no Realtime).
const MAX_LOG_STEPS = 80;
const PROGRESS_FLUSH_MS = 2500;

// Limites do contexto (economia de token): teto de projetos e de caracteres enviados
// ao modelo. O retrieval e ESTRUTURADO (linhas compactas), nao embeddings.
const MAX_PROJECTS = 800;
const MAX_CONTEXT_CHARS = 130000;

// Chat multi-turno: quantas trocas anteriores (pergunta+resposta) incluir no
// prompt como contexto, e teto de caracteres do historico (controle de custo).
const HISTORY_TURNS = 5;
const MAX_HISTORY_CHARS = 8000;

// Status que contam como etapa CONCLUIDA (para o filtro de escopo 'ativos').
const CONCLUIDO_RE = /conclu|finaliz|adequ|entregue|ok\b/i;

// Pesos para converter o uso reportado em "tokens cobrados" na cota, na proporcao
// do custo real: leitura de cache custa ~10% de um token de entrada, escrita de
// cache ~25% a mais. Sem isso, cache_read (barato) drenava a cota cheio.
const W_CACHE_READ = 0.1;
const W_CACHE_WRITE = 1.25;

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
export function projectLine(proj: AnyObj): string {
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
  // Nao enviamos o id: o link para /projects/ID e montado no frontend, casando o
  // nome do cartorio com a lista de projetos (economiza ~36 chars por linha).
  return `- ${head}${overallSeg} ${parts.join(" | ")}`.trim();
}

// Descreve uma pendencia de conversao (issue aberta) em uma linha compacta.
export function issueLine(issue: AnyObj, clientById: Map<string, string>): string {
  const cartorio = clientById.get(issue.project_id) || "(projeto desconhecido)";
  const pri = short(issue.priority, 12);
  const st = short(issue.status, 16);
  const title = short(issue.title, 120);
  return `- ${cartorio} (prioridade ${pri}, ${st}): ${title}`;
}

// "Ativo" = tem ao menos uma etapa com status preenchido e NAO concluido.
function isActiveProject(proj: AnyObj): boolean {
  let anyStage = false;
  for (const [prefix] of STAGES) {
    const status = short(proj[`${prefix}_status`], 24);
    if (!status) continue;
    anyStage = true;
    if (!CONCLUIDO_RE.test(status)) return true;
  }
  // Sem nenhuma etapa preenchida tambem conta como ativo (projeto novo/em aberto).
  return !anyStage;
}

interface HistoryItem {
  question: string;
  result_text: string;
}

// Monta o prompt unico (a CLI nao separa system/messages): instrucoes + portfolio
// + pendencias + historico recente da conversa + pergunta atual.
function buildPrompt(
  portfolio: string,
  issues: string,
  history: HistoryItem[],
  question: string,
  hoje: string
): string {
  const histBlock = history.length
    ? `\n=== HISTORICO DA CONVERSA (mais antigo -> mais recente) ===\n${history
        .map((h) => `Usuario: ${h.question}\nCopiloto: ${h.result_text}`)
        .join("\n\n")}\n=== FIM DO HISTORICO ===\n`
    : "";
  const issuesBlock = issues
    ? `\n=== PENDENCIAS DE CONVERSAO EM ABERTO ===\n${issues}\n=== FIM DAS PENDENCIAS ===\n`
    : "";

  return `Voce e o Copiloto Operacional do SiplanHUB, sistema de gestao de projetos de implantacao de sistemas para cartorios/serventias. Responda a pergunta do usuario usando APENAS os dados abaixo.

Data de hoje: ${hoje}.

Cada linha do portfolio e um projeto (cliente/cartorio) com o status de cada etapa do pipeline: infra (infraestrutura), aderencia, conversao (conversao de dados), ambiente (preparacao de ambiente), modelos (Modelos Editor), implantacao (implantacao e treinamento) e pos (pos-implantacao). O formato de cada etapa e: etapa=status(responsavel)[inicio-fim]. As datas estao em dd/mm.

Regras:
- Responda em portugues do Brasil, de forma direta e objetiva.
- ATRASO: uma etapa esta atrasada quando a data de fim ja passou (anterior a hoje) E o status nao esta concluido. Use a data de hoje para decidir isso.
- Considere "travado/pendente/parado" as etapas cujo status indique nao concluido (ex.: pendente, em andamento, bloqueado) e "concluido" as finalizadas (ex.: concluido, finalizado, adequado).
- Ao citar um projeto, escreva o nome do cartorio EXATAMENTE como aparece no portfolio (o sistema transforma o nome em link automaticamente).
- Quando listar varios projetos, use uma lista com marcadores "- ".
- Considere as PENDENCIAS DE CONVERSAO quando a pergunta for sobre conversao, bloqueios ou pendencias.
- Se a informacao pedida NAO estiver nos dados, diga isso claramente; NAO invente dados.
- Nao repita os dados inteiros; responda so o que foi perguntado.
- Considere o historico da conversa para entender perguntas de acompanhamento (ex.: "e desses, quais atrasados?").
- FOLLOW-UPS: na ULTIMA linha da resposta, sugira 3 perguntas curtas de acompanhamento no formato exato: [[FOLLOWUPS]] pergunta 1 | pergunta 2 | pergunta 3

=== PORTFOLIO DE PROJETOS ===
${portfolio}
=== FIM DO PORTFOLIO ===
${issuesBlock}${histBlock}
=== PERGUNTA ATUAL ===
${question}
=== FIM DA PERGUNTA ===

Responda SOMENTE com a resposta final, sem preambulo.`;
}

/**
 * Pipeline de um job do Copiloto (ja marcado 'processing' pelo claim):
 * valida a cota do usuario -> monta o contexto do portfolio (com escopo) e o
 * historico -> roda o Claude via CLI -> grava a resposta + tokens cobrados -> done.
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

  // 2. Montar o contexto compacto do portfolio (retrieval estruturado, com escopo)
  pushStep("Lendo o portfolio de projetos...");
  await flushProgress(true);

  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .order("client_name", { ascending: true })
    .limit(MAX_PROJECTS);
  if (projErr) throw new Error(`Falha ao ler os projetos: ${projErr.message}`);

  const onlyActive = job.scope === "ativos";
  const scoped = onlyActive ? (projects || []).filter(isActiveProject) : projects || [];

  const lines: string[] = [];
  let chars = 0;
  let truncated = false;
  for (const proj of scoped) {
    const line = projectLine(proj);
    if (chars + line.length > MAX_CONTEXT_CHARS) {
      truncated = true;
      break;
    }
    lines.push(line);
    chars += line.length + 1;
  }
  if (lines.length === 0) {
    throw new Error(
      onlyActive
        ? "Nenhum projeto ativo (com etapa nao concluida) para consultar."
        : "Nao ha projetos cadastrados para consultar."
    );
  }
  let portfolio = lines.join("\n");
  if (onlyActive) portfolio = `(escopo: apenas projetos ativos)\n${portfolio}`;
  if (truncated) {
    portfolio += `\n(observacao: lista truncada por tamanho; ${scoped.length - lines.length} projeto(s) omitido(s).)`;
  }

  // 2b. Pendencias de conversao em aberto (fonte extra: conversao/bloqueios).
  const clientById = new Map<string, string>();
  for (const p of projects || []) {
    if (p.id) clientById.set(p.id, short(p.client_name, 60) || "(sem nome)");
  }
  const { data: issueRows } = await supabase
    .from("conversion_issues")
    .select("project_id, title, status, priority")
    .in("status", ["open", "in_progress"])
    .order("priority", { ascending: false })
    .limit(100);
  const issuesText = (issueRows || []).map((i) => issueLine(i, clientById)).join("\n");

  // 3. Historico recente (chat multi-turno): ultimas trocas concluidas do usuario.
  const { data: historyRows } = await supabase
    .from("copilot_jobs")
    .select("question, result_text")
    .eq("user_id", job.user_id)
    .eq("status", "done")
    .neq("id", job.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);

  const history: HistoryItem[] = [];
  let histChars = 0;
  for (const h of (historyRows || []).slice().reverse()) {
    const q = String(h.question || "").trim();
    const a = String(h.result_text || "").trim();
    if (!q || !a) continue;
    histChars += q.length + a.length;
    if (histChars > MAX_HISTORY_CHARS) continue;
    history.push({ question: q, result_text: a });
  }

  // 4. Rodar o Claude via CLI (assinatura, sem chave de API)
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

  const hoje = new Date().toLocaleDateString("pt-BR");
  const prompt = buildPrompt(portfolio, issuesText, history, job.question, hoje);
  const { resultText, transcript, code, stderr, cancelled, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } =
    await runSkill(prompt, (step) => record(step), shouldCancel, {
      model: config.copilotModel || undefined,
      cwd: config.copilotCwd,
    });
  await flushProgress(true);

  if (cancelled) {
    await supabase
      .from("copilot_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString(), cancel_requested: false })
      .eq("id", job.id);
    console.log(`[copilot ${job.id}] cancelado pelo usuario`);
    return;
  }

  // Uso -> tokens cobrados na cota (cache_read pesa pouco; cache_write um pouco mais).
  const tokensIn = inputTokens + cacheCreationTokens + cacheReadTokens; // bruto (registro)
  const charged = Math.round(
    inputTokens + cacheCreationTokens * W_CACHE_WRITE + cacheReadTokens * W_CACHE_READ + outputTokens
  );
  if (charged > 0) {
    await supabase
      .rpc("add_copilot_tokens", { p_user_id: job.user_id, p_tokens: charged })
      .then(undefined, (e) => console.error("Falha ao contabilizar tokens do copiloto:", e));
  }

  if (code !== 0) {
    const tail = (stderr || transcript || "").slice(-1200);
    throw new Error(`Claude encerrou com codigo ${code}. Fim da saida: ${tail}`);
  }

  let answer = (resultText || "").trim();
  if (!answer) {
    throw new Error(`O Claude nao retornou texto. Fim da saida: ${(transcript || "").slice(-800)}`);
  }

  // Extrai as sugestoes de follow-up da ultima linha ([[FOLLOWUPS]] a | b | c) e
  // remove esse marcador do texto exibido.
  let followups: string | null = null;
  const fm = answer.match(/\[\[FOLLOWUPS\]\]\s*(.+)\s*$/i);
  if (fm) {
    const items = fm[1]
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (items.length) followups = items.join("|");
    answer = answer.slice(0, fm.index).trim();
  }

  // 5. Concluir
  pushStep("Resposta pronta.", "result");
  await flushProgress(true);
  const { error: doneError } = await supabase
    .from("copilot_jobs")
    .update({
      status: "done",
      result_text: answer,
      followups,
      tokens_in: tokensIn,
      tokens_out: outputTokens,
      tokens_charged: charged,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (doneError) throw new Error(`Falha ao concluir job: ${doneError.message}`);

  console.log(
    `[copilot ${job.id}] concluido (${answer.length} chars; in=${tokensIn} out=${outputTokens} cobrado=${charged})`
  );
}
