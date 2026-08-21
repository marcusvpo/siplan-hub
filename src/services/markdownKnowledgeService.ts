import * as yaml from "js-yaml";
import type {
  BunnyVideoMetadata,
  KnowledgeArticle,
  KnowledgeArticleMetadata,
  KnowledgeSection,
  MasterKnowledgeDocument,
} from "@/types/knowledge";

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
 * Analisa o documento mestre consolidado (`OrionTN pos.md`) e extrai as seções e todos os 366 artigos.
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
  // Regex compatível com todos os 366 artigos
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
 * Atualiza cirurgicamente o corpo de um artigo dentro do documento mestre,
 * preservando 100% da integridade do YAML frontmatter e de todos os outros artigos.
 */
export function updateArticleInDocument(
  fullDoc: string,
  articleId: string,
  updatedBody: string,
): string {
  const parsed = parseMasterDocument(fullDoc);
  const target = parsed.articles.find((a) => a.id === articleId);

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
