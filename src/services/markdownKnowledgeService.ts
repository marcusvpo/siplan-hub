import * as yaml from "js-yaml";
import type {
  BunnyVideoMetadata,
  KnowledgeArticle,
  KnowledgeArticleMetadata,
  KnowledgeSection,
  MasterKnowledgeDocument,
} from "@/types/knowledge";

export const SIPLAN_HUB_SECTION_INDEX = 5;
export const SIPLAN_HUB_SECTION_TITLE = "SEÇÃO PRINCIPAL 5: Rotinas atualizadas via Siplan HUB";
export const SIPLAN_HUB_ID_PREFIX = "S-";

/**
 * Faz o parse seguro do frontmatter YAML de um artigo individual.
 */
export function parseArticleFrontmatter(frontmatterRaw: string): KnowledgeArticleMetadata {
  try {
    const loaded = yaml.load(frontmatterRaw) as Record<string, unknown> | null;
    if (!loaded || typeof loaded !== "object") {
      throw new Error("YAML inválido ou vazio");
    }

    const id = String(loaded.id ?? "").trim();
    const titulo = String(loaded.titulo ?? "").trim();
    const objetivo = String(loaded.objetivo ?? "").trim();

    const tags = Array.isArray(loaded.tags)
      ? loaded.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const sinonimos = Array.isArray(loaded.sinonimos)
      ? loaded.sinonimos.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const perguntas_usuario = Array.isArray(loaded.perguntas_usuario)
      ? loaded.perguntas_usuario.map((p) => String(p).trim()).filter(Boolean)
      : [];

    let video: BunnyVideoMetadata | undefined;
    if (loaded.video && typeof loaded.video === "object") {
      const v = loaded.video as Record<string, unknown>;
      video = {
        tem_video: Boolean(v.tem_video),
        bunny_library_id: v.bunny_library_id ? String(v.bunny_library_id).trim() : undefined,
        bunny_video_id: v.bunny_video_id ? String(v.bunny_video_id).trim() : undefined,
        video_title: v.video_title ? String(v.video_title).trim() : undefined,
        video_url: v.video_url ? String(v.video_url).trim() : undefined,
        video_timestamp: v.video_timestamp ? String(v.video_timestamp).trim() : undefined,
        video_start_seconds: typeof v.video_start_seconds === "number" ? v.video_start_seconds : undefined,
      };
    }

    return {
      id,
      titulo,
      tags,
      objetivo,
      sinonimos,
      perguntas_usuario,
      video,
      ...loaded,
    };
  } catch {
    // Fallback por regex robusto caso o YAML contenha chaves duplicadas ou sintaxe atípica
    const id = frontmatterRaw.match(/id:\s*([^\n\r]+)/)?.[1]?.trim() || "";
    const tituloMatch =
      frontmatterRaw.match(/titulo:\s*"([^"]+)"/) ||
      frontmatterRaw.match(/titulo:\s*([^\n\r]+)/);
    const titulo = tituloMatch ? tituloMatch[1].trim() : "";
    const objetivoMatch =
      frontmatterRaw.match(/objetivo:\s*"([^"]+)"/) ||
      frontmatterRaw.match(/objetivo:\s*([^\n\r]+)/);
    const objetivo = objetivoMatch ? objetivoMatch[1].trim() : "";

    // Extrair listas em bloco (tags, sinonimos, perguntas_usuario)
    const extractList = (blockName: string) => {
      const match = frontmatterRaw.match(
        new RegExp(`${blockName}:[\\r\\n]+((?:\\s+-[^\\r\\n]+[\\r\\n]*)+)`, "i"),
      );
      if (!match) return [];
      return match[1]
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s*-\s*"?|"?,?$/g, "").trim())
        .filter(Boolean);
    };

    const tags = extractList("tags");
    const sinonimos = extractList("sinonimos");
    const perguntas_usuario = extractList("perguntas_usuario");

    let video: BunnyVideoMetadata | undefined;
    if (frontmatterRaw.includes("video:")) {
      const temVideo = /tem_video:\s*true/i.test(frontmatterRaw);
      const bunnyLibraryId = frontmatterRaw.match(/bunny_library_id:\s*"?([^"\r\n]+)"?/)?.[1];
      const bunnyVideoId = frontmatterRaw.match(/bunny_video_id:\s*"?([^"\r\n]+)"?/)?.[1];
      const videoTitle = frontmatterRaw.match(/video_title:\s*"?([^"\r\n]+)"?/)?.[1];
      const videoUrl = frontmatterRaw.match(/video_url:\s*"?([^"\r\n]+)"?/)?.[1];
      const videoTimestamp = frontmatterRaw.match(/video_timestamp:\s*"?([^"\r\n]+)"?/)?.[1];
      const startSecMatch = frontmatterRaw.match(/video_start_seconds:\s*(\d+)/);

      video = {
        tem_video: temVideo,
        bunny_library_id: bunnyLibraryId,
        bunny_video_id: bunnyVideoId,
        video_title: videoTitle,
        video_url: videoUrl,
        video_timestamp: videoTimestamp,
        video_start_seconds: startSecMatch ? parseInt(startSecMatch[1], 10) : undefined,
      };
    }

    return {
      id,
      titulo,
      tags,
      objetivo,
      sinonimos,
      perguntas_usuario,
      video: video || { tem_video: false },
    };
  }
}

/**
 * Analisa o documento mestre consolidado (`OrionTN pos.md`) e extrai as seções e todos os artigos.
 */
export function parseMasterDocument(rawContent: string): MasterKnowledgeDocument {
  // 1. Extrair informações do cabeçalho
  const versionMatch = rawContent.match(/VERSÃO_BASE_CONHECIMENTO:\s*([^\n\r]+)/i);
  const dateMatch = rawContent.match(/DATA_ULTIMA_ATUALIZACAO_BASE:\s*([^\n\r]+)/i);

  const version = versionMatch ? versionMatch[1].trim() : "2.1.0";
  const lastUpdated = dateMatch ? dateMatch[1].trim() : "";

  // 2. Mapear as seções principais e seus índices
  const sectionRegex = /(?:^|\r?\n)\s*(SEÇÃO PRINCIPAL\s*(\d+)?:?\s*([^\n\r]+))/g;
  const sectionMarkers: { index: number; title: string; pos: number }[] = [];
  let sMatch: RegExpExecArray | null;

  while ((sMatch = sectionRegex.exec(rawContent)) !== null) {
    const sectionTitle = sMatch[1].trim();
    const sectionIndex = sMatch[2] ? parseInt(sMatch[2], 10) : sectionMarkers.length + 1;
    sectionMarkers.push({
      index: sectionIndex,
      title: sectionTitle,
      pos: sMatch.index,
    });
  }

  // Seção padrão inicial se nenhuma foi marcada
  if (sectionMarkers.length === 0) {
    sectionMarkers.push({
      index: 1,
      title: "Seção Geral - Orion TN",
      pos: 0,
    });
  }

  // 3. Extrair artigos delimitados por frontmatter YAML
  const articleRegex =
    /---\r?\n(id:[\s\S]*?)\r?\n---\r?\n([\s\S]*?)(?=(?:\r?\n---\r?\n(?:id:| SEÇÃO PRINCIPAL|===)|$))/g;

  const articles: KnowledgeArticle[] = [];
  let aMatch: RegExpExecArray | null;

  while ((aMatch = articleRegex.exec(rawContent)) !== null) {
    const fullMatch = aMatch[0];
    const frontmatterRaw = aMatch[1];
    const body = aMatch[2].trim();
    const startIndex = aMatch.index;
    const endIndex = startIndex + fullMatch.length;

    // Determinar a qual seção este artigo pertence
    let currentSection = sectionMarkers[0];
    for (const marker of sectionMarkers) {
      if (startIndex >= marker.pos) {
        currentSection = marker;
      } else {
        break;
      }
    }

    const metadata = parseArticleFrontmatter(frontmatterRaw);

    articles.push({
      id: metadata.id || `ART-${articles.length + 1}`,
      titulo: metadata.titulo || "Artigo sem título",
      sectionIndex: currentSection.index,
      sectionName: currentSection.title,
      metadata,
      frontmatterRaw,
      body,
      startIndex,
      endIndex,
      fullLength: fullMatch.length,
    });
  }

  // 4. Montar lista de seções agregadas
  const sections: KnowledgeSection[] = sectionMarkers.map((m) => ({
    index: m.index,
    title: m.title,
    articleIds: articles.filter((a) => a.sectionIndex === m.index).map((a) => a.id),
  }));

  // Garantir que a SEÇÃO PRINCIPAL 5 esteja sempre disponível na lista de seções
  if (!sections.some((s) => s.index === SIPLAN_HUB_SECTION_INDEX)) {
    sections.push({
      index: SIPLAN_HUB_SECTION_INDEX,
      title: SIPLAN_HUB_SECTION_TITLE,
      articleIds: articles
        .filter((a) => a.sectionIndex === SIPLAN_HUB_SECTION_INDEX || a.id.startsWith("S-"))
        .map((a) => a.id),
    });
  }

  const header = rawContent.slice(0, articles[0]?.startIndex ?? 0).trim();

  return {
    header,
    version,
    lastUpdated,
    sections,
    articles,
    rawContent,
  };
}

/**
 * Valida se um ID de artigo já existe na base de conhecimento.
 */
export function validateArticleIdUniqueness(
  articles: KnowledgeArticle[],
  targetId: string,
): { isUnique: boolean; conflictArticle?: KnowledgeArticle } {
  const normalized = targetId.trim().toLowerCase();
  if (!normalized) return { isUnique: false };

  const conflict = articles.find((a) => a.id.trim().toLowerCase() === normalized);
  return {
    isUnique: !conflict,
    conflictArticle: conflict,
  };
}

/**
 * Sugere o próximo ID sequencial livre.
 * Para a Seção 5 (Siplan HUB), gera IDs no padrão "S-5.X" (ex: S-5.1, S-5.2, S-5.3).
 * Para outras seções, gera "R-{sec}.{num}".
 */
export function suggestNextArticleId(
  articles: KnowledgeArticle[],
  sectionIndex: number = SIPLAN_HUB_SECTION_INDEX,
): string {
  // Se for a Seção 5 (Siplan HUB) ou se o prefixo desejado for "S-"
  if (sectionIndex === SIPLAN_HUB_SECTION_INDEX) {
    const sMinorNumbers: number[] = [];

    for (const a of articles) {
      const trimmedId = a.id.trim().toUpperCase();
      // Padrão S-5.X ou S-X.Y
      const matchS5 = trimmedId.match(/^S-5\.(\d+)$/);
      if (matchS5) {
        sMinorNumbers.push(parseInt(matchS5[1], 10));
      } else {
        const matchSGeneral = trimmedId.match(/^S-(\d+)(?:\.(\d+))?$/);
        if (matchSGeneral) {
          const num = matchSGeneral[2]
            ? parseInt(matchSGeneral[2], 10)
            : parseInt(matchSGeneral[1], 10);
          if (!isNaN(num)) sMinorNumbers.push(num);
        }
      }
    }

    if (sMinorNumbers.length > 0) {
      const maxNum = Math.max(...sMinorNumbers);
      return `S-5.${maxNum + 1}`;
    }

    return `S-5.1`;
  }

  // Padrão R-{sectionIndex}.{num} para as seções 1 a 4
  const sectionPrefix = `R-${sectionIndex}.`;
  const minorNumbers: number[] = [];

  for (const a of articles) {
    const trimmedId = a.id.trim().toUpperCase();
    if (trimmedId.startsWith(sectionPrefix)) {
      const remainder = trimmedId.slice(sectionPrefix.length);
      const num = parseInt(remainder, 10);
      if (!isNaN(num)) {
        minorNumbers.push(num);
      }
    }
  }

  if (minorNumbers.length > 0) {
    const maxNum = Math.max(...minorNumbers);
    return `R-${sectionIndex}.${maxNum + 1}`;
  }

  return `R-${sectionIndex}.1`;
}

/**
 * Serializa uma rotina completa (Frontmatter YAML + Corpo Markdown) no padrão estrito da base.
 */
export function serializeArticleToMarkdown(
  metadata: KnowledgeArticleMetadata,
  body: string,
  hasVideo: boolean = false,
): string {
  const lb = "\n";

  // Objeto YAML estruturado
  const yamlObj: Record<string, unknown> = {
    id: metadata.id.trim().toUpperCase(),
    titulo: metadata.titulo.trim(),
  };

  if (metadata.tags && metadata.tags.length > 0) {
    yamlObj.tags = metadata.tags.map((t) => t.trim()).filter(Boolean);
  }

  yamlObj.objetivo = metadata.objetivo?.trim() || "";

  if (metadata.perguntas_usuario && metadata.perguntas_usuario.length > 0) {
    yamlObj.perguntas_usuario = metadata.perguntas_usuario.map((p) => p.trim()).filter(Boolean);
  }

  if (metadata.sinonimos && metadata.sinonimos.length > 0) {
    yamlObj.sinonimos = metadata.sinonimos.map((s) => s.trim()).filter(Boolean);
  }

  // Configuração condicional de vídeo Bunny.net
  if (hasVideo && metadata.video && metadata.video.tem_video) {
    const v = metadata.video;
    yamlObj.video = {
      tem_video: true,
      bunny_library_id: v.bunny_library_id?.trim() || "354152",
      bunny_video_id: v.bunny_video_id?.trim() || "",
      video_title: v.video_title?.trim() || metadata.titulo.trim(),
      video_url: v.video_url?.trim() || "",
      video_timestamp: v.video_timestamp?.trim() || "00:00",
    };
    if (typeof v.video_start_seconds === "number") {
      (yamlObj.video as any).video_start_seconds = v.video_start_seconds;
    }
  }

  // Gerar YAML com js-yaml garantindo formatação limpa e legível
  const yamlString = yaml
    .dump(yamlObj, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    })
    .trim();

  const cleanBody = body.trim();
  return `---${lb}${yamlString}${lb}---${lb}${cleanBody}`;
}

/**
 * Insere cirurgicamente uma nova rotina dentro do documento mestre OrionTN pos.md.
 * As rotinas criadas via Siplan HUB são alocadas na SEÇÃO PRINCIPAL 5.
 */
export function insertNewArticleIntoDocument(
  fullDoc: string,
  newArticle: {
    metadata: KnowledgeArticleMetadata;
    body: string;
    sectionIndex?: number;
    hasVideo?: boolean;
  },
): string {
  const parsed = parseMasterDocument(fullDoc);

  // 1. Validar unicidade do ID
  const { isUnique, conflictArticle } = validateArticleIdUniqueness(
    parsed.articles,
    newArticle.metadata.id,
  );

  if (!isUnique) {
    throw new Error(
      `Já existe uma rotina cadastrada com o ID "${newArticle.metadata.id}" (${conflictArticle?.titulo}). Escolha um ID único.`,
    );
  }

  const isCrlf = fullDoc.includes("\r\n");
  const lb = isCrlf ? "\r\n" : "\n";

  // 2. Serializar o novo artigo
  const serialized = serializeArticleToMarkdown(
    newArticle.metadata,
    newArticle.body,
    newArticle.hasVideo ?? Boolean(newArticle.metadata.video?.tem_video),
  );

  const targetSectionIndex = newArticle.sectionIndex ?? SIPLAN_HUB_SECTION_INDEX;

  // 3. Encontrar os artigos pertencentes a essa seção
  const sectionArticles = parsed.articles.filter(
    (a) => a.sectionIndex === targetSectionIndex,
  );

  if (sectionArticles.length > 0) {
    // Inserir logo após o último artigo da seção correspondente
    const lastArticleOfSection = sectionArticles[sectionArticles.length - 1];
    const insertionPoint = lastArticleOfSection.endIndex;

    const before = fullDoc.slice(0, insertionPoint);
    const after = fullDoc.slice(insertionPoint);

    return `${before}${lb}${lb}${serialized}${after.startsWith(lb) ? "" : lb}${after}`;
  }

  // 4. Se for a Seção 5 e ela ainda não tiver cabeçalho no documento
  if (targetSectionIndex === SIPLAN_HUB_SECTION_INDEX) {
    const sectionHeader = `${lb}${lb}${SIPLAN_HUB_SECTION_TITLE}${lb}${lb}`;
    return `${fullDoc.trim()}${sectionHeader}${serialized}${lb}`;
  }

  // 5. Se a seção não tiver artigos ou não foi localizada, insere no final do documento
  return `${fullDoc.trim()}${lb}${lb}${serialized}${lb}`;
}

/**
 * Atualiza cirurgicamente o corpo de um artigo dentro do documento mestre,
 * preservando 100% da integridade do YAML frontmatter e de todos os outros artigos.
 */
export function updateArticleInDocument(
  fullDoc: string,
  articleId: string,
  updatedBody: string,
): string {
  const parsed = parseMasterDocument(fullDoc);
  const target = parsed.articles.find((a) => a.id.toLowerCase() === articleId.toLowerCase());

  if (!target) {
    throw new Error(`Artigo com ID "${articleId}" não encontrado no documento.`);
  }

  const before = fullDoc.slice(0, target.startIndex);
  const isCrlf = fullDoc.includes("\r\n");
  const lb = isCrlf ? "\r\n" : "\n";

  // Reconstruir o bloco do artigo preservando o frontmatter idêntico
  const after = fullDoc.slice(target.endIndex);

  const cleanBody = updatedBody.trim();
  const reconstructedArticle = `---${lb}${target.frontmatterRaw}${lb}---${lb}${cleanBody}${after.startsWith("\r\n") || after.startsWith("\n") ? "" : lb}`;

  return `${before}${reconstructedArticle}${after}`;
}

/**
 * Remove completamente uma rotina do documento mestre OrionTN pos.md
 * (incluindo Frontmatter YAML, Metadados e Corpo).
 */
export function deleteArticleFromDocument(
  fullDoc: string,
  articleId: string,
): string {
  const parsed = parseMasterDocument(fullDoc);
  const target = parsed.articles.find(
    (a) => a.id.trim().toLowerCase() === articleId.trim().toLowerCase(),
  );

  if (!target) {
    throw new Error(`Rotina com ID "${articleId}" não encontrada no documento.`);
  }

  const before = fullDoc.slice(0, target.startIndex);
  const after = fullDoc.slice(target.endIndex);

  // Limpar quebras de linha excessivas residuais entre os artigos
  const cleanedBefore = before.replace(/\r?\n\s*$/, "");
  const cleanedAfter = after.replace(/^\s*\r?\n/, "");

  const isCrlf = fullDoc.includes("\r\n");
  const lb = isCrlf ? "\r\n" : "\n";

  if (!cleanedBefore) {
    return cleanedAfter;
  }

  if (!cleanedAfter) {
    return cleanedBefore;
  }

  return `${cleanedBefore}${lb}${lb}${cleanedAfter}`;
}

/**
 * Normaliza o texto markdown para comparação confiável de dirty state.
 */
export function normalizeMarkdown(str: string): string {
  if (!str) return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

