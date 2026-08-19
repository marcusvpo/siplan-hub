import { useEffect, useState } from "react";
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
        <SheetContent className="w-full sm:max-w-2xl">
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
