import { useEffect, useRef, useState } from "react";
import { useCopilot } from "@/hooks/useCopilot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Send,
  Loader2,
  User,
  Lock,
  Trash2,
  Copy,
  Check,
  Download,
  Star,
  StopCircle,
  RotateCcw,
  History,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SimpleMarkdown } from "./SimpleMarkdown";

const SUGESTOES = [
  "Quais cartorios estao com a conversao pendente?",
  "Liste os projetos com a etapa de infraestrutura concluida.",
  "Quais projetos estao parados na implantacao e quem e o responsavel?",
  "Resuma o andamento geral do portfolio.",
];

const SAVED_KEY = "copilot-saved-questions";
const MAX_SAVED = 10;
// Marca o inicio da "sessao atual": trocas anteriores a isso ficam no historico
// (escondidas por padrao). "Limpar" avanca essa marca para agora.
const SESSION_KEY = "copilot-session-start";

const fmtDateTime = (iso?: string): string => {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
};

const loadSaved = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
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
  const {
    access,
    accessLoading,
    jobs,
    enqueue,
    cancelJob,
    clearConversation,
    setFeedback,
    digest,
    activeJob,
    hasAccess,
  } = useCopilot();
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<"todos" | "ativos">("todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>(loadSaved);
  const [sessionStart, setSessionStart] = useState<number>(
    () => Number(localStorage.getItem(SESSION_KEY)) || 0
  );
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [jobs]);

  const send = () => {
    const q = question.trim();
    if (!q || activeJob) return;
    enqueue.mutate({ question: q, scope: scope === "ativos" ? "ativos" : undefined });
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
    clearConversation.mutate(undefined, {
      onSuccess: () => {
        const now = Date.now();
        setSessionStart(now);
        localStorage.setItem(SESSION_KEY, String(now));
        setShowHistory(false);
      },
    });
  };

  const exportTxt = () => {
    if (!jobs.length) return;
    const body = jobs
      .map((j) => {
        const ans =
          j.status === "done" ? j.resultText || "" : j.status === "error" ? `Falha: ${j.errorMessage || ""}` : "(sem resposta)";
        return `[${fmtDateTime(j.createdAt)}] Voce:\n${j.question}\n\n[${fmtDateTime(j.finishedAt || j.createdAt)}] Copiloto:\n${ans}`;
      })
      .join("\n\n———\n\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copiloto-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const persistSaved = (next: string[]) => {
    setSaved(next);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  };
  const saveQuestion = () => {
    const q = question.trim();
    if (!q || saved.includes(q)) return;
    persistSaved([q, ...saved].slice(0, MAX_SAVED));
  };
  const removeSaved = (q: string) => persistSaved(saved.filter((s) => s !== q));

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

  // Fronteira de sessao: por padrao mostra so as trocas da sessao atual; o
  // historico (trocas anteriores ao ultimo "Limpar") aparece sob demanda.
  const inSession = jobs.filter((j) => new Date(j.createdAt).getTime() >= sessionStart);
  const olderCount = jobs.length - inSession.length;
  const visibleJobs = showHistory ? jobs : inSession;

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Barra: cota + acoes */}
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
            <div className="flex items-center gap-1">
              {(olderCount > 0 || showHistory) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-muted-foreground"
                  onClick={() => setShowHistory((v) => !v)}
                  title={showHistory ? "Ocultar historico" : "Ver conversas anteriores"}
                >
                  {showHistory ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 mr-1" /> Ocultar historico
                    </>
                  ) : (
                    <>
                      <History className="h-3.5 w-3.5 mr-1" /> Historico ({olderCount})
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={exportTxt}
                title="Exportar conversa (.txt)"
              >
                <Download className="h-3.5 w-3.5 mr-1" /> Exportar
              </Button>
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
                Limpar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Historico */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-5 px-1 pb-4">
        {showHistory && (
          <div className="flex justify-center">
            <Badge variant="outline" className="font-normal text-[10px]">
              Vendo conversas anteriores
            </Badge>
          </div>
        )}
        {visibleJobs.length === 0 && (
          <div className="pt-6 space-y-4">
            {digest?.content && (
              <div className="rounded-lg border bg-primary/5 p-3">
                <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Resumo do dia
                </p>
                <div className="text-sm">
                  <SimpleMarkdown text={digest.content} />
                </div>
              </div>
            )}
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
            {saved.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> Salvas
                </p>
                <div className="flex flex-wrap gap-2">
                  {saved.map((s) => (
                    <span
                      key={s}
                      className="group inline-flex items-center gap-1 text-xs rounded-full border px-3 py-1 hover:bg-muted/50"
                    >
                      <button onClick={() => setQuestion(s)} className="max-w-[220px] truncate text-left">
                        {s}
                      </button>
                      <button onClick={() => removeSaved(s)} className="opacity-40 hover:opacity-100" title="Remover">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {visibleJobs.map((job) => {
          const cost = job.tokensCharged || (job.tokensIn || 0) + (job.tokensOut || 0);
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
                <div className="flex items-center gap-2 mt-1 mr-9 text-[10px] text-muted-foreground">
                  <span>{fmtDateTime(job.createdAt)}</span>
                  <button
                    onClick={() => setQuestion(job.question)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    title="Reperguntar (preenche a caixa)"
                  >
                    <RotateCcw className="h-3 w-3" /> Reperguntar
                  </button>
                </div>
              </div>

              {/* Resposta */}
              <div className="flex flex-col items-start">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2 text-sm">
                    {job.status === "done" && <SimpleMarkdown text={job.resultText || ""} />}
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
                {/* Rodape da resposta: hora + custo + copiar + feedback */}
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
                    <button
                      onClick={() => setFeedback(job.id, 1)}
                      className={cn(
                        "hover:text-foreground transition-colors",
                        job.feedback === 1 && "text-green-600"
                      )}
                      title="Resposta util"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setFeedback(job.id, -1)}
                      className={cn(
                        "hover:text-foreground transition-colors",
                        job.feedback === -1 && "text-destructive"
                      )}
                      title="Resposta ruim"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {/* Follow-ups sugeridos */}
                {job.status === "done" && job.followups && job.followups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                    {job.followups.map((f) => (
                      <button
                        key={f}
                        onClick={() => setQuestion(f)}
                        className="text-[11px] rounded-full border px-2.5 py-1 hover:bg-muted/50 transition-colors text-left"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Entrada */}
      <div className="border-t pt-3 px-1 space-y-2">
        {overQuota && (
          <p className="text-xs text-destructive">
            Cota diaria de tokens atingida. Novas perguntas liberam amanha ou apos o admin ajustar o limite.
          </p>
        )}
        <div className="flex items-center gap-2">
          <Select value={scope} onValueChange={(v) => setScope(v as "todos" | "ativos")}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os projetos</SelectItem>
              <SelectItem value="ativos">Somente ativos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={saveQuestion}
            disabled={!question.trim()}
            title="Salvar esta pergunta"
          >
            <Star className="h-3.5 w-3.5 mr-1" /> Salvar
          </Button>
        </div>
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
          {activeJob ? (
            <Button
              onClick={() => cancelJob(activeJob)}
              size="icon"
              variant="destructive"
              className="h-10 w-10 shrink-0"
              title="Parar geracao"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={send}
              disabled={!question.trim() || overQuota}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
