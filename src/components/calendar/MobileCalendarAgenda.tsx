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
import { CalendarDays, Move, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores/calendarStore";
import { CALENDAR_MEMBERS, CalendarEvent } from "@/types/calendar";
import { CalendarEventPill } from "./EventCard";

interface MobileCalendarAgendaProps {
  days: Date[];
  events: CalendarEvent[];
  isInteractiveMode: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

function eventGroupDate(event: CalendarEvent, rangeStart: Date) {
  const eventStart = startOfDay(event.start);
  return isBefore(eventStart, rangeStart) ? rangeStart : eventStart;
}

function MobileAgendaDay({
  day,
  events,
  isInteractiveMode,
  onEventClick,
}: {
  day: Date;
  events: CalendarEvent[];
  isInteractiveMode: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const updateInteractiveEvent = useCalendarStore(
    (state) => state.updateInteractiveEvent,
  );
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, "yyyy-MM-dd"),
    data: { date: day },
    disabled: !isInteractiveMode,
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border bg-background shadow-sm transition-colors",
        isOver && isInteractiveMode && "border-primary bg-primary/5 ring-2 ring-primary/20",
      )}
      data-testid="calendar-mobile-day"
    >
      <header className="flex min-w-0 items-center justify-between gap-2 border-b bg-muted/35 px-3 py-2">
        <div className="min-w-0">
          <p className="break-words text-xs font-bold capitalize text-foreground">
            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {events.length} {events.length === 1 ? "evento" : "eventos"}
        </span>
      </header>

      <div className="min-w-0 space-y-2 p-2.5">
        {events.length > 0 ? (
          events.map((event) => {
            const member = CALENDAR_MEMBERS.find(
              (candidate) => candidate.id === event.resourceId,
            );
            const sameDay = isSameDay(event.start, event.end);

            return (
              <article
                key={event.id}
                className="min-w-0 space-y-1.5 rounded-lg border border-border/70 bg-muted/10 p-2"
                data-testid="calendar-mobile-event"
              >
                <div className="h-9 min-w-0">
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

                <p
                  className="min-w-0 break-words text-xs font-semibold leading-snug text-foreground"
                  data-testid="calendar-mobile-event-title"
                >
                  {event.clientName || event.title}
                </p>

                <div className="grid min-w-0 grid-cols-1 gap-1 text-[10px] text-muted-foreground min-[420px]:grid-cols-2">
                  <span className="flex min-w-0 items-start gap-1">
                    <UserRound className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="min-w-0 break-words">
                      {member?.name || "Responsável não identificado"}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-start gap-1 min-[420px]:justify-end">
                    <CalendarDays className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="min-w-0 break-words">
                      {sameDay
                        ? format(event.start, "dd/MM/yyyy")
                        : `${format(event.start, "dd/MM")} a ${format(event.end, "dd/MM/yyyy")}`}
                    </span>
                  </span>
                </div>
              </article>
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
}: MobileCalendarAgendaProps) {
  if (days.length === 0) return null;

  const rangeStart = startOfDay(days[0]);
  const rangeEnd = endOfDay(days[days.length - 1]);
  const visibleEvents = events
    .filter((event) => {
      const eventStart = startOfDay(event.start);
      const eventEnd = endOfDay(event.end);
      return !isAfter(eventStart, rangeEnd) && !isBefore(eventEnd, rangeStart);
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const agendaDays = days.filter((day) => {
    if (isInteractiveMode) return true;
    return visibleEvents.some((event) =>
      isSameDay(eventGroupDate(event, rangeStart), day),
    );
  });

  if (agendaDays.length === 0) {
    return (
      <div
        className="flex min-h-48 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background px-4 text-center"
        data-testid="calendar-mobile-agenda"
      >
        <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
        <div>
          <p className="font-semibold text-foreground">Nenhum evento no período</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Altere o período ou a visualização para consultar outras datas.
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
      {agendaDays.map((day) => (
        <MobileAgendaDay
          key={day.toISOString()}
          day={day}
          events={visibleEvents.filter((event) =>
            isSameDay(eventGroupDate(event, rangeStart), day),
          )}
          isInteractiveMode={isInteractiveMode}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  );
}
