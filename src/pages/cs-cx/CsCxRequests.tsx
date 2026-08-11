import { useMemo, useState } from "react";
import {
  CalendarClock,
  ClipboardList,
  Columns3,
  Database,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CS_CX_REQUEST_STATUSES,
  type CsCxRequest,
  type CsCxRequestInput,
  useCsCxRegistryOffices,
  useCsCxRequests,
} from "@/hooks/useCsCxCore";
import { cn } from "@/lib/utils";

const emptyForm: CsCxRequestInput = {
  ticket_number: "",
  description: "",
  module: "",
  requester: "",
  responsible: "",
  requested_on: "",
  expected_delivery_on: "",
  delivered_on: "",
  status: "Aguardando",
  notes: "",
  registry_office_id: "",
};

export default function CsCxRequests() {
  const { requests, isLoading, error, refetch, saveRequest, updateStatus, deleteRequest } = useCsCxRequests();
  const { offices, error: officesError } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [form, setForm] = useState<CsCxRequestInput>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxRequest | null>(null);

  const canCreate = hasPermission("cs_cx_registros", "create");
  const canEdit = hasPermission("cs_cx_registros", "edit");
  const canDelete = hasPermission("cs_cx_registros", "delete");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return requests.filter((request) => {
      const matchesSearch = !term || [request.ticket_number, request.description, request.module, request.requester, request.responsible, request.registry_office?.name]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesOffice = officeFilter === "all" || request.registry_office_id === officeFilter;
      return matchesSearch && matchesStatus && matchesOffice;
    });
  }, [requests, search, statusFilter, officeFilter]);

  const openCreate = () => {
    setForm({ ...emptyForm, requested_on: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  };

  const openEdit = (request: CsCxRequest) => {
    setForm({
      id: request.id,
      ticket_number: request.ticket_number ?? "",
      description: request.description ?? "",
      module: request.module ?? "",
      requester: request.requester ?? "",
      responsible: request.responsible ?? "",
      requested_on: request.requested_on ?? "",
      expected_delivery_on: request.expected_delivery_on ?? "",
      delivered_on: request.delivered_on ?? "",
      status: request.status ?? "Aguardando",
      notes: request.notes ?? "",
      registry_office_id: request.registry_office_id,
    });
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.description.trim() || !form.registry_office_id) return;
    try {
      await saveRequest.mutateAsync(form);
      setDialogOpen(false);
      toast({ title: "Solicitação salva", description: "Os dados foram atualizados com sucesso." });
    } catch (mutationError) {
      toast({ title: "Não foi possível salvar", description: errorMessage(mutationError), variant: "destructive" });
    }
  };

  const changeStatus = async (request: CsCxRequest, status: string) => {
    if (status === request.status) return;
    try {
      await updateStatus.mutateAsync({ id: request.id, status });
      toast({ title: "Status atualizado", description: `${request.ticket_number || "Solicitação"}: ${status}` });
    } catch (mutationError) {
      toast({ title: "Não foi possível atualizar", description: errorMessage(mutationError), variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteRequest.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Solicitação excluída" });
    } catch (mutationError) {
      toast({ title: "Não foi possível excluir", description: errorMessage(mutationError), variant: "destructive" });
    }
  };

  const dataError = error ?? officesError;

  return (
    <div className="container mx-auto max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"><ClipboardList className="h-4 w-4" /> CS/CX</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Solicitações</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento dos registros operacionais dos cartórios.</p>
        </div>
        {canCreate && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova solicitação</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total" value={requests.length} />
        <Metric label="Aguardando" value={requests.filter((item) => item.status === "Aguardando").length} />
        <Metric label="Em execução" value={requests.filter((item) => ["Projeto", "Desenvolvimento", "Em andamento"].includes(item.status ?? "")).length} />
        <Metric label="Finalizadas" value={requests.filter((item) => item.status === "Finalizado").length} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_260px]">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar chamado, descrição, módulo ou responsável..." className="pl-9" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{CS_CX_REQUEST_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
            <Select value={officeFilter} onValueChange={setOfficeFilter}><SelectTrigger><SelectValue placeholder="Todos os cartórios" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cartórios</SelectItem>{offices.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select>
          </div>

          {isLoading ? <LoadingRows /> : dataError ? <DataError error={dataError} onRetry={() => void refetch()} /> : (
            <Tabs defaultValue="list">
              <TabsList><TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" />Lista</TabsTrigger><TabsTrigger value="board" className="gap-2"><Columns3 className="h-4 w-4" />Quadro</TabsTrigger></TabsList>
              <TabsContent value="list" className="mt-4"><RequestTable requests={filtered} canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onDelete={setDeleting} /></TabsContent>
              <TabsContent value="board" className="mt-4"><RequestBoard requests={filtered} canEdit={canEdit} onEdit={openEdit} onStatusChange={changeStatus} /></TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar solicitação" : "Nova solicitação"}</DialogTitle><DialogDescription>Campos preservados do fluxo de registros do SistemaRegistro.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cartório *"><Select value={form.registry_office_id} onValueChange={(value) => setForm({ ...form, registry_office_id: value })}><SelectTrigger><SelectValue placeholder="Selecione o cartório" /></SelectTrigger><SelectContent>{offices.filter((office) => office.active || office.id === form.registry_office_id).map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Chamado"><Input value={form.ticket_number} onChange={(event) => setForm({ ...form, ticket_number: event.target.value })} /></Field>
            </div>
            <Field label="Descrição *"><Textarea required maxLength={1500} className="min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Módulo"><Input value={form.module} onChange={(event) => setForm({ ...form, module: event.target.value })} /></Field>
              <Field label="Solicitante"><Input value={form.requester} onChange={(event) => setForm({ ...form, requester: event.target.value })} /></Field>
              <Field label="Responsável"><Input value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Solicitação"><Input type="date" value={form.requested_on} onChange={(event) => setForm({ ...form, requested_on: event.target.value })} /></Field>
              <Field label="Previsão"><Input type="date" value={form.expected_delivery_on} onChange={(event) => setForm({ ...form, expected_delivery_on: event.target.value })} /></Field>
              <Field label="Entrega"><Input type="date" value={form.delivered_on} onChange={(event) => setForm({ ...form, delivered_on: event.target.value })} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status"><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CS_CX_REQUEST_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Observações"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveRequest.isPending}>{saveRequest.isPending ? "Salvando..." : "Salvar solicitação"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir esta solicitação?</AlertDialogTitle><AlertDialogDescription>Essa ação remove o registro do HUB. Enquanto o sistema legado for a fonte oficial, itens importados podem reaparecer na próxima sincronização.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RequestTable({ requests, canEdit, canDelete, onEdit, onDelete }: { requests: CsCxRequest[]; canEdit: boolean; canDelete: boolean; onEdit: (request: CsCxRequest) => void; onDelete: (request: CsCxRequest) => void }) {
  return <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Chamado</TableHead><TableHead>Cartório</TableHead><TableHead>Descrição</TableHead><TableHead>Responsável</TableHead><TableHead>Previsão</TableHead><TableHead>Status</TableHead><TableHead className="w-14" /></TableRow></TableHeader><TableBody>{requests.length === 0 ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Nenhuma solicitação encontrada.</TableCell></TableRow> : requests.map((request) => <TableRow key={request.id}><TableCell className="font-medium">{request.ticket_number || `#${request.legacy_id ?? request.id.slice(0, 8)}`}</TableCell><TableCell>{request.registry_office?.name ?? "—"}</TableCell><TableCell><p className="max-w-md truncate" title={request.description ?? ""}>{request.description || "Sem descrição"}</p><p className="text-xs text-muted-foreground">{request.module || "Módulo não informado"}</p></TableCell><TableCell>{request.responsible || "—"}</TableCell><TableCell>{formatDate(request.expected_delivery_on)}</TableCell><TableCell><StatusBadge status={request.status} /></TableCell><TableCell>{(canEdit || canDelete) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit && <DropdownMenuItem onClick={() => onEdit(request)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}{canDelete && <DropdownMenuItem className="text-destructive" onClick={() => onDelete(request)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function RequestBoard({ requests, canEdit, onEdit, onStatusChange }: { requests: CsCxRequest[]; canEdit: boolean; onEdit: (request: CsCxRequest) => void; onStatusChange: (request: CsCxRequest, status: string) => void }) {
  return <div className="flex gap-4 overflow-x-auto pb-4">{CS_CX_REQUEST_STATUSES.map((status) => {
    const items = requests.filter((request) => request.status === status);
    return <div key={status} className="w-72 shrink-0 rounded-xl border bg-muted/20"><div className="flex items-center justify-between border-b p-3"><span className="text-sm font-semibold">{status}</span><Badge variant="secondary">{items.length}</Badge></div><div className="space-y-2 p-2">{items.length === 0 ? <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Sem itens</div> : items.map((request) => <Card key={request.id} className="shadow-sm"><CardHeader className="space-y-1 p-3 pb-2"><div className="flex items-center justify-between"><Badge variant="outline" className="font-mono text-[10px]">{request.ticket_number || `#${request.legacy_id ?? request.id.slice(0, 6)}`}</Badge>{canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(request)}><Pencil className="h-3.5 w-3.5" /></Button>}</div><CardTitle className="line-clamp-2 text-sm">{request.description || "Sem descrição"}</CardTitle></CardHeader><CardContent className="space-y-2 p-3 pt-0"><p className="truncate text-xs text-muted-foreground">{request.registry_office?.name ?? "Cartório não informado"}</p>{canEdit && <Select value={request.status ?? "Aguardando"} onValueChange={(value) => void onStatusChange(request, value)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CS_CX_REQUEST_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>}</CardContent></Card>)}</div></div>;
  })}</div>;
}

function StatusBadge({ status }: { status: string | null }) {
  return <Badge variant="outline" className={cn(status === "Finalizado" && "border-emerald-200 bg-emerald-50 text-emerald-700", status === "Negado" && "border-red-200 bg-red-50 text-red-700", ["Projeto", "Desenvolvimento", "Em andamento"].includes(status ?? "") && "border-blue-200 bg-blue-50 text-blue-700")}>{status || "Aguardando"}</Badge>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><CalendarClock className="h-5 w-5 text-rose-500" /></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function LoadingRows() {
  return <div className="space-y-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</div>;
}

function DataError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"><Database className="h-8 w-8 text-muted-foreground" /><div><p className="font-medium">Base CS/CX ainda não disponível</p><p className="max-w-lg text-sm text-muted-foreground">Aplique as migrations desta branch antes de usar a tela. {errorMessage(error)}</p></div><Button variant="outline" size="sm" onClick={onRetry} className="gap-2"><RefreshCw className="h-4 w-4" />Tentar novamente</Button></div>;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
