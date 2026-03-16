import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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
import { ProjectV2 } from "@/types/ProjectV2";
import { Badge } from "@/components/ui/badge";

interface ProjectSelectorProps {
  projects: ProjectV2[];
  selectedProjectId: string | undefined;
  onSelect: (projectId: string) => void;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect,
}: ProjectSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Sort projects: Active first, then by name
  const sortedProjects = React.useMemo(() => {
    return [...projects].sort((a, b) => {
      if (a.globalStatus === "done" && b.globalStatus !== "done") return 1;
      if (a.globalStatus !== "done" && b.globalStatus === "done") return -1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [projects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[350px] justify-between shadow-xl bg-card/50 backdrop-blur-md border-primary/10 hover:border-primary/30 hover:bg-accent/50 transition-all rounded-xl h-10 px-4 group"
        >
          {selectedProject ? (
            <span className="truncate font-black text-xs uppercase tracking-tight">
              {selectedProject.clientName}
            </span>
          ) : (
            <span className="text-muted-foreground/60 text-xs font-bold uppercase tracking-tight">
              Selecione um projeto...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30 group-hover:opacity-100 transition-opacity" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0 border-primary/10 bg-card/95 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden" align="end">
        <Command className="bg-transparent">
          <CommandInput placeholder="Buscar por cliente ou sistema..." className="border-none focus:ring-0 text-xs font-bold uppercase placeholder:text-muted-foreground/40 h-11" />
          <CommandList className="max-h-[300px] scrollbar-thin">
            <CommandEmpty className="py-6 text-center text-xs font-bold uppercase text-muted-foreground/40">Nenhum projeto encontrado.</CommandEmpty>
            <CommandGroup heading={<span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 px-2">Base de Projetos</span>}>
              {sortedProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.clientName}
                  onSelect={() => {
                    onSelect(project.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-primary/5 transition-colors group/item"
                >
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-xs font-black uppercase tracking-tight",
                          project.globalStatus === "done" &&
                            "text-muted-foreground/40 line-through decoration-muted-foreground/20"
                        )}
                      >
                        {project.clientName}
                      </span>
                      {project.globalStatus === "done" && (
                        <Badge
                          variant="secondary"
                          className="text-[8px] h-3.5 px-1 font-black uppercase bg-muted/50 text-muted-foreground border-none"
                        >
                          OFF
                        </Badge>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                      {project.systemType || "Sistema Não Definido"}
                    </span>
                  </div>
                  <div className={cn(
                    "ml-2 h-4 w-4 rounded-full border border-primary/20 flex items-center justify-center transition-all",
                    selectedProjectId === project.id ? "bg-primary border-primary" : "opacity-0 group-hover/item:opacity-30"
                  )}>
                    <Check className={cn("h-2.5 w-2.5 text-white", selectedProjectId === project.id ? "opacity-100" : "opacity-0")} />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
