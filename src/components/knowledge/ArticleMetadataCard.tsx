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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BunnyVideoModal } from "./BunnyVideoModal";
import type { KnowledgeArticle } from "@/types/knowledge";

interface ArticleMetadataCardProps {
  article: KnowledgeArticle;
}

export function ArticleMetadataCard({ article }: ArticleMetadataCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const { metadata } = article;
  const hasVideo = metadata.video && metadata.video.tem_video;
  const hasQuestions = metadata.perguntas_usuario && metadata.perguntas_usuario.length > 0;
  const hasSynonyms = metadata.sinonimos && metadata.sinonimos.length > 0;

  return (
    <Card className="border-border/60 bg-muted/20 shadow-sm overflow-hidden mb-6">
      {/* Top Bar with ID and Status */}
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
                className="text-[11px] font-medium bg-secondary/70 hover:bg-secondary text-secondary-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Collapsible Section for Synonyms & Questions */}
        {(hasQuestions || hasSynonyms || hasVideo) && (
          <Collapsible
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
            className="border-t border-border/40 pt-2"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Perguntas Frequentes, Sinônimos & Mídia ({metadata.perguntas_usuario?.length || 0} perguntas)
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isDetailsOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-3 space-y-3">
              {/* User Questions */}
              {hasQuestions && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                    Como o usuário pergunta à IA:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.perguntas_usuario.map((pergunta, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-xs bg-background border border-border/70 rounded-md px-2.5 py-1 text-muted-foreground"
                      >
                        "{pergunta}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Synonyms */}
              {hasSynonyms && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Sinônimos & Termos de Busca:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.sinonimos.map((sinonimo, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[11px] font-normal border-dashed text-muted-foreground"
                      >
                        {sinonimo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Info Preview */}
              {hasVideo && metadata.video && (
                <div className="flex items-center justify-between rounded-md border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="truncate font-medium text-foreground">
                      {metadata.video.video_title || "Vídeo Tutorial Bunny.net"}
                    </span>
                    {metadata.video.video_timestamp && (
                      <span className="text-muted-foreground text-[11px]">
                        ({metadata.video.video_timestamp})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVideoModalOpen(true)}
                    className="h-6 gap-1 text-[11px] text-rose-600 dark:text-rose-400"
                  >
                    <span>Abrir Player</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>

      {/* Modal do Player de Vídeo */}
      <BunnyVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        video={metadata.video}
        articleTitle={metadata.titulo}
        articleId={article.id}
      />
    </Card>
  );
}
