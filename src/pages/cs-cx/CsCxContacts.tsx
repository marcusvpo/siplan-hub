import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact,
  Database,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  Link2,
  Maximize2,
  MoreHorizontal,
  Minimize2,
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AiRichTextField } from "@/components/ui/ai-rich-text-field";
import { Textarea } from "@/components/ui/textarea";
import {
  type CsCxRequestInput,
  useCsCxRegistryOffices,
  useCsCxRequests,
} from "@/hooks/useCsCxCore";
import {
  type CsCxContact,
  type CsCxContactInput,
  useCsCxContacts,
} from "@/hooks/useCsCxEngagement";
import { useCsCxRecordPermissions } from "@/hooks/useCsCxRecordPermissions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CsCxMultiSelect } from "@/components/cs-cx/CsCxMultiSelect";
import { ContactAttentionDashboard } from "@/components/cs-cx/ContactAttentionDashboard";
import { generateCsCxContactsPdf } from "@/lib/cs-cx-engagement-pdf";
import { hasRichTextContent, richTextToPlainText } from "@/lib/lexical";
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
  const isMobile = useIsMobile();
  const { contacts, isLoading, error, refetch, saveContact, deleteContact } =
    useCsCxContacts();
  const { offices, products, error: referenceError } =
    useCsCxRegistryOffices();
  const { requests, statuses, saveRequest: saveRequestMutation } =
    useCsCxRequests();
  const { canCreate, canEditRecord, canDeleteRecord } =
    useCsCxRecordPermissions("cs_cx_contatos");
  const { canCreate: canCreateRequest } =
    useCsCxRecordPermissions("cs_cx_registros");
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [pendingFilter, setPendingFilter] = useState<"all" | "pending">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [form, setForm] = useState<CsCxContactInput>(emptyForm);
  const [registryOfficeIds, setRegistryOfficeIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isFormFullscreen, setIsFormFullscreen] = useState(false);
  const [viewing, setViewing] = useState<CsCxContact | null>(null);
  const [deleting, setDeleting] = useState<CsCxContact | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<CsCxRequestInput>({
    registry_office_id: "",
    ticket_number: "",
    description: "",
    module: "",
    requester: "",
    responsible: "",
    requested_on: new Date().toISOString().slice(0, 10),
    expected_delivery_on: "",
    delivered_on: "",
    status: "Aguardando",
    new_observation: "",
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

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
          richTextToPlainText(contact.notes),
          richTextToPlainText(contact.pending_items),
          contact.ticket_number,
          contact.registry_office?.name,
          contact.author?.full_name,
          ...contactProducts.map((product) => product.name),
        ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
      const matchesPending =
        pendingFilter === "all" || hasRichTextContent(contact.pending_items);
      return (
        matchesSearch &&
        matchesPending &&
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
    pendingFilter,
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
  const updatePendingFilter = (value: "all" | "pending") => {
    setPendingFilter(value);
    setPage(1);
  };
  const togglePendingFilter = () => {
    setPendingFilter((prev) => (prev === "pending" ? "all" : "pending"));
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

  const openCreateRequestFromContact = () => {
    const currentOfficeId = form.id
      ? form.registry_office_id
      : registryOfficeIds[0] || "";

    if (!currentOfficeId) {
      toast({
        title: "Selecione um cartório",
        description:
          "Por favor, selecione ao menos um cartório no contato para vincular a solicitação.",
        variant: "destructive",
      });
      return;
    }

    setRequestForm({
      registry_office_id: currentOfficeId,
      ticket_number: form.ticket_number || "",
      description:
        richTextToPlainText(form.pending_items) ||
        richTextToPlainText(form.notes) ||
        "",
      module: "",
      requester: form.contact_person || "",
      responsible: "",
      requested_on: new Date().toISOString().slice(0, 10),
      expected_delivery_on: "",
      delivered_on: "",
      status: statuses[0]?.name || "Aguardando",
      new_observation: "",
    });
    setRequestDialogOpen(true);
  };

  const submitRequestFromContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestForm.registry_office_id || !requestForm.description.trim()) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await saveRequestMutation.mutateAsync(requestForm);
      const ticketNum = requestForm.ticket_number?.trim();

      if (ticketNum && !form.ticket_number) {
        setForm((prev) => ({ ...prev, ticket_number: ticketNum }));
      }

      toast({
        title: "Solicitação registrada",
        description: ticketNum
          ? `Solicitação Chamado #${ticketNum} criada e vinculada ao contato.`
          : "Solicitação salva com sucesso.",
      });
      setRequestDialogOpen(false);
    } catch (mutationError) {
      toast({
        title: "Não foi possível criar a solicitação",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const openCreate = () => {
    setForm({
      ...emptyForm,
      contact_date: new Date().toISOString().slice(0, 10),
    });
    setRegistryOfficeIds([]);
    setIsFormFullscreen(false);
    setDialogOpen(true);
  };

  const openCreateForOffice = (officeId: string) => {
    setForm({
      ...emptyForm,
      contact_date: new Date().toISOString().slice(0, 10),
    });
    setRegistryOfficeIds([officeId]);
    setIsFormFullscreen(false);
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
    setRegistryOfficeIds([contact.registry_office_id]);
    setIsFormFullscreen(false);
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedOfficeIds = form.id
      ? [form.registry_office_id]
      : registryOfficeIds;
    if (
      !form.contact_person.trim() ||
      !selectedOfficeIds.length ||
      !form.product_ids.length
    )
      return;
    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedOfficeIds.map((registry_office_id) =>
          saveContact.mutateAsync({
            ...form,
            notes: hasRichTextContent(form.notes) ? form.notes : "",
            pending_items: hasRichTextContent(form.pending_items)
              ? form.pending_items
              : "",
            registry_office_id,
          }),
        ),
      );
      setDialogOpen(false);
      toast({
        title:
          selectedOfficeIds.length > 1 ? "Contatos salvos" : "Contato salvo",
        description:
          selectedOfficeIds.length > 1
            ? `A interação foi registrada para ${selectedOfficeIds.length} cartórios.`
            : "A interação foi registrada com sucesso.",
      });
    } catch (mutationError) {
      toast({
        title: "Não foi possível salvar",
        description: errorMessage(mutationError),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
          pendingFilter === "all"
            ? "Todas as interações"
            : "Somente com pendências",
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
    <div data-testid="cs-cx-contacts-page" className="container mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-hidden px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-6">
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
        <div className="flex flex-wrap justify-end gap-2">
          <ContactAttentionDashboard
            contacts={contacts}
            offices={offices}
            canCreate={canCreate}
            onFilterOffice={updateOfficeFilter}
            onRegisterContact={openCreateForOffice}
          />
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <Metric label="Contatos" value={contacts.length} icon={Contact} />
        <Metric
          label="Últimos 30 dias"
          value={recentCount}
          icon={CalendarDays}
        />
        <Metric
          label="Com pendências"
          value={contacts.filter((item) => hasRichTextContent(item.pending_items)).length}
          icon={TriangleAlert}
          onClick={togglePendingFilter}
          active={pendingFilter === "pending"}
          title="Clique para filtrar somente os contatos que possuem pendências"
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[minmax(220px,1fr)_180px_160px_170px_175px_140px_140px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
            <Select
              value={pendingFilter}
              onValueChange={(val) => updatePendingFilter(val as "all" | "pending")}
            >
              <SelectTrigger className="h-9" aria-label="Filtrar por pendências">
                <SelectValue placeholder="Todas as interações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as interações</SelectItem>
                <SelectItem value="pending">Somente com pendências</SelectItem>
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
              {isMobile && <div data-testid="cs-cx-contacts-mobile-list" className="space-y-2 md:hidden">
                {pagedContacts.length === 0 ? (
                  <div className="rounded-lg border px-3 py-10 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
                ) : pagedContacts.map((contact) => {
                  const canEdit = canEditRecord(contact.author_profile_id);
                  const canDelete = canDeleteRecord(contact.author_profile_id);
                  return (
                    <article key={contact.id} className="min-w-0 rounded-lg border bg-card p-3 shadow-sm">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold">{contact.registry_office?.name ?? "—"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                            <span>{formatDate(contact.contact_date)}</span>
                            {contact.ticket_number && (
                              <>
                                <span>· Chamado {contact.ticket_number}</span>
                                {(() => {
                                  const matched = requests.find(
                                    (r) =>
                                      r.registry_office_id === contact.registry_office_id &&
                                      r.ticket_number &&
                                      r.ticket_number.trim() === contact.ticket_number.trim(),
                                  );
                                  return matched ? (
                                    <RequestStatusBadge status={matched.status} />
                                  ) : null;
                                })()}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Visualizar contato de ${contact.contact_person}`} onClick={() => setViewing(contact)}><Eye className="h-4 w-4" /></Button>
                          {(canEdit || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do contato"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEdit && <DropdownMenuItem onClick={() => openEdit(contact)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}
                                {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(contact)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2 text-xs">
                        <div className="min-w-0"><span className="block text-[10px] uppercase text-muted-foreground">Pessoa</span><span className="block truncate">{contact.contact_person}</span></div>
                        <div className="min-w-0"><span className="block text-[10px] uppercase text-muted-foreground">Responsável</span><span className="block truncate">{contact.author?.full_name || contact.author?.email || "—"}</span></div>
                      </div>
                      <div className="mt-2"><ContactProductBadges contact={contact} /></div>
                      {(richTextToPlainText(contact.notes) || richTextToPlainText(contact.pending_items)) && <div className="mt-2 space-y-1 rounded-md bg-muted/40 p-2 text-xs"><p className="line-clamp-2 break-words"><span className="font-semibold">Notas: </span>{richTextToPlainText(contact.notes) || "—"}</p><p className="line-clamp-2 break-words text-amber-700 dark:text-amber-300"><span className="font-semibold">Pendências: </span>{richTextToPlainText(contact.pending_items) || "—"}</p></div>}
                    </article>
                  );
                })}
              </div>}
              {!isMobile && <div className="hidden overflow-x-auto rounded-lg border md:block">
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
                              <div className="flex items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
                                <span>Chamado {contact.ticket_number}</span>
                                {(() => {
                                  const matched = requests.find(
                                    (r) =>
                                      r.registry_office_id === contact.registry_office_id &&
                                      r.ticket_number &&
                                      r.ticket_number.trim() === contact.ticket_number.trim(),
                                  );
                                  return matched ? (
                                    <RequestStatusBadge status={matched.status} />
                                  ) : null;
                                })()}
                              </div>
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
                              title={richTextToPlainText(contact.notes)}
                            >
                              {richTextToPlainText(contact.notes) || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <p
                              className="line-clamp-2 max-w-xs text-xs leading-4 text-amber-700 dark:text-amber-300"
                              title={richTextToPlainText(contact.pending_items)}
                            >
                              {richTextToPlainText(contact.pending_items) || "—"}
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
              </div>}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setIsFormFullscreen(false);
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-4 sm:max-h-[92vh] sm:max-w-2xl sm:p-6",
            isFormFullscreen &&
              "h-[100dvh] max-h-none w-screen max-w-none rounded-none sm:max-w-none",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-12 top-4 h-8 w-8"
            onClick={() => setIsFormFullscreen((current) => !current)}
            aria-label={
              isFormFullscreen
                ? "Sair da tela cheia"
                : "Ver formulário em tela cheia"
            }
            title={isFormFullscreen ? "Sair da tela cheia" : "Ver em tela cheia"}
          >
            {isFormFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar contato" : "Novo contato"}
            </DialogTitle>
            <DialogDescription>
              Registre a interação e qualquer pendência identificada.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={submit}
            className={cn(
              "space-y-4",
              isFormFullscreen && "mx-auto w-full max-w-5xl",
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={form.id ? "Cartório *" : "Cartórios *"}>
                {form.id ? (
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
                ) : (
                  <CsCxMultiSelect
                    ariaLabel="Cartórios do contato"
                    options={offices
                      .filter((office) => office.active)
                      .map((office) => ({
                        value: office.id,
                        label: office.name,
                      }))}
                    values={registryOfficeIds}
                    onChange={setRegistryOfficeIds}
                    placeholder="Selecione um ou mais cartórios"
                    searchPlaceholder="Buscar cartório..."
                  />
                )}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Chamado</Label>
                  {form.ticket_number && (
                    (() => {
                      const currentOfficeId = form.id
                        ? form.registry_office_id
                        : registryOfficeIds[0];
                      const matched = requests.find(
                        (r) =>
                          r.registry_office_id === currentOfficeId &&
                          r.ticket_number &&
                          r.ticket_number.trim() === form.ticket_number.trim(),
                      );
                      return matched ? (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Link2 className="h-3 w-3 text-rose-500" />
                          Solicitação: <RequestStatusBadge status={matched.status} />
                        </span>
                      ) : null;
                    })()
                  )}
                </div>
                <Input
                  value={form.ticket_number}
                  onChange={(event) =>
                    setForm({ ...form, ticket_number: event.target.value })
                  }
                  placeholder="Número do chamado ou ID"
                />
                {(() => {
                  const currentOfficeId = form.id
                    ? form.registry_office_id
                    : registryOfficeIds[0];
                  const officeReqs = requests.filter(
                    (r) =>
                      r.registry_office_id === currentOfficeId &&
                      r.ticket_number,
                  );
                  if (!officeReqs.length) return null;
                  return (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                      <span>Vincular solicitação:</span>
                      {officeReqs.slice(0, 4).map((req) => (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              ticket_number: req.ticket_number ?? "",
                            }))
                          }
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                            form.ticket_number === req.ticket_number
                              ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              : "border-muted hover:border-rose-300 hover:bg-muted/50",
                          )}
                          title={`Vincular #${req.ticket_number}: ${req.description}`}
                        >
                          #{req.ticket_number}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
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
            <AiRichTextField
              label="Anotações"
              content={form.notes ?? ""}
              onChange={(notes) => setForm({ ...form, notes })}
              placeholder="Registre informações, decisões e contexto do contato..."
              requestedBy={user?.id}
              targetField={`cs_cx_contact:${form.id ?? "draft"}:notes`}
            />
            <AiRichTextField
              label="Pendências"
              content={form.pending_items ?? ""}
              onChange={(pending_items) =>
                setForm({ ...form, pending_items })
              }
              placeholder="Liste pendências, próximos passos e responsáveis..."
              requestedBy={user?.id}
              targetField={`cs_cx_contact:${form.id ?? "draft"}:pending_items`}
            />
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {canCreateRequest && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openCreateRequestFromContact}
                    className="w-full gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/50 sm:w-auto"
                    title="Criar e vincular uma solicitação no módulo Registros a este contato"
                  >
                    <FilePlus2 className="h-4 w-4" />
                    Nova solicitação
                  </Button>
                )}
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Salvando..."
                    : registryOfficeIds.length > 1 && !form.id
                      ? `Salvar ${registryOfficeIds.length} contatos`
                      : "Salvar contato"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Nova Solicitação vinculada ao contato */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-4 sm:max-h-[92vh] sm:max-w-4xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-rose-500" />
              Nova solicitação (Registros)
            </DialogTitle>
            <DialogDescription>
              Cadastre a solicitação que será vinculada a este contato.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRequestFromContact} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cartório *">
                <Select
                  value={requestForm.registry_office_id}
                  onValueChange={(value) =>
                    setRequestForm({ ...requestForm, registry_office_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cartório" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices
                      .filter(
                        (office) =>
                          office.active ||
                          office.id === requestForm.registry_office_id,
                      )
                      .map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Chamado">
                <Input
                  value={requestForm.ticket_number}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      ticket_number: event.target.value,
                    })
                  }
                  placeholder="Ex: 755261"
                />
              </Field>
            </div>
            <Field label="Descrição *">
              <Textarea
                required
                maxLength={1500}
                className="min-h-24"
                value={requestForm.description}
                onChange={(event) =>
                  setRequestForm({
                    ...requestForm,
                    description: event.target.value,
                  })
                }
                placeholder="Descreva a solicitação ou necessidade do cartório..."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Módulo">
                <Input
                  value={requestForm.module}
                  onChange={(event) =>
                    setRequestForm({ ...requestForm, module: event.target.value })
                  }
                  placeholder="Ex: OrionPRO"
                />
              </Field>
              <Field label="Solicitante">
                <Input
                  value={requestForm.requester}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      requester: event.target.value,
                    })
                  }
                  placeholder="Pessoa que solicitou"
                />
              </Field>
              <Field label="Responsável">
                <Input
                  value={requestForm.responsible}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      responsible: event.target.value,
                    })
                  }
                  placeholder="Analista ou responsável"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Solicitação">
                <Input
                  type="date"
                  value={requestForm.requested_on}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      requested_on: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Previsão">
                <Input
                  type="date"
                  value={requestForm.expected_delivery_on}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      expected_delivery_on: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Entrega">
                <Input
                  type="date"
                  value={requestForm.delivered_on}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      delivered_on: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select
                  value={requestForm.status}
                  onValueChange={(value) =>
                    setRequestForm({ ...requestForm, status: value })
                  }
                >
                  <SelectTrigger aria-label="Status da solicitação">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(statuses.length
                      ? statuses
                      : [{ id: "def", name: "Aguardando" }]
                    ).map((status) => (
                      <SelectItem key={status.id} value={status.name}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Observação inicial">
                <Input
                  value={requestForm.new_observation}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      new_observation: event.target.value,
                    })
                  }
                  placeholder="Observação para o histórico..."
                />
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingRequest}>
                {isSubmittingRequest
                  ? "Criando solicitação..."
                  : "Salvar solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-4 sm:max-h-[92vh] sm:max-w-2xl sm:p-6">
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
  onClick,
  active = false,
  title,
}: {
  label: string;
  value: number;
  icon: typeof Contact;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <Card
      className={cn(
        "transition-all",
        onClick &&
          "cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 dark:hover:border-rose-800 dark:hover:bg-rose-950/20",
        active &&
          "border-rose-500 bg-rose-50/60 shadow-sm dark:border-rose-600 dark:bg-rose-950/40",
      )}
      onClick={onClick}
      title={title}
    >
      <CardContent className="flex items-center justify-between px-3 py-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {active && (
              <Badge variant="destructive" className="h-4 px-1 text-[9px] font-medium leading-none">
                Filtrado
              </Badge>
            )}
          </div>
          <p className="text-xl font-bold leading-6">{value}</p>
        </div>
        <Icon
          className={cn(
            "h-4 w-4",
            active ? "text-rose-600 dark:text-rose-400" : "text-rose-500",
          )}
        />
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
  const { requests } = useCsCxRequests();
  const linkedReq = contact.ticket_number
    ? requests.find(
        (r) =>
          r.registry_office_id === contact.registry_office_id &&
          r.ticket_number &&
          r.ticket_number.trim() === contact.ticket_number.trim(),
      )
    : null;

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

      {linkedReq && (
        <div className="space-y-2 rounded-lg border bg-rose-50/50 p-3 dark:bg-rose-950/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <FileText className="h-4 w-4 text-rose-600" />
              <span>Solicitação #{linkedReq.ticket_number}</span>
            </div>
            <RequestStatusBadge status={linkedReq.status} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{linkedReq.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {linkedReq.module && <span>Módulo: <strong>{linkedReq.module}</strong></span>}
            {linkedReq.requester && <span>Solicitante: <strong>{linkedReq.requester}</strong></span>}
            {linkedReq.responsible && <span>Responsável: <strong>{linkedReq.responsible}</strong></span>}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Produtos</p>
        <div className="rounded-md border bg-muted/20 p-3">
          <ContactProductBadges contact={contact} />
        </div>
      </div>
      <ReadOnlyRichTextField
        label="Anotações"
        value={contact.notes}
        emptyMessage="Nenhuma anotação registrada."
      />
      <ReadOnlyRichTextField
        label="Pendências"
        value={contact.pending_items}
        emptyMessage="Nenhuma pendência registrada."
        warning={hasRichTextContent(contact.pending_items)}
      />
    </div>
  );
}
function ReadOnlyRichTextField({
  label,
  value,
  emptyMessage,
  warning = false,
}: {
  label: string;
  value: string | null;
  emptyMessage: string;
  warning?: boolean;
}) {
  if (!hasRichTextContent(value)) {
    return <ReadOnlyField label={label} value={emptyMessage} multiline />;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <RichTextEditor
        content={value ?? ""}
        onChange={() => undefined}
        editable={false}
        className={cn(
          "min-h-20",
          warning &&
            "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
        )}
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
function RequestStatusBadge({ status }: { status: string | null }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 text-[10px]",
        status === "Finalizado" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
        status === "Negado" &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
        ["Projeto", "Desenvolvimento", "Em andamento", "Em execução"].includes(
          status ?? "",
        ) &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
        status === "Sustentação" &&
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
        status === "FastTrack" &&
          "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
      )}
    >
      {status || "Aguardando"}
    </Badge>
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
