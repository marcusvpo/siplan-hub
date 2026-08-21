import React, { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  History,
  Search,
  Download,
  Eye,
  RotateCcw,
  Clock,
  User,
  HardDrive,
  FileCode2,
  Sparkles,
  Layers,
} from "lucide-react";
import { VersionDetailModal } from "./VersionDetailModal";
import { RestoreVersionModal } from "./RestoreVersionModal";
import type { KnowledgeVersion } from "@/types/knowledge";

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: KnowledgeVersion[];
  isLoading: boolean;
  onRestoreVersion: (version: KnowledgeVersion) => Promise<any>;
  isRestoring: boolean;
  getBackupDownloadUrl: (path: string) => string;
}

export function VersionHistoryDrawer({
  isOpen,
  onClose,
  versions,
  isLoading,
  onRestoreVersion,
  isRestoring,
  getBackupDownloadUrl,
}: VersionHistoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetailVersion, setSelectedDetailVersion] = useState<KnowledgeVersion | null>(null);
  const [selectedRestoreVersion, setSelectedRestoreVersion] = useState<KnowledgeVersion | null>(null);

  // Filtragem das versões
  const filteredVersions = useMemo(() => {
    if (!searchQuery.trim()) return versions;
    const q = searchQuery.toLowerCase().trim();
    return versions.filter((v) => {
      const matchTag = v.version_tag.toLowerCase().includes(q);
      const matchAuthor = (v.author_name || v.author_email || "").toLowerCase().includes(q);
      const matchArticle = (v.article_id || "").toLowerCase().includes(q) || (v.article_title || "").toLowerCase().includes(q);
      const matchSummary = (v.summary_changes || "").toLowerCase().includes(q);
      return matchTag || matchAuthor || matchArticle || matchSummary;
    });
  }, [versions, searchQuery]);

  const handleConfirmRestore = async () => {
    if (!selectedRestoreVersion) return;
    try {
      await onRestoreVersion(selectedRestoreVersion);
      setSelectedRestoreVersion(null);
    } catch {
      // O hook ja trata os toasts de erro
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-background border-l shadow-2xl">
          {/* Header */}
          <SheetHeader className="p-4 border-b bg-muted/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-foreground">
                    Biblioteca de Versões & Backups
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Histórico auditável com cópias de segurança automáticas
                  </SheetDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {versions.length} {versions.length === 1 ? "versão" : "versões"}
              </Badge>
            </div>

            {/* Input de Busca */}
            <div className="relative pt-2">
              <Search className="absolute left-2.5 top-4.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por versão, autor, artigo ou resumo..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </SheetHeader>

          {/* Timeline de Versões */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Carregando histórico de versões...
              </div>
            ) : filteredVersions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Layers className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p>Nenhuma versão registrada encontrada.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {filteredVersions.map((version) => {
                  const relativeTime = version.created_at
                    ? formatDistanceToNow(new Date(version.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : "";

                  const formattedDate = version.created_at
                    ? format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : "";

                  const authorInitials = (version.author_name || version.author_email || "U")
                    .slice(0, 2)
                    .toUpperCase();

                  const backupUrl = getBackupDownloadUrl(version.backup_file_path);

                  return (
                    <div
                      key={version.id}
                      className="relative rounded-xl border border-border/70 bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 group"
                    >
                      {/* Ponto da Linha do Tempo */}
                      <span className="absolute -left-[29px] top-4.5 h-3 w-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />

                      {/* Top Bar da Versão */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="font-mono text-xs font-black bg-primary text-primary-foreground">
                            {version.version_tag}
                          </Badge>
                          {version.is_restoration && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              Rollback
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground" title={formattedDate}>
                            {relativeTime}
                          </span>
                        </div>

                        {version.content_size_bytes && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {(version.content_size_bytes / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>

                      {/* Artigo Modificado & Resumo */}
                      <div className="space-y-1 mb-2.5">
                        {version.article_id && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Badge variant="outline" className="font-mono text-[10px] px-1 py-0 h-4">
                              {version.article_id}
                            </Badge>
                            <span className="truncate">{version.article_title}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {version.summary_changes || "Publicação na base de conhecimento"}
                        </p>
                      </div>

                      {/* Autor & Ações Rápidas */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Avatar className="h-5 w-5 text-[10px]">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {authorInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-medium text-foreground truncate max-w-[140px]">
                            {version.author_name || version.author_email}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Ver Detalhes / Diff */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDetailVersion(version)}
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            title="Ver resumo de alterações e estatísticas de diff"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Diff</span>
                          </Button>

                          {/* Baixar Backup */}
                          {backupUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              asChild
                              title="Baixar arquivo histórico de backup"
                            >
                              <a href={backupUrl} download target="_blank" rel="noreferrer">
                                <Download className="h-3.5 w-3.5" />
                                <span>Backup</span>
                              </a>
                            </Button>
                          )}

                          {/* Restaurar Versão */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRestoreVersion(version)}
                            className="h-7 px-2 text-xs gap-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                            title="Restaurar a base de conhecimento para esta versão"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Restaurar</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Modal de Detalhes & Diff */}
      <VersionDetailModal
        isOpen={!!selectedDetailVersion}
        onClose={() => setSelectedDetailVersion(null)}
        version={selectedDetailVersion}
        downloadUrl={
          selectedDetailVersion
            ? getBackupDownloadUrl(selectedDetailVersion.backup_file_path)
            : undefined
        }
        onRestoreClick={(v) => setSelectedRestoreVersion(v)}
      />

      {/* Modal de Confirmação de Restauração */}
      <RestoreVersionModal
        isOpen={!!selectedRestoreVersion}
        onClose={() => setSelectedRestoreVersion(null)}
        version={selectedRestoreVersion}
        onConfirm={handleConfirmRestore}
        isRestoring={isRestoring}
      />
    </>
  );
}
