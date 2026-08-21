import React from "react";
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
import { RotateCcw, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import type { KnowledgeVersion } from "@/types/knowledge";

interface RestoreVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  version: KnowledgeVersion | null;
  isRestoring: boolean;
}

export function RestoreVersionModal({
  isOpen,
  onClose,
  onConfirm,
  version,
  isRestoring,
}: RestoreVersionModalProps) {
  if (!version) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isRestoring && onClose()}>
      <DialogContent className="max-w-md bg-background border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Restaurar Versão {version.version_tag}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Reversão segura da base de conhecimento (Rollback)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Versão de Origem:</span>
              <Badge variant="outline" className="font-mono font-bold">
                {version.version_tag}
              </Badge>
            </div>
            {version.article_id && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Artigo:</span>
                <span className="font-semibold text-foreground">
                  {version.article_id} - {version.article_title}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Autor da Versão:</span>
              <span className="font-medium text-foreground">
                {version.author_name || version.author_email}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold block">Como funciona esta restauração:</span>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-200">
                1. O estado atual da base será salvo automaticamente em um novo backup de segurança.<br />
                2. O arquivo principal será substituído pelo conteúdo histórico desta versão ({version.version_tag}).<br />
                3. A sincronização com a OpenAI Vector Store será acionada imediatamente.
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
            disabled={isRestoring}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isRestoring}
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Restaurando...
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Confirmar e Restaurar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
