import React, { useMemo } from "react";
import {
  Search,
  BookOpen,
  Video,
  FileText,
  Filter,
  Layers,
  Sparkles,
  X,
  PlusCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { KnowledgeArticle, KnowledgeSection } from "@/types/knowledge";

interface ArticleNavigatorProps {
  articles: KnowledgeArticle[];
  filteredArticles: KnowledgeArticle[];
  sections: KnowledgeSection[];
  selectedArticleId: string | null;
  onSelectArticle: (articleId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSectionIndex: number | "all";
  onSectionChange: (index: number | "all") => void;
  selectedTag: string | "all";
  onTagChange: (tag: string | "all") => void;
  allTags: string[];
  isDirty?: boolean;
  onOpenCreateModal?: () => void;
}

export function ArticleNavigator({
  articles,
  filteredArticles,
  sections,
  selectedArticleId,
  onSelectArticle,
  searchQuery,
  onSearchChange,
  selectedSectionIndex,
  onSectionChange,
  selectedTag,
  onTagChange,
  allTags,
  isDirty,
  onOpenCreateModal,
}: ArticleNavigatorProps) {
  const videoCount = useMemo(() => {
    return articles.filter((a) => a.metadata.video?.tem_video).length;
  }, [articles]);

  return (
    <div className="flex flex-col h-full border-r border-border/60 bg-card/40 backdrop-blur-xs">
      {/* Header com busca e filtros */}
      <div className="space-y-2.5 border-b border-border/50 p-3.5 pr-12 md:pr-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-bold text-xs uppercase tracking-wider text-foreground">
              Índice de Tutoriais
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-[11px]">
              {filteredArticles.length}/{articles.length}
            </Badge>
            {onOpenCreateModal && (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={onOpenCreateModal}
                className="h-6 px-2 text-[11px] font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                title="Cadastrar nova rotina no Orion TN"
              >
                <PlusCircle className="h-3 w-3" />
                <span>Nova</span>
              </Button>
            )}
          </div>
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por ID (R-1.0), título, tag ou dúvida..."
            className="h-9 bg-background/80 pl-9 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtro por Seção Principal */}
        <Select
          value={String(selectedSectionIndex)}
          onValueChange={(val) =>
            onSectionChange(val === "all" ? "all" : parseInt(val, 10))
          }
        >
          <SelectTrigger className="h-8 text-xs bg-background/70">
            <SelectValue placeholder="Todas as Seções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Todas as Seções ({articles.length})
            </SelectItem>
            {sections.map((sec) => (
              <SelectItem
                key={sec.index}
                value={String(sec.index)}
                className="text-xs"
              >
                {sec.title} ({sec.articleIds.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Tag (se houver tags) */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pb-1 text-xs">
            <Button
              variant={selectedTag === "all" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-[11px] shrink-0"
              onClick={() => onTagChange("all")}
            >
              Todas
            </Button>
            {allTags.slice(0, 10).map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px] shrink-0 font-mono"
                onClick={() => onTagChange(tag)}
              >
                #{tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Artigos Scrollável */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p>Nenhum tutorial encontrado com os filtros atuais.</p>
              {onOpenCreateModal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenCreateModal}
                  className="mt-2 text-xs gap-1.5"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Criar Nova Rotina
                </Button>
              )}
            </div>
          ) : (
            filteredArticles.map((article) => {
              const isSelected = article.id === selectedArticleId;
              const hasVideo = Boolean(article.metadata.video?.tem_video);

              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => onSelectArticle(article.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg transition-all text-xs space-y-1 relative group border border-transparent",
                    isSelected
                      ? "bg-primary/10 border-primary/30 text-foreground font-semibold shadow-xs"
                      : "hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* Barra lateral destacada para o item selecionado */}
                  {isSelected && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary" />
                  )}

                  {/* ID e Badges */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={cn(
                        "font-mono font-bold text-[11px] px-1.5 py-0.5 rounded",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground group-hover:bg-muted/90",
                      )}
                    >
                      {article.id}
                    </span>

                    <div className="flex items-center gap-1">
                      {hasVideo && (
                        <span
                          className="text-primary hover:text-primary/80 flex items-center gap-0.5 text-[10px] font-medium"
                          title="Possui vídeo tutorial do Bunny.net"
                        >
                          <Video className="h-3 w-3" />
                        </span>
                      )}
                      {isSelected && isDirty && (
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Alterações não salvas" />
                      )}
                    </div>
                  </div>

                  {/* Título do Artigo */}
                  <p
                    className={cn(
                      "line-clamp-2 leading-snug",
                      isSelected ? "text-foreground font-semibold" : "text-foreground/90 font-normal"
                    )}
                  >
                    {article.metadata.titulo || article.titulo}
                  </p>

                  {/* Tags em Linha */}
                  {article.metadata.tags && article.metadata.tags.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden pt-0.5">
                      {article.metadata.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-muted-foreground font-mono truncate max-w-[110px]"
                        >
                          #{tag}
                        </span>
                      ))}
                      {article.metadata.tags.length > 2 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          +{article.metadata.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
