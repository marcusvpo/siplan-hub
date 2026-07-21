import { useMemo } from "react";
import { ProjectV2, KPIData } from "@/types/ProjectV2";

export const useKPIs = (rawProjects: ProjectV2[]): KPIData => {
  return useMemo(() => {
    const projects = rawProjects.filter((p) => p.systemType !== "Modelos TN");
    const totalProjects = projects.length;
    const isFinalized = (p: ProjectV2) =>
      p.globalStatus === "done" || p.globalStatus === "archived" || p.globalStatus === "canceled";

    const criticalProjects = projects.filter((p) => !isFinalized(p) && p.healthScore === "critical" && p.globalStatus !== "blocked").length;
    const blockedProjects = projects.filter((p) => !isFinalized(p) && p.globalStatus === "blocked").length;
    const atRiskProjects = projects.filter((p) => !isFinalized(p) && p.healthScore === "warning").length;
    const completedProjects = projects.filter((p) => p.globalStatus === "done").length;

    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    // Calcular tempo médio por etapa para projetos ativos
    const getAvgStageTime = (prefix: string) => {
      const completedStages = projects.filter(
        (p) => 
          !isFinalized(p) &&
          (p.stages as any)[prefix]?.status === "done" && 
          (p.stages as any)[prefix]?.startDate && 
          (p.stages as any)[prefix]?.endDate
      );
      
      if (completedStages.length === 0) return 0;
      
      const totalDays = completedStages.reduce((sum, p) => {
        const stage = (p.stages as any)[prefix];
        const days = Math.floor(
          (new Date(stage.endDate).getTime() - new Date(stage.startDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + Math.max(0, days);
      }, 0);
      
      return Math.round(totalDays / completedStages.length);
    };

    const avgStageTime = {
      infra: getAvgStageTime("infra"),
      adherence: getAvgStageTime("adherence"),
      conversion: getAvgStageTime("conversion"),
      implementation: getAvgStageTime("implementation"),
    };

    // Taxa de sucesso: % de projetos ativos que estão "OK" + Concluídos
    const activeProjects = projects.filter(p => !isFinalized(p));
    const successfulActive = activeProjects.filter(p => p.healthScore === 'ok').length;
    
    const successfulDone = completedProjects; // Se concluiu, é sucesso por definição
    
    // Taxa = (Ativos OK + Concluidos) / Total
    const successRateValue = totalProjects > 0 
      ? Math.round(((successfulActive + successfulDone) / totalProjects) * 100) 
      : 0;
    
    const successRate = Math.min(100, successRateValue);

    // Calcular tempo médio (dias entre criação e finalização)
    const completedWithDates = projects.filter(
      (p) => p.globalStatus === "done" && p.createdAt && p.endDateActual
    );
    const avgTotalTime =
      completedWithDates.length > 0
        ? completedWithDates.reduce((sum, p) => {
            const days = Math.floor(
              (p.endDateActual!.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / completedWithDates.length
        : 0;

    return {
      totalProjects,
      criticalProjects,
      blockedProjects,
      atRiskProjects,
      completedProjects,
      completionRate: Math.round(completionRate),
      avgTotalTime: Math.round(avgTotalTime),
      successRate,
      avgStageTime,
    };
  }, [rawProjects]);
};
