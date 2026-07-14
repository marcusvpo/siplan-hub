import { Palmtree, BarChart3, CheckCircle2 } from "lucide-react";

/**
 * Legenda dos tipos de evento do calendário.
 * Espelha os estilos definidos em getEventTypeStyles (EventCard.tsx):
 * cheio = agendamento real; tracejado = marcador/prazo ou ausência.
 */
export function CalendarLegend() {
  return (
    <div className="hidden md:flex items-center gap-3 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
      {/* Implantação (evento padrão, preenchido) */}
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-md bg-sky-500 shrink-0" />
        <span>Implantação</span>
      </div>

      {/* Aderência (tracejado âmbar, vazado) */}
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-md border-2 border-dashed border-amber-500 dark:border-amber-400 bg-transparent flex items-center justify-center shrink-0">
          <BarChart3 className="h-2 w-2 text-amber-500 dark:text-amber-400" />
        </span>
        <span>Aderência</span>
      </div>

      {/* Homologação (roxo sólido) */}
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-md bg-gradient-to-r from-violet-600 to-purple-500 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-2 w-2 text-white" />
        </span>
        <span>Homologação</span>
      </div>

      {/* Férias (tracejado vermelho, hachurado) */}
      <div className="flex items-center gap-1.5">
        <span
          className="h-3 w-5 rounded-md border-2 border-dashed border-red-400 dark:border-red-500 flex items-center justify-center shrink-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(239,68,68,0.15) 2px, rgba(239,68,68,0.15) 4px)",
          }}
        >
          <Palmtree className="h-2 w-2 text-red-400 dark:text-red-500" />
        </span>
        <span>Férias</span>
      </div>
    </div>
  );
}
