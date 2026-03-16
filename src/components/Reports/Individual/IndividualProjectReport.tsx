import { useState, useMemo } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { cn } from "@/lib/utils";
import { ProjectSelector } from "./ProjectSelector";
import { ProjectHeaderStats } from "./ProjectHeaderStats";
import { StageAnalysisTimeline } from "./StageAnalysisTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  Server,
  Monitor,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IndividualProjectReportProps {
  projects: ProjectV2[];
}

export function IndividualProjectReport({
  projects,
}: IndividualProjectReportProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(projects[0]?.id);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  // Heuristics for Insights
  const insights = useMemo(() => {
    if (!selectedProject) return [];

    const list = [];
    const gaps = selectedProject.stages.adherence.hasProductGap;
    if (gaps) {
      list.push({
        type: "warning",
        title: "Gaps de Produto",
        desc: "Este projeto possui gaps de produto identificados na aderência. Isso pode aumentar o risco de atraso na Implantação.",
      });
    }

    const adherenceDays =
      selectedProject.stages.adherence.startDate &&
      selectedProject.stages.adherence.endDate
        ? (new Date(selectedProject.stages.adherence.endDate).getTime() -
            new Date(selectedProject.stages.adherence.startDate).getTime()) /
          86400000
        : 0;

    if (adherenceDays > 15) {
      list.push({
        type: "info",
        title: "Aderência Complexa",
        desc: `A etapa de aderência levou ${Math.ceil(
          adherenceDays
        )} dias, o que é acima do ideal (15 dias).`,
      });
    }

    // Default positive insights if no warnings/infos
    if (list.length === 0) {
      list.push({
        type: "positive",
        title: "Projeto em Dia",
        desc: "Nenhum risco crítico ou atraso significativo detectado nas etapas recentes.",
      });
    }

    // Check for high data volume (informational only now, not main insight unless critical)
    const gb = selectedProject.stages.conversion.dataVolumeGb || 0;
    if (gb > 50) {
      list.push({
        type: "neutral",
        title: "Alto Volume de Dados",
        desc: `Banco de dados com ${gb}GB. Monitorar performance da etapa de Conversão.`,
      });
    }

    return list;
  }, [selectedProject]);

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-semibold text-muted-foreground">
          Selecione um projeto para começar
        </h3>
        <div className="mt-4">
          <ProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
        </div>
      </div>
    );
  }

  const p1Start = selectedProject.stages.implementation.phase1.startDate;
  const p1End = selectedProject.stages.implementation.phase1.endDate;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-tight text-primary">
          Análise Detalhada: {selectedProject.clientName}
        </h3>
        <ProjectSelector
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />
      </div>

      <ProjectHeaderStats project={selectedProject} />

      <div className="grid gap-6 md:grid-cols-3">
        <StageAnalysisTimeline
          project={selectedProject}
          allProjects={projects}
        />

        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-xl overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                <Lightbulb className="h-4 w-4 text-amber-500 animate-pulse" />
                Inteligência de Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.02] border",
                    insight.type === "warning" ? "bg-red-500/5 border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.1)]" : 
                    insight.type === "positive" ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]" :
                    insight.type === "info" ? "bg-blue-500/5 border-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.1)]" :
                    "bg-muted/30 border-muted-foreground/10"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    insight.type === "warning" ? "bg-red-500/10 text-red-600" : 
                    insight.type === "positive" ? "bg-emerald-500/10 text-emerald-600" :
                    insight.type === "info" ? "bg-blue-500/10 text-blue-600" :
                    "bg-muted-foreground/10 text-muted-foreground"
                  )}>
                    {insight.type === "warning" ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : insight.type === "positive" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : insight.type === "info" ? (
                      <TrendingDown className="h-4 w-4 rotate-90" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-xs uppercase tracking-tight">{insight.title}</h4>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
                      {insight.desc}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-primary/5 shadow-xl group hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-primary/5 bg-muted/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-blue-500" />
                Especificações Técnicas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 group/spec">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <Monitor className="h-3 w-3" /> Estações
                  </div>
                  <p
                    className="text-sm font-black text-foreground truncate pl-1 border-l-2 border-emerald-500/30 group-hover/spec:border-emerald-500 transition-colors"
                    title={selectedProject.stages.infra.workstationsStatus || "N/A"}
                  >
                    {selectedProject.stages.infra.workstationsStatus || "-"}
                  </p>
                </div>
                <div className="space-y-2 group/spec">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <Server className="h-3 w-3" /> Servidor
                  </div>
                  <p
                    className="text-sm font-black text-foreground truncate pl-1 border-l-2 border-blue-500/30 group-hover/spec:border-blue-500 transition-colors"
                    title={selectedProject.stages.infra.serverStatus || "N/A"}
                  >
                    {selectedProject.stages.infra.serverStatus || "-"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden group/phase">
                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/phase:scale-125 transition-transform">
                   <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                   Implantação <span className="text-[8px] opacity-60">(Fase 1)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Início</span>
                    <p className="text-sm font-black">
                      {p1Start
                        ? format(p1Start, "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Fim Estimado</span>
                    <p className="text-sm font-black text-emerald-600">
                      {p1End
                        ? format(p1End, "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
                   Chamados Relacionados
                   <div className="h-px flex-1 bg-muted-foreground/10" />
                </div>
                {selectedProject.relatedTickets &&
                selectedProject.relatedTickets.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.relatedTickets.map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-background/50 border-primary/10 hover:bg-primary/10 hover:border-primary/30 transition-all font-black text-[10px] py-0.5"
                      >
                        #{t.number}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground/50 italic font-medium">
                    Nenhum chamado vinculado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
