import { ProjectV2 } from "@/types/ProjectV2";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, User, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { ProjectCommercial0800Bridge } from "@/components/ProjectManagement/Forms/ProjectCommercial0800Bridge";

interface ProjectHeaderFormProps {
  project: ProjectV2;
  onProjectUpdated?: (updatedProject?: Partial<ProjectV2>) => void;
}

export function ProjectHeaderForm({ project, onProjectUpdated }: ProjectHeaderFormProps) {
  const isModelosTN = project.systemType === "Modelos TN";
  const statusLabel =
    project.globalStatus === "in-progress"
      ? "Em Andamento"
      : project.globalStatus === "done"
        ? "Concluído"
        : project.globalStatus === "blocked"
          ? "Pausado"
          : "A Fazer";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-3 w-3" />
        </div>
        <h3 className="text-xs font-bold tracking-tight text-foreground">Dados do Projeto</h3>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-stretch">
        {/* Campos principais em faixa compacta (8 cols no desktop) */}
        <div
          className={cn(
            "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:col-span-8",
            isModelosTN ? "lg:grid-cols-4" : "lg:grid-cols-5",
          )}
        >
          {/* Sistema */}
          <div className="group flex min-w-0 flex-col justify-center rounded-lg border bg-card px-2.5 py-1.5 shadow-xs transition-colors hover:bg-accent/50">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
              Sistema
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <p className="truncate text-xs font-bold text-foreground">{project.systemType}</p>
              <Badge
                variant="secondary"
                className="h-3.5 shrink-0 border-emerald-500/20 bg-emerald-500/10 px-1 text-[8px] text-emerald-600 dark:text-emerald-400"
              >
                new
              </Badge>
            </div>
          </div>

          {/* Chamado */}
          <div className="group flex min-w-0 flex-col justify-center rounded-lg border bg-card px-2.5 py-1.5 shadow-xs transition-colors hover:bg-accent/50">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
              Chamado
            </p>
            <EllevoTicketLink
              ticketNumber={project.ticketNumber}
              className="mt-0.5 truncate font-mono text-xs font-bold text-foreground/85"
            />
          </div>

          {/* Líder */}
          <div className="group flex min-w-0 flex-col justify-center rounded-lg border bg-card px-2.5 py-1.5 shadow-xs transition-colors hover:bg-accent/50">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
              Líder
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="h-2.5 w-2.5" />
              </div>
              <p className="truncate text-xs font-bold text-foreground" title={project.projectLeader}>
                {project.projectLeader}
              </p>
            </div>
          </div>

          {/* Horas */}
          <div className="group flex min-w-0 flex-col justify-center rounded-lg border bg-card px-2.5 py-1.5 shadow-xs transition-colors hover:bg-accent/50">
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
              {isModelosTN ? "Horas Trab." : "Horas"}
            </p>
            <p className="mt-0.5 text-xs font-bold text-foreground">
              {isModelosTN ? project.workHours || 0 : project.soldHours || 0}
              <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">h</span>
            </p>
          </div>

          {/* Legado */}
          {!isModelosTN && (
            <div className="group col-span-2 flex min-w-0 flex-col justify-center rounded-lg border bg-card px-2.5 py-1.5 shadow-xs transition-colors hover:bg-accent/50 sm:col-span-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
                Legado
              </p>
              <p
                className="mt-0.5 truncate text-xs font-bold text-foreground"
                title={project.legacySystem || "-"}
              >
                {project.legacySystem || "-"}
              </p>
            </div>
          )}
        </div>

        {/* Cards compactos Azul (Status Atual) e Vermelho (Última Atualização) — 4 cols */}
        <div className="grid grid-cols-2 gap-1.5 lg:col-span-4">
          {/* Status Atual (Azul) */}
          <div className="group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 px-3 py-2 text-white shadow-sm shadow-blue-900/20">
            <div className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/10 blur-xl transition-colors group-hover:bg-white/20" />
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 backdrop-blur-sm">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[8.5px] font-bold uppercase tracking-widest text-blue-100/90">
                Status Atual
              </p>
              <p className="truncate text-xs font-black uppercase tracking-tight leading-tight">
                {statusLabel}
              </p>
            </div>
          </div>

          {/* Última Atualização (Vermelho/Rosa) */}
          <div className="group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 px-3 py-2 text-white shadow-sm shadow-rose-900/20">
            <div className="pointer-events-none absolute -left-4 -top-4 h-12 w-12 rounded-full bg-white/10 blur-xl transition-colors group-hover:bg-white/20" />
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5 text-rose-100" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[8.5px] font-bold uppercase tracking-widest text-rose-100/90">
                Atualização
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="truncate text-xs font-black uppercase tracking-tight leading-tight">
                  {format(new Date(project.lastUpdatedAt), "dd MMM", { locale: ptBR })}
                </span>
                <span className="rounded bg-black/15 px-1 py-0.2 text-[10px] font-semibold text-rose-50">
                  {format(new Date(project.lastUpdatedAt), "HH:mm")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-detecção comercial do 0800 */}
      <ProjectCommercial0800Bridge
        project={project}
        onProjectUpdated={onProjectUpdated}
      />
    </div>
  );
}
