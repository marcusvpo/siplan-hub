import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useConversionPosts } from "@/hooks/useConversionPosts";
import { ConversionPostFeed } from "./ConversionPostFeed";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, User } from "lucide-react";

interface ConversionPostDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  clientName: string;
  ticketNumber?: string;
  queueStatus: string;
  assignedToName?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  waiting_client: "Aguard. Cliente",
  awaiting_homologation: "Aguard. Homologação",
  homologation: "Homologação",
  homologation_issues: "Problemas",
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
}: ConversionPostDrawerProps) {
  const { posts, loading } = useConversionPosts(isOpen ? projectId : null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="space-y-3 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="truncate">{clientName}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {ticketNumber && (
              <Badge variant="outline" className="text-xs">
                #{ticketNumber}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {STATUS_LABELS[queueStatus] || queueStatus}
            </Badge>
            {assignedToName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {assignedToName}
              </div>
            )}
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto py-4">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
            Histórico de Publicações ({posts.length})
          </h4>
          <ConversionPostFeed posts={posts} loading={loading} readOnly />
        </div>
      </DialogContent>
    </Dialog>
  );
}
