import { useState } from "react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { GlobalMetrics } from "@/components/Reports/GlobalMetrics";
import { TimePerStageChart } from "@/components/Reports/TimePerStageChart";
import { StatusDistribution } from "@/components/Reports/StatusDistribution";
import { HealthDistribution } from "@/components/Reports/HealthDistribution";
import { AdherenceGapCard } from "@/components/Reports/AdherenceGapCard";
import { ReportsFilters } from "@/components/Reports/ReportsFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndividualProjectReport } from "@/components/Reports/Individual/IndividualProjectReport";
import { ImplementerReportTab } from "@/components/Reports/Implementers/ImplementerReportTab";
import { Loader2, LayoutDashboard, Search, Users } from "lucide-react";

export default function Reports() {
  const { projects, isLoading } = useProjectsV2();
  const [systemFilter, setSystemFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Extract unique systems from actual projects (dynamic filter, excluding Modelos TN)
  const projectsWithoutModelosTN = projects.filter((p) => p.systemType !== "Modelos TN");
  const systems = Array.from(
    new Set(projectsWithoutModelosTN.map((p) => p.systemType).filter(Boolean))
  ).sort();

  // Apply filters
  const filteredProjects = projectsWithoutModelosTN.filter((project) => {
    const matchesSystem =
      systemFilter === "all" || project.systemType === systemFilter;

    let matchesDate = true;
    if (dateFilter) {
      const projectDate = new Date(project.createdAt);
      // Simple check: project created after or on the selected date
      matchesDate = projectDate >= dateFilter;
    }

    return matchesSystem && matchesDate;
  });

  return (
    <div
      className="min-h-[calc(100vh-80px)] min-w-0 space-y-3.5 overflow-x-hidden pb-6 animate-in fade-in zoom-in-95 duration-700"
      data-testid="reports-page"
    >
      <Tabs
        defaultValue="overview"
        className="min-w-0 space-y-4"
        onValueChange={setActiveTab}
      >
        <div className="flex min-w-0 flex-col justify-between gap-3 border-b border-border pb-3 md:flex-row md:items-end">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="h-3.5 w-0.75 bg-primary rounded-full" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/70">Intelligence Engine</span>
            </div>
            <h2 className="text-lg md:text-xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Relatórios & Análises
            </h2>
            <p className="text-[10px] text-muted-foreground font-medium max-w-md">
              Métricas de performance, tendências de saúde e distribuição de carga em tempo real.
            </p>
          </div>

          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 self-start overflow-x-hidden rounded-lg border border-border bg-muted/50 p-1 shadow-sm backdrop-blur-md sm:flex sm:h-9 sm:w-auto sm:gap-0 sm:overflow-x-auto sm:p-0.5 md:self-center">
            <TabsTrigger 
              value="overview" 
              className="h-10 min-w-0 gap-1 px-1 py-1 text-[10px] font-bold uppercase tracking-wide transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-8 sm:gap-1.5 sm:px-3 sm:tracking-wider"
            >
              <LayoutDashboard className="h-3 w-3" />
              <span className="sm:hidden">Geral</span>
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger 
              value="individual" 
              className="h-10 min-w-0 gap-1 px-1 py-1 text-[10px] font-bold uppercase tracking-wide transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-8 sm:gap-1.5 sm:px-3 sm:tracking-wider"
            >
              <Search className="h-3 w-3" />
              <span className="sm:hidden">Individual</span>
              <span className="hidden sm:inline">Análise Individual</span>
            </TabsTrigger>
            <TabsTrigger 
              value="implementers" 
              className="h-10 min-w-0 gap-1 px-1 py-1 text-[10px] font-bold uppercase tracking-wide transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm sm:h-8 sm:gap-1.5 sm:px-3 sm:tracking-wider"
            >
              <Users className="h-3 w-3" />
              <span className="sm:hidden">Equipe</span>
              <span className="hidden sm:inline">Implantadores</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="m-0 min-w-0 space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="bg-card/40 backdrop-blur-sm p-1.5 rounded-lg border border-border shadow-sm transition-all hover:bg-card/50">
            <ReportsFilters
              onSystemChange={setSystemFilter}
              onDateChange={setDateFilter}
              systems={systems}
            />
          </div>

          <GlobalMetrics projects={filteredProjects} />

          {/* Status and Health Distribution Cards */}
          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            <StatusDistribution projects={filteredProjects} />
            <HealthDistribution projects={filteredProjects} />
            <AdherenceGapCard projects={filteredProjects} />
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 transition-all hover:scale-[1.01]">
              <TimePerStageChart projects={filteredProjects} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="m-0 min-w-0 animate-in fade-in slide-in-from-right-4 duration-500">
          <IndividualProjectReport projects={projectsWithoutModelosTN} />
        </TabsContent>

        <TabsContent value="implementers" className="m-0 min-w-0 animate-in fade-in slide-in-from-right-4 duration-500">
          <ImplementerReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
