import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleFieldSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Bloco colapsável com o mesmo destaque visual de "Dados de conexão".
 */
export function CollapsibleFieldSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleFieldSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="relative space-y-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 dark:bg-primary/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
        title={open ? "Recolher" : "Expandir"}
        aria-label={open ? `Recolher ${title}` : `Expandir ${title}`}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-primary">
            <span className="h-1 w-5 rounded-full bg-primary" />
            {title}
          </h4>
        </span>
        <span className="hidden shrink-0 text-[11px] font-semibold text-primary sm:inline">
          {open ? "Clique para recolher" : "Clique para expandir"}
        </span>
      </button>
      {open && children}
    </div>
  );
}
