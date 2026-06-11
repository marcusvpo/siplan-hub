import {
  ProjectV2,
  InfraStageV2,
  AdherenceStageV2,
  EnvironmentStageV2,
  ConversionStageV2,
  ModelosEditorStageV2,
  ImplementationStageV2,
  PostStageV2,
  ImplementationPhase,
  StageStatus,
  AttachedFile,
} from "@/types/ProjectV2";
import { useState, useRef, useEffect } from "react";
import { ModelosEditorWorkspace, ModelosMetrics } from "../ModelosEditor/ModelosEditorWorkspace";
import { format, differenceInDays } from "date-fns";
import { useProjectForm } from "@/hooks/useProjectForm";
import { useConversionQueue } from "@/hooks/useConversionQueue";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { StageCard } from "@/components/ProjectManagement/Forms/StageCard";
import { InfraStageForm, AdherenceStageForm, EnvironmentStageForm, ConversionStageForm, ImplementationStageForm } from "../Forms/StageForms";
import { Accordion } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Server,
  Megaphone,
  CheckCircle2,
  Database,
  RefreshCw,
  Rocket,
  Power,
  Send,
  ExternalLink,
  Calendar,
  X,
  FileEdit,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Loader2,
  Eye,
} from "lucide-react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getStageReadiness,
  identifyBottleneck,
} from "@/lib/predictability-utils";
import { usePermissions } from "@/hooks/usePermissions";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
  activeStepId?: string;
  onStepClick?: (stepId: string) => void;
}

type StatusType =
  | "Adequado"
  | "Parcialmente Adequado"
  | "Inadequado"
  | "Aguardando Adequação";

export function StepsTab({
  project,
  onUpdate,
  activeStepId,
  onStepClick,
}: TabProps) {
  const { data, updateStage, saveState } = useProjectForm(project, onUpdate);
  const { toast } = useToast();
  const { canEditProjects } = usePermissions();
  const [notifying, setNotifying] = useState(false);
  const [sendingToConversion, setSendingToConversion] = useState(false);
  const { sendToConversion, getItemByProjectId, removeFromQueue } =
    useConversionQueue();

  // Scroll into view when activeStepId changes
  useEffect(() => {
    if (activeStepId) {
      // Small timeout to ensure the accordion has started expanding
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-stage-id="${activeStepId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeStepId]);

  // Check if project is already in conversion queue
  const conversionItem = getItemByProjectId(project.id);
  const isInConversionQueue = !!conversionItem;

  const isOrionTN =
    project.systemType === "Orion TN" ||
    project.systemType === "Modelos TN" ||
    project.products?.includes("Orion TN") ||
    project.products?.includes("OrionTN");

  const isModelosTN = project.systemType === "Modelos TN";

  // Predictability: Calculate stage readiness
  const stageReadiness = getStageReadiness(data);
  const bottleneck = identifyBottleneck(data);

  const handleSendToConversion = async () => {
    if (isInConversionQueue) {
      toast({
        title: "Aviso",
        description: "Este projeto já está na fila de conversão.",
        variant: "destructive",
      });
      return;
    }

    setSendingToConversion(true);
    try {
      const priority =
        project.priority === "critical"
          ? 1
          : project.priority === "high"
            ? 2
            : 3;
      const result = await sendToConversion(
        project.id,
        project.projectLeader,
        undefined,
        priority,
      );

      if (result) {
        // Update the conversion stage with the sent date
        updateStage("conversion", {
          sentAt: new Date(),
          status: "in-progress" as StageStatus,
        });

        toast({
          title: "Sucesso",
          description: "Projeto enviado para a fila de conversão!",
          className: "bg-green-500 text-white border-green-600",
        });
      } else {
        throw new Error("Falha ao adicionar à fila");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar para conversão.",
        variant: "destructive",
      });
    } finally {
      setSendingToConversion(false);
    }
  };

  const handleNotifyComercial = async () => {
    setNotifying(true);
    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error("Webhook URL not configured");
      }

      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: project.id }),
      });
      toast({
        title: "Sucesso",
        description: "Comercial notificado com sucesso!",
        className: "bg-green-500 text-white border-green-600",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao notificar comercial.",
        variant: "destructive",
      });
    } finally {
      setNotifying(false);
    }
  };

  const stagesData = data.stages;

  // Special handling for Implementation Phases
  const updatePhase = (
    phase: "phase1" | "phase2",
    updates: Partial<ImplementationPhase>,
  ) => {
    const currentImpl = stagesData.implementation;
    const currentPhase = currentImpl[phase] || {};
    const newPhase = { ...currentPhase, ...updates };

    const newImpl: Record<string, unknown> = {
      ...currentImpl,
      [phase]: newPhase,
    };

    updateStage("implementation", newImpl);
  };


  // Modelos Editor logic moved to @/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace.tsx

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
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

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-4"
        value={activeStepId || ""}
        onValueChange={onStepClick}
      >
        {!isModelosTN && (
          <>
            <div data-stage-id="infra">
              <StageCard
                id="infra"
              label="1. Análise de Infraestrutura"
              icon={Server}
              status={stagesData.infra.status}
              responsible={stagesData.infra.responsible}
              startDate={stagesData.infra.startDate}
              endDate={stagesData.infra.endDate}
              observations={stagesData.infra.observations}
              onUpdate={(u) => updateStage("infra", u)}
              isReadyToStart={
                stageReadiness.find((r) => r.stageId === "infra")?.isReady
              }
              readinessReason={
                stageReadiness.find((r) => r.stageId === "infra")?.reason
              }
              canEditProjects={canEditProjects}
            >
              <InfraStageForm stage={stagesData.infra} canEditProjects={canEditProjects} notifying={notifying} onUpdate={(u) => updateStage("infra", u)} onNotifyComercial={handleNotifyComercial} />
            </StageCard>
          </div>

            <div data-stage-id="adherence">
              <StageCard
                id="adherence"
              label="2. Análise de Aderência"
              icon={CheckCircle2}
              status={stagesData.adherence.status}
              responsible={stagesData.adherence.responsible}
              startDate={stagesData.adherence.startDate}
              endDate={stagesData.adherence.endDate}
              observations={stagesData.adherence.observations}
              onUpdate={(u) => updateStage("adherence", u)}
              isReadyToStart={
                stageReadiness.find((r) => r.stageId === "adherence")?.isReady
              }
              readinessReason={
                stageReadiness.find((r) => r.stageId === "adherence")?.reason
              }
              canEditProjects={canEditProjects}
            >
              <AdherenceStageForm projectId={project.id} systemType={project.systemType} stage={stagesData.adherence} canEditProjects={canEditProjects} onUpdate={(u) => updateStage("adherence", u)} />
            </StageCard>
          </div>

            <div data-stage-id="conversion">
              <StageCard
                id="conversion"
              label="3. Conversão de Dados"
              icon={RefreshCw}
              status={stagesData.conversion.status}
              responsible={stagesData.conversion.responsible}
              startDate={stagesData.conversion.startDate}
              endDate={stagesData.conversion.endDate}
              observations={stagesData.conversion.observations}
              onUpdate={(u) => updateStage("conversion", u)}
              isReadyToStart={
                stageReadiness.find((r) => r.stageId === "conversion")?.isReady
              }
              readinessReason={
                stageReadiness.find((r) => r.stageId === "conversion")?.reason
              }
              canEditProjects={canEditProjects}
            >
              <ConversionStageForm stage={stagesData.conversion} canEditProjects={canEditProjects} isInConversionQueue={isInConversionQueue} sendingToConversion={sendingToConversion} conversionItem={conversionItem} projectId={project.id} onUpdate={(u) => updateStage("conversion", u)} onSendToConversion={handleSendToConversion} onRemoveFromQueue={removeFromQueue} />
            </StageCard>
          </div>

            <div data-stage-id="environment">
              <StageCard
                id="environment"
              label="4. Preparação de Ambiente"
                icon={Database}
                status={stagesData.environment.status}
                responsible={stagesData.environment.responsible}
                startDate={stagesData.environment.startDate}
                endDate={stagesData.environment.endDate}
                observations={stagesData.environment.observations}
                onUpdate={(u) => updateStage("environment", u)}
                isReadyToStart={
                  stageReadiness.find((r) => r.stageId === "environment")?.isReady
                }
                readinessReason={
                  stageReadiness.find((r) => r.stageId === "environment")?.reason
                }
                canEditProjects={canEditProjects}
              >
                <EnvironmentStageForm stage={stagesData.environment} canEditProjects={canEditProjects} onUpdate={(u) => updateStage("environment", u)} />
              </StageCard>
            </div>
          </>
        )}

        {isOrionTN && (
        <div data-stage-id="modelosEditor">
          <StageCard
            id="modelosEditor"
            label={isModelosTN ? "1. Modelos Editor" : "5. Modelos Editor"}
            icon={FileEdit}
            status={stagesData.modelosEditor?.status || "todo"}
            responsible={stagesData.modelosEditor?.responsible || ""}
            hideResponsible={true}
            startDate={stagesData.modelosEditor?.startDate}
            endDate={stagesData.modelosEditor?.endDate}
            observations={stagesData.modelosEditor?.observations}
            onUpdate={(u) => updateStage("modelosEditor", u)}
            extraHeaderField={<ModelosMetrics stage={stagesData.modelosEditor} />}
            canEditProjects={canEditProjects}
          >
            <ModelosEditorWorkspace project={project} onUpdate={(u) => updateStage("modelosEditor", u)} />
          </StageCard>
        </div>
        )}

        <div data-stage-id="implementation">
          <StageCard
            id="implementation"
            label={isModelosTN ? "2. Implantação & Treinamento" : `${isOrionTN ? "6" : "5"}. Implantação & Treinamento`}
            icon={Rocket}
            status={stagesData.implementation.status}
            responsible={stagesData.implementation.responsible || ""}
            hideResponsible={true}
            // Phase 1 dates are used as the main dates for the implementation stage
            // These are synced automatically when phase 1 dates are updated
            startDate={
              stagesData.implementation.phase1?.startDate ||
              stagesData.implementation.startDate
            }
            endDate={
              stagesData.implementation.phase1?.endDate ||
              stagesData.implementation.endDate
            }
            observations={stagesData.implementation.observations}
            hideDates={true} // Hide main dates - will be managed by Phase 1 and Phase 2
            isReadyToStart={
              stageReadiness.find((r) => r.stageId === "implementation")?.isReady
            }
            readinessReason={
              stageReadiness.find((r) => r.stageId === "implementation")?.reason
            }
            onUpdate={(u) => {
              // Sync phase 1 dates with main stage dates for calendar compatibility
              const updates: Record<string, unknown> = { ...u };
              const currentPhase1 = stagesData.implementation.phase1 || {};
              if (u.startDate !== undefined) {
                updates.phase1 = {
                  ...currentPhase1,
                  startDate: u.startDate,
                };
              }
              if (u.endDate !== undefined) {
                updates.phase1 = {
                  ...currentPhase1,
                  ...((updates.phase1 as Record<string, unknown>) || {}),
                  endDate: u.endDate,
                };
              }
              updateStage("implementation", updates);
            }}
            canEditProjects={canEditProjects}
          >
            <ImplementationStageForm stage={stagesData.implementation} canEditProjects={canEditProjects} onUpdatePhase={updatePhase} />
          </StageCard>
        </div>

        {!isModelosTN && (
          <div data-stage-id="post">
            <StageCard
              id="post"
            label={`${isOrionTN ? "7" : "6"}. Pós-Implantação`}
            icon={Power}
            status={stagesData.post.status}
            responsible={stagesData.post.responsible}
            startDate={stagesData.post.startDate}
            endDate={stagesData.post.endDate}
            observations={stagesData.post.observations}
            onUpdate={(u) => updateStage("post", u)}
            isReadyToStart={
              stageReadiness.find((r) => r.stageId === "post")?.isReady
            }
            readinessReason={
              stageReadiness.find((r) => r.stageId === "post")?.reason
            }
            canEditProjects={canEditProjects}
          />
        </div>
        )}
      </Accordion>
    </div>
  );
}
