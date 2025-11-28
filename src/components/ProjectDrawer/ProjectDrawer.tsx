import { useProjectStore } from "@/stores/projectStore";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  FileText,
  Clock,
  Upload,
  LayoutDashboard,
  History,
} from "lucide-react";
import { StageCards } from "./StageCards";
import { TimelinePanel } from "./TimelinePanel";
import { FileManager } from "./FileManager";
import { DataTab } from "./Tabs/DataTab";
import { AuditTab } from "./Tabs/Audit/AuditTab";

export const ProjectDrawer = () => {
  const { selectedProject, setSelectedProject } = useProjectStore();

  if (!selectedProject) return null;

  return (
    <Sheet
      open={!!selectedProject}
      onOpenChange={() => setSelectedProject(null)}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 overflow-hidden"
      >
        <SheetTitle className="sr-only">
          Detalhes do Projeto {selectedProject.clientName}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Visualização detalhada e edição do projeto{" "}
          {selectedProject.clientName}
        </SheetDescription>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">
                {selectedProject.clientName}
              </h2>
              <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                <span>{selectedProject.systemType}</span>
                <span>•</span>
                <span>Ticket: {selectedProject.ticketNumber}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedProject(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Tabs
            defaultValue="data"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 overflow-x-auto">
              <TabsTrigger
                value="data"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary min-w-[100px]"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dados
              </TabsTrigger>
              <TabsTrigger
                value="stages"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary min-w-[100px]"
              >
                <FileText className="h-4 w-4" />
                Etapas
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary min-w-[100px]"
              >
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary min-w-[100px]"
              >
                <Upload className="h-4 w-4" />
                Arquivos
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary min-w-[100px]"
              >
                <History className="h-4 w-4" />
                Auditoria
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="data"
              className="flex-1 overflow-y-auto p-6 mt-0"
            >
              <DataTab project={selectedProject} />
            </TabsContent>

            <TabsContent
              value="stages"
              className="flex-1 overflow-y-auto p-6 mt-0"
            >
              <StageCards project={selectedProject} />
            </TabsContent>

            <TabsContent
              value="timeline"
              className="flex-1 overflow-y-auto p-6 mt-0"
            >
              <TimelinePanel project={selectedProject} />
            </TabsContent>

            <TabsContent
              value="files"
              className="flex-1 overflow-y-auto p-6 mt-0"
            >
              <FileManager projectId={selectedProject.id} />
            </TabsContent>

            <TabsContent
              value="audit"
              className="flex-1 overflow-y-auto p-6 mt-0"
            >
              <AuditTab project={selectedProject} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
