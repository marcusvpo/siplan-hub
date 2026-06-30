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
import { Rocket, CheckCircle2, Power } from "lucide-react";
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
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16", glowColor)} />
      <h4 className="font-bold mb-3 flex items-center gap-2 relative text-left">
        <Badge className={cn("text-white px-2 py-0.5 text-[10px] shadow-md", badgeClass)}>
          {phaseKey === "phase1" ? "🚀" : "🎓"} {label}
        </Badge>
        <span className={cn("text-base font-bold", titleColor)}>
          {phaseKey === "phase1" ? "Treinamento & Acompanhamento" : "Possível Retorno"}
        </span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-3.5 relative text-left">
        <div className="space-y-1.5">
          <Label className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", 
            themeColor === "blue" ? "text-blue-600" : "text-purple-600"
          )}>
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", 
              themeColor === "blue" ? "bg-blue-500" : "bg-purple-500"
            )} />
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
              className={cn(
                "h-9 border font-medium transition-all text-xs",
                statusColor === "done" && "bg-emerald-50/50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
                statusColor === "in-progress" && (themeColor === "blue" ? "bg-blue-50/50 text-blue-800 border-blue-250 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50" : "bg-purple-50/50 text-purple-800 border-purple-250 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50"),
                statusColor === "blocked" && "bg-amber-50/50 text-amber-800 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-emerald-900/50",
                statusColor === "todo" && "bg-slate-50/50 text-slate-800 border-slate-205 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800/60",
              )}
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
          <Label className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
            themeColor === "blue" ? "text-indigo-600" : "text-pink-600"
          )}>
            <Rocket className="h-3 w-3" />
            Responsável
          </Label>
          <AutocompleteInput
            value={phase?.responsible || ""}
            onChange={(v) => onUpdatePhase(phaseKey, { responsible: v })}
            disabled={!canEditProjects}
            className={cn("h-9 border bg-white dark:bg-slate-950/20 dark:text-slate-300 text-xs",
              themeColor === "blue" ? "border-indigo-200 hover:border-indigo-300 focus:border-indigo-400 dark:border-indigo-900/50 dark:hover:border-indigo-800 dark:focus:border-indigo-750" : "border-pink-200 hover:border-pink-300 focus:border-pink-400 dark:border-pink-900/50 dark:hover:border-pink-800 dark:focus:border-pink-750"
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
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
            className="h-9 border border-cyan-200 hover:border-cyan-300 focus:border-cyan-400 bg-white dark:bg-cyan-950/20 dark:text-cyan-300 dark:border-cyan-900/50 dark:hover:border-cyan-800 font-medium text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-1.5">
            <Power className="h-3 w-3" />
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
            className="h-9 border border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-white dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/50 dark:hover:border-rose-800 font-medium text-xs"
          />
        </div>
      </div>
      <div className="space-y-2 relative text-left">
        <div className="flex items-center gap-2">
          <div className={cn("h-0.5 w-6 rounded-full",
            themeColor === "blue" ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-purple-500 to-pink-500"
          )} />
          <Label className={cn("text-[10px] font-bold uppercase tracking-widest",
            themeColor === "blue" ? "text-blue-600" : "text-purple-600"
          )}>
            Observações da {label}
          </Label>
        </div>
        <div className={cn("rounded-lg border overflow-hidden bg-white dark:bg-slate-900/50",
          themeColor === "blue" ? "border-blue-200 dark:border-blue-900/50" : "border-purple-200 dark:border-purple-900/50"
        )}>
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
        badgeClass="bg-gradient-to-r from-blue-500 to-indigo-600"
        titleColor="text-blue-900 dark:text-blue-300"
        borderColor="border-blue-200 dark:border-blue-900/50"
        bgGradient="bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-blue-950/10 dark:via-indigo-950/10 dark:to-slate-900/10"
        glowColor="from-blue-400/10 to-indigo-400/10"
        themeColor="blue"
      />

      {/* Fase 2 */}
      <ImplementationPhaseForm
        phaseKey="phase2"
        label="Fase 2"
        phase={stage.phase2}
        canEditProjects={canEditProjects}
        onUpdatePhase={onUpdatePhase}
        badgeClass="bg-gradient-to-r from-purple-500 to-pink-600"
        titleColor="text-purple-900 dark:text-purple-300"
        borderColor="border-purple-200 dark:border-purple-900/50"
        bgGradient="bg-gradient-to-br from-purple-50 via-pink-50 to-slate-50 dark:from-purple-950/10 dark:via-pink-950/10 dark:to-slate-900/10"
        glowColor="from-purple-400/10 to-pink-400/10"
        themeColor="purple"
      />
    </div>
  );
}
