import React, { useMemo, useState } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isWeekend,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Scale,
  Palmtree,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedAgendaEvent } from "@/types/agenda";
import { getWeekdayHoliday } from "@/lib/calendar-holidays";
import { AgendaCard } from "@/components/agenda/AgendaCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calculateDayTimelineSlots,
  computeOverlappingLayout,
  sortEventsByPriority,
  TIMELINE_HOURS,
  minutesToPercent,
  type PositionedTimelineSlot,
} from "@/lib/agenda-view-helpers";

export interface AgendaWeekViewProps {
  currentDate: Date;
  events: UnifiedAgendaEvent[];
  selectedUserNames?: string[];
  onCardClick: (event: UnifiedAgendaEvent) => void;
  onTimeSlotClick?: (date: string, time: string, collaboratorId?: string) => void;
  onDateSelect?: (date: Date) => void;
  className?: string;
  isLoading?: boolean;
}

export function AgendaWeekView({
  currentDate,
  events,
  selectedUserNames = [],
  onCardClick,
  onTimeSlotClick,
  onDateSelect,
  className,
}: AgendaWeekViewProps) {
  // Semana iniciando na Segunda-feira (weekStartsOn: 1)
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // No celular, permite ao usuário selecionar o dia ativo para foco ou deslizar com swipe
  const [activeMobileDayIndex, setActiveMobileDayIndex] = useState(() => {
    const todayIndex = weekDays.findIndex((d) => isToday(d));
    return todayIndex !== -1 ? todayIndex : 0;
  });

  // Mapeia eventos para cada um dos 7 dias e calcula slots proporcionais
  const daysData = useMemo(() => {
    return weekDays.map((day) => {
      const dayIso = format(day, "yyyy-MM-dd");
      const isDayToday = isToday(day);
      const isDayWeekend = isWeekend(day);
      const holiday = getWeekdayHoliday(day);

      const allDayForDate = events.filter((e) => e.date === dayIso);

      // Separação entre ausências/férias (topo) e tarefas agendadas (corpo)
      const vacations = allDayForDate.filter(
        (e) =>
          e.origin === "vacation" ||
          e.activityType === "compensacao_horas" ||
          (e.status && /férias|ferias|folga|ausência|ausencia/i.test(e.status))
      );

      const scheduled = sortEventsByPriority(
        allDayForDate.filter(
          (e) =>
            e.origin !== "vacation" &&
            e.activityType !== "compensacao_horas" &&
            !(e.status && /férias|ferias|folga|ausência|ausencia/i.test(e.status))
        )
      );

      const rawSlots = calculateDayTimelineSlots(scheduled);
      const positionedSlots = computeOverlappingLayout(rawSlots);

      return {
        day,
        dayIso,
        isDayToday,
        isDayWeekend,
        holiday,
        vacations,
        scheduled,
        positionedSlots,
        totalCount: allDayForDate.length,
      };
    });
  }, [weekDays, events]);

  const hasAnyVacation = useMemo(
    () => daysData.some((d) => d.vacations.length > 0),
    [daysData]
  );

  // Suporte a gestos touch swipe entre os dias da semana no celular
  const weekSwipeHandlers = useTouchSwipe({
    onSwipeLeft: () => {
      setActiveMobileDayIndex((prev) => Math.min(prev + 1, daysData.length - 1));
    },
    onSwipeRight: () => {
      setActiveMobileDayIndex((prev) => Math.max(prev - 1, 0));
    },
  });

  const showAnalystBadges = selectedUserNames.length !== 1;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      {/* SELETOR RÁPIDO DE DIAS NO MOBILE (< 768px) COM ALVOS TOUCH DE 48PX */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto border-b border-border/70 bg-muted/30 p-2">
        {daysData.map((d, idx) => (
          <button
            key={d.dayIso}
            type="button"
            onClick={() => setActiveMobileDayIndex(idx)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[48px] min-h-[48px] transition-all text-center touch-manipulation",
              activeMobileDayIndex === idx
                ? "bg-primary text-primary-foreground font-bold shadow-xs scale-102"
                : d.isDayToday
                ? "bg-muted font-bold text-foreground border border-primary/50"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            <span className="text-[10px] uppercase font-semibold">
              {format(d.day, "EEE", { locale: ptBR }).replace(".", "")}
            </span>
            <span className="text-sm font-extrabold">{format(d.day, "dd")}</span>
            {d.totalCount > 0 && (
              <span
                className={cn(
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  activeMobileDayIndex === idx ? "bg-white" : "bg-primary"
                )}
              />
            )}
          </button>
        ))}
      </div>

      {/* ÁREA DA GRADE COM RÉGUA DE HORAS (08:00 ÀS 22:00) */}
      <div {...weekSwipeHandlers} className="relative flex flex-1 w-full overflow-x-auto md:overflow-visible select-none touch-pan-y">
        {/* COLUNA ESQUERDA FIXA: RÉGUA DE HORÁRIOS */}
        <div className="sticky left-0 z-30 flex w-11 sm:w-14 shrink-0 flex-col bg-background/95 backdrop-blur-xs border-r border-border/70">
          <div className="h-[74px] sm:h-[82px] border-b border-border/70 flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
            Horas
          </div>
          {hasAnyVacation && (
            <div className="h-8 border-b border-border/50 text-[9px] text-muted-foreground/70 flex items-center justify-center">
              Férias
            </div>
          )}
          <div className="relative w-full h-[1120px] sm:h-[1260px] min-h-[1120px] sm:min-h-[1260px]">
            {TIMELINE_HOURS.map((hour) => {
              const top = minutesToPercent(hour * 60);
              return (
                <div
                  key={hour}
                  style={{ top: `${top}%` }}
                  className="absolute right-1 sm:right-2 -translate-y-1/2 text-[10px] sm:text-xs font-semibold text-muted-foreground tabular-nums select-none"
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              );
            })}
          </div>
          {/* Espaçador de rodapé para respiro após as 22:00 */}
          <div className="h-14 sm:h-16 w-full shrink-0" aria-hidden="true" />
        </div>

        {/* GRADE SEMANAL DE 7 COLUNAS */}
        <div className="grid grid-cols-1 md:grid-cols-7 flex-1 min-w-full md:min-w-0 divide-y md:divide-y-0 md:divide-x divide-border/70">
          {daysData.map((dayItem, index) => {
            const isVisibleMobile = activeMobileDayIndex === index;

            return (
              <div
                key={dayItem.dayIso}
                className={cn(
                  "flex flex-col min-w-0 bg-background/50 transition-colors h-full",
                  dayItem.isDayWeekend && "bg-muted/15 dark:bg-muted/10",
                  !isVisibleMobile && "hidden md:flex"
                )}
              >
                {/* CABEÇALHO DO DIA */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Visualizar dia ${format(dayItem.day, "dd 'de' MMMM", { locale: ptBR })}`}
                  onClick={() => onDateSelect?.(dayItem.day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onDateSelect?.(dayItem.day);
                    }
                  }}
                  className={cn(
                    "h-[74px] sm:h-[82px] flex flex-col items-center justify-center border-b border-border/70 p-1.5 transition-colors cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset touch-manipulation",
                    dayItem.isDayToday && "bg-primary/5 dark:bg-primary/10"
                  )}
                  title="Clique para abrir a visão diária deste dia"
                >
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(dayItem.day, "EEEE", { locale: ptBR })}
                  </span>

                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-extrabold transition-transform duration-150 hover:scale-105",
                        dayItem.isDayToday
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {format(dayItem.day, "dd")}
                    </span>

                    {dayItem.totalCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 px-1 text-[9px] font-bold tabular-nums"
                      >
                        {dayItem.totalCount}
                      </Badge>
                    )}
                  </div>

                  {/* Badge de Feriado */}
                  {dayItem.holiday && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex mt-0.5">
                            <Badge
                              variant="outline"
                              className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 gap-1 text-[9px] font-semibold max-w-[110px] truncate cursor-help py-0"
                            >
                              <Scale className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{dayItem.holiday.name}</span>
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Feriado: {dayItem.holiday.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* SEÇÃO DE FÉRIAS / AUSÊNCIAS (SE HOUVER) */}
                {hasAnyVacation && (
                  <div className="h-8 border-b border-border/50 px-1 py-0.5 flex items-center gap-1 overflow-x-auto bg-amber-50/20 dark:bg-amber-950/20">
                    {dayItem.vacations.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => onCardClick(v)}
                        className="inline-flex items-center gap-1 rounded bg-amber-100/90 dark:bg-amber-950/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 cursor-pointer hover:bg-amber-200/90 transition-colors shadow-2xs truncate"
                      >
                        <Palmtree className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                        <span className="truncate font-semibold">{v.userName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* GRADE HORÁRIA PROPORCIONAL DA COLUNA (08:00 ÀS 22:00) */}
                <div className="relative w-full h-[1120px] sm:h-[1260px] min-h-[1120px] sm:min-h-[1260px]">
                  {/* LINHAS HORIZONTAIS DE GRADE PARA CADA HORA */}
                  {TIMELINE_HOURS.map((hour) => {
                    const top = minutesToPercent(hour * 60);
                    return (
                      <div
                        key={hour}
                        style={{ top: `${top}%` }}
                        onClick={() => onTimeSlotClick?.(dayItem.dayIso, `${String(hour).padStart(2, "0")}:00`)}
                        className="absolute left-0 right-0 border-b border-border/30 hover:bg-primary/[0.04] cursor-pointer transition-colors"
                        title={`Clique para agendar em ${dayItem.dayIso} às ${String(hour).padStart(2, "0")}:00`}
                      />
                    );
                  })}

                  {/* DESTAQUE DO INTERVALO DE ALMOÇO (12:30 ÀS 13:30) */}
                  <div
                    style={{
                      top: `${minutesToPercent(12 * 60 + 30)}%`,
                      height: `${minutesToPercent(13 * 60 + 30) - minutesToPercent(12 * 60 + 30)}%`,
                    }}
                    className="absolute left-0 right-0 z-0 border-y border-dashed border-amber-300/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.05] pointer-events-none"
                  />

                  {/* CARDS POSICIONADOS PROPORCIONALMENTE POR HORÁRIO */}
                  <div className="absolute inset-0 z-10 pointer-events-none p-1">
                    {dayItem.positionedSlots.map((slot) => {
                      const widthPercent = 100 / slot.totalCols;
                      const leftPercent = slot.colIndex * widthPercent;

                      return (
                        <div
                          key={slot.event.id}
                          style={{
                            top: `${slot.topPercent}%`,
                            height: `${Math.max(5, slot.heightPercent)}%`,
                            left: `${leftPercent}%`,
                            width: `calc(${widthPercent}% - 3px)`,
                          }}
                          className="absolute pointer-events-auto transition-all duration-150"
                        >
                          <AgendaCard
                            event={slot.event}
                            density={slot.heightPercent > 35 ? "expanded" : slot.heightPercent > 18 ? "normal" : "compact"}
                            showAnalyst={showAnalystBadges}
                            showTime={true}
                            selectedUserNames={selectedUserNames}
                            onClick={onCardClick}
                            className="h-full w-full overflow-hidden shadow-2xs hover:shadow-md hover:z-30 hover:scale-[1.01] transition-all"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Espaçador de rodapé para respiro após as 22:00 */}
                <div className="h-14 sm:h-16 w-full shrink-0" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
