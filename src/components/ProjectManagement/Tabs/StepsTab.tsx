import {
  ProjectV2,
  InfraStageV2,
  AdherenceStageV2,
  EnvironmentStageV2,
  ConversionStageV2,
  ImplementationStageV2,
  PostStageV2,
  ImplementationPhase,
  StageStatus,
} from "@/types/ProjectV2";
import { useState } from "react";
import { format } from "date-fns";
import { useProjectForm } from "@/hooks/useProjectForm";
import { StageCard } from "@/components/ProjectManagement/Forms/StageCard";
import { Accordion } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Server, Megaphone, CheckCircle2, Database, RefreshCw, Rocket, Power } from "lucide-react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

type StatusType = "Adequado" | "Parcialmente Adequado" | "Inadequado" | "Aguardando Adequação";

export function StepsTab({ project, onUpdate }: TabProps) {
  const { data, updateStage, saveState } = useProjectForm(project, onUpdate);
  const { toast } = useToast();
  const [notifying, setNotifying] = useState(false);

  const handleNotifyComercial = async () => {
    setNotifying(true);
    try {
      await fetch("http://10.0.21.109:5678/webhook/infra-inadequada-disparo", {
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
        <Button
          onClick={handleNotifyComercial}
          variant="destructive"
          disabled={notifying}
          className="w-full md:w-auto font-bold shadow-sm"
        >
          <Megaphone className="mr-2 h-4 w-4" />
          {notifying ? "Notificando..." : "Notificar Comercial"}
        </Button>
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-teal-600 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500" />
          Status Estações
        </Label>
        <Select
          value={stage.workstationsStatus || ""}
          onValueChange={(v) => updateStage("infra", { workstationsStatus: v as StatusType })}
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.workstationsStatus === "Adequado" && "bg-green-50 text-green-800 border-green-300",
              stage.workstationsStatus === "Parcialmente Adequado" && "bg-orange-50 text-orange-800 border-orange-300",
              stage.workstationsStatus === "Inadequado" && "bg-red-50 text-red-800 border-red-300",
              stage.workstationsStatus === "Aguardando Adequação" && "bg-gray-50 text-gray-800 border-gray-300",
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
            <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium">
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
            <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium">
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
          onValueChange={(v) => updateStage("infra", { serverStatus: v as StatusType })}
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.serverStatus === "Adequado" && "bg-green-50 text-green-800 border-green-300",
              stage.serverStatus === "Parcialmente Adequado" && "bg-orange-50 text-orange-800 border-orange-300",
              stage.serverStatus === "Inadequado" && "bg-red-50 text-red-800 border-red-300",
              stage.serverStatus === "Aguardando Adequação" && "bg-gray-50 text-gray-800 border-gray-300",
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
            <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium">
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
            <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium">
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
          onCheckedChange={(checked) => updateStage("adherence", { hasProductGap: checked === true })}
          className="border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
        />
        <Label htmlFor="has-gap" className="text-amber-800 font-semibold cursor-pointer">
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
              onChange={(e) => updateStage("adherence", { gapDescription: e.target.value })}
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
        onChange={(e) => updateStage("environment", { osVersion: e.target.value })}
        placeholder="Ex: Windows Server 2022"
        className="h-11 border-2 border-emerald-200 hover:border-emerald-300 focus:border-emerald-400 bg-emerald-50/50 font-medium"
      />
    </div>
  );

  const renderConversionFields = (stage: ConversionStageV2) => (
    <>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-fuchsia-600 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Status Homologação
        </Label>
        <Select
          value={stage.homologationStatus || ""}
          onValueChange={(v) => updateStage("conversion", { homologationStatus: v as StatusType })}
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.homologationStatus === "Adequado" && "bg-green-50 text-green-800 border-green-300",
              stage.homologationStatus === "Parcialmente Adequado" && "bg-orange-50 text-orange-800 border-orange-300",
              stage.homologationStatus === "Inadequado" && "bg-red-50 text-red-800 border-red-300",
              stage.homologationStatus === "Aguardando Adequação" && "bg-gray-50 text-gray-800 border-gray-300",
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
            <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium">
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
            <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium">
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
          onChange={(v) => updateStage("conversion", { homologationResponsible: v })}
          className="h-11 border-2 border-violet-200 hover:border-violet-300 focus:border-violet-400 bg-violet-50/50"
        />
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-2">
          <Rocket className="h-3.5 w-3.5" />
          Enviado em
        </Label>
        <Input
          type="date"
          value={stage.sentAt ? new Date(stage.sentAt).toISOString().split("T")[0] : ""}
          onChange={(e) =>
            updateStage("conversion", {
              sentAt: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined,
            })
          }
          className="h-11 border-2 border-cyan-200 hover:border-cyan-300 focus:border-cyan-400 bg-cyan-50/50 font-medium"
        />
      </div>
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
          <Power className="h-3.5 w-3.5" />
          Finalizado em
        </Label>
        <Input
          type="date"
          value={stage.finishedAt ? new Date(stage.finishedAt).toISOString().split("T")[0] : ""}
          onChange={(e) =>
            updateStage("conversion", {
              finishedAt: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined,
            })
          }
          className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-rose-50/50 font-medium"
        />
      </div>
    </>
  );

  // Special handling for Implementation Phases
  const updatePhase = (phase: "phase1" | "phase2", updates: Partial<ImplementationPhase>) => {
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
          <span className="text-lg text-blue-900">Treinamento & Acompanhamento</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 relative">
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Status
            </Label>
            <Select
              value={stage.phase1?.status || "todo"}
              onValueChange={(v) => updatePhase("phase1", { status: v as StageStatus })}
            >
              <SelectTrigger
                className={cn(
                  "h-11 border-2 font-medium transition-all",
                  stage.phase1?.status === "done" && "bg-emerald-50 text-emerald-800 border-emerald-300",
                  stage.phase1?.status === "in-progress" && "bg-blue-50 text-blue-800 border-blue-300",
                  stage.phase1?.status === "blocked" && "bg-amber-50 text-amber-800 border-amber-300",
                  stage.phase1?.status === "todo" && "bg-slate-50 text-slate-800 border-slate-300",
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
              value={stage.phase1?.startDate ? new Date(stage.phase1.startDate).toISOString().split("T")[0] : ""}
              onChange={(e) =>
                updatePhase("phase1", {
                  startDate: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined,
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
              value={stage.phase1?.endDate ? new Date(stage.phase1.endDate).toISOString().split("T")[0] : ""}
              onChange={(e) =>
                updatePhase("phase1", {
                  endDate: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined,
                })
              }
              className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-white font-medium"
            />
          </div>
        </div>
        <div className="space-y-3 relative">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
            <Label className="text-xs font-bold uppercase tracking-widest text-blue-600">Observações da Fase 1</Label>
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
              onValueChange={(v) => updatePhase("phase2", { status: v as StageStatus })}
            >
              <SelectTrigger
                className={cn(
                  "h-11 border-2 font-medium transition-all",
                  stage.phase2?.status === "done" && "bg-emerald-50 text-emerald-800 border-emerald-300",
                  stage.phase2?.status === "in-progress" && "bg-purple-50 text-purple-800 border-purple-300",
                  stage.phase2?.status === "blocked" && "bg-amber-50 text-amber-800 border-amber-300",
                  stage.phase2?.status === "todo" && "bg-slate-50 text-slate-800 border-slate-300",
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
              value={stage.phase2?.startDate ? new Date(stage.phase2.startDate).toISOString().split("T")[0] : ""}
              onChange={(e) =>
                updatePhase("phase2", {
                  startDate: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined,
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
              value={stage.phase2?.endDate ? new Date(stage.phase2.endDate).toISOString().split("T")[0] : ""}
              onChange={(e) =>
                updatePhase("phase2", {
                  endDate: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined,
                })
              }
              className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-white font-medium"
            />
          </div>
        </div>
        <div className="space-y-3 relative">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            <Label className="text-xs font-bold uppercase tracking-widest text-purple-600">Observações da Fase 2</Label>
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
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {saveState.message}
          </Badge>
        )}
        {saveState.status === "error" && <Badge variant="destructive">{saveState.message}</Badge>}
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
        >
          {renderEnvironmentFields(stagesData.environment)}
        </StageCard>

        <StageCard
          id="implementation"
          label="5. Implantação & Treinamento"
          icon={Rocket}
          status={stagesData.implementation.status}
          responsible={stagesData.implementation.responsible || ""}
          hideResponsible={true}
          // Phase 1 dates are used as the main dates for the implementation stage
          // These are synced automatically when phase 1 dates are updated
          startDate={stagesData.implementation.phase1?.startDate || stagesData.implementation.startDate}
          endDate={stagesData.implementation.phase1?.endDate || stagesData.implementation.endDate}
          observations={stagesData.implementation.observations}
          hideDates={true} // Hide main dates - will be managed by Phase 1 and Phase 2
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
          label="6. Pós-Implantação"
          icon={Power}
          status={stagesData.post.status}
          responsible={stagesData.post.responsible}
          startDate={stagesData.post.startDate}
          endDate={stagesData.post.endDate}
          observations={stagesData.post.observations}
          onUpdate={(u) => updateStage("post", u)}
        />
      </Accordion>
    </div>
  );
}
