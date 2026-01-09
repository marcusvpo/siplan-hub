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
  const {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    isInteractiveMode,
    setInteractiveMode,
    importRealDataToSandbox,
  } = useCalendarStore();

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
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 select-none shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 border rounded-md bg-background shadow-sm p-1">
          <button
            type="button"
            onClick={handlePrevious}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none active:scale-95"
          >
            <ChevronLeft className="h-4 w-4 pointer-events-none" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="h-8 px-3 text-sm font-medium inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none active:scale-95"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none active:scale-95"
          >
            <ChevronRight className="h-4 w-4 pointer-events-none" />
          </button>
        </div>
        <h2 className="text-lg font-semibold capitalize min-w-[150px]">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {isInteractiveMode && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => importRealDataToSandbox()}
          >
            <Copy className="h-4 w-4" />
            Copiar Dados Reais
          </Button>
        )}

        <Tabs
          value={isInteractiveMode ? "interactive" : "real"}
          onValueChange={(v) => setInteractiveMode(v === "interactive")}
          className="absolute left-1/2 -translate-x-1/2"
        >
          <TabsList className="grid w-[300px] grid-cols-2 h-10">
            <TabsTrigger value="real" className="font-semibold">
              Real
            </TabsTrigger>
            <TabsTrigger value="interactive" className="font-semibold">
              Playground
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={viewMode}
          onValueChange={(v) => setViewMode(v as CalendarViewMode)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Visualização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Dia</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
