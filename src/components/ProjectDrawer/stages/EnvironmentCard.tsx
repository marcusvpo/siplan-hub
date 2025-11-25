import { useState, useEffect } from "react";
import { Project, ProjectStatus } from "@/types/project";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MonitorCheck } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface EnvironmentCardProps {
  project: Project;
}

export const EnvironmentCard = ({ project }: EnvironmentCardProps) => {
  const { updateProject } = useProjects();
  const stage = project.stages.environment;

  const [localData, setLocalData] = useState({
    status: stage.status,
    responsible: stage.responsible || "",
    osVersion: stage.osVersion || "",
    approvedByInfra: stage.approvedByInfra,
    realDate: stage.realDate ? stage.realDate.toISOString().split('T')[0] : "",
    observations: stage.observations || "",
  });

  const debouncedData = useDebounce(localData, 1000);

  useEffect(() => {
    const hasChanges = 
      debouncedData.status !== stage.status ||
      debouncedData.responsible !== (stage.responsible || "") ||
      debouncedData.osVersion !== (stage.osVersion || "") ||
      debouncedData.approvedByInfra !== stage.approvedByInfra ||
      debouncedData.realDate !== (stage.realDate ? stage.realDate.toISOString().split('T')[0] : "") ||
      debouncedData.observations !== (stage.observations || "");

    if (hasChanges) {
      updateProject.mutate({
        projectId: project.id,
        updates: {
          environment_status: debouncedData.status,
          environment_responsible: debouncedData.responsible,
          environment_os_version: debouncedData.osVersion,
          environment_approved_by_infra: debouncedData.approvedByInfra,
          environment_real_date: debouncedData.realDate || null,
          environment_observations: debouncedData.observations,
        },
      }, {
        onSuccess: () => {
          toast.success("Alterações salvas automaticamente", { duration: 2000 });
        },
      });
    }
  }, [debouncedData]);

  return (
    <AccordionItem value="environment">
      <Card>
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <MonitorCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold">Preparação de Ambiente</span>
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

              <div>
                <Label>Sistema Operacional</Label>
                <Input
                  placeholder="Ex: Windows Server 2019, Ubuntu 22.04"
                  value={localData.osVersion}
                  onChange={(e) => setLocalData({...localData, osVersion: e.target.value})}
                />
              </div>

              <div>
                <Label>Data Real de Disponibilização</Label>
                <Input 
                  type="date" 
                  value={localData.realDate}
                  onChange={(e) => setLocalData({...localData, realDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="infra-approval" 
                checked={localData.approvedByInfra}
                onCheckedChange={(checked) => setLocalData({...localData, approvedByInfra: checked as boolean})}
              />
              <label
                htmlFor="infra-approval"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Aprovado pela Infraestrutura
              </label>
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
