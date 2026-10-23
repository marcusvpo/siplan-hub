import { ProjectV2 } from "@/types/ProjectV2";

export interface EnrichedInfraProject {
  project: ProjectV2;
  index: number;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  specialty?: string;
  infraStatus: "in-progress" | "blocked";
  serverStatus?: string;
  workstationsStatus?: string;
  statusFormatted: string;
  existingObservations: string;
  projectGeneralNotes: string;
  responsibleInfra: string;
  phase1: {
    hasDates: boolean;
    dateType: "Data Confirmada" | "Data Prevista" | null;
    isConfirmed: boolean;
    startDate: string | null;
    endDate: string | null;
    responsible: string | null;
    observations: string | null;
    status: string;
  };
}

export type InfraFilterType =
  | "all"
  | "blocked"
  | "in-progress"
  | "phase1-scheduled"
  | "phase1-none"
  | "with-notes";
