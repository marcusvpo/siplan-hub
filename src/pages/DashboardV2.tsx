import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { DashboardKPI } from "@/components/Dashboard/DashboardKPI";
import { ProjectDistributionChart } from "@/components/Dashboard/ProjectDistributionChart";
import { StatusChart } from "@/components/Dashboard/StatusChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardV2() {
  const { projects, isLoading } = useProjectsV2();

  const criticalAlerts = projects
    .filter((p) => p.healthScore === "critical")
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos projetos de implantação</p>
        </div>
      </div>

      {/* KPIs */}
      <DashboardKPI />

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <ProjectDistributionChart projects={projects} />
        <StatusChart projects={projects} />
      </div>

      {/* Alertas Críticos */}
      {criticalAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertas Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalAlerts.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border border-red-500/20 rounded-lg bg-red-500/5"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{project.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      Ticket: {project.ticketNumber} • Sistema: {project.systemType}
                    </p>
                  </div>
                  <Badge variant="destructive">Crítico</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
