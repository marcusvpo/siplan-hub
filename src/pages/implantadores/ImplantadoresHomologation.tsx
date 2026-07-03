import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  AlertTriangle,
  UserCheck,
  UserPlus,
  UserMinus,
  BookOpen,
  Bold,
  Italic,
  List,
  Image as ImageIcon,
  ChevronRight,
  Upload,
  ArrowLeft,
  ExternalLink,
  History,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Palette,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConversionPosts } from "@/hooks/useConversionPosts";
import { useHomologationEvents } from "@/hooks/useHomologationEvents";
import { ProjectTramite } from "@/types/ProjectV2";

interface ConversionQueueItem {
  id: string;
  projectId: string;
  clientName?: string;
  ticketNumber?: string;
  systemType?: string;
  legacySystem?: string;
  sentBy: string | null;
  sentByName: string;
  sentAt: Date;
  queueStatus: string;
  priority: number;
  assignedTo: string | null;
  assignedToName: string | null;
  homologationAnalyst: string | null;
  homologationAnalystName: string | null;
  homologationSentAt: Date | null;
  homologationStatus: string | null;
  deploymentDate: string | null;
}

export default function ImplantadoresHomologation() {
  const { user, team } = useAuth();
  const isImplantador = team === "implementation" || team === "implementer";
  const currentUserId = user?.id || "";
  const currentUserName =
    user?.user_metadata?.full_name || user?.email || "Implantador";
  const navigate = useNavigate();

  const [queue, setQueue] = useState<ConversionQueueItem[]>([]);
  
  // Selected item for validation modal
  const [selectedItem, setSelectedItem] = useState<ConversionQueueItem | null>(null);

  // Fetch context posts and events for the active project
  const { posts, loading: postsLoading } = useConversionPosts(selectedItem?.projectId || null);
  const { events, loading: eventsLoading } = useHomologationEvents(selectedItem?.projectId || null);

  const [tramites, setTramites] = useState<ProjectTramite[]>([]);
  const [tramitesLoading, setTramitesLoading] = useState(false);

  useEffect(() => {
    if (!selectedItem?.projectId) {
      setTramites([]);
      return;
    }
    const fetchTramites = async () => {
      setTramitesLoading(true);
      try {
        const { data, error } = await supabase
          .from("project_tramites")
          .select("*")
          .eq("project_id", selectedItem.projectId)
          .order("data_tramite", { ascending: false });
        if (!error && data) {
          setTramites(data);
        }
      } catch (err) {
        console.error("Error fetching tramites:", err);
      } finally {
        setTramitesLoading(false);
      }
    };
    fetchTramites();
  }, [selectedItem?.projectId]);

  const combinedTimeline = useMemo(() => {
    const items: Array<{
      id: string;
      timestamp: Date;
      type: "post" | "event" | "tramite";
      title: string;
      author: string;
      content: string;
      badgeStyle: string;
    }> = [];

    posts.forEach((post) => {
      let title = "Nota de Conversão";
      let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400";
      
      if (post.postType === "update") {
        title = "Atualização";
        badgeStyle = "bg-blue-50 text-blue-700 border-blue-150 dark:bg-blue-950/20 dark:text-blue-400";
      } else if (post.postType === "issue") {
        title = "Problema";
        badgeStyle = "bg-red-50 text-red-700 border-red-150 dark:bg-red-950/20 dark:text-red-400";
      } else if (post.postType === "resolution") {
        title = "Resolução";
        badgeStyle = "bg-green-50 text-green-700 border-green-150 dark:bg-emerald-950/20 dark:text-emerald-400";
      } else if (post.postType === "note") {
        title = "Nota";
        badgeStyle = "bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400";
      } else if (post.postType === "stage_change") {
        title = "Etapa Alterada";
        badgeStyle = "bg-purple-50 text-purple-700 border-purple-150 dark:bg-purple-950/20 dark:text-purple-400";
      }

      items.push({
        id: post.id,
        timestamp: new Date(post.createdAt),
        type: "post",
        title,
        author: post.authorName,
        content: post.content,
        badgeStyle,
      });
    });

    events.forEach((event) => {
      let title = "Movimentação";
      let badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-450";

      if (event.toStatus === "approved" || event.toStatus === "done") {
        title = "Aprovada";
        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400";
      } else if (event.toStatus === "homologation_issues") {
        title = "Com Inconsistências";
        badgeStyle = "bg-red-50 text-red-700 border-red-150 dark:bg-red-950/20 dark:text-red-400";
      } else if (event.toStatus === "awaiting_homologation") {
        title = "Enviado p/ Homologação";
        badgeStyle = "bg-indigo-50 text-indigo-750 border-indigo-150 dark:bg-indigo-950/30 dark:text-indigo-350";
      }

      items.push({
        id: event.id,
        timestamp: new Date(event.timestamp),
        type: "event",
        title,
        author: event.performedByName,
        content: event.notes || "",
        badgeStyle,
      });
    });

    tramites.forEach((tramite) => {
      items.push({
        id: tramite.id,
        timestamp: new Date(tramite.data_tramite),
        type: "tramite",
        title: tramite.etapa_projeto || "Trâmite (0800)",
        author: tramite.responsavel_atividade || "Sistema",
        content: (tramite.descricao_tramite || "").replace(/^\uFEFF/, ""),
        badgeStyle: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400",
      });
    });

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [posts, events, tramites]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [systemFilter, setSystemFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("general-queue");

  const [verdictModalOpen, setVerdictModalOpen] = useState(false);
  const [verdictType, setVerdictType] = useState<"approve" | "issues" | null>(null);

  // Rich Text Editor State
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch homologation queue from database
  const fetchQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversion_queue")
        .select(`
          *,
          projects!inner (
            client_name,
            ticket_number,
            system_type,
            legacy_system,
            implementation_phase1
          )
        `)
        .order("priority", { ascending: true })
        .order("sent_at", { ascending: true });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: ConversionQueueItem[] = (data || []).map((item: any) => ({
        id: item.id,
        projectId: item.project_id,
        clientName: item.projects?.client_name,
        ticketNumber: item.projects?.ticket_number,
        systemType: item.projects?.system_type,
        legacySystem: item.projects?.legacy_system,
        sentBy: item.sent_by,
        sentByName: item.sent_by_name,
        sentAt: new Date(item.sent_at),
        queueStatus: item.queue_status,
        priority: item.priority,
        assignedTo: item.assigned_to,
        assignedToName: item.assigned_to_name,
        homologationAnalyst: item.homologation_analyst,
        homologationAnalystName: item.homologation_analyst_name,
        homologationSentAt: item.homologation_sent_at ? new Date(item.homologation_sent_at) : null,
        homologationStatus: item.homologation_status,
        deploymentDate: (() => {
          try {
            const phase1 = item.projects?.implementation_phase1;
            if (phase1 && typeof phase1 === 'object' && (phase1 as Record<string, unknown>).startDate) {
              return (phase1 as Record<string, unknown>).startDate as string;
            }
          } catch { /* ignore parse errors */ }
          return null;
        })(),
      }));

      setQueue(items);
    } catch (err) {
      console.error("Error fetching queue:", err);
      toast.error("Erro ao carregar fila de homologação");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Filter systems list dynamically for dropdown
  const systemTypes = useMemo(() => {
    const types = new Set<string>();
    queue.forEach((item) => {
      if (item.systemType) types.add(item.systemType);
    });
    return Array.from(types);
  }, [queue]);

  // General Filtered Lists
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      // Show only active homologations (awaiting_homologation or homologation status)
      const isActiveHomologation =
        item.queueStatus === "awaiting_homologation" ||
        item.queueStatus === "homologation";

      if (!isActiveHomologation) return false;

      const matchesSearch =
        !searchQuery ||
        item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSystem =
        systemFilter === "all" || item.systemType === systemFilter;

      return matchesSearch && matchesSystem;
    });
  }, [queue, searchQuery, systemFilter]);

  // Minha Fila: assigned to me
  const myQueue = useMemo(() => {
    return filteredQueue.filter((item) => item.homologationAnalyst === currentUserId);
  }, [filteredQueue, currentUserId]);

  // Fila Geral: all active, sorted so unassigned are highlighted or viewable
  const generalQueue = filteredQueue;

  // Stats
  const stats = useMemo(() => {
    const active = queue.filter(
      (i) => i.queueStatus === "awaiting_homologation" || i.queueStatus === "homologation"
    );
    const unassigned = active.filter((i) => !i.homologationAnalyst).length;
    const assignedToMeCount = active.filter((i) => i.homologationAnalyst === currentUserId).length;
    return { total: active.length, unassigned, mine: assignedToMeCount };
  }, [queue, currentUserId]);

  // Action: Assume homologation
  const handleAssume = async (item: ConversionQueueItem) => {
    try {
      const { error: queueError } = await supabase
        .from("conversion_queue")
        .update({
          homologation_analyst: currentUserId,
          homologation_analyst_name: currentUserName,
          queue_status: "homologation",
        })
        .eq("id", item.id);

      if (queueError) throw queueError;

      // Log to homologation_events
      const { error: logError } = await supabase
        .from("homologation_events")
        .insert({
          project_id: item.projectId,
          from_status: item.queueStatus,
          to_status: "homologation",
          performed_by: currentUserId,
          performed_by_name: currentUserName,
          notes: "Homologação assumida pelo implantador responsável.",
          issues_count: 0,
        });

      if (logError) console.error("Error logging event:", logError);

      toast.success("Homologação assumida com sucesso!");
      fetchQueue();
    } catch (err) {
      console.error("Error assuming homologation:", err);
      toast.error("Erro ao assumir homologação");
    }
  };

  // Action: Release homologation back to queue
  const handleRelease = async (item: ConversionQueueItem) => {
    try {
      const { error: queueError } = await supabase
        .from("conversion_queue")
        .update({
          homologation_analyst: null,
          homologation_analyst_name: null,
          queue_status: "awaiting_homologation",
        })
        .eq("id", item.id);

      if (queueError) throw queueError;

      // Log to homologation_events
      const { error: logError } = await supabase
        .from("homologation_events")
        .insert({
          project_id: item.projectId,
          from_status: item.queueStatus,
          to_status: "awaiting_homologation",
          performed_by: currentUserId,
          performed_by_name: currentUserName,
          notes: "Homologação devolvida para a fila geral.",
          issues_count: 0,
        });

      if (logError) console.error("Error logging event:", logError);

      toast.success("Homologação devolvida para a fila geral.");
      fetchQueue();
    } catch (err) {
      console.error("Error releasing homologation:", err);
      toast.error("Erro ao devolver homologação");
    }
  };

  // Image Upload handler
  const handleImageUpload = async (file: File, projectId: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      let ext = "png";
      if (file.name && file.name.includes(".")) {
        const parts = file.name.split(".");
        const lastPart = parts.pop();
        if (lastPart && lastPart.toLowerCase() !== "blob") {
          ext = lastPart;
        } else if (file.type) {
          ext = file.type.split("/").pop() || "png";
        }
      } else if (file.type) {
        ext = file.type.split("/").pop() || "png";
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("conversion-posts")
        .upload(filePath, file, {
          contentType: file.type || 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("conversion-posts")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Erro ao enviar imagem");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Insert HTML at cursor helper
  const insertHtmlAtCursor = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    
    // Fallback if selection isn't inside editor
    const sel = window.getSelection();
    let range: Range | null = null;
    
    if (sel && sel.rangeCount > 0) {
      const activeRange = sel.getRangeAt(0);
      if (editor.contains(activeRange.commonAncestorContainer)) {
        range = activeRange;
      }
    }
    
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false); // collapse to end
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    range.deleteContents();
    
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node;
    let lastNode;
    while ((node = tempDiv.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    
    range.insertNode(frag);
    
    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    }
  };

  // Intercept Paste for Clipboard Images
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!selectedItem) return;
    
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const files: File[] = [];
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        files.push(clipboardData.files[i]);
      }
    } else if (clipboardData.items && clipboardData.items.length > 0) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          toast.loading("Enviando print colado...", { id: "paste-upload" });
          const url = await handleImageUpload(file, selectedItem.projectId);
          if (url) {
            insertHtmlAtCursor(`<img src="${url}" class="max-w-full my-2 rounded border border-slate-200 shadow-sm" alt="Evidence Print" />`);
            toast.success("Print colado e anexado inline!", { id: "paste-upload" });
          } else {
            toast.error("Erro ao colar print", { id: "paste-upload" });
          }
        }
      }
    }
  };

  // File Upload via Button
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedItem || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.type.startsWith("image/")) {
      toast.loading("Enviando imagem...", { id: "btn-upload" });
      const url = await handleImageUpload(file, selectedItem.projectId);
      if (url) {
        insertHtmlAtCursor(`<img src="${url}" class="max-w-full my-2 rounded border border-slate-200 shadow-sm" alt="Evidence Print" />`);
        toast.success("Imagem inserida inline!", { id: "btn-upload" });
      } else {
        toast.error("Erro ao fazer upload da imagem", { id: "btn-upload" });
      }
    }
    // Reset file input
    e.target.value = "";
  };

  // Format commands for Rich Editor
  const formatDoc = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Open Verdict Modal
  const openVerdict = (type: "approve" | "issues") => {
    const reportHtml = editorRef.current?.innerHTML || "";
    
    if (type === "issues" && (!reportHtml || reportHtml === "<br>" || reportHtml.trim() === "")) {
      toast.error("Por favor, descreva as inconsistências encontradas no editor antes de retornar.");
      return;
    }

    setVerdictType(type);
    setVerdictModalOpen(true);
  };

  // Action: Submit Homologation Report (Verdict)
  const submitVerdict = async () => {
    if (!selectedItem || !verdictType) return;
    
    const reportHtml = editorRef.current?.innerHTML || "";
    toast.loading("Enviando resultado...", { id: "verdict-submit" });

    try {
      if (verdictType === "issues") {
        // Path 1: With Issues (Retornar para Conversão)
        // 1. Update queue status
        const { error: queueError } = await supabase
          .from("conversion_queue")
          .update({
            queue_status: "homologation_issues",
            homologation_status: "issues_found",
            notes: "Retornado para correções com inconsistências.",
          })
          .eq("id", selectedItem.id);

        if (queueError) throw queueError;

        // 2. Update project
        const { error: projectError } = await supabase
          .from("projects")
          .update({
            conversion_homologation_status: "with_issues",
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedItem.projectId);

        if (projectError) throw projectError;

        // 3. Log event to homologation_events
        const { error: logError } = await supabase
          .from("homologation_events")
          .insert({
            project_id: selectedItem.projectId,
            from_status: "homologation",
            to_status: "homologation_issues",
            performed_by: currentUserId,
            performed_by_name: currentUserName,
            notes: reportHtml,
            issues_count: 1,
          });

        if (logError) throw logError;

        // 4. Send Notification to conversion analyst
        await supabase.from("notifications").insert({
          user_id: selectedItem.assignedTo || null,
          team: selectedItem.assignedTo ? null : "conversion",
          project_id: selectedItem.projectId,
          type: "homologation_issues",
          title: "Homologação Recusada (Inconsistências)",
          message: `${selectedItem.clientName} retornou da homologação com inconsistências apontadas por ${currentUserName}.`,
          action_url: "/conversion",
        });

        toast.success("Parecer enviado! Projeto retornado para a fila de Conversão.", { id: "verdict-submit" });
      } else {
        // Path 2: Approved / No Inconsistencies (Sem Inconsistências)
        // 1. Update queue status
        const { error: queueError } = await supabase
          .from("conversion_queue")
          .update({
            queue_status: "done",
            homologation_status: "approved",
            completed_at: new Date().toISOString(),
            notes: "Homologação aprovada. Conversão concluída.",
          })
          .eq("id", selectedItem.id);

        if (queueError) throw queueError;

        // 2. Update project (set stage 3 "conversion_status" to done)
        const { error: projectError } = await supabase
          .from("projects")
          .update({
            conversion_status: "done",
            conversion_homologation_status: "approved",
            conversion_finished_at: new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedItem.projectId);

        if (projectError) throw projectError;

        // 3. Log event to homologation_events
        const { error: logError } = await supabase
          .from("homologation_events")
          .insert({
            project_id: selectedItem.projectId,
            from_status: "homologation",
            to_status: "approved",
            performed_by: currentUserId,
            performed_by_name: currentUserName,
            notes: reportHtml || "<p>Homologação aprovada sem restrições.</p>",
            issues_count: 0,
          });

        if (logError) throw logError;

        // 4. Send Notification to conversion team & leaders
        await supabase.from("notifications").insert({
          team: "conversion",
          project_id: selectedItem.projectId,
          type: "homologation_approved",
          title: "Homologação Aprovada! 🎉",
          message: `A conversão de ${selectedItem.clientName} foi totalmente aprovada por ${currentUserName}. A etapa de conversão foi concluída.`,
          action_url: "/conversion",
        });

        toast.success("Homologação aprovada! Etapa de Conversão de Dados concluída com sucesso.", { id: "verdict-submit" });
      }

      setVerdictModalOpen(false);
      setVerdictType(null);
      setSelectedItem(null); // Close main form drawer
      fetchQueue();
    } catch (err) {
      console.error("Error submitting verdict:", err);
      toast.error("Erro ao enviar parecer de homologação", { id: "verdict-submit" });
    }
  };

  // Render Queue Cards
  const renderItemCard = (item: ConversionQueueItem, mode: "action" | "readonly" = "action") => {
    const isMine = item.homologationAnalyst === currentUserId;
    const isUnassigned = !item.homologationAnalyst;
    const daysInQueue = Math.floor(
      (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <Card
        key={item.id}
        className={cn(
          "transition-all duration-300 border-l-4 hover:shadow-md",
          mode === "action"
            ? cn(
                isUnassigned && "border-l-amber-500",
                isMine && "border-l-primary",
                !isMine && !isUnassigned && "border-l-slate-350 dark:border-l-slate-800"
              )
            : cn(
                isUnassigned && "border-l-amber-500/60",
                isMine && "border-l-primary/60",
                !isMine && !isUnassigned && "border-l-slate-300 dark:border-l-slate-800"
              )
        )}
      >
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg text-foreground truncate">
                {item.clientName}
              </h3>
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400">
                {item.systemType}
              </Badge>
              {item.legacySystem && (
                <span className="text-xs text-muted-foreground">
                  ← {item.legacySystem}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">#{item.ticketNumber}</span>
              <span>
                Enviado{" "}
                {formatDistanceToNow(item.sentAt, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              <span>Convertido por: <strong>{item.assignedToName || "Sem analista"}</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {item.homologationAnalystName ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/10 dark:text-emerald-400 gap-1 text-[11px]">
                  <UserCheck className="h-3 w-3" />
                  Implantador: {item.homologationAnalystName}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400 gap-1 text-[11px]">
                  <Clock className="h-3 w-3" />
                  Em Aberto (Fila)
                </Badge>
              )}
              {item.deploymentDate && (
                <span className="text-[11px] text-muted-foreground">
                  📅 Prev. Implantação: <strong>{format(new Date(item.deploymentDate), "dd/MM/yyyy")}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l md:pl-4 border-slate-100 dark:border-slate-800">
            <span className="text-xs text-muted-foreground mr-2 font-medium">{daysInQueue}d na fila</span>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/projects/${item.projectId}`)}
              className="text-xs h-9 flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Detalhes
            </Button>

            {mode === "action" && (
              <>
                {isUnassigned ? (
                  isImplantador ? (
                    <Button
                      size="sm"
                      onClick={() => handleAssume(item)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 flex items-center gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Assumir
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs h-9 flex items-center gap-1.5 px-3 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                      Aguardando Implantador
                    </Badge>
                  )
                ) : isMine ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRelease(item)}
                      className="text-xs h-9 flex items-center gap-1.5 border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Devolver
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs h-9 flex items-center gap-1.5"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Validar
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="text-xs h-9"
                  >
                    Atribuído a {item.homologationAnalystName?.split(" ")[0]}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background to-muted/30 overflow-hidden">
      {/* Drawer Mode: If a item is being validated, show the full details panel */}
      {selectedItem ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Editor Header */}
          <div className="flex-shrink-0 p-4 border-b flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedItem(null)}
                className="hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground">
                    Parecer de Homologação: {selectedItem.clientName}
                  </h1>
                  <Badge className="bg-slate-700 text-white font-mono text-[10px]">
                    #{selectedItem.ticketNumber}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sistema: {selectedItem.systemType} {selectedItem.legacySystem ? `(Migrado de: ${selectedItem.legacySystem})` : ""}
                </p>
              </div>
            </div>
            
            {/* Verdict Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => openVerdict("issues")}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 flex items-center gap-1.5 border border-red-700/30 shadow-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Com Inconsistências
              </Button>
              <Button
                variant="default"
                onClick={() => openVerdict("approve")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 flex items-center gap-1.5 border border-emerald-700/30 shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprovar Homologação
              </Button>
            </div>
          </div>

          {/* Validation Form Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Context Card */}
            <div className="w-80 border-r p-5 flex flex-col gap-5 bg-muted/10 overflow-hidden h-full">
              <div className="shrink-0">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Dados da Conversão</h4>
                <div className="space-y-3 text-sm bg-card p-3 rounded-lg border">
                  <div>
                    <span className="text-xs text-muted-foreground block">Convertido por</span>
                    <span className="font-semibold text-foreground">{selectedItem.assignedToName || "Sem analista"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Data de Envio</span>
                    <span className="font-medium text-foreground">
                      {selectedItem.homologationSentAt 
                        ? format(selectedItem.homologationSentAt, "dd/MM/yyyy HH:mm")
                        : format(selectedItem.sentAt, "dd/MM/yyyy HH:mm")
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline feed */}
              <div className="flex-1 flex flex-col min-h-0">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 shrink-0">
                  <History className="h-3.5 w-3.5 text-primary" />
                  Histórico da Conversão
                </h4>
                
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 pt-1">
                  {postsLoading || eventsLoading || tramitesLoading ? (
                    <div className="text-center py-6 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Carregando histórico...
                    </div>
                  ) : combinedTimeline.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg p-4 bg-background">
                      Nenhum registro encontrado.
                    </div>
                  ) : (
                    <div className="space-y-4 relative pl-3 border-l border-slate-200 dark:border-slate-800 ml-1.5 py-1">
                      {combinedTimeline.map((item) => {
                        const isApproved = item.title === "Aprovada" || item.title === "Homologação Aprovada";
                        const isIssues = item.title === "Com Inconsistências" || item.title === "Inconsistência/Problema" || item.title === "Problema";
                        
                        return (
                           <div key={item.id} className="relative space-y-1">
                             {/* Timeline Bullet */}
                             <div className={cn(
                               "absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border bg-background shadow-xs",
                               isApproved && "border-emerald-500 bg-emerald-500",
                               isIssues && "border-red-500 bg-red-500",
                               !isApproved && !isIssues && "border-primary bg-primary"
                             )} />
                             
                             <div className="flex items-center justify-between gap-1.5 flex-wrap">
                               <span className="text-[10px] font-bold text-foreground">
                                 {item.title}
                               </span>
                               <span className="text-[9px] text-muted-foreground font-mono">
                                 {format(item.timestamp, "dd/MM HH:mm")}
                               </span>
                             </div>
                             
                             <p className="text-[9px] text-muted-foreground">
                               Por: <strong className="text-foreground text-[10px]">{item.author}</strong>
                             </p>
                             
                             {item.content && (
                               <div 
                                 className="text-[11px] leading-relaxed p-2 bg-background border rounded-md max-w-full overflow-x-auto break-words prose prose-sm dark:prose-invert max-h-36 overflow-y-auto"
                                 dangerouslySetInnerHTML={{ __html: item.content }}
                               />
                             )}
                           </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: LibreOffice Style Text Editor */}
            <div className="flex-1 flex flex-col overflow-hidden p-5">
              <Label className="text-sm font-bold mb-2 text-foreground">Relatório Detalhado de Homologação (Parecer Conclusivo)</Label>
              
              {/* Text formatting bar */}
              <div className="flex items-center gap-1 p-2 bg-muted/40 border border-b-0 rounded-t-md flex-wrap">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("bold")} title="Negrito">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("italic")} title="Itálico">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("underline")} title="Sublinhado">
                  <Underline className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("strikeThrough")} title="Tachado">
                  <Strikethrough className="h-4 w-4" />
                </Button>
                
                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1.5" />
                
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("formatBlock", "h1")} title="Título 1">
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("formatBlock", "h2")} title="Título 2">
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("formatBlock", "h3")} title="Título 3">
                  <Heading3 className="h-4 w-4" />
                </Button>
                
                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1.5" />
                
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("justifyLeft")} title="Alinhar à Esquerda">
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("justifyCenter")} title="Alinhar ao Centro">
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("justifyRight")} title="Alinhar à Direita">
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("justifyFull")} title="Justificar">
                  <AlignJustify className="h-4 w-4" />
                </Button>
                
                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1.5" />
                
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("insertUnorderedList")} title="Lista de Marcadores">
                  <List className="h-4 w-4" />
                </Button>
                
                <div className="relative flex items-center">
                  <input
                    type="color"
                    id="textColorPicker"
                    className="sr-only"
                    onChange={(e) => formatDoc("foreColor", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => document.getElementById("textColorPicker")?.click()}
                    title="Cor do Texto"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1.5" />
                
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("undo")} title="Desfazer">
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => formatDoc("redo")} title="Refazer">
                  <Redo className="h-4 w-4" />
                </Button>
                
                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1.5" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 hover:bg-muted text-xs text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon className="h-4 w-4" />
                  Inserir Print/Imagem
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {isUploading && (
                  <span className="text-xs text-primary animate-pulse ml-auto flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Enviando imagem...
                  </span>
                )}
              </div>

              {/* Editable Div */}
              <div
                ref={editorRef}
                contentEditable
                onPaste={handlePaste}
                className="flex-1 border p-4 bg-background rounded-b-md overflow-y-auto prose dark:prose-invert max-w-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary border-slate-200 min-h-[300px]"
                style={{ contentVisibility: "auto" }}
                data-placeholder="Escreva seu parecer técnico e cole imagens de evidências aqui..."
              />

              {/* Horizontal Instructions Box */}
              <div className="mt-4 shrink-0 text-xs text-muted-foreground leading-relaxed bg-primary/5 border border-primary/10 p-3 rounded-lg">
                <span className="font-bold text-primary block mb-1.5 text-[10px] uppercase tracking-wider">Instruções de Preenchimento</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    Substitua o arquivo Word de homologação preenchendo o parecer no editor acima diretamente.
                  </div>
                  <div>
                    <strong>Prints de Telas:</strong> Copie e cole imagens do seu clipboard (<code>Ctrl+V</code>) diretamente no texto para inserir imagens inline no seu parecer.
                  </div>
                  <div>
                    Se o parecer for <strong>Com Inconsistências</strong>, detalhe os erros no parecer para que a equipe de conversão saiba o que corrigir.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Dashboard Fila View
        <>
          {/* Header */}
          <div className="flex-shrink-0 p-6 pb-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Homologação de Conversões</h1>
                  <p className="text-muted-foreground">
                    Validação final de dados e geração de parecer técnico
                  </p>
                </div>
              </div>
              <Button onClick={fetchQueue} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-800/40">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 block mb-1">
                      Minhas Homologações
                    </span>
                    <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">{stats.mine}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-indigo-500/40" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800/40">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                      Aguardando Implantador (Em Aberto)
                    </span>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{stats.unassigned}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500/40" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/20 dark:to-slate-900/10 border-slate-250 dark:border-slate-800/40">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-400 block mb-1">
                      Total na Fila
                    </span>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-300">{stats.total}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-slate-500/40" />
                </CardContent>
              </Card>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente ou ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Sistemas</SelectItem>
                  {systemTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden px-6 pt-4"
          >
            <TabsList className="mb-4 flex-shrink-0">
              {isImplantador && (
                <TabsTrigger value="my-queue" className="gap-2 relative">
                  Minha Fila
                  {myQueue.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="ml-1 bg-primary text-white hover:bg-primary">
                        {myQueue.length}
                      </Badge>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    </span>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="general-queue" className="gap-2 relative">
                Fila Geral (Todos)
                {generalQueue.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="ml-1">
                      {generalQueue.length}
                    </Badge>
                    {stats.unassigned > 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Content Lists */}
            <div className="flex-1 overflow-y-auto pb-6 space-y-3">
              <TabsContent value="my-queue" className="mt-0 space-y-3 focus-visible:outline-none">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Carregando homologações...
                  </div>
                ) : myQueue.length === 0 ? (
                  <Card className="p-12 text-center border-2 border-dashed">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
                    <h3 className="text-lg font-medium mb-1">
                      Sua fila está limpa!
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Assuma tarefas de homologação na Fila Geral para começar.
                    </p>
                  </Card>
                ) : (
                  myQueue.map((item) => renderItemCard(item, "action"))
                )}
              </TabsContent>

              <TabsContent value="general-queue" className="mt-0 space-y-3 focus-visible:outline-none">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Carregando fila geral...
                  </div>
                ) : generalQueue.length === 0 ? (
                  <Card className="p-12 text-center border-2 border-dashed">
                    <AlertCircle className="h-12 w-12 mx-auto text-slate-350 mb-4" />
                    <h3 className="text-lg font-medium mb-1">
                      Nenhuma homologação ativa
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      As demandas de homologação aparecerão aqui quando forem finalizadas pelo time de conversão.
                    </p>
                  </Card>
                ) : (
                  generalQueue.map((item) => renderItemCard(item, "readonly"))
                )}
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}

      {/* Verdict Confirmation Dialog */}
      <Dialog open={verdictModalOpen} onOpenChange={setVerdictModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verdictType === "approve"
                ? "Aprovar Homologação"
                : "Retornar com Inconsistências"}
            </DialogTitle>
            <DialogDescription>
              {verdictType === "approve"
                ? `Confirmar aprovação definitiva do projeto "${selectedItem?.clientName}"?`
                : `Confirmar devolução do projeto "${selectedItem?.clientName}" para correções?`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-lg border text-sm">
            {verdictType === "approve" ? (
              <p className="text-emerald-700 dark:text-emerald-400">
                ✓ A etapa de Conversão de Dados deste projeto será concluída (status: Concluído), o projeto avançará no pipeline e o parecer conclusivo será gravado permanentemente.
              </p>
            ) : (
              <p className="text-red-700 dark:text-red-400">
                ⚠ O projeto retornará para a Fila de Conversão com o status de "Inconsistências" para revisão. O analista de conversão receberá uma notificação contendo seu relatório de inconsistências.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVerdictModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitVerdict}
               className={cn(
                 "text-white font-semibold",
                 verdictType === "approve"
                   ? "bg-emerald-600 hover:bg-emerald-700"
                   : "bg-red-600 hover:bg-red-700"
               )}
            >
              {verdictType === "approve" ? "Aprovar Definitivamente" : "Devolver para Conversão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
