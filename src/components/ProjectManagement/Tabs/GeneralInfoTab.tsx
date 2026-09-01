import { ProjectV2, ContentBlock } from "@/types/ProjectV2";
import { useProjectForm } from "@/hooks/useProjectForm";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Server,
  Database,
  RefreshCw,
  Rocket,
  Power,
  Check,
  FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectHeaderForm } from "@/components/ProjectManagement/Forms/ProjectHeaderForm";
import { ObservationsWithAI } from "@/components/ProjectManagement/Forms/ObservationsWithAI";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
  onStageClick?: (stageId: string) => void;
}

export function GeneralInfoTab({ project, onUpdate, onStageClick }: TabProps) {
  // We use useProjectForm mainly for Autosave management of Notes here
  const { data, updateField, saveState } = useProjectForm(project, onUpdate);
  const { canEditProjects } = usePermissions();
  const { user } = useAuth();
  const currentUserName =
    user?.user_metadata?.full_name || user?.email || "Usuário";

  const isOrionTN =
    project.systemType === "Orion TN" ||
    project.systemType === "Modelos TN" ||
    project.products?.includes("Orion TN") ||
    project.products?.includes("OrionTN");

  const isModelosTN = project.systemType === "Modelos TN";

  const baseStages = isModelosTN ? [] : [
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
  ];

  const orionStages = isOrionTN ? [{
    id: "modelosEditor",
    label: "Modelos Editor",
    status: data.stages.modelosEditor?.status || "todo",
    icon: FileEdit,
  }] : [];

  const endStages = [
    {
      id: "implementation",
      label: "Implantação",
      status: data.stages.implementation.status,
      icon: Rocket,
    },
    ...(isModelosTN ? [] : [{
      id: "post",
      label: "Pós-Implantação",
      status: data.stages.post.status,
      icon: Power,
    }]),
  ];

  const stages = [...baseStages, ...orionStages, ...endStages];

  // Conteudo bruto (string Lexical) guardado no primeiro bloco de notes.
  const notesContent = data.notes?.blocks?.[0]?.content || "";

  const updateEditorContent = (content: string) => {
    const blocks: ContentBlock[] = [
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        content: content,
        checked: false,
      },
    ];

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
    <div className="w-full min-w-0 space-y-3 pb-2">
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
            className="bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
          >
            {saveState.message}
          </Badge>
        )}
        {saveState.status === "error" && (
          <Badge variant="destructive">{saveState.message}</Badge>
        )}
      </div>

      {/* 1. Pipeline Visual Moderno */}
      <div data-testid="project-stage-overview" className="relative w-full overflow-hidden rounded-xl border bg-card/50 px-2 py-2 shadow-sm backdrop-blur-sm sm:overflow-x-auto sm:rounded-2xl sm:px-4 scrollbar-none">
        <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-2 gap-2 py-1 sm:flex sm:min-w-[500px] sm:items-center sm:justify-between sm:gap-0">
          {/* Connecting Line */}
          <div className="absolute top-[1.3rem] left-0 right-0 -z-10 hidden h-0.5 rounded-full bg-muted sm:block" />

          {/* Active Progress Line */}
          <div
            className="absolute top-[1.3rem] left-0 -z-10 hidden h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-in-out sm:block"
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
                className="group relative flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg bg-background/50 p-2 sm:bg-transparent sm:p-0"
                onClick={() => onStageClick?.(stage.id)}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl rotate-2 flex items-center justify-center transition-all duration-500 border-2 shadow-md",
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
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="max-w-full rounded-md border border-transparent bg-background/80 px-1.5 py-0.5 text-center backdrop-blur-md transition-colors group-hover:border-border/50">
                  <p
                    className={cn(
                      "break-words text-[9px] font-bold uppercase tracking-wide sm:text-[10px] sm:tracking-widest",
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
                      <span className="block text-[8px] font-medium text-orange-500 dark:text-orange-300 mt-0.5">
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

      {/* 3. Observações Gerais (Rich Editor + Melhorar texto com IA) */}
      <div className="pt-2">
        <ObservationsWithAI
          title="Observações Gerais"
          placeholder="Digite suas observações gerais aqui..."
          observations={notesContent}
          onChange={updateEditorContent}
          canEdit={canEditProjects}
          projectId={data.id}
          requestedBy={currentUserName}
        />
      </div>
    </div>
  );
}
