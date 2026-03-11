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
import { useEffect, useState } from "react";
import { ScrollingText } from "@/components/ui/scrolling-text";
import { ProjectDetailsModal } from "@/components/Dashboard/ProjectDetailsModal";
import { ProjectV2 } from "@/types/ProjectV2";
import { isAfter, subDays } from "date-fns";

export default function DashboardV2() {
  const { projects, isLoading } = useProjectsV2();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [filteredProjects, setFilteredProjects] = useState<ProjectV2[]>([]);

  const handleCardClick = (category: string) => {
    let filtered: ProjectV2[] = [];
    let title = "";

    switch (category) {
      case "total":
        filtered = projects;
        title = "Todos os Projetos";
        break;
      case "critical":
        filtered = projects.filter((p) => p.healthScore === "critical");
        title = "Projetos Críticos";
        break;
      case "blocked":
        filtered = projects.filter((p) => p.globalStatus === "blocked");
        title = "Projetos Bloqueados";
        break;
      case "at-risk":
        filtered = projects.filter((p) => p.healthScore === "warning");
        title = "Projetos em Risco";
        break;
      case "completed":
        filtered = projects.filter((p) => p.globalStatus === "done");
        title = "Projetos Concluídos";
        break;
      case "followups":
        filtered = projects.filter(
          (p) => p.nextFollowUpDate && new Date(p.nextFollowUpDate) <= new Date()
        );
        title = "Próximos Follow-ups";
        break;
      default:
        filtered = projects;
        title = "Detalhes";
    }

    setFilteredProjects(filtered);
    setModalTitle(title);
    setIsModalOpen(true);
  };

  const handleProjectClick = (project: ProjectV2) => {
    setFilteredProjects([project]);
    setModalTitle(`Detalhes: ${project.clientName}`);
    setIsModalOpen(true);
  };

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
      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">Visão Geral</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-70">
              Métricas e status dos projetos de implantação
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex flex-col items-center px-3 border-r border-border/50">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Storage</span>
              <span className="text-xs font-black text-primary">Simulado</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Status</span>
              <span className="text-xs font-black text-emerald-500">Online</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <DashboardKPI onCardClick={handleCardClick} />

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[250px] overflow-hidden rounded-xl border bg-card/50">
            <ProjectDistributionChart projects={projects} />
          </div>
          <div className="h-[250px] overflow-hidden rounded-xl border bg-card/50">
            <StatusChart projects={projects} />
          </div>
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
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {criticalAlerts.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    className="flex items-center justify-between p-2 border border-destructive/20 rounded-md bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer group"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 mr-2 overflow-hidden">
                      <ScrollingText 
                        text={project.clientName} 
                        className="text-xs font-bold"
                        speed={40}
                      />
                      <p className="text-[10px] text-muted-foreground truncate">
                        TKT: {project.ticketNumber} • {project.systemType}
                      </p>
                    </div>
                    <Badge variant="destructive" className="h-4 text-[8px] font-black uppercase">Crítico</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <ProjectDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        projects={filteredProjects}
      />
    </div>
  );
}
