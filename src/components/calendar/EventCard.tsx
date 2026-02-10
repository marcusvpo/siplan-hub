import { CALENDAR_MEMBERS, CalendarEvent } from "@/types/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CheckCircle2, Palmtree, BarChart3 } from "lucide-react";

import { useDraggable } from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";

export interface EventSegment {
  event: CalendarEvent;
  isStart: boolean;
  isEnd: boolean;
  span: number;
}

interface CalendarEventPillProps {
  event: CalendarEvent;
  isInteractiveMode: boolean;
  segment: EventSegment;
  onResizeStart: (
    e: React.PointerEvent | React.MouseEvent,
    event: CalendarEvent,
  ) => void;
  onUpdate?: (event: CalendarEvent) => void;
  isResizing?: boolean;
  isResizingAny?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

function getEventTypeStyles(type: CalendarEvent["type"], colorClass: string) {
  switch (type) {
    case "vacation":
      return {
        className:
          "bg-red-500/15 border-2 border-dashed border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 italic",
        backgroundStyle: {
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(239,68,68,0.08) 3px, rgba(239,68,68,0.08) 6px)",
        } as React.CSSProperties,
        icon: Palmtree,
        disableDrag: true,
      };
    case "adherence":
      return {
        className:
          "bg-transparent border-2 border-dashed border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300",
        backgroundStyle: {} as React.CSSProperties,
        icon: BarChart3,
        disableDrag: false,
      };
    case "homologation":
      return {
        className: "bg-gradient-to-r from-violet-600 to-purple-500 text-white",
        backgroundStyle: {} as React.CSSProperties,
        icon: CheckCircle2,
        disableDrag: false,
      };
    default:
      return {
        className: `${colorClass} text-white`,
        backgroundStyle: {} as React.CSSProperties,
        icon: null,
        disableDrag: false,
      };
  }
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

  const typeStyles = getEventTypeStyles(event.type, colorClass);
  const TypeIcon = typeStyles.icon;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${event.id}-${segment.isStart ? "start" : "cont"}-${segment.span}`,
      data: { event },
      disabled: !isInteractiveMode || isEditing || typeStyles.disableDrag,
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

  const isSpecialType =
    event.type === "vacation" ||
    event.type === "adherence" ||
    event.type === "homologation";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        ...style,
        ...typeStyles.backgroundStyle,
        zIndex: isDragging ? 50 : 10,
        touchAction: "none",
      }}
      className={cn(
        "relative w-full h-full rounded-md text-[10px] font-medium shadow-sm select-none transition-all flex items-center overflow-hidden",
        isSpecialType
          ? typeStyles.className
          : cn(typeStyles.className, "shadow-sm"),
        isDragging && "opacity-50",
        isResizing && "opacity-80",
        !segment.isStart && "rounded-l-none border-l border-white/20 ml-0",
        !segment.isEnd && "rounded-r-none border-r border-white/20 mr-0",
      )}
    >
      {/* Drag Handle Area */}
      <div
        {...listeners}
        className={cn(
          "flex-1 h-full flex items-center px-2 min-w-0 gap-1",
          isInteractiveMode &&
            !isEditing &&
            !typeStyles.disableDrag &&
            "cursor-grab active:cursor-grabbing hover:brightness-110",
        )}
        onClick={(e) => {
          if (isInteractiveMode && segment.isStart) {
            // No-op: interactive mode handles start segments via drag
          } else if (!isInteractiveMode && onEventClick) {
            onEventClick(event);
          }
        }}
      >
        {/* Type icon for special events */}
        {segment.isStart && TypeIcon && (
          <TypeIcon className="h-3 w-3 flex-shrink-0 opacity-70" />
        )}

        {segment.isStart &&
          (isEditing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-none outline-none text-[10px] p-0 shadow-none h-full"
            />
          ) : (
            <span
              className={cn(
                "truncate",
                !typeStyles.disableDrag && "cursor-text hover:underline",
              )}
              title={
                typeStyles.disableDrag ? event.title : "Clique para editar"
              }
              onPointerDown={(e) => {
                if (isInteractiveMode && !typeStyles.disableDrag) {
                  e.stopPropagation();
                }
              }}
              onClick={(e) => {
                if (isInteractiveMode && !typeStyles.disableDrag) {
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
          ))}
      </div>

      {/* Resize Handle */}
      {isInteractiveMode &&
        segment.isEnd &&
        !isEditing &&
        !typeStyles.disableDrag && (
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
