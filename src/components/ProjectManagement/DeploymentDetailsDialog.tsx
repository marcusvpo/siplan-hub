import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProjectV2, ImplementationPhase, StageStatus } from "@/types/ProjectV2";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  Users,
  Monitor,
  Clock,
  Tag,
  User,
  ArrowRight,
  CheckCircle2,
  Rocket,
  Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeploymentDetailsDialogProps {
  project: ProjectV2 | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional overrides for reuse in Calendar
  customTitle?: string;
  customDescription?: string;
  customStartDate?: Date; // Accept Date or undefined
  customEndDate?: Date; // Accept Date or undefined
  customResponsible?: string;
}

export function DeploymentDetailsDialog({
  project,
  open,
  onOpenChange,
  customTitle,
  customDescription,
  customStartDate,
  customEndDate,
  customResponsible,
}: DeploymentDetailsDialogProps) {
  const navigate = useNavigate();
  const { updateProject } = useProjectsV2();
  const { canEditProjects } = usePermissions();

  const [status, setStatus] = useState<StageStatus>("todo");
  const [responsible, setResponsible] = useState<string>("");
  const [startDateStr, setStartDateStr] = useState<string>("");
  const [endDateStr, setEndDateStr] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync state when project changes or dialog opens
  useEffect(() => {
    if (project) {
      const phase1 = project.stages?.implementation?.phase1;
      setStatus(phase1?.status || "todo");
      setResponsible(phase1?.responsible || "");
      setStartDateStr(
        phase1?.startDate
          ? format(new Date(phase1.startDate), "yyyy-MM-dd")
          : ""
      );
      setEndDateStr(
        phase1?.endDate
          ? format(new Date(phase1.endDate), "yyyy-MM-dd")
          : ""
      );
      setIsConfirmed(!!phase1?.isConfirmed);
    }
  }, [project, open]);

  if (!project) return null;

  const handleOpenProject = () => {
    navigate(`/projects?id=${project.id}`);
    onOpenChange(false);
  };

  const phase1 = project.stages?.implementation?.phase1;

  const handleUpdatePhase1 = async (updates: {
    status?: StageStatus;
    responsible?: string;
    startDateStr?: string;
    endDateStr?: string;
    isConfirmed?: boolean;
  }) => {
    if (!project) return;

    const newStatus = updates.status !== undefined ? updates.status : status;
    const newResp = updates.responsible !== undefined ? updates.responsible : responsible;
    const newStartStr = updates.startDateStr !== undefined ? updates.startDateStr : startDateStr;
    const newEndStr = updates.endDateStr !== undefined ? updates.endDateStr : endDateStr;
    const newConfirmed = updates.isConfirmed !== undefined ? updates.isConfirmed : isConfirmed;

    // Local UI update
    if (updates.status !== undefined) setStatus(newStatus);
    if (updates.responsible !== undefined) setResponsible(newResp);
    if (updates.startDateStr !== undefined) setStartDateStr(newStartStr);
    if (updates.endDateStr !== undefined) setEndDateStr(newEndStr);
    if (updates.isConfirmed !== undefined) setIsConfirmed(newConfirmed);

    const parsedStart = newStartStr ? new Date(newStartStr + "T12:00:00") : undefined;
    const parsedEnd = newEndStr ? new Date(newEndStr + "T12:00:00") : undefined;

    const currentImpl = project.stages?.implementation || { status: "todo", responsible: "" };
    const currentPhase1 = currentImpl.phase1 || {};

    const updatedPhase1: ImplementationPhase = {
      ...currentPhase1,
      status: newStatus,
      responsible: newResp,
      startDate: parsedStart,
      endDate: parsedEnd,
      isConfirmed: newConfirmed,
    };

    const updatedImplementation = {
      ...currentImpl,
      phase1: updatedPhase1,
      responsible: newResp || currentImpl.responsible,
    };

    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          stages: {
            ...project.stages,
            implementation: updatedImplementation,
          },
        },
      });
      toast.success("Fase 1 (Treinamento & Acompanhamento) atualizada!");
    } catch (err) {
      console.error("Erro ao atualizar Fase 1:", err);
      toast.error("Falha ao salvar alterações da Fase 1");
    } finally {
      setIsSaving(false);
    }
  };

  const getSystemBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("premium"))
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (t.includes("enterprise"))
      return "bg-violet-500/10 text-violet-500 border-violet-500/20";
    return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-5 gap-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {isConfirmed ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border-none shadow-sm flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Implantação Confirmada
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Previsão
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`${getSystemBadgeColor(
                project.systemType,
              )} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider`}
            >
              {project.systemType}
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-medium px-2 py-0.5">
              <Tag className="w-2.5 h-2.5 mr-1" />
              {project.ticketNumber || "N/A"}
            </Badge>
            {isSaving && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold animate-pulse ml-auto">
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando...
              </span>
            )}
          </div>
          <DialogTitle className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            {customTitle || project.clientName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {customDescription || "Detalhes e Ajuste de Cronograma da Implantação"}
          </DialogDescription>
        </DialogHeader>

        {/* Bloco de Edição Estrita: Fase 1 Treinamento & Acompanhamento */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 via-indigo-50/20 to-white dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-slate-900/50 p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/40 pb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Rocket className="h-3 w-3 shrink-0" />
                Fase 1
              </Badge>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Treinamento & Acompanhamento
              </h4>
            </div>

            {/* Implantação Confirmada? Switch */}
            <div
              onClick={() => canEditProjects && handleUpdatePhase1({ isConfirmed: !isConfirmed })}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none",
                isConfirmed
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750"
              )}
            >
              <Switch
                checked={isConfirmed}
                onCheckedChange={(checked) => handleUpdatePhase1({ isConfirmed: checked })}
                disabled={!canEditProjects}
                className="data-[state=checked]:bg-emerald-600"
              />
              <span className="text-xs font-bold flex items-center gap-1">
                {isConfirmed ? (
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
          </div>

          {/* Grid de Campos da Fase 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {/* Status */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => handleUpdatePhase1({ status: v as StageStatus })}
                disabled={!canEditProjects}
              >
                <SelectTrigger className="h-8 text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
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

            {/* Responsável */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="h-3 w-3 text-slate-400" />
                Responsável
              </Label>
              <AutocompleteInput
                value={responsible}
                onChange={(v) => handleUpdatePhase1({ responsible: v })}
                disabled={!canEditProjects}
                placeholder="Selecione o responsável..."
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Início */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-slate-400" />
                Início
              </Label>
              <Input
                type="date"
                value={startDateStr}
                onChange={(e) => handleUpdatePhase1({ startDateStr: e.target.value })}
                disabled={!canEditProjects}
                className="h-8 text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Término */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-slate-400" />
                Término
              </Label>
              <Input
                type="date"
                value={endDateStr}
                onChange={(e) => handleUpdatePhase1({ endDateStr: e.target.value })}
                disabled={!canEditProjects}
                className="h-8 text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Informações Adicionais do Projeto */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-purple-500" />
            Detalhes do Projeto
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left pt-1">
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/40">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                  {project.systemType === "Modelos TN" ? "Horas" : "Carga Horária"}
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                  {project.systemType === "Modelos TN"
                    ? (project.workHours ? `${project.workHours}h` : "N/A")
                    : (project.soldHours ? `${project.soldHours}h` : "N/A")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/40">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                  Especialidade
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                  {project.specialty || "Módulo Padrão"}
                </p>
              </div>
            </div>

            {phase1?.trainingLocation && (
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/40">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                    Localização
                  </p>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                    {phase1.trainingLocation}
                  </p>
                </div>
              </div>
            )}

            {phase1?.participantsCount && (
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/40">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                    Participantes
                  </p>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                    {phase1.participantsCount} pessoas
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleOpenProject}
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 px-3 font-semibold"
          >
            Ver Projeto Completo
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
