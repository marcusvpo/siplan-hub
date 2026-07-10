import { useEffect, useRef, useState } from "react";
import { useCopilot } from "@/hooks/useCopilot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, User, Sparkles, Lock } from "lucide-react";

const SUGESTOES = [
  "Quais cartorios estao com a conversao pendente?",
  "Liste os projetos com a etapa de infraestrutura concluida.",
  "Quais projetos estao parados na implantacao e quem e o responsavel?",
  "Resuma o andamento geral do portfolio.",
];

export default function Copilot() {
  const { access, accessLoading, jobs, enqueue, activeJob, hasAccess } = useCopilot();
  const [question, setQuestion] = useState("");
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
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      {/* Cabecalho */}
      <div className="flex items-center justify-between gap-3 py-4 px-1">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Copiloto Operacional</h1>
            <p className="text-xs text-muted-foreground">Pergunte sobre o portfolio de projetos</p>
          </div>
        </div>
        {limit > 0 && (
          <Badge variant={overQuota ? "destructive" : "secondary"} className="font-normal">
            Cota: {usedToday.toLocaleString("pt-BR")}/{limit.toLocaleString("pt-BR")} tokens
          </Badge>
        )}
      </div>

      {/* Historico */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
        {jobs.length === 0 && (
          <div className="pt-8 space-y-4">
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

        {jobs.map((job) => (
          <div key={job.id} className="space-y-3">
            {/* Pergunta */}
            <div className="flex justify-end">
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">
                  {job.question}
                </div>
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              </div>
            </div>
            {/* Resposta */}
            <div className="flex justify-start">
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
            </div>
          </div>
        ))}
      </div>

      {/* Entrada */}
      <div className="border-t pt-3 pb-4 px-1">
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
          <Button onClick={send} disabled={!question.trim() || !!activeJob || overQuota} size="icon" className="h-10 w-10 shrink-0">
            {activeJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
