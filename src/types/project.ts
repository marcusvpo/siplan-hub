export enum ProjectStatus {
  TODO = "todo",
  IN_PROGRESS = "in-progress",
  DONE = "done",
  BLOCKED = "blocked",
}

export interface Stage {
  status: ProjectStatus;
  responsible: string;
  startDate?: Date;
  endDate?: Date;
  observations?: string;
}

export interface InfraStage extends Stage {
  blockingReason?: string;
}

export interface AdherenceStage extends Stage {
  hasProductGap: boolean;
  devTicket?: string;
  devEstimatedDate?: Date;
}

export interface EnvironmentStage extends Stage {
  realDate?: Date;
  osVersion?: string;
  approvedByInfra: boolean;
}

export interface ConversionStage extends Stage {
  sourceSystem?: string; // Agora é texto livre
}

export interface ImplementationStage extends Stage {
  remoteInstallDate?: Date;
  trainingStartDate?: Date;
  trainingEndDate?: Date;
  switchType?: string; // Agora é texto livre
}

export interface PostStage extends Stage {}

export interface TimelineEvent {
  id: string;
  type: "auto" | "comment";
  author: string;
  message: string;
  timestamp: Date;
  metadata?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
  };
}

export interface Project {
  id: string;
  clientName: string;
  ticketNumber: string;
  systemType: string; // Agora é texto livre
  projectLeader: string;
  createdAt: Date;
  updatedAt: Date;
  lastUpdateBy: string;
  nextFollowUpDate?: Date;
  
  healthScore?: "ok" | "warning" | "critical";
  daysSinceUpdate?: number;

  stages: {
    infra: InfraStage;
    adherence: AdherenceStage;
    environment: EnvironmentStage;
    conversion: ConversionStage;
    implementation: ImplementationStage;
    post: PostStage;
  };

  timeline: TimelineEvent[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Agora é texto livre
  avatar?: string;
  createdAt: Date;
}
