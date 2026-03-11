import { useCalendarStore } from "@/stores/calendarStore";
import { CALENDAR_MEMBERS, CalendarEvent } from "@/types/calendar";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  isWithinInterval,
  startOfDay,
  endOfDay,
  differenceInCalendarDays,
  addDays,
  isBefore,
  isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useDraggable } from "@dnd-kit/core";
import { useState, useEffect, useRef } from "react";

import { CalendarEventPill, EventSegment } from "./EventCard";

interface CalendarGridProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarGrid({ onEventClick }: CalendarGridProps) {
  const {
    currentDate,
    viewMode,
    interactiveEvents,
    realEvents,
    isInteractiveMode,
    updateInteractiveEvent,
  } = useCalendarStore();

  const hiddenResourceIds = useCalendarStore((state) => state.hiddenResourceIds);
  const displayEvents = (isInteractiveMode ? interactiveEvents : realEvents).filter(
    (event) => !hiddenResourceIds.includes(event.resourceId)
  );

  // --- Ghost State Implementation ---
  const [resizingEventId, setResizingEventId] = useState<string | null>(null);
  const [ghostEndDate, setGhostEndDate] = useState<Date | null>(null);

  // "Live Responsive Pixels" State
  const [containerWidth, setContainerWidth] = useState(0);

  // References
  const initialEndDateRef = useRef<Date>(new Date());
  const ghostEndDateRef = useRef<Date | null>(null);
  const startXRef = useRef<number>(0);
  const activeRowWidthRef = useRef<number>(0);
  const resizingEventRef = useRef<CalendarEvent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver Logic
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Sync Ref with State
  const daysPerWeek = viewMode === "day" ? 1 : 7;
  const currentCellWidth = containerWidth > 0 ? containerWidth / daysPerWeek : 0;

  // --- Resize Logic ---
  const handleResizeMove = (e: PointerEvent) => {

    const currentX = e.clientX;
    const diffX = currentX - startXRef.current;

    // Safety check
    const totalWidth = activeRowWidthRef.current || 1000;

    // PERCENTAGE BASED CALCULATION
    const percentMoved = diffX / totalWidth;

    // Convert % to Days (7 days = 100%)
    const rawDays = percentMoved * daysPerWeek;
    const daysToShift = Math.round(rawDays);

    // A data final é SEMPRE a data ORIGINAL + o deslocamento (Cálculo Absoluto)
    let newDate = addDays(initialEndDateRef.current, daysToShift);
    const evtStart = startOfDay(resizingEventRef.current!.start);

    if (isBefore(newDate, evtStart)) {
      newDate = evtStart;
    }

    setGhostEndDate(newDate);
    ghostEndDateRef.current = newDate;
  };

  const handleResizeEnd = (e: PointerEvent) => {
    window.removeEventListener("pointermove", handleResizeMove);
    window.removeEventListener("pointerup", handleResizeEnd);

    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    const currentGhostDate = ghostEndDateRef.current;
    if (resizingEventRef.current && currentGhostDate) {
      // "Safety Noon"
      const finalDate = new Date(currentGhostDate);
      finalDate.setHours(12, 0, 0, 0);

      updateInteractiveEvent({
        ...resizingEventRef.current,
        end: finalDate
      });
    }

    setResizingEventId(null);
    setGhostEndDate(null);
    resizingEventRef.current = null;
    ghostEndDateRef.current = null;
  };

  const handleResizeStart = (
    e: React.PointerEvent | React.MouseEvent,
    event: CalendarEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Robust Width Detection: Find the specific week row we are interacting with
    const targetElement = e.target as HTMLElement;
    const weekRow = targetElement.closest('.js-week-row');

    let currentRowWidth = 0;
    if (weekRow) {
      currentRowWidth = weekRow.getBoundingClientRect().width;
    } else if (containerRef.current) {
      // Fallback
      currentRowWidth = containerRef.current.getBoundingClientRect().width;
    }

    if (currentRowWidth === 0) currentRowWidth = 800; // Emergency fallback

    setResizingEventId(event.id);
    setGhostEndDate(event.end);

    initialEndDateRef.current = new Date(event.end);
    startXRef.current = e.clientX;
    activeRowWidthRef.current = currentRowWidth;
    resizingEventRef.current = event;
    ghostEndDateRef.current = event.end;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handleResizeEnd);
  };

  // Generate Grid Data based on ViewMode
  let startDate: Date, endDate: Date;

  if (viewMode === "month") {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    startDate = startOfWeek(monthStart);
    endDate = endOfWeek(monthEnd);
  } else if (viewMode === "week") {
    startDate = startOfWeek(currentDate);
    endDate = endOfWeek(currentDate);
  } else {
    // day
    startDate = startOfDay(currentDate);
    endDate = endOfDay(currentDate);
  }

  const daysArr = eachDayOfInterval({ start: startDate, end: endDate });

  const weeks: Date[][] = [];
  for (let i = 0; i < daysArr.length; i += daysPerWeek) {
    weeks.push(daysArr.slice(i, i + daysPerWeek));
  }

  // --- Layout Calculation for Slots ---
  const layoutEvents = displayEvents.map(evt => {
    if (evt.id === resizingEventId && ghostEndDate) {
      // DIRECT MAPPING: Force the event to use the ghost date exactly.
      // This enables shrinking and expansion with 1:1 visual fidelity.
      return { ...evt, end: ghostEndDate };
    }
    return evt;
  });

  const headerDays = viewMode === "day"
    ? [format(currentDate, "EEEE", { locale: ptBR })]
    : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background shadow-sm select-none overflow-visible">
      {/* Header */}
      <div className={cn(
        "grid border-b bg-muted/40",
        viewMode === "day" ? "grid-cols-1" : "grid-cols-7"
      )}>
        {headerDays.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div ref={containerRef} className="flex-1 flex flex-col">
        {weeks.map((week, weekIndex) => {
          const weekStart = startOfDay(week[0]);
          const weekEnd = endOfDay(week[6]);

          const weekEvents = layoutEvents.filter((evt) => {
            if (!(evt.start instanceof Date) || isNaN(evt.start.getTime())) return false;
            if (!(evt.end instanceof Date) || isNaN(evt.end.getTime())) return false;

            const evtStart = startOfDay(evt.start);
            const evtEnd = endOfDay(evt.end);
            return evtEnd >= weekStart && evtStart <= weekEnd;
          });

          weekEvents.sort((a, b) => {
            const startDiff = a.start.getTime() - b.start.getTime();
            if (startDiff !== 0) return startDiff;
            // Longer events first
            return b.end.getTime() - a.end.getTime();
          });

          // Slot logic remains the same
          const slots: string[][] = Array(daysPerWeek).fill(null).map(() => []);
          const eventSlots: Record<string, number> = {};

          weekEvents.forEach((evt) => {
            const evtStart = startOfDay(evt.start);
            const evtEnd = endOfDay(evt.end);
            let startIndex = differenceInCalendarDays(evtStart, weekStart);
            let endIndex = differenceInCalendarDays(evtEnd, weekStart);

            if (startIndex < 0) startIndex = 0;
            if (endIndex > daysPerWeek - 1) endIndex = daysPerWeek - 1;

            let slotIndex = 0;
            while (true) {
              let isAvailable = true;
              for (let d = startIndex; d <= endIndex; d++) {
                if (slots[d][slotIndex]) {
                  isAvailable = false;
                  break;
                }
              }
              if (isAvailable) break;
              slotIndex++;
            }

            for (let d = startIndex; d <= endIndex; d++) {
              slots[d][slotIndex] = evt.id;
            }
            eventSlots[evt.id] = slotIndex;
          });

          return (
            <div
              key={weekIndex}
              className="js-week-row relative w-full min-h-[80px] border-b bg-background overflow-visible"
            >
              {/* CAMADA 1: GRID DE FUNDO VAZIO (Apenas linhas) */}
              <div className={cn(
                "absolute inset-0 grid w-full h-full z-0 pointer-events-none",
                viewMode === "day" ? "grid-cols-1" : "grid-cols-7"
              )}>
                {week.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "border-r h-full border-border/50 relative",
                        !isCurrentMonth && "bg-muted/10"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium ml-auto w-5 h-5 flex items-center justify-center rounded-full absolute top-1 right-1",
                          isToday(day) && "bg-primary text-primary-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CAMADA 3: INTERAÇÃO (Drop Targets) - Z-Index 10 */}
              {/* This must be interactable, so z-10. Events will be z-20. */}
              <div className={cn(
                "absolute inset-0 grid w-full h-full z-10",
                viewMode === "day" ? "grid-cols-1" : "grid-cols-7"
              )}>
                {week.map((day) => (
                  <div key={day.toISOString()} className="h-full min-h-[80px]">
                    <DayDroppableZone
                      day={day}
                      isInteractiveMode={isInteractiveMode}
                    />
                  </div>
                ))}
              </div>

              {/* CAMADA 2: GRID DE EVENTOS (Funcional e Visual) - Z-index 20 */}
              <div className={cn(
                "absolute inset-0 pt-6 grid w-full z-20 pointer-events-none auto-rows-[21px]",
                viewMode === "day" ? "grid-cols-1" : "grid-cols-7"
              )}>
                {weekEvents.map((layoutEvt) => {
                  const originalEvt = displayEvents.find((e) => e.id === layoutEvt.id);
                  if (!originalEvt) return null;

                  const slotIndex = eventSlots[layoutEvt.id] || 0;
                  const isResizing = resizingEventId === originalEvt.id;

                  // --- Render Original Event ---
                  const evtStart = startOfDay(originalEvt.start);
                  const evtEnd = endOfDay(originalEvt.end);
                  const actualStart = isAfter(evtStart, weekStart) ? evtStart : weekStart;
                  const actualEnd = isBefore(evtEnd, weekEnd) ? evtEnd : weekEnd;

                  if (!isBefore(actualEnd, actualStart)) {
                    const startIndex = differenceInCalendarDays(actualStart, weekStart);
                    const durationDays = differenceInCalendarDays(actualEnd, actualStart) + 1;

                    return (
                      <div
                        key={originalEvt.id}
                        className={cn(
                          "relative mx-1 rounded-md shadow-md transition-none pointer-events-auto",
                          isResizing && "opacity-40"
                        )}
                        style={{
                          gridColumnStart: startIndex + 1,
                          gridColumnEnd: `span ${durationDays}`,
                          gridRowStart: slotIndex + 1, // Native Grid Row Stacking
                          height: "20px",
                          marginBottom: "1px"
                        }}
                      >
                        <CalendarEventPill
                          event={originalEvt}
                          isInteractiveMode={isInteractiveMode}
                          onUpdate={updateInteractiveEvent}
                          segment={{
                            event: originalEvt,
                            isStart: isSameDay(actualStart, evtStart),
                            isEnd: isSameDay(actualEnd, evtEnd),
                            span: durationDays,
                          }}
                          onResizeStart={handleResizeStart}
                          isResizing={isResizing}
                          onEventClick={onEventClick}
                        />
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

// Separated Component for the Interaction Layer
function DayDroppableZone({
  day,
  isInteractiveMode,
}: {
  day: Date;
  isInteractiveMode: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, "yyyy-MM-dd"),
    data: { date: day },
    disabled: !isInteractiveMode,
  });

  return (
    <div
      ref={setNodeRef}
      data-date={format(day, "yyyy-MM-dd")}
      className={cn(
        "w-full h-full transition-colors relative",
        // No borders here, they are in Layer 1
        isOver &&
        isInteractiveMode &&
        "bg-primary/5 ring-2 ring-inset ring-primary/20",
        // isToday(day) && "bg-accent/5" // Removed as it is handled in background or not needed for drop zone
      )}
    >
      {/* Empty zone, just for drop */}
    </div>
  );
}
