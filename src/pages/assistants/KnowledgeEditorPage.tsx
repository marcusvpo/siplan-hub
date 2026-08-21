import React, { useState } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { ArticleMetadataCard } from "@/components/knowledge/ArticleMetadataCard";
import { MarkdownTiptapEditor } from "@/components/knowledge/MarkdownTiptapEditor";
import { ArticleNavigator } from "@/components/knowledge/ArticleNavigator";
import { SavePublishModal } from "@/components/knowledge/SavePublishModal";
import { VersionHistoryDrawer } from "@/components/knowledge/VersionHistoryDrawer";
import { UnsavedChangesDialog } from "@/components/knowledge/UnsavedChangesDialog";

export default function KnowledgeEditorPage() {
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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

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

  // 1. Loading State com Skeletons
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-7 w-96" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-44" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6 flex-1">
          <div className="col-span-3 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="col-span-9 space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
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

  return (
    <div className="flex flex-col h-[calc(100vh-4.2rem)] overflow-hidden bg-background">
      {/* Header Superior */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border/50 bg-background/95 px-6 py-3 backdrop-blur-md">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">Assistentes</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-medium">Base de Conhecimento</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Orion TN (OrionTN pos.md)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              Biblioteca de Conhecimento Orion TN
            </h1>
            <Badge variant="outline" className="font-mono text-[11px] bg-muted/50">
              {latestVersionTag} · {articles.length} tutoriais
            </Badge>
          </div>
        </div>

        {/* Status, Auditoria, Histórico & Ação Principal */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador de Status Dinâmico */}
          {isDirty ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold py-1 px-2.5 shadow-xs animate-pulse"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Alterações Pendentes
            </Badge>
          ) : saveStep === "syncing_openai" || latestSyncStatus === "syncing" ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/40 bg-primary/10 text-primary font-semibold py-1 px-2.5 shadow-xs animate-pulse"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sincronizando com OpenAI...
            </Badge>
          ) : latestSyncStatus === "failed" ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold py-1 px-2.5 shadow-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Falha na Sincronização OpenAI
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold py-1 px-2.5 shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sincronizado com OpenAI
            </Badge>
          )}

          {/* Botão Biblioteca de Versões & Backups */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <History className="h-4 w-4 text-primary" />
            <span>Histórico & Backups</span>
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

          {/* Botão de Ação Primária */}
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all h-9 px-4"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4" />
                <span>Salvar e Publicar na IA</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Corpo Principal (2 Colunas: Navigator + Canvas) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Barra Lateral do Navegador (Colapsável) */}
        <aside
          className={`shrink-0 transition-all duration-300 ease-in-out relative ${
            isSidebarOpen ? "w-80 md:w-96" : "w-0"
          } overflow-hidden`}
        >
          <ArticleNavigator
            articles={articles}
            filteredArticles={filteredArticles}
            sections={sections}
            selectedArticleId={selectedArticleId}
            onSelectArticle={setSelectedArticleId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedSectionIndex={selectedSectionIndex}
            onSectionChange={setSelectedSectionIndex}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            allTags={allTags}
            isDirty={isDirty}
          />
        </aside>

        {/* Área Central de Visualização e Edição */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-muted/5">
          {/* Botão de Toggle do Índice */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
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

          <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
            {/* Card de Metadados Read-Only (Proteção YAML) */}
            <ArticleMetadataCard article={selectedArticle} />

            {/* Editor TipTap WYSIWYG Estilo Notion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Passo a Passo / Procedimento (WYSIWYG)
                </span>
                <span className="text-[11px] text-muted-foreground">
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

      {/* Diálogo de Proteção Contra Perda de Alterações Não Salvas */}
      <UnsavedChangesDialog
        isOpen={isUnsavedDialogOpen}
        onConfirmDiscard={confirmDiscardAndSwitch}
        onCancel={cancelArticleSwitch}
        articleId={selectedArticle?.id}
      />
    </div>
  );
}
