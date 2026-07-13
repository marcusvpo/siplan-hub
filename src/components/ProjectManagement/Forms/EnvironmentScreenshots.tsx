import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EnvironmentScreenshot } from "@/types/ProjectV2";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, ImageIcon, Download, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// Thumbnail arrastavel (reordena a galeria). O drag so inicia apos mover ~8px
// (activationConstraint), entao clicar na imagem/lixeira continua funcionando.
function SortableThumb({
  shot,
  url,
  canEdit,
  onOpen,
  onRemove,
}: {
  shot: EnvironmentScreenshot;
  url?: string;
  canEdit: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: shot.path, disabled: !canEdit });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-video touch-none",
        canEdit && "cursor-grab active:cursor-grabbing"
      )}
    >
      {url ? (
        <button type="button" onClick={onOpen} className="block h-full w-full" title={shot.name}>
          <img
            src={url}
            alt={shot.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            draggable={false}
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
          onClick={onRemove}
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
  );
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
  const [open, setOpen] = useState(false); // card recolhido por padrao
  const [dragOver, setDragOver] = useState(false); // arrastando arquivos do SO
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = screenshots.findIndex((s) => s.path === active.id);
    const newIndex = screenshots.findIndex((s) => s.path === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(screenshots, oldIndex, newIndex));
  };

  // --- Drop de arquivos do SO (drag-and-drop nativo do navegador) ---
  const canUpload = canEdit && !!projectId;
  const hasFiles = (e: React.DragEvent) => e.dataTransfer?.types?.includes("Files");
  const onZoneDragOver = (e: React.DragEvent) => {
    if (!canUpload || !hasFiles(e)) return;
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };
  const onZoneDragLeave = (e: React.DragEvent) => {
    // So limpa quando o ponteiro sai do proprio dropzone (nao dos filhos).
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };
  const onZoneDrop = (e: React.DragEvent) => {
    if (!canUpload || !hasFiles(e)) return;
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 group"
          title={open ? "Recolher" : "Expandir"}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <div className="h-0.5 w-6 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 cursor-pointer group-hover:text-foreground transition-colors">
            <ImageIcon className="h-3 w-3 text-indigo-500" />
            Galeria de Imagens
            {hasShots && (
              <span className="text-muted-foreground">({screenshots.length})</span>
            )}
          </Label>
        </button>
        {open && canEdit && projectId && (
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

      {open && (
        <div
          onDragOver={onZoneDragOver}
          onDragLeave={onZoneDragLeave}
          onDrop={onZoneDrop}
          className={cn(
            "relative space-y-2 rounded-lg transition-colors",
            dragOver &&
              "ring-2 ring-indigo-400 ring-offset-2 ring-offset-background bg-indigo-50/40 dark:bg-indigo-950/20"
          )}
        >
          <p className="text-[11px] text-muted-foreground px-1">
            Anexe prints da tela com o sistema configurado. Arraste imagens do seu computador
            para cá ou clique em "Adicionar prints". Clique numa imagem para ampliar.
          </p>

          {!hasShots ? (
            <div className="rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 py-6 text-center text-[11px] text-muted-foreground italic bg-neutral-50/30 dark:bg-neutral-950/10">
              {canUpload
                ? "Nenhum print anexado. Arraste imagens para cá."
                : "Nenhum print anexado."}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={screenshots.map((s) => s.path)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {screenshots.map((shot) => (
                    <SortableThumb
                      key={shot.path}
                      shot={shot}
                      url={urls[shot.path]}
                      canEdit={canEdit}
                      onOpen={() => setLightbox(shot)}
                      onRemove={() => removeShot(shot)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-indigo-500/10">
              <span className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                Solte as imagens para anexar
              </span>
            </div>
          )}
        </div>
      )}

      {/* Lightbox (tela cheia) */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-[96vw] sm:max-w-[96vw] w-[96vw] h-[95vh] flex flex-col p-4 gap-3">
          <DialogHeader className="shrink-0">
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
                  Abrir em nova aba
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {lightbox && urls[lightbox.path] && (
            <div className="flex-1 min-h-0 overflow-auto rounded-md bg-black/5 dark:bg-black/40 flex items-center justify-center">
              <img
                src={urls[lightbox.path]}
                alt={lightbox.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
