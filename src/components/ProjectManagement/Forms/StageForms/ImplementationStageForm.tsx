import { ImplementationStageV2, ImplementationPhase, StageStatus } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Rocket, CheckCircle2, Power, GraduationCap } from "lucide-react";
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
      <h4 className="font-bold mb-3 flex items-center gap-2 relative text-left">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-3.5 relative text-left">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-650" />
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
              className="h-9 border border-input bg-background font-medium text-xs text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all duration-200"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo" className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
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
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Rocket className="h-3 w-3 text-muted-foreground" />
            Responsável
          </Label>
          <AutocompleteInput
            value={phase?.responsible || ""}
            onChange={(v) => onUpdatePhase(phaseKey, { responsible: v })}
            disabled={!canEditProjects}
            className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring text-xs"
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
            className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
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
            className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
          />
        </div>
      </div>
      <div className="space-y-2 relative text-left">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 rounded-full bg-slate-300 dark:bg-slate-700" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Observações da {label}
          </Label>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/10 dark:bg-slate-950/5">
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
        badgeClass="bg-slate-500 dark:bg-slate-700"
        titleColor="text-slate-800 dark:text-slate-300"
        borderColor="border-slate-200 dark:border-slate-800"
        bgGradient="bg-slate-50/30 dark:bg-slate-950/10"
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
        badgeClass="bg-slate-500 dark:bg-slate-700"
        titleColor="text-slate-800 dark:text-slate-300"
        borderColor="border-slate-200 dark:border-slate-800"
        bgGradient="bg-slate-50/30 dark:bg-slate-950/10"
        glowColor=""
        themeColor="purple"
      />
    </div>
  );
}
