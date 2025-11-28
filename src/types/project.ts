export type ImplantationType = "new" | "migration_siplan" | "migration_competitor" | "upgrade";
export type Priority = "critical" | "high" | "normal" | "low";
export type GlobalStatus = "todo" | "in-progress" | "done" | "blocked" | "archived";
export type HealthScore = "ok" | "warning" | "critical";
export type StageStatus = "todo" | "in-progress" | "done" | "blocked";
export type ProjectStatus = StageStatus;

export interface Project {
  // Básicos
  id: string;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  implantationType: ImplantationType;
  
  // Status
  healthScore: HealthScore;
  globalStatus: GlobalStatus;
  overallProgress: number; // 0-100
  
  // Pessoas
  projectLeader: string;
  clientPrimaryContact: string;
  clientEmail?: string;
  clientPhone?: string;
  responsibleInfra: string;
  responsibleAdherence: string;
  responsibleConversion: string;
  responsibleImplementation: string;
  responsiblePost: string;
  
  // Datas (Consolidado)
  startDatePlanned?: Date;
  endDatePlanned?: Date;
  startDateActual?: Date;
  endDateActual?: Date;
  nextFollowUpDate?: Date;
  createdAt: Date;
  lastUpdatedAt: Date;
  lastUpdatedBy: string;
  
  // Estágios
  stages: {
    infra: InfraStage;
    adherence: AdherenceStage;
    environment: EnvironmentStage;
    conversion: ConversionStage;
    implementation: ImplementationStage;
    post: PostStage;
  };
  
  // Dados Sociais
  timeline: TimelineEvent[];
  auditLog: AuditEntry[];
  files: ProjectFile[];
  
  // Notas Rich
  notes: RichContent;
  
  // Metadados
  tags: string[];
  priority: Priority;
  customFields?: Record<string, unknown>;
}

export interface BaseStage {
  status: StageStatus;
  responsible: string;
  startDate?: Date;
  endDate?: Date;
  observations: string;
  [key: string]: unknown;
}

export interface InfraStage extends BaseStage {
  blockingReason?: string;
  serverInUse?: string;
  serverNeeded?: string;
  approvedByInfra?: boolean;
  technicalNotes?: string;
}

export interface AdherenceStage extends BaseStage {
  hasProductGap?: boolean;
  gapDescription?: string;
  devTicket?: string;
  devEstimatedDate?: Date;
  gapPriority?: string;
  analysisComplete?: boolean;
  conformityStandards?: string;
}

export interface EnvironmentStage extends BaseStage {
  osVersion?: string;
  version?: string;
  realDate?: Date;
  approvedByInfra?: boolean;
  testAvailable?: boolean;
  preparationChecklist?: string;
}

export interface ConversionStage extends BaseStage {
  sourceSystem?: string;
  complexity?: string;
  recordCount?: number;
  dataVolumeGb?: number;
  toolUsed?: string;
  homologationComplete?: boolean;
  homologationDate?: Date;
  deviations?: string;
}

export interface ImplementationStage extends BaseStage {
  remoteInstallDate?: Date;
  switchType?: string;
  switchStartTime?: string;
  switchEndTime?: string;
  trainingStartDate?: Date;
  trainingEndDate?: Date;
  trainingType?: string;
  trainingLocation?: string;
  participantsCount?: number;
  clientFeedback?: string;
  acceptanceStatus?: string;
}

export interface PostStage extends BaseStage {
  supportPeriodDays?: number;
  supportEndDate?: Date;
  benefitsDelivered?: string;
  challengesFound?: string;
  roiEstimated?: string;
  clientSatisfaction?: string;
  recommendations?: string;
  followupNeeded?: boolean;
  followupDate?: Date;
}

export type Stage = BaseStage;

export interface RichContent {
  id: string;
  projectId: string;
  blocks: ContentBlock[];
  lastEditedBy: string;
  lastEditedAt: Date;
}

export interface ContentBlock {
  id: string;
  type: "heading" | "paragraph" | "list" | "callout" | "divider" | "checkbox" | "embed";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: "comment" | "file_upload" | "status_change" | "mention";
  author: string;
  authorName: string;
  message?: string;
  timestamp: Date;
  visibility: "public" | "archived";
}

export interface AuditEntry {
  id: string;
  projectId: string;
  author: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  versions: FileVersion[];
}

export interface FileVersion {
  version: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}
