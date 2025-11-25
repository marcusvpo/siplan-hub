import { useState, useEffect } from "react";
import { Project, ProjectStatus } from "@/types/project";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface ConversionCardProps {
  project: Project;
}

export const ConversionCard = ({ project }: ConversionCardProps) => {
  const { updateProject } = useProjects();
  const stage = project.stages.conversion;

  const [localData, setLocalData] = useState({
    status: stage.status,
    responsible: stage.responsible || "",
    sourceSystem: stage.sourceSystem || "",
    observations: stage.observations || "",
  });

  const debouncedData = useDebounce(localData, 1000);

  useEffect(() => {
    const hasChanges = 
      debouncedData.status !== stage.status ||
      debouncedData.responsible !== (stage.responsible || "") ||
      debouncedData.sourceSystem !== (stage.sourceSystem || "") ||
      debouncedData.observations !== (stage.observations || "");

    if (hasChanges) {
      updateProject.mutate({
        projectId: project.id,
        updates: {
          conversion_status: debouncedData.status,
          conversion_responsible: debouncedData.responsible,
          conversion_source_system: debouncedData.sourceSystem,
          conversion_observations: debouncedData.observations,
        },
      }, {
        onSuccess: () => {
          toast.success("Alterações salvas automaticamente", { duration: 2000 });
        },
      });
    }
  }, [debouncedData]);

  return (
    <AccordionItem value="conversion">
      <Card>
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary" />
            <span className="font-semibold">Conversão de Dados</span>
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
            </div>

            <div>
              <Label>Sistema de Origem</Label>
              <Input
                placeholder="Ex: Datasul, Protheus, SAP, etc."
                value={localData.sourceSystem}
                onChange={(e) => setLocalData({...localData, sourceSystem: e.target.value})}
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações sobre a conversão..."
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
