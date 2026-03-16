import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useKPIs } from "@/hooks/useKPIs";
import { DashboardKPI } from "@/components/Dashboard/DashboardKPI";
import { ProjectDistributionChart } from "@/components/Dashboard/ProjectDistributionChart";
import { StatusChart } from "@/components/Dashboard/StatusChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, ArrowRight, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { ScrollingText } from "@/components/ui/scrolling-text";
import { ProjectDetailsModal } from "@/components/Dashboard/ProjectDetailsModal";
import { DashboardTable } from "@/components/Dashboard/DashboardTable";
import { TimelineChart } from "@/components/Dashboard/TimelineChart";
import { WorkloadChart } from "@/components/Dashboard/WorkloadChart";
import { ProjectV2 } from "@/types/ProjectV2";
import { isAfter, subDays, format } from "date-fns";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { DashboardReport } from "@/components/Dashboard/DashboardReport";

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

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const kpis = useKPIs(projects);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    toast({
      title: "Gerando PDF...",
      description: "Aguarde enquanto preparamos seu relatório personalizado.",
    });

    try {
      // Small delay to ensure the off-screen component is fully layouted if needed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = document.getElementById("dashboard-report");
      if (!element) throw new Error("Report element not found");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Gestao_Siplan_${format(new Date(), "ddMMyyyy")}.pdf`);

      toast({
        title: "Relatório Concluído!",
        description: "Seu PDF profissional foi gerado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Houve um problema ao processar o relatório.",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Hidden professional report for PDF capture */}
      <DashboardReport 
        projects={projects} 
        kpis={{
          totalProjects: projects.length,
          successRate: kpis.successRate,
          criticalAlerts: criticalAlerts.length,
          activeProjects: projects.filter(p => p.globalStatus !== 'done').length,
          avgStageTime: kpis.avgStageTime
        }} 
      />

      {/* Premium Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <main className="container mx-auto px-4 py-6 space-y-4 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">Visão Geral</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-70">
              Métricas e status dos projetos de implantação
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isGeneratingPDF}
              onClick={handleDownloadPDF}
              className="h-9 px-4 gap-2 font-black uppercase tracking-widest text-[10px] bg-background/50 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300 print-hide border-primary/20 hover:border-primary shadow-sm"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="h-3 w-3 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  Gerando...
                </>
              ) : (
                <>
                  <Printer className="h-3.5 w-3.5" />
                  Gerar PDF
                </>
              )}
            </Button>
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
        </div>

        {/* KPIs */}
        <DashboardKPI onCardClick={handleCardClick} />

        {/* Gráficos e KPIs Secundários (Bento Grid) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-[280px] overflow-hidden rounded-2xl border bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-xl hover:scale-[1.01] hover:bg-card/60 transition-all duration-500 group">
            <ProjectDistributionChart projects={projects} />
          </div>
          <div className="h-[280px] overflow-hidden rounded-2xl border bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-xl hover:scale-[1.01] hover:bg-card/60 transition-all duration-500 group">
            <StatusChart projects={projects} />
          </div>
          <div className="h-[280px] overflow-hidden rounded-2xl border bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-xl hover:scale-[1.01] hover:bg-card/60 transition-all duration-500 group">
            <WorkloadChart projects={projects} />
          </div>
        </div>

        {/* Timeline e Performance */}
        <div className="grid gap-6 lg:grid-cols-3">
          <TimelineChart projects={projects} />
          
          <Card className="flex flex-col rounded-2xl border bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden hover:shadow-xl hover:scale-[1.01] hover:bg-card/60 transition-all duration-500 group">
            <CardHeader className="py-4 px-6 border-b bg-muted/5">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold opacity-80">Taxa de Sucesso Geral</span>
                  <span className="text-2xl font-black text-emerald-500 transition-all duration-500">
                    {useKPIs(projects).successRate}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-muted/20">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                    style={{ width: `${useKPIs(projects).successRate}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Tempo Médio por Etapa</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Infra", value: useKPIs(projects).avgStageTime?.infra, color: "bg-blue-500", glow: "shadow-[0_0_8px_rgba(59,130,246,0.3)]" },
                    { label: "Aderência", value: useKPIs(projects).avgStageTime?.adherence, color: "bg-purple-500", glow: "shadow-[0_0_8px_rgba(168,85,247,0.3)]" },
                    { label: "Conversão", value: useKPIs(projects).avgStageTime?.conversion, color: "bg-orange-500", glow: "shadow-[0_0_8px_rgba(249,115,22,0.3)]" },
                    { label: "Implantação", value: useKPIs(projects).avgStageTime?.implementation, color: "bg-emerald-500", glow: "shadow-[0_0_8px_rgba(16,185,129,0.3)]" }
                  ].map((stage) => (
                    <div key={stage.label} className="p-3 border rounded-xl bg-muted/20 hover:bg-muted/40 transition-all border-muted/30 hover:border-muted-foreground/20 group/stage">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", stage.color, stage.glow, "group-hover/stage:scale-125")} />
                        <p className="text-[9px] font-black text-muted-foreground uppercase opacity-80">{stage.label}</p>
                      </div>
                      <p className="text-lg font-black tracking-tighter">
                        {stage.value || 0} <span className="text-[10px] font-bold text-muted-foreground tracking-normal uppercase ml-1">dias</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Projetos e Alertas */}
        <div className="grid gap-6 lg:grid-cols-3 pt-4 min-h-[600px]">
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <div className="flex items-center justify-between px-2 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/70">Projetos Ativos</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">{projects.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="h-7 text-[10px] gap-1 font-bold uppercase tracking-wider">
                Ver Todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 min-h-[400px] max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              <DashboardTable onProjectClick={handleProjectClick} />
            </div>
          </div>

          <div className="flex flex-col space-y-6">
            {criticalAlerts.length > 0 && (
              <Card className="rounded-2xl border-destructive/20 bg-destructive/5 overflow-hidden flex flex-col h-full border-b-destructive/40">
                <CardHeader className="py-4 px-5 border-b border-destructive/10 bg-destructive/5 shrink-0">
                  <CardTitle className="flex items-center gap-2 text-destructive text-xs font-black uppercase tracking-widest">
                    <AlertTriangle className="h-4 w-4" />
                    Alertas Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                  <div className="space-y-3">
                    {criticalAlerts.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className="p-3 border border-destructive/10 rounded-xl bg-background/50 hover:bg-destructive/10 transition-all cursor-pointer group shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="destructive" className="h-4 text-[8px] font-black uppercase px-1.5 rounded-sm">Crítico</Badge>
                          <span className="text-[9px] font-mono text-muted-foreground opacity-60">#{project.ticketNumber}</span>
                        </div>
                        <ScrollingText 
                          text={project.clientName} 
                          className="text-xs font-bold mb-1 opacity-90"
                          speed={40}
                        />
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-60">
                          {project.systemType}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
