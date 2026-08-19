import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  ChevronRight,
  Inbox,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
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
import { filterSdSolutions, stripHtml } from "@/lib/sd-solutions";
import {
  listSdRoutines,
  listSdSolutions,
  listSdSystems,
} from "@/services/sd-solutions";
import type { SdRotina, SdSistema, SdSolucao } from "@/types/sd";

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

export function SolutionsSearch({ refreshKey, onOpen }: SolutionsSearchProps) {
  const [systems, setSystems] = useState<SdSistema[]>([]);
  const [routines, setRoutines] = useState<SdRotina[]>([]);
  const [solutions, setSolutions] = useState<SdSolucao[]>([]);
  const [systemId, setSystemId] = useState("");
  const [routineId, setRoutineId] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    listSdSystems()
      .then(setSystems)
      .catch(() => setError("Não foi possível carregar os filtros."));
  }, []);

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
    () => filterSdSolutions(solutions, debouncedSearch),
    [solutions, debouncedSearch],
  );

  const hasFilters = Boolean(systemId || routineId || search.trim());

  const clearFilters = () => {
    setSystemId("");
    setRoutineId("");
    setSearch("");
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por título, descrição, sistema, rotina ou palavra-chave..."
          className="h-12 pl-11 text-base"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={clearFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
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
      ) : filteredSolutions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Nenhuma solução encontrada</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ajuste os filtros ou cadastre uma nova solução para a equipe.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {filteredSolutions.length}{" "}
            {filteredSolutions.length === 1 ? "solução encontrada" : "soluções encontradas"}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredSolutions.map((solution) => {
              const plainDescription = stripHtml(solution.descricao);
              return (
                <Card
                  key={solution.id}
                  className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(solution)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onOpen(solution);
                  }}
                >
                  <CardContent className="flex h-full gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpenText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                          {solution.titulo}
                        </h3>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {solution.sistema && <Badge>{solution.sistema.nome}</Badge>}
                        {solution.rotina && <Badge variant="outline">{solution.rotina.nome}</Badge>}
                      </div>
                      {plainDescription && (
                        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {plainDescription}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap gap-1.5">
                          {solution.palavras_chave.slice(0, 3).map((keyword) => (
                            <span key={keyword} className="rounded bg-muted px-2 py-0.5">
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <span>{formatDate(solution.atualizado_em || solution.criado_em)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
