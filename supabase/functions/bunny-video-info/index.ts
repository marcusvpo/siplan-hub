import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://hub.siplan.com.br",
  "https://siplanhub.vercel.app",
];

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin");
  const allowOrigin = isAllowedOrigin(origin) ? origin : DEFAULT_ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const BUNNY_API_KEY =
  Deno.env.get("BUNNY_STREAM_API_KEY") ??
  Deno.env.get("BUNNY_API_KEY") ??
  "";

const ALLOWED_LIBRARY_IDS = new Set(["467408"]);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSafeBunnyHost(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host.endsWith(".b-cdn.net") || host === "mediadelivery.net" || host.endsWith(".mediadelivery.net");
  } catch {
    return false;
  }
}

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&atilde;/g, "ã")
    .replace(/&otilde;/g, "õ")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Ccedil;/g, "Ç");
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { libraryId, videoId } = await req.json();

    const cleanLibId = String(libraryId || "467408").trim();
    const cleanVideoId = String(videoId || "").trim();

    if (!/^\d{1,10}$/.test(cleanLibId) || !ALLOWED_LIBRARY_IDS.has(cleanLibId)) {
      return new Response(
        JSON.stringify({ error: "Library ID da Bunny inválido ou não permitido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!UUID_REGEX.test(cleanVideoId)) {
      return new Response(
        JSON.stringify({ error: "O ID do vídeo (GUID) da Bunny é inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const embedUrl = `https://iframe.mediadelivery.net/embed/${cleanLibId}/${cleanVideoId}`;
    const playUrl = `https://iframe.mediadelivery.net/play/${cleanLibId}/${cleanVideoId}`;

    let videoTitle = "";
    let durationSeconds = 0;
    let thumbnailUrl = `https://vz-${cleanLibId}.b-cdn.net/${cleanVideoId}/thumbnail.jpg`;
    let base64Thumbnail = "";

    if (BUNNY_API_KEY) {
      try {
        const bunnyRes = await fetch(
          `https://video.bunnycdn.com/library/${cleanLibId}/videos/${cleanVideoId}`,
          {
            headers: {
              AccessKey: BUNNY_API_KEY,
              accept: "application/json",
            },
          },
        );

        if (bunnyRes.ok) {
          const data = await bunnyRes.json();
          videoTitle = data.title || "";
          durationSeconds = data.length || 0;
        }
      } catch (apiErr) {
        console.warn("Aviso ao consultar API Bunny:", apiErr);
      }
    }

    try {
      const pageRes = await fetch(playUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();

        if (!videoTitle) {
          const ogTitleMatch =
            html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
            html.match(/<title>([^<]+)<\/title>/i);

          if (ogTitleMatch && ogTitleMatch[1]) {
            videoTitle = decodeHtmlEntities(ogTitleMatch[1]).trim();
          }
        }

        if (!durationSeconds) {
          const durationMatch =
            html.match(/<meta[^>]*property=["']video:duration["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']video:duration["']/i);

          if (durationMatch && durationMatch[1]) {
            durationSeconds = parseInt(durationMatch[1], 10) || 0;
          }
        }

        const ogImageMatch =
          html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

        if (ogImageMatch && ogImageMatch[1] && isSafeBunnyHost(ogImageMatch[1])) {
          thumbnailUrl = ogImageMatch[1];
        }

        if (thumbnailUrl && isSafeBunnyHost(thumbnailUrl)) {
          try {
            const imgRes = await fetch(thumbnailUrl, {
              headers: { Referer: playUrl },
            });
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = "";
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              base64Thumbnail = `data:image/jpeg;base64,${btoa(binary)}`;
            }
          } catch (imgErr) {
            console.warn("Aviso ao converter thumbnail:", imgErr);
          }
        }
      }
    } catch (pageErr) {
      console.warn("Aviso ao extrair metadados da página de play:", pageErr);
    }

    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const remainingSeconds = durationSeconds % 60;

    let formattedTimestamp = "00:00";
    if (hours > 0) {
      formattedTimestamp = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    } else if (durationSeconds > 0) {
      formattedTimestamp = `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        video: {
          libraryId: cleanLibId,
          videoId: cleanVideoId,
          title: videoTitle || "Vídeo Tutorial Bunny.net",
          thumbnailUrl: base64Thumbnail || thumbnailUrl,
          rawThumbnailUrl: thumbnailUrl,
          embedUrl,
          playUrl,
          durationSeconds,
          formattedTimestamp,
          isConnected: true,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Erro na Edge Function bunny-video-info:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Erro ao consultar informações do vídeo no Bunny.net",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
