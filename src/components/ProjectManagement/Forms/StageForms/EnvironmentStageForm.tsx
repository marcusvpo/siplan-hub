import { EnvironmentStageV2, RemoteAccessItem } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Server, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [showSoPassword, setShowSoPassword] = useState(false);

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência!`,
    });
  };

  const addRemoteAccess = () => {
    const currentList = stage.remoteAccessList || [];
    onUpdate({
      remoteAccessList: [
        ...currentList,
        { system: "AnyDesk", id: "", password: "" }
      ]
    });
  };

  const updateRemoteAccess = (idx: number, field: keyof RemoteAccessItem, val: string) => {
    if (!stage.remoteAccessList) return;
    const updated = [...stage.remoteAccessList];
    updated[idx] = {
      ...updated[idx],
      [field]: val
    };
    onUpdate({ remoteAccessList: updated });
  };

  const removeRemoteAccess = (idx: number) => {
    if (!stage.remoteAccessList) return;
    onUpdate({
      remoteAccessList: stage.remoteAccessList.filter((_, i) => i !== idx)
    });
  };

  return (
    <div className="space-y-4">
      {/* Sistema Operacional */}
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

      {/* Acessos Remotos */}
      <div className="border border-rose-500/10 rounded-lg p-3.5 bg-rose-500/5 space-y-4">
        <div className="flex items-center justify-between border-b border-rose-500/10 pb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" />
            Dados do Servidor & Acessos Remotos
          </h4>
          <Button
            type="button"
            onClick={addRemoteAccess}
            disabled={!canEditProjects}
            variant="outline"
            size="sm"
            className="h-6.5 text-[10px] gap-1 border-rose-500/20 text-rose-600 hover:bg-rose-500/10 font-bold bg-background"
          >
            <Plus className="h-3 w-3" />
            Adicionar Acesso
          </Button>
        </div>

        {/* List of Remote Access */}
        {(!stage.remoteAccessList || stage.remoteAccessList.length === 0) ? (
          <p className="text-[11px] text-muted-foreground italic py-3 text-center bg-background/50 border border-dashed rounded-md">
            Nenhum acesso remoto cadastrado. Clique em Adicionar Acesso.
          </p>
        ) : (
          <div className="space-y-2 mt-1.5">
            {stage.remoteAccessList.map((access, idx) => (
              <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-background p-2 border rounded-md shadow-2xs">
                {/* System Select */}
                <Select
                  value={access.system}
                  onValueChange={(val: any) => updateRemoteAccess(idx, "system", val)}
                  disabled={!canEditProjects}
                >
                  <SelectTrigger className="w-full sm:w-32 h-8 text-xs border-muted/80 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AnyDesk" className="text-xs">AnyDesk</SelectItem>
                    <SelectItem value="TeamViewer" className="text-xs">TeamViewer</SelectItem>
                    <SelectItem value="RustDesk" className="text-xs">RustDesk</SelectItem>
                    <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                  </SelectContent>
                </Select>

                {/* ID Input */}
                <Input
                  value={access.id}
                  onChange={(e) => updateRemoteAccess(idx, "id", e.target.value)}
                  disabled={!canEditProjects}
                  placeholder="ID do Acesso"
                  className="border-muted/80 h-8 text-xs flex-1 min-w-[120px]"
                />

                {/* Password Input with copy */}
                <div className="relative flex items-center flex-1 min-w-[120px]">
                  <Input
                    value={access.password || ""}
                    onChange={(e) => updateRemoteAccess(idx, "password", e.target.value)}
                    disabled={!canEditProjects}
                    placeholder="Senha"
                    className="border-muted/80 h-8 text-xs pr-8 flex-1"
                  />
                  {access.password && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyText(access.password || "", "Senha")}
                      className="absolute right-0.5 h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                      title="Copiar senha"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  onClick={() => removeRemoteAccess(idx)}
                  disabled={!canEditProjects}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0 ml-auto sm:ml-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Credentials OS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-rose-500/10 pt-4 mt-2">
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
            <div className="relative flex items-center">
              <Input
                type={showSoPassword ? "text" : "password"}
                value={stage.soPassword || ""}
                onChange={(e) => onUpdate({ soPassword: e.target.value })}
                disabled={!canEditProjects}
                placeholder="Senha do SO"
                className="h-8 text-xs border border-muted/80 bg-background pr-16"
              />
              <div className="absolute right-0.5 flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSoPassword(!showSoPassword)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                  title={showSoPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showSoPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                {stage.soPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyText(stage.soPassword || "", "Senha do SO")}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                    title="Copiar senha"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
