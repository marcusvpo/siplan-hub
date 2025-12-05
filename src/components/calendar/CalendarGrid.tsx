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
  differenceInDays,
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

// --- Main Component ---

export function CalendarGrid() {
  const {
    currentDate,
    interactiveEvents,
    realEvents,
    isInteractiveMode,
    updateInteractiveEvent,
  } = useCalendarStore();

  const displayEvents = isInteractiveMode ? interactiveEvents : realEvents;

  // Resize State
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(
    null
  );
  const [previewEndDate, setPreviewEndDate] = useState<Date | null>(null);

  // Generate Grid Data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // --- Resize Logic ---

  // Ref for the grid container to calculate coordinates
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag State Ref to avoid stale closures and re-renders
  const dragStateRef = useRef<{
    startX: number;
    initialEndDate: Date;
    cellWidth: number;
    event: CalendarEvent;
    pointerId?: number;
  } | null>(null);

  // Ref to track the latest preview date for the event handler closure
  const latestPreviewDateRef = useRef<Date | null>(null);

  // Update the ref whenever state changes
  useEffect(() => {
    latestPreviewDateRef.current = previewEndDate;
  }, [previewEndDate]);

  const handleResizeMove = (e: PointerEvent) => {
    if (!dragStateRef.current) return;

    const { startX, initialEndDate, cellWidth, event } = dragStateRef.current;

    // Prevent default to stop scrolling/interactions on touch devices
    e.preventDefault();

    const currentX = e.clientX;
    const deltaX = currentX - startX;

    // Calculate how many "days" we moved based on cell width
    // Rounding ensures we snap to the nearest day
    const daysMoved = Math.round(deltaX / cellWidth);

    // Calculate new date
    const newDate = addDays(initialEndDate, daysMoved);

    // Constraint: Cannot resize to before start date
    if (newDate >= startOfDay(event.start)) {
      setPreviewEndDate((prev) => {
        if (!prev || !isSameDay(prev, newDate)) {
          return newDate;
        }
        return prev;
      });
    }
  };

  const handleResizeEnd = (e: PointerEvent) => {
    // Release pointer capture if needed
    try {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.releasePointerCapture &&
        dragStateRef.current?.pointerId
      ) {
        target.releasePointerCapture(dragStateRef.current.pointerId);
      }
    } catch {
      // Ignore errors
    }

    // Cleanup styles
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    // Remove listeners
    window.removeEventListener("pointermove", handleResizeMove);
    window.removeEventListener("pointerup", handleResizeEnd);

    if (dragStateRef.current && latestPreviewDateRef.current) {
      updateInteractiveEvent({
        ...dragStateRef.current.event,
        end: latestPreviewDateRef.current,
      });
    }

    setResizingEvent(null);
    setPreviewEndDate(null);
    dragStateRef.current = null;
  };

  const handleResizeStart = (
    e: React.PointerEvent | React.MouseEvent,
    event: CalendarEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    // Robust cell width calculation:
    // Try to measure a real week row first for accuracy
    let cellWidth = 0;
    const firstWeekRow = containerRef.current.firstElementChild;
    if (firstWeekRow) {
      cellWidth = firstWeekRow.getBoundingClientRect().width / 7;
    } else {
      // Fallback to container width
      cellWidth = containerRef.current.getBoundingClientRect().width / 7;
    }

    if (cellWidth === 0) cellWidth = 100;

    // Set pointer capture for smoother dragging
    let pointerId = 0;
    if ("pointerId" in e) {
      const pe = e as React.PointerEvent;
      pointerId = pe.pointerId;
      try {
        (e.target as HTMLElement).setPointerCapture(pointerId);
      } catch {
        // ignore
      }
    }

    setResizingEvent(event);
    setPreviewEndDate(event.end);
    latestPreviewDateRef.current = event.end;

    dragStateRef.current = {
      startX: e.clientX,
      initialEndDate: event.end,
      cellWidth: cellWidth,
      event: event,
      pointerId: pointerId,
    };

    // Disable text selection globally
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    // Attach window listeners
    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handleResizeEnd);
  };

  // --- Rendering Helpers ---

  const effectiveEvents = displayEvents.map((evt) => {
    if (resizingEvent && evt.id === resizingEvent.id && previewEndDate) {
      return { ...evt, end: previewEndDate };
    }
    return evt;
  });

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background shadow-sm overflow-hidden select-none">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div ref={containerRef} className="flex-1 flex flex-col">
        {weeks.map((week, weekIndex) => {
          // --- Slot Layout Algorithm for this Week ---
          const weekStart = startOfDay(week[0]);
          const weekEnd = endOfDay(week[6]);

          // 1. Filter events in this week
          const weekEvents = effectiveEvents.filter((evt) => {
            const evtStart = startOfDay(evt.start);
            const evtEnd = endOfDay(evt.end);
            return evtEnd >= weekStart && evtStart <= weekEnd;
          });

          // 2. Sort by start date, then duration (longer first)
          weekEvents.sort((a, b) => {
            const startDiff = a.start.getTime() - b.start.getTime();
            if (startDiff !== 0) return startDiff;
            return b.end.getTime() - a.end.getTime();
          });

          // 3. Assign slots
          const slots: string[][] = Array(7)
            .fill(null)
            .map(() => []); // 7 days, list of event IDs in each slot
          const eventSlots: Record<string, number> = {}; // Map event ID -> slot index

          weekEvents.forEach((evt) => {
            const evtStart = startOfDay(evt.start);
            const evtEnd = endOfDay(evt.end);

            // Calculate start/end indices in this week (0-6)
            let startIndex = differenceInDays(evtStart, weekStart);
            let endIndex = differenceInDays(evtEnd, weekStart);

            // Clamp to 0-6
            if (startIndex < 0) startIndex = 0;
            if (endIndex > 6) endIndex = 6;

            // Find first available slot index
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

            // Mark slots as occupied
            for (let d = startIndex; d <= endIndex; d++) {
              slots[d][slotIndex] = evt.id;
            }
            eventSlots[evt.id] = slotIndex;
          });

          return (
            <div
              key={weekIndex}
              className="flex-1 grid grid-cols-7 min-h-[120px] relative"
            >
              {/* Background Cells */}
              {week.map((day) => (
                <DayCellBackground
                  key={day.toISOString()}
                  day={day}
                  isInteractiveMode={isInteractiveMode}
                />
              ))}

              {/* Events Layer */}
              <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                {week.map((day, dayIndex) => {
                  // Render events that START on this day (or continue from prev week if dayIndex 0)
                  const dayEventsToRender = weekEvents.filter((evt) => {
                    const evtStart = startOfDay(evt.start);
                    const startsToday = isSameDay(day, evtStart);
                    const continuesFromPrevWeek =
                      isBefore(evtStart, weekStart) && dayIndex === 0;
                    return startsToday || continuesFromPrevWeek;
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className="relative w-full h-full"
                    >
                      {dayEventsToRender.map((event) => {
                        const evtEnd = endOfDay(event.end);
                        const actualEnd = isBefore(evtEnd, weekEnd)
                          ? evtEnd
                          : weekEnd;
                        const span =
                          differenceInDays(actualEnd, startOfDay(day)) + 1;
                        const slotIndex = eventSlots[event.id] || 0;

                        const segment: EventSegment = {
                          event,
                          isStart: isSameDay(day, startOfDay(event.start)),
                          isEnd:
                            isSameDay(day, startOfDay(event.end)) ||
                            isSameDay(actualEnd, startOfDay(event.end)),
                          span,
                        };

                        return (
                          <div
                            key={event.id}
                            className="absolute left-0 right-0 pointer-events-auto px-1"
                            style={{
                              top: `${32 + slotIndex * 28}px`, // 32px offset for header/padding, 28px per row
                              width: `${span * 100}%`,
                              zIndex: 10 + slotIndex,
                            }}
                          >
                            <CalendarEventPill
                              event={event}
                              isInteractiveMode={isInteractiveMode}
                              segment={segment}
                              onResizeStart={handleResizeStart}
                              isResizing={resizingEvent?.id === event.id}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayCellBackground({
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

  const { currentDate } = useCalendarStore();
  const isCurrentMonth = isSameMonth(day, currentDate);

  return (
    <div
      ref={setNodeRef}
      data-date={format(day, "yyyy-MM-dd")} // For resize detection
      className={cn(
        "border-b border-r p-2 transition-colors relative h-full",
        !isCurrentMonth && "bg-muted/10 text-muted-foreground",
        isOver &&
          isInteractiveMode &&
          "bg-primary/5 ring-2 ring-inset ring-primary/20",
        isToday(day) && "bg-accent/5"
      )}
    >
      <span
        className={cn(
          "text-sm font-medium ml-auto w-6 h-6 flex items-center justify-center rounded-full absolute top-2 right-2",
          isToday(day) && "bg-primary text-primary-foreground"
        )}
      >
        {format(day, "d")}
      </span>
    </div>
  );
}
