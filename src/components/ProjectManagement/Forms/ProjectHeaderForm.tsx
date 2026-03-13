import { ProjectV2 } from "@/types/ProjectV2";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, User, Clock, Check } from "lucide-react";

interface ProjectHeaderFormProps {
  project: ProjectV2;
}

export function ProjectHeaderForm({ project }: ProjectHeaderFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
         <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
           <FileText className="h-3.5 w-3.5" />
         </div>
         <h3 className="text-lg font-bold text-foreground tracking-tight">Dados do Projeto</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
         {/* Coluna 1: Campos de Input (5 cols) */}
         <div className="lg:col-span-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
               {/* Sistema */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-3.5 space-y-1.5 group">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Sistema</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base">{project.systemType}</p>
                    <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 h-4 px-1">new</Badge>
                  </div>
               </div>
               {/* Chamado */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-3.5 space-y-1.5 group">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Chamado</p>
                  <p className="font-bold font-mono text-base text-foreground/80">#{project.ticketNumber}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               {/* Líder */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-3.5 space-y-1.5 group">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Líder</p>
                  <div className="flex items-center gap-2.5">
                     <div className="h-7 w-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden shadow-inner">
                        <User className="h-3.5 w-3.5 text-slate-600" />
                     </div>
                     <p className="font-bold text-sm truncate">{project.projectLeader}</p>
                  </div>
               </div>
               {/* Horas */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-3.5 space-y-1.5 group">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Horas</p>
                  <p className="font-bold text-base">{project.soldHours || 0}<span className="text-xs text-muted-foreground font-normal ml-1">h</span></p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               {/* Legado */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-3.5 space-y-1.5 group">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Legado</p>
                  <p className="font-bold text-base">{project.legacySystem || '-'}</p>
               </div>
               {/* Próximo Follow-up */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-3.5 space-y-1.5 group">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Próximo Follow-up</p>
                  <div className="flex items-center gap-2">
                     <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                     <p className="font-bold text-base">
                       {project.nextFollowUpDate ? format(new Date(project.nextFollowUpDate).toISOString().split('T')[0], "dd/MM", { locale: ptBR }) : '-'}
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* Coluna 2: Status Card (4 cols) */}
         <div className="lg:col-span-4">
            <div className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-900/20 p-5 flex flex-col items-center justify-center text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-24 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none group-hover:bg-white/20 transition-colors duration-500" />
               
               <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center mb-3 backdrop-blur-md shadow-inner">
                  <Clock className="h-6 w-6 text-blue-100" />
               </div>
               
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100 mb-1.5">Status Atual</p>
               <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-center leading-tight">
                  {project.globalStatus === 'in-progress' ? 'Em Andamento' : 
                   project.globalStatus === 'done' ? 'Concluído' : 
                   project.globalStatus === 'blocked' ? 'Bloqueado' : 'A Fazer'}
               </h2>

               <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                  <Check className="h-5 w-5 text-white" />
               </div>
            </div>
         </div>

         {/* Coluna 3: Updates (3 cols) */}
         <div className="lg:col-span-3">
            {/* Last Update */}
            <div className="h-full bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-xl shadow-rose-900/20 p-5 flex flex-col items-center justify-center text-white relative overflow-hidden group">
               <div className="absolute top-0 left-0 p-24 bg-white/10 rounded-full blur-3xl -ml-12 -mt-12 pointer-events-none group-hover:bg-white/20 transition-colors duration-500" />
               
               <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center mb-3 backdrop-blur-md shadow-inner">
                  <Clock className="h-6 w-6 text-rose-100" />
               </div>

               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-100 mb-1.5">Última Atualização</p>
               <h2 className="text-2xl font-black uppercase tracking-tighter mb-1.5 text-center">
                 {format(new Date(project.lastUpdatedAt), "dd MMM", { locale: ptBR })}
               </h2>
               <p className="text-lg font-medium text-rose-100/90 bg-black/10 px-3 py-0.5 rounded-full">
                 {format(new Date(project.lastUpdatedAt), "HH:mm")}
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
