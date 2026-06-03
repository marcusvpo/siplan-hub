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
    <div className={cn("relative overflow-hidden rounded-xl border-2 p-5 shadow-sm", borderColor, bgGradient)}>
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16", glowColor)} />
      <h4 className="font-bold mb-5 flex items-center gap-3 relative text-left">
        <Badge className={cn("text-white px-3 py-1 shadow-md", badgeClass)}>
          {phaseKey === "phase1" ? "🚀" : "🎓"} {label}
        </Badge>
        <span className={cn("text-lg font-bold", titleColor)}>
          {phaseKey === "phase1" ? "Treinamento & Acompanhamento" : "Possível Retorno"}
        </span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 relative text-left">
        <div className="space-y-2.5">
          <Label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", 
            themeColor === "blue" ? "text-blue-600" : "text-purple-600"
          )}>
            <div className={cn("h-2 w-2 rounded-full animate-pulse", 
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
                "h-11 border-2 font-medium transition-all",
                statusColor === "done" && "bg-emerald-50 text-emerald-800 border-emerald-300",
                statusColor === "in-progress" && (themeColor === "blue" ? "bg-blue-50 text-blue-800 border-blue-300" : "bg-purple-50 text-purple-800 border-purple-300"),
                statusColor === "blocked" && "bg-amber-50 text-amber-800 border-amber-300",
                statusColor === "todo" && "bg-slate-50 text-slate-800 border-slate-300",
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
                  <div className={cn("h-2.5 w-2.5 rounded-full", themeColor === "blue" ? "bg-blue-500" : "bg-purple-500")} />
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
          <Label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2",
            themeColor === "blue" ? "text-indigo-600" : "text-pink-600"
          )}>
            <Rocket className="h-3.5 w-3.5" />
            Responsável
          </Label>
          <AutocompleteInput
            value={phase?.responsible || ""}
            onChange={(v) => onUpdatePhase(phaseKey, { responsible: v })}
            disabled={!canEditProjects}
            className={cn("h-11 border-2 bg-white",
              themeColor === "blue" ? "border-indigo-200 hover:border-indigo-300 focus:border-indigo-400" : "border-pink-200 hover:border-pink-300 focus:border-pink-400"
            )}
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
            className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-white font-medium"
          />
        </div>
      </div>
      <div className="space-y-3 relative text-left">
        <div className="flex items-center gap-3">
          <div className={cn("h-1 w-8 rounded-full",
            themeColor === "blue" ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-purple-500 to-pink-500"
          )} />
          <Label className={cn("text-xs font-bold uppercase tracking-widest",
            themeColor === "blue" ? "text-blue-600" : "text-purple-600"
          )}>
            Observações da {label}
          </Label>
        </div>
        <div className={cn("rounded-xl border-2 overflow-hidden bg-white",
          themeColor === "blue" ? "border-blue-200" : "border-purple-200"
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
        titleColor="text-blue-900"
        borderColor="border-blue-200"
        bgGradient="from-blue-50 via-indigo-50 to-slate-50"
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
        titleColor="text-purple-900"
        borderColor="border-purple-200"
        bgGradient="from-purple-50 via-pink-50 to-slate-50"
        glowColor="from-purple-400/10 to-pink-400/10"
        themeColor="purple"
      />
    </div>
  );
}
