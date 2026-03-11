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
    <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-4 py-1 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 select-none shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 border rounded-md bg-background shadow-sm p-0.5">
          <button
            type="button"
            onClick={handlePrevious}
            className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none active:scale-95"
          >
            <ChevronLeft className="h-3.5 w-3.5 pointer-events-none" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="h-6 px-2 text-[10px] font-medium inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none active:scale-95"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none active:scale-95"
          >
            <ChevronRight className="h-3.5 w-3.5 pointer-events-none" />
          </button>
        </div>
        <h2 className="text-sm font-semibold capitalize min-w-[120px]">
          {viewMode === "day"
            ? format(currentDate, "dd 'de' MMM, yyyy", { locale: ptBR })
            : format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {isInteractiveMode && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-[10px] px-2"
            onClick={() => importRealDataToSandbox()}
          >
            <Copy className="h-3 w-3" />
            Copiar
          </Button>
        )}

        <Tabs
          value={isInteractiveMode ? "interactive" : "real"}
          onValueChange={(v) => setInteractiveMode(v === "interactive")}
          className="absolute left-1/2 -translate-x-1/2"
        >
          <TabsList className="grid w-[240px] grid-cols-2 h-8">
            <TabsTrigger value="real" className="font-semibold text-[10px]">
              Real
            </TabsTrigger>
            <TabsTrigger value="interactive" className="font-semibold text-[10px]">
              Playground
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={viewMode}
          onValueChange={(v) => setViewMode(v as CalendarViewMode)}
        >
          <SelectTrigger className="w-[100px] h-7 text-[10px]">
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
  );
}
