import { CalendarControls } from "@/components/calendar/CalendarControls";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { DraggableTeamMember } from "@/components/calendar/DraggableTeamMember";
import { useCalendarStore } from "@/stores/calendarStore";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { CalendarEvent, CALENDAR_MEMBERS } from "@/types/calendar";
import { startOfDay } from "date-fns";
import { useProjects } from "@/hooks/useProjects";
import { ProjectV2 } from "@/types/ProjectV2";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVacations } from "@/hooks/useVacations";
import { useToast } from "@/hooks/use-toast";

function TrashDroppable() {
  const { setNodeRef, isOver } = useDroppable({
    id: "trash",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full border transition-colors ml-auto",
        isOver
          ? "bg-red-100 border-red-500 text-red-600 scale-110"
          : "bg-background border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted",
      )}
    >
      <Trash2 className="w-5 h-5" />
    </div>
  );
}

import { DeploymentDetailsDialog } from "@/components/ProjectManagement/DeploymentDetailsDialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Server, Hash, Rocket } from "lucide-react";

export default function Calendar() {
  const {
    isInteractiveMode,
    addInteractiveEvent,
    updateInteractiveEvent,
    removeInteractiveEvent,
  } = useCalendarStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const { projects, isLoading } = useProjects();
  const { vacations } = useVacations();

  // Fetch and Transform Real Data
  useEffect(() => {
    if (!projects || isLoading) return;

    const realEvents: CalendarEvent[] = [];

    const findMember = (name: string) => {
      if (!name) return undefined;
      const n = name.toLowerCase().trim();
      return CALENDAR_MEMBERS.find((m) => {
        const mName = m.name.toLowerCase();
        return mName === n || mName.includes(n) || n.includes(mName);
      });
    };

    const getFallbackColor = (name: string) => {
      const colors = [
        "bg-indigo-500",
        "bg-blue-500",
        "bg-green-500",
        "bg-orange-500",
        "bg-pink-500",
        "bg-purple-500",
        "bg-cyan-500",
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    projects.forEach((project: ProjectV2) => {
      // Implementation Phase 1
      const implStage = project.stages.implementation;
      if (
        implStage?.phase1?.startDate &&
        implStage?.phase1?.endDate &&
        implStage?.phase1?.responsible
      ) {
        const responsible = implStage.phase1.responsible;
        const member = findMember(responsible);
        const color = member ? member.color : getFallbackColor(responsible);

        realEvents.push({
          id: `real-${project.id}-p1`,
          resourceId: member?.id || "unknown",
          title: `Implantação: ${project.clientName}`,
          clientName: project.clientName,
          start: new Date(implStage.phase1.startDate),
          end: new Date(implStage.phase1.endDate),
          type: "implementation",
          status: "confirmed",
          projectId: project.id,
          notes: implStage.phase1.observations,
          color,
        });
      }

      // Implementation Phase 2
      if (
        implStage?.phase2?.startDate &&
        implStage?.phase2?.endDate &&
        implStage?.phase2?.responsible
      ) {
        const responsible = implStage.phase2.responsible;
        const member = findMember(responsible);
        const color = member ? member.color : getFallbackColor(responsible);

        realEvents.push({
          id: `real-${project.id}-p2`,
          resourceId: member?.id || "unknown",
          title: `Treinamento: ${project.clientName}`,
          clientName: project.clientName,
          start: new Date(implStage.phase2.startDate),
          end: new Date(implStage.phase2.endDate),
          type: "training",
          status: "confirmed",
          projectId: project.id,
          notes: implStage.phase2.observations,
          color,
        });
      }

      // Adherence Analysis
      const adherenceStage = project.stages.adherence;
      if (adherenceStage?.endDate && adherenceStage?.responsible) {
        const responsible = adherenceStage.responsible;
        const member = findMember(responsible);
        // Use member color or a fallback amber color for Adherence
        const color = member ? member.color : "bg-amber-500";

        // Adherence doesn't usually have a range, maybe just the end date (deadline)?
        // Or if it has startDate, use it. If not, use endDate as start.
        const start = adherenceStage.startDate
          ? new Date(adherenceStage.startDate)
          : new Date(adherenceStage.endDate);
        const end = new Date(adherenceStage.endDate);

        realEvents.push({
          id: `real-${project.id}-adherence`,
          resourceId: member?.id || "unknown",
          title: `Aderência: ${project.clientName}`,
          clientName: project.clientName,
          start,
          end,
          type: "adherence",
          status: "confirmed",
          projectId: project.id,
          notes: adherenceStage.observations,
          color: "bg-amber-500", // Enforce specific color for event type clarity? Or keep member color? User asked for amber-500.
        });
      }

      // Homologation (Conversion)
      const conversionStage = project.stages.conversion;
      if (
        conversionStage?.finishedAt && // "Agendado Para" maps to finishedAt
        conversionStage?.homologationResponsible
      ) {
        const responsible = conversionStage.homologationResponsible;
        const member = findMember(responsible);

        // Homologation date seems to be a single date point "Agendado Para"
        const date = new Date(conversionStage.finishedAt);

        realEvents.push({
          id: `real-${project.id}-homologation`,
          resourceId: member?.id || "unknown",
          title: `Homologação: ${project.clientName}`,
          clientName: project.clientName,
          start: date,
          end: date,
          type: "homologation",
          status: "confirmed",
          projectId: project.id,
          notes: conversionStage.observations,
          color: "bg-violet-500", // User asked for violet-500
        });
      }
    });

    // Process Vacations
    if (vacations) {
      vacations.forEach((vacation) => {
        const member = CALENDAR_MEMBERS.find(
          (m) => m.id === vacation.implantador_id,
        );

        realEvents.push({
          id: `vacation-${vacation.id}`,
          resourceId: vacation.implantador_id || "unknown",
          title: `Férias: ${vacation.implantador_name}`,
          start: new Date(vacation.start_date + "T12:00:00"), // Noon to avoid timezone issues
          end: new Date(vacation.end_date + "T12:00:00"),
          type: "vacation",
          status: "confirmed",
          notes: vacation.description || undefined,
          color: "bg-red-500", // User asked for red
          isGhost: false,
        });
      });
    }

    useCalendarStore.getState().setRealEvents(realEvents);
  }, [projects, isLoading, vacations]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragStart = (event: any) => {
    setActiveDragItem(event.active.data.current);
  };

  const { toast } = useToast();
  const { checkVacationConflict } = useVacations();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    // Handle Delete Drop
    if (over.id === "trash") {
      if (active.data.current?.event) {
        removeInteractiveEvent(active.data.current.event.id);
      }
      return;
    }

    // The droppable ID is now the Date string (yyyy-MM-dd)
    const targetDateStr = over.id as string;
    const targetDate = new Date(targetDateStr + "T12:00:00"); // Avoid timezone issues by picking noon

    // If dragging new member allocation
    if (active.data.current?.isNew) {
      const memberId = active.data.current.memberId;

      const conflict = checkVacationConflict(memberId, targetDate);
      if (conflict) {
        toast({
          title: "Implantador em férias",
          description: `Não é possível agendar nesta data. ${conflict.implantador_name} está de férias.`,
          variant: "destructive",
        });
        return;
      }

      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        resourceId: memberId,
        title: "Nova Alocação",
        type: "implementation",
        start: targetDate,
        end: targetDate, // Default to 1 day
        status: "planned",
        isGhost: false,
      };
      addInteractiveEvent(newEvent);
    }
    // If moving existing event
    else {
      const existingEvent = active.data.current?.event as CalendarEvent;
      if (existingEvent) {
        // Calculate duration to preserve it
        const duration =
          existingEvent.end.getTime() - existingEvent.start.getTime();
        const newEnd = new Date(targetDate.getTime() + duration);

        const conflict = checkVacationConflict(
          existingEvent.resourceId,
          targetDate,
        );
        if (conflict) {
          toast({
            title: "Implantador em férias",
            description:
              "Não é possível mover para esta data. O implantador responsável está de férias.",
            variant: "destructive",
          });
          return;
        }

        updateInteractiveEvent({
          ...existingEvent,
          start: targetDate,
          end: newEnd,
        });
      }
    }
  };

  const activeProject = selectedEvent?.projectId
    ? projects.find((p) => p.id === selectedEvent.projectId)
    : null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <CalendarControls />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Team Dock (Drag Source) */}
          {isInteractiveMode && (
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/20 border-b shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
                  Equipe Disponível:
                </span>
                {CALENDAR_MEMBERS.map((member) => (
                  <DraggableTeamMember key={member.id} member={member} />
                ))}
              </div>

              <TrashDroppable />
            </div>
          )}

          {/* Main Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <CalendarGrid onEventClick={(evt) => setSelectedEvent(evt)} />
          </div>
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <div className="opacity-80 rotate-2 cursor-grabbing">
              {activeDragItem.isNew ? (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xl bg-background ring-2 ring-primary`}
                >
                  <span className="text-sm font-medium">Nova Alocação</span>
                </div>
              ) : (
                <div className="px-2 py-1 rounded-md bg-primary text-white text-xs font-medium shadow-xl">
                  {activeDragItem.event?.title}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Details Dialog */}
      {/* Details Dialog */}
      {activeProject ? (
        <DeploymentDetailsDialog
          project={activeProject}
          open={!!selectedEvent}
          onOpenChange={(v) => !v && setSelectedEvent(null)}
          customTitle={selectedEvent?.title}
          customDescription={`Agendamento: ${
            selectedEvent?.type === "implementation"
              ? "Implantação (Fase 1)"
              : selectedEvent?.type === "training"
                ? "Treinamento (Fase 2)"
                : "Evento"
          }`}
          customStartDate={selectedEvent?.start}
          customEndDate={selectedEvent?.end}
          customResponsible={
            CALENDAR_MEMBERS.find((m) => m.id === selectedEvent?.resourceId)
              ?.name || activeProject.stages.implementation.phase1?.responsible
          }
        />
      ) : (
        <Dialog
          open={!!selectedEvent}
          onOpenChange={(v) => !v && setSelectedEvent(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEvent && (
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      selectedEvent.color || "bg-primary",
                    )}
                  />
                )}
                {selectedEvent?.clientName || selectedEvent?.title}
              </DialogTitle>
              <DialogDescription>Detalhes do Agendamento</DialogDescription>
            </DialogHeader>

            <div className="py-4 text-center text-muted-foreground">
              <p>Este é um evento manual sem vínculo direto com projeto.</p>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg text-left">
                <p className="text-sm font-medium text-foreground mb-1">
                  Notas:
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedEvent?.notes || "Sem notas."}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
