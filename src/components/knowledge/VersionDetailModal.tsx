import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  Clock,
  User,
  FileCode,
  CheckCircle2,
  HardDrive,
  Diff,
  PlusCircle,
  MinusCircle,
  RotateCcw,
} from "lucide-react";
import type { KnowledgeVersion } from "@/types/knowledge";

interface VersionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: KnowledgeVersion | null;
  downloadUrl?: string;
  onRestoreClick?: (version: KnowledgeVersion) => void;
}

export function VersionDetailModal({
  isOpen,
  onClose,
  version,
  downloadUrl,
  onRestoreClick,
}: VersionDetailModalProps) {
  if (!version) return null;

  const formattedDate = version.created_at
    ? format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm:ss", {
        locale: ptBR,
      })
    : "Data não disponível";

  const diff = version.diff_summary;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-background border-border shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b bg-muted/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className="font-mono text-xs font-bold bg-primary text-primary-foreground">
                {version.version_tag}
              </Badge>
              <DialogTitle className="text-base font-bold truncate">
                Detalhes da Versão {version.version_number}
              </DialogTitle>
            </div>

            {version.is_restoration && (
              <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                Restauração / Rollback
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-muted-foreground/70" />
              {version.author_name || version.author_email}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] p-5 space-y-4">
          {/* Card com Metadados da Edição */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2.5 text-xs">
            {version.article_id && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted-foreground">Artigo Editado:</span>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {version.article_id}
                </Badge>
                <span className="font-semibold text-foreground truncate">
                  {version.article_title}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-bold text-muted-foreground">Resumo:</span>
              <span className="text-foreground">{version.summary_changes || "Sem descrição"}</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <HardDrive className="h-3.5 w-3.5" />
              <span className="font-mono truncate">{version.backup_file_path}</span>
            </div>
          </div>

          {/* Métricas de Diff */}
          {diff && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Diff className="h-3.5 w-3.5 text-primary" />
                Resumo de Modificações (Diff)
              </span>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-2.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    Linhas Adicionadas
                  </span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
                    <PlusCircle className="h-4 w-4" />
                    +{diff.addedLinesCount || 0}
                  </span>
                </div>

                <div className="rounded-lg border bg-rose-500/5 border-rose-500/20 p-2.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                    Linhas Removidas
                  </span>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1">
                    <MinusCircle className="h-4 w-4" />
                    -{diff.removedLinesCount || 0}
                  </span>
                </div>

                <div className="rounded-lg border bg-muted/40 p-2.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Diferença Caracteres
                  </span>
                  <span className="text-lg font-black text-foreground">
                    {diff.charDiffCount ? (diff.charDiffCount > 0 ? `+${diff.charDiffCount}` : diff.charDiffCount) : 0}
                  </span>
                </div>
              </div>

              {/* Snippet do que mudou */}
              {diff.newSnippet && (
                <div className="space-y-1 pt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Trecho do novo conteúdo:
                  </span>
                  <pre className="rounded-lg bg-muted/60 p-3 font-mono text-xs text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto border">
                    {diff.newSnippet}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Ações da Versão */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
            {downloadUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                asChild
              >
                <a href={downloadUrl} download target="_blank" rel="noreferrer">
                  <Download className="h-3.5 w-3.5" />
                  Baixar Arquivo de Backup (.md)
                </a>
              </Button>
            )}

            {onRestoreClick && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onRestoreClick(version);
                }}
                className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar Esta Versão
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
