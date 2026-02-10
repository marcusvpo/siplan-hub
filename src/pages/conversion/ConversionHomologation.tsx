import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useConversionQueue,
  ConversionQueueItem,
} from "@/hooks/useConversionQueue";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConversionHomologation() {
  const { user } = useAuth();
  const currentUserId = user?.id || "";
  const currentUserName =
    user?.user_metadata?.full_name || user?.email || "Usuário";

  const { homologationQueue, loading, approveHomologation, refetch } =
    useConversionQueue({ userId: currentUserId });

  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    item?: ConversionQueueItem;
  }>({ open: false });
  const [issueDialog, setIssueDialog] = useState<{
    open: boolean;
    item?: ConversionQueueItem;
  }>({ open: false });
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issuePriority, setIssuePriority] = useState("medium");

  // Filtered items
  const filteredItems = useMemo(() => {
    return homologationQueue.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [homologationQueue, searchQuery]);

  const handleApprove = async () => {
    if (!approveDialog.item) return;

    const success = await approveHomologation(approveDialog.item.id);

    if (success) {
      toast.success("Homologação aprovada!");
      setApproveDialog({ open: false });
    } else {
      toast.error("Erro ao aprovar homologação");
    }
  };

  const handleReportIssue = async () => {
    if (!issueDialog.item || !issueTitle) {
      toast.error("Preencha o título da inconsistência");
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("conversion_posts")
        .insert({
          project_id: issueDialog.item.projectId,
          author_id: currentUserId || null,
          author_name: currentUserName,
          content: `**${issueTitle}**${issueDescription ? `\n\n${issueDescription}` : ""}\n\n_Prioridade: ${issuePriority === "high" ? "Alta" : issuePriority === "medium" ? "Média" : "Baixa"}_`,
          post_type: "issue",
          image_urls: [],
        });

      if (error) throw error;

      toast.success("Inconsistência reportada!");
      setIssueDialog({ open: false });
      setIssueTitle("");
      setIssueDescription("");
      setIssuePriority("medium");
    } catch (err) {
      console.error("Error reporting issue:", err);
      toast.error("Erro ao reportar inconsistência");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const awaiting = homologationQueue.filter(
      (i) => i.queueStatus === "awaiting_homologation",
    ).length;
    const inProgress = homologationQueue.filter(
      (i) => i.queueStatus === "homologation",
    ).length;
    return { total: homologationQueue.length, awaiting, inProgress };
  }, [homologationQueue]);

  // Stats cards
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">
              Aguardando
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.awaiting}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              Em Validação
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Total</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.total}</p>
        </CardContent>
      </Card>
    </div>
  );

  // Item card
  const renderItem = (item: ConversionQueueItem) => {
    const daysInQueue = Math.floor(
      (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
      <Card
        key={item.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg truncate">
                  {item.clientName}
                </h3>
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-100 text-purple-700 border-purple-300"
                >
                  {item.queueStatus === "awaiting_homologation"
                    ? "Aguardando"
                    : "Em Validação"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">#{item.ticketNumber}</span>
                <span>{item.systemType}</span>
                {item.legacySystem && (
                  <span className="text-xs">← {item.legacySystem}</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  Enviado{" "}
                  {formatDistanceToNow(item.sentAt, {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
                {item.assignedToName && (
                  <span>Convertido por: {item.assignedToName}</span>
                )}
              </div>
            </div>

            {/* Days indicator */}
            <span
              className={cn(
                "text-xs font-medium",
                daysInQueue > 5
                  ? "text-red-600"
                  : daysInQueue > 3
                    ? "text-orange-600"
                    : "text-muted-foreground",
              )}
            >
              {daysInQueue}d na fila
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setApproveDialog({ open: true, item })}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIssueDialog({ open: true, item })}
                    className="text-orange-600"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reportar Inconsistência
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Homologação</h1>
            <p className="text-muted-foreground">
              Validação de conversões finalizadas
            </p>
          </div>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Items */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum projeto aguardando homologação
          </h3>
          <p className="text-muted-foreground">
            Projetos aparecerão aqui quando forem enviados para validação
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => renderItem(item))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => setApproveDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Homologação</DialogTitle>
            <DialogDescription>
              Confirmar aprovação da conversão de "
              {approveDialog.item?.clientName}"?
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">
              A conversão será marcada como concluída e o projeto seguirá para
              as próximas etapas.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Aprovar Homologação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Dialog */}
      <Dialog
        open={issueDialog.open}
        onOpenChange={(open) => setIssueDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Inconsistência</DialogTitle>
            <DialogDescription>
              Reportar problema encontrado em "{issueDialog.item?.clientName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="Resumo do problema..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Detalhes do problema encontrado..."
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={issuePriority} onValueChange={setIssuePriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIssueDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReportIssue}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reportar Inconsistência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
