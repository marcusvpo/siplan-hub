import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, X } from "lucide-react";
import { GeneralInfoTab } from "@/components/ProjectManagement/Tabs/GeneralInfoTab";
import { StepsTab } from "@/components/ProjectManagement/Tabs/StepsTab";
import { FilesTab } from "@/components/ProjectManagement/Tabs/FilesTab";
import { LogsTab } from "@/components/ProjectManagement/Tabs/LogsTab";
import { RoadmapManager } from "@/components/ProjectManagement/RoadmapManager";
import { EditProjectTab } from "@/components/ProjectManagement/Tabs/EditProjectTab";
import { ProjectV2 } from "@/types/ProjectV2";
import { useQueryClient } from "@tanstack/react-query";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [activeStepId, setActiveStepId] = useState<string | undefined>(undefined);
  const { canEditProjects } = usePermissions();

  const { project, isLoading, error } = useProjectDetails(id || null);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <h2 className="text-2xl font-bold text-destructive">Erro ao carregar projeto</h2>
        <Button onClick={() => navigate("/projects")}>Voltar para Projetos</Button>
      </div>
    );
  }

  const handleUpdate = (updatedProject: ProjectV2) => {
    // Invalidate and refetch or set local data
    queryClient.setQueryData(["projectDetails", id], updatedProject);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-background z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {isLoading ? (
            <Skeleton className="h-8 w-64" />
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{project?.clientName}</h1>
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                  #{project?.ticketNumber}
                </Badge>
                <Badge variant="secondary" className="bg-slate-700 text-white hover:bg-slate-800 ml-2">
                  {project?.systemType}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Gerenciamento completo do projeto</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEditProjects && !isLoading && (
            <Button
              variant={isEditing ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2"
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" /> Cancelar Edição
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" /> Editar Projeto
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-12 gap-6">
            <Skeleton className="col-span-8 h-[400px] rounded-xl" />
            <Skeleton className="col-span-4 h-[400px] rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setIsEditing(false);
            }}
            className="flex-1"
          >
            <div className="px-6 border-b bg-muted/30">
              <div className="max-w-7xl mx-auto">
                <TabsList className="h-12 bg-transparent p-0 gap-8">
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
                </TabsList>
              </div>
            </div>

            <div className="p-6">
              {isEditing && project ? (
                <div className="max-w-7xl mx-auto">
                  <EditProjectTab project={project} onUpdate={handleUpdate} />
                </div>
              ) : project ? (
                <div className="max-w-7xl mx-auto">
                  <TabsContent value="general" className="m-0 border-none p-0 outline-none">
                    <GeneralInfoTab 
                      project={project} 
                      onUpdate={handleUpdate} 
                      onStageClick={(id) => {
                        setActiveStepId(id);
                        setActiveTab("steps");
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="steps" className="m-0 border-none p-0 outline-none">
                    <StepsTab 
                      project={project} 
                      onUpdate={handleUpdate} 
                      activeStepId={activeStepId}
                      onStepClick={(id) => setActiveStepId(id)}
                    />
                  </TabsContent>
                  <TabsContent value="files" className="m-0 border-none p-0 outline-none">
                    <FilesTab project={project} onUpdate={handleUpdate} />
                  </TabsContent>
                  <TabsContent value="logs" className="m-0 border-none p-0 outline-none">
                    <LogsTab project={project} />
                  </TabsContent>
                  <TabsContent value="roadmap" className="m-0 border-none p-0 outline-none">
                    <RoadmapManager projectId={project.id} />
                  </TabsContent>
                </div>
              ) : null}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
