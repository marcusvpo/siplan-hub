import React, { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isWeekend,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Scale,
  Calendar as CalendarIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { UnifiedAgendaEvent } from "@/types/agenda";
import {
  getWeekdayHoliday,
} from "@/lib/calendar-holidays";
import {
  AgendaCard,
  getAgendaEventCategory,
  AGENDA_CATEGORY_STYLES,
} from "@/components/agenda/AgendaCard";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export interface AgendaMonthViewProps {
  /** Data atual selecionada (determina o mês exibido) */
  currentDate: Date;
  /** Lista unificada de eventos do período */
  events: UnifiedAgendaEvent[];
  /** Callback ao clicar em um evento específico */
  onEventClick?: (event: UnifiedAgendaEvent) => void;
  /** Callback ao clicar no dia */
  onDayClick?: (date: Date) => void;
  /** Callback para criar novo agendamento a partir daquele dia */
  onNewEntry?: (date: Date) => void;
  /** Se o usuário atual tem permissão para criar agendamentos */
  canCreate?: boolean;
  className?: string;
  /** Lista de nomes de analistas filtrados para diferenciação multicolor */
  selectedUserNames?: string[];
}

const WEEKDAYS = [
  { short: "Seg", long: "Segunda-feira", min: "S" },
  { short: "Ter", long: "Terça-feira", min: "T" },
  { short: "Qua", long: "Quarta-feira", min: "Q" },
  { short: "Qui", long: "Quinta-feira", min: "Q" },
  { short: "Sex", long: "Sexta-feira", min: "S" },
  { short: "Sáb", long: "Sábado", min: "S", isWeekend: true },
  { short: "Dom", long: "Domingo", min: "D", isWeekend: true },
];

/** Número máximo de cards compactos exibidos diretamente na célula desktop antes do overflow */
const MAX_VISIBLE_DESKTOP_CARDS = 2;

export function AgendaMonthView({
  currentDate,
  events,
  selectedUserNames = [],
  onEventClick,
  onDayClick,
  onNewEntry,
  canCreate = false,
  className,
}: AgendaMonthViewProps) {
  // Estado para visualização móvel do dia clicado
  const [mobileSelectedDay, setMobileSelectedDay] = useState<Date | null>(null);

  // Mapeamento dos eventos por data (YYYY-MM-DD) para busca instantânea O(1)
  const eventsByDateMap = useMemo(() => {
    const map = new Map<string, UnifiedAgendaEvent[]>();
    for (const evt of events) {
      if (!evt.date) continue;
      const key = evt.date.slice(0, 10);
      const list = map.get(key) || [];
      list.push(evt);
      map.set(key, list);
    }
    return map;
  }, [events]);

  // Intervalo dos dias exibidos na grade clássica de 7 colunas (Segunda a Domingo)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // 1 = Segunda-feira
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  const handleDaySelect = (day: Date) => {
    onDayClick?.(day);
    // Em telas mobile, abre modal simplificado com a lista de cards
    if (window.innerWidth < 640) {
      setMobileSelectedDay(day);
    }
  };

  const mobileEvents = useMemo(() => {
    if (!mobileSelectedDay) return [];
    const key = format(mobileSelectedDay, "yyyy-MM-dd");
    return eventsByDateMap.get(key) || [];
  }, [mobileSelectedDay, eventsByDateMap]);

  const mobileHoliday = useMemo(() => {
    if (!mobileSelectedDay) return null;
    return getWeekdayHoliday(mobileSelectedDay);
  }, [mobileSelectedDay]);

  return (
    <div
      className={cn(
        "flex flex-col w-full rounded-xl border border-border/80 bg-card shadow-xs select-none overflow-hidden",
        className
      )}
    >
      {/* CABEÇALHO DOS DIAS DA SEMANA (Segunda a Domingo) */}
      <div className="grid grid-cols-7 border-b border-border/80 bg-muted/40 text-center font-semibold text-xs text-muted-foreground">
        {WEEKDAYS.map((wd, idx) => (
          <div
            key={idx}
            className={cn(
              "py-2.5 px-1 truncate transition-colors",
              wd.isWeekend && "text-muted-foreground/75 bg-muted/20"
            )}
          >
            <span className="hidden md:inline">{wd.long}</span>
            <span className="hidden sm:inline md:hidden">{wd.short}</span>
            <span className="sm:hidden font-bold">{wd.min}</span>
          </div>
        ))}
      </div>

      {/* GRADE MENSAL DE DIAS (7 Colunas) */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60 bg-muted/10">
        {calendarDays.map((day) => {
          const isoDate = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDateMap.get(isoDate) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const isWeekendDay = isWeekend(day);
          const holiday = getWeekdayHoliday(day);
          const hasOverflow = dayEvents.length > MAX_VISIBLE_DESKTOP_CARDS;
          const visibleEvents = hasOverflow
            ? dayEvents.slice(0, MAX_VISIBLE_DESKTOP_CARDS)
            : dayEvents;
          const overflowCount = dayEvents.length - MAX_VISIBLE_DESKTOP_CARDS;

          const cellAriaLabel = `${format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}, ${dayEvents.length} atividades${holiday ? `, feriado: ${holiday.name}` : ""}`;

          return (
            <div
              key={isoDate}
              role="button"
              tabIndex={0}
              aria-label={cellAriaLabel}
              onClick={() => handleDaySelect(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDaySelect(day);
                }
              }}
              className={cn(
                "group relative flex flex-col justify-between transition-colors min-h-[72px] sm:min-h-[125px] lg:min-h-[142px] p-1 sm:p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset cursor-pointer touch-manipulation",
                !isCurrentMonth && "bg-muted/[0.06] text-muted-foreground/60",
                isCurrentMonth && "bg-card text-card-foreground",
                isWeekendDay && isCurrentMonth && "bg-muted/[0.12] dark:bg-muted/[0.06]",
                isCurrentDay && "bg-primary/[0.02]"
              )}
            >
              {/* TOPO DA CÉLULA: Número do Dia + Feriado + Botão Rápido (+) */}
              <div className="flex items-center justify-between gap-1 w-full min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  {/* Número do Dia com destaque bordô elegante quando for Hoje */}
                  <span
                    className={cn(
                      "text-xs font-semibold leading-none flex items-center justify-center transition-all",
                      isCurrentDay
                        ? "h-6 w-6 rounded-full bg-[hsl(346,84%,45%)] text-white font-bold shadow-xs"
                        : isCurrentMonth
                        ? "text-foreground group-hover:text-primary"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Indicador discreto de Feriado Forense / Nacional */}
                  {holiday && (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="hidden sm:inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold border border-amber-300/80 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 max-w-[110px] truncate cursor-help"
                          >
                            <Scale className="h-2.5 w-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="truncate">{holiday.name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs z-50">
                          <p className="font-bold text-amber-600 dark:text-amber-400">
                            {holiday.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {holiday.weekdayLabel} • Feriado forense/nacional
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Botão Rápido de Inclusão (+): Exibido no hover para quem tem permissão */}
                {canCreate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewEntry?.(day);
                    }}
                    title={`Novo agendamento em ${format(day, "dd/MM/yyyy")}`}
                    className="h-5 w-5 rounded-full p-0 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="sr-only">Adicionar agendamento</span>
                  </Button>
                )}
              </div>

              {/* MOBILE: Indicadores condensados pontuais (Dots coloridos e badge de contagem) */}
              <div className="flex flex-col items-center justify-center gap-1 my-auto sm:hidden w-full">
                {holiday && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                    title={`Feriado: ${holiday.name}`}
                  />
                )}
                {dayEvents.length > 0 && (
                  <div className="flex items-center justify-center flex-wrap gap-1 max-w-[42px]">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const cat = getAgendaEventCategory(evt);
                      const style = AGENDA_CATEGORY_STYLES[cat];
                      return (
                        <span
                          key={evt.id}
                          className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dotColorClass)}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] font-bold text-muted-foreground leading-none">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* DESKTOP (>= sm): Lista de Cards com Densidade Compacta */}
              <div className="hidden sm:flex flex-col gap-1 w-full mt-1.5 flex-1 min-h-0 justify-start">
                {visibleEvents.map((evt) => (
                  <AgendaCard
                    key={evt.id}
                    event={evt}
                    density="compact"
                    showTime={true}
                    showAnalyst={false}
                    selectedUserNames={selectedUserNames}
                    onClick={onEventClick}
                  />
                ))}

                {/* BOTÃO + X MAIS COM POPOVER LIMPO E ROLAGEM INTERNA */}
                {hasOverflow && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-auto w-full text-center text-[10px] font-semibold text-primary hover:text-primary/90 hover:bg-primary/5 rounded py-0.5 border border-dashed border-primary/30 transition-colors select-none focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        + {overflowCount} {overflowCount === 1 ? "mais" : "mais"}
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-80 sm:w-96 p-3 shadow-xl border bg-popover text-popover-foreground rounded-xl z-50 animate-in fade-in-50 zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Cabeçalho do Popover */}
                      <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground capitalize truncate">
                            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {dayEvents.length}{" "}
                            {dayEvents.length === 1 ? "agendamento registrado" : "agendamentos registrados"}
                          </p>
                        </div>

                        {canCreate && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onNewEntry?.(day)}
                            className="h-7 text-xs gap-1 shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Novo
                          </Button>
                        )}
                      </div>

                      {/* Aviso de Feriado no Popover */}
                      {holiday && (
                        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-amber-300/80 bg-amber-50/70 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                          <Scale className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <span className="font-bold">{holiday.name}</span>
                            <span className="block text-[10px] text-amber-700 dark:text-amber-300">
                              Feriado forense/nacional
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Lista de Todos os Eventos do Dia com rolagem suave */}
                      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                        {dayEvents.map((evt) => (
                          <AgendaCard
                            key={evt.id}
                            event={evt}
                            density="normal"
                            showTime={true}
                            showAnalyst={true}
                            selectedUserNames={selectedUserNames}
                            onClick={onEventClick}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM SHEET ERGONÔMICO PARA MOBILE COM DRAG HANDLE E SAFE-AREA */}
      <Sheet
        open={Boolean(mobileSelectedDay)}
        onOpenChange={(open) => !open && setMobileSelectedDay(null)}
      >
        <SheetContent
          side="bottom"
          className="sm:hidden max-h-[88dvh] rounded-t-2xl p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3"
        >
          {/* Puxador visual (Drag Handle) ergonômico */}
          <div className="mx-auto -mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

          <SheetHeader className="text-left border-b border-border/60 pb-2">
            <SheetTitle className="text-base font-bold capitalize">
              {mobileSelectedDay
                ? format(mobileSelectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })
                : "Agendamentos"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {mobileEvents.length}{" "}
              {mobileEvents.length === 1 ? "agendamento cadastrado" : "agendamentos cadastrados"}
            </SheetDescription>
          </SheetHeader>

          {mobileHoliday && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/80 bg-amber-50/80 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <Scale className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold leading-tight">{mobileHoliday.name}</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Feriado forense / nacional
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[50dvh] pr-0.5">
            {mobileEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs">Nenhum agendamento para este dia.</p>
              </div>
            ) : (
              mobileEvents.map((evt) => (
                <AgendaCard
                  key={evt.id}
                  event={evt}
                  density="normal"
                  showTime={true}
                  showAnalyst={true}
                  showTooltip={false}
                  selectedUserNames={selectedUserNames}
                  onClick={(clicked) => {
                    setMobileSelectedDay(null);
                    onEventClick?.(clicked);
                  }}
                />
              ))
            )}
          </div>

          {canCreate && mobileSelectedDay && (
            <div className="pt-2 border-t border-border/60">
              <Button
                type="button"
                className="w-full h-11 gap-2 text-sm font-semibold active:scale-[0.99] touch-manipulation"
                onClick={() => {
                  const targetDay = mobileSelectedDay;
                  setMobileSelectedDay(null);
                  onNewEntry?.(targetDay);
                }}
              >
                <Plus className="h-4 w-4" />
                Novo Agendamento neste dia
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
