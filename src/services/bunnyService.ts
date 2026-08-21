import { supabase } from "@/integrations/supabase/client";

export interface BunnyVideoInfo {
  libraryId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  rawThumbnailUrl?: string;
  embedUrl: string;
  playUrl: string;
  durationSeconds?: number;
  formattedTimestamp?: string;
  isConnected: boolean;
}

/**
 * Extrai automaticamente o Library ID e o Video GUID a partir de uma URL ou string.
 * Suporta formatos:
 * - https://iframe.mediadelivery.net/play/467408/dd1681df-2c50-4b21-8ca9-e175ee298621
 * - https://iframe.mediadelivery.net/embed/467408/dd1681df-2c50-4b21-8ca9-e175ee298621?t=0
 * - dd1681df-2c50-4b21-8ca9-e175ee298621 (GUID direto)
 */
export function extractBunnyVideoIdentifiers(
  input: string,
  fallbackLibraryId = "467408",
): { libraryId: string; videoId: string; timestamp?: string; isValid: boolean } {
  if (!input) {
    return { libraryId: fallbackLibraryId, videoId: "", isValid: false };
  }

  const clean = input.trim();

  // 1. Extrair timestamp se houver na query param (?t=120 ou ?t=02:30)
  let extractedTimestamp: string | undefined = undefined;
  try {
    const urlObj = new URL(clean);
    const tParam = urlObj.searchParams.get("t");
    if (tParam) {
      if (/^\d+$/.test(tParam)) {
        const secs = parseInt(tParam, 10);
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        extractedTimestamp = `${String(mins).padStart(2, "0")}:${String(remSecs).padStart(2, "0")}`;
      } else {
        extractedTimestamp = tParam;
      }
    }
  } catch {
    // string simples
  }

  // 2. Extrair de URLs oficiais do Bunny Stream: iframe.mediadelivery.net/(play|embed)/{libraryId}/{guid}
  const urlMatch = clean.match(
    /(?:iframe\.mediadelivery\.net|video\.bunnycdn\.com|vz-\d+\.b-cdn\.net)\/(?:embed|play|library)?\/?(\d+)?\/?(?:videos\/)?([0-9a-fA-F-]{36})/,
  );

  if (urlMatch) {
    const libId = urlMatch[1] || fallbackLibraryId;
    const vidId = urlMatch[2];
    return {
      libraryId: libId,
      videoId: vidId,
      timestamp: extractedTimestamp,
      isValid: true,
    };
  }

  // 3. Extrair se for apenas um GUID de 36 caracteres
  const guidMatch = clean.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
  if (guidMatch) {
    return {
      libraryId: fallbackLibraryId,
      videoId: clean,
      timestamp: extractedTimestamp,
      isValid: true,
    };
  }

  return {
    libraryId: fallbackLibraryId,
    videoId: clean,
    timestamp: extractedTimestamp,
    isValid: clean.length >= 20,
  };
}

/**
 * Consulta a Edge Function para extrair o título real, capa em base64 e duração do vídeo Bunny.
 */
export async function fetchBunnyVideoInfo(
  libraryId: string,
  videoId: string,
): Promise<BunnyVideoInfo> {
  const cleanLibId = libraryId.trim() || "467408";
  const cleanVideoId = videoId.trim();

  if (!cleanVideoId) {
    throw new Error("GUID do vídeo não informado.");
  }

  try {
    const { data, error } = await supabase.functions.invoke("bunny-video-info", {
      body: { libraryId: cleanLibId, videoId: cleanVideoId },
    });

    if (!error && data?.success && data?.video) {
      return data.video as BunnyVideoInfo;
    }
  } catch (err) {
    console.warn("Aviso ao consultar edge function bunny-video-info:", err);
  }

  const defaultThumb = `https://vz-${cleanLibId}.b-cdn.net/${cleanVideoId}/thumbnail.jpg`;
  const embedUrl = `https://iframe.mediadelivery.net/embed/${cleanLibId}/${cleanVideoId}`;
  const playUrl = `https://iframe.mediadelivery.net/play/${cleanLibId}/${cleanVideoId}`;

  return {
    libraryId: cleanLibId,
    videoId: cleanVideoId,
    title: "",
    thumbnailUrl: defaultThumb,
    embedUrl,
    playUrl,
    isConnected: true,
  };
}
