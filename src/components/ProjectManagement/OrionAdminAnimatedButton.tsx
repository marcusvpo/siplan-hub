import React, { useMemo } from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { getProjectOrionAdminStatus } from "@/lib/secondary-products";
import { useProjectSecondaryTickets } from "@/hooks/useSecondaryTickets";
import { cn } from "@/lib/utils";

interface OrionAdminAnimatedButtonProps {
  project?: ProjectV2 | null;
  onClick: () => void;
  className?: string;
}

/**
 * Botão Orion Admin estilizado a partir do conceito Uiverse (gharsh11032000),
 * adaptado proporcionalmente para a barra de cabeçalho com transição de cores
 * (Pendente = Rose/Vermelho com pulso externo, Configurado = Emerald/Verde).
 */
export function OrionAdminAnimatedButton({
  project,
  onClick,
  className,
}: OrionAdminAnimatedButtonProps) {
  const { data: secondaryTickets } = useProjectSecondaryTickets(project?.id);

  const status = useMemo(() => {
    return getProjectOrionAdminStatus(project, secondaryTickets);
  }, [project, secondaryTickets]);

  if (!status.required) {
    return null;
  }

  const isConfigured = status.isConfigured;

  return (
    <div className={cn("relative inline-flex items-center shrink-0", className)}>
      {/* Animação pulsando em volta (Aura / Radar pulse) */}
      {!isConfigured ? (
        <>
          <span className="absolute -inset-1 rounded-full bg-rose-500/30 animate-pulse pointer-events-none" />
          <span className="absolute -inset-1.5 rounded-full border-2 border-rose-500/40 animate-ping pointer-events-none opacity-40 [animation-duration:2.5s]" />
        </>
      ) : (
        <span className="absolute -inset-0.5 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
      )}

      <button
        type="button"
        onClick={onClick}
        title={
          isConfigured
            ? "Orion Admin Configurado. Clique para visualizar ou editar as chaves na Etapa 4."
            : `Orion Admin Pendente: Requer chaves para ${status.dependentProducts.join(", ") || "produtos dependentes"}. Clique para abrir na Etapa 4.`
        }
        className={cn(
          "group relative flex items-center justify-center gap-1 h-8 px-6 sm:px-7",
          "rounded-full text-[11px] font-bold tracking-wide uppercase cursor-pointer overflow-hidden select-none",
          "transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-95",
          // Borda e sombra de status
          isConfigured
            ? "text-emerald-500 dark:text-emerald-400 shadow-[0_0_0_2px_rgba(16,185,129,0.85)] hover:shadow-[0_0_0_12px_transparent] active:shadow-[0_0_0_4px_rgba(16,185,129,0.95)]"
            : "text-rose-500 dark:text-rose-400 shadow-[0_0_0_2px_rgba(244,63,94,0.85)] hover:shadow-[0_0_0_12px_transparent] active:shadow-[0_0_0_4px_rgba(244,63,94,0.95)]",
          // Morfologia de hover: arredondado de 100px para 10px
          "hover:rounded-[10px]"
        )}
      >
        {/* Círculo expansivo de fundo (.circle) */}
        <span
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full opacity-0 pointer-events-none",
            "transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
            "group-hover:w-72 group-hover:h-72 group-hover:opacity-100",
            isConfigured ? "bg-emerald-600 dark:bg-emerald-500" : "bg-rose-600 dark:bg-rose-500"
          )}
        />

        {/* Seta 1 (.arr-1: visível na direita inicialmente, sai pela direita no hover) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={cn(
            "absolute right-2.5 w-3.5 h-3.5 z-10 pointer-events-none",
            "transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
            "group-hover:right-[-35%] group-hover:fill-white",
            isConfigured
              ? "fill-emerald-500 dark:fill-emerald-400"
              : "fill-rose-500 dark:fill-rose-400"
          )}
        >
          <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
        </svg>

        {/* Seta 2 (.arr-2: escondida à esquerda inicialmente, entra no hover) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={cn(
            "absolute left-[-35%] w-3.5 h-3.5 z-10 pointer-events-none",
            "transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
            "group-hover:left-2.5 group-hover:fill-white",
            isConfigured
              ? "fill-emerald-500 dark:fill-emerald-400"
              : "fill-rose-500 dark:fill-rose-400"
          )}
        >
          <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
        </svg>

        {/* Texto (.text: desloca no hover e troca de cor) */}
        <span
          className={cn(
            "relative z-10 transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
            "-translate-x-1.5 group-hover:translate-x-1.5 group-hover:text-white font-extrabold",
            isConfigured
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          Orion Admin: {isConfigured ? "Configurado" : "Pendente"}
        </span>
      </button>
    </div>
  );
}
