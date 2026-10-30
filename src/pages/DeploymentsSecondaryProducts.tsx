import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SecondaryTicketWithLinks,
  useAllSecondaryTickets,
  useSecondaryProductCatalog,
  useSecondaryTicketMutations,
} from "@/hooks/useSecondaryTickets";
import {
  formatOpNumberDisplay,
  hasSecondary0800Divergence,
  isSecondaryClosedIn0800,
  isSecondaryExecutionDoneInHub,
  isSecondaryResolvedIn0800,
  OFFICIAL_SECONDARY_PRODUCTS,
  SECONDARY_HUB_STATUS_MAP,
} from "@/lib/secondary-products";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Headset,
  KeyRound,
  Loader2,
  PackageCheck,
  RefreshCw,
  Rocket,
  Search,
  Share2,
  UserCheck,
  X,
} from "lucide-react";

type QuickFilterKey =
  | "all"
  | "field_pending"
  | "sd_queue"
  | "divergence"
  | "with_cs"
  | "blocked";

export default function DeploymentsSecondaryProducts() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canEdit =
    hasPermission("secondary_products", "edit") || hasPermission("projects", "edit");

  const { data: tickets = [], isLoading, error } = useAllSecondaryTickets();
  const { data: catalog = [] } = useSecondaryProductCatalog();
  const { requestSync0800Now } = useSecondaryTicketMutations();

  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");

  // Apenas chamados vinculados a pelo menos 1 projeto ativo/não excluído no HUB
  const linkedTickets = useMemo(
    () => tickets.filter((t) => t.linkedProjects.length > 0 && t.hub_status !== "cancelled"),
    [tickets]
  );

  const productFilterOptions = useMemo(() => {
    if (catalog.length > 0) {
      return catalog.map((c) => ({ code: c.code, name: c.name }));
    }
    return OFFICIAL_SECONDARY_PRODUCTS.map((p) => ({ code: p.code, name: p.name }));
  }, [catalog]);

  const metrics = useMemo(() => {
    let fieldPending = 0;
    let sdQueue = 0;
    let divergence = 0;
    let withCs = 0;
    let blocked = 0;

    for (const t of linkedTickets) {
      if (t.hub_status === "pending" || t.hub_status === "in_progress") fieldPending += 1;
      if (t.hub_status === "handed_to_sd") sdQueue += 1;
      if (hasSecondary0800Divergence(t)) divergence += 1;
      if (isSecondaryExecutionDoneInHub(t.hub_status) && isSecondaryResolvedIn0800(t)) {
        withCs += 1;
      }
      if (t.hub_status === "blocked_client") blocked += 1;
    }

    return {
      total: linkedTickets.length,
      fieldPending,
      sdQueue,
      divergence,
      withCs,
      blocked,
    };
  }, [linkedTickets]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return linkedTickets.filter((t) => {
      if (
        quickFilter === "field_pending" &&
        t.hub_status !== "pending" &&
        t.hub_status !== "in_progress"
      ) {
        return false;
      }
      if (quickFilter === "sd_queue" && t.hub_status !== "handed_to_sd") {
        return false;
      }
      if (quickFilter === "divergence" && !hasSecondary0800Divergence(t)) {
        return false;
      }
      if (
        quickFilter === "with_cs" &&
        !(isSecondaryExecutionDoneInHub(t.hub_status) && isSecondaryResolvedIn0800(t))
      ) {
        return false;
      }
      if (quickFilter === "blocked" && t.hub_status !== "blocked_client") {
        return false;
      }

      if (selectedProduct !== "all" && t.product_code !== selectedProduct) {
        return false;
      }

      if (
        selectedSystem !== "all" &&
        !t.linkedProjects.some((lp) => lp.systemType === selectedSystem)
      ) {
        return false;
      }

      if (q) {
        const formattedOp = formatOpNumberDisplay(t.op_number);
        const haystacks = [
          t.client_name,
          t.ticket_number,
          t.product_name,
          t.titulo_chamado,
          t.op_number ? String(t.op_number) : null,
          formattedOp,
          t.sales_order_number ? String(t.sales_order_number) : null,
          t.responsible,
          t.ellevo_analyst,
          t.ellevo_team,
          ...t.linkedProjects.flatMap((lp) => [
            lp.clientName,
            lp.ticketNumber,
            lp.systemType,
            lp.projectLeader,
            lp.implementationResponsible,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystacks.includes(q)) return false;
      }

      return true;
    });
  }, [linkedTickets, quickFilter, selectedProduct, selectedSystem, searchQuery]);

  const handleOpenInProjectModal = (ticket: SecondaryTicketWithLinks, projectId?: string) => {
    const targetProject =
      (projectId
        ? ticket.linkedProjects.find((p) => p.id === projectId)
        : ticket.linkedProjects[0]) || ticket.linkedProjects[0];

    if (!targetProject) return;
    navigate(`/projects?id=${targetProject.id}&tab=secondary_products`);
  };

  const handleRequestSync = async () => {
    if (!canEdit) {
      toast.error("Você não possui permissão para disparar a sincronização manual.");
      return;
    }
    try {
      await requestSync0800Now.mutateAsync();
      toast.success(
        "Sincronização com o 0800 enfileirada! Os status e trâmites serão atualizados em instantes."
      );
    } catch {
      toast.error("Não foi possível solicitar a sincronização com o 0800.");
    }
  };

  const hasActiveFilters =
    quickFilter !== "all" ||
    searchQuery.trim() !== "" ||
    selectedProduct !== "all" ||
    selectedSystem !== "all";

  return (
    <div
      data-testid="deployments-secondary-products-page"
      className="w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6 space-y-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PackageCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Produtos Secundários
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Esteira central dos chamados de produtos complementares (LCW, SGA, On Hand, Orion Editor, GED e demais) vinculados às implantações ativas. Selecione qualquer item para abrir diretamente o Modal do projeto principal.
          </p>
        </div>

        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs font-semibold self-start"
            disabled={requestSync0800Now.isPending}
            onClick={handleRequestSync}
          >
            {requestSync0800Now.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sincronizar Espelho 0800
          </Button>
        )}
      </div>

      {/* Cards de KPI / Filtros Rápidos (Toque amigável >= 44px) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <KpiFilterCard
          active={quickFilter === "all"}
          onClick={() => setQuickFilter("all")}
          label="Total Vinculados"
          value={metrics.total}
          icon={PackageCheck}
          tone="neutral"
        />
        <KpiFilterCard
          active={quickFilter === "field_pending"}
          onClick={() =>
            setQuickFilter(quickFilter === "field_pending" ? "all" : "field_pending")
          }
          label="Em Campo / Pendentes"
          value={metrics.fieldPending}
          icon={Rocket}
          tone="blue"
        />
        <KpiFilterCard
          active={quickFilter === "sd_queue"}
          onClick={() => setQuickFilter(quickFilter === "sd_queue" ? "all" : "sd_queue")}
          label="Fila Remota SD"
          value={metrics.sdQueue}
          icon={Headset}
          tone="purple"
        />
        <KpiFilterCard
          active={quickFilter === "divergence"}
          onClick={() =>
            setQuickFilter(quickFilter === "divergence" ? "all" : "divergence")
          }
          label="Falta Tramitar 0800"
          value={metrics.divergence}
          icon={AlertTriangle}
          tone="amber"
        />
        <KpiFilterCard
          active={quickFilter === "with_cs"}
          onClick={() => setQuickFilter(quickFilter === "with_cs" ? "all" : "with_cs")}
          label="Com CS / Concluídos"
          value={metrics.withCs}
          icon={UserCheck}
          tone="emerald"
        />
        <KpiFilterCard
          active={quickFilter === "blocked"}
          onClick={() => setQuickFilter(quickFilter === "blocked" ? "all" : "blocked")}
          label="Bloqueados"
          value={metrics.blocked}
          icon={Ban}
          tone="rose"
        />
      </div>

      {/* Barra de Busca e Filtros */}
      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
            <div className="relative md:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cartório, #chamado, OP, produto ou responsável..."
                className="h-10 pl-9 text-xs sm:text-sm"
                aria-label="Buscar produtos secundários"
              />
            </div>

            <div className="md:col-span-3">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-10 text-xs sm:text-sm" aria-label="Filtrar por produto secundário">
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos (14)</SelectItem>
                  {productFilterOptions.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 md:col-span-3">
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger className="h-10 flex-1 text-xs sm:text-sm" aria-label="Filtrar por sistema principal">
                  <SelectValue placeholder="Sistema principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sistemas</SelectItem>
                  <SelectItem value="Orion TN">Orion TN</SelectItem>
                  <SelectItem value="Orion PRO">Orion PRO</SelectItem>
                  <SelectItem value="Orion REG">Orion REG</SelectItem>
                  <SelectItem value="WebRI">WebRI</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  title="Limpar filtros"
                  aria-label="Limpar filtros"
                  onClick={() => {
                    setQuickFilter("all");
                    setSearchQuery("");
                    setSelectedProduct("all");
                    setSelectedSystem("all");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estados de Carregamento / Erro / Vazio */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm font-bold text-destructive">
              Não foi possível carregar os produtos secundários.
            </p>
            <p className="text-xs text-muted-foreground">
              Verifique sua conexão ou tente recarregar a página.
            </p>
          </CardContent>
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-2">
            <PackageCheck className="mx-auto h-9 w-9 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">
              {linkedTickets.length === 0
                ? "Nenhum chamado de produto secundário vinculado até o momento"
                : "Nenhum item corresponde aos filtros selecionados"}
            </p>
            <p className="mx-auto max-w-lg text-xs text-muted-foreground leading-relaxed">
              {linkedTickets.length === 0
                ? "Assim que a automação diária do n8n processar chamados 'Implantação e Treinamento' de produtos complementares para cartórios com projeto ativo no HUB, eles aparecerão automaticamente aqui."
                : "Ajuste os termos de pesquisa ou limpe os filtros acima para visualizar todos os chamados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile / Tablet (< lg): Cards empilhados sem rolagem horizontal */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filteredTickets.map((ticket) => (
              <SecondaryPipelineMobileCard
                key={ticket.id}
                ticket={ticket}
                onOpenProject={handleOpenInProjectModal}
              />
            ))}
          </div>

          {/* Desktop (>= lg): Tabela estruturada e enxuta sem corte de conteúdo */}
          <Card className="hidden overflow-hidden border-border/60 lg:block">
            <div className="w-full overflow-x-hidden">
              <table className="w-full table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="w-[27%] px-4 py-3">Serventia &amp; Projeto Pai</th>
                    <th className="w-[20%] px-3 py-3">Produto Secundário</th>
                    <th className="w-[17%] px-3 py-3">Situação no HUB</th>
                    <th className="w-[23%] px-3 py-3">Espelho 0800 (Ellevo)</th>
                    <th className="w-[13%] px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredTickets.map((ticket) => {
                    const meta =
                      SECONDARY_HUB_STATUS_MAP[ticket.hub_status] ||
                      SECONDARY_HUB_STATUS_MAP.pending;
                    const divergence = hasSecondary0800Divergence(ticket);
                    const closed0800 = isSecondaryClosedIn0800(ticket);
                    const formattedOp = formatOpNumberDisplay(ticket.op_number);
                    const primaryProject = ticket.linkedProjects[0];
                    const effectiveResp =
                      ticket.responsible ||
                      primaryProject?.implementationResponsible ||
                      primaryProject?.projectLeader ||
                      "Não definido";

                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => handleOpenInProjectModal(ticket)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/40",
                          divergence && "bg-amber-500/[0.04]"
                        )}
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1.5 min-w-0">
                            <p
                              className="font-bold text-foreground break-words leading-snug"
                              title={primaryProject?.clientName || ticket.client_name}
                            >
                              {primaryProject?.clientName || ticket.client_name}
                            </p>
                            <div
                              className="flex flex-wrap items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {ticket.linkedProjects.map((lp) => (
                                <button
                                  key={lp.id}
                                  type="button"
                                  onClick={() => handleOpenInProjectModal(ticket, lp.id)}
                                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                  title={`Abrir modal do projeto ${lp.systemType} (#${lp.ticketNumber})`}
                                >
                                  <span>{lp.systemType}</span>
                                  <span className="font-mono text-muted-foreground">
                                    #{lp.ticketNumber}
                                  </span>
                                </button>
                              ))}
                              {ticket.linkedProjects.length > 1 && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary"
                                  title="Sincronizado automaticamente entre os sistemas principais desta serventia"
                                >
                                  <Share2 className="h-3 w-3" />
                                  Espelhado
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-foreground">
                                {ticket.product_name}
                              </span>
                              {ticket.requiresOrionAdmin && (
                                <Badge
                                  variant="outline"
                                  className="border-sky-500/30 bg-sky-500/10 px-1.5 py-0 text-[10px] text-sky-700 dark:text-sky-300 gap-0.5"
                                >
                                  <KeyRound className="h-2.5 w-2.5" />
                                  Orion Admin
                                </Badge>
                              )}
                            </div>
                            <div
                              className="flex flex-wrap items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EllevoTicketLink
                                ticketNumber={ticket.ticket_number}
                                className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary"
                              />
                              {formattedOp && (
                                <span className="text-[11px] text-muted-foreground">
                                  OP {formattedOp}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1 min-w-0">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-semibold", meta.badgeClass)}
                            >
                              {meta.shortLabel}
                            </Badge>
                            <p className="truncate text-[11px] text-muted-foreground" title={effectiveResp}>
                              Resp: <span className="font-medium text-foreground/85">{effectiveResp}</span>
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-foreground">
                                {ticket.ellevo_status || "Aguardando leitura"}
                              </span>
                              {divergence && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/40 bg-amber-500/15 px-1.5 py-0 text-[10px] font-bold text-amber-800 dark:text-amber-300 gap-1"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Falta Tramitar
                                </Badge>
                              )}
                              {!divergence && closed0800 && (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-700 dark:text-emerald-300 gap-1"
                                >
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Encerrado
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {ticket.ellevo_analyst || ticket.ellevo_team || "Sem responsável 0800"}
                              {ticket.ellevo_analyst && ticket.ellevo_team
                                ? ` (${ticket.ellevo_team})`
                                : ""}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={divergence ? "default" : "outline"}
                            className="h-8 gap-1 text-xs font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInProjectModal(ticket);
                            }}
                          >
                            Abrir Projeto
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiFilterCard({
  active,
  onClick,
  label,
  value,
  icon: Icon,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: number;
  icon: typeof PackageCheck;
  tone: "neutral" | "blue" | "purple" | "amber" | "emerald" | "rose";
}) {
  const toneClasses: Record<typeof tone, string> = {
    neutral: "text-foreground",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[4.25rem] w-full min-w-0 flex-col justify-between rounded-xl border p-3 text-left transition-all",
        active
          ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm"
          : "border-border/60 bg-card/70 hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div className="flex w-full items-start justify-between gap-1.5">
        <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4 shrink-0", toneClasses[tone])} />
      </div>
      <span className={cn("text-xl font-black leading-none sm:text-2xl", toneClasses[tone])}>
        {value}
      </span>
    </button>
  );
}

function SecondaryPipelineMobileCard({
  ticket,
  onOpenProject,
}: {
  ticket: SecondaryTicketWithLinks;
  onOpenProject: (ticket: SecondaryTicketWithLinks, projectId?: string) => void;
}) {
  const meta =
    SECONDARY_HUB_STATUS_MAP[ticket.hub_status] || SECONDARY_HUB_STATUS_MAP.pending;
  const divergence = hasSecondary0800Divergence(ticket);
  const formattedOp = formatOpNumberDisplay(ticket.op_number);
  const primaryProject = ticket.linkedProjects[0];
  const effectiveResp =
    ticket.responsible ||
    primaryProject?.implementationResponsible ||
    primaryProject?.projectLeader ||
    "Não definido";

  return (
    <Card
      className={cn(
        "overflow-hidden border transition-all",
        divergence ? "border-amber-500/45 bg-amber-500/[0.04]" : "border-border/60"
      )}
    >
      <CardContent className="p-3.5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">
                {ticket.product_name}
              </span>
              <EllevoTicketLink
                ticketNumber={ticket.ticket_number}
                className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary"
              />
              {ticket.requiresOrionAdmin && (
                <Badge
                  variant="outline"
                  className="border-sky-500/30 bg-sky-500/10 px-1.5 py-0 text-[10px] text-sky-700 dark:text-sky-300 gap-0.5"
                >
                  <KeyRound className="h-2.5 w-2.5" />
                  Orion Admin
                </Badge>
              )}
              {formattedOp && (
                <span className="text-[11px] text-muted-foreground">OP {formattedOp}</span>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground/90 break-words leading-snug">
              {primaryProject?.clientName || ticket.client_name}
            </p>
          </div>

          <Badge variant="outline" className={cn("text-[10px] font-semibold shrink-0", meta.badgeClass)}>
            {meta.shortLabel}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ticket.linkedProjects.map((lp) => (
            <button
              key={lp.id}
              type="button"
              onClick={() => onOpenProject(ticket, lp.id)}
              className="inline-flex min-h-7 items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground"
            >
              <span>{lp.systemType}</span>
              <span className="font-mono text-muted-foreground">#{lp.ticketNumber}</span>
            </button>
          ))}
          {divergence && (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/15 text-[10px] font-bold text-amber-800 dark:text-amber-300 gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Falta Tramitar 0800
            </Badge>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 px-2.5 py-2 text-[11px] space-y-1">
          <div className="flex flex-wrap justify-between gap-1">
            <span className="text-muted-foreground">
              Resp. HUB: <strong className="text-foreground">{effectiveResp}</strong>
            </span>
            <span className="text-muted-foreground">
              0800: <strong className="text-foreground">{ticket.ellevo_status || "Aguardando"}</strong>
            </span>
          </div>
          {(ticket.ellevo_analyst || ticket.ellevo_team) && (
            <p className="truncate text-muted-foreground">
              Fila 0800: {ticket.ellevo_analyst || ticket.ellevo_team}
            </p>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant={divergence ? "default" : "outline"}
          className="h-10 w-full gap-1.5 text-xs font-semibold"
          onClick={() => onOpenProject(ticket)}
        >
          Abrir no Modal do Projeto
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
