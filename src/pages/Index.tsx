import { DashboardTable } from "@/components/Dashboard/DashboardTable";
import { ProjectDrawer } from "@/components/ProjectDrawer/ProjectDrawer";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { Package, LayoutDashboard } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Siplan Manager</h1>
                <p className="text-sm text-muted-foreground">Gestão de Implantações</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Projetos Ativos</h2>
            </div>
            <NewProjectDialog />
          </div>
          <p className="text-muted-foreground">
            Visão geral de todos os projetos de implantação
          </p>
        </div>

        <DashboardTable />
      </main>

      <ProjectDrawer />
    </div>
  );
};

export default Index;
