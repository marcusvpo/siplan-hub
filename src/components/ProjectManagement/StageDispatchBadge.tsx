import React from "react";
import { formatDispatchedDate } from "@/utils/date-formatters";
import { cn } from "@/lib/utils";

export interface StageDispatchBadgeProps {
  dispatchDone?: boolean;
  dispatchedAt?: Date | string | number | null;
  dispatchedBy?: string;
  stageId?: string;
  className?: string;
  /** Se true, renderiza versão compacta para cabeçalho / triggers */
  compact?: boolean;
}

export function StageDispatchBadge({
  dispatchDone,
  dispatchedAt,
  stageId,
  className,
  compact = false,
}: StageDispatchBadgeProps) {
  const isDispatched = Boolean(dispatchDone || dispatchedAt);
  const formattedDate = formatDispatchedDate(dispatchedAt);

  if (compact) {
    if (isDispatched) {
      return (
        <span
          data-testid={stageId ? `stage-dispatch-badge-compact-${stageId}` : "stage-dispatch-badge-compact"}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors shrink-0",
            "bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
            className
          )}
          title={`✉️ Notificação: Disparado${formattedDate ? ` em ${formattedDate}` : ""} (Bloqueado contra duplicidade)`}
        >
          <span className="text-xs select-none">✉️</span>
          <span>Disparado</span>
        </span>
      );
    }

    return (
      <span
        data-testid={stageId ? `stage-dispatch-badge-compact-${stageId}` : "stage-dispatch-badge-compact"}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors shrink-0",
          "bg-slate-100 text-slate-600 border border-slate-200/90 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/60",
          className
        )}
        title="✉️ Notificação: Aguardando primeiro início da etapa (Em Andamento)"
      >
        <span className="text-xs select-none">✉️</span>
        <span>Aguardando</span>
      </span>
    );
  }

  // Versão completa para o corpo do card
  if (isDispatched) {
    return (
      <div
        data-testid={stageId ? `stage-dispatch-badge-${stageId}` : "stage-dispatch-badge"}
        className={cn(
          "inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs leading-relaxed max-w-full break-words shadow-2xs transition-colors",
          "bg-emerald-50 text-emerald-800 border border-emerald-200/90 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50",
          className
        )}
      >
        <span className="text-xs shrink-0 select-none">✉️</span>
        <span className="font-semibold">Notificação:</span>
        <span className="break-words">
          {formattedDate
            ? `Disparado em ${formattedDate} (Bloqueado contra duplicidade)`
            : "Disparado (Bloqueado contra duplicidade)"}
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid={stageId ? `stage-dispatch-badge-${stageId}` : "stage-dispatch-badge"}
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs leading-relaxed max-w-full break-words shadow-2xs transition-colors",
        "bg-slate-50 text-slate-600 border border-slate-200/90 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/60",
        className
      )}
    >
      <span className="text-xs shrink-0 select-none">✉️</span>
      <span className="font-semibold">Notificação:</span>
      <span className="break-words">Aguardando primeiro início da etapa (Em Andamento)</span>
    </div>
  );
}
