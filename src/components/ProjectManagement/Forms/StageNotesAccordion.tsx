import { useMemo, useState } from "react";
import type { ProjectV2, StageStatus } from "@/types/ProjectV2";
import { richTextToPlainText } from "@/lib/lexical";
import { STAGE_COLOR_BY_STATUS } from "@/utils/default-project-observations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ArrowUpRight, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageNotesAccordionProps {
  project: ProjectV2;
  onOpenStage?: (stageId: string) => void;
}

interface StageNoteEntry {
  id: string;
  label: string;
  status: StageStatus;
  responsible?: string;
  text: string;
}

function extractPostObservationsText(raw?: string | null): string {
  if (!raw || !raw.trim()) return "";
  try {
    const parsed = JSON.parse(raw) as {
      v?: number;
      blocks?: Array<{ content?: string }>;
      summary?: string;
    };
    if (parsed && parsed.v === 2 && Array.isArray(parsed.blocks)) {
      const parts: string[] = [];
      const summary = parsed.summary ? richTextToPlainText(parsed.summary).trim() : "";
      if (summary) {
        parts.push(`Resumo Geral:\n${summary}`);
      }
      parsed.blocks.forEach((b, idx) => {
        const text = b?.content ? richTextToPlainText(b.content).trim() : "";
        if (text) {
          parts.push(parsed.blocks!.length > 1 ? `Bloco ${idx + 1}:\n${text}` : text);
        }
      });
      return parts.join("\n\n").trim();
    }
  } catch {
    // fallback para Lexical simples / texto puro
  }
  return richTextToPlainText(raw).trim();
}

function statusBorderStyle(status: StageStatus): string {
  return STAGE_COLOR_BY_STATUS[status] || "#94A3B8";
}

export function StageNotesAccordion({
  project,
  onOpenStage,
}: StageNotesAccordionProps) {
  const [open, setOpen] = useState(false);

  const isOrionTN =
    project.systemType === "Orion TN" ||
    project.products?.includes("Orion TN") ||
    project.products?.includes("OrionTN");

  const entries = useMemo<StageNoteEntry[]>(() => {
    const candidates: Array<{
      id: string;
      label: string;
      status: StageStatus;
      responsible?: string;
      raw?: string;
      isPost?: boolean;
    }> = [
      {
        id: "infra",
        label: "1. Análise de Infraestrutura",
        status: project.stages.infra?.status || "todo",
        responsible: project.stages.infra?.responsible || project.responsibleInfra,
        raw: project.stages.infra?.observations,
      },
      {
        id: "adherence",
        label: "2. Análise de Aderência",
        status: project.stages.adherence?.status || "todo",
        responsible: project.stages.adherence?.responsible || project.responsibleAdherence,
        raw: project.stages.adherence?.observations,
      },
      {
        id: "conversion",
        label: "3. Conversão de Dados",
        status: project.stages.conversion?.status || "todo",
        responsible: project.stages.conversion?.responsible || project.responsibleConversion,
        raw: project.stages.conversion?.observations,
      },
      {
        id: "environment",
        label: "4. Preparação de Ambiente",
        status: project.stages.environment?.status || "todo",
        responsible: project.stages.environment?.responsible || project.responsibleEnvironment,
        raw: project.stages.environment?.observations,
      },
      ...(isOrionTN || project.systemType === "Modelos TN"
        ? [
            {
              id: "modelosEditor",
              label: "Modelos Editor (Orion TN)",
              status: project.stages.modelosEditor?.status || "todo",
              responsible: project.stages.modelosEditor?.responsible,
              raw: project.stages.modelosEditor?.observations,
            },
          ]
        : []),
      {
        id: "implementation",
        label: "5. Implantação & Treinamento",
        status: project.stages.implementation?.status || "todo",
        responsible:
          project.stages.implementation?.phase1?.responsible ||
          project.responsibleImplementation,
        raw: project.stages.implementation?.observations,
      },
      {
        id: "post",
        label: "6. Pós-Implantação",
        status: project.stages.post?.status || "todo",
        responsible: project.stages.post?.responsible || project.responsiblePost,
        raw: project.stages.post?.observations,
        isPost: true,
      },
    ];

    return candidates
      .map((item) => {
        const text = item.isPost
          ? extractPostObservationsText(item.raw)
          : richTextToPlainText(item.raw).trim();
        return {
          id: item.id,
          label: item.label,
          status: item.status,
          responsible: item.responsible?.trim() || undefined,
          text,
        };
      })
      .filter((item) => item.text.length > 0);
  }, [project, isOrionTN]);

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Notas das Etapas ({entries.length}{" "}
            {entries.length === 1 ? "preenchida" : "preenchidas"})
          </span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            • somente leitura
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {open ? "Recolher" : "Expandir"}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-border/70 px-3.5 py-3">
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma etapa possui observação preenchida até o momento.
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border/70 bg-card p-3 shadow-xs"
                style={{
                  borderLeftWidth: "3px",
                  borderLeftColor: statusBorderStyle(entry.status),
                }}
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: statusBorderStyle(entry.status) }}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {entry.label}
                    </span>
                    {entry.responsible && (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] font-medium"
                      >
                        {entry.responsible}
                      </Badge>
                    )}
                  </div>
                  {onOpenStage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenStage(entry.id)}
                      className={cn(
                        "h-7 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Abrir etapa
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <p className="whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">
                  {entry.text}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
