import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, X } from "lucide-react";
import { motion } from "framer-motion";
import { GeneralInfoTab } from "@/components/ProjectManagement/Tabs/GeneralInfoTab";
import { StepsTab } from "@/components/ProjectManagement/Tabs/StepsTab";
import { FilesTab } from "@/components/ProjectManagement/Tabs/FilesTab";
import { LogsTab } from "@/components/ProjectManagement/Tabs/LogsTab";
import { RoadmapManager } from "@/components/ProjectManagement/RoadmapManager";
import { EditProjectTab } from "@/components/ProjectManagement/Tabs/EditProjectTab";
import { Chamado0800Tab } from "@/components/ProjectManagement/Tabs/Chamado0800Tab"; // Tab 0800
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
  const { updateProject } = useProjectsV2();

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
    updateProject.mutate({
      projectId: updatedProject.id,
      updates: updatedProject
    });
  };

  return (
    <div className="flex flex-col flex-1 bg-background">
      {/* Header */}
      <div className="px-4 md:px-6 py-2.5 border-b flex flex-row items-start justify-between gap-4 sticky top-0 bg-background z-20">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="shrink-0 h-8 w-8 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          {isLoading ? (
            <Skeleton className="h-6 w-64" />
          ) : (
            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <h1 className="text-lg font-bold tracking-tight text-foreground break-words leading-tight" title={project?.clientName}>
                {project?.clientName}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                  #{project?.ticketNumber}
                </span>
                <Badge variant="secondary" className="bg-slate-700 text-white hover:bg-slate-800 text-xs py-0.5 px-2 shrink-0">
                  {project?.systemType}
                </Badge>
                {project?.TituloChamado && (
                  <>
                    <div className="hidden md:block h-3.5 w-px bg-border mx-0.5 shrink-0" />
                    <span className="font-medium text-foreground/80 break-words max-w-full text-[13px]">
                      {project.TituloChamado}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Detalhes e gerenciamento do projeto.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {canEditProjects && !isLoading && (
            <Button
              variant={isEditing ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2 h-8 text-xs"
            >
              {isEditing ? (
                <>
                  <X className="h-3.5 w-3.5" /> Cancelar Edição
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" /> Editar Projeto
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-8 max-w-[98%] mx-auto w-full">
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
            <div className="px-4 md:px-6 border-b bg-muted/30 overflow-x-auto scrollbar-none">
              <div className="max-w-[98%] mx-auto min-w-max">
                <TabsList className="h-12 bg-transparent p-0 gap-4 md:gap-8 flex-nowrap">
                  <TabsTrigger
                    value="general"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 data-[state=active]:text-foreground transition-all duration-200"
                  >
                    Informações Gerais
                  </TabsTrigger>
                  {project && (project.TituloChamado || project.descricaotramite || project.ResponsavelAtividade || project.EtapasProjeto) && (
                    <TabsTrigger
                      value="chamado_0800"
                      className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-600 text-rose-500/80 font-medium data-[state=active]:bg-transparent px-2 flex items-center gap-1.5 transition-all duration-200 hover:text-rose-500 hover:border-rose-500/30"
                    >
                      Chamado 0800
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="steps"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 data-[state=active]:text-foreground transition-all duration-200"
                  >
                    Etapas
                  </TabsTrigger>
                  <TabsTrigger
                    value="files"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 data-[state=active]:text-foreground transition-all duration-200"
                  >
                    Arquivos
                  </TabsTrigger>
                  <TabsTrigger
                    value="logs"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 data-[state=active]:text-foreground transition-all duration-200"
                  >
                    Logs
                  </TabsTrigger>
                  <TabsTrigger
                    value="roadmap"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 data-[state=active]:text-foreground transition-all duration-200"
                  >
                    Roadmap
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="p-6">
              {isEditing && project ? (
                <div className="max-w-[98%] mx-auto">
                  <EditProjectTab project={project} onUpdate={handleUpdate} />
                </div>
              ) : project ? (
                <div className="max-w-[98%] mx-auto">
                  <TabsContent value="general" className="m-0 border-none p-0 outline-none">
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <GeneralInfoTab 
                        project={project} 
                        onUpdate={handleUpdate} 
                        onStageClick={(id) => {
                          setActiveStepId(id);
                          setActiveTab("steps");
                        }}
                      />
                    </motion.div>
                  </TabsContent>
                  <TabsContent value="steps" className="m-0 border-none p-0 outline-none">
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <StepsTab 
                        project={project} 
                        onUpdate={handleUpdate} 
                        activeStepId={activeStepId}
                        onStepClick={(id) => setActiveStepId(id)}
                      />
                    </motion.div>
                  </TabsContent>
                  <TabsContent value="files" className="m-0 border-none p-0 outline-none">
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FilesTab project={project} onUpdate={handleUpdate} />
                    </motion.div>
                  </TabsContent>
                  <TabsContent value="logs" className="m-0 border-none p-0 outline-none">
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LogsTab project={project} />
                    </motion.div>
                  </TabsContent>
                  <TabsContent value="roadmap" className="m-0 border-none p-0 outline-none">
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <RoadmapManager projectId={project.id} />
                    </motion.div>
                  </TabsContent>
                  {project && (project.TituloChamado || project.descricaotramite || project.ResponsavelAtividade || project.EtapasProjeto) && (
                    <TabsContent value="chamado_0800" className="m-0 border-none p-0 outline-none">
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Chamado0800Tab project={project} />
                      </motion.div>
                    </TabsContent>
                  )}
                </div>
              ) : null}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
