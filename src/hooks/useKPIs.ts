import { useMemo } from "react";
import { ProjectV2, KPIData } from "@/types/ProjectV2";

export const useKPIs = (projects: ProjectV2[]): KPIData => {
  return useMemo(() => {
    const totalProjects = projects.length;
    const criticalProjects = projects.filter((p) => p.healthScore === "critical" && p.globalStatus !== "blocked").length;
    const blockedProjects = projects.filter((p) => p.globalStatus === "blocked").length;
    const atRiskProjects = projects.filter((p) => p.healthScore === "warning").length;
    const completedProjects = projects.filter((p) => p.globalStatus === "done").length;

    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

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

    // Próximos follow-ups (< 3 dias)
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const nextFollowups = projects.filter(
      (p) => p.nextFollowUpDate && p.nextFollowUpDate >= now && p.nextFollowUpDate <= threeDaysFromNow
    ).length;

    return {
      totalProjects,
      criticalProjects,
      blockedProjects,
      atRiskProjects,
      completedProjects,
      completionRate: Math.round(completionRate),
      avgTotalTime: Math.round(avgTotalTime),
      nextFollowups,
    };
  }, [projects]);
};
