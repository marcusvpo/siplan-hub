import React, { useState, useMemo } from "react";
import { PosChatSession } from "@/hooks/usePosAiChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  ThumbsUp,
  ThumbsDown,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  History,
  MoreHorizontal,
  Pencil,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { format, isToday, isYesterday, isAfter, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PosChatHistorySidebarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  sessions: PosChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onRenameSession: (sessionId: string, title: string) => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onExportSession: (sessionId: string) => Promise<boolean>;
  cartorioName?: string;
  isMobile?: boolean;
}

export function PosChatHistorySidebar({
  isOpen,
  onOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onExportSession,
  cartorioName,
  isMobile = false,
}: PosChatHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<PosChatSession | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PosChatSession | null>(null);
  const [pendingAction, setPendingAction] = useState<"rename" | "delete" | null>(null);

  // 1. Sort all sessions strictly newest first (by last_message_at DESC, then started_at DESC)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.started_at).getTime();
      const timeB = new Date(b.last_message_at || b.started_at).getTime();
      return timeB - timeA;
    });
  }, [sessions]);

  // 2. Filter sessions by query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sortedSessions;
    const q = searchQuery.toLowerCase().trim();
    return sortedSessions.filter(
      (s) =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        s.first_message.toLowerCase().includes(q) ||
        (s.last_message && s.last_message.toLowerCase().includes(q))
    );
  }, [sortedSessions, searchQuery]);

  // 3. Group sessions by date, maintaining strict newest-first order within each group
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: PosChatSession[] } = {
      Hoje: [],
      Ontem: [],
      "Últimos 7 dias": [],
      "Mais antigas": [],
    };

    const sevenDaysAgo = subDays(new Date(), 7);

    filteredSessions.forEach((s) => {
      const date = new Date(s.last_message_at || s.started_at);
      if (isToday(date)) {
        groups["Hoje"].push(s);
      } else if (isYesterday(date)) {
        groups["Ontem"].push(s);
      } else if (isAfter(date, sevenDaysAgo)) {
        groups["Últimos 7 dias"].push(s);
      } else {
        groups["Mais antigas"].push(s);
      }
    });

    // Ensure items within each group are strictly sorted newest first
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const timeA = new Date(a.last_message_at || a.started_at).getTime();
        const timeB = new Date(b.last_message_at || b.started_at).getTime();
        return timeB - timeA;
      });
    });

    return groups;
  }, [filteredSessions]);

  const handleRename = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renameTarget || !renameTitle.trim() || pendingAction) return;

    setPendingAction("rename");
    const success = await onRenameSession(renameTarget.session_id, renameTitle);
    setPendingAction(null);
    if (success) setRenameTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget || pendingAction) return;

    setPendingAction("delete");
    const success = await onDeleteSession(deleteTarget.session_id);
    setPendingAction(null);
    if (success) setDeleteTarget(null);
  };

  if (isMobile && !isOpen) return null;

  if (!isMobile && !isOpen) {
    return (
      <aside
        className="flex h-full w-14 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-300 ease-in-out motion-reduce:transition-none dark:border-neutral-800 dark:bg-neutral-900"
        aria-label="Histórico de conversas"
      >
        <div className="flex h-full w-14 flex-col items-center gap-2 py-3 animate-in fade-in duration-300">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpen}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            aria-label="Exibir histórico de conversas"
            title="Exibir histórico de conversas"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNewSession}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            aria-label="Iniciar nova conversa"
            title="Iniciar nova conversa"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            title={cartorioName || "Assistente Siplan"}
          >
            <Bot className="h-4 w-4" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
    <aside
      className={`${
        isMobile
          ? "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200"
          : "w-80 shrink-0 border-r"
      } flex flex-col h-full overflow-hidden bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 transition-[width] duration-300 ease-in-out motion-reduce:transition-none z-30`}
      aria-label="Histórico de conversas"
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-rose-600/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-foreground">
                Histórico de Conversas
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {sessions.length} {sessions.length === 1 ? "conversa" : "conversas"} registradas
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={isMobile ? "Fechar histórico" : "Ocultar histórico"}
            title={isMobile ? "Fechar histórico" : "Ocultar histórico"}
          >
            {isMobile ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* New Chat Button */}
        <Button
          type="button"
          onClick={() => {
            onNewSession();
            if (isMobile) onClose();
          }}
          className="w-full h-9 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-sm rounded-xl cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>

        {/* Search Input */}
        {sessions.length > 2 && (
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no histórico..."
              className="h-8 text-xs pl-8 pr-3 rounded-lg bg-slate-50 dark:bg-neutral-800/80 border-slate-200 dark:border-neutral-700"
            />
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="py-10 text-center px-4 space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {searchQuery ? "Nenhuma conversa encontrada" : "Nenhum histórico anterior"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {searchQuery
                ? "Tente buscar por outros termos."
                : "Suas perguntas e respostas com a IA ficarão salvas aqui para consulta."}
            </p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([groupTitle, groupItems]) => {
            if (groupItems.length === 0) return null;

            return (
              <div key={groupTitle} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {groupTitle}
                </div>

                <div className="space-y-1">
                  {groupItems.map((session) => {
                    const isSelected = session.session_id === currentSessionId;
                    const started = new Date(session.last_message_at || session.started_at);

                    const sessionTitle = session.title || session.first_message || "Conversa";

                    return (
                      <div
                        key={session.session_id}
                        className={`w-full rounded-xl text-xs transition-all flex items-stretch group ${
                          isSelected
                            ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100 shadow-2xs font-medium"
                            : "hover:bg-slate-100 dark:hover:bg-neutral-800/80 text-foreground border border-transparent"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSession(session.session_id);
                            if (isMobile) onClose();
                          }}
                          className="flex min-w-0 flex-1 items-start gap-2.5 p-2.5 pr-1 text-left cursor-pointer"
                        >
                          <span
                            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? "bg-rose-600 text-white"
                                : "bg-slate-100 dark:bg-neutral-800 text-muted-foreground group-hover:text-rose-600"
                            }`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </span>

                          <span className="flex-1 min-w-0 space-y-1">
                            <span className="block font-semibold text-xs leading-snug line-clamp-2">
                              {sessionTitle}
                            </span>

                            <span className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 opacity-70" />
                                {format(started, isToday(started) ? "HH:mm" : "dd/MM HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>

                              <span className="flex items-center gap-1.5">
                                {session.helpful_count && session.helpful_count > 0 ? (
                                  <span className="text-emerald-600 font-bold" title="Avaliada como útil">
                                    <ThumbsUp className="h-2.5 w-2.5 inline" />
                                  </span>
                                ) : null}
                                {session.unhelpful_count && session.unhelpful_count > 0 ? (
                                  <span className="text-rose-600 font-bold" title="Avaliada como não ajudou">
                                    <ThumbsDown className="h-2.5 w-2.5 inline" />
                                  </span>
                                ) : null}

                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 h-4 ${
                                    isSelected
                                      ? "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300"
                                      : "text-muted-foreground border-slate-200 dark:border-neutral-700"
                                  }`}
                                >
                                  {session.total_messages} msgs
                                </Badge>
                              </span>
                            </span>
                          </span>
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 self-start mt-2 mr-1 shrink-0 rounded-lg text-muted-foreground opacity-60 hover:opacity-100 focus:opacity-100"
                              aria-label={`Ações da conversa ${sessionTitle}`}
                              title="Gerenciar conversa"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs"
                              onSelect={() => {
                                setRenameTarget(session);
                                setRenameTitle(sessionTitle);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs"
                              onSelect={() => void onExportSession(session.session_id)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Exportar .txt
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                              onSelect={() => setDeleteTarget(session)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      {cartorioName && (
        <div className="p-3 border-t border-slate-200 dark:border-neutral-800 text-[10px] text-muted-foreground flex items-center gap-2 bg-slate-50/50 dark:bg-neutral-950/50">
          <Bot className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span className="truncate font-medium">{cartorioName}</span>
        </div>
      )}
    </aside>

    <Dialog
      open={Boolean(renameTarget)}
      onOpenChange={(open) => {
        if (!open && !pendingAction) setRenameTarget(null);
      }}
    >
      <DialogContent className="max-w-sm">
        <form onSubmit={handleRename} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
            <DialogDescription>
              Use um título curto para localizar esta conversa no histórico.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            maxLength={120}
            placeholder="Título da conversa"
            aria-label="Título da conversa"
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={Boolean(pendingAction)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!renameTitle.trim() || Boolean(pendingAction)}>
              {pendingAction === "rename" && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={Boolean(deleteTarget)}
      onOpenChange={(open) => {
        if (!open && !pendingAction) setDeleteTarget(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
          <AlertDialogDescription>
            “{deleteTarget?.title || deleteTarget?.first_message || "Conversa"}” e todas as suas
            mensagens serão removidas permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={Boolean(pendingAction)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
            disabled={Boolean(pendingAction)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pendingAction === "delete" && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir conversa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
