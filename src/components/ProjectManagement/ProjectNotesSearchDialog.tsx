import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowUpRight,
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectsNotesSearch } from "@/hooks/useProjectsNotesSearch";
import {
  NOTE_SECTION_OPTIONS,
  NoteSectionKey,
  ProjectNotesSearchResult,
  ProjectStatusFilter,
  TextFieldMatch,
  searchIndexedProjectNotes,
} from "@/lib/project-notes-search";

export interface NotesSearchSelection {
  projectId: string;
  targetTab: "general" | "steps";
  targetStepId?: string;
}

interface ProjectNotesSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject: (selection: NotesSearchSelection) => void;
}

const SECTION_BADGE_STYLES: Record<NoteSectionKey, string> = {
  general:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200",
  infra:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
  adherence:
    "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200",
  conversion:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  environment:
    "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200",
  modelosEditor:
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
  implementation:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  post:
    "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200",
};

const QUICK_EXAMPLES = [
  "ano que vem",
  "aguardando",
  "pendência",
  "servidor",
];

function getProjectStatusBadge(
  globalStatus: string,
  postStatus: string,
): { label: string; className: string } {
  if (postStatus === "in-progress") {
    return {
      label: "Pós-Implantação",
      className:
        "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200",
    };
  }
  if (globalStatus === "blocked") {
    return {
      label: "Pausado",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
    };
  }
  if (globalStatus === "done" || globalStatus === "archived") {
    return {
      label: "Finalizado",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    };
  }
  return {
    label: "Em Andamento",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
  };
}

export function ProjectNotesSearchDialog({
  open,
  onOpenChange,
  onSelectProject,
}: ProjectNotesSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<NoteSectionKey | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const deferredQuery = useDeferredValue(query);

  const {
    indexedProjects,
    totalProjectsIndexed,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProjectsNotesSearch(open);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const trimmedQuery = deferredQuery.trim();

  const results = useMemo<ProjectNotesSearchResult[]>(() => {
    if (!trimmedQuery) return [];
    return searchIndexedProjectNotes(indexedProjects, trimmedQuery, {
      sectionFilter,
      statusFilter,
    });
  }, [indexedProjects, trimmedQuery, sectionFilter, statusFilter]);

  const totalFieldMatches = useMemo(
    () => results.reduce((sum, item) => sum + item.matches.length, 0),
    [results],
  );

  const handleOpenMatch = (
    projectId: string,
    match?: Pick<TextFieldMatch, "targetTab" | "targetStepId">,
  ) => {
    onOpenChange(false);
    onSelectProject({
      projectId,
      targetTab: match?.targetTab || "general",
      targetStepId: match?.targetStepId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="project-notes-search-dialog"
        className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:h-[85vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3.5 pr-10 text-left sm:px-6 sm:py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
            <FileSearch className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">Pesquisar em Observações e Textos</span>
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Consulta instantânea em todos os campos de anotações e observações
            livres dos projetos (não inclui status, responsáveis ou datas).
          </DialogDescription>
        </DialogHeader>

        {/* Search & Filters Bar */}
        <div className="shrink-0 space-y-2.5 border-b bg-muted/20 px-4 py-3 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Digite qualquer termo ou frase... Ex: "ano que vem", "aguardando servidor"'
              aria-label="Pesquisar nas observações dos projetos"
              className="h-10 bg-background pl-9 pr-9 text-sm"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Limpar pesquisa"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select
              value={sectionFilter}
              onValueChange={(v) => setSectionFilter(v as NoteSectionKey | "all")}
            >
              <SelectTrigger
                aria-label="Filtrar por seção"
                className="h-9 w-full bg-background text-xs sm:w-[210px]"
              >
                <SelectValue placeholder="Todas as seções" />
              </SelectTrigger>
              <SelectContent>
                {NOTE_SECTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ProjectStatusFilter)}
            >
              <SelectTrigger
                aria-label="Filtrar por status do projeto"
                className="h-9 w-full bg-background text-xs sm:w-[180px]"
              >
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos os status
                </SelectItem>
                <SelectItem value="active" className="text-xs">
                  Em Andamento
                </SelectItem>
                <SelectItem value="post" className="text-xs">
                  Pós-Implantação
                </SelectItem>
                <SelectItem value="paused" className="text-xs">
                  Pausados
                </SelectItem>
                <SelectItem value="done" className="text-xs">
                  Finalizados
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between gap-2 sm:ml-auto">
              {(sectionFilter !== "all" || statusFilter !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setSectionFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 px-2.5 text-xs"
                onClick={() => void refetch()}
                disabled={isFetching}
                title="Recarregar anotações do banco"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
                />
                <span>Atualizar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Results Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                Carregando anotações dos projetos...
              </p>
              <p className="text-xs text-muted-foreground">
                Preparando índice de textos livres para consulta instantânea.
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Não foi possível carregar as anotações dos projetos
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique sua conexão e tente novamente.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : !trimmedQuery ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <StickyNote className="h-6 w-6" />
              </div>
              <div className="max-w-md space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  Digite para pesquisar em {totalProjectsIndexed} projetos
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  A pesquisa analisa Observações Gerais, notas de Infraestrutura,
                  Aderência, Conversão, Ambiente, Modelos Editor, Implantação
                  (Fases 1 e 2) e Pós-Implantação.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  Exemplos:
                </span>
                {QUICK_EXAMPLES.map((example) => (
                  <Button
                    key={example}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full px-2.5 text-xs"
                    onClick={() => {
                      setQuery(example);
                      inputRef.current?.focus();
                    }}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <Search className="h-8 w-8 text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Nenhuma anotação encontrada para &ldquo;{trimmedQuery}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground">
                  Tente termos mais curtos ou remova filtros de seção/status.
                </p>
              </div>
              {(sectionFilter !== "all" || statusFilter !== "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSectionFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Mostrar todas as seções e status
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <strong className="font-semibold text-foreground">
                    {results.length}
                  </strong>{" "}
                  projeto{results.length !== 1 ? "s" : ""} encontrado
                  {results.length !== 1 ? "s" : ""} ·{" "}
                  <strong className="font-semibold text-foreground">
                    {totalFieldMatches}
                  </strong>{" "}
                  seç{totalFieldMatches !== 1 ? "ões" : "ão"} com correspondência
                </span>
                <span className="text-[11px]">
                  Clique em um trecho para abrir direto na etapa
                </span>
              </div>

              {/* Project Result Cards */}
              <div className="space-y-3">
                {results.map((project) => {
                  const statusBadge = getProjectStatusBadge(
                    project.globalStatus,
                    project.postStatus,
                  );

                  return (
                    <div
                      key={project.projectId}
                      className="rounded-lg border bg-card p-3 shadow-sm transition-colors sm:p-4"
                    >
                      {/* Project Header */}
                      <div className="flex flex-col gap-2 border-b pb-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="break-words text-sm font-bold text-foreground">
                              {project.clientName}
                            </h3>
                            {project.ticketNumber && (
                              <Badge
                                variant="outline"
                                className="border-primary/25 bg-primary/5 px-1.5 py-0 text-[10px] font-semibold text-primary"
                              >
                                #{project.ticketNumber}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {project.systemType && (
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {project.systemType}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-1.5 py-0 text-[10px] font-medium",
                                statusBadge.className,
                              )}
                            >
                              {statusBadge.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {project.matches.length} campo
                              {project.matches.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-full shrink-0 gap-1.5 text-xs sm:w-auto"
                          onClick={() =>
                            handleOpenMatch(project.projectId, project.matches[0])
                          }
                        >
                          <span>Abrir projeto</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Matched Fields & Previews */}
                      <div className="mt-2.5 space-y-2">
                        {project.matches.map((match) => (
                          <button
                            key={match.fieldKey}
                            type="button"
                            onClick={() =>
                              handleOpenMatch(project.projectId, match)
                            }
                            className="group block w-full rounded-md border border-border/70 bg-muted/25 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-semibold",
                                    SECTION_BADGE_STYLES[match.sectionKey],
                                  )}
                                >
                                  {match.sectionLabel}
                                </Badge>
                                {match.fieldLabel !== match.sectionLabel && (
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    · {match.fieldLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {match.matchCount > 1 && (
                                  <span>{match.matchCount} ocorrências</span>
                                )}
                                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                              </div>
                            </div>

                            <p className="whitespace-pre-line break-words text-xs leading-relaxed text-foreground/90">
                              {match.hasLeadingEllipsis && (
                                <span className="text-muted-foreground">...</span>
                              )}
                              {match.snippetSegments.map((segment, idx) =>
                                segment.highlight ? (
                                  <mark
                                    key={idx}
                                    className="rounded-sm bg-amber-200/90 px-0.5 font-semibold text-slate-950 dark:bg-amber-500/35 dark:text-amber-100"
                                  >
                                    {segment.text}
                                  </mark>
                                ) : (
                                  <span key={idx}>{segment.text}</span>
                                ),
                              )}
                              {match.hasTrailingEllipsis && (
                                <span className="text-muted-foreground">...</span>
                              )}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
