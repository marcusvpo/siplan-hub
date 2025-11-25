import { Project } from "@/types/project";
import { isPast } from "date-fns";

export function calculateHealthScore(project: Project): "ok" | "warning" | "critical" {
  const daysSinceUpdate = getDaysSinceUpdate(project);

  // Verificar se há mais de 5 dias sem update
  if (daysSinceUpdate > 5) return "critical";
  
  // Verificar follow-up vencido
  if (project.nextFollowUpDate && isPast(project.nextFollowUpDate)) {
    return "critical";
  }
  
  // Verificar se há bloqueios ativos
  const hasBlockers = Object.values(project.stages).some(
    (stage) => stage.status === "blocked"
  );
  if (hasBlockers) return "critical";
  
  // Projeto em atenção (2-5 dias)
  if (daysSinceUpdate > 2) return "warning";
  
  return "ok";
}

export function getDaysSinceUpdate(project: Project): number {
  const now = new Date();
  const lastUpdate = new Date(project.updatedAt);
  return Math.floor(
    (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `Há ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return `Há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }
  return `Há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
}
