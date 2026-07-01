import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Search, FileText, Trash2, Copy, CheckCircle2,
  ArrowLeft, AlertTriangle, Eye, ClipboardCheck, Building2,
  Zap, Clock, User,
} from "lucide-react";
import { useDeploymentForms, type DeploymentFormRecord } from "@/hooks/useDeploymentForms";
import { useAuth } from "@/hooks/useAuth";
import { DeploymentFormFields } from "@/components/commercial/DeploymentFormFields";
import { generateDeploymentTemplate, type DeploymentFormData } from "@/utils/deployment-template";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ChevronsUpDown, Check } from "lucide-react";

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
  req("sales_rep", data.sales_rep);

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

  // Contatos (todos opcionais)

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

export default function DeploymentForms() {
  const { forms, isLoading, createForm, deleteForm } = useDeploymentForms();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const { projects, updateProject } = useProjectsV2();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectComboboxOpen, setProjectComboboxOpen] = useState(false);
  const { fullName } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"list" | "create">("list");
  const [formData, setFormData] = useState<DeploymentFormData>({ ...EMPTY_FORM });
  const [outputDialog, setOutputDialog] = useState(false);
  const [outputText, setOutputText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUserSync, setLastUserSync] = useState("");

  const activeProjects = projects.filter(
    (proj) =>
      proj.globalStatus === "in-progress" &&
      proj.stages?.post?.status !== "done" &&
      proj.stages?.post?.status !== "in-progress"
  );

  // If there's a ?view=<formId> query parameter, open that form details
  useEffect(() => {
    if (viewParam && forms.length > 0) {
      const found = forms.find((f) => f.id === viewParam);
      if (found) {
        const text = generateDeploymentTemplate(found);
        setOutputText(text);
        setOutputDialog(true);
      }
    }
  }, [viewParam, forms]);

  // Sync current user name once available
  useEffect(() => {
    if (mode === "create" && fullName && fullName !== lastUserSync && !formData.filled_by) {
      setFormData(prev => ({ ...prev, filled_by: fullName }));
      setLastUserSync(fullName);
    }
  }, [fullName, mode, formData.filled_by, lastUserSync]);

  const handleCreate = () => {
    setFormData({ ...EMPTY_FORM, filled_by: fullName || "" });
    setSelectedProjectId("");
    setMode("create");
    setFieldErrors(new Set());
    setSubmitted(false);
  };

  const handleSave = () => {
    setSubmitted(true);
    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (errors.size > 0) {
      toast({
        title: `${errors.size} campo${errors.size > 1 ? "s" : ""} obrigatório${errors.size > 1 ? "s" : ""} não preenchido${errors.size > 1 ? "s" : ""}`,
        description: "Preencha todos os campos marcados em vermelho antes de salvar.",
        variant: "destructive",
      });
      // scroll to first error
      setTimeout(() => {
        document.querySelector("[data-field-error]")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    createForm.mutate(formData, {
      onSuccess: () => {
        // Sync values back to the active project if selected
        if (selectedProjectId) {
          const activeProj = activeProjects.find((p) => p.id === selectedProjectId);
          if (activeProj) {
            // soldHours updated with hours_presencial
            const presencialHours = formData.hours_presencial ? parseFloat(formData.hours_presencial) : undefined;
            const updatedSoldHours = presencialHours !== undefined && !isNaN(presencialHours) ? presencialHours : activeProj.soldHours;

            // products mapping
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
              if (!updatedProducts.includes(prod)) {
                updatedProducts.push(prod);
              }
            });

            // legacySystem updated 100% of the time
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
        }

        const text = generateDeploymentTemplate({ ...formData, filled_at: new Date().toISOString() });
        setOutputText(text);
        setOutputDialog(true);
        setMode("list");
      },
    });
  };

  // Re-validate on every change after first submit attempt
  const handleFormChange = (data: DeploymentFormData) => {
    setFormData(data);
    if (submitted) setFieldErrors(validateForm(data));
  };

  const handleView = (form: DeploymentFormRecord) => {
    const text = generateDeploymentTemplate(form);
    setOutputText(text);
    setOutputDialog(true);
    setSearchParams({ view: form.id });
  };

  const handleCloseView = (open: boolean) => {
    setOutputDialog(open);
    if (!open) {
      setSearchParams({});
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    toast({ title: "Copiado!", description: "Texto copiado para a área de transferência." });
    setTimeout(() => setCopied(false), 2500);
  };

  const filtered = forms.filter(
    (f) =>
      f.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      f.contracted_system?.toLowerCase().includes(search.toLowerCase()),
  );

  /* ── CREATE MODE ── */
  if (mode === "create") {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Header bar */}
        <div className="flex items-center gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-3 -mx-1 px-1">
          <Button variant="ghost" size="icon" onClick={() => setMode("list")} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">Novo Formulário de Implantação</h1>
            <p className="text-xs text-muted-foreground">Preencha os campos e salve para gerar o tramite.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setMode("list")}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createForm.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {createForm.isPending ? "Salvando..." : "Salvar e Gerar"}
            </Button>
          </div>
        </div>

        {/* Regra */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs"><strong>Regra:</strong> Crie 1 formulário por sistema contratado. Se o cliente adquiriu mais de 1 sistema, crie um formulário separado para cada.</p>
        </div>

        {/* Identificação principal */}
        <Card className={`border-2 transition-colors ${fieldErrors.has("client_name") || fieldErrors.has("contracted_system") ? "border-red-400" : "border-transparent"} bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20`}>
          <CardContent className="pt-4 pb-4 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Identificação</p>

            {/* SEARCHABLE ACTIVE PROJECT SELECTOR */}
            <div className="space-y-1.5 flex flex-col max-w-3xl">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Vincular a um Projeto Ativo (Preenche automaticamente)</Label>
              <Popover open={projectComboboxOpen} onOpenChange={setProjectComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectComboboxOpen}
                    className="w-full justify-between font-normal text-left h-auto min-h-10 py-2 border-muted-foreground/30 bg-background whitespace-normal pr-4"
                  >
                    {selectedProjectId ? (
                      (() => {
                        const proj = activeProjects.find((p) => p.id === selectedProjectId);
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
                      <CommandEmpty>Nenhum projeto em andamento encontrado.</CommandEmpty>
                      <CommandGroup>
                        {activeProjects.map((proj) => (
                          <CommandItem
                            key={proj.id}
                            value={`${proj.clientName} ${proj.ticketNumber} ${proj.systemType}`}
                            onSelect={() => {
                              setSelectedProjectId(proj.id);
                              setProjectComboboxOpen(false);
                              handleFormChange({
                                ...formData,
                                client_name: proj.clientName,
                                ticket_number: proj.ticketNumber || "",
                                contracted_system: proj.systemType || "",
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Nome do Cliente *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => handleFormChange({ ...formData, client_name: e.target.value })}
                  placeholder="Nome do cartório / cliente"
                  className={`h-9 ${fieldErrors.has("client_name") ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                  data-field-error={fieldErrors.has("client_name") ? "true" : undefined}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">N.º do Chamado</Label>
                <Input
                  value={formData.ticket_number || ""}
                  onChange={(e) => handleFormChange({ ...formData, ticket_number: e.target.value })}
                  placeholder="Ex: 123456"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Sistema Contratado *</Label>
                <Select
                  value={formData.contracted_system}
                  onValueChange={(v) =>
                    handleFormChange({
                      ...formData,
                      contracted_system: v,
                      module_editor_modelos: v !== "Orion TN" ? false : formData.module_editor_modelos,
                    })
                  }
                >
                  <SelectTrigger className={`h-9 ${fieldErrors.has("contracted_system") ? "border-red-400" : ""}`}>
                    <SelectValue placeholder="Selecione o sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEMS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.contracted_system === "Outro" && (
              <div className="mt-3 space-y-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Especifique o sistema</Label>
                <Input
                  value={formData.contracted_system_other || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, contracted_system_other: e.target.value }))}
                  placeholder="Nome do sistema"
                  className="h-9 max-w-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <DeploymentFormFields data={formData} onChange={handleFormChange} errors={fieldErrors} />

        {/* Bottom actions */}
        <div className="flex justify-end gap-2 pb-10 pt-2 border-t">
          <Button variant="outline" onClick={() => setMode("list")}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={createForm.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            {createForm.isPending ? "Salvando..." : "Salvar e Gerar Texto"}
          </Button>
        </div>

        <OutputDialog
          open={outputDialog}
          onOpenChange={handleCloseView}
          text={outputText}
          onCopy={handleCopy}
          copied={copied}
        />
      </div>
    );
  }

  /* ── LIST MODE ── */
  return (
    <div className="space-y-5 animate-in fade-in duration-500 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            Formulários de Implantação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Passagem de projeto Comercial → Implantação</p>
        </div>
        <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 gap-2 shrink-0 shadow-lg shadow-indigo-500/20">
          <Plus className="h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      {/* Stats strip */}
      {forms.length > 0 && (
        <div className="flex gap-3 shrink-0">
          {[
            { label: "Total", value: forms.length, icon: FileText, color: "text-indigo-500" },
            { label: "Urgência Alta/Crítica", value: forms.filter(f => f.urgency_level !== "normal").length, icon: Zap, color: "text-amber-500" },
            { label: "Criados hoje", value: forms.filter(f => new Date(f.created_at).toDateString() === new Date().toDateString()).length, icon: Clock, color: "text-emerald-500" },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border text-sm">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="font-bold">{stat.value}</span>
              <span className="text-muted-foreground text-xs hidden sm:block">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, chamado ou sistema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-card/60"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
              <p className="text-sm text-muted-foreground">Carregando formulários…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-muted/10 h-[280px]">
            <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/30 mb-4">
              <FileText className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum formulário encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              {search ? "Tente outra busca." : "Crie o primeiro formulário de passagem de projeto."}
            </p>
            {!search && (
              <Button onClick={handleCreate} className="mt-4 bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Plus className="h-4 w-4" /> Criar primeiro formulário
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 pb-8">
            {filtered.map((form) => {
              const urg = URGENCY_CONFIG[(form.urgency_level as keyof typeof URGENCY_CONFIG) ?? "normal"] ?? URGENCY_CONFIG.normal;
              return (
                <Card
                  key={form.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group bg-card border hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5"
                  onClick={() => handleView(form)}
                >
                  {/* System color bar */}
                  <div className={`h-1 w-full ${form.contracted_system === "Orion TN" ? "bg-gradient-to-r from-indigo-500 to-violet-500" : form.contracted_system === "Orion PRO" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-amber-500 to-orange-500"}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {form.client_name}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Badge variant="outline" className="text-[11px] px-2 py-0">{form.contracted_system}</Badge>
                          {form.ticket_number && (
                            <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0">#{form.ticket_number}</Badge>
                          )}
                          <Badge variant={urg.variant} className="text-[11px] px-2 py-0">{urg.icon} {urg.label}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Excluir este formulário?")) deleteForm.mutate(form.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2.5">
                      {form.sales_rep && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{form.sales_rep}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{form.contracted_system}</span>
                      </div>
                      <div className="col-span-2 text-[11px]">
                        Criado em {new Date(form.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 h-8 text-xs hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleView(form); }}
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver e Copiar Texto do Tramite
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <OutputDialog
        open={outputDialog}
        onOpenChange={handleCloseView}
        text={outputText}
        onCopy={handleCopy}
        copied={copied}
      />
    </div>
  );
}

/* ── Output Dialog ── */
function OutputDialog({
  open,
  onOpenChange,
  text,
  onCopy,
  copied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  text: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            Texto Gerado — Tramite de Passagem
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Copie e cole diretamente no chamado do 0800.</p>
        </DialogHeader>
        <pre className="flex-1 overflow-auto bg-muted/30 p-5 text-[11px] font-mono whitespace-pre leading-relaxed tracking-tight text-foreground/80 mx-0">
          {text}
        </pre>
        <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0 bg-background">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            size="sm"
            onClick={onCopy}
            className={`gap-2 transition-all ${copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {copied ? (
              <><CheckCircle2 className="h-4 w-4" /> Copiado!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copiar Texto</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
