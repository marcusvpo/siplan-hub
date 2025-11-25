import { useState } from "react";
import { Project } from "@/types/project";
import { useTimeline } from "@/hooks/useTimeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface TimelinePanelProps {
  project: Project;
}

export const TimelinePanel = ({ project }: TimelinePanelProps) => {
  const [comment, setComment] = useState("");
  const { addComment } = useTimeline();

  const handleSendComment = () => {
    if (!comment.trim()) {
      toast.error("Digite um comentário");
      return;
    }

    addComment.mutate(
      { projectId: project.id, message: comment.trim() },
      {
        onSuccess: () => {
          setComment("");
          toast.success("Comentário adicionado!");
        },
      }
    );
  };

  const sortedTimeline = [...project.timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b bg-card">
        <h3 className="font-semibold">Histórico de Atividades</h3>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {sortedTimeline.map((event) => {
            return (
              <div
                key={event.id}
                className={`rounded-lg p-3 ${
                  event.type === "comment" ? "bg-card border" : "bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {event.type === "comment" ? (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {event.author}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.timestamp), "dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{event.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-4 bg-card">
        <div className="space-y-2">
          <Textarea
            placeholder="Escreva uma atualização..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <Button 
            onClick={handleSendComment} 
            className="w-full"
            disabled={addComment.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {addComment.isPending ? "Enviando..." : "Enviar Comentário"}
          </Button>
        </div>
      </div>
    </div>
  );
};
