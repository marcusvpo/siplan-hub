import { useDraggable } from "@dnd-kit/core";
import { CalendarMember } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores/calendarStore";

interface DraggableTeamMemberProps {
  member: CalendarMember;
}

export function DraggableTeamMember({ member }: DraggableTeamMemberProps) {
  const hiddenResourceIds = useCalendarStore((state) => state.hiddenResourceIds);
  const toggleResourceVisibility = useCalendarStore((state) => state.toggleResourceVisibility);
  const isHidden = hiddenResourceIds.includes(member.id);

  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `new-event-${member.id}`,
      data: {
        isNew: true,
        memberId: member.id,
        title: "Nova Alocação",
        type: "implementation",
      },
      disabled: isHidden,
    });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        toggleResourceVisibility(member.id);
      }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full border shadow-sm transition-all select-none",
        isHidden
          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-60 grayscale cursor-pointer"
          : "bg-background border-input cursor-grab active:cursor-grabbing hover:shadow-md",
        isDragging && "opacity-50 z-50 shadow-xl ring-2 ring-primary"
      )}
    >
      <div className={cn("w-2 h-2 rounded-full shrink-0", isHidden ? "bg-slate-300 dark:bg-slate-600" : member.color)} />
      <span className="text-[10px] font-medium truncate">{member.name}</span>
    </div>
  );
}
