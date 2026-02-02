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
  homologationSentAt?: Date;
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

// Labels and Colors
export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  awaiting_homologation: 'Aguard. Homologação',
  homologation_issues: 'Inconsistências',
  approved: 'Aprovado',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

export const QUEUE_STATUS_COLORS: Record<QueueStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  awaiting_homologation: 'bg-purple-100 text-purple-700 border-purple-300',
  homologation_issues: 'bg-orange-100 text-orange-700 border-orange-300',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  done: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  data_mismatch: 'Dados Divergentes',
  missing_data: 'Dados Faltantes',
  format_error: 'Formato Incorreto',
  duplicates: 'Duplicidade',
  other: 'Outros',
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export const ISSUE_SEVERITY_COLORS: Record<IssueSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-slate-100 text-slate-700 border-slate-300',
};

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  blocked: 'Bloqueado',
};

export const MODULE_COMPLEXITY_LABELS: Record<ModuleComplexity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export const DATA_VOLUME_LABELS: Record<DataVolume, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
};

export const TEAM_AREA_LABELS: Record<TeamArea, string> = {
  implementation: 'Implantação',
  conversion: 'Conversão',
  commercial: 'Comercial',
  support: 'Suporte',
};

// Common module names for conversion
export const COMMON_MODULES = [
  'clientes',
  'fornecedores',
  'produtos',
  'servicos',
  'contas_pagar',
  'contas_receber',
  'estoque',
  'notas_fiscais',
  'pedidos',
  'orcamentos',
  'usuarios',
  'plano_contas',
  'centros_custo',
  'outros',
] as const;

export const MODULE_LABELS: Record<string, string> = {
  clientes: 'Clientes',
  fornecedores: 'Fornecedores',
  produtos: 'Produtos',
  servicos: 'Serviços',
  contas_pagar: 'Contas a Pagar',
  contas_receber: 'Contas a Receber',
  estoque: 'Estoque',
  notas_fiscais: 'Notas Fiscais',
  pedidos: 'Pedidos',
  orcamentos: 'Orçamentos',
  usuarios: 'Usuários',
  plano_contas: 'Plano de Contas',
  centros_custo: 'Centros de Custo',
  outros: 'Outros',
};
