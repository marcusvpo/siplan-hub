import { LucideIcon, Check, ChevronDown } from "lucide-react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StageStatus } from "@/types/ProjectV2";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { format } from "date-fns";
import { convertBlocksToTiptap } from "@/lib/editor-utils";

interface StageCardProps {
  id: string;
  label: string;
  icon?: LucideIcon;
  status: StageStatus;
  responsible: string;
  startDate?: Date;
  endDate?: Date;
  observations?: string;
  onUpdate: (updates: Record<string, unknown>) => void;
  children?: React.ReactNode;
  isExpanded?: boolean;
}

export function StageCard({
  id,
  label,
  icon: Icon,
  status,
  responsible,
  startDate,
  endDate,
  observations,
  onUpdate,
  children
}: StageCardProps) {
  
  const getStatusColor = (s: StageStatus) => {
    switch (s) {
      case 'done': return "bg-emerald-500 hover:bg-emerald-600";
      case 'in-progress': return "bg-blue-500 hover:bg-blue-600";
      case 'blocked': return "bg-amber-500 hover:bg-amber-600";
      case 'waiting_adjustment': return "bg-orange-500 hover:bg-orange-600";
      default: return "bg-secondary hover:bg-secondary/80";
    }
  };

  const statusOptions = id === 'adherence' || id === 'conversion' ? [
    { value: 'todo', label: 'Não Iniciado' },
    { value: 'in-progress', label: id === 'adherence' ? 'Em Análise' : 'Em Andamento' },
    { value: 'done', label: id === 'adherence' ? 'Adequado' : 'Finalizado' },
    { value: 'blocked', label: id === 'adherence' ? 'Inadequado' : 'Bloqueado' },
    ...(id === 'adherence' ? [{ value: 'waiting_adjustment', label: 'Em Adequação' }] : [])
  ] : [
    { value: 'todo', label: 'Não Iniciado' },
    { value: 'in-progress', label: 'Em Andamento' },
    { value: 'done', label: 'Finalizado' },
    { value: 'blocked', label: 'Bloqueado' },
  ];

  // Helper for Rich Text
  const getEditorContent = (obs?: string) => {
    if (!obs) return "";
    try {
      const parsed = JSON.parse(obs);
      if (Array.isArray(parsed)) return convertBlocksToTiptap(parsed);
      return parsed;
    } catch {
      return obs;
    }
  };

  return (
    <AccordionItem value={id} className="border rounded-lg px-4 bg-card">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-4 w-full">
          <div className={cn("p-2 rounded-lg bg-muted transition-colors", status === 'done' && "bg-emerald-100 text-emerald-700")}>
             {Icon ? <Icon className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          </div>
          <span className="font-semibold text-lg flex-1 text-left">
            {label}
          </span>
          <Badge
            variant={status === "done" ? "default" : "secondary"}
            className={cn("mr-2 px-3 py-1", getStatusColor(status))}
          >
            {statusOptions.find(o => o.value === status)?.label || status}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 pb-6 space-y-6">
        
        {/* Common Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => onUpdate({ status: v })}>
                    <SelectTrigger className={cn(
                        status === 'done' && "bg-emerald-50 text-emerald-900 border-emerald-200",
                        status === 'in-progress' && "bg-blue-50 text-blue-900 border-blue-200",
                        status === 'blocked' && "bg-amber-50 text-amber-900 border-amber-200"
                    )}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {statusOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Responsável</Label>
                <AutocompleteInput 
                    value={responsible} 
                    onChange={(v) => onUpdate({ responsible: v })}
                />
            </div>
            <div className="space-y-2">
                <Label>{['infra', 'adherence', 'environment', 'conversion'].includes(id) ? 'Enviado em' : 'Início'}</Label>
                <Input 
                    type="date" 
                    value={startDate ? format(new Date(startDate).toISOString().split('T')[0], "yyyy-MM-dd") : ""}
                    onChange={(e) => onUpdate({ startDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })}
                />
            </div>
            <div className="space-y-2">
                <Label>{['infra', 'adherence', 'environment', 'conversion'].includes(id) ? 'Finalizado em' : 'Término'}</Label>
                <Input 
                    type="date"
                    value={endDate ? format(new Date(endDate).toISOString().split('T')[0], "yyyy-MM-dd") : ""}
                    onChange={(e) => onUpdate({ endDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined })}
                />
            </div>
        </div>

        {/* Specific Fields (Children) */}
        {children && (
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children}
            </div>
        )}

        {/* Editor */}
        <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações & Detalhes</Label>
            <RichTextEditor 
                content={getEditorContent(observations)}
                onChange={(content) => onUpdate({ observations: content })}
                placeholder={`Detalhes da etapa de ${label}...`}
            />
        </div>

      </AccordionContent>
    </AccordionItem>
  );
}
