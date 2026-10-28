import {
  CalendarControls,
  CalendarKpiSummary,
} from "@/components/calendar/CalendarControls";
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
  useDroppable,
} from "@dnd-kit/core";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  CalendarEvent,
  CALENDAR_MEMBERS,
  UnscheduledPhase1Project,
} from "@/types/calendar";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import {
  buildProjectCalendarEvents,
  deriveTimelineMembers,
  extractUnscheduledPhase1Projects,
  isExcludedTimelineMember,
  resolveCalendarMembersForResponsible,
} from "@/lib/project-calendar-events";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ExternalLink,
  Palmtree,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVacations } from "@/hooks/useVacations";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { DeploymentDetailsDialog } from "@/components/ProjectManagement/DeploymentDetailsDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getWeekdayHolidaysInRange,
  WeekdayHoliday,
} from "@/lib/calendar-holidays";

function TrashDroppable() {
  const { setNodeRef, isOver } = useDroppable({
    id: "trash",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
        isOver
          ? "bg-red-500 border-red-600 text-white scale-110 shadow-lg z-50"
          : "bg-muted/50 border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200"
      )}
      title="Arraste aqui para excluir"
    >
      <Trash2
        className={cn(
          "w-4 h-4 transition-transform",
          isOver && "scale-115 rotate-12"
        )}
      />
    </div>
  );
}

export default function Calendar() {
  const isInteractiveMode = useCalendarStore(
    (state) => state.isInteractiveMode
  );
  const currentDate = useCalendarStore((state) => state.currentDate);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const selectedYear = useCalendarStore((state) => state.selectedYear);
  const selectedQuarter = useCalendarStore((state) => state.selectedQuarter);
  const addInteractiveEvent = useCalendarStore(
    (state) => state.addInteractiveEvent
  );
  const updateInteractiveEvent = useCalendarStore(
    (state) => state.updateInteractiveEvent
  );
  const removeInteractiveEvent = useCalendarStore(
    (state) => state.removeInteractiveEvent
  );
  const setRealEvents = useCalendarStore((state) => state.setRealEvents);

  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const { projects = [], isLoading } = useProjectsV2();
  const { vacations = [], checkVacationConflict } = useVacations();
  const { toast } = useToast();

  const { hasPermission } = usePermissions();
  const canCreateEvents = hasPermission("calendar_projects", "create");
  const canEditEvents = hasPermission("calendar_projects", "edit");
  const canDeleteEvents = hasPermission("calendar_projects", "delete");

  // 1. Transforma projetos (Fase 1) + férias cadastradas no Admin em eventos da Timeline
  const realEvents = useMemo(() => {
    if (!projects || isLoading) return [];

    const events = buildProjectCalendarEvents(projects);
    const vacationEvents: CalendarEvent[] = [];

    // Integra exclusivamente os períodos de férias cadastrados na tela Admin de Férias
    if (vacations && Array.isArray(vacations)) {
      vacations.forEach((vacation) => {
        if (!vacation.start_date || !vacation.end_date) return;
        if (
          isExcludedTimelineMember(vacation.implantador_id) ||
          isExcludedTimelineMember(vacation.implantador_name)
        ) {
          return;
        }

        const startDate = new Date(vacation.start_date + "T12:00:00");
        const endDate = new Date(vacation.end_date + "T12:00:00");

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

        const resolvedMember = resolveCalendarMembersForResponsible(
          vacation.implantador_name
        )[0];
        const resourceId =
          vacation.implantador_id || resolvedMember?.id || "unknown";

        if (isExcludedTimelineMember(resourceId)) return;

        const vacEvent: CalendarEvent = {
          id: `vacation-${vacation.id}`,
          vacationId: vacation.id,
          resourceId,
          title: `FÉRIAS ${vacation.implantador_name.toUpperCase()}`,
          clientName: `FÉRIAS ${vacation.implantador_name.toUpperCase()}`,
          responsibleName: vacation.implantador_name,
          start: startDate,
          end: endDate,
          type: "vacation",
          status: "confirmed",
          isConfirmed: true,
          notes: vacation.description || undefined,
          observationsList: vacation.description ? [vacation.description] : [],
          color: "bg-amber-500",
          isGhost: false,
        };

        vacationEvents.push(vacEvent);
      });
    }

    // Detecta conflitos entre implantações da Fase 1 e férias do mesmo implantador
    events.forEach((implEvt) => {
      if (implEvt.type === "vacation") return;
      const implStart = startOfDay(new Date(implEvt.start));
      const implEnd = endOfDay(new Date(implEvt.end));

      const conflictingVac = vacationEvents.find((vac) => {
        if (vac.resourceId !== implEvt.resourceId) return false;
        const vacStart = startOfDay(new Date(vac.start));
        const vacEnd = endOfDay(new Date(vac.end));
        return vacEnd >= implStart && vacStart <= implEnd;
      });

      if (conflictingVac) {
        implEvt.hasVacationConflict = true;
        implEvt.vacationConflictText = `Conflito com Férias de ${
          conflictingVac.responsibleName
        } (${format(new Date(conflictingVac.start), "dd/MM")} a ${format(
          new Date(conflictingVac.end),
          "dd/MM"
        )})`;
      }
    });

    return [...events, ...vacationEvents];
  }, [projects, isLoading, vacations]);

  // 2. Extrai projetos ativos sem data definida na Fase 1
  const unscheduledProjects = useMemo(() => {
    if (!projects || isLoading) return [];
    return extractUnscheduledPhase1Projects(projects);
  }, [projects, isLoading]);

  // 3. Deriva a lista completa de implantadores da Timeline (sem Bruno Matos e Luan Caldeira)
  const timelineMembers = useMemo(
    () => deriveTimelineMembers(projects, realEvents),
    [projects, realEvents]
  );

  // 4. Calcula intervalo do período selecionado para KPIs e contadores
  const { periodStart, periodEnd } = useMemo(() => {
    if (viewMode === "year") {
      return {
        periodStart: startOfDay(new Date(selectedYear, 0, 1)),
        periodEnd: endOfDay(new Date(selectedYear, 11, 31)),
      };
    }
    if (viewMode === "quarter") {
      const startMonth = (selectedQuarter - 1) * 3;
      return {
        periodStart: startOfDay(new Date(selectedYear, startMonth, 1)),
        periodEnd: endOfDay(
          endOfMonth(new Date(selectedYear, startMonth + 2, 1))
        ),
      };
    }
    return {
      periodStart: startOfMonth(currentDate),
      periodEnd: endOfMonth(currentDate),
    };
  }, [viewMode, selectedYear, selectedQuarter, currentDate]);

  // 5. Calcula os 6 KPIs Executivos, contadores por implantador e contadores nos 12 meses
  const { kpis, memberAllocationCounts, monthEventCounts } = useMemo(() => {
    const countsByMember: Record<string, number> = {};
    const eventsInPeriod = realEvents.filter((evt) => {
      const s = startOfDay(new Date(evt.start));
      const e = endOfDay(new Date(evt.end));
      return e >= periodStart && s <= periodEnd;
    });

    const implEvents = eventsInPeriod.filter((evt) => evt.type !== "vacation");
    const vacEvents = eventsInPeriod.filter((evt) => evt.type === "vacation");

    for (const evt of implEvents) {
      countsByMember[evt.resourceId] =
        (countsByMember[evt.resourceId] || 0) + 1;
    }

    const uniqueProjectIds = new Set<string>();
    const uniqueClients = new Set<string>();
    let regCount = 0;
    let proCount = 0;
    let tnCount = 0;
    let confirmedCount = 0;
    let plannedCount = 0;

    for (const evt of implEvents) {
      if (evt.clientName) uniqueClients.add(evt.clientName);
      const pKey = evt.projectId || evt.id;
      if (uniqueProjectIds.has(pKey)) continue;
      uniqueProjectIds.add(pKey);

      if (evt.systemCategory === "reg") {
        regCount += 1;
      } else if (evt.systemCategory === "pro") {
        proCount += 1;
      } else if (evt.systemCategory === "tn") {
        tnCount += 1;
      }

      if (evt.isConfirmed) {
        confirmedCount += 1;
      } else {
        plannedCount += 1;
      }
    }

    // Contadores mensais para os 12 meses do selectedYear
    const countsByMonth = Array(12).fill(0);
    for (let m = 0; m < 12; m += 1) {
      const mStart = startOfDay(new Date(selectedYear, m, 1));
      const mEnd = endOfDay(endOfMonth(mStart));
      countsByMonth[m] = realEvents.filter((evt) => {
        const s = startOfDay(new Date(evt.start));
        const e = endOfDay(new Date(evt.end));
        return e >= mStart && s <= mEnd;
      }).length;
    }

    const summary: CalendarKpiSummary = {
      totalAllocations: implEvents.length,
      uniqueClients: uniqueClients.size || uniqueProjectIds.size,
      regCount,
      proCount,
      tnCount,
      confirmedCount,
      plannedCount,
      vacationsCount: vacEvents.length,
      unscheduledCount: unscheduledProjects.length,
    };

    return {
      kpis: summary,
      memberAllocationCounts: countsByMember,
      monthEventCounts: countsByMonth,
    };
  }, [
    realEvents,
    periodStart,
    periodEnd,
    unscheduledProjects.length,
    selectedYear,
  ]);

  // 6. Sincroniza store com eventos reais
  useEffect(() => {
    if (
      JSON.stringify(realEvents) !==
      JSON.stringify(useCalendarStore.getState().realEvents)
    ) {
      setRealEvents(realEvents);
    }
  }, [realEvents, setRealEvents]);

  // Scroll horizontal até o mês selecionado (no Split-Pane, offsetLeft é direto no Painel Direito!)
  const handleJumpToMonth = useCallback((monthIndex: number) => {
    if (!timelineScrollRef.current) return;
    const monthEl = timelineScrollRef.current.querySelector(
      `[data-month-index="${monthIndex}"]`
    ) as HTMLElement | null;
    if (monthEl) {
      const offsetLeft = Math.max(0, monthEl.offsetLeft);
      timelineScrollRef.current.scrollTo({
        left: offsetLeft,
        behavior: "smooth",
      });
    }
  }, []);

  const handleJumpToToday = useCallback(() => {
    const now = new Date();
    handleJumpToMonth(now.getMonth());
  }, [handleJumpToMonth]);

  const handleOpenVacationsAdmin = useCallback(() => {
    window.location.assign("/admin/vacations");
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const [pendingHolidayDrop, setPendingHolidayDrop] = useState<{
    mode: "create" | "update";
    event: CalendarEvent;
    holidays: WeekdayHoliday[];
  } | null>(null);

  const handleDragStart = (event: any) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

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

    const targetDateStr = over.id as string;
    const targetDate = new Date(targetDateStr + "T12:00:00");
    if (isNaN(targetDate.getTime())) return;

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
        end: targetDate,
        status: "planned",
        isGhost: false,
      };

      const holidaysInRange = getWeekdayHolidaysInRange(targetDate, targetDate);
      if (holidaysInRange.length > 0) {
        setPendingHolidayDrop({
          mode: "create",
          event: newEvent,
          holidays: holidaysInRange,
        });
        return;
      }

      addInteractiveEvent(newEvent);
    } else {
      if (!canEditEvents) return;
      const existingEvent = active.data.current?.event as CalendarEvent;
      if (existingEvent) {
        const duration =
          existingEvent.end.getTime() - existingEvent.start.getTime();
        const newEnd = new Date(targetDate.getTime() + duration);

        const conflict = checkVacationConflict(
          existingEvent.resourceId,
          targetDate
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

        const updatedEvent: CalendarEvent = {
          ...existingEvent,
          start: targetDate,
          end: newEnd,
        };

        const holidaysInRange = getWeekdayHolidaysInRange(targetDate, newEnd);
        if (holidaysInRange.length > 0) {
          setPendingHolidayDrop({
            mode: "update",
            event: updatedEvent,
            holidays: holidaysInRange,
          });
          return;
        }

        updateInteractiveEvent(updatedEvent);
      }
    }
  };

  const handleConfirmHolidayDrop = () => {
    if (!pendingHolidayDrop) return;
    const { mode, event } = pendingHolidayDrop;
    setPendingHolidayDrop(null);
    if (mode === "create") {
      addInteractiveEvent(event);
    } else {
      updateInteractiveEvent(event);
    }
  };

  const handleEventClick = (evt: CalendarEvent) => {
    setSelectedEvent(evt);
    if (evt.projectId) {
      setSelectedProjectId(evt.projectId);
    } else {
      setSelectedProjectId(null);
    }
  };

  const handleUnscheduledProjectClick = (item: UnscheduledPhase1Project) => {
    setSelectedEvent(null);
    setSelectedProjectId(item.projectId);
  };

  const activeProject = useMemo(() => {
    const targetId = selectedProjectId || selectedEvent?.projectId;
    if (!targetId) return null;
    return projects.find((p) => p.id === targetId) || null;
  }, [projects, selectedProjectId, selectedEvent]);

  const isDialogOpen = Boolean(selectedProjectId || selectedEvent);

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedEvent(null);
      setSelectedProjectId(null);
    }
  };

  return (
    <div
      className="flex min-h-0 min-w-0 max-w-full flex-col overflow-visible overflow-x-hidden bg-background md:h-full md:overflow-hidden"
      data-testid="calendar-page"
    >
      <CalendarControls
        kpis={kpis}
        members={timelineMembers}
        memberAllocationCounts={memberAllocationCounts}
        monthEventCounts={monthEventCounts}
        onJumpToMonth={handleJumpToMonth}
        onJumpToToday={handleJumpToToday}
        onOpenVacationsAdmin={handleOpenVacationsAdmin}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden md:overflow-hidden">
          {/* Barra de Legenda Executiva e Equipe (Playground Drag Source) */}
          <div
            className="flex min-w-0 max-w-full shrink-0 flex-col gap-2 border-b bg-muted/20 px-2.5 py-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-2 md:px-4"
            data-testid="calendar-team-dock"
          >
            {isInteractiveMode ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
                <span className="w-full text-[9px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 md:mr-1 md:w-auto">
                  Playground (Arraste para alocar):
                </span>
                {timelineMembers.map((member) => (
                  <DraggableTeamMember key={member.id} member={member} />
                ))}
              </div>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  Escopo Oficial
                </span>
                <span className="font-medium leading-snug">
                  Períodos da <strong>Fase 1 (Treinamento)</strong> e{" "}
                  <strong>Férias (Admin)</strong> •{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    Borda sólida = Confirmada
                  </strong>{" "}
                  vs{" "}
                  <strong className="text-amber-600 dark:text-amber-400">
                    Borda tracejada = Previsão
                  </strong>{" "}
                  (tags e detalhes no popup e modal)
                </span>
              </div>
            )}

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 md:justify-end md:gap-4">
              <CalendarLegend />
              {isInteractiveMode && canDeleteEvents && <TrashDroppable />}
            </div>
          </div>

          {/* Área Principal da Timeline / Simultaneidade / Backlog */}
          <div className="min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto p-2 md:p-3">
            <CalendarGrid
              onEventClick={handleEventClick}
              onUnscheduledProjectClick={handleUnscheduledProjectClick}
              unscheduledProjects={unscheduledProjects}
              projects={projects}
              scrollContainerRef={timelineScrollRef}
            />
          </div>
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <div className="max-w-[80vw] cursor-grabbing rotate-2 opacity-80">
              {activeDragItem.isNew ? (
                <div className="flex min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-xl ring-2 ring-primary">
                  <span className="truncate text-sm font-medium">
                    Nova Alocação
                  </span>
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

      {/* Dialog de Edição Direta da Fase 1 (para Projetos da Timeline ou do Backlog) */}
      {activeProject ? (
        <DeploymentDetailsDialog
          project={activeProject}
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          customTitle={activeProject.clientName}
          customDescription="Edição direta da Fase 1 (Treinamento & Acompanhamento) — Alterações refletem imediatamente na Timeline"
          customStartDate={selectedEvent?.start}
          customEndDate={selectedEvent?.end}
          customResponsible={
            CALENDAR_MEMBERS.find((m) => m.id === selectedEvent?.resourceId)
              ?.name ||
            activeProject.stages?.implementation?.phase1?.responsible
          }
        />
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent
            className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-x-hidden overflow-y-auto p-4 sm:p-6"
            data-testid="calendar-manual-event-dialog"
          >
            <DialogHeader className="min-w-0 text-left">
              <DialogTitle className="flex min-w-0 items-start gap-2 break-words pr-8">
                {selectedEvent?.type === "vacation" ? (
                  <Palmtree className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <div
                    className={cn(
                      "mt-1 h-3 w-3 shrink-0 rounded-full",
                      selectedEvent?.color || "bg-primary"
                    )}
                  />
                )}
                <span>{selectedEvent?.clientName || selectedEvent?.title}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedEvent?.type === "vacation"
                  ? "Período de Férias cadastrado na Gestão de Férias (Admin)"
                  : "Detalhes do Agendamento"}
              </DialogDescription>
            </DialogHeader>

            <div className="min-w-0 space-y-3 py-3 text-left text-sm">
              {selectedEvent && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2.5 text-xs font-semibold">
                  <CalendarIcon className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Período: {format(new Date(selectedEvent.start), "dd/MM/yyyy")}{" "}
                    a {format(new Date(selectedEvent.end), "dd/MM/yyyy")}
                  </span>
                </div>
              )}

              <div className="min-w-0 rounded-lg bg-muted/30 p-3 text-left sm:p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Observações / Descrição:
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {selectedEvent?.notes || "Sem observações adicionais."}
                </p>
              </div>
            </div>

            {selectedEvent?.type === "vacation" && (
              <DialogFooter className="gap-2 border-t pt-3 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenVacationsAdmin}
                  className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
                >
                  <Palmtree className="h-3.5 w-3.5" />
                  <span>Gerenciar em Férias (Admin)</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Segunda confirmação (AlertDialog) para alocação no Playground em feriado de dia útil */}
      <AlertDialog
        open={Boolean(pendingHolidayDrop)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingHolidayDrop(null);
        }}
      >
        <AlertDialogContent
          className="max-w-md border-amber-500/40"
          data-testid="playground-holiday-confirm-dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              Confirmar alocação em semana com feriado útil?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2.5 text-sm text-muted-foreground">
                <p>
                  O período selecionado no Playground abrange{" "}
                  <strong className="text-foreground">
                    {pendingHolidayDrop?.holidays.length === 1
                      ? "1 feriado nacional em dia útil"
                      : `${pendingHolidayDrop?.holidays.length ?? 0} feriados nacionais em dias úteis`}
                  </strong>
                  :
                </p>
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                  {pendingHolidayDrop?.holidays.map((holiday) => (
                    <span
                      key={holiday.date}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-background px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300"
                    >
                      ⚠️ {holiday.shortDate} ({holiday.weekdayShort}) —{" "}
                      {holiday.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs">
                  Este aviso <strong>não bloqueia</strong> a alocação. Deseja
                  confirmar mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingHolidayDrop(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmHolidayDrop}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Confirmar alocação com feriado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
