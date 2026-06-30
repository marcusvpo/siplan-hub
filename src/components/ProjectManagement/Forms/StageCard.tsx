import { LucideIcon, Check, Calendar, User } from "lucide-react";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StageStatus } from "@/types/ProjectV2";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";

interface StageCardProps {
  id: string;
  label: string;
  icon?: LucideIcon;
  status: StageStatus;
  responsible: string;
  startDate?: Date;
  endDate?: Date;
  observations?: string;
  onUpdate: (updates: Record<string, unknown>) => void;
  children?: React.ReactNode;
  isExpanded?: boolean;

  hideDates?: boolean; // Hide date fields for stages like implementation where phases have their own dates
  hideResponsible?: boolean;

  // Predictability features
  isReadyToStart?: boolean;
  readinessReason?: string;

  // Custom injections
  extraHeaderField?: React.ReactNode;
  canEditProjects?: boolean;
}

export function StageCard({
  id,
  label,
  icon: Icon,
  status,
  responsible,
  startDate,
  endDate,
  observations,
  onUpdate,
  children,
  hideDates = false,
  hideResponsible = false,
  isReadyToStart = false,
  readinessReason = "",
  extraHeaderField,
  canEditProjects = true,
}: StageCardProps) {
  const getStatusColor = (s: StageStatus) => {
    switch (s) {
      case "done":
        return "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-200/50 dark:shadow-black/40";
      case "in-progress":
        return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-200/50 dark:shadow-black/40";
      case "blocked":
        return "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-200/50 dark:shadow-black/40";
      case "waiting_adjustment":
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200/50 dark:shadow-black/40";
      default:
        return "bg-gradient-to-r from-slate-400 to-slate-500 text-white dark:shadow-black/40";
    }
  };

  const getStatusBorderColor = (s: StageStatus) => {
    switch (s) {
      case "done":
        return "border-l-emerald-500";
      case "in-progress":
        return "border-l-blue-500";
      case "blocked":
        return "border-l-amber-500";
      case "waiting_adjustment":
        return "border-l-orange-500";
      default:
        return "border-l-slate-300";
    }
  };

  const getIconBg = (s: StageStatus) => {
    switch (s) {
      case "done":
        return "bg-gradient-to-br from-emerald-100 to-green-200 text-emerald-700 ring-2 ring-emerald-300 dark:from-emerald-950/40 dark:to-green-900/40 dark:text-emerald-400 dark:ring-emerald-800/50";
      case "in-progress":
        return "bg-gradient-to-br from-blue-100 to-indigo-200 text-blue-700 ring-2 ring-blue-300 dark:from-blue-950/40 dark:to-indigo-900/40 dark:text-blue-400 dark:ring-blue-800/50";
      case "blocked":
        return "bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700 ring-2 ring-amber-300 dark:from-amber-950/40 dark:to-orange-900/40 dark:text-amber-400 dark:ring-amber-800/50";
      case "waiting_adjustment":
        return "bg-gradient-to-br from-orange-100 to-red-200 text-orange-700 ring-2 ring-orange-300 dark:from-orange-950/40 dark:to-red-900/40 dark:text-orange-400 dark:ring-orange-800/50";
      default:
        return "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800/40 dark:to-slate-700/40 dark:text-slate-400 dark:ring-slate-800/50";
    }
  };

  const statusOptions =
    id === "adherence" || id === "conversion"
      ? [
        { value: "todo", label: "Não Iniciado", color: "text-slate-600 dark:text-slate-300" },
        {
          value: "in-progress",
          label: id === "adherence" ? "Em Análise" : "Em Andamento",
          color: "text-blue-600 dark:text-blue-400",
        },
        {
          value: "done",
          label: id === "adherence" ? "Adequado" : "Finalizado",
          color: "text-emerald-600 dark:text-emerald-400",
        },
        {
          value: "blocked",
          label: id === "adherence" ? "Inadequado" : "Bloqueado",
          color: "text-amber-600 dark:text-amber-400",
        },
        ...(id === "adherence"
          ? [
            {
              value: "waiting_adjustment",
              label: "Em Adequação",
              color: "text-orange-600 dark:text-orange-400",
            },
          ]
          : []),
      ]
      : [
        { value: "todo", label: "Não Iniciado", color: "text-slate-600 dark:text-slate-300" },
        {
          value: "in-progress",
          label: "Em Andamento",
          color: "text-blue-600 dark:text-blue-400",
        },
        { value: "done", label: "Finalizado", color: "text-emerald-600 dark:text-emerald-400" },
        { value: "blocked", label: "Bloqueado", color: "text-amber-600 dark:text-amber-400" },
      ];

  // Helper for Rich Text
  const getEditorContent = (obs?: string) => {
    if (!obs) return "";
    try {
      const parsed = JSON.parse(obs);
      if (Array.isArray(parsed)) return convertBlocksToTiptap(parsed);
      return parsed;
    } catch {
      return obs;
    }
  };

  return (
    <AccordionItem
      value={id}
      className={cn(
        "border rounded-xl bg-card shadow-sm hover:shadow-md transition-all duration-300",
        "border-l-4",
        getStatusBorderColor(status),
        // Add glow effect if ready to start
        isReadyToStart &&
        status === "todo" &&
        "animate-glow-green border-emerald-500",
      )}
    >
      <AccordionTrigger className="hover:no-underline py-2.5 px-4">
        <div className="flex items-center gap-3 w-full">
          {/* Icon with gradient background */}
          <div
            className={cn(
              "p-1.5 rounded-lg transition-all duration-300 shadow-sm",
              getIconBg(status),
            )}
          >
            {Icon ? (
              <Icon className="h-5 w-5" />
            ) : (
              <Check className="h-5 w-5" />
            )}
          </div>

          {/* Title */}
          <div className="flex-1 text-left">
            <span className="font-bold text-[15px] tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {label}
            </span>
            {!hideResponsible && responsible && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0">
                <User className="h-3 w-3" />
                {responsible}
              </p>
            )}
          </div>

          {/* Ready to Start Badge */}
          {isReadyToStart && status === "todo" && (
            <Badge className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white shadow-sm animate-pulse mr-2">
              ✨ Pronto para Iniciar
            </Badge>
          )}

          {/* Status Badge with gradient */}
          <Badge
            className={cn(
              "px-2.5 py-1 text-xs font-semibold shadow-md transition-all duration-300 mr-5",
              getStatusColor(status),
            )}
          >
            {statusOptions.find((o) => o.value === status)?.label || status}
          </Badge>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pt-1.5 pb-4 space-y-4">
        {/* Readiness Indicator */}
        {isReadyToStart && status === "todo" && readinessReason && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
            <div className="text-xl">🚀</div>
            <div className="flex-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-300 text-xs mb-0.5">
                Pré-requisitos Completos!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">{readinessReason}</p>
              <button
                onClick={() => onUpdate({ status: "in-progress" })}
                disabled={!canEditProjects}
                className="mt-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Iniciar {label.split(".")[1]?.trim() || "Esta Etapa"}
              </button>
            </div>
          </div>
        )}
        {/* Main Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Field */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => onUpdate({ status: v })}
              disabled={!canEditProjects}
            >
              <SelectTrigger
                className={cn(
                  "h-9 border text-xs font-medium transition-all duration-200",
                  status === "done" &&
                  "bg-emerald-50/50 text-emerald-900 border-emerald-200 hover:border-emerald-350 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:border-emerald-800",
                  status === "in-progress" &&
                  "bg-blue-50/50 text-blue-900 border-blue-200 hover:border-blue-350 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50 dark:hover:border-blue-800",
                  status === "blocked" &&
                  "bg-amber-50/50 text-amber-900 border-amber-200 hover:border-amber-350 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 dark:hover:border-emerald-800",
                  status === "waiting_adjustment" &&
                  "bg-orange-50/50 text-orange-900 border-orange-200 hover:border-orange-350 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50 dark:hover:border-orange-800",
                  status === "todo" &&
                  "bg-slate-50/50 text-slate-900 border-slate-200 hover:border-slate-300 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800/60 dark:hover:border-slate-700",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className={cn("font-medium text-xs", opt.color)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          opt.value === "done" && "bg-emerald-500",
                          opt.value === "in-progress" && "bg-blue-500",
                          opt.value === "blocked" && "bg-amber-500",
                          opt.value === "waiting_adjustment" && "bg-orange-500",
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

          {/* Responsible Field */}
          {!hideResponsible && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-violet-605 flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Responsável
              </Label>
              <AutocompleteInput
                value={responsible}
                onChange={(v) => onUpdate({ responsible: v })}
                disabled={!canEditProjects}
                className="h-9 border border-violet-200 hover:border-violet-300 focus:border-violet-400 bg-violet-50/50 dark:border-violet-900/50 dark:hover:border-violet-800 dark:focus:border-violet-650 dark:bg-violet-950/20 dark:text-violet-300 text-xs"
              />
            </div>
          )}

          {/* Start Date Field - Hidden when hideDates is true */}
          {!hideDates && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {["infra", "adherence", "environment", "conversion"].includes(
                  id,
                )
                  ? "Enviado em"
                  : "Início"}
              </Label>
              <Input
                type="date"
                value={
                  startDate
                    ? new Date(startDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  onUpdate({
                    startDate: e.target.value
                      ? new Date(e.target.value + "T12:00:00")
                      : undefined,
                  })
                }
                disabled={!canEditProjects}
                className="h-9 border border-cyan-200 hover:border-cyan-300 focus:border-cyan-400 bg-cyan-50/50 dark:border-cyan-900/50 dark:hover:border-cyan-800 dark:focus:border-cyan-600 dark:bg-cyan-950/20 dark:text-cyan-300 font-medium text-xs"
              />
            </div>
          )}

          {/* End Date Field - Hidden when hideDates is true */}
          {!hideDates && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {id === "adherence"
                  ? "Agendado Para"
                  : ["infra", "environment", "conversion"].includes(id)
                    ? "Finalizado Em"
                    : "Término"}
              </Label>
              <Input
                type="date"
                value={
                  endDate ? new Date(endDate).toISOString().split("T")[0] : ""
                }
                onChange={(e) =>
                  onUpdate({
                    endDate: e.target.value
                      ? new Date(e.target.value + "T12:00:00")
                      : undefined,
                  })
                }
                disabled={!canEditProjects}
                className="h-9 border border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-rose-50/50 dark:border-rose-900/50 dark:hover:border-rose-800 dark:focus:border-rose-600 dark:bg-rose-950/20 dark:text-rose-300 font-medium text-xs"
              />
            </div>
          )}

          {/* Extra Custom Component for Grid */}
          {extraHeaderField && (
            <div className="space-y-1.5">
              {extraHeaderField}
            </div>
          )}
        </div>

        {/* Specific Fields (Children) */}
        {children && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-lg" />
            <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-full mb-1">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                  <div className="h-1 w-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                  Campos Específicos
                </h4>
              </div>
              {children}
            </div>
          </div>
        )}

        {/* Rich Text Editor */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
            <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Observações & Detalhes
            </Label>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 overflow-hidden bg-amber-50/30 dark:bg-amber-950/10 w-full">
            <RichTextEditor
              content={getEditorContent(observations)}
              onChange={(content) => onUpdate({ observations: content })}
              placeholder={`Detalhes da etapa de ${label}...`}
              editable={canEditProjects}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
