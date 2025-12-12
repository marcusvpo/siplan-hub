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
    <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground mr-auto">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      <Select onValueChange={onSystemChange} defaultValue="all">
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sistema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Sistemas</SelectItem>
          {systems.map((system) => (
            <SelectItem key={system} value={system}>
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
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "PPP", { locale: ptBR })
            ) : (
              <span>Data Início</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
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
