import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Chamado0800 } from "@/hooks/useChamados0800";
import { User } from "lucide-react";
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
}

/** Modal de detalhes de um chamado 0800 (usado na etapa 7 e na Análise Pós). */
export function Chamado0800DetailDialog({ chamado, onClose }: Chamado0800DetailDialogProps) {
  return (
    <Dialog open={!!chamado} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {chamado && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-6">
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  #{chamado.numeroChamado}
                </span>
                <span className="truncate">{chamado.titulo || "(sem título)"}</span>
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
              {chamado.software && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Software</p>
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

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Descrição</p>
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 p-3 text-sm whitespace-pre-wrap break-words">
                {chamado.descricao || "Sem descrição."}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
