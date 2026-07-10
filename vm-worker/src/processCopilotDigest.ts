import { supabase } from "./supabase.js";
import { config } from "./config.js";
import { runSkill } from "./runSkill.js";
import { projectLine, issueLine } from "./processCopilotJob.js";

const MAX_PROJECTS = 800;
const MAX_CONTEXT_CHARS = 130000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

function shortName(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || "(sem nome)";
}

function buildDigestPrompt(portfolio: string, issues: string, hoje: string): string {
  const issuesBlock = issues
    ? `\n=== PENDENCIAS DE CONVERSAO EM ABERTO ===\n${issues}\n=== FIM DAS PENDENCIAS ===\n`
    : "";
  return `Voce e o Copiloto Operacional do SiplanHUB (gestao de implantacoes para cartorios). Gere um RESUMO EXECUTIVO do portfolio de hoje (${hoje}), curto e acionavel.

Formato: 5 a 8 bullets em markdown ("- "). Cubra, quando houver dados: projetos em risco/atrasados (etapa com data-fim no passado e status nao concluido), gargalos recorrentes por etapa, pendencias de conversao criticas, e destaques (o que avancou). Cite nomes de cartorios. Nao invente dados. Responda so o resumo, sem preambulo.

Cada linha do portfolio: cliente com etapas etapa=status(responsavel)[inicio-fim] (datas em dd/mm).

=== PORTFOLIO ===
${portfolio}
=== FIM ===
${issuesBlock}`;
}

/**
 * Gera (uma vez por dia) um resumo executivo do portfolio e grava em copilot_digests.
 * Idempotente: se ja existe resumo para hoje, nao faz nada. Best-effort.
 */
export async function generateDailyDigest(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Ja existe o resumo de hoje? entao nada a fazer.
  const { data: existing } = await supabase
    .from("copilot_digests")
    .select("id")
    .eq("for_date", today)
    .maybeSingle();
  if (existing) return;

  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .order("client_name", { ascending: true })
    .limit(MAX_PROJECTS);
  if (projErr || !projects || projects.length === 0) return;

  const clientById = new Map<string, string>();
  for (const p of projects as AnyObj[]) {
    if (p.id) clientById.set(p.id, shortName(p.client_name));
  }

  const lines: string[] = [];
  let chars = 0;
  for (const proj of projects as AnyObj[]) {
    const line = projectLine(proj);
    if (chars + line.length > MAX_CONTEXT_CHARS) break;
    lines.push(line);
    chars += line.length + 1;
  }
  const portfolio = lines.join("\n");

  const { data: issueRows } = await supabase
    .from("conversion_issues")
    .select("project_id, title, status, priority")
    .in("status", ["open", "in_progress"])
    .order("priority", { ascending: false })
    .limit(100);
  const issues = (issueRows || []).map((i) => issueLine(i, clientById)).join("\n");

  const hoje = new Date().toLocaleDateString("pt-BR");
  const prompt = buildDigestPrompt(portfolio, issues, hoje);

  const { resultText, code } = await runSkill(prompt, undefined, undefined, {
    model: config.copilotModel || undefined,
  });
  const content = (resultText || "").trim();
  if (code !== 0 || !content) return;

  await supabase
    .from("copilot_digests")
    .upsert({ for_date: today, content }, { onConflict: "for_date", ignoreDuplicates: true })
    .then(undefined, (e) => console.error("Falha ao gravar resumo diario:", e));

  console.log(`[digest ${today}] resumo diario gerado (${content.length} chars)`);
}
