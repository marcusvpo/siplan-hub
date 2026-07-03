import { useState, useMemo, useEffect } from "react";
import { useConversionIssues, ConversionIssue } from "@/hooks/useConversionIssues";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useTeamAreas } from "@/hooks/useTeamAreas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertCircle, 
  Search, 
  Plus, 
  User, 
  Calendar, 
  CheckCircle, 
  MoreVertical, 
  UserCheck,
  Tag,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ConversionIssuesTabProps {
  currentUserId: string;
  currentUserName: string;
  isConversionTeam: boolean;
}

const PRIORITIES = {
  low: { label: "Baixa", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800", bar: "border-l-slate-400" },
  medium: { label: "Média", color: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30", bar: "border-l-blue-400" },
  high: { label: "Alta", color: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30", bar: "border-l-amber-500" },
  critical: { label: "Crítica", color: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30", bar: "border-l-red-500" },
};

const STATUSES = {
  open: { label: "Aberta", color: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400" },
  in_progress: { label: "Em Resolução", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400" },
  resolved: { label: "Resolvida", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" },
  closed: { label: "Fechada", color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400" },
};

export function ConversionIssuesTab({
  currentUserId,
  currentUserName,
  isConversionTeam,
}: ConversionIssuesTabProps) {
  const { issues, isLoading, createIssue, updateIssue, resolveIssue } = useConversionIssues();
  const { projects = [] } = useProjectsV2();
  const { members = [] } = useTeamAreas();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // active = open + in_progress
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Dialogs state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ConversionIssue | null>(null);

  // Form states
  const [newIssue, setNewIssue] = useState({
    projectId: "",
    title: "",
    description: "",
    priority: "medium" as ConversionIssue["priority"],
    ticketNumber0800: "",
  });
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [showAllProjects, setShowAllProjects] = useState(false);
  const [queueProjectIds, setQueueProjectIds] = useState<string[]>([]);

  // Buscar project_ids com registro na fila de conversão ao abrir o diálogo
  useEffect(() => {
    const fetchQueueProjects = async () => {
      const { data, error } = await supabase
        .from("conversion_queue")
        .select("project_id");
      if (!error && data) {
        const ids = Array.from(new Set(data.map((item) => item.project_id)));
        setQueueProjectIds(ids);
      }
    };
    if (createDialogOpen) {
      fetchQueueProjects();
    }
  }, [createDialogOpen]);

  // Limpar estado showAllProjects ao fechar o diálogo
  useEffect(() => {
    if (!createDialogOpen) {
      setShowAllProjects(false);
    }
  }, [createDialogOpen]);

  // Projetos exibidos no Select (Fila ativa vs. Lista completa)
  const displayedProjects = useMemo(() => {
    if (showAllProjects) {
      return projects;
    }
    return projects.filter((p) => queueProjectIds.includes(p.id));
  }, [projects, queueProjectIds, showAllProjects]);

  const conversionMembers = useMemo(
    () => members.filter((m) => m.area === "conversion"),
    [members]
  );

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch =
        !searchQuery ||
        issue.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.ticketNumber0800?.includes(searchQuery);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? issue.status === "open" || issue.status === "in_progress"
          : issue.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ? true : issue.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [issues, searchQuery, statusFilter, priorityFilter]);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssue.projectId || !newIssue.title || !newIssue.description) return;

    await createIssue.mutateAsync({
      projectId: newIssue.projectId,
      title: newIssue.title,
      description: newIssue.description,
      status: "open",
      priority: newIssue.priority,
      ticketNumber0800: newIssue.ticketNumber0800 || null,
      assignedTo: null,
      reportedBy: currentUserName,
    });

    setCreateDialogOpen(false);
    setNewIssue({
      projectId: "",
      title: "",
      description: "",
      priority: "medium",
      ticketNumber0800: "",
    });
  };

  const handleResolveIssue = async () => {
    if (!selectedIssue || !resolutionNotes) return;

    await resolveIssue.mutateAsync({
      id: selectedIssue.id,
      notes: resolutionNotes,
      resolvedByUserId: currentUserId,
      targetProjectId: selectedIssue.projectId,
    });

    setResolveDialogOpen(false);
    setSelectedIssue(null);
    setResolutionNotes("");
  };

  const handleAssignToMe = async (issue: ConversionIssue) => {
    await updateIssue.mutateAsync({
      id: issue.id,
      targetProjectId: issue.projectId,
      updates: {
        assigned_to: currentUserId,
        status: "in_progress",
      },
    });
  };

  const handleAssignTo = async (issue: ConversionIssue, userId: string) => {
    await updateIssue.mutateAsync({
      id: issue.id,
      targetProjectId: issue.projectId,
      updates: {
        assigned_to: userId,
        status: "in_progress",
      },
    });
  };

  const getMemberName = (userId: string | null) => {
    if (!userId) return "Não atribuída";
    return members.find((m) => m.id === userId)?.name || "Usuário";
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-muted/40 p-4 rounded-xl border border-muted-foreground/10">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, chamado..."
              className="pl-9 text-xs h-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 text-xs h-9 bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active" className="text-xs">⏳ Ativas (Abertas + Em progresso)</SelectItem>
              <SelectItem value="all" className="text-xs">📋 Todas</SelectItem>
              <SelectItem value="open" className="text-xs">🔴 Abertas</SelectItem>
              <SelectItem value="in_progress" className="text-xs">🔵 Em Resolução</SelectItem>
              <SelectItem value="resolved" className="text-xs">🟢 Resolvidas</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-36 text-xs h-9 bg-background">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">⚡ Prioridade: Todas</SelectItem>
              <SelectItem value="critical" className="text-xs">🚨 Crítica</SelectItem>
              <SelectItem value="high" className="text-xs">🟠 Alta</SelectItem>
              <SelectItem value="medium" className="text-xs">🔵 Média</SelectItem>
              <SelectItem value="low" className="text-xs">⚪ Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          className="text-xs font-bold gap-1.5 shadow-sm h-9 bg-primary text-primary-foreground hover:bg-primary/95 shrink-0"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Relatar Pendência
        </Button>
      </div>

      {/* Grid of issues */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Carregando pendências...
        </div>
      ) : filteredIssues.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-muted/50 bg-muted/5">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/45 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Nenhuma pendência encontrada
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Use o botão "Relatar Pendência" para cadastrar problemas reportados após a entrega da conversão.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredIssues.map((issue) => (
              <motion.div
                key={issue.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={cn(
                    "border-l-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden h-full flex flex-col justify-between",
                    PRIORITIES[issue.priority].bar
                  )}
                >
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Header Card */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            #{issue.ticketNumber || "Sem Ticket"}
                          </span>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1.5 leading-snug break-words">
                            {issue.clientName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {issue.ticketNumber0800 && (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50 text-[10px] px-1.5 py-0">
                              0800 #{issue.ticketNumber0800}
                            </Badge>
                          )}
                          <Badge className={cn("text-[9px] font-bold px-1.5 py-0 shadow-none border", PRIORITIES[issue.priority].color)}>
                            {PRIORITIES[issue.priority].label}
                          </Badge>
                          <Badge className={cn("text-[9px] font-bold px-1.5 py-0 shadow-none", STATUSES[issue.status].color)}>
                            {STATUSES[issue.status].label}
                          </Badge>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="mt-2.5 space-y-1.5">
                        <p className="text-xs font-semibold text-foreground/90">{issue.title}</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                          {issue.description}
                        </p>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 mt-3">
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Relatado por: <strong>{issue.reportedBy}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(issue.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>

                      {/* Resolution details if resolved */}
                      {issue.status === "resolved" && issue.resolutionNotes && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-2 rounded-lg text-xs">
                          <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                            Resolvido em {issue.resolvedAt ? format(issue.resolvedAt, "dd/MM/yyyy") : ""}
                          </p>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">{issue.resolutionNotes}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1 gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Resp: <strong>{getMemberName(issue.assignedTo)}</strong></span>
                        </div>

                        {issue.status !== "resolved" && issue.status !== "closed" && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Delegate Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-7 w-7 text-slate-500">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleAssignToMe(issue)} className="text-xs">
                                  <UserCheck className="mr-2 h-3.5 w-3.5" /> Assumir Pendência
                                </DropdownMenuItem>
                                {isConversionTeam && conversionMembers.length > 0 && (
                                  <>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                    <p className="text-[9px] font-bold text-muted-foreground px-2 py-0.5 uppercase tracking-wider">Delegar para:</p>
                                    {conversionMembers.map((m) => (
                                      <DropdownMenuItem
                                        key={m.id}
                                        onClick={() => handleAssignTo(issue, m.id)}
                                        className="text-xs"
                                      >
                                        {m.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Resolve Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-7"
                              onClick={() => {
                                setSelectedIssue(issue);
                                setResolveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Marcar Resolvida
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal: Relatar nova pendência */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <AlertCircle className="h-5 w-5 text-primary" />
              Relatar Pendência de Conversão
            </DialogTitle>
            <DialogDescription className="text-xs">
              Relate erros de dados, divergências ou inconformidades encontradas pelo cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateIssue} className="space-y-3.5 pt-2">
            {/* Project Select */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Cliente / Projeto</Label>
                <button
                  type="button"
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {showAllProjects ? "Mostrar apenas fila de conversão" : "Conversão antiga (Fora da fila)"}
                </button>
              </div>
              <Select
                value={newIssue.projectId}
                onValueChange={(val) => setNewIssue((prev) => ({ ...prev, projectId: val }))}
              >
                <SelectTrigger className="text-xs h-9 border">
                  <SelectValue placeholder={showAllProjects ? "Selecione qualquer cliente..." : "Selecione cliente da fila..."} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {displayedProjects.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Nenhum projeto ativo na esteira.<br />
                      <button
                        type="button"
                        onClick={() => setShowAllProjects(true)}
                        className="text-primary hover:underline font-bold mt-1.5 block mx-auto text-[11px]"
                      >
                        Ativar Conversão Antiga
                      </button>
                    </div>
                  ) : (
                    displayedProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.clientName} (#{p.ticketNumber})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título Curto</Label>
              <Input
                placeholder="Ex: Diferença nos saldos devedores de parcelas"
                className="text-xs h-9"
                required
                value={newIssue.title}
                onChange={(e) => setNewIssue((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Chamado 0800 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Número do Chamado 0800
                <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <Input
                placeholder="Ex: 85210"
                className="text-xs h-9"
                value={newIssue.ticketNumber0800}
                onChange={(e) => setNewIssue((prev) => ({ ...prev, ticketNumber0800: e.target.value }))}
              />
            </div>

            {/* Priority & Status Row */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Prioridade da Resolução</Label>
              <Select
                value={newIssue.priority}
                onValueChange={(val) => setNewIssue((prev) => ({ ...prev, priority: val as ConversionIssue["priority"] }))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">💤 Baixa</SelectItem>
                  <SelectItem value="medium" className="text-xs">🔵 Média</SelectItem>
                  <SelectItem value="high" className="text-xs">🟠 Alta</SelectItem>
                  <SelectItem value="critical" className="text-xs">🚨 Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição do Problema</Label>
              <Textarea
                placeholder="Descreva detalhadamente o erro de dados, qual relatório/tela apresenta o erro e o comportamento esperado."
                className="text-xs resize-none h-24"
                required
                value={newIssue.description}
                onChange={(e) => setNewIssue((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95" disabled={!newIssue.projectId || !newIssue.title || !newIssue.description}>
                Salvar Pendência
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Resolver pendência */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Resolver Pendência
            </DialogTitle>
            <DialogDescription className="text-xs">
              Descreva as ações realizadas para corrigir esta pendência de dados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <p className="font-bold text-foreground">{selectedIssue?.clientName}</p>
              <p className="text-muted-foreground mt-1 font-semibold">{selectedIssue?.title}</p>
              <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{selectedIssue?.description}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas de Resolução</Label>
              <Textarea
                placeholder="Ex: Corrigido via script SQL na base do cliente no dia 03/07. Ajustado saldo de parcelas do contrato X."
                className="text-xs resize-none h-24"
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setResolveDialogOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!resolutionNotes}
                onClick={handleResolveIssue}
              >
                Confirmar Resolução
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
