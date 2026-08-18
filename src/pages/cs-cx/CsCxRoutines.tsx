import { useMemo, useState } from "react";
import { Activity, ArrowRight, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Clock3, Database, Eye, FileDown, ListChecks, Pencil, Plus, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { type CsCxOfficeRoutine, type CsCxRoutineItemConfig, useCsCxRoutines } from "@/hooks/useCsCxRoutines";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { generateCsCxRoutinePdf } from "@/lib/cs-cx-routines-report";

const STATUS_OPTIONS = [
  { value: "analisar", label: "Analisar" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
] as const;
const DEFAULT_PAGE_SIZE = 5;

export default function CsCxRoutines() {
  const { models, routines, history, isLoading, error, refetch, applyRoutine, setRoutineItem, deleteRoutine } = useCsCxRoutines();
  const { offices } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [applicationPage, setApplicationPage] = useState(1);
  const [applicationPageSize, setApplicationPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [modelPage, setModelPage] = useState(1);
  const [modelPageSize, setModelPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({ registryOfficeId: "", routineModelId: "", notes: "" });
  const [editingItem, setEditingItem] = useState<{ routine: CsCxOfficeRoutine; item: CsCxRoutineItemConfig } | null>(null);
  const [itemStatus, setItemStatus] = useState("analisar");
  const [itemNotes, setItemNotes] = useState("");
  const [itemAnalysisDate, setItemAnalysisDate] = useState(todayKey());
  const [openedOfficeId, setOpenedOfficeId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CsCxOfficeRoutine | null>(null);
  const [exportingRoutineId, setExportingRoutineId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyAction, setHistoryAction] = useState("all");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE);

  const canCreate = hasPermission("cs_cx_rotinas", "create");
  const canEdit = hasPermission("cs_cx_rotinas", "edit");
  const canDelete = hasPermission("cs_cx_rotinas", "delete");
  const openedOfficeRoutines = openedOfficeId ? routines.filter((routine) => routine.registry_office_id === openedOfficeId) : [];

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return routines.filter((routine) => {
      const matchesTerm = !term || [routine.registry_office?.name, routine.routine_model?.name, routine.notes]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      return matchesTerm && (officeFilter === "all" || routine.registry_office_id === officeFilter);
    });
  }, [officeFilter, routines, search]);
  const applicationTotalPages = Math.max(1, Math.ceil(filtered.length / applicationPageSize));
  const currentApplicationPage = Math.min(applicationPage, applicationTotalPages);
  const pagedRoutines = useMemo(
    () => filtered.slice((currentApplicationPage - 1) * applicationPageSize, currentApplicationPage * applicationPageSize),
    [applicationPageSize, currentApplicationPage, filtered],
  );
  const modelTotalPages = Math.max(1, Math.ceil(models.length / modelPageSize));
  const currentModelPage = Math.min(modelPage, modelTotalPages);
  const pagedModels = useMemo(
    () => models.slice((currentModelPage - 1) * modelPageSize, currentModelPage * modelPageSize),
    [currentModelPage, modelPageSize, models],
  );

  const totals = useMemo(() => {
    const items = routines.flatMap((routine) => routine.items);
    return {
      applications: routines.length,
      active: items.filter((item) => item.active === true).length,
      inactive: items.filter((item) => item.active === false).length,
      pending: items.filter((item) => item.active === null).length,
    };
  }, [routines]);

  const historyActions = useMemo(
    () => [...new Set(history.map((entry) => entry.action))].sort((a, b) => actionLabel(a).localeCompare(actionLabel(b), "pt-BR")),
    [history],
  );

  const filteredHistory = useMemo(() => {
    const term = historySearch.trim().toLocaleLowerCase("pt-BR");
    return history.filter((entry) => {
      const matchesTerm = !term || [
        entry.registry_office_name,
        entry.routine_model_name,
        entry.model_item_name,
        entry.actor_name,
        entry.notes,
        entry.action,
      ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      const day = localDateKey(entry.occurred_at);
      return matchesTerm
        && (historyAction === "all" || entry.action === historyAction)
        && (!historyStart || day >= historyStart)
        && (!historyEnd || day <= historyEnd);
    });
  }, [history, historyAction, historyEnd, historySearch, historyStart]);
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = useMemo(
    () => filteredHistory.slice((currentHistoryPage - 1) * historyPageSize, currentHistoryPage * historyPageSize),
    [currentHistoryPage, filteredHistory, historyPageSize],
  );

  const updateSearch = (value: string) => { setSearch(value); setApplicationPage(1); };
  const updateOfficeFilter = (value: string) => { setOfficeFilter(value); setApplicationPage(1); };
  const updateApplicationPageSize = (value: string) => { setApplicationPageSize(Number(value)); setApplicationPage(1); };
  const updateModelPageSize = (value: string) => { setModelPageSize(Number(value)); setModelPage(1); };
  const updateHistorySearch = (value: string) => { setHistorySearch(value); setHistoryPage(1); };
  const updateHistoryAction = (value: string) => { setHistoryAction(value); setHistoryPage(1); };
  const updateHistoryStart = (value: string) => { setHistoryStart(value); setHistoryPage(1); };
  const updateHistoryEnd = (value: string) => { setHistoryEnd(value); setHistoryPage(1); };
  const updateHistoryPageSize = (value: string) => { setHistoryPageSize(Number(value)); setHistoryPage(1); };

  async function handleApply() {
    try {
      await applyRoutine.mutateAsync(applyForm);
      setApplyOpen(false);
      setApplyForm({ registryOfficeId: "", routineModelId: "", notes: "" });
      toast({ title: "Rotina aplicada", description: "Os itens do modelo foram vinculados ao cartório." });
    } catch (mutationError) {
      toast({ title: "Não foi possível aplicar a rotina", description: messageOf(mutationError), variant: "destructive" });
    }
  }

  function openItem(routine: CsCxOfficeRoutine, item: CsCxRoutineItemConfig) {
    setEditingItem({ routine, item });
    setItemStatus(item.active === true ? "ativo" : item.active === false ? "inativo" : "analisar");
    setItemNotes(item.analysis_notes ?? "");
    setItemAnalysisDate(item.analyzed_at ? localDateKey(item.analyzed_at) : todayKey());
  }

  async function handleItemSave() {
    if (!editingItem) return;
    try {
      await setRoutineItem.mutateAsync({
        id: editingItem.item.id,
        active: itemStatus === "ativo" ? true : itemStatus === "inativo" ? false : null,
        analysisNotes: itemNotes,
        analyzedAt: itemAnalysisDate,
      });
      setEditingItem(null);
      toast({ title: "Análise atualizada" });
    } catch (mutationError) {
      toast({ title: "Não foi possível atualizar o item", description: messageOf(mutationError), variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteRoutine.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Rotina desvinculada" });
    } catch (mutationError) {
      toast({ title: "Não foi possível desvincular", description: messageOf(mutationError), variant: "destructive" });
    }
  }

  async function handleRoutinePdf(routine: CsCxOfficeRoutine) {
    setExportingRoutineId(routine.id);
    try {
      await generateCsCxRoutinePdf(routine);
      toast({ title: "PDF da rotina gerado" });
    } catch (exportError) {
      toast({ title: "Não foi possível gerar o PDF", description: messageOf(exportError), variant: "destructive" });
    } finally {
      setExportingRoutineId(null);
    }
  }

  if (isLoading) return <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-72 w-full" /></div>;

  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><ListChecks className="h-4 w-4" /></span><div><h1 className="text-2xl font-black leading-none tracking-tight">Rotinas</h1><p className="mt-1 text-xs text-muted-foreground">Modelos aplicados aos cartórios, análise dos itens e histórico operacional</p></div></div>
        {canCreate && <Button size="sm" onClick={() => setApplyOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Aplicar rotina</Button>}
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between gap-3 p-3"><div className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(error)}</div><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Database} label="Aplicações" value={totals.applications} />
        <Metric icon={CheckCircle2} label="Itens ativos" value={totals.active} />
        <Metric icon={Activity} label="Itens inativos" value={totals.inactive} />
        <Metric icon={ClipboardCheck} label="A analisar" value={totals.pending} />
      </div>

      <Tabs defaultValue="applications" className="space-y-3">
        <TabsList className="h-9"><TabsTrigger className="h-7" value="applications">Aplicações</TabsTrigger><TabsTrigger className="h-7" value="models">Modelos</TabsTrigger><TabsTrigger className="h-7" value="history">Histórico</TabsTrigger></TabsList>
        <TabsContent value="applications" className="space-y-3">
          <Card><CardContent className="grid gap-2 p-3 md:grid-cols-[minmax(260px,1fr)_260px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Buscar cartório, modelo ou observação..." className="h-9 pl-9" /></div><Select value={officeFilter} onValueChange={updateOfficeFilter}><SelectTrigger className="h-9"><SelectValue placeholder="Todos os cartórios" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cartórios</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>

          <div className="space-y-2">
            {pagedRoutines.map((routine) => {
              const isExpanded = expanded === routine.id;
              const analyzed = routine.items.filter((item) => item.analyzed_at).length;
              const completed = routine.items.length > 0 && analyzed === routine.items.length;
              const lastAnalysis = latestAnalysisDate(routine);
              return <Card key={routine.id}>
                <CardHeader className="px-4 py-3"><div className="flex flex-col justify-between gap-2 md:flex-row md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><CardTitle className="truncate text-sm" title={routine.registry_office?.name ?? "Cartório removido"}>{routine.registry_office?.name ?? "Cartório removido"}</CardTitle><Badge variant="outline" className={completed ? "h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] text-emerald-700" : "h-5 border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-700"}>{completed && <CheckCircle2 className="mr-1 h-3 w-3" />}{completed ? "Análise concluída" : "Análise pendente"}</Badge></div><CardDescription className="mt-0.5 text-xs">{routine.routine_model?.name ?? "Modelo removido"} · {analyzed}/{routine.items.length} itens analisados · {lastAnalysis ? `última análise em ${formatDate(lastAnalysis)}` : `aplicado em ${formatDate(routine.applied_at)}`}</CardDescription></div><div className="flex flex-wrap items-center gap-1.5">{routine.origin === "legacy" && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Legado</Badge>}<Button variant="outline" size="sm" className="h-8 px-2.5" aria-label="Analisar cartório e suas rotinas" onClick={() => setOpenedOfficeId(routine.registry_office_id)}><Eye className="mr-1.5 h-4 w-4" />Analisar cartório</Button><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Exportar PDF da rotina" disabled={exportingRoutineId === routine.id} onClick={() => handleRoutinePdf(routine)}><FileDown className="h-4 w-4" /></Button><Button variant="outline" size="sm" className="h-8" onClick={() => setExpanded(isExpanded ? null : routine.id)}>{isExpanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}{isExpanded ? "Ocultar" : "Itens"}</Button>{canDelete && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Desvincular rotina" onClick={() => setDeleting(routine)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div></CardHeader>
                {isExpanded && <CardContent className="space-y-1.5 border-t px-3 py-2.5">{routine.notes && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground" title={routine.notes}>{routine.notes}</p>}{routine.items.map((item) => <RoutineItemRow key={item.id} routine={routine} item={item} canEdit={canEdit} onEdit={openItem} />)}</CardContent>}
              </Card>;
            })}
            {!filtered.length && <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma rotina encontrada.</CardContent></Card>}
          </div>
          <RoutinePaginationBar currentPage={currentApplicationPage} pageSize={applicationPageSize} totalItems={filtered.length} totalPages={applicationTotalPages} itemLabel="aplicações" selectLabel="Aplicações por página" onPageChange={setApplicationPage} onPageSizeChange={updateApplicationPageSize} />
        </TabsContent>

        <TabsContent value="models" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{pagedModels.map((model) => <Card key={model.id}><CardHeader className="p-4 pb-2"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-sm" title={model.name}>{model.name}</CardTitle><CardDescription className="mt-0.5 line-clamp-2 text-xs" title={model.description ?? ""}>{model.description || "Sem descrição"}</CardDescription></div><Badge variant={model.active ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]">{model.active ? "Ativo" : "Inativo"}</Badge></div></CardHeader><CardContent className="space-y-2 p-4 pt-0"><p className="text-xs"><strong>{model.item_count}</strong> itens configurados</p><div className="flex flex-wrap gap-1">{model.products.map((product) => <Badge key={product.id} variant="outline" className="h-5 px-1.5 text-[10px]">{product.name}</Badge>)}</div></CardContent></Card>)}</div>
          {!models.length && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum modelo encontrado.</CardContent></Card>}
          <RoutinePaginationBar currentPage={currentModelPage} pageSize={modelPageSize} totalItems={models.length} totalPages={modelTotalPages} itemLabel="modelos" selectLabel="Modelos por página" onPageChange={setModelPage} onPageSizeChange={updateModelPageSize} />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-rose-600" />Histórico de alterações</CardTitle><CardDescription className="text-xs">Registro completo das aplicações e mudanças nos itens de rotina.</CardDescription></CardHeader>
            <CardContent className="grid gap-2 p-3 pt-1 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_210px_155px_155px]">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={historySearch} onChange={(event) => updateHistorySearch(event.target.value)} placeholder="Buscar cartório, modelo, item ou responsável..." className="h-9 pl-9" /></div>
              <Select value={historyAction} onValueChange={updateHistoryAction}><SelectTrigger className="h-9"><SelectValue placeholder="Todas as ações" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem>{historyActions.map((action) => <SelectItem key={action} value={action}>{actionLabel(action)}</SelectItem>)}</SelectContent></Select>
              <Input className="h-9" type="date" aria-label="Data inicial do histórico" value={historyStart} onChange={(event) => updateHistoryStart(event.target.value)} />
              <Input className="h-9" type="date" aria-label="Data final do histórico" value={historyEnd} onChange={(event) => updateHistoryEnd(event.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 py-2.5"><CardTitle className="text-sm">{filteredHistory.length} registro{filteredHistory.length === 1 ? "" : "s"}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="h-9 px-3 text-xs">Data e hora</TableHead><TableHead className="h-9 px-3 text-xs">Responsável</TableHead><TableHead className="h-9 px-3 text-xs">Ação</TableHead><TableHead className="h-9 px-3 text-xs">Cartório / modelo</TableHead><TableHead className="h-9 px-3 text-xs">Item</TableHead><TableHead className="h-9 px-3 text-xs">Alteração</TableHead><TableHead className="h-9 px-3 text-xs">Observação</TableHead><TableHead className="h-9 px-3 text-xs">IP</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pagedHistory.map((entry) => <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs">{formatDateTime(entry.occurred_at)}</TableCell>
                      <TableCell className="px-3 py-2"><p className="max-w-40 truncate text-xs font-medium">{entry.actor_name ?? (entry.legacy_user_id ? `Usuário legado #${entry.legacy_user_id}` : "Sistema")}</p>{entry.origin === "legacy" && <span className="text-[10px] leading-4 text-muted-foreground">Legado</span>}</TableCell>
                      <TableCell className="px-3 py-2"><ActionBadge action={entry.action} /></TableCell>
                      <TableCell className="px-3 py-2"><p className="max-w-56 truncate text-xs font-medium">{entry.registry_office_name ?? "Cartório não vinculado"}</p><p className="max-w-56 truncate text-[10px] leading-4 text-muted-foreground">{entry.routine_model_name ?? "Modelo não informado"}</p></TableCell>
                      <TableCell className="max-w-56 px-3 py-2 text-xs"><p className="line-clamp-2" title={entry.model_item_name ?? "Modelo completo"}>{entry.model_item_name ?? "Modelo completo"}</p></TableCell>
                      <TableCell className="px-3 py-2">{hasStatusTransition(entry.action, entry.previous_status, entry.new_status) ? <div className="flex items-center gap-1"><StatusBadge active={entry.previous_status} /><ArrowRight className="h-3 w-3 text-muted-foreground" /><StatusBadge active={entry.new_status} /></div> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="max-w-64 px-3 py-2 text-xs text-muted-foreground"><p className="line-clamp-2" title={entry.notes ?? ""}>{entry.notes || "—"}</p></TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{entry.ip_address || "—"}</TableCell>
                    </TableRow>)}
                    {!filteredHistory.length && <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Nenhum registro encontrado para os filtros selecionados.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
              <div className="px-3 pb-3"><RoutinePaginationBar currentPage={currentHistoryPage} pageSize={historyPageSize} totalItems={filteredHistory.length} totalPages={historyTotalPages} itemLabel="registros" selectLabel="Registros por página" onPageChange={setHistoryPage} onPageSizeChange={updateHistoryPageSize} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}><DialogContent><DialogHeader><DialogTitle>Aplicar rotina</DialogTitle><DialogDescription>Vincule um modelo e todos os seus itens a um cartório.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Cartório</Label><Select value={applyForm.registryOfficeId} onValueChange={(value) => setApplyForm((current) => ({ ...current, registryOfficeId: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Modelo</Label><Select value={applyForm.routineModelId} onValueChange={(value) => setApplyForm((current) => ({ ...current, routineModelId: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{models.filter((model) => model.active).map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="routine-notes">Observações</Label><Textarea id="routine-notes" value={applyForm.notes} onChange={(event) => setApplyForm((current) => ({ ...current, notes: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setApplyOpen(false)}>Cancelar</Button><Button disabled={!applyForm.registryOfficeId || !applyForm.routineModelId || applyRoutine.isPending} onClick={handleApply}>Aplicar</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(openedOfficeId)} onOpenChange={(open) => !open && setOpenedOfficeId(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Rotinas do cartório</DialogTitle><DialogDescription>{openedOfficeRoutines[0]?.registry_office?.name ?? "Cartório"} · visão consolidada para análise.</DialogDescription></DialogHeader><div className="space-y-3">{openedOfficeRoutines.map((routine) => { const analyzed = routine.items.filter((item) => item.analyzed_at).length; const completed = routine.items.length > 0 && analyzed === routine.items.length; return <div key={routine.id} className="rounded-lg border"><div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2"><div><p className="text-sm font-semibold">{routine.routine_model?.name ?? "Modelo removido"}</p><p className="text-[11px] text-muted-foreground">{analyzed}/{routine.items.length} analisados · aplicado em {formatDate(routine.applied_at)}</p></div><Badge variant="outline" className={completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{completed ? "Concluída" : "Pendente"}</Badge></div><div className="space-y-1.5 p-2">{routine.items.map((item) => <RoutineItemRow key={item.id} routine={routine} item={item} canEdit={canEdit} onEdit={openItem} />)}</div></div>; })}</div><DialogFooter><Button variant="outline" onClick={() => setOpenedOfficeId(null)}>Fechar</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}><DialogContent><DialogHeader><DialogTitle>Analisar item</DialogTitle><DialogDescription>{editingItem?.routine.registry_office?.name} · {editingItem?.item.model_item?.name}</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><Label>Status</Label><Select value={itemStatus} onValueChange={setItemStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="analysis-date">Data da análise</Label><Input id="analysis-date" type="date" required value={itemAnalysisDate} onChange={(event) => setItemAnalysisDate(event.target.value)} /></div></div><div><Label htmlFor="analysis-notes">Observação da análise</Label><Textarea id="analysis-notes" value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button><Button disabled={!itemAnalysisDate || setRoutineItem.isPending} onClick={handleItemSave}>Salvar análise</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desvincular rotina?</AlertDialogTitle><AlertDialogDescription>O vínculo com {deleting?.registry_office?.name}, suas análises e configurações serão excluídos do HUB.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Desvincular</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-2.5 px-3 py-2.5"><div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40"><Icon className="h-4 w-4" /></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-black leading-6">{value}</p></div></CardContent></Card>;
}

function RoutineItemRow({ routine, item, canEdit, onEdit }: { routine: CsCxOfficeRoutine; item: CsCxRoutineItemConfig; canEdit: boolean; onEdit: (routine: CsCxOfficeRoutine, item: CsCxRoutineItemConfig) => void }) {
  return <div className="flex flex-col justify-between gap-2 rounded-md border px-3 py-2 md:flex-row md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="text-sm font-medium">{item.model_item?.name ?? "Item removido"}</span>{item.model_item?.required && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Obrigatório</Badge>}{item.model_item?.category && <Badge variant="outline" className="h-5 px-1.5 text-[10px]" style={{ borderColor: item.model_item.category.display_color }}>{item.model_item.category.name}</Badge>}</div><p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">{item.model_item?.routine_type?.name}{item.analysis_notes ? ` · ${item.analysis_notes}` : ""}</p></div><div className="flex flex-wrap items-center gap-1.5">{item.analyzed_at && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><CalendarDays className="h-3 w-3" />{formatDate(item.analyzed_at)}</span>}<StatusBadge active={item.active} />{canEdit && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(routine, item)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>}</div></div>;
}

function StatusBadge({ active }: { active: boolean | null }) {
  if (active === true) return <Badge className="h-5 bg-emerald-600 px-1.5 text-[10px] font-normal hover:bg-emerald-600">Ativo</Badge>;
  if (active === false) return <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-normal">Inativo</Badge>;
  return <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">Analisar</Badge>;
}

function ActionBadge({ action }: { action: string }) {
  const className = "h-5 whitespace-nowrap px-1.5 text-[10px] font-normal";
  if (action === "ATIVADO") return <Badge className={`${className} bg-emerald-600 hover:bg-emerald-600`}>{actionLabel(action)}</Badge>;
  if (action === "DESATIVADO" || action === "DESVINCULADO" || action.startsWith("REMOVIDO")) return <Badge variant="destructive" className={className}>{actionLabel(action)}</Badge>;
  if (action === "APLICADO" || action === "ITEM_ADICIONADO") return <Badge className={className}>{actionLabel(action)}</Badge>;
  return <Badge variant="secondary" className={className}>{actionLabel(action)}</Badge>;
}

function RoutinePaginationBar({ currentPage, pageSize, totalItems, totalPages, itemLabel, selectLabel, onPageChange, onPageSizeChange }: { currentPage: number; pageSize: number; totalItems: number; totalPages: number; itemLabel: string; selectLabel: string; onPageChange: (page: number) => void; onPageSizeChange: (size: string) => void }) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  return <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} ${itemLabel}`}>Mostrando <strong className="font-semibold text-foreground">{firstItem}–{lastItem}</strong> de <strong className="font-semibold text-foreground">{totalItems}</strong></span><div className="flex flex-wrap items-center gap-2"><span>Por página</span><Select value={String(pageSize)} onValueChange={onPageSizeChange}><SelectTrigger aria-label={selectLabel} className="h-8 w-[72px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><span className="min-w-[92px] text-center">Página {currentPage} de {totalPages}</span><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Página anterior de ${itemLabel}`} disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Próxima página de ${itemLabel}`} disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    APLICADO: "Rotina aplicada",
    ATIVADO: "Item ativado",
    DESATIVADO: "Item desativado",
    ANALISAR: "Marcado para análise",
    ITEM_ADICIONADO: "Item adicionado",
    REMOVIDO: "Item removido",
    REMOVIDO_POR_EXCLUSAO_MODELO: "Item removido do modelo",
    DESVINCULADO: "Rotina desvinculada",
    ANALISADO: "Item analisado",
    ANALISE_CARTORIO: "Análise do cartório",
  };
  return labels[action] ?? action.toLocaleLowerCase("pt-BR").replaceAll("_", " ").replace(/^./, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function hasStatusTransition(action: string, previous: boolean | null, next: boolean | null) {
  return previous !== null || next !== null || ["ATIVADO", "DESATIVADO", "ANALISAR"].includes(action);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function localDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function todayKey() {
  return localDateKey(new Date().toISOString());
}

function latestAnalysisDate(routine: CsCxOfficeRoutine) {
  return routine.items.map((item) => item.analyzed_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
