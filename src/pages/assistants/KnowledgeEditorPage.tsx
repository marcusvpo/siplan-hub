import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CloudUpload,
  Bot,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Loader2,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { ArticleMetadataCard } from "@/components/knowledge/ArticleMetadataCard";
import { MarkdownTiptapEditor } from "@/components/knowledge/MarkdownTiptapEditor";
import { ArticleNavigator } from "@/components/knowledge/ArticleNavigator";
import { SavePublishModal } from "@/components/knowledge/SavePublishModal";
import { VersionHistoryDrawer } from "@/components/knowledge/VersionHistoryDrawer";
import { UnsavedChangesDialog } from "@/components/knowledge/UnsavedChangesDialog";
import { CreateRoutineModal } from "@/components/knowledge/CreateRoutineModal";
import type { KnowledgeArticleMetadata } from "@/types/knowledge";

export default function KnowledgeEditorPage() {
  const navigate = useNavigate();

  const {
    articles,
    filteredArticles,
    sections,
    allTags,
    selectedArticle,
    selectedArticleId,
    setSelectedArticleId,
    draftBody,
    setDraftBody,
    isDirty,
    currentDiffSummary,
    searchQuery,
    setSearchQuery,
    selectedSectionIndex,
    setSelectedSectionIndex,
    selectedTag,
    setSelectedTag,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    lastSyncLog,
    versions,
    isLoadingVersions,
    saveCurrentArticle,
    createNewRoutine,
    isCreatingRoutine,
    deleteRoutine,
    isDeletingRoutine,
    isSaving,
    restoreVersion,
    isRestoring,
    getBackupDownloadUrl,
    saveStep,
    syncErrorMessage,
    syncedFileId,
    resetSaveState,
    isUnsavedDialogOpen,
    confirmDiscardAndSwitch,
    cancelArticleSwitch,
  } = useKnowledgeBase();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileNavigatorOpen, setIsMobileNavigatorOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  // 1. Interceptar cliques em links de navegação do menu lateral quando houver alterações pendentes
  useEffect(() => {
    if (!isDirty) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (anchor && anchor.href && !anchor.target) {
        try {
          const targetUrl = new URL(anchor.href, window.location.origin);
          // Se estiver navegando para outra página/rota fora desta tela
          if (targetUrl.pathname !== window.location.pathname) {
            e.preventDefault();
            e.stopPropagation();
            setPendingNavigationPath(targetUrl.pathname + targetUrl.search + targetUrl.hash);
          }
        } catch {
          // Ignorar URLs inválidas
        }
      }
    };

    window.addEventListener("click", handleGlobalClick, { capture: true });
    return () => window.removeEventListener("click", handleGlobalClick, { capture: true });
  }, [isDirty]);

  // 2. Interceptar botão voltar/avançar do navegador (History PopState)
  useEffect(() => {
    if (!isDirty) return;

    const handlePopState = () => {
      if (isDirty) {
        const confirmLeave = window.confirm(
          "Existem alterações não salvas no tutorial. Deseja realmente sair e descartar as modificações?",
        );
        if (!confirmLeave) {
          window.history.pushState(null, "", window.location.href);
        }
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  const handleSaveClick = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async (customSummary?: string) => {
    try {
      await saveCurrentArticle(customSummary);
    } catch {
      // O modal de progresso exibirá a mensagem de erro
    }
  };

  const handleCreateRoutine = async (params: {
    metadata: KnowledgeArticleMetadata;
    body: string;
    sectionIndex: number;
    hasVideo: boolean;
    customSummary?: string;
  }) => {
    setIsCreateModalOpen(false);
    setIsConfirmModalOpen(true);
    return createNewRoutine(params);
  };

  const handleDeleteRoutine = async (articleId: string) => {
    setIsConfirmModalOpen(true);
    return deleteRoutine(articleId);
  };

  const handleConfirmDiscard = () => {
    if (pendingNavigationPath) {
      const dest = pendingNavigationPath;
      setPendingNavigationPath(null);
      confirmDiscardAndSwitch();
      navigate(dest);
      return;
    }
    confirmDiscardAndSwitch();
  };

  const handleCancelDiscard = () => {
    setPendingNavigationPath(null);
    cancelArticleSwitch();
  };

  const handleSelectArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    setIsMobileNavigatorOpen(false);
  };

  // 3. Loading State com Skeletons
  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col space-y-4 overflow-hidden p-3 sm:h-[calc(100dvh-4rem)] sm:space-y-6 sm:p-6">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-7 w-full max-w-96" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Skeleton className="h-9 w-full sm:w-32" />
            <Skeleton className="h-9 w-full sm:w-44" />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-12 md:gap-6">
          <div className="hidden space-y-3 md:col-span-3 md:block">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-4 md:col-span-9">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // 4. Error State
  if (isError || !selectedArticle) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-6 text-center space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-lg font-bold text-foreground">
            Erro ao carregar base de conhecimento
          </h2>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Não foi possível baixar o arquivo OrionTN pos.md do Supabase Storage."}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RotateCw className="h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const latestVersion = versions.length > 0 ? versions[0] : null;
  const latestVersionTag = latestVersion ? latestVersion.version_tag : "v2.1.0";
  const latestSyncStatus = latestVersion ? latestVersion.webhook_sync_status : "synced";

  const formattedLastSync = lastSyncLog?.created_at
    ? format(new Date(lastSyncLog.created_at), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR,
      })
    : null;

  const isAnyUnsavedAlertOpen = isUnsavedDialogOpen || Boolean(pendingNavigationPath);

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem)] min-h-0 min-w-0 flex-col overflow-hidden bg-background sm:h-[calc(100dvh-4rem)]"
      data-testid="assistants-knowledge-mobile-layout"
    >
      {/* Header Superior */}
      <header className="shrink-0 border-b border-border/50 bg-background/95 px-3 py-2 backdrop-blur-md sm:px-6 sm:py-3">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
        <div className="min-w-0 space-y-1">
          {/* Breadcrumb */}
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <span className="font-medium">Assistentes</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-medium">Base de Conhecimento</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Orion TN (OrionTN pos.md)
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-3">
            <h1 className="min-w-0 text-base font-black leading-tight tracking-tight text-foreground sm:text-lg">
              Biblioteca de Conhecimento Orion TN
            </h1>
            <Badge variant="outline" className="shrink-0 bg-muted/50 font-mono text-[10px] sm:text-[11px]">
              {latestVersionTag} · {articles.length} tutoriais
            </Badge>
          </div>
        </div>

        {/* Status, Auditoria, Histórico, Nova Rotina & Ação Principal */}
        <div className="grid min-w-0 grid-cols-3 items-center gap-1.5 sm:flex sm:flex-wrap sm:gap-2.5">
          {/* Indicador de Status Dinâmico */}
          {isDirty ? (
            <Badge
              variant="outline"
              className="col-span-3 w-fit max-w-full gap-1.5 border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-600 shadow-xs animate-pulse dark:text-amber-400 sm:col-span-1 sm:px-2.5 sm:text-xs"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Alterações Pendentes
            </Badge>
          ) : saveStep === "syncing_openai" || latestSyncStatus === "syncing" ? (
            <Badge
              variant="outline"
              className="col-span-3 w-fit max-w-full gap-1.5 border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary shadow-xs animate-pulse sm:col-span-1 sm:px-2.5 sm:text-xs"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sincronizando com OpenAI...
            </Badge>
          ) : latestSyncStatus === "failed" ? (
            <Badge
              variant="outline"
              className="col-span-3 w-fit max-w-full gap-1.5 border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-600 shadow-xs dark:text-rose-400 sm:col-span-1 sm:px-2.5 sm:text-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Falha na Sincronização OpenAI
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="col-span-3 w-fit max-w-full gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 shadow-xs dark:text-emerald-400 sm:col-span-1 sm:px-2.5 sm:text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sincronizado com OpenAI
            </Badge>
          )}

          {/* Botão + Nova Rotina */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 min-w-0 gap-1 bg-primary/90 px-2 text-[11px] font-bold text-primary-foreground shadow-xs hover:bg-primary sm:gap-1.5 sm:px-3 sm:text-xs"
            title="Cadastrar uma nova rotina/tutorial na base de conhecimento"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="sm:hidden">Nova</span>
            <span className="hidden sm:inline">Nova Rotina</span>
          </Button>

          {/* Botão Biblioteca de Versões & Backups */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="h-9 min-w-0 gap-1 px-2 text-[11px] sm:gap-1.5 sm:px-3 sm:text-xs"
          >
            <History className="h-4 w-4 text-primary" />
            <span className="sm:hidden">Histórico</span>
            <span className="hidden sm:inline">Histórico & Backups</span>
            {versions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 font-mono text-[10px]">
                {versions.length}
              </Badge>
            )}
          </Button>

          {/* Histórico de Última Modificação */}
          {formattedLastSync && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border/50 pl-2.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>{formattedLastSync}</span>
            </div>
          )}

          {/* Botão de Salvar Alterações Atuais */}
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="h-9 min-w-0 gap-1 bg-primary px-2 text-[11px] font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg sm:gap-2 sm:px-4 sm:text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="truncate">Processando...</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4" />
                <span className="sm:hidden">Publicar</span>
                <span className="hidden sm:inline">Salvar e Publicar na IA</span>
              </>
            )}
          </Button>
        </div>
        </div>
      </header>

      {/* Corpo Principal (2 Colunas: Navigator + Canvas) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Barra Lateral do Navegador (Colapsável) */}
        <aside
          className={`relative hidden shrink-0 transition-all duration-300 ease-in-out md:block ${
            isSidebarOpen ? "w-80 md:w-96" : "w-0"
          } overflow-hidden`}
        >
          <ArticleNavigator
            articles={articles}
            filteredArticles={filteredArticles}
            sections={sections}
            selectedArticleId={selectedArticleId}
            onSelectArticle={handleSelectArticle}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedSectionIndex={selectedSectionIndex}
            onSectionChange={setSelectedSectionIndex}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            allTags={allTags}
            isDirty={isDirty}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        </aside>

        <Sheet open={isMobileNavigatorOpen} onOpenChange={setIsMobileNavigatorOpen}>
          <SheetContent
            side="left"
            className="w-[min(92vw,24rem)] max-w-none overflow-hidden p-0 pb-[env(safe-area-inset-bottom)] md:hidden"
          >
            <SheetTitle className="sr-only">Índice de tutoriais</SheetTitle>
            <ArticleNavigator
              articles={articles}
              filteredArticles={filteredArticles}
              sections={sections}
              selectedArticleId={selectedArticleId}
              onSelectArticle={handleSelectArticle}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedSectionIndex={selectedSectionIndex}
              onSectionChange={setSelectedSectionIndex}
              selectedTag={selectedTag}
              onTagChange={setSelectedTag}
              allTags={allTags}
              isDirty={isDirty}
              onOpenCreateModal={() => {
                setIsMobileNavigatorOpen(false);
                setIsCreateModalOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Área Central de Visualização e Edição */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-muted/5">
          {/* Botão de Toggle do Índice */}
          <div className="flex items-center justify-between px-3 pb-1 pt-2 sm:px-6 sm:pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileNavigatorOpen(true)}
              className="h-8 max-w-full gap-1.5 px-2 text-xs md:hidden"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="truncate">Tutoriais ({articles.length})</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="hidden h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground md:inline-flex"
            >
              {isSidebarOpen ? (
                <>
                  <PanelLeftClose className="h-3.5 w-3.5" />
                  <span>Ocultar Índice</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                  <span>Exibir Índice ({articles.length} tutoriais)</span>
                </>
              )}
            </Button>
          </div>

          <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:space-y-6 sm:p-6 md:p-8">
            {/* Card de Metadados Read-Only (Proteção YAML + 3 Pontinhos para Excluir) */}
            <ArticleMetadataCard
              article={selectedArticle}
              onDeleteRoutine={handleDeleteRoutine}
              isDeleting={isDeletingRoutine || isSaving}
            />

            {/* Editor TipTap WYSIWYG Estilo Notion */}
            <div className="space-y-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Passo a Passo / Procedimento (WYSIWYG)
                </span>
                <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                  Editor visual com serialização automática para Markdown
                </span>
              </div>

              <MarkdownTiptapEditor
                value={draftBody}
                onChange={setDraftBody}
                disabled={isSaving}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Cadastro de Nova Rotina com Preenchimento por IA */}
      <CreateRoutineModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        articles={articles}
        sections={sections}
        onCreateRoutine={handleCreateRoutine}
        isCreating={isCreatingRoutine || isSaving}
      />

      {/* Modal de Confirmação e Publicação com Feedback em Tempo Real */}
      <SavePublishModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSave}
        article={selectedArticle}
        isSaving={isSaving}
        diffSummary={currentDiffSummary}
        saveStep={saveStep}
        syncErrorMessage={syncErrorMessage}
        syncedFileId={syncedFileId}
        onResetSaveState={resetSaveState}
      />

      {/* Drawer da Biblioteca de Versões e Backups */}
      <VersionHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        versions={versions}
        isLoading={isLoadingVersions}
        onRestoreVersion={restoreVersion}
        isRestoring={isRestoring}
        getBackupDownloadUrl={getBackupDownloadUrl}
      />

      {/* Diálogo de Proteção Contra Perda de Alterações Não Salvas (Interno e Rotas Globais) */}
      <UnsavedChangesDialog
        isOpen={isAnyUnsavedAlertOpen}
        onConfirmDiscard={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        articleId={selectedArticle?.id}
        isNavigatingAway={Boolean(pendingNavigationPath)}
      />
    </div>
  );
}
