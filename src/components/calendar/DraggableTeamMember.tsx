import { useDraggable } from "@dnd-kit/core";
import { CalendarMember } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DraggableTeamMemberProps {
  member: CalendarMember;
}

export function DraggableTeamMember({ member }: DraggableTeamMemberProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `new-event-${member.id}`,
      data: {
        isNew: true,
        memberId: member.id,
        title: "Nova Alocação",
        type: "implementation",
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm cursor-grab active:cursor-grabbing hover:brightness-110 transition-all select-none bg-background",
        isDragging && "opacity-50 z-50 shadow-xl ring-2 ring-primary"
      )}
    >
      <div className={cn("w-3 h-3 rounded-full", member.color)} />
      <span className="text-sm font-medium">{member.name}</span>
    </div>
  );
}
