import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getActionLabel, getResourceLabel } from "@/constants/permissions";
import { type CsCxAccessProfile, useCsCxAccess } from "@/hooks/useCsCxAccess";
import { useToast } from "@/hooks/use-toast";

const EMPTY_PROFILE = { id: "", name: "", description: "", active: true, permissionIds: [] as string[] };
const ACTION_ORDER = ["view", "create", "edit", "delete", "view_others", "manage_others", "manage"];

export function CsCxAccessPanel({ canManage }: { canManage: boolean }) {
  const access = useCsCxAccess(canManage);
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [deletingProfile, setDeletingProfile] = useState<CsCxAccessProfile | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const permissions = access.permissions;

  const permissionsByResource = useMemo(() => {
    const grouped = permissions.reduce<Record<string, typeof permissions>>((groups, permission) => {
      (groups[permission.resource] ??= []).push(permission);
      return groups;
    }, {});
    Object.values(grouped).forEach((group) =>
      group.sort(
        (a, b) =>
          ACTION_ORDER.indexOf(a.action.trim().toLowerCase()) -
          ACTION_ORDER.indexOf(b.action.trim().toLowerCase()),
      ),
    );
    return grouped;
  }, [permissions]);

  function openProfile(profile?: CsCxAccessProfile) {
    setProfileForm(profile ? {
      id: profile.id,
      name: profile.name,
      description: profile.description ?? "",
      active: profile.active,
      permissionIds: profile.permission_ids,
    } : EMPTY_PROFILE);
    setProfileOpen(true);
  }

  async function assignUser(userId: string, profileId: string, active = true) {
    try {
      await access.assignUser.mutateAsync({ userId, profileId, active });
      toast({ title: "Acesso CS/CX atualizado" });
    } catch (error) {
      showError("Não foi possível atualizar o acesso", error);
    }
  }

  async function handleAddUser() {
    try {
      await access.assignUser.mutateAsync({ userId: selectedUserId, profileId: selectedProfileId });
      setAddOpen(false);
      setSelectedUserId("");
      setSelectedProfileId("");
      toast({ title: "Usuário adicionado ao grupo CS/CX" });
    } catch (error) {
      showError("Não foi possível adicionar o usuário", error);
    }
  }

  async function handleRemoveUser() {
    if (!removingUserId) return;
    try {
      await access.removeUser.mutateAsync(removingUserId);
      setRemovingUserId(null);
      toast({ title: "Usuário removido do grupo CS/CX" });
    } catch (error) {
      showError("Não foi possível remover o usuário", error);
    }
  }

  async function handleSaveProfile() {
    try {
      await access.saveProfile.mutateAsync({
        id: profileForm.id || undefined,
        name: profileForm.name,
        description: profileForm.description,
        active: profileForm.active,
        permissionIds: profileForm.permissionIds,
      });
      setProfileOpen(false);
      toast({ title: profileForm.id ? "Perfil CS/CX atualizado" : "Perfil CS/CX criado" });
    } catch (error) {
      showError("Não foi possível salvar o perfil", error);
    }
  }

  async function handleDeleteProfile() {
    if (!deletingProfile) return;
    try {
      await access.deleteProfile.mutateAsync(deletingProfile.id);
      setDeletingProfile(null);
      toast({ title: "Perfil CS/CX excluído" });
    } catch (error) {
      showError("Não foi possível excluir o perfil", error);
    }
  }

  function showError(title: string, error: unknown) {
    toast({ variant: "destructive", title, description: error instanceof Error ? error.message : "Erro desconhecido" });
  }

  if (access.isLoading) {
    return <Card><CardContent className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  if (access.error) {
    return <Card className="border-destructive/40"><CardContent className="flex min-h-32 flex-col items-center justify-center gap-3 p-4 text-center"><p className="text-sm text-destructive">Não foi possível carregar o controle de acesso do CS/CX.</p><Button variant="outline" size="sm" onClick={() => access.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></CardContent></Card>;
  }

  return (
    <Card data-testid="cs-cx-access-panel" className="min-w-0 max-md:[&_div.grid]:grid-cols-1 max-md:[&_div.grid]:items-stretch">
      <CardHeader className="px-4 pb-2 pt-3">
        <CardTitle className="text-sm">Controle de acesso exclusivo do CS/CX</CardTitle>
        <CardDescription className="text-xs">Os vínculos abaixo não alteram o perfil global nem liberam outras áreas do Siplan HUB.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Tabs defaultValue="users">
          <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:h-9 sm:w-auto"><TabsTrigger value="users" className="min-h-10 whitespace-normal px-2 sm:min-h-7"><Users className="mr-1.5 h-3.5 w-3.5" />Usuários do CS/CX</TabsTrigger><TabsTrigger value="profiles" className="min-h-10 whitespace-normal px-2 sm:min-h-7"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Perfis do CS/CX</TabsTrigger></TabsList>

          <TabsContent value="users" className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Usuários do grupo</h2><p className="text-xs text-muted-foreground">Somente pessoas vinculadas ao módulo aparecem nesta lista.</p></div>{canManage && <Button size="sm" className="h-8" onClick={() => setAddOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />Adicionar usuário</Button>}</div>
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_auto] gap-3 border-b bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Usuário</span><span>Perfil no CS/CX</span><span>Ações</span></div>
              {access.users.map((user) => (
                <div key={user.user_id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 last:border-b-0">
                  <div className="min-w-0"><div className="flex items-center gap-1.5"><p className="truncate text-sm font-semibold">{user.full_name || user.email}</p>{user.is_hub_admin && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Administrador HUB</Badge>}{!user.active && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Inativo</Badge>}</div><p className="truncate text-[11px] text-muted-foreground">{user.email}</p></div>
                  <Select value={user.access_profile_id} disabled={!canManage || user.is_hub_admin} onValueChange={(profileId) => assignUser(user.user_id, profileId, user.active)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{access.profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>)}</SelectContent></Select>
                  <div className="flex justify-end gap-1">{canManage && !user.is_hub_admin && <><Button variant="outline" size="sm" className="h-8" onClick={() => assignUser(user.user_id, user.access_profile_id, !user.active)}>{user.active ? "Desativar" : "Ativar"}</Button><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remover ${user.full_name || user.email} do CS/CX`} onClick={() => setRemovingUserId(user.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}</div>
                </div>
              ))}
              {!access.users.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhum usuário vinculado ao CS/CX.</p>}
            </div>
          </TabsContent>

          <TabsContent value="profiles" className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Perfis de acesso do módulo</h2><p className="text-xs text-muted-foreground">Aqui aparecem apenas as permissões das telas do CS/CX.</p></div>{canManage && <Button size="sm" className="h-8" onClick={() => openProfile()}><Plus className="mr-1.5 h-4 w-4" />Novo perfil</Button>}</div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {access.profiles.map((profile) => <div key={profile.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5"><h3 className="truncate text-sm font-semibold">{profile.name}</h3><Badge variant={profile.active ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]">{profile.active ? "Ativo" : "Inativo"}</Badge></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{profile.description || "Sem descrição"}</p></div><ShieldCheck className="h-4 w-4 shrink-0 text-rose-600" /></div><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{profile.user_count} usuários · {profile.permission_ids.length} permissões</span><div className="flex gap-0.5"><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${canManage ? "Editar" : "Visualizar"} perfil ${profile.name}`} onClick={() => openProfile(profile)}><Pencil className="h-4 w-4" /></Button>{canManage && <Button variant="ghost" size="icon" className="h-8 w-8" disabled={profile.user_count > 0} aria-label={`Excluir perfil ${profile.name}`} onClick={() => setDeletingProfile(profile)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div></div>)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Adicionar usuário ao CS/CX</DialogTitle><DialogDescription>O perfil global do usuário no HUB permanecerá inalterado.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Usuário do HUB</Label><Select value={selectedUserId} onValueChange={setSelectedUserId}><SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger><SelectContent>{access.candidates.map((candidate) => <SelectItem key={candidate.user_id} value={candidate.user_id}>{candidate.full_name || candidate.email} · {candidate.email}</SelectItem>)}</SelectContent></Select></div><div><Label>Perfil no CS/CX</Label><Select value={selectedProfileId} onValueChange={setSelectedProfileId}><SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger><SelectContent>{access.profiles.filter((profile) => profile.active).map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button><Button disabled={!selectedUserId || !selectedProfileId || access.assignUser.isPending} onClick={handleAddUser}>Adicionar ao CS/CX</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{profileForm.id ? "Perfil de acesso CS/CX" : "Novo perfil CS/CX"}</DialogTitle><DialogDescription>Somente recursos do módulo podem ser concedidos por este perfil.</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-[1fr_auto]"><div><Label htmlFor="cs-cx-profile-name">Nome</Label><Input id="cs-cx-profile-name" value={profileForm.name} disabled={!canManage} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} /></div><div className="flex min-w-44 items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:mt-6"><Label htmlFor="cs-cx-profile-active">Perfil ativo</Label><Switch id="cs-cx-profile-active" checked={profileForm.active} disabled={!canManage} onCheckedChange={(active) => setProfileForm((current) => ({ ...current, active }))} /></div></div><div><Label htmlFor="cs-cx-profile-description">Descrição</Label><Textarea id="cs-cx-profile-description" value={profileForm.description} disabled={!canManage} onChange={(event) => setProfileForm((current) => ({ ...current, description: event.target.value }))} /></div><div><div className="mb-2"><Label>Permissões das telas do CS/CX</Label><p className="text-xs text-muted-foreground">Nenhuma permissão geral do HUB é exibida ou alterada aqui.</p></div><div className="grid max-h-[45vh] gap-2 overflow-y-auto rounded-lg border p-3 md:grid-cols-2">{Object.entries(permissionsByResource).map(([resource, permissions]) => <div key={resource} className="rounded-lg border p-3"><h3 className="text-sm font-semibold">{getResourceLabel(resource)}</h3><div className="mt-2 space-y-2">{permissions.map((permission) => <label key={permission.id} className="flex items-start gap-2 text-xs"><Checkbox className="mt-0.5" checked={profileForm.permissionIds.includes(permission.id)} disabled={!canManage} onCheckedChange={(checked) => setProfileForm((current) => ({ ...current, permissionIds: checked ? [...current.permissionIds, permission.id] : current.permissionIds.filter((id) => id !== permission.id) }))} /><span><strong className="font-medium">{getActionLabel(permission.action)}</strong>{permission.description && <span className="block text-[11px] text-muted-foreground">{permission.description}</span>}</span></label>)}</div></div>)}</div></div></div><DialogFooter><Button variant="outline" onClick={() => setProfileOpen(false)}>{canManage ? "Cancelar" : "Fechar"}</Button>{canManage && <Button disabled={!profileForm.name.trim() || access.saveProfile.isPending} onClick={handleSaveProfile}>Salvar perfil</Button>}</DialogFooter></DialogContent></Dialog>

      <AlertDialog open={Boolean(removingUserId)} onOpenChange={(open) => !open && setRemovingUserId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover usuário do CS/CX?</AlertDialogTitle><AlertDialogDescription>O acesso ao módulo será removido, mas o perfil e as permissões gerais no HUB não serão alterados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleRemoveUser}>Remover do CS/CX</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={Boolean(deletingProfile)} onOpenChange={(open) => !open && setDeletingProfile(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir perfil “{deletingProfile?.name}”?</AlertDialogTitle><AlertDialogDescription>Perfis com usuários vinculados não podem ser excluídos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProfile}>Excluir perfil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  );
}
