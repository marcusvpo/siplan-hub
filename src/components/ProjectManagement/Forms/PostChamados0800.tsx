import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChamados0800, useSolicitarSyncChamados0800, Chamado0800 } from "@/hooks/useChamados0800";
import { Headset, ChevronDown, ChevronRight, Loader2, CalendarDays, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PostChamados0800Props {
  /** projects.ticket_number — chamado 0800 que originou o projeto */
  ticketNumber?: string;
  /** post.startDate / post.endDate do estágio de pós-implantação */
  startDate?: Date | string;
  endDate?: Date | string;
  /** Status do estágio de pós. Enquanto NAO estiver 'done', o término planejado
   * não corta a lista: chamados continuam entrando até o pós ser concluído. */
  postStatus?: string;
  /** projects.system_type — lista só chamados do mesmo produto do projeto */
  systemType?: string;
}

const fmtDate = (iso?: string): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

function statusBadgeClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("conclu")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  if (s.includes("não iniciado") || s.includes("nao iniciado"))
    return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
  return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
}

/**
 * Chamados 0800 (Ellevo) abertos pelo cliente dentro do período do
 * pós-implantação. Lê o espelho chamados_0800 (sincronizado pelo vm-worker a
 * cada ~5 min a partir do SQL Server interno). Clicar num chamado abre o modal
 * com os detalhes (inclusive a descrição completa).
 */
export function PostChamados0800({ ticketNumber, startDate, endDate, postStatus, systemType }: PostChamados0800Props) {
  const [open, setOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Chamado0800 | null>(null);
  // Pos concluido -> o periodo fecha no termino. Em qualquer outro status, o
  // termino e so planejamento: lista corre do inicio ate hoje.
  const fimEfetivo = postStatus === "done" ? endDate : undefined;
  const { chamados, clienteResolvido, lastSyncedAt, isLoading, error, parametrosIncompletos } =
    useChamados0800(ticketNumber, startDate, fimEfetivo, systemType);
  const { solicitarSync, syncing } = useSolicitarSyncChamados0800();

  const handleSyncAgora = async () => {
    try {
      await solicitarSync();
      toast.success("Chamados sincronizados com o 0800.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar com o 0800.");
    }
  };

  return (
    <div className="relative bg-neutral-50/30 dark:bg-neutral-950/20 p-4 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 group"
          title={open ? "Recolher" : "Expandir"}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Label className="text-xs font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 cursor-pointer group-hover:text-foreground transition-colors">
            <div className="h-1 w-4 bg-neutral-400 dark:bg-neutral-650 rounded-full" />
            <Headset className="h-4 w-4 text-indigo-500" />
            Chamados 0800 do Período
          </Label>
          {chamados.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground">
              ({chamados.length})
            </span>
          )}
        </button>
        {open && !parametrosIncompletos && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {syncing
              ? "sincronizando…"
              : lastSyncedAt
              ? `sincronizado ${new Date(lastSyncedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
              : null}
            <button
              type="button"
              onClick={handleSyncAgora}
              disabled={syncing}
              title="Sincronizar com o 0800 agora"
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
            </button>
          </span>
        )}
      </div>

      {open && (
        <div className="space-y-1.5">
          {parametrosIncompletos ? (
            <p className="text-xs text-muted-foreground italic px-1">
              Defina a data de <strong>início</strong> do pós-implantação (e o nº do chamado do
              projeto) para listar os chamados do cliente no período.
            </p>
          ) : isLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando chamados…
            </p>
          ) : error ? (
            <p className="text-xs text-red-600 px-1">Erro ao carregar chamados do espelho.</p>
          ) : !clienteResolvido ? (
            <p className="text-xs text-muted-foreground italic px-1">
              Cliente ainda não sincronizado com o 0800 — o espelho atualiza a cada ~5 min
              (verifique também se o nº do chamado do projeto está correto).
            </p>
          ) : chamados.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1">
              Nenhum chamado{systemType ? ` de ${systemType}` : ""} aberto pelo cliente dentro do
              período do pós-implantação.
            </p>
          ) : (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-hidden">
              {chamados.map((c) => (
                <button
                  key={c.numeroChamado}
                  type="button"
                  onClick={() => setSelecionado(c)}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
                  title="Ver detalhes do chamado"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                        #{c.numeroChamado}
                      </span>{" "}
                      {c.titulo || "(sem título)"}
                    </span>
                    <Badge className={cn("shrink-0 text-[10px] pointer-events-none", statusBadgeClass(c.status))}>
                      {c.status || "—"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{c.natureza || "—"}</span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {fmtDate(c.dataAbertura)}
                      {" → "}
                      {c.dataEncerramento ? fmtDate(c.dataEncerramento) : "aberto"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de detalhes do chamado */}
      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    #{selecionado.numeroChamado}
                  </span>
                  <span className="truncate">{selecionado.titulo || "(sem título)"}</span>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn("pointer-events-none", statusBadgeClass(selecionado.status))}>
                    {selecionado.status || "—"}
                  </Badge>
                  {selecionado.natureza && <span>{selecionado.natureza}</span>}
                  {selecionado.criticidade && <span>· {selecionado.criticidade}</span>}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Serventia</p>
                  <p>{selecionado.nomeCliente || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Solicitante</p>
                  <p className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {selecionado.solicitante || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Abertura</p>
                  <p>{fmtDate(selecionado.dataAbertura)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Encerramento</p>
                  <p>{selecionado.dataEncerramento ? fmtDate(selecionado.dataEncerramento) : "Em aberto"}</p>
                </div>
                {selecionado.software && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Software</p>
                    <p>{selecionado.software}</p>
                  </div>
                )}
                {selecionado.equipeResponsavel && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Equipe responsável</p>
                    <p>{selecionado.equipeResponsavel}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Descrição</p>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 p-3 text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                  {selecionado.descricao || "Sem descrição."}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
