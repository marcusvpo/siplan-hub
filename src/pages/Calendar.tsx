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
          : "bg-background border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted"
      )}
    >
      <Trash2 className="w-5 h-5" />
    </div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Server, Hash, Rocket } from "lucide-react";

export default function Calendar() {
  const { isInteractiveMode, addInteractiveEvent, updateInteractiveEvent, removeInteractiveEvent } =
    useCalendarStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { projects, isLoading } = useProjects();

  // Fetch and Transform Real Data
  useEffect(() => {
    if (!projects || isLoading) return;

    const realEvents: CalendarEvent[] = [];

    const findMember = (name: string) => {
        if (!name) return undefined;
        const n = name.toLowerCase().trim();
        return CALENDAR_MEMBERS.find(m => { 
            const mName = m.name.toLowerCase();
            return mName === n || mName.includes(n) || n.includes(mName);
        });
    };

    const getFallbackColor = (name: string) => {
        const colors = ["bg-indigo-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-purple-500", "bg-cyan-500"];
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
            color
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
            color
        });
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

  const activeProject = selectedEvent?.projectId ? projects.find(p => p.id === selectedEvent.projectId) : null;

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
          <div className="flex-1 p-4 overflow-hidden">
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
       <Dialog open={!!selectedEvent} onOpenChange={(v) => !v && setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {selectedEvent && <div className={cn("w-3 h-3 rounded-full", selectedEvent.color || "bg-primary")} />}
                    {selectedEvent?.clientName || selectedEvent?.title}
                </DialogTitle>
                <DialogDescription>
                    Detalhes do Agendamento
                </DialogDescription>
            </DialogHeader>
            
            {activeProject ? (
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Chamado
                            </span>
                            <p className="text-sm font-medium">{activeProject.ticketNumber}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                                <Server className="w-3 h-3" /> Sistema
                            </span>
                            <p className="text-sm font-medium">{activeProject.systemType}</p>
                        </div>
                         <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                                <Rocket className="w-3 h-3" /> Horas
                            </span>
                            <Badge variant="outline" className="text-xs">{activeProject.soldHours || 0}h</Badge>
                        </div>
                         <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                                <User className="w-3 h-3" /> Responsável
                            </span>
                            <p className="text-sm font-medium truncate" title={selectedEvent?.title.split(':')[0] || "N/A"}>
                                {/* Usually the resourceId maps to a member, but we can also use the responsible field from project if needed */}
                                {activeProject.stages.implementation.phase1?.responsible || "N/A"}
                            </p>
                        </div>
                     </div>
                     
                     {selectedEvent?.notes && (
                        <div className="pt-2 border-t">
                             <span className="text-xs text-muted-foreground font-semibold uppercase block mb-1">
                                Observações do Evento
                            </span>
                            <ScrollArea className="h-[100px] w-full rounded-md border p-2 bg-muted/30">
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                     {/* This might be JSON from RichText, if so, strip or just show simple text if possible */}
                                     {selectedEvent.notes.startsWith('{') ? "Conteúdo rico (ver detalhes do projeto)" : selectedEvent.notes}
                                </div>
                            </ScrollArea>
                        </div>
                     )}
                </div>
            ) : (
                <div className="py-4 text-center text-muted-foreground">
                    <p>Informações detalhadas do projeto não encontradas.</p>
                    <p className="text-xs mt-2 opacity-70">ID: {selectedEvent?.projectId}</p>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
