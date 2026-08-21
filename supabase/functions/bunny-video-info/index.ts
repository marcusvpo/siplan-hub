const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUNNY_API_KEY =
  Deno.env.get("BUNNY_STREAM_API_KEY") ??
  Deno.env.get("BUNNY_API_KEY") ??
  "";

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ccedil;/g, 'Ç');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { libraryId, videoId } = await req.json();

    const cleanLibId = String(libraryId || "467408").trim();
    const cleanVideoId = String(videoId || "").trim();

    if (!cleanVideoId) {
      return new Response(
        JSON.stringify({ error: "O ID do vídeo (GUID) da Bunny é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const embedUrl = `https://iframe.mediadelivery.net/embed/${cleanLibId}/${cleanVideoId}`;
    const playUrl = `https://iframe.mediadelivery.net/play/${cleanLibId}/${cleanVideoId}`;

    let videoTitle = "";
    let durationSeconds = 0;
    let thumbnailUrl = `https://vz-${cleanLibId}.b-cdn.net/${cleanVideoId}/thumbnail.jpg`;
    let base64Thumbnail = "";

    // 1. Tentar consultar via Bunny Stream API oficial se a chave estiver configurada
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

    // 2. Extrair metadados reais diretamente da página Direct Play da Bunny
    try {
      const pageRes = await fetch(playUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();

        // Extrair Título
        if (!videoTitle) {
          const ogTitleMatch =
            html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
            html.match(/<title>([^<]+)<\/title>/i);

          if (ogTitleMatch && ogTitleMatch[1]) {
            videoTitle = decodeHtmlEntities(ogTitleMatch[1]).trim();
          }
        }

        // Extrair Duração
        if (!durationSeconds) {
          const durationMatch =
            html.match(/<meta[^>]*property=["']video:duration["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']video:duration["']/i);

          if (durationMatch && durationMatch[1]) {
            durationSeconds = parseInt(durationMatch[1], 10) || 0;
          }
        }

        // Extrair Thumbnail OG Image
        const ogImageMatch =
          html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

        if (ogImageMatch && ogImageMatch[1]) {
          thumbnailUrl = ogImageMatch[1];
        }

        // Baixar imagem do thumbnail com Referer e converter para Base64 para exibição perfeita no frontend
        if (thumbnailUrl) {
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

    // Formatar timestamp mm:ss ou hh:mm:ss
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
