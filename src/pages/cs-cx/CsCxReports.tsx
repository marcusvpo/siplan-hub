import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, FileDown, FileSpreadsheet, ListChecks, RefreshCw, Search, TriangleAlert } from "lucide-react";
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

export default function CsCxReports() {
  const { models, routines, isLoading, error, refetch } = useCsCxRoutines();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
  }

  if (isLoading) return <div className="container mx-auto max-w-7xl space-y-4 p-6"><Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /></div>;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"><BarChart3 className="h-4 w-4" />CS/CX</div><h1 className="mt-1 text-3xl font-black tracking-tight">Relatórios de Rotinas</h1><p className="text-sm text-muted-foreground">Indicadores, configurações e exportações consolidadas por cartório e modelo.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!filtered.length || Boolean(exporting)} onClick={() => handleExport("pdf")}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button><Button disabled={(!filtered.length && !exportModels.length) || Boolean(exporting)} onClick={() => handleExport("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel</Button></div>
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between gap-4 pt-6"><div className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(error)}</div><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}

      <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-base">Filtros do relatório</CardTitle><CardDescription>PDF e Excel respeitam exatamente o recorte selecionado.</CardDescription></div><Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cartório, modelo ou observação..." /></div><Select value={officeFilter} onValueChange={setOfficeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cartórios</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select><Select value={modelFilter} onValueChange={setModelFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os modelos</SelectItem>{models.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="inactive">Inativas</SelectItem></SelectContent></Select><div className="grid grid-cols-2 gap-2 xl:col-span-1"><div><Label htmlFor="report-from" className="sr-only">Data inicial</Label><Input id="report-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></div><div><Label htmlFor="report-to" className="sr-only">Data final</Label><Input id="report-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div></div></CardContent></Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={ListChecks} label="Aplicações" value={analytics.totalApplications} /><Metric icon={CheckCircle2} label="Aplicações ativas" value={analytics.activeApplications} /><Metric icon={CheckCircle2} label="Itens ativos" value={analytics.activeItems} /><Metric icon={ListChecks} label="Itens inativos" value={analytics.inactiveItems} /><Metric icon={TriangleAlert} label="A analisar" value={analytics.pendingItems} /></div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Aplicações por mês</CardTitle><CardDescription>Evolução do recorte selecionado.</CardDescription></CardHeader><CardContent className="h-72">{analytics.byMonth.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={analytics.byMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tickFormatter={formatMonth} fontSize={11} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(value) => formatMonth(String(value))} /><Bar dataKey="total" name="Aplicações" fill="#d20037" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Itens ativos por categoria</CardTitle><CardDescription>Distribuição das configurações atualmente ativas.</CardDescription></CardHeader><CardContent className="h-72">{analytics.byCategory.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={analytics.byCategory.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={110} fontSize={10} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="total" name="Itens ativos" radius={[0, 4, 4, 0]}>{analytics.byCategory.slice(0, 8).map((entry) => <Cell key={entry.name} fill={validColor(entry.color)} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyChart />}</CardContent></Card>
      </div>

      <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">Aplicações por cartório</CardTitle><CardDescription>{filtered.length} resultado(s) no recorte atual.</CardDescription></div><div className="flex max-w-md flex-wrap justify-end gap-1">{analytics.popularModels.slice(0, 5).map((model) => <Badge key={model.name} variant="outline">{model.name}: {model.total}</Badge>)}</div></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Cartório</TableHead><TableHead>Modelo</TableHead><TableHead>Aplicação</TableHead><TableHead>Status</TableHead><TableHead>Ativos</TableHead><TableHead>Inativos</TableHead><TableHead>A analisar</TableHead></TableRow></TableHeader><TableBody>{filtered.map((routine) => <TableRow key={routine.id}><TableCell className="font-medium">{routine.registry_office?.name ?? "Cartório removido"}</TableCell><TableCell>{routine.routine_model?.name ?? "Modelo removido"}</TableCell><TableCell>{formatDateTime(routine.applied_at)}</TableCell><TableCell><Badge variant={routine.active ? "default" : "secondary"}>{routine.active ? "Ativa" : "Inativa"}</Badge></TableCell><TableCell>{routine.items.filter((item) => item.active === true).length}</TableCell><TableCell>{routine.items.filter((item) => item.active === false).length}</TableCell><TableCell>{routine.items.filter((item) => item.active === null).length}</TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Nenhuma aplicação encontrada.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ListChecks; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-3 pt-6"><div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40"><Icon className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p></div></CardContent></Card>; }
function EmptyChart() { return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados para o gráfico.</div>; }
function validColor(value: string) { return /^#[0-9a-f]{6}$/i.test(value) ? value : "#64748b"; }
function formatMonth(value: string) { const [year, month] = value.split("-"); return `${month}/${year}`; }
function formatDateOnly(value: string) { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
