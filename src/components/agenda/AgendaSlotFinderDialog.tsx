import React, { useState, useMemo } from "react";
import {
  addDays,
  format,
  isBefore,
  isWeekend,
  parseISO,
  startOfDay,
  nextMonday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Zap,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  User,
  Filter,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { UnifiedAgendaEvent } from "@/types/agenda";
import { useVacations } from "@/hooks/useVacations";
import { getWeekdayHoliday } from "@/lib/calendar-holidays";
import {
  IMPLANTADOR_SPECIALTIES,
  SYSTEM_BADGE_STYLES,
  normalizeSpecialtyText,
} from "@/constants/implantadorSpecialties";

export type SlotFinderSystem = "Orion TN" | "Orion PRO" | "Orion REG" | "WebRI";

export interface DeploymentSlot {
  id: string;
  userName: string;
  system: SlotFinderSystem;
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
  businessDaysCount: number;
  freeDates: string[];
}

interface AgendaSlotFinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: UnifiedAgendaEvent[];
  onSelectSlot: (slot: {
    system: SlotFinderSystem;
    userName: string;
    startDate: Date;
    endDate: Date;
  }) => void;
}

const AVAILABLE_SYSTEMS: SlotFinderSystem[] = [
  "Orion TN",
  "Orion PRO",
  "Orion REG",
  "WebRI",
];

const DURATION_OPTIONS = [
  { days: 3, label: "3 dias úteis", description: "Implantação ágil / Cartório de menor porte" },
  { days: 4, label: "4 dias úteis", description: "Porte intermediário" },
  { days: 5, label: "5 dias úteis", description: "Semana Completa (Seg-Sex) • Padrão Siplan", isRecommended: true },
];

export function AgendaSlotFinderDialog({
  open,
  onOpenChange,
  events,
  onSelectSlot,
}: AgendaSlotFinderDialogProps) {
  const { vacations } = useVacations();

  // Filtros internos do localizador
  const [selectedSystem, setSelectedSystem] = useState<SlotFinderSystem>("Orion TN");
  const [durationDays, setDurationDays] = useState<number>(5);
  const [searchFromDate, setSearchFromDate] = useState<Date>(() => {
    const today = new Date();
    return isWeekend(today) ? nextMonday(today) : today;
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Especialistas aptos para o sistema selecionado
  const systemSpecialists = useMemo(() => {
    return IMPLANTADOR_SPECIALTIES.filter((imp) =>
      imp.specialties.includes(selectedSystem)
    );
  }, [selectedSystem]);

  // Algoritmo de busca de janelas contínuas livres
  const availableSlots = useMemo<DeploymentSlot[]>(() => {
    if (systemSpecialists.length === 0) return [];

    const slots: DeploymentSlot[] = [];
    const horizonCalendarDays = 75; // busca nos próximos ~2,5 meses
    const baseStart = startOfDay(searchFromDate);

    for (const specialist of systemSpecialists) {
      const normName = specialist.normalizedName;

      // Monta mapa de dias úteis com status de ocupação para este especialista
      let consecutiveFreeDays: { date: Date; dateIso: string }[] = [];

      for (let dayOffset = 0; dayOffset < horizonCalendarDays; dayOffset++) {
        const checkDate = addDays(baseStart, dayOffset);
        const dateIso = format(checkDate, "yyyy-MM-dd");

        // Regra 1: Pular finais de semana
        if (isWeekend(checkDate)) {
          // Fim de semana não interrompe a sequência se os dias úteis antes e depois forem livres,
          // mas não conta como dia útil de implantação.
          continue;
        }

        // Regra 2: Pular feriados oficiais
        if (getWeekdayHoliday(checkDate)) {
          // Feriado interrompe sequência contínua de trabalho
          consecutiveFreeDays = [];
          continue;
        }

        // Regra 3: Checar se o especialista está de férias
        const isOnVacation = vacations.some((v) => {
          const vNorm = normalizeSpecialtyText(v.implantador_name);
          if (vNorm !== normName && !vNorm.includes(normName)) return false;
          const vStart = v.start_date.slice(0, 10);
          const vEnd = v.end_date.slice(0, 10);
          return dateIso >= vStart && dateIso <= vEnd;
        });

        if (isOnVacation) {
          consecutiveFreeDays = [];
          continue;
        }

        // Regra 4: Checar se o especialista já possui compromissos na agenda
        const hasBusyEvent = events.some((evt) => {
          if (evt.date !== dateIso) return false;
          const evtNorm = normalizeSpecialtyText(evt.userName);
          if (evtNorm !== normName && !evtNorm.includes(normName)) return false;

          // Se for implantação, aderência, homologação, configuração ou dia todo -> ocupado
          if (
            evt.isAllDay ||
            evt.activityType === "implantacao" ||
            evt.activityType === "aderencia" ||
            evt.activityType === "homologacao" ||
            evt.activityType === "configuracao" ||
            evt.origin === "phase1_implementation"
          ) {
            return true;
          }

          // Se tiver 2 ou mais chamados parciais no mesmo dia, considera ocupado
          return false;
        });

        if (hasBusyEvent) {
          consecutiveFreeDays = [];
          continue;
        }

        // Dia útil livre encontrado!
        consecutiveFreeDays.push({ date: checkDate, dateIso });

        // Se atingiu a quantidade necessária de dias úteis contínuos
        if (consecutiveFreeDays.length === durationDays) {
          const slotStart = consecutiveFreeDays[0].date;
          const slotEnd = consecutiveFreeDays[consecutiveFreeDays.length - 1].date;

          slots.push({
            id: `slot-${specialist.normalizedName}-${consecutiveFreeDays[0].dateIso}-${durationDays}d`,
            userName: specialist.name,
            system: selectedSystem,
            startDate: slotStart,
            endDate: slotEnd,
            startDateIso: consecutiveFreeDays[0].dateIso,
            endDateIso: consecutiveFreeDays[consecutiveFreeDays.length - 1].dateIso,
            businessDaysCount: durationDays,
            freeDates: consecutiveFreeDays.map((d) => d.dateIso),
          });

          // Desliza a janela para encontrar o próximo encaixe viável
          consecutiveFreeDays.shift();
        }
      }
    }

    // Ordena os slots cronologicamente (janelas mais próximas primeiro)
    slots.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Remove sobreposições redundantes do mesmo analista que começam em dias seguidos (mantém apenas as primeiras de cada semana)
    const uniqueSlots: DeploymentSlot[] = [];
    const seenMap = new Set<string>();

    for (const slot of slots) {
      const key = `${slot.userName}___${slot.startDateIso.slice(0, 7)}`;
      // Limita a até 3 sugestões por especialista por mês para não poluir
      const countForMonth = uniqueSlots.filter(
        (s) => s.userName === slot.userName && s.startDateIso.slice(0, 7) === slot.startDateIso.slice(0, 7)
      ).length;

      if (countForMonth < 2) {
        uniqueSlots.push(slot);
      }
    }

    return uniqueSlots;
  }, [systemSpecialists, searchFromDate, durationDays, events, vacations, selectedSystem]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
        {/* CABEÇALHO */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-gradient-to-r from-amber-500/10 via-background to-amber-500/5 shrink-0">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Zap className="h-5 w-5 fill-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Localizador de Janelas de Implantação</span>
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                    ⚡ Encaixe de Projetos
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Identifique instantaneamente dias úteis livres e sem conflitos para novos projetos
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* CORPO DE FILTROS E RESULTADOS */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* SEÇÃO 1: FILTROS COMPACTOS (SISTEMA, DURAÇÃO E DATA MÍNIMA) */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 sm:p-4 space-y-3 shadow-2xs">
            {/* 1. SELETOR DE SISTEMA */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                Sistema do Projeto
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {AVAILABLE_SYSTEMS.map((sys) => {
                  const isSelected = selectedSystem === sys;
                  const style = SYSTEM_BADGE_STYLES[sys];
                  return (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => setSelectedSystem(sys)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all",
                        isSelected
                          ? cn("ring-2 ring-primary/40 shadow-xs", style.badgeClass)
                          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dotColor)} />
                      <span>{sys}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. DURAÇÃO DA IMPLANTAÇÃO (DIAS ÚTEIS) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Duração da Implantação
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = durationDays === opt.days;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setDurationDays(opt.days)}
                      className={cn(
                        "flex flex-col items-start p-2 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30 font-semibold"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-foreground">{opt.label}</span>
                        {opt.isRecommended && (
                          <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 py-0 rounded">
                            Padrão
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. A PARTIR DE QUAL DATA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Buscar janelas livres a partir de:</span>
              </div>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold justify-between min-w-[170px]"
                  >
                    <span>{format(searchFromDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                    <Calendar className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarPicker
                    mode="single"
                    selected={searchFromDate}
                    onSelect={(d) => {
                      if (d) setSearchFromDate(d);
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* SEÇÃO 2: RESULTADOS ENCONTRADOS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Janelas Livres Encontradas ({availableSlots.length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Especialistas avaliados: {systemSpecialists.map((s) => s.name).join(", ")}
              </span>
            </div>

            {availableSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground opacity-60" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Nenhuma janela contínua de {durationDays} dias úteis encontrada
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Os especialistas de {selectedSystem} já possuem compromissos ou férias no período pesquisado. Experimente alterar a data inicial ou escolher 3 dias úteis.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const startFormatted = format(slot.startDate, "dd/MM", { locale: ptBR });
                  const endFormatted = format(slot.endDate, "dd/MM", { locale: ptBR });
                  const monthName = format(slot.startDate, "MMMM 'de' yyyy", { locale: ptBR });
                  const style = SYSTEM_BADGE_STYLES[slot.system];

                  return (
                    <div
                      key={slot.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all animate-in fade-in duration-200"
                    >
                      {/* LADO ESQUERDO: DATAS E DETALHES */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                          <span className="text-[10px] font-extrabold uppercase leading-none">
                            {format(slot.startDate, "EEE", { locale: ptBR }).replace(".", "")}
                          </span>
                          <span className="text-sm font-black leading-tight">
                            {format(slot.startDate, "dd")}
                          </span>
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {startFormatted} a {endFormatted}
                            </span>
                            <span className="text-[11px] text-muted-foreground capitalize">
                              ({monthName})
                            </span>
                            <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0 font-bold">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {slot.businessDaysCount} dias livres
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Avatar className="h-4 w-4 text-[8px]">
                              <AvatarFallback className="bg-primary/15 text-primary font-bold">
                                {getInitials(slot.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{slot.userName}</span>
                            <span>•</span>
                            <span className={cn("px-1.5 py-0 rounded text-[9px] font-semibold border", style.badgeClass)}>
                              {slot.system}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* LADO DIREITO: BOTÃO DE AÇÃO DIRETA */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          onSelectSlot({
                            system: slot.system,
                            userName: slot.userName,
                            startDate: slot.startDate,
                            endDate: slot.endDate,
                          });
                        }}
                        className={cn(
                          "shrink-0 h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98]",
                          "bg-gradient-to-r from-[#9e1c36] via-[#b91c3e] to-[#80142b] text-white hover:from-[#8d1830] hover:via-[#a71937] hover:to-[#731227]"
                        )}
                      >
                        <Zap className="h-3 w-3 fill-white text-white shrink-0" />
                        <span>Agendar nesta Janela</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
