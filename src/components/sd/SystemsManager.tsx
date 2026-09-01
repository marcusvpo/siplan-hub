import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderTree,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import {
  createSdRoutine,
  createSdSystem,
  deleteSdRoutine,
  deleteSdSystem,
  listSdSystemsWithRoutines,
  updateSdRoutine,
  updateSdSystem,
} from "@/services/sd-solutions";
import type { SdRotina, SdSistema, SdSistemaComRotinas } from "@/types/sd";

type DeleteTarget =
  | { type: "system"; item: SdSistema }
  | { type: "routine"; item: SdRotina; systemName: string };

const SYSTEMS_PER_PAGE = 4;
const systemNameCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return String(error.code);
}

export function SystemsManager() {
  const { hasPermission } = usePermissions();
  const [systems, setSystems] = useState<SdSistemaComRotinas[]>([]);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newSystem, setNewSystem] = useState("");
  const [showNewSystem, setShowNewSystem] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SdSistema | null>(null);
  const [editingSystemName, setEditingSystemName] = useState("");
  const [newRoutineSystemId, setNewRoutineSystemId] = useState<string | null>(null);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [editingRoutine, setEditingRoutine] = useState<SdRotina | null>(null);
  const [editingRoutineName, setEditingRoutineName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const allowed = hasPermission("sd_solutions", "manage");
  const sortedSystems = useMemo(
    () => [...systems].sort((left, right) => systemNameCollator.compare(left.nome, right.nome)),
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
      setSystems(await listSdSystemsWithRoutines());
    } catch {
      setError("Não foi possível carregar os sistemas e rotinas.");
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
      return true;
    } catch (mutationError) {
      if (errorCode(mutationError) === "23505") {
        setError("Já existe um item com esse nome.");
      } else if (errorCode(mutationError) === "23503") {
        setError("O sistema não pode ser removido enquanto possuir soluções vinculadas.");
      } else {
        setError("Não foi possível concluir a operação.");
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addSystem = async () => {
    const name = newSystem.trim();
    if (!name) return setError("Informe o nome do sistema.");
    if (await runMutation(() => createSdSystem(name), "Sistema adicionado.")) {
      setNewSystem("");
      setShowNewSystem(false);
    }
  };

  const saveSystem = async () => {
    const name = editingSystemName.trim();
    if (!editingSystem || !name) return;
    if (await runMutation(() => updateSdSystem(editingSystem.id, name), "Sistema atualizado.")) {
      setEditingSystem(null);
      setEditingSystemName("");
    }
  };

  const addRoutine = async (systemId: string) => {
    const name = newRoutineName.trim();
    if (!name) return setError("Informe o nome da rotina.");
    if (await runMutation(() => createSdRoutine(systemId, name), "Rotina adicionada.")) {
      setNewRoutineSystemId(null);
      setNewRoutineName("");
      setExpanded((current) => new Set(current).add(systemId));
    }
  };

  const saveRoutine = async () => {
    const name = editingRoutineName.trim();
    if (!editingRoutine || !name) return;
    if (await runMutation(() => updateSdRoutine(editingRoutine.id, name), "Rotina atualizada.")) {
      setEditingRoutine(null);
      setEditingRoutineName("");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const successful = await runMutation(
      () =>
        deleteTarget.type === "system"
          ? deleteSdSystem(deleteTarget.item.id)
          : deleteSdRoutine(deleteTarget.item.id),
      deleteTarget.type === "system" ? "Sistema removido." : "Rotina removida.",
    );
    if (successful) setDeleteTarget(null);
  };

  if (!allowed) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Você não tem permissão para gerenciar sistemas e rotinas do SD.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="flex-col items-stretch gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Sistemas e rotinas</CardTitle>
          <CardDescription className="mt-1">
            Organize as categorias usadas no cadastro de soluções.
          </CardDescription>
        </div>
        {!showNewSystem && (
          <Button size="sm" className="shrink-0 gap-2" onClick={() => setShowNewSystem(true)}>
            <Plus className="h-4 w-4" />
            Novo sistema
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

        {showNewSystem && (
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row">
            <Input
              value={newSystem}
              onChange={(event) => setNewSystem(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void addSystem()}
              placeholder="Nome do sistema"
              autoFocus
            />
            <Button size="sm" className="h-10 gap-2" disabled={saving} onClick={() => void addSystem()}>
              <Check className="h-4 w-4" /> Adicionar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              onClick={() => {
                setShowNewSystem(false);
                setNewSystem("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : systems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nenhum sistema cadastrado.
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedSystems.map((system) => {
              const isExpanded = expanded.has(system.id);
              const isEditing = editingSystem?.id === system.id;
              return (
                <div key={system.id} className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex items-center gap-2 p-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        setExpanded((current) => {
                          const next = new Set(current);
                          if (next.has(system.id)) next.delete(system.id);
                          else next.add(system.id);
                          return next;
                        })
                      }
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Server className="h-4 w-4" />
                    </div>

                    {isEditing ? (
                      <div className="flex min-w-0 flex-1 gap-2">
                        <Input
                          value={editingSystemName}
                          onChange={(event) => setEditingSystemName(event.target.value)}
                          onKeyDown={(event) => event.key === "Enter" && void saveSystem()}
                          className="h-9"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => void saveSystem()}>
                          <Check className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditingSystem(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p data-testid="sd-system-name" className="truncate text-sm font-medium">
                            {system.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {system.rotinas.length} {system.rotinas.length === 1 ? "rotina" : "rotinas"}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingSystem(system);
                            setEditingSystemName(system.nome);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ type: "system", item: system })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {isExpanded && !isEditing && (
                    <div className="space-y-1 border-t bg-muted/20 px-4 py-3 sm:pl-16">
                      {system.rotinas.map((routine) => {
                        const routineIsEditing = editingRoutine?.id === routine.id;
                        return (
                          <div key={routine.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background">
                            <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {routineIsEditing ? (
                              <>
                                <Input
                                  value={editingRoutineName}
                                  onChange={(event) => setEditingRoutineName(event.target.value)}
                                  onKeyDown={(event) => event.key === "Enter" && void saveRoutine()}
                                  className="h-8"
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void saveRoutine()}>
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingRoutine(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="min-w-0 flex-1 truncate text-sm">{routine.nome}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingRoutine(routine);
                                    setEditingRoutineName(routine.nome);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "routine",
                                      item: routine,
                                      systemName: system.nome,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {newRoutineSystemId === system.id ? (
                        <div className="flex flex-col gap-2 rounded-md border border-primary/30 bg-background p-2 sm:flex-row">
                          <Input
                            value={newRoutineName}
                            onChange={(event) => setNewRoutineName(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && void addRoutine(system.id)}
                            placeholder="Nome da rotina"
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" className="h-8 gap-1" onClick={() => void addRoutine(system.id)}>
                            <Check className="h-3.5 w-3.5" /> Adicionar
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setNewRoutineSystemId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground"
                          onClick={() => {
                            setNewRoutineSystemId(system.id);
                            setNewRoutineName("");
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Nova rotina
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {sortedSystems.length > SYSTEMS_PER_PAGE && (
              <div className="flex flex-col gap-3 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Mostrando{" "}
                  <strong className="font-semibold text-foreground">
                    {(currentPage - 1) * SYSTEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * SYSTEMS_PER_PAGE, sortedSystems.length)}
                  </strong>{" "}
                  de <strong className="font-semibold text-foreground">{sortedSystems.length}</strong> sistemas
                </span>
                <div className="flex items-center gap-2">
                  <span className="min-w-24 text-center">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Página anterior de sistemas"
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
                    aria-label="Próxima página de sistemas"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover {deleteTarget?.type === "system" ? "sistema" : "rotina"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "system"
                ? `O sistema “${deleteTarget.item.nome}” e suas rotinas serão removidos. Sistemas com soluções vinculadas são protegidos contra exclusão.`
                : `A rotina “${deleteTarget?.item.nome}” será removida de “${deleteTarget?.systemName}”. As soluções permanecerão cadastradas sem rotina.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
