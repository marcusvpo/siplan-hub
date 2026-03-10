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
import { useState, useRef } from "react";
import { format, differenceInDays } from "date-fns";
import { useProjectForm } from "@/hooks/useProjectForm";
import { useConversionQueue } from "@/hooks/useConversionQueue";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { StageCard } from "@/components/ProjectManagement/Forms/StageCard";
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

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

type StatusType =
  | "Adequado"
  | "Parcialmente Adequado"
  | "Inadequado"
  | "Aguardando Adequação";

export function StepsTab({ project, onUpdate }: TabProps) {
  const { data, updateStage, saveState } = useProjectForm(project, onUpdate);
  const { toast } = useToast();
  const [notifying, setNotifying] = useState(false);
  const [sendingToConversion, setSendingToConversion] = useState(false);
  const { sendToConversion, getItemByProjectId, removeFromQueue } =
    useConversionQueue();
  const { uploadFile, deleteFile: deleteStorageFile, getDownloadUrl } = useProjectFiles(project.id);

  const [uploadingType, setUploadingType] = useState<'sent' | 'available' | null>(null);
  const sentFileInputRef = useRef<HTMLInputElement>(null);
  const availableFileInputRef = useRef<HTMLInputElement>(null);

  // Check if project is already in conversion queue
  const conversionItem = getItemByProjectId(project.id);
  const isInConversionQueue = !!conversionItem;

  const isOrionTN =
    project.systemType === "Orion TN" ||
    project.products?.includes("Orion TN") ||
    project.products?.includes("OrionTN");

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

  // Render Functions for Specific Fields
  const renderInfraFields = (stage: InfraStageV2) => (
    <>
      <div className="col-span-full mb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={notifying}
              className="w-full md:w-auto font-bold shadow-sm"
            >
              <Megaphone className="mr-2 h-4 w-4" />
              {notifying ? "Notificando..." : "Notificar Comercial"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar notificação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja notificar o comercial? Um e-mail será
                enviado informando a infraestrutura inadequada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleNotifyComercial}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-teal-600 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500" />
          Status Estações
        </Label>
        <Select
          value={stage.workstationsStatus || ""}
          onValueChange={(v) =>
            updateStage("infra", { workstationsStatus: v as StatusType })
          }
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.workstationsStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300",
              stage.workstationsStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300",
              stage.workstationsStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300",
              stage.workstationsStatus === "Aguardando Adequação" &&
              "bg-gray-50 text-gray-800 border-gray-300",
            )}
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-sky-600 flex items-center gap-2">
          <Server className="h-3.5 w-3.5" />
          Status Servidor
        </Label>
        <Select
          value={stage.serverStatus || ""}
          onValueChange={(v) =>
            updateStage("infra", { serverStatus: v as StatusType })
          }
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.serverStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300",
              stage.serverStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300",
              stage.serverStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300",
              stage.serverStatus === "Aguardando Adequação" &&
              "bg-gray-50 text-gray-800 border-gray-300",
            )}
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-purple-600 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          Qtd. de Estações
        </Label>
        <Input
          type="number"
          value={stage.workstationsCount || ""}
          onChange={(e) =>
            updateStage("infra", {
              workstationsCount: parseInt(e.target.value),
            })
          }
          className="h-11 border-2 border-purple-200 hover:border-purple-300 focus:border-purple-400 bg-purple-50/50 font-medium"
        />
      </div>
    </>
  );

  const renderAdherenceFields = (stage: AdherenceStageV2) => (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
      <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
        <Checkbox
          id="has-gap"
          checked={stage.hasProductGap || false}
          onCheckedChange={(checked) =>
            updateStage("adherence", { hasProductGap: checked === true })
          }
          className="border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
        />
        <Label
          htmlFor="has-gap"
          className="text-amber-800 font-semibold cursor-pointer"
        >
          ⚠️ Existe Gap de Produto?
        </Label>
      </div>
      {stage.hasProductGap && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-5 rounded-xl space-y-4 border-2 border-red-200 shadow-sm">
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Descrição do Gap
            </Label>
            <Textarea
              value={stage.gapDescription || ""}
              onChange={(e) =>
                updateStage("adherence", { gapDescription: e.target.value })
              }
              className="min-h-[100px] border-2 border-red-200 focus:border-red-400 bg-white"
              placeholder="Descreva detalhadamente o gap identificado..."
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderEnvironmentFields = (stage: EnvironmentStageV2) => (
    <div className="space-y-2.5">
      <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
        <Database className="h-3.5 w-3.5" />
        Sistema Operacional
      </Label>
      <Input
        value={stage.osVersion || ""}
        onChange={(e) =>
          updateStage("environment", { osVersion: e.target.value })
        }
        placeholder="Ex: Windows Server 2022"
        className="h-11 border-2 border-emerald-200 hover:border-emerald-300 focus:border-emerald-400 bg-emerald-50/50 font-medium"
      />
    </div>
  );

  const renderConversionFields = (stage: ConversionStageV2) => (
    <>
      {/* Send to Conversion Button */}
      <div className="col-span-full mb-4">
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={isInConversionQueue ? "outline" : "default"}
                disabled={sendingToConversion || isInConversionQueue}
                className={cn(
                  "w-full md:w-auto font-bold shadow-sm",
                  isInConversionQueue
                    ? "border-purple-300 text-purple-600"
                    : "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700",
                )}
              >
                {isInConversionQueue ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Na Fila de Conversão
                    <a
                      href="/conversion"
                      className="ml-2 inline-flex items-center text-xs underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {sendingToConversion
                      ? "Enviando..."
                      : "Enviar para Conversão"}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            {!isInConversionQueue && (
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
                  <AlertDialogDescription>
                    Deseja enviar este projeto para a fila de conversão? A
                    equipe de conversão será notificada e o projeto aparecerá no
                    dashboard deles.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSendToConversion}>
                    Confirmar Envio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            )}
          </AlertDialog>

          {isInConversionQueue && conversionItem && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              title="Remover da fila de conversão"
              onClick={async (e) => {
                e.stopPropagation();
                if (
                  confirm(
                    "Tem certeza que deseja remover este projeto da fila de conversão?",
                  )
                ) {
                  const success = await removeFromQueue(
                    conversionItem.id,
                    project.id,
                  );
                  if (success) {
                    updateStage("conversion", {
                      sentAt: undefined,
                      status: "todo" as StageStatus,
                      homologationStatus: undefined,
                      homologationResponsible: undefined,
                    });
                  }
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isInConversionQueue && conversionItem && (
          <div className="mt-2 text-sm text-muted-foreground">
            Status:{" "}
            <Badge variant="outline" className="ml-1">
              {conversionItem.queueStatus === "pending" && "Pendente"}
              {conversionItem.queueStatus === "in_progress" && "Em Andamento"}
              {conversionItem.queueStatus === "awaiting_homologation" &&
                "Aguard. Homologação"}
              {conversionItem.queueStatus === "homologation_issues" &&
                "Inconsistências"}
              {conversionItem.queueStatus === "approved" && "Aprovado"}
              {conversionItem.queueStatus === "done" && "Concluído"}
            </Badge>
            {conversionItem.assignedToName && (
              <span className="ml-3">
                Responsável: <strong>{conversionItem.assignedToName}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-fuchsia-600 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Status Homologação
        </Label>
        <Select
          value={stage.homologationStatus || ""}
          onValueChange={(v) =>
            updateStage("conversion", { homologationStatus: v as StatusType })
          }
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.homologationStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300",
              stage.homologationStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300",
              stage.homologationStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300",
              stage.homologationStatus === "Aguardando Adequação" &&
              "bg-gray-50 text-gray-800 border-gray-300",
            )}
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-violet-600 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Responsável Homolog.
        </Label>
        <AutocompleteInput
          value={stage.homologationResponsible || ""}
          onChange={(v) =>
            updateStage("conversion", { homologationResponsible: v })
          }
          className="h-11 border-2 border-violet-200 hover:border-violet-300 focus:border-violet-400 bg-violet-50/50"
        />
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Agendado Para (Homolog.)
        </Label>
        <Input
          type="date"
          value={
            stage.homologationFinishedAt
              ? new Date(stage.homologationFinishedAt)
                .toISOString()
                .split("T")[0]
              : ""
          }
          onChange={(e) =>
            updateStage("conversion", {
              homologationFinishedAt: e.target.value
                ? new Date(e.target.value + "T12:00:00")
                : undefined,
            })
          }
          className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-rose-50/50 font-medium"
        />
      </div>
    </>
  );

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

    // Sync phase1 status and dates with main stage for calendar compatibility
    if (phase === "phase1") {
      if (updates.status) {
        newImpl.status = updates.status as StageStatus;
      }
      // Sync phase1 dates with main implementation dates for calendar
      if (updates.startDate !== undefined) {
        newImpl.startDate = updates.startDate;
      }
      if (updates.endDate !== undefined) {
        newImpl.endDate = updates.endDate;
      }
    }

    updateStage("implementation", newImpl);
  };

  const getPhaseContent = (phase: ImplementationPhase | undefined) => {
    if (!phase?.observations) return "";
    try {
      const parsed = JSON.parse(phase.observations);
      if (Array.isArray(parsed)) return convertBlocksToTiptap(parsed);
      return parsed;
    } catch {
      return phase.observations;
    }
  };

  const renderImplementationFields = (stage: ImplementationStageV2) => (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-6">
      {/* Fase 1 */}
      <div className="relative overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 p-5 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full -mr-16 -mt-16" />
        <h4 className="font-bold mb-5 flex items-center gap-3 relative">
          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 shadow-md">
            🚀 Fase 1
          </Badge>
          <span className="text-lg text-blue-900">
            Treinamento & Acompanhamento
          </span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 relative">
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Status
            </Label>
            <Select
              value={stage.phase1?.status || "todo"}
              onValueChange={(v) =>
                updatePhase("phase1", { status: v as StageStatus })
              }
            >
              <SelectTrigger
                className={cn(
                  "h-11 border-2 font-medium transition-all",
                  stage.phase1?.status === "done" &&
                  "bg-emerald-50 text-emerald-800 border-emerald-300",
                  stage.phase1?.status === "in-progress" &&
                  "bg-blue-50 text-blue-800 border-blue-300",
                  stage.phase1?.status === "blocked" &&
                  "bg-amber-50 text-amber-800 border-amber-300",
                  stage.phase1?.status === "todo" &&
                  "bg-slate-50 text-slate-800 border-slate-300",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    Não Iniciado
                  </div>
                </SelectItem>
                <SelectItem value="in-progress">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Em Andamento
                  </div>
                </SelectItem>
                <SelectItem value="done">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Finalizado
                  </div>
                </SelectItem>
                <SelectItem value="blocked">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Bloqueado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5" />
              Responsável
            </Label>
            <AutocompleteInput
              value={stage.phase1?.responsible || ""}
              onChange={(v) => updatePhase("phase1", { responsible: v })}
              className="h-11 border-2 border-indigo-200 hover:border-indigo-300 focus:border-indigo-400 bg-white"
            />
          </div>
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Início
            </Label>
            <Input
              type="date"
              value={
                stage.phase1?.startDate
                  ? new Date(stage.phase1.startDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                updatePhase("phase1", {
                  startDate: e.target.value
                    ? new Date(e.target.value + "T12:00:00")
                    : undefined,
                })
              }
              className="h-11 border-2 border-cyan-200 hover:border-cyan-300 focus:border-cyan-400 bg-white font-medium"
            />
          </div>
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
              <Power className="h-3.5 w-3.5" />
              Término
            </Label>
            <Input
              type="date"
              value={
                stage.phase1?.endDate
                  ? new Date(stage.phase1.endDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                updatePhase("phase1", {
                  endDate: e.target.value
                    ? new Date(e.target.value + "T12:00:00")
                    : undefined,
                })
              }
              className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-white font-medium"
            />
          </div>
        </div>
        <div className="space-y-3 relative">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
            <Label className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Observações da Fase 1
            </Label>
          </div>
          <div className="rounded-xl border-2 border-blue-200 overflow-hidden bg-white">
            <RichTextEditor
              content={getPhaseContent(stage.phase1)}
              onChange={(c) => updatePhase("phase1", { observations: c })}
              placeholder="Detalhes da fase 1..."
            />
          </div>
        </div>
      </div>

      {/* Fase 2 */}
      <div className="relative overflow-hidden rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50 p-5 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full -mr-16 -mt-16" />
        <h4 className="font-bold mb-5 flex items-center gap-3 relative">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 shadow-md">
            🎓 Fase 2
          </Badge>
          <span className="text-lg text-purple-900">Possível Retorno</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 relative">
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-purple-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              Status
            </Label>
            <Select
              value={stage.phase2?.status || "todo"}
              onValueChange={(v) =>
                updatePhase("phase2", { status: v as StageStatus })
              }
            >
              <SelectTrigger
                className={cn(
                  "h-11 border-2 font-medium transition-all",
                  stage.phase2?.status === "done" &&
                  "bg-emerald-50 text-emerald-800 border-emerald-300",
                  stage.phase2?.status === "in-progress" &&
                  "bg-purple-50 text-purple-800 border-purple-300",
                  stage.phase2?.status === "blocked" &&
                  "bg-amber-50 text-amber-800 border-amber-300",
                  stage.phase2?.status === "todo" &&
                  "bg-slate-50 text-slate-800 border-slate-300",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    Não Iniciado
                  </div>
                </SelectItem>
                <SelectItem value="in-progress">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                    Em Andamento
                  </div>
                </SelectItem>
                <SelectItem value="done">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Finalizado
                  </div>
                </SelectItem>
                <SelectItem value="blocked">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Bloqueado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-pink-600 flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5" />
              Responsável
            </Label>
            <AutocompleteInput
              value={stage.phase2?.responsible || ""}
              onChange={(v) => updatePhase("phase2", { responsible: v })}
              className="h-11 border-2 border-pink-200 hover:border-pink-300 focus:border-pink-400 bg-white"
            />
          </div>
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Início
            </Label>
            <Input
              type="date"
              value={
                stage.phase2?.startDate
                  ? new Date(stage.phase2.startDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                updatePhase("phase2", {
                  startDate: e.target.value
                    ? new Date(e.target.value + "T12:00:00")
                    : undefined,
                })
              }
              className="h-11 border-2 border-cyan-200 hover:border-cyan-300 focus:border-cyan-400 bg-white font-medium"
            />
          </div>
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
              <Power className="h-3.5 w-3.5" />
              Término
            </Label>
            <Input
              type="date"
              value={
                stage.phase2?.endDate
                  ? new Date(stage.phase2.endDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                updatePhase("phase2", {
                  endDate: e.target.value
                    ? new Date(e.target.value + "T12:00:00")
                    : undefined,
                })
              }
              className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-white font-medium"
            />
          </div>
        </div>
        <div className="space-y-3 relative">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            <Label className="text-xs font-bold uppercase tracking-widest text-purple-600">
              Observações da Fase 2
            </Label>
          </div>
          <div className="rounded-xl border-2 border-purple-200 overflow-hidden bg-white">
            <RichTextEditor
              content={getPhaseContent(stage.phase2)}
              onChange={(c) => updatePhase("phase2", { observations: c })}
              placeholder="Detalhes da fase 2..."
            />
          </div>
        </div>
      </div>
    </div>
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sent' | 'available', currentFiles: AttachedFile[] = []) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadingType(type);
      try {
        const filesToUpload = Array.from(e.target.files);
        const newAttachedFiles: AttachedFile[] = [];

        // Upload files sequentially to avoid overwhelming storage/DB constraints or we could use Promise.all
        for (const file of filesToUpload) {
          const result = await uploadFile.mutateAsync({
            file,
            uploadedBy: "Admin", // To be replaced with actual user if auth is available
          });

          newAttachedFiles.push({
            id: result.id,
            name: result.file_name,
            path: result.file_path,
            size: result.file_size,
            uploadedAt: result.uploaded_at,
          });
        }

        const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
        updateStage("modelosEditor", {
          [fieldToUpdate]: [...currentFiles, ...newAttachedFiles]
        });

        toast({
          title: "Sucesso",
          description: filesToUpload.length > 1 ? `${filesToUpload.length} arquivos enviados com sucesso.` : "Arquivo enviado com sucesso.",
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar os arquivos.",
          variant: "destructive",
        });
      } finally {
        setUploadingType(null);
        if (type === 'sent' && sentFileInputRef.current) sentFileInputRef.current.value = "";
        if (type === 'available' && availableFileInputRef.current) availableFileInputRef.current.value = "";
      }
    }
  };

  const handleFileDownload = async (file: AttachedFile) => {
    try {
      const url = await getDownloadUrl(file.path);
      window.open(url, "_blank");
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro no download",
        description: "Falha ao gerar o link do arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFile = async (file: AttachedFile, type: 'sent' | 'available', currentFiles: AttachedFile[]) => {
    if (confirm(`Tem certeza que deseja excluir ${file.name}?`)) {
      try {
        // Technically it attempts to delete from project_files DB too, but might fail if missing or succeed.
        // What matters is removing from JSON locally and updating stage.
        await deleteStorageFile.mutateAsync({ ...file, projectId: project.id, fileType: '', fileUrl: file.path, uploadedBy: '' } as any);

        const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
        updateStage("modelosEditor", {
          [fieldToUpdate]: currentFiles.filter((f) => f.id !== file.id)
        });

        toast({
          title: "Sucesso",
          description: "Arquivo removido.",
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Não foi possível remover o arquivo.",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileView = async (file: AttachedFile) => {
    try {
      const url = await getDownloadUrl(file.path);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Error generating view URL:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFileDone = (file: AttachedFile, type: 'sent' | 'available', currentFiles: AttachedFile[]) => {
    const updatedFiles = currentFiles.map(f =>
      f.id === file.id ? { ...f, isDone: !f.isDone } : f
    );
    const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
    updateStage("modelosEditor", {
      [fieldToUpdate]: updatedFiles
    });
  };

  const renderFileRow = (file: AttachedFile, type: 'sent' | 'available', list: AttachedFile[]) => (
    <div key={file.id} className={cn("flex items-center justify-between p-2 rounded-md bg-white border border-border/50 text-sm transition-all duration-200", file.isDone && "bg-emerald-50/50 border-emerald-200")}>
      <div className="flex items-center gap-3 overflow-hidden">
        <Checkbox
          checked={!!file.isDone}
          onCheckedChange={() => handleToggleFileDone(file, type, list)}
          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded flex-shrink-0"
        />
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn("truncate font-medium transition-colors cursor-pointer hover:text-indigo-600", file.isDone && "text-muted-foreground line-through")} onClick={(e) => { e.preventDefault(); handleFileView(file); }}>{file.name}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50" title="Visualizar arquivo" onClick={(e) => { e.preventDefault(); handleFileView(file); }}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 transition-colors hover:text-indigo-600 hover:bg-indigo-50" title="Baixar" onClick={(e) => { e.preventDefault(); handleFileDownload(file); }}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" title="Excluir" onClick={(e) => { e.preventDefault(); handleRemoveFile(file, type, list); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  const renderModelosEditorFields = (stage: ModelosEditorStageV2 | undefined) => {
    const s = stage || ({} as ModelosEditorStageV2);

    // Calculates conclusion percentage based on sentModels checked items
    const sentCount = s.sentFiles?.length || 0;
    const doneCount = s.sentFiles?.filter(f => f.isDone).length || 0;
    const progressPercent = sentCount > 0 ? Math.round((doneCount / sentCount) * 100) : 0;

    return (
      <div className="col-span-3 space-y-6 pt-2 w-full">
        {/* Progress Bar overall status */}
        {sentCount > 0 && (
          <div className="w-full space-y-2 bg-white/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-indigo-700">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Progresso dos Modelos
              </span>
              <span>{doneCount} de {sentCount} ({progressPercent}%)</span>
            </div>
            <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", progressPercent === 100 ? "bg-emerald-500" : "bg-indigo-500")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">

          {/* Modelos Enviados */}
          <div className="space-y-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <UploadCloud className="h-4 w-4" />
                Modelos Enviados (Cliente)
              </Label>
              <input
                type="file"
                ref={sentFileInputRef}
                className="hidden"
                multiple
                onChange={(e) => handleFileUpload(e, 'sent', s.sentFiles)}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                onClick={(e) => { e.preventDefault(); sentFileInputRef.current?.click(); }}
                disabled={uploadingType === 'sent'}
              >
                {uploadingType === 'sent' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5 mr-1" />}
                Anexar
              </Button>
            </div>
            {(!s.sentFiles || s.sentFiles.length === 0) && (
              <div className="text-xs text-muted-foreground text-center py-4 bg-white/50 rounded-lg border border-dashed border-indigo-200">
                Nenhum modelo do cliente anexado.
              </div>
            )}
            {s.sentFiles && s.sentFiles.length > 0 && (
              <div className="space-y-2">
                {s.sentFiles.map(file => renderFileRow(file, 'sent', s.sentFiles!))}
              </div>
            )}
          </div>

          {/* Modelos Disponíveis */}
          <div className="space-y-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Modelos Disponíveis (JSON)
              </Label>
              <input
                type="file"
                ref={availableFileInputRef}
                className="hidden"
                accept=".json"
                multiple
                onChange={(e) => handleFileUpload(e, 'available', s.availableFiles)}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                onClick={(e) => { e.preventDefault(); availableFileInputRef.current?.click(); }}
                disabled={uploadingType === 'available'}
              >
                {uploadingType === 'available' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5 mr-1" />}
                Anexar JSON
              </Button>
            </div>
            {(!s.availableFiles || s.availableFiles.length === 0) && (
              <div className="text-xs text-muted-foreground text-center py-4 bg-white/50 rounded-lg border border-dashed border-emerald-200">
                Nenhum JSON de modelo anexado.
              </div>
            )}
            {s.availableFiles && s.availableFiles.length > 0 && (
              <div className="space-y-2">
                {s.availableFiles.map(file => renderFileRow(file, 'available', s.availableFiles!))}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  const renderModelosMetrics = (stage: ModelosEditorStageV2 | undefined) => {
    if (!stage || !stage.startDate || !stage.endDate || !stage.sentFiles || stage.sentFiles.length === 0) return null;

    const start = new Date(stage.startDate);
    const end = new Date(stage.endDate);
    const today = new Date();

    // Calculate total days (inclusive)
    const totalDays = Math.max(1, differenceInDays(end, start) + 1);
    const totalModels = stage.sentFiles.length;

    // Daily average needed
    const avgNeeded = Math.ceil(totalModels / totalDays);

    // Days elapsed so far (capped between 0 and totalDays)
    let daysElapsed = differenceInDays(today, start) + 1;
    if (daysElapsed < 0) daysElapsed = 0;
    if (daysElapsed > totalDays) daysElapsed = totalDays;

    // Expected progress by today
    const expectedDone = Math.min(totalModels, daysElapsed * avgNeeded);

    // Current progress
    const actualDone = stage.sentFiles.filter(f => f.isDone).length;

    // Health: Green if starting today or on track. Red if behind.
    const isOnTrack = daysElapsed === 0 || actualDone >= expectedDone;

    return (
      <>
        <Label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isOnTrack ? "text-emerald-600" : "text-red-500")}>
          <Calendar className="h-3.5 w-3.5" />
          Média Necessária
        </Label>
        <div className={cn(
          "h-11 flex items-center justify-center px-4 border-2 transition-all duration-300 rounded-md font-bold text-sm shadow-sm",
          isOnTrack
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        )}>
          {avgNeeded} modelo{avgNeeded !== 1 ? 's' : ''} / dia
        </div>
      </>
    );
  };

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
            className="bg-green-50 text-green-700 border-green-200"
          >
            {saveState.message}
          </Badge>
        )}
        {saveState.status === "error" && (
          <Badge variant="destructive">{saveState.message}</Badge>
        )}
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
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
        >
          {renderInfraFields(stagesData.infra)}
        </StageCard>

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
        >
          {renderAdherenceFields(stagesData.adherence)}
        </StageCard>

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
        >
          {renderConversionFields(stagesData.conversion)}
        </StageCard>

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
        >
          {renderEnvironmentFields(stagesData.environment)}
        </StageCard>

        {isOrionTN && (
          <StageCard
            id="modelosEditor"
            label="5. Modelos Editor"
            icon={FileEdit}
            status={stagesData.modelosEditor?.status || "todo"}
            responsible={stagesData.modelosEditor?.responsible || ""}
            hideResponsible={true}
            startDate={stagesData.modelosEditor?.startDate}
            endDate={stagesData.modelosEditor?.endDate}
            observations={stagesData.modelosEditor?.observations}
            onUpdate={(u) => updateStage("modelosEditor", u)}
            extraHeaderField={renderModelosMetrics(stagesData.modelosEditor)}
          >
            {renderModelosEditorFields(stagesData.modelosEditor)}
          </StageCard>
        )}

        <StageCard
          id="implementation"
          label={`${isOrionTN ? "6" : "5"}. Implantação & Treinamento`}
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
        >
          {renderImplementationFields(stagesData.implementation)}
        </StageCard>

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
        />
      </Accordion>
    </div>
  );
}
