import { useMemo, useState } from "react";
import {
  Building2,
  Database,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { type CsCxRegistryOffice, useCsCxRegistryOffices } from "@/hooks/useCsCxCore";

interface OfficeForm {
  id?: string;
  name: string;
  sap_code: string;
  contact_details: string;
  notes: string;
  active: boolean;
  products: Record<string, string>;
}

const emptyForm: OfficeForm = {
  name: "",
  sap_code: "",
  contact_details: "",
  notes: "",
  active: true,
  products: {},
};

export default function CsCxRegistryOffices() {
  const { offices, products, isLoading, error, refetch, saveOffice, deleteOffice } = useCsCxRegistryOffices();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState<OfficeForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CsCxRegistryOffice | null>(null);

  const canCreate = hasPermission("cs_cx_cartorios", "create");
  const canEdit = hasPermission("cs_cx_cartorios", "edit");
  const canDelete = hasPermission("cs_cx_cartorios", "delete");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return offices.filter((office) => {
      const matchesSearch = !term || [office.name, office.sap_code, office.contact_details]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      const matchesStatus = status === "all" || (status === "active" ? office.active : !office.active);
      return matchesSearch && matchesStatus;
    });
  }, [offices, search, status]);

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (office: CsCxRegistryOffice) => {
    setForm({
      id: office.id,
      name: office.name,
      sap_code: office.sap_code ?? "",
      contact_details: office.contact_details ?? "",
      notes: office.notes ?? "",
      active: office.active,
      products: Object.fromEntries(office.products.map((item) => [item.product_id, item.implementation_date ?? ""])),
    });
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    try {
      await saveOffice.mutateAsync({
        ...form,
        products: Object.entries(form.products).map(([product_id, implementation_date]) => ({
          product_id,
          implementation_date: implementation_date || null,
        })),
      });
      setDialogOpen(false);
      toast({ title: "Cartório salvo", description: "Cadastro e produtos atualizados com sucesso." });
    } catch (mutationError) {
      toast({ title: "Não foi possível salvar", description: errorMessage(mutationError), variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteOffice.mutateAsync(deleting.id);
      toast({ title: "Cartório excluído" });
      setDeleting(null);
    } catch (mutationError) {
      toast({
        title: "Não foi possível excluir",
        description: "Verifique se o cartório possui solicitações ou outros vínculos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300">
            <Building2 className="h-4 w-4" /> CS/CX
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Cartórios</h1>
          <p className="text-sm text-muted-foreground">Cadastros, situação e produtos implantados.</p>
        </div>
        {canCreate && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo cartório</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total" value={offices.length} icon={Building2} />
        <Metric label="Ativos" value={offices.filter((office) => office.active).length} icon={PackageCheck} />
        <Metric label="Importados do legado" value={offices.filter((office) => office.origin === "legacy").length} icon={Database} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, SAP ou contato..." className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <LoadingRows /> : error ? (
            <DataError error={error} onRetry={() => void refetch()} />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>Cartório</TableHead><TableHead>Código SAP</TableHead><TableHead>Produtos</TableHead><TableHead>Status</TableHead><TableHead className="w-14" /></TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Nenhum cartório encontrado.</TableCell></TableRow>
                  ) : filtered.map((office) => (
                    <TableRow key={office.id}>
                      <TableCell><div className="font-medium">{office.name}</div><div className="max-w-sm truncate text-xs text-muted-foreground">{office.contact_details || "Contato não informado"}</div></TableCell>
                      <TableCell>{office.sap_code || "—"}</TableCell>
                      <TableCell><div className="flex max-w-md flex-wrap gap-1">{office.products.length ? office.products.map((item) => <Badge key={item.id} variant="secondary" className="font-normal">{item.product?.name ?? "Produto"}</Badge>) : <span className="text-sm text-muted-foreground">Nenhum</span>}</div></TableCell>
                      <TableCell><Badge variant={office.active ? "default" : "outline"}>{office.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                      <TableCell>
                        {(canEdit || canDelete) && <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit && <DropdownMenuItem onClick={() => openEdit(office)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}{canDelete && <DropdownMenuItem onClick={() => setDeleting(office)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar cartório" : "Novo cartório"}</DialogTitle><DialogDescription>Os campos seguem o cadastro do SistemaRegistro.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome *"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Código SAP"><Input value={form.sap_code} onChange={(event) => setForm({ ...form, sap_code: event.target.value })} /></Field>
            </div>
            <Field label="Contatos"><Input placeholder="Telefones, celulares ou e-mails" value={form.contact_details} onChange={(event) => setForm({ ...form, contact_details: event.target.value })} /></Field>
            <Field label="Observações"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <div className="space-y-3 rounded-lg border p-4">
              <div><Label>Produtos implantados</Label><p className="text-xs text-muted-foreground">Selecione o produto e informe a data quando disponível.</p></div>
              {products.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto ativo carregado.</p> : products.map((product) => {
                const checked = Object.prototype.hasOwnProperty.call(form.products, product.id);
                return <div key={product.id} className="grid items-center gap-3 rounded-md bg-muted/30 p-2 sm:grid-cols-[1fr_170px]">
                  <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={(value) => setForm((current) => {
                    const selected = { ...current.products };
                    if (value) selected[product.id] = selected[product.id] ?? ""; else delete selected[product.id];
                    return { ...current, products: selected };
                  })} />{product.name}</label>
                  <Input type="date" disabled={!checked} value={form.products[product.id] ?? ""} onChange={(event) => setForm((current) => ({ ...current, products: { ...current.products, [product.id]: event.target.value } }))} />
                </div>;
              })}
            </div>
            <label className="flex items-center justify-between rounded-lg border p-3"><div><span className="text-sm font-medium">Cartório ativo</span><p className="text-xs text-muted-foreground">Inativos permanecem no histórico.</p></div><Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} /></label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveOffice.isPending}>{saveOffice.isPending ? "Salvando..." : "Salvar cartório"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>O banco impedirá a exclusão se houver solicitações ou outros vínculos. Dados importados podem reaparecer na próxima sincronização enquanto o legado for a fonte oficial.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Building2 }) {
  return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-rose-500" /></CardContent></Card>;
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
