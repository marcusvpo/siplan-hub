import { ProjectV2, ContentBlock, InfraStageV2, AdherenceStageV2, EnvironmentStageV2, ConversionStageV2, ImplementationStageV2, PostStageV2 } from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Trash2, Type, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

type AnyStage = InfraStageV2 | AdherenceStageV2 | EnvironmentStageV2 | ConversionStageV2 | ImplementationStageV2 | PostStageV2;

export function StepsTab({ project, onUpdate }: TabProps) {
  const { data, handleChange, saveState } = useAutoSave(project, async (newData) => {
    onUpdate(newData);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const handleStageChange = (stageKey: keyof ProjectV2['stages'], field: string, value: unknown) => {
    const currentStages = { ...data.stages };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentStage: any = { ...currentStages[stageKey] };
    currentStage[field] = value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (currentStages as any)[stageKey] = currentStage;
    handleChange('stages', currentStages);
  };

  // Rich Text Logic for Stages
  const getStageBlocks = (stage: AnyStage): ContentBlock[] => {
    if (typeof stage.observations === 'string') {
        // Migration/Fallback: convert string to block
        return stage.observations ? [{ id: crypto.randomUUID(), type: 'paragraph', content: stage.observations }] : [];
    }
    // Assuming observations can be stored as ContentBlock[] or we use a separate field.
    // Since the type definition says observations: string, we need to handle this.
    // Ideally, we should update the Type. But for now, let's store the JSON string in observations field if possible,
    // OR we just use a local state hack. 
    // BUT, the prompt asked to "add this model".
    // Let's assume we can store JSON string in the 'observations' field which is a string.
    try {
        const parsed = JSON.parse(stage.observations);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch {
        return stage.observations ? [{ id: crypto.randomUUID(), type: 'paragraph', content: stage.observations }] : [];
    }
  };

  const updateStageBlocks = (stageKey: keyof ProjectV2['stages'], blocks: ContentBlock[]) => {
      handleStageChange(stageKey, 'observations', JSON.stringify(blocks));
  };

  const addBlock = (stageKey: keyof ProjectV2['stages'], type: ContentBlock['type'], index: number) => {
    const currentBlocks = getStageBlocks(data.stages[stageKey]);
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
    };
    const newBlocks = [...currentBlocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateStageBlocks(stageKey, newBlocks);
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (stageKey: keyof ProjectV2['stages'], blockId: string, content: string) => {
    const currentBlocks = getStageBlocks(data.stages[stageKey]);
    const newBlocks = currentBlocks.map(block => 
      block.id === blockId ? { ...block, content } : block
    );
    updateStageBlocks(stageKey, newBlocks);
  };

  const deleteBlock = (stageKey: keyof ProjectV2['stages'], blockId: string) => {
    const currentBlocks = getStageBlocks(data.stages[stageKey]);
    const newBlocks = currentBlocks.filter(block => block.id !== blockId);
    updateStageBlocks(stageKey, newBlocks);
  };

  const renderBlock = (stageKey: keyof ProjectV2['stages'], block: ContentBlock) => {
    return (
      <div 
        key={block.id} 
        className={cn(
          "group flex items-start gap-2 py-1 px-2 rounded-md hover:bg-muted/30 transition-colors",
          activeBlockId === block.id ? "bg-muted/50" : ""
        )}
        onClick={() => setActiveBlockId(block.id)}
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1.5">
           <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab">
             <GripVertical className="h-3 w-3 text-muted-foreground" />
           </Button>
           <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteBlock(stageKey, block.id)}>
             <Trash2 className="h-3 w-3" />
           </Button>
        </div>

        <div className="flex-1">
          {block.type === 'heading' && (
            <Input 
              className="text-lg font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-1 bg-transparent"
              placeholder="Título..."
              value={block.content}
              onChange={(e) => updateBlock(stageKey, block.id, e.target.value)}
              autoFocus={activeBlockId === block.id}
            />
          )}
          {block.type === 'paragraph' && (
            <Textarea 
              className="min-h-[24px] resize-none border-none shadow-none focus-visible:ring-0 px-0 py-1 overflow-hidden bg-transparent"
              placeholder="Digite algo..."
              value={block.content}
              onChange={(e) => {
                updateBlock(stageKey, block.id, e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              autoFocus={activeBlockId === block.id}
            />
          )}
          {block.type === 'checkbox' && (
            <div className="flex items-center gap-2">
              <Checkbox id={block.id} />
              <Input 
                className="border-none shadow-none focus-visible:ring-0 px-0 h-auto py-1 bg-transparent"
                placeholder="Item da lista..."
                value={block.content}
                onChange={(e) => updateBlock(stageKey, block.id, e.target.value)}
                autoFocus={activeBlockId === block.id}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRichEditor = (stageKey: keyof ProjectV2['stages']) => {
      const blocks = getStageBlocks(data.stages[stageKey]);
      return (
          <div className="border rounded-md p-4 bg-card">
              <div className="flex items-center gap-2 mb-4 border-b pb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase">Observações & Checklist</span>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => addBlock(stageKey, 'heading', -1)} title="Adicionar Título">
                  <Type className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => addBlock(stageKey, 'paragraph', -1)} title="Adicionar Texto">
                  <Type className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => addBlock(stageKey, 'checkbox', -1)} title="Adicionar Checklist">
                  <CheckSquare className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-1 min-h-[100px]">
                {blocks.length === 0 && (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    Nenhuma observação. Clique nos ícones acima para adicionar.
                  </div>
                )}
                {blocks.map((block) => renderBlock(stageKey, block))}
              </div>
          </div>
      );
  };

  const renderCommonFields = (stageKey: keyof ProjectV2['stages'], stage: AnyStage) => (
    <div className="space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                value={stage.status} 
                onValueChange={(value) => handleStageChange(stageKey, 'status', value)}
                >
                <SelectTrigger className={cn(
                    stage.status === 'done' && "bg-emerald-100 text-emerald-800 border-emerald-200",
                    stage.status === 'in-progress' && "bg-blue-100 text-blue-800 border-blue-200",
                    stage.status === 'blocked' && "bg-amber-100 text-amber-800 border-amber-200",
                )}>
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
                <Input 
                value={stage.responsible} 
                onChange={(e) => handleStageChange(stageKey, 'responsible', e.target.value)} 
                />
            </div>
            <div className="space-y-2">
                <Label>Início</Label>
                <Input 
                type="date" 
                value={stage.startDate ? format(new Date(stage.startDate), 'yyyy-MM-dd') : ''} 
                onChange={(e) => handleStageChange(stageKey, 'startDate', e.target.value ? new Date(e.target.value) : undefined)} 
                />
            </div>
            <div className="space-y-2">
                <Label>Término</Label>
                <Input 
                type="date" 
                value={stage.endDate ? format(new Date(stage.endDate), 'yyyy-MM-dd') : ''} 
                onChange={(e) => handleStageChange(stageKey, 'endDate', e.target.value ? new Date(e.target.value) : undefined)} 
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
        {saveState.status === 'saving' && <Badge variant="secondary" className="animate-pulse">Salvando...</Badge>}
        {saveState.status === 'success' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{saveState.message}</Badge>}
        {saveState.status === 'error' && <Badge variant="destructive">{saveState.message}</Badge>}
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        
        {/* 1. Infraestrutura */}
        <AccordionItem value="infra" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">1. Análise de Infraestrutura</span>
              <Badge variant={data.stages.infra.status === 'done' ? 'default' : 'secondary'} className={cn(
                  data.stages.infra.status === 'done' && "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.infra.status === 'in-progress' && "bg-blue-500 hover:bg-blue-600",
                  data.stages.infra.status === 'blocked' && "bg-amber-500 hover:bg-amber-600",
              )}>
                {data.stages.infra.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields('infra', data.stages.infra)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
               <div className="space-y-2">
                  <Label>Servidor Atual</Label>
                  <Input 
                    value={data.stages.infra.serverInUse || ''} 
                    onChange={(e) => handleStageChange('infra', 'serverInUse', e.target.value)} 
                  />
               </div>
               <div className="space-y-2">
                  <Label>Servidor Necessário</Label>
                  <Input 
                    value={data.stages.infra.serverNeeded || ''} 
                    onChange={(e) => handleStageChange('infra', 'serverNeeded', e.target.value)} 
                  />
               </div>
               <div className="flex items-center space-x-2 pt-4">
                  <Checkbox 
                    id="infra-approved" 
                    checked={data.stages.infra.approvedByInfra || false}
                    onCheckedChange={(checked) => handleStageChange('infra', 'approvedByInfra', checked)}
                  />
                  <Label htmlFor="infra-approved">Infraestrutura Aprovada?</Label>
               </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Aderência */}
        <AccordionItem value="adherence" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">2. Análise de Aderência</span>
              <Badge variant={data.stages.adherence.status === 'done' ? 'default' : 'secondary'} className={cn(
                  data.stages.adherence.status === 'done' && "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.adherence.status === 'in-progress' && "bg-blue-500 hover:bg-blue-600",
                  data.stages.adherence.status === 'blocked' && "bg-amber-500 hover:bg-amber-600",
              )}>
                {data.stages.adherence.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields('adherence', data.stages.adherence)}
            <div className="border-t pt-4 space-y-4 bg-muted/20 p-4 rounded-md">
               <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="has-gap" 
                    checked={data.stages.adherence.hasProductGap || false}
                    onCheckedChange={(checked) => handleStageChange('adherence', 'hasProductGap', checked)}
                  />
                  <Label htmlFor="has-gap">Existe Gap de Produto?</Label>
               </div>
               {data.stages.adherence.hasProductGap && (
                 <div className="bg-background p-4 rounded-md space-y-4 border">
                    <div className="space-y-2">
                      <Label>Descrição do Gap</Label>
                      <Textarea 
                        value={data.stages.adherence.gapDescription || ''}
                        onChange={(e) => handleStageChange('adherence', 'gapDescription', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ticket Dev</Label>
                        <Input 
                          value={data.stages.adherence.devTicket || ''}
                          onChange={(e) => handleStageChange('adherence', 'devTicket', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridade</Label>
                        <Select 
                          value={data.stages.adherence.gapPriority} 
                          onValueChange={(value) => handleStageChange('adherence', 'gapPriority', value)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Crítico</SelectItem>
                            <SelectItem value="high">Alto</SelectItem>
                            <SelectItem value="medium">Médio</SelectItem>
                            <SelectItem value="low">Baixo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
              <span className="font-semibold text-lg">3. Preparação de Ambiente</span>
              <Badge variant={data.stages.environment.status === 'done' ? 'default' : 'secondary'} className={cn(
                  data.stages.environment.status === 'done' && "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.environment.status === 'in-progress' && "bg-blue-500 hover:bg-blue-600",
                  data.stages.environment.status === 'blocked' && "bg-amber-500 hover:bg-amber-600",
              )}>
                {data.stages.environment.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields('environment', data.stages.environment)}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
               <div className="space-y-2">
                  <Label>Sistema Operacional</Label>
                  <Input 
                    value={data.stages.environment.osVersion || ''} 
                    onChange={(e) => handleStageChange('environment', 'osVersion', e.target.value)} 
                    placeholder="Ex: Windows Server 2022"
                  />
               </div>
               <div className="flex items-center space-x-2 pt-8">
                  <Checkbox 
                    id="test-available" 
                    checked={data.stages.environment.testAvailable || false}
                    onCheckedChange={(checked) => handleStageChange('environment', 'testAvailable', checked)}
                  />
                  <Label htmlFor="test-available">Ambiente de Teste Disponível?</Label>
               </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Conversão */}
        <AccordionItem value="conversion" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">4. Conversão de Dados</span>
              <Badge variant={data.stages.conversion.status === 'done' ? 'default' : 'secondary'} className={cn(
                  data.stages.conversion.status === 'done' && "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.conversion.status === 'in-progress' && "bg-blue-500 hover:bg-blue-600",
                  data.stages.conversion.status === 'blocked' && "bg-amber-500 hover:bg-amber-600",
              )}>
                {data.stages.conversion.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields('conversion', data.stages.conversion)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
               <div className="space-y-2">
                  <Label>Sistema de Origem</Label>
                  <Input 
                    value={data.stages.conversion.sourceSystem || ''} 
                    onChange={(e) => handleStageChange('conversion', 'sourceSystem', e.target.value)} 
                  />
               </div>
               <div className="space-y-2">
                  <Label>Qtd Registros</Label>
                  <Input 
                    type="number"
                    value={data.stages.conversion.recordCount || ''} 
                    onChange={(e) => handleStageChange('conversion', 'recordCount', parseInt(e.target.value))} 
                  />
               </div>
               <div className="flex items-center space-x-2 pt-4">
                  <Checkbox 
                    id="homologation-complete" 
                    checked={data.stages.conversion.homologationComplete || false}
                    onCheckedChange={(checked) => handleStageChange('conversion', 'homologationComplete', checked)}
                  />
                  <Label htmlFor="homologation-complete">Homologação Concluída?</Label>
               </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Implantação */}
        <AccordionItem value="implementation" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">5. Implantação & Treinamento</span>
              <Badge variant={data.stages.implementation.status === 'done' ? 'default' : 'secondary'} className={cn(
                  data.stages.implementation.status === 'done' && "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.implementation.status === 'in-progress' && "bg-blue-500 hover:bg-blue-600",
                  data.stages.implementation.status === 'blocked' && "bg-amber-500 hover:bg-amber-600",
              )}>
                {data.stages.implementation.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields('implementation', data.stages.implementation)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
               <div className="space-y-2">
                  <Label>Tipo de Virada</Label>
                  <Select 
                    value={data.stages.implementation.switchType} 
                    onValueChange={(value) => handleStageChange('implementation', 'switchType', value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onValueChange={(value) => handleStageChange('implementation', 'trainingType', value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Badge variant={data.stages.post.status === 'done' ? 'default' : 'secondary'} className={cn(
                  data.stages.post.status === 'done' && "bg-emerald-500 hover:bg-emerald-600",
                  data.stages.post.status === 'in-progress' && "bg-blue-500 hover:bg-blue-600",
                  data.stages.post.status === 'blocked' && "bg-amber-500 hover:bg-amber-600",
              )}>
                {data.stages.post.status}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {renderCommonFields('post', data.stages.post)}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-muted/20 p-4 rounded-md">
               <div className="space-y-2">
                  <Label>Satisfação do Cliente</Label>
                  <Select 
                    value={data.stages.post.clientSatisfaction} 
                    onValueChange={(value) => handleStageChange('post', 'clientSatisfaction', value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very_satisfied">Muito Satisfeito</SelectItem>
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
                    onCheckedChange={(checked) => handleStageChange('post', 'followupNeeded', checked)}
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
