import type { StageStatus } from "@/types/ProjectV2";
import type {
  StageFilter,
  StageStatusFilter,
} from "@/stores/filterStore";
import { normalizeSystemType } from "@/utils/projectSpecialty";

type FilterableStage = Exclude<StageFilter, "all">;

type ProjectWithFilterableStages = {
  systemType?: string | null;
  stages?: Partial<Record<FilterableStage, { status?: StageStatus }>>;
};

export interface StageStatusOption {
  value: StageStatusFilter;
  label: string;
}

const DEFAULT_STAGE_STATUS_OPTIONS: readonly StageStatusOption[] = [
  { value: "all", label: "Todos os status" },
  { value: "todo", label: "Não Iniciado" },
  { value: "in-progress", label: "Em Andamento" },
  { value: "done", label: "Finalizado" },
  { value: "blocked", label: "Bloqueado" },
];

const ADHERENCE_STAGE_STATUS_OPTIONS: readonly StageStatusOption[] = [
  { value: "all", label: "Todos os status" },
  { value: "todo", label: "Não Iniciado" },
  { value: "in-progress", label: "Em Análise" },
  { value: "done", label: "Adequado" },
  { value: "blocked", label: "Inadequado" },
  { value: "waiting_adjustment", label: "Em Adequação" },
];

export function getStageStatusOptions(
  stage: StageFilter,
): readonly StageStatusOption[] {
  return stage === "adherence"
    ? ADHERENCE_STAGE_STATUS_OPTIONS
    : DEFAULT_STAGE_STATUS_OPTIONS;
}

export function isModelosTnProject(
  project: Pick<ProjectWithFilterableStages, "systemType">,
): boolean {
  return normalizeSystemType(project.systemType) === "Modelos TN";
}

export function isProjectStageApplicable(
  project: Pick<ProjectWithFilterableStages, "systemType">,
  stage: StageFilter,
): boolean {
  if (stage === "all") return true;

  return !isModelosTnProject(project) || stage === "implementation";
}

export function matchesProjectStageFilter(
  project: ProjectWithFilterableStages,
  stage: StageFilter,
  status: StageStatusFilter,
): boolean {
  if (stage === "all") return true;
  if (!isProjectStageApplicable(project, stage)) return false;

  const stageData = project.stages?.[stage];
  if (!stageData) return false;

  return status === "all" || stageData.status === status;
}
