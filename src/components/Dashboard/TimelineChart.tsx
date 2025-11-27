import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineChartProps {
  projects: ProjectV2[];
}

export const TimelineChart = ({ projects }: TimelineChartProps) => {
  const today = new Date();
  const startDate = startOfMonth(today);
  const endDate = endOfMonth(addDays(today, 30)); // Show next 30 days roughly
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Timeline de Projetos (Próximos 30 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="flex border-b pb-2 mb-2">
              <div className="w-48 font-medium text-sm">Projeto</div>
              <div className="flex-1 flex">
                {days.map((day, i) => (
                  <div key={i} className="flex-1 text-[10px] text-center text-muted-foreground border-l">
                    {format(day, "dd")}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-4">
              {projects.slice(0, 10).map((project) => {
                if (!project.startDatePlanned || !project.endDatePlanned) return null;
                
                // Calculate position and width
                const totalDays = differenceInDays(endDate, startDate) + 1;
                const startOffset = differenceInDays(new Date(project.startDatePlanned), startDate);
                const duration = differenceInDays(new Date(project.endDatePlanned), new Date(project.startDatePlanned)) + 1;
                
                // Clamp values to visible range
                const visibleStart = Math.max(0, startOffset);
                const visibleDuration = Math.min(duration, totalDays - visibleStart);
                
                if (visibleDuration <= 0) return null;

                const leftPercent = (visibleStart / totalDays) * 100;
                const widthPercent = (visibleDuration / totalDays) * 100;

                return (
                  <div key={project.id} className="flex items-center group">
                    <div className="w-48 text-sm truncate pr-2" title={project.clientName}>
                      {project.clientName}
                    </div>
                    <div className="flex-1 relative h-6 bg-muted/20 rounded">
                      <div
                        className="absolute h-full rounded bg-primary/80 group-hover:bg-primary transition-colors text-[10px] text-primary-foreground flex items-center justify-center overflow-hidden whitespace-nowrap px-1"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      >
                        {project.systemType}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
