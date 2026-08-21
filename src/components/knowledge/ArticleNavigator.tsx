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
}: ArticleNavigatorProps) {
  const videoCount = useMemo(() => {
    return articles.filter((a) => a.metadata.video?.tem_video).length;
  }, [articles]);

  return (
    <div className="flex flex-col h-full border-r border-border/60 bg-card/40 backdrop-blur-xs">
      {/* Header com busca e filtros */}
      <div className="p-3.5 border-b border-border/50 space-y-2.5">
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
          </div>
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por ID (R-1.0), título, tag ou dúvida..."
            className="pl-8.5 pr-8 h-9 text-xs bg-background/80"
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
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
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
                className="h-6 px-2 text-[11px] shrink-0"
                onClick={() => onTagChange(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Artigos */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredArticles.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum tutorial encontrado com os filtros atuais.
            </div>
          ) : (
            filteredArticles.map((article) => {
              const isSelected = article.id === selectedArticleId;
              const hasVideo = article.metadata.video?.tem_video;

              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => onSelectArticle(article.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs transition-all border group relative",
                    isSelected
                      ? "bg-primary/10 border-primary/40 text-foreground shadow-xs font-medium"
                      : "bg-background/40 hover:bg-muted/60 border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "font-mono text-[10px] px-1.5 py-0 h-4 font-bold",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {article.id}
                      </Badge>
                      {isSelected && isDirty && (
                        <span
                          className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"
                          title="Alterações não salvas neste artigo"
                        />
                      )}
                    </div>

                    {hasVideo && (
                      <span
                        className="flex items-center gap-1 text-[10px] text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded-sm"
                        title="Possui vídeo tutorial Bunny.net"
                      >
                        <Video className="h-3 w-3" />
                        Vídeo
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground/90 group-hover:text-foreground">
                    {article.metadata.titulo || article.titulo}
                  </p>

                  {article.metadata.tags && article.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {article.metadata.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1 py-0 rounded bg-muted/70 text-muted-foreground font-normal"
                        >
                          {t}
                        </span>
                      ))}
                      {article.metadata.tags.length > 2 && (
                        <span className="text-[10px] text-muted-foreground/70">
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
