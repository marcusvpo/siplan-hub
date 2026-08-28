import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Link2,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PosAiChatLinksManager } from "@/components/Admin/PosAiChatLinksManager";
import { PosAiChatUsersManager } from "@/components/Admin/PosAiChatUsersManager";
import { PosChatMessageContent } from "@/components/pos-chat/PosChatMessageContent";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  usePosAiChatLinks,
  usePosAiChatProjectCandidates,
} from "@/hooks/usePosAiChatLinks";
import {
  fetchPosAiChatConversationsPage,
  type PosAiConversationGroup,
  usePosAiChatConversations,
  usePosAiChatVisitorOptions,
} from "@/hooks/usePosAiChatConversations";
import { useChamadosClientOptions } from "@/hooks/useChamados0800";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadCsv } from "@/lib/csv-export";
import { getErrorMessage } from "@/lib/error-message";
import {
  SearchableClientSelect,
  type SearchableClientOption,
} from "@/components/Admin/SearchableClientSelect";

type CreateMode = "project" | "standalone";
type KpiFilter = "active-links" | "conversations" | "people" | "standalone";
type MainTab = "links" | "chats" | "users";

const CHAT_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

type DeleteRequest =
  | { mode: "all" }
  | { mode: "selected"; conversations: PosAiConversationGroup[] };

interface ClearConversationsResult {
  success: boolean;
  deleted_conversations: number;
  deleted_messages: number;
}

interface CreateLinkResult {
  success?: boolean;
  created?: boolean;
  link?: { id?: string };
}

export default function PosAiLinksChats() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("projectId");
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("pos_ai_logs", "manage");
  const { data: links = [], isLoading: isLoadingLinks } = usePosAiChatLinks();
  const { data: candidates = [] } = usePosAiChatProjectCandidates();
  const { data: chamadosClients = [], isLoading: isLoadingChamadosClients } =
    useChamadosClientOptions("orion");
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<MainTab>(
    requestedTab === "chats" || requestedTab === "users" ? requestedTab : "links",
  );
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "1");
  const [createMode, setCreateMode] = useState<CreateMode>("project");
  const [selectedProjectId, setSelectedProjectId] = useState(focusId || "");
  const [standaloneName, setStandaloneName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatLinkFilter, setChatLinkFilter] = useState(focusId || "all");
  const [chatUserFilter, setChatUserFilter] = useState("all");
  const [chatPage, setChatPage] = useState(1);
  const [chatPageSize, setChatPageSize] = useState<number>(CHAT_PAGE_SIZE_OPTIONS[0]);
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const deferredChatSearch = useDeferredValue(chatSearch);
  const [selectedConversation, setSelectedConversation] = useState<PosAiConversationGroup | null>(null);
  const [selectedConversationKeys, setSelectedConversationKeys] = useState<Set<string>>(new Set());
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [isDeletingConversations, setIsDeletingConversations] = useState(false);
  const [isExportingChats, setIsExportingChats] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const chatQueryParams = {
    page: chatPage,
    pageSize: chatPageSize,
    search: deferredChatSearch,
    linkId: chatLinkFilter === "all" ? null : chatLinkFilter,
    visitorId: !["all", "anonymous"].includes(chatUserFilter) ? chatUserFilter : null,
    anonymousOnly: chatUserFilter === "anonymous",
    identifiedOnly: kpiFilter === "people",
  };
  const {
    data: conversationPage,
    isLoading: isLoadingChats,
    isFetching: isFetchingChats,
  } = usePosAiChatConversations(chatQueryParams, activeTab === "chats");
  const conversations = useMemo(
    () => conversationPage?.items || [],
    [conversationPage?.items],
  );
  const { data: chatUserOptions = [] } = usePosAiChatVisitorOptions(
    chatLinkFilter === "all" ? null : chatLinkFilter,
    activeTab === "chats",
  );

  const linkedProjectIds = useMemo(
    () => new Set(links.flatMap((link) => [link.id, ...(link.project_id ? [link.project_id] : [])])),
    [links],
  );
  const availableProjects = candidates.filter((project) => !linkedProjectIds.has(project.id));
  const standaloneClientOptions = useMemo<SearchableClientOption[]>(
    () => chamadosClients.map((client) => ({
      value: client.nomeCliente,
      label: client.nomeCliente,
      details: client.codigoCliente ? `Cód. ${client.codigoCliente}` : undefined,
      searchTerms: client.aliases.join(" "),
    })),
    [chamadosClients],
  );

  useEffect(() => {
    if (focusId) {
      setSelectedProjectId(focusId);
      setChatLinkFilter(focusId);
      setChatUserFilter("all");
    }
  }, [focusId]);

  useEffect(() => {
    if (
      !isLoadingLinks &&
      focusId &&
      searchParams.get("new") === "1" &&
      links.some((link) => link.id === focusId || link.project_id === focusId)
    ) {
      setCreateOpen(false);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("new");
      setSearchParams(nextParams, { replace: true });
    }
  }, [focusId, isLoadingLinks, links, searchParams, setSearchParams]);

  const openCreateDialog = () => {
    setCreateMode("project");
    setSelectedProjectId(availableProjects.some((project) => project.id === focusId) ? focusId! : "");
    setStandaloneName("");
    setCreateOpen(true);
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("new");
    setSearchParams(nextParams, { replace: true });
  };

  const handleCreateLink = async () => {
    const project = candidates.find((item) => item.id === selectedProjectId);
    const clientName = createMode === "project" ? project?.client_name.trim() : standaloneName.trim();
    if (!clientName || (createMode === "project" && !project)) {
      toast.error(createMode === "project" ? "Selecione um cliente cadastrado." : "Informe o nome do cliente.");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error: linkError } = await supabase.rpc("create_pos_ai_chat_link", {
        p_client_name: clientName,
        p_project_id: createMode === "project" ? project!.id : null,
        p_system_type: createMode === "project" ? project!.system_type : "Orion TN",
      });
      if (linkError) throw linkError;
      const result = data as CreateLinkResult | null;
      const linkId = result?.link?.id;
      if (!result?.success || !linkId) throw new Error("O banco não confirmou a criação do link.");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posAiChatLinks"] }),
        queryClient.invalidateQueries({ queryKey: ["posAiChatProjectCandidates"] }),
        queryClient.invalidateQueries({ queryKey: ["projectsList"] }),
      ]);

      const publicUrl = `${window.location.origin}/public/pos-chat/${linkId}`;
      try {
        await navigator.clipboard.writeText(publicUrl);
        toast.success("Link gerado e copiado para a área de transferência.");
      } catch {
        toast.success("Link gerado com sucesso.");
      }
      closeCreateDialog();
      setStandaloneName("");
      setSelectedProjectId("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível gerar o link."));
    } finally {
      setIsCreating(false);
    }
  };

  const linkById = useMemo(() => new Map(links.map((link) => [link.id, link])), [links]);
  useEffect(() => {
    setChatPage(1);
    setSelectedConversationKeys(new Set());
  }, [chatLinkFilter, chatPageSize, deferredChatSearch, chatUserFilter, kpiFilter]);

  useEffect(() => {
    if (conversationPage?.page && chatPage !== conversationPage.page) setChatPage(conversationPage.page);
  }, [chatPage, conversationPage?.page]);

  const selectedConversations = useMemo(
    () => conversations.filter((conversation) => selectedConversationKeys.has(conversation.key)),
    [conversations, selectedConversationKeys],
  );
  const visibleSelectedCount = conversations.filter((conversation) =>
    selectedConversationKeys.has(conversation.key),
  ).length;
  const allVisibleSelected =
    conversations.length > 0 && visibleSelectedCount === conversations.length;

  const activeLinks = links.filter((link) => link.enabled).length;
  const standaloneLinks = links.filter((link) => !link.project_id).length;
  const totalVisitors = links.reduce((total, link) => total + link.visitor_count, 0);
  const totalMessages = links.reduce((total, link) => total + link.message_count, 0);
  const totalConversationCount = links.reduce(
    (total, link) => total + link.conversation_count,
    0,
  );
  const conversationsPendingDeletion =
    deleteRequest?.mode === "selected" ? deleteRequest.conversations : conversations;
  const pendingConversationCount =
    deleteRequest?.mode === "all" ? totalConversationCount : conversationsPendingDeletion.length;
  const pendingMessagesCount =
    deleteRequest?.mode === "all"
      ? totalMessages
      : conversationsPendingDeletion.reduce(
          (total, conversation) => total + conversation.messages.length,
          0,
        );

  const handleTabChange = (value: string) => {
    const nextTab: MainTab = value === "chats" || value === "users" ? value : "links";
    setKpiFilter(null);
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === "links") nextParams.delete("tab");
    else nextParams.set("tab", nextTab);
    setSearchParams(nextParams, { replace: true });
  };

  const handleKpiFilter = (filter: KpiFilter) => {
    const isClearing = kpiFilter === filter;
    const nextFilter = isClearing ? null : filter;
    const targetTab: MainTab =
      filter === "active-links" || filter === "standalone"
        ? "links"
        : filter === "people"
          ? "users"
          : "chats";

    if (targetTab === "chats") {
      setChatSearch("");
      setChatLinkFilter("all");
      setChatUserFilter("all");
    }
    handleTabChange(targetTab);
    setKpiFilter(nextFilter);
  };

  const toggleConversationSelection = (conversationKey: string, checked: boolean) => {
    setSelectedConversationKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(conversationKey);
      else next.delete(conversationKey);
      return next;
    });
  };

  const toggleAllVisibleConversations = (checked: boolean) => {
    setSelectedConversationKeys((current) => {
      const next = new Set(current);
      for (const conversation of conversations) {
        if (checked) next.add(conversation.key);
        else next.delete(conversation.key);
      }
      return next;
    });
  };

  const requestSingleConversationDeletion = (conversation: PosAiConversationGroup) => {
    setSelectedConversation(null);
    setDeleteRequest({ mode: "selected", conversations: [conversation] });
  };

  const handleClearConversations = async () => {
    if (!deleteRequest) return;

    setIsDeletingConversations(true);
    try {
      const targets = deleteRequest.mode === "selected" ? deleteRequest.conversations : [];
      const { data, error } = await supabase.rpc("clear_pos_ai_chat_conversations", {
        p_conversations: targets.map((conversation) => ({
          project_id: conversation.link_id,
          session_id: conversation.session_id,
        })),
        p_delete_all: deleteRequest.mode === "all",
      });
      if (error) throw error;

      const result = data as ClearConversationsResult | null;
      if (!result?.success) throw new Error("A limpeza do histórico não foi concluída.");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posAiChatConversations"] }),
        queryClient.invalidateQueries({ queryKey: ["posAiChatLinks"] }),
      ]);

      setSelectedConversationKeys(new Set());
      setSelectedConversation(null);
      setChatUserFilter("all");
      setDeleteRequest(null);
      toast.success(
        `${result.deleted_conversations} ${result.deleted_conversations === 1 ? "conversa removida" : "conversas removidas"} (${result.deleted_messages} mensagens).`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível limpar as conversas."));
    } finally {
      setIsDeletingConversations(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posAiChatLinks"] }),
        queryClient.invalidateQueries({ queryKey: ["posAiChatConversations"] }),
        queryClient.invalidateQueries({ queryKey: ["posAiChatVisitors"] }),
        queryClient.invalidateQueries({ queryKey: ["posAiChatVisitorOptions"] }),
        queryClient.invalidateQueries({ queryKey: ["posAiChatProjectCandidates"] }),
        queryClient.invalidateQueries({ queryKey: ["chamados-client-options"] }),
      ]);
      toast.success("Dados atualizados.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportChats = async () => {
    setIsExportingChats(true);
    try {
      const exportData = await fetchPosAiChatConversationsPage({
        ...chatQueryParams,
        page: 1,
        pageSize: 5000,
      });
      downloadCsv(
        `conversas-assistente-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Cliente", "Usuário", "Setor", "Situação do usuário", "Início", "Última mensagem", "Mensagens", "Úteis", "Não úteis", "Primeira pergunta"],
        exportData.items.map((conversation) => [
          conversation.client_name,
          conversation.visitor_name,
          conversation.visitor_sector,
          conversation.visitor_active === false ? "Inativo" : conversation.visitor_id ? "Ativo" : "Não identificado",
          conversation.started_at,
          conversation.last_message_at,
          conversation.message_count,
          conversation.helpful,
          conversation.unhelpful,
          conversation.preview,
        ]),
      );
      toast.success(`${exportData.items.length} conversas exportadas.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível exportar as conversas."));
    } finally {
      setIsExportingChats(false);
    }
  };

  return (
    <div className="min-h-full bg-muted/10">
      <div className="border-b bg-gradient-to-r from-background via-background to-rose-50/40 px-4 py-3 dark:to-rose-950/10 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-sm shadow-rose-600/20">
              <MessageSquareText className="h-4 w-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-lg font-bold tracking-tight">Links e Chats</h1>
                <Badge variant="outline" className="h-5 border-rose-200 bg-rose-50 px-1.5 text-[9px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                  <Sparkles className="mr-1 h-2.5 w-2.5" /> Orion TN · IA
                </Badge>
              </div>
              <p className="mt-0.5 max-w-2xl text-[11px] text-muted-foreground">
                Uma central única para gerar links, controlar acessos e acompanhar todas as conversas dos clientes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Atualizar todos os dados" disabled={isRefreshing} onClick={() => void handleRefresh()}>
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            {canManage && (
              <Button onClick={openCreateDialog} size="sm" className="h-8 gap-1.5 bg-rose-600 px-3 text-xs text-white hover:bg-rose-700">
                <Plus className="h-3.5 w-3.5" /> Gerar novo link
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3 sm:px-5 sm:py-3">
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[
            { filter: "active-links" as const, label: "Links ativos", value: activeLinks, detail: `${links.length} links gerados`, icon: Link2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
            { filter: "conversations" as const, label: "Conversas", value: totalConversationCount, detail: `${totalMessages} mensagens`, icon: MessageSquareText, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
            { filter: "people" as const, label: "Pessoas atendidas", value: totalVisitors, detail: "usuários identificados", icon: UsersRound, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
            { filter: "standalone" as const, label: "Clientes avulsos", value: standaloneLinks, detail: "sem projeto cadastrado", icon: UserRound, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          ].map((item) => (
            <button
              key={item.filter}
              type="button"
              onClick={() => handleKpiFilter(item.filter)}
              aria-pressed={kpiFilter === item.filter}
              className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card
                className={`h-full border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${
                  kpiFilter === item.filter
                    ? "border-primary bg-primary/[0.03] ring-2 ring-primary/15"
                    : ""
                }`}
              >
                <CardContent className="flex items-center justify-between px-3 py-2.5">
                  <div>
                    <p className={`text-[10px] font-medium ${kpiFilter === item.filter ? "text-primary" : "text-muted-foreground"}`}>
                      {item.label}
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <p className="text-xl font-bold leading-none">{item.value}</p>
                      <p className="hidden text-[9px] text-muted-foreground sm:block">{item.detail}</p>
                    </div>
                  </div>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.color}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3">
          <TabsList className="grid h-8 w-full max-w-xl grid-cols-3 p-0.5">
            <TabsTrigger value="links" className="h-7 gap-1.5 px-2 text-[11px]">
              <Link2 className="h-3 w-3" /> Links de acesso ({links.length})
            </TabsTrigger>
            <TabsTrigger value="chats" className="h-7 gap-1.5 px-2 text-[11px]">
              <MessageSquareText className="h-3 w-3" /> Conversas ({conversations.length || totalConversationCount})
            </TabsTrigger>
            <TabsTrigger value="users" className="h-7 gap-1.5 px-2 text-[11px]">
              <UsersRound className="h-3 w-3" /> Usuários ({totalVisitors})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="mt-0">
            <PosAiChatLinksManager
              key={kpiFilter || "all"}
              links={links}
              isLoading={isLoadingLinks}
              focusId={focusId}
              quickFilter={
                kpiFilter === "active-links"
                  ? "active"
                  : kpiFilter === "standalone"
                    ? "standalone"
                    : null
              }
              onViewChats={(linkId) => {
                setChatLinkFilter(linkId);
                setChatUserFilter("all");
                handleTabChange("chats");
              }}
            />
          </TabsContent>

          <TabsContent value="chats" className="mt-0">
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <div className="flex flex-col gap-2 border-b bg-muted/20 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Histórico de conversas</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Consulte as sessões e respostas trocadas em cada link.</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Buscar conversa..." className="h-8 w-full pl-8 text-xs sm:w-56" />
                  </div>
                  <SearchableClientSelect
                    value={chatLinkFilter}
                    options={[
                      { value: "all", label: "Todos os clientes" },
                      ...links.map((link) => ({
                        value: link.id,
                        label: link.client_name,
                        details: link.system_type,
                      })),
                    ]}
                    placeholder="Filtrar por cliente"
                    searchPlaceholder="Digite o nome do cliente..."
                    onValueChange={(value) => {
                      setChatLinkFilter(value);
                      setChatUserFilter("all");
                    }}
                  />
                  <Select value={chatUserFilter} onValueChange={setChatUserFilter}>
                    <SelectTrigger className="h-8 w-full text-xs sm:w-48">
                      <SelectValue placeholder="Filtrar por usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {chatUserOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} · {user.sector} ({user.conversation_count})
                          {!user.is_active ? " · inativo" : ""}
                          {chatLinkFilter === "all" ? ` · ${linkById.get(user.project_id)?.client_name || "Cliente"}` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="anonymous">Não identificados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Exportar conversas filtradas em CSV" disabled={isExportingChats || !conversationPage?.total} onClick={() => void handleExportChats()}>
                    {isExportingChats ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  </Button>
                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteRequest({ mode: "all" })}
                      disabled={totalConversationCount === 0}
                      className="h-8 gap-1.5 border-destructive/30 px-2.5 text-[11px] text-destructive hover:bg-destructive/5 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpar todas
                    </Button>
                  )}
                </div>
              </div>
              <CardContent className="p-2.5 sm:p-3">
                {isLoadingChats ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando conversas...</div>
                ) : conversations.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-10 text-center">
                    <MessageSquareText className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground/50" />
                    <p className="text-xs font-medium">Nenhuma conversa encontrada</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">As novas conversas aparecerão aqui automaticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {canManage && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-1.5">
                        <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium">
                          <Checkbox
                            checked={
                              allVisibleSelected
                                ? true
                                : visibleSelectedCount > 0
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) =>
                              toggleAllVisibleConversations(checked === true)
                            }
                            aria-label="Selecionar todas as conversas visíveis"
                          />
                          Selecionar visíveis
                          {selectedConversations.length > 0 && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                              {selectedConversations.length} selecionadas
                            </Badge>
                          )}
                        </label>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={selectedConversations.length === 0}
                          onClick={() =>
                            setDeleteRequest({
                              mode: "selected",
                              conversations: selectedConversations,
                            })
                          }
                          className="h-7 gap-1.5 px-2.5 text-[10px]"
                        >
                          <Trash2 className="h-3 w-3" />
                          Limpar selecionadas
                        </Button>
                      </div>
                    )}
                    <div className="divide-y rounded-xl border">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.key}
                          className="flex items-start transition-colors hover:bg-muted/30"
                        >
                          {canManage && (
                            <div className="flex shrink-0 items-center self-stretch pl-3">
                              <Checkbox
                                checked={selectedConversationKeys.has(conversation.key)}
                                onCheckedChange={(checked) =>
                                  toggleConversationSelection(conversation.key, checked === true)
                                }
                                aria-label={`Selecionar conversa de ${conversation.visitor_name}`}
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedConversation(conversation)}
                            className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5 text-left sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-start gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/30"><Bot className="h-3.5 w-3.5" /></span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate text-xs font-semibold">{conversation.client_name}</p>
                                  <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">{conversation.message_count} mensagens</Badge>
                                  {conversation.visitor_active === false && <Badge variant="outline" className="px-1.5 py-0 text-[9px]">Usuário inativo</Badge>}
                                </div>
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{conversation.visitor_name} · {conversation.visitor_sector}</p>
                                <p className="mt-0.5 line-clamp-1 text-[10px] text-foreground/80">{conversation.preview}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 pl-9 text-[10px] text-muted-foreground sm:pl-0">
                              {conversation.helpful > 0 && <span className="flex items-center gap-1 text-emerald-600"><ThumbsUp className="h-3 w-3" />{conversation.helpful}</span>}
                              {conversation.unhelpful > 0 && <span className="flex items-center gap-1 text-rose-600"><ThumbsDown className="h-3 w-3" />{conversation.unhelpful}</span>}
                              <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })}</span>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Exibindo {conversationPage?.total ? ((conversationPage.page - 1) * conversationPage.page_size) + 1 : 0}–{Math.min((conversationPage?.page || 1) * (conversationPage?.page_size || chatPageSize), conversationPage?.total || 0)} de {conversationPage?.total || 0} conversas
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={String(chatPageSize)}
                            onValueChange={(value) => setChatPageSize(Number(value))}
                          >
                            <SelectTrigger
                              className="h-7 w-[62px] px-2 text-[10px]"
                              aria-label="Conversas por página"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHAT_PAGE_SIZE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span>por página</span>
                        </div>
                        <span className="min-w-20 text-center">
                          Página <strong className="text-foreground">{conversationPage?.page || 1}</strong> de {conversationPage?.total_pages || 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Página anterior de conversas"
                            disabled={(conversationPage?.page || 1) === 1 || isFetchingChats}
                            onClick={() => setChatPage((conversationPage?.page || 1) - 1)}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Próxima página de conversas"
                            disabled={(conversationPage?.page || 1) >= (conversationPage?.total_pages || 1) || isFetchingChats}
                            onClick={() => setChatPage((conversationPage?.page || 1) + 1)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <PosAiChatUsersManager
              links={links}
              canManage={canManage}
              onViewConversations={(linkId, visitorId) => {
                setChatLinkFilter(linkId);
                setChatUserFilter(visitorId);
                setChatSearch("");
                handleTabChange("chats");
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreateDialog())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-rose-600" /> Gerar novo link</DialogTitle>
            <DialogDescription className="text-xs">Escolha um cliente cadastrado ou crie um acesso avulso apenas com o nome.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1">
            <Button type="button" variant={createMode === "project" ? "secondary" : "ghost"} size="sm" onClick={() => setCreateMode("project")} className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Cliente cadastrado</Button>
            <Button type="button" variant={createMode === "standalone" ? "secondary" : "ghost"} size="sm" onClick={() => setCreateMode("standalone")} className="gap-1.5 text-xs"><UserRound className="h-3.5 w-3.5" /> Cliente avulso</Button>
          </div>
          {createMode === "project" ? (
            <div className="space-y-2 py-2">
              <Label htmlFor="project-link" className="text-xs">Cliente / projeto</Label>
              <SearchableClientSelect
                id="project-link"
                value={selectedProjectId}
                options={availableProjects.map((project) => ({
                  value: project.id,
                  label: project.client_name,
                  details: project.system_type,
                }))}
                placeholder="Selecione um cliente"
                searchPlaceholder="Digite o nome do cliente..."
                buttonClassName="h-10 sm:w-full"
                onValueChange={setSelectedProjectId}
              />
              {availableProjects.length === 0 && <p className="text-[11px] text-muted-foreground">Todos os projetos compatíveis já possuem link. Use “Cliente avulso” para outro cliente.</p>}
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <Label htmlFor="standalone-name" className="text-xs">Cliente / serventia</Label>
              <SearchableClientSelect
                id="standalone-name"
                value={standaloneName}
                options={standaloneClientOptions}
                placeholder="Selecione ou digite um cliente"
                searchPlaceholder="Buscar na base de clientes..."
                emptyMessage={
                  isLoadingChamadosClients
                    ? "Carregando clientes..."
                    : "Digite o nome completo para criar o acesso."
                }
                buttonClassName="h-10 sm:w-full"
                allowCustomValue
                onValueChange={setStandaloneName}
              />
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 text-[11px] text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                A lista é a mesma do filtro de Clientes / Serventias em Chamados. Se não encontrar, digite o nome e escolha a opção avulsa. Nenhum projeto será criado.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCreateDialog} disabled={isCreating}>Cancelar</Button>
            <Button type="button" className="gap-2 bg-rose-600 text-white hover:bg-rose-700" onClick={() => void handleCreateLink()} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isCreating ? "Gerando..." : "Gerar e copiar link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedConversation)} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><MessageSquareText className="h-4 w-4 text-blue-600" /> {selectedConversation?.client_name}</DialogTitle>
            <DialogDescription className="text-xs">{selectedConversation?.visitor_name} · {selectedConversation?.visitor_sector} · {selectedConversation ? format(new Date(selectedConversation.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ""}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {selectedConversation?.messages.map((message) => (
              <div key={message.id} className={`rounded-xl border p-3 text-xs ${message.role === "user" ? "ml-8 bg-slate-50 dark:bg-slate-900" : "mr-8 border-rose-100 bg-rose-50/50 dark:border-rose-950 dark:bg-rose-950/10"}`}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
                  <span>{message.role === "user" ? selectedConversation.visitor_name : "Assistente IA"}</span>
                  <span>{format(new Date(message.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
                {message.role === "assistant" ? <PosChatMessageContent content={message.content} /> : <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>}
              </div>
            ))}
          </div>
          <DialogFooter className="border-t pt-3">
            <div className="mr-auto flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{selectedConversation?.messages.length || 0} mensagens</span>
              {selectedConversation && linkById.get(selectedConversation.link_id)?.project_id && <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />Dados incluídos no Analytics</span>}
            </div>
            {canManage && selectedConversation && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => requestSingleConversationDeletion(selectedConversation)}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar esta conversa
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSelectedConversation(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteRequest)}
        onOpenChange={(open) => {
          if (!open && !isDeletingConversations) setDeleteRequest(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteRequest?.mode === "all"
                ? "Limpar todo o histórico de conversas?"
                : `Limpar ${pendingConversationCount} ${pendingConversationCount === 1 ? "conversa" : "conversas"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente {pendingMessagesCount} {pendingMessagesCount === 1 ? "mensagem" : "mensagens"}.
              Os links de acesso, clientes e usuários cadastrados serão preservados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConversations}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingConversations}
              onClick={(event) => {
                event.preventDefault();
                void handleClearConversations();
              }}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingConversations ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isDeletingConversations ? "Limpando..." : "Confirmar limpeza"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
