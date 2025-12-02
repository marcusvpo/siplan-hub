import {
  ProjectV2,
  ContentBlock,
  InfraStageV2,
  AdherenceStageV2,
  EnvironmentStageV2,
  ConversionStageV2,
  ImplementationStageV2,
  PostStageV2,
  ImplementationPhase,
} from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Type, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

type AnyStage =
  | InfraStageV2
  | AdherenceStageV2
  | EnvironmentStageV2
  | ConversionStageV2
  | ImplementationStageV2
  | PostStageV2;

import { convertBlocksToTiptap } from "@/lib/editor-utils";

export function StepsTab({ project, onUpdate }: TabProps) {
  const { data: stagesData, handleChange: handleStagesChangeField, saveState } = useAutoSave(
    project.stages,
    async (newStages) => {
      onUpdate({ ...project, stages: newStages });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  );



  const handleStageChange = (
    stageKey: keyof ProjectV2["stages"],
    field: string,
    value: unknown
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentStage: any = { ...stagesData[stageKey] };
    currentStage[field] = value;
    handleStagesChangeField(stageKey, currentStage);
  };

  const handlePhaseChange = (
    stageKey: "implementation",
    phase: "phase1" | "phase2",
    field: string,
    value: unknown
  ) => {
    const currentStage = { ...stagesData[stageKey] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPhase = { ...(currentStage as any)[phase] };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (currentPhase as any)[field] = value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (currentStage as any)[phase] = currentPhase;
    
    // Sync main status with Phase 1 status
    if (phase === "phase1" && field === "status") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentStage.status = value as any;
    }

    handleStagesChangeField(stageKey, currentStage);
  };

  // Rich Text Logic for Stages
  const getStageContent = (stage: AnyStage) => {
    if (!stage.observations) return "";
    try {
      const parsed = JSON.parse(stage.observations);
      if (Array.isArray(parsed)) {
        return convertBlocksToTiptap(parsed);
      }
      return parsed;
    } catch {
      return stage.observations;
    }
  };

  const updateStageContent = (
    stageKey: keyof ProjectV2["stages"],
    content: string
  ) => {
    handleStageChange(stageKey, "observations", content);
  };

  const renderRichEditor = (stageKey: keyof ProjectV2["stages"]) => {
    const content = getStageContent(stagesData[stageKey]);
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
           <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Editor de Conteúdo
          </span>
        </div>
        <RichTextEditor 
          content={content} 
          onChange={(newContent) => updateStageContent(stageKey, newContent)} 
          placeholder="Adicione observações, checklists ou detalhes desta etapa..."
        />
      </div>
    );
  };

  // Phase Rich Text Logic
  const getPhaseContent = (phase: ImplementationPhase) => {
    if (!phase.observations) return "";
    try {
      const parsed = JSON.parse(phase.observations);
      if (Array.isArray(parsed)) {
        return convertBlocksToTiptap(parsed);
      }
      return parsed;
    } catch {
      return phase.observations;
    }
  };

  const updatePhaseContent = (
    phaseKey: "phase1" | "phase2",
    content: string
  ) => {
    handlePhaseChange(
      "implementation",
      phaseKey,
      "observations",
      content
    );
  };

  const renderPhaseRichEditor = (phaseKey: "phase1" | "phase2") => {
    const phase = stagesData.implementation[phaseKey];
    const content = getPhaseContent(phase);

    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
           <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Editor de Conteúdo
          </span>
        </div>
        <RichTextEditor 
          content={content} 
          onChange={(newContent) => updatePhaseContent(phaseKey, newContent)} 
          placeholder="Detalhes da fase de implantação..."
        />
      </div>
    );
  };

  const renderCommonFields = (
    stageKey: keyof ProjectV2["stages"],
    stage: AnyStage
  ) => (
    <div className="space-y-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={stage.status}
            onValueChange={(value) =>
              handleStageChange(stageKey, "status", value)
            }
          >
            <SelectTrigger
              className={cn(
                stage.status === "done" &&
                  "bg-emerald-100 text-emerald-800 border-emerald-200",
                stage.status === "in-progress" &&
                  "bg-blue-100 text-blue-800 border-blue-200",
                stage.status === "blocked" &&
                  "bg-amber-100 text-amber-800 border-amber-200",
                stage.status === "waiting_adjustment" &&
                  "bg-orange-100 text-orange-800 border-orange-200"
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stageKey === "adherence" ? (
                <>
                  <SelectItem value="todo">Não Iniciado</SelectItem>
                  <SelectItem value="in-progress">Em Análise</SelectItem>
                  <SelectItem value="done">Adequado</SelectItem>
                  <SelectItem value="blocked">Inadequado</SelectItem>
                  <SelectItem value="waiting_adjustment">Em Adequação</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="todo">Não Iniciado</SelectItem>
                  <SelectItem value="in-progress">Em Andamento</SelectItem>
                  <SelectItem value="done">Finalizado</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Responsável</Label>
          <AutocompleteInput
            value={stage.responsible || ""}
            onChange={(value) =>
              handleStageChange(stageKey, "responsible", value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label>
            {["infra", "adherence", "environment", "conversion"].includes(stageKey)
              ? "Enviado em"
              : "Início"}
          </Label>
          <Input
            type="date"
            value={
              stage.startDate
                ? format(new Date(stage.startDate).toISOString().split('T')[0], "yyyy-MM-dd")
                : ""
            }
            onChange={(e) =>
              handleStageChange(
                stageKey,
                "startDate",
                e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label>
            {["infra", "adherence", "environment", "conversion"].includes(stageKey)
              ? "Finalizado em"
              : "Término"}
          </Label>
          <Input
            type="date"
            value={
              stage.endDate ? format(new Date(stage.endDate).toISOString().split('T')[0], "yyyy-MM-dd") : ""
            }
            onChange={(e) =>
              handleStageChange(
                stageKey,
                "endDate",
                e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
              )
            }
          />
        </div>
      </div>

      {/* Rich Text Editor for Observations */}
      {renderRichEditor(stageKey)}
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
        {/* 1. Infraestrutura */}
        <AccordionItem value="infra" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                1. Análise de Infraestrutura
              </span>
              <Badge
                variant={
                  stagesData.infra.status === "done" ? "default" : "secondary"
                }
                className={cn(
                  stagesData.infra.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  stagesData.infra.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  stagesData.infra.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {stagesData.infra.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("infra", stagesData.infra)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Status Estações</Label>
                <Select
                  value={stagesData.infra.workstationsStatus}
                  onValueChange={(value) =>
                    handleStageChange("infra", "workstationsStatus", value)
                  }
                >
                  <SelectTrigger className={cn(
                    stagesData.infra.workstationsStatus === "Adequado" && "bg-green-100 text-green-800 border-green-200",
                    stagesData.infra.workstationsStatus === "Parcialmente Adequado" && "bg-orange-100 text-orange-800 border-orange-200",
                    stagesData.infra.workstationsStatus === "Inadequado" && "bg-red-100 text-red-800 border-red-200",
                    stagesData.infra.workstationsStatus === "Aguardando Adequação" && "bg-gray-100 text-gray-800 border-gray-200"
                  )}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequado" className="text-green-600 font-medium focus:bg-green-50 focus:text-green-700">
                      Adequado
                    </SelectItem>
                    <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium focus:bg-orange-50 focus:text-orange-700">
                      Parcialmente Adequado
                    </SelectItem>
                    <SelectItem value="Inadequado" className="text-red-600 font-medium focus:bg-red-50 focus:text-red-700">
                      Inadequado
                    </SelectItem>
                    <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium focus:bg-gray-50 focus:text-gray-700">
                      Aguardando Adequação
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status Servidor</Label>
                <Select
                  value={stagesData.infra.serverStatus}
                  onValueChange={(value) =>
                    handleStageChange("infra", "serverStatus", value)
                  }
                >
                  <SelectTrigger className={cn(
                    stagesData.infra.serverStatus === "Adequado" && "bg-green-100 text-green-800 border-green-200",
                    stagesData.infra.serverStatus === "Parcialmente Adequado" && "bg-orange-100 text-orange-800 border-orange-200",
                    stagesData.infra.serverStatus === "Inadequado" && "bg-red-100 text-red-800 border-red-200",
                    stagesData.infra.serverStatus === "Aguardando Adequação" && "bg-gray-100 text-gray-800 border-gray-200"
                  )}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequado" className="text-green-600 font-medium focus:bg-green-50 focus:text-green-700">
                      Adequado
                    </SelectItem>
                    <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium focus:bg-orange-50 focus:text-orange-700">
                      Parcialmente Adequado
                    </SelectItem>
                    <SelectItem value="Inadequado" className="text-red-600 font-medium focus:bg-red-50 focus:text-red-700">
                      Inadequado
                    </SelectItem>
                    <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium focus:bg-gray-50 focus:text-gray-700">
                      Aguardando Adequação
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qtd. de Estações</Label>
                <Input
                  type="number"
                  value={stagesData.infra.workstationsCount || ""}
                  onChange={(e) =>
                    handleStageChange("infra", "workstationsCount", parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Aderência */}
        <AccordionItem value="adherence" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                2. Análise de Aderência
              </span>
              <Badge
                variant={
                  stagesData.adherence.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  stagesData.adherence.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  stagesData.adherence.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  stagesData.adherence.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600",
                  stagesData.adherence.status === "waiting_adjustment" &&
                    "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {stagesData.adherence.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("adherence", stagesData.adherence)}
            <div className="border-t pt-4 space-y-4 bg-muted/20 p-4 rounded-md">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-gap"
                  checked={stagesData.adherence.hasProductGap || false}
                  onCheckedChange={(checked) =>
                    handleStageChange("adherence", "hasProductGap", checked)
                  }
                />
                <Label htmlFor="has-gap">Existe Gap de Produto?</Label>
              </div>
              {stagesData.adherence.hasProductGap && (
                <div className="bg-background p-4 rounded-md space-y-4 border">
                  <div className="space-y-2">
                    <Label>Descrição do Gap</Label>
                    <Textarea
                      value={stagesData.adherence.gapDescription || ""}
                      onChange={(e) =>
                        handleStageChange(
                          "adherence",
                          "gapDescription",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Ambiente */}
        <AccordionItem value="environment" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                3. Preparação de Ambiente
              </span>
              <Badge
                variant={
                  stagesData.environment.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  stagesData.environment.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  stagesData.environment.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  stagesData.environment.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {stagesData.environment.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("environment", stagesData.environment)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Sistema Operacional</Label>
                <Input
                  value={stagesData.environment.osVersion || ""}
                  onChange={(e) =>
                    handleStageChange(
                      "environment",
                      "osVersion",
                      e.target.value
                    )
                  }
                  placeholder="Ex: Windows Server 2022"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Conversão */}
        <AccordionItem value="conversion" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                4. Conversão de Dados
              </span>
              <Badge
                variant={
                  stagesData.conversion.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  stagesData.conversion.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  stagesData.conversion.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  stagesData.conversion.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {stagesData.conversion.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("conversion", stagesData.conversion)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Status Homologação</Label>
                <Select
                  value={stagesData.conversion.homologationStatus}
                  onValueChange={(value) =>
                    handleStageChange("conversion", "homologationStatus", value)
                  }
                >
                  <SelectTrigger className={cn(
                    stagesData.conversion.homologationStatus === "Adequado" && "bg-green-100 text-green-800 border-green-200",
                    stagesData.conversion.homologationStatus === "Parcialmente Adequado" && "bg-orange-100 text-orange-800 border-orange-200",
                    stagesData.conversion.homologationStatus === "Inadequado" && "bg-red-100 text-red-800 border-red-200",
                    stagesData.conversion.homologationStatus === "Aguardando Adequação" && "bg-gray-100 text-gray-800 border-gray-200"
                  )}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequado" className="text-green-600 font-medium focus:bg-green-50 focus:text-green-700">
                      Adequado
                    </SelectItem>
                    <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium focus:bg-orange-50 focus:text-orange-700">
                      Parcialmente Adequado
                    </SelectItem>
                    <SelectItem value="Inadequado" className="text-red-600 font-medium focus:bg-red-50 focus:text-red-700">
                      Inadequado
                    </SelectItem>
                    <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium focus:bg-gray-50 focus:text-gray-700">
                      Aguardando Adequação
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável Homolog.</Label>
                <AutocompleteInput
                  value={stagesData.conversion.homologationResponsible || ""}
                  onChange={(value) =>
                    handleStageChange("conversion", "homologationResponsible", value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Enviado em</Label>
                <Input
                  type="date"
                  value={
                    stagesData.conversion.sentAt
                      ? format(new Date(stagesData.conversion.sentAt).toISOString().split('T')[0], "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined;
                    handleStageChange("conversion", "sentAt", date);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Finalizado em</Label>
                <Input
                  type="date"
                  value={
                    stagesData.conversion.finishedAt
                      ? format(new Date(stagesData.conversion.finishedAt).toISOString().split('T')[0], "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined;
                    handleStageChange("conversion", "finishedAt", date);
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Implantação */}
        <AccordionItem
          value="implementation"
          className="border rounded-lg px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                5. Implantação & Treinamento
              </span>
              <Badge
                variant={
                  stagesData.implementation.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  stagesData.implementation.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  stagesData.implementation.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  stagesData.implementation.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {stagesData.implementation.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            
            {/* Fase 1 */}
            <div className="border rounded-md p-4 bg-muted/10">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Badge variant="outline">Fase 1</Badge>
                Implantação Inicial
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={stagesData.implementation.phase1?.status || "todo"}
                    onValueChange={(value) =>
                      handlePhaseChange("implementation", "phase1", "status", value)
                    }
                  >
                    <SelectTrigger className={cn(
                      stagesData.implementation.phase1?.status === "done" && "bg-emerald-100 text-emerald-800 border-emerald-200",
                      stagesData.implementation.phase1?.status === "in-progress" && "bg-blue-100 text-blue-800 border-blue-200",
                      stagesData.implementation.phase1?.status === "blocked" && "bg-amber-100 text-amber-800 border-amber-200"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Não Iniciado</SelectItem>
                      <SelectItem value="in-progress">Em Andamento</SelectItem>
                      <SelectItem value="done">Finalizado</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <AutocompleteInput
                    value={stagesData.implementation.phase1?.responsible || ""}
                    onChange={(value) =>
                      handlePhaseChange("implementation", "phase1", "responsible", value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={
                      stagesData.implementation.phase1?.startDate
                        ? format(new Date(stagesData.implementation.phase1.startDate).toISOString().split('T')[0], "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) =>
                      handlePhaseChange(
                        "implementation",
                        "phase1",
                        "startDate",
                        e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Término</Label>
                  <Input
                    type="date"
                    value={
                      stagesData.implementation.phase1?.endDate
                        ? format(new Date(stagesData.implementation.phase1.endDate).toISOString().split('T')[0], "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) =>
                      handlePhaseChange(
                        "implementation",
                        "phase1",
                        "endDate",
                        e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                      )
                    }
                  />
                </div>
              </div>
              {renderPhaseRichEditor("phase1")}
            </div>

            {/* Fase 2 */}
            <div className="border rounded-md p-4 bg-muted/10">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Badge variant="outline">Fase 2</Badge>
                Treinamento & Acompanhamento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={stagesData.implementation.phase2?.status || "todo"}
                    onValueChange={(value) =>
                      handlePhaseChange("implementation", "phase2", "status", value)
                    }
                  >
                    <SelectTrigger className={cn(
                      stagesData.implementation.phase2?.status === "done" && "bg-emerald-100 text-emerald-800 border-emerald-200",
                      stagesData.implementation.phase2?.status === "in-progress" && "bg-blue-100 text-blue-800 border-blue-200",
                      stagesData.implementation.phase2?.status === "blocked" && "bg-amber-100 text-amber-800 border-amber-200"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Não Iniciado</SelectItem>
                      <SelectItem value="in-progress">Em Andamento</SelectItem>
                      <SelectItem value="done">Finalizado</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <AutocompleteInput
                    value={stagesData.implementation.phase2?.responsible || ""}
                    onChange={(value) =>
                      handlePhaseChange("implementation", "phase2", "responsible", value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={
                      stagesData.implementation.phase2?.startDate
                        ? format(new Date(stagesData.implementation.phase2.startDate).toISOString().split('T')[0], "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) =>
                      handlePhaseChange(
                        "implementation",
                        "phase2",
                        "startDate",
                        e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Término</Label>
                  <Input
                    type="date"
                    value={
                      stagesData.implementation.phase2?.endDate
                        ? format(new Date(stagesData.implementation.phase2.endDate).toISOString().split('T')[0], "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) =>
                      handlePhaseChange(
                        "implementation",
                        "phase2",
                        "endDate",
                        e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                      )
                    }
                  />
                </div>
              </div>
              {renderPhaseRichEditor("phase2")}
            </div>

          </AccordionContent>
        </AccordionItem>

        {/* 6. Pós-Implantação */}
        <AccordionItem value="post" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">6. Pós-Implantação</span>
              <Badge
                variant={
                  stagesData.post.status === "done" ? "default" : "secondary"
                }
                className={cn(
                  stagesData.post.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  stagesData.post.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  stagesData.post.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {stagesData.post.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("post", stagesData.post)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Satisfação do Cliente</Label>
                <Select
                  value={stagesData.post.clientSatisfaction}
                  onValueChange={(value) =>
                    handleStageChange("post", "clientSatisfaction", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_satisfied">
                      Muito Satisfeito
                    </SelectItem>
                    <SelectItem value="satisfied">Satisfeito</SelectItem>
                    <SelectItem value="neutral">Neutro</SelectItem>
                    <SelectItem value="dissatisfied">Insatisfeito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="followup-needed"
                  checked={stagesData.post.followupNeeded || false}
                  onCheckedChange={(checked) =>
                    handleStageChange("post", "followupNeeded", checked)
                  }
                />
                <Label htmlFor="followup-needed">Follow-up Necessário?</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
