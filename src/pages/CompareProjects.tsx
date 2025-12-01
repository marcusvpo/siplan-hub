import { useSearchParams, useNavigate } from "react-router-dom";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ProjectV2, StageStatus } from "@/types/ProjectV2";

export default function CompareProjects() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { projects, isLoading } = useProjectsV2();

  const ids = searchParams.get("ids")?.split(",") || [];
  const selectedProjects = projects.filter((p) => ids.includes(p.id));

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (selectedProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-xl font-bold">Nenhum projeto selecionado</h2>
        <Button onClick={() => navigate("/projects")}>Voltar para Projetos</Button>
      </div>
    );
  }

  const getHealthColor = (score: string) => {
    switch (score) {
      case "ok": return "text-emerald-500";
      case "warning": return "text-amber-500";
      case "critical": return "text-rose-500";
      default: return "text-slate-500";
    }
  };

  const getStageIcon = (status: StageStatus) => {
    switch (status) {
      case "done": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "in-progress": return <Clock className="h-5 w-5 text-blue-500" />;
      case "blocked": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-slate-200" />;
    }
  };

  const getStageLabel = (status: StageStatus) => {
    switch (status) {
      case "done": return "Finalizado";
      case "in-progress": return "Em Andamento";
      case "blocked": return "Bloqueado";
      case "todo": return "Não iniciado";
      default: return status;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4 bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Comparar Projetos</h1>
      </div>

      {/* Comparison Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedProjects.map((project) => (
              <Card key={project.id} className="flex flex-col h-full border-t-4" style={{ borderTopColor: project.healthScore === 'critical' ? '#f43f5e' : project.healthScore === 'warning' ? '#f59e0b' : '#10b981' }}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold">{project.clientName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{project.systemType}</p>
                    </div>
                    <Badge variant="outline">#{project.ticketNumber}</Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-6">
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Criado em</span>
                      <span className="font-medium">{format(new Date(project.createdAt), "dd/MM/yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Líder</span>
                      <span className="font-medium">{project.projectLeader}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Saúde</span>
                      <div className="flex items-center gap-1 font-medium">
                        <div className={cn("h-2 w-2 rounded-full bg-current", getHealthColor(project.healthScore))} />
                        <span className="capitalize">{project.healthScore}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">UAT</span>
                      <span className="font-medium">{format(new Date(project.lastUpdatedAt), "dd/MM")}</span>
                    </div>
                  </div>

                  {/* Pipeline Visual */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Pipeline</span>
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 -z-10" />
                      {Object.entries(project.stages).map(([key, stage]) => (
                        <div key={key} className="bg-background px-1" title={key}>
                          <div className={cn(
                            "h-3 w-3 rounded-full",
                            (stage as { status: string }).status === 'done' ? "bg-emerald-500" :
                            (stage as { status: string }).status === 'in-progress' ? "bg-blue-500" :
                            (stage as { status: string }).status === 'blocked' ? "bg-amber-500" : "bg-slate-200"
                          )} />
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-center text-muted-foreground">
                      {Math.round(project.overallProgress)}% Concluído
                    </div>
                  </div>

                  {/* Detailed Stages */}
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase block border-b pb-1">Detalhamento</span>
                    
                    {/* Infra */}
                    <div className="flex items-start gap-3">
                      {getStageIcon(project.stages.infra.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">Infraestrutura</p>
                        <p className="text-xs text-muted-foreground">{getStageLabel(project.stages.infra.status)}</p>
                        {project.stages.infra.responsible && (
                          <p className="text-xs text-muted-foreground mt-0.5">Resp: {project.stages.infra.responsible}</p>
                        )}
                      </div>
                    </div>

                    {/* Aderência */}
                    <div className="flex items-start gap-3">
                      {getStageIcon(project.stages.adherence.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">Aderência</p>
                        <p className="text-xs text-muted-foreground">{getStageLabel(project.stages.adherence.status)}</p>
                        {project.stages.adherence.responsible && (
                          <p className="text-xs text-muted-foreground mt-0.5">Resp: {project.stages.adherence.responsible}</p>
                        )}
                      </div>
                    </div>

                    {/* Conversão */}
                    <div className="flex items-start gap-3">
                      {getStageIcon(project.stages.conversion.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">Conversão</p>
                        <p className="text-xs text-muted-foreground">{getStageLabel(project.stages.conversion.status)}</p>
                        {project.stages.conversion.responsible && (
                          <p className="text-xs text-muted-foreground mt-0.5">Resp: {project.stages.conversion.responsible}</p>
                        )}
                      </div>
                    </div>

                     {/* Implantação */}
                     <div className="flex items-start gap-3">
                      {getStageIcon(project.stages.implementation.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">Implantação</p>
                        <p className="text-xs text-muted-foreground">{getStageLabel(project.stages.implementation.status)}</p>
                        {project.stages.implementation.responsible && (
                          <p className="text-xs text-muted-foreground mt-0.5">Resp: {project.stages.implementation.responsible}</p>
                        )}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
