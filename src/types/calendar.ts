import type { ProjectV2 } from "@/types/ProjectV2";

export type CalendarViewMode = "quarter" | "year" | "month" | "week" | "day";

export type CalendarSystemCategory = "reg" | "pro" | "tn" | "shared" | "other";

export type CalendarDisplayTab = "timeline" | "concurrency" | "backlog";

export type CalendarSystemFilter = "all" | "reg" | "pro" | "tn";

export type CalendarStatusFilter =
  | "all"
  | "confirmed"
  | "planned"
  | "in-progress"
  | "done";

export interface CalendarMember {
  id: string;
  name: string;
  initials?: string;
  avatar?: string;
  role: string;
  color: string; // Hex or Tailwind class for background
  defaultSystem?: string;
}

export interface CalendarEvent {
  id: string;
  resourceId: string; // Member ID
  title: string;
  start: Date;
  end: Date;
  type:
    | "implementation"
    | "training"
    | "adherence"
    | "homologation"
    | "vacation"
    | "other";
  projectId?: string; // Link to real project
  clientName?: string;
  responsibleName?: string;
  status?: "planned" | "confirmed" | "completed";
  notes?: string;
  isGhost?: boolean; // True if it's a draggable ghost card
  color?: string;
  ticketNumber?: string;
  systemType?: string;
  systemCategory?: CalendarSystemCategory;
  allResponsibles?: string[];
  isShared?: boolean;
  isConfirmed?: boolean;
  stageStatus?: "todo" | "in-progress" | "done" | "blocked";
  observationsList?: string[];
  trainingLocation?: string;
  soldHours?: number;
  specialty?: string;
  hasVacationConflict?: boolean;
  vacationConflictText?: string;
  vacationId?: string;
}

export interface UnscheduledPhase1Project {
  project: ProjectV2;
  projectId: string;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  systemCategory: CalendarSystemCategory;
  specialty?: string;
  soldHours?: number;
  responsibleRaw: string;
  resolvedMembers: CalendarMember[];
  allResponsibles: string[];
  isShared: boolean;
  isConfirmed: boolean;
  stageStatus: "todo" | "in-progress" | "done" | "blocked";
  cleanObservations: string;
  observationsList: string[];
  trainingLocation?: string;
  priority: ProjectV2["priority"];
  globalStatus: ProjectV2["globalStatus"];
}

export const CALENDAR_MEMBERS: CalendarMember[] = [
  {
    id: "julio-araujo",
    name: "Julio Araujo",
    initials: "JA",
    role: "Especialista Orion REG",
    color: "bg-emerald-600",
    defaultSystem: "Orion REG",
  },
  {
    id: "rodrigo-mizuno",
    name: "Rodrigo Mizuno",
    initials: "RM",
    role: "Especialista Orion PRO",
    color: "bg-blue-600",
    defaultSystem: "Orion PRO",
  },
  {
    id: "rodrigo-brites",
    name: "Rodrigo Brites",
    initials: "RB",
    role: "Especialista Orion PRO & TN",
    color: "bg-blue-700",
    defaultSystem: "Orion PRO & TN",
  },
  {
    id: "ricardo-vieira",
    name: "Ricardo Vieira",
    initials: "RV",
    role: "Especialista Orion TN",
    color: "bg-[#d3123f]",
    defaultSystem: "Orion TN",
  },
  {
    id: "erik-marques",
    name: "Erik Marques",
    initials: "EM",
    role: "Especialista Orion TN",
    color: "bg-rose-600",
    defaultSystem: "Orion TN",
  },
];
