import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Video, Clock } from "lucide-react";
import type { BunnyVideoMetadata } from "@/types/knowledge";

interface BunnyVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: BunnyVideoMetadata | undefined;
  articleTitle?: string;
  articleId?: string;
}

export function BunnyVideoModal({
  isOpen,
  onClose,
  video,
  articleTitle,
  articleId,
}: BunnyVideoModalProps) {
  if (!video || !video.tem_video) return null;

  // URL do player iframe Bunny.net com parâmetros start_seconds, autoplay e playerjs
  const startSeconds = video.video_start_seconds || 0;

  let embedUrl: string | null = null;
  if (video.video_url) {
    try {
      const parsed = new URL(video.video_url);
      parsed.searchParams.set("t", String(startSeconds));
      parsed.searchParams.set("autoplay", "true");
      parsed.searchParams.set("playerjs", "true");
      if (!parsed.searchParams.has("preload")) {
        parsed.searchParams.set("preload", "true");
      }
      embedUrl = parsed.toString();
    } catch {
      let cleaned = video.video_url.replace(/([?&])(autoplay|playerjs|t)=[^&]*/gi, "");
      const sep = cleaned.includes("?") ? "&" : "?";
      embedUrl = `${cleaned}${sep}t=${startSeconds}&autoplay=true&playerjs=true`;
    }
  } else if (video.bunny_library_id && video.bunny_video_id) {
    embedUrl = `https://iframe.mediadelivery.net/embed/${video.bunny_library_id}/${video.bunny_video_id}?t=${startSeconds}&autoplay=true&playerjs=true`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-4xl overflow-hidden border-border bg-background p-0 shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            {articleId && (
              <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">
                {articleId}
              </Badge>
            )}
            <DialogTitle className="text-base font-bold truncate">
              {video.video_title || articleTitle || "Vídeo Tutorial Orion TN"}
            </DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Video className="h-3.5 w-3.5 text-primary" />
              Treinamento Bunny.net
            </span>
            {video.video_timestamp && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Início em: {video.video_timestamp}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={video.video_title || "Bunny Video Player"}
              className="w-full h-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Vídeo não disponível ou URL de streaming não configurada.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
