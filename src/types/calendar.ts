export type CalendarViewMode = "day" | "week" | "month";

export interface CalendarMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  color: string; // Hex or Tailwind class for background
}

export interface CalendarEvent {
  id: string;
  resourceId: string; // Member ID
  title: string;
  start: Date;
  end: Date;
  type: "implementation" | "training" | "other";
  projectId?: string; // Link to real project
  clientName?: string;
  status?: "planned" | "confirmed" | "completed";
  notes?: string;
  isGhost?: boolean; // True if it's a draggable ghost card
  color?: string;
}

export const CALENDAR_MEMBERS: CalendarMember[] = [
  { id: "ricardo-vieira", name: "Ricardo Vieira", role: "Implantador", color: "bg-indigo-500" },
  { id: "rodrigo-brites", name: "Rodrigo Brites", role: "Implantador", color: "bg-blue-500" },
  { id: "bruno-matos", name: "Bruno Matos", role: "Implantador", color: "bg-green-500" },
  { id: "julio-araujo", name: "Julio Araujo", role: "Implantador", color: "bg-orange-500" },
  { id: "rodrigo-mizuno", name: "Rodrigo Mizuno", role: "Implantador", color: "bg-pink-500" },
];
