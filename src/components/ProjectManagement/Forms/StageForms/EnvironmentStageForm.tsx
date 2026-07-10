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
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface EnvironmentStageFormProps {
  stage: EnvironmentStageV2;
  canEditProjects: boolean;
  onUpdate: (updates: Partial<EnvironmentStageV2>) => void;
  infraServers?: any[];
}

export function EnvironmentStageForm({
  stage,
  canEditProjects,
  onUpdate,
  infraServers,
}: EnvironmentStageFormProps) {
  const { toast } = useToast();
  const [showSoPassword, setShowSoPassword] = useState(false);
  const [showPgAccess, setShowPgAccess] = useState(false);
  // Trava anti-autofill: campos de credencial iniciam readOnly para o
  // gerenciador de senha do navegador não injetar login/senha do usuário.
  // Liberado no primeiro foco (interação real do usuário).
  const [credsLocked, setCredsLocked] = useState(true);
  const unlockCreds = () => setCredsLocked(false);

  const autoFillAttempted = useRef(false);

  useEffect(() => {
    if (autoFillAttempted.current) return;
    if (stage.osType || stage.osVersion) {
      autoFillAttempted.current = true;
      return;
    }

    if (infraServers && infraServers.length > 0) {
      const serverWithOs = infraServers.find(s => s.os && s.os.trim() !== "");
      if (serverWithOs) {
        autoFillAttempted.current = true;
        const osString = serverWithOs.os.trim();
        const lower = osString.toLowerCase();
        let detectedType = "";
        let detectedVersion = osString;

        if (lower.includes("windows") || lower.includes("win")) {
          detectedType = "Windows";
        } else if (lower.includes("linux") || lower.includes("ubuntu") || lower.includes("debian") || lower.includes("centos") || lower.includes("redhat") || lower.includes("suse")) {
          detectedType = "Linux";
        }

        onUpdate({
          osType: detectedType,
          osVersion: detectedVersion
        });
      }
    }
  }, [infraServers, stage.osType, stage.osVersion, onUpdate]);

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
    <div className="space-y-4 col-span-full">
      {/* Sistema Operacional */}
      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          Sistema Operacional
        </Label>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 max-w-xl">
          {/* OS Type Selector */}
          <Select
            value={stage.osType || ""}
            onValueChange={(val) => onUpdate({ osType: val })}
            disabled={!canEditProjects}
          >
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs border-muted/80 bg-background">
              <SelectValue placeholder="Selecione o SO..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Windows" className="text-xs">Windows</SelectItem>
              <SelectItem value="Linux" className="text-xs">Linux</SelectItem>
            </SelectContent>
          </Select>

          {/* OS Version Input */}
          <Input
            value={stage.osVersion || ""}
            onChange={(e) => onUpdate({ osVersion: e.target.value })}
            disabled={!canEditProjects}
            placeholder={stage.osType === "Linux" ? "Ex: Ubuntu 22.04" : "Ex: Server 2022"}
            className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs flex-1 min-w-[150px]"
          />
        </div>
      </div>

      {/* Acessos Remotos */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 bg-slate-50/30 dark:bg-slate-900/10 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            Dados do Servidor & Acessos Remotos
          </h4>
          <Button
            type="button"
            onClick={addRemoteAccess}
            disabled={!canEditProjects}
            variant="outline"
            size="sm"
            className="h-6.5 text-[10px] gap-1 border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-100 dark:hover:bg-slate-900 font-bold bg-background"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
          {/* OS Login */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Usuário do Sistema Operacional (SO)
            </Label>
            <Input
              value={stage.soLogin || ""}
              onChange={(e) => onUpdate({ soLogin: e.target.value })}
              disabled={!canEditProjects}
              readOnly={credsLocked}
              onFocus={unlockCreds}
              placeholder="Ex: Administrator / Suporte"
              autoComplete="off"
              name="environment-so-login"
              data-1p-ignore
              data-lpignore="true"
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
                readOnly={credsLocked}
                onFocus={unlockCreds}
                placeholder="Senha do SO"
                autoComplete="new-password"
                name="environment-so-password"
                data-1p-ignore
                data-lpignore="true"
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

        {/* PostgreSQL Database Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
          {/* Postgres Version */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Versão do PostgreSQL
            </Label>
            <Input
              value={stage.postgresVersion || ""}
              onChange={(e) => onUpdate({ postgresVersion: e.target.value })}
              disabled={!canEditProjects}
              placeholder="Ex: PostgreSQL 17"
              className="h-8 text-xs border border-muted/80 bg-background"
            />
          </div>

          {/* Local de Instalação (IP / Porta) */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Local de Instalação (IP / Porta)
            </Label>
            <Input
              value={stage.postgresHost || ""}
              onChange={(e) => onUpdate({ postgresHost: e.target.value })}
              disabled={!canEditProjects}
              placeholder="Ex: 192.168.1.10:5432"
              className="h-8 text-xs border border-muted/80 bg-background"
            />
          </div>

          {/* Usuário do Banco */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Usuário do Banco
            </Label>
            <Input
              value={stage.postgresUser || ""}
              onChange={(e) => onUpdate({ postgresUser: e.target.value })}
              disabled={!canEditProjects}
              readOnly={credsLocked}
              onFocus={unlockCreds}
              placeholder="Ex: postgres"
              autoComplete="off"
              name="environment-pg-user"
              data-1p-ignore
              data-lpignore="true"
              className="h-8 text-xs border border-muted/80 bg-background"
            />
          </div>

          {/* Senha do Banco */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Senha do Banco
            </Label>
            <div className="relative flex items-center">
              <Input
                type={showPgAccess ? "text" : "password"}
                value={stage.postgresPassword || ""}
                onChange={(e) => onUpdate({ postgresPassword: e.target.value })}
                disabled={!canEditProjects}
                readOnly={credsLocked}
                onFocus={unlockCreds}
                placeholder="Senha..."
                autoComplete="new-password"
                name="environment-pg-password"
                data-1p-ignore
                data-lpignore="true"
                className="h-8 text-xs border border-muted/80 bg-background pr-16"
              />
              <div className="absolute right-0.5 flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPgAccess(!showPgAccess)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                  title={showPgAccess ? "Ocultar senha" : "Ver senha"}
                >
                  {showPgAccess ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                {stage.postgresPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyText(stage.postgresPassword || "", "Senha do PostgreSQL")}
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
