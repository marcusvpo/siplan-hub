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
import { PosImplantacaoTab } from "./Tabs/PosImplantacaoTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, X, Maximize2, ClipboardList, PlayCircle, CheckCircle2, Calendar, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PosSaudeBadge } from "@/components/ProjectManagement/PosSaudeBadge";
import { cn } from "@/lib/utils";

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

  const isModelosTN = displayProject?.systemType === "Modelos TN";

  const isImplementationInProgress =
    !isModelosTN && displayProject?.stages?.implementation?.status === "in-progress";
  const isConfirmed =
    !isModelosTN && !!displayProject?.stages?.implementation?.phase1?.isConfirmed;
  const phase1 = displayProject?.stages?.implementation?.phase1;
  const startDate = phase1?.startDate || displayProject?.stages?.implementation?.startDate;
  const endDate = phase1?.endDate || displayProject?.stages?.implementation?.endDate;
  const hasForecastDates = Boolean(startDate && endDate);

  const isForecastScheduled =
    !isModelosTN && !isImplementationInProgress && !isConfirmed && hasForecastDates;
  const hasTopLeftTag =
    !isModelosTN && (isImplementationInProgress || isConfirmed || isForecastScheduled);

  const isFromAutomacao = Boolean(
    displayProject?.TituloChamado || 
    displayProject?.descricaotramite || 
    displayProject?.ResponsavelAtividade || 
    displayProject?.EtapasProjeto
  );

  const getGlobalStatusBadge = (status?: ProjectV2["globalStatus"]) => {
    switch (status) {
      case "done":
        return {
          label: "Finalizado",
          className: "bg-slate-700 hover:bg-slate-800 text-white border-slate-800",
        };
      case "blocked":
        return {
          label: "Pausado",
          className: "bg-amber-500 hover:bg-amber-600 text-white border-amber-600",
        };
      default: {
        let colorClass = "bg-[#0dcaf0] hover:bg-[#0bb5d8] text-white border-[#0dcaf0] font-extrabold shadow-[#0dcaf0]/20";
        if (isImplementationInProgress) {
          colorClass = "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-500/20";
        } else if (isConfirmed) {
          colorClass = "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-500/20";
        } else if (isForecastScheduled) {
          colorClass = "bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 text-white border-slate-600 shadow-slate-600/20";
        }
        return {
          label: "Projeto Ativo",
          className: colorClass,
        };
      }
    }
  };

  const globalStatusBadge = getGlobalStatusBadge(displayProject?.globalStatus);

  const { data: projectChecklist } = useQuery({
    queryKey: ["project-commercial-checklist", displayProject?.id],
    queryFn: async () => {
      if (!displayProject?.id) return null;
      const { data, error } = await supabase
        .from("commercial_checklists" as never)
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
        .from("deployment_forms" as never)
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
      <DialogContent data-testid="project-details-modal" className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-full flex-col gap-0 overflow-hidden p-0 sm:h-[90vh] sm:max-h-[90vh] sm:w-[90vw] sm:overflow-visible">
        {/* Top Left Tag - Floating over top border */}
        {hasTopLeftTag && (
          <div className="absolute -top-2.5 left-4 z-50 hidden sm:block">
            {isImplementationInProgress ? (
              <Badge className="text-[10px] px-2.5 py-0.5 font-bold shadow-lg border-2 border-background bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 flex items-center gap-1 w-fit">
                <PlayCircle className="w-3 h-3" />
                Implantação em Andamento
              </Badge>
            ) : isConfirmed ? (
              <Badge className="text-[10px] px-2.5 py-0.5 font-bold shadow-lg border-2 border-background bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 flex items-center gap-1 w-fit">
                <CheckCircle2 className="w-3 h-3" />
                Implantação Confirmada
              </Badge>
            ) : (
              <Badge className="text-[10px] px-2.5 py-0.5 font-bold shadow-lg border-2 border-background bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white shadow-slate-600/20 flex items-center gap-1 w-fit">
                <Calendar className="w-3 h-3 text-slate-200" />
                Previsão Agendada
              </Badge>
            )}
          </div>
        )}

        {/* Top Right Badges - Floating over top-right border */}
        <div className="absolute -top-2.5 right-12 z-50 hidden items-center gap-1.5 sm:flex">
          {displayProject?.id && <PosSaudeBadge projectId={displayProject.id} />}
          {isFromAutomacao && (
            <Badge className="text-[10px] px-2.5 py-0.5 font-bold shadow-lg border-2 border-background bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20">
              Autom. N8N
            </Badge>
          )}
          <Badge
            className={cn(
              "text-[10px] px-2.5 py-0.5 font-bold shadow-lg border-2 border-background",
              globalStatusBadge.className,
            )}
          >
            {globalStatusBadge.label}
          </Badge>
        </div>

        <DialogHeader className={cn("flex shrink-0 flex-col items-stretch gap-2 border-b px-3 py-3 text-left sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5", hasTopLeftTag && "sm:pt-6.5")}>
          <div className="flex flex-wrap items-center gap-1.5 pr-8 sm:hidden">
            {hasTopLeftTag && (
              <Badge className={cn(
                "flex w-fit items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-white",
                isImplementationInProgress
                  ? "bg-blue-600 hover:bg-blue-700"
                  : isConfirmed
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-600 hover:bg-slate-700",
              )}>
                {isImplementationInProgress ? <PlayCircle className="h-3 w-3" /> : isConfirmed ? <CheckCircle2 className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {isImplementationInProgress ? "Implantação em andamento" : isConfirmed ? "Implantação confirmada" : "Previsão agendada"}
              </Badge>
            )}
            {displayProject?.id && <PosSaudeBadge projectId={displayProject.id} />}
            {isFromAutomacao && (
              <Badge className="bg-purple-600 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-purple-700">Autom. N8N</Badge>
            )}
            <Badge className={cn("px-2 py-0.5 text-[9px] font-bold", globalStatusBadge.className)}>
              {globalStatusBadge.label}
            </Badge>
          </div>
          <div className={cn("flex flex-col gap-1 min-w-0 flex-1", hasTopLeftTag && "mt-1")}>
            {isLoading ? (
              <DialogTitle>
                <Skeleton className="h-6 w-48 sm:w-64" />
              </DialogTitle>
            ) : (
              <DialogTitle className="break-words pr-8 text-base font-bold leading-snug text-foreground sm:pr-0 sm:text-lg">
                {displayProject?.clientName}
              </DialogTitle>
            )}

            {!isLoading && (
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs mt-1">
                <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                  #{displayProject?.ticketNumber || "..."}
                </span>

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
                    className="border-slate-300 dark:border-slate-800 text-xs shadow-sm"
                  >
                    {product}
                  </Badge>
                ))}

                {displayProject?.relatedTickets &&
                  displayProject.relatedTickets.length > 0 && (
                    <div className="hidden md:block h-3.5 w-px bg-border mx-0.5" />
                  )}

                {displayProject?.relatedTickets?.map((ticket, index) => (
                  <span
                    key={index}
                    className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/50"
                  >
                    <span className="font-medium uppercase opacity-70">
                      {ticket.name}:
                    </span>
                    <span className="font-semibold">{ticket.number}</span>
                  </span>
                ))}
              </div>
            )}
            <DialogDescription className="text-[11px] text-muted-foreground">
              Detalhes e gerenciamento do projeto.
            </DialogDescription>
          </div>
          
          <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:mr-8 sm:mt-0 sm:w-auto sm:gap-2">
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
                  checklistId={projectChecklist?.id}
                  onCloseModal={() => onOpenChange(false)}
                />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground sm:ml-0"
              onClick={() => {
                if (displayProject?.id) {
                  navigate(`/projects/${displayProject.id}`);
                  onOpenChange(false);
                }
              }}
              title="Tela Cheia"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:space-y-8 sm:p-6">
            {/* Skeleton Loading Improved containing the form structure */}
            <div className="w-full h-32 bg-muted/20 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-6">
              <div className="space-y-3 sm:col-span-5 sm:space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              </div>
              <div className="sm:col-span-4">
                <Skeleton className="h-full rounded-2xl" />
              </div>
              <div className="sm:col-span-3">
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
            <div className="flex items-center gap-2 border-b bg-muted/30 p-2 sm:hidden">
              <select
                aria-label="Seção do projeto"
                value={activeTab}
                onChange={(event) => {
                  setActiveTab(event.target.value);
                  setIsEditing(false);
                }}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="general">Informações gerais</option>
                {isFromAutomacao && <option value="chamado_0800">Chamado 0800</option>}
                <option value="steps">Etapas</option>
                <option value="files">Arquivos</option>
                <option value="logs">Logs</option>
                <option value="roadmap">Roadmap</option>
                <option value="pos_analysis">Análise pós-implantação</option>
              </select>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Abrir transição do projeto"
                onClick={() => {
                  if (displayProject?.id) {
                    navigate(`/implantadores/transicao?project=${displayProject.id}`);
                    onOpenChange(false);
                  }
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              {canEditProjects && (
                <Button
                  variant={isEditing ? "secondary" : "outline"}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label={isEditing ? "Fechar edição" : "Editar projeto"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <div className="hidden overflow-x-auto border-b bg-muted/30 px-6 scrollbar-none sm:block">
              <TabsList className="h-12 bg-transparent p-0 gap-6 min-w-max flex-nowrap">
                <TabsTrigger
                  value="general"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 data-[state=active]:text-foreground transition-all duration-200"
                >
                  Informações Gerais
                </TabsTrigger>
                {fullProject && (fullProject.TituloChamado || fullProject.descricaotramite || fullProject.ResponsavelAtividade || fullProject.EtapasProjeto) && (
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
                <TabsTrigger
                  value="pos_analysis"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 data-[state=active]:text-foreground transition-all duration-200 whitespace-nowrap"
                >
                  Análise Pós-Implantação
                </TabsTrigger>
                <button
                  type="button"
                  onClick={() => {
                    if (displayProject?.id) {
                      navigate(`/implantadores/transicao?project=${displayProject.id}`);
                      onOpenChange(false);
                    }
                  }}
                  className="h-full rounded-none border-b-2 border-transparent px-2 text-muted-foreground hover:text-primary/80 hover:border-border/50 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap text-sm font-medium"
                  title="Abrir a Transição (DTC) deste projeto"
                >
                  Transição
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
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

            <div className="min-w-0 flex-1 overflow-y-auto bg-background p-3 sm:p-6">
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
                  <TabsContent value="pos_analysis" className="m-0 h-full">
                    <PosImplantacaoTab project={fullProject} />
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
  checklist: { id: string; status: string } | null | undefined;
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
  checklistId,
  onCloseModal,
}: {
  projectId: string;
  deploymentForm: { id: string } | null | undefined;
  checklistId: string | null | undefined;
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
        if (checklistId) {
          navigate(`/commercial/checklists?view=${checklistId}&tab=commercial`);
        } else {
          navigate(`/commercial/checklists`);
        }
        onCloseModal();
      }}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Form: Preenchido
    </Badge>
  );
}
