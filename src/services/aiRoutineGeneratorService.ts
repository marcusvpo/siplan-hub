import { supabase } from "@/integrations/supabase/client";
import {
  suggestNextArticleId,
  SIPLAN_HUB_SECTION_INDEX,
  SIPLAN_HUB_SECTION_TITLE,
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
  sinonimos: string[];
}

/**
 * Analisa o texto do procedimento e gera automaticamente os metadados
 * técnicos necessários para a base de conhecimento do Orion TN.
 * Novas rotinas do Siplan HUB são alocadas na SEÇÃO PRINCIPAL 5 com prefixo S-5.X.
 */
export async function generateRoutineMetadataWithAi({
  bodyMarkdown,
  articles,
  sections,
  preferredSectionIndex = SIPLAN_HUB_SECTION_INDEX,
}: {
  bodyMarkdown: string;
  articles: KnowledgeArticle[];
  sections: KnowledgeSection[];
  preferredSectionIndex?: number;
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
      },
    });

    if (!error && data?.success && data?.metadata) {
      const meta = data.metadata;
      // Validar se o ID sugerido pela IA não conflita, se conflitar, recalcula
      const isIdTaken = existingIds.some(
        (id) => id.toLowerCase() === (meta.id || "").trim().toLowerCase(),
      );

      const targetSec = meta.sectionIndex || preferredSectionIndex;
      const finalId =
        meta.id && !isIdTaken && meta.id.toUpperCase().startsWith("S-")
          ? meta.id.trim().toUpperCase()
          : suggestNextArticleId(articles, targetSec);

      return {
        id: finalId,
        titulo: meta.titulo?.trim() || "Como Executar Procedimento no Orion TN",
        sectionIndex: targetSec,
        secao: meta.secao || SIPLAN_HUB_SECTION_TITLE,
        objetivo: meta.objetivo?.trim() || "Procedimento operacional do sistema Orion TN.",
        tags: Array.isArray(meta.tags) ? meta.tags.map((t: string) => t.trim()).filter(Boolean) : ["orion_tn"],
        perguntas_usuario: Array.isArray(meta.perguntas_usuario)
          ? meta.perguntas_usuario.map((p: string) => p.trim()).filter(Boolean)
          : [],
        sinonimos: Array.isArray(meta.sinonimos)
          ? meta.sinonimos.map((s: string) => s.trim()).filter(Boolean)
          : [],
      };
    }
  } catch (err) {
    console.warn("Aviso: Falha ao chamar Edge function de IA, utilizando gerador heurístico local:", err);
  }

  // 2. Fallback Heurístico Local Robusto (sempre funciona, mesmo offline)
  return generateHeuristicMetadata({
    bodyMarkdown,
    articles,
    sections,
    sectionIndex: preferredSectionIndex,
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
}: {
  bodyMarkdown: string;
  articles: KnowledgeArticle[];
  sections: KnowledgeSection[];
  sectionIndex?: number;
}): GeneratedRoutineMetadata {
  const lines = bodyMarkdown.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Extrair título do primeiro cabeçalho Markdown (# Titulo ou ## Titulo) ou da primeira linha
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

  // Sugerir ID sequencial no padrão S-5.X para a Seção 5
  const suggestedId = suggestNextArticleId(articles, sectionIndex);

  // Gerar tags a partir de palavras-chave do texto
  const textLower = bodyMarkdown.toLowerCase();
  const tagKeywords: Record<string, string> = {
    "inteiro teor": "Certidões",
    certidão: "Certidões",
    casamento: "Registro Civil",
    nascimento: "Registro Civil",
    óbito: "Registro Civil",
    firma: "Reconhecimento de Firma",
    autenticação: "Autenticação",
    selo: "Selagem",
    livro: "Livros",
    "registro civil": "Registro Civil",
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
    negócio: "Negócios",
    cadastro: "Cadastros",
    desistência: "Atendimento",
    consulta: "Consultas",
    balcão: "Balcão",
  };

  const detectedTags = new Set<string>();
  for (const [kw, tag] of Object.entries(tagKeywords)) {
    if (textLower.includes(kw)) {
      detectedTags.add(tag);
    }
  }

  if (detectedTags.size === 0) {
    detectedTags.add("Procedimentos");
    detectedTags.add("Configurações");
  }

  // Objetivo
  const cleanTitle = extractedTitle.replace(/^como\s+/i, "");
  const objetivo = `Orientar o usuário no passo a passo para ${cleanTitle.toLowerCase()} no sistema Orion TN.`;

  // Perguntas do usuário
  const perguntas_usuario = [
    `Como realizar o procedimento de ${cleanTitle.toLowerCase()}?`,
    `Onde fica a opção de ${cleanTitle.toLowerCase()} no Orion TN?`,
    `Passo a passo para ${cleanTitle.toLowerCase()}`,
  ];

  // Sinônimos
  const words = cleanTitle.split(/\s+/).filter((w) => w.length > 3);
  const sinonimos = [cleanTitle.toLowerCase(), ...words.slice(0, 4)];

  const targetSection = sections.find((s) => s.index === sectionIndex);

  return {
    id: suggestedId,
    titulo: extractedTitle,
    sectionIndex,
    secao: targetSection?.title || SIPLAN_HUB_SECTION_TITLE,
    objetivo,
    tags: Array.from(detectedTags),
    perguntas_usuario,
    sinonimos,
  };
}
