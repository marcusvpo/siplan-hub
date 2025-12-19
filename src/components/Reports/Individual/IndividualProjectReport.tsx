import { useState, useMemo } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { ProjectSelector } from "./ProjectSelector";
import { ProjectHeaderStats } from "./ProjectHeaderStats";
import { StageAnalysisTimeline } from "./StageAnalysisTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950 border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Insights Automáticos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 items-start p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg shadow-sm"
                >
                  {insight.type === "warning" ? (
                    <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : insight.type === "positive" ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : insight.type === "info" ? (
                    <TrendingDown className="h-5 w-5 text-blue-500 mt-0.5" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {insight.desc}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhes Técnicos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> Status Estações
                  </span>
                  <p
                    className="font-medium truncate"
                    title={
                      selectedProject.stages.infra.workstationsStatus || "N/A"
                    }
                  >
                    {selectedProject.stages.infra.workstationsStatus || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Server className="h-3 w-3" /> Status Servidor
                  </span>
                  <p
                    className="font-medium truncate"
                    title={selectedProject.stages.infra.serverStatus || "N/A"}
                  >
                    {selectedProject.stages.infra.serverStatus || "-"}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  Implantação (Fase 1)
                </div>
                <div className="flex justify-between text-xs">
                  <span>Início:</span>
                  <span className="font-medium">
                    {p1Start
                      ? format(p1Start, "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>Fim Estimado:</span>
                  <span className="font-medium">
                    {p1End
                      ? format(p1End, "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  Chamados Relacionados
                </div>
                {selectedProject.relatedTickets &&
                selectedProject.relatedTickets.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.relatedTickets.map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium text-foreground"
                      >
                        #{t.number}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
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
