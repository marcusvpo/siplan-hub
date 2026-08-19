import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, ListChecks, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCsCxRoutines } from "@/hooks/useCsCxRoutines";
import { useToast } from "@/hooks/use-toast";
import { buildRoutineReportAnalytics, generateCsCxRoutinesPdf, generateCsCxRoutinesXlsx } from "@/lib/cs-cx-routines-report";

const DEFAULT_PAGE_SIZE = 5;

export default function CsCxReports() {
  const { models, routines, isLoading, error, refetch } = useCsCxRoutines();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const offices = useMemo(() => Array.from(new Map(routines.flatMap((routine) => routine.registry_office ? [[routine.registry_office.id, routine.registry_office]] : [])).values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [routines]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return routines.filter((routine) => {
      const applicationDate = routine.applied_at.slice(0, 10);
      const matchesSearch = !term || [routine.registry_office?.name, routine.routine_model?.name, routine.notes]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      return matchesSearch
        && (officeFilter === "all" || routine.registry_office_id === officeFilter)
        && (modelFilter === "all" || routine.routine_model_id === modelFilter)
        && (statusFilter === "all" || (statusFilter === "active" ? routine.active : !routine.active))
        && (!dateFrom || applicationDate >= dateFrom)
        && (!dateTo || applicationDate <= dateTo);
    });
  }, [dateFrom, dateTo, modelFilter, officeFilter, routines, search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRoutines = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filtered, pageSize],
  );
  const analytics = useMemo(() => buildRoutineReportAnalytics(filtered), [filtered]);
  const exportModels = useMemo(() => models.filter((model) => modelFilter === "all" || model.id === modelFilter), [modelFilter, models]);
  const filtersDescription = useMemo(() => [
    officeFilter === "all" ? "Todos os cartórios" : `Cartório: ${offices.find((office) => office.id === officeFilter)?.name ?? "selecionado"}`,
    modelFilter === "all" ? "Todos os modelos" : `Modelo: ${models.find((model) => model.id === modelFilter)?.name ?? "selecionado"}`,
    statusFilter === "all" ? "Todos os status" : statusFilter === "active" ? "Aplicações ativas" : "Aplicações inativas",
    dateFrom ? `Desde ${formatDateOnly(dateFrom)}` : "Sem data inicial",
    dateTo ? `Até ${formatDateOnly(dateTo)}` : "Sem data final",
    search.trim() ? `Busca: ${search.trim()}` : "Sem busca",
  ].join(" · "), [dateFrom, dateTo, modelFilter, models, officeFilter, offices, search, statusFilter]);
  const updateSearch = (value: string) => { setSearch(value); setPage(1); };
  const updateOfficeFilter = (value: string) => { setOfficeFilter(value); setPage(1); };
  const updateModelFilter = (value: string) => { setModelFilter(value); setPage(1); };
  const updateStatusFilter = (value: string) => { setStatusFilter(value); setPage(1); };
  const updateDateFrom = (value: string) => { setDateFrom(value); setPage(1); };
  const updateDateTo = (value: string) => { setDateTo(value); setPage(1); };
  const updatePageSize = (value: string) => { setPageSize(Number(value)); setPage(1); };

  async function handleExport(kind: "pdf" | "xlsx") {
    setExporting(kind);
    try {
      if (kind === "pdf") await generateCsCxRoutinesPdf(filtered, filtersDescription);
      else await generateCsCxRoutinesXlsx(filtered, exportModels);
      toast({ title: kind === "pdf" ? "PDF gerado" : "Planilha gerada", description: `${filtered.length} aplicação(ões) incluída(s).` });
    } catch (exportError) {
      toast({ title: "Não foi possível gerar o relatório", description: messageOf(exportError), variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setOfficeFilter("all");
    setModelFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  if (isLoading) return <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-72 w-full" /></div>;

  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><BarChart3 className="h-4 w-4" /></span><div><h1 className="text-2xl font-black leading-none tracking-tight">Relatórios de Rotinas</h1><p className="mt-1 text-xs text-muted-foreground">Indicadores, configurações e exportações consolidadas por cartório e modelo</p></div></div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!filtered.length || Boolean(exporting)} onClick={() => handleExport("pdf")}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button><Button size="sm" disabled={(!filtered.length && !exportModels.length) || Boolean(exporting)} onClick={() => handleExport("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel</Button></div>
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between gap-3 p-3"><div className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(error)}</div><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}

      <Card><CardContent className="p-3"><div className="mb-2 flex items-center justify-between gap-3"><div><CardTitle className="text-sm">Filtros do relatório</CardTitle><CardDescription className="text-xs">PDF e Excel respeitam todo o recorte selecionado.</CardDescription></div><Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>Limpar</Button></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="h-9 pl-9" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Buscar cartório, modelo ou observação..." /></div><Select value={officeFilter} onValueChange={updateOfficeFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cartórios</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select><Select value={modelFilter} onValueChange={updateModelFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os modelos</SelectItem>{models.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={updateStatusFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="inactive">Inativas</SelectItem></SelectContent></Select><div className="grid grid-cols-2 gap-2 xl:col-span-2"><div><Label htmlFor="report-from" className="sr-only">Data inicial</Label><Input id="report-from" className="h-9" type="date" value={dateFrom} onChange={(event) => updateDateFrom(event.target.value)} /></div><div><Label htmlFor="report-to" className="sr-only">Data final</Label><Input id="report-to" className="h-9" type="date" value={dateTo} onChange={(event) => updateDateTo(event.target.value)} /></div></div></div></CardContent></Card>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={ListChecks} label="Aplicações" value={analytics.totalApplications} /><Metric icon={CheckCircle2} label="Aplicações ativas" value={analytics.activeApplications} /><Metric icon={CheckCircle2} label="Itens ativos" value={analytics.activeItems} /><Metric icon={ListChecks} label="Itens inativos" value={analytics.inactiveItems} /><Metric icon={TriangleAlert} label="A analisar" value={analytics.pendingItems} /></div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHeader className="px-4 pb-2 pt-3"><CardTitle className="text-sm">Aplicações por mês</CardTitle><CardDescription className="text-xs">Evolução do recorte selecionado.</CardDescription></CardHeader><CardContent className="h-56 px-3 pb-3">{analytics.byMonth.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={analytics.byMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tickFormatter={formatMonth} fontSize={11} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(value) => formatMonth(String(value))} /><Bar dataKey="total" name="Aplicações" fill="#d20037" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}</CardContent></Card>
        <Card><CardHeader className="px-4 pb-2 pt-3"><CardTitle className="text-sm">Itens ativos por categoria</CardTitle><CardDescription className="text-xs">Distribuição das configurações atualmente ativas.</CardDescription></CardHeader><CardContent className="h-56 px-3 pb-3">{analytics.byCategory.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={analytics.byCategory.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={110} fontSize={10} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="total" name="Itens ativos" radius={[0, 4, 4, 0]}>{analytics.byCategory.slice(0, 8).map((entry) => <Cell key={entry.name} fill={validColor(entry.color)} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyChart />}</CardContent></Card>
      </div>

      <Card><CardHeader className="px-4 pb-2 pt-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-sm">Aplicações por cartório</CardTitle><CardDescription className="text-xs">{filtered.length} resultado(s) no recorte atual.</CardDescription></div><div className="flex max-w-xl flex-wrap justify-end gap-1">{analytics.popularModels.slice(0, 5).map((model) => <Badge key={model.name} variant="outline" className="h-5 px-1.5 text-[10px] font-normal">{model.name}: {model.total}</Badge>)}</div></div></CardHeader><CardContent className="p-0"><Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3"><TableHeader><TableRow><TableHead>Cartório</TableHead><TableHead>Modelo</TableHead><TableHead>Aplicação</TableHead><TableHead>Status</TableHead><TableHead>Ativos</TableHead><TableHead>Inativos</TableHead><TableHead>A analisar</TableHead></TableRow></TableHeader><TableBody>{pagedRoutines.map((routine) => <TableRow key={routine.id}><TableCell className="max-w-64 truncate font-medium" title={routine.registry_office?.name ?? "Cartório removido"}>{routine.registry_office?.name ?? "Cartório removido"}</TableCell><TableCell className="max-w-56 truncate" title={routine.routine_model?.name ?? "Modelo removido"}>{routine.routine_model?.name ?? "Modelo removido"}</TableCell><TableCell className="whitespace-nowrap text-xs">{formatDateTime(routine.applied_at)}</TableCell><TableCell><Badge variant={routine.active ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] font-normal">{routine.active ? "Ativa" : "Inativa"}</Badge></TableCell><TableCell>{routine.items.filter((item) => item.active === true).length}</TableCell><TableCell>{routine.items.filter((item) => item.active === false).length}</TableCell><TableCell>{routine.items.filter((item) => item.active === null).length}</TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Nenhuma aplicação encontrada.</TableCell></TableRow>}</TableBody></Table><div className="px-3 pb-3"><ReportPaginationBar currentPage={currentPage} pageSize={pageSize} totalItems={filtered.length} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={updatePageSize} /></div></CardContent></Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ListChecks; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-2.5 px-3 py-2.5"><div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40"><Icon className="h-4 w-4" /></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-black leading-6">{value}</p></div></CardContent></Card>; }
function ReportPaginationBar({ currentPage, pageSize, totalItems, totalPages, onPageChange, onPageSizeChange }: { currentPage: number; pageSize: number; totalItems: number; totalPages: number; onPageChange: (page: number) => void; onPageSizeChange: (size: string) => void }) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  return <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} aplicações`}>Mostrando <strong className="font-semibold text-foreground">{firstItem}–{lastItem}</strong> de <strong className="font-semibold text-foreground">{totalItems}</strong></span><div className="flex flex-wrap items-center gap-2"><span>Por página</span><Select value={String(pageSize)} onValueChange={onPageSizeChange}><SelectTrigger aria-label="Aplicações por página" className="h-8 w-[72px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><span className="min-w-[92px] text-center">Página {currentPage} de {totalPages}</span><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Próxima página" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>;
}
function EmptyChart() { return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados para o gráfico.</div>; }
function validColor(value: string) { return /^#[0-9a-f]{6}$/i.test(value) ? value : "#64748b"; }
function formatMonth(value: string) { const [year, month] = value.split("-"); return `${month}/${year}`; }
function formatDateOnly(value: string) { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
