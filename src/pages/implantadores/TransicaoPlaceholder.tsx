import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  FileText,
  Printer,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Sparkles,
  ClipboardList,
  Activity,
  History,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
  RefreshCw,
  MessageSquare,
  Share2,
  Copy,
  Download
} from "lucide-react";

interface KeyUserItem {
  name: string;
  phone: string;
}

// Ticket structure inside DTC
interface DTCTicket {
  number: string;
  description: string;
  status: "open" | "in_progress" | "closed";
}

// Complete DTC data model
interface DTCData {
  responsible: string;
  analystResponsible: string;
  serventia: string;
  oficial: string;
  clientResponsible: string;
  clientResponsiblePhone?: string;
  keyUsers: string;
  keyUsersList?: KeyUserItem[];
  clientPhone: string;
  clientEmail: string;
  systemsInstalled: string;
  systemVersions: string;
  postgresVersion: string;
  postgresAccessData: string;
  hadConversion: boolean;
  convertedData: string;
  remoteAccessData: string;
  supportCallNumber: string;
  implantationProcess: string;
  postImplantationProcess: string;
  employees: string;
  finalConsiderations: string;
  tickets: DTCTicket[];
  status: "draft" | "submitted" | "approved";
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

// Helper to format phone number to Brazilian standard masks (landline or mobile)
const formatPhoneNumber = (value: string) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

// Stage mapping helper
const dtcStatusToStageStatus = (status: DTCData["status"]) => {
  switch (status) {
    case "submitted":
      return "waiting_adjustment";
    case "approved":
      return "done";
    case "draft":
    default:
      return "in-progress";
  }
};

export default function TransicaoPlaceholder() {
  const { fullName, isAdmin } = useAuth();
  const { updateProject } = useProjectsV2();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // 1. Fetch lightweight project list for selection dropdown
  const { data: projectsList = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["projectsSelectDtc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, client_name, ticket_number, system_type, post_status")
        .eq("is_deleted", false)
        .order("client_name", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch full details of the selected project (lazy loaded)
  const { project, isLoading: isLoadingDetails } = useProjectDetails(
    selectedProjectId || null
  );

  // 3. Connect to auto-save logic (only runs when we have an active project)
  const getInitialDtc = (): DTCData | null => {
    if (!project) return null;
    const existingDtc = project.customFields?.dtc as DTCData | undefined;
    if (existingDtc) return existingDtc;

    return {
      responsible: project.responsiblePost || project.projectLeader || fullName || "",
      analystResponsible: project.responsiblePost || "",
      serventia: project.clientName || "",
      oficial: "",
      clientResponsible: project.clientPrimaryContact || "",
      clientResponsiblePhone: "",
      keyUsers: "",
      keyUsersList: [],
      clientPhone: formatPhoneNumber(project.clientPhone || ""),
      clientEmail: project.clientEmail || "",
      systemsInstalled: project.systemType || "",
      systemVersions: "",
      postgresVersion: "",
      postgresAccessData: "",
      hadConversion: false,
      convertedData: "",
      remoteAccessData: "",
      supportCallNumber: "",
      implantationProcess: "",
      postImplantationProcess: "",
      employees: "",
      finalConsiderations: "",
      tickets: [],
      status: "draft"
    };
  };

  const { data: localDtc, updateData: setLocalDtc, saveState } = useAutoSave<DTCData | null>(
    project ? (project.customFields?.dtc as DTCData | null) || getInitialDtc() : null,
    async (newData) => {
      if (!selectedProjectId || !newData || !project) return;

      await updateProject.mutateAsync({
        projectId: selectedProjectId,
        updates: {
          customFields: {
            ...project.customFields,
            dtc: newData
          },
          stages: {
            post: {
              status: dtcStatusToStageStatus(newData.status),
              responsible: newData.analystResponsible || project.responsiblePost || undefined
            }
          }
        }
      });
    },
    { debounceMs: 1000 }
  );

  // Migrate older keyUsers string to keyUsersList array on the fly
  useEffect(() => {
    if (localDtc && !localDtc.keyUsersList) {
      const migratedList: KeyUserItem[] = [];
      if (localDtc.keyUsers) {
        const names = localDtc.keyUsers.split(",").map(n => n.trim()).filter(Boolean);
        names.forEach(name => {
          migratedList.push({ name, phone: "" });
        });
      }
      setLocalDtc({
        ...localDtc,
        keyUsersList: migratedList,
        clientResponsiblePhone: localDtc.clientResponsiblePhone || ""
      });
    }
  }, [localDtc, setLocalDtc]);

  // Helper to send system notifications to all project participants and the designated analyst
  const sendNotificationsToParticipants = async (
    title: string,
    message: string,
    actionUrl: string
  ) => {
    if (!project || !localDtc) return;

    try {
      // Gather unique participant names from the project and form
      const namesToNotify = Array.from(
        new Set(
          [
            project.projectLeader,
            project.responsibleInfra,
            project.responsibleAdherence,
            project.responsibleConversion,
            project.responsibleImplementation,
            project.responsiblePost,
            localDtc.analystResponsible,
          ].filter(Boolean)
        )
      );

      if (namesToNotify.length === 0) return;

      // Query profiles to resolve full names to user IDs
      const { data: matchedProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("full_name", namesToNotify);

      if (profilesError) throw profilesError;

      if (matchedProfiles && matchedProfiles.length > 0) {
        const notificationsPayload = matchedProfiles.map((profile) => ({
          user_id: profile.id,
          project_id: project.id,
          type: "status_change",
          title,
          message,
          action_url: actionUrl,
          read: false,
        }));

        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notificationsPayload);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error("Erro ao disparar notificações de transição:", error);
    }
  };

  // Immediate status transition updates (bypass debounce for UX buttons)
  const handleStatusChange = async (newStatus: DTCData["status"]) => {
    if (!selectedProjectId || !localDtc || !project) return;

    const now = new Date().toISOString();
    const updatedDtc: DTCData = {
      ...localDtc,
      status: newStatus,
      ...(newStatus === "submitted" ? { submittedAt: now, submittedBy: fullName || "Usuário" } : {}),
      ...(newStatus === "approved" ? { approvedAt: now, approvedBy: fullName || "Gestor" } : {})
    };

    setLocalDtc(updatedDtc);

    toast.promise(
      updateProject.mutateAsync({
        projectId: selectedProjectId,
        updates: {
          customFields: {
            ...project.customFields,
            dtc: updatedDtc
          },
          stages: {
            post: {
              status: dtcStatusToStageStatus(newStatus),
              responsible: updatedDtc.analystResponsible || project.responsiblePost || undefined
            }
          }
        }
      }).then(async () => {
        // Reforce details query refresh
        queryClient.invalidateQueries({ queryKey: ["projectDetails", selectedProjectId] });

        // Trigger notifications to participants
        let title = "";
        let message = "";
        if (newStatus === "submitted") {
          title = "Transição Operacional (DTC) Pendente";
          message = `O DTC do cartório "${project.clientName}" foi enviado para validação por ${fullName || "Implantador"}.`;
        } else if (newStatus === "approved") {
          title = "Transição Operacional (DTC) Aprovada";
          message = `O DTC do cartório "${project.clientName}" foi homologado e aprovado por ${fullName || "Suporte/Gestor"}.`;
        } else if (newStatus === "draft") {
          title = "Transição Operacional (DTC) Reaberta";
          message = `O DTC do cartório "${project.clientName}" foi retornado para rascunho por ${fullName || "Usuário"}.`;
        }

        if (title && message) {
          await sendNotificationsToParticipants(title, message, "/implantadores/transicao");
        }
      }),
      {
        loading: "Atualizando status do DTC...",
        success: `Status alterado para: ${
          newStatus === "draft"
            ? "Rascunho"
            : newStatus === "submitted"
            ? "Pendente de Validação"
            : "Aprovado / Finalizado"
        }`,
        error: "Falha ao atualizar status do documento."
      }
    );
  };

  // Field change handler
  const handleFieldChange = (field: keyof DTCData, value: any) => {
    if (!localDtc) return;
    setLocalDtc(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  // Tickets helper functions
  const addTicket = () => {
    if (!localDtc) return;
    handleFieldChange("tickets", [
      ...localDtc.tickets,
      { number: "", description: "", status: "open" }
    ]);
  };

  const removeTicket = (idx: number) => {
    if (!localDtc) return;
    handleFieldChange(
      "tickets",
      localDtc.tickets.filter((_, i) => i !== idx)
    );
  };

  const updateTicket = (idx: number, key: keyof DTCTicket, val: any) => {
    if (!localDtc) return;
    const updated = [...localDtc.tickets];
    updated[idx] = {
      ...updated[idx],
      [key]: val
    };
    handleFieldChange("tickets", updated);
  };

  // Key Users helper functions
  const addKeyUser = () => {
    if (!localDtc) return;
    const currentList = localDtc.keyUsersList || [];
    handleFieldChange("keyUsersList", [
      ...currentList,
      { name: "", phone: "" }
    ]);
  };

  const removeKeyUser = (idx: number) => {
    if (!localDtc || !localDtc.keyUsersList) return;
    handleFieldChange(
      "keyUsersList",
      localDtc.keyUsersList.filter((_, i) => i !== idx)
    );
  };

  const updateKeyUser = (idx: number, key: keyof KeyUserItem, val: any) => {
    if (!localDtc || !localDtc.keyUsersList) return;
    const updated = [...localDtc.keyUsersList];
    updated[idx] = {
      ...updated[idx],
      [key]: val
    };
    handleFieldChange("keyUsersList", updated);
  };

  // WhatsApp suite helper functions
  const handleExportVcf = () => {
    if (!localDtc) return;

    const groupName = prompt(
      "Digite o nome do grupo do WhatsApp (para prefixar os contatos):",
      `DTC - ${localDtc.serventia}`
    );
    if (groupName === null) return;

    let vcardText = "";
    
    // Add primary contact if name is filled
    if (localDtc.clientResponsible) {
      vcardText += `BEGIN:VCARD\nVERSION:3.0\nFN:${groupName} - ${localDtc.clientResponsible}\nTEL;TYPE=CELL,VOICE:${localDtc.clientResponsiblePhone || ""}\nEND:VCARD\n`;
    }

    // Add other key users
    if (localDtc.keyUsersList && localDtc.keyUsersList.length > 0) {
      localDtc.keyUsersList.forEach(u => {
        if (u.name) {
          vcardText += `BEGIN:VCARD\nVERSION:3.0\nFN:${groupName} - ${u.name}\nTEL;TYPE=CELL,VOICE:${u.phone || ""}\nEND:VCARD\n`;
        }
      });
    }

    if (!vcardText) {
      toast.error("Nenhum contato com nome cadastrado para exportar.");
      return;
    }

    const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `contatos_grupo_${groupName.replace(/\s+/g, "_").toLowerCase()}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo de contatos (.vcf) baixado! Abra-o no celular ou computador para importar todos.");
  };

  const handleCopyPhones = () => {
    if (!localDtc) return;

    const phones: string[] = [];
    if (localDtc.clientResponsiblePhone) {
      phones.push(localDtc.clientResponsiblePhone);
    }
    if (localDtc.keyUsersList) {
      localDtc.keyUsersList.forEach(u => {
        if (u.phone) {
          phones.push(u.phone);
        }
      });
    }

    if (phones.length === 0) {
      toast.error("Nenhum telefone cadastrado para copiar.");
      return;
    }

    const copyText = phones.join("; ");
    navigator.clipboard.writeText(copyText);
    toast.success(`${phones.length} telefone(s) copiado(s) para a área de transferência!`);
  };

  const handleOpenWhatsappShare = () => {
    if (!localDtc) return;

    const groupName = prompt(
      "Confirme o nome do grupo do WhatsApp:",
      `DTC - ${localDtc.serventia}`
    );
    if (groupName === null) return;

    let msg = `*Grupo do WhatsApp:* ${groupName}\n\n`;
    msg += `*Contatos cadastrados no DTC:*\n`;
    if (localDtc.clientResponsible) {
      msg += `• *${localDtc.clientResponsible}* (Responsável): ${localDtc.clientResponsiblePhone || "Sem telefone"}\n`;
    }
    if (localDtc.keyUsersList) {
      localDtc.keyUsersList.forEach(u => {
        if (u.name) {
          msg += `• *${u.name}*: ${u.phone || "Sem telefone"}\n`;
        }
      });
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const getStatusBadge = (status: DTCData["status"]) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none font-bold uppercase tracking-wider text-xs px-3 py-1">Aprovado</Badge>;
      case "submitted":
        return <Badge className="bg-blue-600 hover:bg-blue-700 border-none font-bold uppercase tracking-wider text-xs px-3 py-1">Pendente Validação</Badge>;
      case "draft":
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 border-none font-bold uppercase tracking-wider text-xs px-3 py-1">Rascunho</Badge>;
    }
  };

  const isFormDisabled = localDtc?.status === "approved";

  return (
    <div className="container mx-auto pt-0 px-6 pb-6 space-y-6 max-w-7xl -mt-6">
      {/* CSS overrides for print layout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #dtc-print-area, #dtc-print-area * {
            visibility: visible;
          }
          #dtc-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 40px !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Unified Compact Header Card */}
      <Card className="no-print border-muted/50 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="p-3 space-y-2">
          {/* First Row: Title, Selector & Auto-save Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-muted-foreground/10 pb-2">
            <div className="flex items-center gap-2">
              <Link to="/implantadores">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-black tracking-tight text-foreground flex items-center gap-2 truncate">
                  DTC: Transição Operacional
                  {localDtc && getStatusBadge(localDtc.status)}
                </h1>
                {localDtc && (
                  <div className="text-[10px] text-muted-foreground h-3">
                    {saveState.status === "saving" && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Salvando...
                      </span>
                    )}
                    {saveState.status === "success" && (
                      <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                        <CheckCircle className="h-3 w-3" />
                        DTC salvo automaticamente
                      </span>
                    )}
                    {saveState.status === "error" && (
                      <span className="flex items-center gap-1 text-rose-500 font-bold">
                        <AlertCircle className="h-3 w-3" />
                        Erro ao salvar
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Project Select Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full sm:w-64 h-8 text-xs border-muted/80">
                  <SelectValue placeholder="Selecione um projeto..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingList ? (
                    <div className="p-2 text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Carregando...
                    </div>
                  ) : projectsList.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">Nenhum projeto encontrado</div>
                  ) : (
                    projectsList.map(proj => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.client_name} {proj.ticket_number ? `(${proj.ticket_number})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedProjectId && (
                <Link to={`/projects/${selectedProjectId}`}>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Ver Ficha do Projeto">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Second Row: Status Details & Actions */}
          {selectedProjectId && localDtc && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
              <div className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {localDtc.status === "draft" && "Rascunho: As alterações são salvas automaticamente."}
                  {localDtc.status === "submitted" && `Enviado para validação em ${new Date(localDtc.submittedAt || "").toLocaleDateString("pt-BR")} por ${localDtc.submittedBy}.`}
                  {localDtc.status === "approved" && `Aprovado e finalizado em ${new Date(localDtc.approvedAt || "").toLocaleDateString("pt-BR")} por ${localDtc.approvedBy}.`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 justify-end">
                {localDtc.status === "draft" && (
                  <Button
                    onClick={() => handleStatusChange("submitted")}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 text-[11px] h-7 px-2.5"
                    size="sm"
                  >
                    <Send className="h-3 w-3" />
                    Enviar para Validação
                  </Button>
                )}

                {localDtc.status === "submitted" && (
                  <>
                    <Button
                      onClick={() => handleStatusChange("draft")}
                      variant="outline"
                      className="border-muted-foreground/30 hover:bg-muted text-[11px] h-7 px-2.5"
                      size="sm"
                    >
                      Retornar a Rascunho
                    </Button>
                    {(isAdmin || fullName === localDtc.analystResponsible) && (
                      <Button
                        onClick={() => handleStatusChange("approved")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-[11px] h-7 px-2.5"
                        size="sm"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Aprovar Transição
                      </Button>
                    )}
                  </>
                )}

                {localDtc.status === "approved" && (
                  <>
                    <Button
                      onClick={() => handleStatusChange("draft")}
                      variant="outline"
                      className="border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 text-[11px] h-7 px-2.5"
                      size="sm"
                    >
                      Reabrir (Editar)
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold gap-1 text-[11px] h-7 px-2.5 shadow"
                      size="sm"
                    >
                      <Printer className="h-3 w-3" />
                      Imprimir DTC
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Form Section */}
      {!selectedProjectId ? (
        <div className="no-print text-center py-20 bg-muted/20 border border-dashed rounded-2xl space-y-4">
          <div className="inline-flex p-4 rounded-full bg-rose-500/10 text-primary border border-primary/20 mb-2">
            <FileText className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold">Nenhum projeto selecionado</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Por favor, selecione um cartório ou projeto no menu de busca acima para começar a preencher ou consultar o DTC.
          </p>
        </div>
      ) : isLoadingDetails || !localDtc ? (
        <div className="no-print flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando detalhes do projeto e do DTC...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Form Tabs */}
          <Tabs defaultValue="geral" className="no-print w-full space-y-4">
            <TabsList className="grid grid-cols-5 w-full h-11 bg-muted/60 p-1 border">
              <TabsTrigger value="geral" className="text-xs font-bold">Identificação</TabsTrigger>
              <TabsTrigger value="infra" className="text-xs font-bold">Infra & Acesso</TabsTrigger>
              <TabsTrigger value="processo" className="text-xs font-bold">Relato Técnico</TabsTrigger>
              <TabsTrigger value="chamados" className="text-xs font-bold">Pendências (Suporte)</TabsTrigger>
              <TabsTrigger value="visualizar" className="text-xs font-bold flex items-center gap-1">
                <Printer className="h-3.5 w-3.5 text-primary" />
                Visualizar DTC
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: IDENTIFICATION */}
            <TabsContent value="geral">
              <Card className="border-muted/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-primary">Identificação do Cartório & Responsáveis</CardTitle>
                  <CardDescription className="text-xs">Dados de contato da serventia e equipe técnica envolvida na transição.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsible" className="text-xs font-bold">Implantador Responsável (DTC)</Label>
                      <Input
                        id="responsible"
                        value={localDtc.responsible}
                        onChange={(e) => handleFieldChange("responsible", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="analystResponsible" className="text-xs font-bold">Responsável pelo pós implantação</Label>
                      <Input
                        id="analystResponsible"
                        value={localDtc.analystResponsible}
                        onChange={(e) => handleFieldChange("analystResponsible", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="Nome do analista que receberá o projeto"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serventia" className="text-xs font-bold">Serventia (Cartório)</Label>
                    <Input
                      id="serventia"
                      value={localDtc.serventia}
                      onChange={(e) => handleFieldChange("serventia", e.target.value)}
                      disabled={isFormDisabled}
                      className="border-muted/80 h-9 text-sm font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="oficial" className="text-xs font-bold">Oficial do Cartório</Label>
                      <Input
                        id="oficial"
                        value={localDtc.oficial}
                        onChange={(e) => handleFieldChange("oficial", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="Nome do Oficial / Titular"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientResponsible" className="text-xs font-bold">Responsável / Contato Principal</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          id="clientResponsible"
                          value={localDtc.clientResponsible}
                          onChange={(e) => handleFieldChange("clientResponsible", e.target.value)}
                          disabled={isFormDisabled}
                          className="border-muted/80 h-9 text-sm"
                          placeholder="Nome do Key User principal"
                        />
                        <Input
                          id="clientResponsiblePhone"
                          value={localDtc.clientResponsiblePhone || ""}
                          onChange={(e) => handleFieldChange("clientResponsiblePhone", formatPhoneNumber(e.target.value))}
                          disabled={isFormDisabled}
                          className="border-muted/80 h-9 text-sm font-semibold"
                          placeholder="Celular/Telefone do Responsável"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Key Users Section */}
                  <div className="space-y-2 border p-4 rounded-lg bg-muted/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold">Key Users (Outros contatos-chave)</Label>
                        <p className="text-[10px] text-muted-foreground">Adicione outros contatos importantes da serventia.</p>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {/* WhatsApp & Contacts dropdown */}
                        {localDtc && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 font-bold"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Ações WhatsApp
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuLabel>Ações de Contatos</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleExportVcf} className="cursor-pointer gap-1.5">
                                <Download className="h-3.5 w-3.5 text-primary" />
                                Baixar Contatos (Arquivo .vcf)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleCopyPhones} className="cursor-pointer gap-1.5">
                                <Copy className="h-3.5 w-3.5 text-primary" />
                                Copiar Lista de Telefones
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleOpenWhatsappShare} className="cursor-pointer gap-1.5">
                                <Share2 className="h-3.5 w-3.5 text-primary" />
                                Enviar Lista no WhatsApp
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <Button
                          type="button"
                          onClick={addKeyUser}
                          disabled={isFormDisabled}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar Contato
                        </Button>
                      </div>
                    </div>

                    {(!localDtc.keyUsersList || localDtc.keyUsersList.length === 0) ? (
                      <p className="text-xs text-muted-foreground italic py-2 text-center bg-background/50 border border-dashed rounded-md">
                        Nenhum contato-chave adicional. Clique em Adicionar Contato.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {localDtc.keyUsersList.map((user, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              value={user.name}
                              onChange={(e) => updateKeyUser(idx, "name", e.target.value)}
                              disabled={isFormDisabled}
                              placeholder="Nome do contato"
                              className="border-muted/85 h-8 text-xs flex-1"
                            />
                            <Input
                              value={user.phone}
                              onChange={(e) => updateKeyUser(idx, "phone", formatPhoneNumber(e.target.value))}
                              disabled={isFormDisabled}
                              placeholder="Celular / Telefone"
                              className="border-muted/85 h-8 text-xs flex-1 font-semibold"
                            />
                            <Button
                              type="button"
                              onClick={() => removeKeyUser(idx)}
                              disabled={isFormDisabled}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone" className="text-xs font-bold">Telefone Serventia</Label>
                      <Input
                        id="clientPhone"
                        value={localDtc.clientPhone}
                        onChange={(e) => handleFieldChange("clientPhone", formatPhoneNumber(e.target.value))}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientEmail" className="text-xs font-bold">E-mail Serventia</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={localDtc.clientEmail}
                        onChange={(e) => handleFieldChange("clientEmail", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="contato@cartorio.com.br"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: INFRASTRUCTURE & ACCESS */}
            <TabsContent value="infra">
              <Card className="border-muted/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-primary">Infraestrutura, Bancos & Acesso Remoto</CardTitle>
                  <CardDescription className="text-xs">Informações sobre servidores, bancos de dados, conexões de acesso e chamados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="systemsInstalled" className="text-xs font-bold">Sistemas Instalados</Label>
                      <Input
                        id="systemsInstalled"
                        value={localDtc.systemsInstalled}
                        onChange={(e) => handleFieldChange("systemsInstalled", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="systemVersions" className="text-xs font-bold">Versões dos Sistemas</Label>
                      <Input
                        id="systemVersions"
                        value={localDtc.systemVersions}
                        onChange={(e) => handleFieldChange("systemVersions", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="Ex: v12.4.2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postgresVersion" className="text-xs font-bold">Versão do PostgreSQL</Label>
                      <Input
                        id="postgresVersion"
                        value={localDtc.postgresVersion}
                        onChange={(e) => handleFieldChange("postgresVersion", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="Ex: PostgreSQL 15.2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postgresAccessData" className="text-xs font-bold">Dados de Acesso PostgreSQL (IP, Porta, User)</Label>
                      <Input
                        id="postgresAccessData"
                        value={localDtc.postgresAccessData}
                        onChange={(e) => handleFieldChange("postgresAccessData", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="Ex: 192.168.1.250:5432, user: postgres"
                      />
                    </div>
                  </div>

                  <div className="border p-4 rounded-lg bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold">Houve Conversão de Dados?</Label>
                        <p className="text-[11px] text-muted-foreground">Marque se os dados de sistemas anteriores foram convertidos.</p>
                      </div>
                      <Select
                        value={localDtc.hadConversion ? "yes" : "no"}
                        onValueChange={(val) => handleFieldChange("hadConversion", val === "yes")}
                        disabled={isFormDisabled}
                      >
                        <SelectTrigger className="w-28 h-8 border-muted/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Sim</SelectItem>
                          <SelectItem value="no">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {localDtc.hadConversion && (
                      <div className="space-y-2 animate-fade-in">
                        <Label htmlFor="convertedData" className="text-xs font-bold">Dados Convertidos (Tabelas / Escopos Convertidos)</Label>
                        <Textarea
                          id="convertedData"
                          value={localDtc.convertedData}
                          onChange={(e) => handleFieldChange("convertedData", e.target.value)}
                          disabled={isFormDisabled}
                          rows={3}
                          className="border-muted/80 text-xs"
                          placeholder="Especifique o histórico migrado (ex: Livros de Notas de 2010 a 2025, Procurações...)"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="remoteAccessData" className="text-xs font-bold">Dados de Acesso Remoto (AnyDesk / RustDesk / TeamViewer)</Label>
                      <Input
                        id="remoteAccessData"
                        value={localDtc.remoteAccessData}
                        onChange={(e) => handleFieldChange("remoteAccessData", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="Ex: Anydesk: 123 456 789 (senha: cartorio123)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportCallNumber" className="text-xs font-bold">Número do Chamado Principal no 0800</Label>
                      <Input
                        id="supportCallNumber"
                        value={localDtc.supportCallNumber}
                        onChange={(e) => handleFieldChange("supportCallNumber", e.target.value)}
                        disabled={isFormDisabled}
                        className="border-muted/80 h-9 text-sm"
                        placeholder="Ex: #58129"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: IMPlANTATION PROCESS & RECAP */}
            <TabsContent value="processo">
              <Card className="border-muted/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-primary">Relato do Processo & Colaboradores</CardTitle>
                  <CardDescription className="text-xs">Observações sobre como ocorreu o treinamento, implantação e detalhes operacionais importantes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="implantationProcess" className="text-xs font-bold">Processo de Implantação</Label>
                    <Textarea
                      id="implantationProcess"
                      value={localDtc.implantationProcess}
                      onChange={(e) => handleFieldChange("implantationProcess", e.target.value)}
                      disabled={isFormDisabled}
                      rows={4}
                      className="border-muted/80 text-xs"
                      placeholder="Relate como ocorreu o processo de implantação, infraestrutura instalada, treinamento dos usuários e aceitação inicial..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postImplantationProcess" className="text-xs font-bold">Processo de Pós-Implantação / Regras Específicas do Cliente</Label>
                    <Textarea
                      id="postImplantationProcess"
                      value={localDtc.postImplantationProcess}
                      onChange={(e) => handleFieldChange("postImplantationProcess", e.target.value)}
                      disabled={isFormDisabled}
                      rows={4}
                      className="border-muted/80 text-xs"
                      placeholder="Informe regras operacionais acordadas, particularidades do fluxo de trabalho do cartório que o suporte deve conhecer..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employees" className="text-xs font-bold">Funcionários da Serventia (Principais colaboradores)</Label>
                      <Textarea
                        id="employees"
                        value={localDtc.employees}
                        onChange={(e) => handleFieldChange("employees", e.target.value)}
                        disabled={isFormDisabled}
                        rows={4}
                        className="border-muted/80 text-xs"
                        placeholder="Nomes dos colaboradores e suas respectivas funções na serventia (Ex: João - Notas, Maria - R.C.)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finalConsiderations" className="text-xs font-bold">Considerações Finais</Label>
                      <Textarea
                        id="finalConsiderations"
                        value={localDtc.finalConsiderations}
                        onChange={(e) => handleFieldChange("finalConsiderations", e.target.value)}
                        disabled={isFormDisabled}
                        rows={4}
                        className="border-muted/80 text-xs"
                        placeholder="Considerações adicionais ou notas de encerramento do projeto de transição..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: SUPPORT CALLS TABLE */}
            <TabsContent value="chamados">
              <Card className="border-muted/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-bold text-primary">Chamados em Aberto / Pendências</CardTitle>
                    <CardDescription className="text-xs">Registre chamados técnicos abertos ou pendências para acompanhamento da equipe de suporte.</CardDescription>
                  </div>
                  <Button
                    onClick={addTicket}
                    disabled={isFormDisabled}
                    variant="outline"
                    size="sm"
                    className="gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Pendência
                  </Button>
                </CardHeader>
                <CardContent>
                  {localDtc.tickets.length === 0 ? (
                    <div className="text-center py-10 bg-muted/10 border border-dashed rounded-lg">
                      <p className="text-xs text-muted-foreground">Não há chamados ou pendências pendentes cadastrados.</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Clique no botão "Adicionar Pendência" caso queira encaminhar chamados abertos ao suporte.</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-muted/40 border-b">
                            <th className="p-3 font-bold text-muted-foreground w-1/4">Chamado / N°</th>
                            <th className="p-3 font-bold text-muted-foreground w-1/2">Descrição da Pendência / Obice</th>
                            <th className="p-3 font-bold text-muted-foreground w-1/5">Status</th>
                            <th className="p-3 font-bold text-muted-foreground w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {localDtc.tickets.map((t, idx) => (
                            <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="p-2.5">
                                <Input
                                  value={t.number}
                                  onChange={(e) => updateTicket(idx, "number", e.target.value)}
                                  disabled={isFormDisabled}
                                  className="border-muted h-8 text-xs font-bold"
                                  placeholder="Ex: #59203"
                                />
                              </td>
                              <td className="p-2.5">
                                <Input
                                  value={t.description}
                                  onChange={(e) => updateTicket(idx, "description", e.target.value)}
                                  disabled={isFormDisabled}
                                  className="border-muted h-8 text-xs"
                                  placeholder="Ex: Aguardando correção do layout de selo digital"
                                />
                              </td>
                              <td className="p-2.5">
                                <Select
                                  value={t.status}
                                  onValueChange={(val) => updateTicket(idx, "status", val)}
                                  disabled={isFormDisabled}
                                >
                                  <SelectTrigger className="border-muted h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Aberto (Não iniciado)</SelectItem>
                                    <SelectItem value="in_progress">Em Tratativa</SelectItem>
                                    <SelectItem value="closed">Concluído / Resolvido</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2.5 text-center">
                                <Button
                                  onClick={() => removeTicket(idx)}
                                  disabled={isFormDisabled}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: REPORT PRINT PREVIEW */}
            <TabsContent value="visualizar">
              <Card className="border-muted/60 shadow-md">
                <CardHeader className="border-b flex flex-row items-center justify-between py-4 bg-muted/20">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Visualização de Impressão (DTC Oficial)</CardTitle>
                    <CardDescription className="text-xs">Visualize e formate o documento A4 exatamente como será impresso ou exportado para PDF.</CardDescription>
                  </div>
                  <Button
                    onClick={() => window.print()}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold gap-1.5 text-xs shadow"
                    size="sm"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir / Exportar PDF
                  </Button>
                </CardHeader>
                <CardContent className="py-6">
                  {/* Clean preview card resembling A4 paper */}
                  <div className="bg-white text-black p-8 border rounded-md shadow-inner max-w-[800px] mx-auto text-sm leading-relaxed font-serif">
                    <div className="border-2 border-black p-4 space-y-4">
                      {/* Document Header */}
                      <div className="text-center border-b-2 border-black pb-4">
                        <h2 className="text-xl font-bold tracking-tight uppercase">Documento de Transição de Conhecimento</h2>
                        <h3 className="text-base font-semibold text-gray-700">Implantação / Service Desk</h3>
                        {localDtc.supportCallNumber && (
                          <p className="text-xs font-bold text-gray-600 mt-1">Chamado de Origem: {localDtc.supportCallNumber}</p>
                        )}
                      </div>

                      {/* Main Grid */}
                      <div className="grid grid-cols-2 border-b-2 border-black pb-4 text-xs gap-y-2 gap-x-4">
                        <div><strong>Implantador Responsável:</strong> {localDtc.responsible || "__________________________"}</div>
                        <div><strong>Analista Suporte:</strong> {localDtc.analystResponsible || "__________________________"}</div>
                        <div className="col-span-2"><strong>Serventia (Cartório):</strong> {localDtc.serventia || "__________________________"}</div>
                        <div><strong>Oficial Titular:</strong> {localDtc.oficial || "__________________________"}</div>
                        <div><strong>Responsável Cartório:</strong> {localDtc.clientResponsible || "__________________________"}{localDtc.clientResponsiblePhone ? ` (${localDtc.clientResponsiblePhone})` : ""}</div>
                        <div className="col-span-2">
                          <strong>Key Users:</strong>{" "}
                          {localDtc.keyUsersList && localDtc.keyUsersList.length > 0
                            ? localDtc.keyUsersList.map(u => `${u.name}${u.phone ? ` (${u.phone})` : ""}`).join(", ")
                            : "Nenhum informado"}
                        </div>
                        <div><strong>Telefone:</strong> {localDtc.clientPhone || "__________________________"}</div>
                        <div><strong>E-mail:</strong> {localDtc.clientEmail || "__________________________"}</div>
                      </div>

                      {/* Systems and database */}
                      <div className="border-b-2 border-black pb-4 text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div><strong>Sistemas Instalados:</strong> {localDtc.systemsInstalled || "__________________________"}</div>
                          <div><strong>Versões dos Sistemas:</strong> {localDtc.systemVersions || "__________________________"}</div>
                          <div><strong>Versão PostgreSQL:</strong> {localDtc.postgresVersion || "__________________________"}</div>
                          <div><strong>Acesso PostgreSQL:</strong> {localDtc.postgresAccessData || "__________________________"}</div>
                        </div>
                        <div className="mt-2">
                          <strong>Dados de Acesso Remoto:</strong> {localDtc.remoteAccessData || "__________________________"}
                        </div>
                        <div className="mt-2">
                          <strong>Houve Conversão de Dados:</strong> {localDtc.hadConversion ? "Sim" : "Não"}
                        </div>
                        {localDtc.hadConversion && (
                          <div className="bg-gray-50 border p-2 mt-1 whitespace-pre-wrap">
                            <strong>Dados Convertidos:</strong> {localDtc.convertedData}
                          </div>
                        )}
                      </div>

                      {/* Process narrative text */}
                      <div className="border-b-2 border-black pb-4 text-xs space-y-3">
                        <div>
                          <strong className="block mb-1 text-sm uppercase">Processo de Implantação:</strong>
                          <div className="whitespace-pre-wrap min-h-16 pl-2 border-l-2 border-gray-300 italic">
                            {localDtc.implantationProcess || "(Nenhum relato técnico de implantação registrado)"}
                          </div>
                        </div>

                        <div>
                          <strong className="block mb-1 text-sm uppercase">Processo de Pós-Implantação (Suporte):</strong>
                          <div className="whitespace-pre-wrap min-h-16 pl-2 border-l-2 border-gray-300 italic">
                            {localDtc.postImplantationProcess || "(Nenhuma regra de pós-implantação cadastrada)"}
                          </div>
                        </div>

                        <div>
                          <strong className="block mb-1 text-sm uppercase">Funcionários da Serventia:</strong>
                          <div className="whitespace-pre-wrap min-h-12 pl-2 border-l-2 border-gray-300 italic">
                            {localDtc.employees || "(Nenhum colaborador listado)"}
                          </div>
                        </div>

                        <div>
                          <strong className="block mb-1 text-sm uppercase">Considerações Finais:</strong>
                          <div className="whitespace-pre-wrap min-h-12 pl-2 border-l-2 border-gray-300 italic">
                            {localDtc.finalConsiderations || "(Sem considerações finais registradas)"}
                          </div>
                        </div>
                      </div>

                      {/* Open tickets table */}
                      <div className="border-b-2 border-black pb-4 text-xs space-y-2">
                        <strong className="block text-sm uppercase">Pendências & Chamados de Suporte (0800):</strong>
                        {localDtc.tickets.length === 0 ? (
                          <p className="text-gray-500 italic">Nenhum chamado pendente registrado para transição.</p>
                        ) : (
                          <table className="w-full border-collapse border border-gray-400 text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-400 p-2 text-left w-1/4">Chamado / N°</th>
                                <th className="border border-gray-400 p-2 text-left w-1/2">Descrição da Pendência</th>
                                <th className="border border-gray-400 p-2 text-left w-1/4">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {localDtc.tickets.map((t, idx) => (
                                <tr key={idx}>
                                  <td className="border border-gray-400 p-2 font-bold">{t.number || "N/A"}</td>
                                  <td className="border border-gray-400 p-2">{t.description || "Sem descrição"}</td>
                                  <td className="border border-gray-400 p-2 capitalize">
                                    {t.status === "open" && "Aberto"}
                                    {t.status === "in_progress" && "Em Tratativa"}
                                    {t.status === "closed" && "Resolvido"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-8 text-center text-xs pt-10">
                        <div className="space-y-1">
                          <p className="border-t border-black pt-2 font-bold">{localDtc.responsible || "Implantador Responsável"}</p>
                          <p className="text-[10px] text-gray-500">Implantador de Sistemas</p>
                        </div>
                        <div className="space-y-1">
                          <p className="border-t border-black pt-2 font-bold">{localDtc.analystResponsible || "Analista de Suporte"}</p>
                          <p className="text-[10px] text-gray-500">Service Desk / Suporte</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* RENDER-ONLY PRINT PREVIEW TARGET */}
      {selectedProjectId && localDtc && (
        <div id="dtc-print-area" className="hidden print:block bg-white text-black p-8 text-sm font-serif">
          <div className="border-2 border-black p-6 space-y-6">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-4">
              <h2 className="text-2xl font-bold tracking-tight uppercase">Documento de Transição de Conhecimento</h2>
              <h3 className="text-lg font-semibold text-gray-700">Módulo Implantação / Service Desk</h3>
              {localDtc.supportCallNumber && (
                <p className="text-sm font-bold text-gray-600 mt-1">Chamado no 0800: {localDtc.supportCallNumber}</p>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 border-b-2 border-black pb-4 text-xs gap-y-3 gap-x-6">
              <div><strong>Implantador Responsável:</strong> {localDtc.responsible || "__________________________"}</div>
              <div><strong>Analista Suporte:</strong> {localDtc.analystResponsible || "__________________________"}</div>
              <div className="col-span-2"><strong>Serventia (Cartório):</strong> {localDtc.serventia || "__________________________"}</div>
              <div><strong>Oficial Titular:</strong> {localDtc.oficial || "__________________________"}</div>
              <div><strong>Responsável Cartório:</strong> {localDtc.clientResponsible || "__________________________"}{localDtc.clientResponsiblePhone ? ` (${localDtc.clientResponsiblePhone})` : ""}</div>
              <div className="col-span-2">
                <strong>Key Users:</strong>{" "}
                {localDtc.keyUsersList && localDtc.keyUsersList.length > 0
                  ? localDtc.keyUsersList.map(u => `${u.name}${u.phone ? ` (${u.phone})` : ""}`).join(", ")
                  : "Nenhum informado"}
              </div>
              <div><strong>Telefone:</strong> {localDtc.clientPhone || "__________________________"}</div>
              <div><strong>E-mail:</strong> {localDtc.clientEmail || "__________________________"}</div>
            </div>

            {/* Systems and database */}
            <div className="border-b-2 border-black pb-4 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Sistemas Instalados:</strong> {localDtc.systemsInstalled || "__________________________"}</div>
                <div><strong>Versões dos Sistemas:</strong> {localDtc.systemVersions || "__________________________"}</div>
                <div><strong>Versão PostgreSQL:</strong> {localDtc.postgresVersion || "__________________________"}</div>
                <div><strong>Acesso PostgreSQL:</strong> {localDtc.postgresAccessData || "__________________________"}</div>
              </div>
              <div>
                <strong>Dados de Acesso Remoto:</strong> {localDtc.remoteAccessData || "__________________________"}
              </div>
              <div>
                <strong>Houve Conversão de Dados:</strong> {localDtc.hadConversion ? "Sim" : "Não"}
              </div>
              {localDtc.hadConversion && (
                <div className="bg-gray-50 border p-3 mt-1 whitespace-pre-wrap">
                  <strong>Dados Convertidos:</strong> {localDtc.convertedData}
                </div>
              )}
            </div>

            {/* Narrative text */}
            <div className="border-b-2 border-black pb-4 text-xs space-y-4">
              <div>
                <strong className="block mb-1 text-sm uppercase">Processo de Implantação:</strong>
                <div className="whitespace-pre-wrap min-h-20 pl-2 border-l-2 border-gray-400 italic">
                  {localDtc.implantationProcess || "(Nenhum relato técnico registrado)"}
                </div>
              </div>

              <div>
                <strong className="block mb-1 text-sm uppercase">Processo de Pós-Implantação (Suporte):</strong>
                <div className="whitespace-pre-wrap min-h-20 pl-2 border-l-2 border-gray-400 italic">
                  {localDtc.postImplantationProcess || "(Nenhuma regra de pós-implantação acordada)"}
                </div>
              </div>

              <div>
                <strong className="block mb-1 text-sm uppercase">Funcionários da Serventia:</strong>
                <div className="whitespace-pre-wrap min-h-16 pl-2 border-l-2 border-gray-400 italic">
                  {localDtc.employees || "(Nenhum colaborador listado)"}
                </div>
              </div>

              <div>
                <strong className="block mb-1 text-sm uppercase">Considerações Finais:</strong>
                <div className="whitespace-pre-wrap min-h-16 pl-2 border-l-2 border-gray-400 italic">
                  {localDtc.finalConsiderations || "(Nenhuma consideração adicional)"}
                </div>
              </div>
            </div>

            {/* Tickets table */}
            <div className="border-b-2 border-black pb-4 text-xs space-y-3">
              <strong className="block text-sm uppercase">Pendências & Chamados de Suporte (0800):</strong>
              {localDtc.tickets.length === 0 ? (
                <p className="text-gray-500 italic">Nenhum chamado pendente encaminhado para transição.</p>
              ) : (
                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 p-2 text-left w-1/4">Chamado / N°</th>
                      <th className="border border-gray-400 p-2 text-left w-1/2">Descrição da Pendência</th>
                      <th className="border border-gray-400 p-2 text-left w-1/4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localDtc.tickets.map((t, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-400 p-2 font-bold">{t.number || "N/A"}</td>
                        <td className="border border-gray-400 p-2">{t.description || "Sem descrição"}</td>
                        <td className="border border-gray-400 p-2 capitalize">
                          {t.status === "open" && "Aberto"}
                          {t.status === "in_progress" && "Em Tratativa"}
                          {t.status === "closed" && "Resolvido"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-12 text-center text-xs pt-16">
              <div className="space-y-1">
                <p className="border-t border-black pt-2 font-bold">{localDtc.responsible || "Implantador Responsável"}</p>
                <p className="text-[10px] text-gray-500">Implantador de Sistemas</p>
              </div>
              <div className="space-y-1">
                <p className="border-t border-black pt-2 font-bold">{localDtc.analystResponsible || "Analista de Suporte"}</p>
                <p className="text-[10px] text-gray-500">Service Desk / Suporte</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
