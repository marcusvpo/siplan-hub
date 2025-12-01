import { useState } from "react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { GlobalMetrics } from "@/components/Reports/GlobalMetrics";
import { TimePerStageChart } from "@/components/Reports/TimePerStageChart";
import { TrendChart } from "@/components/Reports/TrendChart";
import { TopResponsibles } from "@/components/Reports/TopResponsibles";
import { ReportsFilters } from "@/components/Reports/ReportsFilters";
import { Loader2 } from "lucide-react";

export default function Reports() {
  const { projects, isLoading } = useProjectsV2();
  const [systemFilter, setSystemFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Extract unique responsibles
  const responsibles = Array.from(new Set(projects.map(p => p.projectLeader))).sort();

  // Apply filters
  const filteredProjects = projects.filter(project => {
    const matchesSystem = systemFilter === "all" || project.systemType === systemFilter;
    const matchesResponsible = responsibleFilter === "all" || project.projectLeader === responsibleFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      const projectDate = new Date(project.createdAt);
      // Simple check: project created after or on the selected date
      matchesDate = projectDate >= dateFilter;
    }

    return matchesSystem && matchesResponsible && matchesDate;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Relatórios & Análises</h2>
        <p className="text-muted-foreground">
          Acompanhe métricas, tendências e performance da equipe.
        </p>
      </div>

      <ReportsFilters 
        onSystemChange={setSystemFilter}
        onResponsibleChange={setResponsibleFilter}
        onDateChange={setDateFilter}
        responsibles={responsibles}
      />

      <GlobalMetrics projects={filteredProjects} />

      <div className="grid gap-6 md:grid-cols-2">
        <TimePerStageChart projects={filteredProjects} />
        <TrendChart projects={filteredProjects} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TopResponsibles projects={filteredProjects} />
        {/* Placeholder for another chart or list if needed */}
      </div>
    </div>
  );
}
