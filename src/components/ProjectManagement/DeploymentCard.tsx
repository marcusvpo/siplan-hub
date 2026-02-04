import { ProjectV2 } from "@/types/ProjectV2";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Monitor, Tag } from "lucide-react";
import { motion } from "framer-motion";

interface DeploymentCardProps {
  project: ProjectV2;
  onClick?: () => void;
}

export function DeploymentCard({ project, onClick }: DeploymentCardProps) {
  const phase1 = project.stages.implementation.phase1;
  const startDate = phase1?.startDate;
  const endDate = phase1?.endDate;

  const formatDate = (date?: Date) => {
    if (!date) return "--/--";
    return format(date, "dd MMM", { locale: ptBR }).toUpperCase();
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
    <motion.div
      onClick={onClick}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`group relative w-full h-[220px] rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Decorative Gradient Blob - Reduced size */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />

      {/* Header Section */}
      <div className="p-4 pb-2 z-10">
        <div className="flex justify-between items-start mb-2">
          <Badge
            variant="outline"
            className={`${getSystemBadgeColor(
              project.systemType,
            )} backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`}
          >
            {project.systemType}
          </Badge>
          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            <Tag className="w-2.5 h-2.5" />
            {project.ticketNumber || "N/A"}
          </div>
        </div>

        <h3 className="text-base font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent line-clamp-2 min-h-[40px] leading-tight mb-1">
          {project.clientName}
        </h3>
      </div>

      {/* Body Section */}
      <div className="px-4 space-y-2 z-10 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Monitor className="w-3 h-3" />
          </div>
          <span className="font-medium truncate">
            {project.specialty || "Módulo Padrão"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Clock className="w-3 h-3" />
          </div>
          <span className="font-medium">
            {project.soldHours
              ? `${project.soldHours}h Contratadas`
              : "Horas N/A"}
          </span>
        </div>
      </div>

      {/* Footer Section - Date Highlight */}
      <div className="mt-auto relative">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-50/80 to-transparent dark:from-blue-900/10 pointer-events-none" />
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between z-10 relative bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
              Fase 1
            </span>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(startDate)}</span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span>{formatDate(endDate)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
              Resp.
            </span>
            <div className="flex -space-x-2">
              {/* Avatar placeholder or initials */}
              <div
                className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300"
                title={phase1?.responsible}
              >
                {phase1?.responsible?.substring(0, 2).toUpperCase() || "?"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
