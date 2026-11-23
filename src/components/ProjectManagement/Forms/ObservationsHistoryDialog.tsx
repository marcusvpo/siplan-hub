import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimelineEvents } from "@/hooks/useTimelineEvents";
import type { ProjectLogChangeItem, ProjectLogMetadata } from "@/services/projectLogService";
import { extractReadableText } from "@/utils/project-audit-diff";
import { History, RotateCcw, User, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObservationsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  canEdit: boolean;
  onRestoreVersion?: (plainTextVersion: string) => void;
}

interface VersionEntry {
  id: string;
  author: string;
  timestamp: Date;
  message: string;
  beforeText: string;
  afterText: string;
}

interface DiffLine {
  kind: "same" | "added" | "removed";
  text: string;
}

function computeLineDiff(beforeText: string, afterText: string): DiffLine[] {
  const beforeLines = beforeText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  const afterLines = afterText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  const result: DiffLine[] = [];

  for (const line of beforeLines) {
    if (!afterSet.has(line)) {
      result.push({ kind: "removed", text: line });
    }
  }
  for (const line of afterLines) {
    if (beforeSet.has(line)) {
      result.push({ kind: "same", text: line });
    } else {
      result.push({ kind: "added", text: line });
    }
  }

  return result;
}

export function ObservationsHistoryDialog({
  open,
  onOpenChange,
  projectId,
  canEdit,
  onRestoreVersion,
}: ObservationsHistoryDialogProps) {
  const { data: events = [], isLoading } = useTimelineEvents(open ? projectId : undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const versions = useMemo<VersionEntry[]>(() => {
    const list: VersionEntry[] = [];

    for (const ev of events) {
      const meta = (ev.metadata || {}) as ProjectLogMetadata;
      const changes: ProjectLogChangeItem[] = Array.isArray(meta.changes) ? meta.changes : [];
      const notesChange = changes.find(
        (c) =>
          c.field === "notes" ||
          /observa[cç][oõ]es gerais/i.test(c.label || ""),
      );

      const isNotesEvent =
        Boolean(notesChange) ||
        /observa[cç][oõ]es gerais/i.test(meta.fieldLabel || "") ||
        /observa[cç][oõ]es gerais/i.test(ev.message || "");

      if (!isNotesEvent) continue;

      const beforeRaw = notesChange?.oldValue ?? meta.oldValue ?? "";
      const afterRaw = notesChange?.newValue ?? meta.newValue ?? "";

      const beforeText = extractReadableText(beforeRaw);
      const afterText = extractReadableText(afterRaw);

      if (!beforeText && !afterText) continue;

      list.push({
        id: ev.id,
        author: ev.author || "Sistema",
        timestamp: ev.timestamp ? new Date(ev.timestamp) : new Date(),
        message: ev.message || "Observações Gerais atualizadas",
        beforeText,
        afterText,
      });
    }

    return list;
  }, [events]);

  const activeVersion = useMemo(
    () => versions.find((v) => v.id === selectedId) || versions[0] || null,
    [versions, selectedId],
  );

  const diffLines = useMemo(() => {
    if (!activeVersion) return [];
    return computeLineDiff(activeVersion.beforeText, activeVersion.afterText);
  }, [activeVersion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85dvh] max-h-[85dvh] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-3.5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Histórico Visual de Versões — Observações Gerais
          </DialogTitle>
          <DialogDescription className="text-xs">
            Compare alterações linha a linha (adicionadas em verde, removidas em vermelho) e
            restaure versões anteriores quando necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
          {/* Coluna Esquerda: Lista de Versões */}
          <div className="overflow-y-auto border-b border-border/70 bg-muted/20 p-3 md:col-span-4 md:border-b-0 md:border-r">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando histórico...
              </div>
            ) : versions.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma alteração registrada ainda para Observações Gerais neste projeto.
              </p>
            ) : (
              <div className="space-y-1.5">
                {versions.map((v, idx) => {
                  const isActive = activeVersion?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      className={cn(
                        "w-full rounded-lg border p-2.5 text-left transition-colors",
                        isActive
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/70 bg-card hover:bg-accent/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 truncate text-xs font-semibold text-foreground">
                          <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                          {v.author}
                        </span>
                        {idx === 0 && (
                          <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                            Mais recente
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {format(v.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Diff Visual */}
          <div className="flex min-h-0 flex-col overflow-hidden md:col-span-8">
            {activeVersion ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      Alteração por {activeVersion.author}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(activeVersion.timestamp, "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {canEdit && onRestoreVersion && activeVersion.afterText && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onRestoreVersion(activeVersion.afterText);
                        onOpenChange(false);
                      }}
                      className="h-7 gap-1.5 text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar esta versão
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
                  {diffLines.length === 0 ? (
                    <p className="font-sans text-xs text-muted-foreground">
                      Sem diferenças textuais visíveis (apenas formatação/metadados).
                    </p>
                  ) : (
                    diffLines.map((line, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded px-2.5 py-1 whitespace-pre-wrap break-words leading-relaxed",
                          line.kind === "added" &&
                            "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-l-2 border-emerald-500",
                          line.kind === "removed" &&
                            "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-l-2 border-rose-500 line-through opacity-85",
                          line.kind === "same" && "text-muted-foreground",
                        )}
                      >
                        <span className="mr-2 select-none font-bold">
                          {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}
                        </span>
                        {line.text}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted-foreground">
                Selecione uma versão à esquerda para visualizar o diff.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
