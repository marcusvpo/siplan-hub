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
    <div className="space-y-3 w-full pb-2">
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
      <div className="w-full py-2 px-4 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10 max-w-5xl mx-auto">
          {/* Connecting Line */}
          <div className="absolute top-[1.3rem] left-0 right-0 h-0.5 bg-muted -z-10 rounded-full" />

          {/* Active Progress Line */}
          <div
            className="absolute top-[1.3rem] left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400 -z-10 transition-all duration-1000 ease-in-out rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
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
                className="flex flex-col items-center gap-1.5 group cursor-pointer relative"
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
                <div className="text-center bg-background/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-transparent group-hover:border-border/50 transition-colors">
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
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
