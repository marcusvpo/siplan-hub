import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { DashboardKPI } from "@/components/Dashboard/DashboardKPI";
import { ProjectDistributionChart } from "@/components/Dashboard/ProjectDistributionChart";
import { StatusChart } from "@/components/Dashboard/StatusChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";

import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";

export default function DashboardV2() {
  const { projects, isLoading } = useProjectsV2();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;

    const overdueProjects = projects.filter(
      (p) => p.nextFollowUpDate && new Date(p.nextFollowUpDate) < new Date()
    );

    if (overdueProjects.length > 0) {
      toast({
        title: "Atenção: Follow-ups Vencidos",
        description: `Você tem ${overdueProjects.length} projetos com follow-up vencido.`,
        variant: "destructive",
      });
    }
  }, [projects, isLoading, toast]);

  const criticalAlerts = projects
    .filter((p) => p.healthScore === "critical" && p.globalStatus !== "blocked")
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Header Section */}
        <div>
          <h2 className="text-2xl font-bold">Visão Geral</h2>
          <p className="text-muted-foreground">
            Acompanhe métricas e status dos projetos de implantação
          </p>
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
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Alertas Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalAlerts.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{project.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        Ticket: {project.ticketNumber} • Sistema:{" "}
                        {project.systemType}
                      </p>
                    </div>
                    <Badge variant="destructive">Crítico</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
