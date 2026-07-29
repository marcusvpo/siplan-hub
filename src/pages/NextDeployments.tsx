import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { DeploymentCard } from "@/components/ProjectManagement/DeploymentCard";
import { motion } from "framer-motion";
import {
  Rocket,
  Filter,
  X,
  User,
  Server,
  LayoutGrid,
  CalendarDays,
  CheckCircle2,
  Calendar as CalendarIcon,
} from "lucide-react";
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
import { startOfWeek, endOfWeek, addWeeks, format, getISOWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeploymentItem {
  project: ProjectV2;
  phase: "phase1" | "phase2";
  startDate: Date;
  endDate: Date;
  isConfirmed: boolean;
}

export default function NextDeployments() {
  const { projects, isLoading } = useProjectsV2();
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(
    null,
  );

  // View state: weekly timeline vs standard grid
  const [viewMode, setViewMode] = useState<"weekly" | "grid">("weekly");

  // Filter states
  const [filterDeployer, setFilterDeployer] = useState<string>("all");
  const [filterSystem, setFilterSystem] = useState<string>("all");

  // Extract unique deployers from phase1 and phase2 responsible
  const uniqueDeployers = useMemo(() => {
    const deployers = new Set<string>();
    projects.forEach((p) => {
      if (p.stages.implementation.phase1?.responsible) {
        deployers.add(p.stages.implementation.phase1.responsible);
      }
      if (p.stages.implementation.phase2?.responsible) {
        deployers.add(p.stages.implementation.phase2.responsible);
      }
    });
    return Array.from(deployers).sort();
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

  const sortedDeployments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deployments: DeploymentItem[] = [];

    projects.forEach((p) => {
      // Check Phase 1
      const phase1 = p.stages.implementation.phase1;
      if (phase1?.startDate && phase1?.endDate) {
        const endDate = new Date(phase1.endDate);
        endDate.setHours(0, 0, 0, 0);

        const matchesDeployer =
          filterDeployer === "all" || phase1.responsible === filterDeployer;
        const matchesSystem =
          filterSystem === "all" || p.systemType === filterSystem;

        if (endDate >= today && matchesDeployer && matchesSystem) {
          deployments.push({
            project: p,
            phase: "phase1",
            startDate: new Date(phase1.startDate),
            endDate: new Date(phase1.endDate),
            isConfirmed: !!phase1.isConfirmed,
          });
        }
      }

      // Check Phase 2
      const phase2 = p.stages.implementation.phase2;
      if (phase2?.startDate && phase2?.endDate) {
        const endDate = new Date(phase2.endDate);
        endDate.setHours(0, 0, 0, 0);

        const matchesDeployer =
          filterDeployer === "all" || phase2.responsible === filterDeployer;
        const matchesSystem =
          filterSystem === "all" || p.systemType === filterSystem;

        if (endDate >= today && matchesDeployer && matchesSystem) {
          deployments.push({
            project: p,
            phase: "phase2",
            startDate: new Date(phase2.startDate),
            endDate: new Date(phase2.endDate),
            isConfirmed: !!phase2.isConfirmed,
          });
        }
      }
    });

    return deployments.sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime(),
    );
  }, [projects, filterDeployer, filterSystem]);

  // Totals for confirmed vs prediction
  const confirmedTotal = useMemo(
    () => sortedDeployments.filter((d) => d.isConfirmed).length,
    [sortedDeployments],
  );
  const forecastTotal = useMemo(
    () => sortedDeployments.filter((d) => !d.isConfirmed).length,
    [sortedDeployments],
  );

  // Group deployments by active/upcoming week (starts from Current Week, no past weeks, no duplicates)
  const weeklyGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        weekKey: string;
        weekNumber: number;
        startDate: Date;
        endDate: Date;
        deployments: DeploymentItem[];
        isCurrentWeek: boolean;
        isNextWeek: boolean;
        confirmedCount: number;
        forecastCount: number;
      }
    >();

    const now = new Date();
    const currentWeekStart = startOfWeek(now, { locale: ptBR, weekStartsOn: 1 });
    currentWeekStart.setHours(0, 0, 0, 0);

    const nextWeekStart = startOfWeek(addWeeks(now, 1), {
      locale: ptBR,
      weekStartsOn: 1,
    });
    nextWeekStart.setHours(0, 0, 0, 0);

    sortedDeployments.forEach((d) => {
      const dStartW = startOfWeek(d.startDate, {
        locale: ptBR,
        weekStartsOn: 1,
      });
      dStartW.setHours(0, 0, 0, 0);

      // If deployment started before the current week, but is still active today,
      // it belongs to Semana Atual (currentWeekStart) so we never render past weeks!
      let targetWeekStart = dStartW;
      if (dStartW < currentWeekStart) {
        targetWeekStart = currentWeekStart;
      }

      const key = targetWeekStart.toISOString();
      const targetWeekEnd = endOfWeek(targetWeekStart, { locale: ptBR, weekStartsOn: 1 });
      targetWeekEnd.setHours(23, 59, 59, 999);

      if (!groupsMap.has(key)) {
        const isCurrent = targetWeekStart.getTime() === currentWeekStart.getTime();
        const isNext = targetWeekStart.getTime() === nextWeekStart.getTime();
        groupsMap.set(key, {
          weekKey: key,
          weekNumber: getISOWeek(targetWeekStart),
          startDate: new Date(targetWeekStart),
          endDate: targetWeekEnd,
          deployments: [],
          isCurrentWeek: isCurrent,
          isNextWeek: isNext,
          confirmedCount: 0,
          forecastCount: 0,
        });
      }

      const group = groupsMap.get(key)!;
      group.deployments.push(d);
      if (d.isConfirmed) {
        group.confirmedCount++;
      } else {
        group.forecastCount++;
      }
    });

    return Array.from(groupsMap.values()).sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime(),
    );
  }, [sortedDeployments]);

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
    <div className="space-y-5 pb-10">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-3 border-b border-slate-200 dark:border-slate-800"
      >
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Próximas Implantações
            </span>
            <Rocket className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Acompanhe o cronograma semanal das implantações confirmadas e previstas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Summary Badges */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
            <span className="text-slate-600 dark:text-slate-300">
              {sortedDeployments.length} Agendadas
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {confirmedTotal} Confirmadas
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3 text-slate-400" />
              {forecastTotal} Previsões
            </span>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Button
              variant={viewMode === "weekly" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("weekly")}
              className={`h-7 px-2.5 text-xs font-bold gap-1.5 rounded-md ${
                viewMode === "weekly"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Por Semana</span>
            </Button>

            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`h-7 px-2.5 text-xs font-bold gap-1.5 rounded-md ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Advanced Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 p-2.5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros Avançados:</span>
        </div>

        {/* Deployer Filter */}
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <Select value={filterDeployer} onValueChange={setFilterDeployer}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Todos os Implantadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os Implantadores
              </SelectItem>
              {uniqueDeployers.map((deployer) => (
                <SelectItem key={deployer} value={deployer} className="text-xs">
                  {deployer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Filter */}
        <div className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <Select value={filterSystem} onValueChange={setFilterSystem}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Todos os Sistemas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os Sistemas
              </SelectItem>
              {uniqueSystems.map((system) => (
                <SelectItem key={system} value={system} className="text-xs">
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
            className="h-8 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpar Filtros
          </Button>
        )}

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 ml-auto">
            {filterDeployer !== "all" && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <User className="w-2.5 h-2.5" />
                {filterDeployer}
                <X
                  className="w-2.5 h-2.5 ml-1 cursor-pointer hover:text-red-500"
                  onClick={() => setFilterDeployer("all")}
                />
              </Badge>
            )}
            {filterSystem !== "all" && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Server className="w-2.5 h-2.5" />
                {filterSystem}
                <X
                  className="w-2.5 h-2.5 ml-1 cursor-pointer hover:text-red-500"
                  onClick={() => setFilterSystem("all")}
                />
              </Badge>
            )}
          </div>
        )}
      </motion.div>

      {/* Main Content Area */}
      {sortedDeployments.length > 0 ? (
        viewMode === "weekly" ? (
          /* Visualização da Timeline por Semana */
          <div className="space-y-6">
            {weeklyGroups.map((group, groupIdx) => (
              <motion.div
                key={group.weekKey}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIdx * 0.05 }}
                className={`rounded-2xl border p-4 transition-all ${
                  group.isCurrentWeek
                    ? "bg-blue-500/5 border-blue-300 dark:border-blue-700/50 shadow-sm"
                    : group.isNextWeek
                    ? "bg-orange-500/5 border-orange-300 dark:border-orange-700/50 shadow-sm"
                    : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* Week Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${
                        group.isCurrentWeek
                          ? "bg-blue-600 text-white"
                          : group.isNextWeek
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      S{group.weekNumber}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>
                          Semana {group.weekNumber} •{" "}
                          {format(group.startDate, "dd 'de' MMM", {
                            locale: ptBR,
                          })}{" "}
                          a{" "}
                          {format(group.endDate, "dd 'de' MMM", {
                            locale: ptBR,
                          })}
                        </span>

                        {group.isCurrentWeek && (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] uppercase font-extrabold px-2 py-0.5">
                            Semana Atual
                          </Badge>
                        )}
                        {group.isNextWeek && (
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] uppercase font-extrabold px-2 py-0.5">
                            Próxima Semana
                          </Badge>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {group.deployments.length}{" "}
                        {group.deployments.length === 1
                          ? "implantação nesta semana"
                          : "implantações nesta semana"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold self-end sm:self-center">
                    {group.confirmedCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {group.confirmedCount} Confirmada
                        {group.confirmedCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {group.forecastCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center gap-1 font-medium">
                        <CalendarIcon className="w-3 h-3 text-slate-400" />
                        {group.forecastCount} Previsão
                        {group.forecastCount > 1 ? "ões" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards for this Week */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {group.deployments.map((deployment, index) => (
                    <motion.div
                      key={`${deployment.project.id}-${deployment.phase}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <DeploymentCard
                        project={deployment.project}
                        phaseType={deployment.phase}
                        onClick={() => setSelectedProject(deployment.project)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Visualização Tradicional em Grade */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {sortedDeployments.map((deployment, index) => (
              <motion.div
                key={`${deployment.project.id}-${deployment.phase}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <DeploymentCard
                  project={deployment.project}
                  phaseType={deployment.phase}
                  onClick={() => setSelectedProject(deployment.project)}
                />
              </motion.div>
            ))}
          </div>
        )
      ) : (
        /* Empty State */
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
                : "Nenhum projeto possui datas definidas para Implantação (Fase 1) ou Treinamento (Fase 2) no momento."}
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
