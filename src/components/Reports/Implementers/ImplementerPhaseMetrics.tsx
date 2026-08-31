import React from "react";
import { GraduationCap, RotateCcw, Clock, CheckCircle2, Users, ArrowRightLeft, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PhaseMetrics } from "@/hooks/useImplementerReport";

export interface ImplementerPhaseMetricsProps {
  phase1Metrics: PhaseMetrics;
  phase2Metrics: PhaseMetrics;
}

interface PhaseCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  metrics: PhaseMetrics;
}

function PhaseCard({ title, icon: Icon, metrics }: PhaseCardProps) {
  const confirmedRate = Math.min(100, Math.max(0, metrics?.confirmedRate || 0));
  const switchEntries = Object.entries(metrics?.switchTypes || {});
  const trainingEntries = Object.entries(metrics?.trainingTypes || {});
  const avgDaysFormatted = metrics?.avgDays ? Number(metrics.avgDays.toFixed(1)) : 0;

  return (
    <Card className="h-full min-w-0 border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 border-b border-border/50">
        <CardTitle className="flex min-w-0 items-center gap-2 break-words text-sm font-semibold text-foreground sm:text-base">
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tempo Médio */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Tempo Médio</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {avgDaysFormatted}{" "}
              <span className="text-xs font-normal text-muted-foreground">dias</span>
            </div>
          </div>

          {/* Participantes Treinados */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Participantes Treinados</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {metrics?.totalParticipants || 0}
            </div>
          </div>
        </div>

        {/* Confirmação */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Confirmação
            </span>
            <span className="font-semibold text-foreground">
              {metrics?.confirmedCount || 0}/{metrics?.totalCount || 0} ({confirmedRate.toFixed(0)}%)
            </span>
          </div>
          <Progress value={confirmedRate} className="h-2 bg-muted" />
        </div>

        {/* Tipos de Virada */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
            Tipos de Virada
          </span>
          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {switchEntries.length > 0 ? (
              switchEntries.map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs font-normal">
                  {type}: <span className="font-semibold ml-1">{count}</span>
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/70 italic">Nenhum registrado</span>
            )}
          </div>
        </div>

        {/* Tipos de Treinamento */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            Tipos de Treinamento
          </span>
          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {trainingEntries.length > 0 ? (
              trainingEntries.map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs font-normal">
                  {type}: <span className="font-semibold ml-1">{count}</span>
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/70 italic">Nenhum registrado</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImplementerPhaseMetrics({
  phase1Metrics,
  phase2Metrics,
}: ImplementerPhaseMetricsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
      <PhaseCard
        title="Fase 1: Treinamento & Acompanhamento"
        icon={GraduationCap}
        metrics={phase1Metrics}
      />
      <PhaseCard
        title="Fase 2: Possível Retorno"
        icon={RotateCcw}
        metrics={phase2Metrics}
      />
    </div>
  );
}

export default ImplementerPhaseMetrics;
