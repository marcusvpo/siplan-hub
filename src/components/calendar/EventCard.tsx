import { CALENDAR_MEMBERS, CalendarEvent } from "@/types/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { useDraggable } from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";

export interface EventSegment {
  event: CalendarEvent;
  isStart: boolean;
  isEnd: boolean;
  span: number; // How many days this segment spans in the current row
}

interface CalendarEventPillProps {
  event: CalendarEvent;
  isInteractiveMode: boolean;
  segment: EventSegment;
  onResizeStart: (
    e: React.PointerEvent | React.MouseEvent,
    event: CalendarEvent
  ) => void;
  isResizing?: boolean;
  isResizingAny?: boolean;
}

export function CalendarEventPill({
  event,
  isInteractiveMode,
  segment,
  onResizeStart,
  isResizing,
}: CalendarEventPillProps) {
  const member = CALENDAR_MEMBERS.find((m) => m.id === event.resourceId);
  const colorClass = member?.color || "bg-slate-500";

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${event.id}-${segment.isStart ? "start" : "cont"}-${segment.span}`, // Unique ID per segment visual
      data: { event }, // Pass full event
      disabled: !isInteractiveMode,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef} // Draggable Node (receives transform)
      {...attributes}
      style={{
        ...style,
        width: `calc(${segment.span * 100}% - 8px)`, // Span multiple columns
        zIndex: isDragging ? 50 : 10,
        touchAction: "none",
      }}
      className={cn(
        "absolute top-0 left-0 h-6 m-1 rounded-md text-white text-[10px] font-medium shadow-sm select-none transition-all flex items-center overflow-hidden",
        colorClass,
        isDragging && "opacity-50",
        isResizing && "opacity-80",
        !segment.isStart && "rounded-l-none border-l border-white/20 ml-0",
        !segment.isEnd && "rounded-r-none border-r border-white/20 mr-0"
      )}
    >
      {/* Drag Handle Area - Wraps content */}
      <div
        {...listeners} // Listeners applied ONLY here
        className={cn(
          "flex-1 h-full flex items-center px-2 min-w-0",
          isInteractiveMode &&
            "cursor-grab active:cursor-grabbing hover:brightness-110"
        )}
      >
        {segment.isStart && (
          <span className="truncate">{event.clientName || event.title}</span>
        )}
      </div>

      {/* Resize Handle - OUTSIDE the Drag Handle Area */}
      {isInteractiveMode && segment.isEnd && (
        <div
          className="w-3 h-full cursor-col-resize hover:bg-white/20 flex items-center justify-center group shrink-0"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(e, event);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="w-0.5 h-3 bg-white/50 rounded-full group-hover:bg-white" />
        </div>
      )}
    </div>
  );
}
