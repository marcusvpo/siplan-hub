import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { CS_CX_VISIT_STATUSES, type CsCxVisit, type CsCxVisitInput, useCsCxVisits } from "@/hooks/useCsCxExperience";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = { aberto: "Aberta", emandamento: "Em andamento", concluido: "Concluída", reaberto: "Reaberta" };
const emptyForm: CsCxVisitInput = { registry_office_id: "", visitor_profile_id: "", visit_date: new Date().toISOString().slice(0, 10), start_time: "", end_time: "", status: "aberto", objective: "", general_notes: "" };

export default function CsCxVisits() {
  const { visits, profiles, isLoading, error, refetch, saveVisit, setVisitStatus, toggleChecklist, deleteVisit } = useCsCxVisits();
  const { offices } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<CsCxVisitInput>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxVisit | null>(null);

  const canCreate = hasPermission("cs_cx_visitas", "create");
  const canEdit = hasPermission("cs_cx_visitas", "edit");
  const canDelete = hasPermission("cs_cx_visitas", "delete");
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return visits.filter((visit) => (!term || [visit.registry_office?.name, visit.objective, visit.general_notes, visit.visitor?.full_name].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term))) && (statusFilter === "all" || visit.status === statusFilter));
  }, [search, statusFilter, visits]);
  const openCount = visits.filter((visit) => visit.status !== "concluido").length;
  const pendingCount = visits.flatMap((visit) => visit.pending_items).filter((item) => item.status !== "resolvida").length;
  const checklistCount = visits.flatMap((visit) => visit.checklist).filter((item) => item.checked).length;

  function openCreate() { setForm(emptyForm); setDialogOpen(true); }
  function openEdit(visit: CsCxVisit) { setForm({ id: visit.id, registry_office_id: visit.registry_office_id, visitor_profile_id: visit.visitor_profile_id ?? "", visit_date: visit.visit_date, start_time: visit.start_time?.slice(0, 5) ?? "", end_time: visit.end_time?.slice(0, 5) ?? "", status: visit.status, objective: visit.objective, general_notes: visit.general_notes ?? "" }); setDialogOpen(true); }

  async function handleSave() {
    try { await saveVisit.mutateAsync(form); setDialogOpen(false); toast({ title: form.id ? "Visita atualizada" : "Visita criada" }); }
    catch (mutationError) { toast({ title: "Não foi possível salvar", description: messageOf(mutationError), variant: "destructive" }); }
  }
  async function handleStatus(id: string, status: string) {
    try { await setVisitStatus.mutateAsync({ id, status }); toast({ title: "Status atualizado" }); }
    catch (mutationError) { toast({ title: "Não foi possível atualizar", description: messageOf(mutationError), variant: "destructive" }); }
  }
  async function handleDelete() {
    if (!deleting) return;
    try { await deleteVisit.mutateAsync(deleting.id); setDeleting(null); toast({ title: "Visita excluída" }); }
    catch (mutationError) { toast({ title: "Não foi possível excluir", description: messageOf(mutationError), variant: "destructive" }); }
  }

  if (isLoading) return <div className="container mx-auto max-w-7xl space-y-4 p-6"><Skeleton className="h-28 w-full" /><Skeleton className="h-80 w-full" /></div>;
  return <div className="container mx-auto max-w-7xl space-y-6 p-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"><MapPin className="h-4 w-4" />CS/CX</div><h1 className="mt-1 text-3xl font-black tracking-tight">Visitas</h1><p className="text-sm text-muted-foreground">Planejamento, execução, checklist e pendências das visitas aos cartórios.</p></div>{canCreate && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova visita</Button>}</div>
    {error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between pt-6"><span className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(error)}</span><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CalendarDays} label="Total de visitas" value={visits.length} /><Metric icon={MapPin} label="Em acompanhamento" value={openCount} /><Metric icon={ClipboardList} label="Pendências abertas" value={pendingCount} /><Metric icon={CheckCircle2} label="Itens verificados" value={checklistCount} /></div>
    <Card><CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_240px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cartório, objetivo ou visitante..." /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{CS_CX_VISIT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select></CardContent></Card>
    <div className="space-y-3">{filtered.map((visit) => { const isExpanded = expanded === visit.id; return <Card key={visit.id}><CardHeader className="pb-3"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-base">{visit.registry_office?.name ?? "Cartório removido"}</CardTitle><Badge variant={visit.status === "concluido" ? "default" : "secondary"}>{STATUS_LABELS[visit.status] ?? visit.status}</Badge>{visit.origin === "legacy" && <Badge variant="outline">Legado</Badge>}</div><CardDescription className="mt-1">{formatDate(visit.visit_date)}{visit.start_time ? ` · ${visit.start_time.slice(0, 5)}` : ""} · {visit.visitor?.full_name ?? "Sem visitante"}</CardDescription><p className="mt-2 text-sm">{visit.objective}</p></div><div className="flex flex-wrap gap-2">{canEdit && <Select value={visit.status} onValueChange={(status) => handleStatus(visit.id, status)}><SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{CS_CX_VISIT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select>}<Button variant="outline" size="sm" onClick={() => setExpanded(isExpanded ? null : visit.id)}>{isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}Detalhes</Button>{canEdit && <Button variant="ghost" size="icon" aria-label="Editar visita" onClick={() => openEdit(visit)}><Pencil className="h-4 w-4" /></Button>}{canDelete && <Button variant="ghost" size="icon" aria-label="Excluir visita" onClick={() => setDeleting(visit)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div></CardHeader>{isExpanded && <CardContent className="grid gap-5 border-t pt-4 lg:grid-cols-2"><section><h3 className="mb-3 text-sm font-bold">Checklist ({visit.checklist.filter((item) => item.checked).length}/{visit.checklist.length})</h3><div className="space-y-2">{visit.checklist.map((item) => <label key={item.id} className="flex gap-3 rounded-lg border p-3 text-sm"><Checkbox checked={item.checked} disabled={!canEdit || toggleChecklist.isPending} onCheckedChange={(checked) => toggleChecklist.mutate({ id: item.id, checked: checked === true })} /><span><strong>{item.name}</strong>{item.notes && <span className="block text-xs text-muted-foreground">{item.notes}</span>}</span></label>)}{!visit.checklist.length && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}</div></section><section><h3 className="mb-3 text-sm font-bold">Pendências ({visit.pending_items.length})</h3><div className="space-y-2">{visit.pending_items.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm">{item.title}</strong><Badge variant={item.priority === "critica" ? "destructive" : "outline"}>{item.priority}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.description}</p>{item.request_id && <Badge className="mt-2" variant="secondary">Solicitação gerada</Badge>}</div>)}{!visit.pending_items.length && <p className="text-sm text-muted-foreground">Nenhuma pendência registrada.</p>}</div></section>{visit.general_notes && <p className="text-sm text-muted-foreground lg:col-span-2"><strong>Observações:</strong> {visit.general_notes}</p>}</CardContent>}</Card>; })}{!filtered.length && <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma visita encontrada.</CardContent></Card>}</div>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{form.id ? "Editar visita" : "Nova visita"}</DialogTitle><DialogDescription>Registre o planejamento e o responsável pela visita.</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-2"><Field label="Cartório"><Select value={form.registry_office_id} onValueChange={(value) => setForm((current) => ({ ...current, registry_office_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Visitante"><Select value={form.visitor_profile_id || "current"} onValueChange={(value) => setForm((current) => ({ ...current, visitor_profile_id: value === "current" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="current">Usuário atual</SelectItem>{profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.full_name || "Sem nome"}</SelectItem>)}</SelectContent></Select></Field><Field label="Data"><Input type="date" value={form.visit_date} onChange={(event) => setForm((current) => ({ ...current, visit_date: event.target.value }))} /></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CS_CX_VISIT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select></Field><Field label="Início"><Input type="time" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} /></Field><Field label="Fim"><Input type="time" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} /></Field><div className="md:col-span-2"><Label htmlFor="visit-objective">Objetivo</Label><Textarea id="visit-objective" value={form.objective} onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))} /></div><div className="md:col-span-2"><Label htmlFor="visit-notes">Observações gerais</Label><Textarea id="visit-notes" value={form.general_notes} onChange={(event) => setForm((current) => ({ ...current, general_notes: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button disabled={!form.registry_office_id || !form.visit_date || !form.objective.trim() || saveVisit.isPending} onClick={handleSave}>Salvar</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir visita?</AlertDialogTitle><AlertDialogDescription>Checklist, pendências e anexos vinculados também serão removidos do HUB.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-3 pt-6"><Icon className="h-5 w-5 text-rose-600" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p></div></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label>{label}</Label>{children}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`)); }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
