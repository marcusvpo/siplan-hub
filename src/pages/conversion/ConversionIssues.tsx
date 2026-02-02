import { useState, useMemo } from "react";
import {
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  MoreVertical,
  Trash2,
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
  useConversionIssues,
  ConversionIssue,
} from "@/hooks/useConversionIssues";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Status labels and colors
const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Análise",
  resolved: "Resolvido",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700 border-red-300",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-300",
  resolved: "bg-green-100 text-green-700 border-green-300",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-300",
  medium: "bg-orange-100 text-orange-700 border-orange-300",
  low: "bg-slate-100 text-slate-700 border-slate-300",
};

// Mock current user
const CURRENT_USER = {
  id: "current-user-id",
  name: "Usuário Atual",
};

export default function ConversionIssues() {
  const {
    issues,
    stats,
    loading,
    reportIssue,
    updateStatus,
    resolveIssue,
    deleteIssue,
    refetch,
  } = useConversionIssues();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Resolve dialog
  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean;
    issue?: ConversionIssue;
  }>({ open: false });
  const [resolveNotes, setResolveNotes] = useState("");

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    issue?: ConversionIssue;
  }>({ open: false });

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch =
        !searchQuery ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || issue.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || issue.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [issues, searchQuery, statusFilter, priorityFilter]);

  const handleResolve = async () => {
    if (!resolveDialog.issue) return;

    const success = await resolveIssue(
      resolveDialog.issue.id,
      CURRENT_USER.name,
      resolveNotes,
    );

    if (success) {
      toast.success("Inconsistência resolvida!");
      setResolveDialog({ open: false });
      setResolveNotes("");
    } else {
      toast.error("Erro ao resolver inconsistência");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.issue) return;

    const success = await deleteIssue(deleteDialog.issue.id);

    if (success) {
      toast.success("Inconsistência removida!");
      setDeleteDialog({ open: false });
    } else {
      toast.error("Erro ao remover inconsistência");
    }
  };

  const handleStatusChange = async (issue: ConversionIssue, status: string) => {
    const success = await updateStatus(issue.id, status);
    if (success) {
      toast.success("Status atualizado!");
    } else {
      toast.error("Erro ao atualizar status");
    }
  };

  // Stats cards
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/20 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-600">Abertas</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.open}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600">
              Em Análise
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">
            {stats.inProgress}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-600">
              Resolvidas
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
        </CardContent>
      </Card>
    </div>
  );

  // Issue card
  const renderIssueCard = (issue: ConversionIssue) => (
    <Card key={issue.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg truncate">{issue.title}</h3>
              <Badge
                variant="outline"
                className={cn("text-xs", STATUS_COLORS[issue.status] || "")}
              >
                {STATUS_LABELS[issue.status] || issue.status}
              </Badge>
            </div>
            {issue.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {issue.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-medium">{issue.clientName}</span>
              <span>
                Reportado{" "}
                {formatDistanceToNow(issue.reportedAt, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {issue.fixedAt && (
                <span className="text-green-600">
                  Resolvido{" "}
                  {formatDistanceToNow(issue.fixedAt, {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Priority */}
          <Badge
            variant="outline"
            className={cn("text-xs", PRIORITY_COLORS[issue.priority] || "")}
          >
            {PRIORITY_LABELS[issue.priority] || issue.priority}
          </Badge>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {issue.status === "open" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(issue, "in_progress")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Iniciar Análise
                </DropdownMenuItem>
              )}
              {issue.status !== "resolved" && (
                <DropdownMenuItem
                  onClick={() => setResolveDialog({ open: true, issue })}
                  className="text-green-600"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Resolvido
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialog({ open: true, issue })}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inconsistências</h1>
            <p className="text-muted-foreground">
              Acompanhamento de problemas de conversão
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

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertas</SelectItem>
            <SelectItem value="in_progress">Em Análise</SelectItem>
            <SelectItem value="resolved">Resolvidas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : filteredIssues.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhuma inconsistência encontrada
          </h3>
          <p className="text-muted-foreground">
            Todas as inconsistências foram resolvidas
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => renderIssueCard(issue))}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog
        open={resolveDialog.open}
        onOpenChange={(open) => setResolveDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Inconsistência</DialogTitle>
            <DialogDescription>
              Marcar "{resolveDialog.issue?.title}" como resolvida
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Observações da Resolução</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Descreva como o problema foi resolvido..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResolve}
              className="bg-green-600 hover:bg-green-700"
            >
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Inconsistência</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover "{deleteDialog.issue?.title}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
