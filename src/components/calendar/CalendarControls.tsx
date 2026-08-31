import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarViewMode } from "@/types/calendar";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Copy,
} from "lucide-react";

export function CalendarControls() {
  const viewMode = useCalendarStore((state) => state.viewMode);
  const setViewMode = useCalendarStore((state) => state.setViewMode);
  const currentDate = useCalendarStore((state) => state.currentDate);
  const setCurrentDate = useCalendarStore((state) => state.setCurrentDate);
  const isInteractiveMode = useCalendarStore((state) => state.isInteractiveMode);
  const setInteractiveMode = useCalendarStore((state) => state.setInteractiveMode);
  const importRealDataToSandbox = useCalendarStore((state) => state.importRealDataToSandbox);

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "day") setCurrentDate(subDays(currentDate, 1));
    if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "day") setCurrentDate(addDays(currentDate, 1));
    if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date());
  };

  return (
    <div
      className="sticky top-0 z-40 grid min-w-0 grid-cols-1 gap-2 border-b bg-background/95 px-2 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex md:items-center md:justify-between md:px-4 md:py-1"
      data-testid="calendar-controls"
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:flex md:gap-3">
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm">
          <button
            type="button"
            onClick={handlePrevious}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-muted focus:outline-none active:scale-95 md:h-6 md:w-6"
            aria-label="Período anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5 pointer-events-none" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="inline-flex h-9 items-center justify-center rounded-md px-2.5 text-[11px] font-medium transition-colors hover:bg-muted focus:outline-none active:scale-95 md:h-6 md:px-2 md:text-[10px]"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-muted focus:outline-none active:scale-95 md:h-6 md:w-6"
            aria-label="Próximo período"
          >
            <ChevronRight className="h-3.5 w-3.5 pointer-events-none" />
          </button>
        </div>
        <h2 className="min-w-0 break-words text-right text-sm font-semibold capitalize md:min-w-[120px] md:text-left">
          {viewMode === "day"
            ? format(currentDate, "dd 'de' MMM, yyyy", { locale: ptBR })
            : format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
      </div>

      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <Tabs
          value={isInteractiveMode ? "interactive" : "real"}
          onValueChange={(v) => setInteractiveMode(v === "interactive")}
          className="w-full md:absolute md:left-1/2 md:w-auto md:-translate-x-1/2"
        >
          <TabsList className="grid h-10 w-full grid-cols-2 md:h-8 md:w-[240px]">
            <TabsTrigger value="real" className="text-[11px] font-semibold md:text-[10px]">
              Real
            </TabsTrigger>
            <TabsTrigger value="interactive" className="text-[11px] font-semibold md:text-[10px]">
              Playground
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex min-w-0 gap-2 md:contents">
          {isInteractiveMode && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 min-w-0 flex-1 gap-1 border-amber-200 px-2 text-[10px] text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 md:h-7 md:flex-none"
              onClick={() => importRealDataToSandbox()}
            >
              <Copy className="h-3 w-3 shrink-0" />
              <span className="truncate">Copiar dados reais</span>
            </Button>
          )}

          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as CalendarViewMode)}
          >
            <SelectTrigger
              className="h-10 min-w-0 flex-1 text-[11px] md:h-7 md:w-[100px] md:flex-none md:text-[10px]"
              aria-label="Visualização do calendário"
            >
              <SelectValue placeholder="Visualização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day" className="text-xs">Dia</SelectItem>
              <SelectItem value="week" className="text-xs">Semana</SelectItem>
              <SelectItem value="month" className="text-xs">Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
