export type ImplantationType = "new" | "migration_siplan" | "migration_competitor" | "upgrade";
export type Priority = "critical" | "high" | "normal" | "low";
export type GlobalStatus = "todo" | "in-progress" | "done" | "blocked" | "archived";
export type HealthScore = "ok" | "warning" | "critical";
export type StageStatus = "todo" | "in-progress" | "done" | "blocked";

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
    infra: Stage;
    adherence: Stage;
    environment: Stage;
    conversion: Stage;
    implementation: Stage;
    post: Stage;
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

export interface Stage {
  status: StageStatus;
  responsible: string;
  startDate?: Date;
  endDate?: Date;
  observations: string;
  // Campos específicos podem ser adicionados via interseção ou propriedades opcionais aqui se necessário, 
  // mas para simplificar o type base, mantemos genérico e estendemos onde preciso ou usamos Record<string, any>
  [key: string]: unknown; 
}

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
