import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MY_DAY_BOARD_COLORS,
  type MyDayBoard,
  type MyDayBoardColumn,
} from "@/lib/my-day-board";
import { cn } from "@/lib/utils";

interface MyDayBoardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: MyDayBoard | null;
  columns: MyDayBoardColumn[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isSaving: boolean;
  onSaveBoard: (input: { name: string; description?: string | null; color: string }) => Promise<unknown>;
  onSetDefault?: () => Promise<unknown>;
  onDeleteBoard?: () => Promise<unknown>;
  onCreateColumn?: (input: { title: string; color: string }) => Promise<unknown>;
  onUpdateColumn?: (id: string, input: { title: string; color: string }) => Promise<unknown>;
  onReorderColumns?: (orderedIds: string[]) => Promise<unknown>;
  onDeleteColumn?: (id: string) => Promise<unknown>;
}

export function MyDayBoardSettingsDialog({
  open,
  onOpenChange,
  board,
  columns,
  canCreate,
  canEdit,
  canDelete,
  isSaving,
  onSaveBoard,
  onSetDefault,
  onDeleteBoard,
  onCreateColumn,
  onUpdateColumn,
  onReorderColumns,
  onDeleteColumn,
}: MyDayBoardSettingsDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(MY_DAY_BOARD_COLORS[0]);
  const [columnDrafts, setColumnDrafts] = useState<Record<string, { title: string; color: string }>>({});
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnColor, setNewColumnColor] = useState<string>(MY_DAY_BOARD_COLORS[7]);

  useEffect(() => {
    if (!open) return;
    setName(board?.name ?? "");
    setDescription(board?.description ?? "");
    setColor(board?.color ?? MY_DAY_BOARD_COLORS[0]);
    setColumnDrafts(Object.fromEntries(columns.map((column) => [column.id, { title: column.title, color: column.color }])));
    setNewColumnTitle("");
  }, [board, columns, open]);

  const saveBoard = async () => {
    if (!name.trim() || (board ? !canEdit : !canCreate)) return;
    await onSaveBoard({ name: name.trim(), description: description.trim() || null, color });
    if (!board) onOpenChange(false);
  };

  const moveColumn = async (columnId: string, direction: -1 | 1) => {
    if (!onReorderColumns || !canEdit) return;
    const index = columns.findIndex((column) => column.id === columnId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= columns.length) return;
    const ordered = columns.map((column) => column.id);
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    await onReorderColumns(ordered);
  };

  const deleteBoard = async () => {
    if (!onDeleteBoard || !canDelete || !window.confirm(`Excluir o quadro “${board?.name}” e todos os cartões?`)) return;
    await onDeleteBoard();
    onOpenChange(false);
  };

  const deleteColumn = async (column: MyDayBoardColumn) => {
    if (!onDeleteColumn || !canDelete || !window.confirm(`Excluir a coluna “${column.title}”?`)) return;
    await onDeleteColumn(column.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{board ? "Configurar quadro" : "Criar Meu Quadro"}</DialogTitle>
          <DialogDescription>
            {board ? "Personalize o quadro e organize as colunas do seu fluxo." : "Crie um espaço privado para organizar notas e atividades."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3" aria-labelledby="board-settings-title">
            <Label id="board-settings-title">Informações do quadro</Label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="board-name" className="text-xs">Nome</Label>
                <Input id="board-name" value={name} maxLength={80} disabled={board ? !canEdit : !canCreate} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Planejamento pessoal" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cor</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MY_DAY_BOARD_COLORS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={`Usar cor ${option}`}
                      aria-pressed={color === option}
                      disabled={board ? !canEdit : !canCreate}
                      className={cn("h-8 w-8 rounded-md border-2 transition-transform", color === option ? "scale-110 border-foreground" : "border-transparent")}
                      style={{ backgroundColor: option }}
                      onClick={() => setColor(option)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-description" className="text-xs">Descrição</Label>
              <Textarea id="board-description" value={description} maxLength={300} rows={2} disabled={board ? !canEdit : !canCreate} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo deste quadro" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={isSaving || !name.trim() || (board ? !canEdit : !canCreate)} onClick={() => void saveBoard()}>
                {board ? "Salvar informações" : "Criar quadro"}
              </Button>
              {board && !board.isDefault && canEdit && onSetDefault && (
                <Button type="button" size="sm" variant="outline" className="gap-1" disabled={isSaving} onClick={() => void onSetDefault()}>
                  <Star className="h-3.5 w-3.5" /> Tornar principal
                </Button>
              )}
            </div>
          </section>

          {board && (
            <section className="space-y-2 border-t pt-4" aria-labelledby="board-columns-title">
              <div>
                <Label id="board-columns-title">Colunas</Label>
                <p className="text-[10px] text-muted-foreground">Personalize nomes, cores e ordem. Uma coluna com “Concluído” encerra o cartão.</p>
              </div>
              <div className="space-y-2">
                {columns.map((column, index) => {
                  const draft = columnDrafts[column.id] ?? { title: column.title, color: column.color };
                  return (
                    <div key={column.id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-center">
                      <input
                        type="color"
                        aria-label={`Cor da coluna ${column.title}`}
                        className="h-9 w-full cursor-pointer rounded border bg-transparent p-1 sm:w-11"
                        value={draft.color}
                        disabled={!canEdit}
                        onChange={(event) => setColumnDrafts((current) => ({ ...current, [column.id]: { ...draft, color: event.target.value } }))}
                      />
                      <Input
                        aria-label={`Nome da coluna ${column.title}`}
                        value={draft.title}
                        maxLength={60}
                        disabled={!canEdit}
                        onChange={(event) => setColumnDrafts((current) => ({ ...current, [column.id]: { ...draft, title: event.target.value } }))}
                      />
                      <div className="flex shrink-0 gap-1">
                        {canEdit && onUpdateColumn && (
                          <Button type="button" size="sm" variant="outline" className="h-9" disabled={isSaving || !draft.title.trim()} onClick={() => void onUpdateColumn(column.id, { title: draft.title.trim(), color: draft.color })}>Salvar</Button>
                        )}
                        {canEdit && onReorderColumns && (
                          <>
                            <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={`Mover ${column.title} para cima`} disabled={isSaving || index === 0} onClick={() => void moveColumn(column.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                            <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={`Mover ${column.title} para baixo`} disabled={isSaving || index === columns.length - 1} onClick={() => void moveColumn(column.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                          </>
                        )}
                        {canDelete && onDeleteColumn && (
                          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" aria-label={`Excluir coluna ${column.title}`} disabled={isSaving} onClick={() => void deleteColumn(column)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {canCreate && onCreateColumn && (
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-dashed p-2 sm:flex-row sm:items-center">
                  <input type="color" aria-label="Cor da nova coluna" className="h-9 w-full cursor-pointer rounded border bg-transparent p-1 sm:w-11" value={newColumnColor} onChange={(event) => setNewColumnColor(event.target.value)} />
                  <Input value={newColumnTitle} maxLength={60} onChange={(event) => setNewColumnTitle(event.target.value)} placeholder="Nome da nova coluna" />
                  <Button type="button" variant="outline" className="h-9 shrink-0 gap-1" disabled={isSaving || !newColumnTitle.trim()} onClick={async () => { await onCreateColumn({ title: newColumnTitle.trim(), color: newColumnColor }); setNewColumnTitle(""); }}>
                    <Plus className="h-4 w-4" /> Adicionar coluna
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {board && canDelete && onDeleteBoard ? (
            <Button type="button" variant="destructive" className="gap-1" disabled={isSaving} onClick={() => void deleteBoard()}>
              <Trash2 className="h-4 w-4" /> Excluir quadro
            </Button>
          ) : <span />}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
