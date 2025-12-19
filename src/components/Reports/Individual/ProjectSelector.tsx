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
          className="w-[350px] justify-between shadow-sm bg-background border-input hover:bg-accent hover:text-accent-foreground"
        >
          {selectedProject ? (
            <span className="truncate font-medium">
              {selectedProject.clientName}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Selecione um projeto...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar projeto..." />
          <CommandList>
            <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
            <CommandGroup heading="Projetos">
              {sortedProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.clientName}
                  onSelect={() => {
                    onSelect(project.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex flex-col gap-1 w-full overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate font-medium",
                          project.globalStatus === "done" &&
                            "text-muted-foreground line-through decoration-slate-400"
                        )}
                      >
                        {project.clientName}
                      </span>
                      {project.globalStatus === "done" && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1"
                        >
                          Concluído
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {project.systemType || "N/A"}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary",
                      selectedProjectId === project.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
