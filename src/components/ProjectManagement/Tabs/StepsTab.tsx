import {
  ProjectV2,
  ContentBlock,
  InfraStageV2,
  AdherenceStageV2,
  EnvironmentStageV2,
  ConversionStageV2,
  ImplementationStageV2,
  PostStageV2,
} from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Type, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

type AnyStage =
  | InfraStageV2
  | AdherenceStageV2
  | EnvironmentStageV2
  | ConversionStageV2
  | ImplementationStageV2
  | PostStageV2;

interface SortableBlockProps {
  block: ContentBlock;
  stageKey: keyof ProjectV2["stages"];
  activeBlockId: string | null;
  setActiveBlockId: (id: string) => void;
  updateBlock: (
    stageKey: keyof ProjectV2["stages"],
    blockId: string,
    content: string,
    checked?: boolean
  ) => void;
  deleteBlock: (stageKey: keyof ProjectV2["stages"], blockId: string) => void;
}

function SortableBlock({
  block,
  stageKey,
  activeBlockId,
  setActiveBlockId,
  updateBlock,
  deleteBlock,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const isFocused = activeBlockId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 py-2 px-3 rounded-md hover:bg-muted/30 transition-all border border-transparent",
        isFocused ? "bg-muted/40 border-muted-foreground/20 shadow-sm" : ""
      )}
      onClick={() => setActiveBlockId(block.id)}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-1 mt-1.5 transition-opacity",
          isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {block.type === "heading" && (
          <Input
            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-1 bg-transparent placeholder:text-muted-foreground/50"
            placeholder="Digite um título..."
            value={block.content}
            onChange={(e) => updateBlock(stageKey, block.id, e.target.value)}
            autoFocus={isFocused}
          />
        )}
        {block.type === "paragraph" && (
          <Textarea
            className="min-h-[24px] resize-none border-none shadow-none focus-visible:ring-0 px-0 py-1 overflow-hidden bg-transparent leading-relaxed"
            placeholder="Digite suas observações..."
            value={block.content}
            onChange={(e) => {
              updateBlock(stageKey, block.id, e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            autoFocus={isFocused}
          />
        )}
        {block.type === "checkbox" && (
          <div className="flex items-center gap-3">
            <Checkbox
              id={block.id}
              className="h-5 w-5"
              checked={block.checked || false}
              onCheckedChange={(checked) =>
                updateBlock(
                  stageKey,
                  block.id,
                  block.content,
                  checked as boolean
                )
              }
            />
            <Input
              className={cn(
                "border-none shadow-none focus-visible:ring-0 px-0 h-auto py-1 bg-transparent flex-1 transition-all",
                block.checked
                  ? "text-muted-foreground line-through decoration-muted-foreground/50"
                  : ""
              )}
              placeholder="Item da lista..."
              value={block.content}
              onChange={(e) =>
                updateBlock(stageKey, block.id, e.target.value, block.checked)
              }
              autoFocus={isFocused}
            />
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-center mt-1.5 transition-opacity",
          isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            deleteBlock(stageKey, block.id);
          }}
          title="Excluir bloco"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function StepsTab({ project, onUpdate }: TabProps) {
  const { data, handleChange, saveState } = useAutoSave(
    project,
    async (newData) => {
      onUpdate(newData);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  );

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleStageChange = (
    stageKey: keyof ProjectV2["stages"],
    field: string,
    value: unknown
  ) => {
    const currentStages = { ...data.stages };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentStage: any = { ...currentStages[stageKey] };
    currentStage[field] = value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (currentStages as any)[stageKey] = currentStage;
    handleChange("stages", currentStages);
  };

  // Rich Text Logic for Stages
  const getStageBlocks = (stage: AnyStage): ContentBlock[] => {
    if (!stage.observations) return [];

    try {
      const parsed = JSON.parse(stage.observations);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ignore error, treat as plain text
    }

    return [
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        content: stage.observations,
      },
    ];
  };

  const updateStageBlocks = (
    stageKey: keyof ProjectV2["stages"],
    blocks: ContentBlock[]
  ) => {
    handleStageChange(stageKey, "observations", JSON.stringify(blocks));
  };

  const addBlock = (
    stageKey: keyof ProjectV2["stages"],
    type: ContentBlock["type"]
  ) => {
    const currentBlocks = getStageBlocks(data.stages[stageKey]);
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: "",
      checked: false,
    };
    // Append to the end
    const newBlocks = [...currentBlocks, newBlock];
    updateStageBlocks(stageKey, newBlocks);
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (
    stageKey: keyof ProjectV2["stages"],
    blockId: string,
    content: string,
    checked?: boolean
  ) => {
    const currentBlocks = getStageBlocks(data.stages[stageKey]);
    const newBlocks = currentBlocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            content,
            checked: checked !== undefined ? checked : block.checked,
          }
        : block
    );
    updateStageBlocks(stageKey, newBlocks);
  };

  const deleteBlock = (
    stageKey: keyof ProjectV2["stages"],
    blockId: string
  ) => {
    const currentBlocks = getStageBlocks(data.stages[stageKey]);
    const newBlocks = currentBlocks.filter((block) => block.id !== blockId);
    updateStageBlocks(stageKey, newBlocks);
  };

  const handleDragEnd = (
    event: DragEndEvent,
    stageKey: keyof ProjectV2["stages"]
  ) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentBlocks = getStageBlocks(data.stages[stageKey]);
      const oldIndex = currentBlocks.findIndex(
        (block) => block.id === active.id
      );
      const newIndex = currentBlocks.findIndex((block) => block.id === over.id);

      const newBlocks = arrayMove(currentBlocks, oldIndex, newIndex);
      updateStageBlocks(stageKey, newBlocks);
    }
  };

  const renderRichEditor = (stageKey: keyof ProjectV2["stages"]) => {
    const blocks = getStageBlocks(data.stages[stageKey]);
    return (
      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Editor de Conteúdo
          </span>
          <div className="flex-1" />
          <div className="flex items-center bg-background rounded-md border shadow-sm p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs font-medium"
              onClick={() => addBlock(stageKey, "heading")}
            >
              <Type className="h-3.5 w-3.5" /> Título
            </Button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs font-medium"
              onClick={() => addBlock(stageKey, "paragraph")}
            >
              <Type className="h-3.5 w-3.5" /> Texto
            </Button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs font-medium"
              onClick={() => addBlock(stageKey, "checkbox")}
            >
              <CheckSquare className="h-3.5 w-3.5" /> Checklist
            </Button>
          </div>
        </div>

        <div className="space-y-1 min-h-[150px] p-4 bg-background/50">
          {blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 border-2 border-dashed rounded-lg m-4">
              <Type className="h-8 w-8 opacity-20" />
              <p className="text-sm font-medium">Nenhum conteúdo adicionado</p>
              <p className="text-xs opacity-70">
                Utilize a barra de ferramentas acima para começar
              </p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, stageKey)}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  stageKey={stageKey}
                  activeBlockId={activeBlockId}
                  setActiveBlockId={setActiveBlockId}
                  updateBlock={updateBlock}
                  deleteBlock={deleteBlock}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  };

  const renderCommonFields = (
    stageKey: keyof ProjectV2["stages"],
    stage: AnyStage
  ) => (
    <div className="space-y-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={stage.status}
            onValueChange={(value) =>
              handleStageChange(stageKey, "status", value)
            }
          >
            <SelectTrigger
              className={cn(
                stage.status === "done" &&
                  "bg-emerald-100 text-emerald-800 border-emerald-200",
                stage.status === "in-progress" &&
                  "bg-blue-100 text-blue-800 border-blue-200",
                stage.status === "blocked" &&
                  "bg-amber-100 text-amber-800 border-amber-200"
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Não Iniciado</SelectItem>
              <SelectItem value="in-progress">Em Andamento</SelectItem>
              <SelectItem value="done">Finalizado</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Responsável</Label>
          <AutocompleteInput
            value={stage.responsible || ""}
            onChange={(value) =>
              handleStageChange(stageKey, "responsible", value)
            }
          />
        </div>
      <div className="space-y-2">
          <Label>
            {["infra", "adherence", "environment", "conversion"].includes(stageKey)
              ? "Enviado em"
              : "Início"}
          </Label>
          <Input
            type="date"
            value={
              stage.startDate
                ? format(new Date(stage.startDate), "yyyy-MM-dd")
                : ""
            }
            onChange={(e) =>
              handleStageChange(
                stageKey,
                "startDate",
                e.target.value ? new Date(e.target.value) : undefined
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label>
            {["infra", "adherence", "environment", "conversion"].includes(stageKey)
              ? "Finalizado em"
              : "Término"}
          </Label>
          <Input
            type="date"
            value={
              stage.endDate ? format(new Date(stage.endDate), "yyyy-MM-dd") : ""
            }
            onChange={(e) =>
              handleStageChange(
                stageKey,
                "endDate",
                e.target.value ? new Date(e.target.value) : undefined
              )
            }
          />
        </div>
      </div>

      {/* Rich Text Editor for Observations */}
      {renderRichEditor(stageKey)}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Feedback Visual do Autosave */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveState.status === "saving" && (
          <Badge variant="secondary" className="animate-pulse">
            Salvando...
          </Badge>
        )}
        {saveState.status === "success" && (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            {saveState.message}
          </Badge>
        )}
        {saveState.status === "error" && (
          <Badge variant="destructive">{saveState.message}</Badge>
        )}
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* 1. Infraestrutura */}
        <AccordionItem value="infra" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                1. Análise de Infraestrutura
              </span>
              <Badge
                variant={
                  data.stages.infra.status === "done" ? "default" : "secondary"
                }
                className={cn(
                  data.stages.infra.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.infra.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  data.stages.infra.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {data.stages.infra.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("infra", data.stages.infra)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Status Estações</Label>
                <Select
                  value={data.stages.infra.workstationsStatus}
                  onValueChange={(value) =>
                    handleStageChange("infra", "workstationsStatus", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequado">Adequado</SelectItem>
                    <SelectItem value="Parcialmente Adequado">Parcialmente Adequado</SelectItem>
                    <SelectItem value="Inadequado">Inadequado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status Servidor</Label>
                <Select
                  value={data.stages.infra.serverStatus}
                  onValueChange={(value) =>
                    handleStageChange("infra", "serverStatus", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequado">Adequado</SelectItem>
                    <SelectItem value="Parcialmente Adequado">Parcialmente Adequado</SelectItem>
                    <SelectItem value="Inadequado">Inadequado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qtd. de Estações</Label>
                <Input
                  type="number"
                  value={data.stages.infra.workstationsCount || ""}
                  onChange={(e) =>
                    handleStageChange("infra", "workstationsCount", parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Aderência */}
        <AccordionItem value="adherence" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                2. Análise de Aderência
              </span>
              <Badge
                variant={
                  data.stages.adherence.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  data.stages.adherence.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.adherence.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  data.stages.adherence.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {data.stages.adherence.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("adherence", data.stages.adherence)}
            <div className="border-t pt-4 space-y-4 bg-muted/20 p-4 rounded-md">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-gap"
                  checked={data.stages.adherence.hasProductGap || false}
                  onCheckedChange={(checked) =>
                    handleStageChange("adherence", "hasProductGap", checked)
                  }
                />
                <Label htmlFor="has-gap">Existe Gap de Produto?</Label>
              </div>
              {data.stages.adherence.hasProductGap && (
                <div className="bg-background p-4 rounded-md space-y-4 border">
                  <div className="space-y-2">
                    <Label>Descrição do Gap</Label>
                    <Textarea
                      value={data.stages.adherence.gapDescription || ""}
                      onChange={(e) =>
                        handleStageChange(
                          "adherence",
                          "gapDescription",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Ambiente */}
        <AccordionItem value="environment" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                3. Preparação de Ambiente
              </span>
              <Badge
                variant={
                  data.stages.environment.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  data.stages.environment.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.environment.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  data.stages.environment.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {data.stages.environment.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("environment", data.stages.environment)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Sistema Operacional</Label>
                <Input
                  value={data.stages.environment.osVersion || ""}
                  onChange={(e) =>
                    handleStageChange(
                      "environment",
                      "osVersion",
                      e.target.value
                    )
                  }
                  placeholder="Ex: Windows Server 2022"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Conversão */}
        <AccordionItem value="conversion" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                4. Conversão de Dados
              </span>
              <Badge
                variant={
                  data.stages.conversion.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  data.stages.conversion.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.conversion.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  data.stages.conversion.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {data.stages.conversion.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("conversion", data.stages.conversion)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Sistema de Origem</Label>
                <Input
                  value={data.stages.conversion.sourceSystem || ""}
                  onChange={(e) =>
                    handleStageChange(
                      "conversion",
                      "sourceSystem",
                      e.target.value
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Qtd Registros</Label>
                <Input
                  type="number"
                  value={data.stages.conversion.recordCount || ""}
                  onChange={(e) =>
                    handleStageChange(
                      "conversion",
                      "recordCount",
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox
                  id="homologation-complete"
                  checked={data.stages.conversion.homologationComplete || false}
                  onCheckedChange={(checked) =>
                    handleStageChange(
                      "conversion",
                      "homologationComplete",
                      checked
                    )
                  }
                />
                <Label htmlFor="homologation-complete">
                  Homologação Concluída?
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Implantação */}
        <AccordionItem
          value="implementation"
          className="border rounded-lg px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                5. Implantação & Treinamento
              </span>
              <Badge
                variant={
                  data.stages.implementation.status === "done"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  data.stages.implementation.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.implementation.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  data.stages.implementation.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {data.stages.implementation.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("implementation", data.stages.implementation)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Tipo de Virada</Label>
                <Select
                  value={data.stages.implementation.switchType}
                  onValueChange={(value) =>
                    handleStageChange("implementation", "switchType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekend">Fim de Semana</SelectItem>
                    <SelectItem value="business_day">Dia Útil</SelectItem>
                    <SelectItem value="holiday">Feriado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo Treinamento</Label>
                <Select
                  value={data.stages.implementation.trainingType}
                  onValueChange={(value) =>
                    handleStageChange("implementation", "trainingType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remoto</SelectItem>
                    <SelectItem value="onsite">Presencial</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Pós-Implantação */}
        <AccordionItem value="post" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">6. Pós-Implantação</span>
              <Badge
                variant={
                  data.stages.post.status === "done" ? "default" : "secondary"
                }
                className={cn(
                  data.stages.post.status === "done" &&
                    "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.post.status === "in-progress" &&
                    "bg-blue-500 hover:bg-blue-600",
                  data.stages.post.status === "blocked" &&
                    "bg-amber-500 hover:bg-amber-600"
                )}
              >
                {data.stages.post.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields("post", data.stages.post)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
              <div className="space-y-2">
                <Label>Satisfação do Cliente</Label>
                <Select
                  value={data.stages.post.clientSatisfaction}
                  onValueChange={(value) =>
                    handleStageChange("post", "clientSatisfaction", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_satisfied">
                      Muito Satisfeito
                    </SelectItem>
                    <SelectItem value="satisfied">Satisfeito</SelectItem>
                    <SelectItem value="neutral">Neutro</SelectItem>
                    <SelectItem value="dissatisfied">Insatisfeito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="followup-needed"
                  checked={data.stages.post.followupNeeded || false}
                  onCheckedChange={(checked) =>
                    handleStageChange("post", "followupNeeded", checked)
                  }
                />
                <Label htmlFor="followup-needed">Follow-up Necessário?</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
