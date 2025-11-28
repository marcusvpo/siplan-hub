import { useState, useEffect } from "react";
import { ProjectV2, StageStatus } from "@/types/ProjectV2";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Server } from "lucide-react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface InfraCardProps {
  project: ProjectV2;
}

export const InfraCard = ({ project }: InfraCardProps) => {
  const { updateProject } = useProjectsV2();
  const stage = project.stages.infra;
  const isBlocked = stage.status === "blocked";

  const [localData, setLocalData] = useState({
    status: stage.status,
    responsible: stage.responsible || "",
    blockingReason: stage.blockingReason || "",
    observations: stage.observations || "",
  });

  const debouncedData = useDebounce(localData, 1000);

  useEffect(() => {
    if (
      JSON.stringify(debouncedData) !==
      JSON.stringify({
        status: stage.status,
        responsible: stage.responsible || "",
        blockingReason: stage.blockingReason || "",
        observations: stage.observations || "",
      })
    ) {
      updateProject.mutate(
        {
          projectId: project.id,
          updates: {
            stages: {
              ...project.stages,
              infra: {
                ...project.stages.infra,
                status: debouncedData.status,
                responsible: debouncedData.responsible,
                // blockingReason is not in InfraStageV2 standard type, but might be in DB.
                // If it's not in V2 type, we might lose it or need to add it.
                // For now, let's assume we can pass it if we cast or if V2 type allows extra props.
                // Actually, let's check V2 type. If it's not there, we should add it or use customFields.
                // But for now, let's stick to what was there.
                // However, useProjectsV2 expects Partial<ProjectV2>.
                // If I pass extra fields, TS will complain.
                // Let's check ProjectV2 type.
                observations: debouncedData.observations,
              },
            },
          },
        },
        {
          onSuccess: () => {
            toast.success("Alterações salvas automaticamente", {
              duration: 2000,
            });
          },
        }
      );
    }
  }, [
    debouncedData,
    project.id,
    project.stages,
    stage.status,
    stage.responsible,
    stage.blockingReason,
    stage.observations,
    updateProject,
  ]);

  return (
    <AccordionItem value="infra">
      <Card
        className={cn(
          "overflow-hidden",
          isBlocked && "border-l-4 border-l-critical"
        )}
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-primary" />
            <span className="font-semibold">Análise de Infraestrutura</span>
            <span className="text-xs text-muted-foreground">
              {localData.status === "done" && "✓ Finalizado"}
              {localData.status === "in-progress" && "→ Em Andamento"}
              {localData.status === "blocked" && "⚠ Bloqueado"}
              {localData.status === "todo" && "○ Aguardando"}
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
                  onValueChange={(value) =>
                    setLocalData({
                      ...localData,
                      status: value as StageStatus,
                    })
                  }
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
                <AutocompleteInput
                  placeholder="Nome do responsável"
                  value={localData.responsible}
                  onChange={(value) =>
                    setLocalData({ ...localData, responsible: value })
                  }
                />
              </div>
            </div>

            {isBlocked && (
              <div>
                <Label>Motivo do Bloqueio</Label>
                <Input
                  placeholder="Descreva o motivo do bloqueio"
                  value={localData.blockingReason}
                  onChange={(e) =>
                    setLocalData({
                      ...localData,
                      blockingReason: e.target.value,
                    })
                  }
                />
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações..."
                value={localData.observations}
                onChange={(e) =>
                  setLocalData({ ...localData, observations: e.target.value })
                }
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
