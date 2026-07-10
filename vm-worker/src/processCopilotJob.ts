import { supabase } from "./supabase.js";
import { config, CopilotJob } from "./config.js";
import { ProgressStep } from "./runSkill.js";

// Mantem apenas os ultimos N passos no banco (evita payloads gigantes no Realtime).
const MAX_LOG_STEPS = 80;

// Limites do contexto (economia de token): teto de projetos e de caracteres enviados
// ao modelo. O retrieval e ESTRUTURADO (linhas compactas), nao embeddings.
const MAX_PROJECTS = 300;
const MAX_CONTEXT_CHARS = 60000;

// Teto de tokens de saida por resposta.
const MAX_OUTPUT_TOKENS = 4000;

// Chat multi-turno: quantas trocas anteriores (pergunta+resposta) mandar como
// contexto, e teto de caracteres do historico (controle de custo).
const HISTORY_TURNS = 5;
const MAX_HISTORY_CHARS = 8000;

// Status que contam como etapa CONCLUIDA (para o filtro de escopo 'ativos').
const CONCLUIDO_RE = /conclu|finaliz|adequ|entregue|ok\b/i;

// Pesos para converter o uso reportado pela API em "tokens cobrados" na cota, na
// proporcao do custo real: leitura de cache custa ~10% de um token de entrada,
// escrita de cache ~25% a mais. Sem isso, cache_read (barato) drenava a cota cheio.
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

// Instrucoes + portfolio: vao no bloco 'system' com cache_control (prompt caching).
// A pergunta do usuario vai como mensagem 'user'. Assim, perguntas repetidas sobre
// o mesmo portfolio dentro de ~5 min reaproveitam o cache (entrada quase de graca).
function buildSystem(portfolio: string): string {
  return `Voce e o Copiloto Operacional do SiplanHUB, sistema de gestao de projetos de implantacao de sistemas para cartorios/serventias. Responda a pergunta do usuario usando APENAS os dados do portfolio abaixo.

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
=== FIM DO PORTFOLIO ===`;
}

interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Chama a Messages API do Claude direto (sem o agente Claude Code), com o portfolio
 * em cache e o historico da conversa. Retorna o texto da resposta + o uso de tokens.
 */
async function askClaude(
  system: string,
  messages: ChatMessage[]
): Promise<{ answer: string; usage: ClaudeUsage }> {
  if (!config.copilotApiKey) {
    throw new Error(
      "Copiloto sem chave de API. Defina COPILOT_API_KEY (ou ANTHROPIC_API_KEY / DTC_FALLBACK_API_KEY) no .env da VM."
    );
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.copilotApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.copilotModel,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    }),
  });

  const data = (await res.json()) as AnyObj;
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data).slice(0, 500);
    throw new Error(`API do Claude retornou ${res.status}: ${msg}`);
  }
  const answer = Array.isArray(data.content)
    ? data.content
        .filter((b: AnyObj) => b?.type === "text" && typeof b.text === "string")
        .map((b: AnyObj) => b.text)
        .join("")
        .trim()
    : "";
  return { answer, usage: (data.usage || {}) as ClaudeUsage };
}

/**
 * Pipeline de um job do Copiloto (ja marcado 'processing' pelo claim):
 * valida a cota do usuario -> monta o contexto compacto do portfolio ->
 * chama a API do Claude -> grava a resposta + tokens cobrados -> done.
 * Lanca em falha; o loop principal marca o job como 'error'.
 */
export async function processCopilotJob(job: CopilotJob): Promise<void> {
  const steps: ProgressStep[] = [];

  const pushStep = async (text: string, kind: ProgressStep["kind"] = "system"): Promise<void> => {
    steps.push({ at: new Date().toISOString(), text, kind });
    try {
      await supabase
        .from("copilot_jobs")
        .update({
          progress: text,
          progress_log: steps.slice(-MAX_LOG_STEPS),
          progress_updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    } catch {
      /* best-effort */
    }
  };

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

  // 2. Montar o contexto compacto do portfolio (retrieval estruturado)
  await pushStep("Lendo o portfolio de projetos...");

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

  // 3. Historico recente (chat multi-turno): ultimas trocas concluidas do usuario.
  const { data: history } = await supabase
    .from("copilot_jobs")
    .select("question, result_text")
    .eq("user_id", job.user_id)
    .eq("status", "done")
    .neq("id", job.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);

  const messages: ChatMessage[] = [];
  let histChars = 0;
  // history vem do mais novo pro mais antigo; inverte para ordem cronologica.
  for (const h of (history || []).slice().reverse()) {
    const q = String(h.question || "").trim();
    const a = String(h.result_text || "").trim();
    if (!q || !a) continue;
    histChars += q.length + a.length;
    if (histChars > MAX_HISTORY_CHARS) continue;
    messages.push({ role: "user", content: q });
    messages.push({ role: "assistant", content: a });
  }
  messages.push({ role: "user", content: job.question });

  // 4. Chamar a API do Claude
  await pushStep("Analisando com IA...");
  const { answer, usage } = await askClaude(buildSystem(portfolio), messages);

  // Uso -> tokens cobrados na cota (cache_read pesa pouco; cache_write um pouco mais).
  const inTokens = Number(usage.input_tokens) || 0;
  const cacheWrite = Number(usage.cache_creation_input_tokens) || 0;
  const cacheRead = Number(usage.cache_read_input_tokens) || 0;
  const outTokens = Number(usage.output_tokens) || 0;
  const tokensIn = inTokens + cacheWrite + cacheRead; // bruto de entrada (registro)
  const charged = Math.round(
    inTokens + cacheWrite * W_CACHE_WRITE + cacheRead * W_CACHE_READ + outTokens
  );

  if (charged > 0) {
    await supabase
      .rpc("add_copilot_tokens", { p_user_id: job.user_id, p_tokens: charged })
      .then(undefined, (e) => console.error("Falha ao contabilizar tokens do copiloto:", e));
  }

  if (!answer) {
    throw new Error("O Claude nao retornou texto.");
  }

  // 4. Concluir
  await pushStep("Resposta pronta.", "result");
  const { error: doneError } = await supabase
    .from("copilot_jobs")
    .update({
      status: "done",
      result_text: answer,
      tokens_in: tokensIn,
      tokens_out: outTokens,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (doneError) throw new Error(`Falha ao concluir job: ${doneError.message}`);

  console.log(
    `[copilot ${job.id}] concluido (${answer.length} chars; in=${tokensIn} out=${outTokens} cobrado=${charged})`
  );
}
