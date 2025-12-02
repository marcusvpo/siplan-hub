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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}



export function GeneralInfoTab({ project, onUpdate }: TabProps) {
  const { data: notesData, updateData: updateNotes, saveState } = useAutoSave(
    project.notes || {
      id: crypto.randomUUID(),
      projectId: project.id,
      blocks: [],
      lastEditedBy: 'Sistema',
      lastEditedAt: new Date()
    },
    async (newNotes) => {
      onUpdate({ ...project, notes: newNotes });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  );

  const stages = [
    { id: 'infra', label: 'Infraestrutura', status: project.stages.infra.status, icon: Server },
    { id: 'adherence', label: 'Aderência', status: project.stages.adherence.status, icon: CheckCircle2 },
    { id: 'environment', label: 'Ambiente', status: project.stages.environment.status, icon: Database },
    { id: 'conversion', label: 'Conversão', status: project.stages.conversion.status, icon: RefreshCw },
    { id: 'implementation', label: 'Implantação', status: project.stages.implementation.status, icon: Rocket },
    { id: 'post', label: 'Pós-Implantação', status: project.stages.post.status, icon: Power },
  ];

  // Local state for editor content to ensure persistence while typing and after save
  const [editorContent, setEditorContent] = useState<string | object>(() => {
    const blocks = project.notes?.blocks || [];
    
    if (blocks.length === 0) return "";
    
    // If single block with JSON content, return it
    if (blocks.length === 1 && blocks[0].type === 'paragraph') {
      try {
        // If content is empty string, return empty string to let editor initialize empty
        if (!blocks[0].content) return "";

        const parsed = JSON.parse(blocks[0].content);
        if (parsed.type === 'doc' || parsed.root) return parsed;
      } catch {
        // Not JSON, treat as text
        return ""; 
      }
    }

    // If we have legacy blocks (Tiptap structure or simple blocks), we can't easily convert to Lexical state here without a complex transformer.
    // Returning empty string ensures the editor doesn't crash and starts fresh.
    // The user will lose legacy formatting but can re-enter data.
    return ""; 
  });

  const updateEditorContent = (content: string) => {
    // Update local state immediately
    setEditorContent(content);

    // Parse content to check if it's valid JSON
    let blocks: ContentBlock[] = [];
    try {
        const parsed = JSON.parse(content);
        // If it's a Lexical state (has root), we store it as a single block with JSON content for now
        blocks = [{
            id: crypto.randomUUID(),
            type: 'paragraph',
            content: content,
            checked: false
        }];
    } catch {
        // If not JSON, it's plain text
        blocks = [{
            id: crypto.randomUUID(),
            type: 'paragraph',
            content: content,
            checked: false
        }];
    }

    const newNotes = {
      ...notesData,
      id: notesData?.id || crypto.randomUUID(),
      projectId: project.id,
      blocks: blocks,
      lastEditedBy: 'User', 
      lastEditedAt: new Date(),
    };
    
    // Trigger autosave
    updateNotes(newNotes);
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
      <div className="w-full py-12 px-6 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-sm relative overflow-hidden mb-8">
         <div className="flex items-center justify-between relative z-10 max-w-5xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute top-10 left-0 right-0 h-1.5 bg-muted -z-10 rounded-full" />
            
            {/* Active Progress Line */}
            <div 
              className="absolute top-10 left-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400 -z-10 transition-all duration-1000 ease-in-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
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
                <div key={stage.id} className="flex flex-col items-center gap-5 group cursor-pointer relative">
                   <div className={cn(
                     "h-20 w-20 rounded-2xl rotate-3 flex items-center justify-center transition-all duration-500 border-4 shadow-xl",
                     isDone ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-emerald-500/30 rotate-0" :
                     isActive ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 text-white shadow-blue-500/30 scale-110 -rotate-3 ring-4 ring-blue-500/20" :
                     "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                   )}>
                      {isDone ? <Check className="h-9 w-9" /> : <Icon className="h-8 w-8" />}
                   </div>
                   <div className="text-center space-y-1.5 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-transparent group-hover:border-border/50 transition-colors">
                      <p className={cn(
                        "text-xs font-bold uppercase tracking-widest",
                        isActive ? "text-blue-600 dark:text-blue-400" : 
                        isDone ? "text-emerald-600 dark:text-emerald-400" : 
                        "text-muted-foreground"
                      )}>
                        {stage.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase opacity-80">
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
             <FileText className="h-4 w-4" />
           </div>
           <h3 className="text-xl font-bold text-foreground tracking-tight">Dados do Projeto</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           {/* Coluna 1: Campos de Input (5 cols) */}
           <div className="lg:col-span-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 {/* Sistema */}
                 <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Sistema</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">{project.systemType}</p>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 h-5 px-1.5">new</Badge>
                    </div>
                 </div>
                 {/* Chamado */}
                 <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Chamado</p>
                    <p className="font-bold font-mono text-lg text-foreground/80">#{project.ticketNumber}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {/* Líder */}
                 <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Líder</p>
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden shadow-inner">
                          <User className="h-4 w-4 text-slate-600" />
                       </div>
                       <p className="font-bold text-sm truncate">{project.projectLeader}</p>
                    </div>
                 </div>
                 {/* Horas */}
                 <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Horas</p>
                    <p className="font-bold text-lg">{project.soldHours || 0}<span className="text-sm text-muted-foreground font-normal ml-1">h</span></p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {/* Legado */}
                 <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Legado</p>
                    <p className="font-bold text-lg">{project.legacySystem || '-'}</p>
                 </div>
                 {/* Próximo Follow-up */}
                 <div className="bg-card hover:bg-accent/50 transition-colors rounded-xl border shadow-sm p-5 space-y-2 group">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Próximo Follow-up</p>
                    <div className="flex items-center gap-2">
                       <Clock className="h-4 w-4 text-muted-foreground" />
                       <p className="font-bold text-lg">
                         {project.nextFollowUpDate ? format(new Date(project.nextFollowUpDate).toISOString().split('T')[0], "dd/MM", { locale: ptBR }) : '-'}
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Coluna 2: Status Card (4 cols) */}
           <div className="lg:col-span-4">
              <div className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-900/20 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-colors duration-500" />
                 
                 <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md shadow-inner">
                    <Clock className="h-8 w-8 text-blue-100" />
                 </div>
                 
                 <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100 mb-2">Status Atual</p>
                 <h2 className="text-3xl font-black uppercase tracking-tight mb-8 text-center leading-tight">
                    {project.globalStatus === 'in-progress' ? 'Em Andamento' : 
                     project.globalStatus === 'done' ? 'Concluído' : 
                     project.globalStatus === 'blocked' ? 'Bloqueado' : 'A Fazer'}
                 </h2>

                 <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                    <Check className="h-7 w-7 text-white" />
                 </div>
              </div>
           </div>

           {/* Coluna 3: Updates (3 cols) */}
           <div className="lg:col-span-3">
              {/* Last Update */}
              <div className="h-full bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-xl shadow-rose-900/20 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden group">
                 <div className="absolute top-0 left-0 p-32 bg-white/10 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-colors duration-500" />
                 
                 <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md shadow-inner">
                    <Clock className="h-8 w-8 text-rose-100" />
                 </div>

                 <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-100 mb-2">Última Atualização</p>
                 <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 text-center">
                   {format(new Date(project.lastUpdatedAt), "dd MMM", { locale: ptBR })}
                 </h2>
                 <p className="text-xl font-medium text-rose-100/90 bg-black/10 px-4 py-1 rounded-full">
                   {format(new Date(project.lastUpdatedAt), "HH:mm")}
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
            {/* Content Area */}
            <div className="p-4">
                <RichTextEditor 
                  content={editorContent} 
                  onChange={updateEditorContent} 
                  placeholder="Digite suas observações gerais aqui..."
                />
            </div>
         </div>
      </div>
    </div>
  );
}




