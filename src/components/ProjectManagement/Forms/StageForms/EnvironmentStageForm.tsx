import {
  EnvironmentStageV2,
  RemoteAccessItem,
  RemoteAccessVpnFile,
  OsCredential,
  OsCredentialField,
} from "@/types/ProjectV2";
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
import {
  Database,
  Server,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Paperclip,
  Download,
  Upload,
  Loader2,
  FileText,
  Shield,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface EnvironmentStageFormProps {
  stage: EnvironmentStageV2;
  canEditProjects: boolean;
  onUpdate: (updates: Partial<EnvironmentStageV2>) => void;
  infraServers?: any[];
  projectId?: string;
}

function normalizeOsCredential(cred: OsCredential): OsCredential {
  if (cred.fields && cred.fields.length > 0) {
    return cred;
  }

  const fields: OsCredentialField[] = [];
  if (cred.serverName) {
    fields.push({ id: crypto.randomUUID(), label: "Host", value: cred.serverName });
  } else {
    fields.push({ id: crypto.randomUUID(), label: "Host", value: "" });
  }

  fields.push({ id: crypto.randomUUID(), label: "Porta", value: "" });

  if (cred.serverIp) {
    fields.push({ id: crypto.randomUUID(), label: "IP", value: cred.serverIp });
  } else {
    fields.push({ id: crypto.randomUUID(), label: "IP", value: "" });
  }

  if (cred.login) {
    fields.push({ id: crypto.randomUUID(), label: "Usuário", value: cred.login });
  } else {
    fields.push({ id: crypto.randomUUID(), label: "Usuário", value: "" });
  }

  if (cred.password) {
    fields.push({ id: crypto.randomUUID(), label: "Senha", value: cred.password });
  } else {
    fields.push({ id: crypto.randomUUID(), label: "Senha", value: "" });
  }

  const title = cred.title || (cred.osType ? `Servidor ${cred.osType}` : cred.serverName || "Servidor");
  return {
    ...cred,
    title,
    fields,
  };
}

export function EnvironmentStageForm({
  stage,
  canEditProjects,
  onUpdate,
  infraServers,
  projectId,
}: EnvironmentStageFormProps) {
  const { toast } = useToast();
  const [showPgAccess, setShowPgAccess] = useState(false);
  // Visibilidade da senha por credencial de SO (chave = cred.id)
  const [visibleOsPwd, setVisibleOsPwd] = useState<Record<string, boolean>>({});
  // Trava anti-autofill: campos de credencial iniciam readOnly para o
  // gerenciador de senha do navegador não injetar login/senha do usuário.
  // Liberado no primeiro foco (interação real do usuário).
  const [credsLocked, setCredsLocked] = useState(true);
  const unlockCreds = () => setCredsLocked(false);

  const autoFillAttempted = useRef(false);
  const [uploadingVpnIdx, setUploadingVpnIdx] = useState<number | null>(null);



  const sanitizeFileName = (name: string): string => {
    return name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.\-() ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 180);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleUploadVpnFiles = async (accessIdx: number, files: FileList | null) => {
    if (!files || files.length === 0 || !canEditProjects) return;
    setUploadingVpnIdx(accessIdx);
    const validFiles = Array.from(files);
    const maxBytes = 15 * 1024 * 1024; // 15MB

    const newFiles: RemoteAccessVpnFile[] = [];

    try {
      for (const file of validFiles) {
        if (file.size > maxBytes) {
          toast({
            title: "Arquivo muito grande",
            description: `"${file.name}" excede o limite de 15 MB.`,
            variant: "destructive",
          });
          continue;
        }

        const cleanName = sanitizeFileName(file.name);
        const storagePath = `${projectId || "general"}/vpn/${crypto.randomUUID()}-${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: true });

        if (uploadError) {
          console.error("Erro no upload VPN:", uploadError);
          toast({
            title: "Erro no envio",
            description: `Falha ao enviar ${file.name}: ${uploadError.message}`,
            variant: "destructive",
          });
          continue;
        }

        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          path: storagePath,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }

      if (newFiles.length > 0) {
        const currentList = stage.remoteAccessList || [];
        const updatedList = [...currentList];
        const accessItem = updatedList[accessIdx];
        if (accessItem) {
          const existingFiles = accessItem.vpnFiles || [];
          updatedList[accessIdx] = {
            ...accessItem,
            vpnFiles: [...existingFiles, ...newFiles],
          };
          onUpdate({ remoteAccessList: updatedList });
          toast({
            title: "Arquivo(s) anexado(s)",
            description: `${newFiles.length} arquivo(s) de VPN anexado(s) com sucesso.`,
          });
        }
      }
    } finally {
      setUploadingVpnIdx(null);
    }
  };

  const handleDownloadVpnFile = async (file: RemoteAccessVpnFile) => {
    try {
      const { data, error } = await supabase.storage.from("project-files").download(file.path);
      if (error || !data) {
        toast({
          title: "Erro ao baixar arquivo",
          description: error?.message || "Não foi possível transferir o arquivo.",
          variant: "destructive",
        });
        return;
      }
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao processar download.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveVpnFile = async (accessIdx: number, fileId: string, filePath: string) => {
    try {
      await supabase.storage.from("project-files").remove([filePath]);
    } catch (err) {
      console.warn("Aviso ao remover do storage:", err);
    }

    const currentList = stage.remoteAccessList || [];
    const updatedList = [...currentList];
    const accessItem = updatedList[accessIdx];
    if (accessItem) {
      const updatedFiles = (accessItem.vpnFiles || []).filter((f) => f.id !== fileId);
      updatedList[accessIdx] = {
        ...accessItem,
        vpnFiles: updatedFiles,
      };
      onUpdate({ remoteAccessList: updatedList });
      toast({
        title: "Arquivo removido",
        description: "O arquivo da VPN foi excluído com sucesso.",
      });
    }
  };

  const handleSyncIpToPostgres = () => {
    let foundIp = "";
    for (const block of stage.osCredentials || []) {
      const norm = normalizeOsCredential(block);
      for (const f of norm.fields || []) {
        if ((f.label || "").toLowerCase().trim() === "ip" && f.value?.trim()) {
          foundIp = f.value.trim();
          break;
        }
      }
      if (foundIp) break;
    }
    if (foundIp) {
      onUpdate({ postgresHost: `${foundIp}:5432` });
      toast({
        title: "IP sincronizado!",
        description: `Local de Instalação atualizado para ${foundIp}:5432`,
      });
    } else {
      toast({
        title: "Nenhum IP encontrado",
        description: "Preencha a linha IP em um dos blocos de servidor para sincronizar.",
        variant: "destructive",
      });
    }
  };

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
        const detectedVersion = osString;

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

  // --- Credenciais do SO (Blocos de Acesso com Linhas dinâmicas) ---
  const addOsBlock = (templateTitle = "Novo Servidor") => {
    const list = stage.osCredentials || [];
    const newBlock: OsCredential = {
      id: crypto.randomUUID(),
      title: templateTitle,
      fields: [
        { id: crypto.randomUUID(), label: "Host", value: "" },
        { id: crypto.randomUUID(), label: "Porta", value: "" },
        { id: crypto.randomUUID(), label: "IP", value: "" },
        { id: crypto.randomUUID(), label: "Usuário", value: "" },
        { id: crypto.randomUUID(), label: "Senha", value: "" },
      ],
      serverName: "",
      serverIp: "",
      login: "",
      password: "",
    };
    onUpdate({ osCredentials: [...list, newBlock] });
  };

  // Mantém addOsCredential / removeOsCredential para compatibilidade
  const addOsCredential = () => addOsBlock("Novo Servidor");
  const removeOsCredential = (idx: number) => removeOsBlock(idx);

  const updateBlockTitle = (blockIdx: number, title: string) => {
    const list = stage.osCredentials || [];
    const current = normalizeOsCredential(list[blockIdx]);
    const updated = [...list];
    updated[blockIdx] = { ...current, title };
    onUpdate({ osCredentials: updated });
  };

  const removeOsBlock = (blockIdx: number) => {
    const list = stage.osCredentials || [];
    const remaining = list.filter((_, i) => i !== blockIdx);
    const primaryLogin = remaining.find((b) => b.login)?.login ?? "";
    const primaryPassword = remaining.find((b) => b.password)?.password ?? "";
    onUpdate({
      osCredentials: remaining,
      soLogin: primaryLogin,
      soPassword: primaryPassword,
    });
  };

  const addFieldToBlock = (blockIdx: number, defaultLabel = "") => {
    const list = stage.osCredentials || [];
    const current = normalizeOsCredential(list[blockIdx]);
    const fields = [...(current.fields || []), { id: crypto.randomUUID(), label: defaultLabel, value: "" }];
    const updated = [...list];
    updated[blockIdx] = { ...current, fields };
    onUpdate({ osCredentials: updated });
  };

  const updateFieldInBlock = (
    blockIdx: number,
    fieldIdx: number,
    prop: "label" | "value",
    val: string
  ) => {
    const list = stage.osCredentials || [];
    const current = normalizeOsCredential(list[blockIdx]);
    const fields = [...(current.fields || [])];
    fields[fieldIdx] = { ...fields[fieldIdx], [prop]: val };

    // Sincroniza campos raiz para retrocompatibilidade
    let serverName = current.serverName;
    let serverIp = current.serverIp;
    let login = current.login;
    let password = current.password;

    for (const f of fields) {
      const lbl = (f.label || "").toLowerCase().trim();
      if (lbl === "host" || lbl === "nome" || lbl === "servidor") serverName = f.value;
      if (lbl === "ip") serverIp = f.value;
      if (lbl === "usuário" || lbl === "usuario" || lbl === "user" || lbl === "login") login = f.value;
      if (lbl === "senha" || lbl === "password" || lbl === "pass") password = f.value;
    }

    const updated = [...list];
    updated[blockIdx] = { ...current, fields, serverName, serverIp, login, password };
    const primaryLogin = updated.find((b) => b.login)?.login;
    const primaryPassword = updated.find((b) => b.password)?.password;

    // Espelhamento automático de qualquer campo nomeado como "IP" para o postgresHost (com porta padrão :5432)
    const targetField = fields[fieldIdx];
    const isIpField = (targetField?.label || "").toLowerCase().trim() === "ip";
    let newPostgresHost: string | undefined = undefined;
    if (prop === "value" && isIpField && val.trim()) {
      newPostgresHost = `${val.trim()}:5432`;
    }

    onUpdate({
      osCredentials: updated,
      ...(primaryLogin !== undefined ? { soLogin: primaryLogin } : {}),
      ...(primaryPassword !== undefined ? { soPassword: primaryPassword } : {}),
      ...(newPostgresHost !== undefined ? { postgresHost: newPostgresHost } : {}),
    });
  };

  const removeFieldFromBlock = (blockIdx: number, fieldIdx: number) => {
    const list = stage.osCredentials || [];
    const current = normalizeOsCredential(list[blockIdx]);
    const fields = (current.fields || []).filter((_, i) => i !== fieldIdx);
    const updated = [...list];
    updated[blockIdx] = { ...current, fields };
    onUpdate({ osCredentials: updated });
  };

  const toggleOsPwd = (id: string) =>
    setVisibleOsPwd((prev) => ({ ...prev, [id]: !prev[id] }));

  // Backfill: migra credencial única legada (soLogin/soPassword/osType) para o
  // novo array osCredentials na primeira visualização, sem perder dados antigos.
  const osCredsBackfilled = useRef(false);
  useEffect(() => {
    if (osCredsBackfilled.current) return;
    const hasCreds = (stage.osCredentials?.length ?? 0) > 0;
    if (hasCreds) {
      osCredsBackfilled.current = true;
      return;
    }
    if (stage.soLogin || stage.soPassword || stage.osType) {
      osCredsBackfilled.current = true;
      const title = stage.osType ? `Servidor ${stage.osType}` : "Servidor Principal";
      onUpdate({
        osCredentials: [
          {
            id: crypto.randomUUID(),
            title,
            serverName: "",
            serverIp: "",
            osType: stage.osType || "",
            login: stage.soLogin || "",
            password: stage.soPassword || "",
            fields: [
              { id: crypto.randomUUID(), label: "Host", value: "" },
              { id: crypto.randomUUID(), label: "Porta", value: "" },
              { id: crypto.randomUUID(), label: "IP", value: "" },
              { id: crypto.randomUUID(), label: "Usuário", value: stage.soLogin || "" },
              { id: crypto.randomUUID(), label: "Senha", value: stage.soPassword || "" },
            ],
          },
        ],
      });
    }
  }, [stage.osCredentials, stage.soLogin, stage.soPassword, stage.osType, onUpdate]);

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
            className="h-9 border border-input bg-background text-foreground hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs flex-1 min-w-[150px]"
          />
        </div>
      </div>

      {/* Acessos Remotos */}
      <div className="border border-border rounded-lg p-3.5 bg-muted/20 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            Dados do Servidor & Acessos Remotos
          </h4>
          <Button
            type="button"
            onClick={addRemoteAccess}
            disabled={!canEditProjects}
            variant="outline"
            size="sm"
            className="h-6.5 text-[10px] gap-1 border-border text-foreground hover:bg-muted font-bold bg-background"
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
            {stage.remoteAccessList.map((access, idx) => {
              const isVpn = access.system === "VPN";

              return (
                <div
                  key={idx}
                  className="rounded-md border border-border/80 bg-background p-2.5 shadow-2xs space-y-2"
                >
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    {/* System Select */}
                    <Select
                      value={access.system}
                      onValueChange={(val: any) => updateRemoteAccess(idx, "system", val)}
                      disabled={!canEditProjects}
                    >
                      <SelectTrigger className="w-full sm:w-36 h-8 text-xs border-muted/80 shrink-0 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AnyDesk" className="text-xs">AnyDesk</SelectItem>
                        <SelectItem value="TeamViewer" className="text-xs">TeamViewer</SelectItem>
                        <SelectItem value="RustDesk" className="text-xs">RustDesk</SelectItem>
                        <SelectItem value="VPN" className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                          VPN
                        </SelectItem>
                        <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* ID / Identificador Input */}
                    <Input
                      value={access.id}
                      onChange={(e) => updateRemoteAccess(idx, "id", e.target.value)}
                      disabled={!canEditProjects}
                      placeholder={isVpn ? "Usuário / Host VPN (opcional)" : "ID do Acesso"}
                      className="border-muted/80 h-8 text-xs flex-1 min-w-[120px]"
                    />

                    {/* Password Input with copy */}
                    <div className="relative flex items-center flex-1 min-w-[120px]">
                      <Input
                        value={access.password || ""}
                        onChange={(e) => updateRemoteAccess(idx, "password", e.target.value)}
                        disabled={!canEditProjects}
                        placeholder={isVpn ? "Senha VPN (opcional)" : "Senha"}
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
                          aria-label="Copiar senha do acesso remoto"
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
                      title="Remover acesso"
                      aria-label="Remover acesso remoto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Seção Exclusiva para Arquivos de VPN */}
                  {isVpn && (
                    <div className="mt-2 pt-2 border-t border-dashed border-border/80 bg-muted/15 rounded-md p-2 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3 text-rose-600" />
                          Arquivos de Configuração da VPN (.ovpn, .conf, .zip, certs)
                        </span>

                        {canEditProjects && (
                          <label className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-background border border-border/80 shadow-2xs hover:bg-muted cursor-pointer text-foreground transition-colors">
                            {uploadingVpnIdx === idx ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3 text-rose-600" />
                                Anexar Arquivo VPN
                              </>
                            )}
                            <input
                              type="file"
                              multiple
                              accept=".ovpn,.conf,.zip,.rar,.txt,.pdf,.key,.crt,.cer,.p12"
                              disabled={uploadingVpnIdx === idx}
                              className="hidden"
                              onChange={(e) => {
                                handleUploadVpnFiles(idx, e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {(!access.vpnFiles || access.vpnFiles.length === 0) ? (
                        <p className="text-[10px] text-muted-foreground italic py-1">
                          Nenhum arquivo de VPN anexado ainda. Clique em &quot;Anexar Arquivo VPN&quot; para fazer upload.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pt-1">
                          {access.vpnFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between gap-1.5 p-1.5 bg-background border border-border/80 rounded shadow-2xs text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <FileText className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-[11px] truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <span className="text-[9px] text-muted-foreground">
                                    {formatFileSize(file.size)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadVpnFile(file)}
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground rounded"
                                  title="Baixar arquivo"
                                  aria-label={`Baixar arquivo ${file.name}`}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                {canEditProjects && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveVpnFile(idx, file.id, file.path)}
                                    className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded"
                                    title="Remover arquivo"
                                    aria-label={`Remover arquivo ${file.name}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Credenciais do SO — Blocos de Acesso */}
        <div className="border-t border-border pt-4 mt-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                Credenciais do Sistema Operacional (SO) — Blocos de Acesso
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Organize servidores e acessos em blocos com linhas flexíveis de rótulo e valor.
              </p>
            </div>

            {canEditProjects && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOsBlock("Servidor Linux")}
                  className="h-6.5 text-[10px] gap-1 border-border text-foreground hover:bg-muted font-bold bg-background"
                >
                  <Plus className="h-3 w-3" />
                  Servidor Linux
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOsBlock("Servidor Windows")}
                  className="h-6.5 text-[10px] gap-1 border-border text-foreground hover:bg-muted font-bold bg-background"
                >
                  <Plus className="h-3 w-3" />
                  Servidor Windows
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOsBlock("Novo Bloco")}
                  className="h-6.5 text-[10px] gap-1 border-border text-foreground hover:bg-muted font-bold bg-background"
                >
                  <Plus className="h-3 w-3" />
                  + Bloco
                </Button>
              </div>
            )}
          </div>

          {(!stage.osCredentials || stage.osCredentials.length === 0) && (
            <div className="text-center py-6 border border-dashed rounded-lg bg-background/50 space-y-2">
              <p className="text-xs text-muted-foreground italic">
                Nenhum bloco de acesso cadastrado.
              </p>
              {canEditProjects && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOsBlock("Servidor Linux")}
                  className="h-7 text-xs gap-1.5 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Bloco de Servidor
                </Button>
              )}
            </div>
          )}

          {stage.osCredentials && stage.osCredentials.length > 0 && (
            <div className="space-y-3.5">
              {stage.osCredentials.map((rawCred, blockIdx) => {
                const cred = normalizeOsCredential(rawCred);
                const fields = cred.fields || [];

                return (
                  <div
                    key={cred.id}
                    className="rounded-lg border border-border/80 bg-background shadow-2xs overflow-hidden"
                  >
                    {/* Cabeçalho do Bloco */}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/70 gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={cred.title || ""}
                          onChange={(e) => updateBlockTitle(blockIdx, e.target.value)}
                          disabled={!canEditProjects}
                          placeholder="Nome do Bloco (ex: Servidor Linux, Servidor VM08)"
                          className="h-7 text-xs font-bold bg-background border-muted/80 max-w-[280px]"
                        />
                      </div>

                      {canEditProjects && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOsBlock(blockIdx)}
                          className="h-6.5 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1 font-semibold"
                          title="Excluir este bloco"
                          aria-label={`Excluir bloco ${cred.title || blockIdx + 1}`}
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir Bloco
                        </Button>
                      )}
                    </div>

                    {/* Linhas (Campos) do Bloco */}
                    <div className="p-3 space-y-2">
                      {fields.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic py-1">
                          Nenhuma linha neste bloco. Clique em &quot;+ Linha&quot; abaixo.
                        </p>
                      ) : (
                        fields.map((field, fieldIdx) => {
                          const isPassword = /senha|password|secret|token/i.test(field.label || "");
                          const showPwd = visibleOsPwd[field.id];

                          return (
                            <div
                              key={field.id}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 bg-muted/20 sm:bg-transparent p-1.5 sm:p-0 rounded-md"
                            >
                              {/* Rótulo */}
                              <div className="w-full sm:w-36 shrink-0">
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateFieldInBlock(blockIdx, fieldIdx, "label", e.target.value)}
                                  disabled={!canEditProjects}
                                  placeholder="Rótulo (ex: Host, IP)"
                                  list="common-field-labels"
                                  className="h-8 text-xs border-muted/80 bg-background font-medium"
                                />
                              </div>

                              {/* Valor */}
                              <div className="relative flex-1 flex items-center">
                                <Input
                                  type={isPassword && !showPwd ? "password" : "text"}
                                  value={field.value}
                                  onChange={(e) => updateFieldInBlock(blockIdx, fieldIdx, "value", e.target.value)}
                                  disabled={!canEditProjects}
                                  readOnly={isPassword && credsLocked}
                                  onFocus={unlockCreds}
                                  placeholder={field.label ? `Valor de ${field.label}` : "Valor"}
                                  autoComplete="off"
                                  className={`h-8 text-xs border-muted/80 bg-background ${
                                    isPassword ? "pr-16" : field.value ? "pr-8" : ""
                                  }`}
                                />

                                <div className="absolute right-0.5 flex items-center gap-0.5">
                                  {isPassword && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => toggleOsPwd(field.id)}
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                                      title={showPwd ? "Ocultar senha" : "Ver senha"}
                                      aria-label={showPwd ? "Ocultar senha" : "Ver senha"}
                                    >
                                      {showPwd ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </Button>
                                  )}
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyText(field.value, field.label || "Valor")}
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                                      title="Copiar valor"
                                      aria-label={`Copiar ${field.label || "valor"}`}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Botão de Excluir Linha */}
                              {canEditProjects && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFieldFromBlock(blockIdx, fieldIdx)}
                                  className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md shrink-0 self-end sm:self-auto"
                                  title="Remover linha"
                                  aria-label={`Remover campo ${field.label || fieldIdx + 1}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}

                      {/* Botão + Linha */}
                      {canEditProjects && (
                        <div className="pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addFieldToBlock(blockIdx)}
                            className="h-6.5 text-[10px] gap-1 border-dashed border-border text-muted-foreground hover:text-foreground font-semibold bg-background"
                          >
                            <Plus className="h-3 w-3" />
                            + Linha
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Botão no rodapé para adicionar mais um bloco */}
              {canEditProjects && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOsBlock("Novo Servidor")}
                    className="h-7 text-xs gap-1.5 border-dashed border-border font-semibold text-foreground hover:bg-muted bg-background"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Bloco de Servidor
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Datalist com sugestões para Rótulos comuns */}
          <datalist id="common-field-labels">
            <option value="Host" />
            <option value="Porta" />
            <option value="IP" />
            <option value="Usuário" />
            <option value="Senha" />
            <option value="Banco" />
            <option value="ID" />
            <option value="Estação" />
            <option value="Ambiente" />
            <option value="Observação" />
          </datalist>
        </div>

        {/* PostgreSQL Database Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4 mt-2">
          {/* Postgres Version Select + Outro */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Versão do PostgreSQL
            </Label>
            {(() => {
              const PRESET_VERSIONS = ["Versão 12", "Versão 17", "Versão 18"];
              const currentVal = stage.postgresVersion || "";
              const isPreset = PRESET_VERSIONS.includes(currentVal);
              const selectValue = isPreset ? currentVal : currentVal !== "" ? "Outro" : "";

              return (
                <div className="space-y-1.5">
                  <Select
                    value={selectValue}
                    onValueChange={(val) => {
                      if (val === "Outro") {
                        if (isPreset || !currentVal) {
                          onUpdate({ postgresVersion: "Outro" });
                        }
                      } else {
                        onUpdate({ postgresVersion: val });
                      }
                    }}
                    disabled={!canEditProjects}
                  >
                    <SelectTrigger className="h-8 text-xs border border-muted/80 bg-background">
                      <SelectValue placeholder="Selecione a versão..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Versão 12" className="text-xs">Versão 12</SelectItem>
                      <SelectItem value="Versão 17" className="text-xs">Versão 17</SelectItem>
                      <SelectItem value="Versão 18" className="text-xs">Versão 18</SelectItem>
                      <SelectItem value="Outro" className="text-xs font-semibold">Outro</SelectItem>
                    </SelectContent>
                  </Select>

                  {selectValue === "Outro" && (
                    <Input
                      value={currentVal === "Outro" ? "" : currentVal}
                      onChange={(e) => onUpdate({ postgresVersion: e.target.value })}
                      disabled={!canEditProjects}
                      placeholder="Digite a versão personalizada (ex: Versão 16)..."
                      className="h-8 text-xs border border-muted/80 bg-background animate-in fade-in-50 duration-200"
                    />
                  )}
                </div>
              );
            })()}
          </div>

          {/* Local de Instalação (IP / Porta) com Espelhamento Automático */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Local de Instalação (IP / Porta)
              </Label>
              {canEditProjects && (
                <button
                  type="button"
                  onClick={handleSyncIpToPostgres}
                  className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
                  title="Sincronizar com o IP do bloco de servidor"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Sincronizar IP
                </button>
              )}
            </div>
            <Input
              value={stage.postgresHost || ""}
              onChange={(e) => onUpdate({ postgresHost: e.target.value })}
              disabled={!canEditProjects}
              placeholder="Ex: 192.168.1.10:5432"
              className="h-8 text-xs border border-muted/80 bg-background font-mono"
            />
          </div>

          {/* Usuário do Banco (Padrão: postgres) */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Usuário do Banco
            </Label>
            <Input
              value={stage.postgresUser !== undefined && stage.postgresUser !== "" ? stage.postgresUser : "postgres"}
              onChange={(e) => onUpdate({ postgresUser: e.target.value })}
              disabled={!canEditProjects}
              readOnly={credsLocked}
              onFocus={unlockCreds}
              placeholder="postgres"
              autoComplete="off"
              name="environment-pg-user"
              data-1p-ignore
              data-lpignore="true"
              className="h-8 text-xs border border-muted/80 bg-background font-medium"
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
                  aria-label={showPgAccess ? "Ocultar senha do PostgreSQL" : "Ver senha do PostgreSQL"}
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
                    aria-label="Copiar senha do PostgreSQL"
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
