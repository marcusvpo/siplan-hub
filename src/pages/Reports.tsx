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
    <div className="space-y-6 animate-in fade-in duration-500">
      <Tabs
        defaultValue="overview"
        className="space-y-6"
        onValueChange={setActiveTab}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Relatórios & Análises
            </h2>
            <p className="text-muted-foreground">
              Acompanhe métricas, tendências e performance dos projetos.
            </p>
          </div>

          <TabsList className="bg-muted p-1 rounded-lg self-start md:self-center">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-2">
              <Search className="h-4 w-4" />
              Análise Individual
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 m-0">
          <div className="bg-card p-4 rounded-lg border shadow-sm">
            <ReportsFilters
              onSystemChange={setSystemFilter}
              onDateChange={setDateFilter}
              systems={systems}
            />
          </div>

          <GlobalMetrics projects={filteredProjects} />

          {/* Status and Health Distribution Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <StatusDistribution projects={filteredProjects} />
            <HealthDistribution projects={filteredProjects} />
            <AdherenceGapCard projects={filteredProjects} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TimePerStageChart projects={filteredProjects} />
          </div>
        </TabsContent>

        <TabsContent value="individual" className="m-0">
          <IndividualProjectReport projects={projects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
