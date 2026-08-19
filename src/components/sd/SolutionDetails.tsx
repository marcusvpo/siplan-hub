import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  FolderTree,
  Loader2,
  Pencil,
  Server,
  Share2,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePermissions } from "@/hooks/usePermissions";
import { sanitizeSdSolutionHtml } from "@/lib/sd-solutions";
import { deleteSdSolution, getSdSolution } from "@/services/sd-solutions";
import type { SdSolucao } from "@/types/sd";

interface SolutionDetailsProps {
  solutionId: string | null;
  onClose: () => void;
  onEdit: (solution: SdSolucao) => void;
  onDeleted: () => void;
}

const PANEL_WIDTH_KEY = "sd-solution-details-width";
const MIN_PANEL_WIDTH = 520;
const DEFAULT_PANEL_WIDTH = 672;
const PANEL_VIEWPORT_MARGIN = 0.92;

function maxPanelWidth(): number {
  return Math.round(window.innerWidth * PANEL_VIEWPORT_MARGIN);
}

function clampPanelWidth(width: number): number {
  return Math.max(MIN_PANEL_WIDTH, Math.min(width, maxPanelWidth()));
}

function longDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SolutionDetails({
  solutionId,
  onClose,
  onEdit,
  onDeleted,
}: SolutionDetailsProps) {
  const { hasPermission } = usePermissions();
  const [solution, setSolution] = useState<SdSolucao | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    const savedWidth = Number(localStorage.getItem(PANEL_WIDTH_KEY));
    return clampPanelWidth(savedWidth >= MIN_PANEL_WIDTH ? savedWidth : DEFAULT_PANEL_WIDTH);
  });
  const [resizing, setResizing] = useState(false);

  const handleResizeMove = useCallback((event: PointerEvent) => {
    setPanelWidth(clampPanelWidth(window.innerWidth - event.clientX));
  }, []);

  const handleResizeEnd = useCallback(() => {
    setResizing(false);
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handleResizeEnd);
    window.addEventListener("pointercancel", handleResizeEnd);
    window.addEventListener("blur", handleResizeEnd);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeEnd);
      window.removeEventListener("pointercancel", handleResizeEnd);
      window.removeEventListener("blur", handleResizeEnd);
    };
  }, [handleResizeEnd, handleResizeMove, resizing]);

  useEffect(() => {
    if (!resizing) localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
  }, [panelWidth, resizing]);

  useEffect(() => {
    const handleWindowResize = () => setPanelWidth((current) => clampPanelWidth(current));
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    if (!solutionId) {
      setSolution(null);
      return;
    }

    let active = true;
    setLoading(true);
    getSdSolution(solutionId)
      .then((item) => {
        if (active) setSolution(item);
      })
      .catch(() => toast.error("Não foi possível abrir a solução."))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [solutionId]);

  const share = async () => {
    if (!solution) return;
    const url = new URL(window.location.href);
    url.searchParams.set("solucao", solution.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const remove = async () => {
    if (!solution) return;
    setDeleting(true);
    try {
      await deleteSdSolution(solution.id);
      toast.success("Solução excluída.");
      setConfirmDelete(false);
      onDeleted();
      onClose();
    } catch {
      toast.error("Não foi possível excluir a solução.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={Boolean(solutionId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          style={{ width: panelWidth, maxWidth: `${PANEL_VIEWPORT_MARGIN * 100}vw` }}
          className={`w-full sm:max-w-none ${resizing ? "transition-none" : ""}`}
        >
          <div
            role="separator"
            aria-label="Redimensionar painel de detalhes"
            aria-orientation="vertical"
            aria-valuemin={MIN_PANEL_WIDTH}
            aria-valuemax={maxPanelWidth()}
            aria-valuenow={panelWidth}
            tabIndex={0}
            className="group absolute -left-1 top-0 z-50 hidden h-full w-2 cursor-col-resize touch-none outline-none sm:block"
            title="Arraste para redimensionar; duplo clique restaura o tamanho padrão"
            onPointerDown={(event) => {
              event.preventDefault();
              setResizing(true);
            }}
            onDoubleClick={() => setPanelWidth(clampPanelWidth(DEFAULT_PANEL_WIDTH))}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setPanelWidth((current) => clampPanelWidth(current + 32));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setPanelWidth((current) => clampPanelWidth(current - 32));
              } else if (event.key === "Home") {
                event.preventDefault();
                setPanelWidth(clampPanelWidth(DEFAULT_PANEL_WIDTH));
              }
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-16 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition-colors group-hover:bg-primary group-focus:bg-primary" />
          </div>
          {!solution && (
            <SheetHeader className="sr-only">
              <SheetTitle>{loading ? "Carregando solução" : "Solução não encontrada"}</SheetTitle>
              <SheetDescription>Detalhes da solução cadastrada no SD</SheetDescription>
            </SheetHeader>
          )}
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !solution ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Solução não encontrada.
            </div>
          ) : (
            <div className="space-y-6 pb-8">
              <SheetHeader className="pr-8">
                <SheetTitle className="text-2xl leading-tight">{solution.titulo}</SheetTitle>
                <SheetDescription>Detalhes da solução cadastrada no SD</SheetDescription>
              </SheetHeader>

              <div className="flex flex-wrap gap-2 border-y py-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={share}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Link copiado" : "Compartilhar"}
                </Button>
                {hasPermission("sd_solutions", "edit") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onEdit(solution)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
                {hasPermission("sd_solutions", "delete") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                )}
              </div>

              <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Server className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sistema</p>
                    <p className="text-sm font-medium">{solution.sistema?.nome || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FolderTree className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rotina</p>
                    <p className="text-sm font-medium">{solution.rotina?.nome || "Sem rotina"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cadastrada em</p>
                    <p className="text-sm font-medium">{longDate(solution.criado_em)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Atualizada em</p>
                    <p className="text-sm font-medium">
                      {longDate(solution.atualizado_em || solution.criado_em)}
                    </p>
                  </div>
                </div>
              </div>

              {solution.palavras_chave.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Tag className="h-4 w-4 text-primary" />
                    Palavras-chave
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {solution.palavras_chave.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Descrição da solução</h3>
                {solution.descricao ? (
                  <div
                    className="sd-solution-content rounded-xl border bg-card p-5 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeSdSolutionHtml(solution.descricao),
                    }}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Nenhuma descrição informada.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solução?</AlertDialogTitle>
            <AlertDialogDescription>
              “{solution?.titulo}” será removida permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
