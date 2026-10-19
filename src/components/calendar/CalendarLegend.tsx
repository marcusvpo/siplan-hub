import { AlertTriangle, CheckCircle2, Clock, Palmtree, Sparkles } from "lucide-react";

/**
 * Legenda executiva da Timeline de Implantações (Fase 1 & Férias Admin).
 * Cores oficiais padronizadas:
 * - Orion REG = Verde (Emerald)
 * - Orion PRO = Azul (Blue)
 * - Orion TN = Vermelho (Bordô Siplan / Rose)
 * - Conjunta (PRO+REG) = Roxo (Violet)
 * - Férias (Admin) = Âmbar/Laranja tracejado
 * - Feriado em Dia Útil (Seg–Sex) = Destaque Âmbar
 */
export function CalendarLegend() {
  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[10px]"
      data-testid="calendar-legend"
    >
      {/* Orion REG = Verde */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-3 w-4 shrink-0 rounded bg-gradient-to-r from-emerald-600 to-emerald-700 border border-emerald-800 shadow-2xs" />
        <span className="text-foreground font-bold">Orion REG</span>
      </div>

      {/* Orion PRO = Azul */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-3 w-4 shrink-0 rounded bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-800 shadow-2xs" />
        <span className="text-foreground font-bold">Orion PRO</span>
      </div>

      {/* Orion TN = Vermelho */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-3 w-4 shrink-0 rounded bg-gradient-to-r from-[#d3123f] to-[#be123c] border border-[#881337] shadow-2xs" />
        <span className="text-foreground font-bold">Orion TN</span>
      </div>

      {/* Atuação Conjunta PRO + REG = Roxo */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-3 w-4 shrink-0 rounded bg-gradient-to-r from-violet-600 to-purple-700 border border-violet-900 flex items-center justify-center shadow-2xs">
          <Sparkles className="h-2 w-2 text-white" />
        </span>
        <span className="text-foreground font-bold">Conjunta (PRO+REG)</span>
      </div>

      {/* Confirmada vs Prevista */}
      <div className="flex shrink-0 items-center gap-1">
        <span className="inline-flex h-3.5 items-center gap-0.5 rounded bg-emerald-600 px-1 text-[8px] font-extrabold text-white">
          <CheckCircle2 className="h-2.5 w-2.5" />
          CONF
        </span>
        <span>Confirmada</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="inline-flex h-3.5 items-center gap-0.5 rounded border border-border bg-muted px-1 text-[8px] font-bold text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          PREV
        </span>
        <span>Prevista</span>
      </div>

      {/* Férias (Admin) = Âmbar Tracejado */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className="h-3 w-4 shrink-0 rounded border border-dashed border-amber-500 flex items-center justify-center"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.12) 3px, rgba(245,158,11,0.3) 3px, rgba(245,158,11,0.3) 6px)",
          }}
        >
          <Palmtree className="h-2 w-2 text-amber-600 dark:text-amber-400" />
        </span>
        <span>Férias (Admin)</span>
      </div>

      {/* Feriado em Dia Útil (Seg–Sex) */}
      <div className="flex shrink-0 items-center gap-1">
        <span className="inline-flex h-3.5 items-center gap-0.5 rounded border border-amber-500/50 bg-amber-500/20 px-1 text-[8px] font-extrabold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
          FERIADO
        </span>
        <span>Semana c/ Feriado Útil</span>
      </div>
    </div>
  );
}

