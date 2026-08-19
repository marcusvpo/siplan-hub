import React, { useState } from "react";
import { Play, Film, Loader2, ExternalLink } from "lucide-react";

interface BunnyVideoPlayerProps {
  url: string;
  title?: string;
}

export const BunnyVideoPlayer: React.FC<BunnyVideoPlayerProps> = ({ url, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Clean title if it contains emojis or prefix already
  const displayTitle = title ? title.replace(/^[▶️🎬🎥\s]+/, "").trim() : "Videoaula Tutorial - Orion TN";

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
            src={url}
            title={displayTitle || "Videoaula Orion TN"}
            loading="lazy"
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
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
