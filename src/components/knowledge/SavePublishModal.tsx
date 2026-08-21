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
import {
  CloudUpload,
  Bot,
  Loader2,
  FileCheck2,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  HardDrive,
} from "lucide-react";
import type { KnowledgeArticle, VersionDiffSummary } from "@/types/knowledge";

interface SavePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customSummary?: string) => Promise<void>;
  article: KnowledgeArticle | null;
  isSaving: boolean;
  diffSummary?: VersionDiffSummary;
}

export function SavePublishModal({
  isOpen,
  onClose,
  onConfirm,
  article,
  isSaving,
  diffSummary,
}: SavePublishModalProps) {
  const [summaryInput, setSummaryInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSummaryInput("");
    }
  }, [isOpen]);

  if (!article) return null;

  const handleConfirm = () => {
    onConfirm(summaryInput);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="max-w-lg bg-background border-border shadow-2xl">
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
              <span className="font-semibold block">Sincronização OpenAI em tempo real:</span>
              <p className="leading-tight text-amber-700 dark:text-amber-200">
                Isso atualizará a base de conhecimento do assistente na OpenAI imediatamente via Webhook n8n.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
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
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando e Sincronizando...
              </>
            ) : (
              <>
                <FileCheck2 className="h-4 w-4" />
                Confirmar e Publicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
