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
 * Contexto das etapas dos projetos para os pareceres de pos: conversao de dados
 * (sistema de origem, complexidade, desvios, homologacao), gap de aderencia,
 * aceite da implantacao e o resumo de transicao (DTC) quando existir. Ajuda a
 * IA a separar "bug de produto" de "sequela de conversao" ou "lacuna de
 * treinamento". Best-effort: qualquer falha retorna vazio e o parecer sai sem
 * este bloco.
 */
async function buildProjectStagesContext(projectIds: string[]): Promise<string> {
  try {
    const ids = [...new Set(projectIds.filter(Boolean))].slice(0, 30);
    if (ids.length === 0) return "";

    const { data } = await supabase
      .from("projects")
      .select(
        "id, client_name, system_type, legacy_system, conversion_source_system, conversion_complexity, " +
          "conversion_record_count, conversion_deviations, conversion_homologation_status, conversion_status, " +
          "adherence_has_product_gap, adherence_gap_description, implementation_acceptance_status, " +
          "post_start_date, post_end_date, post_status"
      )
      .in("id", ids);
    // O supabase-js nao infere o tipo de selects montados por concatenacao.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projs = (data ?? []) as any[];
    if (projs.length === 0) return "";

    // Ultimo resumo de transicao (DTC) concluido por projeto, se houver.
    const { data: dtcs } = await supabase
      .from("dtc_ai_jobs")
      .select("project_id, result_text, created_at")
      .in("project_id", ids)
      .eq("job_type", "dtc_summary")
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(60);
    const dtcPorProjeto = new Map<string, string>();
    for (const d of dtcs ?? []) {
      const pid = d.project_id as string;
      if (!dtcPorProjeto.has(pid) && d.result_text) {
        dtcPorProjeto.set(pid, String(d.result_text).replace(/\s+/g, " ").slice(0, 900));
      }
    }

    const linhas = projs.map((p) => {
      const partes: string[] = [];
      const origem = p.conversion_source_system || p.legacy_system;
      if (origem) {
        partes.push(
          `conversao de dados: origem=${origem}` +
            (p.conversion_complexity ? `, complexidade=${p.conversion_complexity}` : "") +
            (p.conversion_record_count ? `, ~${p.conversion_record_count} registros` : "") +
            (p.conversion_homologation_status ? `, homologacao=${p.conversion_homologation_status}` : "") +
            (p.conversion_status ? `, status=${p.conversion_status}` : "")
        );
      } else {
        partes.push("sem conversao de dados registrada");
      }
      if (p.conversion_deviations) {
        partes.push(`DESVIOS DA CONVERSAO: ${String(p.conversion_deviations).replace(/\s+/g, " ").slice(0, 400)}`);
      }
      if (p.adherence_has_product_gap) {
        partes.push(
          `gap de produto na aderencia${p.adherence_gap_description ? `: ${String(p.adherence_gap_description).replace(/\s+/g, " ").slice(0, 250)}` : ""}`
        );
      }
      if (p.implementation_acceptance_status) partes.push(`aceite da implantacao: ${p.implementation_acceptance_status}`);
      partes.push(`pos: ${p.post_start_date ?? "?"} a ${p.post_status === "done" ? p.post_end_date ?? "?" : "em andamento"}`);
      const dtc = dtcPorProjeto.get(p.id as string);
      if (dtc) partes.push(`RESUMO DE TRANSICAO (DTC): ${dtc}`);
      return `- ${p.client_name} [${p.system_type}]: ${partes.join(" | ")}`;
    });
    return linhas.join("\n");
  } catch {
    return "";
  }
}

const CONTEXTO_ETAPAS_REGRAS = `
- Use o CONTEXTO DAS ETAPAS DOS PROJETOS para formular hipoteses de causa raiz: temas como registros/atos nao localizados, dados divergentes, numeracao ou valores errados podem ser SEQUELA DA CONVERSAO DE DADOS (verifique sistema de origem, desvios registrados e status da homologacao) e nao bug do produto nem falta de treinamento. Diga qual hipotese os dados sustentam.
- Se um projeto nao tiver contexto de etapas ou DTC, simplesmente nao o cite nesse aspecto — NAO invente.`;

// Prompt do parecer da Analise Pos-Implantacao: recebe um JSON compacto com os
// chamados 0800 do periodo do pos e escreve uma leitura qualitativa (temas
// recorrentes, causa provavel, recomendacoes) para o time de implantacao.
function buildParecerPrompt(json: string, contextoProjetos: string): string {
  return `Voce e um analista senior de implantacao de sistemas para cartorios. Abaixo esta um JSON com os chamados de suporte (0800) que UM cliente abriu durante o periodo de pos-implantacao de um projeto.

Escreva um PARECER curto (2 a 4 paragrafos + no maximo 4 recomendacoes em lista) respondendo:
1. Quais assuntos/temas se repetem nos chamados? Cite os numeros dos chamados relevantes (ex.: #746373).
2. A causa provavel do atrito e capacitacao dos usuarios (duvidas), qualidade do produto/ambiente (erros e bugs) ou fatores pontuais?
3. O que a equipe de implantacao deve fazer a respeito (recomendacoes objetivas e acionaveis)?

REGRAS:
- Baseie-se APENAS nos dados do JSON. NAO invente fatos, numeros nem chamados.
- Considere status (aberto ha muito tempo = risco), criticidade e datas.${contextoProjetos ? CONTEXTO_ETAPAS_REGRAS : ""}
- Portugues do Brasil, tom profissional e direto. Sem preambulo, sem titulo geral, sem repetir estas instrucoes.

FORMATACAO (Markdown leve): **negrito** para termos-chave; listas com "- ". Nao use titulos com "#", tabelas nem blocos de codigo.

Responda SOMENTE com o texto do parecer.

=== CHAMADOS DO POS (JSON) ===
${json}
=== FIM ===${contextoProjetos ? `

=== CONTEXTO DAS ETAPAS DOS PROJETOS ===
${contextoProjetos}
=== FIM DO CONTEXTO ===` : ""}`;
}

// Prompt do parecer da CARTEIRA (Panorama Pos-Implantacao): recebe um JSON com
// o recorte agregado (temas por cartorio, naturezas, criticos) e escreve a
// leitura executiva do que e sistemico vs pontual.
function buildPanoramaParecerPrompt(json: string, contextoProjetos: string): string {
  return `Voce e um gestor senior de implantacao de sistemas para cartorios analisando a CARTEIRA de projetos em pos-implantacao. Abaixo esta um JSON agregado dos chamados 0800 abertos pelos clientes DENTRO dos periodos de pos (filtro ja aplicado), incluindo temas gerados por IA com a contagem de cartorios em que cada um aparece.

Escreva um PARECER EXECUTIVO curto (2 a 4 paragrafos + no maximo 5 recomendacoes em lista) respondendo:
1. Quais temas sao SISTEMICOS (aparecem em 2+ cartorios) e o que indicam — bug de produto, falha de ambiente/configuracao padrao ou lacuna do treinamento padrao?
2. O equilibrio geral da carteira: duvidas de uso vs erros/bugs — as implantacoes estao gerando mais atrito de capacitacao ou de produto?
3. Pontos de risco (chamados criticos em aberto, cartorios com volume fora da curva).
4. Recomendacoes objetivas para o time de implantacao e para o time de produto.

REGRAS:
- Baseie-se APENAS nos dados do JSON. NAO invente fatos nem numeros. Cite temas e cartorios pelos nomes do JSON.${contextoProjetos ? CONTEXTO_ETAPAS_REGRAS : ""}
- Portugues do Brasil, tom executivo e direto. Sem preambulo, sem titulo geral.

FORMATACAO (Markdown leve): **negrito** para termos-chave; listas com "- ". Nao use titulos com "#", tabelas nem blocos de codigo.

Responda SOMENTE com o texto do parecer.

=== RECORTE DA CARTEIRA (JSON) ===
${json}
=== FIM ===${contextoProjetos ? `

=== CONTEXTO DAS ETAPAS DOS PROJETOS ===
${contextoProjetos}
=== FIM DO CONTEXTO ===` : ""}`;
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
  const isParecer = job.job_type === "pos_parecer" || job.job_type === "panorama_parecer";
  const isPanorama = job.job_type === "panorama_parecer";

  pushStep(
    isParecer
      ? "Lendo os chamados do periodo do pos..."
      : isSummary
      ? "Lendo os blocos de observacoes..."
      : "Lendo o texto para melhorar..."
  );
  await flushProgress(true);

  // 1. Texto de entrada: pode vir como JSON do Lexical ou texto puro.
  //    No parecer, input_text e um JSON de chamados e vai integro para o prompt.
  const raw = job.input_text || "";
  const text = isParecer ? raw.trim() : (lexToText(raw) || raw).trim();
  if (text.replace(/[^a-zA-Z0-9]/g, "").length < 10) {
    throw new Error(
      isParecer
        ? "Nao ha chamados suficientes para gerar um parecer."
        : isSummary
        ? "Nao ha texto suficiente nos blocos para gerar um resumo."
        : "O texto e muito curto para ser melhorado."
    );
  }

  // 2. Rodar o Claude para reescrever/resumir
  pushStep(
    isParecer
      ? "Gerando o parecer com IA..."
      : isSummary
      ? "Gerando o resumo com IA..."
      : "Melhorando o texto com IA..."
  );
  await flushProgress(true);

  const shouldCancel = async (): Promise<boolean> => {
    const { data } = await supabase
      .from("dtc_ai_jobs")
      .select("cancel_requested")
      .eq("id", job.id)
      .single();
    return !!data?.cancel_requested;
  };

  // Contexto das etapas dos projetos (conversao, aderencia, DTC...) para os
  // pareceres: por projeto usa o project_id do job; o da carteira recebe os ids
  // do recorte dentro do JSON (payload.projetos). Best-effort — sem contexto o
  // parecer sai normalmente.
  let contextoProjetos = "";
  if (isParecer) {
    pushStep("Lendo as etapas dos projetos (conversao, aderencia, DTC)...");
    await flushProgress(true);
    if (isPanorama) {
      try {
        const payload = JSON.parse(text) as { projetos?: Array<{ id?: string }> };
        contextoProjetos = await buildProjectStagesContext(
          (payload.projetos ?? []).map((p) => String(p.id || ""))
        );
      } catch {
        /* payload sem lista de projetos: segue sem contexto */
      }
    } else if (job.project_id) {
      contextoProjetos = await buildProjectStagesContext([job.project_id]);
    }
  }

  const prompt = isPanorama
    ? buildPanoramaParecerPrompt(text, contextoProjetos)
    : isParecer
    ? buildParecerPrompt(text, contextoProjetos)
    : isSummary
    ? buildSummaryPrompt(text)
    : buildImprovePrompt(text);
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
    isParecer
      ? "Parecer pronto!"
      : isSummary
      ? "Resumo pronto! Revise antes de aplicar."
      : "Texto pronto! Revise antes de aplicar.",
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
