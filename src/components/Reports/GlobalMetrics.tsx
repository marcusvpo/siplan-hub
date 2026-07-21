import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertTriangle, TrendingUp, Search, ExternalLink, Calendar, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface GlobalMetricsProps {
  projects: ProjectV2[];
}

export function GlobalMetrics({ projects }: GlobalMetricsProps) {
  const totalProjects = projects.length;
  const completedProjects = projects.filter(
    (p) => p.globalStatus === "done"
  ).length;
  const inProgressProjects = projects.filter((p) => p.globalStatus === "in-progress");
  const blockedProjects = projects.filter((p) => p.globalStatus === "blocked");
  
  const completionRate =
    totalProjects > 0
      ? Math.round((completedProjects / totalProjects) * 100)
      : 0;

  // Calculate average time for completed projects
  const completedProjectsList = projects.filter((p) => {
    const implEndDate = p.stages.implementation.phase1?.endDate;
    return p.globalStatus === "done" && p.startDateActual && implEndDate;
  }).map(p => {
    const start = new Date(p.startDateActual!);
    const end = new Date(p.stages.implementation.phase1.endDate!);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { ...p, durationDays: diffDays };
  }).sort((a, b) => b.durationDays - a.durationDays);

  const totalDuration = completedProjectsList.reduce((acc, p) => acc + p.durationDays, 0);
  const averageTime =
    completedProjectsList.length > 0
      ? Math.round(totalDuration / completedProjectsList.length)
      : 0;

  // Identify bottleneck data
  const stages = [
    "infra",
    "adherence",
    "environment",
    "conversion",
    "implementation",
    "post",
  ] as const;
  
  const stageStats = stages.map((stageKey) => {
    const projectsWithStageDates = projects.filter((p) => {
      if (p.systemType === "Modelos TN" || p.globalStatus === "done" || p.globalStatus === "archived" || p.globalStatus === "canceled") return false;
      const stage = p.stages[stageKey];
      return stage.startDate && stage.endDate;
    });

    let avgStageDuration = 0;
    if (projectsWithStageDates.length > 0) {
      const totalStageDuration = projectsWithStageDates.reduce((acc, p) => {
        const stage = p.stages[stageKey];
        const start = new Date(stage.startDate!);
        const end = new Date(stage.endDate!);
        return acc + Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgStageDuration = totalStageDuration / projectsWithStageDates.length;
    }

    let label = stageKey.charAt(0).toUpperCase() + stageKey.slice(1);
    if (stageKey === "adherence") label = "Aderência";
    if (stageKey === "environment") label = "Ambiente";
    if (stageKey === "conversion") label = "Conversão";
    if (stageKey === "implementation") label = "Implantação";
    if (stageKey === "post") label = "Pós-Implantação";

    return { key: stageKey, label, avg: Math.round(avgStageDuration), count: projectsWithStageDates.length };
  }).sort((a, b) => b.avg - a.avg);

  const bottleneck = stageStats[0];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 1. TEMPO MÉDIO TOTAL */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 border-border hover:border-primary/30 hover:shadow-md bg-card/50 backdrop-blur-sm cursor-pointer">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-125 transition-transform duration-500">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/85">
                Tempo Médio Total
              </CardTitle>
              <div className="p-1.5 bg-primary/10 rounded-md group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="text-2xl font-black tracking-tight mb-0.5">{averageTime} dias</div>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                Média de projetos concluídos
              </p>
              <div className="mt-2.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[70%] rounded-full animate-in slide-in-from-left duration-1000" />
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-primary/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" /> Detalhamento de Performance
            </DialogTitle>
            <DialogDescription className="text-[11px] font-bold uppercase text-muted-foreground/60">
              Projetos concluídos e suas respectivas durações em dias.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4 pr-4">
            <div className="space-y-3">
              {completedProjectsList.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-primary/5 hover:border-primary/20 transition-all group">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-black uppercase truncate max-w-[300px]">{p.clientName}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 italic">{p.systemType}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-blue-600">{p.durationDays} dias</span>
                      <span className="text-[8px] font-black uppercase text-muted-foreground/40">Tempo Total</span>
                    </div>
                  </div>
                </div>
              ))}
              {completedProjectsList.length === 0 && (
                <div className="py-12 text-center text-xs font-bold uppercase text-muted-foreground/40 italic">
                  Nenhum projeto concluído para análise.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 2. TAXA DE CONCLUSÃO */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 border-border hover:border-emerald-500/30 hover:shadow-md bg-card/50 backdrop-blur-sm cursor-pointer">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-125 transition-transform duration-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/85">
                Taxa de Conclusão
              </CardTitle>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-md group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="text-2xl font-black tracking-tight text-emerald-600 mb-0.5">{completionRate}%</div>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                {completedProjects} de {totalProjects} entregues
              </p>
              <div className="mt-2.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full animate-in slide-in-from-left duration-1000" 
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-emerald-500/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Visão de Entregas
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6 space-y-6">
             <div className="flex items-center justify-between p-6 rounded-2xl bg-emerald-500/5 dark:bg-transparent border border-emerald-500/10 dark:border-emerald-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <CheckCircle2 className="h-20 w-20" />
                </div>
                <div className="space-y-1">
                   <div className="text-4xl font-black text-emerald-600">{completionRate}%</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Taxa de Sucesso</div>
                </div>
                <div className="text-right space-y-1">
                   <div className="text-sm font-black">{completedProjects} Projetos</div>
                   <div className="text-[9px] font-bold text-muted-foreground uppercase">Concluídos na Main</div>
                </div>
             </div>
             
             <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground/60">
                   <span>Proporção de Volume</span>
                   <span>Total: {totalProjects}</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                   <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                   <div className="h-full bg-blue-500/40" style={{ width: `${100 - completionRate}%` }} />
                </div>
                <div className="flex gap-4 mt-2">
                   <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">Entregues ({completedProjects})</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500/40" />
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">Em Aberto ({totalProjects - completedProjects})</span>
                   </div>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. FILA DE PRODUÇÃO */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 border-border hover:border-blue-500/30 hover:shadow-md bg-card/50 backdrop-blur-sm cursor-pointer">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-125 transition-transform duration-500">
              <TrendingUp className="h-10 w-10 text-blue-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/85">
                Fila de Produção
              </CardTitle>
              <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-md group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="text-2xl font-black tracking-tight text-blue-600 mb-0.5">
                {inProgressProjects.length}
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                {blockedProjects.length} bloqueados aguardando
              </p>
              <div className="mt-2.5 flex gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                       "h-1 flex-1 rounded-full",
                       i < 8 ? "bg-blue-500" : "bg-muted"
                    )} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-blue-500/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Controle de Fluxo
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[450px] mt-4 pr-4">
            <div className="space-y-6">
              {blockedProjects.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" /> Projetos Bloqueados ({blockedProjects.length})
                  </h4>
                  {blockedProjects.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 dark:bg-transparent border border-red-500/10 dark:border-red-500/30">
                      <span className="text-[11px] font-black uppercase max-w-[300px] truncate">{p.clientName}</span>
                      <Badge variant="destructive" className="text-[8px] h-4 font-black uppercase tracking-tighter">Impedido</Badge>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" /> Em Andamento ({inProgressProjects.length})
                </h4>
                {inProgressProjects.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 dark:bg-transparent border border-blue-500/10 dark:border-blue-500/30">
                    <span className="text-[11px] font-black uppercase max-w-[300px] truncate">{p.clientName}</span>
                    <Badge variant="outline" className="text-[8px] h-4 font-black uppercase tracking-tighter border-blue-500/30 text-blue-600">Ativo</Badge>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 4. MAIOR GARGALO */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 border-border hover:border-destructive/30 hover:shadow-md bg-card/50 backdrop-blur-sm cursor-pointer">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-125 transition-transform duration-500">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/85">
                Maior Gargalo
              </CardTitle>
              <div className="p-1.5 bg-destructive/10 text-destructive rounded-md group-hover:bg-destructive group-hover:text-white transition-colors">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="text-2xl font-black tracking-tight text-destructive mb-0.5">
                {bottleneck.label}
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                Retenção média de {bottleneck.avg} dias
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-2 bg-destructive/10 rounded-full border border-destructive/20 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                </div>
                <span className="text-[9px] font-black text-destructive italic">CRÍTICO</span>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-destructive/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Análise de Retenção
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {stageStats.map((s, i) => (
              <div key={s.key} className="space-y-2">
                <div className="flex justify-between items-end">
                   <span className="text-[10px] font-black uppercase tracking-tight">{s.label}</span>
                   <span className={cn(
                     "text-xs font-black",
                     i === 0 ? "text-destructive" : i < 3 ? "text-amber-600" : "text-emerald-600"
                   )}>{s.avg} dias</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                   <div 
                     className={cn(
                       "h-full rounded-full transition-all duration-1000",
                       i === 0 ? "bg-destructive" : i < 3 ? "bg-amber-500" : "bg-emerald-500"
                     )}
                     style={{ width: `${(s.avg / bottleneck.avg) * 100}%` }}
                   />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
