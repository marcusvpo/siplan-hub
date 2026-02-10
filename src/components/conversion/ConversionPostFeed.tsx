import { ConversionPost } from "@/hooks/useConversionPosts";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageSquare,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  StickyNote,
  Trash2,
  ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ConversionPostFeedProps {
  posts: ConversionPost[];
  loading: boolean;
  onDelete?: (postId: string) => void;
  currentUserId?: string;
  readOnly?: boolean;
}

const POST_TYPE_CONFIG: Record<
  ConversionPost["postType"],
  { label: string; icon: React.ElementType; color: string }
> = {
  update: {
    label: "Atualização",
    icon: MessageSquare,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  stage_change: {
    label: "Mudança de Etapa",
    icon: ArrowRightLeft,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  issue: {
    label: "Problema",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  resolution: {
    label: "Resolução",
    icon: CheckCircle2,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  note: {
    label: "Nota",
    icon: StickyNote,
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

function formatPostDate(date: Date): string {
  if (isToday(date)) return `Hoje às ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `Ontem às ${format(date, "HH:mm")}`;
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function groupPostsByDate(
  posts: ConversionPost[],
): { label: string; posts: ConversionPost[] }[] {
  const groups: Map<string, ConversionPost[]> = new Map();

  posts.forEach((post) => {
    let label: string;
    if (isToday(post.createdAt)) {
      label = "Hoje";
    } else if (isYesterday(post.createdAt)) {
      label = "Ontem";
    } else {
      label = format(post.createdAt, "dd/MM/yyyy", { locale: ptBR });
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(post);
  });

  return Array.from(groups.entries()).map(([label, posts]) => ({
    label,
    posts,
  }));
}

export function ConversionPostFeed({
  posts,
  loading,
  onDelete,
  currentUserId,
  readOnly = false,
}: ConversionPostFeedProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma publicação ainda</p>
      </div>
    );
  }

  const groups = groupPostsByDate(posts);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground px-2">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            {group.posts.map((post) => {
              const config = POST_TYPE_CONFIG[post.postType];
              const Icon = config.icon;
              const canDelete =
                !readOnly && currentUserId && post.authorId === currentUserId;

              return (
                <div
                  key={post.id}
                  className="group relative flex gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {getInitials(post.authorName)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {post.authorName}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0", config.color)}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      {post.stage && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {post.stage}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                        {formatPostDate(post.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                      {post.content}
                    </p>

                    {/* Images */}
                    {post.imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.imageUrls.map((url, i) => (
                          <Dialog key={i}>
                            <DialogTrigger asChild>
                              <button className="relative h-16 w-16 rounded-md overflow-hidden border border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
                                <img
                                  src={url}
                                  alt={`Imagem ${i + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-70" />
                                </div>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl p-2">
                              <img
                                src={url}
                                alt={`Imagem ${i + 1}`}
                                className="w-full h-auto rounded"
                              />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete?.(post.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
