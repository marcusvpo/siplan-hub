import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useKPIs } from "@/hooks/useKPIs";
import { KPICard } from "./KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from "lucide-react";

export const DashboardKPI = () => {
  const { projects, isLoading } = useProjectsV2();
  const kpis = useKPIs(projects);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-8">
      <KPICard
        title="Total"
        value={kpis.totalProjects}
        icon={FolderKanban}
        variant="default"
      />
      
      <KPICard
        title="Críticos"
        value={kpis.criticalProjects}
        icon={AlertTriangle}
        variant="critical"
      />
      
      <KPICard
        title="Bloqueados"
        value={kpis.blockedProjects}
        icon={Ban}
        variant="critical"
      />
      
      <KPICard
        title="Em Risco"
        value={kpis.atRiskProjects}
        icon={Clock}
        variant="warning"
      />

      <KPICard
        title="Concluídos"
        value={kpis.completedProjects}
        icon={CheckCircle2}
        variant="success"
      />
      
      <KPICard
        title="Taxa"
        value={kpis.completionRate}
        unit="%"
        icon={TrendingUp}
        variant={kpis.completionRate >= 50 ? "success" : "warning"}
      />
      
      <KPICard
        title="Follow-ups"
        value={kpis.nextFollowups}
        icon={Calendar}
        variant={kpis.nextFollowups > 5 ? "warning" : "default"}
      />

      <div className="hidden xl:block">
        <KPICard
          title="Média"
          value={kpis.avgTotalTime}
          unit="d"
          icon={Clock}
          variant="default"
        />
      </div>
    </div>
  );
};
