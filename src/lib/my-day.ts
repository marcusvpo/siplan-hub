import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";
import type { ProjectV2, StageStatus } from "@/types/ProjectV2";

export type MyDayProjectTone = "critical" | "warning" | "neutral";

export interface MyDayProjectStage {
  key: keyof ProjectV2["stages"];
  label: string;
  status: StageStatus;
  endDate?: Date;
}

export interface MyDayProject {
  id: string;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  overallProgress: number;
  globalStatus: ProjectV2["globalStatus"];
  healthScore: ProjectV2["healthScore"];
  lastUpdatedAt: Date;
  nextStage?: MyDayProjectStage;
  isOverdue: boolean;
  isStale: boolean;
  tone: MyDayProjectTone;
  attentionLabel: string;
}

const STAGES: Array<{
  key: keyof ProjectV2["stages"];
  label: string;
}> = [
  { key: "infra", label: "Infraestrutura" },
  { key: "adherence", label: "Aderência" },
  { key: "environment", label: "Ambiente" },
  { key: "conversion", label: "Conversão" },
  { key: "modelosEditor", label: "Modelos OrionTN" },
  { key: "implementation", label: "Implantação" },
  { key: "post", label: "Pós-implantação" },
];

const TERMINAL_PROJECT_STATUSES = new Set(["done", "archived", "canceled"]);

export function normalizeAssignment(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function assignmentContainsIdentity(value: string | undefined, identities: Set<string>) {
  const normalized = normalizeAssignment(value);
  if (!normalized) return false;
  if (identities.has(normalized)) return true;

  return normalized
    .split(/[,;/|]+/)
    .map((part) => part.trim())
    .some((part) => identities.has(part));
}

export function isProjectAssignedTo(
  project: ProjectV2,
  identities: Array<string | null | undefined>,
): boolean {
  const normalizedIdentities = new Set(
    identities.map(normalizeAssignment).filter(Boolean),
  );
  if (normalizedIdentities.size === 0) return false;

  const assignments = [
    project.projectLeader,
    project.responsibleInfra,
    project.responsibleAdherence,
    project.responsibleEnvironment,
    project.responsibleConversion,
    project.responsibleImplementation,
    project.responsiblePost,
    ...STAGES.map(({ key }) => project.stages[key]?.responsible),
  ];

  return assignments.some((assignment) =>
    assignmentContainsIdentity(assignment, normalizedIdentities),
  );
}

export function isActiveProject(project: ProjectV2): boolean {
  return (
    !project.isDeleted &&
    !project.isArchived &&
    !TERMINAL_PROJECT_STATUSES.has(project.globalStatus)
  );
}

export function getNextOpenStage(project: ProjectV2): MyDayProjectStage | undefined {
  for (const stageDefinition of STAGES) {
    const stage = project.stages[stageDefinition.key];
    if (!stage || stage.status === "done") continue;

    return {
      key: stageDefinition.key,
      label: stageDefinition.label,
      status: stage.status,
      endDate: stage.endDate,
    };
  }

  return undefined;
}

function projectPriority(project: MyDayProject): number {
  if (project.globalStatus === "blocked") return 500;
  if (project.healthScore === "critical") return 400;
  if (project.isOverdue) return 300;
  if (project.healthScore === "warning") return 200;
  if (project.isStale) return 100;
  return 0;
}

export function toMyDayProject(
  project: ProjectV2,
  now = new Date(),
): MyDayProject {
  const nextStage = getNextOpenStage(project);
  const today = startOfDay(now);
  const isOverdue = Boolean(
    nextStage?.endDate && isBefore(startOfDay(nextStage.endDate), today),
  );
  const isStale = differenceInCalendarDays(today, project.lastUpdatedAt) >= 7;

  let tone: MyDayProjectTone = "neutral";
  let attentionLabel = "Em andamento";

  if (project.globalStatus === "blocked") {
    tone = "critical";
    attentionLabel = "Bloqueado";
  } else if (project.healthScore === "critical") {
    tone = "critical";
    attentionLabel = "Atenção crítica";
  } else if (isOverdue) {
    tone = "critical";
    attentionLabel = "Etapa atrasada";
  } else if (project.healthScore === "warning") {
    tone = "warning";
    attentionLabel = "Em atenção";
  } else if (isStale) {
    tone = "warning";
    attentionLabel = "Sem atualização recente";
  }

  return {
    id: project.id,
    clientName: project.clientName,
    ticketNumber: project.ticketNumber,
    systemType: project.systemType,
    overallProgress: project.overallProgress,
    globalStatus: project.globalStatus,
    healthScore: project.healthScore,
    lastUpdatedAt: project.lastUpdatedAt,
    nextStage,
    isOverdue,
    isStale,
    tone,
    attentionLabel,
  };
}

export function buildMyDayProjects(
  projects: ProjectV2[],
  identities: Array<string | null | undefined>,
  options?: { assignedOnly?: boolean; now?: Date },
): MyDayProject[] {
  const assignedOnly = options?.assignedOnly ?? true;
  const now = options?.now ?? new Date();

  return projects
    .filter(isActiveProject)
    .filter((project) => !assignedOnly || isProjectAssignedTo(project, identities))
    .map((project) => toMyDayProject(project, now))
    .sort((left, right) => {
      const priorityDifference = projectPriority(right) - projectPriority(left);
      if (priorityDifference !== 0) return priorityDifference;
      return right.lastUpdatedAt.getTime() - left.lastUpdatedAt.getTime();
    });
}
