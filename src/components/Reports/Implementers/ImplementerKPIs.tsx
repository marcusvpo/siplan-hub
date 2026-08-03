import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ImplementerKPIsProps {
  totalBaseProjects: number;
  totalInvolvedProjectsCount: number;
  totalPhase1ProjectsCount: number;
  phase1CompletionRate: number;
  phase1SummaryStr: string;
  implementerFirstName: string;
}

export const ImplementerKPIs: React.FC<ImplementerKPIsProps> = ({
  totalBaseProjects,
  totalInvolvedProjectsCount,
  totalPhase1ProjectsCount,
  phase1CompletionRate,
  phase1SummaryStr,
  implementerFirstName,
}) => {
  const kpis = [
    {
      value: totalBaseProjects,
      title: "Total Base Siplan",
      subtitle: "Projetos Cadastrados",
    },
    {
      value: totalInvolvedProjectsCount,
      title: `Atuação de ${implementerFirstName}`,
      subtitle: "Todas as Etapas",
    },
    {
      value: totalPhase1ProjectsCount,
      title: "Implantação Fase 1",
      subtitle: "Treinamento & Virada",
    },
    {
      value: `${phase1CompletionRate}%`,
      title: "Conclusão Virada",
      subtitle: phase1SummaryStr,
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold tracking-tight text-foreground/90">
        1. Indicadores Globais de Implantação e Desempenho
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, idx) => (
          <Card
            key={idx}
            className="relative overflow-hidden border border-border/70 hover:border-primary/40 transition-all hover:shadow-md group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary/80 group-hover:bg-primary transition-colors" />
            <CardContent className="p-4 pt-5 text-center space-y-1">
              <div className="text-2xl md:text-3xl font-black tracking-tight text-primary">
                {kpi.value}
              </div>
              <div className="text-xs font-bold text-foreground">
                {kpi.title}
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">
                {kpi.subtitle}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
