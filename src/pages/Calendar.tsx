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
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { CalendarEvent, CALENDAR_MEMBERS } from "@/types/calendar";
import { startOfDay } from "date-fns";
import { useProjects } from "@/hooks/useProjects";
import { ProjectV2 } from "@/types/ProjectV2";

const Calendar = () => {
  const { isInteractiveMode, addInteractiveEvent, updateInteractiveEvent } =
    useCalendarStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const { projects, isLoading } = useProjects();

  // Fetch and Transform Real Data
  useEffect(() => {
    if (!projects || isLoading) return;

    const realEvents: CalendarEvent[] = [];

    projects.forEach((project: ProjectV2) => {
      // Implementation Phase 1
      const implStage = project.stages.implementation;
      if (
        implStage?.phase1?.startDate &&
        implStage?.phase1?.endDate &&
        implStage?.phase1?.responsible
      ) {
        const member = CALENDAR_MEMBERS.find(
          (m) =>
            m.name.toLowerCase() === implStage.phase1.responsible?.toLowerCase()
        );

        if (member) {
          realEvents.push({
            id: `real-${project.id}-p1`,
            resourceId: member.id,
            title: `Implantação: ${project.clientName}`,
            clientName: project.clientName,
            start: new Date(implStage.phase1.startDate),
            end: new Date(implStage.phase1.endDate),
            type: "implementation",
            status: "confirmed",
            projectId: project.id,
            notes: implStage.phase1.observations,
          });
        }
      }

      // Implementation Phase 2
      if (
        implStage?.phase2?.startDate &&
        implStage?.phase2?.endDate &&
        implStage?.phase2?.responsible
      ) {
        const member = CALENDAR_MEMBERS.find(
          (m) =>
            m.name.toLowerCase() === implStage.phase2.responsible?.toLowerCase()
        );

        if (member) {
          realEvents.push({
            id: `real-${project.id}-p2`,
            resourceId: member.id,
            title: `Treinamento: ${project.clientName}`,
            clientName: project.clientName,
            start: new Date(implStage.phase2.startDate),
            end: new Date(implStage.phase2.endDate),
            type: "training",
            status: "confirmed",
            projectId: project.id,
            notes: implStage.phase2.observations,
          });
        }
      }
    });

    useCalendarStore.getState().setRealEvents(realEvents);
  }, [projects, isLoading]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragStart = (event: any) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    // The droppable ID is now the Date string (yyyy-MM-dd)
    const targetDateStr = over.id as string;
    const targetDate = new Date(targetDateStr + "T12:00:00"); // Avoid timezone issues by picking noon

    // If dragging new member allocation
    if (active.data.current?.isNew) {
      const memberId = active.data.current.memberId;
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

        updateInteractiveEvent({
          ...existingEvent,
          start: targetDate,
          end: newEnd,
        });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-background overflow-hidden">
        <CalendarControls />

        {/* Team Dock (Drag Source) */}
        {isInteractiveMode && (
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/20 border-b shrink-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
              Equipe Disponível:
            </span>
            {CALENDAR_MEMBERS.map((member) => (
              <DraggableTeamMember key={member.id} member={member} />
            ))}
          </div>
        )}

        {/* Main Grid */}
        <div className="flex-1 p-4 overflow-hidden">
          <CalendarGrid />
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
      </div>
    </DndContext>
  );
};

export default Calendar;
