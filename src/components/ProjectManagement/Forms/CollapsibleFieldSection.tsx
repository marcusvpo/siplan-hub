import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "relative space-y-4 rounded-lg border border-dashed p-4",
        open
          ? "border-neutral-200 bg-neutral-50/30 dark:border-neutral-800 dark:bg-neutral-950/20"
          : "border-primary/40 bg-primary/5 dark:bg-primary/10",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950",
          open
            ? "hover:bg-neutral-100/80 focus-visible:ring-ring dark:hover:bg-neutral-900/60"
            : "hover:bg-primary/10 focus-visible:ring-primary",
        )}
        title={open ? "Recolher" : "Expandir"}
        aria-label={open ? `Recolher ${title}` : `Expandir ${title}`}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              open
                ? "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 group-hover:text-foreground dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-neutral-700"
                : "bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
            )}
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
          <h4
            className={cn(
              "flex min-w-0 items-center gap-2 text-sm font-extrabold uppercase tracking-wide",
              open ? "text-neutral-500 dark:text-neutral-400" : "text-primary",
            )}
          >
            <span
              className={cn(
                "h-1 w-5 rounded-full",
                open ? "bg-neutral-400 dark:bg-neutral-650" : "bg-primary",
              )}
            />
            {title}
          </h4>
        </span>
        <span
          className={cn(
            "hidden shrink-0 text-[11px] font-semibold sm:inline",
            open ? "text-muted-foreground" : "text-primary",
          )}
        >
          {open ? "Clique para recolher" : "Clique para expandir"}
        </span>
      </button>
      {open && children}
    </div>
  );
}
