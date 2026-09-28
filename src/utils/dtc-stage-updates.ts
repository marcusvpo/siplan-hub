import type { EnvironmentStageV2, PostStageV2, StageStatus } from "@/types/ProjectV2";

type DtcEnvironmentFields = Pick<EnvironmentStageV2,
  | "remoteAccessList"
  | "soLogin"
  | "soPassword"
  | "postgresVersion"
  | "postgresAccessData"
  | "postgresHost"
  | "postgresUser"
  | "postgresPassword"
  | "osType"
  | "osVersion"
>;

export interface DtcStageFields extends DtcEnvironmentFields {
  status: "draft" | "submitted" | "approved";
  analystResponsible: string;
}

interface DtcStageSource {
  post?: PostStageV2;
  environment?: EnvironmentStageV2;
}

function dtcStageStatus(status: DtcStageFields["status"]): StageStatus {
  if (status === "submitted") return "waiting_adjustment";
  if (status === "approved") return "done";
  return "in-progress";
}

export function buildDtcPostStage(
  current: PostStageV2 | undefined,
  dtc: Pick<DtcStageFields, "status" | "analystResponsible">,
  responsiblePost?: string,
): PostStageV2 {
  return {
    followupNeeded: false,
    ...current,
    status: dtcStageStatus(dtc.status),
    responsible: dtc.analystResponsible || responsiblePost || undefined,
  };
}

function definedFields<T extends object>(fields: T): Partial<T> {
  const defined: Partial<T> = {};
  for (const field in fields) {
    if (fields[field] !== undefined) defined[field] = fields[field];
  }
  return defined;
}

/** Atualiza os campos do DTC sem apagar datas, flags ou acessos omitidos no formulário. */
export function buildDtcStageUpdates(
  current: DtcStageSource,
  dtc: DtcStageFields,
  responsiblePost?: string,
): { post: PostStageV2; environment: EnvironmentStageV2 } {
  const accessFields: DtcEnvironmentFields = {
    remoteAccessList: dtc.remoteAccessList,
    soLogin: dtc.soLogin,
    soPassword: dtc.soPassword,
    postgresVersion: dtc.postgresVersion,
    postgresAccessData: dtc.postgresAccessData,
    postgresHost: dtc.postgresHost,
    postgresUser: dtc.postgresUser,
    postgresPassword: dtc.postgresPassword,
    osType: dtc.osType,
    osVersion: dtc.osVersion,
  };

  return {
    post: buildDtcPostStage(current.post, dtc, responsiblePost),
    environment: {
      status: "todo",
      approvedByInfra: false,
      testAvailable: false,
      ...current.environment,
      ...definedFields(accessFields),
    },
  };
}
