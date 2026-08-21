import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquareText,
  PowerOff,
  RefreshCw,
  Search,
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

interface PosAiChatLinksManagerProps {
  links: PosAiChatLink[];
  isLoading: boolean;
  selectedProject: string;
  onViewLogs: (projectId: string) => void;
}

type StatusFilter = "active" | "inactive" | "all";

export function PosAiChatLinksManager({
  links,
  isLoading,
  selectedProject,
  onViewLogs,
}: PosAiChatLinksManagerProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManageLinks = hasPermission("pos_ai_logs", "manage");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [linkToDeactivate, setLinkToDeactivate] = useState<PosAiChatLink | null>(null);

  const activeCount = links.filter((link) => link.enabled).length;
  const inactiveCount = links.length - activeCount;

  const filteredLinks = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    return links.filter((link) => {
      if (selectedProject !== "all" && link.id !== selectedProject) return false;
      if (statusFilter === "active" && !link.enabled) return false;
      if (statusFilter === "inactive" && link.enabled) return false;
      if (!normalizedSearch) return true;

      return (
        link.client_name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
        link.system_type.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
      );
    });
  }, [links, search, selectedProject, statusFilter]);

  const getPublicUrl = (projectId: string) =>
    `${window.location.origin}/public/pos-chat/${projectId}`;

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

  const updateLinkStatus = async (link: PosAiChatLink, enabled: boolean) => {
    setUpdatingId(link.id);
    try {
      const now = new Date().toISOString();
      const updatedCustomFields = {
        ...link.custom_fields,
        pos_assistant_enabled: enabled,
        pos_assistant_activated_at:
          enabled && !link.activated_at ? now : link.activated_at,
        pos_assistant_disabled_at: enabled ? null : now,
      };

      const { error } = await supabase
        .from("projects")
        .update({ custom_fields: updatedCustomFields })
        .eq("id", link.id);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posAiChatLinks"] }),
        queryClient.invalidateQueries({ queryKey: ["activePosAiProjectsList"] }),
        queryClient.invalidateQueries({ queryKey: ["projectsList"] }),
        queryClient.invalidateQueries({ queryKey: ["projectDetails", link.id] }),
      ]);

      toast.success(enabled ? "Assistente reativado com sucesso." : "Acesso ao assistente encerrado.");
      setLinkToDeactivate(null);
    } catch (error) {
      toast.error(
        `Erro ao ${enabled ? "reativar" : "encerrar"} o acesso: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b px-4 py-3">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm">Links dos Chats de Pós-Implantação</CardTitle>
              <Badge className="bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                {activeCount} ativo{activeCount === 1 ? "" : "s"}
              </Badge>
              {inactiveCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {inactiveCount} encerrado{inactiveCount === 1 ? "" : "s"}
                </Badge>
              )}
              {!canManageLinks && <Badge variant="outline" className="text-[10px]">Somente leitura</Badge>}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Copie, abra ou controle o acesso dos links exclusivos de cada cartório.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_150px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cartório..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Links ativos</SelectItem>
                <SelectItem value="inactive">Encerrados</SelectItem>
                <SelectItem value="all">Todos os links</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando links...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Link2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
            <p className="text-xs font-medium">Nenhum link encontrado</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Ajuste a busca ou o filtro de status.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLinks.map((link) => {
              const publicUrl = getPublicUrl(link.id);
              const isUpdating = updatingId === link.id;

              return (
                <div
                  key={link.id}
                  className="rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-rose-200 dark:hover:border-rose-900"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-semibold">{link.client_name}</p>
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
                        <span className="text-[10px] text-muted-foreground">
                          {link.message_count} mensagem{link.message_count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        {publicUrl}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[10px]"
                        onClick={() => void handleCopy(link)}
                      >
                        {copiedId === link.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedId === link.id ? "Copiado" : "Copiar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[10px]"
                        onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[10px]"
                        onClick={() => onViewLogs(link.id)}
                      >
                        <MessageSquareText className="h-3 w-3 text-blue-600" />
                        Conversas
                      </Button>
                      {canManageLinks && (link.enabled ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 border-amber-300 px-2 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
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
                          className="h-7 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-700"
                          onClick={() => void updateLinkStatus(link, true)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Reativar
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={canManageLinks && Boolean(linkToDeactivate)} onOpenChange={(open) => !open && setLinkToDeactivate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Encerrar acesso ao assistente?
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs leading-relaxed">
              O link de <strong>{linkToDeactivate?.client_name}</strong> deixará de aceitar novas
              perguntas. As conversas e métricas continuarão disponíveis neste painel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLinkToDeactivate(null)}
              disabled={Boolean(updatingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => linkToDeactivate && void updateLinkStatus(linkToDeactivate, false)}
              disabled={Boolean(updatingId)}
            >
              {updatingId ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PowerOff className="h-3.5 w-3.5" />
              )}
              Encerrar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
