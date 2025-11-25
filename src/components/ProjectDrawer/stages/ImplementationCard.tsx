import { useState, useEffect } from "react";
import { Project, ProjectStatus } from "@/types/project";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Rocket } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface ImplementationCardProps {
  project: Project;
}

export const ImplementationCard = ({ project }: ImplementationCardProps) => {
  const { updateProject } = useProjects();
  const stage = project.stages.implementation;

  const [localData, setLocalData] = useState({
    status: stage.status,
    responsible: stage.responsible || "",
    remoteInstallDate: stage.remoteInstallDate ? stage.remoteInstallDate.toISOString().split('T')[0] : "",
    switchType: stage.switchType || "",
    trainingStartDate: stage.trainingStartDate ? stage.trainingStartDate.toISOString().split('T')[0] : "",
    trainingEndDate: stage.trainingEndDate ? stage.trainingEndDate.toISOString().split('T')[0] : "",
    observations: stage.observations || "",
  });

  const debouncedData = useDebounce(localData, 1000);

  useEffect(() => {
    const hasChanges = 
      debouncedData.status !== stage.status ||
      debouncedData.responsible !== (stage.responsible || "") ||
      debouncedData.remoteInstallDate !== (stage.remoteInstallDate ? stage.remoteInstallDate.toISOString().split('T')[0] : "") ||
      debouncedData.switchType !== (stage.switchType || "") ||
      debouncedData.trainingStartDate !== (stage.trainingStartDate ? stage.trainingStartDate.toISOString().split('T')[0] : "") ||
      debouncedData.trainingEndDate !== (stage.trainingEndDate ? stage.trainingEndDate.toISOString().split('T')[0] : "") ||
      debouncedData.observations !== (stage.observations || "");

    if (hasChanges) {
      updateProject.mutate({
        projectId: project.id,
        updates: {
          implementation_status: debouncedData.status,
          implementation_responsible: debouncedData.responsible,
          implementation_remote_install_date: debouncedData.remoteInstallDate || null,
          implementation_switch_type: debouncedData.switchType,
          implementation_training_start_date: debouncedData.trainingStartDate || null,
          implementation_training_end_date: debouncedData.trainingEndDate || null,
          implementation_observations: debouncedData.observations,
        },
      }, {
        onSuccess: () => {
          toast.success("Alterações salvas automaticamente", { duration: 2000 });
        },
      });
    }
  }, [debouncedData]);

  return (
    <AccordionItem value="implementation">
      <Card>
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <Rocket className="h-5 w-5 text-primary" />
            <span className="font-semibold">Implantação (Instalação e Treinamento)</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="p-4 space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Instalação Remota</Label>
                <Input 
                  type="date" 
                  value={localData.remoteInstallDate}
                  onChange={(e) => setLocalData({...localData, remoteInstallDate: e.target.value})}
                />
              </div>

              <div>
                <Label>Tipo de Virada</Label>
                <Input
                  placeholder="Ex: Fim de Semana, Dia Útil"
                  value={localData.switchType}
                  onChange={(e) => setLocalData({...localData, switchType: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início do Treinamento</Label>
                <Input 
                  type="date" 
                  value={localData.trainingStartDate}
                  onChange={(e) => setLocalData({...localData, trainingStartDate: e.target.value})}
                />
              </div>

              <div>
                <Label>Término do Treinamento</Label>
                <Input 
                  type="date" 
                  value={localData.trainingEndDate}
                  onChange={(e) => setLocalData({...localData, trainingEndDate: e.target.value})}
                />
              </div>
            </div>

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
