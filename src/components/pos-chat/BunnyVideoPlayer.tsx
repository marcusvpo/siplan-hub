import React, { useState, useRef, useMemo, useCallback } from "react";
import { Play, Film, Loader2, ExternalLink, Clock } from "lucide-react";
import { formatSecondsToTimestamp } from "@/services/markdownKnowledgeService";

export interface BunnyVideoPlayerProps {
  url: string;
  title?: string;
  startSeconds?: number;
  timestamp?: string;
}

/**
 * Ensures Bunny.net stream embed URL always contains:
 * - autoplay=false
 * - preload=true
 * - playerjs=true
 * - t=${startSeconds} when startSeconds is provided or extracted from URL.
 * If URL already contains t=..., it is kept or updated with startSeconds.
 */
export function formatBunnyEmbedUrl(rawUrl: string, startSeconds?: number): string {
  if (!rawUrl) return rawUrl;
  try {
    const isRelative = !/^https?:\/\//i.test(rawUrl);
    const parsed = new URL(rawUrl, "https://iframe.mediadelivery.net");
    parsed.searchParams.set("autoplay", "false");
    parsed.searchParams.set("preload", "true");
    parsed.searchParams.set("playerjs", "true");

    if (startSeconds !== undefined && startSeconds !== null && !isNaN(startSeconds)) {
      parsed.searchParams.set("t", String(startSeconds));
    }
    return isRelative ? `${parsed.pathname}${parsed.search}` : parsed.toString();
  } catch {
    let cleaned = rawUrl;
    cleaned = cleaned.replace(/([?&])autoplay=[^&]*/gi, "");
    cleaned = cleaned.replace(/([?&])preload=[^&]*/gi, "");
    cleaned = cleaned.replace(/([?&])playerjs=[^&]*/gi, "");
    if (startSeconds !== undefined && startSeconds !== null && !isNaN(startSeconds)) {
      cleaned = cleaned.replace(/([?&])t=[^&]*/gi, "");
    }
    const sep = cleaned.includes("?") ? "&" : "?";
    let params = `autoplay=false&preload=true&playerjs=true`;
    if (startSeconds !== undefined && startSeconds !== null && !isNaN(startSeconds)) {
      params += `&t=${startSeconds}`;
    }
    return `${cleaned}${sep}${params}`;
  }
}

export const BunnyVideoPlayer: React.FC<BunnyVideoPlayerProps> = ({
  url,
  title,
  startSeconds,
  timestamp,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Determinar startSeconds efetivo (via prop ou searchParam t da URL)
  const effectiveStartSeconds = useMemo(() => {
    if (startSeconds !== undefined && startSeconds !== null && !isNaN(startSeconds)) {
      return startSeconds;
    }
    try {
      const parsed = new URL(url, "https://iframe.mediadelivery.net");
      const t = parsed.searchParams.get("t");
      if (t) {
        const parsedVal = parseInt(t, 10);
        return isNaN(parsedVal) ? undefined : parsedVal;
      }
    } catch {
      const match = url.match(/[?&]t=(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return undefined;
  }, [url, startSeconds]);

  // Timestamp formatado para exibição no cabeçalho
  const displayTimestamp = useMemo(() => {
    if (timestamp && timestamp.trim()) {
      return timestamp.trim();
    }
    if (effectiveStartSeconds !== undefined && effectiveStartSeconds > 0) {
      return formatSecondsToTimestamp(effectiveStartSeconds);
    }
    return undefined;
  }, [timestamp, effectiveStartSeconds]);

  const embedUrl = useMemo(() => {
    return formatBunnyEmbedUrl(url, effectiveStartSeconds);
  }, [url, effectiveStartSeconds]);

  // Clean title if it contains emojis or prefix already
  const displayTitle = title ? title.replace(/^[▶️🎬🎥\s]+/, "").trim() : "Videoaula Tutorial - Orion TN";

  // Envia comando via bridge player.js para posicionar o tempo
  const seekToStart = useCallback(() => {
    if (effectiveStartSeconds !== undefined && effectiveStartSeconds > 0 && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            context: "player.js",
            method: "setCurrentTime",
            value: effectiveStartSeconds,
          }),
          "*"
        );
      } catch (err) {
        console.warn("Falha ao comunicar com player.js:", err);
      }
    }
  }, [effectiveStartSeconds]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (effectiveStartSeconds !== undefined && effectiveStartSeconds > 0) {
      seekToStart();
      // Envio complementar para garantir caso o player.js termine de inicializar logo após o load
      const timer = setTimeout(seekToStart, 600);
      return () => clearTimeout(timer);
    }
  };

  return (
    <div className="bunny-player-container my-3.5 max-w-xl w-full">
      {displayTitle && (
        <div className="bunny-player-header flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            <span className="flex h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 items-center justify-center shrink-0">
              <Play className="h-2.5 w-2.5 fill-current" />
            </span>
            <span className="truncate">{displayTitle}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {displayTimestamp && (
              <button
                type="button"
                onClick={seekToStart}
                title={`Pular para o início da rotina aos ${displayTimestamp}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50 transition-colors shadow-2xs cursor-pointer"
              >
                <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>Início aos {displayTimestamp}</span>
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-rose-600 flex items-center gap-0.5 shrink-0 transition-colors"
              title="Abrir vídeo em nova aba"
            >
              Abrir <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </a>
          </div>
        </div>
      )}

      <div className="video-aspect-wrapper relative w-full aspect-video rounded-xl overflow-hidden shadow-md bg-slate-950 border border-slate-200 dark:border-neutral-800">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 text-xs gap-2 z-10">
            <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
            <span className="text-[11px] font-medium animate-pulse">Carregando videoaula...</span>
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs p-4 text-center">
            <Film className="h-6 w-6 text-rose-400 mb-1" />
            <p>Não foi possível carregar o player embutido.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-rose-400 underline text-[11px]"
            >
              Clique aqui para assistir diretamente
            </a>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={displayTitle || "Videoaula Orion TN"}
            loading="lazy"
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>
    </div>
  );
};

