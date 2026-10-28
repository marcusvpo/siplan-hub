import { Card } from "@/components/ui/card";
import { Server, AlertOctagon, Clock, Calendar, Edit3 } from "lucide-react";
import { EnrichedInfraProject } from "./types";

interface InfraProgressKPIsProps {
  projects: EnrichedInfraProject[];
  notesCount: number;
}

export function InfraProgressKPIs({ projects, notesCount }: InfraProgressKPIsProps) {
  const total = projects.length;
  const blockedCount = projects.filter((p) => p.infraStatus === "blocked").length;
  const inProgressCount = projects.filter((p) => p.infraStatus === "in-progress").length;
  
  const phase1Confirmed = projects.filter((p) => p.phase1.hasDates && p.phase1.isConfirmed).length;
  const phase1Estimated = projects.filter((p) => p.phase1.hasDates && !p.phase1.isConfirmed).length;
  const phase1Total = phase1Confirmed + phase1Estimated;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Total Elegíveis */}
      <Card className="p-3.5 border-border/80 bg-card/60 backdrop-blur-sm shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Projetos Elegíveis</p>
          <p className="text-2xl font-black text-foreground mt-0.5">{total}</p>
          <p className="text-[10px] text-muted-foreground">Em Andamento na base</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
          <Server className="w-4 h-4 text-primary" />
        </div>
      </Card>

      {/* 2. Bloqueados */}
      <Card className="p-3.5 border-rose-500/20 bg-rose-500/5 backdrop-blur-sm shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Infra Bloqueada</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{blockedCount}</p>
          <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70">Requer adequação</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertOctagon className="w-4 h-4" />
        </div>
      </Card>

      {/* 3. Em Andamento */}
      <Card className="p-3.5 border-amber-500/20 bg-amber-500/5 backdrop-blur-sm shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Infra Em Andamento</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{inProgressCount}</p>
          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Em levantamento</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Clock className="w-4 h-4" />
        </div>
      </Card>

      {/* 4. Fase 1 com Datas */}
      <Card className="p-3.5 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Fase 1 com Datas</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{phase1Total}</p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
            {phase1Confirmed} Conf. • {phase1Estimated} Prev.
          </p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Calendar className="w-4 h-4" />
        </div>
      </Card>

      {/* 5. Anotações Salvas */}
      <Card className="p-3.5 border-border/80 bg-card/60 backdrop-blur-sm shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Anotações Salvas</p>
          <p className="text-2xl font-black text-foreground mt-0.5">
            {notesCount} / {total}
          </p>
          <p className="text-[10px] text-muted-foreground">Autosave localStorage</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
          <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      </Card>
    </div>
  );
}
