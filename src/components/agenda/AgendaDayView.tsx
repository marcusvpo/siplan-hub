import React, { useMemo, useState, useEffect } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Coffee,
  Plus,
  Palmtree,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedAgendaEvent } from "@/types/agenda";
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  minutesToPercent,
  timeStringToMinutes,
  calculateDayTimelineSlots,
  getCollaboratorMeta,
  sortEventsByPriority,
  computeOverlappingLayout,
  TIMELINE_HOURS as HOURS,
  type DayTimelineSlot,
  type PositionedTimelineSlot,
} from "@/lib/agenda-view-helpers";
import { getWeekdayHoliday } from "@/lib/calendar-holidays";
import { AgendaCard } from "@/components/agenda/AgendaCard";
import { CALENDAR_MEMBERS } from "@/types/calendar";
import { useHubCollaborators } from "@/hooks/useHubCollaborators";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AgendaDayViewProps {
  currentDate: Date;
  events: UnifiedAgendaEvent[];
  selectedUserNames?: string[];
  onCardClick: (event: UnifiedAgendaEvent) => void;
  onTimeSlotClick?: (date: string, time: string, collaboratorId?: string) => void;
  className?: string;
  isLoading?: boolean;
}

export function AgendaDayView({
  currentDate,
  events,
  selectedUserNames = [],
  onCardClick,
  onTimeSlotClick,
  className,
}: AgendaDayViewProps) {
  const { data: collaborators = [] } = useHubCollaborators();
  const dateIso = useMemo(() => format(currentDate, "yyyy-MM-dd"), [currentDate]);
  const isTodayDate = useMemo(() => isToday(currentDate), [currentDate]);
  const holiday = useMemo(() => getWeekdayHoliday(currentDate), [currentDate]);

  // Horário em tempo real para o indicador de pulso
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Filtra apenas eventos da data atual
  const dayEvents = useMemo(() => {
    return events.filter((e) => e.date === dateIso);
  }, [events, dateIso]);

  // Eventos de dia todo / RH / Férias / Ausências que ficam no topo fixo
  const allDayTopEvents = useMemo(() => {
    return dayEvents.filter(
      (e) =>
        e.origin === "vacation" ||
        e.activityType === "compensacao_horas" ||
        (e.status && /férias|ferias|folga|ausência|ausencia/i.test(e.status))
    );
  }, [dayEvents]);

  // Eventos de expediente normal que serão renderizados na régua horária
  const workingEvents = useMemo(() => {
    return dayEvents.filter(
      (e) =>
        e.origin !== "vacation" &&
        e.activityType !== "compensacao_horas" &&
        !(e.status && /férias|ferias|folga|ausência|ausencia/i.test(e.status))
    );
  }, [dayEvents]);

  // Definição das colunas de analistas a serem exibidas:
  // - Se 1, 2 ou 3 selecionados na toolbar: usa a seleção
  // - Se 0 (Todos): agrupa pelos analistas que possuem eventos hoje ou lista os especialistas principais
  const columns = useMemo(() => {
    if (selectedUserNames.length > 0) {
      return selectedUserNames.slice(0, 3).map((name) => {
        const meta = getCollaboratorMeta(name);
        const collab = collaborators.find(
          (c) => c.name.toLowerCase() === name.toLowerCase() || c.fullName?.toLowerCase() === name.toLowerCase()
        );
        return {
          id: collab?.id || name,
          name,
          shortName: meta.shortName,
          initials: meta.initials,
          colorClass: meta.colorClass,
          team: collab?.team || meta.member?.role || "Especialista",
        };
      });
    }

    // Caso "Todos os Analistas": extrai os colaboradores que possuem atividades hoje
    const uniqueNamesFromEvents = Array.from(
      new Set(dayEvents.map((e) => e.userName).filter(Boolean))
    );

    if (uniqueNamesFromEvents.length > 0) {
      return uniqueNamesFromEvents.slice(0, 4).map((name) => {
        const meta = getCollaboratorMeta(name);
        const collab = collaborators.find(
          (c) => c.name.toLowerCase() === name.toLowerCase() || c.fullName?.toLowerCase() === name.toLowerCase()
        );
        return {
          id: collab?.id || name,
          name,
          shortName: meta.shortName,
          initials: meta.initials,
          colorClass: meta.colorClass,
          team: collab?.team || meta.member?.role || "Especialista",
        };
      });
    }

    // Se ninguém tiver chamado hoje, exibe os 3 primeiros especialistas do time
    return CALENDAR_MEMBERS.slice(0, 3).map((m) => ({
      id: m.id,
      name: m.name,
      shortName: m.shortName || m.name.split(" ")[0],
      initials: m.initials || "AN",
      colorClass: m.color,
      team: m.role,
    }));
  }, [selectedUserNames, dayEvents, collaborators]);

  // Controle de analista ativo no Mobile (para abas suaves sem espremer colunas)
  const [mobileActiveColIndex, setMobileActiveColIndex] = useState(0);

  // Suporte a swipe horizontal entre analistas no mobile
  const daySwipeHandlers = useTouchSwipe({
    onSwipeLeft: () => {
      if (columns.length > 1) {
        setMobileActiveColIndex((prev) => (prev + 1) % columns.length);
      }
    },
    onSwipeRight: () => {
      if (columns.length > 1) {
        setMobileActiveColIndex((prev) => (prev - 1 + columns.length) % columns.length);
      }
    },
  });

  // Garante índice seguro no mobile se a seleção mudar
  useEffect(() => {
    if (mobileActiveColIndex >= columns.length) {
      setMobileActiveColIndex(0);
    }
  }, [columns.length, mobileActiveColIndex]);

  // Mapeia eventos para cada coluna de analista
  const columnData = useMemo(() => {
    return columns.map((col) => {
      const colEvents = workingEvents.filter((evt) => {
        const evtName = (evt.userName || "").toLowerCase();
        const targetName = col.name.toLowerCase();
        const short = col.shortName.toLowerCase();
        return (
          evtName.includes(targetName) ||
          targetName.includes(evtName) ||
          (short && evtName.includes(short))
        );
      });

      const sorted = sortEventsByPriority(colEvents);
      const slots = calculateDayTimelineSlots(sorted);
      const positioned = computeOverlappingLayout(slots);

      const colAllDay = allDayTopEvents.filter((evt) => {
        const evtName = (evt.userName || "").toLowerCase();
        const targetName = col.name.toLowerCase();
        return evtName.includes(targetName) || targetName.includes(evtName);
      });

      return {
        col,
        events: colEvents,
        slots: positioned,
        allDayEvents: colAllDay,
      };
    });
  }, [columns, workingEvents, allDayTopEvents]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      {/* 1. CABEÇALHO DO DIA (Data, Hoje, Feriados e Resumo) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/25 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-center shadow-2xs",
              isTodayDate
                ? "border-primary bg-primary text-primary-foreground font-bold"
                : "border-border bg-background text-foreground"
            )}
          >
            <span className="text-[10px] font-semibold uppercase leading-none opacity-90">
              {format(currentDate, "EEE", { locale: ptBR }).replace(".", "")}
            </span>
            <span className="text-lg font-extrabold leading-none mt-0.5">
              {format(currentDate, "dd")}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground leading-tight truncate">
                {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>

              {isTodayDate && (
                <Badge
                  variant="default"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] uppercase font-bold tracking-wide px-2 py-0.5"
                >
                  Hoje
                </Badge>
              )}

              {holiday && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 gap-1 text-[11px] cursor-help"
                      >
                        <Scale className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-none">
                          {holiday.name}
                        </span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Feriado Forense / Nacional: {holiday.name}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              {dayEvents.length === 0
                ? "Nenhum agendamento para este dia"
                : `${dayEvents.length} atividade${dayEvents.length > 1 ? "s" : ""} no total`}
            </p>
          </div>
        </div>

        {/* Seletor de Analista no Mobile quando há 2 ou mais colunas */}
        {columns.length > 1 && (
          <div className="flex md:hidden w-full pt-1">
            <div className="flex w-full items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60 overflow-x-auto">
              {columns.map((col, idx) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileActiveColIndex(idx)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all",
                    mobileActiveColIndex === idx
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      col.colorClass || "bg-primary"
                    )}
                  />
                  <span>{col.shortName}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded-full bg-muted font-bold text-muted-foreground">
                    {columnData[idx]?.events.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. FAIXA FIXA DE DIA INTEIRO / AUSÊNCIAS / FÉRIAS NO TOPO (Google Calendar Style) */}
      {(allDayTopEvents.length > 0 || holiday) && (
        <div className="border-b border-border/70 bg-amber-500/[0.03] dark:bg-amber-500/[0.06] px-4 py-2 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            <Palmtree className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Dia Inteiro / RH / Ausências</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {allDayTopEvents.map((evt) => (
              <div
                key={evt.id}
                role="button"
                tabIndex={0}
                aria-label={`Ausência: ${evt.userName}, ${evt.subject}`}
                onClick={() => onCardClick(evt)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onCardClick(evt);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-1 text-xs font-medium text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors shadow-2xs touch-manipulation"
              >
                <span className="font-bold">{evt.userName}:</span>
                <span className="truncate max-w-[200px]">{evt.subject}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CORPO DA AGENDA: RÉGUA HORÁRIA VERTICAL + COLUNAS DE ANALISTAS (COM SWIPE NO MOBILE) */}
      <div {...daySwipeHandlers} className="relative flex flex-1 overflow-visible select-none touch-pan-y">
        {/* COLUNA ESQUERDA FIXA: RÉGUA DE HORÁRIOS (08:00 ÀS 22:00) */}
        <div className="sticky left-0 z-20 flex w-12 sm:w-16 shrink-0 flex-col bg-background/95 backdrop-blur-xs border-r border-border/70">
          <div className="h-10 border-b border-border/70" />
          <div className="relative w-full h-[1120px] sm:h-[1260px] min-h-[1120px] sm:min-h-[1260px]">
            {HOURS.map((hour) => {
              const top = minutesToPercent(hour * 60);
              return (
                <div
                  key={hour}
                  style={{ top: `${top}%` }}
                  className="absolute right-2 -translate-y-1/2 text-[10px] sm:text-xs font-semibold text-muted-foreground tabular-nums select-none"
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              );
            })}
          </div>
          {/* Espaço de respiro para permitir rolagem confortável além das 22:00 */}
          <div className="h-16 sm:h-20 w-full shrink-0" aria-hidden="true" />
        </div>

        {/* ÁREA CENTRAL DAS COLUNAS (LADO A LADO EM DESKTOP / SELECIONADA EM MOBILE) */}
        <div className="relative flex flex-1 min-w-0">
          {columnData.map((cd, colIdx) => {
            const isVisibleOnMobile = mobileActiveColIndex === colIdx;

            return (
              <div
                key={cd.col.id}
                className={cn(
                  "relative flex-1 flex-col min-w-0 border-r border-border/60 last:border-r-0",
                  !isVisibleOnMobile && "hidden md:flex"
                )}
              >
                {/* CABEÇALHO DA COLUNA DO ANALISTA */}
                <div className="sticky top-0 z-20 flex h-10 items-center justify-between border-b border-border/70 bg-background/95 backdrop-blur-xs px-3 py-1 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0 border border-border">
                      <AvatarFallback
                        className={cn("text-[10px] font-bold text-white", cd.col.colorClass)}
                      >
                        {cd.col.initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="truncate text-xs font-bold text-foreground">
                        {cd.col.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {cd.col.team}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px] font-semibold tabular-nums ml-2 px-1.5 py-0"
                  >
                    {cd.events.length} {cd.events.length === 1 ? "tarefa" : "tarefas"}
                  </Badge>
                </div>

                {/* GRADE HORÁRIA DA COLUNA (08:00 ÀS 22:00) */}
                <div className="relative w-full h-[1120px] sm:h-[1260px] min-h-[1120px] sm:min-h-[1260px]">
                  {/* LINHAS HORIZONTAIS DE GRADE PARA CADA HORA */}
                  {HOURS.map((hour) => {
                    const top = minutesToPercent(hour * 60);
                    return (
                      <div
                        key={hour}
                        style={{ top: `${top}%` }}
                        className="absolute left-0 right-0 border-b border-border/40 pointer-events-none"
                      />
                    );
                  })}

                  {/* DESTAQUE SUTIL NO INTERVALO DE ALMOÇO (12:30 ÀS 13:30) */}
                  <div
                    style={{
                      top: `${minutesToPercent(12 * 60 + 30)}%`,
                      height: `${minutesToPercent(13 * 60 + 30) - minutesToPercent(12 * 60 + 30)}%`,
                    }}
                    className="absolute left-0 right-0 z-0 flex items-center justify-end pr-3 border-y border-dashed border-amber-300/40 dark:border-amber-700/30 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] pointer-events-none"
                    title="Intervalo de Almoço (12:30 às 13:30)"
                  >
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700/80 dark:text-amber-400/80 bg-background/80 px-2 py-0.5 rounded shadow-2xs backdrop-blur-xs">
                      <Coffee className="h-3 w-3" />
                      <span>Almoço (12:30 - 13:30)</span>
                    </div>
                  </div>

                  {/* INDICADOR DE HORA ATUAL EM TEMPO REAL (LINHA BORDÔ COM PULSO) */}
                  {isTodayDate &&
                    currentMinutes >= DAY_START_HOUR * 60 &&
                    currentMinutes <= DAY_END_HOUR * 60 && (
                      <div
                        style={{ top: `${minutesToPercent(currentMinutes)}%` }}
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
                      >
                        <div className="relative flex items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/20 animate-pulse" />
                          <span className="ml-1 text-[9px] font-extrabold px-1 py-0.2 rounded bg-primary text-primary-foreground shadow-xs select-none">
                            {format(currentTime, "HH:mm")}
                          </span>
                        </div>
                        <div className="h-[2px] bg-primary flex-1 shadow-xs" />
                      </div>
                    )}

                  {/* SLOTS CLICÁVEIS PARA CADASTRO RÁPIDO DE ATIVIDADE */}
                  <div className="absolute inset-0 z-5 pointer-events-none">
                    {HOURS.slice(0, -1).map((h) => {
                      const top1 = minutesToPercent(h * 60);
                      const top2 = minutesToPercent(h * 60 + 30);
                      const halfHourHeight = 5; // 30m de 600m = 5%

                      return (
                        <React.Fragment key={h}>
                          <button
                            type="button"
                            onClick={() =>
                              onTimeSlotClick?.(
                                dateIso,
                                `${String(h).padStart(2, "0")}:00`,
                                cd.col.id
                              )
                            }
                            style={{ top: `${top1}%`, height: `${halfHourHeight}%` }}
                            className="absolute left-0 right-0 pointer-events-auto group/slot flex items-center justify-center opacity-30 hover:opacity-100 sm:opacity-0 sm:hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-opacity bg-primary/[0.03] hover:bg-primary/[0.06] border-y border-dashed border-primary/25 cursor-pointer touch-manipulation"
                            title={`Agendar às ${String(h).padStart(2, "0")}:00 para ${cd.col.name}`}
                          >
                            <span className="text-[10px] font-semibold text-primary inline-flex items-center gap-1 bg-background/90 px-2 py-0.5 rounded shadow-2xs">
                              <Plus className="h-2.5 w-2.5" /> {String(h).padStart(2, "0")}:00
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onTimeSlotClick?.(
                                dateIso,
                                `${String(h).padStart(2, "0")}:30`,
                                cd.col.id
                              )
                            }
                            style={{ top: `${top2}%`, height: `${halfHourHeight}%` }}
                            className="absolute left-0 right-0 pointer-events-auto group/slot flex items-center justify-center opacity-30 hover:opacity-100 sm:opacity-0 sm:hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-opacity bg-primary/[0.03] hover:bg-primary/[0.06] border-y border-dashed border-primary/25 cursor-pointer touch-manipulation"
                            title={`Agendar às ${String(h).padStart(2, "0")}:30 para ${cd.col.name}`}
                          >
                            <span className="text-[10px] font-semibold text-primary inline-flex items-center gap-1 bg-background/90 px-2 py-0.5 rounded shadow-2xs">
                              <Plus className="h-2.5 w-2.5" /> {String(h).padStart(2, "0")}:30
                            </span>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* CARDS POSICIONADOS NA LINHA DO TEMPO */}
                  <div className="absolute inset-0 z-10 pointer-events-none p-1">
                    {cd.slots.map((slot) => {
                      const widthPercent = 100 / slot.totalCols;
                      const leftPercent = slot.colIndex * widthPercent;

                      return (
                        <div
                          key={slot.event.id}
                          style={{
                            top: `${slot.topPercent}%`,
                            height: `${slot.heightPercent}%`,
                            left: `${leftPercent}%`,
                            width: `calc(${widthPercent}% - 4px)`,
                          }}
                          className="absolute pointer-events-auto transition-all duration-200"
                        >
                          <AgendaCard
                            event={slot.event}
                            density={slot.heightPercent < 14 ? "compact" : slot.heightPercent > 35 ? "expanded" : "normal"}
                            showAnalyst={false}
                            showTime={true}
                            selectedUserNames={selectedUserNames}
                            onClick={onCardClick}
                            className="h-full w-full overflow-hidden shadow-xs hover:shadow-md hover:z-30"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Espaço de respiro para permitir rolagem confortável além das 22:00 */}
                <div className="h-16 sm:h-20 w-full shrink-0" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
