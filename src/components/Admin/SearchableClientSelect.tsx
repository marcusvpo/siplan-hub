import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/utils/normalize-search";

export interface SearchableClientOption {
  value: string;
  label: string;
  details?: string;
  searchTerms?: string;
}

interface SearchableClientSelectProps {
  id?: string;
  value: string;
  options: SearchableClientOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  buttonClassName?: string;
  allowCustomValue?: boolean;
  onValueChange: (value: string) => void;
}

export function SearchableClientSelect({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder = "Digite o nome do cliente...",
  emptyMessage = "Nenhum cliente encontrado.",
  buttonClassName,
  allowCustomValue = false,
  onValueChange,
}: SearchableClientSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const customValue = search.trim();
  const normalizedCustomValue = normalizeSearchText(customValue);
  const hasExactOption = options.some((option) =>
    [option.value, option.label, option.searchTerms || ""]
      .some((candidate) => normalizeSearchText(candidate) === normalizedCustomValue),
  );
  const canUseCustomValue = allowCustomValue && Boolean(customValue) && !hasExactOption;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder}
          className={cn(
            "h-8 w-full justify-between gap-2 px-3 text-xs font-normal sm:w-48",
            buttonClassName,
          )}
        >
          <span className={cn("truncate", !selectedOption && !value && "text-muted-foreground")}>
            {selectedOption?.label || (allowCustomValue && value) || placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0"
      >
        <Command
          filter={(optionValue, query) =>
            normalizeSearchText(optionValue).includes(normalizeSearchText(query)) ? 1 : 0
          }
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            className="h-9 text-xs"
            maxLength={160}
          />
          <CommandList
            className="max-h-72 overscroll-contain"
            onWheel={(event) => event.stopPropagation()}
          >
            <CommandEmpty className="py-5 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {canUseCustomValue && (
                <CommandItem
                  value={`Usar ${customValue}`}
                  onSelect={() => {
                    onValueChange(customValue);
                    handleOpenChange(false);
                  }}
                  className="gap-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">Usar “{customValue}”</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    nome avulso
                  </span>
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.details || ""} ${option.searchTerms || ""} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    handleOpenChange(false);
                  }}
                  className="gap-2 text-xs"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.details && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {option.details}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
