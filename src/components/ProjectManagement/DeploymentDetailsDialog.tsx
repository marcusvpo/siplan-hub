import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ProjectV2,
  ImplementationPhase,
  ImplementationStageV2,
  StageStatus,
} from "@/types/ProjectV2";
import { CALENDAR_MEMBERS } from "@/types/calendar";
import { resolveCalendarMembersForResponsible } from "@/lib/project-calendar-events";
import {
  getWeekdayHolidaysInRange,
  WeekdayHoliday,
} from "@/lib/calendar-holidays";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Monitor,
  Palmtree,
  Rocket,
  Tag,
  User,
  Users,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useVacations } from "@/hooks/useVacations";
import { normalizeSpecialty } from "@/utils/projectSpecialty";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";

interface DeploymentDetailsDialogProps {
  project: ProjectV2 | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional overrides for reuse in Calendar
  customTitle?: string;
  customDescription?: string;
  customStartDate?: Date;
  customEndDate?: Date;
  customResponsible?: string;
}

const LOCATION_PRESETS = ["Remoto", "Presencial", "Híbrido"] as const;

export function DeploymentDetailsDialog({
  project,
  open,
  onOpenChange,
  customTitle,
  customDescription,
}: DeploymentDetailsDialogProps) {
  const navigate = useNavigate();
  const { updateProject } = useProjectsV2();
  const { vacations = [] } = useVacations();
  const { canEditProjects } = usePermissions();

  const [status, setStatus] = useState<StageStatus>("todo");
  const [responsible, setResponsible] = useState<string>("");
  const [startDateStr, setStartDateStr] = useState<string>("");
  const [endDateStr, setEndDateStr] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [trainingLocation, setTrainingLocation] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Estado para segunda confirmação quando o usuário seleciona período com feriado em dia útil (2026/2027)
  const [pendingHolidayConfirmation, setPendingHolidayConfirmation] = useState<{
    updates: { startDateStr?: string; endDateStr?: string };
    holidays: WeekdayHoliday[];
  } | null>(null);

  // Sync state when project changes or dialog opens
  useEffect(() => {
    if (project) {
      const phase1 = project.stages?.implementation?.phase1;
      setStatus(phase1?.status || "todo");
      setResponsible(
        phase1?.responsible ||
          project.stages?.implementation?.responsible ||
          project.responsibleImplementation ||
          ""
      );
      setStartDateStr(
        phase1?.startDate
          ? format(new Date(phase1.startDate), "yyyy-MM-dd")
          : ""
      );
      setEndDateStr(
        phase1?.endDate ? format(new Date(phase1.endDate), "yyyy-MM-dd") : ""
      );
      setIsConfirmed(!!phase1?.isConfirmed);
      setTrainingLocation(phase1?.trainingLocation || "");
      setPendingHolidayConfirmation(null);
    }
  }, [project, open]);

  // Detector de conflito em tempo real com as férias cadastradas no Admin
  const vacationConflict = useMemo(() => {
    if (!startDateStr && !endDateStr) return null;
    const checkStart = startDateStr || endDateStr;
    const checkEnd = endDateStr || startDateStr;
    if (!checkStart || !checkEnd) return null;

    const resolvedMembers = resolveCalendarMembersForResponsible(responsible);
    if (resolvedMembers.length === 0) return null;

    const memberIds = new Set(resolvedMembers.map((m) => m.id));
    const memberNamesLower = new Set(
      resolvedMembers.map((m) => m.name.toLowerCase())
    );

    return (
      vacations.find((v) => {
        const matchesMember =
          (v.implantador_id && memberIds.has(v.implantador_id)) ||
          memberNamesLower.has((v.implantador_name || "").toLowerCase());
        if (!matchesMember) return false;
        return v.start_date <= checkEnd && v.end_date >= checkStart;
      }) || null
    );
  }, [startDateStr, endDateStr, responsible, vacations]);

  // Detector de feriados em dias úteis (Segunda a Sexta) de 2026 e 2027 dentro do período agendado
  const holidaysInSelectedRange = useMemo(
    () => getWeekdayHolidaysInRange(startDateStr, endDateStr),
    [startDateStr, endDateStr]
  );

  if (!project) return null;

  const handleOpenProject = () => {
    navigate(`/projects?id=${project.id}`);
    onOpenChange(false);
  };

  const phase1 = project.stages?.implementation?.phase1;

  const handleUpdatePhase1 = async (updates: {
    status?: StageStatus;
    responsible?: string;
    startDateStr?: string;
    endDateStr?: string;
    isConfirmed?: boolean;
    trainingLocation?: string;
  }) => {
    if (!project) return;

    const newStatus = updates.status !== undefined ? updates.status : status;
    const newResp =
      updates.responsible !== undefined ? updates.responsible : responsible;
    const newStartStr =
      updates.startDateStr !== undefined ? updates.startDateStr : startDateStr;
    const newEndStr =
      updates.endDateStr !== undefined ? updates.endDateStr : endDateStr;
    const newConfirmed =
      updates.isConfirmed !== undefined ? updates.isConfirmed : isConfirmed;
    const newLocation =
      updates.trainingLocation !== undefined
        ? updates.trainingLocation
        : trainingLocation;

    // Local UI update
    if (updates.status !== undefined) setStatus(newStatus);
    if (updates.responsible !== undefined) setResponsible(newResp);
    if (updates.startDateStr !== undefined) setStartDateStr(newStartStr);
    if (updates.endDateStr !== undefined) setEndDateStr(newEndStr);
    if (updates.isConfirmed !== undefined) setIsConfirmed(newConfirmed);
    if (updates.trainingLocation !== undefined)
      setTrainingLocation(newLocation);

    const parsedStart = newStartStr
      ? new Date(newStartStr + "T12:00:00")
      : undefined;
    const parsedEnd = newEndStr ? new Date(newEndStr + "T12:00:00") : undefined;

    const currentImpl: ImplementationStageV2 = project.stages
      ?.implementation || {
      status: "todo",
      responsible: "",
      phase1: { status: "todo", responsible: "" },
      phase2: { status: "todo", responsible: "" },
    };
    const currentPhase1 = currentImpl.phase1 || {
      status: "todo",
      responsible: "",
    };

    const updatedPhase1: ImplementationPhase = {
      ...currentPhase1,
      status: newStatus,
      responsible: newResp,
      startDate: parsedStart,
      endDate: parsedEnd,
      isConfirmed: newConfirmed,
      trainingLocation: newLocation || undefined,
    };

    const updatedImplementation = {
      ...currentImpl,
      phase1: updatedPhase1,
      responsible: newResp || currentImpl.responsible,
    };

    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          stages: {
            ...project.stages,
            implementation: updatedImplementation,
          },
        },
      });
      toast.success("Fase 1 (Treinamento & Acompanhamento) atualizada!");
    } catch (err) {
      console.error("Erro ao atualizar Fase 1:", err);
      toast.error("Falha ao salvar alterações da Fase 1");
    } finally {
      setIsSaving(false);
    }
  };

  // Intercepta alterações de data para verificar se há feriado em dia útil no intervalo
  // Se houver, abre o AlertDialog de segunda confirmação (sem bloquear a operação caso o usuário confirme)
  const handleRequestDateChange = (updates: {
    startDateStr?: string;
    endDateStr?: string;
  }) => {
    const candidateStart =
      updates.startDateStr !== undefined ? updates.startDateStr : startDateStr;
    const candidateEnd =
      updates.endDateStr !== undefined ? updates.endDateStr : endDateStr;

    const holidays = getWeekdayHolidaysInRange(candidateStart, candidateEnd);
    if (holidays.length > 0) {
      setPendingHolidayConfirmation({ updates, holidays });
      return;
    }

    void handleUpdatePhase1(updates);
  };

  // Padronização Oficial de Cores:
  // Orion REG = Verde | Orion PRO = Azul | Orion TN = Vermelho
  const getSystemBadgeColor = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("reg") || t.includes("registro")) {
      return "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
    if (t.includes("pro") || t.includes("protesto")) {
      return "bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    }
    if (t.includes("tn") || t.includes("notas") || t.includes("modelo")) {
      return "bg-[#d3123f]/15 text-[#d3123f] dark:text-rose-300 border-[#d3123f]/30";
    }
    return "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl gap-3 overflow-x-hidden overflow-y-auto p-3 sm:max-h-[92vh] sm:gap-4 sm:p-5"
          data-testid="deployment-details-dialog"
        >
          <DialogHeader className="min-w-0 space-y-1 text-left">
            <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5 pr-10">
              {isConfirmed ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border-none shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Implantação Confirmada
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground border-border text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  Previsão
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`${getSystemBadgeColor(
                  project.systemType
                )} px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider`}
              >
                {project.systemType}
              </Badge>
              <Badge
                variant="secondary"
                className="text-[9px] font-medium px-2 py-0.5"
              >
                <Tag className="w-2.5 h-2.5 mr-1" />
                <EllevoTicketLink
                  ticketNumber={project.ticketNumber}
                  showIcon={false}
                >
                  {project.ticketNumber || "N/A"}
                </EllevoTicketLink>
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase shadow-2xs",
                  isConfirmed
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40"
                )}
                data-testid="deployment-status-tag"
              >
                {isConfirmed ? (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                    ✓ Confirmada
                  </>
                ) : (
                  <>
                    <Clock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                    ⏳ Prevista
                  </>
                )}
              </span>
              {isSaving && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold animate-pulse ml-auto">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Salvando...
                </span>
              )}
            </div>
            <DialogTitle className="break-words pr-10 text-base font-extrabold text-foreground sm:text-lg">
              {customTitle || project.clientName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {customDescription ||
                "Detalhes e Ajuste de Cronograma da Implantação (Fase 1)"}
            </DialogDescription>
          </DialogHeader>

          {/* Alerta em Tempo Real se houver conflito com Férias cadastradas no Admin */}
          {vacationConflict && (
            <div
              className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/40 p-3 text-left text-xs text-amber-950 dark:text-amber-200"
              data-testid="deployment-vacation-conflict-alert"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  Conflito com Férias Cadastradas no Admin
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/admin/vacations");
                  }}
                  className="h-6 gap-1 border-amber-400 bg-background px-2 text-[10px] font-bold text-amber-900 hover:bg-amber-100 dark:text-amber-200"
                >
                  <Palmtree className="h-3 w-3" />
                  Ver Férias (Admin)
                </Button>
              </div>
              <p className="text-[11px] leading-snug">
                O implantador{" "}
                <strong>{vacationConflict.implantador_name}</strong> possui
                férias registradas de{" "}
                <strong>
                  {format(
                    new Date(vacationConflict.start_date + "T12:00:00"),
                    "dd/MM/yyyy"
                  )}
                </strong>{" "}
                a{" "}
                <strong>
                  {format(
                    new Date(vacationConflict.end_date + "T12:00:00"),
                    "dd/MM/yyyy"
                  )}
                </strong>
                {vacationConflict.description
                  ? ` (${vacationConflict.description})`
                  : ""}
                .
              </p>
            </div>
          )}

          {/* Alerta em Tempo Real se o período da Fase 1 contiver Feriado em Dia Útil (2026/2027) */}
          {holidaysInSelectedRange.length > 0 && (
            <div
              className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-left text-xs text-amber-950 dark:text-amber-200"
              data-testid="deployment-holiday-warning-alert"
            >
              <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Atenção: Semana com Feriado em Dia Útil (
                  {holidaysInSelectedRange.length})
                </span>
              </div>
              <p className="text-[11px] leading-snug text-amber-900/90 dark:text-amber-200/90">
                O período selecionado da Fase 1 abrange feriado(s) em dia de
                semana (Seg–Sex):
              </p>
              <ul className="space-y-1 text-[11px] font-bold text-amber-950 dark:text-amber-100">
                {holidaysInSelectedRange.map((h) => (
                  <li key={h.date} className="flex items-center gap-1.5">
                    <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900 dark:text-amber-200">
                      {h.shortDate}/{h.year} ({h.weekdayLabel})
                    </span>
                    <span>{h.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bloco de Edição 360º: Fase 1 Treinamento & Acompanhamento */}
          <div className="min-w-0 space-y-3 rounded-xl border border-border bg-muted/20 p-3 shadow-xs sm:p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Rocket className="h-3 w-3 shrink-0" />
                  Fase 1
                </Badge>
                <h4 className="break-words text-xs font-bold text-foreground">
                  Treinamento &amp; Acompanhamento
                </h4>
              </div>

              {/* Implantação Confirmada? Switch */}
              <div
                onClick={() =>
                  canEditProjects &&
                  handleUpdatePhase1({ isConfirmed: !isConfirmed })
                }
                className={cn(
                  "flex min-h-10 w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1 transition-all cursor-pointer select-none sm:min-h-0 sm:w-auto",
                  isConfirmed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <Switch
                  checked={isConfirmed}
                  onCheckedChange={(checked) =>
                    handleUpdatePhase1({ isConfirmed: checked })
                  }
                  disabled={!canEditProjects}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <span className="flex min-w-0 items-center gap-1 break-words text-xs font-bold">
                  {isConfirmed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Implantação Confirmada
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Implantação Confirmada?
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Grid de Campos da Fase 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {/* Status */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Status
                </Label>
                <Select
                  value={status}
                  onValueChange={(v) =>
                    handleUpdatePhase1({ status: v as StageStatus })
                  }
                  disabled={!canEditProjects}
                >
                  <SelectTrigger className="h-8 text-xs font-medium bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo" className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-neutral-400" />
                        Não Iniciado
                      </div>
                    </SelectItem>
                    <SelectItem value="in-progress" className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Em Andamento
                      </div>
                    </SelectItem>
                    <SelectItem value="done" className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        Finalizado
                      </div>
                    </SelectItem>
                    <SelectItem value="blocked" className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        Bloqueado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável + Chips Rápidos dos 5 Implantadores Oficiais */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  Responsável
                </Label>
                <AutocompleteInput
                  value={responsible}
                  onChange={(v) => handleUpdatePhase1({ responsible: v })}
                  disabled={!canEditProjects}
                  placeholder="Selecione o responsável..."
                  className="h-8 text-xs bg-background border-border"
                />
                {canEditProjects && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {CALENDAR_MEMBERS.map((member) => {
                      const isSelected = responsible
                        .toLowerCase()
                        .includes(member.name.toLowerCase());
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            handleUpdatePhase1({ responsible: member.name })
                          }
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              member.color || "bg-blue-600"
                            )}
                          />
                          <span>{member.name.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Início */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  Início
                </Label>
                <Input
                  type="date"
                  value={startDateStr}
                  onChange={(e) =>
                    handleRequestDateChange({ startDateStr: e.target.value })
                  }
                  disabled={!canEditProjects}
                  className="h-8 text-xs font-medium bg-background border-border"
                />
              </div>

              {/* Término */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  Término
                </Label>
                <Input
                  type="date"
                  value={endDateStr}
                  onChange={(e) =>
                    handleRequestDateChange({ endDateStr: e.target.value })
                  }
                  disabled={!canEditProjects}
                  className="h-8 text-xs font-medium bg-background border-border"
                />
              </div>

              {/* Modalidade / Local do Treinamento */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  Local / Modalidade (Fase 1)
                </Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {LOCATION_PRESETS.map((preset) => {
                    const active =
                      trainingLocation.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={!canEditProjects}
                        onClick={() =>
                          handleUpdatePhase1({
                            trainingLocation: active ? "" : preset,
                          })
                        }
                        className={cn(
                          "h-7 rounded-md border px-2.5 text-[11px] font-bold transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        )}
                      >
                        {preset}
                      </button>
                    );
                  })}
                  <Input
                    value={trainingLocation}
                    onChange={(e) => setTrainingLocation(e.target.value)}
                    onBlur={() =>
                      handleUpdatePhase1({ trainingLocation: trainingLocation })
                    }
                    disabled={!canEditProjects}
                    placeholder="Ou digite local específico (ex: Presencial 80h)..."
                    className="h-7 min-w-[180px] flex-1 text-xs bg-background border-border"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informações Adicionais do Projeto */}
          <div className="bg-muted/30 p-3 rounded-xl border border-border space-y-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-primary" />
              Detalhes do Projeto
            </h4>
            <div className="grid grid-cols-1 gap-2 pt-1 text-left min-[380px]:grid-cols-2 sm:grid-cols-4">
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                    {project.systemType === "Modelos TN"
                      ? "Horas"
                      : "Carga Horária"}
                  </p>
                  <p className="text-xs font-bold text-foreground truncate">
                    {project.systemType === "Modelos TN"
                      ? project.workHours
                        ? `${project.workHours}h`
                        : "N/A"
                      : project.soldHours
                        ? `${project.soldHours}h`
                        : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                    Especialidade
                  </p>
                  <p className="text-xs font-bold text-foreground truncate">
                    {normalizeSpecialty(project.specialty) || "Módulo Padrão"}
                  </p>
                </div>
              </div>

              {trainingLocation && (
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                      Localização
                    </p>
                    <p className="text-xs font-bold text-foreground truncate">
                      {trainingLocation}
                    </p>
                  </div>
                </div>
              )}

              {phase1?.participantsCount && (
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                      Participantes
                    </p>
                    <p className="text-xs font-bold text-foreground truncate">
                      {phase1.participantsCount} pessoas
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full px-3 text-xs sm:h-8 sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={handleOpenProject}
              size="sm"
              className="h-10 w-full gap-1.5 bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:h-8 sm:w-auto"
            >
              Ver Projeto Completo
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Segunda Confirmação quando o agendamento coincide com Feriado em Dia Útil (2026/2027) */}
      <AlertDialog
        open={Boolean(pendingHolidayConfirmation)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingHolidayConfirmation(null);
        }}
      >
        <AlertDialogContent
          className="max-w-md border-amber-500/40"
          data-testid="deployment-holiday-confirm-dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-extrabold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <span>Atenção: Semana com Feriado em Dia Útil</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2.5 text-left text-xs text-muted-foreground">
                <p>
                  O período selecionado para a <strong>Fase 1</strong> do
                  cartório{" "}
                  <strong className="text-foreground">
                    {project.clientName}
                  </strong>{" "}
                  contém feriado(s) em dia de semana (Segunda a Sexta-feira):
                </p>
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 space-y-1.5">
                  {pendingHolidayConfirmation?.holidays.map((h) => (
                    <div
                      key={h.date}
                      className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-100"
                    >
                      <span className="rounded bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-extrabold">
                        {h.shortDate}/{h.year} • {h.weekdayLabel}
                      </span>
                      <span>{h.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-medium text-foreground/90">
                  Deseja confirmar o agendamento da implantação nesta semana
                  mesmo com feriado em dia útil?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setPendingHolidayConfirmation(null)}
              className="text-xs font-semibold"
            >
              Cancelar Alteração
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingHolidayConfirmation) {
                  void handleUpdatePhase1(pendingHolidayConfirmation.updates);
                  setPendingHolidayConfirmation(null);
                }
              }}
              className="bg-amber-600 text-xs font-bold text-white hover:bg-amber-700"
            >
              Confirmar Agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

