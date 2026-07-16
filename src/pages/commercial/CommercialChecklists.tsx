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
  Calendar, Phone, Wrench, Info, Zap, Download
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
    return (
      clientName.includes(query) ||
      systemType.includes(query) ||
      ticketNumber.includes(query) ||
      createdBy.includes(query)
    );
  });

  const canCreateChecklists = hasPermission("commercial_checklists", "create");
  const canDeleteChecklists = hasPermission("commercial_checklists", "delete");

  /* ── CREATE VIEW (FORMULÁRIO DE NEGOCIAÇÃO) ── */
  if (mode === "create") {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Header bar */}
        <div className="flex items-center gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-3 -mx-1 px-1">
          <Button variant="ghost" size="icon" onClick={() => setMode("list")} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate text-foreground">
              Passo 1: Formulário Comercial de Nova Implantação
            </h1>
            <p className="text-xs text-muted-foreground">Preencha os dados da negociação para liberar o checklist ao cliente.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setMode("list")}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleSaveAndGenerate}
              disabled={createForm.isPending || createChecklist.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 shadow-md"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {createForm.isPending || createChecklist.isPending ? "Processando..." : "Salvar e Liberar Link"}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            <strong>Instrução Comercial:</strong> O preenchimento das informações abaixo é <strong>obrigatório</strong> antes de disponibilizar o checklist técnico ao cliente. Essas respostas serão gravadas e integradas diretamente na timeline do projeto.
          </p>
        </div>

        {/* Project Selector */}
        <Card className={`border-2 transition-colors ${fieldErrors.has("client_name") || fieldErrors.has("contracted_system") ? "border-red-400" : "border-transparent"} bg-gradient-to-br from-indigo-50/40 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/20`}>
          <CardContent className="pt-4 pb-4 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Identificação do Projeto</p>

            <div className="space-y-1.5 flex flex-col max-w-3xl">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Vincular a um Projeto Ativo *</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal text-left h-auto min-h-10 py-2 border-muted-foreground/30 bg-background whitespace-normal pr-4"
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
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[350px] max-w-[90vw] p-0" align="start">
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
                  <span className="text-sm font-semibold">{formData.client_name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">N.º do Chamado</span>
                  <span className="text-sm font-semibold font-mono">#{formData.ticket_number || "—"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">Sistema Principal</span>
                  <span className="text-sm font-semibold">{formData.contracted_system}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProjectId ? (
          <div className="space-y-4">
            <DeploymentFormFields data={formData} onChange={setFormData} errors={fieldErrors} />
            <div className="flex justify-end gap-2 pb-10 pt-2 border-t">
              <Button variant="outline" onClick={() => setMode("list")}>Cancelar</Button>
              <Button
                onClick={handleSaveAndGenerate}
                disabled={createForm.isPending || createChecklist.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />
                {createForm.isPending || createChecklist.isPending ? "Processando..." : "Salvar e Liberar Checklist"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl bg-muted/10 h-[200px]">
            <Building2 className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm text-muted-foreground">Por favor, selecione um projeto ativo no campo acima para carregar o formulário.</p>
          </div>
        )}
      </div>
    );
  }

  /* ── LIST VIEW ── */
  return (
    <div className="space-y-5 animate-in fade-in duration-500 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Checklists de Implantação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie os formulários de passagem do Comercial e os checklists estruturais dos clientes</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => navigate("/commercial/checklists/questions")}
            className="border-muted-foreground/30 bg-card gap-2"
          >
            <Settings className="h-4 w-4" />
            Editar Perguntas
          </Button>
          {canCreateChecklists && (
            <Button onClick={handleStartCreate} className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-lg shadow-indigo-500/20">
              <Plus className="h-4 w-4" />
              Novo Checklist
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {checklists.length > 0 && (
        <div className="flex flex-wrap gap-3 shrink-0">
          {[
            { label: "Total", value: checklists.length, icon: FileText, color: "text-indigo-500" },
            { label: "Aguardando Resposta", value: checklists.filter(c => c.status === "pending").length, icon: Clock, color: "text-amber-500" },
            { label: "Respondidos", value: checklists.filter(c => c.status === "submitted").length, icon: CheckCircle2, color: "text-emerald-500" },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border text-sm shadow-sm">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="font-bold">{stat.value}</span>
              <span className="text-muted-foreground text-xs">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, sistema, chamado ou quem criou..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-card/60"
        />
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {isLoadingChecklists || isLoadingProjects || isLoadingForms ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
              <p className="text-sm text-muted-foreground">Carregando checklists e formulários...</p>
            </div>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-muted/10 h-[280px]">
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 pb-8">
            {filteredChecklists.map((item) => {
              const isSubmitted = item.status === "submitted";
              const matchedForm = forms.find(f => f.ticket_number === item.projects?.ticketNumber);
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group bg-card border hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5"
                  onClick={() => handleOpenView(item, "client")}
                >
                  <div className={`h-1.5 w-full ${isSubmitted ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {item.projects?.clientName || "Projeto Removido"}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.projects?.systemType && (
                            <Badge variant="outline" className="text-[11px] px-2 py-0">{item.projects.systemType}</Badge>
                          )}
                          {item.projects?.ticketNumber && (
                            <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0">#{item.projects.ticketNumber}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {matchedForm ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] px-2 py-0">
                              Form Comercial: Preenchido
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[11px] px-2 py-0 animate-pulse">
                              Form Comercial: Pendente
                            </Badge>
                          )}

                          {isSubmitted ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] px-2 py-0">
                              Checklist Cliente: Respondido
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[11px] px-2 py-0">
                              Checklist Cliente: Enviado
                            </Badge>
                          )}
                        </div>
                      </div>
                      {canDeleteChecklists && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                          onClick={(e) => handleDelete(item.id, item.projects?.ticketNumber, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate" title={item.created_by_name}>Criado por {item.created_by_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 h-8 text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={(e) => { e.stopPropagation(); handleOpenView(item, "commercial"); }}
                      >
                        <FileText className="h-3.5 w-3.5" /> Dados Comercial
                      </Button>
                      
                      {isSubmitted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 h-8 text-xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
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
                            className="flex-1 gap-1.5 h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400"
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
        )}
      </div>

      {/* Dialog for viewing/editing checklist & deployment details */}
      {viewChecklist && (
        (() => {
          const matchedForm = forms.find(f => f.ticket_number === viewChecklist.projects?.ticketNumber);
          return (
            <Dialog open={!!viewChecklist} onOpenChange={(open) => { if (!open) handleCloseView(); }}>
              <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-900/50">
                  <div className="flex justify-between items-start pr-6">
                    <div>
                      <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-500" />
                        {viewChecklist.projects?.clientName || "Dados da Serventia"}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        ID: <span className="font-mono text-[10px] select-all bg-muted px-1 rounded">{viewChecklist.id}</span>
                        {viewChecklist.projects?.ticketNumber && ` • Chamado: #${viewChecklist.projects.ticketNumber}`}
                        {viewChecklist.projects?.systemType && ` • Sistema: ${viewChecklist.projects.systemType}`}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 border-b bg-background shrink-0">
                    <TabsList className="flex w-64 my-2">
                      <TabsTrigger value="client" className="flex-1 text-xs">Checklist Cliente</TabsTrigger>
                      <TabsTrigger value="commercial" className="flex-1 text-xs">Dados Comercial</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {/* CLIENT CHECKLIST TAB */}
                    <TabsContent value="client" className="space-y-6 mt-0 focus-visible:outline-none focus-visible:ring-0">
                      {viewChecklist.status === "pending" ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-200">
                          <Clock className="h-10 w-10 text-amber-500 animate-pulse mb-3" />
                          <h4 className="font-bold">Aguardando Resposta do Cliente</h4>
                          <p className="text-xs text-muted-foreground max-w-sm mt-1">
                            Este checklist foi gerado comercialmente, mas o cliente ainda não o respondeu. Envie o link abaixo:
                          </p>
                          {matchedForm ? (
                            <div className="flex items-center gap-2 mt-4 max-w-full w-full bg-background border p-2 rounded-lg">
                              <span className="text-xs truncate text-left flex-1 font-mono">{`${window.location.origin}/public/checklist/${viewChecklist.id}`}</span>
                              <Button size="sm" variant="secondary" className="gap-1 h-8 shrink-0" onClick={(e) => handleCopyLink(viewChecklist.id, e)}>
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

                          <div className="border rounded-xl p-6 bg-card">
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
                                <div className="col-span-2">
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
                                <div className="col-span-2">
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
                                <div className="col-span-2">
                                  <span className="text-xs text-muted-foreground block font-medium">Como a equipe lida com mudanças ou sistemas novos?</span>
                                  <p className="mt-1 text-foreground/80 bg-muted/20 p-2.5 rounded-lg border text-xs whitespace-pre-wrap">{viewChecklist.responses.team_adaptability || "—"}</p>
                                </div>
                                <div className="col-span-2">
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
                          <div className="flex items-center justify-between border-b pb-2 mb-3">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Editando Formulário Comercial</span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setIsEditingCommercialForm(false)}>Cancelar</Button>
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700"
                                disabled={updateForm.isPending || createForm.isPending}
                                onClick={() => handleUpdateCommercialForm(matchedForm?.id || null)}
                              >
                                {updateForm.isPending || createForm.isPending ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                            </div>
                          </div>

                          <DeploymentFormFields data={editFormData} onChange={setEditFormData} errors={editFieldErrors} />

                          <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                            <Button variant="outline" size="sm" onClick={() => setIsEditingCommercialForm(false)}>Cancelar</Button>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700"
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
                          <div className="flex justify-between items-center bg-muted/20 border p-3 rounded-lg">
                            <div className="text-xs text-muted-foreground">
                              Preenchido por <strong>{matchedForm.filled_by}</strong> em {new Date(matchedForm.created_at || new Date()).toLocaleDateString("pt-BR")}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-8 text-xs"
                                onClick={() => handleCopyTramite(matchedForm)}
                              >
                                <Download className="h-3.5 w-3.5" /> Copiar Trâmite (0800)
                              </Button>
                              {hasPermission("commercial_checklists", "create") && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 text-xs"
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
                              <div className="grid grid-cols-2 gap-2 text-xs">
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
                              <div className="grid grid-cols-2 gap-2 text-xs">
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
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-muted-foreground block">Tipo de Implantação</span><strong className="text-sm">{matchedForm.deployment_type === "migration_siplan" ? "Migração Siplan Legado" : matchedForm.deployment_type === "migration_competitor" ? "Migração Concorrente" : "Outro"}</strong></div>
                                <div><span className="text-muted-foreground block">Sistema Legado</span><strong className="text-sm">{matchedForm.legacy_system}</strong></div>
                                <div><span className="text-muted-foreground block">Data Desejada</span><strong className="text-sm">{matchedForm.desired_date ? new Date(matchedForm.desired_date).toLocaleDateString("pt-BR") : "—"}</strong></div>
                                <div><span className="text-muted-foreground block">Data Limite (Máxima)</span><strong className="text-sm">{matchedForm.max_date ? new Date(matchedForm.max_date).toLocaleDateString("pt-BR") : "—"}</strong></div>
                                <div className="col-span-2 border-t pt-2">
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

                  <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0 bg-slate-50 dark:bg-slate-900">
                    <Button variant="outline" size="sm" onClick={handleCloseView}>Fechar</Button>
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
