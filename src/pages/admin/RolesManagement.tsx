import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit, Shield, ArrowLeft } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const resourceTranslations: Record<string, string> = {
  projects: "Projetos",
  files: "Arquivos",
  menu_implantacao: "Menu Implantação",
  menu_calendario: "Menu Calendário",
  menu_comercial: "Menu Comercial",
  menu_conversao: "Menu Conversão",
  menu_orion: "Menu OrionTN",
  menu_reports: "Menu Relatórios",
  commercial_customers: "Comercial - Clientes",
  commercial_blockers: "Comercial - Bloqueios",
  commercial_contacts: "Comercial - Contatos",
  conversion_home: "Conversão - Gestão",
  conversion_engines: "Conversão - Motores",
  conversion_homologation: "Conversão - Homologação",
  calendar_projects: "Calendário - Projetos",
  calendar_analysts: "Calendário - Analistas",
  orion_dashboard: "Orion - Dashboard",
  orion_projects: "Orion - Projetos",
  orion_editor: "Orion - Editor",
  orion_export: "Orion - Exportação",
  users: "Usuários (Admin)",
  teams: "Equipes (Admin)",
  roles: "Perfis (Admin)",
  audit_logs: "Logs de Auditoria (Admin)",
  vacations: "Férias (Admin)",
  settings: "Configurações Globais (Admin)",
};

const actionTranslations: Record<string, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar / Modificar",
  delete: "Excluir / Remover",
  manage: "Gerenciamento Total",
  execute: "Executar Ação",
  upload: "Enviar Arquivos",
  download: "Baixar Arquivos",
};

interface AppRole {
  id: string;
  name: string;
  description: string;
}

interface AppPermission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

export default function RolesManagement() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();
  const { logAction } = useAuditLogs();

  // Form State
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
        supabase.from("app_roles").select("*").order("name"),
        supabase.from("app_permissions").select("*").order("resource"),
        supabase.from("app_role_permissions").select("*")
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;

      setRoles(rolesRes.data as AppRole[]);
      setPermissions(permsRes.data as AppPermission[]);

      const rpMap: Record<string, string[]> = {};
      rolesRes.data.forEach((r) => {
        rpMap[r.id] = rolePermsRes.data
          .filter((rp) => rp.role_id === r.id)
          .map((rp) => rp.permission_id);
      });
      setRolePermissions(rpMap);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message || "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateForm = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setView("form");
  };

  const openEditForm = (role: AppRole) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPermissions(rolePermissions[role.id] || []);
    setView("form");
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let currentRoleId = editingRoleId;

      if (!currentRoleId) {
        // Create new role
        const { data, error } = await supabase
          .from("app_roles")
          .insert({ name: roleName, description: roleDescription })
          .select()
          .single();

        if (error) throw error;
        currentRoleId = data.id;
        
        logAction.mutate({
          action: "ROLE_CREATED",
          details: { roleName },
        });
      } else {
        // Update existing
        const { error } = await supabase
          .from("app_roles")
          .update({ name: roleName, description: roleDescription })
          .eq("id", currentRoleId);

        if (error) throw error;

        logAction.mutate({
          action: "ROLE_UPDATED",
          details: { roleId: currentRoleId, roleName },
        });
      }

      // Sync permissions
      // First, delete existing specific to this role
      await supabase
        .from("app_role_permissions")
        .delete()
        .eq("role_id", currentRoleId);

      // Insert new ones
      if (selectedPermissions.length > 0) {
        const inserts = selectedPermissions.map(pid => ({
          role_id: currentRoleId,
          permission_id: pid
        }));
        const { error: insertError } = await supabase
          .from("app_role_permissions")
          .insert(inserts);
          
        if (insertError) throw insertError;
      }

      toast({
        title: "Sucesso",
        description: `Perfil ${editingRoleId ? "atualizado" : "criado"} com sucesso.`,
      });

      setView("list");
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar perfil",
        description: error.message || "Erro desconhecido",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: AppRole) => {
    if (role.name === 'admin' || role.name === 'user') {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Não é possível excluir os perfis padrão do sistema.",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o perfil '${role.name}'? Usuários vinculados podem perder acesso.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("app_roles")
        .delete()
        .eq("id", role.id);
        
      if (error) throw error;

      logAction.mutate({
        action: "ROLE_DELETED",
        details: { roleId: role.id, roleName: role.name },
      });

      toast({
        title: "Perfil removido",
        description: "O perfil foi removido com sucesso.",
      });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message || "Erro desconhecido",
      });
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleCategoryPermissions = (categoryPerms: AppPermission[]) => {
    const permIds = categoryPerms.map(p => p.id);
    const allSelected = permIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedPermissions(prev => prev.filter(id => !permIds.includes(id)));
    } else {
      // Select all (adding only those that aren't already included)
      setSelectedPermissions(prev => [
        ...prev,
        ...permIds.filter(id => !prev.includes(id))
      ]);
    }
  };

  // Group permissions by category then by resource
  const getCategory = (resource: string) => {
    if (resource.startsWith('commercial_') || resource === 'menu_comercial') return 'Comercial';
    if (resource.startsWith('calendar_') || resource === 'menu_calendario') return 'Calendário';
    if (resource.startsWith('conversion_') || resource === 'menu_conversao') return 'Conversão';
    if (resource.startsWith('orion_') || resource === 'menu_orion') return 'Modelos Editor OrionTN';
    if (['users', 'teams', 'roles', 'audit_logs', 'vacations', 'settings'].includes(resource)) return 'Administração';
    if (resource === 'projects' || resource === 'menu_implantacao') return 'Implantação & Projetos';
    if (resource === 'files' || resource === 'menu_reports') return 'Relatórios & Arquivos';
    return 'Outros';
  };

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    const category = getCategory(perm.resource);
    if (!acc[category]) acc[category] = {};
    if (!acc[category][perm.resource]) acc[category][perm.resource] = [];
    acc[category][perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Record<string, AppPermission[]>>);

  if (view === "form") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView("list")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {editingRoleId ? "Editar Perfil" : "Criar Novo Perfil"}
            </h2>
            <p className="text-muted-foreground">
              Defina o nome e as permissões atreladas a este perfil.
            </p>
          </div>
        </div>
        <form onSubmit={handleSaveRole} className="space-y-8 bg-card border rounded-lg p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Perfil</Label>
              <Input
                id="name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
                disabled={roleName === 'admin' || roleName === 'user'}
                placeholder="Ex: Gerente Comercial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Acesso total aos módulos do comercial"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="pb-2 border-b">
              <h3 className="text-lg font-medium">Permissões de Acesso</h3>
              <p className="text-sm text-muted-foreground">Selecione quais áreas do sistema este perfil poderá acessar e quais ações poderá realizar.</p>
            </div>
            <Accordion type="multiple" className="w-full space-y-4">
              {Object.entries(permissionsByCategory).map(([category, resources]) => {
                // Collect all permissions for this category to check "Select All" state
                const categoryPerms = Object.values(resources).flat();
                const isAllSelected = categoryPerms.every(p => selectedPermissions.includes(p.id));
                const isSomeSelected = categoryPerms.some(p => selectedPermissions.includes(p.id));

                return (
                  <AccordionItem key={category} value={category} className="border bg-card rounded-lg px-2 shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-4 px-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground/90">{category}</h3>
                        {isAllSelected && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Acesso Total</span>
                        )}
                        {!isAllSelected && isSomeSelected && (
                          <span className="text-[10px] bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full font-medium">Parcial</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4">
                      <div className="flex justify-end mb-4 border-b pb-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleCategoryPermissions(categoryPerms)}
                          className="text-xs h-8"
                        >
                          {isAllSelected ? "Remover Todos" : "Selecionar Todos"}
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(resources).map(([resource, perms]) => (
                        <div key={resource} className="space-y-3 border p-4 rounded-md bg-muted/10 hover:bg-muted/30 transition-colors">
                          <h4 className="font-semibold capitalize text-sm text-primary">
                            {resourceTranslations[resource] || resource}
                          </h4>
                          <div className="space-y-3 pt-1">
                            {perms.map(perm => (
                              <div key={perm.id} className="flex flex-row items-start space-x-3">
                                <Checkbox 
                                  id={`perm-${perm.id}`} 
                                  checked={selectedPermissions.includes(perm.id)}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                  className="mt-0.5"
                                />
                                <div className="space-y-1.5 leading-none">
                                  <label
                                    htmlFor={`perm-${perm.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                                  >
                                    {actionTranslations[perm.action] || perm.action}
                                  </label>
                                  <p className="text-[0.8rem] text-muted-foreground leading-snug">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
              })}
            </Accordion>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setView("list")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Perfil
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Perfis de Acesso
          </h2>
          <p className="text-muted-foreground">
            Gerencie os perfis que podem ser atribuídos aos usuários.
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Perfil
        </Button>
      </div>

      <div className="border rounded-md bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome e Nível</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Acessos Liberados</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum perfil encontrado.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id} className="group hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span>{role.name}</span>
                        {role.name === 'admin' && <span className="text-[10px] uppercase text-primary font-bold">Default System Admin</span>}
                        {role.name === 'user' && <span className="text-[10px] uppercase text-muted-foreground font-bold">Default User Role</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description || "Nenhuma descrição informada."}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full font-medium">
                      {rolePermissions[role.id]?.length || 0} permissões
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditForm(role)}
                        title="Editar Perfil"
                      >
                        <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteRole(role)}
                        disabled={role.name === 'admin' || role.name === 'user'}
                        title="Excluir Perfil"
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
    </div>
  );
}
