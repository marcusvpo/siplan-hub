import { useState } from "react";
import {
  ShieldCheck,
  Tag,
  Target,
  Video,
  HelpCircle,
  Sparkles,
  ChevronDown,
  PlayCircle,
  ExternalLink,
  BookOpen,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Loader2,
  Copy,
  Clock,
  Film,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { parseTimestampToSeconds } from "@/services/markdownKnowledgeService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { BunnyVideoModal } from "./BunnyVideoModal";
import type { KnowledgeArticle } from "@/types/knowledge";

interface ArticleMetadataCardProps {
  article: KnowledgeArticle;
  onDeleteRoutine?: (articleId: string) => Promise<any>;
  isDeleting?: boolean;
}

export function ArticleMetadataCard({
  article,
  onDeleteRoutine,
  isDeleting = false,
}: ArticleMetadataCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { metadata } = article;
  const hasVideo = metadata.video && metadata.video.tem_video;
  const hasQuestions = metadata.perguntas_usuario && metadata.perguntas_usuario.length > 0;
  const hasSynonyms = metadata.sinonimos && metadata.sinonimos.length > 0;

  const handleConfirmDelete = async () => {
    if (!onDeleteRoutine) return;
    try {
      await onDeleteRoutine(article.id);
      setIsDeleteDialogOpen(false);
    } catch {
      // Erro tratado pelo hook
    }
  };

  return (
    <>
      <Card className="mb-4 min-w-0 overflow-hidden border-border/60 bg-muted/20 shadow-sm sm:mb-6">
        {/* Top Bar with ID, Status, Video Button and 3-dots Menu */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-muted/40 px-3 py-2.5 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <Badge
              variant="default"
              className="font-mono text-xs font-black tracking-wide bg-primary text-primary-foreground shadow-xs"
            >
              {article.id}
            </Badge>
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span className="break-words">{article.sectionName}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md sm:gap-1.5 sm:px-2 sm:text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden min-[360px]:inline">YAML Protegido</span>
            </div>

            {hasVideo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVideoModalOpen(true)}
                className="h-7 text-xs gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 font-semibold"
              >
                <PlayCircle className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
                <span className="hidden min-[360px]:inline">Ver Vídeo</span>
              </Button>
            )}

            {/* Menu de 3 Pontinhos (Ações da Rotina) */}
            {onDeleteRoutine && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Mais opções da rotina"
                    disabled={isDeleting}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer text-xs font-semibold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Excluir Rotina</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <CardContent className="space-y-3.5 p-3 sm:p-4">
          {/* Title */}
          <div>
            <h2 className="break-words text-base font-bold tracking-tight text-foreground sm:text-lg">
              {metadata.titulo || article.titulo}
            </h2>
          </div>

          {/* Objective */}
          {metadata.objetivo && (
            <div className="flex items-start gap-2.5 rounded-lg bg-background/80 border border-border/50 p-3 text-xs leading-relaxed">
              <Target className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground block">Objetivo:</span>
                <p className="text-muted-foreground">{metadata.objetivo}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                <Tag className="h-3.5 w-3.5" />
                Tags:
              </span>
              {metadata.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[11px] font-normal text-foreground/90 bg-muted/80 hover:bg-muted"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Collapsible Details (Perguntas de Usuário, Sinônimos e Bunny ID) */}
          {(hasQuestions || hasSynonyms || hasVideo) && (
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen} className="pt-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 font-medium"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {isDetailsOpen ? "Ocultar Metadados Avançados" : "Ver Metadados Avançados (IA & Vídeo)"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isDetailsOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-border/40 bg-background/50 p-3.5 text-xs">
                  {/* Perguntas Frequentes do Usuário */}
                  {hasQuestions && (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-primary" />
                        Perguntas que ativam esta rotina:
                      </span>
                      <ul className="space-y-1 text-muted-foreground pl-1">
                        {metadata.perguntas_usuario?.map((pergunta, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary font-bold">•</span>
                            <span>"{pergunta}"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sinônimos e Termos de Busca */}
                  {hasSynonyms && (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        Sinônimos e termos de busca:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {metadata.sinonimos?.map((sinonimo, idx) => (
                          <span
                            key={idx}
                            className="bg-muted px-2 py-0.5 rounded text-[11px] text-muted-foreground border border-border/50"
                          >
                            {sinonimo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detalhes Técnicos do Bunny.net */}
                  {hasVideo && metadata.video && (
                    <div className="space-y-2.5 md:col-span-2 pt-3 border-t border-border/40 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Film className="h-3.5 w-3.5 text-rose-500" />
                          Metadados do Vídeo Tutorial (Bunny.net):
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          tem_video: {metadata.video.tem_video ? "true" : "false"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] font-mono">
                        {/* Título do Vídeo */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 rounded-md bg-muted/40 border border-border/40 p-2 flex flex-col gap-0.5">
                          <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-wider">
                            Título Oficial do Vídeo (video_title)
                          </span>
                          <span className="font-sans font-medium text-foreground text-xs">
                            {metadata.video.video_title || metadata.titulo || "Vídeo Tutorial"}
                          </span>
                        </div>

                        {/* Bunny Library ID */}
                        <div className="rounded-md bg-muted/40 border border-border/40 p-2 flex flex-col gap-0.5">
                          <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-wider">
                            Library ID (bunny_library_id)
                          </span>
                          <span className="text-foreground font-semibold">
                            {metadata.video.bunny_library_id || "467408"}
                          </span>
                        </div>

                        {/* Bunny Video ID (GUID) */}
                        <div className="rounded-md bg-muted/40 border border-border/40 p-2 flex flex-col gap-0.5 relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-wider">
                              Video GUID (bunny_video_id)
                            </span>
                            {metadata.video.bunny_video_id && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(metadata.video!.bunny_video_id!);
                                  toast.success("GUID do vídeo copiado!");
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                                title="Copiar GUID"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <span className="text-foreground truncate" title={metadata.video.bunny_video_id}>
                            {metadata.video.bunny_video_id || "N/A"}
                          </span>
                        </div>

                        {/* Timestamp de Início */}
                        <div className="rounded-md bg-muted/40 border border-border/40 p-2 flex flex-col gap-0.5">
                          <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            Timestamp / Início (video_timestamp)
                          </span>
                          <span className="text-foreground font-bold text-amber-600 dark:text-amber-400">
                            {metadata.video.video_timestamp || "00:00"}
                          </span>
                        </div>

                        {/* Início em Segundos */}
                        <div className="rounded-md bg-muted/40 border border-border/40 p-2 flex flex-col gap-0.5">
                          <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-wider">
                            Início em Segundos (video_start_seconds)
                          </span>
                          <span className="text-foreground font-bold text-amber-600 dark:text-amber-400">
                            {typeof metadata.video.video_start_seconds === "number"
                              ? `${metadata.video.video_start_seconds}s`
                              : metadata.video.video_timestamp
                                ? `${parseTimestampToSeconds(metadata.video.video_timestamp)}s`
                                : "0s"}
                          </span>
                        </div>

                        {/* URL do Embed */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-2 rounded-md bg-muted/40 border border-border/40 p-2 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Link2 className="h-3 w-3 text-primary" />
                              URL do Player / Embed (video_url)
                            </span>
                            {metadata.video.video_url && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(metadata.video!.video_url!);
                                    toast.success("URL do vídeo copiada!");
                                  }}
                                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                                  title="Copiar URL"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <a
                                  href={metadata.video.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
                                  title="Abrir no navegador"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                          <span className="text-foreground truncate text-[10px] select-all" title={metadata.video.video_url}>
                            {metadata.video.video_url || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Modal de Exibição de Vídeo */}
      {hasVideo && metadata.video && (
        <BunnyVideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          video={metadata.video}
          articleTitle={metadata.titulo || article.titulo}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Rotina */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-destructive">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Excluir Rotina {article.id}?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-2 space-y-2">
              <p>
                Tem certeza de que deseja remover permanentemente a rotina{" "}
                <strong className="text-foreground">"{metadata.titulo || article.titulo}"</strong> ({article.id}) da Base de Conhecimento Orion TN?
              </p>
              <p className="text-[11px] text-muted-foreground/90 bg-muted/50 p-2.5 rounded-md border border-border/50">
                ⚠️ Essa ação removerá o ID, metadados YAML e todo o passo a passo do arquivo mestre. Uma cópia de segurança será salva no histórico e a OpenAI Vector Store será atualizada com Zero Downtime.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs gap-1.5 shadow-md"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Sim, Excluir Rotina
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
