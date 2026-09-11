import { AlertTriangle, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { ProjectV2 } from "@/types/ProjectV2";

interface CriticalAlertsProps {
  projects: ProjectV2[];
  onProjectClick: (project: ProjectV2) => void;
}

export function CriticalAlerts({ projects, onProjectClick }: CriticalAlertsProps) {
  if (projects.length === 0) return null;

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-destructive/20 border-b-destructive/40 bg-destructive/5 lg:h-full">
      <CardHeader className="shrink-0 border-b border-destructive/10 bg-destructive/5 px-4 py-3 sm:px-5 sm:py-4">
        <CardTitle className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-widest text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">Alertas Críticos</span>
          <Badge
            variant="destructive"
            className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-[9px]"
          >
            {projects.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="min-w-0 p-2.5 sm:p-4">
        <ul className="min-w-0 space-y-2" aria-label="Projetos com alerta crítico">
          {projects.map((project) => (
            <li key={project.id} className="min-w-0">
              <div className="group flex w-full min-w-0 items-start gap-2.5 rounded-xl border border-destructive/10 bg-background/70 p-3 text-left shadow-sm transition-colors hover:bg-destructive/10 focus-within:ring-2 focus-within:ring-destructive/50">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive"
                />
                <span className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onProjectClick(project)}
                    className="block min-h-7 w-full min-w-0 rounded-sm text-left focus-visible:outline-none"
                  >
                    <span className="block break-words text-xs font-bold leading-4 text-foreground/90">
                      {project.clientName}
                    </span>
                  </button>
                  <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    <span className="break-words">{project.systemType}</span>
                    {project.ticketNumber && (
                      <EllevoTicketLink
                        ticketNumber={project.ticketNumber}
                        className="font-mono normal-case tracking-normal"
                        showIcon={false}
                      />
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onProjectClick(project)}
                  className="flex h-10 w-10 shrink-0 items-start justify-end rounded-md pt-1 text-muted-foreground focus-visible:outline-none"
                  aria-label="Abrir o projeto selecionado"
                >
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
