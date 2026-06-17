import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProjectV2 } from "@/types/ProjectV2";
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
} from "lucide-react";

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

  if (!project) return null;

  const handleOpenProject = () => {
    navigate(`/projects?id=${project.id}`);
    onOpenChange(false);
  };

  const phase1 = project.stages.implementation.phase1;
  // Use custom values if provided, otherwise default to Phase 1 data
  const displayStartDate = customStartDate || phase1.startDate;
  const displayEndDate = customEndDate || phase1.endDate;
  const displayResponsible = customResponsible || phase1.responsible;

  const formatDate = (date?: Date) => {
    if (!date) return "--/--/----";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
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
      <DialogContent className="max-w-lg p-4 gap-3">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Badge
              variant="outline"
              className={`${getSystemBadgeColor(
                project.systemType,
              )} px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider`}
            >
              {project.systemType}
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-medium px-1.5 py-0.5">
              <Tag className="w-2.5 h-2.5 mr-1" />
              {project.ticketNumber || "N/A"}
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            {customTitle || project.clientName}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {customDescription || "Detalhes da Implantação - Fase 1"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
          {/* Coluna 1: Datas e Status */}
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Período Agendado
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Início:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {formatDate(displayStartDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Término:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {formatDate(displayEndDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                Responsável
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px] ring-1 ring-white dark:ring-slate-950">
                  {displayResponsible?.substring(0, 2).toUpperCase() || "?"}
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {displayResponsible || "Não definido"}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Informações Adicionais */}
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 h-full">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-purple-500" />
                Detalhes do Projeto
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800/40">
                    <Clock className="w-3 h-3 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      {project.systemType === "Modelos TN" ? "Horas de Trabalho" : "Carga Horária"}
                    </p>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200">
                      {project.systemType === "Modelos TN"
                        ? (project.workHours ? `${project.workHours} horas` : "N/A")
                        : (project.soldHours ? `${project.soldHours} horas` : "N/A")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800/40">
                    <Tag className="w-3 h-3 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      Especialidade
                    </p>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200">
                      {project.specialty || "Módulo Padrão"}
                    </p>
                  </div>
                </div>

                {phase1.trainingLocation && (
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800/40">
                      <MapPin className="w-3 h-3 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                        Localização
                      </p>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200 truncate max-w-[160px]">
                        {phase1.trainingLocation}
                      </p>
                    </div>
                  </div>
                )}

                {phase1.participantsCount && (
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800/40">
                      <Users className="w-3 h-3 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                        Participantes
                      </p>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200">
                        {phase1.participantsCount} pessoas
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-end gap-1.5 pt-2.5 border-t">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleOpenProject}
            size="sm"
            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2.5"
          >
            Ver Projeto Completo
            <ArrowRight className="w-3 h-3" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
