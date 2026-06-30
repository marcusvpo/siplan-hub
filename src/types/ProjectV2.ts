// Siplan Manager v2.0 - Enterprise Data Structure

export type ImplantationType = "new" | "migration_siplan" | "migration_competitor" | "upgrade";
export type Priority = "critical" | "high" | "normal" | "low";
export type ProjectType = "new" | "migration" | "upgrade" | "maintenance";
export type GlobalStatus = "in-progress" | "done" | "blocked" | "archived";
export type HealthScore = "ok" | "warning" | "critical";
export type StageStatus = "todo" | "in-progress" | "done" | "blocked" | "waiting_adjustment";
export type ProjectStatus = StageStatus;

export interface FileVersion {
  version: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
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

export interface ContentBlock {
  id: string;
  type: "heading" | "paragraph" | "list" | "callout" | "divider" | "checkbox" | "embed";
  content: string;
  checked?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RichContent {
  id: string;
  projectId: string;
  blocks: ContentBlock[];
  lastEditedBy: string;
  lastEditedAt: Date;
}

export type BlockingReason =
  | "awaiting-purchase"
  | "os-upgrade"
  | "network-unstable"
  | "legacy-conflict"
  | "client-access"
  | "other";

export type ConversionComplexity = "low" | "medium" | "high" | "very_high";
export type GapPriority = "critical" | "high" | "medium" | "low";
export type ClientSatisfaction = "very_satisfied" | "satisfied" | "neutral" | "dissatisfied";

export interface ProjectTramite {
  id: string;
  project_id: string;
  descricao_tramite: string;
  responsavel_atividade: string | null;
  etapa_projeto: string | null;
  data_tramite: string;
}

export interface ProjectV2 {
  // Metadados Básicos
  id: string;
  externalId?: string;
  clientName: string;
  ticketNumber: string;

  // Integração 0800
  TituloChamado?: string;
  descricaotramite?: string;
  ResponsavelAtividade?: string;
  EtapasProjeto?: string;

  // Dados do Projeto
  opNumber?: number;
  salesOrderNumber?: number;
  soldHours?: number;
  workHours?: number;
  legacySystem?: string;
  specialty?: string;

  // Tipos & Categoria
  systemType: string;
  products?: string[];
  implantationType: ImplantationType;
  tags: string[];
  priority: Priority;
  projectType: ProjectType;

  // Status & Health
  healthScore: HealthScore;
  globalStatus: GlobalStatus;
  overallProgress: number; // 0-100

  // Informações Gerais
  description?: string;
  specialConsiderations?: string;
  contractValue?: number;
  paymentMethod?: string;
  notes?: RichContent;
  files?: ProjectFile[];

  relatedTickets?: { name: string; number: string }[];

  // Pessoas
  projectLeader: string;
  clientPrimaryContact?: string;
  clientEmail?: string;
  clientPhone?: string;
  responsibleInfra?: string;
  responsibleAdherence?: string;
  responsibleEnvironment?: string;
  responsibleConversion?: string;
  responsibleImplementation?: string;
  responsiblePost?: string;

  // Datas
  createdAt: Date;
  startDateActual?: Date;
  endDateActual?: Date;
  lastUpdatedAt: Date;
  lastUpdatedBy: string;

  // Estágios
  stages: {
    infra: InfraStageV2;
    adherence: AdherenceStageV2;
    environment: EnvironmentStageV2;
    conversion: ConversionStageV2;
    modelosEditor?: ModelosEditorStageV2;
    implementation: ImplementationStageV2;
    post: PostStageV2;
  };

  // Soft Deletes
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  isArchived: boolean;
  archivedAt?: Date;

  // Customização
  customFields?: Record<string, unknown>;
  auditLog?: AuditEntry[];
  tramites?: ProjectTramite[];
  timeline?: TimelineEventV2[];
}

export interface ServerInfo {
  hostname?: string;
  brandModel?: string;
  virtualized?: "Sim" | "Não" | boolean;
  processor?: string;
  cores?: string;
  memory?: string;
  disk?: string;
  spaceOrion?: string;
  os?: string;
  antivirus?: string;
  network?: string;
  backup?: string;
  observations?: string;
  environment?: string;
  networkFailover?: string;
}

export interface WorkstationInfo {
  id?: string | number;
  hostname?: string;
  sector?: string;
  user?: string;
  processor?: string;
  generation?: string;
  memory?: string;
  disk?: string;
  network?: string;
  os?: string;
  antivirus?: string;
  meetsRequirements?: "Sim" | "Não" | boolean;
}

export interface InfraStageV2 {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;
  blockingReason?: BlockingReason;
  workstationsStatus?: "Adequado" | "Parcialmente Adequado" | "Inadequado" | "Aguardando Adequação";
  serverStatus?: "Adequado" | "Parcialmente Adequado" | "Inadequado" | "Aguardando Adequação";
  workstationsCount?: number;
  technicalNotes?: string;
  observations?: string;
  approvedByInfra?: boolean;
  serverInUse?: string;
  serverNeeded?: string;
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
  servers?: ServerInfo[];
  workstations?: WorkstationInfo[];
  publicLinkClosed?: boolean;
}

export interface AdherenceStageV2 {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;
  hasProductGap: boolean;
  gapDescription?: string;
  devTicket?: string;
  devEstimatedDate?: Date;
  gapPriority?: GapPriority;
  analysisComplete: boolean;
  conformityStandards?: string;
  observations?: string;
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
}

export interface EnvironmentStageV2 {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;
  osVersion?: string;
  version?: string;
  realDate?: Date;
  approvedByInfra: boolean;
  testAvailable: boolean;
  preparationChecklist?: string;
  observations?: string;
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
}

export interface ConversionStageV2 {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;

  homologationStatus?: "Adequado" | "Parcialmente Adequado" | "Inadequado" | "Aguardando Adequação";
  homologationResponsible?: string;
  homologationFinishedAt?: Date;
  sentAt?: Date;
  finishedAt?: Date;

  complexity?: ConversionComplexity;
  dataVolumeGb?: number;
  toolUsed?: string;
  homologationDate?: Date;
  deviations?: string;
  observations?: string;
  homologationComplete?: boolean;
  homologationWorkflowStatus?: string;
  recordCount?: number;
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  uploadedAt: string;
  isDone?: boolean;
}

export interface ModelosEditorStageV2 {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;
  observations?: string;
  sentFiles?: AttachedFile[];
  availableFiles?: AttachedFile[];
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
}

export interface ImplementationPhase {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;
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
  observations?: string;
}

export interface ImplementationStageV2 {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;

  phase1: ImplementationPhase;
  phase2: ImplementationPhase;

  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
  observations?: string; // General observations
}

export interface PostStageV2 {
  status: StageStatus;
  responsible?: string;
  startDate?: Date;
  endDate?: Date;
  supportPeriodDays?: number;
  supportEndDate?: Date;
  benefitsDelivered?: string;
  challengesFound?: string;
  roiEstimated?: string;
  clientSatisfaction?: ClientSatisfaction;
  recommendations?: string;
  followupNeeded: boolean;
  followupDate?: Date;
  observations?: string;
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
}

export interface TimelineEventV2 {
  id: string;
  projectId: string;
  type:
  | "field_change"
  | "status_change"
  | "file_upload"
  | "comment"
  | "bulk_edit"
  | "project_created"
  | "project_deleted";
  timestamp: Date;
  author: string;
  authorName: string;

  // Field Change
  fieldName?: string;
  fieldType?: string;
  oldValue?: unknown;
  newValue?: unknown;

  // Status Change
  statusStage?: string;
  oldStatus?: string;
  newStatus?: string;

  // File
  fileName?: string;
  fileSize?: number;
  fileType?: string;

  // Comment
  message?: string;

  // Bulk Edit
  affectedFields?: string[];
  affectedProjects?: number;

  visibility: "public" | "archived";
}


export interface ChecklistItem {
  id: string;
  projectId: string;
  label: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  description?: string;
}

export interface KPIData {
  totalProjects: number;
  criticalProjects: number;
  blockedProjects: number;
  atRiskProjects: number;
  completedProjects: number;
  completionRate: number;
  avgTotalTime: number;

  successRate?: number;
  avgStageTime?: {
    infra: number;
    adherence: number;
    conversion: number;
    implementation: number;
  };
  trend?: {
    value: number;
    direction: "up" | "down" | "stable";
  };
}

export type ViewMode = "table" | "kanban" | "calendar" | "gantt";

export interface AuditEntry {
  id: string;
  projectId: string;
  action: string;
  changedBy: string;
  changedAt: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}
