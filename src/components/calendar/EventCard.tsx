import { CALENDAR_MEMBERS, CalendarEvent } from "@/types/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react"; // Added missing import

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
  onUpdate?: (event: CalendarEvent) => void; 
  isResizing?: boolean;
  isResizingAny?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarEventPill({
  event,
  isInteractiveMode,
  segment,
  onResizeStart,
  onUpdate,
  isResizing,
  onEventClick,
}: CalendarEventPillProps) {
  const member = CALENDAR_MEMBERS.find((m) => m.id === event.resourceId);
  const colorClass = event.color || member?.color || "bg-slate-500";
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${event.id}-${segment.isStart ? "start" : "cont"}-${segment.span}`, 
      data: { event }, 
      disabled: !isInteractiveMode || isEditing, // Disable drag when editing
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const handleSave = () => {
    setIsEditing(false);
    if (onUpdate && editTitle !== event.title) {
        onUpdate({ ...event, title: editTitle });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
          handleSave();
      }
  };

  return (
    <div
      ref={setNodeRef} 
      {...attributes}
      style={{
        ...style,
        zIndex: isDragging ? 50 : 10,
        touchAction: "none",
      }}
      className={cn(
        "relative w-full h-full rounded-md text-white text-[10px] font-medium shadow-sm select-none transition-all flex items-center overflow-hidden",
        colorClass,
        isDragging && "opacity-50",
        isResizing && "opacity-80",
        !segment.isStart && "rounded-l-none border-l border-white/20 ml-0",
        !segment.isEnd && "rounded-r-none border-r border-white/20 mr-0"
      )}
    >
      {/* Drag Handle Area */}
      <div
        {...listeners} 
        className={cn(
          "flex-1 h-full flex items-center px-2 min-w-0",
          isInteractiveMode && !isEditing &&
            "cursor-grab active:cursor-grabbing hover:brightness-110"
        )}
        onClick={(e) => {
            if (isInteractiveMode && segment.isStart) {
                // Interactive mode edit logic is inside the children, 
                // but if we click outside the text span (e.g. empty space), maybe we want to select?
            } else if (!isInteractiveMode && onEventClick) {
                onEventClick(event);
            }
        }}
      >
        {segment.isStart && (
          isEditing ? (
              <input 
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onPointerDown={(e) => e.stopPropagation()} 
                className="w-full bg-transparent border-none outline-none text-white text-[10px] p-0 shadow-none h-full"
              />
          ) : (
            <span 
                className="truncate cursor-text hover:underline"
                title="Clique para editar"
                onPointerDown={(e) => {
                    // CRITICAL: Stop propagation to prevent dnd-kit from starting a drag
                    if(isInteractiveMode) {
                        e.stopPropagation();
                    }
                }}
                onClick={(e) => {
                    if(isInteractiveMode) {
                        e.stopPropagation();
                        setIsEditing(true);
                        setEditTitle(event.title);
                    } else if (onEventClick) {
                        e.stopPropagation();
                        onEventClick(event);
                    }
                }}
            >
                {event.clientName || event.title}
            </span>
          )
        )}
      </div>

      {/* Resize Handle - OUTSIDE the Drag Handle Area */}
      {isInteractiveMode && segment.isEnd && !isEditing && (
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
