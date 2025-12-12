import { ProjectV2 } from "@/types/ProjectV2";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Monitor, Tag } from "lucide-react";
import { motion } from "framer-motion";

interface DeploymentCardProps {
  project: ProjectV2;
}

export function DeploymentCard({ project }: DeploymentCardProps) {
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
      whileHover={{ y: -5, scale: 1.02 }}
      className="group relative w-full h-[280px] rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Decorative Gradient Blob */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />

      {/* Header Section */}
      <div className="p-6 pb-4 z-10">
        <div className="flex justify-between items-start mb-4">
          <Badge
            variant="outline"
            className={`${getSystemBadgeColor(
              project.systemType
            )} backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-wider`}
          >
            {project.systemType}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            <Tag className="w-3 h-3" />
            {project.ticketNumber || "N/A"}
          </div>
        </div>

        <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent line-clamp-2 min-h-[56px] leading-tight">
          {project.clientName}
        </h3>
      </div>

      {/* Body Section */}
      <div className="px-6 space-y-3 z-10 flex-1">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Monitor className="w-4 h-4" />
          </div>
          <span className="font-medium truncate">
            {project.specialty || "Módulo Padrão"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
          <span className="font-medium">
            {project.soldHours
              ? `${project.soldHours} Horas Contratadas`
              : "Horas não informadas"}
          </span>
        </div>
      </div>

      {/* Footer Section - Date Highlight */}
      <div className="mt-auto relative">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-50/80 to-transparent dark:from-blue-900/10 pointer-events-none" />
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between z-10 relative bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
              Fase 1
            </span>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(startDate)}</span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span>{formatDate(endDate)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
              Responsável
            </span>
            <div className="flex -space-x-2">
              {/* Avatar placeholder or initials */}
              <div
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300"
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
