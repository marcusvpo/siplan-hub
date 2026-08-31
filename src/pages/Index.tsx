import { ProjectGrid } from "@/components/ProjectManagement/ProjectGrid";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { ProjectTagsLegendDialog } from "@/components/ProjectManagement/ProjectTagsLegendDialog";
import { FolderKanban } from "lucide-react";

const Index = () => {
  return (
    <div
      className="h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background"
      data-testid="projects-page"
    >
      <div className="mx-auto w-full min-w-0 max-w-[1600px] pb-6 pt-1 sm:pt-2">
        <div className="mb-4 flex min-w-0 flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FolderKanban className="h-5 w-5 shrink-0 text-red-500" />
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">Projetos Ativos</h1>
              <span className="hidden rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:inline-flex">
                Layout Centralizado
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Visão geral de todos os projetos de implantação
            </p>
          </div>
          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto sm:self-center">
            <ProjectTagsLegendDialog />
            <NewProjectDialog />
          </div>
        </div>

        <ProjectGrid />
      </div>
    </div>
  );
};

export default Index;
