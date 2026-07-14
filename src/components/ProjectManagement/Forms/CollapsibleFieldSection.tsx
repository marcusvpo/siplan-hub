import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleFieldSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Bloco colapsavel com o mesmo visual do "Dados de conexao" (campos especificos
 * do StageCard): container tracejado + cabecalho com chevron, barra e titulo.
 */
export function CollapsibleFieldSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleFieldSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="relative bg-neutral-50/30 dark:bg-neutral-950/20 p-4 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 group"
        title={open ? "Recolher" : "Expandir"}
        aria-label={open ? `Recolher ${title}` : `Expandir ${title}`}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
        )}
        <h4 className="text-xs font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 cursor-pointer group-hover:text-foreground transition-colors">
          <div className="h-1 w-4 bg-neutral-400 dark:bg-neutral-650 rounded-full" />
          {title}
        </h4>
      </button>
      {open && children}
    </div>
  );
}
