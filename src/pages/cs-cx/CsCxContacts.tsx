import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact,
  Database,
  Eye,
  FileDown,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import {
  type CsCxContact,
  type CsCxContactInput,
  useCsCxContacts,
} from "@/hooks/useCsCxEngagement";
import { useCsCxRecordPermissions } from "@/hooks/useCsCxRecordPermissions";
import { useToast } from "@/hooks/use-toast";
import { CsCxMultiSelect } from "@/components/cs-cx/CsCxMultiSelect";
import { generateCsCxContactsPdf } from "@/lib/cs-cx-engagement-pdf";
import { cn } from "@/lib/utils";

const emptyForm: CsCxContactInput = {
  contact_date: new Date().toISOString().slice(0, 10),
  notes: "",
  pending_items: "",
  product_ids: [],
  contact_person: "",
  contact_details: "",
  registry_office_id: "",
  ticket_number: "",
};

const DEFAULT_PAGE_SIZE = 5;

export default function CsCxContacts() {
  const { contacts, isLoading, error, refetch, saveContact, deleteContact } =
    useCsCxContacts();
  const { offices, products, error: referenceError } = useCsCxRegistryOffices();
  const { canCreate, canEditRecord, canDeleteRecord } =
    useCsCxRecordPermissions("cs_cx_contatos");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [form, setForm] = useState<CsCxContactInput>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<CsCxContact | null>(null);
  const [deleting, setDeleting] = useState<CsCxContact | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const responsibleOptions = useMemo(
    () =>
      Array.from(
        new Map(
          contacts
            .filter((contact) => contact.author)
            .map((contact) => [contact.author!.id, contact.author!]),
        ).values(),
      ).sort((a, b) =>
        (a.full_name || a.email || "").localeCompare(
          b.full_name || b.email || "",
          "pt-BR",
        ),
      ),
    [contacts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return contacts.filter((contact) => {
      const contactProducts =
        contact.products ??
        (contact.product ? [{ ...contact.product, is_primary: true }] : []);
      const matchesSearch =
        !term ||
        [
          contact.contact_person,
          contact.contact_details,
          contact.notes,
          contact.pending_items,
          contact.ticket_number,
          contact.registry_office?.name,
          contact.author?.full_name,
          ...contactProducts.map((product) => product.name),
        ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      return (
        matchesSearch &&
        (officeFilter === "all" ||
          contact.registry_office_id === officeFilter) &&
        (productFilter === "all" ||
          contactProducts.some((product) => product.id === productFilter)) &&
        (responsibleFilter === "all" ||
          contact.author_profile_id === responsibleFilter) &&
        (!dateFrom || contact.contact_date >= dateFrom) &&
        (!dateTo || contact.contact_date <= dateTo)
      );
    });
  }, [
    contacts,
    search,
    officeFilter,
    productFilter,
    responsibleFilter,
    dateFrom,
    dateTo,
  ]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedContacts = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateOfficeFilter = (value: string) => {
    setOfficeFilter(value);
    setPage(1);
  };
  const updateProductFilter = (value: string) => {
    setProductFilter(value);
    setPage(1);
  };
  const updateResponsibleFilter = (value: string) => {
    setResponsibleFilter(value);
    setPage(1);
  };
  const updateDateFrom = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };
  const updateDateTo = (value: string) => {
    setDateTo(value);
    setPage(1);
  };
  const updatePageSize = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const openCreate = () => {
    setForm({
      ...emptyForm,
      contact_date: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const openEdit = (contact: CsCxContact) => {
    setForm({
      id: contact.id,
      contact_date: contact.contact_date,
      notes: contact.notes ?? "",
      pending_items: contact.pending_items ?? "",
      product_ids: (
        contact.products ??
        (contact.product ? [{ ...contact.product, is_primary: true }] : [])
      ).map((product) => product.id),
      contact_person: contact.contact_person,
      contact_details: contact.contact_details ?? "",
      registry_office_id: contact.registry_office_id,
      ticket_number: contact.ticket_number ?? "",
    });
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !form.contact_person.trim() ||
      !form.registry_office_id ||
      !form.product_ids.length
    )
      return;
    try {
      await saveContact.mutateAsync(form);
      setDialogOpen(false);
      toast({
        title: "Contato salvo",
        description: "A interação foi registrada com sucesso.",
      });
    } catch (mutationError) {
      toast({
        title: "Não foi possível salvar",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteContact.mutateAsync(deleting.id);
      setDeleting(null);
      toast({ title: "Contato excluído" });
    } catch (mutationError) {
      toast({
        title: "Não foi possível excluir",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await generateCsCxContactsPdf(
        filtered,
        [
          officeFilter === "all"
            ? "Todos os cartórios"
            : `Cartório: ${offices.find((office) => office.id === officeFilter)?.name ?? "Selecionado"}`,
          productFilter === "all"
            ? "Todos os produtos"
            : `Produto: ${products.find((product) => product.id === productFilter)?.name ?? "Selecionado"}`,
          responsibleFilter === "all"
            ? "Todos os responsáveis"
            : `Responsável: ${responsibleOptions.find((profile) => profile.id === responsibleFilter)?.full_name ?? "Selecionado"}`,
          dateFrom ? `De ${formatDate(dateFrom)}` : "Sem data inicial",
          dateTo ? `Até ${formatDate(dateTo)}` : "Sem data final",
        ].join(" · "),
      );
    } catch (exportError) {
      toast({
        title: "Não foi possível gerar o PDF",
        description: errorMessage(exportError),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const recentCount = contacts.filter(
    (item) => new Date(`${item.contact_date}T00:00:00`) >= last30Days,
  ).length;

  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            <Contact className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight">
              Contatos
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Histórico de relacionamento, anotações e pendências dos cartórios
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!filtered.length || isExporting}
            onClick={() => void handleExport()}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          {canCreate && (
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo contato
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Contatos" value={contacts.length} icon={Contact} />
        <Metric
          label="Últimos 30 dias"
          value={recentCount}
          icon={CalendarDays}
        />
        <Metric
          label="Com pendências"
          value={contacts.filter((item) => !!item.pending_items?.trim()).length}
          icon={TriangleAlert}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_190px_170px] 2xl:grid-cols-[minmax(240px,1fr)_190px_170px_180px_145px_145px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Buscar pessoa, cartório, produto ou chamado..."
                className="h-9 pl-9"
              />
            </div>
            <Select value={officeFilter} onValueChange={updateOfficeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cartórios</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={updateProductFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={responsibleFilter}
              onValueChange={updateResponsibleFilter}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {responsibleOptions.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email || "Usuário"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-9"
              aria-label="Data inicial"
              type="date"
              value={dateFrom}
              onChange={(event) => updateDateFrom(event.target.value)}
            />
            <Input
              className="h-9"
              aria-label="Data final"
              type="date"
              value={dateTo}
              onChange={(event) => updateDateTo(event.target.value)}
            />
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : (error ?? referenceError) ? (
            <DataError
              error={error ?? referenceError}
              onRetry={() => void refetch()}
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 px-3 text-xs">Data</TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Cartório
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">Pessoa</TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Produtos
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Responsável
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Anotações
                      </TableHead>
                      <TableHead className="h-9 px-3 text-xs">
                        Pendências
                      </TableHead>
                      <TableHead className="h-9 w-20 px-2">
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedContacts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Nenhum contato encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedContacts.map((contact) => {
                        const canEdit = canEditRecord(contact.author_profile_id);
                        const canDelete = canDeleteRecord(contact.author_profile_id);
                        return (
                        <TableRow key={contact.id}>
                          <TableCell className="whitespace-nowrap px-3 py-2">
                            {formatDate(contact.contact_date)}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <div className="font-medium">
                              {contact.registry_office?.name ?? "—"}
                            </div>
                            {contact.ticket_number && (
                              <span className="text-[11px] leading-4 text-muted-foreground">
                                Chamado {contact.ticket_number}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <div>{contact.contact_person}</div>
                            <div
                              className="max-w-44 truncate text-[11px] leading-4 text-muted-foreground"
                              title={contact.contact_details ?? ""}
                            >
                              {contact.contact_details ||
                                "Contato não informado"}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <ContactProductBadges contact={contact} />
                          </TableCell>
                          <TableCell
                            className="max-w-40 truncate px-3 py-2 text-xs"
                            title={
                              contact.author?.full_name ||
                              contact.author?.email ||
                              "Não vinculado"
                            }
                          >
                            {contact.author?.full_name ||
                              contact.author?.email ||
                              "—"}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <p
                              className="line-clamp-2 max-w-xs text-xs leading-4"
                              title={contact.notes ?? ""}
                            >
                              {contact.notes || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <p
                              className="line-clamp-2 max-w-xs text-xs leading-4 text-amber-700 dark:text-amber-300"
                              title={contact.pending_items ?? ""}
                            >
                              {contact.pending_items || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={`Visualizar contato de ${contact.contact_person}`}
                                title="Visualizar contato"
                                onClick={() => setViewing(contact)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(canEdit || canDelete) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Ações</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {canEdit && (
                                      <DropdownMenuItem
                                        onClick={() => openEdit(contact)}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setDeleting(contact)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <ContactPaginationBar
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filtered.length}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={updatePageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar contato" : "Novo contato"}
            </DialogTitle>
            <DialogDescription>
              Registre a interação e qualquer pendência identificada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cartório *">
                <Select
                  value={form.registry_office_id}
                  onValueChange={(value) =>
                    setForm({ ...form, registry_office_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices
                      .filter(
                        (office) =>
                          office.active ||
                          office.id === form.registry_office_id,
                      )
                      .map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Produtos *">
                <CsCxMultiSelect
                  ariaLabel="Produtos do contato"
                  options={products.map((product) => ({
                    value: product.id,
                    label: product.name,
                  }))}
                  values={form.product_ids}
                  onChange={(product_ids) => setForm({ ...form, product_ids })}
                  placeholder="Selecione um ou mais produtos"
                  searchPlaceholder="Buscar produto..."
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data *">
                <Input
                  required
                  type="date"
                  value={form.contact_date}
                  onChange={(event) =>
                    setForm({ ...form, contact_date: event.target.value })
                  }
                />
              </Field>
              <Field label="Chamado">
                <Input
                  value={form.ticket_number}
                  onChange={(event) =>
                    setForm({ ...form, ticket_number: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pessoa de contato *">
                <Input
                  required
                  value={form.contact_person}
                  onChange={(event) =>
                    setForm({ ...form, contact_person: event.target.value })
                  }
                />
              </Field>
              <Field label="Telefone/e-mail">
                <Input
                  value={form.contact_details}
                  onChange={(event) =>
                    setForm({ ...form, contact_details: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Anotações">
              <Textarea
                className="min-h-24"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </Field>
            <Field label="Pendências">
              <Textarea
                className="min-h-20"
                value={form.pending_items}
                onChange={(event) =>
                  setForm({ ...form, pending_items: event.target.value })
                }
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveContact.isPending}>
                {saveContact.isPending ? "Salvando..." : "Salvar contato"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-rose-500" />
              Visualizar contato
            </DialogTitle>
            <DialogDescription>
              Consulta somente leitura do histórico de relacionamento.
            </DialogDescription>
          </DialogHeader>
          {viewing && <ContactReadOnlyDetails contact={viewing} />}
          <DialogFooter>
            <Button type="button" onClick={() => setViewing(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Agendamentos vinculados manterão o histórico, mas perderão a
              referência para este contato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Contact;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold leading-6">{value}</p>
        </div>
        <Icon className="h-4 w-4 text-rose-500" />
      </CardContent>
    </Card>
  );
}
function ContactProductBadges({ contact }: { contact: CsCxContact }) {
  const contactProducts =
    contact.products ??
    (contact.product ? [{ ...contact.product, is_primary: true }] : []);
  const visible = contactProducts.slice(0, 2);
  return (
    <div className="flex max-w-52 flex-wrap gap-1">
      {visible.map((product) => (
        <Badge
          key={product.id}
          variant="secondary"
          className="h-5 max-w-28 truncate px-1.5 text-[10px] font-normal"
          title={product.name}
        >
          {product.name}
        </Badge>
      ))}
      {contactProducts.length > visible.length && (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          +{contactProducts.length - visible.length}
        </Badge>
      )}
      {!contactProducts.length && (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}
function ContactReadOnlyDetails({ contact }: { contact: CsCxContact }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadOnlyField
          label="Cartório"
          value={contact.registry_office?.name ?? "—"}
        />
        <ReadOnlyField label="Data" value={formatDate(contact.contact_date)} />
        <ReadOnlyField label="Pessoa" value={contact.contact_person} />
        <ReadOnlyField
          label="Telefone/e-mail"
          value={contact.contact_details || "Não informado"}
        />
        <ReadOnlyField
          label="Responsável"
          value={
            contact.author?.full_name ||
            contact.author?.email ||
            "Não vinculado"
          }
        />
        <ReadOnlyField
          label="Chamado"
          value={contact.ticket_number || "Não informado"}
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Produtos</p>
        <div className="rounded-md border bg-muted/20 p-3">
          <ContactProductBadges contact={contact} />
        </div>
      </div>
      <ReadOnlyField
        label="Anotações"
        value={contact.notes || "Nenhuma anotação registrada."}
        multiline
      />
      <ReadOnlyField
        label="Pendências"
        value={contact.pending_items || "Nenhuma pendência registrada."}
        multiline
        warning={Boolean(contact.pending_items?.trim())}
      />
    </div>
  );
}
function ReadOnlyField({
  label,
  value,
  multiline = false,
  warning = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        className={cn(
          "rounded-md border bg-muted/20 px-3 py-2 text-sm",
          multiline && "min-h-20 whitespace-pre-wrap break-words",
          warning &&
            "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
        )}
      >
        {value}
      </div>
    </div>
  );
}
function ContactPaginationBar({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  return (
    <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span
        aria-label={`Mostrando ${firstItem} a ${lastItem} de ${totalItems} contatos`}
      >
        Mostrando{" "}
        <strong className="font-semibold text-foreground">
          {firstItem}–{lastItem}
        </strong>{" "}
        de{" "}
        <strong className="font-semibold text-foreground">{totalItems}</strong>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span>Por página</span>
        <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
          <SelectTrigger
            aria-label="Contatos por página"
            className="h-8 w-[72px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="min-w-[92px] text-center">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Página anterior"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Próxima página"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-14 w-full" />
      ))}
    </div>
  );
}
function DataError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
      <Database className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Base CS/CX ainda não disponível</p>
        <p className="max-w-lg text-sm text-muted-foreground">
          Aplique as migrations desta branch antes de usar a tela.{" "}
          {errorMessage(error)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
