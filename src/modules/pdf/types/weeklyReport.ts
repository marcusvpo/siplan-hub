/**
 * Tipos de dados estruturados para o Relatório Executivo Semanal de Implantação
 */

export interface WeeklyReportReferencePeriod {
  startDate: string; // DD/MM/AAAA
  endDate: string;   // DD/MM/AAAA
  currentWeekStartDate: string; // DD/MM/AAAA (segunda-feira da semana atual)
  currentWeekEndDate: string;   // DD/MM/AAAA (domingo da semana atual)
  previousWeekStartDate: string; // DD/MM/AAAA
  previousWeekEndDate: string;   // DD/MM/AAAA
  weekNumber: number;
  year: number;
}

export interface WeeklyReportKpis {
  totalActiveProjects: number;
  advancedStagesLastWeekCount: number;
  startingPhase1ThisWeekCount: number;
  startingPostThisWeekCount: number;
  infraGargalosCount: number;
  environmentUrgentCount: number;
  activeConversionsCount: number;
  criticalHealthCount: number;
}

export interface AdvancedProjectItem {
  id: string;
  clientName: string;
  ticketNumber?: string;
  systemType?: string;
  currentStage: string;
  updatedAt: string;
  responsible?: string;
}

export interface StartingPhase1Item {
  id: string;
  clientName: string;
  ticketNumber?: string;
  startDate: string;
  endDate: string;
  responsible: string;
  systemType: string;
  status: string;
}

export interface InfraGargaloItem {
  id: string;
  clientName: string;
  ticketNumber?: string;
  startDate: string;
  daysWaiting: number;
  responsible: string;
  blockingReason?: string;
  observations?: string;
}

export interface EnvironmentDeadlineItem {
  id: string;
  clientName: string;
  ticketNumber?: string;
  targetDate: string;
  daysRemaining: number;
  urgencyLevel: "done" | "in_progress" | "safe" | "warning" | "danger" | "critical" | "no_date";
  responsible: string;
  phase1StartDate?: string;
}

export interface DeploymentScheduleItem {
  id: string;
  clientName: string;
  ticketNumber?: string;
  startDate: string;
  endDate: string;
  responsible: string;
  systemType: string;
  status: string;
  isConfirmed: boolean;
}

export interface ConversionQueueAnalystGroup {
  analystName: string;
  totalActive: number;
  inProgress: number;
  waiting: number;
  homologation: number;
  items: Array<{
    clientName: string;
    status: string;
    priority: number;
    estimatedCompletion?: string;
  }>;
}

export interface StartingPostImplantationItem {
  id: string;
  clientName: string;
  ticketNumber?: string;
  phase1EndDate: string;
  postStartDate: string;
  postEndDate: string;
  responsible: string;
  systemType?: string;
}

export interface PlatformChangelogItem {
  title: string;
  message: string;
  date: string;
  type: string;
}

export interface AiExecutiveSummary {
  overview: string;
  highlights: string[];
  criticalRisks: string[];
  strategicActions: string[];
}

export interface WeeklyExecutiveReportData {
  title: string;
  subtitle: string;
  generatedAt: string;
  generatedBy: string;
  referencePeriod: WeeklyReportReferencePeriod;
  kpis: WeeklyReportKpis;
  aiExecutiveSummary: AiExecutiveSummary;
  advancedProjects: AdvancedProjectItem[];
  startingPhase1Projects: StartingPhase1Item[];
  infraGargalos: InfraGargaloItem[];
  environmentDeadlines: EnvironmentDeadlineItem[];
  deploymentsSchedule: DeploymentScheduleItem[];
  conversionQueueGroups: ConversionQueueAnalystGroup[];
  startingPostProjects: StartingPostImplantationItem[];
  platformChangelog: PlatformChangelogItem[];
}
