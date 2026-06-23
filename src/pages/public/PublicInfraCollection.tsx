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
  Download,
  Lock
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        className={cn("h-7 text-[10.5px] px-1.5 w-full bg-white border-slate-200 text-slate-900 shadow-sm", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "text-[10.5px] px-1.5 py-1 break-all cursor-pointer hover:bg-slate-100 rounded min-h-7 flex items-center transition-colors w-full whitespace-pre-wrap leading-tight text-slate-700 border border-transparent hover:border-slate-200",
        !value && "text-slate-400 italic",
        className
      )}
    >
      {value || <span className="text-slate-400 italic">{placeholder || "-"}</span>}
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
  const [dragOver, setDragOver] = useState(false);

  const serverFileInputRef = useRef<HTMLInputElement>(null);
  const workstationFileInputRef = useRef<HTMLInputElement>(null);

  // Force light mode on document element for clean light styling and scrollbars
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    if (hadDark) {
      html.classList.remove("dark");
    }

    // Set custom light scrollbars for this page
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      html::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      html::-webkit-scrollbar-track {
        background: #f1f5f9;
      }
      html::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 5px;
        border: 2px solid #f1f5f9;
      }
      html::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      html {
        scrollbar-color: #cbd5e1 #f1f5f9;
        scrollbar-width: thin;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      if (hadDark) {
        html.classList.add("dark");
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
      cores: "",
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
        description: "Selecione apenas arquivos .txt gerados pelo info-system.bat.",
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

    // Calculate final status for workstations
    let calculatedWorkstationsStatus: string | null = null;
    if (workstations.length > 0) {
      const okCount = workstations.filter(w => {
        if (w.meetsRequirements === "Sim") return true;
        if (w.meetsRequirements === "Não") return false;
        return checkWorkstationRequirements(w).meets;
      }).length;
      const failCount = workstations.length - okCount;

      if (okCount === workstations.length) {
        calculatedWorkstationsStatus = "Adequado";
      } else if (failCount === workstations.length) {
        calculatedWorkstationsStatus = "Inadequado";
      } else {
        calculatedWorkstationsStatus = "Parcialmente Adequado";
      }
    }

    // Calculate final status for servers
    let calculatedServerStatus: string | null = null;
    if (servers.length > 0) {
      const okCount = servers.filter(srv => {
        return checkServerRequirements(srv, workstationsCount).meets;
      }).length;
      const failCount = servers.length - okCount;

      if (okCount === servers.length) {
        calculatedServerStatus = "Adequado";
      } else if (failCount === servers.length) {
        calculatedServerStatus = "Inadequado";
      } else {
        calculatedServerStatus = "Parcialmente Adequado";
      }
    }

    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: success, error } = await (supabase.rpc as any)("update_project_public_infra", {
        p_id: id,
        p_workstations: workstations,
        p_servers: servers,
        p_workstations_count: workstationsCount,
        p_workstations_status: calculatedWorkstationsStatus,
        p_server_status: calculatedServerStatus
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
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 text-[hsl(346,84%,45%)] animate-pulse" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Carregando painel de coleta...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full bg-white border-slate-200 shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Link de Coleta Expirado ou Inválido</h2>
            <p className="text-sm text-slate-600">
              O link de coleta que você está acessando não existe ou o projeto foi arquivado pelo cartório. 
              Por favor, solicite um novo link ao implantador técnico da Siplan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (project.infra_public_link_closed) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full bg-white border-slate-200 shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Link de Coleta Encerrado</h2>
            <p className="text-sm text-slate-600">
              Este link de coleta foi encerrado pelo implantador técnico da Siplan. 
              As informações não podem mais ser enviadas ou visualizadas através deste canal.
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
              Se precisar realizar alguma alteração ou enviar novos dados, entre em contato com o responsável pela implantação do seu projeto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full bg-white border-slate-200 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mb-4">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Coleta de Infraestrutura Concluída!</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Obrigado! O inventário dos seus equipamentos (servidores e estações) foi transmitido com sucesso ao time de implantação da Siplan.
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
              A análise dinâmica dos requisitos foi salva no Siplan HUB. Nosso time técnico revisará os dados e informará sobre quaisquer adequações necessárias.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 selection:bg-[hsl(346,84%,45%)]/10 selection:text-[hsl(346,84%,45%)] relative overflow-x-hidden font-sans">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[hsl(346,84%,45%)]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/Siplan_logo.png" alt="Siplan" className="h-7 w-auto object-contain opacity-95" />
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
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
        <Card className="bg-white border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[hsl(346,84%,45%)] to-red-600" />
          <CardHeader className="pt-8 px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
                  <Building className="h-6 w-6 text-[hsl(346,84%,45%)]" />
                  {project.client_name || "Cartório"}
                </CardTitle>
                <CardDescription className="text-slate-600 text-xs mt-1 leading-relaxed max-w-2xl">
                  Olá! Esta página pública permite que técnicos e responsáveis enviem diretamente à Siplan os arquivos gerados pelo script de coleta de informações do parque de máquinas e do servidor.
                  Após o envio, os dados serão importados automaticamente para nosso sistema, possibilitando a realização da análise da infraestrutura tecnológica da serventia de forma mais ágil e eficiente.
                </CardDescription>
              </div>

              {/* Status Indicator */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3 shrink-0">
                <Clock className="h-5 w-5 text-indigo-600" />
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sistema Pretendido</span>
                  <span className="text-sm font-semibold text-slate-900">{project.system_type || "Orion TN"}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Upload Zone & Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Instalação e Execução */}
          <Card className="bg-white border-slate-200 shadow-sm col-span-1 p-6 space-y-4">
            <h3 className="text-sm font-bold text-indigo-600 flex items-center gap-2 uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              1. Coletar os Dados
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Baixe e execute o script coletor (**info-system.bat**) em seu servidor e em cada estação de trabalho do cartório.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full bg-[hsl(346,84%,45%)] hover:bg-[hsl(346,84%,40%)] text-white font-bold h-9 text-xs gap-2 shadow-md transition-all duration-200"
              >
                <a href="/info-system.bat" download="info-system.bat">
                  <Download className="h-4 w-4" />
                  Coletor Windows (.bat)
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 font-bold h-9 text-xs gap-2 shadow-sm transition-all duration-200"
              >
                <a href="/info-linux.bat" download="info-linux.bat">
                  <Download className="h-4 w-4" />
                  Coletor Linux SSH (.bat)
                </a>
              </Button>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-600">
              <p><strong>Como rodar o script:</strong></p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Dê um duplo clique no script correspondente.</li>
                <li>Siga as instruções na tela (no Windows local, informe o Setor; no Linux remoto, forneça o IP/usuário/senha).</li>
                <li>O arquivo `.txt` gerado será salvo na mesma pasta do script.</li>
              </ol>
            </div>
          </Card>
 
          {/* Card 2: Upload Files */}
          <Card className="bg-white border-slate-200 shadow-sm col-span-1 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2 uppercase tracking-wider">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                2. Enviar Arquivos de Coleta (.txt)
              </h3>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center text-xs transition-all cursor-pointer relative",
                  dragOver 
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
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

                <ClipboardList className="mx-auto h-8 w-8 text-slate-400 mb-3" />
                
                <p className="font-semibold text-slate-700 mb-1">Arrastar e Soltar arquivos .txt aqui</p>
                <p className="text-slate-500 text-[11px] mb-4">Envie de uma vez só os relatórios das estações e servidores</p>
                
                <div className="flex gap-2.5 justify-center">
                  <Button 
                    type="button"
                    size="sm"
                    onClick={() => serverFileInputRef.current?.click()}
                    className="h-8 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                  >
                    Selecionar Servidor (.txt)
                  </Button>
                  <Button 
                    type="button"
                    size="sm"
                    onClick={() => workstationFileInputRef.current?.click()}
                    className="h-8 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                  >
                    Selecionar Estações (.txt)
                  </Button>
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Servers Title */}
        {servers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <ServerIcon className="h-4.5 w-4.5 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Servidores para Conferência ({servers.length})</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {servers.map((srv, idx) => {
                const validation = checkServerRequirements(srv, workstationsCount);
                return (
                  <Card key={idx} className="border-slate-200 shadow-sm relative overflow-hidden bg-white">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", validation.meets ? "bg-emerald-500" : "bg-rose-500")} />
                    
                    <CardHeader className="py-3 px-5 flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-4 w-4 text-slate-500" />
                        <CardTitle className="text-xs font-bold text-slate-900">
                          {srv.hostname || `SERVIDOR ${idx + 1}`}
                        </CardTitle>
                        <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5", validation.meets ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                          {validation.meets ? "Requisitos Satisfeitos" : "Compatibilidade com Alertas"}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteServer(idx)}
                        className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hostname</span>
                        <Input 
                          value={srv.hostname || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].hostname = e.target.value;
                            handleServersChange(list);
                          }}
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Marca/Modelo</span>
                        <Input 
                          value={srv.brandModel || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].brandModel = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: Dell T340"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Virtualizado?</span>
                        <Select
                          value={srv.virtualized === true || srv.virtualized === "Sim" ? "Sim" : "Não"}
                          onValueChange={v => {
                            const list = [...servers];
                            list[idx].virtualized = v as "Sim" | "Não";
                            handleServersChange(list);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-slate-900">
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Processador</span>
                        <Input 
                          value={srv.processor || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].processor = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: Intel Xeon E5-2620"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Núcleos</span>
                        <Input 
                          value={srv.cores || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].cores = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: 6"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Memória RAM</span>
                        <Input 
                          value={srv.memory || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].memory = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: 32 GB"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Disco (Armazenamento)</span>
                        <Input 
                          value={srv.disk || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].disk = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: 2 TB SAS RAID 1"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Espaço para o Orion</span>
                        <Input 
                          value={srv.spaceOrion || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].spaceOrion = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: 500 GB"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sistema Operacional</span>
                        <Input 
                          value={srv.os || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].os = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: Windows Server 2022"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Anti-Vírus</span>
                        <Input 
                          value={srv.antivirus || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].antivirus = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: Bitdefender"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rede</span>
                        <Input 
                          value={srv.network || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].network = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: 1000 Mbps"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Backup</span>
                        <Input 
                          value={srv.backup || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].backup = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Ex: Nuvem + HD Externo"
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Observações</span>
                        <Input 
                          value={srv.observations || ""} 
                          onChange={e => {
                            const list = [...servers];
                            list[idx].observations = e.target.value;
                            handleServersChange(list);
                          }}
                          placeholder="Detalhes adicionais..."
                          className="h-8 text-xs bg-white border-slate-200 text-slate-900"
                        />
                      </div>

                      {validation.issues.length > 0 && (
                        <div className="col-span-full mt-2 p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                          <div className="text-[10px] text-rose-700 leading-normal">
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
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Laptop className="h-4.5 w-4.5 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Estações de Trabalho ({workstations.length})</h2>
            </div>

            <div className="flex gap-2">
              {workstations.length > 0 && (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={runAutoValidateAll}
                    className="h-8 text-xs border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    Recalcular Requisitos
                  </Button>
                  <div className="hidden sm:flex gap-1.5 items-center px-3 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 bg-slate-50">
                    <span className="text-emerald-600">{stationsOkCount} OK</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-rose-600">{stationsFailCount} Incompatíveis</span>
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
            <div className="text-center py-10 border border-slate-200 rounded-xl bg-white shadow-sm">
              <Laptop className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-500">Nenhum computador carregado para conferência.</p>
              <p className="text-[11px] text-slate-400 mt-1">Solte arquivos na zona de upload acima.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-md bg-white">
              <Table className="w-full table-fixed border-collapse">
                <TableHeader className="bg-slate-50/70">
                  <TableRow className="h-9 border-b border-slate-200">
                    <TableHead className="w-[35px] font-bold text-center text-[10.5px] px-1 py-1 text-slate-500">Item</TableHead>
                    <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1 text-slate-500">Hostname</TableHead>
                    <TableHead className="w-[9%] font-bold text-[10.5px] px-2 py-1 text-slate-500">Setor</TableHead>
                    <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1 text-slate-500">Usuário</TableHead>
                    <TableHead className="w-[22%] font-bold text-[10.5px] px-2 py-1 text-slate-500">Processador / Geração</TableHead>
                    <TableHead className="w-[6%] font-bold text-center text-[10.5px] px-2 py-1 text-slate-500">RAM</TableHead>
                    <TableHead className="w-[21%] font-bold text-[10.5px] px-2 py-1 text-slate-500">Disco (Espaço Livre)</TableHead>
                    <TableHead className="w-[13%] font-bold text-[10.5px] px-2 py-1 text-slate-500">S.O.</TableHead>
                    <TableHead className="w-[7%] font-bold text-[10.5px] px-2 py-1 text-slate-500">Atende?</TableHead>
                    <TableHead className="w-[35px] px-1 py-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workstations.map((ws, idx) => {
                    const validation = checkWorkstationRequirements(ws);
                    return (
                      <TableRow key={idx} className="hover:bg-slate-50/50 border-b border-slate-200 h-auto">
                        <TableCell className="font-semibold text-slate-400 text-center py-1.5 px-1 text-[10.5px]">
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
                              <span className="text-[9px] text-slate-400 mr-1 select-none font-bold uppercase tracking-wider">Geração:</span>
                              <div className="flex-grow">
                                <EditableCell
                                  value={ws.generation || ""}
                                  onChange={val => {
                                    const list = [...workstations];
                                    list[idx].generation = val;
                                    handleWorkstationsChange(list);
                                  }}
                                  placeholder="8ª Geração"
                                  className="text-slate-600 text-[10px] leading-none py-0.5 min-h-max"
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
                            className="justify-center text-center text-slate-900"
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
                              ws.meetsRequirements === "Sim" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                              ws.meetsRequirements === "Não" && "bg-rose-50 text-rose-700 border border-rose-200",
                              !ws.meetsRequirements && "bg-slate-50 text-slate-400 border border-slate-200"
                            )}>
                              {ws.meetsRequirements || "?"}
                            </div>

                            {validation.issues.length > 0 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full shrink-0">
                                    <HelpCircle className="h-4.5 w-4.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white border-slate-200 text-slate-900">
                                  <DialogHeader>
                                    <DialogTitle>Adequações Necessárias: {ws.hostname || `Estação ${idx + 1}`}</DialogTitle>
                                  </DialogHeader>
                                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
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
                            className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
        <div className="flex justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="space-y-1 text-left hidden md:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conclusão de Envio</span>
            <p className="text-xs text-slate-600 leading-normal">Revise as informações de hardware das estações e servidores acima e clique em Enviar.</p>
          </div>
          <Button 
            onClick={handleSubmitData}
            disabled={isSubmitting || (workstations.length === 0 && servers.length === 0)}
            className="w-full md:w-auto font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-2 h-11 px-8 rounded-xl transition-all"
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
