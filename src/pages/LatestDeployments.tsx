import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectV2 } from "@/types/ProjectV2";
import { useNavigate } from "react-router-dom";
import { format, subDays, subMonths, isAfter, isBefore, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  History,
  Filter,
  X,
  Calendar as CalendarIcon,
  Server,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  Tag,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function LatestDeployments() {
  const navigate = useNavigate();
  const { projects, isLoading } = useProjectsV2();

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSystem, setFilterSystem] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Extract unique systems from all projects
  const uniqueSystems = useMemo(() => {
    const systems = projects
      .map((p) => p.systemType)
      .filter((s): s is string => Boolean(s));
    return [...new Set(systems)].sort();
  }, [projects]);

  // Helper to extract the strictly defined Phase 1 endDate
  const getDeploymentDate = (p: ProjectV2): Date | null => {
    const dateVal = p.stages.implementation?.phase1?.endDate;
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

  // Base list of deployments that match criteria
  // 1. Implementation is done OR Post-Implementation is in-progress/done
  // 2. Has a valid phase 1 endDate
  const baseDeployments = useMemo(() => {
    return projects.filter((p) => {
      const isFinished = p.stages.implementation?.status === "done";
      const isInPost =
        p.stages.post?.status === "in-progress" || p.stages.post?.status === "done";
      
      if (!isFinished && !isInPost) return false;

      const dDate = getDeploymentDate(p);
      return dDate !== null;
    });
  }, [projects]);

  // Extract list of years that have deployments
  const uniqueYears = useMemo(() => {
    const years = baseDeployments
      .map((p) => getDeploymentDate(p)!.getFullYear().toString())
      .filter(Boolean);
    return [...new Set(years)].sort((a, b) => b.localeCompare(a));
  }, [baseDeployments]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== "" ||
      filterSystem !== "all" ||
      filterPeriod !== "all" ||
      filterYear !== "all" ||
      filterMonth !== "all" ||
      dateRange.from !== undefined ||
      dateRange.to !== undefined
    );
  }, [searchTerm, filterSystem, filterPeriod, filterYear, filterMonth, dateRange]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterSystem("all");
    setFilterPeriod("all");
    setFilterYear("all");
    setFilterMonth("all");
    setDateRange({ from: undefined, to: undefined });
  };

  // Filtered and grouped projects
  const filteredProjects = useMemo(() => {
    return baseDeployments.filter((p) => {
      const dDate = getDeploymentDate(p)!;

      // 1. Search term (Client Name or Ticket Number)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const clientMatches = p.clientName?.toLowerCase().includes(term);
        const ticketMatches = p.ticketNumber?.toLowerCase().includes(term);
        if (!clientMatches && !ticketMatches) return false;
      }

      // 2. System Filter
      if (filterSystem !== "all" && p.systemType !== filterSystem) {
        return false;
      }

      // 3. Year Filter
      if (filterYear !== "all" && dDate.getFullYear().toString() !== filterYear) {
        return false;
      }

      // 4. Month Filter
      if (filterMonth !== "all" && dDate.getMonth().toString() !== filterMonth) {
        return false;
      }

      // 5. Period presets
      if (filterPeriod !== "all") {
        const now = new Date();
        if (filterPeriod === "30days") {
          const limit = subDays(now, 30);
          if (isBefore(dDate, limit)) return false;
        } else if (filterPeriod === "3months") {
          const limit = subMonths(now, 3);
          if (isBefore(dDate, limit)) return false;
        } else if (filterPeriod === "6months") {
          const limit = subMonths(now, 6);
          if (isBefore(dDate, limit)) return false;
        } else if (filterPeriod === "thisyear") {
          const limit = startOfYear(now);
          if (isBefore(dDate, limit)) return false;
        }
      }

      // 6. Custom date range
      if (dateRange.from && isBefore(dDate, dateRange.from)) {
        return false;
      }
      if (dateRange.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        if (isAfter(dDate, endOfDay)) return false;
      }

      return true;
    });
  }, [baseDeployments, searchTerm, filterSystem, filterYear, filterMonth, filterPeriod, dateRange]);

  // Group filtered projects by Month-Year descending
  const groupedDeployments = useMemo(() => {
    const groups: Record<string, { monthName: string; year: number; monthIndex: number; projects: ProjectV2[] }> = {};

    filteredProjects.forEach((p) => {
      const dDate = getDeploymentDate(p)!;
      const year = dDate.getFullYear();
      const monthIndex = dDate.getMonth();
      const key = `${year}-${monthIndex}`;

      if (!groups[key]) {
        const rawMonth = format(dDate, "MMMM", { locale: ptBR });
        const capitalizedMonth = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
        groups[key] = {
          monthName: capitalizedMonth,
          year,
          monthIndex,
          projects: [],
        };
      }
      groups[key].projects.push(p);
    });

    // Sort grouped deployments inside each group: by date descending
    Object.keys(groups).forEach((key) => {
      groups[key].projects.sort((a, b) => {
        const dateA = getDeploymentDate(a)!.getTime();
        const dateB = getDeploymentDate(b)!.getTime();
        return dateB - dateA;
      });
    });

    // Sort groups chronological descending (newer years/months first)
    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.monthIndex - a.monthIndex;
    });
  }, [filteredProjects]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = filteredProjects.length;
    const finalizadas = filteredProjects.filter(
      (p) => p.stages.post?.status === "done" || p.globalStatus === "done"
    ).length;
    const posImplantacao = filteredProjects.filter(
      (p) => p.stages.post?.status === "in-progress"
    ).length;

    // Satisfaction score percentage
    const rated = filteredProjects.filter((p) => p.stages.post?.clientSatisfaction);
    const satisfied = rated.filter(
      (p) =>
        p.stages.post?.clientSatisfaction === "very_satisfied" ||
        p.stages.post?.clientSatisfaction === "satisfied"
    );
    const satisfactionRate = rated.length > 0 ? Math.round((satisfied.length / rated.length) * 100) : null;

    return { total, finalizadas, posImplantacao, satisfactionRate };
  }, [filteredProjects]);

  const handleCardClick = (project: ProjectV2) => {
    navigate(`/projects?id=${project.id}`);
  };

  const getSatisfactionEmoji = (satisfaction: string) => {
    switch (satisfaction) {
      case "very_satisfied":
        return { emoji: "😆", text: "Muito Satisfeito", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" };
      case "satisfied":
        return { emoji: "🙂", text: "Satisfeito", color: "text-green-500 bg-green-50 dark:bg-green-950/20" };
      case "neutral":
        return { emoji: "😐", text: "Neutro", color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20" };
      case "dissatisfied":
        return { emoji: "🙁", text: "Insatisfeito", color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20" };
      default:
        return null;
    }
  };

  const getSystemBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("premium"))
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (t.includes("enterprise"))
      return "bg-violet-500/10 text-violet-500 border-violet-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-4 dark:bg-slate-950 sm:p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            Carregando histórico de implantações...
          </p>
        </div>
      </div>
    );
  }

  const monthsList = [
    { value: "0", label: "Janeiro" },
    { value: "1", label: "Fevereiro" },
    { value: "2", label: "Março" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Maio" },
    { value: "5", label: "Junho" },
    { value: "6", label: "Julho" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" },
    { value: "10", label: "Novembro" },
    { value: "11", label: "Dezembro" },
  ];

  return (
    <div
      className="min-w-0 space-y-3.5 overflow-x-hidden pb-8"
      data-testid="latest-deployments-page"
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-w-0 flex-col items-start justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800 sm:flex-row sm:items-center"
      >
        <div className="min-w-0 space-y-0.5">
          <h1 className="flex min-w-0 items-start gap-1.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white md:text-xl">
            <span className="min-w-0 break-words bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Últimas Implantações
            </span>
            <History className="h-4.5 w-4.5 shrink-0 animate-pulse text-indigo-500" />
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-2xl">
            Histórico cronológico de todos os projetos finalizados ou em pós-implantação.
          </p>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4"
        data-testid="latest-deployments-kpis"
      >
        <Card className="min-w-0 border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex min-w-0 flex-row items-start justify-between gap-1 space-y-0 p-2.5 pb-0.5">
            <CardTitle className="min-w-0 break-words text-[10px] font-bold leading-tight text-slate-500 dark:text-slate-400">Total no Período</CardTitle>
            <Activity className="h-3 w-3 shrink-0 text-blue-500" />
          </CardHeader>
          <CardContent className="p-2.5 pt-0">
            <div className="text-lg font-bold text-slate-900 dark:text-white">{kpis.total}</div>
            <p className="text-[9px] text-slate-400">Implantações mapeadas</p>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex min-w-0 flex-row items-start justify-between gap-1 space-y-0 p-2.5 pb-0.5">
            <CardTitle className="min-w-0 break-words text-[10px] font-bold leading-tight text-slate-500 dark:text-slate-400">Finalizadas</CardTitle>
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-2.5 pt-0">
            <div className="text-lg font-bold text-slate-900 dark:text-white">{kpis.finalizadas}</div>
            <p className="text-[9px] text-slate-400">
              {kpis.total > 0 ? Math.round((kpis.finalizadas / kpis.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex min-w-0 flex-row items-start justify-between gap-1 space-y-0 p-2.5 pb-0.5">
            <CardTitle className="min-w-0 break-words text-[10px] font-bold leading-tight text-slate-500 dark:text-slate-400">Em Pós-Implantação</CardTitle>
            <Clock className="h-3 w-3 shrink-0 text-amber-500" />
          </CardHeader>
          <CardContent className="p-2.5 pt-0">
            <div className="text-lg font-bold text-slate-900 dark:text-white">{kpis.posImplantacao}</div>
            <p className="text-[9px] text-slate-400">Acompanhamento ativo</p>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex min-w-0 flex-row items-start justify-between gap-1 space-y-0 p-2.5 pb-0.5">
            <CardTitle className="min-w-0 break-words text-[10px] font-bold leading-tight text-slate-500 dark:text-slate-400">Satisfação</CardTitle>
            <TrendingUp className="h-3 w-3 shrink-0 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-2.5 pt-0">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {kpis.satisfactionRate !== null ? `${kpis.satisfactionRate}%` : "N/A"}
            </div>
            <p className="text-[9px] text-slate-400">Avaliações Positivas</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Advanced Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid min-w-0 grid-cols-1 items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:p-2"
        data-testid="latest-deployments-filters"
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 min-[420px]:col-span-2 sm:col-span-1 sm:border-r sm:border-slate-200 sm:pr-2 dark:sm:border-slate-700">
          <Filter className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span>Filtros:</span>
        </div>

        {/* Text Search */}
        <div className="relative min-w-0 min-[420px]:col-span-2 sm:col-span-1 sm:min-w-[200px] sm:max-w-xs sm:flex-1">
          <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400 sm:top-2.5" />
          <Input
            placeholder="Buscar por cliente ou chamado..."
            className="h-10 min-w-0 rounded-lg pl-8 text-xs sm:h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar implantações"
          />
        </div>

        {/* System Filter */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Server className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <Select value={filterSystem} onValueChange={setFilterSystem}>
            <SelectTrigger
              className="h-10 min-w-0 flex-1 rounded-lg text-xs sm:h-8 sm:w-[160px] sm:flex-none"
              aria-label="Filtrar por sistema"
            >
              <SelectValue placeholder="Todos os Sistemas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os Sistemas</SelectItem>
              {uniqueSystems.map((system) => (
                <SelectItem key={system} value={system} className="text-xs">
                  {system}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preset Period Filter */}
        <div className="flex min-w-0 items-center gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <Select
            value={filterPeriod}
            onValueChange={(val) => {
              setFilterPeriod(val);
              if (val !== "custom") {
                setDateRange({ from: undefined, to: undefined });
              }
            }}
          >
            <SelectTrigger
              className="h-10 min-w-0 flex-1 rounded-lg text-xs sm:h-8 sm:w-[160px] sm:flex-none"
              aria-label="Filtrar por período"
            >
              <SelectValue placeholder="Qualquer Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Qualquer Período</SelectItem>
              <SelectItem value="30days" className="text-xs">Últimos 30 dias</SelectItem>
              <SelectItem value="3months" className="text-xs">Últimos 3 meses</SelectItem>
              <SelectItem value="6months" className="text-xs">Últimos 6 meses</SelectItem>
              <SelectItem value="thisyear" className="text-xs">Este Ano</SelectItem>
              <SelectItem value="custom" className="text-xs">Período Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Range Picker */}
        {filterPeriod === "custom" && (
          <div className="min-w-0 min-[420px]:col-span-2 sm:col-span-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 w-full min-w-0 justify-start overflow-hidden rounded-lg border-slate-200 px-2.5 text-xs font-normal dark:border-slate-800 sm:h-8 sm:w-auto",
                    !dateRange.from && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 truncate">
                    {dateRange.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      "Selecionar Período"
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-[calc(100vw-1rem)] overflow-x-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    setDateRange({
                      from: range?.from,
                      to: range?.to,
                    });
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Year Filter */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger
              className="h-10 min-w-0 flex-1 rounded-lg text-xs sm:h-8 sm:w-[110px] sm:flex-none"
              aria-label="Filtrar por ano"
            >
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os Anos</SelectItem>
              {uniqueYears.map((year) => (
                <SelectItem key={year} value={year} className="text-xs">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Filter */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger
              className="h-10 min-w-0 flex-1 rounded-lg text-xs sm:h-8 sm:w-[130px] sm:flex-none"
              aria-label="Filtrar por mês"
            >
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os Meses</SelectItem>
              {monthsList.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
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
            className="h-10 w-full rounded-lg px-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 min-[420px]:col-span-2 sm:h-8 sm:w-auto"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </motion.div>

      {/* Timeline Section */}
      {groupedDeployments.length > 0 ? (
        <div className="mx-auto min-w-0 max-w-6xl space-y-4 pb-6" data-testid="latest-deployments-timeline">
          {groupedDeployments.map((group, groupIdx) => (
            <div key={`${group.year}-${group.monthName}`} className="min-w-0 space-y-2">
              {/* Month Group Header */}
              <div className="sticky top-16 z-10 flex min-w-0 items-center gap-2 bg-slate-50/95 py-1 backdrop-blur-sm dark:bg-slate-950/95">
                <h2 className="flex min-w-0 flex-wrap items-baseline gap-1 text-sm font-bold text-slate-800 dark:text-white md:text-base">
                  <span className="break-words">{group.monthName}</span>
                  <span className="shrink-0 text-xs font-medium text-slate-400">{group.year}</span>
                </h2>
                <div className="h-px min-w-2 flex-1 bg-slate-200 dark:bg-slate-800" />
                <Badge variant="secondary" className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  {group.projects.length} {group.projects.length === 1 ? "implantação" : "implantações"}
                </Badge>
              </div>

              {/* Timeline Container */}
              <div className="relative ml-2 min-w-0 space-y-2.5 border-l-2 border-slate-200 pl-4 dark:border-slate-800 sm:ml-3 sm:pl-6">
                {group.projects.map((project, index) => {
                  const deploymentDate = getDeploymentDate(project)!;
                  const isPostActive = project.stages.post?.status === "in-progress";
                  const isPostDone = project.stages.post?.status === "done";
                  
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + groupIdx * 0.1 }}
                      className="group relative min-w-0"
                    >
                      {/* Timeline Node Dot */}
                      <span className={cn(
                        "absolute -left-[23px] top-3.5 flex h-3 w-3 items-center justify-center rounded-full border-2 bg-white ring-4 ring-slate-50 transition-all duration-300 dark:bg-slate-950 dark:ring-slate-950 sm:-left-[31px]",
                        isPostDone || project.globalStatus === "done"
                          ? "border-emerald-500 group-hover:bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                          : isPostActive
                          ? "border-blue-500 group-hover:bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)] animate-pulse"
                          : "border-slate-400 group-hover:bg-slate-400"
                      )} />

                      {/* Deployment Card */}
                      <div
                        onClick={() => handleCardClick(project)}
                        data-testid="latest-deployment-card"
                        className={cn(
                          "group relative flex min-w-0 cursor-pointer flex-col justify-between gap-3 overflow-hidden rounded-lg border bg-white p-3 transition-all duration-300 hover:border-slate-300 hover:shadow-md dark:bg-slate-900 dark:hover:border-slate-700 md:flex-row md:items-start",
                          isPostActive && "border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-white to-blue-50/10 dark:from-slate-900 dark:to-blue-950/5"
                        )}
                      >
                        {/* Hover Gradient Overlay */}
                        <div className="absolute -inset-px rounded-lg bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {/* Left Column: Core Data */}
                        <div className="flex-1 space-y-1.5 min-w-0">
                          {/* Top Badges */}
                          <div className="flex min-w-0 flex-wrap items-center gap-1">
                            <Badge className={cn("max-w-full rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider", getSystemBadgeColor(project.systemType))}>
                              <span className="truncate">{project.systemType}</span>
                            </Badge>
                            
                            {project.implantationType && (
                              <Badge variant="outline" className="max-w-full whitespace-normal break-words px-1 py-0.5 text-[8px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                                {project.implantationType === "new"
                                  ? "Nova Implantação"
                                  : project.implantationType === "migration_siplan"
                                  ? "Migração Siplan"
                                  : project.implantationType === "migration_competitor"
                                  ? "Migração Concorrente"
                                  : project.implantationType === "upgrade"
                                  ? "Upgrade"
                                  : project.implantationType}
                              </Badge>
                            )}

                            <Badge variant="secondary" className="max-w-full rounded-full bg-slate-100 px-1 py-0.5 font-mono text-[8px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <Tag className="mr-1 h-2 w-2 shrink-0" />
                              <span className="truncate">{project.ticketNumber}</span>
                            </Badge>

                            {/* Status Indicators */}
                            {isPostActive && (
                              <Badge className="max-w-full whitespace-normal break-words rounded-full border-none bg-blue-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm hover:bg-blue-600">
                                Em Pós-Implantação
                              </Badge>
                            )}
                            {(isPostDone || project.globalStatus === "done") && (
                              <Badge className="max-w-full whitespace-normal break-words rounded-full border-none bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm hover:bg-emerald-600">
                                Concluído & Finalizado
                              </Badge>
                            )}
                          </div>

                          {/* Client Title */}
                          <div className="min-w-0 space-y-0.5">
                            <h3 className="break-words text-xs font-bold text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 md:text-sm md:truncate">
                              {project.clientName}
                            </h3>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] text-slate-400">
                              <Clock className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                              <span className="break-words">Implantação finalizada em:</span>
                              <span className="break-words font-semibold text-slate-600 dark:text-slate-300">
                                {format(deploymentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>

                          {/* Detail Grid */}
                          <div className="grid min-w-0 grid-cols-1 gap-2 pt-0.5 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                            {project.projectLeader && (
                              <div className="min-w-0">
                                <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">Líder do Projeto</span>
                                <p className="break-words text-[10px] font-semibold text-slate-600 dark:text-slate-300 md:truncate">{project.projectLeader}</p>
                              </div>
                            )}

                            {project.stages.implementation?.responsible && (
                              <div className="min-w-0">
                                <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">Analista Implantação</span>
                                <p className="break-words text-[10px] font-semibold text-slate-600 dark:text-slate-300 md:truncate">{project.stages.implementation.responsible}</p>
                              </div>
                            )}

                            {project.stages.post?.responsible && (
                              <div className="min-w-0">
                                <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">Analista Pós-Implantação</span>
                                <p className="break-words text-[10px] font-semibold text-slate-600 dark:text-slate-300 md:truncate">{project.stages.post.responsible}</p>
                              </div>
                            )}

                            {project.systemType === "Modelos TN" ? (
                              project.workHours && (
                                <div className="min-w-0">
                                  <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">Horas de Trabalho</span>
                                  <p className="break-words text-[10px] font-semibold text-slate-600 dark:text-slate-300 md:truncate">{project.workHours} horas</p>
                                </div>
                              )
                            ) : (
                              project.soldHours && (
                                <div className="min-w-0">
                                  <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">Horas Contratadas</span>
                                  <p className="break-words text-[10px] font-semibold text-slate-600 dark:text-slate-300 md:truncate">{project.soldHours} horas</p>
                                </div>
                              )
                            )}
                          </div>

                          {/* Extra info block: switch details / feedback */}
                          {(project.stages.implementation?.phase1?.switchType || project.stages.post?.clientSatisfaction) && (
                            <div className="mt-0.5 flex min-w-0 flex-wrap gap-2.5 border-t border-slate-100 pt-1 dark:border-slate-800/60">
                              {project.stages.implementation.phase1.switchType && (
                                <div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-slate-400">Tipo Virada:</span>
                                  <span className="min-w-0 break-words font-semibold">{project.stages.implementation.phase1.switchType}</span>
                                </div>
                              )}

                              {project.stages.post?.clientSatisfaction && (
                                <div className="flex min-w-0 flex-wrap items-center gap-1">
                                  <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-slate-400">Satisfação:</span>
                                  {(() => {
                                    const rating = getSatisfactionEmoji(project.stages.post.clientSatisfaction);
                                    if (!rating) return null;
                                    return (
                                      <span className={cn("inline-flex max-w-full items-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-bold", rating.color)}>
                                        <span>{rating.emoji}</span>
                                        <span className="break-words">{rating.text}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Actions & Quick Meta */}
                        <div className="flex min-w-0 flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800/80 md:h-full md:flex-col md:flex-nowrap md:items-end md:justify-center md:border-t-0 md:pt-0">
                          <div className="min-w-0 text-left md:text-right">
                            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Data Virada</span>
                            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              <CalendarIcon className="w-3 h-3 shrink-0" />
                              <span>{format(deploymentDate, "dd/MM/yyyy")}</span>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex h-9 min-w-0 items-center gap-1 rounded-md bg-indigo-50 px-3 text-[10px] font-bold text-indigo-600 transition-transform hover:translate-x-1 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40 md:h-7 md:px-2.5"
                          >
                            <span>Detalhes</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto flex min-w-0 max-w-xl flex-col items-center justify-center space-y-5 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:space-y-6 sm:rounded-3xl sm:py-24"
        >
          <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400">
            <History className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="break-words text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              {hasActiveFilters ? "Nenhum histórico encontrado" : "Nenhum histórico de implantação"}
            </h3>
            <p className="mx-auto max-w-sm break-words text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? "Tente ajustar ou limpar seus filtros para encontrar resultados no histórico de implantações."
                : "Não há projetos concluídos ou em pós-implantação cadastrados no sistema com datas válidas."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="mt-4 h-auto min-h-10 max-w-full whitespace-normal rounded-xl border-slate-200 font-bold dark:border-slate-800">
                <X className="w-4 h-4 mr-2" />
                Limpar Todos os Filtros
              </Button>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
}
