import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePosSaude } from "@/hooks/usePosPanorama";
import { Headset } from "lucide-react";

/**
 * Selo de saúde do pós no card do projeto. Uma consulta única para a carteira
 * (usePosSaude, cache compartilhado) — cada card só lê o Map.
 *
 *  vermelho: chamado CRÍTICO em aberto no pós
 *  âmbar:    chamados em aberto (não críticos)
 *  verde:    pós com 0 chamados em aberto
 *  nada:     projeto sem pós iniciado / cliente ainda não sincronizado
 */
export function PosSaudeBadge({ projectId }: { projectId: string }) {
  const { data: mapa } = usePosSaude();
  const saude = mapa?.get(projectId);
  if (!saude) return null;

  const classe = saude.criticosAbertos > 0
    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
    : saude.abertos > 0
    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20";

  const titulo = saude.criticosAbertos > 0
    ? `Pós com ${saude.criticosAbertos} chamado(s) CRÍTICO(S) em aberto no 0800`
    : saude.abertos > 0
    ? `Pós com ${saude.abertos} chamado(s) em aberto no 0800`
    : `Pós sem chamados em aberto no 0800 (${saude.total} no período)`;

  return (
    <Badge
      title={titulo}
      className={cn(
        "text-[9px] px-1.5 py-0.5 font-bold shadow-lg border-2 border-background gap-0.5",
        classe
      )}
    >
      <Headset className="h-2.5 w-2.5" />
      {saude.abertos}
    </Badge>
  );
}
