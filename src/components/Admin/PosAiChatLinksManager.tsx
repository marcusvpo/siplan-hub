import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquareText,
  PowerOff,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { PosAiChatLink } from "@/hooks/usePosAiChatLinks";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/error-message";
import { activityLogger } from "@/services/activityLogger";

interface PosAiChatLinksManagerProps {
  links: PosAiChatLink[];
  isLoading: boolean;
  focusId?: string | null;
  quickFilter?: "active" | "standalone" | null;
  onViewChats: (linkId: string) => void;
}

type StatusFilter = "active" | "inactive" | "all";

export function PosAiChatLinksManager({
  links,
  isLoading,
  focusId,
  quickFilter,
  onViewChats,
}: PosAiChatLinksManagerProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManageLinks = hasPermission("pos_ai_logs", "manage");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [linkToDeactivate, setLinkToDeactivate] = useState<PosAiChatLink | null>(null);

  const activeCount = links.filter((link) => link.enabled).length;
  const inactiveCount = links.length - activeCount;

  const filteredLinks = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    return links
      .filter((link) => {
        const effectiveStatus = quickFilter === "active" ? "active" : statusFilter;
        if (effectiveStatus === "active" && !link.enabled) return false;
        if (effectiveStatus === "inactive" && link.enabled) return false;
        if (quickFilter === "standalone" && link.project_id) return false;
        if (!normalizedSearch) return true;

        return (
          link.client_name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
          link.system_type.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
        );
      })
      .sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId));
  }, [focusId, links, quickFilter, search, statusFilter]);

  const getPublicUrl = (linkId: string) => `${window.location.origin}/public/pos-chat/${linkId}`;

  const handleCopy = async (link: PosAiChatLink) => {
    try {
      await navigator.clipboard.writeText(getPublicUrl(link.id));
      setCopiedId(link.id);
      toast.success("Link público copiado.");
      window.setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const invalidateLinks = async (link: PosAiChatLink) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["posAiChatLinks"] }),
      queryClient.invalidateQueries({ queryKey: ["activePosAiProjectsList"] }),
      queryClient.invalidateQueries({ queryKey: ["projectsList"] }),
      ...(link.project_id
        ? [queryClient.invalidateQueries({ queryKey: ["projectDetails", link.project_id] })]
        : []),
    ]);
  };

  const updateLinkStatus = async (link: PosAiChatLink, enabled: boolean) => {
    setUpdatingId(link.id);
    try {
      const now = new Date().toISOString();

      if (link.managed_by === "link") {
        const { data, error } = await supabase.rpc("set_pos_ai_chat_link_enabled", {
          p_link_id: link.id,
          p_enabled: enabled,
        });
        if (error) throw error;
        if (!(data as { success?: boolean } | null)?.success) throw new Error("O banco não confirmou a alteração do link.");
      } else {
        const { error } = await supabase
          .from("projects")
          .update({
            custom_fields: {
              ...link.custom_fields,
              pos_assistant_enabled: enabled,
              pos_assistant_activated_at: enabled ? link.activated_at || now : link.activated_at,
              pos_assistant_disabled_at: enabled ? null : now,
            },
          })
          .eq("id", link.id);
        if (error) throw error;
        await activityLogger.log({
          action: "custom_action",
          details: {
            projectId: link.project_id || link.id,
            projectName: link.client_name,
            entityType: "pos_ai_chat",
            entityId: link.id,
            additionalInfo: { action: enabled ? "link_reactivated" : "link_disabled" },
          },
        });
      }

      await invalidateLinks(link);
      toast.success(enabled ? "Link reativado com sucesso." : "Acesso ao chat encerrado.");
      setLinkToDeactivate(null);
    } catch (error) {
      toast.error(
        `Erro ao ${enabled ? "reativar" : "encerrar"} o acesso: ${
          getErrorMessage(error, "erro desconhecido")
        }`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="min-w-0 overflow-hidden border-border/70 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-3 py-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <CardTitle className="text-xs">Links de acesso dos clientes</CardTitle>
              <Badge className="h-5 bg-emerald-50 px-1.5 text-[9px] text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                {activeCount} ativo{activeCount === 1 ? "" : "s"}
              </Badge>
              {inactiveCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">
                  {inactiveCount} encerrado{inactiveCount === 1 ? "" : "s"}
                </Badge>
              )}
              {!canManageLinks && <Badge variant="outline" className="h-5 px-1.5 text-[9px]">Somente leitura</Badge>}
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Controle o acesso, acompanhe o uso e abra as conversas de cada cliente.
            </p>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-[minmax(220px,1fr)_150px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente ou sistema..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os links</SelectItem>
                <SelectItem value="active">Links ativos</SelectItem>
                <SelectItem value="inactive">Encerrados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2.5 sm:p-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando links...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <Link2 className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs font-medium">Nenhum link encontrado</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Ajuste a busca ou gere um novo link.</p>
          </div>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {filteredLinks.map((link) => {
              const publicUrl = getPublicUrl(link.id);
              const isUpdating = updatingId === link.id;

              return (
                <article
                  key={link.id}
                  className={`rounded-lg border bg-card px-3 py-2.5 transition-all hover:border-rose-200 hover:shadow-sm dark:hover:border-rose-900 ${
                    link.id === focusId ? "border-rose-400 ring-2 ring-rose-500/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="break-words text-xs font-semibold sm:truncate">{link.client_name}</p>
                        <Badge
                          variant="outline"
                          className={
                            link.enabled
                              ? "border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[9px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                          }
                        >
                          {link.enabled ? "Ativo" : "Encerrado"}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-muted-foreground">
                        {link.project_id ? <Building2 className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                        <span>{link.project_id ? "Vinculado a projeto" : "Cliente avulso"}</span>
                        <span>·</span>
                        <span>{link.system_type}</span>
                        <span className="text-border">|</span>
                        <span><strong className="font-semibold text-foreground">{link.conversation_count}</strong> conversas</span>
                        <span>·</span>
                        <span><strong className="font-semibold text-foreground">{link.message_count}</strong> mensagens</span>
                        <span>·</span>
                        <span><strong className="font-semibold text-foreground">{link.visitor_count}</strong> usuários</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                      aria-label={`Abrir chat de ${link.client_name}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2 grid min-w-0 grid-cols-2 items-center gap-1.5 sm:flex sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => void handleCopy(link)}
                      className="col-span-2 flex h-8 min-w-0 items-center gap-1.5 rounded-md border bg-background px-2 text-left transition-colors hover:bg-muted/40 sm:col-span-1 sm:h-7 sm:flex-1"
                    >
                      {copiedId === link.id ? (
                        <Check className="h-3 w-3 shrink-0 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-muted-foreground">
                        {publicUrl}
                      </span>
                      <span className="text-[9px] font-medium">{copiedId === link.id ? "Copiado" : "Copiar"}</span>
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-0 gap-1 px-2 text-[10px] sm:h-7 sm:shrink-0"
                      onClick={() => onViewChats(link.id)}
                    >
                      <MessageSquareText className="h-3 w-3 text-blue-600" />
                      Conversas
                    </Button>
                    {canManageLinks && (link.enabled ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-0 gap-1 border-amber-300 px-2 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 sm:h-7 sm:shrink-0"
                        onClick={() => setLinkToDeactivate(link)}
                        disabled={isUpdating}
                      >
                        <PowerOff className="h-3 w-3" />
                        Encerrar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 min-w-0 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-700 sm:h-7 sm:shrink-0"
                        onClick={() => void updateLinkStatus(link, true)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Reativar
                      </Button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={canManageLinks && Boolean(linkToDeactivate)} onOpenChange={(open) => !open && setLinkToDeactivate(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 break-words pr-8 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Encerrar acesso ao chat?
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs leading-relaxed">
              O link de <strong>{linkToDeactivate?.client_name}</strong> deixará de aceitar novas perguntas.
              As conversas continuarão disponíveis nesta central.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setLinkToDeactivate(null)} disabled={Boolean(updatingId)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => linkToDeactivate && void updateLinkStatus(linkToDeactivate, false)}
              disabled={Boolean(updatingId)}
            >
              {updatingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
              Encerrar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
