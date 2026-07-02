import { EnvironmentStageV2 } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Database, Server } from "lucide-react";

interface EnvironmentStageFormProps {
  stage: EnvironmentStageV2;
  canEditProjects: boolean;
  onUpdate: (updates: Partial<EnvironmentStageV2>) => void;
}

export function EnvironmentStageForm({
  stage,
  canEditProjects,
  onUpdate,
}: EnvironmentStageFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          Sistema Operacional
        </Label>
        <Input
          value={stage.osVersion || ""}
          onChange={(e) => onUpdate({ osVersion: e.target.value })}
          disabled={!canEditProjects}
          placeholder="Ex: Windows Server 2022"
          className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
        />
      </div>

      <div className="border border-rose-500/10 rounded-lg p-3.5 bg-rose-500/5 space-y-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-rose-500/10 pb-2">
          <Server className="h-3.5 w-3.5" />
          Dados do Servidor & Acesso Remoto
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Connection ID / IP */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Acesso Remoto (AnyDesk / TeamViewer / IP)
            </Label>
            <Input
              value={stage.anydeskId || ""}
              onChange={(e) => onUpdate({ anydeskId: e.target.value })}
              disabled={!canEditProjects}
              placeholder="Ex: AnyDesk ID ou IP de acesso"
              className="h-8 text-xs border border-muted/80 bg-background"
            />
          </div>

          {/* Connection Password */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Senha de Acesso Remoto
            </Label>
            <Input
              value={stage.anydeskPassword || ""}
              onChange={(e) => onUpdate({ anydeskPassword: e.target.value })}
              disabled={!canEditProjects}
              placeholder="Senha de acesso"
              className="h-8 text-xs border border-muted/80 bg-background"
            />
          </div>

          {/* OS Login */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Usuário do Sistema Operacional (SO)
            </Label>
            <Input
              value={stage.soLogin || ""}
              onChange={(e) => onUpdate({ soLogin: e.target.value })}
              disabled={!canEditProjects}
              placeholder="Ex: Administrator / Suporte"
              className="h-8 text-xs border border-muted/80 bg-background"
            />
          </div>

          {/* OS Password */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Senha do Sistema Operacional (SO)
            </Label>
            <Input
              value={stage.soPassword || ""}
              onChange={(e) => onUpdate({ soPassword: e.target.value })}
              disabled={!canEditProjects}
              placeholder="Senha do SO"
              className="h-8 text-xs border border-muted/80 bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
