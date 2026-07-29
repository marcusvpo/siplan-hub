import { ProjectV2 } from "@/types/ProjectV2";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartEmptyState } from "./ChartEmptyState";

interface TimelineChartProps {
  projects: ProjectV2[];
}

const STAGE_LABELS: Record<string, string> = {
  infra: "Infraestrutura",
  adherence: "Aderência",
  environment: "Ambiente",
  conversion: "Conversão",
  modelosEditor: "Modelos TN",
  implementation: "Implantação",
  post: "Pós-Implantação",
};

function getProjectTimelineDates(project: ProjectV2): { start: Date; end: Date; stageName: string } {
  const impl = project.stages?.implementation;
  
  if (impl?.phase1?.startDate) {
    const s = new Date(impl.phase1.startDate);
    const e = impl.phase1.endDate ? new Date(impl.phase1.endDate) : addDays(s, 14);
    return {
      start: s,
      end: e > s ? e : addDays(s, 1),
      stageName: "Implantação (Fase 1)",
    };
  }

  if (impl?.startDate) {
    const s = new Date(impl.startDate);
    const e = impl.endDate ? new Date(impl.endDate) : addDays(s, 14);
    return {
      start: s,
      end: e > s ? e : addDays(s, 1),
      stageName: "Implantação",
    };
  }

  // Verificar estágio atual em andamento
  if (project.stages) {
    const activeEntry = Object.entries(project.stages).find(
      ([_, stage]) => (stage as any)?.status === "in-progress"
    );
    if (activeEntry) {
      const [key, stage] = activeEntry as [string, any];
      
      // Aderência deve ser considerada APENAS pela data do campo "Agendado Para" (endDate), como um único dia
      if (key === "adherence") {
        const agendadoPara = stage?.endDate ? new Date(stage.endDate) : (stage?.startDate ? new Date(stage.startDate) : null);
        if (agendadoPara) {
          return {
            start: agendadoPara,
            end: agendadoPara,
            stageName: "Aderência",
          };
        }
      }

      if (stage?.startDate) {
        const s = new Date(stage.startDate);
        const e = stage.endDate ? new Date(stage.endDate) : addDays(s, 14);
        return {
          start: s,
          end: e > s ? e : addDays(s, 1),
          stageName: STAGE_LABELS[key] || key,
        };
      }
    }
  }

  // Fallback para datas globais do projeto
  if (project.startDateActual) {
    const s = new Date(project.startDateActual);
    const e = project.endDateActual ? new Date(project.endDateActual) : addDays(s, 14);
    return {
      start: s,
      end: e > s ? e : addDays(s, 1),
      stageName: "Em Andamento",
    };
  }

  const s = new Date(project.createdAt);
  const e = addDays(s, 14);
  return {
    start: s,
    end: e,
    stageName: "Início",
  };
}

export const TimelineChart = ({ projects }: TimelineChartProps) => {
  const today = new Date();
  const startDate = startOfMonth(today);
  const endDate = endOfMonth(addDays(today, 30));
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalWindowDays = differenceInDays(endDate, startDate) + 1;

  const visibleProjects = projects
    .filter((p) => {
      if (
        p.systemType === "Modelos TN" ||
        p.globalStatus === "archived" ||
        p.globalStatus === "done" ||
        p.globalStatus === "canceled"
      ) {
        return false;
      }
      
      const { start, end } = getProjectTimelineDates(p);
      // Incluir apenas se houver sobreposição com a janela do gráfico
      return start <= endDate && end >= startDate;
    })
    .map((p) => {
      const timelineData = getProjectTimelineDates(p);
      return {
        project: p,
        ...timelineData,
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 25);

  return (
    <Card className="col-span-1 lg:col-span-2 shadow-sm border-muted/20">
      <CardHeader className="py-3 px-4 border-b bg-muted/5">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          Timeline de Projetos
          <span className="text-[10px] lowercase font-normal opacity-60">Próximos 30 dias</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visibleProjects.length === 0 ? (
          <ChartEmptyState
            className="h-[320px]"
            message="Nenhum projeto na timeline"
            hint="Projetos em andamento com datas no período atual aparecem aqui."
          />
        ) : (
          <ScrollArea className="h-[340px] w-full">
            <div className="min-w-[1200px] p-4 pb-6">
              {/* Header */}
              <div className="flex border-b border-muted/30 pb-2 mb-4 sticky top-0 bg-background/50 backdrop-blur-sm z-10">
                <div className="w-64 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Projeto / Cliente
                </div>
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
                        <div
                          className={cn(
                            "w-px h-2",
                            shouldShowLabel ? "bg-muted-foreground/30" : "bg-muted-foreground/10"
                          )}
                        />
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

                {visibleProjects.map(({ project, start, end, stageName }) => {
                  const effStart = start > startDate ? start : startDate;
                  const effEnd = end < endDate ? end : endDate;

                  const startOffsetDays = differenceInDays(effStart, startDate);
                  const isSingleDay = start.getTime() === end.getTime();
                  const durationDays = isSingleDay ? 1 : Math.max(1, differenceInDays(effEnd, effStart) + 1);

                  const leftPercent = (startOffsetDays / totalWindowDays) * 100;
                  const widthPercent = Math.min(
                    100 - leftPercent,
                    Math.max(1.8, (durationDays / totalWindowDays) * 100)
                  );

                  const dateText = isSingleDay
                    ? format(start, "dd/MM/yyyy", { locale: ptBR })
                    : `${format(start, "dd/MM/yyyy", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;

                  const dateTooltip = `${project.clientName} - ${stageName} (${dateText})`;

                  return (
                    <div key={project.id} className="flex items-center group relative h-9">
                      <div className="w-64 pr-4 z-10 bg-background/80 backdrop-blur-sm rounded-r-lg">
                        <p
                          className="text-xs font-bold truncate group-hover:text-primary transition-colors"
                          title={project.clientName}
                        >
                          {project.clientName}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-mono opacity-70 truncate">
                          #{project.ticketNumber} • {stageName}
                        </p>
                      </div>
                      <div className="flex-1 relative h-full flex items-center">
                        <div
                          className={cn(
                            "absolute h-6 rounded-full flex items-center justify-center transition-all overflow-hidden shadow-sm border border-white/10 group-hover:scale-[1.02] cursor-pointer",
                            project.healthScore === "critical"
                              ? "bg-destructive/90 text-destructive-foreground"
                              : project.healthScore === "warning"
                              ? "bg-warning/90 text-warning-foreground"
                              : "bg-primary/80 text-primary-foreground"
                          )}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          title={dateTooltip}
                        >
                          <span className="text-[9px] font-black uppercase px-2 truncate">
                            {stageName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
