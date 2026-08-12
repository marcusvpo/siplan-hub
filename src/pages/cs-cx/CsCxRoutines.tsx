import { useMemo, useState } from "react";
import { Activity, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Database, ListChecks, Pencil, Plus, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { type CsCxOfficeRoutine, type CsCxRoutineItemConfig, useCsCxRoutines } from "@/hooks/useCsCxRoutines";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  { value: "analisar", label: "Analisar" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
] as const;

export default function CsCxRoutines() {
  const { models, routines, isLoading, error, refetch, applyRoutine, setRoutineItem, deleteRoutine } = useCsCxRoutines();
  const { offices } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({ registryOfficeId: "", routineModelId: "", notes: "" });
  const [editingItem, setEditingItem] = useState<{ routine: CsCxOfficeRoutine; item: CsCxRoutineItemConfig } | null>(null);
  const [itemStatus, setItemStatus] = useState("analisar");
  const [itemNotes, setItemNotes] = useState("");
  const [deleting, setDeleting] = useState<CsCxOfficeRoutine | null>(null);

  const canCreate = hasPermission("cs_cx_rotinas", "create");
  const canEdit = hasPermission("cs_cx_rotinas", "edit");
  const canDelete = hasPermission("cs_cx_rotinas", "delete");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return routines.filter((routine) => {
      const matchesTerm = !term || [routine.registry_office?.name, routine.routine_model?.name, routine.notes]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      return matchesTerm && (officeFilter === "all" || routine.registry_office_id === officeFilter);
    });
  }, [officeFilter, routines, search]);

  const totals = useMemo(() => {
    const items = routines.flatMap((routine) => routine.items);
    return {
      applications: routines.length,
      active: items.filter((item) => item.active === true).length,
      inactive: items.filter((item) => item.active === false).length,
      pending: items.filter((item) => item.active === null).length,
    };
  }, [routines]);

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
  }

  async function handleItemSave() {
    if (!editingItem) return;
    try {
      await setRoutineItem.mutateAsync({
        id: editingItem.item.id,
        active: itemStatus === "ativo" ? true : itemStatus === "inativo" ? false : null,
        analysisNotes: itemNotes,
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

  if (isLoading) return <div className="container mx-auto max-w-7xl space-y-4 p-6"><Skeleton className="h-28 w-full" /><Skeleton className="h-80 w-full" /></div>;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"><ListChecks className="h-4 w-4" />CS/CX</div><h1 className="mt-1 text-3xl font-black tracking-tight">Rotinas</h1><p className="text-sm text-muted-foreground">Modelos aplicados aos cartórios, análise dos itens e histórico operacional.</p></div>
        {canCreate && <Button onClick={() => setApplyOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Aplicar rotina</Button>}
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between gap-4 pt-6"><div className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(error)}</div><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Database} label="Aplicações" value={totals.applications} />
        <Metric icon={CheckCircle2} label="Itens ativos" value={totals.active} />
        <Metric icon={Activity} label="Itens inativos" value={totals.inactive} />
        <Metric icon={ClipboardCheck} label="A analisar" value={totals.pending} />
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList><TabsTrigger value="applications">Aplicações</TabsTrigger><TabsTrigger value="models">Modelos</TabsTrigger></TabsList>
        <TabsContent value="applications" className="space-y-4">
          <Card><CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_280px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cartório, modelo ou observação..." className="pl-9" /></div><Select value={officeFilter} onValueChange={setOfficeFilter}><SelectTrigger><SelectValue placeholder="Todos os cartórios" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cartórios</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>

          <div className="space-y-3">
            {filtered.map((routine) => {
              const isExpanded = expanded === routine.id;
              const analyzed = routine.items.filter((item) => item.active !== null).length;
              return <Card key={routine.id}>
                <CardHeader className="pb-3"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><CardTitle className="text-base">{routine.registry_office?.name ?? "Cartório removido"}</CardTitle><CardDescription>{routine.routine_model?.name ?? "Modelo removido"} · {analyzed}/{routine.items.length} itens analisados · aplicado em {formatDate(routine.applied_at)}</CardDescription></div><div className="flex gap-2">{routine.origin === "legacy" && <Badge variant="outline">Legado</Badge>}<Button variant="outline" size="sm" onClick={() => setExpanded(isExpanded ? null : routine.id)}>{isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}{isExpanded ? "Ocultar" : "Analisar"}</Button>{canDelete && <Button variant="ghost" size="icon" aria-label="Desvincular rotina" onClick={() => setDeleting(routine)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div></CardHeader>
                {isExpanded && <CardContent className="space-y-2 border-t pt-4">{routine.notes && <p className="mb-3 text-sm text-muted-foreground">{routine.notes}</p>}{routine.items.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 md:flex-row md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.model_item?.name ?? "Item removido"}</span>{item.model_item?.required && <Badge variant="secondary">Obrigatório</Badge>}{item.model_item?.category && <Badge variant="outline" style={{ borderColor: item.model_item.category.display_color }}>{item.model_item.category.name}</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{item.model_item?.routine_type?.name}{item.analysis_notes ? ` · ${item.analysis_notes}` : ""}</p></div><div className="flex items-center gap-2"><StatusBadge active={item.active} />{canEdit && <Button variant="ghost" size="sm" onClick={() => openItem(routine, item)}><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button>}</div></div>)}</CardContent>}
              </Card>;
            })}
            {!filtered.length && <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma rotina encontrada.</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="models" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => <Card key={model.id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{model.name}</CardTitle><CardDescription className="mt-1">{model.description || "Sem descrição"}</CardDescription></div><Badge variant={model.active ? "default" : "secondary"}>{model.active ? "Ativo" : "Inativo"}</Badge></div></CardHeader><CardContent className="space-y-3"><p className="text-sm"><strong>{model.item_count}</strong> itens configurados</p><div className="flex flex-wrap gap-1">{model.products.map((product) => <Badge key={product.id} variant="outline">{product.name}</Badge>)}</div></CardContent></Card>)}
        </TabsContent>
      </Tabs>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}><DialogContent><DialogHeader><DialogTitle>Aplicar rotina</DialogTitle><DialogDescription>Vincule um modelo e todos os seus itens a um cartório.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Cartório</Label><Select value={applyForm.registryOfficeId} onValueChange={(value) => setApplyForm((current) => ({ ...current, registryOfficeId: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Modelo</Label><Select value={applyForm.routineModelId} onValueChange={(value) => setApplyForm((current) => ({ ...current, routineModelId: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{models.filter((model) => model.active).map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="routine-notes">Observações</Label><Textarea id="routine-notes" value={applyForm.notes} onChange={(event) => setApplyForm((current) => ({ ...current, notes: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setApplyOpen(false)}>Cancelar</Button><Button disabled={!applyForm.registryOfficeId || !applyForm.routineModelId || applyRoutine.isPending} onClick={handleApply}>Aplicar</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}><DialogContent><DialogHeader><DialogTitle>Analisar item</DialogTitle><DialogDescription>{editingItem?.routine.registry_office?.name} · {editingItem?.item.model_item?.name}</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Status</Label><Select value={itemStatus} onValueChange={setItemStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="analysis-notes">Observação da análise</Label><Textarea id="analysis-notes" value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button><Button disabled={setRoutineItem.isPending} onClick={handleItemSave}>Salvar análise</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desvincular rotina?</AlertDialogTitle><AlertDialogDescription>O vínculo com {deleting?.registry_office?.name}, suas análises e configurações serão excluídos do HUB.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Desvincular</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-3 pt-6"><div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40"><Icon className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p></div></CardContent></Card>;
}

function StatusBadge({ active }: { active: boolean | null }) {
  if (active === true) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Ativo</Badge>;
  if (active === false) return <Badge variant="destructive">Inativo</Badge>;
  return <Badge variant="secondary">Analisar</Badge>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
