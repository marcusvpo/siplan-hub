import { useState, useMemo } from "react";
import {
  BellRing,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowUpRight,
  Trash2,
  CheckCheck,
  Folder,
  RotateCw,
  TrendingUp,
  ShieldAlert,
  Server,
  Database,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { NotificationPriority, NotificationStage } from "@/types/conversion";

const STAGE_CONFIG: Record<
  NotificationStage,
  { label: string; icon: typeof Layers; color: string }
> = {
  infra: { label: "1. Infraestrutura", icon: Server, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  adherence: { label: "2. Aderência", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  conversion: { label: "3. Conversão", icon: Database, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  environment: { label: "4. Ambiente", icon: Server, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  modelos_editor: { label: "5. Modelos", icon: Layers, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  implementation: { label: "6. Implantação", icon: CalendarClock, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  post: { label: "7. Pós-Implantação", icon: TrendingUp, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
  sla_alert: { label: "Alertas de SLA", icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  general: { label: "Geral", icon: BellRing, color: "text-muted-foreground bg-muted border-border" },
};

const PRIORITY_STYLES: Record<NotificationPriority, { label: string; badgeClass: string; rowBorder: string }> = {
  urgent: { label: "Urgente", badgeClass: "bg-red-500/15 text-red-500 border-red-500/30", rowBorder: "border-l-4 border-l-red-500" },
  high: { label: "Alta", badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30", rowBorder: "border-l-4 border-l-amber-500" },
  normal: { label: "Normal", badgeClass: "bg-blue-500/15 text-blue-500 border-blue-500/30", rowBorder: "border-l-2 border-l-border" },
  low: { label: "Baixa", badgeClass: "bg-muted text-muted-foreground border-border", rowBorder: "border-l-2 border-l-transparent" },
};

export default function AdminNotifications() {
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedReadStatus, setSelectedReadStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  } = useNotifications({
    adminMode: true,
    limit: 200,
  });

  // Métricas Gerenciais
  const kpis = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const urgent = notifications.filter((n) => n.priority === "urgent" && !n.read).length;
    const high = notifications.filter((n) => n.priority === "high" && !n.read).length;
    const envCount = notifications.filter((n) => n.stage === "environment").length;
    const convCount = notifications.filter((n) => n.stage === "conversion").length;
    const infraCount = notifications.filter((n) => n.stage === "infra").length;

    return { total, unread, urgent, high, envCount, convCount, infraCount };
  }, [notifications]);

  // Filtragem dos dados
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Filtro de Etapa
      if (selectedStage !== "all" && n.stage !== selectedStage) {
        return false;
      }

      // Filtro de Prioridade
      if (selectedPriority !== "all" && n.priority !== selectedPriority) {
        return false;
      }

      // Filtro de Leitura
      if (selectedReadStatus === "unread" && n.read) return false;
      if (selectedReadStatus === "read" && !n.read) return false;

      // Filtro de Busca (Texto/Cliente)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(term);
        const matchMsg = n.message.toLowerCase().includes(term);
        const matchProject = n.projectName?.toLowerCase().includes(term);
        if (!matchTitle && !matchMsg && !matchProject) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, selectedStage, selectedPriority, selectedReadStatus, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Central de Notificações</h2>
          <p className="text-sm text-muted-foreground">
            Visão gerencial consolidada de todos os alertas, eventos e SLAs das etapas de implantação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
          {kpis.unread > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void markAllAsRead()}
              className="h-9 gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar Todas Lidas
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Indicadores / KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Alertas Pendentes</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {kpis.unread}
              <span className="text-xs text-muted-foreground font-normal">de {kpis.total}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-[11px] text-muted-foreground">Retenção ativa de 90 dias</div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/[0.04] border-red-500/20">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-red-500 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Urgentes Não Lidos
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-red-500">
              {kpis.urgent}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-[11px] text-red-500/80">Impedimentos e reprovações</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Fila de Ambiente</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {kpis.envCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-[11px] text-muted-foreground">Etapa 4 (Bruno & Alex)</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Fila de Conversão</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {kpis.convCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-[11px] text-muted-foreground">Etapa 3 (Ademar, Luciane, Hugo)</div>
          </CardContent>
        </Card>
      </div>

      {/* Abas por Etapa do Projeto */}
      <Card>
        <CardHeader className="p-4 pb-2 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              value={selectedStage}
              onValueChange={setSelectedStage}
              className="w-full overflow-x-auto"
            >
              <TabsList className="h-9 inline-flex w-auto p-1 bg-muted/60">
                <TabsTrigger value="all" className="text-xs px-3">
                  Todas as Etapas
                </TabsTrigger>
                <TabsTrigger value="environment" className="text-xs px-3">
                  4. Ambiente
                </TabsTrigger>
                <TabsTrigger value="conversion" className="text-xs px-3">
                  3. Conversão
                </TabsTrigger>
                <TabsTrigger value="infra" className="text-xs px-3">
                  1. Infraestrutura
                </TabsTrigger>
                <TabsTrigger value="implementation" className="text-xs px-3">
                  6. Implantação
                </TabsTrigger>
                <TabsTrigger value="adherence" className="text-xs px-3">
                  2. Aderência
                </TabsTrigger>
                <TabsTrigger value="post" className="text-xs px-3">
                  7. Pós
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        {/* Barra de Filtros Multifacetados */}
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, ticket ou mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedReadStatus} onValueChange={setSelectedReadStatus}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Status de Leitura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="unread">Apenas Não Lidas</SelectItem>
                <SelectItem value="read">Apenas Lidas</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-end text-xs text-muted-foreground font-medium pr-1">
              {filteredNotifications.length} notificaç{filteredNotifications.length === 1 ? "ão" : "ões"} encontrada{filteredNotifications.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Listagem de Notificações */}
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
              Carregando painel de notificações...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              Erro ao carregar dados: {error}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <BellRing className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">Nenhuma notificação encontrada para os filtros selecionados.</p>
              <p className="text-xs text-muted-foreground mt-1">Tente ajustar a etapa ou os critérios de busca.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-md border">
              {filteredNotifications.map((notif) => {
                const stageConfig = notif.stage ? STAGE_CONFIG[notif.stage] : STAGE_CONFIG.general;
                const priorityConfig = notif.priority ? PRIORITY_STYLES[notif.priority] : PRIORITY_STYLES.normal;
                const StageIcon = stageConfig.icon;

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40",
                      priorityConfig.rowBorder,
                      notif.read ? "bg-card" : "bg-primary/[0.02]"
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", stageConfig.color)}>
                        <StageIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {notif.title}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] h-4 font-normal", priorityConfig.badgeClass)}>
                            {priorityConfig.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-4 font-normal text-muted-foreground">
                            {stageConfig.label}
                          </Badge>
                          {!notif.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Não lida" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                          {notif.projectName && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <Folder className="h-3 w-3 text-primary shrink-0" />
                              {notif.projectName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: ptBR })}
                            <span className="opacity-60">({format(notif.createdAt, "dd/MM/yyyy HH:mm")})</span>
                          </span>
                          {notif.read && notif.readAt && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Lida em {format(notif.readAt, "dd/MM HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {notif.actionUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 text-xs gap-1"
                        >
                          <a href={notif.actionUrl} target="_blank" rel="noreferrer">
                            Acessar <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {!notif.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void markAsRead(notif.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          title="Marcar como lida"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteNotification(notif.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Excluir notificação"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
