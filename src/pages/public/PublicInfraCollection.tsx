import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Server as ServerIcon,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Activity,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  Building,
  Check,
  XCircle,
  HelpCircle,
  Clock,
  Download
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
  extractGeneration,
  checkWorkstationRequirements,
  checkServerRequirements,
  parseMachineInfo,
  parseExcelPastedText,
} from "@/utils/infra-validation";
import { ServerInfo, WorkstationInfo } from "@/types/ProjectV2";

// -------------------------------------------------------------
// LOCAL EDITABLE CELL COMPONENT FOR PUBLIC WORKSTATIONS TABLE
// -------------------------------------------------------------
interface EditableCellProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

function EditableCell({ value, onChange, placeholder, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

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
        className={cn("h-7 text-[10.5px] px-1.5 w-full bg-slate-900 border-slate-700 text-white", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "text-[10.5px] px-1.5 py-1 break-all cursor-pointer hover:bg-slate-800 rounded min-h-7 flex items-center transition-colors w-full whitespace-pre-wrap leading-tight text-slate-300",
        !value && "text-slate-500/50 italic",
        className
      )}
    >
      {value || <span className="text-slate-500/50 italic">{placeholder || "-"}</span>}
    </div>
  );
}

// -------------------------------------------------------------
// MAIN PUBLIC PAGE COMPONENT
// -------------------------------------------------------------
export default function PublicInfraCollection() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const serverFileInputRef = useRef<HTMLInputElement>(null);
  const workstationFileInputRef = useRef<HTMLInputElement>(null);

  // Force dark mode on document element for clean dark styling and scrollbars
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    if (!hadDark) {
      html.classList.add("dark");
    }

    // Set custom dark scrollbars for this page
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      html.dark::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      html.dark::-webkit-scrollbar-track {
        background: #060608;
      }
      html.dark::-webkit-scrollbar-thumb {
        background: #1e1e24;
        border-radius: 5px;
        border: 2px solid #060608;
      }
      html.dark::-webkit-scrollbar-thumb:hover {
        background: #2d2d39;
      }
      html.dark {
        scrollbar-color: #1e1e24 #060608;
        scrollbar-width: thin;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      if (!hadDark) {
        html.classList.remove("dark");
      }
      document.head.removeChild(styleEl);
    };
  }, []);

  // Fetch project details using public RPC
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["publicProjectInfo", id],
    queryFn: async () => {
      if (!id) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_project_public_info", { p_id: id });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // State local for workstations and servers
  const [workstations, setWorkstations] = useState<WorkstationInfo[]>([]);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [workstationsCount, setWorkstationsCount] = useState<number>(0);

  // Synchronize internal state when query finishes loading
  useEffect(() => {
    if (project) {
      setWorkstations(project.infra_workstations || []);
      setServers(project.infra_servers || []);
      setWorkstationsCount(project.infra_workstations_count || (project.infra_workstations || []).length || 0);
    }
  }, [project]);

  // Save/Upload Changes Handlers
  const handleWorkstationsChange = (newStations: WorkstationInfo[]) => {
    setWorkstations(newStations);
    setWorkstationsCount(newStations.length);
  };

  const handleServersChange = (newServers: ServerInfo[]) => {
    setServers(newServers);
  };

  // Add Item Helpers
  const addServer = () => {
    setServers([...servers, {
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
    }]);
  };

  const deleteServer = (idx: number) => {
    setServers(servers.filter((_, i) => i !== idx));
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
    handleWorkstationsChange(workstations.filter((_, i) => i !== idx));
  };

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
      title: "Validação Dinâmica Concluída",
      description: "Todos os requisitos foram recalculados!",
    });
  };

  // Files Imports
  const handleServerFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const parsed = parseMachineInfo(content);
      const newServers = [...servers];
      
      if (newServers.length === 0) {
        newServers.push({
          hostname: parsed.hostname,
          processor: parsed.processor,
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os,
          virtualized: "Não"
        });
      } else {
        newServers[0] = {
          ...newServers[0],
          hostname: parsed.hostname,
          processor: parsed.processor,
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os
        };
      }

      handleServersChange(newServers);
      toast({
        title: "Servidor Carregado",
        description: `Os dados do arquivo foram importados para o servidor ${parsed.hostname}!`,
        className: "bg-green-500 text-white border-green-600",
      });
    };
    reader.readAsText(file);
    if (serverFileInputRef.current) serverFileInputRef.current.value = "";
  };

  const handleWorkstationFilesImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const totalFiles = files.length;
    let loadedCount = 0;
    const newStations: WorkstationInfo[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) return;

        try {
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

          if (loadedCount === totalFiles) {
            handleWorkstationsChange([...workstations, ...newStations]);
            toast({
              title: "Estações Carregadas",
              description: `Lote de ${newStations.length} estações importado com sucesso!`,
              className: "bg-green-500 text-white border-green-600",
            });
          }
        } catch (err) {
          console.error("Erro ao analisar arquivo:", err);
        }
      };

      reader.readAsText(file);
    });

    if (workstationFileInputRef.current) workstationFileInputRef.current.value = "";
  };

  const handleExcelImport = () => {
    if (!excelText.trim()) return;
    try {
      const parsed = parseExcelPastedText(excelText);
      if (parsed.length === 0) {
        toast({
          title: "Erro de formato",
          description: "Nenhuma linha válida identificada no texto colado.",
          variant: "destructive"
        });
        return;
      }
      
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
        title: "Importação do Excel Concluída",
        description: `${validated.length} estações foram importadas com sucesso!`,
        className: "bg-green-500 text-white border-green-600",
      });
    } catch (e) {
      toast({
        title: "Erro ao importar",
        description: "Falha ao processar texto colado. Verifique se copiou a tabela inteira.",
        variant: "destructive"
      });
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const txtFiles = Array.from(files).filter(f => f.name.endsWith(".txt"));
    if (txtFiles.length === 0) {
      toast({
        title: "Formato incorreto",
        description: "Selecione apenas arquivos .txt gerados pelo info-system.ps1.",
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
            title: "Importação bem-sucedida",
            description: `${newStations.length} estações importadas via arrastar e soltar!`,
            className: "bg-green-500 text-white border-green-600",
          });
        }
      };
      reader.readAsText(file);
    });
  };

  // Submit Final
  const handleSubmitData = async () => {
    if (workstations.length === 0 && servers.length === 0) {
      toast({
        title: "Formulário Vazio",
        description: "Importe ou insira ao menos uma estação ou servidor antes de enviar.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: success, error } = await (supabase.rpc as any)("update_project_public_infra", {
        p_id: id,
        p_workstations: workstations,
        p_servers: servers,
        p_workstations_count: workstationsCount
      });

      if (error) throw error;

      if (success) {
        setSubmittedSuccess(true);
        toast({
          title: "Envio Concluído!",
          description: "As informações da sua infraestrutura foram salvas no Siplan HUB com sucesso.",
          className: "bg-emerald-600 text-white border-emerald-700",
        });
      } else {
        throw new Error("Falha ao salvar informações.");
      }
    } catch (e) {
      toast({
        title: "Erro ao Enviar",
        description: "Ocorreu um erro ao persistir as informações no banco de dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const stationsOkCount = workstations.filter(w => w.meetsRequirements === "Sim").length;
  const stationsFailCount = workstations.filter(w => w.meetsRequirements === "Não").length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060608] text-white flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 text-[hsl(346,84%,45%)] animate-pulse" />
          <p className="text-sm text-slate-400 font-medium animate-pulse">Carregando painel de coleta...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full bg-[#0d0d12] border-slate-800/80 shadow-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/40 text-red-400 flex items-center justify-center border border-red-900/50 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Link de Coleta Expirado ou Inválido</h2>
            <p className="text-sm text-slate-400">
              O link de coleta que você está acessando não existe ou o projeto foi arquivado pelo cartório. 
              Por favor, solicite um novo link ao implantador técnico da Siplan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-[#060608] text-white flex items-center justify-center p-6">
        <Card className="max-w-lg w-full bg-[#0d0d12] border-slate-800/80 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-950/40 flex items-center justify-center text-emerald-400 border border-emerald-900/50 mb-4">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Coleta de Infraestrutura Concluída!</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Obrigado! O inventário dos seus equipamentos (servidores e estações) foi transmitido com sucesso ao time de implantação da Siplan.
            </p>
            <p className="text-xs text-slate-500 bg-slate-900/80 p-3 rounded-lg border border-slate-800/60 leading-relaxed">
              A análise dinâmica dos requisitos foi salva no Siplan HUB. Nosso time técnico revisará os dados e informará sobre quaisquer adequações necessárias.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white pb-24 selection:bg-[hsl(346,84%,45%)]/20 selection:text-[hsl(346,84%,45%)] relative overflow-x-hidden font-sans">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[hsl(346,84%,45%)]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-[#060608]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/Siplan_logo_branco.png" alt="Siplan" className="h-7 w-auto object-contain opacity-90" />
            <div className="h-4 w-px bg-slate-800 mx-2" />
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Inventário Técnico
            </span>
          </div>
          <Badge className="bg-[hsl(346,84%,45%)]/10 text-[hsl(346,84%,45%)] border border-[hsl(346,84%,45%)]/20 text-xs font-semibold px-3 py-0.5">
            Cartório Parceiro
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-6 relative z-10">
        
        {/* Intro Banner */}
        <Card className="bg-gradient-to-br from-[#0c0c11] to-[#0a0a0f] border-slate-800/80 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[hsl(346,84%,45%)] to-red-600" />
          <CardHeader className="pt-8 px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
                  <Building className="h-6 w-6 text-[hsl(346,84%,45%)]" />
                  {project.client_name || "Cartório"}
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-1 leading-relaxed max-w-2xl">
                  Olá! Esta página pública permite que você, técnico ou responsável pela TI, envie diretamente os arquivos gerados pelo script PowerShell do inventário da Siplan. Ao fazer o envio, os dados serão importados automaticamente no Siplan HUB para a análise de infraestrutura da serventia.
                </CardDescription>
              </div>

              {/* Status Indicator */}
              <div className="bg-[#12121b] border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3 shrink-0">
                <Clock className="h-5 w-5 text-indigo-400" />
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Sistema Pretendido</span>
                  <span className="text-sm font-semibold text-white">{project.system_type || "Orion TN"}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Upload Zone & Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Instalação e Execução */}
          <Card className="bg-[#0b0b0f] border-slate-900 shadow-sm col-span-1 p-6 space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              1. Coletar os Dados
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Baixe e execute o script coletor PowerShell (**info-system.ps1**) em seu servidor e em cada estação de trabalho do cartório.
            </p>
            <Button
              asChild
              className="w-full bg-[hsl(346,84%,45%)] hover:bg-[hsl(346,84%,40%)] text-white font-bold h-9 text-xs gap-2 shadow-md transition-all duration-200"
            >
              <a href="/info-system.ps1" download="info-system.ps1">
                <Download className="h-4 w-4" />
                Baixar Script Coletor (.ps1)
              </a>
            </Button>
            <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-400">
              <p><strong>Como rodar o script:</strong></p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Clique com o botão direito no script.</li>
                <li>Selecione <strong>"Executar com o PowerShell"</strong>.</li>
                <li>Digite o Setor correspondente quando solicitado.</li>
                <li>Ele criará o arquivo **info_maquina.txt** na mesma pasta.</li>
              </ol>
            </div>
          </Card>

          {/* Card 2: Upload Files */}
          <Card className="bg-[#0b0b0f] border-slate-900 shadow-sm col-span-2 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                2. Enviar Arquivos de Coleta (.txt)
              </h3>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center text-xs transition-all cursor-pointer relative",
                  dragOver 
                    ? "border-emerald-500 bg-emerald-950/20 text-emerald-300" 
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/30"
                )}
              >
                <input 
                  type="file" 
                  ref={workstationFileInputRef} 
                  onChange={handleWorkstationFilesImport} 
                  accept=".txt" 
                  multiple 
                  className="hidden" 
                />
                <input 
                  type="file" 
                  ref={serverFileInputRef} 
                  onChange={handleServerFileImport} 
                  accept=".txt" 
                  className="hidden" 
                />

                <ClipboardList className="mx-auto h-8 w-8 text-slate-500 mb-3" />
                
                <p className="font-semibold text-slate-300 mb-1">Arrastar e Soltar arquivos .txt aqui</p>
                <p className="text-slate-500 text-[11px] mb-4">Envie de uma vez só os relatórios das estações e servidores</p>
                
                <div className="flex gap-2.5 justify-center">
                  <Button 
                    type="button"
                    size="sm"
                    onClick={() => workstationFileInputRef.current?.click()}
                    className="h-8 text-xs font-bold border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white shadow-md"
                  >
                    Selecionar Estações (.txt)
                  </Button>
                  <Button 
                    type="button"
                    size="sm"
                    onClick={() => serverFileInputRef.current?.click()}
                    className="h-8 text-xs font-bold border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white shadow-md"
                  >
                    Selecionar Servidor (.txt)
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Dialog open={excelImportOpen} onOpenChange={setExcelImportOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                    Colar Dados do Excel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl bg-[#0b0b0f] border-slate-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Importar do Excel</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Copie as linhas da sua tabela e cole no campo de texto abaixo:
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea 
                    value={excelText}
                    onChange={e => setExcelText(e.target.value)}
                    placeholder="Cole aqui as colunas (Item, Hostname, Setor...)"
                    rows={10}
                    className="font-mono text-xs bg-slate-950 border-slate-800 text-slate-300"
                  />
                  <DialogFooter>
                    <Button variant="outline" size="sm" className="border-slate-800" onClick={() => setExcelText("")}>Limpar</Button>
                    <Button size="sm" onClick={handleExcelImport} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Processar Colagem</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

        </div>

        {/* Servers Title */}
        {servers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
              <ServerIcon className="h-4.5 w-4.5 text-indigo-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Servidores para Conferência ({servers.length})</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servers.map((srv, idx) => {
                const validation = checkServerRequirements(srv, workstationsCount);
                return (
                  <Card key={idx} className="border-slate-900 shadow-sm relative overflow-hidden bg-[#0a0a0e]/50">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", validation.meets ? "bg-emerald-500" : "bg-rose-500")} />
                    
                    <CardHeader className="py-3 px-5 flex flex-row items-center justify-between border-b border-slate-900/60 bg-slate-950/20">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-4 w-4 text-slate-400" />
                        <CardTitle className="text-xs font-bold text-slate-200">
                          {srv.hostname || `SERVIDOR ${idx + 1}`}
                        </CardTitle>
                        <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5", validation.meets ? "bg-emerald-950/20 text-emerald-400 border-emerald-800" : "bg-rose-950/20 text-rose-400 border-rose-800")}>
                          {validation.meets ? "Requisitos Satisfeitos" : "Compatibilidade com Alertas"}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteServer(idx)}
                        className="h-6 w-6 text-rose-400 hover:text-rose-500 hover:bg-rose-950/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hostname</span>
                        <Input 
                          value={srv.hostname || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].hostname = e.target.value;
                            handleServersChange(list);
                          }}
                          className="h-8 text-xs bg-slate-900/60 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Processador</span>
                        <Input 
                          value={srv.processor || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].processor = e.target.value;
                            handleServersChange(list);
                          }}
                          className="h-8 text-xs bg-slate-900/60 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Memória RAM</span>
                        <Input 
                          value={srv.memory || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].memory = e.target.value;
                            handleServersChange(list);
                          }}
                          className="h-8 text-xs bg-slate-900/60 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Disco</span>
                        <Input 
                          value={srv.disk || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].disk = e.target.value;
                            handleServersChange(list);
                          }}
                          className="h-8 text-xs bg-slate-900/60 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Windows / S.O.</span>
                        <Input 
                          value={srv.os || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].os = e.target.value;
                            handleServersChange(list);
                          }}
                          className="h-8 text-xs bg-slate-900/60 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Virtualizado?</span>
                        <Input 
                          value={srv.virtualized || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].virtualized = e.target.value;
                            handleServersChange(list);
                          }}
                          className="h-8 text-xs bg-slate-900/60 border-slate-800 text-white"
                        />
                      </div>

                      {validation.issues.length > 0 && (
                        <div className="col-span-full mt-2 p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                          <div className="text-[10px] text-rose-300 leading-normal">
                            <p className="font-bold">Avisos do Servidor:</p>
                            <ul className="list-disc pl-3">
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
          </div>
        )}

        {/* Workstations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Laptop className="h-4.5 w-4.5 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Estações de Trabalho ({workstations.length})</h2>
            </div>

            <div className="flex gap-2">
              {workstations.length > 0 && (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={runAutoValidateAll}
                    className="h-8 text-xs border-slate-800 hover:bg-slate-900 text-slate-300"
                  >
                    Recalcular Requisitos
                  </Button>
                  <div className="hidden sm:flex gap-1.5 items-center px-3 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 bg-slate-900/20">
                    <span className="text-emerald-400">{stationsOkCount} OK</span>
                    <span className="text-slate-700">|</span>
                    <span className="text-rose-400">{stationsFailCount} Incompatíveis</span>
                  </div>
                </>
              )}
              <Button 
                type="button" 
                size="sm" 
                onClick={addWorkstation}
                className="h-8 text-xs bg-[hsl(346,84%,45%)] hover:opacity-90 font-bold text-white"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Estação
              </Button>
            </div>
          </div>

          {workstations.length === 0 ? (
            <div className="text-center py-10 border border-slate-900 rounded-xl bg-slate-950/20">
              <Laptop className="h-10 w-10 mx-auto text-slate-700 mb-2" />
              <p className="text-xs font-semibold text-slate-500">Nenhum computador carregado para conferência.</p>
              <p className="text-[11px] text-slate-600 mt-1">Solte arquivos na zona de upload acima.</p>
            </div>
          ) : (
            <div className="border border-slate-900 rounded-xl overflow-x-auto shadow-xl bg-[#0a0a0f]/40 backdrop-blur-md">
              <Table className="w-full table-fixed border-collapse">
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="h-9 border-b border-slate-900">
                    <TableHead className="w-[35px] font-bold text-center text-[10.5px] px-1 py-1 text-slate-400">Item</TableHead>
                    <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1 text-slate-400">Hostname</TableHead>
                    <TableHead className="w-[9%] font-bold text-[10.5px] px-2 py-1 text-slate-400">Setor</TableHead>
                    <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1 text-slate-400">Usuário</TableHead>
                    <TableHead className="w-[22%] font-bold text-[10.5px] px-2 py-1 text-slate-400">Processador / Geração</TableHead>
                    <TableHead className="w-[6%] font-bold text-center text-[10.5px] px-2 py-1 text-slate-400">RAM</TableHead>
                    <TableHead className="w-[21%] font-bold text-[10.5px] px-2 py-1 text-slate-400">Disco (Espaço Livre)</TableHead>
                    <TableHead className="w-[13%] font-bold text-[10.5px] px-2 py-1 text-slate-400">S.O.</TableHead>
                    <TableHead className="w-[7%] font-bold text-[10.5px] px-2 py-1 text-slate-400">Atende?</TableHead>
                    <TableHead className="w-[35px] px-1 py-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workstations.map((ws, idx) => {
                    const validation = checkWorkstationRequirements(ws);
                    return (
                      <TableRow key={idx} className="hover:bg-slate-900/30 border-b border-slate-900 h-auto">
                        <TableCell className="font-semibold text-slate-500 text-center py-1.5 px-1 text-[10.5px]">
                          {idx + 1}
                        </TableCell>

                        <TableCell className="p-0.5">
                          <EditableCell
                            value={ws.hostname || ""}
                            onChange={val => {
                              const list = [...workstations];
                              list[idx].hostname = val;
                              handleWorkstationsChange(list);
                            }}
                            placeholder="Hostname"
                          />
                        </TableCell>

                        <TableCell className="p-0.5">
                          <EditableCell
                            value={ws.sector || ""}
                            onChange={val => {
                              const list = [...workstations];
                              list[idx].sector = val;
                              handleWorkstationsChange(list);
                            }}
                            placeholder="Ex: Balcão"
                          />
                        </TableCell>

                        <TableCell className="p-0.5">
                          <EditableCell
                            value={ws.user || ""}
                            onChange={val => {
                              const list = [...workstations];
                              list[idx].user = val;
                              handleWorkstationsChange(list);
                            }}
                            placeholder="Usuário"
                          />
                        </TableCell>

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
                              className="font-medium"
                            />
                            <div className="pl-1.5 flex items-center">
                              <span className="text-[9px] text-slate-500 mr-1 select-none font-bold uppercase tracking-wider">Geração:</span>
                              <div className="flex-grow">
                                <EditableCell
                                  value={ws.generation || ""}
                                  onChange={val => {
                                    const list = [...workstations];
                                    list[idx].generation = val;
                                    handleWorkstationsChange(list);
                                  }}
                                  placeholder="8ª Geração"
                                  className="text-slate-400 text-[10px] leading-none py-0.5 min-h-max"
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="p-0.5 text-center">
                          <EditableCell
                            value={ws.memory || ""}
                            onChange={val => {
                              const list = [...workstations];
                              list[idx].memory = val;
                              handleWorkstationsChange(list);
                            }}
                            placeholder="RAM"
                            className="justify-center text-center text-white"
                          />
                        </TableCell>

                        <TableCell className="p-0.5">
                          <EditableCell
                            value={ws.disk || ""}
                            onChange={val => {
                              const list = [...workstations];
                              list[idx].disk = val;
                              handleWorkstationsChange(list);
                            }}
                            placeholder="Disco"
                          />
                        </TableCell>

                        <TableCell className="p-0.5">
                          <EditableCell
                            value={ws.os || ""}
                            onChange={val => {
                              const list = [...workstations];
                              list[idx].os = val;
                              handleWorkstationsChange(list);
                            }}
                            placeholder="S.O."
                          />
                        </TableCell>

                        <TableCell className="p-0.5">
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded text-center w-full shadow-sm",
                              ws.meetsRequirements === "Sim" && "bg-emerald-950/20 text-emerald-400 border border-emerald-900/50",
                              ws.meetsRequirements === "Não" && "bg-rose-950/20 text-rose-400 border border-rose-900/50",
                              !ws.meetsRequirements && "bg-slate-900 text-slate-500 border border-slate-800"
                            )}>
                              {ws.meetsRequirements || "?"}
                            </div>

                            {validation.issues.length > 0 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-full shrink-0">
                                    <HelpCircle className="h-4.5 w-4.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#0b0b0f] border-slate-800 text-white">
                                  <DialogHeader>
                                    <DialogTitle>Adequações Necessárias: {ws.hostname || `Estação ${idx + 1}`}</DialogTitle>
                                  </DialogHeader>
                                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                                    {validation.issues.map((iss, i) => (
                                      <li key={i}>{iss}</li>
                                    ))}
                                  </ul>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="p-0.5 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteWorkstation(idx)}
                            className="h-6 w-6 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex justify-between items-center bg-[#0d0d12]/60 border border-slate-900/80 p-5 rounded-2xl">
          <div className="space-y-1 text-left hidden md:block">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conclusão de Envio</span>
            <p className="text-xs text-slate-400 leading-normal">Revise as informações de hardware das estações e servidores acima e clique em Enviar.</p>
          </div>
          <Button 
            onClick={handleSubmitData}
            disabled={isSubmitting || (workstations.length === 0 && servers.length === 0)}
            className="w-full md:w-auto font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center gap-2 h-11 px-8 rounded-xl transition-all"
          >
            {isSubmitting ? (
              <Activity className="h-4 w-4 animate-pulse" />
            ) : (
              <Check className="h-4.5 w-4.5" />
            )}
            {isSubmitting ? "Gravando no Siplan HUB..." : "Confirmar e Enviar para Siplan HUB"}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>

      </main>
    </div>
  );
}
