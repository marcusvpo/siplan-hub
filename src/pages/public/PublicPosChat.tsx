import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  CheckCheck,
  Building2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  FileText,
  User,
  HelpCircle,
  History,
  Plus,
} from "lucide-react";
import { usePosAiChat, PosChatMessage } from "@/hooks/usePosAiChat";
import { PosChatMessageContent } from "@/components/pos-chat/PosChatMessageContent";
import { FeedbackPromptModal } from "@/components/pos-chat/FeedbackPromptModal";
import { PosChatHistorySidebar } from "@/components/pos-chat/PosChatHistorySidebar";
import { PosChatThemeMenu } from "@/components/pos-chat/PosChatThemeMenu";
import { PosChatVisitorDialog } from "@/components/pos-chat/PosChatVisitorDialog";
import { usePosChatVisitor } from "@/hooks/usePosChatVisitor";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Detects if an assistant message is merely a triage / menu selection list
 * (e.g. asking the user to choose 1, 2, 3) rather than a full step-by-step resolution.
 */
export function isTriageMessage(content: string, assistantIndex?: number): boolean {
  if (!content) return false;

  // The first assistant message in any session is ALWAYS the initial triage menu
  if (assistantIndex === 0) {
    return true;
  }

  const lower = content.toLowerCase();

  // If the message explicitly mentions being Step 1 or asks to choose an option, it's triage
  if (
    lower.includes("esta é a etapa 1") ||
    lower.includes("etapa 1") ||
    lower.includes("não vou fornecer o passo a passo ainda") ||
    lower.includes("nao vou fornecer o passo a passo ainda") ||
    lower.includes("diga qual opção deseja") ||
    lower.includes("diga qual opcao deseja") ||
    lower.includes("digite o número") ||
    lower.includes("digite o numero") ||
    lower.includes("digite 1 ou 2") ||
    lower.includes("digite 1, 2") ||
    lower.includes("selecione uma das rotinas") ||
    lower.includes("selecione uma das opções") ||
    lower.includes("escolha uma das opções") ||
    lower.includes("para te orientar, aqui vão as opções") ||
    lower.includes("aqui vão as opções encontradas") ||
    lower.includes("opções encontradas:")
  ) {
    return true;
  }

  return false;
}

const QUICK_PROMPTS = [
  {
    title: "Navegação e Menus",
    desc: "Como localizar rotinas, abas e atalhos diários no sistema",
    prompt: "Como funciona a navegação geral e menus no Orion TN?",
  },
  {
    title: "Geração de Atos no Editor",
    desc: "Passo a passo para gerar minutas, escrituras e traslados",
    prompt: "Como gerar e qualificar partes e documentos no Editor do Orion TN?",
  },
  {
    title: "Consulta de Protocolos",
    desc: "Filtros rápidos, busca de atos abertos e encerramentos",
    prompt: "Como consultar e filtrar protocolos em aberto?",
  },
  {
    title: "Cartão de Assinatura",
    desc: "Como fazer abertura e preenchimento de ficha de firmas",
    prompt: "Como fazer a abertura e preenchimento de cartão de assinatura?",
  },
];

export default function PublicPosChat() {
  const { id: projectId } = useParams<{ id: string }>();
  const resolvedProjectId = projectId || "";
  const {
    visitors,
    visitor,
    isLoading: isLoadingVisitors,
    isSubmitting: isSubmittingVisitor,
    error: visitorError,
    selectVisitor,
    registerVisitor,
    reloadVisitors,
  } = usePosChatVisitor(resolvedProjectId);

  const {
    projectInfo,
    isLoadingProject,
    projectError,
    isAccessDisabled,
    messages,
    isLoadingHistory,
    isGenerating,
    sessionId,
    sessions,
    sendMessage,
    submitFeedback,
    resetSession,
    selectSession,
    renameSession,
    deleteSession,
    exportSession,
  } = usePosAiChat({ projectId: resolvedProjectId, visitorId: visitor?.id });

  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [pendingMessageText, setPendingMessageText] = useState<string | null>(null);
  const [lastUnratedAssistantId, setLastUnratedAssistantId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [visitorDialogOpen, setVisitorDialogOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (!isLoadingVisitors) setVisitorDialogOpen(!visitor);
  }, [isLoadingVisitors, visitor]);

  // Handle Send with contextual feedback interceptor
  const handleSend = (overrideText?: string) => {
    const textToSend = (overrideText || inputText).trim();
    if (!textToSend || isGenerating) return;

    // Check assistant messages in conversation
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];

    // Check if user input is an option selection (e.g. "1", "2", "3", "1)", "opção 1", etc.)
    const isOptionChoice = /^(?:opç[aã]o\s*)?[0-9]{1,2}\)?$/i.test(textToSend);

    // Only require feedback if:
    // 1. There are at least 2 assistant messages in the conversation (meaning a tutorial/resolution was already delivered)
    // 2. The user is NOT just submitting an option number choice
    // 3. The last assistant message was NOT a triage message
    // 4. The last assistant message has not been rated yet
    const shouldPromptFeedback =
      assistantMessages.length >= 2 &&
      !isOptionChoice &&
      lastAssistantMsg &&
      !lastAssistantMsg.feedback &&
      !isTriageMessage(lastAssistantMsg.content, assistantMessages.length - 1);

    if (shouldPromptFeedback) {
      setLastUnratedAssistantId(lastAssistantMsg.id);
      setPendingMessageText(textToSend);
      setFeedbackModalOpen(true);
      return;
    }

    // Otherwise proceed with sending immediately
    if (!overrideText) {
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
    sendMessage(textToSend);
  };

  const handleModalFeedback = (fb: "helpful" | "unhelpful") => {
    if (lastUnratedAssistantId) {
      submitFeedback(lastUnratedAssistantId, fb);
    }
    setFeedbackModalOpen(false);

    // Send the pending user message
    if (pendingMessageText) {
      const text = pendingMessageText;
      setPendingMessageText(null);
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      sendMessage(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success("Resposta copiada!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar.");
    }
  };

  // Loading state
  if (isLoadingProject) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-rose-600/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Bot className="h-6 w-6 animate-pulse" />
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-rose-600 absolute -bottom-1 -right-1" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium animate-pulse">
            Carregando assistente do Orion TN...
          </p>
        </div>
      </div>
    );
  }

  // Error state (project not found / deleted)
  if (projectError || !projectInfo) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md w-full p-6 rounded-2xl border bg-card shadow-sm text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Link Indisponível ou Expirado</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Não foi possível localizar as informações deste projeto de pós-implantação. Verifique o link ou contate a equipe da Siplan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Access Disabled / Concluded State
  if (isAccessDisabled) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950 p-4 font-sans">
        <div className="max-w-lg w-full p-8 rounded-3xl border bg-card shadow-lg text-center space-y-5 animate-in fade-in-50">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 text-xs">
              Atendimento Concluído
            </Badge>
            <h2 className="text-xl font-bold text-foreground">
              Suporte de Pós-Implantação Encerrado
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              O período de suporte com o Assistente Especialista de Pós-Implantação do sistema{" "}
              <strong>{projectInfo?.system_type || "Orion TN"}</strong> no cartório{" "}
              <strong>{projectInfo?.client_name}</strong> foi concluído.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border text-xs text-muted-foreground space-y-1.5 text-left">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-rose-600" />
              Precisa de suporte contínuo?
            </p>
            <p>
              Entre em contato diretamente com a nossa equipe de suporte da Siplan através dos canais oficiais de atendimento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const assistantMessages = messages.filter((m) => m.role === "assistant");

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-100/70 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] font-sans text-foreground dark:bg-neutral-950">
      {/* Header Estilo WhatsApp com Identidade Siplan */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Mobile Sidebar Toggle + Avatar + Title + Cartório */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Sidebar Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
              title="Abrir histórico de conversas"
            >
              <History className="h-4 w-4 text-rose-600" />
            </Button>

            {/* Humanized Assistant Avatar */}
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-rose-600/20">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900 animate-pulse" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Especialista Siplan · Pós-Implantação
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                <Building2 className="h-3 w-3 text-rose-600 shrink-0" />
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {projectInfo.client_name}
                </span>
              </div>
            </div>
          </div>

          {/* Right: System Badge + Theme + New Chat */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="hidden sm:inline-flex bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 text-[11px] font-semibold">
              <Sparkles className="h-3 w-3 mr-1 text-rose-500" />
              {projectInfo.system_type || "Orion TN"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVisitorDialogOpen(true)}
              className="h-8 max-w-40 gap-1.5 rounded-lg bg-white/70 px-2 text-xs dark:bg-neutral-900/70"
              aria-label="Identificação do usuário"
              title="Trocar usuário"
            >
              <User className="h-3.5 w-3.5 shrink-0 text-rose-600" />
              <span className="hidden max-w-24 truncate lg:inline">
                {visitor?.name || "Identificar"}
              </span>
            </Button>
            <PosChatThemeMenu />
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={resetSession}
              className="h-8 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
              title="Iniciar nova conversa limpa"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nova conversa</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout Area with Retractable Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Retractable Sidebar */}
        <div className="hidden md:flex shrink-0 h-full">
          <PosChatHistorySidebar
            isOpen={sidebarOpen}
            onOpen={() => setSidebarOpen(true)}
            onClose={() => setSidebarOpen(false)}
            sessions={sessions}
            currentSessionId={sessionId}
            onSelectSession={selectSession}
            onNewSession={resetSession}
            onRenameSession={renameSession}
            onDeleteSession={deleteSession}
            onExportSession={exportSession}
            cartorioName={projectInfo.client_name}
            isMobile={false}
          />
        </div>

        {/* Mobile Slide-in Drawer */}
        {mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden animate-in fade-in-30"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <PosChatHistorySidebar
              isOpen={mobileSidebarOpen}
              onOpen={() => setMobileSidebarOpen(true)}
              onClose={() => setMobileSidebarOpen(false)}
              sessions={sessions}
              currentSessionId={sessionId}
              onSelectSession={selectSession}
              onNewSession={resetSession}
              onRenameSession={renameSession}
              onDeleteSession={deleteSession}
              onExportSession={exportSession}
              cartorioName={projectInfo.client_name}
              isMobile={true}
            />
          </>
        )}

        {/* Chat Conversation & Input Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/50 dark:bg-neutral-950/50">
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col justify-between">
            {/* Messages List Area */}
            <div className="space-y-4 mb-4 max-w-4xl w-full mx-auto">
              {/* Welcome Screen when 0 messages in current session */}
              {messages.length === 0 && !isLoadingHistory && (
                <div className="py-3 sm:py-5 space-y-4 animate-in fade-in-50 duration-300">
                  <div className="text-center space-y-2.5">
                    <div className="relative mx-auto inline-block">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
                        <Bot className="h-6 w-6" />
                      </div>
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900 shadow-sm" />
                    </div>

                    <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                      Especialista Virtual · Orion TN
                    </h1>

                    <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-rose-100 dark:border-rose-950/60 shadow-xs max-w-2xl mx-auto text-left flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                          Olá! Sou o especialista virtual da <strong>Siplan</strong> para o pós-implantação do <strong>Orion TN</strong> no cartório <strong>{projectInfo.client_name}</strong>.
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                          Posso orientar sobre rotinas, geração de atos e navegação. <span className="text-rose-600 dark:text-rose-400 font-semibold">Como posso ajudar?</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Prompt Cards */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      Perguntas frequentes
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {QUICK_PROMPTS.map((q) => (
                        <button
                          key={q.title}
                          type="button"
                          onClick={() => handleSend(q.prompt)}
                          className="p-3 rounded-xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-rose-400 dark:hover:border-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-left transition-all group shadow-xs hover:shadow-md cursor-pointer"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <FileText className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground group-hover:text-rose-600 transition-colors">
                                {q.title}
                              </span>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                                {q.desc}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading History Skeleton */}
              {isLoadingHistory && (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
                  <span>Carregando conversa...</span>
                </div>
              )}

              {/* Render Messages */}
              {!isLoadingHistory &&
                messages.map((m) => {
                  const asstIdx =
                    m.role === "assistant"
                      ? assistantMessages.findIndex((item) => item.id === m.id)
                      : -1;
                  return (
                    <MessageItem
                      key={m.id}
                      message={m}
                      assistantIndex={asstIdx}
                      copiedId={copiedId}
                      onCopy={handleCopyMessage}
                      onFeedback={submitFeedback}
                    />
                  );
                })}

              {/* WhatsApp-like Typing Indicator */}
              {isGenerating && (
                <div className="flex items-start gap-2.5 max-w-2xl animate-in fade-in-30 duration-200">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 ml-1">
                      Especialista Siplan
                    </span>
                    <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-bounce" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium ml-1.5 animate-pulse">
                        Consultando base de conhecimento e videoaulas do Orion TN...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Estilo WhatsApp */}
            <div className="sticky bottom-0 z-20 mx-auto mt-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/95 p-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md transition-all dark:border-neutral-800 dark:bg-neutral-900/95">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua dúvida sobre o Orion TN... (Ex: como consultar protocolos?)"
                  className="min-h-[44px] max-h-32 text-xs sm:text-sm resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent py-2.5 px-3"
                />
                <div className="flex items-center gap-1 shrink-0 pb-1">
                  {messages.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                      onClick={resetSession}
                      title="Iniciar nova conversa limpa"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={!inputText.trim() || isGenerating}
                    onClick={() => handleSend()}
                    size="icon"
                    className="h-9 w-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-40 transition-transform active:scale-95 cursor-pointer"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 pt-2 text-[10px] text-muted-foreground border-t border-slate-100 dark:border-neutral-800/80 mt-1.5">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-rose-500" />
                  Base oficial Siplan · Orion TN
                </span>
                <span className="hidden sm:inline">Pressione Enter para enviar · Shift+Enter para nova linha</span>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mandatory Animated Feedback Popup Modal (Only for Substantive Resolutions) */}
      <FeedbackPromptModal
        isOpen={feedbackModalOpen}
        onSelectFeedback={handleModalFeedback}
        pendingMessagePreview={pendingMessageText || undefined}
      />

      <PosChatVisitorDialog
        open={visitorDialogOpen}
        projectName={projectInfo.client_name}
        visitors={visitors}
        currentVisitor={visitor}
        isLoading={isLoadingVisitors}
        isSubmitting={isSubmittingVisitor}
        error={visitorError}
        onOpenChange={setVisitorDialogOpen}
        onSelectVisitor={selectVisitor}
        onRegisterVisitor={registerVisitor}
        onRetry={() => void reloadVisitors()}
      />
    </div>
  );
}

// Single Message Bubble Component
function MessageItem({
  message,
  assistantIndex,
  copiedId,
  onCopy,
  onFeedback,
}: {
  message: PosChatMessage;
  assistantIndex?: number;
  copiedId: string | null;
  onCopy: (id: string, content: string) => void;
  onFeedback: (id: string, fb: "helpful" | "unhelpful") => void;
}) {
  const isUser = message.role === "user";
  const isTriage = !isUser && (assistantIndex === 0 || isTriageMessage(message.content, assistantIndex));

  return (
    <div
      className={`flex items-start gap-2.5 max-w-3xl ${
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      } animate-in fade-in-30 duration-200`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
            <User className="h-4 w-4" />
          </div>
        ) : (
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-neutral-900" />
          </div>
        )}
      </div>

      {/* Bubble + Sender Name + Actions */}
      <div className={`space-y-1 max-w-[88%] sm:max-w-[92%]`}>
        {/* Sender Name */}
        <div className={`flex items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground ${isUser ? "justify-end" : "justify-start"}`}>
          <span>{isUser ? "Você" : "Especialista Siplan"}</span>
        </div>

        {/* Message Card */}
        <div
          className={`p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
            isUser
              ? "bg-slate-900 dark:bg-slate-800 text-white rounded-2xl rounded-tr-xs"
              : "bg-white dark:bg-neutral-900 border border-slate-200/90 dark:border-neutral-800/90 text-foreground rounded-2xl rounded-tl-xs"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <PosChatMessageContent content={message.content} />
          )}
        </div>

        {/* Footer / Actions / Timestamp */}
        <div
          className={`flex items-center gap-2 px-1 text-[11px] text-muted-foreground flex-wrap ${
            isUser ? "justify-end" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[10px]">
              {message.created_at
                ? format(new Date(message.created_at), "HH:mm", { locale: ptBR })
                : ""}
            </span>
            {isUser && <CheckCheck className="h-3 w-3 text-blue-400 inline" />}
          </div>

          {/* Assistant Actions: Copy & Feedback (Feedback only shown for Substantive Resolutions) */}
          {!isUser && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-900 px-2.5 py-1 rounded-full border border-slate-200/90 dark:border-neutral-800 shadow-2xs">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-full cursor-pointer"
                onClick={() => onCopy(message.id, message.content)}
                title="Copiar resposta"
              >
                {copiedId === message.id ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedId === message.id ? "Copiado" : "Copiar"}</span>
              </Button>

              {!isTriage && (
                <>
                  <span className="text-slate-300 dark:text-neutral-700">|</span>

                  <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                    Essa rotina ajudou?
                  </span>

                  <button
                    type="button"
                    onClick={() => onFeedback(message.id, "helpful")}
                    title="Sim, foi útil!"
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      message.feedback === "helpful"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold scale-110 shadow-xs ring-1 ring-emerald-400"
                        : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:scale-110"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onFeedback(message.id, "unhelpful")}
                    title="Não ajudou"
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      message.feedback === "unhelpful"
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold scale-110 shadow-xs ring-1 ring-rose-400"
                        : "text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:scale-110"
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
