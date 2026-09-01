import { useDeferredValue, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageSquareText,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { SearchableClientSelect } from "@/components/Admin/SearchableClientSelect";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPosAiChatVisitorsPage,
  type PosAiChatVisitorAdmin,
  type PosAiVisitorStatus,
  usePosAiChatVisitors,
} from "@/hooks/usePosAiChatVisitors";
import type { PosAiChatLink } from "@/hooks/usePosAiChatLinks";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/csv-export";
import { getErrorMessage } from "@/lib/error-message";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface PosAiChatUsersManagerProps {
  links: PosAiChatLink[];
  canManage: boolean;
  onViewConversations: (linkId: string, visitorId: string) => void;
}

interface VisitorActionResult {
  success?: boolean;
  active?: boolean;
  visitor?: PosAiChatVisitorAdmin;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
}

export function PosAiChatUsersManager({
  links,
  canManage,
  onViewConversations,
}: PosAiChatUsersManagerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<PosAiVisitorStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [editingVisitor, setEditingVisitor] = useState<PosAiChatVisitorAdmin | null>(null);
  const [statusVisitor, setStatusVisitor] = useState<PosAiChatVisitorAdmin | null>(null);
  const [editName, setEditName] = useState("");
  const [editSector, setEditSector] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const params = {
    page,
    pageSize,
    search: deferredSearch,
    linkId: clientFilter === "all" ? null : clientFilter,
    status: statusFilter,
  };
  const { data, isLoading, isFetching, refetch } = usePosAiChatVisitors(params);
  const users = data?.items || [];

  useEffect(() => setPage(1), [clientFilter, deferredSearch, pageSize, statusFilter]);
  useEffect(() => {
    if (data?.page && page !== data.page) setPage(data.page);
  }, [data?.page, page]);

  const invalidateVisitorData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["posAiChatVisitors"] }),
      queryClient.invalidateQueries({ queryKey: ["posAiChatVisitorOptions"] }),
      queryClient.invalidateQueries({ queryKey: ["posAiChatLinks"] }),
      queryClient.invalidateQueries({ queryKey: ["posAiChatConversations"] }),
      queryClient.invalidateQueries({ queryKey: ["posAiVisitorAnalytics"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
    ]);
  };

  const openEditDialog = (visitor: PosAiChatVisitorAdmin) => {
    setEditingVisitor(visitor);
    setEditName(visitor.name);
    setEditSector(visitor.sector);
  };

  const handleUpdateVisitor = async () => {
    if (!editingVisitor) return;
    const name = editName.trim();
    const sector = editSector.trim();
    if (name.length < 2 || sector.length < 2) {
      toast.error("Informe um nome e um setor com pelo menos 2 caracteres.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: resultData, error } = await supabase.rpc("manage_pos_ai_chat_visitor", {
        p_visitor_id: editingVisitor.id,
        p_name: name,
        p_sector: sector,
        p_delete: false,
        p_active: null,
      });
      if (error) throw error;
      const result = resultData as VisitorActionResult | null;
      if (!result?.success) throw new Error("A alteração do usuário não foi concluída.");
      await invalidateVisitorData();
      setEditingVisitor(null);
      toast.success("Usuário atualizado com sucesso.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível editar o usuário."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisitor = async () => {
    if (!statusVisitor) return;
    const nextActive = !statusVisitor.is_active;
    setIsSaving(true);
    try {
      const { data: resultData, error } = await supabase.rpc("manage_pos_ai_chat_visitor", {
        p_visitor_id: statusVisitor.id,
        p_name: null,
        p_sector: null,
        p_delete: false,
        p_active: nextActive,
      });
      if (error) throw error;
      const result = resultData as VisitorActionResult | null;
      if (!result?.success || result.active !== nextActive) {
        throw new Error("A situação do usuário não foi alterada.");
      }
      await invalidateVisitorData();
      setStatusVisitor(null);
      toast.success(nextActive ? "Usuário reativado com sucesso." : "Usuário desativado. O histórico foi preservado.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível alterar o usuário."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = await fetchPosAiChatVisitorsPage({ ...params, page: 1, pageSize: 5000 });
      downloadCsv(
        `usuarios-assistente-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Usuário", "Setor", "Cartório", "Sistema", "Situação", "Conversas", "Mensagens", "Último acesso"],
        exportData.items.map((user) => [
          user.name,
          user.sector,
          user.client_name,
          user.system_type,
          user.is_active ? "Ativo" : "Inativo",
          user.conversation_count,
          user.message_count,
          user.last_seen_at,
        ]),
      );
      toast.success(`${exportData.items.length} usuários exportados.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível exportar os usuários."));
    } finally {
      setIsExporting(false);
    }
  };

  const firstItem = data?.total ? (data.page - 1) * data.page_size + 1 : 0;
  const lastItem = Math.min((data?.page || 1) * (data?.page_size || pageSize), data?.total || 0);

  return (
    <>
      <Card className="min-w-0 overflow-hidden border-border/70 shadow-sm">
        <div className="flex flex-col gap-2 border-b bg-muted/20 px-3 py-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Usuários dos cartórios</h2>
              <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">{data?.total || 0} encontrados</Badge>
              <Badge className="bg-emerald-50 px-1.5 py-0 text-[9px] text-emerald-700 hover:bg-emerald-50">{data?.active || 0} ativos</Badge>
              {(data?.inactive || 0) > 0 && <Badge variant="outline" className="px-1.5 py-0 text-[9px]">{data?.inactive} inativos</Badge>}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Edite, desative, reative ou abra as conversas de cada pessoa sem perder o histórico.</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 sm:flex sm:flex-wrap">
            <div className="relative col-span-3 sm:col-span-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuário ou setor..." className="h-8 w-full pl-8 text-xs sm:w-52" />
            </div>
            <SearchableClientSelect
              value={clientFilter}
              options={[{ value: "all", label: "Todos os cartórios" }, ...links.map((link) => ({ value: link.id, label: link.client_name, details: `${link.visitor_count} usuários`, searchTerms: link.system_type }))]}
              placeholder="Filtrar por cartório"
              searchPlaceholder="Digite o nome do cartório..."
              buttonClassName="col-span-3 w-full sm:col-span-1 sm:w-56"
              onValueChange={setClientFilter}
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PosAiVisitorStatus)}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Atualizar usuários" disabled={isFetching} onClick={() => void refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Exportar usuários em CSV" disabled={isExporting || !data?.total} onClick={() => void handleExport()}>
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <CardContent className="p-2.5 sm:p-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center"><UsersRound className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" /><p className="text-xs font-medium">Nenhum usuário encontrado</p></div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-2 md:hidden" data-testid="pos-ai-users-mobile-list">
                {users.map((user) => (
                  <article
                    key={user.id}
                    className={`min-w-0 rounded-xl border bg-card p-3 ${!user.is_active ? "opacity-65" : ""}`}
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-1.5">
                          <p className="min-w-0 flex-1 break-words text-xs font-semibold">{user.name}</p>
                          <Badge variant={user.is_active ? "outline" : "secondary"} className="px-1 py-0 text-[8px]">
                            {user.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 break-words text-[10px] text-muted-foreground">{user.sector}</p>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2 text-[10px]">
                      <div className="col-span-2 min-w-0">
                        <span className="text-muted-foreground">Cartório</span>
                        <p className="break-words font-medium">{user.client_name}</p>
                        <p className="text-[9px] text-muted-foreground">{user.system_type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uso</span>
                        <p className="font-medium">{user.conversation_count} conv. · {user.message_count} msg.</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Último acesso</span>
                        <p className="font-medium">{formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true, locale: ptBR })}</p>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <Button type="button" variant="outline" size="sm" className="h-9 min-w-0 gap-1 px-1 text-[10px]" onClick={() => onViewConversations(user.project_id, user.id)}>
                        <MessageSquareText className="h-3.5 w-3.5 text-blue-600" /> Conversas
                      </Button>
                      {canManage && <Button type="button" variant="outline" size="sm" className="h-9 min-w-0 gap-1 px-1 text-[10px]" onClick={() => openEditDialog(user)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>}
                      {canManage && <Button type="button" variant="outline" size="sm" className={`h-9 min-w-0 gap-1 px-1 text-[10px] ${user.is_active ? "border-destructive/30 text-destructive" : "border-emerald-300 text-emerald-700"}`} onClick={() => setStatusVisitor(user)}>{user.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}{user.is_active ? "Desativar" : "Reativar"}</Button>}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-xl border md:block">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    <TableHead className="h-9 min-w-[210px] px-3 text-[10px]">Usuário</TableHead>
                    <TableHead className="h-9 min-w-[140px] px-3 text-[10px]">Setor</TableHead>
                    <TableHead className="h-9 min-w-[250px] px-3 text-[10px]">Cartório</TableHead>
                    <TableHead className="h-9 min-w-[100px] px-3 text-[10px]">Uso</TableHead>
                    <TableHead className="h-9 min-w-[120px] px-3 text-[10px]">Último acesso</TableHead>
                    <TableHead className="h-9 w-[135px] px-3 text-right text-[10px]">Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{users.map((user) => (
                    <TableRow key={user.id} className={!user.is_active ? "opacity-65" : undefined}>
                      <TableCell className="px-3 py-2"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{initials(user.name)}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{user.name}</p><Badge variant={user.is_active ? "outline" : "secondary"} className="mt-0.5 px-1 py-0 text-[8px]">{user.is_active ? "Ativo" : "Inativo"}</Badge></div></div></TableCell>
                      <TableCell className="px-3 py-2 text-[11px] text-muted-foreground">{user.sector}</TableCell>
                      <TableCell className="px-3 py-2"><div className="flex min-w-0 items-center gap-2"><Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate text-[11px] font-medium">{user.client_name}</p><p className="text-[9px] text-muted-foreground">{user.system_type}</p></div></div></TableCell>
                      <TableCell className="px-3 py-2 text-[10px] text-muted-foreground">{user.conversation_count} conv. · {user.message_count} msg.</TableCell>
                      <TableCell className="px-3 py-2 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true, locale: ptBR })}</TableCell>
                      <TableCell className="px-3 py-2"><div className="flex justify-end gap-1">
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" title="Ver conversas" aria-label={`Ver conversas de ${user.name}`} onClick={() => onViewConversations(user.project_id, user.id)}><MessageSquareText className="h-3.5 w-3.5 text-blue-600" /></Button>
                        {canManage && <Button type="button" variant="outline" size="icon" className="h-7 w-7" title="Editar usuário" aria-label={`Editar usuário ${user.name}`} onClick={() => openEditDialog(user)}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {canManage && <Button type="button" variant="outline" size="icon" className={`h-7 w-7 ${user.is_active ? "border-destructive/30 text-destructive" : "border-emerald-300 text-emerald-700"}`} title={user.is_active ? "Desativar usuário" : "Reativar usuário"} aria-label={`${user.is_active ? "Desativar" : "Reativar"} usuário ${user.name}`} onClick={() => setStatusVisitor(user)}>{user.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}</Button>}
                      </div></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Exibindo {firstItem}–{lastItem} de {data?.total || 0} usuários</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}><SelectTrigger className="h-7 w-[62px] px-2 text-[10px]" aria-label="Usuários por página"><SelectValue /></SelectTrigger><SelectContent>{PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent></Select><span>por página</span>
                  <span className="min-w-20 text-center">Página <strong className="text-foreground">{data?.page || 1}</strong> de {data?.total_pages || 1}</span>
                  <div className="flex gap-1"><Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Página anterior" disabled={(data?.page || 1) === 1} onClick={() => setPage((data?.page || 1) - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button><Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Próxima página" disabled={(data?.page || 1) >= (data?.total_pages || 1)} onClick={() => setPage((data?.page || 1) + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingVisitor)} onOpenChange={(open) => !open && !isSaving && setEditingVisitor(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md p-4 sm:p-6"><DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-violet-600" /> Editar usuário</DialogTitle><DialogDescription className="break-words text-xs">{editingVisitor?.client_name}</DialogDescription></DialogHeader><div className="space-y-3 py-1"><div className="space-y-1.5"><Label htmlFor="visitor-name" className="text-xs">Nome</Label><Input id="visitor-name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={80} /></div><div className="space-y-1.5"><Label htmlFor="visitor-sector" className="text-xs">Setor</Label><Input id="visitor-sector" value={editSector} onChange={(event) => setEditSector(event.target.value)} maxLength={80} /></div></div><DialogFooter><Button type="button" variant="outline" disabled={isSaving} onClick={() => setEditingVisitor(null)}>Cancelar</Button><Button type="button" disabled={isSaving} onClick={() => void handleUpdateVisitor()} className="gap-1.5">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar alterações</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(statusVisitor)} onOpenChange={(open) => !open && !isSaving && setStatusVisitor(null)}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:p-6"><AlertDialogHeader><AlertDialogTitle className="break-words">{statusVisitor?.is_active ? "Desativar" : "Reativar"} {statusVisitor?.name}?</AlertDialogTitle><AlertDialogDescription>{statusVisitor?.is_active ? "A pessoa não poderá mais selecionar este cadastro no chat. Conversas, mensagens e autoria histórica serão preservadas." : "A pessoa voltará a aparecer na seleção de usuários do chat deste cartório."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isSaving} onClick={(event) => { event.preventDefault(); void handleToggleVisitor(); }} className="gap-1.5">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : statusVisitor?.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}{isSaving ? "Salvando..." : statusVisitor?.is_active ? "Desativar usuário" : "Reativar usuário"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
