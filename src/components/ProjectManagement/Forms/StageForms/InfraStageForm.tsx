import { InfraStageV2, ServerInfo, WorkstationInfo } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Megaphone, 
  Server as ServerIcon, 
  Laptop, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Upload, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  BookOpen, 
  Info, 
  RefreshCw, 
  FileText,
  HelpCircle,
  Activity,
  Check,
  ClipboardList,
  Share2,
  Lock,
  Unlock
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { StatusType } from "./types";

interface InfraStageFormProps {
  stage: InfraStageV2;
  canEditProjects: boolean;
  notifying: boolean;
  onUpdate: (updates: Partial<InfraStageV2>) => void;
  onNotifyComercial: () => void;
  projectId?: string;
}

import {
  extractGeneration,
  checkWorkstationRequirements,
  checkServerRequirements,
  parseMachineInfo,
  parseExcelPastedText,
} from "@/utils/infra-validation";

// -------------------------------------------------------------
// EDITABLE CELL COMPONENT FOR FLAT/FLUID TABLE
// -------------------------------------------------------------
interface EditableCellProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function EditableCell({ value, onChange, placeholder, disabled, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (disabled) {
    return (
      <div className={cn("text-[10.5px] px-1.5 py-0.5 break-all select-text whitespace-pre-wrap leading-tight", className)}>
        {value || <span className="text-muted-foreground/30 italic">{placeholder || "-"}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <Input
        value={tempValue}
        onChange={e => setTempValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onChange(tempValue);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            setIsEditing(false);
            onChange(tempValue);
          } else if (e.key === "Escape") {
            setTempValue(value);
            setIsEditing(false);
          }
        }}
        autoFocus
        className={cn("h-7 text-[10.5px] px-1.5 w-full", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "text-[10.5px] px-1.5 py-1 break-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded min-h-7 flex items-center transition-colors w-full whitespace-pre-wrap leading-tight",
        !value && "text-muted-foreground/30 italic",
        className
      )}
    >
      {value || <span className="text-muted-foreground/30 italic">{placeholder || "-"}</span>}
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENT IMPLEMENTATION
// -------------------------------------------------------------

export function InfraStageForm({
  stage,
  canEditProjects,
  notifying,
  onUpdate,
  onNotifyComercial,
  projectId,
}: InfraStageFormProps) {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<string>("geral");
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  
  const serverFileInputRef = useRef<HTMLInputElement>(null);
  const workstationFileInputRef = useRef<HTMLInputElement>(null);

  const servers: ServerInfo[] = stage.servers || [];
  const workstations: WorkstationInfo[] = stage.workstations || [];
  const workstationsCount = stage.workstationsCount || workstations.length || 0;

  // Auto-calculate statuses when workstations, servers, or workstationsCount changes
  useEffect(() => {
    if (!canEditProjects) return;

    let updated = false;
    const updates: Partial<InfraStageV2> = {};

    // 1. Calculate Workstations Status
    if (workstations.length > 0) {
      const okCount = workstations.filter(w => {
        if (w.meetsRequirements === "Sim") return true;
        if (w.meetsRequirements === "Não") return false;
        return checkWorkstationRequirements(w).meets;
      }).length;
      const failCount = workstations.length - okCount;

      let calculated: StatusType = "Aguardando Adequação";
      if (okCount === workstations.length) {
        calculated = "Adequado";
      } else if (failCount === workstations.length) {
        calculated = "Inadequado";
      } else {
        calculated = "Parcialmente Adequado";
      }

      // Preserve "Aguardando Adequação" if already set and calculated is not fully adequate
      if (stage.workstationsStatus === "Aguardando Adequação" && calculated !== "Adequado") {
        calculated = "Aguardando Adequação";
      }

      if (stage.workstationsStatus !== calculated) {
        updates.workstationsStatus = calculated;
        updated = true;
      }
    }

    // 2. Calculate Server Status
    if (servers.length > 0) {
      const okCount = servers.filter(srv => {
        return checkServerRequirements(srv, workstationsCount).meets;
      }).length;
      const failCount = servers.length - okCount;

      let calculated: StatusType = "Aguardando Adequação";
      if (okCount === servers.length) {
        calculated = "Adequado";
      } else if (failCount === servers.length) {
        calculated = "Inadequado";
      } else {
        calculated = "Parcialmente Adequado";
      }

      // Preserve "Aguardando Adequação" if already set and calculated is not fully adequate
      if (stage.serverStatus === "Aguardando Adequação" && calculated !== "Adequado") {
        calculated = "Aguardando Adequação";
      }

      if (stage.serverStatus !== calculated) {
        updates.serverStatus = calculated;
        updated = true;
      }
    }

    if (updated) {
      onUpdate(updates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workstations, servers, workstationsCount]);

  // Sync count on change
  const handleWorkstationsChange = (newWorkstations: WorkstationInfo[]) => {
    onUpdate({
      workstations: newWorkstations,
      workstationsCount: newWorkstations.length
    });
  };

  const handleServersChange = (newServers: ServerInfo[]) => {
    onUpdate({ servers: newServers });
  };

  // Add Item Helpers
  const addServer = () => {
    const newServers = [...servers, {
      hostname: `SERVIDOR-0${servers.length + 1}`,
      brandModel: "",
      virtualized: "Não",
      processor: "",
      memory: "",
      disk: "",
      os: "",
      antivirus: "",
      network: "",
      backup: "",
      spaceOrion: "",
      observations: ""
    }];
    handleServersChange(newServers);
  };

  const deleteServer = (idx: number) => {
    const newServers = servers.filter((_, i) => i !== idx);
    handleServersChange(newServers);
  };

  const addWorkstation = () => {
    const newStations = [...workstations, {
      id: workstations.length + 1,
      hostname: "",
      sector: "",
      user: "",
      processor: "",
      generation: "",
      memory: "",
      disk: "",
      network: "",
      os: "",
      antivirus: "",
      meetsRequirements: undefined
    }];
    handleWorkstationsChange(newStations);
  };

  const deleteWorkstation = (idx: number) => {
    const newStations = workstations.filter((_, i) => i !== idx);
    handleWorkstationsChange(newStations);
  };

  // Bulk Validation helper
  const runAutoValidateAll = () => {
    const validated = workstations.map(ws => {
      const res = checkWorkstationRequirements(ws);
      return {
        ...ws,
        meetsRequirements: (res.meets ? "Sim" : "Não") as "Sim" | "Não"
      };
    });
    handleWorkstationsChange(validated);
    toast({
      title: "Sucesso",
      description: "Validação automática concluída para todas as estações!",
    });
  };

  // Excel Paste Parser
  const handleExcelImport = () => {
    if (!excelText.trim()) return;
    try {
      const parsed = parseExcelPastedText(excelText);
      if (parsed.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma linha válida identificada no texto colado.",
          variant: "destructive"
        });
        return;
      }
      
      // Auto-validate pasted rows
      const validated = parsed.map(ws => {
        if (ws.meetsRequirements !== undefined) return ws;
        const res = checkWorkstationRequirements(ws);
        return {
          ...ws,
          meetsRequirements: (res.meets ? "Sim" : "Não") as "Sim" | "Não"
        };
      });

      handleWorkstationsChange([...workstations, ...validated]);
      setExcelText("");
      setExcelImportOpen(false);
      
      toast({
        title: "Sucesso",
        description: `Importado ${validated.length} estações com sucesso!`,
        className: "bg-green-500 text-white border-green-600",
      });
    } catch (e) {
      toast({
        title: "Erro",
        description: "Falha ao processar texto colado. Verifique o formato.",
        variant: "destructive"
      });
    }
  };

  // File Upload (TXT info-system)
  const handleServerFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const parsed = parseMachineInfo(content);
      const newServers = [...servers];
      
      // If we have at least one server, update the first one or ask to append
      if (newServers.length === 0) {
        newServers.push({
          hostname: parsed.hostname,
          processor: parsed.processor,
          cores: parsed.cores || "",
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os,
          virtualized: parsed.virtualized || "Não",
          brandModel: parsed.brandModel || "",
          antivirus: parsed.antivirus || "",
          backup: parsed.backup || "",
          spaceOrion: parsed.spaceOrion || ""
        });
      } else {
        newServers[0] = {
          ...newServers[0],
          hostname: parsed.hostname,
          processor: parsed.processor,
          cores: parsed.cores || newServers[0].cores || "",
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os,
          virtualized: parsed.virtualized || newServers[0].virtualized || "Não",
          brandModel: parsed.brandModel || newServers[0].brandModel || "",
          antivirus: parsed.antivirus || newServers[0].antivirus || "",
          backup: parsed.backup || newServers[0].backup || "",
          spaceOrion: parsed.spaceOrion || newServers[0].spaceOrion || ""
        };
      }

      handleServersChange(newServers);
      toast({
        title: "Servidor Importado",
        description: `Dados carregados do arquivo TXT para o servidor ${parsed.hostname}!`,
        className: "bg-green-500 text-white border-green-600",
      });
    };
    reader.readAsText(file);
    if (serverFileInputRef.current) serverFileInputRef.current.value = "";
  };
  const handleWorkstationFilesImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleWorkstationFilesImport triggered");
    const files = event.target.files;
    console.log("Files list:", files);
    if (!files || files.length === 0) {
      console.log("No files selected or files list is empty");
      return;
    }

    const totalFiles = files.length; // Capture static total count before resetting the input
    let loadedCount = 0;
    const newStations: WorkstationInfo[] = [];

    Array.from(files).forEach((file, idx) => {
      console.log(`Processing file index ${idx}:`, file.name);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log(`FileReader onload for: ${file.name}`);
        const content = e.target?.result as string;
        if (!content) {
          console.warn(`File content is empty or failed to load for: ${file.name}`);
          return;
        }

        console.log(`Content length for ${file.name}: ${content.length}`);
        try {
          const parsed = parseMachineInfo(content);
          console.log(`Parsed info for ${file.name}:`, parsed);
          
          const wsData: WorkstationInfo = {
            hostname: parsed.hostname,
            sector: parsed.sector,
            user: parsed.user,
            processor: parsed.processor,
            generation: parsed.generation,
            memory: parsed.memory,
            disk: parsed.disk,
            network: parsed.network,
            os: parsed.os,
          };

          const res = checkWorkstationRequirements(wsData);
          wsData.meetsRequirements = (res.meets ? "Sim" : "Não") as "Sim" | "Não";
          
          newStations.push(wsData);
          loadedCount++;
          console.log(`Successfully parsed file ${file.name}. Loaded: ${loadedCount} of ${totalFiles}`);

          if (loadedCount === totalFiles) {
            console.log("All files read. Updating workstations list with:", newStations);
            handleWorkstationsChange([...workstations, ...newStations]);
            toast({
              title: "Estações Importadas em Lote",
              description: `Importadas ${newStations.length} estações com sucesso!`,
              className: "bg-green-500 text-white border-green-600",
            });
          }
        } catch (err) {
          console.error(`Error parsing machine info for file ${file.name}:`, err);
        }
      };

      reader.onerror = (err) => {
        console.error(`FileReader error for file ${file.name}:`, err);
      };

      reader.readAsText(file);
    });

    if (workstationFileInputRef.current) {
      console.log("Resetting file input value");
      workstationFileInputRef.current.value = "";
    }
  };
  // Drag and drop handlers for workstations
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canEditProjects) setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEditProjects) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const txtFiles = Array.from(files).filter(f => f.name.endsWith(".txt"));
    if (txtFiles.length === 0) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Apenas arquivos .txt do info-system são suportados.",
        variant: "destructive"
      });
      return;
    }

    let loadedCount = 0;
    const newStations: WorkstationInfo[] = [];

    txtFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (!content) return;

        const parsed = parseMachineInfo(content);
        const wsData: WorkstationInfo = {
          hostname: parsed.hostname,
          sector: parsed.sector,
          user: parsed.user,
          processor: parsed.processor,
          generation: parsed.generation,
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os,
        };

        const res = checkWorkstationRequirements(wsData);
        wsData.meetsRequirements = (res.meets ? "Sim" : "Não") as "Sim" | "Não";
        
        newStations.push(wsData);
        loadedCount++;

        if (loadedCount === txtFiles.length) {
          handleWorkstationsChange([...workstations, ...newStations]);
          toast({
            title: "Estações Importadas em Lote",
            description: `Importadas ${newStations.length} estações via Drag & Drop!`,
            className: "bg-green-500 text-white border-green-600",
          });
        }
      };
      reader.readAsText(file);
    });
  };

  // Metrics for Overview
  const stationsOkCount = workstations.filter(w => w.meetsRequirements === "Sim").length;
  const stationsFailCount = workstations.filter(w => w.meetsRequirements === "Não").length;
  const stationsPendingCount = workstations.filter(w => !w.meetsRequirements).length;

  const serverValidationResults = servers.map(srv => checkServerRequirements(srv, workstationsCount));
  const serversOkCount = serverValidationResults.filter(r => r.meets).length;
  const serversFailCount = serverValidationResults.filter(r => !r.meets).length;

  return (
    <>
      {/* Botões e Status originais no topo */}
      <div className="col-span-full mb-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2.5 items-center">
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={notifying || !canEditProjects}
              className="font-bold shadow-sm bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 transition-all duration-300"
            >
              <Megaphone className="mr-2 h-4 w-4" />
              {notifying ? "Notificando..." : "Notificar Comercial"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar notificação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja notificar o comercial? Um e-mail será
                enviado informando a infraestrutura inadequada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onNotifyComercial}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>

          {projectId && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const link = `${window.location.origin}/public/infra-coleta/${projectId}`;
                  navigator.clipboard.writeText(link);
                  toast({
                    title: "Link de Coleta Copiado",
                    description: "O link foi copiado para a área de transferência. Envie para o técnico do cartório!",
                    className: "bg-emerald-500 text-white border-emerald-600",
                  });
                }}
                disabled={stage.publicLinkClosed === true}
                className="font-bold border-indigo-300 hover:bg-indigo-50 dark:border-indigo-900/40 dark:hover:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 shadow-sm"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Copiar Link Público
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newClosed = !stage.publicLinkClosed;
                  onUpdate({ publicLinkClosed: newClosed });
                  toast({
                    title: newClosed ? "Link Público Fechado" : "Link Público Reaberto",
                    description: newClosed 
                      ? "O link público foi encerrado e não aceitará mais visualizações ou envios." 
                      : "O link público foi reaberto e está pronto para receber coletas.",
                    className: newClosed ? "bg-amber-600 text-white border-amber-700" : "bg-emerald-500 text-white border-emerald-600",
                  });
                }}
                disabled={!canEditProjects}
                className={cn(
                  "font-bold border-amber-300 hover:bg-amber-50 dark:border-amber-900/40 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-sm",
                  stage.publicLinkClosed && "border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                )}
              >
                {stage.publicLinkClosed ? (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Reabrir Link Público
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Fechar Link Público
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Resumo Rápido da Compatibilidade */}
        {workstations.length > 0 && (
          <div className="flex gap-2.5 items-center">
            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200">
              {stationsOkCount} Estações OK
            </Badge>
            {stationsFailCount > 0 && (
              <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 animate-pulse">
                {stationsFailCount} Incompatíveis
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-sky-600 flex items-center gap-2">
          <ServerIcon className="h-3.5 w-3.5" />
          Status Servidor
        </Label>
        <Select
          value={stage.serverStatus || ""}
          onValueChange={(v) => onUpdate({ serverStatus: v as StatusType })}
          disabled={!canEditProjects}
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.serverStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
              stage.serverStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50",
              stage.serverStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
              stage.serverStatus === "Aguardando Adequação" &&
              "bg-gray-50 text-gray-800 border-gray-300 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800/60",
            )}
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 dark:text-emerald-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 dark:text-orange-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 dark:text-red-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 dark:text-slate-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-teal-600 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500" />
          Status Estações
        </Label>
        <Select
          value={stage.workstationsStatus || ""}
          onValueChange={(v) =>
            onUpdate({ workstationsStatus: v as StatusType })
          }
          disabled={!canEditProjects}
        >
          <SelectTrigger
            className={cn(
              "h-11 border-2 font-medium transition-all",
              stage.workstationsStatus === "Adequado" &&
              "bg-green-50 text-green-800 border-green-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
              stage.workstationsStatus === "Parcialmente Adequado" &&
              "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50",
              stage.workstationsStatus === "Inadequado" &&
              "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
              stage.workstationsStatus === "Aguardando Adequação" &&
              "bg-gray-50 text-gray-800 border-gray-300 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800/60",
            )}
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 dark:text-emerald-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 dark:text-orange-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 dark:text-red-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 dark:text-slate-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-purple-600 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          Qtd. de Estações
        </Label>
        <Input
          type="number"
          value={workstationsCount}
          onChange={(e) =>
            onUpdate({
              workstationsCount: parseInt(e.target.value) || 0,
            })
          }
          disabled={!canEditProjects}
          className="h-11 border-2 border-purple-200 hover:border-purple-300 focus:border-purple-400 bg-purple-50/50 dark:border-purple-900/50 dark:hover:border-purple-800 dark:focus:border-purple-600 dark:bg-purple-950/20 dark:text-purple-300 font-medium"
        />
      </div>

      {/* -------------------------------------------------------------
          ABAS DE DETALHES DE INFRAESTRUTURA (COL-SPAN-FULL)
          ------------------------------------------------------------- */}
      <div className="col-span-full border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-4">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="bg-slate-100/80 dark:bg-slate-950/40 p-1 border dark:border-slate-800/60 rounded-lg flex flex-wrap h-auto gap-1">
            <TabsTrigger 
              value="geral" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-2.5 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="servidores" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-2.5 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-2"
            >
              <ServerIcon className="h-4 w-4" />
              Servidores ({servers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="estacoes" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-2.5 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-2"
            >
              <Laptop className="h-4 w-4" />
              Estações ({workstations.length})
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-2.5 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Manual Técnico
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VISÃO GERAL */}
          <TabsContent value="geral" className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Servidor(es)
                    <ServerIcon className="h-4 w-4 text-sky-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {servers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{servers.length} Servidor(es)</div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={cn(serversFailCount > 0 ? "bg-red-50 text-red-700 dark:bg-red-950/20" : "bg-green-50 text-green-700 dark:bg-emerald-950/20")}>
                          {serversOkCount} OK
                        </Badge>
                        {serversFailCount > 0 && (
                          <Badge variant="destructive">{serversFailCount} Avisos</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Estações Cadastradas
                    <Laptop className="h-4 w-4 text-purple-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workstations.length} / {workstationsCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Computadores identificados de acordo com a quantidade total declarada.</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Compatibilidade Estações
                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workstations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados de estações</p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${(stationsOkCount / workstations.length) * 100}%` }}
                        />
                        <div 
                          className="bg-rose-500 h-full transition-all duration-300"
                          style={{ width: `${(stationsFailCount / workstations.length) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-semibold mt-1">
                        <span className="text-emerald-600 dark:text-emerald-400">{stationsOkCount} OK ({( (stationsOkCount / workstations.length) * 100 ).toFixed(0)}%)</span>
                        <span className="text-rose-600 dark:text-rose-400">{stationsFailCount} Inc ({( (stationsFailCount / workstations.length) * 100 ).toFixed(0)}%)</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 p-4 rounded-xl space-y-3">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-500" />
                Notas Técnicas e Observações
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Servidor em Uso Atual</Label>
                  <Input 
                    value={stage.serverInUse || ""} 
                    onChange={e => onUpdate({ serverInUse: e.target.value })}
                    placeholder="Ex: Servidor HP ProLiant antigo, Xeon 4 cores, 16GB"
                    disabled={!canEditProjects}
                    className="border-slate-200 dark:border-slate-800/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Servidor Necessário/Cotado</Label>
                  <Input 
                    value={stage.serverNeeded || ""} 
                    onChange={e => onUpdate({ serverNeeded: e.target.value })}
                    placeholder="Ex: Novo Servidor Dell PowerEdge T350 cotado comercialmente"
                    disabled={!canEditProjects}
                    className="border-slate-200 dark:border-slate-800/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Notas de Viabilidade e Parecer Técnico</Label>
                <Textarea 
                  value={stage.technicalNotes || ""} 
                  onChange={e => onUpdate({ technicalNotes: e.target.value })}
                  placeholder="Descreva detalhes da viabilidade da infraestrutura, bloqueios específicos encontrados, se há necessidade de upgrades rápidos..."
                  disabled={!canEditProjects}
                  rows={3}
                  className="border-slate-200 dark:border-slate-800/60"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SERVIDORES */}
          <TabsContent value="servidores" className="pt-4 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex gap-2">
                {/* File input invisível para importar txt do servidor */}
                <input 
                  type="file" 
                  ref={serverFileInputRef} 
                  onChange={handleServerFileImport} 
                  accept=".txt" 
                  className="hidden" 
                />
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEditProjects}
                  onClick={() => serverFileInputRef.current?.click()}
                  className="text-xs font-bold border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900/40 dark:hover:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400"
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Importar de TXT (info-system)
                </Button>
              </div>

              <Button 
                type="button"
                size="sm"
                disabled={!canEditProjects}
                onClick={addServer}
                className="bg-[hsl(346,84%)] bg-gradient-to-r from-[hsl(346,84%,45%)] to-[hsl(346,84%,55%)] hover:opacity-90 text-white font-bold"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar Servidor
              </Button>
            </div>

            {servers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-xl bg-slate-50/30 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/60">
                <ServerIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">Nenhum servidor cadastrado nesta etapa.</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione manualmente ou importe do script PowerShell.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {servers.map((srv, idx) => {
                  const validation = checkServerRequirements(srv, workstationsCount);
                  return (
                    <Card key={idx} className="border dark:border-slate-800/80 shadow-sm relative overflow-hidden bg-card/65">
                      {/* Indicador lateral de status de compatibilidade */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", validation.meets ? "bg-emerald-500" : "bg-rose-500")} />
                      
                      <CardHeader className="py-3 px-5 flex flex-row items-center justify-between border-b dark:border-slate-800/50">
                        <div className="flex items-center gap-2">
                          <ServerIcon className="h-4.5 w-4.5 text-slate-400" />
                          <CardTitle className="text-sm font-bold tracking-tight">
                            {srv.hostname || `SERVIDOR ${idx + 1}`}
                          </CardTitle>
                          <Badge variant="outline" className={cn("text-xxs px-2 py-0.5", validation.meets ? "bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20" : "bg-rose-50/50 text-rose-700 dark:bg-rose-950/20")}>
                            {validation.meets ? "Requisitos OK" : "Incompatível"}
                          </Badge>
                        </div>
                        {canEditProjects && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteServer(idx)}
                            className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Hostname</Label>
                            <Input 
                              value={srv.hostname || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].hostname = e.target.value;
                                handleServersChange(list);
                              }}
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Marca/Modelo</Label>
                            <Input 
                              value={srv.brandModel || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].brandModel = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Dell T340"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Virtualizado?</Label>
                            <Select
                              value={srv.virtualized === true || srv.virtualized === "Sim" ? "Sim" : "Não"}
                              onValueChange={v => {
                                const list = [...servers];
                                list[idx].virtualized = v as "Sim" | "Não";
                                handleServersChange(list);
                              }}
                              disabled={!canEditProjects}
                            >
                              <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Processador</Label>
                            <Input 
                              value={srv.processor || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].processor = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Intel Xeon E5-2620"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Núcleos</Label>
                            <Input 
                              value={srv.cores || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].cores = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 6"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Memória RAM</Label>
                            <Input 
                              value={srv.memory || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].memory = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 32 GB"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Disco (Armazenamento)</Label>
                            <Input 
                              value={srv.disk || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].disk = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 2 TB SAS RAID 1"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Espaço para o Orion</Label>
                            <Input 
                              value={srv.spaceOrion || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].spaceOrion = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 500 GB"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Sistema Operacional</Label>
                            <Input 
                              value={srv.os || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].os = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Windows Server 2022"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Anti-Vírus</Label>
                            <Input 
                              value={srv.antivirus || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].antivirus = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Bitdefender"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Rede</Label>
                            <Input 
                              value={srv.network || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].network = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 1000 Mbps"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Backup</Label>
                            <Input 
                              value={srv.backup || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].backup = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Nuvem + HD Externo"
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-4">
                            <Label className="text-xxs font-bold uppercase tracking-wider text-muted-foreground">Observações</Label>
                            <Input 
                              value={srv.observations || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].observations = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Detalhes adicionais..."
                              disabled={!canEditProjects}
                              className="h-9 border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                        </div>

                        {/* Listar erros ou avisos se existirem */}
                        {validation.issues.length > 0 && (
                          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                            <div className="text-xs text-rose-800 dark:text-rose-300">
                              <p className="font-bold mb-1">Alertas de Compatibilidade:</p>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {validation.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: ESTAÇÕES */}
          <TabsContent value="estacoes" className="pt-4 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex flex-wrap gap-2">
                {/* File Input invisível para lote de TXT */}
                <input 
                  type="file" 
                  ref={workstationFileInputRef} 
                  onChange={handleWorkstationFilesImport} 
                  accept=".txt" 
                  multiple 
                  className="hidden" 
                />
                
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEditProjects}
                  onClick={() => workstationFileInputRef.current?.click()}
                  className="text-xs font-bold border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900/40 dark:hover:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Importar TXT(s) (Lote)
                </Button>

                <Dialog open={excelImportOpen} onOpenChange={setExcelImportOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEditProjects}
                      className="text-xs font-bold border-green-300 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-950/20 text-green-700 dark:text-emerald-400"
                    >
                      <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                      Importar do Excel (Páginas)
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Importar Estações do Excel</DialogTitle>
                      <DialogDescription>
                        Copie as linhas da tabela de estações no Excel (incluindo as colunas Item, Hostname, Setor...) e cole-as na caixa abaixo:
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea 
                      value={excelText}
                      onChange={e => setExcelText(e.target.value)}
                      placeholder="Cole aqui (ex: 1	DANI	ADM	Daniela...)"
                      rows={10}
                      className="font-mono text-xs border-slate-200 dark:border-slate-800/80"
                    />
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setExcelText("")}>Limpar</Button>
                      <Button size="sm" onClick={handleExcelImport} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Importar Dados</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={runAutoValidateAll}
                  disabled={workstations.length === 0 || !canEditProjects}
                  className="text-xs font-bold border-violet-300 hover:bg-violet-50 dark:border-violet-900/40 dark:hover:bg-violet-950/20 text-violet-700 dark:text-violet-400"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Auto-Validar Requisitos
                </Button>
              </div>

              <Button 
                type="button"
                size="sm"
                disabled={!canEditProjects}
                onClick={addWorkstation}
                className="bg-[hsl(346,84%)] bg-gradient-to-r from-[hsl(346,84%,45%)] to-[hsl(346,84%,55%)] hover:opacity-90 text-white font-bold"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar Estação
              </Button>
            </div>

            {/* Drag & Drop Area */}
            {canEditProjects && (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-4 text-center text-xs transition-colors cursor-pointer",
                  dragOver 
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400" 
                    : "border-slate-200 dark:border-slate-800/60 hover:bg-slate-50/40 dark:hover:bg-slate-900/10"
                )}
              >
                <ClipboardList className="mx-auto h-5 w-5 text-slate-400 mb-1.5" />
                Arrastar e soltar múltiplos arquivos **.txt** coletados das estações aqui para importar de uma vez!
              </div>
            )}

            {workstations.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-xl bg-slate-50/30 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/60">
                <Laptop className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">Nenhuma estação cadastrada.</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione uma estação ou use as opções de importação acima.</p>
              </div>
            ) : (
              <div className="border dark:border-slate-800/60 rounded-xl overflow-x-auto shadow-sm bg-card">
                <Table className="w-full table-fixed border-collapse">
                  <TableHeader className="bg-slate-50/60 dark:bg-slate-950/20">
                    <TableRow className="h-9">
                      <TableHead className="w-[35px] font-bold text-center text-[10.5px] px-1 py-1">Item</TableHead>
                      <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1">Hostname</TableHead>
                      <TableHead className="w-[9%] font-bold text-[10.5px] px-2 py-1">Setor</TableHead>
                      <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1">Usuário</TableHead>
                      <TableHead className="w-[22%] font-bold text-[10.5px] px-2 py-1">Processador / Geração</TableHead>
                      <TableHead className="w-[6%] font-bold text-center text-[10.5px] px-2 py-1">RAM</TableHead>
                      <TableHead className="w-[21%] font-bold text-[10.5px] px-2 py-1">Disco (Espaço Livre)</TableHead>
                      <TableHead className="w-[13%] font-bold text-[10.5px] px-2 py-1">S.O.</TableHead>
                      <TableHead className="w-[7%] font-bold text-[10.5px] px-2 py-1">Atende?</TableHead>
                      <TableHead className="w-[35px] px-1 py-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workstations.map((ws, idx) => {
                      const validation = checkWorkstationRequirements(ws);
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 h-auto">
                          {/* Item / ID */}
                          <TableCell className="font-semibold text-slate-500 text-center py-1.5 px-1 text-[10.5px]">
                            {idx + 1}
                          </TableCell>

                          {/* Hostname */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.hostname || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].hostname = val;
                                handleWorkstationsChange(list);
                              }}
                              disabled={!canEditProjects}
                              placeholder="Hostname"
                            />
                          </TableCell>

                          {/* Setor */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.sector || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].sector = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="Ex: Balcão"
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Usuário */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.user || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].user = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="Usuário"
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Processador & Geração */}
                          <TableCell className="p-0.5">
                            <div className="flex flex-col gap-0.5">
                              <EditableCell
                                value={ws.processor || ""}
                                onChange={val => {
                                  const list = [...workstations];
                                  list[idx].processor = val;
                                  list[idx].generation = extractGeneration(val);
                                  handleWorkstationsChange(list);
                                }}
                                placeholder="Processador"
                                disabled={!canEditProjects}
                                className="font-medium"
                              />
                              <div className="pl-1.5 flex items-center">
                                <span className="text-[9px] text-muted-foreground mr-1 select-none font-bold uppercase tracking-wider">Geração:</span>
                                <div className="flex-1">
                                  <EditableCell
                                    value={ws.generation || ""}
                                    onChange={val => {
                                      const list = [...workstations];
                                      list[idx].generation = val;
                                      handleWorkstationsChange(list);
                                    }}
                                    placeholder="8ª Geração"
                                    disabled={!canEditProjects}
                                    className="text-muted-foreground text-[10px] leading-none py-0.5 min-h-max"
                                  />
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Memória */}
                          <TableCell className="p-0.5 text-center">
                            <EditableCell
                              value={ws.memory || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].memory = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="RAM"
                              disabled={!canEditProjects}
                              className="justify-center text-center"
                            />
                          </TableCell>

                          {/* Disco */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.disk || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].disk = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="Disco"
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Sistema Operacional */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.os || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].os = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="S.O."
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Compatibilidade */}
                          <TableCell className="p-0.5">
                            <div className="flex items-center gap-1">
                              <Select
                                value={ws.meetsRequirements || ""}
                                onValueChange={v => {
                                  const list = [...workstations];
                                  list[idx].meetsRequirements = v as "Sim" | "Não";
                                  handleWorkstationsChange(list);
                                }}
                                disabled={!canEditProjects}
                              >
                                <SelectTrigger className={cn("h-7 text-[10px] font-semibold w-full border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 bg-transparent focus:bg-white dark:focus:bg-slate-900 transition-all px-1.5",
                                  ws.meetsRequirements === "Sim" && "text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300",
                                  ws.meetsRequirements === "Não" && "text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 border-rose-300"
                                )}>
                                  <SelectValue placeholder="..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sim">Sim</SelectItem>
                                  <SelectItem value="Não">Não</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Mostrar popover de erros caso seja inadequado */}
                              {validation.issues.length > 0 && ws.meetsRequirements === "Não" && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full shrink-0">
                                      <HelpCircle className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Problemas Encontrados: {ws.hostname || `Estação ${idx + 1}`}</DialogTitle>
                                    </DialogHeader>
                                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                                      {validation.issues.map((iss, i) => (
                                        <li key={i}>{iss}</li>
                                      ))}
                                    </ul>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>

                          {/* Botão de Deletar */}
                          <TableCell className="p-0.5 text-center">
                            {canEditProjects && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteWorkstation(idx)}
                                className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: MANUAL TÉCNICO */}
          <TabsContent value="manual" className="pt-4 space-y-4">
            <Card className="border dark:border-slate-800/60 shadow-sm bg-card">
              <CardHeader className="border-b dark:border-b-slate-800/50 bg-slate-50/50 dark:bg-slate-950/15">
                <CardTitle className="text-md font-bold tracking-tight text-slate-800 dark:text-slate-200">
                  Manual de Compatibilidade do Cartório (Orion TN / PRO)
                </CardTitle>
                <CardDescription>
                  Especificações de infraestrutura recomendadas de acordo com as diretrizes da Siplan.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-sm text-[hsl(346,84%,45%)] mb-2 flex items-center gap-1.5">
                    <ServerIcon className="h-4.5 w-4.5" />
                    Requisitos dos Servidores (Minimos e Recomendados)
                  </h4>
                  <div className="border dark:border-slate-800/60 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/60 dark:bg-slate-950/20">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Quantidade de Estações</TableHead>
                          <TableHead className="font-bold text-xs">Requisitos Mínimos (SATA/Virtualizado)</TableHead>
                          <TableHead className="font-bold text-xs">Requisitos Recomendados (SSD/Físico)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        <TableRow>
                          <TableCell className="font-semibold">Até 5 Estações</TableCell>
                          <TableCell>Proc: 4 núcleos | RAM: 20GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 6 núcleos dedicados | RAM: 24GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Até 15 Estações</TableCell>
                          <TableCell>Proc: 4 núcleos | RAM: 24GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 8 núcleos dedicados | RAM: 32GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Até 25 Estações</TableCell>
                          <TableCell>Proc: 6 núcleos | RAM: 32GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 8 núcleos dedicados | RAM: 48GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Acima de 25 Estações</TableCell>
                          <TableCell>Proc: 6 núcleos | RAM: 48GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 12 núcleos dedicados | RAM: 64GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-sm text-[hsl(346,84%,45%)] mb-2 flex items-center gap-1.5">
                      <Laptop className="h-4.5 w-4.5" />
                      Requisitos das Estações
                    </h4>
                    <div className="border dark:border-slate-800/60 rounded-lg p-4 bg-slate-50/40 dark:bg-slate-950/10 space-y-2 text-xs">
                      <p><strong>Processador:</strong> Intel Core i3 6ª Ger + / AMD Ryzen 3 (Mínimo) | Intel Core i5 8ª Ger + / AMD Ryzen 5 (Recomendado)</p>
                      <p><strong>Memória RAM:</strong> 4 GB para estações comuns | 8 GB para Balcão de Firmas (Recomendado Dual-Channel)</p>
                      <p><strong>Disco:</strong> 7200 RPM SATA com 10GB livres (Mínimo) | SSD com 10GB livres (Recomendado)</p>
                      <p><strong>S.O.:</strong> Windows 10 Pro / Windows 11 Pro 64-bits</p>
                      <p><strong>Rede:</strong> Cabeada 100/1000 Mbps (Velocidade alinhada ao servidor. Wi-Fi não suportada)</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[hsl(346,84%,45%)] mb-2 flex items-center gap-1.5">
                      <ClipboardList className="h-4.5 w-4.5" />
                      Recomendações de Rede & Segurança
                    </h4>
                    <div className="border dark:border-slate-800/60 rounded-lg p-4 bg-slate-50/40 dark:bg-slate-950/10 space-y-2 text-xs">
                      <p><strong>Redes Sem Fio (Wi-Fi):</strong> A Siplan alerta para a **NÃO utilização de Wi-Fi** nas estações de processamento dos softwares, por conta de lentidão no tráfego de imagens e instabilidade.</p>
                      <p><strong>Anti-Vírus:</strong> Recomenda-se soluções corporativas com gerenciamento centralizado (ex: Bitdefender Corporate).</p>
                      <p><strong>Nobreak:</strong> Gerenciável e adequado para desligar automaticamente o servidor em faltas de energia.</p>
                      <p><strong>Backup:</strong> Duas rotinas: backup de banco de dados e backup completo (SQL + arquivos/imagens) em local físico secundário e em nuvem.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
