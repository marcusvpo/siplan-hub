import { useEffect, useMemo, useState } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import type { SecondaryTicketHubStatus } from "@/integrations/supabase/types";
import {
  SecondaryTicketWithLinks,
  useProjectSecondaryTickets,
  useSecondaryProductCatalog,
  useSecondaryTicketMutations,
  useSecondaryTicketTramites,
} from "@/hooks/useSecondaryTickets";
import {
  buildSuggested0800Tramite,
  formatOpNumberDisplay,
  hasSecondary0800Divergence,
  isSecondaryClosedIn0800,
  isSecondaryTicketPendingAttention,
  isSecondaryWithCsOrBillingIn0800,
  matchSecondaryTicket,
  OFFICIAL_SECONDARY_PRODUCTS,
  SECONDARY_HUB_STATUS_MAP,
  SECONDARY_HUB_STATUS_OPTIONS,
} from "@/lib/secondary-products";
import { buildEllevoTicketUrl } from "@/lib/ellevo-ticket";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  History,
  KeyRound,
  Link2,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";

interface SecondaryProductsTabProps {
  project: ProjectV2;
  targetProduct?: string | null;
  onTargetProductScrolled?: () => void;
}

export function SecondaryProductsTab({
  project,
  targetProduct,
  onTargetProductScrolled,
}: SecondaryProductsTabProps) {
  const { hasPermission, canEditProjects } = usePermissions();
  const canEdit = hasPermission("secondary_products", "edit") || canEditProjects;
  const { user } = useAuth();
  const currentUserName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || "Usuário";

  const { data: tickets = [], isLoading } = useProjectSecondaryTickets(project.id);
  const { data: catalog = [] } = useSecondaryProductCatalog();
  const {
    updateSecondaryTicket,
    linkManualSecondaryTicket,
    unlinkSecondaryTicket,
    requestSync0800Now,
  } = useSecondaryTicketMutations();

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [manualTicketNumber, setManualTicketNumber] = useState("");
  const [manualProductCode, setManualProductCode] = useState("lcw");
  const [manualResponsible, setManualResponsible] = useState("");
  const [manualObservations, setManualObservations] = useState("");
  const [mirrorSiblings, setMirrorSiblings] = useState(true);

  const [tramitesDialogTicket, setTramitesDialogTicket] = useState<{
    ticketNumber: string;
    productName: string;
  } | null>(null);

  const [unlinkTarget, setUnlinkTarget] = useState<SecondaryTicketWithLinks | null>(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetProduct || tickets.length === 0) return;

    const matchedTicket = tickets.find((t) => matchSecondaryTicket(t, targetProduct));
    if (!matchedTicket) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`sec-ticket-card-${matchedTicket.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedTicketId(matchedTicket.id);
        const clearHighlightTimer = setTimeout(() => {
          setHighlightedTicketId(null);
        }, 3200);
        onTargetProductScrolled?.();
        return () => clearTimeout(clearHighlightTimer);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [targetProduct, tickets, onTargetProductScrolled]);

  const productOptions = useMemo(() => {
    if (catalog.length > 0) {
      return catalog.map((c) => ({
        code: c.code,
        name: c.name,
        onlySystemType: c.only_system_type,
        requiresOrionAdmin: c.requires_orion_admin,
      }));
    }
    return OFFICIAL_SECONDARY_PRODUCTS.map((c) => ({ ...c }));
  }, [catalog]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const pendingField = tickets.filter(
      (t) => t.hub_status === "pending" || t.hub_status === "in_progress"
    ).length;
    const sdQueue = tickets.filter((t) => t.hub_status === "handed_to_sd").length;
    const divergence0800 = tickets.filter((t) => hasSecondary0800Divergence(t)).length;
    const resolved = tickets.filter((t) => !isSecondaryTicketPendingAttention(t)).length;
    return { total, pendingField, sdQueue, divergence0800, resolved };
  }, [tickets]);

  // Chamados legados que estavam em relatedTickets mas ainda não existem em secondary_tickets
  const unmigratedLegacyTickets = useMemo(() => {
    const existingNums = new Set(tickets.map((t) => t.ticket_number.replace(/\D/g, "")));
    return (project.relatedTickets || []).filter((rt) => {
      const clean = (rt.number || "").replace(/\D/g, "");
      return clean.length >= 4 && !existingNums.has(clean);
    });
  }, [project.relatedTickets, tickets]);

  const handleManualCreate = async () => {
    if (!canEdit) return;
    const cleanTicket = manualTicketNumber.replace(/\D/g, "");
    if (cleanTicket.length < 4) {
      toast.error("Informe um número de chamado 0800 válido.");
      return;
    }

    const selectedProd = productOptions.find((p) => p.code === manualProductCode);
    if (!selectedProd) {
      toast.error("Selecione o produto secundário.");
      return;
    }

    if (selectedProd.onlySystemType && project.systemType !== selectedProd.onlySystemType) {
      toast.error(
        `O produto ${selectedProd.name} só pode ser vinculado a projetos ${selectedProd.onlySystemType}.`
      );
      return;
    }

    try {
      const res = await linkManualSecondaryTicket.mutateAsync({
        projectId: project.id,
        clientName: project.clientName,
        opNumber: project.opNumber ?? null,
        salesOrderNumber: project.salesOrderNumber ?? null,
        ticketNumber: cleanTicket,
        productCode: selectedProd.code,
        productName: selectedProd.name,
        onlySystemType: selectedProd.onlySystemType,
        responsible: manualResponsible || null,
        observations: manualObservations || null,
        mirrorToSiblingProjects: mirrorSiblings,
        updatedBy: currentUserName,
      });

      toast.success(
        res.linkedCount > 1
          ? `Chamado #${cleanTicket} vinculado e espelhado em ${res.linkedCount} projetos ativos do cartório!`
          : `Chamado #${cleanTicket} (${selectedProd.name}) vinculado com sucesso!`
      );
      setLinkDialogOpen(false);
      setManualTicketNumber("");
      setManualResponsible("");
      setManualObservations("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao vincular produto secundário.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 pb-4" data-testid="secondary-products-tab">
      {/* Cabeçalho e KPIs rápidos */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <PackageCheck className="h-5 w-5 shrink-0 text-primary" />
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Produtos Secundários Vinculados
              </h3>
              <Badge variant="secondary" className="text-xs font-bold">
                {stats.total} {stats.total === 1 ? "chamado" : "chamados"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Acompanhamento unificado dos produtos complementares contratados junto ao sistema principal, com espelho automático do status e trâmites no 0800.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              disabled={requestSync0800Now.isPending}
              onClick={() => {
                requestSync0800Now.mutate(undefined, {
                  onSuccess: () =>
                    toast.success("Sincronização solicitada ao worker! Os dados do 0800 serão atualizados em instantes."),
                  onError: () =>
                    toast.error("Não foi possível solicitar a sincronização agora."),
                });
              }}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", requestSync0800Now.isPending && "animate-spin")}
              />
              Sincronizar 0800
            </Button>

            {canEdit && (
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => {
                  const defaultImpl =
                    project.stages?.implementation?.phase1?.responsible ||
                    project.stages?.implementation?.responsible ||
                    "";
                  setManualResponsible(defaultImpl);
                  setLinkDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Vincular Chamado
              </Button>
            )}
          </div>
        </div>

        {stats.total > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
            <div className="rounded-lg border bg-background/80 px-3 py-2">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Em Campo / Pendentes
              </span>
              <span className="text-lg font-extrabold text-foreground">{stats.pendingField}</span>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Fila Remota SD
              </span>
              <span className="text-lg font-extrabold text-violet-600 dark:text-violet-400">
                {stats.sdQueue}
              </span>
            </div>
            <div
              className={cn(
                "rounded-lg border px-3 py-2",
                stats.divergence0800 > 0
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "bg-background/80"
              )}
            >
              <span className="block text-[11px] font-medium text-muted-foreground">
                Falta Tramitar no 0800
              </span>
              <span
                className={cn(
                  "text-lg font-extrabold",
                  stats.divergence0800 > 0
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-foreground"
                )}
              >
                {stats.divergence0800}
              </span>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Resolvidos / Com CS
              </span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.resolved}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sugestão de importação caso existam tags antigas em relatedTickets */}
      {canEdit && unmigratedLegacyTickets.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Chamados manuais antigos encontrados neste projeto ({unmigratedLegacyTickets.length})
            </p>
            <p className="text-muted-foreground">
              {unmigratedLegacyTickets.map((t) => `${t.name} (#${t.number})`).join(", ")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={() => {
              const first = unmigratedLegacyTickets[0];
              setManualTicketNumber(first.number);
              setLinkDialogOpen(true);
            }}
          >
            Converter para Controle Integrado
          </Button>
        </div>
      )}

      {/* Estado Vazio */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
          <PackageCheck className="mb-2.5 h-9 w-9 text-muted-foreground/50" />
          <h4 className="text-sm font-semibold text-foreground">
            Nenhum produto secundário vinculado a este projeto
          </h4>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            Novos chamados de &ldquo;Implantação e Treinamento&rdquo; dos 14 produtos secundários oficiais serão vinculados automaticamente pela automação diária do 0800. Você também pode vincular um chamado manualmente se desejar.
          </p>
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5 text-xs"
              onClick={() => setLinkDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Vincular Chamado Manualmente
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <SecondaryTicketItemCard
              key={ticket.id}
              ticket={ticket}
              currentProject={project}
              canEdit={canEdit}
              currentUserName={currentUserName}
              isHighlighted={highlightedTicketId === ticket.id}
              onSaveUpdate={(updates) =>
                updateSecondaryTicket.mutateAsync({
                  id: ticket.id,
                  ...updates,
                  updated_by: currentUserName,
                })
              }
              onOpenTramites={() =>
                setTramitesDialogTicket({
                  ticketNumber: ticket.ticket_number,
                  productName: ticket.product_name,
                })
              }
              onRequestUnlink={() => setUnlinkTarget(ticket)}
            />
          ))}
        </div>
      )}

      {/* Modal: Vincular Chamado Manualmente */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular Produto Secundário</DialogTitle>
            <DialogDescription>
              Cadastre manualmente o chamado 0800 de um produto secundário contratado para{" "}
              <span className="font-semibold text-foreground">{project.clientName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="sec-product-select" className="text-xs">
                Produto Secundário (Catálogo Oficial)
              </Label>
              <Select value={manualProductCode} onValueChange={setManualProductCode}>
                <SelectTrigger id="sec-product-select" className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((prod) => (
                    <SelectItem
                      key={prod.code}
                      value={prod.code}
                      disabled={
                        Boolean(prod.onlySystemType) &&
                        project.systemType !== prod.onlySystemType
                      }
                    >
                      {prod.name}
                      {prod.onlySystemType ? ` (Exclusivo ${prod.onlySystemType})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-ticket-input" className="text-xs">
                Número do Chamado 0800
              </Label>
              <Input
                id="sec-ticket-input"
                placeholder="Ex: 755245"
                value={manualTicketNumber}
                onChange={(e) => setManualTicketNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-resp-input" className="text-xs">
                Responsável (Opcional)
              </Label>
              <AutocompleteInput
                value={manualResponsible}
                onChange={setManualResponsible}
                placeholder="Selecione o colaborador..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-obs-input" className="text-xs">
                Observações Iniciais (Opcional)
              </Label>
              <Textarea
                id="sec-obs-input"
                placeholder="Contexto sobre a instalação, pendências ou repasse..."
                value={manualObservations}
                onChange={(e) => setManualObservations(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-2.5">
              <Checkbox
                id="sec-mirror-siblings"
                checked={mirrorSiblings}
                onCheckedChange={(val) => setMirrorSiblings(Boolean(val))}
                className="mt-0.5"
              />
              <Label
                htmlFor="sec-mirror-siblings"
                className="text-xs font-normal leading-snug text-muted-foreground cursor-pointer"
              >
                Espelhar automaticamente nos demais sistemas principais ativos deste cartório (ex: Orion TN + Orion PRO), mantendo sincronização única.
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={linkManualSecondaryTicket.isPending}
              onClick={handleManualCreate}
            >
              {linkManualSecondaryTicket.isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Vincular Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Histórico de Trâmites 0800 do Chamado Secundário */}
      <SecondaryTicketTramitesDialog
        open={Boolean(tramitesDialogTicket)}
        onOpenChange={(val) => {
          if (!val) setTramitesDialogTicket(null);
        }}
        ticketNumber={tramitesDialogTicket?.ticketNumber ?? null}
        productName={tramitesDialogTicket?.productName ?? ""}
      />

      {/* Confirmação de Desvínculo */}
      <AlertDialog
        open={Boolean(unlinkTarget)}
        onOpenChange={(val) => {
          if (!val) setUnlinkTarget(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo deste produto secundário?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado{" "}
              <span className="font-semibold text-foreground">
                #{unlinkTarget?.ticket_number} ({unlinkTarget?.product_name})
              </span>{" "}
              deixará de aparecer neste projeto ({project.systemType}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!unlinkTarget) return;
                unlinkSecondaryTicket.mutate(
                  {
                    projectId: project.id,
                    secondaryTicketId: unlinkTarget.id,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Vínculo removido do projeto.");
                      setUnlinkTarget(null);
                    },
                    onError: () => toast.error("Erro ao remover vínculo."),
                  }
                );
              }}
            >
              Remover Vínculo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SecondaryTicketItemCardProps {
  ticket: SecondaryTicketWithLinks;
  currentProject: ProjectV2;
  canEdit: boolean;
  currentUserName: string;
  isHighlighted?: boolean;
  onSaveUpdate: (updates: {
    hub_status?: SecondaryTicketHubStatus;
    responsible?: string | null;
    observations?: string | null;
    tramited_to_cs?: boolean;
  }) => Promise<unknown>;
  onOpenTramites: () => void;
  onRequestUnlink: () => void;
}

function SecondaryTicketItemCard({
  ticket,
  currentProject,
  canEdit,
  isHighlighted = false,
  onSaveUpdate,
  onOpenTramites,
  onRequestUnlink,
}: SecondaryTicketItemCardProps) {
  const [responsibleDraft, setResponsibleDraft] = useState(ticket.responsible || "");
  const [observationsDraft, setObservationsDraft] = useState(ticket.observations || "");
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  useEffect(() => {
    setResponsibleDraft(ticket.responsible || "");
    setObservationsDraft(ticket.observations || "");
  }, [ticket.responsible, ticket.observations]);

  const isObservationsDirty = observationsDraft !== (ticket.observations || "");

  const statusMeta = SECONDARY_HUB_STATUS_MAP[ticket.hub_status] || SECONDARY_HUB_STATUS_MAP.pending;
  const divergence = hasSecondary0800Divergence(ticket);
  const closedIn0800 = isSecondaryClosedIn0800(ticket);
  const withCsIn0800 = isSecondaryWithCsOrBillingIn0800(ticket);
  const formattedOp = formatOpNumberDisplay(ticket.op_number);

  const siblingProjects = ticket.linkedProjects.filter((lp) => lp.id !== currentProject.id);

  const handleStatusChange = async (nextStatus: SecondaryTicketHubStatus) => {
    if (!canEdit) return;
    try {
      const defaultResp =
        responsibleDraft.trim() ||
        (nextStatus === "deployed_field"
          ? currentProject.stages?.implementation?.phase1?.responsible ||
            currentProject.stages?.implementation?.responsible ||
            ""
          : nextStatus === "handed_to_sd"
            ? "Equipe SD (Remoto)"
            : "");

      await onSaveUpdate({
        hub_status: nextStatus,
        ...(defaultResp && !ticket.responsible ? { responsible: defaultResp } : {}),
      });
      toast.success(`Status de ${ticket.product_name} atualizado para "${SECONDARY_HUB_STATUS_MAP[nextStatus].shortLabel}".`);
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleResponsibleChange = async (nextResp: string) => {
    if (!canEdit) return;
    setResponsibleDraft(nextResp);
    try {
      await onSaveUpdate({
        responsible: nextResp.trim() || null,
      });
      toast.success(
        nextResp.trim()
          ? `Responsável de ${ticket.product_name} atualizado para "${nextResp.trim()}".`
          : `Responsável de ${ticket.product_name} removido.`
      );
    } catch {
      toast.error("Não foi possível salvar o responsável.");
    }
  };

  const handleToggleTramited = async (checked: boolean) => {
    if (!canEdit) return;
    try {
      await onSaveUpdate({ tramited_to_cs: checked });
      toast.success(
        checked
          ? "Marcado como já tramitado/encaminhado no 0800."
          : "Marcação de trâmite manual removida."
      );
    } catch {
      toast.error("Não foi possível salvar a confirmação de trâmite.");
    }
  };

  const handleSaveObservations = async () => {
    if (!canEdit) return;
    setIsSavingDetails(true);
    try {
      await onSaveUpdate({
        observations: observationsDraft.trim() || null,
      });
      toast.success("Observações do produto secundário salvas!");
    } catch {
      toast.error("Erro ao salvar observações.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleCopySuggestedTramite = async (openEllevoAfter: boolean) => {
    const text = buildSuggested0800Tramite(
      {
        product_name: ticket.product_name,
        hub_status: ticket.hub_status,
        responsible: responsibleDraft || ticket.responsible,
        observations: observationsDraft || ticket.observations,
      },
      currentProject.systemType,
      currentProject.ticketNumber
    );

    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        openEllevoAfter
          ? `Trâmite copiado! Abrindo o chamado #${ticket.ticket_number} no Ellevo...`
          : "Texto de trâmite copiado para a área de transferência!"
      );
    } catch {
      toast.info("Não foi possível copiar automaticamente; abrindo chamado no Ellevo.");
    }

    if (openEllevoAfter) {
      const url = buildEllevoTicketUrl(ticket.ticket_number);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card
      id={`sec-ticket-card-${ticket.id}`}
      className={cn(
        "overflow-hidden border transition-all duration-300",
        isHighlighted &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-lg dark:ring-primary",
        divergence
          ? "border-amber-500/50 bg-amber-500/[0.03]"
          : "bg-card/70"
      )}
    >
      <CardContent className="p-3.5 sm:p-4 space-y-3.5">
        {/* Linha 1: Identificação do Produto, Chamado e Alertas */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground sm:text-base">
                {ticket.product_name}
              </span>

              <EllevoTicketLink
                ticketNumber={ticket.ticket_number}
                className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary"
              />

              <Badge variant="outline" className={cn("text-[11px] font-semibold", statusMeta.badgeClass)}>
                {statusMeta.shortLabel}
              </Badge>

              {ticket.requiresOrionAdmin && (
                <Badge
                  variant="outline"
                  className="border-sky-500/30 bg-sky-500/10 text-[10px] font-semibold text-sky-700 dark:text-sky-300 gap-1"
                  title="Este produto exige solicitação de chave e configuração no Orion Admin"
                >
                  <KeyRound className="h-3 w-3" />
                  Orion Admin
                </Badge>
              )}

              {isHighlighted && (
                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold animate-pulse">
                  Selecionado
                </Badge>
              )}

              {divergence && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/15 text-[11px] font-bold text-amber-800 dark:text-amber-300 gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Falta Tramitar no 0800
                </Badge>
              )}

              {!divergence && closedIn0800 && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Encerrado no 0800
                </Badge>
              )}

              {!divergence && !closedIn0800 && withCsIn0800 && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 gap-1"
                >
                  <UserCheck className="h-3 w-3" />
                  Com CS / Faturamento
                </Badge>
              )}
            </div>

            {ticket.titulo_chamado && (
              <p className="text-xs text-muted-foreground break-words">
                {ticket.titulo_chamado}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {formattedOp && (
                <span>
                  OP: <strong className="text-foreground/80">{formattedOp}</strong>
                </span>
              )}
              {ticket.sales_order_number && (
                <span>
                  Pedido: <strong className="text-foreground/80">{ticket.sales_order_number}</strong>
                </span>
              )}
              {siblingProjects.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  <Share2 className="h-3 w-3 shrink-0" />
                  Sincronizado também com{" "}
                  {siblingProjects
                    .map((sp) => `${sp.systemType} (#${sp.ticketNumber})`)
                    .join(", ")}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 self-end text-muted-foreground hover:text-destructive sm:self-start"
              title="Desvincular chamado deste projeto"
              onClick={onRequestUnlink}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Linha 2: Espelho Automático do 0800 (Sem retrabalho de digitação) */}
        <div className="rounded-lg border bg-muted/30 p-2.5 text-xs space-y-1.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Espelho 0800:
              </span>
              <span>
                Status:{" "}
                <strong className="text-foreground">
                  {ticket.ellevo_status || "Aguardando leitura do worker"}
                </strong>
              </span>
              <span>
                Responsável atual:{" "}
                <strong className="text-foreground">
                  {ticket.ellevo_analyst || ticket.ellevo_team || "Não informado"}
                </strong>
                {ticket.ellevo_analyst && ticket.ellevo_team ? ` (${ticket.ellevo_team})` : ""}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1 self-start sm:self-center"
              onClick={onOpenTramites}
            >
              <History className="h-3.5 w-3.5" />
              Ver Trâmites 0800
            </Button>
          </div>

          {ticket.ellevo_last_tramite && (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground border-t border-border/50 pt-1.5">
              <strong className="text-foreground/80">Último trâmite no 0800:</strong>{" "}
              {ticket.ellevo_last_tramite}
            </p>
          )}
        </div>

        {/* Linha 3: Controles Operacionais do HUB */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="space-y-1 md:col-span-4">
            <Label className="text-[11px] text-muted-foreground">
              Situação da Implantação no HUB
            </Label>
            <Select
              value={ticket.hub_status}
              onValueChange={(v) => handleStatusChange(v as SecondaryTicketHubStatus)}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-9 text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECONDARY_HUB_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-4">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              Responsável pela Execução (Campo / SD)
            </Label>
            <AutocompleteInput
              value={responsibleDraft}
              onChange={handleResponsibleChange}
              disabled={!canEdit}
              placeholder="Selecione o colaborador..."
              className="h-9 border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring text-xs"
            />
          </div>

          <div className="flex items-end md:col-span-4">
            <label
              className={cn(
                "flex min-h-[2.25rem] w-full items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs",
                canEdit ? "cursor-pointer hover:bg-muted/30" : "opacity-70"
              )}
            >
              <Checkbox
                checked={ticket.tramited_to_cs}
                onCheckedChange={(val) => handleToggleTramited(Boolean(val))}
                disabled={!canEdit}
              />
              <span className="leading-tight font-medium text-foreground/90">
                Já tramitado / encaminhado para CS no 0800
              </span>
            </label>
          </div>

          <div className="space-y-1 md:col-span-12">
            <Label className="text-[11px] text-muted-foreground">
              Observações / Pendências de Passagem
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={observationsDraft}
                onChange={(e) => setObservationsDraft(e.target.value)}
                disabled={!canEdit}
                rows={2}
                placeholder="Ex: Instalado e treinado junto ao Orion TN / Ou: Aguardando totem chegar para o SD configurar remotamente..."
                className="min-h-[3.25rem] flex-1 resize-none text-xs"
              />
              {canEdit && isObservationsDirty && (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 self-end sm:self-stretch sm:h-auto"
                  disabled={isSavingDetails}
                  onClick={handleSaveObservations}
                >
                  {isSavingDetails ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Salvar Observações
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Linha 4: Ações Rápidas 1-Clique para o 0800 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() => handleCopySuggestedTramite(true)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Copiar Trâmite Sugerido + Abrir no 0800
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => handleCopySuggestedTramite(false)}
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copiar Texto
            </Button>
            {ticket.requiresOrionAdmin && (
              <Badge
                variant="outline"
                className="h-8 px-2.5 gap-1.5 text-xs border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                title="Chaves geradas via CNS no Orion Connect e cadastradas na Etapa 4 (Preparação de Ambiente)"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Chaves no Orion Admin (Etapa 4)
              </Badge>
            )}
          </div>

          {ticket.updated_by && (
            <span className="text-[10px] text-muted-foreground">
              Última edição no HUB por {ticket.updated_by}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SecondaryTicketTramitesDialog({
  open,
  onOpenChange,
  ticketNumber,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketNumber: string | null;
  productName: string;
}) {
  const { data: tramites = [], isLoading } = useSecondaryTicketTramites(
    open ? ticketNumber : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-3.5 sm:px-6">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            <span>Histórico de Trâmites no 0800 — {productName}</span>
            {ticketNumber && (
              <EllevoTicketLink
                ticketNumber={ticketNumber}
                className="rounded border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary"
              />
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Movimentações espelhadas automaticamente do Ellevo pelo vm-worker.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : tramites.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              Nenhum trâmite espelhado encontrado ainda para este chamado. Clique em &ldquo;Sincronizar 0800&rdquo; ou abra diretamente pelo link acima no Ellevo.
            </div>
          ) : (
            tramites.map((tr) => (
              <div
                key={`${tr.numero_chamado}-${tr.sequencia_tramite}`}
                className="rounded-lg border bg-card p-3 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    #{tr.sequencia_tramite} • {tr.responsavel || "Não informado"}
                    {tr.equipe_responsavel ? ` (${tr.equipe_responsavel})` : ""}
                  </span>
                  {tr.data_tramite && (
                    <span>
                      {(() => {
                        try {
                          return format(new Date(tr.data_tramite), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          });
                        } catch {
                          return tr.data_tramite;
                        }
                      })()}
                    </span>
                  )}
                </div>
                {tr.atividade && (
                  <Badge variant="outline" className="text-[10px]">
                    {tr.atividade}
                  </Badge>
                )}
                <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground/90">
                  {tr.descricao || "Sem descrição textual neste trâmite."}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
