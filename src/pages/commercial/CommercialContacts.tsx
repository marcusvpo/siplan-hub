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
} from "lucide-react";
import { useState } from "react";
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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  // Replaced Sheet with Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Advanced Filters
  const [roleFilter, setRoleFilter] = useState("");

  const { toast } = useToast();

  // Form State
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
    resetForm();
    if (selectedClientId) {
      setFormData((prev) => ({ ...prev, client_id: selectedClientId }));
    }
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
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

      const matchesRole = roleFilter
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
      client.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Extract unique roles for filter
  const uniqueRoles = Array.from(
    new Set(contacts?.map((c) => c.role).filter(Boolean))
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Contatos & Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a agenda de contatos unificada dos seus clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Cargos: Todos</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <Button
            onClick={handleOpenCreate}
            className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Contato
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Sidebar de Clientes */}
        <Card className="w-80 flex flex-col h-full border-r shrink-0 shadow-sm">
          <div className="p-4 border-b space-y-3 bg-muted/10">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Filtrar por Cliente
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-9 bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <Button
                variant={selectedClientId === null ? "secondary" : "ghost"}
                className={`w-full justify-start font-normal ${
                  selectedClientId === null
                    ? "bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-100"
                    : ""
                }`}
                onClick={() => setSelectedClientId(null)}
              >
                <Users className="h-4 w-4 mr-2" />
                Todos os Contatos
              </Button>
              {filteredClients.map((client) => (
                <Button
                  key={client.id}
                  variant={
                    selectedClientId === client.id ? "secondary" : "ghost"
                  }
                  className={`w-full justify-start font-normal truncate ${
                    selectedClientId === client.id
                      ? "bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-100 border-l-2 border-purple-500 rounded-l-none"
                      : ""
                  }`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <span className="truncate ml-6">{client.name}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Grid de Contatos */}
        <div className="flex-1 h-full overflow-y-auto pr-2">
          {filteredContacts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10 mx-4 mb-4">
              <User className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground opacity-80">
                Nenhum contato encontrado
              </h3>
              <p className="text-sm">
                Tente ajustar seus filtros ou selecione outro cliente.
              </p>
              {selectedClientId && (
                <Button
                  variant="outline"
                  onClick={handleOpenCreate}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar contato para este cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 pb-10 content-start">
              {filteredContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="group hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pl-5">
                    <div className="flex items-center gap-3 w-full overflow-hidden">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-800 shadow-sm shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-700 dark:text-purple-200 font-bold text-lg">
                          {contact.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5 overflow-hidden flex-1">
                        <CardTitle
                          className="text-base font-bold leading-tight truncate"
                          title={contact.name}
                        >
                          {contact.name}
                        </CardTitle>
                        {contact.role ? (
                          <p className="text-xs font-medium text-purple-600 dark:text-purple-300 truncate">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(contact)}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-700 focus:bg-red-50"
                          onClick={() => handleDelete(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent className="pl-5 pt-2">
                    <div className="space-y-3">
                      {/* Client Chip */}
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/60 text-[10px] font-medium text-muted-foreground w-fit max-w-full">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {contact.clients?.name}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center text-sm gap-2.5 group/link">
                          <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span
                            className="truncate text-foreground/80 text-xs selection:bg-blue-100 selection:text-blue-900"
                            title={contact.email || ""}
                          >
                            {contact.email || (
                              <span className="text-muted-foreground italic">
                                Não informado
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center text-sm gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                            <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-foreground/80 text-xs">
                            {contact.phone || (
                              <span className="text-muted-foreground italic">
                                Não informado
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {contact.notes && (
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground italic line-clamp-2 bg-muted/10 p-2 rounded relative">
                          <span className="absolute top-1 left-1 text-2xl text-muted-foreground/20 leading-none">
                            "
                          </span>
                          <span className="relative z-10 pl-2">
                            {contact.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editingContact ? (
                <Pencil className="h-5 w-5 text-purple-600" />
              ) : (
                <Plus className="h-5 w-5 text-purple-600" />
              )}
              {editingContact ? "Editar Contato" : "Novo Contato"}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do contato abaixo. Todos os campos com *
              são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
                <SelectTrigger className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Salvar Contato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
