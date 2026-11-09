import { supabase } from "@/integrations/supabase/client";
import {
  suggestNextArticleId,
  stripIdPrefixFromTitle,
  SIPLAN_HUB_SECTION_INDEX,
  SIPLAN_HUB_SECTION_TITLE,
  RoutinePrefix,
} from "@/services/markdownKnowledgeService";
import type { KnowledgeArticle, KnowledgeSection } from "@/types/knowledge";

export interface GeneratedRoutineMetadata {
  id: string;
  titulo: string;
  sectionIndex: number;
  secao?: string;
  objetivo: string;
  tags: string[];
  perguntas_usuario: string[];
  sintomas_comuns: string[]; // ⭐ NOVO CAMPO OBRIGATÓRIO (3 a 5 termos curtos sem ?)
  sinonimos: string[];
}

/**
 * Analisa o texto do procedimento e gera automaticamente os metadados
 * técnicos necessários para a base de conhecimento do Orion TN.
 */
export async function generateRoutineMetadataWithAi({
  bodyMarkdown,
  articles,
  sections,
  preferredSectionIndex = SIPLAN_HUB_SECTION_INDEX,
  preferredPrefix = "D",
}: {
  bodyMarkdown: string;
  articles: KnowledgeArticle[];
  sections: KnowledgeSection[];
  preferredSectionIndex?: number;
  preferredPrefix?: RoutinePrefix;
}): Promise<GeneratedRoutineMetadata> {
  const existingIds = articles.map((a) => a.id);

  // 1. Tentar gerar via Supabase Edge Function com OpenAI
  try {
    const { data, error } = await supabase.functions.invoke("generate-routine-metadata", {
      body: {
        bodyMarkdown,
        existingIds,
        sections,
        sectionIndex: preferredSectionIndex,
        prefix: preferredPrefix,
      },
    });

    if (!error && data?.success && data?.metadata) {
      const meta = data.metadata;
      const isIdTaken = existingIds.some(
        (id) => id.toLowerCase() === (meta.id || "").trim().toLowerCase(),
      );

      const targetSec = meta.sectionIndex || preferredSectionIndex;
      const finalId =
        meta.id && !isIdTaken && meta.id.toUpperCase().startsWith(`${preferredPrefix}-`)
          ? meta.id.trim().toUpperCase()
          : suggestNextArticleId(articles, preferredPrefix);

      const cleanTitle = stripIdPrefixFromTitle(meta.titulo?.trim() || "Como Executar Procedimento no Orion TN");

      const sintomas = Array.isArray(meta.sintomas_comuns)
        ? meta.sintomas_comuns
            .map((s: string) => String(s).replace(/\?/g, "").trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      return {
        id: finalId,
        titulo: cleanTitle,
        sectionIndex: targetSec,
        secao: meta.secao || SIPLAN_HUB_SECTION_TITLE,
        objetivo: meta.objetivo?.trim() || "Procedimento operacional do sistema Orion TN.",
        tags: Array.isArray(meta.tags)
          ? meta.tags.map((t: string) => t.trim()).filter(Boolean).slice(0, 7)
          : ["orion_tn"],
        perguntas_usuario: Array.isArray(meta.perguntas_usuario)
          ? meta.perguntas_usuario.map((p: string) => p.trim()).filter(Boolean).slice(0, 5)
          : [],
        sintomas_comuns:
          sintomas.length >= 3
            ? sintomas
            : [
                "não consigo executar na tela",
                "onde acho opção no menu",
                "dúvida ao salvar registro",
              ],
        sinonimos: Array.isArray(meta.sinonimos)
          ? meta.sinonimos.map((s: string) => s.trim()).filter(Boolean).slice(0, 5)
          : [],
      };
    }
  } catch (err) {
    console.warn("Aviso: Falha ao chamar Edge function de IA, utilizando gerador heurístico local:", err);
  }

  // 2. Fallback Heurístico Local Robusto
  return generateHeuristicMetadata({
    bodyMarkdown,
    articles,
    sections,
    sectionIndex: preferredSectionIndex,
    preferredPrefix,
  });
}

/**
 * Gerador heurístico local baseado em análise de texto do Markdown.
 */
function generateHeuristicMetadata({
  bodyMarkdown,
  articles,
  sections,
  sectionIndex = SIPLAN_HUB_SECTION_INDEX,
  preferredPrefix = "D",
}: {
  bodyMarkdown: string;
  articles: KnowledgeArticle[];
  sections: KnowledgeSection[];
  sectionIndex?: number;
  preferredPrefix?: RoutinePrefix;
}): GeneratedRoutineMetadata {
  const lines = bodyMarkdown.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let extractedTitle = "Como Executar Procedimento no Orion TN";
  for (const line of lines) {
    if (line.startsWith("#")) {
      extractedTitle = line.replace(/^#+\s*/, "").replace(/^[0-9.-]+\s*/, "").trim();
      break;
    }
  }

  if (extractedTitle === "Como Executar Procedimento no Orion TN" && lines.length > 0) {
    extractedTitle = lines[0].slice(0, 80);
  }

  if (!extractedTitle.toLowerCase().startsWith("como") && !extractedTitle.toLowerCase().startsWith("rotina")) {
    extractedTitle = `Como ${extractedTitle}`;
  }

  extractedTitle = stripIdPrefixFromTitle(extractedTitle);

  const suggestedId = suggestNextArticleId(articles, preferredPrefix);

  const textLower = bodyMarkdown.toLowerCase();
  const tagKeywords: Record<string, string> = {
    "inteiro teor": "Certidões",
    certidão: "Certidões",
    casamento: "Registro Civil",
    nascimento: "Registro Civil",
    óbito: "Registro Civil",
    firma: "Firmas",
    autenticação: "Autenticação",
    selo: "Estoque",
    livro: "Livros",
    notas: "Notas",
    procuração: "Procurações",
    escritura: "Escrituras",
    cancelamento: "Cancelamentos",
    recibo: "Financeiro",
    caixa: "Caixa",
    relatório: "Relatórios",
    backup: "Configurações",
    configuração: "Configurações",
    orçamento: "Orçamentos",
    cadastro: "Cadastros",
    qualificação: "Qualificação",
    editor: "Editor",
    scanner: "Digitalização",
    impressão: "Impressão",
  };

  const detectedTags: string[] = [];
  for (const [kw, tag] of Object.entries(tagKeywords)) {
    if (textLower.includes(kw) && !detectedTags.includes(tag)) {
      detectedTags.push(tag);
    }
    if (detectedTags.length >= 5) break;
  }

  if (detectedTags.length < 3) {
    if (!detectedTags.includes("Orion TN")) detectedTags.push("Orion TN");
    if (!detectedTags.includes("Geral")) detectedTags.push("Geral");
    if (!detectedTags.includes("Atendimento")) detectedTags.push("Atendimento");
  }

  const cleanSubject = extractedTitle.replace(/^como\s+/i, "");

  const generatedQuestions = [
    `Como fazer para ${cleanSubject}?`,
    `Onde encontro a tela de ${cleanSubject} no Orion TN?`,
    `Qual o passo a passo para ${cleanSubject}?`,
  ];

  // ⭐ Sintomas comuns heurísticos (sem '?')
  const generatedSymptoms = [
    `não consigo ${cleanSubject.slice(0, 30)}`,
    `opção de ${cleanSubject.slice(0, 25)} não aparece`,
    `erro ao processar ${cleanSubject.slice(0, 25)}`,
  ];

  const generatedSynonyms = [
    cleanSubject,
    `rotina de ${cleanSubject}`,
    `procedimento ${cleanSubject}`,
  ];

  const section = sections.find((s) => s.index === sectionIndex);

  return {
    id: suggestedId,
    titulo: extractedTitle,
    sectionIndex,
    secao: section?.title || SIPLAN_HUB_SECTION_TITLE,
    objetivo: `Orientar o usuário no processo de ${cleanSubject} no sistema Orion TN.`,
    tags: detectedTags.slice(0, 7),
    perguntas_usuario: generatedQuestions,
    sintomas_comuns: generatedSymptoms,
    sinonimos: generatedSynonyms,
  };
}
