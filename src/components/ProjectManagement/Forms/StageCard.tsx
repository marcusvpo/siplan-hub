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
}: StageCardProps) {
  const getStatusColor = (s: StageStatus) => {
    switch (s) {
      case "done":
        return "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-200";
      case "in-progress":
        return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-200";
      case "blocked":
        return "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-200";
      case "waiting_adjustment":
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200";
      default:
        return "bg-gradient-to-r from-slate-400 to-slate-500 text-white";
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
        return "bg-gradient-to-br from-emerald-100 to-green-200 text-emerald-700 ring-2 ring-emerald-300";
      case "in-progress":
        return "bg-gradient-to-br from-blue-100 to-indigo-200 text-blue-700 ring-2 ring-blue-300";
      case "blocked":
        return "bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700 ring-2 ring-amber-300";
      case "waiting_adjustment":
        return "bg-gradient-to-br from-orange-100 to-red-200 text-orange-700 ring-2 ring-orange-300";
      default:
        return "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600";
    }
  };

  const statusOptions =
    id === "adherence" || id === "conversion"
      ? [
          { value: "todo", label: "Não Iniciado", color: "text-slate-600" },
          {
            value: "in-progress",
            label: id === "adherence" ? "Em Análise" : "Em Andamento",
            color: "text-blue-600",
          },
          {
            value: "done",
            label: id === "adherence" ? "Adequado" : "Finalizado",
            color: "text-emerald-600",
          },
          {
            value: "blocked",
            label: id === "adherence" ? "Inadequado" : "Bloqueado",
            color: "text-amber-600",
          },
          ...(id === "adherence"
            ? [
                {
                  value: "waiting_adjustment",
                  label: "Em Adequação",
                  color: "text-orange-600",
                },
              ]
            : []),
        ]
      : [
          { value: "todo", label: "Não Iniciado", color: "text-slate-600" },
          {
            value: "in-progress",
            label: "Em Andamento",
            color: "text-blue-600",
          },
          { value: "done", label: "Finalizado", color: "text-emerald-600" },
          { value: "blocked", label: "Bloqueado", color: "text-amber-600" },
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
        getStatusBorderColor(status)
      )}
    >
      <AccordionTrigger className="hover:no-underline py-5 px-5">
        <div className="flex items-center gap-4 w-full">
          {/* Icon with gradient background */}
          <div
            className={cn(
              "p-3 rounded-xl transition-all duration-300 shadow-md",
              getIconBg(status)
            )}
          >
            {Icon ? (
              <Icon className="h-6 w-6" />
            ) : (
              <Check className="h-6 w-6" />
            )}
          </div>

          {/* Title */}
          <div className="flex-1 text-left">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {label}
            </span>
            {!hideResponsible && responsible && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3" />
                {responsible}
              </p>
            )}
          </div>

          {/* Status Badge with gradient */}
          <Badge
            className={cn(
              "px-4 py-1.5 text-sm font-semibold shadow-lg transition-all duration-300",
              getStatusColor(status)
            )}
          >
            {statusOptions.find((o) => o.value === status)?.label || status}
          </Badge>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-5 pt-2 pb-6 space-y-6">
        {/* Main Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Status Field */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => onUpdate({ status: v })}
            >
              <SelectTrigger
                className={cn(
                  "h-11 font-medium border-2 transition-all duration-200",
                  status === "done" &&
                    "bg-emerald-50 text-emerald-900 border-emerald-300 hover:border-emerald-400",
                  status === "in-progress" &&
                    "bg-blue-50 text-blue-900 border-blue-300 hover:border-blue-400",
                  status === "blocked" &&
                    "bg-amber-50 text-amber-900 border-amber-300 hover:border-amber-400",
                  status === "waiting_adjustment" &&
                    "bg-orange-50 text-orange-900 border-orange-300 hover:border-orange-400",
                  status === "todo" &&
                    "bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-400"
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
                          opt.value === "waiting_adjustment" && "bg-orange-500",
                          opt.value === "todo" && "bg-slate-400"
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
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-violet-600 flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Responsável
              </Label>
              <AutocompleteInput
                value={responsible}
                onChange={(v) => onUpdate({ responsible: v })}
                className="h-11 border-2 border-violet-200 hover:border-violet-300 focus:border-violet-400 bg-violet-50/50"
              />
            </div>
          )}

          {/* Start Date Field - Hidden when hideDates is true */}
          {!hideDates && (
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {["infra", "adherence", "environment", "conversion"].includes(
                  id
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
                className="h-11 border-2 border-cyan-200 hover:border-cyan-300 focus:border-cyan-400 bg-cyan-50/50 font-medium"
              />
            </div>
          )}

          {/* End Date Field - Hidden when hideDates is true */}
          {!hideDates && (
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {["infra", "adherence", "environment", "conversion"].includes(
                  id
                )
                  ? "Finalizado em"
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
                className="h-11 border-2 border-rose-200 hover:border-rose-300 focus:border-rose-400 bg-rose-50/50 font-medium"
              />
            </div>
          )}
        </div>

        {/* Specific Fields (Children) */}
        {children && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-xl" />
            <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-5 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="col-span-full mb-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                  <div className="h-1.5 w-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                  Campos Específicos
                </h4>
              </div>
              {children}
            </div>
          </div>
        )}

        {/* Rich Text Editor */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
            <Label className="text-xs font-bold uppercase tracking-widest text-amber-600">
              Observações & Detalhes
            </Label>
          </div>
          <div className="rounded-xl border-2 border-amber-200 overflow-hidden bg-amber-50/30">
            <RichTextEditor
              content={getEditorContent(observations)}
              onChange={(content) => onUpdate({ observations: content })}
              placeholder={`Detalhes da etapa de ${label}...`}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
