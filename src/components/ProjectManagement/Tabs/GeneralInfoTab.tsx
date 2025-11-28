import { ProjectV2, ContentBlock } from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, User, CheckCircle2, AlertCircle, FileText, GripVertical, Trash2, Type, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

interface SortableBlockProps {
  block: ContentBlock;
  activeBlockId: string | null;
  setActiveBlockId: (id: string) => void;
  updateBlock: (blockId: string, content: string, checked?: boolean) => void;
  deleteBlock: (blockId: string) => void;
}

function SortableBlock({ block, activeBlockId, setActiveBlockId, updateBlock, deleteBlock }: SortableBlockProps) {
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
         <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
           <GripVertical className="h-4 w-4 text-muted-foreground" />
         </div>
      </div>

      <div className="flex-1 space-y-1">
        {block.type === 'heading' && (
          <Input 
            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-1 bg-transparent placeholder:text-muted-foreground/50"
            placeholder="Digite um título..."
            value={block.content}
            onChange={(e) => updateBlock(block.id, e.target.value)}
            autoFocus={isFocused}
          />
        )}
        {block.type === 'paragraph' && (
          <Textarea 
            className="min-h-[24px] resize-none border-none shadow-none focus-visible:ring-0 px-0 py-1 overflow-hidden bg-transparent leading-relaxed"
            placeholder="Digite suas observações..."
            value={block.content}
            onChange={(e) => {
              updateBlock(block.id, e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            autoFocus={isFocused}
          />
        )}
        {block.type === 'checkbox' && (
          <div className="flex items-center gap-3">
            <Checkbox 
              id={block.id} 
              className="h-5 w-5" 
              checked={block.checked || false}
              onCheckedChange={(checked) => updateBlock(block.id, block.content, checked as boolean)}
            />
            <Input 
              className={cn(
                "border-none shadow-none focus-visible:ring-0 px-0 h-auto py-1 bg-transparent flex-1 transition-all",
                block.checked ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""
              )}
              placeholder="Item da lista..."
              value={block.content}
              onChange={(e) => updateBlock(block.id, e.target.value, block.checked)}
              autoFocus={isFocused}
            />
          </div>
        )}
      </div>

      <div className={cn(
          "flex items-center mt-1.5 transition-opacity",
          isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
         <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-destructive hover:bg-destructive/10" 
          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
          title="Excluir bloco"
         >
           <Trash2 className="h-3.5 w-3.5" />
         </Button>
      </div>
    </div>
  );
}

export function GeneralInfoTab({ project, onUpdate }: TabProps) {
  const { data, handleChange, saveState } = useAutoSave(project, async (newData) => {
    onUpdate(newData);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getStageColor = (status: string) => {
    switch (status) {
      case "done": return "bg-emerald-500 ring-emerald-200";
      case "in-progress": return "bg-blue-500 ring-blue-200";
      case "blocked": return "bg-amber-500 ring-amber-200";
      default: return "bg-slate-200 ring-slate-100 dark:bg-slate-700 dark:ring-slate-800";
    }
  };

  const stages = [
    { id: 'infra', label: 'Infraestrutura', status: data.stages.infra.status },
    { id: 'adherence', label: 'Aderência', status: data.stages.adherence.status },
    { id: 'environment', label: 'Ambiente', status: data.stages.environment.status },
    { id: 'conversion', label: 'Conversão', status: data.stages.conversion.status },
    { id: 'implementation', label: 'Implantação', status: data.stages.implementation.status },
    { id: 'post', label: 'Pós-Implantação', status: data.stages.post.status },
  ];

  // Rich Text Logic
  const blocks = data.notes?.blocks || [];

  const updateBlocks = (newBlocks: ContentBlock[]) => {
    const newNotes = {
      ...data.notes,
      id: data.notes?.id || crypto.randomUUID(),
      projectId: data.id,
      blocks: newBlocks,
      lastEditedBy: 'User', // TODO: Get actual user
      lastEditedAt: new Date(),
    };
    handleChange('notes', newNotes);
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      checked: false
    };
    updateBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (blockId: string, content: string, checked?: boolean) => {
    const newBlocks = blocks.map(block => 
      block.id === blockId ? { ...block, content, checked: checked !== undefined ? checked : block.checked } : block
    );
    updateBlocks(newBlocks);
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId);
    updateBlocks(newBlocks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over.id);
      updateBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Feedback Visual do Autosave */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveState.status === 'saving' && <Badge variant="secondary" className="animate-pulse">Salvando...</Badge>}
        {saveState.status === 'success' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{saveState.message}</Badge>}
        {saveState.status === 'error' && <Badge variant="destructive">{saveState.message}</Badge>}
      </div>

      {/* 1. Pipeline Visual Detalhado */}
      <div className="w-full py-6 px-4 bg-card rounded-xl border shadow-sm relative overflow-hidden">
         <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
         <div className="flex items-center justify-between relative z-10">
            <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-slate-100 dark:bg-slate-800 -z-10 transform -translate-y-1/2" />
            {stages.map((stage) => (
              <div key={stage.id} className="flex flex-col items-center gap-3 bg-card px-4 z-10">
                 <div className={cn(
                   "h-8 w-8 rounded-full ring-4 shadow-sm flex items-center justify-center transition-all",
                   getStageColor(stage.status)
                 )}>
                    {stage.status === 'done' && <CheckCircle2 className="h-5 w-5 text-white" />}
                    {stage.status === 'blocked' && <AlertCircle className="h-5 w-5 text-white" />}
                 </div>
                 <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">{stage.label}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                      {stage.status === 'todo' ? 'A Fazer' : stage.status}
                    </p>
                 </div>
              </div>
            ))}
         </div>
      </div>

      {/* 2. Project Abstract (Document View) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Card 1: Cliente & Sistema */}
         <Card className="md:col-span-2 border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
               <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Dados do Projeto
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-2 gap-6">
               <div className="bg-card p-4 rounded-lg border shadow-sm space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Cliente</p>
                  <p className="text-2xl font-bold break-words leading-tight">{data.clientName}</p>
               </div>
               <div className="bg-card p-4 rounded-lg border shadow-sm space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Sistema / Tipo</p>
                  <p className="text-lg font-medium">
                    {data.systemType.replace('(new)', '').trim()} 
                    <span className="text-muted-foreground text-sm font-normal ml-1">({data.implantationType})</span>
                  </p>
               </div>
               <div className="bg-card p-4 rounded-lg border shadow-sm space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Chamado 0800</p>
                  <p className="font-mono text-base">{data.ticketNumber}</p>
               </div>
               <div className="bg-card p-4 rounded-lg border shadow-sm space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Líder do Projeto</p>
                  <div className="flex items-center gap-2">
                     <User className="h-4 w-4 text-muted-foreground" />
                     <p className="font-medium">{data.projectLeader}</p>
                  </div>
               </div>
               <div className="bg-card p-4 rounded-lg border shadow-sm space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Horas Vendidas</p>
                  <p className="font-medium">{data.soldHours || 0}h</p>
               </div>
               <div className="bg-card p-4 rounded-lg border shadow-sm space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Sistema Legado</p>
                  <p className="font-medium">{data.legacySystem || '-'}</p>
               </div>
            </CardContent>
         </Card>

         {/* Card 2: UAT & Status */}
         <div className="space-y-6">
            {/* UAT Indicator */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden group">
               <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-xs font-bold text-primary uppercase tracking-widest relative z-10">Última Atualização (UAT)</p>
               <div className="text-2xl font-black text-foreground relative z-10 capitalize">
                  {format(new Date(data.lastUpdatedAt), "dd 'de' MMMM", { locale: ptBR })}
               </div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium relative z-10">
                  <Clock className="h-4 w-4 text-primary animate-pulse" />
                  {format(new Date(data.lastUpdatedAt), "HH:mm")}
               </div>
            </div>

            {/* Status Indicator */}
            <div className={cn(
               "rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden border shadow-sm",
               data.globalStatus === 'done' ? "bg-emerald-50 border-emerald-200" :
               data.globalStatus === 'blocked' ? "bg-red-50 border-red-200" :
               data.globalStatus === 'in-progress' ? "bg-blue-50 border-blue-200" :
               "bg-slate-50 border-slate-200"
            )}>
               <p className={cn(
                  "text-xs font-bold uppercase tracking-widest relative z-10",
                  data.globalStatus === 'done' ? "text-emerald-700" :
                  data.globalStatus === 'blocked' ? "text-red-700" :
                  data.globalStatus === 'in-progress' ? "text-blue-700" :
                  "text-slate-700"
               )}>Status Atual</p>
               <div className={cn(
                  "text-2xl font-black relative z-10 uppercase",
                  data.globalStatus === 'done' ? "text-emerald-900" :
                  data.globalStatus === 'blocked' ? "text-red-900" :
                  data.globalStatus === 'in-progress' ? "text-blue-900" :
                  "text-slate-900"
               )}>
                  {data.globalStatus === 'todo' ? 'A Fazer' : 
                   data.globalStatus === 'in-progress' ? 'Em Andamento' :
                   data.globalStatus === 'done' ? 'Concluído' :
                   data.globalStatus === 'blocked' ? 'Bloqueado' : data.globalStatus}
               </div>
            </div>
         </div>
      </div>

      <Separator />

      {/* 3. Observações Gerais (Rich Editor) */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
               <FileText className="h-5 w-5 text-primary" />
               Observações Gerais
            </h3>
            <div className="flex items-center bg-background rounded-md border shadow-sm p-0.5">
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs font-medium" onClick={() => addBlock('heading')}>
                <Type className="h-3.5 w-3.5" /> Título
                </Button>
                <div className="w-px h-4 bg-border mx-0.5" />
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs font-medium" onClick={() => addBlock('paragraph')}>
                <Type className="h-3.5 w-3.5" /> Texto
                </Button>
                <div className="w-px h-4 bg-border mx-0.5" />
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-xs font-medium" onClick={() => addBlock('checkbox')}>
                <CheckSquare className="h-3.5 w-3.5" /> Checklist
                </Button>
            </div>
         </div>

         <div className="min-h-[300px] bg-card rounded-xl border shadow-sm p-6 space-y-2">
            {blocks.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border-2 border-dashed rounded-lg opacity-50">
                  <FileText className="h-10 w-10" />
                  <p className="font-medium">Nenhuma observação registrada</p>
                  <p className="text-sm">Utilize a barra de ferramentas acima para adicionar conteúdo</p>
               </div>
            )}
            
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block) => (
                  <SortableBlock 
                    key={block.id} 
                    block={block} 
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
    </div>
  );
}
