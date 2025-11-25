import { useState, useEffect } from "react";
import { Project, ProjectStatus } from "@/types/project";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface AdherenceCardProps {
  project: Project;
}

export const AdherenceCard = ({ project }: AdherenceCardProps) => {
  const { updateProject } = useProjects();
  const stage = project.stages.adherence;

  const [localData, setLocalData] = useState({
    status: stage.status,
    responsible: stage.responsible || "",
    hasProductGap: stage.hasProductGap,
    devTicket: stage.devTicket || "",
    devEstimatedDate: stage.devEstimatedDate ? stage.devEstimatedDate.toISOString().split('T')[0] : "",
    startDate: stage.startDate ? stage.startDate.toISOString().split('T')[0] : "",
    endDate: stage.endDate ? stage.endDate.toISOString().split('T')[0] : "",
    observations: stage.observations || "",
  });

  const debouncedData = useDebounce(localData, 1000);

  useEffect(() => {
    const hasChanges = 
      debouncedData.status !== stage.status ||
      debouncedData.responsible !== (stage.responsible || "") ||
      debouncedData.hasProductGap !== stage.hasProductGap ||
      debouncedData.devTicket !== (stage.devTicket || "") ||
      debouncedData.devEstimatedDate !== (stage.devEstimatedDate ? stage.devEstimatedDate.toISOString().split('T')[0] : "") ||
      debouncedData.startDate !== (stage.startDate ? stage.startDate.toISOString().split('T')[0] : "") ||
      debouncedData.endDate !== (stage.endDate ? stage.endDate.toISOString().split('T')[0] : "") ||
      debouncedData.observations !== (stage.observations || "");

    if (hasChanges) {
      updateProject.mutate({
        projectId: project.id,
        updates: {
          adherence_status: debouncedData.status,
          adherence_responsible: debouncedData.responsible,
          adherence_has_product_gap: debouncedData.hasProductGap,
          adherence_dev_ticket: debouncedData.devTicket,
          adherence_dev_estimated_date: debouncedData.devEstimatedDate || null,
          adherence_start_date: debouncedData.startDate || null,
          adherence_end_date: debouncedData.endDate || null,
          adherence_observations: debouncedData.observations,
        },
      }, {
        onSuccess: () => {
          toast.success("Alterações salvas automaticamente", { duration: 2000 });
        },
      });
    }
  }, [debouncedData]);

  return (
    <AccordionItem value="adherence">
      <Card>
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">Análise de Aderência</span>
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
                <Label>Data de Início</Label>
                <Input 
                  type="date" 
                  value={localData.startDate}
                  onChange={(e) => setLocalData({...localData, startDate: e.target.value})}
                />
              </div>

              <div>
                <Label>Data de Término</Label>
                <Input 
                  type="date" 
                  value={localData.endDate}
                  onChange={(e) => setLocalData({...localData, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="product-gap">Gap de Produto Identificado?</Label>
              </div>
              <Switch
                id="product-gap"
                checked={localData.hasProductGap}
                onCheckedChange={(checked) => setLocalData({...localData, hasProductGap: checked})}
              />
            </div>

            {localData.hasProductGap && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-warning/5 border border-warning/20 rounded-lg">
                <div>
                  <Label>Ticket DEV</Label>
                  <Input 
                    placeholder="Ex: DEV-1234" 
                    value={localData.devTicket}
                    onChange={(e) => setLocalData({...localData, devTicket: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Previsão de Entrega DEV</Label>
                  <Input 
                    type="date" 
                    value={localData.devEstimatedDate}
                    onChange={(e) => setLocalData({...localData, devEstimatedDate: e.target.value})}
                  />
                </div>
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
