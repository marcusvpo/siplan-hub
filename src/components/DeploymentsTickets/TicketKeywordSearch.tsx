import type { KeyboardEvent } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface TicketKeywordSearchProps {
  keywords: string[];
  value: string;
  onValueChange: (value: string) => void;
  onAdd: (value: string) => void;
  onRemove: (keyword: string) => void;
  placeholder: string;
  inputLabel: string;
  compact?: boolean;
  className?: string;
  testId?: string;
}

export function TicketKeywordSearch({
  keywords,
  value,
  onValueChange,
  onAdd,
  onRemove,
  placeholder,
  inputLabel,
  compact = false,
  className,
  testId,
}: TicketKeywordSearchProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onAdd(value);
      return;
    }

    if (event.key === "Backspace" && !value && keywords.length > 0) {
      onRemove(keywords[keywords.length - 1]);
    }
  };

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex min-h-10 w-full min-w-0 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-foreground shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        compact && "md:min-h-7 md:px-1.5 md:py-0.5",
        className,
      )}
    >
      <Search className={cn("h-4 w-4 shrink-0 text-muted-foreground", compact && "md:h-3 md:w-3")} />
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className={cn(
            "flex h-7 max-w-full min-w-0 items-center gap-0.5 rounded-md bg-muted px-1.5 text-xs font-medium",
            compact && "md:h-5 md:text-[10px]",
          )}
        >
          <span className="max-w-40 truncate">{keyword}</span>
          <button
            type="button"
            aria-label={`Remover palavra-chave ${keyword}`}
            onClick={() => onRemove(keyword)}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact && "md:h-4 md:w-4",
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={inputLabel}
        autoComplete="off"
        placeholder={keywords.length > 0 ? "Adicionar outra..." : placeholder}
        className={cn(
          "h-7 min-w-28 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          compact && "md:h-5 md:min-w-20 md:text-[11px]",
        )}
      />
    </div>
  );
}
