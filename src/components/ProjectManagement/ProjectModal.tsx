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
import { Chamado0800Tab } from "./Tabs/Chamado0800Tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, X, Maximize2, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [activeTab, setActiveTab] = useState("general");
  const [activeStepId, setActiveStepId] = useState<string | undefined>(undefined);
  const { canEditProjects } = usePermissions();
  const navigate = useNavigate();

  // Always fetch fresh full details
  const { project: fullProject, isLoading } = useProjectDetails(
    open && initialProject ? initialProject.id! : null,
  );

  const displayProject = fullProject || (initialProject as ProjectV2); // Fallback to initial for header if loading

  const { data: projectChecklist } = useQuery({
    queryKey: ["project-commercial-checklist", displayProject?.id],
    queryFn: async () => {
      if (!displayProject?.id) return null;
      const { data, error } = await supabase
        .from("commercial_checklists" as any)
        .select("*")
        .eq("project_id", displayProject.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!displayProject?.id && open,
  });

  const { data: projectDeploymentForm } = useQuery({
    queryKey: ["project-deployment-form", displayProject?.ticketNumber],
    queryFn: async () => {
      if (!displayProject?.ticketNumber) return null;
      const { data, error } = await supabase
        .from("deployment_forms" as any)
        .select("*")
        .eq("ticket_number", displayProject.ticketNumber)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!displayProject?.ticketNumber && open,
  });

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
          <div className="flex flex-col gap-1 w-full mr-12">
            <div className="flex items-center flex-wrap gap-2">
              {isLoading ? (
                <DialogTitle>
                  <Skeleton className="h-8 w-64" />
                </DialogTitle>
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
          
          <div className="flex items-center gap-2.5 absolute right-12 top-4">
            {displayProject?.id && (
              <>
                <ChecklistStatusButton
                  projectId={displayProject.id}
                  checklist={projectChecklist}
                  onCloseModal={() => onOpenChange(false)}
                />
                <DeploymentFormStatusButton
                  projectId={displayProject.id}
                  deploymentForm={projectDeploymentForm}
                  onCloseModal={() => onOpenChange(false)}
                />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (displayProject?.id) {
                  navigate(`/projects/${displayProject.id}`);
                  onOpenChange(false);
                }
              }}
              title="Tela Cheia"
            >
              <Maximize2 className="h-4.5 w-4.5" />
            </Button>
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
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setIsEditing(false);
            }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 border-b bg-muted/30">
              <TabsList className="h-12 bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="general"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
                >
                  Informações Gerais
                </TabsTrigger>
                {fullProject && (fullProject.TituloChamado || fullProject.descricaotramite || fullProject.ResponsavelAtividade || fullProject.EtapasProjeto) && (
                  <TabsTrigger
                    value="chamado_0800"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-600 text-rose-500/80 font-medium data-[state=active]:bg-transparent px-2 flex items-center gap-1.5 transition-colors"
                  >
                    Chamado 0800
                  </TabsTrigger>
                )}
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
                  {canEditProjects && (
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
                  )}
                </div>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-background">
              {isEditing && fullProject ? (
                <EditProjectTab project={fullProject} onUpdate={onUpdate} />
              ) : fullProject ? (
                <>
                  <TabsContent value="general" className="m-0 h-full">
                    <GeneralInfoTab 
                      project={fullProject} 
                      onUpdate={onUpdate} 
                      onStageClick={(id) => {
                        setActiveStepId(id);
                        setActiveTab("steps");
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="steps" className="m-0 h-full">
                    <StepsTab 
                      project={fullProject} 
                      onUpdate={onUpdate} 
                      activeStepId={activeStepId}
                      onStepClick={(id) => setActiveStepId(id)}
                    />
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
                  {fullProject && (fullProject.TituloChamado || fullProject.descricaotramite || fullProject.ResponsavelAtividade || fullProject.EtapasProjeto) && (
                    <TabsContent value="chamado_0800" className="m-0 h-full">
                      <Chamado0800Tab project={fullProject} />
                    </TabsContent>
                  )}
                </>
              ) : null}
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChecklistStatusButton({
  projectId,
  checklist,
  onCloseModal,
}: {
  projectId: string;
  checklist: any;
  onCloseModal: () => void;
}) {
  const navigate = useNavigate();

  // If no checklist exists
  if (!checklist) {
    return (
      <Badge
        variant="outline"
        className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1.5 cursor-help shrink-0 animate-border-blink-orange"
        title="Checklist de implantação ainda não foi gerado pelo comercial."
      >
        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        Checklist: Não Criado
      </Badge>
    );
  }

  // If checklist is pending (sent, awaiting response)
  if (checklist.status === "pending") {
    return (
      <Badge
        variant="outline"
        className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1.5 cursor-help shrink-0 animate-border-blink-blue"
        title="Link de checklist enviado. Aguardando respostas do cliente."
      >
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        Checklist: Enviado
      </Badge>
    );
  }

  // If checklist is submitted (answered)
  if (checklist.status === "submitted") {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/20 transition-colors shadow-sm shrink-0"
        title="Checklist respondido pelo cliente! Clique para ver as respostas."
        onClick={() => {
          navigate(`/commercial/checklists?view=${checklist.id}`);
          onCloseModal();
        }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Checklist: Respondido
      </Badge>
    );
  }

  return null;
}

function DeploymentFormStatusButton({
  projectId,
  deploymentForm,
  onCloseModal,
}: {
  projectId: string;
  deploymentForm: any;
  onCloseModal: () => void;
}) {
  const navigate = useNavigate();

  // If no deployment form exists
  if (!deploymentForm) {
    return (
      <Badge
        variant="outline"
        className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1.5 cursor-help shrink-0 animate-border-blink-orange"
        title="Formulário de Nova Implantação pendente (não criado)."
      >
        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        Form: Pendente
      </Badge>
    );
  }

  // If deployment form is preenchido/salvo
  return (
    <Badge
      variant="outline"
      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/20 transition-colors shadow-sm shrink-0"
      title="Formulário preenchido! Clique para ver as informações."
      onClick={() => {
        navigate(`/commercial/deployment-forms?view=${deploymentForm.id}`);
        onCloseModal();
      }}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Form: Preenchido
    </Badge>
  );
}
