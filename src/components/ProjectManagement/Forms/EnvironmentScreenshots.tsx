import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EnvironmentScreenshot } from "@/types/ProjectV2";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, ImageIcon, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BUCKET = "project-files";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB por imagem

// Remove acentos/chars invalidos do nome do arquivo (evita "Invalid key" no Storage).
function sanitize(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // remove acentos combinantes
    .replace(/[^\w.\-() ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 200);
}

interface EnvironmentScreenshotsProps {
  projectId?: string;
  screenshots?: EnvironmentScreenshot[];
  onChange: (next: EnvironmentScreenshot[]) => void;
  canEdit: boolean;
  uploadedBy?: string;
}

/**
 * Galeria de prints da etapa 4 (Preparacao de Ambiente). O analista anexa
 * screenshots do sistema configurado. Binarios vao para o bucket 'project-files'
 * (privado); as referencias (path + metadados) ficam em stages.environment.screenshots.
 * URLs de exibicao sao assinadas sob demanda (bucket nao e publico).
 */
export function EnvironmentScreenshots({
  projectId,
  screenshots = [],
  onChange,
  canEdit,
  uploadedBy,
}: EnvironmentScreenshotsProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<EnvironmentScreenshot | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gera URLs assinadas para os paths atuais (lote). Refaz quando a lista muda.
  const pathsKey = screenshots.map((s) => s.path).join("|");
  useEffect(() => {
    const paths = screenshots.map((s) => s.path);
    if (paths.length === 0) {
      setUrls({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 3600);
      if (cancelled || error || !data) return;
      const map: Record<string, string> = {};
      data.forEach((d) => {
        if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      });
      setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !projectId || !canEdit) return;
      setUploading(true);
      const added: EnvironmentScreenshot[] = [];
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) {
            toast.error(`"${file.name}" não é uma imagem.`);
            continue;
          }
          if (file.size > MAX_SIZE) {
            toast.error(`"${file.name}" excede 10 MB.`);
            continue;
          }
          const path = `${projectId}/environment-screenshots/${crypto.randomUUID()}-${sanitize(file.name)}`;
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { contentType: file.type });
          if (error) {
            console.error("Erro no upload do print:", error);
            toast.error(`Falha ao enviar "${file.name}".`);
            continue;
          }
          added.push({
            path,
            name: file.name,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
          });
        }
        if (added.length) {
          onChange([...screenshots, ...added]);
          toast.success(
            added.length === 1 ? "Print adicionado." : `${added.length} prints adicionados.`
          );
        }
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [projectId, canEdit, screenshots, onChange, uploadedBy]
  );

  const removeShot = async (shot: EnvironmentScreenshot) => {
    if (!canEdit) return;
    const { error } = await supabase.storage.from(BUCKET).remove([shot.path]);
    if (error) {
      // Segue removendo a referencia mesmo se o storage falhar (limpeza de orfao).
      console.error("Erro ao remover print do storage:", error);
    }
    onChange(screenshots.filter((s) => s.path !== shot.path));
  };

  const hasShots = screenshots.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-indigo-500" />
            Galeria de Imagens
            {hasShots && (
              <span className="text-muted-foreground">({screenshots.length})</span>
            )}
          </Label>
        </div>
        {canEdit && projectId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-7 gap-1 text-xs"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading ? "Enviando…" : "Adicionar prints"}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        Anexe prints da tela com o sistema configurado. Clique numa imagem para ampliar.
      </p>

      {!hasShots ? (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-6 text-center text-[11px] text-muted-foreground italic bg-slate-50/30 dark:bg-slate-950/10">
          Nenhum print anexado.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {screenshots.map((shot) => (
            <div
              key={shot.path}
              className="group relative rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-video"
            >
              {urls[shot.path] ? (
                <button
                  type="button"
                  onClick={() => setLightbox(shot)}
                  className="block h-full w-full"
                  title={shot.name}
                >
                  <img
                    src={urls[shot.path]}
                    alt={shot.name}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeShot(shot)}
                  title="Remover print"
                  className={cn(
                    "absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-red-600 hover:text-white"
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              <span className="absolute bottom-0 inset-x-0 truncate bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                {shot.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-[90vw] w-fit">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center justify-between gap-3 pr-8">
              <span className="truncate">{lightbox?.name}</span>
              {lightbox && urls[lightbox.path] && (
                <a
                  href={urls[lightbox.path]}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <Download className="h-3.5 w-3.5" />
                  Abrir
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {lightbox && urls[lightbox.path] && (
            <img
              src={urls[lightbox.path]}
              alt={lightbox.name}
              className="max-h-[80vh] w-auto rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
