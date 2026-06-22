import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useConversionPosts } from "@/hooks/useConversionPosts";
import { useHomologationEvents } from "@/hooks/useHomologationEvents";
import { ConversionPostFeed } from "./ConversionPostFeed";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, User, History, Clock, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversionPostDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  clientName: string;
  ticketNumber?: string;
  queueStatus: string;
  assignedToName?: string | null;
  defaultTab?: "posts" | "homologations";
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  waiting_client: "Aguard. Cliente",
  awaiting_homologation: "Aguard. Homologação",
  homologation: "Homologação",
  homologation_issues: "Problemas (Inconsistências)",
  approved: "Aprovado",
  done: "Concluído",
  cancelled: "Cancelado",
};

export function ConversionPostDrawer({
  isOpen,
  onClose,
  projectId,
  clientName,
  ticketNumber,
  queueStatus,
  assignedToName,
  defaultTab,
}: ConversionPostDrawerProps) {
  const { posts, loading: postsLoading } = useConversionPosts(isOpen ? projectId : null);
  const { events, loading: eventsLoading } = useHomologationEvents(isOpen ? projectId : null);

  const [activeTab, setActiveTab] = useState<string>("posts");

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab || "posts");
    }
  }, [isOpen, defaultTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="space-y-3 p-6 pb-2 shrink-0 bg-muted/10">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="truncate">{clientName}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalhes, notas e histórico de homologação do cliente {clientName}
          </DialogDescription>
          <div className="flex items-center gap-2 flex-wrap">
            {ticketNumber && (
              <Badge variant="outline" className="text-xs font-mono bg-background">
                #{ticketNumber}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {STATUS_LABELS[queueStatus] || queueStatus}
            </Badge>
            {assignedToName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                Conversor: {assignedToName}
              </div>
            )}
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 shrink-0 bg-muted/40 border">
            <TabsTrigger value="posts" className="gap-1.5 py-2">
              <MessageSquare className="h-4 w-4" />
              Diário / Notas ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="homologations" className="gap-1.5 py-2">
              <History className="h-4 w-4" />
              Histórico de Homologações ({events.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="flex-1 overflow-y-auto px-6 py-4 focus-visible:outline-none">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
              Notas e Publicações da Conversão
            </h4>
            <ConversionPostFeed posts={posts} loading={postsLoading} readOnly />
          </TabsContent>

          <TabsContent value="homologations" className="flex-1 overflow-y-auto px-6 py-4 focus-visible:outline-none">
            <h4 className="text-sm font-semibold mb-4 text-muted-foreground">
              Histórico de Movimentações da Homologação
            </h4>
            
            {eventsLoading ? (
              <div className="text-center py-12 text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando histórico...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-lg p-6 bg-slate-50/50 dark:bg-slate-900/10">
                Nenhuma movimentação de homologação registrada para este projeto.
              </div>
            ) : (
              <div className="space-y-6 relative pl-5 border-l border-slate-200 dark:border-slate-800 py-2 ml-3">
                {events.map((event) => {
                  const isApproved = event.toStatus === "approved" || event.toStatus === "done";
                  const isIssues = event.toStatus === "homologation_issues";
                  const isAwaiting = event.toStatus === "awaiting_homologation";
                  const isStarting = event.toStatus === "homologation";
                  
                  return (
                    <div key={event.id} className="relative space-y-2">
                      {/* Timeline Bullet */}
                      <div className={cn(
                        "absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-background shadow-sm",
                        isApproved && "border-emerald-500 bg-emerald-500 dark:bg-emerald-550",
                        isIssues && "border-red-500 bg-red-500",
                        isAwaiting && "border-indigo-500 bg-indigo-500",
                        isStarting && "border-primary bg-primary"
                      )} />

                      {/* Event Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {isApproved && "Aprovada Sem Inconsistências"}
                            {isIssues && "Retornado com Inconsistências"}
                            {isAwaiting && "Enviado para Homologação"}
                            {isStarting && "Homologação Iniciada"}
                          </span>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-bold px-1.5 py-0 uppercase border",
                            isApproved && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450",
                            isIssues && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-450",
                            isAwaiting && "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-450",
                            isStarting && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450"
                          )}>
                            {event.toStatus}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {format(event.timestamp, "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>

                      {/* Performed by */}
                      <p className="text-xs text-muted-foreground">
                        Por: <strong className="text-foreground">{event.performedByName}</strong>
                      </p>

                      {/* Report content / notes */}
                      {event.notes && (
                        <div
                          className="text-xs border rounded-lg p-3 bg-muted/20 dark:bg-muted/10 prose dark:prose-invert max-w-none break-words overflow-x-auto mt-2 shadow-sm"
                          dangerouslySetInnerHTML={{ __html: event.notes }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
