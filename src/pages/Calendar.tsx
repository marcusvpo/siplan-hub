import { CalendarControls } from "@/components/calendar/CalendarControls";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
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
  useDroppable 
} from "@dnd-kit/core";
import { useEffect, useState, useMemo } from "react";
import { CalendarEvent, CALENDAR_MEMBERS } from "@/types/calendar";
import { 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek 
} from "date-fns";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectV2 } from "@/types/ProjectV2";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVacations } from "@/hooks/useVacations";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

function TrashDroppable() {
  const { setNodeRef, isOver } = useDroppable({
    id: "trash",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
        isOver
          ? "bg-red-500 border-red-600 text-white scale-110 shadow-lg z-50"
          : "bg-muted/50 border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200",
      )}
      title="Arraste aqui para excluir"
    >
      <Trash2 className={cn("w-5 h-5 transition-transform", isOver && "scale-115 rotate-12")} />
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
  const isInteractiveMode = useCalendarStore((state) => state.isInteractiveMode);
  const currentDate = useCalendarStore((state) => state.currentDate);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const interactiveEvents = useCalendarStore((state) => state.interactiveEvents);

  const addInteractiveEvent = useCalendarStore((state) => state.addInteractiveEvent);
  const updateInteractiveEvent = useCalendarStore((state) => state.updateInteractiveEvent);
  const removeInteractiveEvent = useCalendarStore((state) => state.removeInteractiveEvent);
  const setRealEvents = useCalendarStore((state) => state.setRealEvents);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const { projects = [], isLoading } = useProjectsV2();
  const { vacations = [] } = useVacations();

  const { hasPermission } = usePermissions();
  const canCreateEvents = hasPermission("calendar_projects", "create");
  const canEditEvents = hasPermission("calendar_projects", "edit");
  const canDeleteEvents = hasPermission("calendar_projects", "delete");

  // Memoize Transformation Logic to avoid recalculating on every render
  const realEvents = useMemo(() => {
    if (!projects || isLoading) return [];

    const events: CalendarEvent[] = [];

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

    const isValidDate = (date: Date | string | null | undefined) => {
      if (!date) return false;
      const d = new Date(date);
      return d instanceof Date && !isNaN(d.getTime());
    };

    projects.forEach((project: ProjectV2) => {
      // Helper to ensure dates are treated as local noon to avoid timezone shifts
      const toLocalDate = (dateStr: Date | string | null | undefined) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        // If it's a string from Supabase (yyyy-mm-dd), append noon
        if (typeof dateStr === 'string' && dateStr.length === 10) {
          return new Date(dateStr + "T12:00:00");
        }
        return d;
      };

      // Implementation Phase 1
      const phase1Start = toLocalDate(project.stages.implementation?.phase1?.startDate);
      const phase1End = toLocalDate(project.stages.implementation?.phase1?.endDate);
      const phase1Responsible = project.stages.implementation?.phase1?.responsible;

      if (phase1Start && phase1End && phase1Responsible) {
        const member = findMember(phase1Responsible);
        const color = member ? member.color : getFallbackColor(phase1Responsible);

        events.push({
          id: `real-${project.id}-p1`,
          resourceId: member?.id || "unknown",
          title: `Implantação: ${project.clientName}`,
          clientName: project.clientName,
          start: phase1Start,
          end: phase1End,
          type: "implementation",
          status: "confirmed",
          projectId: project.id,
          notes: project.stages.implementation.phase1.observations,
          color,
        });
      }

      // Implementation Phase 2 (Treinamento)
      const phase2Start = toLocalDate(project.stages.implementation?.phase2?.startDate);
      const phase2End = toLocalDate(project.stages.implementation?.phase2?.endDate);
      const phase2Responsible = project.stages.implementation?.phase2?.responsible;

      if (phase2Start && phase2End && phase2Responsible) {
        const member = findMember(phase2Responsible);
        const color = member ? member.color : getFallbackColor(phase2Responsible);

        events.push({
          id: `real-${project.id}-p2`,
          resourceId: member?.id || "unknown",
          title: `Treinamento: ${project.clientName}`,
          clientName: project.clientName,
          start: phase2Start,
          end: phase2End,
          type: "training",
          status: "confirmed",
          projectId: project.id,
          notes: project.stages.implementation.phase2.observations,
          color,
        });
      }

      // Adherence (Agendado Para - dia único)
      const adherenceEnd = toLocalDate(project.stages.adherence?.endDate);
      const adherenceResponsible = project.stages.adherence?.responsible;

      if (adherenceEnd && adherenceResponsible) {
        const member = findMember(adherenceResponsible);

        events.push({
          id: `real-${project.id}-adherence`,
          resourceId: member?.id || "unknown",
          title: `Aderência: ${project.clientName}`,
          clientName: project.clientName,
          start: adherenceEnd,
          end: adherenceEnd,
          type: "adherence",
          status: "confirmed",
          projectId: project.id,
          notes: project.stages.adherence.observations,
          color: "bg-amber-500",
        });
      }

      // Homologation
      const homologDate = toLocalDate(project.stages.conversion?.finishedAt);
      const homologResponsible = project.stages.conversion?.homologationResponsible;

      if (homologDate && homologResponsible) {
        const member = findMember(homologResponsible);

        events.push({
          id: `real-${project.id}-homologation`,
          resourceId: member?.id || "unknown",
          title: `Homologação: ${project.clientName}`,
          clientName: project.clientName,
          start: homologDate,
          end: homologDate,
          type: "homologation",
          status: "confirmed",
          projectId: project.id,
          notes: project.stages.conversion.observations,
          color: "bg-violet-500",
        });
      }
    });

    // Process Vacations
    if (vacations && Array.isArray(vacations)) {
      vacations.forEach((vacation) => {
        if (!vacation.start_date || !vacation.end_date) return;
        const startDate = new Date(vacation.start_date + "T12:00:00");
        const endDate = new Date(vacation.end_date + "T12:00:00");

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

        events.push({
          id: `vacation-${vacation.id}`,
          resourceId: vacation.implantador_id || "unknown",
          title: `Férias: ${vacation.implantador_name}`,
          start: startDate,
          end: endDate,
          type: "vacation",
          status: "confirmed",
          notes: vacation.description || undefined,
          color: "bg-red-500",
          isGhost: false,
        });
      });
    }

    return events;
  }, [projects, isLoading, vacations]);

  // Legend Filtering: Show only members with events in current view (Real mode only)
  const activeMembersInLegend = useMemo(() => {
    // If in Playground mode, show everyone so they can be dragged
    if (isInteractiveMode) return CALENDAR_MEMBERS;

    // 1. Calculate date range of current view (match CalendarGrid)
    let start: Date, end: Date;
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      start = startOfWeek(monthStart);
      end = endOfWeek(monthEnd);
    } else if (viewMode === "week") {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }

    // 2. Find members with events in this range
    const activeIds = new Set(
      realEvents
        .filter((evt) => {
          const evtStart = startOfDay(new Date(evt.start));
          const evtEnd = endOfDay(new Date(evt.end));
          return evtEnd >= start && evtStart <= end;
        })
        .map((evt) => evt.resourceId)
    );

    return CALENDAR_MEMBERS.filter((m) => activeIds.has(m.id));
  }, [realEvents, isInteractiveMode, viewMode, currentDate]);

  // Sync Store when Real Events change - with deep equality check to prevent infinite loops
  useEffect(() => {
    if (JSON.stringify(realEvents) !== JSON.stringify(useCalendarStore.getState().realEvents)) {
      setRealEvents(realEvents);
    }
  }, [realEvents, setRealEvents]);

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

  const { toast } = useToast();
  const { checkVacationConflict } = useVacations();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    // Handle Delete Drop
    if (over.id === "trash") {
      if (!canDeleteEvents) return;
      const eventToTrash = active.data.current?.event;
      if (eventToTrash) {
        removeInteractiveEvent(eventToTrash.id);
        toast({
          title: "Evento removido",
          description: "O agendamento foi excluído do Playground.",
        });
      }
      return;
    }

    // The droppable ID is now the Date string (yyyy-MM-dd)
    const targetDateStr = over.id as string;
    const targetDate = new Date(targetDateStr + "T12:00:00"); // Avoid timezone issues by picking noon

    // If dragging new member allocation
    if (active.data.current?.isNew) {
      if (!canCreateEvents) return;
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
      if (!canEditEvents) return;
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
    <div
      className="flex min-h-0 min-w-0 flex-col overflow-visible bg-background md:h-full md:overflow-hidden"
      data-testid="calendar-page"
    >
      <CalendarControls />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-visible md:overflow-hidden">
          {/* Team Dock (Drag Source / Legend) */}
          <div
            className="flex min-w-0 shrink-0 flex-col gap-2 border-b bg-muted/20 p-2 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4 md:py-1"
            data-testid="calendar-team-dock"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-4">
              <span className="w-full text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:mr-2 md:w-auto">
                Equipe Disponível:
              </span>
              {activeMembersInLegend.length > 0 ? (
                activeMembersInLegend.map((member) => (
                  <DraggableTeamMember key={member.id} member={member} />
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  Nenhum integrante com eventos neste período.
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 md:justify-end md:gap-4">
              <CalendarLegend />
              {isInteractiveMode && canDeleteEvents && <TrashDroppable />}
            </div>
          </div>

          {/* Main Grid */}
          <div className="min-w-0 flex-1 overflow-y-auto p-2">
            <CalendarGrid onEventClick={(evt) => setSelectedEvent(evt)} />
          </div>
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <div className="max-w-[80vw] cursor-grabbing rotate-2 opacity-80">
              {activeDragItem.isNew ? (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-xl ring-2 ring-primary"
                >
                  <span className="truncate text-sm font-medium">Nova Alocação</span>
                </div>
              ) : (
                <div className="break-words rounded-md bg-primary px-2 py-1 text-xs font-medium text-white shadow-xl">
                  {activeDragItem.event?.title}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Details Dialog */}
      {activeProject ? (
        <DeploymentDetailsDialog
          project={activeProject}
          open={!!selectedEvent}
          onOpenChange={(v) => !v && setSelectedEvent(null)}
          customTitle={selectedEvent?.title}
          customDescription={`Agendamento: ${selectedEvent?.type === "implementation"
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
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-x-hidden overflow-y-auto p-4 sm:p-6" data-testid="calendar-manual-event-dialog">
            <DialogHeader className="min-w-0 text-left">
              <DialogTitle className="flex min-w-0 items-start gap-2 break-words pr-8">
                {selectedEvent && (
                  <div
                    className={cn(
                      "mt-1 h-3 w-3 shrink-0 rounded-full",
                      selectedEvent.color || "bg-primary",
                    )}
                  />
                )}
                {selectedEvent?.clientName || selectedEvent?.title}
              </DialogTitle>
              <DialogDescription>Detalhes do Agendamento</DialogDescription>
            </DialogHeader>

            <div className="min-w-0 py-4 text-center text-muted-foreground">
              <p className="break-words">Este é um evento manual sem vínculo direto com projeto.</p>
              <div className="mt-4 min-w-0 rounded-lg bg-muted/30 p-3 text-left sm:p-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  Notas:
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">
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
