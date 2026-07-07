import { supabase } from "./supabase.js";
import { config, DtcJob } from "./config.js";
import { runSkill, ProgressStep } from "./runSkill.js";

// Mantem apenas os ultimos N passos no banco (evita payloads gigantes no Realtime).
const MAX_LOG_STEPS = 80;
const PROGRESS_FLUSH_MS = 2500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

// Extrai texto puro de um campo Lexical (JSON com root/children) ou string legada.
function lexToText(val: unknown): string {
  if (val == null) return "";
  if (typeof val !== "string") return "";
  const s = val.trim();
  if (!s) return "";
  let parsed: AnyObj;
  try {
    parsed = JSON.parse(s);
  } catch {
    return s; // texto puro legado
  }
  if (!parsed?.root?.children) return s;
  const lines: string[] = [];
  const walk = (nodes: AnyObj[], prefix = ""): void => {
    for (const node of nodes) {
      if (node?.type === "text" && typeof node.text === "string") {
        // acumula no ultimo bloco
        if (lines.length === 0) lines.push("");
        lines[lines.length - 1] += node.text;
      } else if (node?.type === "listitem") {
        lines.push(`${prefix}- `);
        if (Array.isArray(node.children)) walk(node.children, prefix);
      } else if (node?.type === "paragraph") {
        lines.push("");
        if (Array.isArray(node.children)) walk(node.children, prefix);
      } else if (Array.isArray(node?.children)) {
        walk(node.children, prefix);
      }
    }
  };
  walk(parsed.root.children);
  return lines.map((l) => l.trimEnd()).filter((l) => l !== "").join("\n").trim();
}

// Descreve uma lista de itens (objetos) juntando seus valores string/number em linhas.
function listToText(arr: unknown): string {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  const out: string[] = [];
  for (const item of arr) {
    if (item == null) continue;
    if (typeof item === "string" || typeof item === "number") {
      out.push(`- ${String(item)}`);
      continue;
    }
    if (typeof item === "object") {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(item as AnyObj)) {
        if (v == null) continue;
        if (typeof v === "string") {
          const t = lexToText(v) || v;
          if (t.trim()) parts.push(`${k}: ${t.replace(/\s+/g, " ").trim()}`);
        } else if (typeof v === "number" || typeof v === "boolean") {
          parts.push(`${k}: ${v}`);
        }
      }
      if (parts.length) out.push(`- ${parts.join(" | ")}`);
    }
  }
  return out.join("\n");
}

interface ProjectMeta {
  clientName: string;
  ticket?: string;
}

// Formata data ISO/date (YYYY-MM-DD...) para dd/mm/aaaa; vazio se ausente.
function fmtDate(v?: string): string {
  if (!v) return "";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
}

// Etapas 1..6 do projeto (a 7-pos-implantacao fica de fora: acontece apos a transicao).
// Prefixo da coluna no banco -> rotulo. Cada etapa tem <prefixo>_status/_responsible/
// _start_date/_end_date/_observations (+ campos especificos).
const STAGES: [string, string][] = [
  ["infra", "1. Analise de Infraestrutura"],
  ["adherence", "2. Analise de Aderencia"],
  ["conversion", "3. Conversao de Dados"],
  ["environment", "4. Preparacao de Ambiente"],
  ["modelos_editor", "5. Modelos Editor"],
  ["implementation", "6. Implantacao e Treinamento"],
];

// Coluna pode vir como objeto (jsonb) ou string JSON; normaliza para objeto.
function parseMaybeJson(v: unknown): AnyObj | null {
  if (!v) return null;
  if (typeof v === "object") return v as AnyObj;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return null; }
  }
  return null;
}

// Descreve uma sub-fase (implementation_phase1/2) em uma linha indentada.
function phaseBlock(label: string, ph: AnyObj | null): string | null {
  if (!ph) return null;
  const meta: string[] = [];
  if (ph.status) meta.push(`status: ${ph.status}`);
  if (ph.responsible) meta.push(`responsavel: ${ph.responsible}`);
  const per = [fmtDate(ph.startDate), fmtDate(ph.endDate)].filter(Boolean).join(" a ");
  if (per) meta.push(`periodo: ${per}`);
  const obs = lexToText(ph.observations);
  if (meta.length === 0 && !obs) return null;
  let block = `  - ${label}` + (meta.length ? ` (${meta.join(" | ")})` : "");
  if (obs) block += `\n    ${obs.replace(/\n/g, "\n    ")}`;
  return block;
}

// Monta o bloco das etapas do projeto a partir da linha da tabela projects.
function buildStagesSection(proj: AnyObj): string {
  const parts: string[] = [];
  for (const [prefix, label] of STAGES) {
    const status = proj[`${prefix}_status`];
    const resp = proj[`${prefix}_responsible`];
    const periodo = [fmtDate(proj[`${prefix}_start_date`]), fmtDate(proj[`${prefix}_end_date`])].filter(Boolean).join(" a ");
    const obs = lexToText(proj[`${prefix}_observations`]);
    const meta: string[] = [];
    if (status) meta.push(`status: ${status}`);
    if (resp) meta.push(`responsavel: ${resp}`);
    if (periodo) meta.push(`periodo: ${periodo}`);

    // Sub-fases da etapa 6 (Implantacao): phase1 (Treinamento) e phase2 (Retorno).
    const subs: string[] = [];
    if (prefix === "implementation") {
      const p1 = phaseBlock("Fase 1 - Treinamento & Acompanhamento", parseMaybeJson(proj.implementation_phase1));
      const p2 = phaseBlock("Fase 2 - Possivel Retorno", parseMaybeJson(proj.implementation_phase2));
      if (p1) subs.push(p1);
      if (p2) subs.push(p2);
    }

    if (meta.length === 0 && !obs && subs.length === 0) continue;
    let block = `- ${label}` + (meta.length ? ` (${meta.join(" | ")})` : "");
    if (obs) block += `\n  ${obs.replace(/\n/g, "\n  ")}`;
    if (subs.length) block += `\n${subs.join("\n")}`;
    parts.push(block);
  }
  return parts.join("\n");
}

// Monta o bloco de contexto com apenas o que for pertinente ao resumo do processo.
function buildContext(dtc: AnyObj, meta: ProjectMeta, proj: AnyObj): string {
  const seg = (title: string, body: string): string =>
    body && body.trim() ? `\n## ${title}\n${body.trim()}\n` : "";

  const versions =
    dtc?.systemVersionsList && typeof dtc.systemVersionsList === "object"
      ? Object.entries(dtc.systemVersionsList)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
      : lexToText(dtc?.systemVersions);

  const nps = dtc?.clientSatisfactionScore
    ? `${dtc.clientSatisfactionScore}/5 (${["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"][dtc.clientSatisfactionScore] || ""})`
    : "";

  // Periodo e analista vem da ETAPA 6 (Implantacao). A fonte da verdade e a sub-fase
  // phase1 (Treinamento & Acompanhamento); depois a coluna espelhada; depois o DTC.
  // NUNCA a etapa 7 (pos-implantacao): e outra pessoa/fase.
  const impl1 = parseMaybeJson(proj?.implementation_phase1);
  const analista =
    (impl1?.responsible as string) ||
    (proj?.implementation_responsible as string) ||
    dtc?.analystResponsible ||
    dtc?.responsible ||
    "-";
  const periodo = [
    fmtDate(impl1?.startDate || proj?.implementation_start_date),
    fmtDate(impl1?.endDate || proj?.implementation_end_date),
  ]
    .filter(Boolean)
    .join(" a ");

  let ctx = `Cliente/Cartorio: ${meta.clientName || "-"}`;
  if (meta.ticket) ctx += ` | Chamado/Ticket: ${meta.ticket}`;
  ctx += `\nServentia: ${dtc?.serventia || "-"} | Oficial: ${dtc?.oficial || "-"}`;
  ctx += `\nResponsavel do cliente: ${dtc?.clientResponsible || "-"}`;
  ctx += `\nAnalista que conduziu a implantacao (etapa 6): ${analista}`;
  if (periodo) ctx += `\nPeriodo da implantacao: ${periodo}`;
  ctx += "\n";
  ctx += seg("Etapas do projeto (1 a 6)", buildStagesSection(proj));
  ctx += seg("Sistemas instalados", lexToText(dtc?.systemsInstalled));
  ctx += seg("Versoes dos sistemas", versions);
  ctx += seg(
    "Conversao de dados",
    dtc?.hadConversion ? lexToText(dtc?.convertedData) || "Houve conversao de dados." : "Nao houve conversao de dados."
  );
  ctx += seg("Processo de implantacao", lexToText(dtc?.implantationProcess));
  ctx += seg("Registros/etapas da implantacao", listToText(dtc?.implantationProcessLogs));
  ctx += seg("Ganhos da implantacao", listToText(dtc?.implantationGainsList));
  ctx += seg("Pendencias", listToText(dtc?.implantationPendingList));
  ctx += seg("Sugestoes", listToText(dtc?.implantationSuggestionsList));
  ctx += seg("Pos-implantacao", lexToText(dtc?.postImplantationProcess));
  ctx += seg("Colaboradores envolvidos", listToText(dtc?.employeesList) || lexToText(dtc?.employees));
  ctx += seg("Chamados pendentes", listToText(dtc?.tickets));
  ctx += seg("Satisfacao do cliente", nps);
  return ctx.trim();
}

function buildPrompt(context: string): string {
  return `Voce e um analista de implantacao redigindo as "Consideracoes finais" do relatorio de transicao de conhecimento de uma implantacao de sistema para cartorio/serventia.

Com base APENAS nas informacoes abaixo, escreva um resumo profissional, coeso e objetivo do processo de implantacao realizado: o que foi feito, sistemas e conversao, principais ganhos entregues, pendencias em aberto e uma conclusao/encerramento. Use portugues do Brasil, tom formal e claro. De 2 a 5 paragrafos curtos.

FORMATACAO (Markdown leve, use com moderacao e apenas quando agregar clareza):
- **negrito** para destacar termos-chave (ex.: nomes de sistemas, datas marcantes, o rotulo de um topico).
- __sublinhado__ para enfase pontual em algo critico (ex.: uma pendencia importante).
- *italico* para observacoes secundarias.
- Listas com marcadores usando "- " no inicio da linha para enumerar ganhos ou pendencias.
Nao exagere: a maior parte do texto deve ser texto normal. NAO use titulos com "#", NAO use tabelas, NAO use blocos de codigo.

NAO invente dados que nao estejam no contexto. Use os nomes, datas e responsaveis EXATAMENTE como aparecem no contexto. O analista que conduziu a implantacao e o indicado como "Analista que conduziu a implantacao (etapa 6)" — nao troque por responsaveis de outras etapas.

Responda SOMENTE com o texto final das consideracoes finais, sem preambulo, sem aspas e sem comentarios adicionais.

=== CONTEXTO DA IMPLANTACAO ===
${context}
=== FIM DO CONTEXTO ===`;
}

/**
 * Pipeline de um job de resumo com IA (ja marcado 'processing' pelo claim):
 * le o DTC do projeto -> monta contexto pertinente -> roda o Claude para resumir
 * -> grava o texto em result_text -> done. Lanca em falha; o loop principal
 * marca o job como 'error'.
 */
export async function processDtcJob(job: DtcJob): Promise<void> {
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

  pushStep("Lendo os dados da transicao...");
  await flushProgress(true);

  // 1. Ler o projeto (custom_fields.dtc + metadados uteis ao resumo)
  // Lemos a linha inteira do projeto: alem do DTC (custom_fields.dtc), usamos as
  // colunas das etapas 1..6 (<prefixo>_status/_responsible/_start_date/.../_observations).
  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", job.project_id)
    .single();
  if (projErr || !proj) throw new Error(`Falha ao ler o projeto: ${projErr?.message || "vazio"}`);

  const dtc = (proj.custom_fields as AnyObj)?.dtc;
  if (!dtc) throw new Error("Este projeto ainda nao possui dados de transicao (DTC) preenchidos.");

  const context = buildContext(
    dtc,
    {
      clientName: (proj.client_name as string) || "",
      ticket: (proj.ticket_number as string) || undefined,
    },
    proj
  );
  if (context.replace(/[^a-zA-Z0-9]/g, "").length < 40) {
    throw new Error("Nao ha informacoes suficientes preenchidas para gerar um resumo.");
  }

  // 2. Rodar o Claude para redigir o resumo
  pushStep("Gerando o resumo com IA...");
  await flushProgress(true);

  const shouldCancel = async (): Promise<boolean> => {
    const { data } = await supabase
      .from("dtc_ai_jobs")
      .select("cancel_requested")
      .eq("id", job.id)
      .single();
    return !!data?.cancel_requested;
  };

  const prompt = buildPrompt(context);
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
    console.log(`[dtc ${job.id}] cancelado pelo usuario`);
    return;
  }

  // Fallback: se bateu o limite de sessao da assinatura e ha uma API key configurada,
  // tenta de novo cobrando via API (ANTHROPIC_API_KEY) em vez da assinatura.
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

  const summary = (resultText || "").trim();
  if (!summary) {
    throw new Error(`O Claude nao retornou texto. Fim da saida: ${(transcript || "").slice(-800)}`);
  }

  // 3. Concluir job com o texto do resumo
  pushStep("Resumo pronto! Revise antes de salvar.", "result");
  await flushProgress(true);
  const { error: doneError } = await supabase
    .from("dtc_ai_jobs")
    .update({
      status: "done",
      result_text: summary,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (doneError) throw new Error(`Falha ao concluir job: ${doneError.message}`);

  console.log(`[dtc ${job.id}] concluido (${summary.length} chars)`);
}
