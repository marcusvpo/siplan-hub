import { ProjectGrid } from "@/components/ProjectManagement/ProjectGrid";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { Package, LayoutDashboard, Home, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background">
      <div className="container mx-auto pt-2 pb-6">
        <div className="mb-4 pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-red-500" />
              <h1 className="text-xl font-bold tracking-tight">Projetos Ativos</h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Layout Centralizado
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Visão geral de todos os projetos de implantação
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <NewProjectDialog />
          </div>
        </div>

        <ProjectGrid />
      </div>
    </div>
  );
};

export default Index;
