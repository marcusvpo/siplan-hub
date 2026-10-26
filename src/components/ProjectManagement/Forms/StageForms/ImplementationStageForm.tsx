import { ImplementationStageV2, ImplementationPhase, StageStatus, Phase1ResponsibleAssignment } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Rocket, CheckCircle2, Power, GraduationCap, Calendar, Plus, Users, User, Trash2 } from "lucide-react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";
import { cn } from "@/lib/utils";

interface ImplementationStageFormProps {
  stage: ImplementationStageV2;
  canEditProjects: boolean;
  onUpdatePhase: (phase: "phase1" | "phase2", updates: Partial<ImplementationPhase>) => void;
}

interface PhaseFormProps {
  phaseKey: "phase1" | "phase2";
  label: string;
  phase: ImplementationPhase | undefined;
  canEditProjects: boolean;
  onUpdatePhase: (phase: "phase1" | "phase2", updates: Partial<ImplementationPhase>) => void;
  badgeClass: string;
  titleColor: string;
  borderColor: string;
  bgGradient: string;
  glowColor: string;
  themeColor: "blue" | "purple";
}

function ImplementationPhaseForm({
  phaseKey,
  label,
  phase,
  canEditProjects,
  onUpdatePhase,
  badgeClass,
  titleColor,
  borderColor,
  bgGradient,
  glowColor,
  themeColor,
}: PhaseFormProps) {
  const additionalResponsibles = phase?.additionalResponsibles || [];

  const handleAddAdditionalResponsible = () => {
    const newItem: Phase1ResponsibleAssignment = {
      id: crypto.randomUUID(),
      responsible: "",
      startDate: phase?.startDate,
      endDate: phase?.endDate,
      role: "Apoio",
    };
    onUpdatePhase(phaseKey, {
      additionalResponsibles: [...additionalResponsibles, newItem],
    });
  };

  const handleUpdateAdditionalResponsible = (
    index: number,
    updates: Partial<Phase1ResponsibleAssignment>
  ) => {
    const nextList = [...additionalResponsibles];
    nextList[index] = { ...nextList[index], ...updates };
    onUpdatePhase(phaseKey, { additionalResponsibles: nextList });
  };

  const handleRemoveAdditionalResponsible = (index: number) => {
    const nextList = additionalResponsibles.filter((_, i) => i !== index);
    onUpdatePhase(phaseKey, { additionalResponsibles: nextList });
  };

  const getPhaseContent = () => {
    if (!phase?.observations) return "";
    try {
      const parsed = JSON.parse(phase.observations);
      if (Array.isArray(parsed)) return convertBlocksToTiptap(parsed);
      return parsed;
    } catch {
      return phase.observations;
    }
  };

  const statusColor = phase?.status || "todo";

  return (
    <div className={cn("relative overflow-hidden rounded-xl border p-4 shadow-sm", borderColor, bgGradient)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="font-bold flex items-center gap-2 relative text-left">
          <Badge className={cn("text-white px-2 py-0.5 text-[10px] shadow-sm font-semibold flex items-center gap-1", badgeClass)}>
            {phaseKey === "phase1" ? (
              <Rocket className="h-3 w-3 shrink-0" />
            ) : (
              <GraduationCap className="h-3 w-3 shrink-0" />
            )}
            <span>{label}</span>
          </Badge>
          <span className={cn("text-base font-bold", titleColor)}>
            {phaseKey === "phase1" ? "Treinamento & Acompanhamento" : "Possível Retorno"}
          </span>
        </h4>

        {phaseKey === "phase1" && (
          <div
            onClick={() => canEditProjects && onUpdatePhase("phase1", { isConfirmed: !phase?.isConfirmed })}
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none",
              phase?.isConfirmed
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70"
            )}
          >
            <Switch
              checked={!!phase?.isConfirmed}
              onCheckedChange={(checked) => onUpdatePhase("phase1", { isConfirmed: checked })}
              disabled={!canEditProjects}
              className="data-[state=checked]:bg-emerald-600"
            />
            <span className="text-xs font-bold flex items-center gap-1">
              {phase?.isConfirmed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Implantação Confirmada
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Implantação Confirmada?
                </>
              )}
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-3.5 relative text-left">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-650" />
            Status
          </Label>
          <Select
            value={phase?.status || "todo"}
            onValueChange={(v) =>
              onUpdatePhase(phaseKey, { status: v as StageStatus })
            }
            disabled={!canEditProjects}
          >
            <SelectTrigger
              className="h-9 border border-input bg-background font-medium text-xs text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-all duration-200"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo" className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-neutral-400" />
                  Não Iniciado
                </div>
              </SelectItem>
              <SelectItem value="in-progress" className="text-xs">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", themeColor === "blue" ? "bg-blue-500" : "bg-purple-500")} />
                  Em Andamento
                </div>
              </SelectItem>
              <SelectItem value="done" className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Finalizado
                </div>
              </SelectItem>
              <SelectItem value="blocked" className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Bloqueado
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Rocket className="h-3 w-3 text-muted-foreground" />
              Responsável {phaseKey === "phase1" ? "Principal" : ""}
            </Label>
            {phaseKey === "phase1" && canEditProjects && (
              <button
                type="button"
                onClick={handleAddAdditionalResponsible}
                title="Adicionar mais um implantador/responsável com datas específicas de atuação"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>+ Implantador</span>
              </button>
            )}
          </div>
          <AutocompleteInput
            value={phase?.responsible || ""}
            onChange={(v) => onUpdatePhase(phaseKey, { responsible: v })}
            disabled={!canEditProjects}
            placeholder={phaseKey === "phase1" ? "Responsável principal..." : "Selecione o responsável..."}
            className="h-9 border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
            Início
          </Label>
          <Input
            type="date"
            value={
              phase?.startDate
                ? new Date(phase.startDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) =>
              onUpdatePhase(phaseKey, {
                startDate: e.target.value
                  ? new Date(e.target.value + "T12:00:00")
                  : undefined,
              })
            }
            disabled={!canEditProjects}
            className="h-9 border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Power className="h-3 w-3 text-muted-foreground" />
            Término
          </Label>
          <Input
            type="date"
            value={
              phase?.endDate
                ? new Date(phase.endDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) =>
              onUpdatePhase(phaseKey, {
                endDate: e.target.value
                  ? new Date(e.target.value + "T12:00:00")
                  : undefined,
              })
            }
            disabled={!canEditProjects}
            className="h-9 border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
          />
        </div>
      </div>

      {/* Implantadores Adicionais / Co-responsáveis com datas próprias */}
      {phaseKey === "phase1" && additionalResponsibles.length > 0 && (
        <div className="mb-3.5 space-y-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Implantadores Adicionais / Apoio ({additionalResponsibles.length})
            </span>
            {canEditProjects && (
              <button
                type="button"
                onClick={handleAddAdditionalResponsible}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Adicionar mais um
              </button>
            )}
          </div>

          <div className="space-y-2">
            {additionalResponsibles.map((assign, index) => (
              <div
                key={assign.id || index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border border-border bg-background p-2.5 shadow-2xs"
              >
                {/* Nome do Implantador de Apoio */}
                <div className="sm:col-span-5 space-y-1">
                  <Label className="text-[9.5px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <User className="h-3 w-3 text-primary" />
                    Implantador de Apoio #{index + 1}
                  </Label>
                  <AutocompleteInput
                    value={assign.responsible || ""}
                    onChange={(val) => handleUpdateAdditionalResponsible(index, { responsible: val })}
                    disabled={!canEditProjects}
                    placeholder="Selecione o implantador..."
                    className="h-8 text-xs bg-background"
                  />
                </div>

                {/* Data Início do Apoio */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[9.5px] font-bold text-muted-foreground uppercase">
                    Início
                  </Label>
                  <Input
                    type="date"
                    value={
                      assign.startDate
                        ? new Date(assign.startDate).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleUpdateAdditionalResponsible(index, {
                        startDate: e.target.value
                          ? new Date(e.target.value + "T12:00:00")
                          : undefined,
                      })
                    }
                    disabled={!canEditProjects}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>

                {/* Data Término do Apoio */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[9.5px] font-bold text-muted-foreground uppercase">
                    Término
                  </Label>
                  <Input
                    type="date"
                    value={
                      assign.endDate
                        ? new Date(assign.endDate).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleUpdateAdditionalResponsible(index, {
                        endDate: e.target.value
                          ? new Date(e.target.value + "T12:00:00")
                          : undefined,
                      })
                    }
                    disabled={!canEditProjects}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>

                {/* Botão Remover */}
                <div className="sm:col-span-1 flex items-end justify-center pt-2 sm:pt-4">
                  {canEditProjects && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAdditionalResponsible(index)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Remover este responsável de apoio"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 relative text-left">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Observações da {label}
          </Label>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50/10 dark:bg-neutral-950/5">
          <RichTextEditor
            content={getPhaseContent()}
            onChange={(c) => onUpdatePhase(phaseKey, { observations: c })}
            placeholder={`Detalhes da ${label.toLowerCase()}...`}
            editable={canEditProjects}
          />
        </div>
      </div>
    </div>
  );
}

export function ImplementationStageForm({
  stage,
  canEditProjects,
  onUpdatePhase,
}: ImplementationStageFormProps) {
  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-6">
      {/* Fase 1 */}
      <ImplementationPhaseForm
        phaseKey="phase1"
        label="Fase 1"
        phase={stage.phase1}
        canEditProjects={canEditProjects}
        onUpdatePhase={onUpdatePhase}
        badgeClass="bg-neutral-500 dark:bg-neutral-700"
        titleColor="text-neutral-800 dark:text-neutral-300"
        borderColor="border-neutral-200 dark:border-neutral-800"
        bgGradient="bg-neutral-50/30 dark:bg-neutral-950/10"
        glowColor=""
        themeColor="blue"
      />

      {/* Fase 2 */}
      <ImplementationPhaseForm
        phaseKey="phase2"
        label="Fase 2"
        phase={stage.phase2}
        canEditProjects={canEditProjects}
        onUpdatePhase={onUpdatePhase}
        badgeClass="bg-neutral-500 dark:bg-neutral-700"
        titleColor="text-neutral-800 dark:text-neutral-300"
        borderColor="border-neutral-200 dark:border-neutral-800"
        bgGradient="bg-neutral-50/30 dark:bg-neutral-950/10"
        glowColor=""
        themeColor="purple"
      />
    </div>
  );
}
