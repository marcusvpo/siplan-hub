import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  CloudUpload,
  Bot,
  Loader2,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  HardDrive,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { KnowledgeArticle, VersionDiffSummary } from "@/types/knowledge";
import type { SaveStep } from "@/hooks/useKnowledgeBase";

interface SavePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customSummary?: string) => Promise<any>;
  article: KnowledgeArticle | null;
  isSaving: boolean;
  diffSummary?: VersionDiffSummary;
  saveStep: SaveStep;
  syncErrorMessage: string | null;
  syncedFileId: string | null;
  onResetSaveState: () => void;
}

export function SavePublishModal({
  isOpen,
  onClose,
  onConfirm,
  article,
  isSaving,
  diffSummary,
  saveStep,
  syncErrorMessage,
  syncedFileId,
  onResetSaveState,
}: SavePublishModalProps) {
  const [summaryInput, setSummaryInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Contador de tempo durante o salvamento/sincronização
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (saveStep === "saving_storage" || saveStep === "syncing_openai") {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [saveStep]);

  // Limpeza ao abrir/fechar
  useEffect(() => {
    if (isOpen && saveStep === "idle") {
      setSummaryInput("");
    }
  }, [isOpen, saveStep]);

  if (!article) return null;

  const handleConfirm = () => {
    onConfirm(summaryInput);
  };

  const handleClose = () => {
    onResetSaveState();
    onClose();
  };

  const isProcessing = saveStep === "saving_storage" || saveStep === "syncing_openai";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && handleClose()}>
      <DialogContent className="max-w-lg bg-background border-border shadow-2xl overflow-hidden">
        {/* ===================== CASO 1: EM PROGRESSO OU SUCESSO/FALHA ===================== */}
        {saveStep !== "idle" ? (
          <div className="py-2 space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    saveStep === "synced"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : saveStep === "failed"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {saveStep === "synced" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : saveStep === "failed" ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <Bot className="h-6 w-6 animate-pulse" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    {saveStep === "saving_storage" && "Salvando Arquivo & Criando Backup..."}
                    {saveStep === "syncing_openai" && "Sincronizando com a OpenAI Vector Store..."}
                    {saveStep === "synced" && "Base de Conhecimento Publicada com Sucesso!"}
                    {saveStep === "failed" && "Aviso na Sincronização da IA"}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {saveStep === "saving_storage" && "Gravando versão no Supabase Storage..."}
                    {saveStep === "syncing_openai" && "Indexando na OpenAI com Zero Downtime..."}
                    {saveStep === "synced" && "O assistente já está respondendo com os tutoriais atualizados."}
                    {saveStep === "failed" && "O arquivo foi salvo no Storage, mas houve erro na OpenAI."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Pipeline de 2 Etapas em Tempo Real */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3.5">
              {/* Etapa 1: Storage & Backup */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      saveStep === "saving_storage"
                        ? "bg-primary text-primary-foreground animate-pulse"
                        : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {saveStep === "saving_storage" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground block">
                      1. Supabase Storage & Backup
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Cópia histórica salva em <code className="text-[10px]">assistant-oriontn-doc/backup/</code>
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    saveStep === "saving_storage"
                      ? "border-primary/40 text-primary bg-primary/5"
                      : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  }
                >
                  {saveStep === "saving_storage" ? "Salvando..." : "Concluído"}
                </Badge>
              </div>

              {/* Linha Divisória */}
              <div className="ml-3 border-l-2 border-dashed border-border/80 h-3" />

              {/* Etapa 2: OpenAI Vector Store */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      saveStep === "saving_storage"
                        ? "bg-muted text-muted-foreground"
                        : saveStep === "syncing_openai"
                        ? "bg-primary text-primary-foreground animate-pulse"
                        : saveStep === "synced"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {saveStep === "saving_storage" ? (
                      <span>2</span>
                    ) : saveStep === "syncing_openai" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : saveStep === "synced" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground block">
                      2. OpenAI Vector Store (Zero Downtime)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Indexação do novo arquivo e desvinculação das versões obsoletas
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    saveStep === "saving_storage"
                      ? "border-muted text-muted-foreground"
                      : saveStep === "syncing_openai"
                      ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-pulse"
                      : saveStep === "synced"
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                  }
                >
                  {saveStep === "saving_storage" && "Aguardando"}
                  {saveStep === "syncing_openai" && `Indexando (${elapsedSeconds}s)`}
                  {saveStep === "synced" && "Sincronizado"}
                  {saveStep === "failed" && "Falhou"}
                </Badge>
              </div>
            </div>

            {/* Informações de Sucesso */}
            {saveStep === "synced" && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Sincronização 100% Finalizada!</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-200">
                  O assistente na OpenAI já está utilizando a nova versão do arquivo <code className="font-mono font-bold">OrionTN pos.md</code> na Vector Store ativa.
                </p>
                {syncedFileId && (
                  <div className="pt-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                    OpenAI File ID: <span className="font-bold">{syncedFileId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Mensagem de Falha */}
            {saveStep === "failed" && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 space-y-1.5 text-xs text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>Detalhes do Erro na OpenAI:</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-200 font-mono bg-background/50 p-2 rounded border">
                  {syncErrorMessage || "Tempo limite excedido na resposta da automação."}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Nota: O arquivo foi preservado no Supabase Storage. Você pode tentar republicar quando desejar.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                size="sm"
                onClick={handleClose}
                disabled={isProcessing}
                className={`w-full font-bold text-xs ${
                  saveStep === "synced"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : saveStep === "failed"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-primary"
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    Processando em tempo real...
                  </>
                ) : (
                  "Concluir e Fechar"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ===================== CASO 2: FORMULÁRIO DE CONFIRMAÇÃO INICIAL ===================== */
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CloudUpload className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Salvar Versão & Publicar na IA
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Criação automática de backup e sincronização com a OpenAI Vector Store
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              {/* Detalhes do Artigo */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono font-bold bg-primary/10 text-primary border-primary/30">
                      {article.id}
                    </Badge>
                    <span className="font-semibold truncate text-foreground">
                      {article.metadata.titulo || article.titulo}
                    </span>
                  </div>

                  {diffSummary && (
                    <div className="flex items-center gap-2 text-[11px] shrink-0 font-medium">
                      {diffSummary.addedLinesCount > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <PlusCircle className="h-3 w-3" />+{diffSummary.addedLinesCount}
                        </span>
                      )}
                      {diffSummary.removedLinesCount > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                          <MinusCircle className="h-3 w-3" />-{diffSummary.removedLinesCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-muted-foreground text-[11px] line-clamp-2">
                  {article.metadata.objetivo}
                </p>
              </div>

              {/* Campo de Resumo da Alteração */}
              <div className="space-y-1.5">
                <Label htmlFor="change-summary" className="text-xs font-semibold text-foreground">
                  Resumo da Alteração (Histórico de Versão):
                </Label>
                <Input
                  id="change-summary"
                  value={summaryInput}
                  onChange={(e) => setSummaryInput(e.target.value)}
                  placeholder="Ex: Atualizado passo a passo da rotina de reconhecimento de firmas..."
                  className="text-xs h-8.5 bg-background"
                />
              </div>

              {/* Backup no Storage */}
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 border p-2.5 text-muted-foreground">
                <HardDrive className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <div className="space-y-0.5 text-[11px]">
                  <span className="font-semibold text-foreground block">Backup Histórico Automático:</span>
                  <p className="leading-tight">
                    A versão anterior será replicada e guardada em <span className="font-mono text-foreground">assistant-oriontn-doc/backup/</span>.
                  </p>
                </div>
              </div>

              {/* Aviso Importante de Sincronização */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-800 dark:text-amber-300">
                <Bot className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5 text-[11px]">
                  <span className="font-semibold block">Sincronização com a IA em tempo real:</span>
                  <p className="leading-tight text-amber-700 dark:text-amber-200">
                    O workflow no n8n atualizará a OpenAI Vector Store com Zero Downtime logo após o salvamento.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSaving}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={isSaving}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md"
              >
                <FileCheck2 className="h-4 w-4" />
                Confirmar e Publicar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
