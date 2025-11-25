import { useProjectStore } from "@/stores/projectStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, FileText, Clock, Upload } from "lucide-react";
import { StageCards } from "./StageCards";
import { TimelinePanel } from "./TimelinePanel";
import { FileManager } from "./FileManager";

export const ProjectDrawer = () => {
  const { selectedProject, setSelectedProject } = useProjectStore();

  if (!selectedProject) return null;

  return (
    <Sheet open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">{selectedProject.clientName}</h2>
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

          <Tabs defaultValue="stages" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger value="stages" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <FileText className="h-4 w-4" />
                Etapas
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Upload className="h-4 w-4" />
                Arquivos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stages" className="flex-1 overflow-y-auto p-6 mt-0">
              <StageCards project={selectedProject} />
            </TabsContent>

            <TabsContent value="timeline" className="flex-1 overflow-y-auto p-6 mt-0">
              <TimelinePanel project={selectedProject} />
            </TabsContent>

            <TabsContent value="files" className="flex-1 overflow-y-auto p-6 mt-0">
              <FileManager projectId={selectedProject.id} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
