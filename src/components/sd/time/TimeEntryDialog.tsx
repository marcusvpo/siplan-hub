import { useEffect, useState } from "react";
import { Clock3, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { AiRichTextField } from "@/components/ui/ai-rich-text-field";
import { useAuth } from "@/hooks/useAuth";
import type { SdTimeEntry, SaveSdTimeEntryInput } from "@/hooks/useSdTimeTracking";
import { intervalsOverlap, timeToMinutes } from "@/lib/sd-time";

interface TimeEntryDialogProps {
  open: boolean;
  workDate: string;
  entry?: SdTimeEntry | null;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: SaveSdTimeEntryInput) => Promise<void>;
}

interface IntervalDraft {
  key: string;
  start: string;
  end: string;
}

const emptyInterval = (): IntervalDraft => ({
  key: crypto.randomUUID(),
  start: "",
  end: "",
});

export function TimeEntryDialog({
  open,
  workDate,
  entry,
  isSaving,
  onOpenChange,
  onSave,
}: TimeEntryDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [intervals, setIntervals] = useState<IntervalDraft[]>([emptyInterval()]);

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? "");
    setDescription(entry?.description ?? "");
    setIntervals(
      entry?.intervals.length
        ? entry.intervals.map((interval) => ({
            key: interval.id,
            start: interval.started_at.slice(0, 5),
            end: interval.ended_at?.slice(0, 5) ?? "",
          }))
        : [emptyInterval()],
    );
  }, [entry, open]);

  const updateInterval = (key: string, field: "start" | "end", value: string) => {
    setIntervals((current) =>
      current.map((interval) =>
        interval.key === key ? { ...interval, [field]: value } : interval,
      ),
    );
  };

  const handleSave = async () => {
    if (title.trim().length < 2) {
      toast.error("Informe um título com pelo menos 2 caracteres.");
      return;
    }

    if (intervals.some((interval) => !interval.start)) {
      toast.error("Informe o horário inicial de todas as entradas.");
      return;
    }

    const invalidRange = intervals.some((interval) => {
      if (!interval.end) return false;
      const start = timeToMinutes(interval.start);
      const end = timeToMinutes(interval.end);
      return start === null || end === null || end <= start;
    });

    if (invalidRange) {
      toast.error("O horário de saída deve ser posterior ao horário de entrada.");
      return;
    }

    if (intervalsOverlap(intervals)) {
      toast.error("Existem entradas de horário sobrepostas.");
      return;
    }

    await onSave({
      id: entry?.id,
      workDate,
      title: title.trim(),
      description: description.trim(),
      intervals: intervals.map(({ start, end }) => ({ start, end })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock3 className="h-4 w-4" />
            </span>
            {entry ? "Editar item de trabalho" : "Adicionar item de trabalho"}
          </DialogTitle>
          <DialogDescription>
            Descreva a atividade e informe as entradas e saídas dos horários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sd-time-title">Título *</Label>
            <Input
              id="sd-time-title"
              value={title}
              maxLength={120}
              placeholder="No que você trabalhou?"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <AiRichTextField
            label="Descrição"
            content={description}
            onChange={setDescription}
            placeholder="Detalhes, chamados atendidos, decisões ou resultados..."
            requestedBy={user?.id}
            targetField={`sd_time_entry:${entry?.id ?? workDate}:description`}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Entradas de horário *</Label>
              <span className="text-xs text-muted-foreground">Até 20 intervalos</span>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1 overscroll-contain">
              {intervals.map((interval, index) => (
                <div
                  key={interval.key}
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-xl border bg-muted/25 p-3"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={`sd-time-start-${interval.key}`} className="text-xs">
                      Entrada {index + 1}
                    </Label>
                    <Input
                      id={`sd-time-start-${interval.key}`}
                      type="time"
                      value={interval.start}
                      onChange={(event) => updateInterval(interval.key, "start", event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`sd-time-end-${interval.key}`} className="text-xs">
                      Saída (opcional)
                    </Label>
                    <Input
                      id={`sd-time-end-${interval.key}`}
                      type="time"
                      value={interval.end}
                      onChange={(event) => updateInterval(interval.key, "end", event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={intervals.length === 1}
                    aria-label={`Remover entrada ${index + 1}`}
                    onClick={() =>
                      setIntervals((current) => current.filter((item) => item.key !== interval.key))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-primary"
              disabled={intervals.length >= 20}
              onClick={() => setIntervals((current) => [...current, emptyInterval()])}
            >
              <Plus className="h-4 w-4" />
              Adicionar entrada de horário
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar lançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
