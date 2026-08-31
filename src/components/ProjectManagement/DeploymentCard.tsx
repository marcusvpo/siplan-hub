import { ProjectV2 } from "@/types/ProjectV2";
import { Badge } from "@/components/ui/badge";
import { format, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Monitor, Tag, CheckCircle2, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface DeploymentCardProps {
  project: ProjectV2;
  phaseType?: "phase1" | "phase2";
  onClick?: () => void;
}

export function DeploymentCard({
  project,
  phaseType = "phase1",
  onClick,
}: DeploymentCardProps) {
  const phaseData =
    phaseType === "phase1"
      ? project.stages.implementation.phase1
      : project.stages.implementation.phase2;

  const startDate = phaseData?.startDate;
  const endDate = phaseData?.endDate;
  const isConfirmed = !!phaseData?.isConfirmed;

  const formatDate = (date?: Date) => {
    if (!date) return "--/--";
    return format(new Date(date), "dd MMM", { locale: ptBR }).toUpperCase();
  };

  const getSystemBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("premium"))
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    if (t.includes("enterprise"))
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30";
    return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
  };

  const isInProgress = useMemo(() => {
    if (!startDate || !endDate) return false;
    const now = new Date();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  }, [startDate, endDate]);

  const isNextWeek = useMemo(() => {
    if (!startDate) return false;
    const now = new Date();
    const startOfNextWeekDate = startOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });
    const endOfNextWeekDate = endOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    return start >= startOfNextWeekDate && start <= endOfNextWeekDate;
  }, [startDate]);

  // Responsible person display name
  const responsibleName = phaseData?.responsible || "Não atribuído";
  const responsibleInitials = responsibleName !== "Não atribuído"
    ? responsibleName.substring(0, 2).toUpperCase()
    : "?";

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -5, scale: 1.02 }}
      data-testid="deployment-card"
      className={`group relative flex min-h-[230px] min-w-0 w-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-xl sm:min-h-[250px] ${
        isInProgress
          ? "bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white dark:from-blue-950/40 dark:via-blue-900/20 dark:to-slate-900 border-blue-400 dark:border-blue-600 shadow-blue-100/60 dark:shadow-blue-950/40 ring-1 ring-blue-400 dark:ring-blue-600"
          : isConfirmed
          ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-slate-900 border-emerald-500/40 dark:border-emerald-500/60 shadow-emerald-100/50 dark:shadow-emerald-950/40 ring-1 ring-emerald-500/40 dark:ring-emerald-500/60"
          : isNextWeek
          ? "bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900/50 border-orange-300 dark:border-orange-500/50 shadow-orange-100 dark:shadow-orange-900/20 ring-1 ring-orange-300 dark:ring-orange-500/50"
          : "bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 border-slate-200 dark:border-slate-800"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Decorative Gradient Blob */}
      <div
        className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 ${
          isInProgress
            ? "bg-gradient-to-br from-blue-400/40 to-indigo-600/40"
            : isConfirmed
            ? "bg-gradient-to-br from-emerald-400/40 to-teal-600/40"
            : isNextWeek
            ? "bg-gradient-to-br from-orange-400/40 to-orange-600/40"
            : "bg-gradient-to-br from-slate-400/20 to-slate-600/20"
        }`}
      />

      {/* Header Section */}
      <div className="z-10 flex-shrink-0 p-3.5 pb-2 sm:p-4 sm:pb-2">
        <div className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            {/* Status Tag: Em Andamento vs Implantação Confirmada vs Previsão */}
            <div className="flex flex-wrap items-center gap-1.5">
              {isInProgress ? (
                <Badge
                  className="flex max-w-full items-center gap-1 whitespace-normal break-words border-none bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm animate-pulse hover:bg-blue-700"
                >
                  <PlayCircle className="w-3 h-3" />
                  Em Andamento
                </Badge>
              ) : isConfirmed ? (
                <Badge
                  className="flex max-w-full items-center gap-1 whitespace-normal break-words border-none bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-700"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Implantação Confirmada
                </Badge>
              ) : (
                <Badge
                  className="flex max-w-full items-center gap-1 whitespace-normal break-words border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <Calendar className="w-3 h-3 text-slate-300" />
                  Previsão
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={`${getSystemBadgeColor(
                  project.systemType,
                )} max-w-full truncate backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`}
              >
                {project.systemType}
              </Badge>
            </div>
          </div>

          <div className="flex max-w-full shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-slate-800">
            <Tag className="w-2.5 h-2.5" />
            <span className="truncate">{project.ticketNumber || "N/A"}</span>
          </div>
        </div>

        <h3 className="mb-1 min-h-[40px] break-words bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-base font-bold leading-tight text-transparent line-clamp-2 dark:from-white dark:to-slate-400">
          {project.clientName}
        </h3>
      </div>

      {/* Body Section */}
      <div className="z-10 min-w-0 flex-1 space-y-2 px-3.5 sm:px-4">
        {project.systemType !== "Modelos TN" && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Monitor className="w-3 h-3" />
            </div>
            <span className="min-w-0 break-words font-medium sm:truncate">
              {project.specialty || "Módulo Padrão"}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Clock className="w-3 h-3" />
          </div>
          <span className="font-medium">
            {project.systemType === "Modelos TN"
              ? (project.workHours ? `${project.workHours}h de Trabalho` : "Horas N/A")
              : (project.soldHours ? `${project.soldHours}h Contratadas` : "Horas N/A")}
          </span>
        </div>

        {/* Destaque para o Nome do Responsável pela Implantação */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${
            isInProgress
              ? "bg-blue-600 text-white"
              : isConfirmed
              ? "bg-emerald-600 text-white"
              : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
          }`}>
            {responsibleInitials}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block leading-none mb-0.5">
              Responsável pela Implantação
            </span>
            <span className="block break-words text-xs font-bold text-slate-900 dark:text-white sm:truncate" title={responsibleName}>
              {responsibleName}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Section - Date Highlight */}
      <div className="mt-auto relative">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 to-transparent dark:from-slate-900/10 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between border-t border-slate-100 bg-white/50 px-3.5 py-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 sm:px-4">
          <div className="flex flex-col w-full">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
              Período {phaseType === "phase1" ? "(Fase 1)" : "(Fase 2)"}
            </span>
            <div className={`flex flex-wrap items-center gap-1.5 text-xs font-bold ${
              isInProgress
                ? "text-blue-700 dark:text-blue-400"
                : isConfirmed
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-slate-700 dark:text-slate-300"
            }`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(startDate)}</span>
              <span className="text-slate-400 dark:text-slate-600">→</span>
              <span>{formatDate(endDate)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
