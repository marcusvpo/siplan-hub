import { useCommercial } from "@/hooks/useCommercial";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Filter,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  User,
  CalendarClock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function CommercialCustomers() {
  const { clients, projectsWithClients, isLoadingClients, allCommercialNotes } =
    useCommercial();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectsFilter, setProjectsFilter] = useState("all");
  const [lastActionFilter, setLastActionFilter] = useState("any");
  const navigate = useNavigate();

  // Helper to compute client health and stats
  const getClientStats = (clientId: string) => {
    const clientProjects =
      projectsWithClients?.filter((p) => p.client_id === clientId) || [];

    const hasCritical = clientProjects.some(
      (p) => p.health_score === "critical"
    );
    const hasWarning = clientProjects.some((p) => p.health_score === "warning");

    // Count blockers (assuming infra_status 'blocked' or derived from previous logic)
    // We can use a simpler heuristic if explicit blocker count isn't in project properties
    // In CommercialBlockers we look for p.infra_status === 'blocked' && p.infra_blocking_reason
    const blockersCount = clientProjects.filter(
      (p) => p.infra_status === "blocked"
    ).length;

    let status = "healthy";
    if (hasCritical) status = "critical";
    else if (hasWarning) status = "attention";

    // Last Action
    const clientNotes =
      allCommercialNotes?.filter((n) => n.client_id === clientId) || [];
    const lastNote = clientNotes.length > 0 ? clientNotes[0] : null; // Assuming sorted desc

    return {
      status,
      activeProjects: clientProjects.length,
      blockers: blockersCount,
      lastAction: lastNote ? new Date(lastNote.created_at!) : null,
      lastActionId: lastNote?.id,
    };
  };

  const filteredClients =
    clients?.filter((client) => {
      const stats = getClientStats(client.id);
      const matchesSearch = client.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Status Filter
      let matchesStatus = true;
      if (statusFilter !== "all") {
        matchesStatus = stats.status === statusFilter;
      }

      // Projects Filter
      let matchesProjects = true;
      if (projectsFilter === "critical") {
        matchesProjects = stats.status === "critical"; // Simplified
      } else if (projectsFilter === "no-projects") {
        matchesProjects = stats.activeProjects === 0;
      } else if (projectsFilter === "has-blockers") {
        matchesProjects = stats.blockers > 0;
      }

      // Last Action Filter
      let matchesLastAction = true;
      if (lastActionFilter !== "any") {
        if (!stats.lastAction) {
          matchesLastAction = lastActionFilter === "never";
        } else {
          const daysSince =
            (new Date().getTime() - stats.lastAction.getTime()) /
            (1000 * 3600 * 24);
          if (lastActionFilter === "7days") matchesLastAction = daysSince <= 7;
          if (lastActionFilter === "15days")
            matchesLastAction = daysSince <= 15;
          if (lastActionFilter === "30days")
            matchesLastAction = daysSince <= 30;
          if (lastActionFilter === "never") matchesLastAction = false; // Has action
        }
      }

      return (
        matchesSearch && matchesStatus && matchesProjects && matchesLastAction
      );
    }) || [];

  // Sort
  const sortedClients = [...filteredClients].sort((a, b) => {
    // Priority: Critical > Attention > Healthy
    const score = (status: string) =>
      status === "critical" ? 3 : status === "attention" ? 2 : 1;
    const statsA = getClientStats(a.id);
    const statsB = getClientStats(b.id);
    if (score(statsA.status) !== score(statsB.status)) {
      return score(statsB.status) - score(statsA.status);
    }
    // Then by last action (recent first)
    const timeA = statsA.lastAction?.getTime() || 0;
    const timeB = statsB.lastAction?.getTime() || 0;
    return timeB - timeA;
  });

  if (isLoadingClients) {
    return (
      <div className="p-8 flex items-center justify-center">
        Carregando painel de clientes...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Painel de Clientes
          </h1>
          <p className="text-muted-foreground">
            Visão geral e saúde da carteira de clientes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/20 rounded-lg border">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome..."
              className="pl-8 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Status Geral" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="critical">🔴 Críticos</SelectItem>
              <SelectItem value="attention">🟡 Em Atenção</SelectItem>
              <SelectItem value="healthy">🟢 Saudáveis</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectsFilter} onValueChange={setProjectsFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filtro de Projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Projetos</SelectItem>
              <SelectItem value="critical">Com Projetos Críticos</SelectItem>
              <SelectItem value="has-blockers">Com Bloqueios</SelectItem>
              <SelectItem value="no-projects">Sem Projetos Ativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={lastActionFilter} onValueChange={setLastActionFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Última Interação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer Data</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="15days">Últimos 15 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="never">Sem interação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border text-left">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Projetos Ativos</TableHead>
              <TableHead>Bloqueios</TableHead>
              <TableHead>Última Ação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhum cliente encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => {
                const stats = getClientStats(client.id);
                return (
                  <TableRow
                    key={client.id}
                    className="group hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <Link
                        to={`/commercial/client/${client.id}`}
                        className="font-semibold hover:underline text-lg flex items-center gap-2"
                      >
                        {client.name}
                        {client.tags && client.tags.includes("Key Account") && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-1 bg-yellow-100 text-yellow-800 border-yellow-200"
                          >
                            KA
                          </Badge>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`
                          ${
                            stats.status === "critical"
                              ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                              : ""
                          }
                          ${
                            stats.status === "attention"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                              : ""
                          }
                          ${
                            stats.status === "healthy"
                              ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
                              : ""
                          }
                        `}
                      >
                        {stats.status === "critical" && (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {stats.status === "attention" && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {stats.status === "healthy" && (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        )}
                        {stats.status === "critical"
                          ? "Crítico"
                          : stats.status === "attention"
                          ? "Atenção"
                          : "Saudável"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {stats.activeProjects}
                        </span>
                        {stats.activeProjects > 0 && (
                          <span className="text-muted-foreground text-xs">
                            ativos
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {stats.blockers > 0 ? (
                        <Badge
                          variant="destructive"
                          className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        >
                          {stats.blockers} Bloqueio
                          {stats.blockers > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        {stats.lastAction ? (
                          <>
                            <CalendarClock className="w-3 h-3 mr-1.5" />
                            {stats.lastAction.toLocaleDateString()}
                          </>
                        ) : (
                          <span className="text-xs italic">Sem registros</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/commercial/client/${client.id}`)
                            }
                          >
                            Ver Detalhes (360º)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(
                                `/commercial/client/${client.id}?tab=timeline`
                              )
                            }
                          >
                            Ver Timeline
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled>
                            Editar Cliente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredClients.map((client) => {
          const stats = getClientStats(client.id);
          return (
            <Card
              key={client.id}
              onClick={() => navigate(`/commercial/client/${client.id}`)}
              className="cursor-pointer active:scale-[0.98] transition-transform"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{client.name}</h3>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                      <span>{stats.activeProjects} Projetos</span>
                      <span>•</span>
                      {stats.lastAction ? (
                        <span>
                          Há{" "}
                          {Math.floor(
                            (new Date().getTime() -
                              stats.lastAction.getTime()) /
                              (1000 * 3600 * 24)
                          )}{" "}
                          dias
                        </span>
                      ) : (
                        <span>Sem nota</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`
                      ${
                        stats.status === "critical"
                          ? "bg-red-100 text-red-700"
                          : ""
                      }
                      ${
                        stats.status === "attention"
                          ? "bg-yellow-100 text-yellow-700"
                          : ""
                      }
                      ${
                        stats.status === "healthy"
                          ? "bg-green-100 text-green-700"
                          : ""
                      }
                    `}
                  >
                    {stats.status === "critical"
                      ? "Crítico"
                      : stats.status === "attention"
                      ? "Atenção"
                      : "OL"}
                  </Badge>
                </div>
                {stats.blockers > 0 && (
                  <div className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded inline-block">
                    🚨 {stats.blockers} Bloqueios Abertos
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
