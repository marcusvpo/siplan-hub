import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  Sparkles,
  Copy,
  ExternalLink,
  Check,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Loader2,
  Power,
  PowerOff,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { usePosAiProjectSummary } from "@/hooks/usePosAiProjectSummary";
import { PosChatMessageContent } from "@/components/pos-chat/PosChatMessageContent";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PosAiAssistantSectionProps {
  project: ProjectV2;
}

export function PosAiAssistantSection({ project }: PosAiAssistantSectionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [isLocallyActivated, setIsLocallyActivated] = useState<boolean | null>(null);
  const { data: summary, isLoading } = usePosAiProjectSummary(project.id);

  // Status computation
  const rawEnabled = (project.customFields as Record<string, unknown>)?.pos_assistant_enabled;
  const isExplicitlyDisabled = rawEnabled === false;
  const isExplicitlyEnabled = rawEnabled === true || isLocallyActivated === true;
  const hasHistory = Boolean(summary && summary.total_messages > 0);

  const isActivated = isLocallyActivated === true || (isExplicitlyEnabled || (rawEnabled === undefined && hasHistory));
  const isDeactivated = isLocallyActivated === false || isExplicitlyDisabled;

  const publicUrl = `${window.location.origin}/public/pos-chat/${project.id}`;

  const handleActivate = async () => {
    setActivating(true);
    try {
      const currentCustomFields = (project.customFields || {}) as Record<string, unknown>;
      const updatedCustomFields = {
        ...currentCustomFields,
        pos_assistant_enabled: true,
        pos_assistant_activated_at: new Date().toISOString(),
        pos_assistant_disabled_at: null,
      };

      const { error } = await supabase
        .from("projects")
        .update({ custom_fields: updatedCustomFields })
        .eq("id", project.id);

      if (error) throw error;

      setIsLocallyActivated(true);
      toast.success("Assistente de Pós-Implantação ativado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      queryClient.invalidateQueries({ queryKey: ["projectDetails", project.id] });
    } catch (err: any) {
      toast.error("Erro ao ativar assistente: " + (err.message || "Erro desconhecido"));
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      const currentCustomFields = (project.customFields || {}) as Record<string, unknown>;
      const updatedCustomFields = {
        ...currentCustomFields,
        pos_assistant_enabled: false,
        pos_assistant_disabled_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("projects")
        .update({ custom_fields: updatedCustomFields })
        .eq("id", project.id);

      if (error) throw error;

      setIsLocallyActivated(false);
      setDeactivateDialogOpen(false);
      toast.success("Acesso ao assistente encerrado com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      queryClient.invalidateQueries({ queryKey: ["projectDetails", project.id] });
    } catch (err: any) {
      toast.error("Erro ao desativar assistente: " + (err.message || "Erro desconhecido"));
    } finally {
      setDeactivating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link público copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  const handleOpenLink = () => {
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  const handleViewLogs = () => {
    navigate(`/admin/pos-ai-logs?projectId=${project.id}`);
  };

  // 1. Initial State: Not yet activated
  if (!isActivated && !isDeactivated) {
    return (
      <Card className="border-rose-200/80 dark:border-rose-950/60 bg-gradient-to-br from-white via-rose-50/15 to-white dark:from-neutral-900 dark:via-rose-950/10 dark:to-neutral-900 shadow-sm overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-rose-600/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Assistente com IA Pós-Implantação
                </h3>
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 text-[10px] font-medium">
                  <Sparkles className="h-3 w-3 mr-1 text-rose-500" />
                  Orion TN
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Ative o assistente virtual para gerar o link exclusivo do cliente com suporte operacional inteligente, consulta a rotinas e videoaulas do sistema.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleActivate}
            disabled={activating}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-9 px-4 gap-1.5 shadow-sm shrink-0 w-full sm:w-auto"
          >
            {activating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {activating ? "Ativando..." : "Ativar Assistente"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 2. Deactivated / Concluded State
  if (isDeactivated) {
    return (
      <Card className="border-amber-200 dark:border-amber-950/60 bg-gradient-to-br from-white via-amber-50/15 to-white dark:from-neutral-900 dark:via-amber-950/10 dark:to-neutral-900 shadow-sm overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-600/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <PowerOff className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Assistente Pós-Implantação · Acesso Encerrado
                  </h3>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-semibold">
                    Encerrado
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                  O acesso ao link público foi desativado para este cartório. Novas perguntas estão bloqueadas, mas o histórico permanece disponível para auditoria.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleViewLogs}
                className="h-8 text-xs gap-1.5 border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-slate-300"
              >
                <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                Visualizar Logs
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleActivate}
                disabled={activating}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Reativar Assistente
              </Button>
            </div>
          </div>

          {summary && summary.total_messages > 0 && (
            <div className="pt-2 border-t flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50"
              >
                Ver histórico de conversas anteriores ({summary.total_messages} msgs)
              </Button>
            </div>
          )}
        </CardContent>

        {/* History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5 text-rose-600" />
                Histórico de Conversas com o Assistente
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mensagens trocadas pelo cliente do cartório {project.clientName}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 my-2">
              {summary?.recent_messages?.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg text-xs space-y-1.5 ${
                    m.role === "user"
                      ? "bg-slate-100 dark:bg-slate-800/80 ml-6 border border-slate-200"
                      : "bg-rose-50/60 dark:bg-rose-950/20 mr-6 border border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>{m.role === "user" ? "Cliente" : "Assistente IA"}</span>
                    <span>{m.created_at ? format(new Date(m.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                  </div>
                  <div className="text-foreground leading-relaxed pt-0.5">
                    {m.role === "assistant" ? <PosChatMessageContent content={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // 3. Active State
  const totalFeedback = (summary?.helpful_count || 0) + (summary?.unhelpful_count || 0);
  const satisfactionRate =
    totalFeedback > 0 ? Math.round(((summary?.helpful_count || 0) / totalFeedback) * 100) : null;

  return (
    <Card className="border-rose-200 dark:border-rose-950/60 bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-neutral-900 dark:via-rose-950/10 dark:to-neutral-900 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-600/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Assistente com IA Pós-Implantação
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                  <Sparkles className="h-3 w-3 mr-1 text-emerald-500" />
                  Orion TN · Ativo
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Link público exclusivo para o cliente tirar dúvidas técnicas e operacionais sobre o sistema com IA especializada.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivateDialogOpen(true)}
              className="h-7 text-xs gap-1 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              title="Encerrar acesso do cliente ao assistente"
            >
              <PowerOff className="h-3 w-3 text-amber-600" />
              Encerrar Acesso
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Link publico e acoes */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg bg-muted/60 border border-border/70">
          <div className="relative flex-1">
            <Input
              readOnly
              value={publicUrl}
              className="h-8 text-xs font-mono bg-background/80 pr-8 select-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs gap-1.5 font-medium border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleViewLogs}
              className="h-8 text-xs gap-1.5 font-medium border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300"
              title="Acessar painel administrativo de logs e métricas"
            >
              <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Visualizar Logs
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleOpenLink}
              className="h-8 text-xs gap-1.5 font-medium bg-rose-600 hover:bg-rose-700 text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir chat
            </Button>
          </div>
        </div>

        {/* Metricas de uso */}
        {summary && summary.total_messages > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-lg border bg-card/60">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Total de Mensagens</span>
                <MessageSquare className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="text-xl font-bold mt-1">{summary.total_messages}</p>
              <p className="text-[10px] text-muted-foreground">{summary.user_messages} perguntas do cliente</p>
            </div>

            <div className="p-3 rounded-lg border bg-card/60">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Conversas / Sessões</span>
                <Bot className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <p className="text-xl font-bold mt-1">{summary.total_sessions}</p>
              <p className="text-[10px] text-muted-foreground">Sessões distintas</p>
            </div>

            <div className="p-3 rounded-lg border bg-card/60">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Satisfação do Cliente</span>
                <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-xl font-bold mt-1">
                {satisfactionRate !== null ? `${satisfactionRate}%` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {summary.helpful_count} útil · {summary.unhelpful_count} não ajudou
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-card/60">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Último Contato</span>
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <p className="text-sm font-semibold mt-1 truncate">
                {summary.last_message_at
                  ? format(new Date(summary.last_message_at), "dd/MM 'às' HH:mm", { locale: ptBR })
                  : "Nenhum ainda"}
              </p>
              <p className="text-[10px] text-muted-foreground">Atividade recente</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/40 border border-dashed text-center text-xs text-muted-foreground">
            O assistente está ativado. O link acima já pode ser enviado ao cliente para atendimento no pós-implantação.
          </div>
        )}

        {/* Botao de Ver Historico */}
        {summary && summary.total_messages > 0 && (
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              Ver histórico de conversas do cliente ({summary.total_messages})
            </Button>
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog to Deactivate / Encerrar Acesso */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">
                Encerrar Acesso ao Assistente?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed pt-2">
              Ao encerrar o acesso, o link público será desativado e o cliente do cartório <strong>{project.clientName}</strong> não poderá mais enviar novas perguntas.
              <br /><br />
              Todo o histórico de conversas e relatórios de auditoria permanecerão salvos. Você poderá reativar o assistente a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivateDialogOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {deactivating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
              {deactivating ? "Encerrando..." : "Sim, Encerrar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Historico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5 text-rose-600" />
              Histórico de Conversas com o Assistente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mensagens trocadas entre o cliente do cartório {project.clientName} e a IA
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 my-2">
            {!summary?.recent_messages?.length ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma mensagem registrada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.recent_messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg text-xs space-y-1.5 ${
                      m.role === "user"
                        ? "bg-slate-100 dark:bg-slate-800/80 ml-6 border border-slate-200 dark:border-slate-700"
                        : "bg-rose-50/60 dark:bg-rose-950/20 mr-6 border border-rose-200/80 dark:border-rose-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {m.role === "user" ? (
                          <>
                            <User className="h-3 w-3" /> Cliente
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3 text-rose-600" /> Assistente IA
                          </>
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-[10px]">
                        {m.feedback === "helpful" && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:border-emerald-800 text-[10px] py-0">
                            <ThumbsUp className="h-2.5 w-2.5 mr-1" /> Útil
                          </Badge>
                        )}
                        {m.feedback === "unhelpful" && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:border-rose-800 text-[10px] py-0">
                            <ThumbsDown className="h-2.5 w-2.5 mr-1" /> Não ajudou
                          </Badge>
                        )}
                        <span>
                          {m.created_at ? format(new Date(m.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-foreground leading-relaxed pt-0.5">
                      {m.role === "assistant" ? (
                        <PosChatMessageContent content={m.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                    {m.feedback_comment && (
                      <p className="text-[11px] text-muted-foreground italic border-t pt-1 mt-1">
                        Comentário do cliente: &quot;{m.feedback_comment}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
