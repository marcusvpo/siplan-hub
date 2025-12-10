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
import { cn } from "@/lib/utils";
import {
    Server,
    CheckCircle2,
    Database,
    RefreshCw,
    Rocket,
    Power,
} from "lucide-react";
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

  const stagesData = data.stages;

  // Render Functions for Specific Fields
  const renderInfraFields = (stage: InfraStageV2) => (
      <>
        <div className="space-y-2">
            <Label>Status Estações</Label>
            <Select
                value={stage.workstationsStatus}
                onValueChange={(v) => updateStage("infra", { workstationsStatus: v as StatusType })}
            >
                <SelectTrigger className={cn(
                    stage.workstationsStatus === "Adequado" && "bg-green-100 text-green-800 border-green-200",
                    stage.workstationsStatus === "Parcialmente Adequado" && "bg-orange-100 text-orange-800 border-orange-200",
                    stage.workstationsStatus === "Inadequado" && "bg-red-100 text-red-800 border-red-200",
                    stage.workstationsStatus === "Aguardando Adequação" && "bg-gray-100 text-gray-800 border-gray-200"
                )}>
                    <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Adequado" className="text-green-600 font-medium">Adequado</SelectItem>
                    <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium">Parcialmente Adequado</SelectItem>
                    <SelectItem value="Inadequado" className="text-red-600 font-medium">Inadequado</SelectItem>
                    <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium">Aguardando Adequação</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label>Status Servidor</Label>
            <Select
                value={stage.serverStatus}
                onValueChange={(v) => updateStage("infra", { serverStatus: v as StatusType })}
            >
                <SelectTrigger className={cn(
                    stage.serverStatus === "Adequado" && "bg-green-100 text-green-800 border-green-200",
                    stage.serverStatus === "Parcialmente Adequado" && "bg-orange-100 text-orange-800 border-orange-200",
                    stage.serverStatus === "Inadequado" && "bg-red-100 text-red-800 border-red-200",
                    stage.serverStatus === "Aguardando Adequação" && "bg-gray-100 text-gray-800 border-gray-200"
                )}>
                    <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Adequado" className="text-green-600 font-medium">Adequado</SelectItem>
                    <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium">Parcialmente Adequado</SelectItem>
                    <SelectItem value="Inadequado" className="text-red-600 font-medium">Inadequado</SelectItem>
                    <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium">Aguardando Adequação</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label>Qtd. de Estações</Label>
            <Input
                type="number"
                value={stage.workstationsCount || ""}
                onChange={(e) => updateStage("infra", { workstationsCount: parseInt(e.target.value) })}
            />
        </div>
      </>
  );

  const renderAdherenceFields = (stage: AdherenceStageV2) => (
      <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
        <div className="flex items-center space-x-2">
            <Checkbox
                id="has-gap"
                checked={stage.hasProductGap || false}
                onCheckedChange={(checked) => updateStage("adherence", { hasProductGap: checked === true })}
            />
            <Label htmlFor="has-gap">Existe Gap de Produto?</Label>
        </div>
        {stage.hasProductGap && (
            <div className="bg-background p-4 rounded-md space-y-4 border">
                <div className="space-y-2">
                    <Label>Descrição do Gap</Label>
                    <Textarea
                        value={stage.gapDescription || ""}
                        onChange={(e) => updateStage("adherence", { gapDescription: e.target.value })}
                    />
                </div>
            </div>
        )}
      </div>
  );

  const renderEnvironmentFields = (stage: EnvironmentStageV2) => (
      <div className="space-y-2">
          <Label>Sistema Operacional</Label>
          <Input
              value={stage.osVersion || ""}
              onChange={(e) => updateStage("environment", { osVersion: e.target.value })}
              placeholder="Ex: Windows Server 2022"
          />
      </div>
  );

  const renderConversionFields = (stage: ConversionStageV2) => (
      <>
        <div className="space-y-2">
            <Label>Status Homologação</Label>
            <Select
                value={stage.homologationStatus}
                onValueChange={(v) => updateStage("conversion", { homologationStatus: v as StatusType })}
            >
                <SelectTrigger className={cn(
                    stage.homologationStatus === "Adequado" && "bg-green-100 text-green-800 border-green-200",
                    stage.homologationStatus === "Parcialmente Adequado" && "bg-orange-100 text-orange-800 border-orange-200",
                    stage.homologationStatus === "Inadequado" && "bg-red-100 text-red-800 border-red-200",
                    stage.homologationStatus === "Aguardando Adequação" && "bg-gray-100 text-gray-800 border-gray-200"
                )}>
                    <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Adequado" className="text-green-600 font-medium">Adequado</SelectItem>
                    <SelectItem value="Parcialmente Adequado" className="text-orange-600 font-medium">Parcialmente Adequado</SelectItem>
                    <SelectItem value="Inadequado" className="text-red-600 font-medium">Inadequado</SelectItem>
                    <SelectItem value="Aguardando Adequação" className="text-gray-600 font-medium">Aguardando Adequação</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label>Responsável Homolog.</Label>
            <AutocompleteInput
                value={stage.homologationResponsible || ""}
                onChange={(v) => updateStage("conversion", { homologationResponsible: v })}
            />
        </div>
        <div className="space-y-2">
            <Label>Enviado em</Label>
            <Input
                type="date"
                value={stage.sentAt ? format(new Date(stage.sentAt).toISOString().split('T')[0], "yyyy-MM-dd") : ""}
                onChange={(e) => updateStage("conversion", { sentAt: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })}
            />
        </div>
        <div className="space-y-2">
            <Label>Finalizado em</Label>
            <Input
                type="date"
                value={stage.finishedAt ? format(new Date(stage.finishedAt).toISOString().split('T')[0], "yyyy-MM-dd") : ""}
                onChange={(e) => updateStage("conversion", { finishedAt: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })}
            />
        </div>
      </>
  );

  // Special handling for Implementation Phases
  const updatePhase = (phase: 'phase1' | 'phase2', updates: Partial<ImplementationPhase>) => {
      const currentImpl = stagesData.implementation;
      const currentPhase = currentImpl[phase] || {};
      const newPhase = { ...currentPhase, ...updates };
      
      const newImpl = {
          ...currentImpl,
          [phase]: newPhase
      };

      // Sync status if phase1
      if (phase === 'phase1' && updates.status) {
          newImpl.status = updates.status as StageStatus; 
      }

      updateStage('implementation', newImpl);
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
          <div className="border rounded-md p-4 bg-muted/10">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="outline">Fase 1</Badge>
                  Implantação Inicial
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={stage.phase1?.status || "todo"} onValueChange={(v) => updatePhase('phase1', { status: v as StageStatus })}>
                          <SelectTrigger className={cn(
                              stage.phase1?.status === "done" && "bg-emerald-100 text-emerald-800 border-emerald-200",
                              stage.phase1?.status === "in-progress" && "bg-blue-100 text-blue-800 border-blue-200",
                              stage.phase1?.status === "blocked" && "bg-amber-100 text-amber-800 border-amber-200"
                          )}><SelectValue /></SelectTrigger>
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
                      <AutocompleteInput value={stage.phase1?.responsible || ""} onChange={(v) => updatePhase('phase1', { responsible: v })} />
                  </div>
                  <div className="space-y-2">
                      <Label>Início</Label>
                      <Input type="date" value={stage.phase1?.startDate ? format(new Date(stage.phase1.startDate).toISOString().split('T')[0], "yyyy-MM-dd") : ""} onChange={(e) => updatePhase('phase1', { startDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })} />
                  </div>
                  <div className="space-y-2">
                      <Label>Término</Label>
                      <Input type="date" value={stage.phase1?.endDate ? format(new Date(stage.phase1.endDate).toISOString().split('T')[0], "yyyy-MM-dd") : ""} onChange={(e) => updatePhase('phase1', { endDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })} />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Editor de Conteúdo</Label>
                  <RichTextEditor 
                      content={getPhaseContent(stage.phase1)} 
                      onChange={(c) => updatePhase('phase1', { observations: c })} 
                      placeholder="Detalhes da fase 1..." 
                  />
              </div>
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
                      <Select value={stage.phase2?.status || "todo"} onValueChange={(v) => updatePhase('phase2', { status: v as StageStatus })}>
                          <SelectTrigger className={cn(
                              stage.phase2?.status === "done" && "bg-emerald-100 text-emerald-800 border-emerald-200",
                              stage.phase2?.status === "in-progress" && "bg-blue-100 text-blue-800 border-blue-200",
                              stage.phase2?.status === "blocked" && "bg-amber-100 text-amber-800 border-amber-200"
                          )}><SelectValue /></SelectTrigger>
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
                      <AutocompleteInput value={stage.phase2?.responsible || ""} onChange={(v) => updatePhase('phase2', { responsible: v })} />
                  </div>
                   <div className="space-y-2">
                      <Label>Início</Label>
                      <Input type="date" value={stage.phase2?.startDate ? format(new Date(stage.phase2.startDate).toISOString().split('T')[0], "yyyy-MM-dd") : ""} onChange={(e) => updatePhase('phase2', { startDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })} />
                  </div>
                  <div className="space-y-2">
                      <Label>Término</Label>
                      <Input type="date" value={stage.phase2?.endDate ? format(new Date(stage.phase2.endDate).toISOString().split('T')[0], "yyyy-MM-dd") : ""} onChange={(e) => updatePhase('phase2', { endDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })} />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Editor de Conteúdo</Label>
                   <RichTextEditor 
                      content={getPhaseContent(stage.phase2)} 
                      onChange={(c) => updatePhase('phase2', { observations: c })} 
                      placeholder="Detalhes da fase 2..." 
                  />
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
            id="environment"
            label="3. Preparação de Ambiente"
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
            id="conversion"
            label="4. Conversão de Dados"
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
            id="implementation"
            label="5. Implantação & Treinamento"
            icon={Rocket}
            status={stagesData.implementation.status}
            responsible={stagesData.implementation.responsible}
            // Implementation dates are usually tracked by phase 1 or 2, but we can keep main dates
            startDate={stagesData.implementation.startDate} 
            endDate={stagesData.implementation.endDate}
            observations={stagesData.implementation.observations}
            onUpdate={(u) => updateStage("implementation", u)}
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
