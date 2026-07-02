import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { activityLogger } from "@/services/activityLogger";
import { useTimeline } from "@/hooks/useTimeline";
import { LogsTab } from "@/components/ProjectManagement/Tabs/LogsTab";
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
  Volume2,
  VolumeX,
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
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Star,
  GripVertical,
  TrendingUp,
  ListChecks,
  Lightbulb,
  Users,
  BarChart3,
  FileDown
} from "lucide-react";

interface KeyUserItem {
  name: string;
  phone: string;
}

const ALL_SYSTEMS = [
  "Orion TN",
  "Orion PRO",
  "Orion REG",
  "Modelos TN",
  "LCW",
  "SGA",
  "On Hand",
  "Orion GED",
  "e-Recepção",
  "e-Qualificação",
  "Cartflow"
];

// Ticket structure inside DTC
interface DTCTicket {
  number: string;
  description: string;
  status: "open" | "in_progress" | "closed";
}

interface RemoteAccessItem {
  system: "AnyDesk" | "TeamViewer" | "RustDesk" | "Outro";
  id: string;
  password?: string;
}

interface EmployeeItem {
  name: string;
  department: string;
  role: string;
}

interface ImplantationLogItem {
  date: string;
  description: string;
}

interface ImplantationPendingItem {
  title: string;
  status: string;
  department: string;
  assignedTo?: string;
  product?: string;
  description: string;
}

interface ImplantationSuggestionItem {
  title: string;
  status: string;
  department: string;
  assignedTo?: string;
  product?: string;
  description: string;
}

interface ImplantationGainItem {
  title: string;
  product?: string;
  department: string;
  description: string;
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
  systemVersionsList?: Record<string, string>;
  postgresVersion: string;
  postgresAccessData: string;
  postgresHost?: string;
  postgresUser?: string;
  postgresPassword?: string;
  hadConversion: boolean;
  convertedData: string;
  remoteAccessData: string;
  remoteAccessList?: RemoteAccessItem[];
  supportCallNumber: string;
  implantationProcess: string;
  implantationProcessLogs?: ImplantationLogItem[];
  implantationGainsList?: ImplantationGainItem[];
  implantationPendingList?: ImplantationPendingItem[];
  implantationSuggestionsList?: ImplantationSuggestionItem[];
  clientSatisfactionScore?: number;
  postImplantationProcess: string;
  employees: string;
  employeesList?: EmployeeItem[];
  finalConsiderations: string;
  tickets: DTCTicket[];
  status: "draft" | "submitted" | "approved";
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  soLogin?: string;
  soPassword?: string;
  osType?: string;
  osVersion?: string;
  approvedBy?: string;
}

import { RichTextEditor } from "@/components/ui/rich-text-editor";

const renderVal = (val?: string | number | null, fallback = "Não informado") => {
  if (val !== undefined && val !== null && String(val).trim() !== "") {
    return String(val);
  }
  return <span className="text-gray-400 italic font-normal">{fallback}</span>;
};

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

const getLexicalTextLength = (jsonStr: string): number => {
  if (!jsonStr) return 0;
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.root && parsed.root.children) {
      const getTextFromNodes = (nodes: any[]): string => {
        return nodes.map(node => {
          if (node.text) return node.text;
          if (node.children) return getTextFromNodes(node.children);
          return "";
        }).join("");
      };
      return getTextFromNodes(parsed.root.children).length;
    }
  } catch {
    // If parsing fails, it is plain text (legacy)
    return jsonStr.length;
  }
  return jsonStr.length;
};

const LexicalRenderer = ({ jsonStr, fallback }: { jsonStr: string; fallback: string }) => {
  if (!jsonStr) return <span>{fallback}</span>;
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.root || !parsed.root.children) {
      return <span>{jsonStr}</span>;
    }

    const renderNode = (node: any, index: number): React.ReactNode => {
      if (node.type === "text") {
        let element: React.ReactNode = node.text;
        if (node.format & 1) { // Bold
          element = <strong key={index}>{element}</strong>;
        }
        if (node.format & 2) { // Italic
          element = <em key={index}>{element}</em>;
        }
        if (node.format & 4) { // Underline
          element = <span key={index} style={{ textDecoration: "underline" }}>{element}</span>;
        }
        return <span key={index}>{element}</span>;
      }

      if (node.type === "paragraph") {
        return (
          <p key={index} className="mb-1 last:mb-0">
            {node.children ? node.children.map((child: any, idx: number) => renderNode(child, idx)) : null}
          </p>
        );
      }

      if (node.type === "list") {
        const Tag = node.tag === "ol" ? "ol" : "ul";
        return (
          <Tag key={index} className={cn("pl-4 mb-1", node.tag === "ol" ? "list-decimal" : "list-disc")}>
            {node.children ? node.children.map((child: any, idx: number) => renderNode(child, idx)) : null}
          </Tag>
        );
      }

      if (node.type === "listitem") {
        return (
          <li key={index}>
            {node.children ? node.children.map((child: any, idx: number) => renderNode(child, idx)) : null}
          </li>
        );
      }

      if (node.children) {
        return (
          <div key={index}>
            {node.children.map((child: any, idx: number) => renderNode(child, idx))}
          </div>
        );
      }

      return null;
    };

    return (
      <div className="space-y-0.5">
        {parsed.root.children.map((child: any, idx: number) => renderNode(child, idx))}
      </div>
    );
  } catch {
    // If JSON parsing fails, it's legacy plain text
    return <span className="whitespace-pre-wrap">{jsonStr}</span>;
  }
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

// ⑥ Sortable item wrapper for drag & drop lists
function SortableItem({ id, children }: { id: string; children: (dragHandleProps: React.HTMLAttributes<HTMLSpanElement>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function TransicaoPlaceholder() {
  const { fullName, isAdmin } = useAuth();
  const { updateProject } = useProjectsV2();
  const { addAutoLog } = useTimeline();
  const queryClient = useQueryClient();
  const { members = [] } = useTeamMembers();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showPgAccess, setShowPgAccess] = useState(false);
  const [showSoPassword, setShowSoPassword] = useState(false);
  const [showRemoteAccess, setShowRemoteAccess] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    "ident-cartorio": true,
    "ident-equipe": true,
    "infra-chamados": true,
    "infra-banco": true,
    "infra-sistemas": true,
    "infra-conversao": true,
    "processo-implantacao": true,
    "processo-colaboradores": true,
    "processo-ganhos": true,
    "processo-pendencias": true,
    "processo-sugestoes": true,
    "processo-consideracoes": true,
  });

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

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
    if (existingDtc) return {
      // defaults for new fields added after initial save (retrocompatibility)
      implantationProcessLogs: [],
      implantationGainsList: [],
      implantationPendingList: [],
      implantationSuggestionsList: [],
      keyUsersList: [],
      systemVersionsList: {},
      remoteAccessList: [],
      employeesList: [],
      tickets: [],
      // spread existing data last — overrides defaults with whatever was already saved
      ...existingDtc,
    };

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
      systemVersionsList: {},
      postgresVersion: project.stages?.environment?.postgresVersion || "",
      postgresAccessData: project.stages?.environment?.postgresAccessData || "",
      postgresHost: project.stages?.environment?.postgresHost || "",
      postgresUser: project.stages?.environment?.postgresUser || "",
      postgresPassword: project.stages?.environment?.postgresPassword || "",
      osType: project.stages?.environment?.osType || "",
      osVersion: project.stages?.environment?.osVersion || "",
      hadConversion: false,
      convertedData: "",
      remoteAccessData: "",
      remoteAccessList: project.stages?.environment?.remoteAccessList || [],
      soLogin: project.stages?.environment?.soLogin || "",
      soPassword: project.stages?.environment?.soPassword || "",
      supportCallNumber: project.ticketNumber || "",
      implantationProcess: "",
      implantationProcessLogs: [],
      implantationGainsList: [],
      implantationPendingList: [],
      implantationSuggestionsList: [],
      postImplantationProcess: "",
      employees: "",
      employeesList: [],
      finalConsiderations: "",
      tickets: [],
      status: "draft"
    };
  };

  const initialDtcValue = useMemo(() => {
    if (!project) return null;
    const dtc = (project.customFields?.dtc as DTCData | null) || getInitialDtc();
    
    // Sync environment accesses, OS credentials and postgres details from project's environment stage
    const envStage = project.stages?.environment;
    return {
      ...dtc,
      remoteAccessList: envStage?.remoteAccessList && envStage.remoteAccessList.length > 0
        ? envStage.remoteAccessList
        : dtc.remoteAccessList || [],
      soLogin: envStage?.soLogin || dtc.soLogin || "",
      soPassword: envStage?.soPassword || dtc.soPassword || "",
      postgresVersion: envStage?.postgresVersion || dtc.postgresVersion || "",
      postgresAccessData: envStage?.postgresAccessData || dtc.postgresAccessData || "",
      postgresHost: envStage?.postgresHost || dtc.postgresHost || "",
      postgresUser: envStage?.postgresUser || dtc.postgresUser || "",
      postgresPassword: envStage?.postgresPassword || dtc.postgresPassword || "",
      osType: envStage?.osType || dtc.osType || "",
      osVersion: envStage?.osVersion || dtc.osVersion || "",
    };
  }, [project]);

  const { data: localDtc, updateData: setLocalDtc, saveState } = useAutoSave<DTCData | null>(
    initialDtcValue,
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
            },
            environment: {
              remoteAccessList: newData.remoteAccessList,
              soLogin: newData.soLogin,
              soPassword: newData.soPassword,
              postgresVersion: newData.postgresVersion,
              postgresAccessData: newData.postgresAccessData,
              postgresHost: newData.postgresHost,
              postgresUser: newData.postgresUser,
              postgresPassword: newData.postgresPassword,
              osType: newData.osType,
              osVersion: newData.osVersion,
            }
          }
        }
      });
    },
    { debounceMs: 1000 }
  );

  // Migrate older keyUsers string and remoteAccessData to lists on the fly
  useEffect(() => {
    if (!localDtc) return;

    let needsUpdate = false;
    const updatedDtc = { ...localDtc };

    // Auto-fill ticket number if empty and project has one
    if (project?.ticketNumber && !localDtc.supportCallNumber) {
      updatedDtc.supportCallNumber = project.ticketNumber;
      needsUpdate = true;
    }

    if (!localDtc.keyUsersList) {
      const migratedList: KeyUserItem[] = [];
      if (localDtc.keyUsers) {
        const names = localDtc.keyUsers.split(",").map(n => n.trim()).filter(Boolean);
        names.forEach(name => {
          migratedList.push({ name, phone: "" });
        });
      }
      updatedDtc.keyUsersList = migratedList;
      updatedDtc.clientResponsiblePhone = localDtc.clientResponsiblePhone || "";
      needsUpdate = true;
    }

    if (!localDtc.remoteAccessList) {
      const migratedList: RemoteAccessItem[] = [];
      if (localDtc.remoteAccessData) {
        const lower = localDtc.remoteAccessData.toLowerCase();
        let sys: RemoteAccessItem["system"] = "AnyDesk";
        if (lower.includes("teamviewer") || lower.includes("tv")) {
          sys = "TeamViewer";
        } else if (lower.includes("rustdesk")) {
          sys = "RustDesk";
        }
        migratedList.push({
          system: sys,
          id: localDtc.remoteAccessData,
          password: ""
        });
      }
      updatedDtc.remoteAccessList = migratedList;
      needsUpdate = true;
    }

    if (localDtc.systemsInstalled && !localDtc.systemVersionsList) {
      const selectedSystems = localDtc.systemsInstalled.split(",").map(s => s.trim()).filter(Boolean);
      const versionsObj: Record<string, string> = {};
      
      if (selectedSystems.length === 1) {
        versionsObj[selectedSystems[0]] = localDtc.systemVersions || "";
      } else {
        selectedSystems.forEach(sys => {
          const regex = new RegExp(`${sys.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*\\(v?([^)]+)\\)`);
          const match = localDtc.systemVersions?.match(regex);
          if (match) {
            versionsObj[sys] = match[1];
          } else {
            versionsObj[sys] = "";
          }
        });
      }
      updatedDtc.systemVersionsList = versionsObj;
      needsUpdate = true;
    }

    if (localDtc.employees !== undefined && !localDtc.employeesList) {
      const migratedList: EmployeeItem[] = [];
      if (localDtc.employees) {
        const items = localDtc.employees.split(",").map(i => i.trim()).filter(Boolean);
        items.forEach(item => {
          const parts = item.split("-").map(p => p.trim());
          if (parts.length >= 2) {
            migratedList.push({ name: parts[0], department: parts[1], role: parts[2] || "" });
          } else {
            migratedList.push({ name: item, department: "", role: "" });
          }
        });
      }
      updatedDtc.employeesList = migratedList;
      needsUpdate = true;
    }

    if (needsUpdate) {
      setLocalDtc(updatedDtc);
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

        // Log timeline event
        let logMsg = "";
        if (newStatus === "submitted") {
          logMsg = `DTC enviado para validação por ${fullName || "Implantador"}.`;
        } else if (newStatus === "approved") {
          logMsg = `DTC homologado e aprovado por ${fullName || "Suporte/Gestor"}.`;
        } else if (newStatus === "draft") {
          logMsg = `DTC reaberto e retornado para rascunho por ${fullName || "Usuário"}.`;
        }
        if (logMsg) {
          await addAutoLog.mutateAsync({
            projectId: selectedProjectId,
            message: logMsg,
            metadata: {
              action: "dtc_status_change",
              status: newStatus
            }
          }).catch(err => console.error("Error logging timeline event:", err));
        }

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

  // Remote Access helper functions
  const addRemoteAccess = () => {
    if (!localDtc) return;
    const currentList = localDtc.remoteAccessList || [];
    handleFieldChange("remoteAccessList", [
      ...currentList,
      { system: "AnyDesk", id: "", password: "" }
    ]);
  };

  const removeRemoteAccess = (idx: number) => {
    if (!localDtc || !localDtc.remoteAccessList) return;
    handleFieldChange(
      "remoteAccessList",
      localDtc.remoteAccessList.filter((_, i) => i !== idx)
    );
  };

  const updateRemoteAccess = (idx: number, key: keyof RemoteAccessItem, val: any) => {
    if (!localDtc || !localDtc.remoteAccessList) return;
    const updated = [...localDtc.remoteAccessList];
    updated[idx] = {
      ...updated[idx],
      [key]: val
    };
    handleFieldChange("remoteAccessList", updated);
  };

  const addEmployee = () => {
    if (!localDtc) return;
    const currentList = localDtc.employeesList || [];
    handleFieldChange("employeesList", [
      ...currentList,
      { name: "", department: "", role: "" }
    ]);
  };

  const removeEmployee = (idx: number) => {
    if (!localDtc || !localDtc.employeesList) return;
    handleFieldChange(
      "employeesList",
      localDtc.employeesList.filter((_, i) => i !== idx)
    );
  };

  const updateEmployee = (idx: number, key: keyof EmployeeItem, val: any) => {
    if (!localDtc || !localDtc.employeesList) return;
    const updated = [...localDtc.employeesList];
    updated[idx] = {
      ...updated[idx],
      [key]: val
    };
    
    // Automatically rebuild the employees text string for backwards compatibility
    const joinedStr = updated
      .map(emp => {
        const parts = [emp.name];
        if (emp.department) parts.push(emp.department);
        if (emp.role) parts.push(emp.role);
        return parts.join(" - ");
      })
      .join(", ");
    
    setLocalDtc({
      ...localDtc,
      employeesList: updated,
      employees: joinedStr
    });
  };

  const addImplantationLog = () => {
    if (!localDtc) return;
    const currentList = localDtc.implantationProcessLogs || [];
    // Default to current local date
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    handleFieldChange("implantationProcessLogs", [
      ...currentList,
      { date: today, description: "" }
    ]);
  };

  const removeImplantationLog = (idx: number) => {
    if (!localDtc || !localDtc.implantationProcessLogs) return;
    handleFieldChange(
      "implantationProcessLogs",
      localDtc.implantationProcessLogs.filter((_, i) => i !== idx)
    );
  };

  const updateImplantationLog = (idx: number, key: keyof ImplantationLogItem, val: string) => {
    if (!localDtc || !localDtc.implantationProcessLogs) return;
    const updated = [...localDtc.implantationProcessLogs];
    updated[idx] = {
      ...updated[idx],
      [key]: val
    };
    handleFieldChange("implantationProcessLogs", updated);
  };

  const addImplantationPending = () => {
    if (!localDtc) return;
    const currentList = localDtc.implantationPendingList || [];
    handleFieldChange("implantationPendingList", [
      ...currentList,
      { title: "", status: "Pendente", department: "", assignedTo: "", product: "", description: "" }
    ]);
  };

  const removeImplantationPending = (idx: number) => {
    if (!localDtc || !localDtc.implantationPendingList) return;
    handleFieldChange(
      "implantationPendingList",
      localDtc.implantationPendingList.filter((_, i) => i !== idx)
    );
  };

  const updateImplantationPending = (idx: number, key: keyof ImplantationPendingItem, val: string) => {
    if (!localDtc || !localDtc.implantationPendingList) return;
    const updated = [...localDtc.implantationPendingList];
    updated[idx] = {
      ...updated[idx],
      [key]: val
    };
    handleFieldChange("implantationPendingList", updated);
  };

  const addImplantationGain = () => {
    if (!localDtc) return;
    const currentList = localDtc.implantationGainsList || [];
    handleFieldChange("implantationGainsList", [
      ...currentList,
      { title: "", product: "", department: "", description: "" }
    ]);
  };

  const removeImplantationGain = (idx: number) => {
    if (!localDtc || !localDtc.implantationGainsList) return;
    handleFieldChange(
      "implantationGainsList",
      localDtc.implantationGainsList.filter((_, i) => i !== idx)
    );
  };

  const updateImplantationGain = (idx: number, key: keyof ImplantationGainItem, val: string) => {
    if (!localDtc || !localDtc.implantationGainsList) return;
    const updated = [...localDtc.implantationGainsList];
    updated[idx] = { ...updated[idx], [key]: val };
    handleFieldChange("implantationGainsList", updated);
  };

  const addImplantationSuggestion = () => {
    if (!localDtc) return;
    const currentList = localDtc.implantationSuggestionsList || [];
    handleFieldChange("implantationSuggestionsList", [
      ...currentList,
      { title: "", status: "Pendente", department: "", assignedTo: "", product: "", description: "" }
    ]);
  };

  const removeImplantationSuggestion = (idx: number) => {
    if (!localDtc || !localDtc.implantationSuggestionsList) return;
    handleFieldChange(
      "implantationSuggestionsList",
      localDtc.implantationSuggestionsList.filter((_, i) => i !== idx)
    );
  };

  const updateImplantationSuggestion = (idx: number, key: keyof ImplantationSuggestionItem, val: string) => {
    if (!localDtc || !localDtc.implantationSuggestionsList) return;
    const updated = [...localDtc.implantationSuggestionsList];
    updated[idx] = {
      ...updated[idx],
      [key]: val
    };
    handleFieldChange("implantationSuggestionsList", updated);
  };

  const getIpValidationMessage = (val: string) => {
    if (!val) return null;
    
    // Check if it contains an IP address (IPv4)
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
    const ipMatch = val.match(ipRegex);
    
    // Check if it contains a port (e.g. :5432 or :1433)
    const portRegex = /:([0-9]{2,5})\b/;
    const portMatch = val.match(portRegex);
    
    const defaultPort = "5432";
    let msg = "";
    let isWarning = false;
    
    if (ipMatch) {
      msg = `IP ${ipMatch[0]} detectado. `;
      if (portMatch) {
        const port = portMatch[1];
        if (port === defaultPort) {
          msg += `Porta padrão (${port}) correta.`;
        } else {
          msg += `Porta customizada (${port}) detectada (Padrão: ${defaultPort}).`;
          isWarning = true;
        }
      } else {
        msg += `Atenção: Porta não especificada (Padrão: ${defaultPort}).`;
        isWarning = true;
      }
    } else {
      msg = "Atenção: Nenhum endereço de IP válido detectado no formato.";
      isWarning = true;
    }
    
    return { msg, isWarning };
  };

  const toggleSystemInstalled = (system: string) => {
    if (!localDtc) return;
    const current = localDtc.systemsInstalled 
      ? localDtc.systemsInstalled.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    
    const next = current.includes(system)
      ? current.filter(s => s !== system)
      : [...current, system];
    
    const nextStr = next.join(", ");
    
    // Clean up version of removed system
    const currentList = localDtc.systemVersionsList || {};
    const updatedList = { ...currentList };
    if (current.includes(system)) {
      delete updatedList[system];
    }
    
    const joinedVersions = next
      .map(s => {
        const v = updatedList[s];
        return v ? `${s} (v${v})` : s;
      })
      .join(", ");

    setLocalDtc({
      ...localDtc,
      systemsInstalled: nextStr,
      systemVersionsList: updatedList,
      systemVersions: joinedVersions
    });
  };

  const handleSystemVersionChange = (sys: string, version: string) => {
    if (!localDtc) return;
    const currentList = localDtc.systemVersionsList || {};
    const updatedList = {
      ...currentList,
      [sys]: version
    };
    
    const selectedSystems = localDtc.systemsInstalled
      ? localDtc.systemsInstalled.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    
    const joinedVersions = selectedSystems
      .map(s => {
        const v = updatedList[s];
        return v ? `${s} (v${v})` : s;
      })
      .join(", ");

    setLocalDtc({
      ...localDtc,
      systemVersionsList: updatedList,
      systemVersions: joinedVersions
    });
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const handleOpenDirectChat = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
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
      vcardText += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${groupName} - ${localDtc.clientResponsible}\r\nTEL;TYPE=CELL,VOICE:${localDtc.clientResponsiblePhone || ""}\r\nEND:VCARD\r\n`;
    }

    // Add other key users
    if (localDtc.keyUsersList && localDtc.keyUsersList.length > 0) {
      localDtc.keyUsersList.forEach(u => {
        if (u.name) {
          vcardText += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${groupName} - ${u.name}\r\nTEL;TYPE=CELL,VOICE:${u.phone || ""}\r\nEND:VCARD\r\n`;
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

  const handleExportZip = async () => {
    if (!localDtc) return;

    const groupName = prompt(
      "Digite o nome do grupo do WhatsApp (para prefixar os contatos):",
      `DTC - ${localDtc.serventia}`
    );
    if (groupName === null) return;

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    let hasContacts = false;

    // Helper to generate vCard string for a single contact
    const makeVcard = (name: string, phone: string) => {
      return `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${groupName} - ${name}\r\nTEL;TYPE=CELL,VOICE:${phone}\r\nEND:VCARD\r\n`;
    };

    // 1. Primary contact
    if (localDtc.clientResponsible) {
      const filename = `${groupName} - ${localDtc.clientResponsible}.vcf`.replace(/[\\/:*?"<>|]/g, "_");
      zip.file(filename, makeVcard(localDtc.clientResponsible, localDtc.clientResponsiblePhone || ""));
      hasContacts = true;
    }

    // 2. Key users
    if (localDtc.keyUsersList && localDtc.keyUsersList.length > 0) {
      localDtc.keyUsersList.forEach(u => {
        if (u.name) {
          const filename = `${groupName} - ${u.name}.vcf`.replace(/[\\/:*?"<>|]/g, "_");
          zip.file(filename, makeVcard(u.name, u.phone || ""));
          hasContacts = true;
        }
      });
    }

    if (!hasContacts) {
      toast.error("Nenhum contato com nome cadastrado para exportar.");
      return;
    }

    toast.loading("Gerando arquivo ZIP...");
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `contatos_${groupName.replace(/\s+/g, "_").toLowerCase()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss();
      toast.success("Arquivo ZIP de contatos baixado! Extraia-o e abra cada arquivo para salvar no PC.");
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao gerar o arquivo ZIP.");
      console.error(err);
    }
  };

  const handleCopyPhones = () => {
    if (!localDtc) return;

    const lines: string[] = [];
    if (localDtc.clientResponsible && localDtc.clientResponsiblePhone) {
      lines.push(`${localDtc.clientResponsible} - ${localDtc.clientResponsiblePhone}`);
    }
    if (localDtc.keyUsersList) {
      localDtc.keyUsersList.forEach(u => {
        if (u.name && u.phone) {
          lines.push(`${u.name} - ${u.phone}`);
        }
      });
    }

    if (lines.length === 0) {
      toast.error("Nenhum contato com telefone cadastrado para copiar.");
      return;
    }

    const copyText = lines.join("\n");
    navigator.clipboard.writeText(copyText);
    toast.success(`${lines.length} contato(s) copiado(s) para a área de transferência!`);
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

  // ⑥ Drag & Drop sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleGainDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !localDtc?.implantationGainsList) return;
    const oldIndex = localDtc.implantationGainsList.findIndex((_, i) => `gain-${i}` === active.id);
    const newIndex = localDtc.implantationGainsList.findIndex((_, i) => `gain-${i}` === over.id);
    handleFieldChange("implantationGainsList", arrayMove(localDtc.implantationGainsList, oldIndex, newIndex));
  };

  const handlePendingDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !localDtc?.implantationPendingList) return;
    const oldIndex = localDtc.implantationPendingList.findIndex((_, i) => `pend-${i}` === active.id);
    const newIndex = localDtc.implantationPendingList.findIndex((_, i) => `pend-${i}` === over.id);
    handleFieldChange("implantationPendingList", arrayMove(localDtc.implantationPendingList, oldIndex, newIndex));
  };

  const handleSuggestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !localDtc?.implantationSuggestionsList) return;
    const oldIndex = localDtc.implantationSuggestionsList.findIndex((_, i) => `sugg-${i}` === active.id);
    const newIndex = localDtc.implantationSuggestionsList.findIndex((_, i) => `sugg-${i}` === over.id);
    handleFieldChange("implantationSuggestionsList", arrayMove(localDtc.implantationSuggestionsList, oldIndex, newIndex));
  };

  // Ref for PDF export
  const printRef = useRef<HTMLDivElement>(null);

  // Speech TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [speechSection, setSpeechSection] = useState<string>("all");

  // Load available voices on mount/onvoiceschanged
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      // Filter pt-BR / Portuguese voices
      const ptVoices = voices.filter(v => v.lang.toLowerCase().includes("pt"));
      setAvailableVoices(ptVoices);
      if (ptVoices.length > 0 && !selectedVoiceURI) {
        const defaultVoice = ptVoices.find(v => v.default) || ptVoices[0];
        setSelectedVoiceURI(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceURI]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startSpeaking = useCallback(() => {
    if (!localDtc || typeof window === "undefined" || !window.speechSynthesis) return;

    // Helper to get text from Lexical format
    const getLexicalText = (jsonStr: string, fallback = "") => {
      if (!jsonStr) return fallback;
      try {
        const parsed = JSON.parse(jsonStr);
        if (!parsed.root || !parsed.root.children) {
          return jsonStr;
        }
        const extractText = (node: any): string => {
          if (node.type === "text") return node.text || "";
          if (node.children) return node.children.map(extractText).join(" ");
          return "";
        };
        return parsed.root.children.map(extractText).join(" ");
      } catch {
        return jsonStr;
      }
    };

    const parts: string[] = [];

    const addSection1 = () => {
      parts.push("Seção 1. Identificação da Serventia e Responsáveis.");
      parts.push(`Implantador responsável: ${localDtc.responsible || "Não informado"}.`);
      parts.push(`Analista de suporte: ${localDtc.analystResponsible || "Não informado"}.`);
      parts.push(`Serventia: ${localDtc.serventia || "Não informada"}.`);
      parts.push(`Oficial titular: ${localDtc.oficial || "Não informado"}.`);
      parts.push(`Responsável pelo Cartório: ${localDtc.clientResponsible || "Não informado"}.`);
      if (localDtc.supportCallNumber) {
        parts.push(`Chamado de origem: ${localDtc.supportCallNumber}.`);
      }
    };

    const addSection2 = () => {
      parts.push("Seção 2. Infraestrutura, Banco de Dados e Acessos.");
      parts.push(`Sistemas instalados: ${localDtc.systemsInstalled || "Não informado"}.`);
      parts.push(`Versões dos sistemas: ${localDtc.systemVersions || "Não informado"}.`);
      parts.push(`Versão do PostgreSQL: ${localDtc.postgresVersion || "Não informada"}.`);
      parts.push(`Local de instalação do banco: ${localDtc.postgresHost || "Não informado"}.`);

      if (localDtc.remoteAccessList && localDtc.remoteAccessList.length > 0) {
        parts.push("Acessos remotos disponibilizados:");
        localDtc.remoteAccessList.forEach(a => {
          parts.push(`${a.system}. Identificador ${a.id}.`);
        });
      }

      if (localDtc.osType || localDtc.osVersion) {
        parts.push(`Sistema operacional do servidor: ${localDtc.osType || ""} ${localDtc.osVersion || ""}.`);
      }
    };

    const addSection3 = () => {
      parts.push("Seção 3. Conversão de Banco de Dados.");
      if (localDtc.hadConversion) {
        parts.push(`Houve conversão de banco de dados.`);
        if (localDtc.convertedData) {
          parts.push(`Dados convertidos: ${localDtc.convertedData}.`);
        }
      } else {
        parts.push("Não houve conversão.");
      }
    };

    const addSection4 = () => {
      parts.push("Seção 4. Relato Técnico e Processo de Implantação.");
      const processText = getLexicalText(localDtc.implantationProcess);
      if (processText) {
        parts.push(`Relato do processo: ${processText}`);
      }

      if (localDtc.employeesList && localDtc.employeesList.length > 0) {
        parts.push("Funcionários capacitados:");
        parts.push(localDtc.employeesList.map(e => e.name).join(", "));
      }

      if (localDtc.implantationGainsList && localDtc.implantationGainsList.length > 0) {
        parts.push("Ganhos operacionais obtidos:");
        localDtc.implantationGainsList.forEach(g => {
          parts.push(`${g.title || ""}: ${getLexicalText(g.description)}`);
        });
      }
    };

    const addSection5 = () => {
      parts.push("Seção 5. Pendências e Chamados de Suporte 0800.");
      if (localDtc.implantationPendingList && localDtc.implantationPendingList.length > 0) {
        parts.push("Pendências da implantação:");
        localDtc.implantationPendingList.forEach(p => {
          parts.push(`${p.title || ""}. Status: ${p.status}.`);
        });
      } else {
        parts.push("Nenhuma pendência ou chamado registrado para transição.");
      }

      if (localDtc.clientSatisfactionScore) {
        const scores = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];
        parts.push(`Satisfação do cliente: ${scores[localDtc.clientSatisfactionScore]}.`);
      }
    };

    if (speechSection === "all") {
      parts.push("Iniciando a leitura completa do Documento de Transição de Conhecimento.");
      addSection1();
      addSection2();
      addSection3();
      addSection4();
      addSection5();
      parts.push("Leitura de todo o documento concluída.");
    } else if (speechSection === "1") {
      parts.push("Iniciando a leitura da Seção 1.");
      addSection1();
      parts.push("Fim da leitura da Seção 1.");
    } else if (speechSection === "2") {
      parts.push("Iniciando a leitura da Seção 2.");
      addSection2();
      parts.push("Fim da leitura da Seção 2.");
    } else if (speechSection === "3") {
      parts.push("Iniciando a leitura da Seção 3.");
      addSection3();
      parts.push("Fim da leitura da Seção 3.");
    } else if (speechSection === "4") {
      parts.push("Iniciando a leitura da Seção 4.");
      addSection4();
      parts.push("Fim da leitura da Seção 4.");
    } else if (speechSection === "5") {
      parts.push("Iniciando a leitura da Seção 5.");
      addSection5();
      parts.push("Fim da leitura da Seção 5.");
    }

    const fullText = parts.join(" ");
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = "pt-BR";
    utterance.rate = speechRate;
    
    if (selectedVoiceURI) {
      const activeVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (activeVoice) {
        utterance.voice = activeVoice;
      }
    } else {
      const ptVoice = availableVoices.find(v => v.lang.startsWith("pt"));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setSpeechUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  }, [localDtc, speechRate, selectedVoiceURI, availableVoices, speechSection]);

  const toggleSpeech = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    startSpeaking();
  }, [isSpeaking, startSpeaking]);

  // Restart speech if voice, rate or section changes while active
  useEffect(() => {
    if (isSpeaking && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const timer = setTimeout(() => {
        startSpeaking();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedVoiceURI, speechRate, speechSection]);

  // ② DTC Progress: count filled sections out of 10
  const dtcProgress = useMemo(() => {
    if (!localDtc) return 0;
    const checks = [
      !!localDtc.serventia?.trim(),
      !!localDtc.responsible?.trim(),
      !!localDtc.clientResponsible?.trim(),
      !!localDtc.systemsInstalled?.trim(),
      (localDtc.remoteAccessList?.length ?? 0) > 0 || !!localDtc.remoteAccessData?.trim(),
      !!localDtc.implantationProcess?.trim() || (localDtc.implantationProcessLogs?.length ?? 0) > 0,
      (localDtc.employeesList?.length ?? 0) > 0 || !!localDtc.employees?.trim(),
      (localDtc.implantationGainsList?.length ?? 0) > 0,
      (localDtc.implantationPendingList?.length ?? 0) > 0 || (localDtc.implantationSuggestionsList?.length ?? 0) > 0,
      !!localDtc.finalConsiderations?.trim(),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [localDtc]);

  // ③ Executive summary counters
  const execSummary = useMemo(() => {
    if (!localDtc) return { openPending: 0, gains: 0, suggestions: 0, employees: 0 };
    return {
      openPending: (localDtc.implantationPendingList ?? []).filter(p => p.status !== "Resolvido" && p.status !== "Cancelado").length,
      gains: (localDtc.implantationGainsList ?? []).length,
      suggestions: (localDtc.implantationSuggestionsList ?? []).length,
      employees: (localDtc.employeesList ?? []).length,
    };
  }, [localDtc]);

  // ⑦ Export to PDF using html2canvas + jsPDF
  const exportToPdf = useCallback(async () => {
    if (!printRef.current) return;
    try {
      toast.loading("Gerando PDF...", { id: "pdf-export" });
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      
      const element = printRef.current;
      element.classList.remove("hidden");
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      element.classList.add("hidden");
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `DTC_${localDtc?.serventia?.replace(/\s+/g, "_") || "Cartorio"}_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`;
      pdf.save(fileName);
      toast.success("PDF exportado com sucesso!", { id: "pdf-export" });
    } catch (err) {
      console.error(err);
          toast.error("Erro ao gerar PDF.", { id: "pdf-export" });
    }
  }, [localDtc]);

  return (
    <div className="container mx-auto pt-0 px-6 pb-6 space-y-6 max-w-7xl -mt-6">
      {/* CSS overrides for print layout */}
      <style>{`
        .dtc-document-font, .dtc-document-font * {
          font-family: 'Segoe UI', Calibri, Arial, sans-serif !important;
        }
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
                      onClick={exportToPdf}
                      variant="outline"
                      className="border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 font-bold gap-1 text-[11px] h-7 px-2.5"
                      size="sm"
                    >
                      <FileDown className="h-3 w-3" />
                      Exportar PDF
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

          {/* ② Progress Bar */}
          <div className="no-print space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground uppercase tracking-wider">Completude do DTC</span>
              <span className={cn(
                "font-extrabold tabular-nums",
                dtcProgress === 100 ? "text-emerald-500" : dtcProgress >= 50 ? "text-amber-500" : "text-rose-500"
              )}>{dtcProgress}%</span>
            </div>
            <Progress
              value={dtcProgress}
              className="h-2 bg-muted/60"
            />
          </div>

          {/* ③ Executive Summary */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <ListChecks className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pendências abertas</p>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 leading-tight">{execSummary.openPending}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Ganhos registrados</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{execSummary.gains}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <Lightbulb className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sugestões</p>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400 leading-tight">{execSummary.suggestions}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
              <Users className="h-5 w-5 text-purple-500 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Colaboradores</p>
                <p className="text-xl font-black text-purple-600 dark:text-purple-400 leading-tight">{execSummary.employees}</p>
              </div>
            </div>
          </div>

          {/* Form Tabs */}
          <Tabs defaultValue="geral" className="no-print w-full space-y-4">
            <TabsList className="grid grid-cols-6 w-full h-11 bg-muted/60 p-1 border">
              <TabsTrigger value="geral" className="text-xs font-bold">Identificação</TabsTrigger>
              <TabsTrigger value="infra" className="text-xs font-bold">Infra & Acesso</TabsTrigger>
              <TabsTrigger value="processo" className="text-xs font-bold">Relato Técnico</TabsTrigger>
              <TabsTrigger value="chamados" className="text-xs font-bold">Chamados pendentes</TabsTrigger>
              <TabsTrigger value="historico" className="text-xs font-bold flex items-center gap-1">
                <History className="h-3.5 w-3.5 text-primary" />
                Histórico
              </TabsTrigger>
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
                <CardContent className="space-y-6">
                  {/* Sub-seção 1: Dados do Cartório */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("ident-cartorio")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                          1. Dados do Cartório
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["ident-cartorio"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    {!collapsedSections["ident-cartorio"] && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1">
                          <Label htmlFor="serventia" className="text-[11px] font-bold">Serventia (Cartório)</Label>
                          <Input
                            id="serventia"
                            value={localDtc.serventia}
                            onChange={(e) => handleFieldChange("serventia", e.target.value)}
                            disabled={isFormDisabled}
                            className="border-muted/80 h-8 text-xs font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="oficial" className="text-[11px] font-bold">Oficial do Cartório</Label>
                          <Input
                            id="oficial"
                            value={localDtc.oficial}
                            onChange={(e) => handleFieldChange("oficial", e.target.value)}
                            disabled={isFormDisabled}
                            className="border-muted/80 h-8 text-xs"
                            placeholder="Nome do Oficial / Titular"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="clientPhone" className="text-[11px] font-bold">Telefone Serventia</Label>
                          <div className="relative flex items-center">
                            <Input
                              id="clientPhone"
                              value={localDtc.clientPhone}
                              onChange={(e) => handleFieldChange("clientPhone", formatPhoneNumber(e.target.value))}
                              disabled={isFormDisabled}
                              className="border-muted/80 h-8 text-xs pr-8"
                              placeholder="(00) 00000-0000"
                            />
                            {localDtc.clientPhone && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDirectChat(localDtc.clientPhone)}
                                className="absolute right-1 h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-full"
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="clientEmail" className="text-[11px] font-bold">E-mail Serventia</Label>
                          <Input
                            id="clientEmail"
                            type="email"
                            value={localDtc.clientEmail}
                            onChange={(e) => handleFieldChange("clientEmail", e.target.value)}
                            disabled={isFormDisabled}
                            className={cn(
                              "border-muted/80 h-8 text-xs",
                              localDtc.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localDtc.clientEmail) && "border-rose-500 focus-visible:ring-rose-500"
                            )}
                            placeholder="contato@cartorio.com.br"
                          />
                          {localDtc.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localDtc.clientEmail) && (
                            <p className="text-[10px] text-rose-500 mt-0.5">Formato de e-mail inválido.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 2: Equipe & Contatos */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("ident-equipe")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        2. Equipe de Transição & Contatos-Chave
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["ident-equipe"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    {!collapsedSections["ident-equipe"] && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1 flex flex-col justify-end">
                            <Label htmlFor="responsible" className="text-[11px] font-bold mb-1">Implantador Responsável (DTC)</Label>
                            <AutocompleteInput
                              value={localDtc.responsible}
                              onChange={(val) => handleFieldChange("responsible", val)}
                              disabled={isFormDisabled}
                              placeholder="Selecione o implantador..."
                              className="border-muted/80 h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1 flex flex-col justify-end">
                            <Label htmlFor="analystResponsible" className="text-[11px] font-bold mb-1">Responsável pelo pós implantação</Label>
                            <AutocompleteInput
                              value={localDtc.analystResponsible}
                              onChange={(val) => handleFieldChange("analystResponsible", val)}
                              disabled={isFormDisabled}
                              placeholder="Selecione o analista..."
                              className="border-muted/80 h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="clientResponsible" className="text-[11px] font-bold">Responsável / Contato Principal (Cliente)</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              id="clientResponsible"
                              value={localDtc.clientResponsible}
                              onChange={(e) => handleFieldChange("clientResponsible", e.target.value)}
                              disabled={isFormDisabled}
                              className="border-muted/80 h-8 text-xs"
                              placeholder="Nome do contato principal"
                            />
                            <div className="relative flex items-center">
                              <Input
                                id="clientResponsiblePhone"
                                value={localDtc.clientResponsiblePhone || ""}
                                onChange={(e) => handleFieldChange("clientResponsiblePhone", formatPhoneNumber(e.target.value))}
                                disabled={isFormDisabled}
                                className="border-muted/80 h-8 text-xs font-semibold pr-8"
                                placeholder="Celular/Telefone do Responsável"
                              />
                              {localDtc.clientResponsiblePhone && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDirectChat(localDtc.clientResponsiblePhone)}
                                  className="absolute right-1 h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-full"
                                  title="Abrir conversa no WhatsApp"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Key Users Section */}
                        <div className="space-y-2 border p-3 rounded-lg bg-muted/10 mt-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <Label className="text-[11px] font-bold">Key Users (Outros contatos-chave)</Label>
                              <p className="text-[9px] text-muted-foreground">Adicione outros contatos importantes da serventia.</p>
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
                                      className="h-6.5 text-[10px] gap-1 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 font-bold"
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
                                      Baixar Arquivo Único (.vcf para Celular)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportZip} className="cursor-pointer gap-1.5">
                                      <Download className="h-3.5 w-3.5 text-primary" />
                                      Baixar Contatos Separados (.zip para PC)
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
                                className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                              >
                                <Plus className="h-3 w-3" />
                                Adicionar Contato
                              </Button>
                            </div>
                          </div>

                          {(!localDtc.keyUsersList || localDtc.keyUsersList.length === 0) ? (
                            <p className="text-[11px] text-muted-foreground italic py-1.5 text-center bg-background/50 border border-dashed rounded-md">
                              Nenhum contato-chave adicional. Clique em Adicionar Contato.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                              {localDtc.keyUsersList.map((user, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-background p-1.5 border rounded-md shadow-2xs">
                                  <Input
                                    value={user.name}
                                    onChange={(e) => updateKeyUser(idx, "name", e.target.value)}
                                    disabled={isFormDisabled}
                                    placeholder="Nome"
                                    className="border-muted/80 h-7 text-xs flex-1"
                                  />
                                  <div className="relative flex items-center flex-1">
                                    <Input
                                      value={user.phone}
                                      onChange={(e) => updateKeyUser(idx, "phone", formatPhoneNumber(e.target.value))}
                                      disabled={isFormDisabled}
                                      placeholder="Telefone"
                                      className="border-muted/80 h-7 text-xs font-semibold pr-7 flex-1"
                                    />
                                    {user.phone && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenDirectChat(user.phone)}
                                        className="absolute right-0.5 h-5 w-5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-full"
                                        title="WhatsApp"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={() => removeKeyUser(idx)}
                                    disabled={isFormDisabled}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                <CardContent className="space-y-6">
                  
                  {/* Sub-seção 1: Controle de Chamados & Acessos Remotos */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("infra-chamados")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        1. Controle de Chamados & Acessos Remotos
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["infra-chamados"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    {!collapsedSections["infra-chamados"] && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                          <div className="space-y-1.5">
                            <Label htmlFor="supportCallNumber" className="text-[11px] font-bold">Número do Chamado Principal no 0800</Label>
                            <Input
                              id="supportCallNumber"
                              value={localDtc.supportCallNumber}
                              onChange={(e) => handleFieldChange("supportCallNumber", e.target.value)}
                              disabled={isFormDisabled}
                              className="border-muted/80 h-8 text-xs font-semibold"
                              placeholder="Ex: #58129"
                            />
                          </div>
                          
                          {/* Status & Downloads Panel */}
                          <div className="space-y-1.5 border p-2.5 rounded-lg bg-muted/20 flex flex-col justify-between min-h-[76px] self-stretch">
                            <div>
                              <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                                Status & Downloads de TI
                              </Label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className={cn(
                                  "h-2 w-2 rounded-full animate-pulse",
                                  localDtc.postgresAccessData && (localDtc.remoteAccessList?.length || 0) > 0
                                    ? "bg-emerald-500"
                                    : "bg-amber-500"
                                )} />
                                <span className="text-[11px] font-bold text-foreground">
                                  {localDtc.postgresAccessData && (localDtc.remoteAccessList?.length || 0) > 0
                                    ? "Estrutura Pronta para Acesso"
                                    : "Pendente: Preencha Acesso e Banco"}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 items-center mt-2 border-t pt-2">
                              <span className="text-[9px] text-muted-foreground mr-1">Utilitários:</span>
                              <a href="https://anydesk.com/download" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:underline bg-background border px-1.5 py-0.5 rounded shadow-2xs">
                                AnyDesk <ExternalLink className="h-2 w-2" />
                              </a>
                              <a href="https://rustdesk.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:underline bg-background border px-1.5 py-0.5 rounded shadow-2xs">
                                RustDesk <ExternalLink className="h-2 w-2" />
                              </a>
                              <a href="https://www.teamviewer.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:underline bg-background border px-1.5 py-0.5 rounded shadow-2xs">
                                TeamViewer <ExternalLink className="h-2 w-2" />
                              </a>
                              <a href="https://www.pgadmin.org/download/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:underline bg-background border px-1.5 py-0.5 rounded shadow-2xs">
                                pgAdmin <ExternalLink className="h-2 w-2" />
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Remote Access Connections Section */}
                        <div className="space-y-2 border p-3 rounded-lg bg-muted/10">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-[11px] font-bold">Acessos Remotos (AnyDesk / TeamViewer)</Label>
                              <p className="text-[9px] text-muted-foreground">Cadastre um ou mais acessos para a serventia.</p>
                            </div>
                            <Button
                              type="button"
                              onClick={addRemoteAccess}
                              disabled={isFormDisabled}
                              variant="outline"
                              size="sm"
                              className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                            >
                              <Plus className="h-3 w-3" />
                              Adicionar Acesso
                            </Button>
                          </div>

                          {(!localDtc.remoteAccessList || localDtc.remoteAccessList.length === 0) ? (
                            <p className="text-[11px] text-muted-foreground italic py-1.5 text-center bg-background/50 border border-dashed rounded-md">
                              Nenhum acesso remoto cadastrado. Clique em Adicionar Acesso.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                              {localDtc.remoteAccessList.map((access, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-background p-1.5 border rounded-md shadow-2xs">
                                  {/* System Select */}
                                  <Select
                                    value={access.system}
                                    onValueChange={(val: any) => updateRemoteAccess(idx, "system", val)}
                                    disabled={isFormDisabled}
                                  >
                                    <SelectTrigger className="w-28 h-7 text-xs border-muted/80 shrink-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AnyDesk" className="text-xs">AnyDesk</SelectItem>
                                      <SelectItem value="TeamViewer" className="text-xs">TeamViewer</SelectItem>
                                      <SelectItem value="RustDesk" className="text-xs">RustDesk</SelectItem>
                                      <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {/* ID Input */}
                                  <Input
                                    value={access.id}
                                    onChange={(e) => updateRemoteAccess(idx, "id", e.target.value)}
                                    disabled={isFormDisabled}
                                    placeholder="ID"
                                    className="border-muted/80 h-7 text-xs flex-1"
                                  />

                                  {/* Password Input with inline Copy */}
                                  <div className="relative flex items-center flex-1">
                                    <Input
                                      value={access.password || ""}
                                      onChange={(e) => updateRemoteAccess(idx, "password", e.target.value)}
                                      disabled={isFormDisabled}
                                      placeholder="Senha"
                                      className="border-muted/80 h-7 text-xs pr-7 flex-1"
                                    />
                                    {access.password && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleCopyText(access.password || "", "Senha")}
                                        className="absolute right-0.5 h-5 w-5 text-muted-foreground hover:text-foreground rounded-full"
                                        title="Copiar senha"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>

                                  {/* Remove Button */}
                                  <Button
                                    type="button"
                                    onClick={() => removeRemoteAccess(idx)}
                                    disabled={isFormDisabled}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* OS Credentials Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-3 rounded-lg bg-muted/10 mt-3 col-span-1 md:col-span-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="dtcSoLogin" className="text-[11px] font-bold">Usuário do Sistema Operacional (SO)</Label>
                            <Input
                              id="dtcSoLogin"
                              value={localDtc.soLogin || ""}
                              onChange={(e) => handleFieldChange("soLogin", e.target.value)}
                              disabled={isFormDisabled}
                              className="border-muted/80 h-8 text-xs bg-background"
                              placeholder="Ex: Administrator"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label htmlFor="dtcSoPassword" className="text-[11px] font-bold">Senha do Sistema Operacional (SO)</Label>
                            <div className="relative flex items-center">
                              <Input
                                id="dtcSoPassword"
                                type={showSoPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={localDtc.soPassword || ""}
                                onChange={(e) => handleFieldChange("soPassword", e.target.value)}
                                disabled={isFormDisabled}
                                className="border-muted/80 h-8 text-xs pr-16 bg-background"
                                placeholder="Senha do SO..."
                              />
                              <div className="absolute right-1 flex items-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setShowSoPassword(!showSoPassword)}
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                                  title={showSoPassword ? "Ocultar senha" : "Ver senha"}
                                >
                                  {showSoPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyText(localDtc.soPassword || "", "Senha do SO")}
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                                  title="Copiar senha"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Tipo de SO */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold">Sistema Operacional (SO)</Label>
                            <Select
                              value={localDtc.osType || ""}
                              onValueChange={(val) => handleFieldChange("osType", val)}
                              disabled={isFormDisabled}
                            >
                              <SelectTrigger className="w-full h-8 text-xs border-muted/80 bg-background">
                                <SelectValue placeholder="Selecione o SO..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Windows" className="text-xs">Windows</SelectItem>
                                <SelectItem value="Linux" className="text-xs">Linux</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Versão do SO */}
                          <div className="space-y-1.5">
                            <Label htmlFor="dtcOsVersion" className="text-[11px] font-bold">Versão do Sistema Operacional</Label>
                            <Input
                              id="dtcOsVersion"
                              value={localDtc.osVersion || ""}
                              onChange={(e) => handleFieldChange("osVersion", e.target.value)}
                              disabled={isFormDisabled}
                              className="border-muted/80 h-8 text-xs bg-background"
                              placeholder={localDtc.osType === "Linux" ? "Ex: Ubuntu 22.04" : "Ex: Windows Server 2022"}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 2: Banco de Dados PostgreSQL */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("infra-banco")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        2. Banco de Dados PostgreSQL
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["infra-banco"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["infra-banco"] && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1.5">
                          <Label htmlFor="postgresVersion" className="text-[11px] font-bold">Versão do PostgreSQL</Label>
                          <Input
                            id="postgresVersion"
                            value={localDtc.postgresVersion}
                            onChange={(e) => handleFieldChange("postgresVersion", e.target.value)}
                            disabled={isFormDisabled}
                            className="border-muted/80 h-8 text-xs"
                            placeholder="Ex: PostgreSQL 17"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="postgresHost" className="text-[11px] font-bold">Local de Instalação (IP / Porta)</Label>
                          <Input
                            id="postgresHost"
                            value={localDtc.postgresHost || ""}
                            onChange={(e) => handleFieldChange("postgresHost", e.target.value)}
                            disabled={isFormDisabled}
                            className="border-muted/80 h-8 text-xs"
                            placeholder="Ex: 192.168.1.10:5432"
                          />
                          {(() => {
                            const validation = getIpValidationMessage(localDtc.postgresHost || "");
                            if (!validation) return null;
                            return (
                              <span className={cn(
                                "text-[10px] font-semibold mt-1 block",
                                validation.isWarning ? "text-amber-500" : "text-emerald-600"
                              )}>
                                {validation.isWarning ? "⚠ " : "✓ "}{validation.msg}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="postgresUser" className="text-[11px] font-bold">Usuário do Banco</Label>
                          <Input
                            id="postgresUser"
                            value={localDtc.postgresUser || ""}
                            onChange={(e) => handleFieldChange("postgresUser", e.target.value)}
                            disabled={isFormDisabled}
                            className="border-muted/80 h-8 text-xs"
                            placeholder="Ex: postgres"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="postgresPassword" className="text-[11px] font-bold">Senha do Banco</Label>
                          <div className="relative flex items-center">
                            <Input
                              id="postgresPassword"
                              type={showPgAccess ? "text" : "password"}
                              autoComplete="new-password"
                              value={localDtc.postgresPassword || ""}
                              onChange={(e) => handleFieldChange("postgresPassword", e.target.value)}
                              disabled={isFormDisabled}
                              className="border-muted/80 h-8 text-xs pr-16"
                              placeholder="Senha..."
                            />
                            <div className="absolute right-1 flex items-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPgAccess(!showPgAccess)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                                title={showPgAccess ? "Ocultar senha" : "Ver senha"}
                              >
                                {showPgAccess ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyText(localDtc.postgresPassword || "", "Senha do PostgreSQL")}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                                title="Copiar dados"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 3: Sistemas Instalados & Versões */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("infra-sistemas")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        3. Sistemas Instalados & Versões
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["infra-sistemas"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["infra-sistemas"] && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Systems Installed (Badge pills select) */}
                        <div className="space-y-1.5">
                          <Label htmlFor="systemsInstalled" className="text-[11px] font-bold">Sistemas Instalados</Label>
                          <Input
                            id="systemsInstalled"
                            value={localDtc.systemsInstalled}
                            onChange={(e) => handleFieldChange("systemsInstalled", e.target.value)}
                            disabled={isFormDisabled}
                            className="border-muted/80 h-8 text-xs font-semibold"
                            placeholder="Ex: Orion TN, LCW, SGA"
                          />
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ALL_SYSTEMS.map(sys => {
                              const isSelected = localDtc.systemsInstalled
                                ? localDtc.systemsInstalled.split(",").map(s => s.trim()).includes(sys)
                                : false;
                              return (
                                <Badge
                                  key={sys}
                                  variant={isSelected ? "default" : "outline"}
                                  className={cn(
                                    "cursor-pointer text-[10px] px-2 py-0.5 select-none transition-all",
                                    isSelected 
                                      ? "bg-primary text-primary-foreground hover:bg-primary/95" 
                                      : "border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                                  )}
                                  onClick={() => !isFormDisabled && toggleSystemInstalled(sys)}
                                >
                                  {sys}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dynamic System Versions Grid */}
                        {(() => {
                          const selectedSystemsList = localDtc.systemsInstalled
                            ? localDtc.systemsInstalled.split(",").map(s => s.trim()).filter(Boolean)
                            : [];
                          if (selectedSystemsList.length === 0) return null;
                          return (
                            <div className="border p-3 rounded-lg bg-muted/5 space-y-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="border-b pb-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Versões dos Sistemas Selecionados</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {selectedSystemsList.map((sys) => {
                                  const currentVersion = localDtc.systemVersionsList?.[sys] || "";
                                  return (
                                    <div key={sys} className="space-y-1">
                                      <Label htmlFor={`version-${sys}`} className="text-[10px] font-bold text-muted-foreground">
                                        Versão do {sys}
                                      </Label>
                                      <Input
                                        id={`version-${sys}`}
                                        value={currentVersion}
                                        onChange={(e) => handleSystemVersionChange(sys, e.target.value)}
                                        disabled={isFormDisabled}
                                        className="border-muted/80 h-7.5 text-xs bg-background"
                                        placeholder="Ex: 05.92.01"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 4: Conversão de Dados */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("infra-conversao")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        4. Conversão de Dados
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["infra-conversao"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["infra-conversao"] && (
                      <div className="border p-3 rounded-lg bg-muted/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold">Houve Conversão de Dados?</Label>
                            <p className="text-[10px] text-muted-foreground">Marque se os dados de sistemas anteriores foram convertidos.</p>
                          </div>
                          <Select
                            value={localDtc.hadConversion ? "yes" : "no"}
                            onValueChange={(val) => handleFieldChange("hadConversion", val === "yes")}
                            disabled={isFormDisabled}
                          >
                            <SelectTrigger className="w-24 h-7 text-xs border-muted/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes" className="text-xs">Sim</SelectItem>
                              <SelectItem value="no" className="text-xs">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {localDtc.hadConversion && (
                          <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <Label htmlFor="convertedData" className="text-[11px] font-bold">Dados Convertidos (Tabelas / Escopos)</Label>
                            <Textarea
                              id="convertedData"
                              value={localDtc.convertedData}
                              onChange={(e) => handleFieldChange("convertedData", e.target.value)}
                              disabled={isFormDisabled}
                              className="border-muted/80 text-xs min-h-[60px] resize-y"
                              placeholder="Especifique o histórico migrado (ex: Livros de Notas de 2010 a 2025, Procurações...)"
                            />
                          </div>
                        )}
                      </div>
                    )}
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
                <CardContent className="space-y-6">
                  
                  {/* Sub-seção 1: Processo de Implantação */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("processo-implantacao")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        1. Processo de Implantação
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["processo-implantacao"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["processo-implantacao"] && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1.5">
                          <Label htmlFor="implantationProcess" className="text-xs font-bold text-muted-foreground">Relato Geral do Processo de Implantação</Label>
                          <RichTextEditor
                            content={localDtc.implantationProcess}
                            onChange={(c) => handleFieldChange("implantationProcess", c)}
                            placeholder="Relate como ocorreu o processo de implantação, infraestrutura instalada, treinamento dos usuários e aceitação inicial..."
                            editable={!isFormDisabled}
                          />
                          {(() => {
                            const count = getLexicalTextLength(localDtc.implantationProcess || "");
                            const isValid = count >= 50;
                            return (
                              <div className="flex justify-between items-center text-[10px] mt-0.5 pb-2">
                                <span className={cn("font-semibold", isValid ? "text-emerald-600" : "text-amber-500")}>
                                  {isValid ? "✓ Relato completo" : "⚠ Relato muito curto (mínimo 50 caracteres)"}
                                </span>
                                <span className="text-muted-foreground">{count} caracteres</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Daily Activity Logs */}
                        <div className="pt-3 border-t space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-[11px] font-bold text-muted-foreground">Relatos Diários de Atividades</Label>
                              <p className="text-[9px] text-muted-foreground">Registre o que foi feito em datas específicas da implantação.</p>
                            </div>
                            <Button
                              type="button"
                              onClick={addImplantationLog}
                              disabled={isFormDisabled}
                              variant="outline"
                              size="sm"
                              className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                            >
                              <Plus className="h-3 w-3" />
                              Adicionar Relato por Data
                            </Button>
                          </div>

                          {(!localDtc.implantationProcessLogs || localDtc.implantationProcessLogs.length === 0) ? (
                            <p className="text-[11px] text-muted-foreground italic py-1.5 text-center bg-background/50 border border-dashed rounded-md">
                              Nenhum relato diário cadastrado. Clique em Adicionar Relato por Data.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {localDtc.implantationProcessLogs.map((log, idx) => (
                                <div key={idx} className="bg-background p-3 border rounded-md shadow-2xs space-y-2 relative">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Data da Atividade:</Label>
                                      <Input
                                        type="date"
                                        value={log.date}
                                        onChange={(e) => updateImplantationLog(idx, "date", e.target.value)}
                                        disabled={isFormDisabled}
                                        className="border-muted/80 h-7 text-xs w-36"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      onClick={() => removeImplantationLog(idx)}
                                      disabled={isFormDisabled}
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full"
                                      title="Remover este relato"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Atividades Realizadas:</Label>
                                    <Textarea
                                      value={log.description}
                                      onChange={(e) => updateImplantationLog(idx, "description", e.target.value)}
                                      disabled={isFormDisabled}
                                      placeholder="Descreva detalhadamente o que foi realizado nesta data..."
                                      className="border-muted/80 text-xs min-h-[50px] w-full py-1.5 px-2.5 resize-y"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 2: Colaboradores da Serventia */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("processo-colaboradores")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        2. Principais colaboradores da serventia
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["processo-colaboradores"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["processo-colaboradores"] && (
                      <div className="space-y-2 border p-3 rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold">Principais colaboradores cadastrados</Label>
                            <p className="text-[9px] text-muted-foreground">Cadastre os principais contatos operacionais por setor.</p>
                          </div>
                          <Button
                            type="button"
                            onClick={addEmployee}
                            disabled={isFormDisabled}
                            variant="outline"
                            size="sm"
                            className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar Funcionário
                          </Button>
                        </div>

                        {(!localDtc.employeesList || localDtc.employeesList.length === 0) ? (
                          <p className="text-[11px] text-muted-foreground italic py-1.5 text-center bg-background/50 border border-dashed rounded-md mt-1">
                            Nenhum colaborador cadastrado. Clique em Adicionar Funcionário.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 mt-1.5">
                            {localDtc.employeesList.map((emp, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-background p-1.5 border rounded-md shadow-2xs">
                                {/* Name Input */}
                                <Input
                                  value={emp.name}
                                  onChange={(e) => updateEmployee(idx, "name", e.target.value)}
                                  disabled={isFormDisabled}
                                  placeholder="Nome do Colaborador"
                                  className="border-muted/80 h-7 text-xs flex-[4]"
                                
                                />

                                {/* Department Select dropdown */}
                                <Select
                                  value={emp.department}
                                  onValueChange={(val) => updateEmployee(idx, "department", val)}
                                  disabled={isFormDisabled}
                                >
                                  <SelectTrigger className="w-24 h-7 text-[10px] border-muted/80 shrink-0">
                                    <SelectValue placeholder="Setor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Notas" className="text-xs">Notas</SelectItem>
                                    <SelectItem value="Firmas" className="text-xs">Firmas</SelectItem>
                                    <SelectItem value="Recepção / Triagem" className="text-xs">Recepção/Triagem</SelectItem>
                                    <SelectItem value="Protesto" className="text-xs">Protesto</SelectItem>
                                    <SelectItem value="Registro Civil" className="text-xs">R. Civil</SelectItem>
                                    <SelectItem value="Registro de Imóveis" className="text-xs">R. Imóveis</SelectItem>
                                    <SelectItem value="RTD / PJ" className="text-xs">RTD/PJ</SelectItem>
                                    <SelectItem value="Administrativo" className="text-xs">Adm</SelectItem>
                                    <SelectItem value="Financeiro" className="text-xs">Financeiro</SelectItem>
                                    <SelectItem value="TI / Suporte" className="text-xs">TI</SelectItem>
                                    <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                  </SelectContent>
                                </Select>

                                {/* Role / Office Input */}
                                <Input
                                  value={emp.role}
                                  onChange={(e) => updateEmployee(idx, "role", e.target.value)}
                                  disabled={isFormDisabled}
                                  placeholder="Função (Ex: Escrevente)"
                                  className="border-muted/80 h-7 text-xs flex-1"
                                />

                                {/* Remove Button */}
                                <Button
                                  type="button"
                                  onClick={() => removeEmployee(idx)}
                                  disabled={isFormDisabled}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 3: Ganhos Operacionais */}
                  <div className="space-y-3">
                    <div
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("processo-ganhos")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        3. Ganhos Operacionais
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["processo-ganhos"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>

                    {!collapsedSections["processo-ganhos"] && (
                      <div className="space-y-2 border p-3 rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold">Ganhos operacionais implementados</Label>
                            <p className="text-[9px] text-muted-foreground">Registre os ganhos e melhorias operacionais que foram implementados durante a implantação.</p>
                          </div>
                          <Button
                            type="button"
                            onClick={addImplantationGain}
                            disabled={isFormDisabled}
                            variant="outline"
                            size="sm"
                            className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar Ganho
                          </Button>
                        </div>

                        {(!localDtc.implantationGainsList || localDtc.implantationGainsList.length === 0) ? (
                          <p className="text-[11px] text-muted-foreground italic py-1.5 text-center bg-background/50 border border-dashed rounded-md mt-1">
                            Nenhum ganho cadastrado. Clique em Adicionar Ganho.
                          </p>
                        ) : (
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGainDragEnd}>
                            <SortableContext items={(localDtc.implantationGainsList ?? []).map((_, i) => `gain-${i}`)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-3 mt-1.5">
                                {localDtc.implantationGainsList.map((gain, idx) => (
                                  <SortableItem key={`gain-${idx}`} id={`gain-${idx}`}>
                                    {(dragHandleProps) => (
                                      <div className="bg-background p-3 border rounded-md shadow-2xs space-y-2">
                                        {/* Linha 1: Título + drag handle */}
                                        <div className="flex items-center gap-2">
                                          <span {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 touch-none">
                                            <GripVertical className="h-4 w-4" />
                                          </span>
                                          <Input
                                            value={gain.title}
                                            onChange={(e) => updateImplantationGain(idx, "title", e.target.value)}
                                            disabled={isFormDisabled}
                                            placeholder="Título do ganho (ex: Automação de protocolo de entrada)"
                                            className="border-muted/80 h-8 text-xs w-full font-medium"
                                          />
                                        </div>
                                {/* Linha 2: Produto + Setor + Delete */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <Select
                                    value={gain.product || ""}
                                    onValueChange={(val) => updateImplantationGain(idx, "product", val)}
                                    disabled={isFormDisabled}
                                  >
                                    <SelectTrigger className="w-40 h-8 text-[11px] border-muted/80 shrink-0">
                                      <SelectValue placeholder="Produto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Orion TN" className="text-xs">Orion TN</SelectItem>
                                      <SelectItem value="Orion PRO" className="text-xs">Orion PRO</SelectItem>
                                      <SelectItem value="Orion REG" className="text-xs">Orion REG</SelectItem>
                                      <SelectItem value="Modelos TN" className="text-xs">Modelos TN</SelectItem>
                                      <SelectItem value="LCW" className="text-xs">LCW</SelectItem>
                                      <SelectItem value="SGA" className="text-xs">SGA</SelectItem>
                                      <SelectItem value="On Hand" className="text-xs">On Hand</SelectItem>
                                      <SelectItem value="Orion GED" className="text-xs">Orion GED</SelectItem>
                                      <SelectItem value="Library" className="text-xs">Library</SelectItem>
                                      <SelectItem value="e-Recepção" className="text-xs">e-Recepção</SelectItem>
                                      <SelectItem value="e-Qualificação" className="text-xs">e-Qualificação</SelectItem>
                                      <SelectItem value="Cartflow" className="text-xs">Cartflow</SelectItem>
                                      <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={gain.department}
                                    onValueChange={(val) => updateImplantationGain(idx, "department", val)}
                                    disabled={isFormDisabled}
                                  >
                                    <SelectTrigger className="w-36 h-8 text-[11px] border-muted/80 shrink-0">
                                      <SelectValue placeholder="Setor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Notas" className="text-xs">Notas</SelectItem>
                                      <SelectItem value="Firmas" className="text-xs">Firmas</SelectItem>
                                      <SelectItem value="Recepção / Triagem" className="text-xs">Recepção/Triagem</SelectItem>
                                      <SelectItem value="Protesto" className="text-xs">Protesto</SelectItem>
                                      <SelectItem value="Registro Civil" className="text-xs">R. Civil</SelectItem>
                                      <SelectItem value="Registro de Imóveis" className="text-xs">R. Imóveis</SelectItem>
                                      <SelectItem value="RTD / PJ" className="text-xs">RTD/PJ</SelectItem>
                                      <SelectItem value="Administrativo" className="text-xs">Adm</SelectItem>
                                      <SelectItem value="Financeiro" className="text-xs">Financeiro</SelectItem>
                                      <SelectItem value="TI / Suporte" className="text-xs">TI</SelectItem>
                                      <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Button
                                    type="button"
                                    onClick={() => removeImplantationGain(idx)}
                                    disabled={isFormDisabled}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0 ml-auto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                        {/* Linha 3: Descrição com RichTextEditor */}
                                        <RichTextEditor
                                          content={gain.description}
                                          onChange={(c) => updateImplantationGain(idx, "description", c)}
                                          placeholder="Descreva o ganho operacional implementado..."
                                          editable={!isFormDisabled}
                                        />
                                      </div>
                                    )}
                                  </SortableItem>
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 4: Pendências da Implantação */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("processo-pendencias")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        4. Pendências da Implantação
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["processo-pendencias"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["processo-pendencias"] && (
                      <div className="space-y-2 border p-3 rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold">Pendências registradas na implantação</Label>
                            <p className="text-[9px] text-muted-foreground">Cadastre pendências internas identificadas durante o processo.</p>
                          </div>
                          <Button
                            type="button"
                            onClick={addImplantationPending}
                            disabled={isFormDisabled}
                            variant="outline"
                            size="sm"
                            className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar Pendência
                          </Button>
                        </div>

                        {(!localDtc.implantationPendingList || localDtc.implantationPendingList.length === 0) ? (
                          <p className="text-[11px] text-muted-foreground italic py-1.5 text-center bg-background/50 border border-dashed rounded-md mt-1">
                            Nenhuma pendência cadastrada. Clique em Adicionar Pendência.
                          </p>
                        ) : (
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePendingDragEnd}>
                            <SortableContext items={(localDtc.implantationPendingList ?? []).map((_, i) => `pend-${i}`)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-3 mt-1.5">
                                {localDtc.implantationPendingList.map((pending, idx) => (
                                  <SortableItem key={`pend-${idx}`} id={`pend-${idx}`}>
                                    {(dragHandleProps) => (
                                      <div className="bg-background p-3 border rounded-md shadow-2xs space-y-2 relative">
                                        <div className="space-y-2">
                                          {/* Title Input with drag handle */}
                                          <div className="flex items-center gap-2 w-full">
                                            <span {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 touch-none">
                                              <GripVertical className="h-4 w-4" />
                                            </span>
                                            <Input
                                              value={pending.title}
                                              onChange={(e) => updateImplantationPending(idx, "title", e.target.value)}
                                              disabled={isFormDisabled}
                                              placeholder="Título da Pendência (ex: Configurar selo digital)"
                                              className="border-muted/80 h-8 text-xs w-full font-medium"
                                            />
                                          </div>
                                        </div>

                                        {/* Controls Row (Product, Sector, Status, Responsibility, Delete) */}
                                        <div className="flex flex-wrap items-center gap-2">
                                          {/* Product Select dropdown */}
                                          <Select
                                            value={pending.product}
                                            onValueChange={(val) => updateImplantationPending(idx, "product", val)}
                                            disabled={isFormDisabled}
                                          >
                                            <SelectTrigger className="w-40 h-8 text-[11px] border-muted/80 shrink-0">
                                              <SelectValue placeholder="Produto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Orion TN" className="text-xs">Orion TN</SelectItem>
                                              <SelectItem value="Orion PRO" className="text-xs">Orion PRO</SelectItem>
                                              <SelectItem value="Orion REG" className="text-xs">Orion REG</SelectItem>
                                              <SelectItem value="Modelos TN" className="text-xs">Modelos TN</SelectItem>
                                              <SelectItem value="LCW" className="text-xs">LCW</SelectItem>
                                              <SelectItem value="SGA" className="text-xs">SGA</SelectItem>
                                              <SelectItem value="On Hand" className="text-xs">On Hand</SelectItem>
                                              <SelectItem value="Orion GED" className="text-xs">Orion GED</SelectItem>
                                              <SelectItem value="Library" className="text-xs">Library</SelectItem>
                                              <SelectItem value="e-Recepção" className="text-xs">e-Recepção</SelectItem>
                                              <SelectItem value="e-Qualificação" className="text-xs">e-Qualificação</SelectItem>
                                              <SelectItem value="Cartflow" className="text-xs">Cartflow</SelectItem>
                                              <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {/* Department (Setor) Select dropdown */}
                                          <Select
                                            value={pending.department}
                                            onValueChange={(val) => updateImplantationPending(idx, "department", val)}
                                            disabled={isFormDisabled}
                                          >
                                            <SelectTrigger className="w-36 h-8 text-[11px] border-muted/80 shrink-0">
                                              <SelectValue placeholder="Setor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Notas" className="text-xs">Notas</SelectItem>
                                              <SelectItem value="Firmas" className="text-xs">Firmas</SelectItem>
                                              <SelectItem value="Recepção / Triagem" className="text-xs">Recepção/Triagem</SelectItem>
                                              <SelectItem value="Protesto" className="text-xs">Protesto</SelectItem>
                                              <SelectItem value="Registro Civil" className="text-xs">R. Civil</SelectItem>
                                              <SelectItem value="Registro de Imóveis" className="text-xs">R. Imóveis</SelectItem>
                                              <SelectItem value="RTD / PJ" className="text-xs">RTD/PJ</SelectItem>
                                              <SelectItem value="Administrativo" className="text-xs">Adm</SelectItem>
                                              <SelectItem value="Financeiro" className="text-xs">Financeiro</SelectItem>
                                              <SelectItem value="TI / Suporte" className="text-xs">TI</SelectItem>
                                              <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {/* Status Select dropdown */}
                                          <Select
                                            value={pending.status}
                                            onValueChange={(val) => updateImplantationPending(idx, "status", val)}
                                            disabled={isFormDisabled}
                                          >
                                            <SelectTrigger className="w-32 h-8 text-[11px] border-muted/80 shrink-0">
                                              <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Pendente" className="text-xs">Pendente</SelectItem>
                                              <SelectItem value="Em andamento" className="text-xs">Em andamento</SelectItem>
                                              <SelectItem value="Resolvido" className="text-xs">Resolvido</SelectItem>
                                              <SelectItem value="Cancelado" className="text-xs">Cancelado</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {/* Assigned Analyst Select dropdown */}
                                          <Select
                                            value={pending.assignedTo || "none"}
                                            onValueChange={(val) => updateImplantationPending(idx, "assignedTo", val === "none" ? "" : val)}
                                            disabled={isFormDisabled}
                                          >
                                            <SelectTrigger className="w-48 h-8 text-[11px] border-muted/80 shrink-0">
                                              <SelectValue placeholder="Responsável" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none" className="text-xs">Não atribuído</SelectItem>
                                              {members.map((m) => (
                                                <SelectItem key={m.id} value={m.name} className="text-xs">
                                                  {m.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>

                                          {/* Remove Button */}
                                          <Button
                                            type="button"
                                            onClick={() => removeImplantationPending(idx)}
                                            disabled={isFormDisabled}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0 ml-auto"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>

                                        <div className="space-y-1">
                                          <RichTextEditor
                                            content={pending.description}
                                            onChange={(c) => updateImplantationPending(idx, "description", c)}
                                            placeholder="Descrição detalhada da pendência..."
                                            editable={!isFormDisabled}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </SortableItem>
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 5: Sugestões de Melhorias */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("processo-sugestoes")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        5. Sugestões de Melhorias
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["processo-sugestoes"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["processo-sugestoes"] && (
                      <div className="space-y-2 border p-3 rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold">Sugestões de melhorias cadastradas</Label>
                            <p className="text-[9px] text-muted-foreground">Cadastre sugestões de melhorias identificadas para o cliente ou produto.</p>
                          </div>
                          <Button
                            type="button"
                            onClick={addImplantationSuggestion}
                            disabled={isFormDisabled}
                            variant="outline"
                            size="sm"
                            className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar Sugestão
                          </Button>
                        </div>

                        {(!localDtc.implantationSuggestionsList || localDtc.implantationSuggestionsList.length === 0) ? (
                          <p className="text-[11px] text-muted-foreground italic py-1.5 text-center bg-background/50 border border-dashed rounded-md mt-1">
                            Nenhuma sugestão cadastrada. Clique em Adicionar Sugestão.
                          </p>
                        ) : (
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSuggestionDragEnd}>
                            <SortableContext items={(localDtc.implantationSuggestionsList ?? []).map((_, i) => `sugg-${i}`)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-3 mt-1.5">
                                {localDtc.implantationSuggestionsList.map((suggestion, idx) => (
                                  <SortableItem key={`sugg-${idx}`} id={`sugg-${idx}`}>
                                    {(dragHandleProps) => (
                                      <div className="bg-background p-3 border rounded-md shadow-2xs space-y-2 relative">
                                        <div className="space-y-2">
                                          {/* Title Input with drag handle */}
                                          <div className="flex items-center gap-2 w-full">
                                            <span {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 touch-none">
                                              <GripVertical className="h-4 w-4" />
                                            </span>
                                            <Input
                                              value={suggestion.title}
                                              onChange={(e) => updateImplantationSuggestion(idx, "title", e.target.value)}
                                              disabled={isFormDisabled}
                                              placeholder="Título da Sugestão (ex: Novo relatório financeiro)"
                                              className="border-muted/80 h-8 text-xs w-full font-medium"
                                            />
                                          </div>
                                        </div>

                                        {/* Controls Row (Product, Sector, Status, Responsibility, Delete) */}
                                        <div className="flex flex-wrap items-center gap-2">
                                          {/* Product Select dropdown */}
                                          <Select
                                            value={suggestion.product}
                                            onValueChange={(val) => updateImplantationSuggestion(idx, "product", val)}
                                            disabled={isFormDisabled}
                                          >
                                            <SelectTrigger className="w-40 h-8 text-[11px] border-muted/80 shrink-0">
                                              <SelectValue placeholder="Produto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {/* Sistemas Principais */}
                                              <SelectItem value="Orion TN" className="text-xs">Orion TN</SelectItem>
                                              <SelectItem value="Orion PRO" className="text-xs">Orion PRO</SelectItem>
                                              <SelectItem value="Orion REG" className="text-xs">Orion REG</SelectItem>
                                              <SelectItem value="Modelos TN" className="text-xs">Modelos TN</SelectItem>
                                              {/* Produtos Adicionais */}
                                              <SelectItem value="LCW" className="text-xs">LCW</SelectItem>
                                              <SelectItem value="SGA" className="text-xs">SGA</SelectItem>
                                              <SelectItem value="On Hand" className="text-xs">On Hand</SelectItem>
                                              <SelectItem value="Orion GED" className="text-xs">Orion GED</SelectItem>
                                              <SelectItem value="Library" className="text-xs">Library</SelectItem>
                                              <SelectItem value="e-Recepção" className="text-xs">e-Recepção</SelectItem>
                                              <SelectItem value="e-Qualificação" className="text-xs">e-Qualificação</SelectItem>
                                              <SelectItem value="Cartflow" className="text-xs">Cartflow</SelectItem>
                                              <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {/* Department (Setor) Select dropdown */}
                                          <Select
                                            value={suggestion.department}
                                            onValueChange={(val) => updateImplantationSuggestion(idx, "department", val)}
                                            disabled={isFormDisabled}
                                          >
                                            <SelectTrigger className="w-36 h-8 text-[11px] border-muted/80 shrink-0">
                                              <SelectValue placeholder="Setor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Notas" className="text-xs">Notas</SelectItem>
                                              <SelectItem value="Firmas" className="text-xs">Firmas</SelectItem>
                                              <SelectItem value="Recepção / Triagem" className="text-xs">Recepção/Triagem</SelectItem>
                                              <SelectItem value="Protesto" className="text-xs">Protesto</SelectItem>
                                              <SelectItem value="Registro Civil" className="text-xs">R. Civil</SelectItem>
                                              <SelectItem value="Registro de Imóveis" className="text-xs">R. Imóveis</SelectItem>
                                              <SelectItem value="RTD / PJ" className="text-xs">RTD/PJ</SelectItem>
                                              <SelectItem value="Administrativo" className="text-xs">Adm</SelectItem>
                                              <SelectItem value="Financeiro" className="text-xs">Financeiro</SelectItem>
                                              <SelectItem value="TI / Suporte" className="text-xs">TI</SelectItem>
                                              <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {/* Remove Button */}
                                          <Button
                                            type="button"
                                            onClick={() => removeImplantationSuggestion(idx)}
                                            disabled={isFormDisabled}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0 ml-auto"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>

                                        <div className="space-y-1">
                                          <RichTextEditor
                                            content={suggestion.description}
                                            onChange={(c) => updateImplantationSuggestion(idx, "description", c)}
                                            placeholder="Descrição detalhada da sugestão..."
                                            editable={!isFormDisabled}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </SortableItem>
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-seção 5: Considerações Finais */}
                  <div className="space-y-3">
                    <div 
                      className="flex items-center justify-between border-b pb-1.5 cursor-pointer select-none group hover:text-primary transition-colors"
                      onClick={() => toggleSection("processo-consideracoes")}
                    >
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary transition-colors">
                        6. Considerações Finais
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        {collapsedSections["processo-consideracoes"] ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                        )}
                      </Button>
                    </div>
                    
                    {!collapsedSections["processo-consideracoes"] && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* ⑤ NPS / Avaliação do Cliente */}
                        <div className="flex items-center justify-between bg-muted/30 border rounded-lg p-3 mb-2">
                          <div>
                            <Label className="text-xs font-bold text-muted-foreground">Satisfação do Cliente</Label>
                            <p className="text-[9px] text-muted-foreground mt-0.5">Avalie a recepção do cliente durante a implantação</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                disabled={isFormDisabled}
                                onClick={() => handleFieldChange("clientSatisfactionScore", star === localDtc.clientSatisfactionScore ? 0 : star)}
                                className={cn(
                                  "transition-all duration-150 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60",
                                  "focus:outline-none"
                                )}
                              >
                                <Star
                                  className={cn(
                                    "h-6 w-6 transition-colors",
                                    (localDtc.clientSatisfactionScore ?? 0) >= star
                                      ? "fill-amber-400 text-amber-400"
                                      : "fill-none text-muted-foreground/40 hover:text-amber-300"
                                  )}
                                />
                              </button>
                            ))}
                            {(localDtc.clientSatisfactionScore ?? 0) > 0 && (
                              <span className="ml-2 text-xs font-bold text-amber-500">
                                {["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"][localDtc.clientSatisfactionScore ?? 0]}
                              </span>
                            )}
                          </div>
                        </div>
                        <Label htmlFor="finalConsiderations" className="text-xs font-bold text-muted-foreground">Notas de Encerramento do Projeto</Label>
                        <RichTextEditor
                          content={localDtc.finalConsiderations}
                          onChange={(c) => handleFieldChange("finalConsiderations", c)}
                          placeholder="Considerações adicionais ou notas de encerramento do projeto de transição..."
                          editable={!isFormDisabled}
                        />
                      </div>
                    )}
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
                                  onValueChange={(val: any) => updateTicket(idx, "status", val)}
                                  disabled={isFormDisabled}
                                >
                                  <SelectTrigger className={cn(
                                    "border-muted h-8 text-xs font-semibold",
                                    t.status === "open" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50",
                                    t.status === "in_progress" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50",
                                    t.status === "closed" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                                  )}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open" className="text-xs">Aberto (Não iniciado)</SelectItem>
                                    <SelectItem value="in_progress" className="text-xs">Em Tratativa</SelectItem>
                                    <SelectItem value="closed" className="text-xs">Concluído / Resolvido</SelectItem>
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

            {/* TAB 4.5: HISTORICO */}
            <TabsContent value="historico">
              <Card className="border-muted/60 shadow-sm">
                <CardContent className="p-4">
                  <LogsTab project={project as any} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: REPORT PRINT PREVIEW */}
            <TabsContent value="visualizar">
              <Card className="border-muted/60 shadow-md">
                <CardHeader className="border-b flex flex-row items-center justify-between py-4 bg-muted/20 gap-4">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Visualização de Impressão (DTC Oficial)</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Visualize e formate o documento A4 exatamente como será impresso ou exportado para PDF.</CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-nowrap">
                    {/* Controls */}
                    <div className="flex items-center gap-1.5 border rounded-md px-2 bg-background text-[10px] h-8">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground font-semibold text-[9px] uppercase tracking-wider">Leitura:</span>
                        <select
                          value={speechSection}
                          onChange={(e) => setSpeechSection(e.target.value)}
                          className="bg-transparent border-none outline-none font-bold text-foreground max-w-[120px] cursor-pointer text-[10px] pr-0.5"
                        >
                          <option value="all" className="text-black bg-white">Tudo (Completo)</option>
                          <option value="1" className="text-black bg-white">1. Identificação</option>
                          <option value="2" className="text-black bg-white">2. Infra & Acessos</option>
                          <option value="3" className="text-black bg-white">3. Conversão</option>
                          <option value="4" className="text-black bg-white">4. Relato Técnico</option>
                          <option value="5" className="text-black bg-white">5. Pendências</option>
                        </select>
                      </div>

                      <div className="w-[1px] h-3 bg-border" />

                      {availableVoices.length > 0 && (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground font-semibold text-[9px] uppercase tracking-wider">Voz:</span>
                            <select
                              value={selectedVoiceURI}
                              onChange={(e) => setSelectedVoiceURI(e.target.value)}
                              className="bg-transparent border-none outline-none font-bold text-foreground max-w-[150px] cursor-pointer text-[10px] pr-0.5"
                            >
                              {availableVoices.map((v, i) => (
                                <option key={i} value={v.voiceURI} className="text-black bg-white">
                                  {v.name.replace("Microsoft", "").replace("Google", "").replace("Desktop", "").trim()}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-[1px] h-3 bg-border" />
                        </>
                      )}
 
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground font-semibold text-[9px] uppercase tracking-wider">Velocidade:</span>
                        <select
                          value={speechRate}
                          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                          className="bg-transparent border-none outline-none font-bold text-foreground cursor-pointer text-[10px]"
                        >
                          <option value="0.75" className="text-black bg-white">0.75x</option>
                          <option value="1.0" className="text-black bg-white">1.0x</option>
                          <option value="1.25" className="text-black bg-white">1.25x</option>
                          <option value="1.5" className="text-black bg-white">1.5x</option>
                          <option value="2.0" className="text-black bg-white">2.0x</option>
                        </select>
                      </div>
                    </div>
 
                    <Button
                      onClick={toggleSpeech}
                      variant={isSpeaking ? "destructive" : "outline"}
                      className="font-bold gap-1 text-[11px] shadow h-8 px-2.5"
                      size="sm"
                    >
                      {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {isSpeaking ? "Parar" : "Ouvir"}
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold gap-1 text-[11px] shadow h-8 px-2.5"
                      size="sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-6">
                  {/* Clean preview card resembling A4 paper */}
                  <div className="bg-white text-black p-8 border rounded-md shadow-inner max-w-[800px] mx-auto text-sm leading-relaxed dtc-document-font">
                    <div className="border-2 border-black p-5 space-y-5">
                      {/* Document Header */}
                      <div className="text-center border-b-2 border-black pb-4">
                        <h2 className="text-xl font-bold tracking-tight uppercase">Documento de Transição de Conhecimento</h2>
                        <h3 className="text-base font-semibold text-gray-700">Implantação / Service Desk</h3>
                        {localDtc.supportCallNumber && (
                          <p className="text-xs font-bold text-gray-600 mt-1">Chamado de Origem: {localDtc.supportCallNumber}</p>
                        )}
                      </div>

                      {/* 1. IDENTIFICAÇÃO DA SERVENTIA */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-2 border-black pl-2">
                          1. Identificação da Serventia &amp; Responsáveis
                        </h4>
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 p-2 w-1/2 bg-slate-50">
                                <strong>Implantador Responsável:</strong> {renderVal(localDtc.responsible)}
                              </td>
                              <td className="border border-gray-300 p-2 w-1/2 bg-slate-50">
                                <strong>Analista Suporte:</strong> {renderVal(localDtc.analystResponsible)}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="border border-gray-300 p-2">
                                <strong>Serventia (Cartório):</strong> {renderVal(localDtc.serventia)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-2">
                                <strong>Oficial Titular:</strong> {renderVal(localDtc.oficial)}
                              </td>
                              <td className="border border-gray-300 p-2">
                                <strong>Responsável Cartório:</strong>{" "}
                                {localDtc.clientResponsible
                                  ? `${localDtc.clientResponsible}${localDtc.clientResponsiblePhone ? ` (${localDtc.clientResponsiblePhone})` : ""}`
                                  : renderVal(null)}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="border border-gray-300 p-2">
                                <strong>Key Users (Pontos de Contato):</strong>{" "}
                                {localDtc.keyUsersList && localDtc.keyUsersList.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {localDtc.keyUsersList.map((u, i) => (
                                      <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium text-gray-700">
                                        {u.name}{u.phone ? ` (${u.phone})` : ""}
                                      </span>
                                    ))}
                                  </div>
                                ) : renderVal(null, "Nenhum informado")}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-2">
                                <strong>Telefone:</strong> {renderVal(localDtc.clientPhone)}
                              </td>
                              <td className="border border-gray-300 p-2">
                                <strong>E-mail:</strong> {renderVal(localDtc.clientEmail)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 2. INFRAESTRUTURA & ACESSOS */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-2 border-black pl-2">
                          2. Infraestrutura, Banco de Dados &amp; Acessos
                        </h4>
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 p-2 w-1/2">
                                <strong>Sistemas Instalados:</strong> {renderVal(localDtc.systemsInstalled)}
                              </td>
                              <td className="border border-gray-300 p-2 w-1/2">
                                <strong>Versões dos Sistemas:</strong> {renderVal(localDtc.systemVersions)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-2">
                                <strong>Versão PostgreSQL:</strong> {renderVal(localDtc.postgresVersion)}
                              </td>
                              <td className="border border-gray-300 p-2">
                                <strong>Local Instalação PG:</strong> {renderVal(localDtc.postgresHost)}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="border border-gray-300 p-2 bg-slate-50">
                                <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
                                  <strong>Acesso Banco PG:</strong>
                                  <div className="flex gap-4 text-[11px]">
                                    <div>
                                      <span className="text-gray-500 font-medium">Usuário:</span>{" "}
                                      <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-black font-semibold">{localDtc.postgresUser || "N/A"}</code>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 font-medium">Senha:</span>{" "}
                                      <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-black font-semibold">{localDtc.postgresPassword || "N/A"}</code>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="border border-gray-300 p-2">
                                <strong>Acessos Remotos Disponibilizados:</strong>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  {!localDtc.remoteAccessList || localDtc.remoteAccessList.length === 0 ? (
                                    renderVal(localDtc.remoteAccessData, "Nenhum informado")
                                  ) : (
                                    localDtc.remoteAccessList.map((a, i) => (
                                      <div key={i} className="border border-slate-200 bg-slate-50 px-2 py-1 rounded flex gap-3 text-[11px]">
                                        <span className="font-semibold text-gray-700">{a.system}</span>
                                        <span><span className="text-gray-500">ID:</span> <code className="font-mono bg-white border border-gray-200 px-1 rounded text-black font-semibold">{a.id}</code></span>
                                        {a.password && (
                                          <span><span className="text-gray-500">Senha:</span> <code className="font-mono bg-white border border-gray-200 px-1 rounded text-black font-semibold">{a.password}</code></span>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                            {(localDtc.soLogin || localDtc.soPassword || localDtc.osType || localDtc.osVersion) && (
                              <tr>
                                <td colSpan={2} className="border border-gray-300 p-2 bg-slate-50">
                                  <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
                                    <strong>Acesso SO Servidor:</strong>{" "}
                                    <span>{localDtc.osType || ""}{localDtc.osVersion ? ` (${localDtc.osVersion})` : ""}</span>
                                    <div className="flex gap-4 text-[11px]">
                                      <div>
                                        <span className="text-gray-500 font-medium">Usuário:</span>{" "}
                                        <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-black font-semibold">{localDtc.soLogin || "N/A"}</code>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 font-medium">Senha:</span>{" "}
                                        <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-black font-semibold">{localDtc.soPassword || "N/A"}</code>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* 3. CONVERSÃO DE DADOS */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-2 border-black pl-2">
                          3. Conversão de Banco de Dados
                        </h4>
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 p-2">
                                <div className="flex items-center gap-2">
                                  <strong>Houve Conversão de Dados:</strong>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                    localDtc.hadConversion ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                                  )}>
                                    {localDtc.hadConversion ? "Sim" : "Não"}
                                  </span>
                                </div>
                                {localDtc.hadConversion && localDtc.convertedData && (
                                  <div className="bg-slate-50 border border-slate-200 p-2.5 mt-2 rounded whitespace-pre-wrap leading-relaxed text-gray-700">
                                    <strong>Dados Convertidos:</strong> {localDtc.convertedData}
                                  </div>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 4. RELATO TÉCNICO */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-2 border-black pl-2">
                          4. Relato Técnico &amp; Processo de Implantação
                        </h4>
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 p-3">
                                <strong className="block text-[11px] uppercase tracking-wider text-slate-800 mb-1">Processo de Implantação (Resumo):</strong>
                                <div className="pl-2 border-l-2 border-gray-300 italic text-gray-700 leading-relaxed">
                                  <LexicalRenderer
                                    jsonStr={localDtc.implantationProcess}
                                    fallback="(Nenhum relato técnico de implantação registrado)"
                                  />
                                </div>
                                {localDtc.implantationProcessLogs && localDtc.implantationProcessLogs.length > 0 && (
                                  <div className="mt-2.5 pl-2 border-l-2 border-slate-300 space-y-1.5 bg-slate-50 p-2.5 rounded">
                                    <strong className="block text-[9px] uppercase tracking-wider text-gray-600 font-bold mb-1">Acompanhamento Diário:</strong>
                                    {localDtc.implantationProcessLogs.map((log, idx) => (
                                      <div key={idx} className="text-[11px] leading-relaxed flex items-start gap-2">
                                        <span className="font-semibold text-gray-700 shrink-0">
                                          {log.date ? new Date(log.date + "T00:00:00").toLocaleDateString("pt-BR") : ""}:
                                        </span>
                                        <span className="text-gray-700">{log.description || "(Sem descrição)"}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-3">
                                <strong className="block text-[11px] uppercase tracking-wider text-slate-800 mb-1">Funcionários da Serventia:</strong>
                                {!localDtc.employeesList || localDtc.employeesList.length === 0 ? (
                                  <div className="text-gray-700">{renderVal(localDtc.employees, "(Nenhum colaborador listado)")}</div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {localDtc.employeesList.map((e, i) => (
                                      <div key={i} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-gray-700">
                                        {e.name}
                                        {e.department && <span className="text-gray-500 font-normal"> ({e.department}{e.role ? ` - ${e.role}` : ""})</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                            {localDtc.implantationGainsList && localDtc.implantationGainsList.length > 0 && (
                              <tr>
                                <td className="border border-gray-300 p-3">
                                  <strong className="block text-[11px] uppercase tracking-wider text-slate-800 mb-1">Ganhos Operacionais Obtidos:</strong>
                                  <div className="space-y-2">
                                    {localDtc.implantationGainsList.map((gain, idx) => (
                                      <div key={idx} className="bg-slate-50 border border-slate-100 p-2 rounded">
                                        <span className="font-bold text-gray-800">
                                          {gain.product ? `[${gain.product}] ` : ""}
                                          {gain.title || "(Sem título)"}
                                          {gain.department ? ` - ${gain.department}` : ""}
                                        </span>
                                        <div className="text-gray-600 mt-1 pl-1 italic">
                                          <LexicalRenderer jsonStr={gain.description} fallback="(Sem descrição)" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                            {localDtc.implantationSuggestionsList && localDtc.implantationSuggestionsList.length > 0 && (
                              <tr>
                                <td className="border border-gray-300 p-3">
                                  <strong className="block text-[11px] uppercase tracking-wider text-slate-800 mb-1">Sugestões de Melhorias Cadastradas:</strong>
                                  <div className="space-y-2">
                                    {localDtc.implantationSuggestionsList.map((suggestion, idx) => (
                                      <div key={idx} className="bg-slate-50 border border-slate-100 p-2 rounded">
                                        <span className="font-bold text-gray-800">
                                          {suggestion.product ? `[${suggestion.product}] ` : ""}
                                          {suggestion.title || "(Sem título)"}
                                          {suggestion.department ? ` - ${suggestion.department}` : ""}
                                        </span>
                                        <div className="text-gray-600 mt-1 pl-1 italic">
                                          <LexicalRenderer jsonStr={suggestion.description} fallback="(Sem descrição)" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                            {localDtc.clientSatisfactionScore ? (
                              <tr>
                                <td className="border border-gray-300 p-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <strong className="text-[11px] uppercase tracking-wider text-slate-800">Grau de Satisfação do Cliente:</strong>
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={cn(
                                            "h-3.5 w-3.5",
                                            i < (localDtc.clientSatisfactionScore ?? 0)
                                              ? "fill-amber-400 text-amber-400"
                                              : "fill-none text-gray-300"
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <span className="font-bold text-amber-600 text-xs">
                                      {["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"][localDtc.clientSatisfactionScore ?? 0]}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                            {localDtc.finalConsiderations && (
                              <tr>
                                <td className="border border-gray-300 p-3">
                                  <strong className="block text-[11px] uppercase tracking-wider text-slate-800 mb-1">Considerações Finais:</strong>
                                  <div className="text-gray-700 pl-1.5 border-l-2 border-slate-300 italic">
                                    <LexicalRenderer
                                      jsonStr={localDtc.finalConsiderations}
                                      fallback="(Sem considerações finais registradas)"
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* 5. PENDÊNCIAS & CHAMADOS */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-l-2 border-black pl-2">
                          5. Pendências &amp; Chamados de Suporte (0800)
                        </h4>
                        {localDtc.implantationPendingList && localDtc.implantationPendingList.length > 0 && (
                          <div className="mb-3">
                            <strong className="block text-[10px] uppercase text-gray-600 mb-1.5">Pendências da Implantação:</strong>
                            <div className="space-y-2">
                              {localDtc.implantationPendingList.map((pending, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-gray-800">
                                      {pending.product ? `[${pending.product}] ` : ""}
                                      {pending.title || "(Sem título)"}
                                      {pending.department ? ` - ${pending.department}` : ""}
                                      {pending.assignedTo ? ` (Responsável: ${pending.assignedTo})` : ""}
                                    </span>
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0",
                                      pending.status === "Resolvido" && "bg-emerald-100 text-emerald-800",
                                      pending.status === "Em andamento" && "bg-blue-100 text-blue-800",
                                      pending.status === "Pendente" && "bg-amber-100 text-amber-800",
                                      pending.status === "Cancelado" && "bg-gray-100 text-gray-800"
                                    )}>
                                      {pending.status}
                                    </span>
                                  </div>
                                  <div className="text-gray-600 pl-1 italic">
                                    <LexicalRenderer jsonStr={pending.description} fallback="(Sem descrição)" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="border border-gray-300 rounded overflow-hidden">
                          {localDtc.tickets.length === 0 ? (
                            <div className="p-3 text-center text-gray-500 italic text-xs bg-slate-50">
                              Nenhuma pendência ou chamado registrado para transição no 0800.
                            </div>
                          ) : (
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="border-b border-r border-gray-300 p-2 text-left w-1/4 font-semibold text-gray-700">Chamado / N°</th>
                                  <th className="border-b border-r border-gray-300 p-2 text-left w-1/2 font-semibold text-gray-700">Descrição da Pendência</th>
                                  <th className="border-b border-gray-300 p-2 text-left w-1/4 font-semibold text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {localDtc.tickets.map((t, idx) => (
                                  <tr key={idx} className="even:bg-slate-50/50">
                                    <td className="border-b border-r border-gray-300 p-2 font-bold">{t.number || "N/A"}</td>
                                    <td className="border-b border-r border-gray-300 p-2">{t.description || "Sem descrição"}</td>
                                    <td className="border-b border-gray-300 p-2">
                                      {t.status === "open" && <span className="text-amber-600 font-semibold">Aberto</span>}
                                      {t.status === "in_progress" && <span className="text-blue-600 font-semibold">Em Tratativa</span>}
                                      {t.status === "closed" && <span className="text-emerald-600 font-semibold">Resolvido</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      {/* Assinaturas */}
                      <div className="grid grid-cols-2 gap-12 text-center text-xs pt-12">
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
        <div id="dtc-print-area" ref={printRef} className="hidden print:block bg-white text-black p-8 text-sm dtc-document-font">
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
                <div><strong>Local Instalação PG:</strong> {localDtc.postgresHost || "__________________________"}</div>
                <div className="col-span-2"><strong>Acesso Banco PG:</strong> Usuário: {localDtc.postgresUser || "_____"} | Senha: {localDtc.postgresPassword || "_____"}</div>
              </div>
              <div>
                <strong>Dados de Acesso Remoto:</strong>{" "}
                {!localDtc.remoteAccessList || localDtc.remoteAccessList.length === 0 ? (
                  localDtc.remoteAccessData || "__________________________"
                ) : (
                  localDtc.remoteAccessList.map(a => `${a.system} (ID: ${a.id}${a.password ? `, Senha: ${a.password}` : ""})`).join(" | ")
                )}
              </div>
              {(localDtc.soLogin || localDtc.soPassword || localDtc.osType || localDtc.osVersion) && (
                <div className="mt-1">
                  <strong>Acesso SO Servidor:</strong> {localDtc.osType && `${localDtc.osType} `}{localDtc.osVersion && `(${localDtc.osVersion})`} | Usuário: {localDtc.soLogin || "_____"} | Senha: {localDtc.soPassword || "_____"}
                </div>
              )}
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
                <div className="whitespace-pre-wrap min-h-20 pl-2 border-l-2 border-gray-400 italic mb-2">
                  <LexicalRenderer 
                    jsonStr={localDtc.implantationProcess} 
                    fallback="(Nenhum relato técnico registrado)" 
                  />
                </div>

                {localDtc.implantationProcessLogs && localDtc.implantationProcessLogs.length > 0 && (
                  <div className="mt-2 pl-2 border-l-2 border-gray-400 space-y-1">
                    <strong className="block text-[10px] uppercase tracking-wider text-gray-700 font-bold">Relatórios Diários:</strong>
                    {localDtc.implantationProcessLogs.map((log, idx) => (
                      <div key={idx} className="text-[11px] leading-relaxed">
                        <span className="font-semibold text-gray-800 mr-1.5">
                          {log.date ? new Date(log.date + "T00:00:00").toLocaleDateString("pt-BR") : ""}:
                        </span>
                        <span className="text-gray-700">{log.description || "(Sem descrição)"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>



              <div>
                <strong className="block mb-1 text-sm uppercase">Funcionários da Serventia:</strong>
                <div className="whitespace-pre-wrap min-h-16 pl-2 border-l-2 border-gray-400 italic">
                  {!localDtc.employeesList || localDtc.employeesList.length === 0 ? (
                    localDtc.employees || "(Nenhum colaborador listado)"
                  ) : (
                    localDtc.employeesList.map(e => `${e.name}${e.department ? ` (${e.department}${e.role ? ` - ${e.role}` : ""})` : ""}`).join(", ")
                  )}
                </div>
              </div>

              {localDtc.implantationGainsList && localDtc.implantationGainsList.length > 0 && (
                <div>
                  <strong className="block mb-1 text-sm uppercase">Ganhos Operacionais:</strong>
                  <div className="pl-2 border-l-2 border-gray-400 space-y-2 mb-2">
                    {localDtc.implantationGainsList.map((gain, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold text-gray-800">
                          {gain.product ? `[${gain.product}] ` : ""}
                          {gain.title || "(Sem título)"}
                          {gain.department ? ` - ${gain.department}` : ""}
                        </span>
                        <div className="text-gray-700 mt-0.5 pl-1 italic">
                          <LexicalRenderer jsonStr={gain.description} fallback="(Sem descrição)" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {localDtc.implantationPendingList && localDtc.implantationPendingList.length > 0 && (
                <div>
                  <strong className="block mb-1 text-sm uppercase">Pendências da Implantação:</strong>
                  <div className="pl-2 border-l-2 border-gray-400 space-y-2 mb-2">
                    {localDtc.implantationPendingList.map((pending, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800">
                            {pending.product ? `[${pending.product}] ` : ""}
                            {pending.title || "(Sem título)"}
                            {pending.department ? ` - ${pending.department}` : ""}
                            {pending.assignedTo ? ` (Responsável: ${pending.assignedTo})` : ""}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase",
                            pending.status === "Resolvido" && "bg-emerald-100 text-emerald-800",
                            pending.status === "Em andamento" && "bg-blue-100 text-blue-800",
                            pending.status === "Pendente" && "bg-amber-100 text-amber-800",
                            pending.status === "Cancelado" && "bg-gray-100 text-gray-800"
                          )}>
                            {pending.status}
                          </span>
                        </div>
                        <div className="text-gray-700 mt-0.5 pl-1 italic">
                          <LexicalRenderer jsonStr={pending.description} fallback="(Sem descrição)" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {localDtc.implantationSuggestionsList && localDtc.implantationSuggestionsList.length > 0 && (
                <div>
                  <strong className="block mb-1 text-sm uppercase">Sugestões de Melhorias:</strong>
                  <div className="pl-2 border-l-2 border-gray-400 space-y-2 mb-2">
                    {localDtc.implantationSuggestionsList.map((suggestion, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800">
                            {suggestion.product ? `[${suggestion.product}] ` : ""}
                            {suggestion.title || "(Sem título)"}
                            {suggestion.department ? ` - ${suggestion.department}` : ""}
                          </span>
                        </div>
                        <div className="text-gray-700 mt-0.5 pl-1 italic">
                          <LexicalRenderer jsonStr={suggestion.description} fallback="(Sem descrição)" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {localDtc.clientSatisfactionScore ? (
                <div className="mb-2">
                  <strong className="block mb-1 text-sm uppercase">Satisfação do Cliente:</strong>
                  <div className="pl-2 border-l-2 border-gray-400 flex items-center gap-1 text-xs mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < (localDtc.clientSatisfactionScore ?? 0)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-none text-gray-300"
                        )}
                      />
                    ))}
                    <span className="ml-1.5 font-bold text-amber-600">
                      {["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"][localDtc.clientSatisfactionScore ?? 0]}
                    </span>
                  </div>
                </div>
              ) : null}

              <div>
                <strong className="block mb-1 text-sm uppercase">Considerações Finais:</strong>
                <div className="whitespace-pre-wrap min-h-16 pl-2 border-l-2 border-gray-400 italic">
                  <LexicalRenderer 
                    jsonStr={localDtc.finalConsiderations} 
                    fallback="(Nenhuma consideração adicional)" 
                  />
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

export default TransicaoPlaceholder;

