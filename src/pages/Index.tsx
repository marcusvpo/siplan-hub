import { ProjectGrid } from "@/components/ProjectManagement/ProjectGrid";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { Package, LayoutDashboard, Home, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">


      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-6 w-6 text-red-500" />
              <h2 className="text-2xl font-bold">Projetos Ativos</h2>
            </div>
            <NewProjectDialog />
          </div>
          <p className="text-muted-foreground">
            Visão geral de todos os projetos de implantação (Layout Centralizado)
          </p>
        </div>

        <ProjectGrid />
      </main>
    </div>
  );
};

export default Index;
