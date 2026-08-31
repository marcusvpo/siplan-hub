import { useCommercial, type Contact } from "@/hooks/useCommercial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Mail,
  User,
  Users,
  Search,
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CommercialContacts() {
  const {
    clients,
    contacts,
    isLoadingContacts,
    createContact,
    updateContact,
    deleteContact,
  } = useCommercial();

  const [searchTerm, setSearchTerm] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const itemsPerPage = selectedPageSize ?? (isMobile ? 3 : 12);
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreateContacts = hasPermission("commercial_contacts", "create");
  const canEditContacts = hasPermission("commercial_contacts", "edit");
  const canDeleteContacts = hasPermission("commercial_contacts", "delete");
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    roleFilter !== "all" ||
    selectedClientId !== null;

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    notes: "",
    client_id: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      email: "",
      phone: "",
      notes: "",
      client_id: selectedClientId || "",
    });
    setEditingContact(null);
  };

  const handleOpenCreate = () => {
    if (!canCreateContacts) return;
    resetForm();
    if (selectedClientId) {
      setFormData((prev) => ({ ...prev, client_id: selectedClientId }));
    }
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    if (!canEditContacts) return;
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      role: contact.role || "",
      email: contact.email || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
      client_id: contact.client_id,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.client_id) {
      toast({
        title: "Erro",
        description: "Nome e Cliente são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingContact) {
        await updateContact.mutateAsync({
          id: editingContact.id,
          ...formData,
        });
        toast({ title: "Sucesso", description: "Contato atualizado." });
      } else {
        await createContact.mutateAsync(formData);
        toast({ title: "Sucesso", description: "Contato criado." });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteContacts) return;
    if (confirm("Tem certeza que deseja excluir este contato?")) {
      try {
        await deleteContact.mutateAsync(id);
        toast({ title: "Sucesso", description: "Contato excluído." });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir.",
          variant: "destructive",
        });
      }
    }
  };

  const filteredContacts =
    contacts?.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter !== "all"
          ? contact.role?.toLowerCase().includes(roleFilter.toLowerCase())
          : true;

      if (selectedClientId) {
        return (
          matchesSearch && matchesRole && contact.client_id === selectedClientId
        );
      }
      return matchesSearch && matchesRole;
    }) || [];

  const filteredClients =
    clients?.filter((client) =>
      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()),
    ) || [];

  const uniqueRoles = Array.from(
    new Set(
      (contacts || [])
        .map((contact) => contact.role)
        .filter((role): role is string => Boolean(role)),
    ),
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContacts.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = filteredContacts.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  const firstVisibleItem = filteredContacts.length === 0 ? 0 : startIndex + 1;
  const lastVisibleItem = Math.min(
    startIndex + itemsPerPage,
    filteredContacts.length,
  );

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setSelectedClientId(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, selectedClientId, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const selectedClientName = clients?.find(
    (client) => client.id === selectedClientId,
  )?.name;
  const isSaving = editingContact
    ? updateContact.isPending
    : createContact.isPending;

  return (
    <div
      className="flex min-w-0 flex-col gap-4 overflow-x-hidden animate-in fade-in duration-500 md:h-[calc(100vh-6rem)] md:gap-6"
      data-testid="commercial-contacts-page"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-xl font-bold leading-tight tracking-tight text-transparent sm:text-2xl md:text-3xl">
            Contatos & Clientes
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Gerencie a agenda de contatos unificada dos seus clientes.
          </p>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <div className="hidden rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:block">
            {filteredContacts.length} contato
            {filteredContacts.length === 1 ? "" : "s"}
          </div>
          {canCreateContacts && (
            <Button
              type="button"
              onClick={handleOpenCreate}
              className="w-full gap-2 bg-purple-600 shadow-sm hover:bg-purple-700 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Novo Contato
            </Button>
          )}
        </div>
      </div>

      <div
        className="min-w-0 rounded-xl border bg-muted/20 p-3 sm:p-4"
        data-testid="commercial-contacts-filters"
      >
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 shrink-0 text-purple-600" />
            <span>Filtros dos contatos</span>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-2 text-xs"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou cliente..."
              aria-label="Buscar contato"
              className="h-10 min-w-0 bg-background pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger
              className="h-10 w-full min-w-0 bg-background"
              aria-label="Filtrar contatos por cargo"
            >
              <SelectValue placeholder="Todos os cargos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cargos</SelectItem>
              {uniqueRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="min-w-0 sm:col-span-2 lg:hidden">
            <Select
              value={selectedClientId || "all"}
              onValueChange={(value) =>
                setSelectedClientId(value === "all" ? null : value)
              }
            >
              <SelectTrigger
                className="h-10 w-full min-w-0 bg-background"
                aria-label="Filtrar contatos por cliente"
              >
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {(clients || []).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground sm:hidden">
          <span className="min-w-0 break-words">
            {selectedClientName || "Todos os clientes"}
          </span>
          <span className="shrink-0 font-medium text-foreground">
            {filteredContacts.length} resultado
            {filteredContacts.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 gap-4 lg:gap-6 lg:overflow-hidden">
        {/* Sidebar de Clientes */}
        <Card
          className="hidden h-full w-80 shrink-0 flex-col border-r shadow-sm transition-all lg:flex xl:w-96"
          data-testid="commercial-contacts-client-sidebar"
        >
          <div className="space-y-2 border-b bg-muted/10 p-3">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Filtrar por Cliente
            </h3>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                aria-label="Buscar cliente"
                className="h-8 bg-background/50 pl-8 text-xs"
                value={clientSearchTerm}
                onChange={(event) => setClientSearchTerm(event.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-0.5">
              <Button
                variant={selectedClientId === null ? "secondary" : "ghost"}
                className={`h-auto w-full justify-start py-2 text-xs font-normal ${
                  selectedClientId === null
                    ? "bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-100"
                    : ""
                }`}
                onClick={() => setSelectedClientId(null)}
              >
                <Users className="h-3.5 w-3.5 mr-2 shrink-0" />
                Todos os Contatos
              </Button>
              {filteredClients.map((client) => {
                const isSelected = selectedClientId === client.id;

                return (
                  <Button
                    key={client.id}
                    variant={isSelected ? "secondary" : "ghost"}
                    className={cn(
                      "relative h-auto w-full min-w-0 justify-start overflow-hidden py-2 text-xs font-normal",
                      isSelected
                        ? "bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-100 border-l-2 border-purple-500 rounded-l-none"
                        : "",
                    )}
                    onClick={() => setSelectedClientId(client.id)}
                    title={client.name}
                  >
                    <div className="min-w-0 flex-1 pl-5 text-left">
                      <span className="block truncate leading-tight">
                        {client.name}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Grid de Contatos */}
        <div className="min-w-0 flex-1 lg:-mr-2 lg:h-full lg:overflow-y-auto lg:pr-2">
          {isLoadingContacts ? (
            <div className="flex min-h-52 items-center justify-center rounded-xl border bg-muted/10">
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
                Carregando contatos...
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div
              className="flex min-h-52 min-w-0 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/10 px-4 py-8 text-center text-muted-foreground lg:min-h-full"
              data-testid="commercial-contacts-empty-state"
            >
              <User className="mb-3 h-12 w-12 opacity-20 sm:h-16 sm:w-16" />
              <h3 className="text-base font-medium text-foreground opacity-80 sm:text-lg">
                Nenhum contato encontrado
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-relaxed">
                Tente ajustar seus filtros ou selecione outro cliente.
              </p>
              <div className="mt-4 flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                )}
                {selectedClientId && canCreateContacts && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenCreate}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar contato para este cliente
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div
                className="grid min-w-0 content-start grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4"
                data-testid="commercial-contacts-list"
              >
                {paginatedContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    className="group relative min-w-0 overflow-hidden transition-all duration-300 hover:border-purple-300 hover:shadow-md dark:hover:border-purple-700"
                    data-testid="commercial-contact-card"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-purple-400 to-pink-400 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" />

                    <CardHeader className="flex min-w-0 flex-row items-start justify-between space-y-0 pb-2 pl-5 pr-3 pt-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3 pr-9">
                        <Avatar className="h-11 w-11 shrink-0 border-2 border-white shadow-sm dark:border-zinc-800 sm:h-12 sm:w-12">
                          <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-base font-bold text-purple-700 dark:from-purple-900 dark:to-pink-900 dark:text-purple-200 sm:text-lg">
                            {contact.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <CardTitle
                            className="min-w-0 break-words text-sm font-bold leading-snug sm:text-base"
                            title={contact.name}
                            data-testid="commercial-contact-name"
                          >
                            {contact.name}
                          </CardTitle>
                          {contact.role ? (
                            <p className="min-w-0 break-words text-xs font-medium leading-snug text-purple-600 dark:text-purple-300">
                              {contact.role}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Sem cargo
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Actions Menu */}
                      {(canEditContacts || canDeleteContacts) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2 h-9 w-9 opacity-100 transition-opacity lg:h-8 lg:w-8 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                              aria-label={`Ações para ${contact.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditContacts && (
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(contact)}
                              >
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                            )}
                            {canDeleteContacts && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                onClick={() => handleDelete(contact.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </CardHeader>

                    <CardContent className="min-w-0 pb-4 pl-5 pr-4 pt-2">
                      <div className="min-w-0 space-y-3">
                        {/* Client Chip */}
                        <div className="inline-flex h-auto max-w-full items-start gap-1.5 rounded bg-muted/60 px-2 py-1 text-[10px] font-medium leading-snug text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="min-w-0 break-words">
                            {contact.clients?.name || "Cliente não informado"}
                          </span>
                        </div>

                        <div className="min-w-0 space-y-2 pt-1">
                          <div className="flex min-w-0 items-start gap-2.5 text-sm group/link">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                              <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span
                              className="min-w-0 break-all pt-1 text-xs leading-relaxed text-foreground/80 selection:bg-blue-100 selection:text-blue-900"
                              title={contact.email || ""}
                            >
                              {contact.email || (
                                <span className="text-muted-foreground italic">
                                  Não informado
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex min-w-0 items-start gap-2.5 text-sm">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                              <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="min-w-0 break-words pt-1 text-xs leading-relaxed text-foreground/80">
                              {contact.phone || (
                                <span className="text-muted-foreground italic">
                                  Não informado
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {contact.notes && (
                          <div className="relative mt-3 min-w-0 rounded border-t bg-muted/10 p-2 pt-3 text-xs italic text-muted-foreground">
                            <span className="absolute left-1 top-1 text-2xl leading-none text-muted-foreground/20">
                              "
                            </span>
                            <span className="relative z-10 block min-w-0 break-words pl-2 leading-relaxed line-clamp-3">
                              {contact.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div
                className="mt-4 flex min-w-0 flex-col gap-3 border-t px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-2"
                data-testid="commercial-contacts-pagination"
              >
                <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
                  Mostrando{" "}
                  <strong className="font-semibold text-foreground">
                    {firstVisibleItem}–{lastVisibleItem}
                  </strong>{" "}
                  de{" "}
                  <strong className="font-semibold text-foreground">
                    {filteredContacts.length}
                  </strong>
                </p>

                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <span>Por página</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setSelectedPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger
                        className="h-8 w-[68px]"
                        aria-label="Contatos por página"
                      >
                        <SelectValue placeholder={itemsPerPage.toString()} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="whitespace-nowrap text-xs font-medium sm:text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(page - 1, 1))
                      }
                      disabled={currentPage === 1}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(page + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent
          className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-[500px] flex-col overflow-hidden p-4 sm:p-6"
          data-testid="commercial-contact-dialog"
        >
          <DialogHeader className="min-w-0 shrink-0 pr-8">
            <DialogTitle className="flex min-w-0 items-center gap-2 text-lg font-bold sm:text-xl">
              {editingContact ? (
                <Pencil className="h-5 w-5 shrink-0 text-purple-600" />
              ) : (
                <Plus className="h-5 w-5 shrink-0 text-purple-600" />
              )}
              <span className="min-w-0 break-words">
                {editingContact ? "Editar Contato" : "Novo Contato"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-left text-xs leading-relaxed sm:text-sm">
              Preencha as informações do contato abaixo. Todos os campos com *
              são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
          >
            <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-1 py-3">
              <div className="space-y-2">
                <Label
                  htmlFor="client"
                  className="text-xs font-bold uppercase text-muted-foreground"
                >
                  Cliente *
                </Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, client_id: val })
                  }
                  disabled={!!selectedClientId && !editingContact}
                >
                  <SelectTrigger
                    className="h-10 w-full min-w-0"
                    aria-label="Cliente do contato"
                  >
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"
                data-testid="commercial-contact-primary-fields"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Nome Completo *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="h-10"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="role"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Cargo / Papel
                  </Label>
                  <Input
                    id="role"
                    placeholder="Ex: Gerente"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(XX) 99999-9999"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold uppercase text-muted-foreground"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="notes"
                  className="text-xs font-bold uppercase text-muted-foreground"
                >
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Informações adicionais sobre o contato..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t pt-4 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Contato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
