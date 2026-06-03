// Conversion Area Types v2.0

export type QueueStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'awaiting_homologation' 
  | 'homologation_issues' 
  | 'approved' 
  | 'done' 
  | 'cancelled';

export type HomologationStatus = 'pending' | 'in_review' | 'approved' | 'issues_found';
export type NotificationType = 'new_demand' | 'assignment' | 'status_change' | 'issue_reported' | 'client_response' | 'conversion_complete' | 'homologation_approved' | 'homologation_issues' | 'mention';
export type TeamArea = 'implementation' | 'conversion' | 'commercial' | 'support';
export type IssueCategory = 'data_mismatch' | 'missing_data' | 'format_error' | 'duplicates' | 'other';
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type MappingStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type ModuleComplexity = 'low' | 'medium' | 'high';
export type DataVolume = 'small' | 'medium' | 'large';

export interface Notification {
  id: string;
  userId?: string;
  team?: TeamArea;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
  projectName?: string;
}

export interface ConversionQueueItem {
  id: string;
  projectId: string;
  sentBy?: string;
  sentByName: string;
  sentAt: Date;
  queueStatus: QueueStatus;
  priority: number;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Date;
  startedAt?: Date;
  estimatedCompletion?: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Homologation fields
  homologationDeadline?: Date;
  homologationAnalyst?: string;
  homologationAnalystName?: string;
  homologationStatus: HomologationStatus;
  // Joined project data
  clientName?: string;
  ticketNumber?: string;
  systemType?: string;
  legacySystem?: string;
  conversionComplexity?: string;
  conversionDataVolumeGb?: number;
}

export interface ConversionIssue {
  id: string;
  projectId: string;
  homologationId?: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: 'open' | 'in_analysis' | 'resolved';
  affectedTable?: string;
  affectedRecords?: number;
  reportedBy?: string;
  reportedByName: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  clientName?: string;
}

export interface ConversionMapping {
  id: string;
  projectId: string;
  legacySystem: string;
  moduleName: string;
  dataVolume: DataVolume;
  complexity: ModuleComplexity;
  status: MappingStatus;
  responsible?: string;
  responsibleName?: string;
  observations?: string;
  estimatedHours?: number;
  actualHours?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  clientName?: string;
}

export interface ConversionActivityLog {
  id: string;
  queueId?: string;
  projectId?: string;
  action: string;
  fromValue?: string;
  toValue?: string;
  performedBy?: string;
  performedByName?: string;
  notes?: string;
  createdAt: Date;
}

export interface TeamAreaInfo {
  id: string;
  name: TeamArea;
  label: string;
  color?: string;
  icon?: string;
  active: boolean;
  createdAt: Date;
}

export interface TeamMemberWithArea {
  id: string;
  name: string;
  email: string;
  role: string;
  area: TeamArea;
  avatarUrl?: string;
  active: boolean;
}

export interface ConversionKPIs {
  pending: number;
  inProgress: number;
  awaitingHomologation: number;
  homologationIssues: number;
  approved: number;
  completedThisMonth: number;
  avgDaysInQueue: number;
  myQueueCount: number;
}

export const TEAM_AREA_LABELS: Record<TeamArea, string> = {
  implementation: 'Implantação',
  conversion: 'Conversão',
  commercial: 'Comercial',
  support: 'Suporte',
};

