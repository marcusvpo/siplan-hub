import { supabase } from "./supabase.js";
import { config } from "./config.js";
import { runSkill } from "./runSkill.js";

/**
 * Classificacao IA dos chamados 0800 espelhados: gera um TEMA curto por chamado
 * ("selo digital", "livro caixa", "intimacao/cra"...) a partir de titulo +
 * descricao. O tema alimenta o Panorama Pos-Implantacao, que agrega recorrencia
 * do mesmo problema entre cartorios.
 *
 * Roda como a fila de MENOR prioridade do worker 'ai' (so quando nao ha jobs de
 * modelo/texto/copiloto pendentes), em lotes pequenos via Claude haiku. Gate:
 * mesmo dono do sync (MSSQL_HOST configurado) para nao classificar em dobro
 * quando 2 workers compartilham o .env.
 */

// Naturezas internas/comerciais nao ganham tema por IA: recebem o marcador
// 'interno' (o front ja as ignora) para sair da fila de pendentes.
const NATUREZAS_SEM_TEMA = [
  "nova implantação",
  "nova implantacao",
  "negociação comercial",
  "negociacao comercial",
];

const BATCH_SIZE = 12;

// Backoff apos falha (ex.: limite de sessao do Claude): evita martelar a cada tick.
let nextTryAt = 0;

interface PendingRow {
  numero_chamado: string;
  titulo: string | null;
  descricao: string | null;
  natureza: string | null;
}

function buildPrompt(rows: PendingRow[], temasExistentes: string[]): string {
  const itens = rows.map((r) => ({
    n: r.numero_chamado,
    titulo: (r.titulo || "").slice(0, 200),
    descricao: (r.descricao || "").slice(0, 400),
    natureza: r.natureza || "",
  }));
  return `Voce categoriza chamados de suporte de sistemas para cartorios (registro de imoveis, notas, protesto).

Para CADA chamado abaixo, atribua um TEMA curto que descreva o assunto tecnico central, servindo para agrupar chamados parecidos de cartorios diferentes.

REGRAS DO TEMA:
- portugues do Brasil, minusculas, 1 a 4 palavras, sem pontuacao final (ex.: "selo digital", "livro caixa", "intimacao cra", "certidao", "conversao de dados", "permissao de usuario", "impressao de etiquetas").
- REUSE um tema da lista de TEMAS EXISTENTES sempre que o assunto for o mesmo; crie tema novo apenas quando nenhum servir.
- Generalize o suficiente para agrupar ("selo digital" e nao "selo duplicado no ato 62838").
- Nao use o nome do cartorio, numeros de protocolo nem o nome do software como tema.

TEMAS EXISTENTES (reuse quando couber):
${temasExistentes.length ? temasExistentes.map((t) => `- ${t}`).join("\n") : "- (nenhum ainda)"}

CHAMADOS (JSON):
${JSON.stringify(itens, null, 1)}

RESPONDA SOMENTE com um array JSON valido, sem markdown, sem comentarios, no formato:
[{"n":"<numero_chamado>","tema":"<tema>"}]`;
}

function parseResult(raw: string): Map<string, string> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("resposta sem array JSON");
  const arr = JSON.parse(cleaned.slice(start, end + 1)) as Array<{ n?: string; tema?: string }>;
  const map = new Map<string, string>();
  for (const item of arr) {
    const numero = String(item?.n ?? "").trim();
    const tema = String(item?.tema ?? "").trim().toLowerCase().slice(0, 60);
    if (numero && tema) map.set(numero, tema);
  }
  return map;
}

/**
 * Processa UM lote de chamados sem tema. Retorna true se trabalhou (o loop de
 * filas do worker chama de novo ate esvaziar), false se nao ha pendencia.
 */
export async function classifyPendingChamados(): Promise<boolean> {
  if (!config.mssqlHost) return false; // classifica so o worker dono do sync
  if (Date.now() < nextTryAt) return false;

  const { data, error } = await supabase
    .from("chamados_0800")
    .select("numero_chamado, titulo, descricao, natureza")
    .is("tema_ia", null)
    .order("data_abertura", { ascending: false })
    .limit(BATCH_SIZE);
  if (error) {
    console.error("[chamados-tema] erro ao buscar pendentes:", error.message);
    return false;
  }
  const pendentes = (data ?? []) as PendingRow[];
  if (pendentes.length === 0) return false;

  // Internos/comerciais: marca sem gastar IA.
  const internos = pendentes.filter((p) =>
    NATUREZAS_SEM_TEMA.includes((p.natureza || "").toLowerCase())
  );
  if (internos.length > 0) {
    await supabase
      .from("chamados_0800")
      .update({ tema_ia: "interno", tema_ia_em: new Date().toISOString() })
      .in("numero_chamado", internos.map((p) => p.numero_chamado));
  }
  const paraIa = pendentes.filter((p) => !internos.includes(p));
  if (paraIa.length === 0) return true; // lote so de internos; proxima volta pega o resto

  // Temas ja usados (mais frequentes primeiro) para induzir reuso.
  const { data: temasRows } = await supabase
    .from("chamados_0800")
    .select("tema_ia")
    .not("tema_ia", "is", null)
    .neq("tema_ia", "interno")
    .limit(2000);
  const freq = new Map<string, number>();
  for (const r of temasRows ?? []) {
    const t = (r as { tema_ia: string }).tema_ia;
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const temasExistentes = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([t]) => t);

  try {
    const { resultText, code, stderr, transcript } = await runSkill(
      buildPrompt(paraIa, temasExistentes),
      () => {},
      async () => false,
      { model: config.chamadosTemaModel || undefined, cwd: config.copilotCwd }
    );
    if (code !== 0) {
      throw new Error(`Claude saiu com codigo ${code}: ${(stderr || transcript || "").slice(-400)}`);
    }
    const temas = parseResult(resultText || "");

    let classificados = 0;
    const agora = new Date().toISOString();
    for (const p of paraIa) {
      // Sem tema na resposta -> 'não classificado' (nao volta para a fila em loop).
      const tema = temas.get(p.numero_chamado) || "não classificado";
      const { error: upErr } = await supabase
        .from("chamados_0800")
        .update({ tema_ia: tema, tema_ia_em: agora })
        .eq("numero_chamado", p.numero_chamado);
      if (!upErr) classificados++;
    }
    console.log(`[chamados-tema] lote ok: ${classificados}/${paraIa.length} classificados`);
    return true;
  } catch (err) {
    nextTryAt = Date.now() + 15 * 60000; // backoff 15 min (quota/erro transitorio)
    console.error(
      "[chamados-tema] erro (backoff 15 min):",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
