import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Database, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, XCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { CS_CX_APPOINTMENT_STATUSES, CS_CX_APPOINTMENT_TYPES, type CsCxAppointment, type CsCxAppointmentInput, useCsCxAppointments, useCsCxContacts } from "@/hooks/useCsCxEngagement";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = { REUNIAO: "Reunião", CALL: "Call", VISITA: "Visita", OUTRO: "Outro" };
const STATUS_LABELS: Record<string, string> = { AGENDADO: "Agendado", REALIZADO: "Realizado", CANCELADO: "Cancelado", REMARCADO: "Remarcado", CONCLUIDO: "Concluído" };

function defaultForm(): CsCxAppointmentInput {
  const starts = new Date(Date.now() + 60 * 60 * 1000);
  starts.setMinutes(Math.ceil(starts.getMinutes() / 15) * 15, 0, 0);
  return { title: "", starts_at: toDateTimeLocal(starts), duration_minutes: 60, appointment_type: "REUNIAO", status: "AGENDADO", registry_office_id: "", contact_id: "", responsible_profile_id: "", description: "", location: "", notes: "", result: "" };
}

export default function CsCxAppointments() {
  const { appointments, profiles, isLoading, error, refetch, saveAppointment, setAppointmentStatus, deleteAppointment } = useCsCxAppointments();
  const { contacts, error: contactsError } = useCsCxContacts();
  const { offices, error: officesError } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState<CsCxAppointmentInput>(defaultForm());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxAppointment | null>(null);
  const [action, setAction] = useState<{ appointment: CsCxAppointment; status: string } | null>(null);
  const [actionResult, setActionResult] = useState("");
  const [rescheduledAt, setRescheduledAt] = useState("");

  const canCreate = hasPermission("cs_cx_agendamentos", "create");
  const canEdit = hasPermission("cs_cx_agendamentos", "edit");
  const canDelete = hasPermission("cs_cx_agendamentos", "delete");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return appointments.filter((appointment) => {
      const matchesSearch = !term || [appointment.title, appointment.description, appointment.location, appointment.registry_office?.name, appointment.contact?.contact_person, appointment.responsible?.full_name]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      return matchesSearch && (statusFilter === "all" || appointment.status === statusFilter) && (typeFilter === "all" || appointment.appointment_type === typeFilter);
    });
  }, [appointments, search, statusFilter, typeFilter]);

  const openCreate = () => { setForm(defaultForm()); setDialogOpen(true); };
  const openEdit = (appointment: CsCxAppointment) => {
    setForm({ id: appointment.id, title: appointment.title, starts_at: toDateTimeLocal(new Date(appointment.starts_at)), duration_minutes: appointment.duration_minutes, appointment_type: appointment.appointment_type, status: appointment.status, registry_office_id: appointment.registry_office_id ?? "", contact_id: appointment.contact_id ?? "", responsible_profile_id: appointment.responsible_profile_id ?? "", description: appointment.description ?? "", location: appointment.location ?? "", notes: appointment.notes ?? "", result: appointment.result ?? "" });
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.starts_at || !form.responsible_profile_id) return;
    try { await saveAppointment.mutateAsync(form); setDialogOpen(false); toast({ title: "Agendamento salvo" }); }
    catch (mutationError) { toast({ title: "Não foi possível salvar", description: errorMessage(mutationError), variant: "destructive" }); }
  };

  const openAction = (appointment: CsCxAppointment, status: string) => {
    setAction({ appointment, status });
    setActionResult(appointment.result ?? "");
    setRescheduledAt(toDateTimeLocal(new Date(appointment.starts_at)));
  };

  const confirmAction = async () => {
    if (!action) return;
    try {
      await setAppointmentStatus.mutateAsync({ id: action.appointment.id, status: action.status, result: actionResult, startsAt: rescheduledAt });
      toast({ title: "Agendamento atualizado", description: STATUS_LABELS[action.status] });
      setAction(null);
    } catch (mutationError) { toast({ title: "Não foi possível atualizar", description: errorMessage(mutationError), variant: "destructive" }); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteAppointment.mutateAsync(deleting.id); setDeleting(null); toast({ title: "Agendamento excluído" }); }
    catch (mutationError) { toast({ title: "Não foi possível excluir", description: errorMessage(mutationError), variant: "destructive" }); }
  };

  const now = new Date();
  const upcoming = appointments.filter((item) => new Date(item.starts_at) >= now && ["AGENDADO", "REMARCADO"].includes(item.status)).length;
  const overdue = appointments.filter((item) => new Date(item.starts_at) < now && item.status === "AGENDADO").length;
  const dataError = error ?? contactsError ?? officesError;
  const availableContacts = contacts.filter((contact) => !form.registry_office_id || contact.registry_office_id === form.registry_office_id);

  return <div className="container mx-auto max-w-[1600px] space-y-6 p-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"><CalendarDays className="h-4 w-4" />CS/CX</div><h1 className="mt-1 text-3xl font-black tracking-tight">Agendamentos</h1><p className="text-sm text-muted-foreground">Agenda de reuniões, calls, visitas e demais compromissos.</p></div>{canCreate && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Novo agendamento</Button>}</div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Próximos" value={upcoming} icon={Clock3} /><Metric label="Vencidos" value={overdue} icon={XCircle} /><Metric label="Concluídos" value={appointments.filter((item) => ["REALIZADO", "CONCLUIDO"].includes(item.status)).length} icon={CheckCircle2} /></div>
    <Card><CardContent className="space-y-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_190px_180px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar título, cartório, local ou responsável..." className="pl-9" /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{CS_CX_APPOINTMENT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{CS_CX_APPOINTMENT_TYPES.map((type) => <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></div>
      {isLoading ? <LoadingRows /> : dataError ? <DataError error={dataError} onRetry={() => void refetch()} /> : <Tabs defaultValue="list"><TabsList><TabsTrigger value="list">Lista</TabsTrigger><TabsTrigger value="calendar">Calendário</TabsTrigger></TabsList><TabsContent value="list" className="mt-4"><AppointmentTable appointments={filtered} canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onAction={openAction} onDelete={setDeleting} /></TabsContent><TabsContent value="calendar" className="mt-4"><MonthCalendar month={month} onMonthChange={setMonth} appointments={filtered} onEdit={canEdit ? openEdit : undefined} /></TabsContent></Tabs>}
    </CardContent></Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{form.id ? "Editar agendamento" : "Novo agendamento"}</DialogTitle><DialogDescription>Informe data, responsável e contexto do compromisso.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Título *"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><Field label="Data e hora *"><Input required type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Tipo"><Select value={form.appointment_type} onValueChange={(value) => setForm({ ...form, appointment_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CS_CX_APPOINTMENT_TYPES.map((type) => <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></Field><Field label="Duração (min)"><Input type="number" min={1} value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })} /></Field><Field label="Responsável *"><Select value={form.responsible_profile_id} onValueChange={(value) => setForm({ ...form, responsible_profile_id: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.full_name || profile.email || "Usuário"}</SelectItem>)}</SelectContent></Select></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Cartório"><Select value={form.registry_office_id || "none"} onValueChange={(value) => setForm({ ...form, registry_office_id: value === "none" ? "" : value, contact_id: "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem cartório</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Contato"><Select value={form.contact_id || "none"} onValueChange={(value) => setForm({ ...form, contact_id: value === "none" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem contato</SelectItem>{availableContacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contact.contact_person} — {contact.registry_office?.name}</SelectItem>)}</SelectContent></Select></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Local"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CS_CX_APPOINTMENT_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select></Field></div>
      <Field label="Descrição"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label="Observações"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveAppointment.isPending}>{saveAppointment.isPending ? "Salvando..." : "Salvar agendamento"}</Button></DialogFooter>
    </form></DialogContent></Dialog>

    <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}><DialogContent><DialogHeader><DialogTitle>{action ? STATUS_LABELS[action.status] : "Atualizar"} agendamento</DialogTitle><DialogDescription>{action?.appointment.title}</DialogDescription></DialogHeader>{action?.status === "REMARCADO" && <Field label="Nova data e hora *"><Input type="datetime-local" value={rescheduledAt} onChange={(event) => setRescheduledAt(event.target.value)} /></Field>}{action && ["REALIZADO", "CONCLUIDO"].includes(action.status) && <Field label="Resultado"><Textarea value={actionResult} onChange={(event) => setActionResult(event.target.value)} /></Field>}<DialogFooter><Button variant="outline" onClick={() => setAction(null)}>Cancelar</Button><Button onClick={() => void confirmAction()} disabled={setAppointmentStatus.isPending}>{setAppointmentStatus.isPending ? "Atualizando..." : "Confirmar"}</Button></DialogFooter></DialogContent></Dialog>

    <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir agendamento?</AlertDialogTitle><AlertDialogDescription>Essa ação remove o compromisso do HUB. Dados importados podem reaparecer enquanto o legado for a fonte oficial.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function AppointmentTable({ appointments, canEdit, canDelete, onEdit, onAction, onDelete }: { appointments: CsCxAppointment[]; canEdit: boolean; canDelete: boolean; onEdit: (item: CsCxAppointment) => void; onAction: (item: CsCxAppointment, status: string) => void; onDelete: (item: CsCxAppointment) => void }) {
  return <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Compromisso</TableHead><TableHead>Cartório/Contato</TableHead><TableHead>Responsável</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead className="w-14" /></TableRow></TableHeader><TableBody>{appointments.length === 0 ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Nenhum agendamento encontrado.</TableCell></TableRow> : appointments.map((item) => <TableRow key={item.id}><TableCell className="whitespace-nowrap"><div className="font-medium">{formatDateTime(item.starts_at)}</div><div className="text-xs text-muted-foreground">{item.duration_minutes} min</div></TableCell><TableCell><div className="font-medium">{item.title}</div><div className="max-w-xs truncate text-xs text-muted-foreground">{item.location || item.description || "Sem detalhes"}</div></TableCell><TableCell><div>{item.registry_office?.name || "—"}</div><div className="text-xs text-muted-foreground">{item.contact?.contact_person || "Sem contato vinculado"}</div></TableCell><TableCell>{item.responsible?.full_name || item.responsible?.email || "Não vinculado"}</TableCell><TableCell><Badge variant="secondary">{TYPE_LABELS[item.appointment_type] ?? item.appointment_type}</Badge></TableCell><TableCell><StatusBadge appointment={item} /></TableCell><TableCell>{(canEdit || canDelete) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit && <><DropdownMenuItem onClick={() => onEdit(item)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onAction(item, "REALIZADO")}>Marcar realizado</DropdownMenuItem><DropdownMenuItem onClick={() => onAction(item, "CONCLUIDO")}>Concluir</DropdownMenuItem><DropdownMenuItem onClick={() => onAction(item, "REMARCADO")}>Remarcar</DropdownMenuItem><DropdownMenuItem onClick={() => onAction(item, "CANCELADO")} className="text-amber-700">Cancelar</DropdownMenuItem></>}{canDelete && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function MonthCalendar({ month, onMonthChange, appointments, onEdit }: { month: string; onMonthChange: (value: string) => void; appointments: CsCxAppointment[]; onEdit?: (item: CsCxAppointment) => void }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const days = new Date(year, monthNumber, 0).getDate();
  const slots: Array<number | null> = [...Array(firstDay.getDay()).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  return <div className="space-y-3"><div className="flex justify-end"><Input aria-label="Mês do calendário" type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} className="w-48" /></div><div className="grid grid-cols-7 overflow-hidden rounded-lg border">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <div key={day} className="border-b bg-muted/40 p-2 text-center text-xs font-semibold">{day}</div>)}{slots.map((day, index) => {
    const dateKey = day ? `${month}-${String(day).padStart(2, "0")}` : "";
    const items = day ? appointments.filter((item) => localDateKey(item.starts_at) === dateKey) : [];
    return <div key={`${day ?? "empty"}-${index}`} className={cn("min-h-28 border-b border-r p-1.5", !day && "bg-muted/20")}><span className="text-xs text-muted-foreground">{day}</span><div className="mt-1 space-y-1">{items.slice(0, 3).map((item) => <button key={item.id} type="button" onClick={() => onEdit?.(item)} className="w-full truncate rounded bg-rose-50 px-1.5 py-1 text-left text-[10px] text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200">{new Date(item.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {item.title}</button>)}{items.length > 3 && <p className="text-[10px] text-muted-foreground">+{items.length - 3} itens</p>}</div></div>;
  })}</div></div>;
}

function StatusBadge({ appointment }: { appointment: CsCxAppointment }) { const overdue = appointment.status === "AGENDADO" && new Date(appointment.starts_at) < new Date(); return <Badge variant="outline" className={cn(overdue && "border-red-200 bg-red-50 text-red-700", ["REALIZADO", "CONCLUIDO"].includes(appointment.status) && "border-emerald-200 bg-emerald-50 text-emerald-700", appointment.status === "CANCELADO" && "border-slate-200 bg-slate-100 text-slate-600", appointment.status === "REMARCADO" && "border-amber-200 bg-amber-50 text-amber-700")}>{overdue ? "Vencido" : STATUS_LABELS[appointment.status] ?? appointment.status}</Badge>; }
function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarDays }) { return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-rose-500" /></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function LoadingRows() { return <div className="space-y-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</div>; }
function DataError({ error, onRetry }: { error: unknown; onRetry: () => void }) { return <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"><Database className="h-8 w-8 text-muted-foreground" /><div><p className="font-medium">Base CS/CX ainda não disponível</p><p className="max-w-lg text-sm text-muted-foreground">Aplique as migrations desta branch antes de usar a tela. {errorMessage(error)}</p></div><Button variant="outline" size="sm" onClick={onRetry} className="gap-2"><RefreshCw className="h-4 w-4" />Tentar novamente</Button></div>; }
function toDateTimeLocal(date: Date) { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function localDateKey(value: string) { const date = new Date(value); const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
