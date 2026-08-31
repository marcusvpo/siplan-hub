import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface ReportsFiltersProps {
  onSystemChange: (value: string) => void;
  onDateChange: (date: Date | undefined) => void;
  systems: string[];
}

export function ReportsFilters({
  onSystemChange,
  onDateChange,
  systems,
}: ReportsFiltersProps) {
  const [date, setDate] = useState<Date>();

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    onDateChange(newDate);
  };

  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 min-[420px]:grid-cols-2 sm:flex sm:gap-3">
      <div className="flex items-center gap-1.5 text-muted-foreground min-[420px]:col-span-2 sm:col-span-1 sm:mr-auto">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">Filtros:</span>
      </div>

      <Select onValueChange={onSystemChange} defaultValue="all">
        <SelectTrigger className="h-10 w-full min-w-0 text-xs sm:h-9 sm:w-[180px]">
          <SelectValue placeholder="Sistema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Todos os Sistemas</SelectItem>
          {systems.map((system) => (
            <SelectItem key={system} value={system} className="text-xs">
              {system}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "h-10 w-full min-w-0 justify-start text-left text-xs font-normal sm:h-9 sm:w-[200px]",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {date ? (
              format(date, "PPP", { locale: ptBR })
            ) : (
              <span>Data Início</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-1rem)] max-w-fit p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
