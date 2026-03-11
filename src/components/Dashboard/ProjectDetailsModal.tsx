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
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b shrink-0 pr-12">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            {title}
            <span className="ml-2 text-xs font-bold text-muted-foreground lowercase">
              ({projects.length} {projects.length === 1 ? "projeto" : "projetos"})
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[300px] text-[10px] uppercase font-bold">Cliente</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Líder</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Sistema</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Progresso</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-center">Saúde</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-right">Follow-up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Nenhum projeto encontrado nesta categoria.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm tracking-tight">{project.clientName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            TKT: {project.ticketNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{project.projectLeader}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold py-0 h-5">
                          {project.systemType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 w-24">
                          <Progress value={project.overallProgress} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-bold">{project.overallProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "text-[9px] font-black uppercase h-5",
                            project.healthScore === "critical" ? "bg-destructive text-destructive-foreground" :
                            project.healthScore === "warning" ? "bg-warning text-warning-foreground" :
                            "bg-emerald-500 text-white"
                          )}
                        >
                          {project.healthScore === "critical" ? "Crítico" :
                           project.healthScore === "warning" ? "Alerta" : "OK"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-bold text-right">
                        {project.nextFollowUpDate && !isNaN(new Date(project.nextFollowUpDate).getTime()) ? (
                          format(new Date(project.nextFollowUpDate), "dd/MM", { locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground/30 font-normal">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
