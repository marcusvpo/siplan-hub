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
} from "lucide-react";
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
      <Card className="border-border/60 bg-muted/20 shadow-sm overflow-hidden mb-6">
        {/* Top Bar with ID, Status, Video Button and 3-dots Menu */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Badge
              variant="default"
              className="font-mono text-xs font-black tracking-wide bg-primary text-primary-foreground shadow-xs"
            >
              {article.id}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
              {article.sectionName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>YAML Protegido</span>
            </div>

            {hasVideo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVideoModalOpen(true)}
                className="h-7 text-xs gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 font-semibold"
              >
                <PlayCircle className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
                <span>Ver Vídeo</span>
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

        <CardContent className="p-4 space-y-3.5">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
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
                    <div className="space-y-1 md:col-span-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          <strong className="text-foreground">Bunny Library:</strong>{" "}
                          {metadata.video.bunny_library_id || "N/A"}
                        </span>
                        <span>
                          <strong className="text-foreground">Video GUID:</strong>{" "}
                          {metadata.video.bunny_video_id || "N/A"}
                        </span>
                        <span>
                          <strong className="text-foreground">Duração:</strong>{" "}
                          {metadata.video.video_timestamp || "00:00"}
                        </span>
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
