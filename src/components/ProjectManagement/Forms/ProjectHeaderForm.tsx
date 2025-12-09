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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
         <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
           <FileText className="h-4 w-4" />
         </div>
         <h3 className="text-xl font-bold text-foreground tracking-tight">Dados do Projeto</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Coluna 1: Campos de Input (5 cols) */}
         <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
               {/* Sistema */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Sistema</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg">{project.systemType}</p>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 h-5 px-1.5">new</Badge>
                  </div>
               </div>
               {/* Chamado */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Chamado</p>
                  <p className="font-bold font-mono text-lg text-foreground/80">#{project.ticketNumber}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Líder */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Líder</p>
                  <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden shadow-inner">
                        <User className="h-4 w-4 text-slate-600" />
                     </div>
                     <p className="font-bold text-sm truncate">{project.projectLeader}</p>
                  </div>
               </div>
               {/* Horas */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Horas</p>
                  <p className="font-bold text-lg">{project.soldHours || 0}<span className="text-sm text-muted-foreground font-normal ml-1">h</span></p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Legado */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Legado</p>
                  <p className="font-bold text-lg">{project.legacySystem || '-'}</p>
               </div>
               {/* Próximo Follow-up */}
               <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Próximo Follow-up</p>
                  <div className="flex items-center gap-2">
                     <Clock className="h-4 w-4 text-muted-foreground" />
                     <p className="font-bold text-lg">
                       {project.nextFollowUpDate ? format(new Date(project.nextFollowUpDate).toISOString().split('T')[0], "dd/MM", { locale: ptBR }) : '-'}
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* Coluna 2: Status Card (4 cols) */}
         <div className="lg:col-span-4">
            <div className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-900/20 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-colors duration-500" />
               
               <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md shadow-inner">
                  <Clock className="h-8 w-8 text-blue-100" />
               </div>
               
               <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100 mb-2">Status Atual</p>
               <h2 className="text-3xl font-black uppercase tracking-tight mb-8 text-center leading-tight">
                  {project.globalStatus === 'in-progress' ? 'Em Andamento' : 
                   project.globalStatus === 'done' ? 'Concluído' : 
                   project.globalStatus === 'blocked' ? 'Bloqueado' : 'A Fazer'}
               </h2>

               <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                  <Check className="h-7 w-7 text-white" />
               </div>
            </div>
         </div>

         {/* Coluna 3: Updates (3 cols) */}
         <div className="lg:col-span-3">
            {/* Last Update */}
            <div className="h-full bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-xl shadow-rose-900/20 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden group">
               <div className="absolute top-0 left-0 p-32 bg-white/10 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-colors duration-500" />
               
               <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md shadow-inner">
                  <Clock className="h-8 w-8 text-rose-100" />
               </div>

               <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-100 mb-2">Última Atualização</p>
               <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 text-center">
                 {format(new Date(project.lastUpdatedAt), "dd MMM", { locale: ptBR })}
               </h2>
               <p className="text-xl font-medium text-rose-100/90 bg-black/10 px-4 py-1 rounded-full">
                 {format(new Date(project.lastUpdatedAt), "HH:mm")}
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
