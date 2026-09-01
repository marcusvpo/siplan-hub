import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  ChevronRight,
  Eye,
  FolderTree,
  Inbox,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ThumbsUp,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import {
  filterSdSolutions,
  groupSdSolutionsByFamily,
  isSdSolutionReviewOverdue,
  SD_SOLUTION_STATUS,
  sdSolutionExcerpt,
  sortSdSolutions,
  splitSdHighlightedText,
  type SdSolutionSort,
} from "@/lib/sd-solutions";
import {
  listSdFamilies,
  listSdRoutines,
  listSdSolutions,
  listSdSystems,
} from "@/services/sd-solutions";
import type { SdFamilia, SdRotina, SdSistema, SdSolucao } from "@/types/sd";

interface SolutionsSearchProps {
  refreshKey: number;
  onOpen: (solution: SdSolucao) => void;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

interface SolutionCardProps {
  solution: SdSolucao;
  search: string;
  onOpen: (solution: SdSolucao) => void;
}

function HighlightedText({ value, search }: { value: string; search: string }) {
  return (
    <>
      {splitSdHighlightedText(value, search).map((part, index) =>
        part.match ? (
          <mark key={`${part.text}-${index}`} className="rounded bg-primary/15 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : part.text,
      )}
    </>
  );
}

function SolutionCard({ solution, search, onOpen }: SolutionCardProps) {
  const descriptionExcerpt = sdSolutionExcerpt(solution.descricao, search);
  const overdue = isSdSolutionReviewOverdue(solution);
  const statusConfig = SD_SOLUTION_STATUS[solution.status];

  return (
    <Card
      className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(solution)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(solution);
      }}
    >
      <CardContent className="flex h-full min-w-0 gap-3 p-3 sm:gap-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpenText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
              <HighlightedText value={solution.titulo} search={search} />
            </h3>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {solution.sistema && <Badge>{solution.sistema.nome}</Badge>}
            {solution.rotina && <Badge variant="outline">{solution.rotina.nome}</Badge>}
            {(solution.status !== "publicado" || overdue) && (
              <Badge variant="outline" className={overdue ? SD_SOLUTION_STATUS.desatualizado.className : statusConfig.className}>
                {overdue ? "Revisão vencida" : statusConfig.label}
              </Badge>
            )}
          </div>
          {descriptionExcerpt && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              <HighlightedText value={descriptionExcerpt} search={search} />
            </p>
          )}
          <div className="mt-4 flex flex-col items-start gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {solution.palavras_chave.slice(0, 3).map((keyword) => (
                <span key={keyword} className="rounded bg-muted px-2 py-0.5">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{solution.visualizacoes}</span>
              <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{solution.votos_uteis}</span>
              <span>{formatDate(solution.atualizado_em || solution.criado_em)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SolutionsSearch({ refreshKey, onOpen }: SolutionsSearchProps) {
  const [families, setFamilies] = useState<SdFamilia[]>([]);
  const [systems, setSystems] = useState<SdSistema[]>([]);
  const [routines, setRoutines] = useState<SdRotina[]>([]);
  const [solutions, setSolutions] = useState<SdSolucao[]>([]);
  const [systemId, setSystemId] = useState("");
  const [routineId, setRoutineId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SdSolutionSort>("relevancia");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    Promise.all([listSdFamilies(), listSdSystems()])
      .then(([familyItems, systemItems]) => {
        setFamilies(familyItems);
        setSystems(systemItems);
      })
      .catch(() => setError("Não foi possível carregar as famílias e os filtros."));
  }, [refreshKey]);

  useEffect(() => {
    if (!systemId) {
      setRoutines([]);
      setRoutineId("");
      return;
    }

    listSdRoutines(systemId)
      .then((items) => {
        setRoutines(items);
        setRoutineId((current) =>
          items.some((routine) => routine.id === current) ? current : "",
        );
      })
      .catch(() => setError("Não foi possível carregar as rotinas."));
  }, [systemId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    listSdSolutions({ systemId, routineId })
      .then((items) => {
        if (active) setSolutions(items);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as soluções.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [systemId, routineId, refreshKey]);

  const filteredSolutions = useMemo(
    () => filterSdSolutions(solutions, debouncedSearch).filter((solution) =>
      statusFilter === "all" || solution.status === statusFilter,
    ),
    [solutions, debouncedSearch, statusFilter],
  );
  const sortedSolutions = useMemo(
    () => sortSdSolutions(filteredSolutions, sort, debouncedSearch),
    [filteredSolutions, sort, debouncedSearch],
  );
  const hasActiveSearch = Boolean(
    systemId || routineId || debouncedSearch.trim() || statusFilter !== "all",
  );
  const allFamilyGroups = useMemo(
    () => groupSdSolutionsByFamily(families, systems, solutions),
    [families, systems, solutions],
  );
  const familyGroups = useMemo(
    () => groupSdSolutionsByFamily(families, systems, sortedSolutions, hasActiveSearch),
    [families, systems, sortedSolutions, hasActiveSearch],
  );
  const selectedFamily = allFamilyGroups.find((family) => family.id === selectedFamilyId);
  const selectedSystemIds = new Set(selectedFamily?.systems.map((system) => system.id) || []);
  const visibleSolutions = sortedSolutions.filter((solution) =>
    selectedSystemIds.has(solution.sistema_id),
  );
  const hasFilters = Boolean(
    systemId || routineId || search.trim() || selectedFamilyId || statusFilter !== "all",
  );

  useEffect(() => {
    if (
      selectedFamilyId &&
      !loading &&
      !allFamilyGroups.some((family) => family.id === selectedFamilyId)
    ) {
      setSelectedFamilyId("");
    }
  }, [allFamilyGroups, loading, selectedFamilyId]);

  const clearFilters = () => {
    setSystemId("");
    setRoutineId("");
    setSearch("");
    setSelectedFamilyId("");
    setStatusFilter("all");
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por título, descrição, sistema, rotina, anexo ou palavra-chave..."
          className="h-10 pl-10 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setShowFilters((current) => !current)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {hasFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
        </Button>
        {systemId && (
          <Badge variant="secondary">
            {systems.find((system) => system.id === systemId)?.nome}
          </Badge>
        )}
        {routineId && (
          <Badge variant="outline">
            {routines.find((routine) => routine.id === routineId)?.nome}
          </Badge>
        )}
        {selectedFamily && <Badge variant="outline">Família: {selectedFamily.nome}</Badge>}
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={clearFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
        <div className="w-full sm:ml-auto sm:w-auto sm:min-w-44">
          <Select value={sort} onValueChange={(value) => setSort(value as SdSolutionSort)}>
            <SelectTrigger className="h-9" aria-label="Ordenar soluções">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevancia">Mais relevantes</SelectItem>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="acessadas">Mais acessadas</SelectItem>
              <SelectItem value="uteis">Mais úteis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
            <Select
              value={systemId || "all"}
              onValueChange={(value) => setSystemId(value === "all" ? "" : value)}
            >
              <SelectTrigger aria-label="Filtrar por sistema">
                <SelectValue placeholder="Todos os sistemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os sistemas</SelectItem>
                {systems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filtrar por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="publicado">Publicados</SelectItem>
                <SelectItem value="rascunho">Rascunhos</SelectItem>
                <SelectItem value="desatualizado">Desatualizados</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={routineId || "all"}
              onValueChange={(value) => setRoutineId(value === "all" ? "" : value)}
              disabled={!systemId}
            >
              <SelectTrigger aria-label="Filtrar por rotina">
                <SelectValue placeholder="Todas as rotinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as rotinas</SelectItem>
                {routines.map((routine) => (
                  <SelectItem key={routine.id} value={routine.id}>
                    {routine.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !selectedFamilyId && familyGroups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Nenhuma família encontrada</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ajuste os filtros ou organize os sistemas na aba Famílias.
            </p>
          </CardContent>
        </Card>
      ) : !selectedFamilyId ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {familyGroups.length}{" "}
            {familyGroups.length === 1 ? "família encontrada" : "famílias encontradas"}
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {familyGroups.map((family) => (
              <Card
                key={family.id}
                className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedFamilyId(family.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedFamilyId(family.id);
                }}
              >
                <CardContent className="flex h-full flex-col p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="break-words font-semibold group-hover:text-primary">{family.nome}</h3>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {family.descricao || "Família de sistemas do SD."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {family.systems.slice(0, 4).map((system) => (
                      <Badge key={system.id} variant="secondary">{system.nome}</Badge>
                    ))}
                    {family.systems.length > 4 && (
                      <Badge variant="outline">+{family.systems.length - 4}</Badge>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{family.systems.length} {family.systems.length === 1 ? "sistema" : "sistemas"}</span>
                    <span>{family.solutions.length} {family.solutions.length === 1 ? "solução" : "soluções"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                aria-label="Voltar para todas as famílias"
                onClick={() => setSelectedFamilyId("")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Família</p>
                <h2 className="break-words font-semibold">{selectedFamily?.nome}</h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {visibleSolutions.length} {visibleSolutions.length === 1 ? "solução encontrada" : "soluções encontradas"}
            </p>
          </div>

          {visibleSolutions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">Nenhuma solução encontrada nesta família</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Ajuste a busca ou os filtros para consultar outros procedimentos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleSolutions.map((solution) => (
                <SolutionCard
                  key={solution.id}
                  solution={solution}
                  search={debouncedSearch}
                  onOpen={onOpen}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
