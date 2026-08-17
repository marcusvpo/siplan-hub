import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, FileDown, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { generateCsCxVisitsPdf } from "@/lib/cs-cx-experience-pdf";
import CsCxVisitDetails from "@/pages/cs-cx/CsCxVisitDetails";

const STATUS_LABELS: Record<string, string> = { aberto: "Aberta", emandamento: "Em andamento", concluido: "Concluída", reaberto: "Reaberta" };
const emptyForm: CsCxVisitInput = { registry_office_id: "", visitor_profile_id: "", visit_date: new Date().toISOString().slice(0, 10), start_time: "", end_time: "", status: "aberto", objective: "", general_notes: "" };
const DEFAULT_PAGE_SIZE = 5;

export default function CsCxVisits() {
  const { visits, profiles, isLoading, error, refetch, saveVisit, setVisitStatus, deleteVisit } = useCsCxVisits();
  const { offices } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<CsCxVisitInput>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxVisit | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canCreate = hasPermission("cs_cx_visitas", "create");
  const canEdit = hasPermission("cs_cx_visitas", "edit");
  const canDelete = hasPermission("cs_cx_visitas", "delete");
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return visits.filter((visit) => (!term || [visit.registry_office?.name, visit.objective, visit.general_notes, visit.visitor?.full_name].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)))
      && (statusFilter === "all" || visit.status === statusFilter)
      && (!dateFrom || visit.visit_date >= dateFrom)
      && (!dateTo || visit.visit_date <= dateTo));
  }, [dateFrom, dateTo, search, statusFilter, visits]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedVisits = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filtered, pageSize],
  );
  const updateSearch = (value: string) => { setSearch(value); setPage(1); };
  const updateStatusFilter = (value: string) => { setStatusFilter(value); setPage(1); };
  const updateDateFrom = (value: string) => { setDateFrom(value); setPage(1); };
  const updateDateTo = (value: string) => { setDateTo(value); setPage(1); };
  const updatePageSize = (value: string) => { setPageSize(Number(value)); setPage(1); };
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
  async function handleExport() {
    setIsExporting(true);
    try {
      const filters = [statusFilter === "all" ? "Todos os status" : `Status: ${STATUS_LABELS[statusFilter] ?? statusFilter}`, search.trim() ? `Busca: ${search.trim()}` : "Sem filtro de busca", dateFrom ? `De ${formatDate(dateFrom)}` : "Sem data inicial", dateTo ? `Até ${formatDate(dateTo)}` : "Sem data final"];
      await generateCsCxVisitsPdf(filtered, filters.join(" · "));
    } catch (exportError) { toast({ title: "Não foi possível gerar o PDF", description: messageOf(exportError), variant: "destructive" }); }
    finally { setIsExporting(false); }
  }

  if (isLoading) return <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-72 w-full" /></div>;
  return <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><MapPin className="h-4 w-4" /></span><div><h1 className="text-2xl font-black leading-none tracking-tight">Visitas</h1><p className="mt-1 text-xs text-muted-foreground">Planejamento, execução, checklist e pendências das visitas aos cartórios</p></div></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!filtered.length || isExporting} onClick={handleExport}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button>{canCreate && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova visita</Button>}</div></div>
    {error && <Card className="border-destructive/40"><CardContent className="flex items-center justify-between gap-3 p-3"><span className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="h-4 w-4" />{messageOf(error)}</span><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>}
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CalendarDays} label="Total de visitas" value={visits.length} /><Metric icon={MapPin} label="Em acompanhamento" value={openCount} /><Metric icon={ClipboardList} label="Pendências abertas" value={pendingCount} /><Metric icon={CheckCircle2} label="Itens verificados" value={checklistCount} /></div>
    <Card><CardContent className="grid gap-2 p-3 lg:grid-cols-[minmax(260px,1fr)_200px_155px_155px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="h-9 pl-9" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Buscar cartório, objetivo ou visitante..." /></div><Select value={statusFilter} onValueChange={updateStatusFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{CS_CX_VISIT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select><Input className="h-9" aria-label="Data inicial da visita" type="date" value={dateFrom} onChange={(event) => updateDateFrom(event.target.value)} /><Input className="h-9" aria-label="Data final da visita" type="date" value={dateTo} onChange={(event) => updateDateTo(event.target.value)} /></CardContent></Card>
    <div className="space-y-2">{pagedVisits.map((visit) => { const isExpanded = expanded === visit.id; return <Card key={visit.id}><CardHeader className="px-4 py-3"><div className="flex flex-col justify-between gap-2 md:flex-row md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><CardTitle className="max-w-80 truncate text-sm" title={visit.registry_office?.name ?? "Cartório removido"}>{visit.registry_office?.name ?? "Cartório removido"}</CardTitle><Badge variant={visit.status === "concluido" ? "default" : "secondary"} className="h-5 px-1.5 text-[10px] font-normal">{STATUS_LABELS[visit.status] ?? visit.status}</Badge>{visit.origin === "legacy" && <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">Legado</Badge>}</div><CardDescription className="mt-0.5 text-xs">{formatDate(visit.visit_date)}{visit.start_time ? ` · ${visit.start_time.slice(0, 5)}` : ""} · {visit.visitor?.full_name ?? "Sem visitante"}</CardDescription><p className="mt-1 max-w-3xl truncate text-xs" title={visit.objective}>{visit.objective}</p></div><div className="flex flex-wrap items-center gap-1.5">{canEdit && <Select value={visit.status} onValueChange={(status) => handleStatus(visit.id, status)}><SelectTrigger className="h-8 w-[145px] text-xs"><SelectValue /></SelectTrigger><SelectContent>{CS_CX_VISIT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select>}<Button variant="outline" size="sm" className="h-8" onClick={() => setExpanded(isExpanded ? null : visit.id)}>{isExpanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}Detalhes</Button>{canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar visita" onClick={() => openEdit(visit)}><Pencil className="h-4 w-4" /></Button>}{canDelete && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Excluir visita" onClick={() => setDeleting(visit)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div></CardHeader>{isExpanded && <CardContent className="border-t p-3"><CsCxVisitDetails visit={visit} canEdit={canEdit} canDelete={canDelete} /></CardContent>}</Card>; })}{!filtered.length && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma visita encontrada.</CardContent></Card>}</div>
    <VisitPaginationBar currentPage={currentPage} pageSize={pageSize} totalItems={filtered.length} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={updatePageSize} />
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{form.id ? "Editar visita" : "Nova visita"}</DialogTitle><DialogDescription>Registre o planejamento e o responsável pela visita.</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-2"><Field label="Cartório"><Select value={form.registry_office_id} onValueChange={(value) => setForm((current) => ({ ...current, registry_office_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Visitante"><Select value={form.visitor_profile_id || "current"} onValueChange={(value) => setForm((current) => ({ ...current, visitor_profile_id: value === "current" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="current">Usuário atual</SelectItem>{profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.full_name || "Sem nome"}</SelectItem>)}</SelectContent></Select></Field><Field label="Data"><Input type="date" value={form.visit_date} onChange={(event) => setForm((current) => ({ ...current, visit_date: event.target.value }))} /></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CS_CX_VISIT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select></Field><Field label="Início"><Input type="time" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} /></Field><Field label="Fim"><Input type="time" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} /></Field><div className="md:col-span-2"><Label htmlFor="visit-objective">Objetivo</Label><Textarea id="visit-objective" value={form.objective} onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))} /></div><div className="md:col-span-2"><Label htmlFor="visit-notes">Observações gerais</Label><Textarea id="visit-notes" value={form.general_notes} onChange={(event) => setForm((current) => ({ ...current, general_notes: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button disabled={!form.registry_office_id || !form.visit_date || !form.objective.trim() || saveVisit.isPending} onClick={handleSave}>Salvar</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir visita?</AlertDialogTitle><AlertDialogDescription>Checklist, pendências e anexos vinculados também serão removidos do HUB.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-2.5 px-3 py-2.5"><div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40"><Icon className="h-4 w-4" /></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-black leading-6">{value}</p></div></CardContent></Card>; }
function VisitPaginationBar({ currentPage, pageSize, totalItems, totalPages, onPageChange, onPageSizeChange }: { currentPage: number; pageSize: number; totalItems: number; totalPages: number; onPageChange: (page: number) => void; onPageSizeChange: (size: string) => void }) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  return <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} visitas`}>Mostrando <strong className="font-semibold text-foreground">{firstItem}–{lastItem}</strong> de <strong className="font-semibold text-foreground">{totalItems}</strong></span><div className="flex flex-wrap items-center gap-2"><span>Por página</span><Select value={String(pageSize)} onValueChange={onPageSizeChange}><SelectTrigger aria-label="Visitas por página" className="h-8 w-[72px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><span className="min-w-[92px] text-center">Página {currentPage} de {totalPages}</span><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Próxima página" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label>{label}</Label>{children}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`)); }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
