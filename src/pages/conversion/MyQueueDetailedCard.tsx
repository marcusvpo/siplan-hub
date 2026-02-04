import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  Send,
  CheckCircle2,
  RefreshCw,
  Rocket,
  Power,
  ExternalLink,
  FileText,
  Building,
  ArrowRight,
  Eye,
  User,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversionQueueItem } from "@/hooks/useConversionQueue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";

type StatusType =
  | "Adequado"
  | "Parcialmente Adequado"
  | "Inadequado"
  | "Aguardando Adequação";

type StageStatus =
  | "todo"
  | "in-progress"
  | "done"
  | "blocked"
  | "waiting_adjustment";

// Conversion fields from the project
interface ConversionFields {
  status: StageStatus;
  responsible: string | null;
  startDate: string | null;
  endDate: string | null;
  homologationStatus: string | null;
  homologationResponsible: string | null;
  sentAt: string | null;
  finishedAt: string | null;
  observations: string | null;
}

// Project info for display
interface ProjectInfo {
  projectLeader: string | null;
  implantationType: string | null;
  legacySystem: string | null;
  soldHours: number | null;
  description: string | null;
}

interface MyQueueDetailedCardProps {
  item: ConversionQueueItem;
  onSendToHomologation: (item: ConversionQueueItem) => void;
  onTransfer: (item: ConversionQueueItem) => void;
}

export function MyQueueDetailedCard({
  item,
  onSendToHomologation,
  onTransfer,
}: MyQueueDetailedCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<ConversionFields>({
    status: "todo",
    responsible: null,
    startDate: null,
    endDate: null,
    homologationStatus: null,
    homologationResponsible: null,
    sentAt: null,
    finishedAt: null,
    observations: null,
  });
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    projectLeader: null,
    implantationType: null,
    legacySystem: null,
    soldHours: null,
    description: null,
  });

  // Fetch project data when modal opens
  useEffect(() => {
    if (!isOpen || !item.projectId) return;

    const fetchProject = async () => {
      setLoading(true);
      try {
        // Using type assertion because Supabase generated types may be outdated
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", item.projectId)
          .single();

        if (error) throw error;

        if (data) {
          // Cast to any to access fields that may not be in generated types
          const d = data as Record<string, unknown>;
          setFields({
            status: (d.conversion_status as StageStatus) || "todo",
            responsible: d.conversion_responsible as string | null,
            startDate: d.conversion_start_date as string | null,
            endDate: d.conversion_end_date as string | null,
            homologationStatus: d.conversion_homologation_status as
              | string
              | null,
            homologationResponsible: d.conversion_homologation_responsible as
              | string
              | null,
            sentAt: d.conversion_sent_at as string | null,
            finishedAt: d.conversion_finished_at as string | null,
            observations: d.conversion_observations as string | null,
          });
          setProjectInfo({
            projectLeader: d.project_leader as string | null,
            implantationType: d.implantation_type as string | null,
            legacySystem: d.legacy_system as string | null,
            soldHours: d.sold_hours as number | null,
            description: d.description as string | null,
          });
        }
      } catch (err) {
        console.error("Error fetching project:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [isOpen, item.projectId]);

  // Update field in database
  const updateField = async (dbField: string, value: unknown) => {
    if (!item.projectId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          [dbField]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.projectId);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating field:", err);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (
    fieldName: keyof ConversionFields,
    value: unknown,
    dbField: string,
  ) => {
    setFields((prev) => ({ ...prev, [fieldName]: value }));
    updateField(dbField, value);
  };

  const daysInQueue = item.sentAt
    ? Math.floor(
        (new Date().getTime() - item.sentAt.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-300",
    in_progress: "bg-blue-100 text-blue-700 border-blue-300",
    awaiting_homologation: "bg-purple-100 text-purple-700 border-purple-300",
    homologation: "bg-violet-100 text-violet-700 border-violet-300",
    approved: "bg-green-100 text-green-700 border-green-300",
    done: "bg-emerald-100 text-emerald-700 border-emerald-300",
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em Andamento",
    awaiting_homologation: "Aguard. Homologação",
    homologation: "Em Homologação",
    homologation_issues: "Inconsistências",
    approved: "Aprovado",
    done: "Concluído",
  };

  // Helper for Rich Text
  const getEditorContent = (obs?: string | null) => {
    if (!obs) return "";
    try {
      const parsed = JSON.parse(obs);
      if (Array.isArray(parsed)) return convertBlocksToTiptap(parsed);
      return parsed;
    } catch {
      return obs;
    }
  };

  const statusOptions = [
    { value: "todo", label: "Não Iniciado", color: "text-slate-600" },
    { value: "in-progress", label: "Em Andamento", color: "text-blue-600" },
    { value: "done", label: "Finalizado", color: "text-emerald-600" },
    { value: "blocked", label: "Bloqueado", color: "text-amber-600" },
  ];

  return (
    <>
      {/* Compact Card */}
      <Card
        className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left Side - Client Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-bold text-lg text-purple-900 truncate">
                  {item.clientName}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs shrink-0",
                    STATUS_COLORS[item.queueStatus],
                  )}
                >
                  {STATUS_LABELS[item.queueStatus] || item.queueStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono bg-purple-100 px-2 py-0.5 rounded">
                  #{item.ticketNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" />
                  {item.systemType}
                </span>
              </div>
            </div>

            {/* Right Side - Priority & Actions */}
            <div className="flex items-center gap-3">
              <Badge
                className={cn(
                  "text-sm font-bold",
                  item.priority <= 2
                    ? "bg-red-500 text-white"
                    : item.priority <= 4
                      ? "bg-orange-500 text-white"
                      : "bg-slate-500 text-white",
                )}
              >
                P{item.priority}
              </Badge>
              <span
                className={cn(
                  "text-sm font-bold px-2 py-1 rounded",
                  daysInQueue > 5
                    ? "bg-red-100 text-red-700"
                    : daysInQueue > 3
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-700",
                )}
              >
                {daysInQueue}d
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
                Detalhes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-purple-900 flex items-center gap-3">
                  {item.clientName}
                  <Badge
                    variant="outline"
                    className={cn("text-sm", STATUS_COLORS[item.queueStatus])}
                  >
                    {STATUS_LABELS[item.queueStatus] || item.queueStatus}
                  </Badge>
                </DialogTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="font-mono bg-purple-100 px-2 py-0.5 rounded">
                    #{item.ticketNumber}
                  </span>
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    {item.systemType}
                  </span>
                  {item.legacySystem && (
                    <span className="text-xs">← {item.legacySystem}</span>
                  )}
                  <a
                    href={`/projects?id=${item.projectId}`}
                    className="text-purple-600 hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver Projeto <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-sm font-bold",
                    item.priority <= 2
                      ? "bg-red-500 text-white"
                      : item.priority <= 4
                        ? "bg-orange-500 text-white"
                        : "bg-slate-500 text-white",
                  )}
                >
                  P{item.priority}
                </Badge>
                {saving && (
                  <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                )}
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Carregando dados...
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Project Info Section */}
              <div className="bg-slate-50 rounded-lg p-4 border">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <Building className="h-4 w-4" />
                  Informações do Projeto
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Líder do Projeto
                    </span>
                    <span className="font-medium">
                      {projectInfo.projectLeader || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Tipo de Implantação
                    </span>
                    <span className="font-medium capitalize">
                      {projectInfo.implantationType?.replace("_", " ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Sistema Legado
                    </span>
                    <span className="font-medium">
                      {projectInfo.legacySystem || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Horas Vendidas
                    </span>
                    <span className="font-medium">
                      {projectInfo.soldHours || "—"}
                    </span>
                  </div>
                  {projectInfo.description && (
                    <div className="col-span-full">
                      <span className="text-xs text-muted-foreground block">
                        Descrição
                      </span>
                      <span className="font-medium">
                        {projectInfo.description}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion Stage Section */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-bold text-purple-700 flex items-center gap-2 mb-4">
                  <Database className="h-4 w-4" />
                  3. Conversão de Dados
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Status
                    </Label>
                    <Select
                      value={fields.status}
                      onValueChange={(v) =>
                        handleFieldChange("status", v, "conversion_status")
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-11 font-medium border-2 transition-all duration-200",
                          fields.status === "done" &&
                            "bg-emerald-50 text-emerald-900 border-emerald-300",
                          fields.status === "in-progress" &&
                            "bg-blue-50 text-blue-900 border-blue-300",
                          fields.status === "blocked" &&
                            "bg-amber-50 text-amber-900 border-amber-300",
                          fields.status === "todo" &&
                            "bg-slate-50 text-slate-900 border-slate-300",
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className={cn("font-medium", opt.color)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full",
                                  opt.value === "done" && "bg-emerald-500",
                                  opt.value === "in-progress" && "bg-blue-500",
                                  opt.value === "blocked" && "bg-amber-500",
                                  opt.value === "todo" && "bg-slate-400",
                                )}
                              />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Responsável - Read Only (auto preenchido ao assumir) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-violet-600 flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Responsável
                    </Label>
                    <Input
                      value={fields.responsible || item.assignedToName || "—"}
                      disabled
                      className="h-11 border-2 border-violet-200 bg-violet-50/50 font-medium text-violet-900"
                    />
                  </div>

                  {/* Enviado em */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-2">
                      <Rocket className="h-3.5 w-3.5" />
                      Enviado em
                    </Label>
                    <Input
                      type="date"
                      value={fields.sentAt ? fields.sentAt.split("T")[0] : ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? e.target.value + "T12:00:00Z"
                          : null;
                        handleFieldChange(
                          "sentAt",
                          value,
                          "conversion_sent_at",
                        );
                      }}
                      className="h-11 border-2 border-cyan-200 hover:border-cyan-300 focus:border-cyan-400 bg-cyan-50/50 font-medium"
                    />
                  </div>

                  {/* Finalizado em */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                      <Power className="h-3.5 w-3.5" />
                      Finalizado em
                    </Label>
                    <Input
                      type="date"
                      value={
                        fields.finishedAt ? fields.finishedAt.split("T")[0] : ""
                      }
                      onChange={(e) => {
                        const value = e.target.value
                          ? e.target.value + "T12:00:00Z"
                          : null;
                        handleFieldChange(
                          "finishedAt",
                          value,
                          "conversion_finished_at",
                        );
                      }}
                      className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-rose-50/50 font-medium"
                    />
                  </div>
                </div>

                {/* Homologation Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-purple-200">
                  {/* Status Homologação */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-fuchsia-600 flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Status Homologação
                    </Label>
                    <Select
                      value={fields.homologationStatus || ""}
                      onValueChange={(v) =>
                        handleFieldChange(
                          "homologationStatus",
                          v,
                          "conversion_homologation_status",
                        )
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-11 border-2 font-medium transition-all",
                          fields.homologationStatus === "Adequado" &&
                            "bg-green-50 text-green-800 border-green-300",
                          fields.homologationStatus ===
                            "Parcialmente Adequado" &&
                            "bg-orange-50 text-orange-800 border-orange-300",
                          fields.homologationStatus === "Inadequado" &&
                            "bg-red-50 text-red-800 border-red-300",
                          fields.homologationStatus ===
                            "Aguardando Adequação" &&
                            "bg-gray-50 text-gray-800 border-gray-300",
                        )}
                      >
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="Adequado"
                          className="text-green-600 font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            Adequado
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="Parcialmente Adequado"
                          className="text-orange-600 font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                            Parcialmente Adequado
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="Inadequado"
                          className="text-red-600 font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            Inadequado
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="Aguardando Adequação"
                          className="text-gray-600 font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                            Aguardando Adequação
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Responsável Homologação */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-violet-600 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Responsável Homolog.
                    </Label>
                    <Input
                      value={fields.homologationResponsible || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "homologationResponsible",
                          e.target.value || null,
                          "conversion_homologation_responsible",
                        )
                      }
                      placeholder="Nome do responsável..."
                      className="h-11 border-2 border-violet-200 hover:border-violet-300 focus:border-violet-400 bg-violet-50/50"
                    />
                  </div>
                </div>

                {/* Rich Text Observations */}
                <div className="mt-4 pt-4 border-t border-purple-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                    <Label className="text-xs font-bold uppercase tracking-widest text-amber-600">
                      Observações & Detalhes
                    </Label>
                  </div>
                  <div className="rounded-xl border-2 border-amber-200 overflow-hidden bg-amber-50/30">
                    <RichTextEditor
                      content={getEditorContent(fields.observations)}
                      onChange={(content) =>
                        handleFieldChange(
                          "observations",
                          content,
                          "conversion_observations",
                        )
                      }
                      placeholder="Detalhes da etapa de Conversão..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onTransfer(item)}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Transferir
                </Button>
                {item.queueStatus === "in_progress" && (
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      onSendToHomologation(item);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Enviar p/ Homologação
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
