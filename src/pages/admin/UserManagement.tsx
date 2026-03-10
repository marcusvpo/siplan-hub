import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, UserCog, Edit, Search, ChevronLeft, ChevronRight, FilterX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTeams } from "@/hooks/useTeams";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useMemo } from "react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 6;

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { teams } = useTeams();
  const { logAction } = useAuditLogs();

  // New Search and Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Create Form State
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("user");
  const [newUserTeam, setNewUserTeam] = useState<string>("");

  // Edit Form State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("user");
  const [editTeam, setEditTeam] = useState<string>("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setUsers(data as Profile[]);

      const { data: rolesData, error: rolesError } = await supabase
        .from("app_roles")
        .select("id, name")
        .order("name");
        
      if (!rolesError && rolesData) {
        setRoles(rolesData);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtering Logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
      
      const matchesTeam = teamFilter === "all" || user.team === teamFilter;
      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesTeam && matchesRole;
    });
  }, [users, searchTerm, teamFilter, roleFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, teamFilter, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            storage: undefined,
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        },
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserName,
            // Pass team in metadata
            team: newUserTeam || null,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Explicitly update the profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: newUserName,
            team: newUserTeam || null,
            role: newUserRole,
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Error updating profile after signup:", profileError);
          toast({
            variant: "destructive",
            title: "Usuário criado, mas erro ao atualizar perfil",
            description: profileError.message,
          });
        } else {
          logAction.mutate({
            action: "USER_CREATED",
            details: { email: newUserEmail, role: newUserRole },
          });
          toast({
            title: "Usuário criado com sucesso",
            description: `O usuário ${newUserName} foi criado.`,
          });
        }

        setIsCreateOpen(false);
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserName("");
        setNewUserRole("user");
        setNewUserTeam("");
        fetchUsers();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: errorMessage,
      });
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (user: Profile) => {
    setEditingUser(user);
    setEditName(user.full_name || "");
    setEditRole(user.role || "user");
    setEditTeam(user.team || "");
    setIsEditOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName,
          role: editRole,
          team: editTeam || null,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      logAction.mutate({
        action: "USER_UPDATED",
        details: {
          userId: editingUser.id,
          updates: { full_name: editName, role: editRole },
        },
      });
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });

      setIsEditOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: errorMessage,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.",
      )
    )
      return;

    try {
      // NOTE: We can't delete from auth.users easily via client.
      // We can only delete the profile usually.
      // Real deletion requires a backend function or Supabase Admin API.
      // Assuming existing logic (deleting profile) is what user wants,
      // or that an Edge Function handles it.
      // But for now, we just delete the profile row as per previous code.
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (error) throw error;

      logAction.mutate({ action: "USER_DELETED", details: { userId } });
      toast({
        title: "Usuário removido",
        description:
          "O perfil do usuário foi removido. Ele perderá acesso à plataforma.",
      });
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: errorMessage,
      });
    }
  };

  const getTeamLabel = (value: string | null) => {
    if (!value) return "-";
    // Try to find in loaded teams, else return value itself
    const team = teams?.find((t) => t.value === value);
    return team ? team.label : value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Gerenciamento de Usuários
          </h2>
          <p className="text-muted-foreground">
            Crie e gerencie as contas de acesso e times da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Times</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.value}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name === 'admin' ? 'Administrador' : r.name === 'user' ? 'Usuário Padrão' : r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário à plataforma. Ele poderá fazer login
                  imediatamente.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <Select
                      value={newUserRole}
                      onValueChange={(val: string) =>
                        setNewUserRole(val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.name}>
                            {r.name === 'admin' ? 'Administrador' : r.name === 'user' ? 'Usuário Padrão' : r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team">Time</Label>
                    <Select
                      value={newUserTeam}
                      onValueChange={(val: string) => setNewUserTeam(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.value}>
                            {team.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog Content */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editingUser?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Função</Label>
                <Select
                  value={editRole}
                  onValueChange={(val: string) => setEditRole(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name === 'admin' ? 'Administrador' : r.name === 'user' ? 'Usuário Padrão' : r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team">Time</Label>
                <Select
                  value={editTeam}
                  onValueChange={(val: string) => setEditTeam(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.value}>
                        {team.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Perfil de Acesso</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FilterX className="h-8 w-8 opacity-20" />
                      <p>Nenhum usuário encontrado com os filtros selecionados.</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => {
                          setSearchTerm("");
                          setTeamFilter("all");
                          setRoleFilter("all");
                        }}
                      >
                        Limpar todos os filtros
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-primary/5 flex items-center justify-center border border-primary/10">
                          <UserCog className="h-4 w-4 text-primary" />
                        </div>
                        {user.full_name || "Sem nome"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.team ? (
                        <Badge variant="outline" className="font-normal">{getTeamLabel(user.team)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="font-medium"
                      >
                        {user.role === "admin" ? "Administrador" : user.role === "user" ? "Usuário Padrão" : user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize">
                        {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Usuário Padrão' : user.role || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {user.created_at &&
                        format(new Date(user.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredUsers.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-2 py-2 bg-card border rounded-md">
            <p className="text-xs text-muted-foreground">
              Mostrando <strong>{paginatedUsers.length}</strong> de <strong>{filteredUsers.length}</strong> usuários
            </p>
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
