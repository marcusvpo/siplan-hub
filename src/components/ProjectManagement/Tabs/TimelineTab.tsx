import { ProjectV2, ProjectTramite } from "@/types/ProjectV2";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  GitMerge,
  User,
  CalendarDays,
  MessageSquareText,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

// Sanitize HTML: strip dangerous tags but keep basic formatting
function sanitizeHtml(raw: string): string {
  // Remove script/style/iframe tags completely
  let clean = raw.replace(/<(script|style|iframe|object|embed|form|input)[^>]*>[\s\S]*?<\/\1>/gi, "");
  clean = clean.replace(/<(script|style|iframe|object|embed|form|input)[^>]*\/?>/gi, "");
  // Remove on* event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
  clean = clean.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  clean = clean.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  // Strip inline font/color styles that break the theme
  clean = clean.replace(/\s*style\s*=\s*"[^"]*"/gi, "");
  clean = clean.replace(/\s*style\s*=\s*'[^']*'/gi, "");
  // Remove <font> tags but keep content
  clean = clean.replace(/<\/?font[^>]*>/gi, "");
  return clean;
}

// Map etapa strings to color variants
function getEtapaBadgeStyle(etapa: string | null): string {
  if (!etapa) return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  const lower = etapa.toLowerCase();
  if (lower.includes("infraestrutura") || lower.includes("infra"))
    return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
  if (lower.includes("aderência") || lower.includes("aderencia"))
    return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
  if (lower.includes("ambiente") || lower.includes("environment"))
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (lower.includes("conversão") || lower.includes("conversao"))
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  if (lower.includes("implantação") || lower.includes("implantacao") || lower.includes("treinamento"))
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  if (lower.includes("pós") || lower.includes("pos") || lower.includes("encerr"))
    return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
  return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
}

function getTimelineDotColor(etapa: string | null): string {
  if (!etapa) return "bg-zinc-400";
  const lower = etapa.toLowerCase();
  if (lower.includes("infra")) return "bg-sky-500";
  if (lower.includes("aderência") || lower.includes("aderencia")) return "bg-violet-500";
  if (lower.includes("ambiente")) return "bg-emerald-500";
  if (lower.includes("conversão") || lower.includes("conversao")) return "bg-amber-500";
  if (lower.includes("implantação") || lower.includes("implantacao") || lower.includes("treinamento")) return "bg-rose-500";
  if (lower.includes("pós") || lower.includes("pos") || lower.includes("encerr")) return "bg-teal-500";
  return "bg-indigo-500";
}

function TramiteCard({
  tramite,
  isFirst,
}: {
  tramite: ProjectTramite;
  isFirst: boolean;
}) {
  const [expanded, setExpanded] = useState(isFirst);
  const sanitized = useMemo(
    () => sanitizeHtml(tramite.descricao_tramite),
    [tramite.descricao_tramite]
  );
  const date = new Date(tramite.data_tramite);
  const dotColor = getTimelineDotColor(tramite.etapa_projeto);
  const badgeStyle = getEtapaBadgeStyle(tramite.etapa_projeto);

  return (
    <div className="relative flex gap-4 group">
      {/* Timeline vertical line & dot */}
      <div className="flex flex-col items-center">
        <div
          className={`relative z-10 w-3.5 h-3.5 rounded-full ring-4 ring-background shadow-sm ${dotColor} 
            ${isFirst ? "ring-offset-2 ring-offset-background scale-125" : ""} 
            transition-transform group-hover:scale-125`}
        />
        <div className="w-px flex-1 bg-border/60 group-last:hidden" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8 -mt-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            {tramite.responsavel_atividade && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/90">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {tramite.responsavel_atividade}
              </span>
            )}
            {tramite.etapa_projeto && (
              <Badge
                variant="outline"
                className={`text-[11px] font-medium px-2 py-0.5 border ${badgeStyle}`}
              >
                <GitMerge className="w-3 h-3 mr-1 opacity-70" />
                {tramite.etapa_projeto}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <CalendarDays className="w-3.5 h-3.5" />
            <span title={format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>
              {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Tramite content card */}
        <Card
          className={`overflow-hidden border-border/50 bg-card/60 backdrop-blur-sm transition-all duration-200 
            ${expanded ? "shadow-md" : "shadow-sm hover:shadow-md cursor-pointer"}`}
          onClick={() => !expanded && setExpanded(true)}
        >
          <CardContent className="p-0">
            {/* Timestamp bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/30">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {format(date, "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* HTML content */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                expanded ? "max-h-[2000px] opacity-100" : "max-h-24 opacity-80 overflow-hidden"
              }`}
            >
              <div
                className="px-4 py-3 text-sm text-foreground/85 leading-relaxed 
                  prose prose-sm dark:prose-invert max-w-none
                  prose-p:my-1 prose-p:leading-relaxed
                  prose-headings:text-foreground prose-headings:font-semibold
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-a:text-primary prose-a:underline
                  prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                  prose-table:text-xs prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1
                  [&_div]:!text-inherit [&_span]:!text-inherit [&_font]:!text-inherit [&_p]:!text-inherit
                  [&_td]:border [&_td]:border-border/30 [&_th]:border [&_th]:border-border/30
                  [&_table]:border-collapse [&_table]:w-full [&_table]:text-xs
                  [&_br]:leading-tight"
                dangerouslySetInnerHTML={{ __html: sanitized }}
              />
              {!expanded && (
                <div className="h-12 bg-gradient-to-t from-card/90 to-transparent absolute bottom-0 left-0 right-0 pointer-events-none" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



export function TimelineTab({ project }: TabProps) {
  const tramites = project.tramites;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTramites = useMemo(() => {
    const list = tramites || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.descricao_tramite.toLowerCase().includes(q) ||
        t.responsavel_atividade?.toLowerCase().includes(q) ||
        t.etapa_projeto?.toLowerCase().includes(q)
    );
  }, [tramites, searchQuery]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    []
  );

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15">
            <MessageSquareText className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground/90">
              Histórico de Trâmites
            </h3>
            <p className="text-xs text-muted-foreground">
              {tramites
                ? `${tramites.length} registro${tramites.length !== 1 ? "s" : ""} do 0800`
                : "Carregando..."}
            </p>
          </div>
        </div>

        {/* Search */}
        {tramites && tramites.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar trâmites..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border/60 bg-background/80 
                focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 
                placeholder:text-muted-foreground/50 transition-all"
            />
          </div>
        )}
      </div>

      <Separator className="mb-6" />

      {/* Empty state */}
      {filteredTramites.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-muted/30 border border-dashed border-border/60">
          <div className="p-3 rounded-full bg-muted/50 mb-4">
            <MessageSquareText className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-medium text-foreground/80 mb-1">
            {searchQuery
              ? "Nenhum resultado encontrado"
              : "Nenhum trâmite registrado"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery
              ? "Tente uma busca diferente."
              : "Quando a automação do 0800 atualizar este chamado, os trâmites aparecerão aqui como uma timeline."}
          </p>
        </div>
      )}

      {/* Timeline */}
      {filteredTramites.length > 0 && (
        <ScrollArea className="pr-2">
          <div className="relative">
            {filteredTramites.map((tramite, index) => (
              <TramiteCard
                key={tramite.id}
                tramite={tramite}
                isFirst={index === 0}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
