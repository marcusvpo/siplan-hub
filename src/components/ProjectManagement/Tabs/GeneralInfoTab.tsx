import { ProjectV2, ContentBlock } from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Clock, 
  User, 
  CheckCircle2, 
  FileText, 
  GripVertical, 
  Trash2, 
  Type, 
  CheckSquare,
  Server,
  Database,
  RefreshCw,
  Rocket,
  Power,
  Check
} from "lucide-react";
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

  const stages = [
    { id: 'infra', label: 'Infraestrutura', status: data.stages.infra.status, icon: Server },
    { id: 'adherence', label: 'Aderência', status: data.stages.adherence.status, icon: CheckCircle2 },
    { id: 'environment', label: 'Ambiente', status: data.stages.environment.status, icon: Database },
    { id: 'conversion', label: 'Conversão', status: data.stages.conversion.status, icon: RefreshCw },
    { id: 'implementation', label: 'Implantação', status: data.stages.implementation.status, icon: Rocket },
    { id: 'post', label: 'Pós-Implantação', status: data.stages.post.status, icon: Power },
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
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Feedback Visual do Autosave */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveState.status === 'saving' && <Badge variant="secondary" className="animate-pulse">Salvando...</Badge>}
        {saveState.status === 'success' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{saveState.message}</Badge>}
        {saveState.status === 'error' && <Badge variant="destructive">{saveState.message}</Badge>}
      </div>

      {/* 1. Pipeline Visual Moderno */}
      <div className="w-full py-10 px-4 bg-card rounded-xl border shadow-sm relative overflow-hidden">
         <div className="flex items-center justify-between relative z-10 max-w-5xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 -z-10" />
            
            {/* Active Progress Line */}
            <div 
              className="absolute top-8 left-0 h-1 bg-emerald-500 -z-10 transition-all duration-1000 ease-in-out" 
              style={{ 
                width: `${Math.min(
                  100, 
                  Math.max(
                    0, 
                    (stages.reduce((acc, stage, index) => {
                      if (stage.status === 'done') return Math.max(acc, index + 1);
                      if (stage.status === 'in-progress') return Math.max(acc, index);
                      return acc;
                    }, 0) / (stages.length - 1)) * 100
                  )
                )}%` 
              }} 
            />

            {stages.map((stage) => {
              const Icon = stage.icon;
              const isDone = stage.status === 'done';
              const isActive = stage.status === 'in-progress';
              
              return (
                <div key={stage.id} className="flex flex-col items-center gap-4 group cursor-pointer">
                   <div className={cn(
                     "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 border-4",
                     isDone ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" :
                     isActive ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200 scale-110" :
                     "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                   )}>
                      {isDone ? <Check className="h-8 w-8" /> : <Icon className="h-7 w-7" />}
                   </div>
                   <div className="text-center space-y-1">
                      <p className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        isActive ? "text-blue-600 dark:text-blue-400" : 
                        isDone ? "text-emerald-600 dark:text-emerald-400" : 
                        "text-muted-foreground"
                      )}>
                        {stage.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">
                        {stage.status === 'todo' ? 'Pendente' : 
                         stage.status === 'in-progress' ? 'Em Progresso' : 
                         stage.status === 'done' ? 'Concluído' : stage.status}
                      </p>
                   </div>
                </div>
              );
            })}
         </div>
      </div>

      {/* 2. Dados do Projeto (Layout 3 Colunas) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
           <FileText className="h-5 w-5 text-muted-foreground" />
           <h3 className="text-lg font-semibold text-muted-foreground">Dados do Projeto</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           {/* Coluna 1: Campos de Input (5 cols) */}
           <div className="lg:col-span-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 {/* Sistema */}
                 <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sistema</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{data.systemType}</p>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100 h-5 px-1.5">new</Badge>
                    </div>
                 </div>
                 {/* Chamado */}
                 <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Chamado</p>
                    <p className="font-bold font-mono">{data.ticketNumber}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {/* Líder */}
                 <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Líder</p>
                    <div className="flex items-center gap-2">
                       <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                          <User className="h-4 w-4 text-slate-500" />
                       </div>
                       <p className="font-bold text-sm truncate">{data.projectLeader}</p>
                    </div>
                 </div>
                 {/* Horas */}
                 <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Horas</p>
                    <p className="font-bold">{data.soldHours || 0}h</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {/* Legado */}
                 <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Legado</p>
                    <p className="font-bold">{data.legacySystem || '-'}</p>
                 </div>
                 {/* Próximo Follow-up */}
                 <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Próximo Follow-up</p>
                    <div className="flex items-center gap-2">
                       <Clock className="h-4 w-4 text-muted-foreground" />
                       <p className="font-bold">
                         {data.nextFollowUpDate ? format(new Date(new Date(data.nextFollowUpDate).getTime() + new Date().getTimezoneOffset() * 60000), "dd/MM", { locale: ptBR }) : '-'}
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Coluna 2: Status Card (4 cols) */}
           <div className="lg:col-span-4">
              <div className="h-full bg-blue-500 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                 
                 <Clock className="h-12 w-12 mb-4 text-blue-100" />
                 
                 <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100 mb-1">Status</p>
                 <h2 className="text-3xl font-black uppercase tracking-tight mb-6 text-center">
                    {data.globalStatus === 'in-progress' ? 'Em Andamento' : 
                     data.globalStatus === 'done' ? 'Concluído' : 
                     data.globalStatus === 'blocked' ? 'Bloqueado' : 'A Fazer'}
                 </h2>

                 <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Check className="h-6 w-6 text-white" />
                 </div>
              </div>
           </div>

           {/* Coluna 3: Updates (3 cols) */}
           <div className="lg:col-span-3">
              {/* Last Update */}
              <div className="h-full bg-rose-500 rounded-xl shadow-lg shadow-rose-200 dark:shadow-none p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
                 <div className="absolute top-0 left-0 p-32 bg-white/10 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none" />
                 
                 <Clock className="h-12 w-12 mb-4 text-rose-100" />

                 <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-100 mb-1">Última Atualização</p>
                 <h2 className="text-2xl font-black uppercase tracking-tight mb-2 text-center">
                   {format(new Date(data.lastUpdatedAt), "dd MMM", { locale: ptBR })}
                 </h2>
                 <p className="text-lg font-medium text-rose-100">
                   {format(new Date(data.lastUpdatedAt), "HH:mm")}
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* 3. Observações Gerais (Rich Editor) */}
      <div className="space-y-4 pt-4">
         <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">Observações Gerais</h3>
         </div>

         <div className="bg-white dark:bg-card rounded-xl border shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="border-b bg-muted/30 p-2 flex items-center gap-2">
                <div className="flex items-center bg-background rounded-md border shadow-sm p-0.5">
                    <Button variant="ghost" size="sm" className="h-8 px-3 gap-2 text-xs font-medium" onClick={() => addBlock('heading')}>
                    <Type className="h-4 w-4" /> Título
                    </Button>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <Button variant="ghost" size="sm" className="h-8 px-3 gap-2 text-xs font-medium" onClick={() => addBlock('paragraph')}>
                    <Type className="h-4 w-4" /> Texto
                    </Button>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <Button variant="ghost" size="sm" className="h-8 px-3 gap-2 text-xs font-medium" onClick={() => addBlock('checkbox')}>
                    <CheckSquare className="h-4 w-4" /> Checklist
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[300px] p-6 space-y-2">
                {blocks.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border-2 border-dashed rounded-lg opacity-50 mx-auto max-w-lg mt-10">
                      <FileText className="h-10 w-10" />
                      <p className="font-medium">Nenhuma observação registrada</p>
                      <p className="text-sm text-center">Utilize a barra de ferramentas acima para adicionar conteúdo</p>
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
    </div>
  );
}
