import { useDroppable } from "@dnd-kit/core";
import {
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderKanban,
  Move,
  Palmtree,
  Rocket,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores/calendarStore";
import {
  CALENDAR_MEMBERS,
  CalendarEvent,
  CalendarMember,
  UnscheduledPhase1Project,
} from "@/types/calendar";
import {
  getWeekdayHoliday,
  getWeekdayHolidaysInRange,
} from "@/lib/calendar-holidays";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarEventPill } from "./EventCard";

interface MobileCalendarAgendaProps {
  days: Date[];
  events: CalendarEvent[];
  isInteractiveMode: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  members?: CalendarMember[];
  unscheduledProjects?: UnscheduledPhase1Project[];
  onUnscheduledProjectClick?: (item: UnscheduledPhase1Project) => void;
}

function eventGroupDate(event: CalendarEvent, rangeStart: Date) {
  const eventStart = startOfDay(event.start);
  return isBefore(eventStart, rangeStart) ? rangeStart : eventStart;
}

// Cores oficiais padronizadas:
// Orion REG = Verde | Orion PRO = Azul | Orion TN = Vermelho | Conjunta = Roxo
function getSystemBadgeClasses(category?: CalendarEvent["systemCategory"]) {
  switch (category) {
    case "reg":
      return "bg-emerald-600 text-white border-emerald-800";
    case "pro":
      return "bg-blue-600 text-white border-blue-800";
    case "tn":
      return "bg-[#d3123f] text-white border-[#881337]";
    case "shared":
      return "bg-violet-600 text-white border-violet-900";
    default:
      return "bg-muted text-foreground border-border";
  }
}

function getCardLeftBorderClass(event: CalendarEvent) {
  if (event.type === "vacation") return "border-l-4 border-l-amber-500";
  switch (event.systemCategory) {
    case "reg":
      return "border-l-4 border-l-emerald-600";
    case "pro":
      return "border-l-4 border-l-blue-600";
    case "tn":
      return "border-l-4 border-l-[#d3123f]";
    case "shared":
      return "border-l-4 border-l-violet-600";
    default:
      return "border-l-4 border-l-primary";
  }
}

function MobileEventCard({
  event,
  member,
  isInteractiveMode,
  onEventClick,
}: {
  event: CalendarEvent;
  member?: CalendarMember;
  isInteractiveMode: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const updateInteractiveEvent = useCalendarStore(
    (state) => state.updateInteractiveEvent
  );
  const sameDay = isSameDay(event.start, event.end);
  const isVacation = event.type === "vacation";
  const holidaysInEvent = useMemo(
    () =>
      isVacation ? [] : getWeekdayHolidaysInRange(event.start, event.end),
    [event.start, event.end, isVacation]
  );

  return (
    <article
      onClick={() => onEventClick?.(event)}
      className={cn(
        "min-w-0 cursor-pointer space-y-2 rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all active:scale-[0.99]",
        getCardLeftBorderClass(event),
        isVacation &&
          "bg-amber-50/50 dark:bg-amber-950/20 border-dashed border-amber-400 dark:border-amber-800"
      )}
      data-testid="calendar-mobile-event"
    >
      {/* Modo Playground mantém a pílula arrastável no topo */}
      {isInteractiveMode && (
        <div className="h-8 min-w-0">
          <CalendarEventPill
            event={event}
            isInteractiveMode={isInteractiveMode}
            onUpdate={updateInteractiveEvent}
            segment={{
              event,
              isStart: true,
              isEnd: true,
              span: 1,
            }}
            onResizeStart={(pointerEvent) => pointerEvent.preventDefault()}
            allowResize={false}
            onEventClick={onEventClick}
          />
        </div>
      )}

      {/* Linha 1: Ticket + Sistema + Status Confirmado/Previsto */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {event.ticketNumber && (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-extrabold text-foreground">
              #{event.ticketNumber}
            </span>
          )}
          {isVacation ? (
            <Badge className="gap-1 bg-amber-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5">
              <Palmtree className="h-2.5 w-2.5" />
              Férias (Admin)
            </Badge>
          ) : (
            <Badge
              className={cn(
                "text-[9px] font-extrabold uppercase px-2 py-0.5",
                getSystemBadgeClasses(event.systemCategory)
              )}
            >
              {event.systemCategory === "shared" && (
                <Sparkles className="mr-1 h-2.5 w-2.5" />
              )}
              {event.systemType || "Implantação"}
            </Badge>
          )}

          {event.hasVacationConflict && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
              <AlertTriangle className="h-2.5 w-2.5" />
              Conflito Férias
            </span>
          )}

          {holidaysInEvent.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
              Feriado: {holidaysInEvent.map((h) => `${h.weekdayShort} ${h.shortDate}`).join(" + ")}
            </span>
          )}
        </div>

        {!isVacation && (
          <div>
            {event.isConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[9px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Confirmada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <Clock className="h-2.5 w-2.5" />
                Prevista
              </span>
            )}
          </div>
        )}
      </div>

      {/* Linha 2: Nome do Cliente em destaque */}
      <p
        className="min-w-0 break-words text-sm font-extrabold leading-snug text-foreground"
        data-testid="calendar-mobile-event-title"
      >
        {event.clientName || event.title}
      </p>

      {/* Linha 3: Implantador + Período */}
      <div className="grid min-w-0 grid-cols-1 gap-1.5 rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground min-[420px]:grid-cols-2">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground/90">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 break-words">
            {event.allResponsibles && event.allResponsibles.length > 1
              ? event.allResponsibles.join(" + ")
              : event.responsibleName ||
                member?.name ||
                "Responsável a Definir"}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 font-bold text-foreground min-[420px]:justify-end">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="min-w-0 break-words">
            {sameDay
              ? format(event.start, "dd/MM/yyyy")
              : `${format(event.start, "dd/MM")} a ${format(
                  event.end,
                  "dd/MM/yyyy"
                )}`}
          </span>
        </span>
      </div>
    </article>
  );
}

function MobileAgendaDay({
  day,
  events,
  members,
  isInteractiveMode,
  onEventClick,
}: {
  day: Date;
  events: CalendarEvent[];
  members: CalendarMember[];
  isInteractiveMode: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, "yyyy-MM-dd"),
    data: { date: day },
    disabled: !isInteractiveMode,
  });

  const dayHoliday = getWeekdayHoliday(day);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border bg-background shadow-xs transition-colors",
        dayHoliday && "border-amber-500/60",
        isOver &&
          isInteractiveMode &&
          "border-primary bg-primary/5 ring-2 ring-primary/20"
      )}
      data-testid="calendar-mobile-day"
    >
      <header
        className={cn(
          "flex min-w-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2",
          dayHoliday
            ? "bg-amber-500/15 text-amber-950 dark:text-amber-100"
            : "bg-muted/60 text-foreground"
        )}
      >
        <div className="min-w-0">
          <p className="break-words text-xs font-extrabold capitalize">
            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          {dayHoliday && (
            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
              ⚠️ Feriado em Dia Útil: {dayHoliday.name}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
          {events.length} {events.length === 1 ? "alocação" : "alocações"}
        </span>
      </header>

      <div className="min-w-0 space-y-2.5 p-2.5">
        {events.length > 0 ? (
          events.map((event) => {
            const member = members.find(
              (candidate) => candidate.id === event.resourceId
            );
            return (
              <MobileEventCard
                key={event.id}
                event={event}
                member={member}
                isInteractiveMode={isInteractiveMode}
                onEventClick={onEventClick}
              />
            );
          })
        ) : (
          <div className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-center text-[11px] text-muted-foreground">
            {isInteractiveMode && <Move className="h-3.5 w-3.5 shrink-0" />}
            <span>
              {isInteractiveMode
                ? "Arraste um integrante da equipe para esta data."
                : "Nenhum evento nesta data."}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export function MobileCalendarAgenda({
  days,
  events,
  isInteractiveMode,
  onEventClick,
  members = CALENDAR_MEMBERS,
  unscheduledProjects = [],
  onUnscheduledProjectClick,
}: MobileCalendarAgendaProps) {
  const displayTab = useCalendarStore((state) => state.displayTab);
  const [groupByMode, setGroupByMode] = useState<"member" | "day">("day");

  const rangeStart = useMemo(
    () => (days.length > 0 ? startOfDay(days[0]) : startOfDay(new Date())),
    [days]
  );
  const rangeEnd = useMemo(
    () =>
      days.length > 0
        ? endOfDay(days[days.length - 1])
        : endOfDay(new Date()),
    [days]
  );

  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => {
          const eventStart = startOfDay(event.start);
          const eventEnd = endOfDay(event.end);
          return (
            !isAfter(eventStart, rangeEnd) && !isBefore(eventEnd, rangeStart)
          );
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events, rangeStart, rangeEnd]
  );

  if (days.length === 0) return null;

  // Se estiver na aba Pipeline Sem Data, exibe os projetos sem data na Fase 1
  if (displayTab === "backlog") {
    return (
      <div
        className="min-w-0 space-y-3"
        data-testid="calendar-mobile-agenda"
      >
        <div className="rounded-xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            <FolderKanban className="h-4 w-4 shrink-0" />
            <span>Pipeline Sem Data — Fase 1 ({unscheduledProjects.length})</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Toque em qualquer projeto abaixo para definir datas de início/término e
            responsável da Fase 1.
          </p>
        </div>

        {unscheduledProjects.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed bg-background p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-foreground">
              Todos os projetos filtrados possuem data na Fase 1!
            </p>
          </div>
        ) : (
          unscheduledProjects.map((item) => (
            <article
              key={item.projectId}
              onClick={() => onUnscheduledProjectClick?.(item)}
              className="min-w-0 cursor-pointer space-y-2 rounded-xl border border-l-4 border-l-amber-500 bg-card p-3 shadow-xs"
              data-testid="calendar-mobile-event"
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-extrabold text-foreground">
                  #{item.ticketNumber || "S/N"}
                </span>
                <Badge
                  className={cn(
                    "text-[9px] font-extrabold uppercase",
                    getSystemBadgeClasses(item.systemCategory)
                  )}
                >
                  {item.systemType}
                </Badge>
              </div>
              <p
                className="min-w-0 break-words text-sm font-extrabold text-foreground"
                data-testid="calendar-mobile-event-title"
              >
                {item.clientName}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-foreground/90">
                  <UserRound className="h-3.5 w-3.5 text-amber-600" />
                  {item.responsibleRaw || "Responsável a Definir"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 bg-primary px-2.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90"
                >
                  <Rocket className="h-3 w-3" />
                  Agendar Fase 1
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    );
  }

  const agendaDays = days.filter((day) => {
    if (isInteractiveMode) return true;
    return visibleEvents.some((event) =>
      isSameDay(eventGroupDate(event, rangeStart), day)
    );
  });

  if (visibleEvents.length === 0 && !isInteractiveMode) {
    return (
      <div
        className="flex min-h-48 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background px-4 text-center"
        data-testid="calendar-mobile-agenda"
      >
        <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
        <div>
          <p className="font-semibold text-foreground">
            Nenhum evento no período
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Altere o trimestre/ano, limpe os filtros ou consulte a aba Pipeline
            Sem Data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-w-0 space-y-3"
      data-testid="calendar-mobile-agenda"
    >
      {/* Seletor Mobile: Agrupar por Data vs Agrupar por Implantador */}
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 p-1.5">
        <span className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Visão Mobile:
        </span>
        <div className="inline-flex rounded-lg border bg-background p-0.5">
          <button
            type="button"
            onClick={() => setGroupByMode("day")}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[10px] font-bold transition-colors",
              groupByMode === "day"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            <span>Por Data</span>
          </button>
          <button
            type="button"
            onClick={() => setGroupByMode("member")}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[10px] font-bold transition-colors",
              groupByMode === "member"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            <Users className="h-3 w-3" />
            <span>Por Implantador</span>
          </button>
        </div>
      </div>

      {groupByMode === "member" ? (
        <div className="min-w-0 space-y-3">
          {members.map((member) => {
            const memberEvents = visibleEvents.filter(
              (e) => e.resourceId === member.id
            );
            if (memberEvents.length === 0) return null;

            return (
              <section
                key={member.id}
                className="min-w-0 overflow-hidden rounded-xl border bg-background shadow-xs"
                data-testid="calendar-mobile-day"
              >
                <header className="flex min-w-0 items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2.5 text-foreground">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white",
                        member.color || "bg-primary"
                      )}
                    >
                      {member.initials ||
                        member.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-foreground">
                        {member.name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                    {memberEvents.length}{" "}
                    {memberEvents.length === 1 ? "item" : "itens"}
                  </span>
                </header>
                <div className="min-w-0 space-y-2.5 p-2.5">
                  {memberEvents.map((event) => (
                    <MobileEventCard
                      key={event.id}
                      event={event}
                      member={member}
                      isInteractiveMode={isInteractiveMode}
                      onEventClick={onEventClick}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        agendaDays.map((day) => (
          <MobileAgendaDay
            key={day.toISOString()}
            day={day}
            events={visibleEvents.filter((event) =>
              isSameDay(eventGroupDate(event, rangeStart), day)
            )}
            members={members}
            isInteractiveMode={isInteractiveMode}
            onEventClick={onEventClick}
          />
        ))
      )}
    </div>
  );
}

