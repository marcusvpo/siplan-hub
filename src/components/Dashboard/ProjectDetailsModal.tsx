import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectV2 } from "@/types/ProjectV2";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  projects: ProjectV2[];
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  projects,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border/40 text-card-foreground shadow-2xl">
        <DialogHeader className="p-6 border-b shrink-0 bg-muted/20 relative">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-lg font-black uppercase tracking-tight max-w-[80%] leading-tight">
              {title}
            </DialogTitle>
            <div className="flex flex-col items-center justify-center bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
              <span className="text-lg font-black text-primary leading-none">{projects.length}</span>
              <span className="text-[8px] font-bold uppercase text-primary/70 tracking-tighter">
                {projects.length === 1 ? "projeto" : "projetos"}
              </span>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {projects.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-center text-muted-foreground italic">
                Nenhum projeto encontrado nesta categoria.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px] text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Cliente</TableHead>
                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70 text-center">Líder</TableHead>
                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70 text-center">Sistema</TableHead>
                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70 text-center">Progresso</TableHead>
                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70 text-center">Saúde</TableHead>
                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70 text-right">Follow-up</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id} className="hover:bg-muted/30 transition-colors border-muted/20">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm tracking-tight text-foreground">{project.clientName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                                TKT: {project.ticketNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-center">{project.projectLeader}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 bg-background/50 border-muted/50">
                              {project.systemType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 w-24 mx-auto">
                              <Progress value={project.overallProgress} className="h-1.5 flex-1 bg-muted/40" />
                              <span className="text-[10px] font-black">{project.overallProgress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "text-[9px] font-black uppercase h-5 px-2",
                                project.healthScore === "critical" ? "bg-destructive text-white shadow-[0_0_8px_rgba(239,68,68,0.3)]" :
                                project.healthScore === "warning" ? "bg-warning text-warning-foreground shadow-[0_0_8px_rgba(234,179,8,0.3)]" :
                                "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              )}
                            >
                              {project.healthScore === "critical" ? "Crítico" :
                               project.healthScore === "warning" ? "Alerta" : "OK"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-black text-right opacity-80">
                            {project.nextFollowUpDate && !isNaN(new Date(project.nextFollowUpDate).getTime()) ? (
                              format(new Date(project.nextFollowUpDate), "dd/MM", { locale: ptBR })
                            ) : (
                              <span className="text-muted-foreground/20 font-normal">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Seção de Detalhes Adicionais se houver apenas um projeto */}
                {projects.length === 1 && (
                  <div className="pt-4 border-t border-muted/20">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: "Infra", stage: projects[0].stages.infra },
                        { label: "Aderência", stage: projects[0].stages.adherence },
                        { label: "Ambiente", stage: projects[0].stages.environment },
                        { label: "Conversão", stage: projects[0].stages.conversion },
                        { label: "Implantação", stage: projects[0].stages.implementation },
                        { label: "Pós", stage: projects[0].stages.post }
                      ].map((item) => (
                        <div key={item.label} className="p-3 border rounded-xl bg-card hover:bg-muted/30 transition-all border-muted/20 group flex flex-col items-center text-center">
                          <span className="text-[9px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">{item.label}</span>
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full mb-2",
                            item.stage.status === "done" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                            item.stage.status === "in-progress" ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.3)]" :
                            item.stage.status === "blocked" ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.3)]" :
                            "bg-muted-foreground/20"
                          )} />
                          <span className="text-[10px] font-bold uppercase opacity-90">
                            {item.stage.status === "done" ? "Concluído" :
                             item.stage.status === "in-progress" ? "Andamento" :
                             item.stage.status === "blocked" ? "Bloqueado" : 
                             item.stage.status === "waiting_adjustment" ? "Ajuste" : "Pendente"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
