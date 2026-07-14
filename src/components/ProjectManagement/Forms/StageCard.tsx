import { LucideIcon, Check, Calendar, User, Sparkles, Rocket, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
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
import { ObservationsWithAI } from "@/components/ProjectManagement/Forms/ObservationsWithAI";

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
  automationNotice?: string;

  // Quando fornecido, substitui o editor unico de "Observacoes & Detalhes" por um
  // conteudo customizado (ex.: multiplos blocos + IA na etapa 7 - Pos-Implantacao).
  observationsSlot?: React.ReactNode;

  // Habilitam "Melhorar texto com IA" no campo unico de Observacoes (etapas 1-6).
  projectId?: string;
  requestedBy?: string;

  // Conteudo renderizado logo abaixo de "Observacoes & Detalhes"
  // (ex.: galeria de prints na etapa 4 - Preparacao de Ambiente).
  afterObservations?: React.ReactNode;

  // Titulo do bloco de campos especificos (children). Default: "Campos Específicos".
  specificFieldsTitle?: string;

  // Torna o bloco de campos especificos colapsavel (recolhido por padrao).
  collapsibleSpecificFields?: boolean;
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
  automationNotice,
  observationsSlot,
  projectId,
  requestedBy,
  afterObservations,
  specificFieldsTitle = "Campos Específicos",
  collapsibleSpecificFields = false,
}: StageCardProps) {
  const [specificOpen, setSpecificOpen] = useState(false);
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
        return "bg-gradient-to-r from-neutral-400 to-neutral-500 text-white dark:shadow-black/40";
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
        return "border-l-neutral-300";
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
        return "bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-600 dark:from-neutral-800/40 dark:to-neutral-700/40 dark:text-neutral-400 dark:ring-neutral-800/50";
    }
  };

  const statusOptions =
    id === "adherence" || id === "conversion"
      ? [
        { value: "todo", label: "Não Iniciado", color: "text-neutral-600 dark:text-neutral-300" },
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
        { value: "todo", label: "Não Iniciado", color: "text-neutral-600 dark:text-neutral-300" },
        {
          value: "in-progress",
          label: "Em Andamento",
          color: "text-blue-600 dark:text-blue-400",
        },
        { value: "done", label: "Finalizado", color: "text-emerald-600 dark:text-emerald-400" },
        { value: "blocked", label: "Bloqueado", color: "text-amber-600 dark:text-amber-400" },
      ];

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
            <Badge className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white shadow-sm animate-pulse mr-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>Pronto para Iniciar</span>
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
        {isReadyToStart && status === "todo" && readinessReason && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
            <Rocket className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
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
        
        {status === "in-progress" && automationNotice && (
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
              {automationNotice}
            </p>
          </div>
        )}

        {/* Main Controls Grid */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-4",
          extraHeaderField ? "lg:grid-cols-5" : "lg:grid-cols-4"
        )}>
          {/* Status Field */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-650" />
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => onUpdate({ status: v })}
              disabled={!canEditProjects}
            >
              <SelectTrigger
                className="h-9 border border-input bg-background text-xs font-medium text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-all duration-200"
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
                          opt.value === "todo" && "bg-neutral-400",
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
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                Responsável
              </Label>
              <AutocompleteInput
                value={responsible}
                onChange={(v) => onUpdate({ responsible: v })}
                disabled={!canEditProjects}
                className="h-9 border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring text-xs"
              />
            </div>
          )}

          {/* Extra Custom Component for Grid */}
          {extraHeaderField && (
            <div className="space-y-1.5">
              {extraHeaderField}
            </div>
          )}

          {/* Start Date Field - Hidden when hideDates is true or stage is adherence */}
          {!hideDates && id !== "adherence" && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {["infra", "environment", "conversion"].includes(
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
                className="h-9 border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
              />
            </div>
          )}

          {/* End Date Field - Hidden when hideDates is true */}
          {!hideDates && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
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
                className="h-9 border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
              />
            </div>
          )}

        </div>

        {/* Specific Fields (Children) */}
        {children && (
          <div className="relative">
            <div className="relative bg-neutral-50/30 dark:bg-neutral-950/20 p-4 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-full mb-1">
                {collapsibleSpecificFields ? (
                  <button
                    type="button"
                    onClick={() => setSpecificOpen((v) => !v)}
                    className="flex items-center gap-1.5 group"
                    title={specificOpen ? "Recolher" : "Expandir"}
                    aria-label={specificOpen ? "Recolher campos específicos" : "Expandir campos específicos"}
                    aria-expanded={specificOpen}
                  >
                    {specificOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                    )}
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 cursor-pointer group-hover:text-foreground transition-colors">
                      <div className="h-1 w-4 bg-neutral-400 dark:bg-neutral-650 rounded-full" />
                      {specificFieldsTitle}
                    </h4>
                  </button>
                ) : (
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <div className="h-1 w-4 bg-neutral-400 dark:bg-neutral-650 rounded-full" />
                    {specificFieldsTitle}
                  </h4>
                )}
              </div>
              {(!collapsibleSpecificFields || specificOpen) && children}
            </div>
          </div>
        )}

        {/* Rich Text Editor (ou slot customizado, ex.: multiplos blocos + IA) */}
        {observationsSlot ? (
          observationsSlot
        ) : (
          <ObservationsWithAI
            label={label}
            observations={observations}
            onChange={(content) => onUpdate({ observations: content })}
            canEdit={canEditProjects}
            projectId={projectId}
            requestedBy={requestedBy}
          />
        )}

        {afterObservations}
      </AccordionContent>
    </AccordionItem>
  );
}
