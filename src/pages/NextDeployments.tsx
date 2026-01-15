import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { DeploymentCard } from "@/components/ProjectManagement/DeploymentCard";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useMemo } from "react";

export default function NextDeployments() {
  const { projects, isLoading } = useProjectsV2();

  const sortedProjects = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return projects
      .filter((p) => {
        const phase1 = p.stages.implementation.phase1;
        if (!phase1?.startDate || !phase1?.endDate) return false;

        const endDate = new Date(phase1.endDate);
        endDate.setHours(0, 0, 0, 0);

        // Show if today is before or equal to the end date
        // If today > endDate, it's past
        return today <= endDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.stages.implementation.phase1.startDate!);
        const dateB = new Date(b.stages.implementation.phase1.startDate!);
        return dateA.getTime() - dateB.getTime();
      });
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            Carregando cronograma...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 space-y-10">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Próximas Implantações
            </span>
            <Rocket className="w-8 h-8 text-indigo-500 animate-pulse" />
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
            Acompanhe a sequência cronológica dos projetos que entram em fase de
            treinamento e acompanhamento.
          </p>
        </div>

        <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm text-sm font-semibold text-slate-600 dark:text-slate-300">
          {sortedProjects.length} Projetos Agendados
        </div>
      </motion.div>

      {/* Cards Grid */}
      {sortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {sortedProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <DeploymentCard project={project} />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800"
        >
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Rocket className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Nenhuma implantação agendada
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Nenhum projeto possui datas definidas para a Fase 1 (Implantação)
              no momento.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
