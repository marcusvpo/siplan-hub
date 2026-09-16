import { useEffect, useState, type FormEvent } from "react";
import { addHours, format } from "date-fns";
import { Bell, CalendarPlus, Repeat2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MyDayShortcut } from "@/hooks/useMyDay";
import type {
  MyDayTask,
  MyDayTaskInput,
  MyDayTaskPriority,
  MyDayTaskRecurrence,
} from "@/lib/my-day-workspace";

interface MyDayTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: MyDayTask | null;
  shortcuts: MyDayShortcut[];
  isSaving: boolean;
  onSave: (input: MyDayTaskInput) => Promise<unknown>;
}

function initialDueAt() {
  const value = addHours(new Date(), 1);
  value.setMinutes(0, 0, 0);
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export function MyDayTaskDialog({
  open,
  onOpenChange,
  task,
  shortcuts,
  isSaving,
  onSave,
}: MyDayTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(initialDueAt);
  const [priority, setPriority] = useState<MyDayTaskPriority>("medium");
  const [linkedPath, setLinkedPath] = useState("none");
  const [recurrence, setRecurrence] = useState<MyDayTaskRecurrence>("none");
  const [reminderMinutes, setReminderMinutes] = useState("none");

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueAt(task ? format(task.dueAt, "yyyy-MM-dd'T'HH:mm") : initialDueAt());
    setPriority(task?.priority ?? "medium");
    setLinkedPath(task?.linkedPath ?? "none");
    setRecurrence(task?.recurrence ?? "none");
    setReminderMinutes(task?.reminderMinutes?.toString() ?? "none");
  }, [open, task]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueAt) return;

    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        dueAt: new Date(dueAt),
        priority,
        linkedPath: linkedPath === "none" ? null : linkedPath,
        recurrence,
        reminderMinutes: reminderMinutes === "none" ? null : Number(reminderMinutes),
      });
      onOpenChange(false);
    } catch {
      // A mutation exibe a mensagem de erro e mantém o formulário aberto.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            {task ? "Editar tarefa" : "Adicionar à minha agenda"}
          </DialogTitle>
          <DialogDescription>
            Registre algo que você precisa fazer e acompanhe diretamente no Meu Dia.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="my-day-task-title">O que precisa ser feito?</Label>
            <Input
              id="my-day-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Conferir retorno do cartório"
              maxLength={160}
              autoFocus
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Repeat2 className="h-3.5 w-3.5" /> Repetição
              </Label>
              <Select value={recurrence} onValueChange={(value) => setRecurrence(value as MyDayTaskRecurrence)}>
                <SelectTrigger aria-label="Repetição da tarefa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não repetir</SelectItem>
                  <SelectItem value="daily">Todos os dias</SelectItem>
                  <SelectItem value="weekly">Toda semana</SelectItem>
                  <SelectItem value="monthly">Todo mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Lembrete
              </Label>
              <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                <SelectTrigger aria-label="Lembrete da tarefa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lembrete</SelectItem>
                  <SelectItem value="0">No horário</SelectItem>
                  <SelectItem value="15">15 minutos antes</SelectItem>
                  <SelectItem value="30">30 minutos antes</SelectItem>
                  <SelectItem value="60">1 hora antes</SelectItem>
                  <SelectItem value="1440">1 dia antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="my-day-task-date">Data e hora</Label>
              <Input
                id="my-day-task-date"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as MyDayTaskPriority)}>
                <SelectTrigger aria-label="Prioridade da tarefa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vincular a uma tela</Label>
            <Select value={linkedPath} onValueChange={setLinkedPath}>
              <SelectTrigger aria-label="Tela vinculada à tarefa">
                <SelectValue placeholder="Sem vínculo" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(20rem,50dvh)]">
                <SelectItem value="none">Sem vínculo</SelectItem>
                {shortcuts.map((shortcut) => (
                  <SelectItem key={shortcut.path} value={shortcut.path}>
                    {shortcut.group} · {shortcut.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="my-day-task-description">Observação</Label>
            <Textarea
              id="my-day-task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contexto, próximo passo ou informação importante"
              rows={3}
              maxLength={1000}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !title.trim() || !dueAt}>
              {isSaving ? "Salvando..." : task ? "Salvar alterações" : "Adicionar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
