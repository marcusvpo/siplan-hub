import { ProjectV2, StageStatus, BlockingReason } from "@/types/ProjectV2";
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
import { useAutoSave } from "@/hooks/useAutoSave";
import { Badge } from "@/components/ui/badge";

interface InfraCardProps {
  project: ProjectV2;
}

export const InfraCard = ({ project }: InfraCardProps) => {
  const { updateProject } = useProjectsV2();
  const stage = project.stages.infra;
  const isBlocked = stage.status === "blocked";

  const {
    data: localData,
    handleChange,
    saveState,
  } = useAutoSave(
    {
      status: stage.status,
      responsible: stage.responsible || "",
      blockingReason: stage.blockingReason || "",
      observations: stage.observations || "",
    },
    async (newData) => {
      const updates = { ...newData };
      const infraUpdates = {
        ...updates,
        blockingReason:
          updates.blockingReason === ""
            ? undefined
            : (updates.blockingReason as BlockingReason),
      };

      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          stages: {
            ...project.stages,
            infra: {
              ...project.stages.infra,
              ...infraUpdates,
            },
          },
        },
      });
    }
  );

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
                    handleChange("status", value as StageStatus)
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
                  onChange={(value) => handleChange("responsible", value)}
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
                    handleChange("blockingReason", e.target.value)
                  }
                />
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações..."
                value={localData.observations}
                onChange={(e) => handleChange("observations", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground italic">
                {saveState.status === "saving" && "💾 Salvando..."}
                {saveState.status === "success" && "✅ Salvo"}
                {saveState.status === "error" && "❌ Erro ao salvar"}
                {saveState.status === "idle" &&
                  "💾 Salvamento automático ativado"}
              </p>
              {saveState.status === "error" && (
                <Badge variant="destructive">{saveState.message}</Badge>
              )}
            </div>
          </div>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
};
