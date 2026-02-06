import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { DeploymentCard } from "@/components/ProjectManagement/DeploymentCard";
import { motion } from "framer-motion";
import { Rocket, Filter, X, User, Server } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { DeploymentDetailsDialog } from "@/components/ProjectManagement/DeploymentDetailsDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NextDeployments() {
  const { projects, isLoading } = useProjectsV2();
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(
    null,
  );

  // Filter states
  const [filterDeployer, setFilterDeployer] = useState<string>("all");
  const [filterSystem, setFilterSystem] = useState<string>("all");

  // Extract unique deployers from phase1 responsible
  const uniqueDeployers = useMemo(() => {
    const deployers = projects
      .map((p) => p.stages.implementation.phase1?.responsible)
      .filter((r): r is string => Boolean(r));
    return [...new Set(deployers)].sort();
  }, [projects]);

  // Extract unique system types
  const uniqueSystems = useMemo(() => {
    const systems = projects
      .map((p) => p.systemType)
      .filter((s): s is string => Boolean(s));
    return [...new Set(systems)].sort();
  }, [projects]);

  // Check if any filters are active
  const hasActiveFilters = filterDeployer !== "all" || filterSystem !== "all";

  const clearFilters = () => {
    setFilterDeployer("all");
    setFilterSystem("all");
  };

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
        if (today > endDate) return false;

        // Apply deployer filter
        if (filterDeployer !== "all" && phase1.responsible !== filterDeployer) {
          return false;
        }

        // Apply system filter
        if (filterSystem !== "all" && p.systemType !== filterSystem) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.stages.implementation.phase1.startDate!);
        const dateB = new Date(b.stages.implementation.phase1.startDate!);
        return dateA.getTime() - dateB.getTime();
      });
  }, [projects, filterDeployer, filterSystem]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 space-y-8">
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

      {/* Advanced Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Filter className="w-4 h-4" />
          <span>Filtros Avançados:</span>
        </div>

        {/* Deployer Filter */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <Select value={filterDeployer} onValueChange={setFilterDeployer}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Todos os Implantadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Implantadores</SelectItem>
              {uniqueDeployers.map((deployer) => (
                <SelectItem key={deployer} value={deployer}>
                  {deployer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Filter */}
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-400" />
          <Select value={filterSystem} onValueChange={setFilterSystem}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Todos os Sistemas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Sistemas</SelectItem>
              {uniqueSystems.map((system) => (
                <SelectItem key={system} value={system}>
                  {system}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar Filtros
          </Button>
        )}

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 ml-auto">
            {filterDeployer !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <User className="w-3 h-3" />
                {filterDeployer}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500"
                  onClick={() => setFilterDeployer("all")}
                />
              </Badge>
            )}
            {filterSystem !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <Server className="w-3 h-3" />
                {filterSystem}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500"
                  onClick={() => setFilterSystem("all")}
                />
              </Badge>
            )}
          </div>
        )}
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
              <DeploymentCard
                project={project}
                onClick={() => setSelectedProject(project)}
              />
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
              {hasActiveFilters
                ? "Nenhum resultado para os filtros selecionados"
                : "Nenhuma implantação agendada"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {hasActiveFilters
                ? "Tente ajustar ou limpar os filtros para ver mais resultados."
                : "Nenhum projeto possui datas definidas para a Fase 1 (Implantação) no momento."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Details Dialog */}
      <DeploymentDetailsDialog
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      />
    </div>
  );
}
