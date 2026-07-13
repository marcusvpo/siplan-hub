import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartEmptyStateProps {
  /** Mensagem principal exibida ao usuário */
  message?: string;
  /** Texto secundário opcional */
  hint?: string;
  /** Classe para controlar altura/espaçamento conforme o container do chart */
  className?: string;
}

/**
 * Estado vazio padronizado para charts e tabelas do Dashboard.
 * Evita renderizar gráfico/tabela em branco quando não há dados.
 */
export const ChartEmptyState = ({
  message = "Sem dados para exibir",
  hint,
  className,
}: ChartEmptyStateProps) => {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center px-4 py-8 text-muted-foreground",
        className
      )}
    >
      <Inbox className="h-8 w-8 opacity-40" aria-hidden="true" />
      <p className="text-xs font-semibold">{message}</p>
      {hint && <p className="text-[11px] opacity-70 max-w-[220px]">{hint}</p>}
    </div>
  );
};
