import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Server,
  Trash2,
  X,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import {
  createSdFamily,
  deleteSdFamily,
  listSdFamilies,
  listSdSystems,
  updateSdFamily,
  updateSdSystemFamily,
} from "@/services/sd-solutions";
import type { SdFamilia, SdSistema } from "@/types/sd";

interface FamiliesManagerProps {
  onChanged?: () => void;
}

const SYSTEMS_PER_PAGE = 4;
const nameCollator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return String(error.code);
}

export function FamiliesManager({ onChanged }: FamiliesManagerProps) {
  const { hasPermission } = usePermissions();
  const [families, setFamilies] = useState<SdFamilia[]>([]);
  const [systems, setSystems] = useState<SdSistema[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingFamily, setEditingFamily] = useState<SdFamilia | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SdFamilia | null>(null);

  const allowed = hasPermission("sd_solutions", "manage");
  const sortedFamilies = useMemo(
    () => [...families].sort((left, right) => nameCollator.compare(left.nome, right.nome)),
    [families],
  );
  const sortedSystems = useMemo(
    () => [...systems].sort((left, right) => nameCollator.compare(left.nome, right.nome)),
    [systems],
  );
  const totalPages = Math.max(1, Math.ceil(sortedSystems.length / SYSTEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedSystems = sortedSystems.slice(
    (currentPage - 1) * SYSTEMS_PER_PAGE,
    currentPage * SYSTEMS_PER_PAGE,
  );

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [familyItems, systemItems] = await Promise.all([
        listSdFamilies(),
        listSdSystems(),
      ]);
      setFamilies(familyItems);
      setSystems(systemItems);
    } catch {
      setError("Não foi possível carregar as famílias e os vínculos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const runMutation = async (operation: () => Promise<void>, success: string) => {
    setSaving(true);
    setError("");
    try {
      await operation();
      toast.success(success);
      await load();
      onChanged?.();
      return true;
    } catch (mutationError) {
      setError(
        errorCode(mutationError) === "23505"
          ? "Já existe uma família com esse nome."
          : "Não foi possível concluir a operação.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addFamily = async () => {
    const name = newName.trim();
    if (!name) return setError("Informe o nome da família.");

    if (
      await runMutation(
        () => createSdFamily(name, newDescription.trim() || null),
        "Família adicionada.",
      )
    ) {
      setNewName("");
      setNewDescription("");
      setShowNewFamily(false);
    }
  };

  const saveFamily = async () => {
    const name = editingName.trim();
    if (!editingFamily || !name) return setError("Informe o nome da família.");

    if (
      await runMutation(
        () => updateSdFamily(editingFamily.id, name, editingDescription.trim() || null),
        "Família atualizada.",
      )
    ) {
      setEditingFamily(null);
    }
  };

  const removeFamily = async () => {
    if (!deleteTarget) return;
    if (await runMutation(() => deleteSdFamily(deleteTarget.id), "Família removida.")) {
      setDeleteTarget(null);
    }
  };

  const changeSystemFamily = async (system: SdSistema, value: string) => {
    await runMutation(
      () => updateSdSystemFamily(system.id, value === "none" ? null : value),
      value === "none" ? "Vínculo removido." : "Sistema vinculado à família.",
    );
  };

  if (!allowed) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Você não tem permissão para gerenciar famílias do SD.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Card>
        <CardHeader className="flex-col items-stretch gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Famílias de sistemas</CardTitle>
            <CardDescription className="mt-1">
              Crie os grupos que vão organizar a busca de soluções.
            </CardDescription>
          </div>
          {!showNewFamily && (
            <Button size="sm" className="shrink-0 gap-2" onClick={() => setShowNewFamily(true)}>
              <Plus className="h-4 w-4" />
              Nova família
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showNewFamily && (
            <div className="grid gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:grid-cols-[1fr_1.5fr_auto_auto]">
              <Input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Nome da família"
                autoFocus
              />
              <Input
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void addFamily()}
                placeholder="Descrição (opcional)"
              />
              <Button size="sm" className="h-10 gap-2" disabled={saving} onClick={() => void addFamily()}>
                <Check className="h-4 w-4" /> Adicionar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                aria-label="Cancelar nova família"
                onClick={() => {
                  setShowNewFamily(false);
                  setNewName("");
                  setNewDescription("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : sortedFamilies.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhuma família cadastrada. Crie a primeira para organizar os sistemas.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sortedFamilies.map((family) => {
                const linkedSystems = sortedSystems.filter((system) => system.familia_id === family.id);
                const isEditing = editingFamily?.id === family.id;

                return (
                  <div key={family.id} className="rounded-xl border bg-card p-4">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          placeholder="Nome da família"
                          autoFocus
                        />
                        <Input
                          value={editingDescription}
                          onChange={(event) => setEditingDescription(event.target.value)}
                          onKeyDown={(event) => event.key === "Enter" && void saveFamily()}
                          placeholder="Descrição (opcional)"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingFamily(null)}>
                            Cancelar
                          </Button>
                          <Button size="sm" disabled={saving} onClick={() => void saveFamily()}>
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FolderTree className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold">{family.nome}</h3>
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                              {family.descricao || "Sem descrição."}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Editar família ${family.nome}`}
                            onClick={() => {
                              setEditingFamily(family);
                              setEditingName(family.nome);
                              setEditingDescription(family.descricao || "");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Excluir família ${family.nome}`}
                            onClick={() => setDeleteTarget(family)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {linkedSystems.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Nenhum sistema vinculado</span>
                          ) : (
                            linkedSystems.map((system) => (
                              <Badge key={system.id} variant="secondary">{system.nome}</Badge>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">Vínculo dos sistemas</CardTitle>
              <CardDescription className="mt-1">
                Escolha em qual família cada sistema será exibido.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && sortedSystems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum sistema cadastrado.
            </div>
          ) : (
            paginatedSystems.map((system) => (
              <div key={system.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Server className="h-4 w-4" />
                  </div>
                  <span className="truncate text-sm font-medium">{system.nome}</span>
                </div>
                <Select
                  value={system.familia_id || "none"}
                  disabled={saving}
                  onValueChange={(value) => void changeSystemFamily(system, value)}
                >
                  <SelectTrigger className="w-full sm:w-64" aria-label={`Família do sistema ${system.nome}`}>
                    <SelectValue placeholder="Sem família" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem família</SelectItem>
                    {sortedFamilies.map((family) => (
                      <SelectItem key={family.id} value={family.id}>{family.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}

          {sortedSystems.length > SYSTEMS_PER_PAGE && (
            <div className="flex flex-col gap-3 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando <strong className="font-semibold text-foreground">
                  {(currentPage - 1) * SYSTEMS_PER_PAGE + 1}–{Math.min(currentPage * SYSTEMS_PER_PAGE, sortedSystems.length)}
                </strong>{" "}de <strong className="font-semibold text-foreground">{sortedSystems.length}</strong> sistemas
              </span>
              <div className="flex items-center gap-2">
                <span className="min-w-24 text-center">Página {currentPage} de {totalPages}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Página anterior de vínculos"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Próxima página de vínculos"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover família?</AlertDialogTitle>
            <AlertDialogDescription>
              A família “{deleteTarget?.nome}” será removida. Os sistemas vinculados passarão para “Sem família” e nenhuma solução será excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void removeFamily();
              }}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
