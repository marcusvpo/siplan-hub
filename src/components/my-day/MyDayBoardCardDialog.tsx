import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Archive, ArchiveRestore, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MY_DAY_BOARD_PRIORITY_LABELS,
  type MyDayBoard,
  type MyDayBoardCard,
  type MyDayBoardCardInput,
  type MyDayBoardCardPriority,
  type MyDayBoardChecklistItem,
  type MyDayBoardColumn,
} from "@/lib/my-day-board";

interface MyDayBoardCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: MyDayBoard | null;
  columns: MyDayBoardColumn[];
  card?: MyDayBoardCard | null;
  initialColumnId?: string | null;
  canEdit: boolean;
  canDelete: boolean;
  isSaving: boolean;
  onSave: (input: MyDayBoardCardInput) => Promise<unknown>;
  onArchive?: () => Promise<unknown>;
  isArchived?: boolean;
  onDelete?: () => Promise<unknown>;
}

const PRIORITIES = Object.keys(MY_DAY_BOARD_PRIORITY_LABELS) as MyDayBoardCardPriority[];

function newChecklistId() {
  return globalThis.crypto?.randomUUID?.() ?? `check-${Date.now()}-${Math.random()}`;
}

function parseLocalDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function MyDayBoardCardDialog({
  open,
  onOpenChange,
  board,
  columns,
  card,
  initialColumnId,
  canEdit,
  canDelete,
  isSaving,
  onSave,
  onArchive,
  isArchived = false,
  onDelete,
}: MyDayBoardCardDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<MyDayBoardCardPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [linkedPath, setLinkedPath] = useState("");
  const [checklist, setChecklist] = useState<MyDayBoardChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const linkedPathValid = !linkedPath.trim() || linkedPath.trim().startsWith("/");

  useEffect(() => {
    if (!open) return;
    setTitle(card?.title ?? "");
    setDescription(card?.description ?? "");
    setColumnId(card?.columnId ?? initialColumnId ?? columns[0]?.id ?? "");
    setPriority(card?.priority ?? "medium");
    setDueDate(card?.dueAt ? format(card.dueAt, "yyyy-MM-dd") : "");
    setLabels(card?.labels.join(", ") ?? "");
    setLinkedPath(card?.linkedPath ?? "");
    setChecklist(card?.checklist ?? []);
    setNewChecklistText("");
  }, [card, columns, initialColumnId, open]);

  const addChecklistItem = () => {
    const text = newChecklistText.trim();
    if (!text) return;
    setChecklist((current) => [...current, { id: newChecklistId(), text, done: false }]);
    setNewChecklistText("");
  };

  const handleSave = async () => {
    if (!board || !title.trim() || !columnId || !canEdit || !linkedPathValid) return;
    await onSave({
      boardId: board.id,
      columnId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      dueAt: parseLocalDate(dueDate),
      labels: [...new Set(labels.split(",").map((label) => label.trim()).filter(Boolean))].slice(0, 8),
      checklist,
      linkedPath: linkedPath.trim() || null,
    });
    onOpenChange(false);
  };

  const handleArchive = async () => {
    if (!onArchive || !canEdit) return;
    await onArchive();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!onDelete || !canDelete) return;
    if (!window.confirm("Excluir este cartão permanentemente?")) return;
    await onDelete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>
            Use notas, etiquetas, checklist e prazo para organizar o próximo passo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="board-card-title">Título</Label>
            <Input
              id="board-card-title"
              value={title}
              maxLength={160}
              disabled={!canEdit}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Preparar apresentação da reunião"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="board-card-description">Notas</Label>
            <Textarea
              id="board-card-description"
              value={description}
              maxLength={4000}
              rows={5}
              disabled={!canEdit}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Registre contexto, ideias e informações importantes."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Coluna</Label>
              <Select value={columnId} onValueChange={setColumnId} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>{column.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as MyDayBoardCardPriority)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>{MY_DAY_BOARD_PRIORITY_LABELS[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-card-due">Prazo</Label>
              <Input id="board-card-due" type="date" value={dueDate} disabled={!canEdit} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="board-card-labels">Etiquetas</Label>
              <Input id="board-card-labels" value={labels} disabled={!canEdit} onChange={(event) => setLabels(event.target.value)} placeholder="cliente, reunião, ideia" />
              <p className="text-[10px] text-muted-foreground">Separe por vírgulas; máximo de oito.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-card-link">Link no HUB</Label>
              <Input id="board-card-link" value={linkedPath} disabled={!canEdit} onChange={(event) => setLinkedPath(event.target.value)} placeholder="/projects/..." />
              {!linkedPathValid && <p className="text-[10px] text-destructive">Use um caminho interno iniciado por /.</p>}
            </div>
          </div>

          <section className="space-y-2" aria-labelledby="board-card-checklist-title">
            <Label id="board-card-checklist-title">Checklist</Label>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5">
                  <Checkbox
                    checked={item.done}
                    disabled={!canEdit}
                    onCheckedChange={(checked) => setChecklist((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, done: checked === true } : candidate))}
                  />
                  <span className={item.done ? "min-w-0 flex-1 break-words text-xs text-muted-foreground line-through" : "min-w-0 flex-1 break-words text-xs"}>{item.text}</span>
                  {canEdit && (
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Remover ${item.text}`} onClick={() => setChecklist((current) => current.filter((candidate) => candidate.id !== item.id))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex min-w-0 gap-2">
                  <Input
                    value={newChecklistText}
                    maxLength={200}
                    onChange={(event) => setNewChecklistText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    placeholder="Novo item"
                  />
                  <Button type="button" variant="outline" className="shrink-0 gap-1" onClick={addChecklistItem} disabled={!newChecklistText.trim()}>
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {card && onArchive && canEdit && (
              <Button type="button" variant="outline" className="gap-1" disabled={isSaving} onClick={() => void handleArchive()}>
                {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {isArchived ? "Restaurar" : "Arquivar"}
              </Button>
            )}
            {card && onDelete && canDelete && (
              <Button type="button" variant="destructive" className="gap-1" disabled={isSaving} onClick={() => void handleDelete()}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {card?.linkedPath && (
              <Button asChild type="button" variant="outline" className="gap-1">
                <Link to={card.linkedPath}><ExternalLink className="h-4 w-4" /> Abrir link</Link>
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {canEdit && (
              <Button type="button" disabled={isSaving || !title.trim() || !columnId || !linkedPathValid} onClick={() => void handleSave()}>
                {isSaving ? "Salvando..." : "Salvar cartão"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
