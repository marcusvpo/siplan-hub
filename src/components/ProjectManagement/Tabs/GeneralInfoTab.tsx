import { ProjectV2, ContentBlock } from "@/types/ProjectV2";
import { useProjectForm } from "@/hooks/useProjectForm";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  FileText,
  Server,
  Database,
  RefreshCw,
  Rocket,
  Power,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ProjectHeaderForm } from "@/components/ProjectManagement/Forms/ProjectHeaderForm";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

export function GeneralInfoTab({ project, onUpdate }: TabProps) {
  // We use useProjectForm mainly for Autosave management of Notes here
  const { data, updateField, saveState } = useProjectForm(project, onUpdate);

  const stages = [
    {
      id: "infra",
      label: "Infraestrutura",
      status: data.stages.infra.status,
      icon: Server,
    },
    {
      id: "adherence",
      label: "Aderência",
      status: data.stages.adherence.status,
      icon: CheckCircle2,
    },
    {
      id: "conversion",
      label: "Conversão",
      status: data.stages.conversion.status,
      icon: RefreshCw,
    },
    {
      id: "environment",
      label: "Ambiente",
      status: data.stages.environment.status,
      icon: Database,
    },
    {
      id: "implementation",
      label: "Implantação",
      status: data.stages.implementation.status,
      icon: Rocket,
    },
    {
      id: "post",
      label: "Pós-Implantação",
      status: data.stages.post.status,
      icon: Power,
    },
  ];

  // Local state for editor content
  const [editorContent, setEditorContent] = useState<string | object>(() => {
    const blocks = data.notes?.blocks || [];
    if (blocks.length === 0) return "";

    // If single block with JSON content
    if (blocks.length === 1 && blocks[0].type === "paragraph") {
      try {
        if (!blocks[0].content) return "";
        const parsed = JSON.parse(blocks[0].content);
        if (parsed.type === "doc" || parsed.root) return parsed;
      } catch {
        return "";
      }
    }
    return "";
  });

  const updateEditorContent = (content: string) => {
    setEditorContent(content);

    let blocks: ContentBlock[] = [];
    try {
      const parsed = JSON.parse(content);
      blocks = [
        {
          id: crypto.randomUUID(),
          type: "paragraph",
          content: content,
          checked: false,
        },
      ];
    } catch {
      blocks = [
        {
          id: crypto.randomUUID(),
          type: "paragraph",
          content: content,
          checked: false,
        },
      ];
    }

    const newNotes = {
      ...data.notes,
      id: data.notes?.id || crypto.randomUUID(),
      projectId: data.id,
      blocks: blocks,
      lastEditedBy: "User",
      lastEditedAt: new Date(),
    };

    updateField("notes", newNotes);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Feedback Visual do Autosave */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveState.status === "saving" && (
          <Badge variant="secondary" className="animate-pulse">
            Salvando...
          </Badge>
        )}
        {saveState.status === "success" && (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            {saveState.message}
          </Badge>
        )}
        {saveState.status === "error" && (
          <Badge variant="destructive">{saveState.message}</Badge>
        )}
      </div>

      {/* 1. Pipeline Visual Moderno */}
      <div className="w-full py-12 px-6 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-sm relative overflow-hidden mb-8">
        <div className="flex items-center justify-between relative z-10 max-w-5xl mx-auto">
          {/* Connecting Line */}
          <div className="absolute top-10 left-0 right-0 h-1.5 bg-muted -z-10 rounded-full" />

          {/* Active Progress Line */}
          <div
            className="absolute top-10 left-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400 -z-10 transition-all duration-1000 ease-in-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{
              width: `${Math.min(
                100,
                Math.max(
                  0,
                  (stages.reduce((acc, stage, index) => {
                    if (
                      stage.status === "done" ||
                      stage.status === "in-progress" ||
                      stage.status === "waiting_adjustment" ||
                      stage.status === "blocked"
                    )
                      return index;
                    return acc;
                  }, 0) /
                    (stages.length - 1)) *
                    100
                )
              )}%`,
            }}
          />

          {stages.map((stage) => {
            const Icon = stage.icon;
            const isDone = stage.status === "done";
            const isActive = stage.status === "in-progress";
            const isWaitingAdjustment = stage.status === "waiting_adjustment";
            const isBlocked = stage.status === "blocked";

            return (
              <div
                key={stage.id}
                className="flex flex-col items-center gap-5 group cursor-pointer relative"
              >
                <div
                  className={cn(
                    "h-20 w-20 rounded-2xl rotate-3 flex items-center justify-center transition-all duration-500 border-4 shadow-xl",
                    isDone
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-emerald-500/30 rotate-0"
                      : isWaitingAdjustment
                      ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 text-white shadow-orange-500/30 scale-105 -rotate-2 ring-4 ring-orange-500/20"
                      : isBlocked
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 text-white shadow-amber-500/30 scale-105"
                      : isActive
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 text-white shadow-blue-500/30 scale-110 -rotate-3 ring-4 ring-blue-500/20"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {isDone ? (
                    <Check className="h-9 w-9" />
                  ) : (
                    <Icon className="h-8 w-8" />
                  )}
                </div>
                <div className="text-center space-y-1.5 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-transparent group-hover:border-border/50 transition-colors">
                  <p
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      isDone
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isWaitingAdjustment
                        ? "text-orange-600 dark:text-orange-400"
                        : isBlocked
                        ? "text-amber-600 dark:text-amber-400"
                        : isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                    {isWaitingAdjustment && (
                      <span className="block text-[10px] font-medium text-orange-500 dark:text-orange-300 mt-0.5">
                        Em Adequação
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Dados do Projeto (Componente Extraído) */}
      <ProjectHeaderForm project={data} />

      {/* 3. Observações Gerais (Rich Editor) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            Observações Gerais
          </h3>
        </div>

        <div className="bg-white dark:bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4">
            <RichTextEditor
              content={editorContent}
              onChange={updateEditorContent}
              placeholder="Digite suas observações gerais aqui..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
