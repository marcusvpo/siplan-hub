import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectV2 } from "@/types/ProjectV2";
import { GeneralInfoTab } from "./Tabs/GeneralInfoTab";
import { EditProjectTab } from "./Tabs/EditProjectTab";
import { StepsTab } from "./Tabs/StepsTab";
import { FilesTab } from "./Tabs/FilesTab";
import { LogsTab } from "./Tabs/LogsTab";
import { RoadmapManager } from "./RoadmapManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import { useState } from "react";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectModalProps {
  project: Partial<ProjectV2> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (project: ProjectV2) => void;
}

export function ProjectModal({
  project: initialProject,
  open,
  onOpenChange,
  onUpdate,
}: ProjectModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Always fetch fresh full details
  const { project: fullProject, isLoading } = useProjectDetails(
    open && initialProject ? initialProject.id! : null,
  );

  const displayProject = fullProject || (initialProject as ProjectV2); // Fallback to initial for header if loading

  if (!initialProject && !fullProject) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) setIsEditing(false);
      }}
    >
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center flex-wrap gap-2">
              {isLoading ? (
                <Skeleton className="h-8 w-64" />
              ) : (
                <DialogTitle className="text-xl font-bold flex items-center gap-2 mr-2">
                  {displayProject?.clientName}
                  <span className="text-lg font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 ml-2">
                    #{displayProject?.ticketNumber || "..."}
                  </span>
                </DialogTitle>
              )}

              <div className="hidden md:block h-6 w-px bg-border mx-2" />

              <Badge
                variant="default"
                className="bg-slate-700 hover:bg-slate-800 text-xs shadow-sm"
              >
                {displayProject?.systemType || "..."}
              </Badge>

              {displayProject?.products?.map((product) => (
                <Badge
                  key={product}
                  variant="secondary"
                  className="border-slate-300 text-xs shadow-sm"
                >
                  {product}
                </Badge>
              ))}

              {displayProject?.relatedTickets &&
                displayProject.relatedTickets.length > 0 && (
                  <div className="hidden md:block h-6 w-px bg-border mx-2" />
                )}

              {displayProject?.relatedTickets?.map((ticket, index) => (
                <span
                  key={index}
                  className="text-sm text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/50"
                >
                  <span className="font-medium text-xs uppercase opacity-70">
                    {ticket.name}:
                  </span>
                  <span className="font-semibold">{ticket.number}</span>
                </span>
              ))}
            </div>
            <DialogDescription className="mt-1">
              Detalhes e gerenciamento do projeto.
            </DialogDescription>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-8">
            {/* Skeleton Loading Improved containing the form structure */}
            <div className="w-full h-32 bg-muted/20 rounded-xl animate-pulse" />
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              </div>
              <div className="col-span-4">
                <Skeleton className="h-full rounded-2xl" />
              </div>
              <div className="col-span-3">
                <Skeleton className="h-full rounded-2xl" />
              </div>
            </div>
          </div>
        ) : (
          <Tabs
            defaultValue="general"
            className="flex-1 flex flex-col overflow-hidden"
            onValueChange={() => setIsEditing(false)}
          >
            <div className="px-6 border-b bg-muted/30">
              <TabsList className="h-12 bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="general"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
                >
                  Informações Gerais
                </TabsTrigger>
                <TabsTrigger
                  value="steps"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
                >
                  Etapas
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
                >
                  Arquivos
                </TabsTrigger>
                <TabsTrigger
                  value="logs"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
                >
                  Logs
                </TabsTrigger>
                <TabsTrigger
                  value="roadmap"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
                >
                  Roadmap
                </TabsTrigger>
                <div className="flex items-center h-full ml-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(!isEditing);
                    }}
                  >
                    {isEditing ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Pencil className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-background">
              {isEditing && fullProject ? (
                <EditProjectTab project={fullProject} onUpdate={onUpdate} />
              ) : fullProject ? (
                <>
                  <TabsContent value="general" className="m-0 h-full">
                    <GeneralInfoTab project={fullProject} onUpdate={onUpdate} />
                  </TabsContent>
                  <TabsContent value="steps" className="m-0 h-full">
                    <StepsTab project={fullProject} onUpdate={onUpdate} />
                  </TabsContent>
                  <TabsContent value="files" className="m-0 h-full">
                    <FilesTab project={fullProject} onUpdate={onUpdate} />
                  </TabsContent>
                  <TabsContent value="logs" className="m-0 h-full">
                    <LogsTab project={fullProject} />
                  </TabsContent>
                  <TabsContent value="roadmap" className="m-0 h-full">
                    <RoadmapManager projectId={fullProject.id} />
                  </TabsContent>
                </>
              ) : null}
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
