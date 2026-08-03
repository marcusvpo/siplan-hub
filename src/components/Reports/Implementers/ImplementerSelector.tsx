import * as React from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ImplementerProfile } from "@/hooks/useImplementerReport";

interface ImplementerSelectorProps {
  implementers: ImplementerProfile[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ImplementerSelector({
  implementers,
  selectedId,
  onSelect,
}: ImplementerSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedImplementer = React.useMemo(
    () => implementers.find((imp) => imp.id === selectedId),
    [implementers, selectedId]
  );

  const sortedImplementers = React.useMemo(() => {
    return [...implementers].sort((a, b) => a.name.localeCompare(b.name));
  }, [implementers]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[320px] sm:w-[350px] justify-between shadow-sm bg-card/60 backdrop-blur-md border-border hover:border-primary/40 hover:bg-accent/40 transition-all rounded-xl h-11 px-3.5 group"
        >
          <div className="flex items-center gap-2.5 truncate">
            <User className="h-4 w-4 shrink-0 text-primary" />
            {selectedImplementer ? (
              <span className="truncate font-semibold text-xs text-foreground tracking-tight">
                {selectedImplementer.name}
              </span>
            ) : (
              <span className="text-muted-foreground/70 text-xs font-medium tracking-tight">
                Selecionar implantador...
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] sm:w-[350px] p-0 border-border/80 bg-card/95 backdrop-blur-xl shadow-xl rounded-xl overflow-hidden"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Buscar por nome ou e-mail..."
            className="border-none focus:ring-0 text-xs font-medium placeholder:text-muted-foreground/50 h-11"
          />
          <CommandList className="max-h-[300px] scrollbar-thin">
            <CommandEmpty className="py-6 text-center text-xs font-medium text-muted-foreground/60">
              Nenhum implantador encontrado.
            </CommandEmpty>
            <CommandGroup
              heading={
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1">
                  Implantadores ({sortedImplementers.length})
                </span>
              }
            >
              {sortedImplementers.map((imp) => {
                const isSelected = selectedId === imp.id;
                return (
                  <CommandItem
                    key={imp.id}
                    value={`${imp.name} ${imp.email}`}
                    onSelect={() => {
                      onSelect(isSelected ? null : imp.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between py-2.5 px-3 cursor-pointer hover:bg-primary/5 transition-colors group/item rounded-lg my-0.5"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0 pr-2">
                      <div
                        className={cn(
                          "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary"
                        )}
                      >
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={cn(
                              "truncate text-xs font-semibold tracking-tight",
                              isSelected ? "text-primary" : "text-foreground"
                            )}
                          >
                            {imp.name}
                          </span>
                          {imp.team && (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1 py-0 font-medium bg-muted/40 text-muted-foreground border-border/50 shrink-0"
                            >
                              {imp.team}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground/70 truncate">
                          {imp.email}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "ml-2 h-4 w-4 rounded-full border border-primary/20 flex items-center justify-center shrink-0 transition-all",
                        isSelected
                          ? "bg-primary border-primary"
                          : "opacity-0 group-hover/item:opacity-30"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-2.5 w-2.5 text-primary-foreground",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
