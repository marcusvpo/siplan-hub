import { useState, useEffect } from "react";
import { Project, ProjectStatus } from "@/types/project";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Server } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface InfraCardProps {
  project: Project;
}

export const InfraCard = ({ project }: InfraCardProps) => {
  const { updateProject } = useProjects();
  const stage = project.stages.infra;
  const isBlocked = stage.status === ProjectStatus.BLOCKED;

  const [localData, setLocalData] = useState({
    status: stage.status,
    responsible: stage.responsible || "",
    blockingReason: stage.blockingReason || "",
    observations: stage.observations || "",
  });

  const debouncedData = useDebounce(localData, 1000);

  useEffect(() => {
    if (JSON.stringify(debouncedData) !== JSON.stringify({
      status: stage.status,
      responsible: stage.responsible || "",
      blockingReason: stage.blockingReason || "",
      observations: stage.observations || "",
    })) {
      updateProject.mutate({
        projectId: project.id,
        updates: {
          infra_status: debouncedData.status,
          infra_responsible: debouncedData.responsible,
          infra_blocking_reason: debouncedData.blockingReason,
          infra_observations: debouncedData.observations,
        },
      }, {
        onSuccess: () => {
          toast.success("Alterações salvas automaticamente", { duration: 2000 });
        },
      });
    }
  }, [debouncedData]);

  return (
    <AccordionItem value="infra">
      <Card className={cn("overflow-hidden", isBlocked && "border-l-4 border-l-critical")}>
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-primary" />
            <span className="font-semibold">Análise de Infraestrutura</span>
            <span className="text-xs text-muted-foreground">
              {localData.status === ProjectStatus.DONE && "✓ Finalizado"}
              {localData.status === ProjectStatus.IN_PROGRESS && "→ Em Andamento"}
              {localData.status === ProjectStatus.BLOCKED && "⚠ Bloqueado"}
              {localData.status === ProjectStatus.TODO && "○ Aguardando"}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={localData.status} 
                  onValueChange={(value) => setLocalData({...localData, status: value as ProjectStatus})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Não Iniciado</SelectItem>
                    <SelectItem value="in-progress">Em Andamento</SelectItem>
                    <SelectItem value="done">Finalizado</SelectItem>
                    <SelectItem value="blocked">Reprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsável</Label>
                <Input
                  placeholder="Nome do responsável"
                  value={localData.responsible}
                  onChange={(e) => setLocalData({...localData, responsible: e.target.value})}
                />
              </div>
            </div>

            {isBlocked && (
              <div>
                <Label>Motivo do Bloqueio</Label>
                <Input
                  placeholder="Descreva o motivo do bloqueio"
                  value={localData.blockingReason}
                  onChange={(e) => setLocalData({...localData, blockingReason: e.target.value})}
                />
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações..."
                value={localData.observations}
                onChange={(e) => setLocalData({...localData, observations: e.target.value})}
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground italic">
              💾 Salvamento automático ativado
            </p>
          </div>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
};
