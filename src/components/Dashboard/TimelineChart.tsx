import { ProjectV2 } from "@/types/ProjectV2";
import { cn } from "@/lib/utils";
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
    <Card className="col-span-1 lg:col-span-2 shadow-sm border-muted/20">
      <CardHeader className="py-3 px-4 border-b bg-muted/5">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          Timeline de Projetos
          <span className="text-[10px] lowercase font-normal opacity-60">Próximos 30 dias</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px] w-full">
          <div className="min-w-[1200px] p-4">
            {/* Header */}
            <div className="flex border-b border-muted/30 pb-2 mb-4 sticky top-0 bg-background/50 backdrop-blur-sm z-10">
              <div className="w-64 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Projeto / Cliente</div>
              <div className="flex-1 flex items-end">
                {days.map((day, i) => {
                  const dayNum = parseInt(format(day, "d"));
                  const shouldShowLabel = dayNum % 3 === 1 || i === 0 || i === days.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      {shouldShowLabel && (
                        <span className="text-[9px] font-bold text-muted-foreground/80 mb-1">
                          {format(day, "dd/MM")}
                        </span>
                      )}
                      <div className={cn(
                        "w-px h-2", 
                        shouldShowLabel ? "bg-muted-foreground/30" : "bg-muted-foreground/10"
                      )} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-3 relative">
              {/* Vertical Grid Lines */}
              <div className="absolute inset-0 left-64 flex pointer-events-none">
                {days.map((_, i) => (
                  <div key={i} className="flex-1 border-l border-muted/10 h-full" />
                ))}
              </div>

              {projects
                .filter(p => {
                  if (p.globalStatus === 'archived') return false;
                  
                  // Encontrar a etapa que está "in-progress"
                  const stages = Object.entries(p.stages);
                  const currentStage = stages.find(([_, stage]) => stage.status === "in-progress")?.[0];
                  
                  // Mostrar apenas se for implantação ou pós
                  return currentStage === 'implementation' || currentStage === 'post';
                })
                .sort((a, b) => {
                  const dateA = a.startDateActual || a.createdAt;
                  const dateB = b.startDateActual || b.createdAt;
                  return Math.abs(differenceInDays(new Date(dateA), today)) - Math.abs(differenceInDays(new Date(dateB), today));
                })
                .slice(0, 25)
                .map((project) => {
                const sDate = project.startDateActual || project.createdAt;
                const eDate = project.endDateActual || addDays(new Date(sDate), 14); // 14 days estimate
                
                const totalDays = differenceInDays(endDate, startDate) + 1;
                const startOffset = differenceInDays(new Date(sDate), startDate);
                const duration = differenceInDays(new Date(eDate), new Date(sDate)) + 1;
                
                const visibleStart = Math.max(0, startOffset);
                const visibleDuration = Math.max(0.5, Math.min(duration, totalDays - visibleStart));
                
                if (visibleDuration <= 0 && startOffset > totalDays) return null;

                const leftPercent = (visibleStart / totalDays) * 100;
                const widthPercent = (visibleDuration / totalDays) * 100;

                return (
                  <div key={project.id} className="flex items-center group relative h-9">
                    <div className="w-64 pr-4 z-10 bg-background/80 backdrop-blur-sm rounded-r-lg">
                      <p className="text-xs font-bold truncate group-hover:text-primary transition-colors" title={project.clientName}>
                        {project.clientName}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono opacity-70">
                        {project.ticketNumber} • {project.systemType}
                      </p>
                    </div>
                    <div className="flex-1 relative h-full flex items-center">
                      <div
                        className={cn(
                          "absolute h-6 rounded-full flex items-center justify-center transition-all overflow-hidden shadow-sm border border-white/10 group-hover:scale-[1.02] cursor-pointer",
                          project.healthScore === "critical" ? "bg-destructive/90 text-destructive-foreground" :
                          project.healthScore === "warning" ? "bg-warning/90 text-warning-foreground" :
                          "bg-primary/80 text-primary-foreground"
                        )}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      >
                        <span className="text-[9px] font-black uppercase px-2 truncate">
                          {project.globalStatus === "done" ? "✓ " : ""}{project.systemType}
                        </span>
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
