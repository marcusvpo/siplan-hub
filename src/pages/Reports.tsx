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
import { Loader2, LayoutDashboard, Search } from "lucide-react";

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

  // Extract unique systems from actual projects (dynamic filter)
  const systems = Array.from(
    new Set(projects.map((p) => p.systemType).filter(Boolean))
  ).sort();

  // Apply filters
  const filteredProjects = projects.filter((project) => {
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
    <div className="min-h-[calc(100vh-80px)] space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-10">
      {/* Decorative background element */}
      <div className="fixed inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 -z-10" />

      <Tabs
        defaultValue="overview"
        className="space-y-8"
        onValueChange={setActiveTab}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-primary/10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Intelligence Engine</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Relatórios & Análises
            </h2>
            <p className="text-sm text-muted-foreground font-medium max-w-md">
              Métricas de performance, tendências de saúde e distribuição de carga em tempo real.
            </p>
          </div>

          <TabsList className="bg-muted/50 backdrop-blur-md p-1 border border-primary/5 rounded-xl shadow-sm self-start md:self-center">
            <TabsTrigger 
              value="overview" 
              className="gap-2 px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="individual" 
              className="gap-2 px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              <Search className="h-3.5 w-3.5" />
              Análise Individual
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8 m-0 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="bg-card/40 backdrop-blur-sm p-5 rounded-2xl border border-primary/10 shadow-sm transition-all hover:bg-card/60">
            <ReportsFilters
              onSystemChange={setSystemFilter}
              onDateChange={setDateFilter}
              systems={systems}
            />
          </div>

          <GlobalMetrics projects={filteredProjects} />

          {/* Status and Health Distribution Cards */}
          <div className="grid gap-8 md:grid-cols-3">
            <StatusDistribution projects={filteredProjects} />
            <HealthDistribution projects={filteredProjects} />
            <AdherenceGapCard projects={filteredProjects} />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="transition-all hover:scale-[1.01]">
              <TimePerStageChart projects={filteredProjects} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="m-0 animate-in fade-in slide-in-from-right-4 duration-500">
          <IndividualProjectReport projects={projects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
