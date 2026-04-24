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

export function ImplementationStageForm({
  stage,
  canEditProjects,
  onUpdatePhase,
}: ImplementationStageFormProps) {

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

  return (
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
                onUpdatePhase("phase1", { status: v as StageStatus })
              }
              disabled={!canEditProjects}
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
              onChange={(v) => onUpdatePhase("phase1", { responsible: v })}
              disabled={!canEditProjects}
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
                onUpdatePhase("phase1", {
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
                stage.phase1?.endDate
                  ? new Date(stage.phase1.endDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                onUpdatePhase("phase1", {
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
              onChange={(c) => onUpdatePhase("phase1", { observations: c })}
              placeholder="Detalhes da fase 1..."
              editable={canEditProjects}
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
                onUpdatePhase("phase2", { status: v as StageStatus })
              }
              disabled={!canEditProjects}
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
              onChange={(v) => onUpdatePhase("phase2", { responsible: v })}
              disabled={!canEditProjects}
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
                onUpdatePhase("phase2", {
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
                stage.phase2?.endDate
                  ? new Date(stage.phase2.endDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                onUpdatePhase("phase2", {
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
              onChange={(c) => onUpdatePhase("phase2", { observations: c })}
              placeholder="Detalhes da fase 2..."
              editable={canEditProjects}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
