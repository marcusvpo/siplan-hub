import { useEffect, useRef, useState } from "react";
import { useCopilot } from "@/hooks/useCopilot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, User, Lock, Trash2, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const SUGESTOES = [
  "Quais cartorios estao com a conversao pendente?",
  "Liste os projetos com a etapa de infraestrutura concluida.",
  "Quais projetos estao parados na implantacao e quem e o responsavel?",
  "Resuma o andamento geral do portfolio.",
];

const fmtDateTime = (iso?: string): string => {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
};

interface CopilotChatProps {
  /** Mostra a badge de cota no topo da area de mensagens (default true). */
  showQuota?: boolean;
  className?: string;
}

/**
 * Corpo reutilizavel do chat do Copiloto (historico + entrada). Usado tanto na
 * pagina /copilot quanto no widget flutuante. Ocupa 100% da altura do pai.
 */
export function CopilotChat({ showQuota = true, className }: CopilotChatProps) {
  const { access, accessLoading, jobs, enqueue, clearConversation, activeJob, hasAccess } =
    useCopilot();
  const [question, setQuestion] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [jobs]);

  const send = () => {
    const q = question.trim();
    if (!q || activeJob) return;
    enqueue.mutate(q);
    setQuestion("");
  };

  const copyAnswer = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard indisponivel */
    }
  };

  const clear = () => {
    if (!jobs.length || clearConversation.isPending) return;
    if (!window.confirm("Limpar toda a conversa? Esta acao nao pode ser desfeita.")) return;
    clearConversation.mutate();
  };

  if (accessLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">Copiloto nao habilitado</h2>
          <p className="text-sm text-muted-foreground">
            Seu usuario ainda nao tem acesso ao Copiloto Operacional. Peca a um administrador
            para habilitar em <strong>Painel Admin - Copiloto</strong>.
          </p>
        </Card>
      </div>
    );
  }

  const limit = access?.dailyTokenLimit ?? 0;
  const used = access?.tokensUsedToday ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const sameDay = String(access?.periodResetAt || "").slice(0, 10) === today;
  const usedToday = sameDay ? used : 0;
  const overQuota = limit > 0 && usedToday >= limit;

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Barra: cota + limpar conversa */}
      {(showQuota || jobs.length > 0) && (
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          {showQuota && limit > 0 ? (
            <Badge variant={overQuota ? "destructive" : "secondary"} className="font-normal">
              Cota: {usedToday.toLocaleString("pt-BR")}/{limit.toLocaleString("pt-BR")} tokens
            </Badge>
          ) : (
            <span />
          )}
          {jobs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-destructive"
              onClick={clear}
              disabled={clearConversation.isPending}
            >
              {clearConversation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1" />
              )}
              Limpar conversa
            </Button>
          )}
        </div>
      )}

      {/* Historico */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-5 px-1 pb-4">
        {jobs.length === 0 && (
          <div className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Comece com uma pergunta ou escolha uma sugestao:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuestion(s)}
                  className="text-left text-sm rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {jobs.map((job) => {
          const cost = (job.tokensIn || 0) + (job.tokensOut || 0);
          return (
            <div key={job.id} className="space-y-3">
              {/* Pergunta */}
              <div className="flex flex-col items-end">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">
                    {job.question}
                  </div>
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 mr-9">
                  {fmtDateTime(job.createdAt)}
                </span>
              </div>

              {/* Resposta */}
              <div className="flex flex-col items-start">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2 text-sm whitespace-pre-wrap">
                    {job.status === "done" && job.resultText}
                    {job.status === "error" && (
                      <span className="text-destructive">
                        Falha: {job.errorMessage || "erro desconhecido"}
                      </span>
                    )}
                    {job.status === "cancelled" && (
                      <span className="text-muted-foreground italic">Cancelado.</span>
                    )}
                    {(job.status === "pending" || job.status === "processing") && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {job.progress || "Analisando..."}
                      </span>
                    )}
                  </div>
                </div>
                {/* Rodape da resposta: hora + custo + copiar */}
                {job.status === "done" && (
                  <div className="flex items-center gap-2 mt-1 ml-9 text-[10px] text-muted-foreground">
                    <span>{fmtDateTime(job.finishedAt || job.createdAt)}</span>
                    {cost > 0 && <span>· {cost.toLocaleString("pt-BR")} tokens</span>}
                    <button
                      onClick={() => copyAnswer(job.id, job.resultText || "")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      title="Copiar resposta"
                    >
                      {copiedId === job.id ? (
                        <>
                          <Check className="h-3 w-3" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Entrada */}
      <div className="border-t pt-3 px-1">
        {overQuota && (
          <p className="text-xs text-destructive mb-2">
            Cota diaria de tokens atingida. Novas perguntas liberam amanha ou apos o admin ajustar o limite.
          </p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Pergunte sobre os projetos... (Enter envia, Shift+Enter quebra linha)"
            rows={2}
            disabled={!!activeJob || overQuota}
            className="resize-none"
          />
          <Button
            onClick={send}
            disabled={!question.trim() || !!activeJob || overQuota}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            {activeJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
