import { useMemo, useState } from "react";
import { CalendarDays, Contact, Database, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { type CsCxContact, type CsCxContactInput, useCsCxContacts } from "@/hooks/useCsCxEngagement";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

const emptyForm: CsCxContactInput = {
  contact_date: new Date().toISOString().slice(0, 10),
  notes: "",
  pending_items: "",
  product_id: "",
  contact_person: "",
  contact_details: "",
  registry_office_id: "",
  ticket_number: "",
};

export default function CsCxContacts() {
  const { contacts, isLoading, error, refetch, saveContact, deleteContact } = useCsCxContacts();
  const { offices, products, error: referenceError } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState<CsCxContactInput>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxContact | null>(null);

  const canCreate = hasPermission("cs_cx_contatos", "create");
  const canEdit = hasPermission("cs_cx_contatos", "edit");
  const canDelete = hasPermission("cs_cx_contatos", "delete");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return contacts.filter((contact) => {
      const matchesSearch = !term || [contact.contact_person, contact.contact_details, contact.notes, contact.pending_items, contact.ticket_number, contact.registry_office?.name, contact.product?.name]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      return matchesSearch
        && (officeFilter === "all" || contact.registry_office_id === officeFilter)
        && (productFilter === "all" || contact.product_id === productFilter)
        && (!dateFrom || contact.contact_date >= dateFrom)
        && (!dateTo || contact.contact_date <= dateTo);
    });
  }, [contacts, search, officeFilter, productFilter, dateFrom, dateTo]);

  const openCreate = () => {
    setForm({ ...emptyForm, contact_date: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  };

  const openEdit = (contact: CsCxContact) => {
    setForm({
      id: contact.id,
      contact_date: contact.contact_date,
      notes: contact.notes ?? "",
      pending_items: contact.pending_items ?? "",
      product_id: contact.product_id,
      contact_person: contact.contact_person,
      contact_details: contact.contact_details ?? "",
      registry_office_id: contact.registry_office_id,
      ticket_number: contact.ticket_number ?? "",
    });
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.contact_person.trim() || !form.registry_office_id || !form.product_id) return;
    try {
      await saveContact.mutateAsync(form);
      setDialogOpen(false);
      toast({ title: "Contato salvo", description: "A interação foi registrada com sucesso." });
    } catch (mutationError) {
      toast({ title: "Não foi possível salvar", description: errorMessage(mutationError), variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteContact.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Contato excluído" });
    } catch (mutationError) {
      toast({ title: "Não foi possível excluir", description: errorMessage(mutationError), variant: "destructive" });
    }
  };

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const recentCount = contacts.filter((item) => new Date(`${item.contact_date}T00:00:00`) >= last30Days).length;

  return <div className="container mx-auto max-w-7xl space-y-6 p-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"><Contact className="h-4 w-4" />CS/CX</div><h1 className="mt-1 text-3xl font-black tracking-tight">Contatos</h1><p className="text-sm text-muted-foreground">Histórico de relacionamento, anotações e pendências dos cartórios.</p></div>{canCreate && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Novo contato</Button>}</div>

    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Contatos" value={contacts.length} icon={Contact} /><Metric label="Últimos 30 dias" value={recentCount} icon={CalendarDays} /><Metric label="Com pendências" value={contacts.filter((item) => !!item.pending_items?.trim()).length} icon={TriangleAlert} /></div>

    <Card><CardContent className="space-y-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_190px_150px_150px]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pessoa, cartório, produto ou chamado..." className="pl-9" /></div>
        <Select value={officeFilter} onValueChange={setOfficeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cartórios</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select>
        <Select value={productFilter} onValueChange={setProductFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os produtos</SelectItem>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select>
        <Input aria-label="Data inicial" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input aria-label="Data final" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>

      {isLoading ? <LoadingRows /> : (error ?? referenceError) ? <DataError error={error ?? referenceError} onRetry={() => void refetch()} /> : <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cartório</TableHead><TableHead>Pessoa</TableHead><TableHead>Produto</TableHead><TableHead>Anotações</TableHead><TableHead>Pendências</TableHead><TableHead className="w-14" /></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Nenhum contato encontrado.</TableCell></TableRow> : filtered.map((contact) => <TableRow key={contact.id}><TableCell className="whitespace-nowrap">{formatDate(contact.contact_date)}</TableCell><TableCell><div className="font-medium">{contact.registry_office?.name ?? "—"}</div>{contact.ticket_number && <span className="text-xs text-muted-foreground">Chamado {contact.ticket_number}</span>}</TableCell><TableCell><div>{contact.contact_person}</div><div className="text-xs text-muted-foreground">{contact.contact_details || "Contato não informado"}</div></TableCell><TableCell><Badge variant="secondary">{contact.product?.name ?? "—"}</Badge></TableCell><TableCell><p className="max-w-xs whitespace-pre-wrap text-sm">{contact.notes || "—"}</p></TableCell><TableCell><p className="max-w-xs whitespace-pre-wrap text-sm text-amber-700 dark:text-amber-300">{contact.pending_items || "—"}</p></TableCell><TableCell>{(canEdit || canDelete) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit && <DropdownMenuItem onClick={() => openEdit(contact)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}{canDelete && <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(contact)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}</TableCell></TableRow>)}</TableBody></Table></div>}
    </CardContent></Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{form.id ? "Editar contato" : "Novo contato"}</DialogTitle><DialogDescription>Registre a interação e qualquer pendência identificada.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Cartório *"><Select value={form.registry_office_id} onValueChange={(value) => setForm({ ...form, registry_office_id: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{offices.filter((office) => office.active || office.id === form.registry_office_id).map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Produto *"><Select value={form.product_id} onValueChange={(value) => setForm({ ...form, product_id: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Data *"><Input required type="date" value={form.contact_date} onChange={(event) => setForm({ ...form, contact_date: event.target.value })} /></Field><Field label="Chamado"><Input value={form.ticket_number} onChange={(event) => setForm({ ...form, ticket_number: event.target.value })} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Pessoa de contato *"><Input required value={form.contact_person} onChange={(event) => setForm({ ...form, contact_person: event.target.value })} /></Field><Field label="Telefone/e-mail"><Input value={form.contact_details} onChange={(event) => setForm({ ...form, contact_details: event.target.value })} /></Field></div>
      <Field label="Anotações"><Textarea className="min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field><Field label="Pendências"><Textarea className="min-h-20" value={form.pending_items} onChange={(event) => setForm({ ...form, pending_items: event.target.value })} /></Field>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveContact.isPending}>{saveContact.isPending ? "Salvando..." : "Salvar contato"}</Button></DialogFooter>
    </form></DialogContent></Dialog>

    <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este contato?</AlertDialogTitle><AlertDialogDescription>Agendamentos vinculados manterão o histórico, mas perderão a referência para este contato.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Contact }) { return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-rose-500" /></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function LoadingRows() { return <div className="space-y-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</div>; }
function DataError({ error, onRetry }: { error: unknown; onRetry: () => void }) { return <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"><Database className="h-8 w-8 text-muted-foreground" /><div><p className="font-medium">Base CS/CX ainda não disponível</p><p className="max-w-lg text-sm text-muted-foreground">Aplique as migrations desta branch antes de usar a tela. {errorMessage(error)}</p></div><Button variant="outline" size="sm" onClick={onRetry} className="gap-2"><RefreshCw className="h-4 w-4" />Tentar novamente</Button></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
