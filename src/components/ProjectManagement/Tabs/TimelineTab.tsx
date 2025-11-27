import { Project, TimelineEvent } from "@/types/project";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Paperclip, MessageSquare, FileText, Activity } from "lucide-react";
import { useState } from "react";

interface TabProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

export function TimelineTab({ project, onUpdate }: TabProps) {
  const { data, handleChange } = useAutoSave(project, async (newData) => {
    onUpdate(newData);
  });

  const [newComment, setNewComment] = useState("");

  const handlePostComment = () => {
    if (!newComment.trim()) return;

    const newEvent: TimelineEvent = {
      id: crypto.randomUUID(),
      projectId: project.id,
      type: 'comment',
      author: 'current-user-id', // Replace with actual user ID
      authorName: 'Você', // Replace with actual user name
      message: newComment,
      timestamp: new Date(),
      visibility: 'public'
    };

    const newTimeline = [newEvent, ...data.timeline];
    handleChange('timeline', newTimeline);
    setNewComment("");
  };

  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'file_upload': return <Paperclip className="h-4 w-4" />;
      case 'status_change': return <Activity className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Input Area */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar>
              <AvatarFallback>EU</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea 
                placeholder="Escreva um comentário ou mencione @alguém..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Anexar
                </Button>
                <Button onClick={handlePostComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Feed */}
      <div className="space-y-6">
        {data.timeline.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            Nenhuma atividade registrada.
          </div>
        )}
        
        {data.timeline.map((event) => (
          <div key={event.id} className="flex gap-4">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback>{event.authorName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{event.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                  {getIcon(event.type)}
                  {event.type === 'comment' && 'Comentário'}
                  {event.type === 'file_upload' && 'Arquivo'}
                  {event.type === 'status_change' && 'Status'}
                </Badge>
              </div>
              
              <div className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-md">
                {event.message}
              </div>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">Responder</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">Reagir</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
