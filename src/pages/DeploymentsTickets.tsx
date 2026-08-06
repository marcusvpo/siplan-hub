import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useChamadosSearch,
  useSolicitarSyncProcessoVenda,
  Chamado0800,
} from "@/hooks/useChamados0800";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Chamado0800DetailDialog, fmtDateBr, statusBadgeClass } from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { 
  ClipboardList, Search, CalendarDays, Filter, X, ChevronLeft, ChevronRight, ChevronsUpDown, Check, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/utils/normalize-search";
import {
  getDefaultChamadosDateRange,
  needsHistoricalChamadosSync,
} from "@/lib/chamados-date-range";
import { toast } from "sonner";

const PRODUTOS = [
  { value: "todos", label: "Todos os produtos" },
  { value: "Orion TN", label: "Orion TN" },
  { value: "Orion PRO", label: "Orion PRO" },
  { value: "Orion REG", label: "Orion REG" },
  { value: "WEB RI", label: "WEB RI" }
];

export default function DeploymentsTickets() {
  const defaultDateRange = useMemo(() => getDefaultChamadosDateRange(), []);

  // Filtros
  const [dataInicio, setDataInicio] = useState<string>(defaultDateRange.startDate);
  const [dataFim, setDataFim] = useState<string>(defaultDateRange.endDate);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [produto, setProduto] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");
  
  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modais e Diálogos
  const [selectedChamado, setSelectedChamado] = useState<Chamado0800 | null>(null);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const lastRequestedRange = useRef<string>("");
  const { solicitarSync: solicitarSyncPeriodo, syncing: syncingPeriodo } =
    useSolicitarSyncProcessoVenda();

  useEffect(() => {
    if (!needsHistoricalChamadosSync(dataInicio, dataFim, defaultDateRange)) return;

    const rangeKey = `${dataInicio}:${dataFim}`;
    if (lastRequestedRange.current === rangeKey) return;

    const timer = window.setTimeout(() => {
      lastRequestedRange.current = rangeKey;
      void solicitarSyncPeriodo(dataInicio, dataFim).catch((error) => {
        lastRequestedRange.current = "";
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar o periodo selecionado."
        );
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [dataInicio, dataFim, defaultDateRange, solicitarSyncPeriodo]);

  const { data: clients = [], isLoading: loadingClients } = useQuery<string[]>({
    queryKey: ["distinctProcessoVendaClients"],
    queryFn: async () => {
      // 1. Tenta a RPC para performance
      try {
        const { data, error } = await supabase.rpc("get_distinct_chamados_clientes");
        if (!error && data && Array.isArray(data) && data.length > 0) {
          return data
            .map((row) => row.nome_cliente)
            .filter((name): name is string => Boolean(name))
            .sort((a, b) => a.localeCompare(b, "pt-BR"));
        }
      } catch (e) {
        console.warn("RPC get_distinct_chamados_clientes falhou:", e);
      }

      // 2. Tenta obter diretamente da tabela chamados_processo_venda
      try {
        const { data, error } = await supabase
          .from("chamados_processo_venda")
          .select("nome_cliente");
        if (!error && data) {
          const names = data.map((row: { nome_cliente?: string | null }) => row.nome_cliente).filter(Boolean);
          if (names.length > 0) {
            return [...new Set(names)].sort();
          }
        }
      } catch (e) {
        console.warn("Consulta direta à tabela chamados_processo_venda falhou:", e);
      }

      // 3. Fallback final na tabela projects
      try {
        const { data: projs, error: projsErr } = await supabase
          .from("projects")
          .select("client_name")
          .eq("is_deleted", false);
        if (!projsErr && projs) {
          const names = projs.map((p: { client_name?: string | null }) => p.client_name).filter(Boolean);
          return [...new Set(names)].sort();
        }
      } catch (e) {
        console.error("Todos os fallbacks para obter lista de clientes falharam:", e);
      }

      return [];
    },
    staleTime: 5 * 60_000,
  });

  // Busca lista de status únicos
  const { data: statusList = [] } = useQuery<string[]>({
    queryKey: ["distinctStatuses"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("chamados_processo_venda")
          .select("status");
        if (!error && data) {
          const list = data.map((row: { status?: string | null }) => row.status).filter(Boolean);
          return [...new Set(list)].sort();
        }
      } catch (e) {
        console.warn("Falha ao consultar status únicos de chamados:", e);
      }
      return ["Não iniciado", "Em andamento", "Concluído"];
    },
    staleTime: 5 * 60_000,
  });

  // Query principal dos chamados usando o hook recém-criado
  const { chamados, totalCount, isLoading, error } = useChamadosSearch({
    startDate: dataInicio || null,
    endDate: dataFim || null,
    clientNames: selectedClients.length > 0 ? selectedClients : null,
    product: produto,
    searchTerm: busca || null,
    status: selectedStatus,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleClient = (clientName: string) => {
    setSelectedClients(prev => {
      const next = prev.includes(clientName)
        ? prev.filter(c => c !== clientName)
        : [...prev, clientName];
      setPage(1); // Reseta a página para a primeira ao mudar filtros
      return next;
    });
  };

  const clearAllFilters = () => {
    setDataInicio(defaultDateRange.startDate);
    setDataFim(defaultDateRange.endDate);
    setSelectedClients([]);
    setProduto("todos");
    setSelectedStatus("todos");
    setBusca("");
    setPage(1);
  };

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-muted pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <ClipboardList className="h-6 w-6 text-primary" style={{ color: "hsl(346, 84%, 45%)" }} />
            Consulta de Chamados (Ellevo/0800)
          </h1>
          <p className="text-sm text-muted-foreground">
            Pesquise e consulte o histórico de chamados sincronizados do Ellevo de forma global e consolidada.
          </p>
        </div>
        
        {/* Indicador de Status/Sync rápido */}
        <Badge variant="outline" className="px-3 py-1 font-normal text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {syncingPeriodo ? "Atualizando período selecionado..." : "Conexão Ellevo ativa (sync ~5 min)"}
        </Badge>
      </div>

      {/* Seção de Filtros Compacta */}
      <Card className="border border-muted/80 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          
          {/* Header do Filtro Inline com Limpeza de Filtros */}
          <div className="flex items-center justify-between border-b border-muted/40 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5 text-primary" style={{ color: "hsl(346, 84%, 45%)" }} />
              Filtros
            </div>
            {(dataInicio !== defaultDateRange.startDate || dataFim !== defaultDateRange.endDate || selectedClients.length > 0 || produto !== "todos" || selectedStatus !== "todos" || busca) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-primary h-6 px-2 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Grid de Filtros: Linha 1 com 5 colunas, Linha 2 com Clientes (Full Width) */}
          <div className="space-y-3">
            {/* Linha 1: Datas, Produto, Status, Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Data Início */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Abertura (Início)
                </label>
                <Input
                  type="date"
                  value={dataInicio}
                  max={dataFim || undefined}
                  onChange={(e) => handleFilterChange(setDataInicio, e.target.value)}
                  className="w-full text-sm h-9"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Abertura (Fim)
                </label>
                <Input
                  type="date"
                  value={dataFim}
                  min={dataInicio || undefined}
                  onChange={(e) => handleFilterChange(setDataFim, e.target.value)}
                  className="w-full text-sm h-9"
                />
              </div>

              {/* Produto */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Produto / Software</label>
                <Select 
                  value={produto} 
                  onValueChange={(val) => handleFilterChange(setProduto, val)}
                >
                  <SelectTrigger className="w-full text-sm h-9">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUTOS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select 
                  value={selectedStatus} 
                  onValueChange={(val) => handleFilterChange(setSelectedStatus, val)}
                >
                  <SelectTrigger className="w-full text-sm h-9">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    {statusList.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca Rápida */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Busca Rápida
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Chamado, título, termo..."
                    value={busca}
                    onChange={(e) => handleFilterChange(setBusca, e.target.value)}
                    className="w-full text-sm pr-7 h-9"
                  />
                  {busca && (
                    <button
                      onClick={() => handleFilterChange(setBusca, "")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Período padrão: últimos 30 dias. Ao escolher uma data anterior, somente esse período é consultado na origem.
            </p>

            {/* Linha 2: Clientes / Serventias (Full Width) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Clientes / Serventias</label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal text-sm h-9"
                    disabled={loadingClients}
                  >
                    <span className="truncate">
                      {selectedClients.length === 1
                        ? selectedClients[0]
                        : selectedClients.length > 1
                        ? `${selectedClients.length} selecionados`
                        : "Selecionar Clientes..."}
                    </span>
                    <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command filter={(value, search) => {
                    const val = normalizeSearchText(value);
                    const searchVal = normalizeSearchText(search);
                    return val.includes(searchVal) ? 1 : 0;
                  }}>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList className="max-h-[250px] overflow-y-auto">
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client}
                            value={client.toLowerCase()}
                            onSelect={() => toggleClient(client)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className={cn(
                                "flex h-4 w-4 items-center justify-center rounded border border-primary/50 transition-colors",
                                selectedClients.includes(client) ? "bg-primary text-primary-foreground border-primary" : "opacity-50"
                              )}
                              style={selectedClients.includes(client) ? { backgroundColor: "hsl(346, 84%, 45%)", borderColor: "hsl(346, 84%, 45%)" } : {}}
                              >
                                {selectedClients.includes(client) && (
                                  <Check className="h-3 w-3" />
                                )}
                              </div>
                              <span className="truncate">{client}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Badges de Clientes Selecionados (Row debaixo compacta) */}
          {selectedClients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-muted/30">
              <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Selecionados:</span>
              {selectedClients.map((client) => (
                <Badge 
                  key={client} 
                  variant="secondary" 
                  className="text-xs bg-muted/60 text-foreground py-0.5 pl-2 pr-1.5 flex items-center gap-1.5 h-6"
                >
                  <span className="truncate max-w-[180px]">{client}</span>
                  <button
                    type="button"
                    onClick={() => toggleClient(client)}
                    className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedClients([]);
                  setPage(1);
                }}
                className="text-xs text-muted-foreground hover:text-primary h-6 px-1.5 ml-1"
              >
                Limpar Clientes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card className="border border-muted/80 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" style={{ borderColor: "hsl(346, 84%, 45%) transparent" }}></div>
              <p className="text-sm text-muted-foreground">Carregando chamados...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 space-y-2">
              <p className="font-semibold">Erro ao carregar dados.</p>
              <p className="text-xs text-muted-foreground">{(error as Error).message || "Ocorreu um erro no servidor."}</p>
            </div>
          ) : chamados.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-sm">Nenhum chamado encontrado.</p>
              <p className="text-xs">Tente ajustar seus filtros ou termos de pesquisa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px]">Chamado</TableHead>
                    <TableHead className="min-w-[200px]">Serventia / Cliente</TableHead>
                    <TableHead className="min-w-[150px]">Natureza</TableHead>
                    <TableHead className="w-[140px]">Software</TableHead>
                    <TableHead className="w-[120px] text-center">Status</TableHead>
                    <TableHead className="w-[120px]">Abertura</TableHead>
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((chamado) => (
                    <TableRow key={chamado.numeroChamado} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono font-medium text-xs text-primary" style={{ color: "hsl(346, 84%, 45%)" }}>
                        #{chamado.numeroChamado}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground truncate" title={chamado.nomeCliente}>
                            {chamado.nomeCliente || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate" title={chamado.titulo}>
                            {chamado.titulo || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-normal text-muted-foreground truncate max-w-[180px]" title={chamado.natureza}>
                        {chamado.natureza || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {chamado.software || chamado.produto || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("pointer-events-none text-[10px] py-0.5 px-2 font-semibold", statusBadgeClass(chamado.status))}>
                          {chamado.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDateBr(chamado.dataAbertura)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedChamado(chamado)}
                          title="Visualizar chamado"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Seção de Paginação */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-muted bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Mostrando <strong className="font-medium text-foreground">{chamados.length}</strong> de <strong className="font-medium text-foreground">{totalCount}</strong> chamados encontrados.
                </span>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                      <span>Página</span>
                      <strong className="font-medium text-foreground">{page}</strong>
                      <span>de</span>
                      <strong className="font-medium text-foreground">{totalPages}</strong>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Chamado */}
      {selectedChamado && (
        <Chamado0800DetailDialog
          chamado={selectedChamado}
          onClose={() => setSelectedChamado(null)}
        />
      )}
    </div>
  );
}
