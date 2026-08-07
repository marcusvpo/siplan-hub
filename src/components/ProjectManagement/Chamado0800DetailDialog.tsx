import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatOrionProductLabel } from "@/lib/chamados-product-filter";
import { Chamado0800, useChamadoTramites } from "@/hooks/useChamados0800";
import { Clock3, Loader2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const fmtDateBr = (iso?: string): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const fmtDateTimeBr = (value?: string): string => {
  if (!value) return "Data não informada";
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!match) return value;
  const [, y, m, d, hour, minute, second] = match;
  const time = hour && minute ? ` ${hour}:${minute}${second ? `:${second}` : ""}` : "";
  return `${d}/${m}/${y}${time}`;
};

const formatTicketDuration = (start?: string, end?: string): string => {
  if (!start) return "—";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return "—";

  const days = Math.max(0, Math.round((endTime - startTime) / 86_400_000));
  return `${days} ${days === 1 ? "dia" : "dias"}`;
};

export function statusBadgeClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("conclu")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  if (s.includes("não iniciado") || s.includes("nao iniciado"))
    return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
  return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
}

interface Chamado0800DetailDialogProps {
  chamado: Chamado0800 | null;
  onClose: () => void;
  showTramites?: boolean;
}

/** Modal de detalhes de um chamado 0800 (usado na etapa 7 e na Análise Pós). */
export function Chamado0800DetailDialog({
  chamado,
  onClose,
  showTramites = false,
}: Chamado0800DetailDialogProps) {
  const { tramites, isLoading: tramitesLoading, error: tramitesError } =
    useChamadoTramites(chamado?.numeroChamado, showTramites);

  const descricao = (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 p-3 text-sm whitespace-pre-wrap break-words">
      {chamado?.descricao || "Sem descrição."}
    </div>
  );

  return (
    <Dialog open={!!chamado} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto overflow-x-hidden">
        {chamado && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 leading-snug">
                <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-2">
                  #{chamado.numeroChamado}
                </span>
                <span className="break-words">{chamado.titulo || "(sem título)"}</span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("pointer-events-none", statusBadgeClass(chamado.status))}>
                  {chamado.status || "—"}
                </Badge>
                {chamado.natureza && <span>{chamado.natureza}</span>}
                {chamado.criticidade && <span>· {chamado.criticidade}</span>}
                {chamado.tema && (
                  <Badge variant="outline" className="pointer-events-none font-normal">
                    tema: {chamado.tema}
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Serventia</p>
                <p>{chamado.nomeCliente || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Solicitante</p>
                <p className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {chamado.solicitante || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Abertura</p>
                <p>{fmtDateBr(chamado.dataAbertura)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Encerramento</p>
                <p>{chamado.dataEncerramento ? fmtDateBr(chamado.dataEncerramento) : "Em aberto"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {chamado.dataEncerramento ? "Tempo até o encerramento" : "Tempo em aberto"}
                </p>
                <p className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatTicketDuration(chamado.dataAbertura, chamado.dataEncerramento)}
                </p>
              </div>
              {chamado.produto && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Produto</p>
                  <p>{formatOrionProductLabel(chamado.produto)}</p>
                </div>
              )}
              {chamado.software && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Módulo / Software</p>
                  <p>{chamado.software}</p>
                </div>
              )}
              {chamado.equipeResponsavel && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Equipe responsável</p>
                  <p>{chamado.equipeResponsavel}</p>
                </div>
              )}
            </div>

            {showTramites ? (
              <Tabs defaultValue="descricao" className="min-w-0">
                <TabsList className="h-8 p-0.5">
                  <TabsTrigger value="descricao" className="h-7 px-3 py-1 text-xs">
                    Descrição
                  </TabsTrigger>
                  <TabsTrigger value="tramites" className="h-7 px-3 py-1 text-xs">
                    Trâmites{tramites.length > 0 ? ` (${tramites.length})` : ""}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="descricao" className="mt-2">
                  {descricao}
                </TabsContent>

                <TabsContent value="tramites" className="mt-2">
                  {tramitesLoading ? (
                    <div className="flex min-h-24 items-center justify-center gap-2 rounded-lg border text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando trâmites...
                    </div>
                  ) : tramitesError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      Não foi possível carregar os trâmites deste chamado.
                    </div>
                  ) : tramites.length === 0 ? (
                    <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                      Nenhum trâmite sincronizado para este chamado.
                    </div>
                  ) : (
                    <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                      {tramites.map((tramite, index) => (
                        <article
                          key={tramite.sequenciaTramite}
                          className="rounded-lg border border-neutral-200 dark:border-neutral-800"
                        >
                          <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <span>Trâmite {tramite.numeroTramite ?? tramites.length - index}</span>
                              {tramite.atividade && (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                                  {tramite.atividade}
                                </Badge>
                              )}
                            </div>
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock3 className="h-3 w-3" />
                              {fmtDateTimeBr(tramite.dataTramite)}
                            </span>
                          </header>

                          {(tramite.responsavel || tramite.equipeResponsavel) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pt-2 text-[11px] text-muted-foreground">
                              {tramite.responsavel && <span>Responsável: {tramite.responsavel}</span>}
                              {tramite.equipeResponsavel && <span>Equipe: {tramite.equipeResponsavel}</span>}
                            </div>
                          )}

                          <div className="whitespace-pre-wrap break-words px-3 py-2.5 text-sm">
                            {tramite.descricao || "Trâmite sem descrição."}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Descrição
                </p>
                {descricao}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
