import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, FileText, Trash2, Copy, CheckCircle2,
  Building2, User, Clock, Eye, ClipboardCheck, ExternalLink, ShieldCheck,
  ChevronsUpDown, Check, Settings, ArrowLeft, AlertTriangle, HelpCircle,
  Calendar, Phone, Wrench, Info, Zap, Download,
  Filter, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useCommercialChecklists, type CommercialChecklistRecord } from "@/hooks/useCommercialChecklists";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";
import { useAuth } from "@/hooks/useAuth";
import { useDeploymentForms, type DeploymentFormRecord } from "@/hooks/useDeploymentForms";
import { DeploymentFormFields } from "@/components/commercial/DeploymentFormFields";
import { generateDeploymentTemplate, type DeploymentFormData } from "@/utils/deployment-template";
import { useIsMobile } from "@/hooks/use-mobile";

const EMPTY_FORM: DeploymentFormData = {
  client_name: "",
  ticket_number: "",
  contracted_system: "",
  urgency_level: "normal",
  module_lcw: false,
  module_on_hand: false,
  module_sga: false,
  module_editor_modelos: false,
  module_website: false,
  module_other: false,
};

const SYSTEMS = ["Orion TN", "Orion PRO", "Orion REG", "WEB RI", "Outro"];

const URGENCY_CONFIG = {
  critical: { label: "Crítica", variant: "destructive" as const, icon: "🔴" },
  high: { label: "Alta", variant: "default" as const, icon: "🟡" },
  normal: { label: "Normal", variant: "secondary" as const, icon: "🟢" },
};

function validateForm(data: DeploymentFormData): Set<string> {
  const e = new Set<string>();
  const req = (key: string, val?: string) => { if (!val?.trim()) e.add(key); };
  const reqBool = (key: string, val?: boolean) => { if (val === undefined || val === null) e.add(key); };

  // Identificação
  req("client_name", data.client_name);
  req("contracted_system", data.contracted_system);

  // Dados Administrativos
  req("op_number", data.op_number);
  req("sales_order_number", data.sales_order_number);
  req("order_date", data.order_date);
  req("docusign_contract_number", data.docusign_contract_number);

  // Escopo
  req("modality", data.modality);
  req("hours_presencial", data.hours_presencial);
  const hasRemote = data.modality === "Remoto" || data.modality === "Misto";
  if (hasRemote) req("hours_remote", data.hours_remote);
  reqBool("travel_paid_by_client", data.travel_paid_by_client);
  reqBool("accommodation_paid_by_client", data.accommodation_paid_by_client);

  // Perfil
  req("deployment_type", data.deployment_type);
  req("legacy_system", data.legacy_system);

  // Editor de Modelos (apenas Orion TN)
  if (data.contracted_system === "Orion TN") {
    req("editor_status", data.editor_status);
    if (data.editor_status === "contracted") {
      req("editor_send_status", data.editor_send_status);
    }
  }

  // Urgência
  req("urgency_level", data.urgency_level);
  req("filled_by", data.filled_by);

  return e;
}

export default function CommercialChecklists() {
  const { checklists, isLoading: isLoadingChecklists, createChecklist, deleteChecklist } = useCommercialChecklists();
  const { forms, isLoading: isLoadingForms, createForm, updateForm } = useDeploymentForms();
  const { projects, isLoading: isLoadingProjects, updateProject } = useProjectsV2();
  const { hasPermission } = usePermissions();
  const { fullName } = useAuth();
  const { toast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const itemsPerPage = selectedPageSize ?? (isMobile ? 3 : 9);
  const [mode, setMode] = useState<"list" | "create">("list");
  
  // Create workflow states
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [formData, setFormData] = useState<DeploymentFormData>({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [lastUserSync, setLastUserSync] = useState("");

  // Details Modal states
  const [viewChecklist, setViewChecklist] = useState<CommercialChecklistRecord | null>(null);
  const [activeTab, setActiveTab] = useState("client");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditingCommercialForm, setIsEditingCommercialForm] = useState(false);
  const [editFormData, setEditFormData] = useState<DeploymentFormData | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Set<string>>(new Set());
  const [editSubmitted, setEditSubmitted] = useState(false);

  // Search parameters processing
  const viewParam = searchParams.get("view");
  const tabParam = searchParams.get("tab");

  // Sync open view checklist based on view parameter
  useEffect(() => {
    if (viewParam && checklists.length > 0) {
      const found = checklists.find(c => c.id === viewParam);
      if (found) {
        setViewChecklist(found);
        setIsEditingCommercialForm(false);
        setEditFormData(null);
        setEditSubmitted(false);
      }
    }
  }, [viewParam, checklists]);

  // Sync active tab state based on tab parameter
  useEffect(() => {
    if (tabParam === "commercial") {
      setActiveTab("commercial");
    } else {
      setActiveTab("client");
    }
  }, [tabParam]);

  // Sync current user name once available during creation
  useEffect(() => {
    if (mode === "create" && fullName && fullName !== lastUserSync && !formData.filled_by) {
      setFormData(prev => ({ ...prev, filled_by: fullName }));
      setLastUserSync(fullName);
    }
  }, [fullName, mode, formData.filled_by, lastUserSync]);

  // Query the template associated with the viewChecklist
  const { data: viewTemplate, isLoading: isLoadingViewTemplate } = useQuery({
    queryKey: ["viewChecklistTemplate", viewChecklist?.template_id],
    queryFn: async () => {
      if (!viewChecklist?.template_id) return null;
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("id", viewChecklist.template_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!viewChecklist?.template_id,
  });

  const handleOpenView = (checklist: CommercialChecklistRecord, tab: string = "client") => {
    setViewChecklist(checklist);
    setIsEditingCommercialForm(false);
    setEditFormData(null);
    setEditSubmitted(false);
    setSearchParams({ view: checklist.id, tab });
  };

  const handleCloseView = () => {
    setViewChecklist(null);
    setIsEditingCommercialForm(false);
    setEditFormData(null);
    setSearchParams({});
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (viewChecklist) {
      setSearchParams({ view: viewChecklist.id, tab: val });
    }
  };

  // Filter projects: in-progress, not post stage done/in-progress, and has no checklist yet
  const checklistsProjectIds = new Set(checklists.map(c => c.project_id));
  const eligibleProjects = projects.filter(
    (proj) =>
      proj.globalStatus === "in-progress" &&
      proj.stages?.post?.status !== "done" &&
      proj.stages?.post?.status !== "in-progress" &&
      !checklistsProjectIds.has(proj.id)
  );

  const handleStartCreate = () => {
    if (!hasPermission("commercial_checklists", "create")) return;
    setFormData({ ...EMPTY_FORM, filled_by: fullName || "" });
    setSelectedProjectId("");
    setFieldErrors(new Set());
    setSubmitted(false);
    setMode("create");
  };

  const handleSaveAndGenerate = () => {
    if (!selectedProjectId) {
      toast({ title: "Erro", description: "Por favor, selecione um projeto ativo para vincular.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    const errors = validateForm(formData);
    setFieldErrors(errors);

    if (errors.size > 0) {
      toast({
        title: `${errors.size} campo(s) obrigatório(s) pendente(s)`,
        description: "Por favor, revise as perguntas marcadas em vermelho.",
        variant: "destructive",
      });
      setTimeout(() => {
        document.querySelector("[data-field-error]")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    // 1. Create the deployment form
    createForm.mutate(formData, {
      onSuccess: () => {
        // Sync values back to project table
        const activeProj = eligibleProjects.find((p) => p.id === selectedProjectId);
        if (activeProj) {
          const presencialHours = formData.hours_presencial ? parseFloat(formData.hours_presencial) : undefined;
          const updatedSoldHours = presencialHours !== undefined && !isNaN(presencialHours) ? presencialHours : activeProj.soldHours;

          const updatedProducts = [...(activeProj.products || [])];
          const formProducts: string[] = [];
          if (formData.module_lcw) formProducts.push("LCW");
          if (formData.module_sga) formProducts.push("SGA");
          if (formData.module_on_hand) formProducts.push("On Hand");
          if (formData.module_website) formProducts.push("Website");
          if (formData.module_editor_modelos) formProducts.push("Editor de Modelos");
          if (formData.module_other && formData.module_other_name) {
            formProducts.push(formData.module_other_name);
          }

          formProducts.forEach((prod) => {
            if (!updatedProducts.includes(prod)) updatedProducts.push(prod);
          });

          const updatedLegacySystem = formData.legacy_system || activeProj.legacySystem || "";

          updateProject.mutate({
            projectId: selectedProjectId,
            updates: {
              soldHours: updatedSoldHours,
              products: updatedProducts,
              legacySystem: updatedLegacySystem,
            },
          });
        }

        // 2. Create the checklist record
        createChecklist.mutate(selectedProjectId, {
          onSuccess: () => {
            setMode("list");
            setSelectedProjectId("");
            toast({
              title: "Sucesso!",
              description: "Formulário de implantação preenchido e checklist do cliente liberado.",
            });
          }
        });
      }
    });
  };

  const handleUpdateCommercialForm = (formId: string | null) => {
    if (!editFormData) return;
    setEditSubmitted(true);
    const errors = validateForm(editFormData);
    setEditFieldErrors(errors);

    if (errors.size > 0) {
      toast({
        title: "Campos pendentes",
        description: "Preencha todos os campos obrigatórios em vermelho.",
        variant: "destructive",
      });
      return;
    }

    if (formId) {
      // Update existing form
      updateForm.mutate({ id: formId, formData: editFormData }, {
        onSuccess: () => {
          setIsEditingCommercialForm(false);
          setEditFormData(null);
          setEditSubmitted(false);
          syncProjectData(viewChecklist?.project_id, editFormData);
        }
      });
    } else {
      // Create form if it somehow didn't exist
      createForm.mutate(editFormData, {
        onSuccess: () => {
          setIsEditingCommercialForm(false);
          setEditFormData(null);
          setEditSubmitted(false);
          syncProjectData(viewChecklist?.project_id, editFormData);
        }
      });
    }
  };

  const syncProjectData = (projId: string | undefined, data: DeploymentFormData) => {
    if (!projId) return;
    const activeProj = projects.find(p => p.id === projId);
    if (activeProj) {
      const presencialHours = data.hours_presencial ? parseFloat(data.hours_presencial) : undefined;
      const updatedSoldHours = presencialHours !== undefined && !isNaN(presencialHours) ? presencialHours : activeProj.soldHours;

      const updatedProducts = [...(activeProj.products || [])];
      const formProducts: string[] = [];
      if (data.module_lcw) formProducts.push("LCW");
      if (data.module_sga) formProducts.push("SGA");
      if (data.module_on_hand) formProducts.push("On Hand");
      if (data.module_website) formProducts.push("Website");
      if (data.module_editor_modelos) formProducts.push("Editor de Modelos");
      if (data.module_other && data.module_other_name) {
        formProducts.push(data.module_other_name);
      }

      formProducts.forEach((prod) => {
        if (!updatedProducts.includes(prod)) updatedProducts.push(prod);
      });

      const updatedLegacySystem = data.legacy_system || activeProj.legacySystem || "";

      updateProject.mutate({
        projectId: projId,
        updates: {
          soldHours: updatedSoldHours,
          products: updatedProducts,
          legacySystem: updatedLegacySystem,
        },
      });
    }
  };

  const handleCopyLink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/public/checklist/${id}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast({ title: "Link Copiado", description: "O link do checklist foi copiado para a área de transferência." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyTramite = async (form: DeploymentFormData) => {
    const text = generateDeploymentTemplate(form);
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Texto do trâmite de passagem copiado para a área de transferência." });
  };

  const handleDelete = (id: string, ticketNumber: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPermission("commercial_checklists", "delete")) return;
    if (confirm("Excluir este checklist permanentemente? O cliente não poderá mais respondê-lo.")) {
      // Find and delete matching deployment form if exists
      const matchedForm = forms.find(f => f.ticket_number === ticketNumber);
      if (matchedForm) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.from("deployment_forms" as any).delete().eq("id", matchedForm.id).then(() => {
          deleteChecklist.mutate(id);
        });
      } else {
        deleteChecklist.mutate(id);
      }
    }
  };

  const filteredChecklists = checklists.filter((item) => {
    const query = search.toLowerCase();
    const clientName = item.projects?.clientName?.toLowerCase() || "";
    const systemType = item.projects?.systemType?.toLowerCase() || "";
    const ticketNumber = item.projects?.ticketNumber?.toLowerCase() || "";
    const createdBy = item.created_by_name?.toLowerCase() || "";
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesStatus && (
      clientName.includes(query) ||
      systemType.includes(query) ||
      ticketNumber.includes(query) ||
      createdBy.includes(query)
    );
  });

  const canCreateChecklists = hasPermission("commercial_checklists", "create");
  const canDeleteChecklists = hasPermission("commercial_checklists", "delete");
  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";
  const totalPages = Math.max(1, Math.ceil(filteredChecklists.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedChecklists = filteredChecklists.slice(startIndex, startIndex + itemsPerPage);
  const firstVisibleItem = filteredChecklists.length === 0 ? 0 : startIndex + 1;
  const lastVisibleItem = Math.min(startIndex + itemsPerPage, filteredChecklists.length);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  /* ── CREATE VIEW (FORMULÁRIO DE NEGOCIAÇÃO) ── */
  if (mode === "create") {
    return (
      <div
        className="min-w-0 space-y-4 overflow-x-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
        data-testid="commercial-checklist-create-page"
      >
        {/* Header bar */}
        <div className="sticky top-0 z-10 -mx-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 border-b bg-background/95 px-1 pb-3 backdrop-blur sm:flex sm:items-center">
          <Button variant="ghost" size="icon" onClick={() => setMode("list")} className="h-9 w-9 shrink-0" aria-label="Voltar para checklists">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="break-words text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">
              Passo 1: Formulário Comercial de Nova Implantação
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Preencha os dados da negociação para liberar o checklist ao cliente.</p>
          </div>
          <div className="col-span-2 grid w-full shrink-0 grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setMode("list")} className="w-full sm:w-auto">Cancelar</Button>
            <Button
              size="sm"
              onClick={handleSaveAndGenerate}
              disabled={createForm.isPending || createChecklist.isPending}
              className="h-auto min-h-9 w-full gap-1.5 whitespace-normal bg-indigo-600 text-xs leading-snug shadow-md hover:bg-indigo-700 sm:w-auto"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {createForm.isPending || createChecklist.isPending ? "Processando..." : "Salvar e Liberar Link"}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            <strong>Instrução Comercial:</strong> O preenchimento das informações abaixo é <strong>obrigatório</strong> antes de disponibilizar o checklist técnico ao cliente. Essas respostas serão gravadas e integradas diretamente na timeline do projeto.
          </p>
        </div>

        {/* Project Selector */}
        <Card className={`min-w-0 border-2 transition-colors ${fieldErrors.has("client_name") || fieldErrors.has("contracted_system") ? "border-red-400" : "border-transparent"} bg-gradient-to-br from-indigo-50/40 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/20`}>
          <CardContent className="min-w-0 space-y-4 p-3 sm:p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Identificação do Projeto</p>

            <div className="space-y-1.5 flex flex-col max-w-3xl">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Vincular a um Projeto Ativo *</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="h-auto min-h-10 w-full min-w-0 justify-between whitespace-normal border-muted-foreground/30 bg-background py-2 pr-3 text-left font-normal"
                  >
                    {selectedProjectId ? (
                      (() => {
                        const proj = eligibleProjects.find((p) => p.id === selectedProjectId);
                        return proj ? `${proj.clientName} (#${proj.ticketNumber} - ${proj.systemType})` : "Selecione o projeto...";
                      })()
                    ) : (
                      "Selecione o projeto em andamento..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-0 max-w-[calc(100vw-1.5rem)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar projeto..." />
                    <CommandList className="max-h-60 overflow-y-auto">
                      <CommandEmpty>Nenhum projeto qualificado sem checklist encontrado.</CommandEmpty>
                      <CommandGroup>
                        {eligibleProjects.map((proj) => (
                          <CommandItem
                            key={proj.id}
                            value={`${proj.clientName} ${proj.ticketNumber} ${proj.systemType}`}
                            onSelect={() => {
                              setSelectedProjectId(proj.id);
                              setComboboxOpen(false);
                              setFormData({
                                ...formData,
                                client_name: proj.clientName,
                                ticket_number: proj.ticketNumber || "",
                                contracted_system: proj.systemType || "",
                                filled_by: fullName || "",
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedProjectId === proj.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0 pr-2 py-0.5">
                              <span className="font-semibold text-sm whitespace-normal leading-snug">{proj.clientName}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                #{proj.ticketNumber} • {proj.systemType}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedProjectId && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-950/40">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">Cliente</span>
                  <span className="break-words text-sm font-semibold">{formData.client_name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">N.º do Chamado</span>
                  <span className="break-all text-sm font-semibold font-mono">#{formData.ticket_number || "—"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">Sistema Principal</span>
                  <span className="break-words text-sm font-semibold">{formData.contracted_system}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProjectId ? (
          <div className="space-y-4">
            <DeploymentFormFields data={formData} onChange={setFormData} errors={fieldErrors} />
            <div className="grid grid-cols-1 gap-2 border-t pb-10 pt-3 sm:flex sm:justify-end">
              <Button variant="outline" onClick={() => setMode("list")} className="w-full sm:w-auto">Cancelar</Button>
              <Button
                onClick={handleSaveAndGenerate}
                disabled={createForm.isPending || createChecklist.isPending}
                className="h-auto min-h-10 w-full gap-2 whitespace-normal bg-indigo-600 leading-snug hover:bg-indigo-700 sm:w-auto"
              >
                <ClipboardCheck className="h-4 w-4" />
                {createForm.isPending || createChecklist.isPending ? "Processando..." : "Salvar e Liberar Checklist"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-[200px] min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 p-4 text-center sm:p-8">
            <Building2 className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm text-muted-foreground">Por favor, selecione um projeto ativo no campo acima para carregar o formulário.</p>
          </div>
        )}
      </div>
    );
  }

  /* ── LIST VIEW ── */
  return (
    <div
      className="flex min-w-0 flex-col gap-4 overflow-x-hidden animate-in fade-in duration-500 md:h-[calc(100vh-6rem)] md:gap-5"
      data-testid="commercial-checklists-page"
    >
      {/* Header */}
      <div className="flex min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-xl font-extrabold leading-tight tracking-tight text-transparent sm:text-2xl">
            Checklists de Implantação
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Gerencie os formulários de passagem do Comercial e os checklists estruturais dos clientes</p>
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate("/commercial/checklists/questions")}
            className="h-auto min-h-10 w-full gap-2 whitespace-normal border-muted-foreground/30 bg-card text-xs leading-snug sm:w-auto sm:text-sm"
          >
            <Settings className="h-4 w-4" />
            Editar Perguntas
          </Button>
          {canCreateChecklists && (
            <Button onClick={handleStartCreate} className="h-auto min-h-10 w-full gap-2 whitespace-normal bg-indigo-600 text-xs leading-snug shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 sm:w-auto sm:text-sm">
              <Plus className="h-4 w-4" />
              Novo Checklist
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {checklists.length > 0 && (
        <div className="grid min-w-0 shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" data-testid="commercial-checklists-stats">
          {[
            { label: "Total", value: checklists.length, icon: FileText, color: "text-indigo-500" },
            { label: "Aguardando Resposta", value: checklists.filter(c => c.status === "pending").length, icon: Clock, color: "text-amber-500" },
            { label: "Respondidos", value: checklists.filter(c => c.status === "submitted").length, icon: CheckCircle2, color: "text-emerald-500" },
          ].map(stat => (
            <div key={stat.label} className="flex min-w-0 items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm shadow-sm sm:px-3">
              <stat.icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
              <span className="font-bold">{stat.value}</span>
              <span className="min-w-0 break-words text-[11px] leading-tight text-muted-foreground sm:text-xs">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="min-w-0 shrink-0 rounded-xl border bg-muted/20 p-3 sm:p-4" data-testid="commercial-checklists-filters">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>Filtros dos checklists</span>
          </div>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 px-2 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, sistema, chamado ou quem criou..."
              aria-label="Buscar checklist"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 min-w-0 bg-card/60 pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full min-w-0 bg-background" aria-label="Filtrar checklists por status">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Aguardando resposta</SelectItem>
              <SelectItem value="submitted">Respondidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List content */}
      <div className="min-w-0 md:-mr-1 md:flex-1 md:overflow-y-auto md:pr-1">
        {isLoadingChecklists || isLoadingProjects || isLoadingForms ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
              <p className="text-sm text-muted-foreground">Carregando checklists e formulários...</p>
            </div>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div className="flex h-[280px] min-w-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 p-4 text-center sm:p-8" data-testid="commercial-checklists-empty-state">
            <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/30 mb-4">
              <ClipboardCheck className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum checklist comercial encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              {search ? "Tente buscar por outro termo." : "Crie o primeiro checklist iniciando a negociação de implantação."}
            </p>
            {!search && canCreateChecklists && (
              <Button onClick={handleStartCreate} className="mt-4 bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Plus className="h-4 w-4" /> Criar primeiro checklist
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="commercial-checklists-list">
            {paginatedChecklists.map((item) => {
              const isSubmitted = item.status === "submitted";
              const matchedForm = forms.find(f => f.ticket_number === item.projects?.ticketNumber);
              return (
                <Card
                  key={item.id}
                  className="group min-w-0 cursor-pointer overflow-hidden border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:border-indigo-700"
                  onClick={() => handleOpenView(item, "client")}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenView(item, "client");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir checklist de ${item.projects?.clientName || "projeto removido"}`}
                  data-testid="commercial-checklist-card"
                >
                  <div className={`h-1.5 w-full ${isSubmitted ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <CardContent className="min-w-0 space-y-3 p-3.5 sm:p-4">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="min-w-0 break-words text-base font-bold leading-snug transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400" data-testid="commercial-checklist-client-name">
                          {item.projects?.clientName || "Projeto Removido"}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.projects?.systemType && (
                            <Badge variant="outline" className="h-auto max-w-full whitespace-normal break-words px-2 py-0.5 text-left text-[11px] leading-snug">{item.projects.systemType}</Badge>
                          )}
                          {item.projects?.ticketNumber && (
                            <Badge variant="secondary" className="h-auto max-w-full whitespace-normal break-all px-2 py-0.5 text-left font-mono text-[11px] leading-snug">#{item.projects.ticketNumber}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {matchedForm ? (
                            <Badge className="h-auto max-w-full whitespace-normal break-words border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-left text-[11px] leading-snug text-emerald-500">
                              Form Comercial: Preenchido
                            </Badge>
                          ) : (
                            <Badge className="h-auto max-w-full animate-pulse whitespace-normal break-words border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-left text-[11px] leading-snug text-orange-500">
                              Form Comercial: Pendente
                            </Badge>
                          )}

                          {isSubmitted ? (
                            <Badge className="h-auto max-w-full whitespace-normal break-words border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-left text-[11px] leading-snug text-emerald-500">
                              Checklist Cliente: Respondido
                            </Badge>
                          ) : (
                            <Badge className="h-auto max-w-full whitespace-normal break-words border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-left text-[11px] leading-snug text-blue-500">
                              Checklist Cliente: Enviado
                            </Badge>
                          )}
                        </div>
                      </div>
                      {canDeleteChecklists && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-red-500 opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 md:h-7 md:w-7 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 dark:hover:bg-red-950/30"
                          onClick={(e) => handleDelete(item.id, item.projects?.ticketNumber, e)}
                          aria-label={`Excluir checklist de ${item.projects?.clientName || "projeto removido"}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-2 border-t pt-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 break-words" title={item.created_by_name}>Criado por {item.created_by_name || "Não informado"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:justify-end">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>

                    <div className="mt-1 flex min-w-0 flex-wrap gap-2 border-t pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto min-h-9 min-w-[120px] flex-1 gap-1.5 whitespace-normal text-xs leading-snug hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={(e) => { e.stopPropagation(); handleOpenView(item, "commercial"); }}
                      >
                        <FileText className="h-3.5 w-3.5" /> Dados Comercial
                      </Button>
                      
                      {isSubmitted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto min-h-9 min-w-[120px] flex-1 gap-1.5 whitespace-normal text-xs leading-snug hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                          onClick={(e) => { e.stopPropagation(); handleOpenView(item, "client"); }}
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Respostas
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!matchedForm}
                            className="h-auto min-h-9 min-w-[110px] flex-1 gap-1.5 whitespace-normal text-xs leading-snug hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400"
                            onClick={(e) => handleCopyLink(item.id, e)}
                            title={!matchedForm ? "O formulário comercial deve estar preenchido para liberar o checklist." : "Copiar link de preenchimento do cliente"}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedId === item.id ? "Copiado!" : "Copiar Link"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!matchedForm}
                            className="h-8 w-8 px-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!matchedForm ? "Formulário comercial pendente." : "Acessar formulário do cliente"}
                            asChild
                          >
                            {matchedForm ? (
                              <a
                                href={`/public/checklist/${item.id}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </a>
                            ) : (
                              <div onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30" />
                              </div>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div
            className="mt-4 flex min-w-0 flex-col gap-3 border-t px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-2"
            data-testid="commercial-checklists-pagination"
          >
            <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              Mostrando{" "}
              <strong className="font-semibold text-foreground">
                {firstVisibleItem}–{lastVisibleItem}
              </strong>{" "}
              de{" "}
              <strong className="font-semibold text-foreground">
                {filteredChecklists.length}
              </strong>
            </p>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <span>Por página</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setSelectedPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[68px]" aria-label="Checklists por página">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="whitespace-nowrap text-xs font-medium sm:text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Dialog for viewing/editing checklist & deployment details */}
      {viewChecklist && (
        (() => {
          const matchedForm = forms.find(f => f.ticket_number === viewChecklist.projects?.ticketNumber);
          return (
            <Dialog open={!!viewChecklist} onOpenChange={(open) => { if (!open) handleCloseView(); }}>
              <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-4xl flex-col gap-0 overflow-hidden p-0" data-testid="commercial-checklist-dialog">
                <DialogHeader className="min-w-0 shrink-0 border-b bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 pb-3 pt-4 dark:from-slate-900 dark:to-slate-900/50 sm:px-6 sm:pt-5">
                  <div className="flex min-w-0 items-start justify-between pr-7">
                    <div className="min-w-0">
                      <DialogTitle className="flex min-w-0 items-start gap-2 text-base font-bold sm:text-lg">
                        <Building2 className="h-5 w-5 shrink-0 text-indigo-500" />
                        <span className="min-w-0 break-words">{viewChecklist.projects?.clientName || "Dados da Serventia"}</span>
                      </DialogTitle>
                      <DialogDescription className="mt-1 min-w-0 break-words text-left text-xs leading-relaxed text-muted-foreground">
                        ID: <span className="break-all rounded bg-muted px-1 font-mono text-[10px] select-all">{viewChecklist.id}</span>
                        {viewChecklist.projects?.ticketNumber && ` • Chamado: #${viewChecklist.projects.ticketNumber}`}
                        {viewChecklist.projects?.systemType && ` • Sistema: ${viewChecklist.projects.systemType}`}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="shrink-0 border-b bg-background px-3 sm:px-6">
                    <TabsList className="my-2 grid h-auto w-full min-w-0 grid-cols-2 sm:w-72">
                      <TabsTrigger value="client" className="h-auto min-h-9 min-w-0 whitespace-normal px-2 text-xs leading-snug">Checklist Cliente</TabsTrigger>
                      <TabsTrigger value="commercial" className="h-auto min-h-9 min-w-0 whitespace-normal px-2 text-xs leading-snug">Dados Comercial</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 break-words sm:p-6">
                    {/* CLIENT CHECKLIST TAB */}
                    <TabsContent value="client" className="space-y-6 mt-0 focus-visible:outline-none focus-visible:ring-0">
                      {viewChecklist.status === "pending" ? (
                        <div className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200 sm:p-8">
                          <Clock className="h-10 w-10 text-amber-500 animate-pulse mb-3" />
                          <h4 className="font-bold">Aguardando Resposta do Cliente</h4>
                          <p className="text-xs text-muted-foreground max-w-sm mt-1">
                            Este checklist foi gerado comercialmente, mas o cliente ainda não o respondeu. Envie o link abaixo:
                          </p>
                          {matchedForm ? (
                            <div className="mt-4 flex w-full min-w-0 max-w-full flex-col gap-2 rounded-lg border bg-background p-2 sm:flex-row sm:items-center">
                              <span className="min-w-0 flex-1 break-all text-left font-mono text-xs">{`${window.location.origin}/public/checklist/${viewChecklist.id}`}</span>
                              <Button size="sm" variant="secondary" className="h-9 w-full shrink-0 gap-1 sm:h-8 sm:w-auto" onClick={(e) => handleCopyLink(viewChecklist.id, e)}>
                                <Copy className="h-3 w-3" /> Copiar Link
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-4 flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg text-red-800 dark:text-red-200 text-xs">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>O formulário comercial está pendente. Preencha na aba ao lado para liberar o link do cliente.</span>
                            </div>
                          )}
                        </div>
                      ) : viewChecklist.template_id ? (
                        <div className="space-y-4">
                          <div className="bg-muted/30 rounded-xl p-4 border space-y-3">
                            <div className="flex items-center gap-2 border-b pb-2 mb-2">
                              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados de Identificação</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-xs text-muted-foreground block font-medium">Sistema a Implantar</span>
                                <span className="font-semibold">{viewChecklist.projects?.systemType || "Não cadastrado"}</span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block font-medium">Nome do Cartório</span>
                                <span className="font-semibold">{viewChecklist.projects?.clientName || "Não cadastrado"}</span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block font-medium">Criado por</span>
                                <span className="font-semibold">{viewChecklist.created_by_name || "Comercial"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-6">
                            {isLoadingViewTemplate || !viewTemplate ? (
                              <div className="flex flex-col items-center justify-center p-8 gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                                <span className="text-xs text-muted-foreground">Carregando perguntas dinâmicas...</span>
                              </div>
                            ) : (
                              <FormRenderer
                                projectId={viewChecklist.project_id}
                                schema={viewTemplate.schema_json}
                                uiSchema={viewTemplate.ui_json}
                                formData={viewChecklist.responses}
                                readonly={true}
                                onSubmit={() => {}}
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-muted/30 rounded-xl p-4 border space-y-3">
                            <div className="flex items-center gap-2 border-b pb-2 mb-2">
                              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados de Identificação</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-xs text-muted-foreground block font-medium">Sistema a Implantar</span>
                                <span className="font-semibold">{viewChecklist.projects?.systemType || "—"}</span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block font-medium">Nome do Cartório</span>
                                <span className="font-semibold">{viewChecklist.projects?.clientName || "—"}</span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground block font-medium">Responsável Siplan</span>
                                <span className="font-semibold">{viewChecklist.created_by_name || "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Fallback structured answers */}
                          <div className="space-y-4">
                            {/* RESPONSAVEL */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Responsável pelo Preenchimento</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Nome Completo</span>
                                  <span className="font-semibold text-foreground">{viewChecklist.responses.fullname || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Cargo/Função</span>
                                  <span className="font-semibold text-foreground">{viewChecklist.responses.role || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">E-mail</span>
                                  <span className="font-semibold text-foreground">{viewChecklist.responses.email || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Telefones/WhatsApp</span>
                                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                                    {Array.isArray(viewChecklist.responses.phones) && viewChecklist.responses.phones.length > 0 ? (
                                      viewChecklist.responses.phones.map((p: string, idx: number) => (
                                        <Badge key={idx} variant="secondary" className="font-mono text-xs">{p}</Badge>
                                      ))
                                    ) : (
                                      <span className="font-semibold text-foreground">—</span>
                                    )}
                                  </div>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-xs text-muted-foreground block font-medium">Data do Preenchimento</span>
                                  <span className="font-semibold text-foreground">
                                    {viewChecklist.responses.fill_date ? new Date(viewChecklist.responses.fill_date).toLocaleDateString("pt-BR") : "—"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ESTRUTURA FISICA */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Estrutura Física e Organizacional</h4>
                              <div className="space-y-3 text-sm">
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Quantos andares possui a serventia?</span>
                                  <span className="font-semibold text-foreground">{viewChecklist.responses.floors || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Observação</span>
                                  <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.structure_obs || "Sem observações."}</p>
                                </div>
                              </div>
                            </div>

                            {/* SETORES */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Distribuição por setores</h4>
                              <div className="space-y-3 text-sm">
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Quais setores existem no estabelecimento?</span>
                                  <span className="font-semibold text-foreground">{viewChecklist.responses.sectors || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Como os setores estão distribuídos nos andares?</span>
                                  <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.sectors_distribution || "—"}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Observação</span>
                                  <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.sectors_obs || "Sem observações."}</p>
                                </div>
                              </div>
                            </div>

                            {/* COLABORADORES */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">Estrutura de Colaboradores</h4>
                              <div className="space-y-2">
                                <span className="text-xs text-muted-foreground block font-medium">Pessoa(s) Chave(s) para comunicação na Serventia</span>
                                {Array.isArray(viewChecklist.responses.key_people) && viewChecklist.responses.key_people.length > 0 ? (
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {viewChecklist.responses.key_people.map((person: { name: string; role: string; contact: string }, idx: number) => (
                                      <div key={idx} className="bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1">
                                        <div><strong className="text-muted-foreground">Nome:</strong> <span className="font-medium text-foreground">{person.name}</span></div>
                                        <div><strong className="text-muted-foreground">Cargo:</strong> <span className="font-medium text-foreground">{person.role}</span></div>
                                        <div><strong className="text-muted-foreground">Contato:</strong> <span className="font-medium text-foreground font-mono">{person.contact}</span></div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Nenhuma cadastrada.</p>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2 border-t">
                                <div className="sm:col-span-2">
                                  <span className="text-xs text-muted-foreground block font-medium">Quantidade de colaboradores por setor</span>
                                  <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.employees_by_sector || "—"}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Quantidade total de colaboradores</span>
                                  <span className="font-semibold text-foreground">{viewChecklist.responses.total_employees || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block font-medium">Equipe ciente da mudança de sistema?</span>
                                  <Badge variant="secondary" className="font-bold text-xs">{viewChecklist.responses.aware_of_change || "—"}</Badge>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-xs text-muted-foreground block font-medium">Como a equipe lida com mudanças ou sistemas novos?</span>
                                  <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.team_adaptability || "—"}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-xs text-muted-foreground block font-medium">Observação</span>
                                  <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.employees_obs || "Sem observações."}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* COMMERCIAL FORM TAB */}
                    <TabsContent value="commercial" className="space-y-6 mt-0 focus-visible:outline-none focus-visible:ring-0">
                      {isEditingCommercialForm && editFormData ? (
                        /* Edit mode */
                        <div className="space-y-4">
                          <div className="mb-3 flex min-w-0 flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Editando Formulário Comercial</span>
                            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                              <Button variant="ghost" size="sm" onClick={() => setIsEditingCommercialForm(false)} className="w-full sm:w-auto">Cancelar</Button>
                              <Button
                                size="sm"
                                className="h-auto min-h-9 w-full whitespace-normal bg-indigo-600 leading-snug hover:bg-indigo-700 sm:w-auto"
                                disabled={updateForm.isPending || createForm.isPending}
                                onClick={() => handleUpdateCommercialForm(matchedForm?.id || null)}
                              >
                                {updateForm.isPending || createForm.isPending ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                            </div>
                          </div>

                          <DeploymentFormFields data={editFormData} onChange={setEditFormData} errors={editFieldErrors} />

                          <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-3 sm:flex sm:justify-end">
                            <Button variant="outline" size="sm" onClick={() => setIsEditingCommercialForm(false)} className="w-full sm:w-auto">Cancelar</Button>
                            <Button
                              size="sm"
                              className="h-auto min-h-9 w-full whitespace-normal bg-indigo-600 leading-snug hover:bg-indigo-700 sm:w-auto"
                              disabled={updateForm.isPending || createForm.isPending}
                              onClick={() => handleUpdateCommercialForm(matchedForm?.id || null)}
                            >
                              {updateForm.isPending || createForm.isPending ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                          </div>
                        </div>
                      ) : matchedForm ? (
                        /* Read-only details view */
                        <div className="space-y-6">
                          <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 break-words text-xs text-muted-foreground">
                              Preenchido por <strong>{matchedForm.filled_by}</strong> em {new Date(matchedForm.created_at || new Date()).toLocaleDateString("pt-BR")}
                            </div>
                            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-auto min-h-9 w-full gap-1.5 whitespace-normal text-xs leading-snug sm:w-auto"
                                onClick={() => handleCopyTramite(matchedForm)}
                              >
                                <Download className="h-3.5 w-3.5" /> Copiar Trâmite (0800)
                              </Button>
                              {hasPermission("commercial_checklists", "create") && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-9 w-full text-xs sm:h-8 sm:w-auto"
                                  onClick={() => {
                                    setEditFormData({ ...matchedForm });
                                    setEditFieldErrors(new Set());
                                    setEditSubmitted(false);
                                    setIsEditingCommercialForm(true);
                                  }}
                                >
                                  Editar Dados
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            {/* DADOS ADMINISTRATIVOS */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                                Dados Administrativos
                              </h4>
                              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                <div><span className="text-muted-foreground block">N.º OP</span><strong className="text-sm">{matchedForm.op_number}</strong></div>
                                <div><span className="text-muted-foreground block">N.º Pedido</span><strong className="text-sm">{matchedForm.sales_order_number}</strong></div>
                                <div><span className="text-muted-foreground block">Data do Pedido</span><strong className="text-sm">{matchedForm.order_date ? new Date(matchedForm.order_date).toLocaleDateString("pt-BR") : "—"}</strong></div>
                                <div><span className="text-muted-foreground block">Contrato DocuSign</span><strong className="text-sm">{matchedForm.docusign_contract_number}</strong></div>
                              </div>
                            </div>

                            {/* ESCOPO CONTRATADO */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b pb-2 flex items-center gap-1.5">
                                <Wrench className="h-3.5 w-3.5 text-emerald-500" />
                                Escopo Contratado
                              </h4>
                              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                <div><span className="text-muted-foreground block">Sistema Principal</span><strong className="text-sm">{matchedForm.contracted_system}</strong></div>
                                <div><span className="text-muted-foreground block">Modalidade</span><strong className="text-sm">{matchedForm.modality}</strong></div>
                                <div><span className="text-muted-foreground block">Horas Presencial</span><strong className="text-sm">{matchedForm.hours_presencial} h</strong></div>
                                <div><span className="text-muted-foreground block">Horas Remoto</span><strong className="text-sm">{matchedForm.hours_remote || 0} h</strong></div>
                                <div><span className="text-muted-foreground block">Deslocamento Pago Cliente</span><strong className="text-sm">{matchedForm.travel_paid_by_client ? "Sim" : "Não"}</strong></div>
                                <div><span className="text-muted-foreground block">Hospedagem Paga Cliente</span><strong className="text-sm">{matchedForm.accommodation_paid_by_client ? "Sim" : "Não"}</strong></div>
                              </div>
                              <div className="border-t pt-2 space-y-1">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Módulos contratados:</span>
                                <div className="flex flex-wrap gap-1">
                                  {matchedForm.module_lcw && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">LCW</Badge>}
                                  {matchedForm.module_sga && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">SGA</Badge>}
                                  {matchedForm.module_on_hand && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">On Hand</Badge>}
                                  {matchedForm.module_website && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Website</Badge>}
                                  {matchedForm.module_editor_modelos && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Editor Modelos</Badge>}
                                  {matchedForm.module_other && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{matchedForm.module_other_name}</Badge>}
                                </div>
                              </div>
                            </div>

                            {/* PERFIL & DATAS */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border-b pb-2 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                Perfil, Datas e Agenda
                              </h4>
                              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                <div><span className="text-muted-foreground block">Tipo de Implantação</span><strong className="text-sm">{matchedForm.deployment_type === "migration_siplan" ? "Migração Siplan Legado" : matchedForm.deployment_type === "migration_competitor" ? "Migração Concorrente" : "Outro"}</strong></div>
                                <div><span className="text-muted-foreground block">Sistema Legado</span><strong className="text-sm">{matchedForm.legacy_system}</strong></div>
                                <div><span className="text-muted-foreground block">Data Desejada</span><strong className="text-sm">{matchedForm.desired_date ? new Date(matchedForm.desired_date).toLocaleDateString("pt-BR") : "—"}</strong></div>
                                <div><span className="text-muted-foreground block">Data Limite (Máxima)</span><strong className="text-sm">{matchedForm.max_date ? new Date(matchedForm.max_date).toLocaleDateString("pt-BR") : "—"}</strong></div>
                                <div className="border-t pt-2 sm:col-span-2">
                                  <span className="text-muted-foreground block">Restrições de Período</span>
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{matchedForm.schedule_restrictions || "Sem restrições informadas."}</p>
                                </div>
                              </div>
                            </div>

                            {/* CONTATOS DO CARTÓRIO */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 border-b pb-2 flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-violet-500" />
                                Contatos do Cartório
                              </h4>
                              <div className="space-y-2 text-xs">
                                {(matchedForm.official_name || matchedForm.official_phone) && (
                                  <div>
                                    <strong className="block text-[10px] text-muted-foreground uppercase font-bold">Oficial/Tabelião:</strong>
                                    <span>{matchedForm.official_name} • {matchedForm.official_phone} • {matchedForm.official_email}</span>
                                  </div>
                                )}
                                {(matchedForm.it_name || matchedForm.it_phone) && (
                                  <div className="border-t pt-1.5">
                                    <strong className="block text-[10px] text-muted-foreground uppercase font-bold">Responsável TI:</strong>
                                    <span>{matchedForm.it_name} • {matchedForm.it_phone} • {matchedForm.it_email}</span>
                                  </div>
                                )}
                                {(matchedForm.operational_name || matchedForm.operational_phone) && (
                                  <div className="border-t pt-1.5">
                                    <strong className="block text-[10px] text-muted-foreground uppercase font-bold">Responsável Operacional ({matchedForm.operational_role}):</strong>
                                    <span>{matchedForm.operational_name} • {matchedForm.operational_phone} • {matchedForm.operational_email}</span>
                                  </div>
                                )}
                                {matchedForm.other_contacts && (
                                  <div className="border-t pt-1.5">
                                    <strong className="block text-[10px] text-muted-foreground uppercase font-bold">Outros contatos:</strong>
                                    <p className="leading-relaxed">{matchedForm.other_contacts}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* CONDIÇÕES ESPECIAIS & EDITOR MODELOS */}
                            <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm md:col-span-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 border-b pb-2 flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5 text-orange-500" />
                                Observações, Condições Especiais & Editor de Modelos
                              </h4>
                              <div className="grid md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-muted-foreground block font-bold text-[10px] uppercase">Nível de Urgência:</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {matchedForm.urgency_level === "critical" && <Badge variant="destructive">Crítico</Badge>}
                                      {matchedForm.urgency_level === "high" && <Badge variant="default">Alto</Badge>}
                                      {matchedForm.urgency_level === "normal" && <Badge variant="secondary">Normal</Badge>}
                                      {matchedForm.urgency_justification && <span className="italic">({matchedForm.urgency_justification})</span>}
                                    </div>
                                  </div>
                                  <div className="border-t pt-2">
                                    <span className="text-muted-foreground block font-bold text-[10px] uppercase">Condições Especiais Negociadas:</span>
                                    <p className="leading-relaxed whitespace-pre-wrap mt-0.5">{matchedForm.special_conditions || "Nenhuma condição especial informada."}</p>
                                  </div>
                                </div>
                                <div className="border-t md:border-t-0 md:border-l md:pl-4 pt-2 md:pt-0 space-y-2">
                                  <strong className="block text-[10px] text-muted-foreground uppercase font-bold">Editor de Modelos:</strong>
                                  {matchedForm.contracted_system === "Orion TN" ? (
                                    matchedForm.editor_status === "contracted" ? (
                                      <div className="space-y-1.5">
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Contratado</Badge>
                                        <div>
                                          <span className="text-muted-foreground">Status do envio: </span>
                                          <strong>
                                            {matchedForm.editor_send_status === "not_oriented" && "Cliente não orientado"}
                                            {matchedForm.editor_send_status === "oriented_waiting" && "Aguardando envio"}
                                            {matchedForm.editor_send_status === "sent_to_team" && "Enviado para equipe de modelos"}
                                          </strong>
                                        </div>
                                        {matchedForm.editor_deadline && (
                                          <div>
                                            <span className="text-muted-foreground">Prazo acordado: </span>
                                            <strong>{new Date(matchedForm.editor_deadline).toLocaleDateString("pt-BR")}</strong>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="text-muted-foreground">Não se aplica / Não contratado</Badge>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground italic">Apenas disponível para Orion TN</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Form does not exist yet (Edge case for old data or test data) */
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="h-10 w-10 text-amber-500 mb-3 animate-bounce" />
                          <h4 className="font-bold">Formulário de Implantação Pendente</h4>
                          <p className="text-xs text-muted-foreground max-w-sm mt-1">
                            Os dados comerciais e administrativos não foram preenchidos. Preencha agora para liberar a cópia do link do checklist.
                          </p>
                          {hasPermission("commercial_checklists", "create") && (
                            <Button
                              size="sm"
                              className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => {
                                setEditFormData({
                                  ...EMPTY_FORM,
                                  client_name: viewChecklist.projects?.clientName || "",
                                  ticket_number: viewChecklist.projects?.ticketNumber || "",
                                  contracted_system: viewChecklist.projects?.systemType || "",
                                  filled_by: fullName || "",
                                });
                                setEditFieldErrors(new Set());
                                setEditSubmitted(false);
                                setIsEditingCommercialForm(true);
                              }}
                            >
                              Preencher Formulário Comercial
                            </Button>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </div>

                  <div className="shrink-0 border-t bg-slate-50 px-3 py-3 dark:bg-slate-900 sm:flex sm:justify-end sm:px-6 sm:py-4">
                    <Button variant="outline" size="sm" onClick={handleCloseView} className="w-full sm:w-auto">Fechar</Button>
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>
          );
        })()
      )}
    </div>
  );
}
