import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectV2 } from "@/types/ProjectV2";
import { GeneralInfoTab } from "./Tabs/GeneralInfoTab";
import { EditProjectTab } from "./Tabs/EditProjectTab";
import { StepsTab } from "./Tabs/StepsTab";
import { TimelineTab } from "./Tabs/TimelineTab";
import { FilesTab } from "./Tabs/FilesTab";
import { AuditTab } from "./Tabs/AuditTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import { useState } from "react";

interface ProjectModalProps {
  project: ProjectV2 | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (project: ProjectV2) => void;
}

export function ProjectModal({ project, open, onOpenChange, onUpdate }: ProjectModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setIsEditing(false);
    }}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-bold">{project.clientName}</DialogTitle>
              <Badge variant="outline">{project.systemType}</Badge>
              <span className="text-sm text-muted-foreground">#{project.ticketNumber}</span>
            </div>
            <DialogDescription>
              Detalhes e gerenciamento do projeto.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <X className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </Button>
        </DialogHeader>
        
        {isEditing ? (
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            <EditProjectTab project={project} onUpdate={onUpdate} />
          </div>
        ) : (
          <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b bg-muted/30">
              <TabsList className="h-12 bg-transparent p-0 gap-6">
                <TabsTrigger value="general" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                  Informações Gerais
                </TabsTrigger>
                <TabsTrigger value="steps" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                  Etapas
                </TabsTrigger>
                <TabsTrigger value="timeline" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                  Timeline (Social)
                </TabsTrigger>
                <TabsTrigger value="files" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                  Arquivos
                </TabsTrigger>
                <TabsTrigger value="audit" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
                  Auditoria
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-background">
              <TabsContent value="general" className="m-0 h-full">
                <GeneralInfoTab project={project} onUpdate={onUpdate} />
              </TabsContent>
              <TabsContent value="steps" className="m-0 h-full">
                <StepsTab project={project} onUpdate={onUpdate} />
              </TabsContent>
              <TabsContent value="timeline" className="m-0 h-full">
                <TimelineTab project={project} onUpdate={onUpdate} />
              </TabsContent>
              <TabsContent value="files" className="m-0 h-full">
                <FilesTab project={project} onUpdate={onUpdate} />
              </TabsContent>
              <TabsContent value="audit" className="m-0 h-full">
                <AuditTab project={project} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
