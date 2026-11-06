import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ServerCog,
  Search,
  Download,
  Copy,
  ExternalLink,
  Server,
  Database,
  Shield,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Check,
  FileText,
  KeyRound,
  Maximize2,
  Laptop,
} from "lucide-react";
import { ProjectV2, StageStatus, OsCredential, RemoteAccessItem } from "@/types/ProjectV2";
import { downloadCsv } from "@/lib/csv-export";
import { buildXlsxWorkbook, XlsxCellValue } from "@/lib/xlsx-export";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EnvironmentListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectV2[];
  onSelectProject: (project: ProjectV2) => void;
}

export interface EnvironmentDataResult {
  osCredentials: OsCredential[];
  remoteAccessList: RemoteAccessItem[];
  postgresHost: string;
  postgresUser: string;
  postgresPassword: string;
  postgresVersion: string;
  postgresAccessData: string;
  soLogin: string;
  soPassword: string;
  osType: string;
}

/**
 * Extrai todos os dados de ambiente do projeto com resiliência total,
 * verificando stages.environment, customFields e legados do DTC.
 */
export function getEnvironmentData(project: ProjectV2): EnvironmentDataResult {
  const env = project.stages?.environment;
  const cf = (project.customFields as Record<string, unknown>) || ((project as any).custom_fields as Record<string, unknown>) || {};
  const dtc = (cf.dtc as Record<string, unknown>) || ((project as any).dtc as Record<string, unknown>) || {};

  // 1. Blocos de SO / Servidores
  let osCredentials: OsCredential[] = [];
  if (Array.isArray(env?.osCredentials) && env.osCredentials.length > 0) {
    osCredentials = env.osCredentials;
  } else if (Array.isArray(cf.environment_os_credentials) && (cf.environment_os_credentials as OsCredential[]).length > 0) {
    osCredentials = cf.environment_os_credentials as OsCredential[];
  }

  // 2. Acessos Remotos & VPN
  let remoteAccessList: RemoteAccessItem[] = [];
  if (Array.isArray(env?.remoteAccessList) && env.remoteAccessList.length > 0) {
    remoteAccessList = env.remoteAccessList;
  } else if (Array.isArray(cf.environment_remote_access_list) && (cf.environment_remote_access_list as RemoteAccessItem[]).length > 0) {
    remoteAccessList = cf.environment_remote_access_list as RemoteAccessItem[];
  } else if (Array.isArray(dtc.remoteAccessList) && (dtc.remoteAccessList as RemoteAccessItem[]).length > 0) {
    remoteAccessList = dtc.remoteAccessList as RemoteAccessItem[];
  }

  // Se não houver lista mas tiver anydeskId legado
  if (remoteAccessList.length === 0) {
    const anydeskId = (env?.anydeskId || cf.environment_anydesk_id || "") as string;
    const anydeskPass = (env?.anydeskPassword || cf.environment_anydesk_password || "") as string;
    if (anydeskId.trim() !== "") {
      remoteAccessList = [{ system: "AnyDesk", id: anydeskId, password: anydeskPass }];
    }
  }

  // 3. PostgreSQL
  const postgresHost = ((env?.postgresHost || cf.environment_postgres_host || dtc.postgresHost || "") as string).trim();
  const postgresUser = ((env?.postgresUser || cf.environment_postgres_user || dtc.postgresUser || "") as string).trim();
  const postgresPassword = ((env?.postgresPassword || cf.environment_postgres_password || dtc.postgresPassword || "") as string).trim();
  const postgresVersion = ((env?.postgresVersion || cf.environment_postgres_version || dtc.postgresVersion || "") as string).trim();
  const postgresAccessData = ((env?.postgresAccessData || cf.environment_postgres_access_data || dtc.postgresAccessData || "") as string).trim();

  // 4. Credenciais de SO diretas (legado)
  const soLogin = ((env?.soLogin || cf.environment_so_login || dtc.soLogin || "") as string).trim();
  const soPassword = ((env?.soPassword || cf.environment_so_password || dtc.soPassword || "") as string).trim();
  const osType = ((env?.osType || cf.environment_os_type || dtc.osType || "") as string).trim();

  return {
    osCredentials,
    remoteAccessList,
    postgresHost,
    postgresUser,
    postgresPassword,
    postgresVersion,
    postgresAccessData,
    soLogin,
    soPassword,
    osType,
  };
}

/**
 * Determina se o projeto possui dados cadastrados no estágio 4 (Preparação de Ambiente).
 */
export function hasEnvironmentStageData(project: ProjectV2): boolean {
  const env = project.stages?.environment;
  const data = getEnvironmentData(project);

  const hasStatusOrResp = Boolean(
    (env?.status && env.status !== "todo") || (env?.responsible && env.responsible.trim() !== "")
  );
  const hasDates = Boolean(env?.startDate || env?.endDate || env?.realDate);
  const hasRemotes = data.remoteAccessList.length > 0;
  const hasOsCreds = data.osCredentials.length > 0;
  const hasPostgres = Boolean(
    data.postgresHost || data.postgresVersion || data.postgresUser || data.postgresPassword || data.postgresAccessData
  );
  const hasLegacy = Boolean(data.soLogin || data.soPassword || env?.anydeskId);
  const hasObservations = Boolean(env?.observations && env.observations.trim() !== "");

  return (
    hasStatusOrResp ||
    hasDates ||
    hasRemotes ||
    hasOsCreds ||
    hasPostgres ||
    hasLegacy ||
    hasObservations
  );
}

/**
 * Extrai resumo de servidores e IPs dos blocos de credenciais do SO.
 */
function extractServersAndIps(data: EnvironmentDataResult): { title: string; ip?: string }[] {
  if (data.osCredentials.length === 0) {
    if (data.postgresHost) {
      return [{ title: "PostgreSQL", ip: data.postgresHost }];
    }
    if (data.soLogin) {
      return [{ title: data.osType || "Servidor", ip: data.soLogin }];
    }
    return [];
  }

  return data.osCredentials.map((cred) => {
    let foundIp = cred.serverIp;
    if (!foundIp && cred.fields) {
      const ipField = cred.fields.find((f) => (f.label || "").toLowerCase().trim() === "ip");
      if (ipField?.value) foundIp = ipField.value;
    }
    const title = cred.title || cred.serverName || cred.osType || "Servidor";
    return { title, ip: foundIp };
  });
}

export function EnvironmentListDialog({
  open,
  onOpenChange,
  projects,
  onSelectProject,
}: EnvironmentListDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [globalStatusFilter, setGlobalStatusFilter] = useState("all");
  const [stageStatusFilter, setStageStatusFilter] = useState("all");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (key: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  // 1. Filtrar apenas projetos que possuem dados cadastrados na etapa 4
  const eligibleProjects = useMemo(() => {
    return projects.filter((p) => !p.isDeleted && hasEnvironmentStageData(p));
  }, [projects]);

  // 2. Aplicar busca por texto (Cliente, Chamado ou IP) e filtros de status
  const filteredProjects = useMemo(() => {
    return eligibleProjects.filter((p) => {
      const env = p.stages?.environment;
      const envData = getEnvironmentData(p);

      // Filtro de Status Geral
      if (globalStatusFilter !== "all") {
        const gStatus = p.globalStatus || "in-progress";
        if (gStatus !== globalStatusFilter) return false;
      }

      // Filtro de Status da Etapa 4
      if (stageStatusFilter !== "all") {
        const eStatus = env?.status || "todo";
        if (eStatus !== stageStatusFilter) return false;
      }

      // Busca Textual
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const clientMatch = (p.clientName || "").toLowerCase().includes(q);
        const ticketMatch = (p.ticketNumber || "").toLowerCase().includes(q);
        const systemMatch = (p.systemType || "").toLowerCase().includes(q);
        const respMatch = (env?.responsible || "").toLowerCase().includes(q);
        const pgHostMatch = envData.postgresHost.toLowerCase().includes(q);

        // Verifica se algum IP dos blocos de servidores bate com a busca
        const servers = extractServersAndIps(envData);
        const ipMatch = servers.some((s) => (s.ip || "").toLowerCase().includes(q));

        if (!clientMatch && !ticketMatch && !systemMatch && !respMatch && !pgHostMatch && !ipMatch) {
          return false;
        }
      }

      return true;
    });
  }, [eligibleProjects, globalStatusFilter, stageStatusFilter, searchQuery]);

  // Status Geral Badges
  const getGlobalBadge = (status?: string) => {
    switch (status) {
      case "done":
        return <Badge className="bg-slate-700 hover:bg-slate-800 text-white text-[10px]">Finalizado</Badge>;
      case "blocked":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px]">Pausado</Badge>;
      case "in-progress":
      default:
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">Ativo</Badge>;
    }
  };

  // Status Etapa 4 Badges
  const getStageBadge = (status?: StageStatus) => {
    switch (status) {
      case "done":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] gap-1 font-semibold">
            <Clock className="h-3 w-3" />
            Em Andamento
          </Badge>
        );
      case "todo":
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-[10px]">
            Não Iniciado
          </Badge>
        );
    }
  };

  // Exportar dados como CSV
  const handleExportCsv = () => {
    const headers = [
      "Cliente",
      "Chamado",
      "Sistema",
      "Status Geral",
      "Status Etapa 4",
      "Responsável Ambiente",
      "Servidores e IPs",
      "Acessos Remotos",
      "PostgreSQL Local (IP:Porta)",
      "PostgreSQL Versão",
      "PostgreSQL Usuário",
    ];

    const rows = filteredProjects.map((p) => {
      const env = p.stages?.environment;
      const data = getEnvironmentData(p);
      const servers = extractServersAndIps(data)
        .map((s) => `${s.title}${s.ip ? ` (${s.ip})` : ""}`)
        .join(" | ");

      const remotes = data.remoteAccessList
        .map((r) => {
          if (r.system === "VPN") {
            const filesCount = r.vpnFiles?.length || 0;
            return `VPN (${filesCount} arquivo(s))`;
          }
          return `${r.system}: ${r.id}`;
        })
        .join(" | ");

      return [
        p.clientName || "",
        p.ticketNumber || "",
        p.systemType || "",
        p.globalStatus === "done" ? "Finalizado" : p.globalStatus === "blocked" ? "Pausado" : "Ativo",
        env?.status === "done" ? "Concluído" : env?.status === "in-progress" ? "Em Andamento" : "Não Iniciado",
        env?.responsible || "Não Atribuído",
        servers || "-",
        remotes || "-",
        data.postgresHost || "-",
        data.postgresVersion || "-",
        data.postgresUser || "-",
      ];
    });

    const nowStr = new Date().toISOString().slice(0, 10);
    downloadCsv(`ambientes_implantacao_${nowStr}.csv`, headers, rows);
    toast({
      title: "Planilha CSV exportada!",
      description: "O arquivo CSV foi baixado com sucesso.",
    });
  };

  // Exportar dados como XLSX oficial
  const handleExportXlsx = async () => {
    try {
      const headers: XlsxCellValue[] = [
        "Cliente",
        "Chamado",
        "Sistema",
        "Status Geral",
        "Status Etapa 4",
        "Responsável Ambiente",
        "Servidores e IPs",
        "Acessos Remotos",
        "PostgreSQL Local (IP:Porta)",
        "PostgreSQL Versão",
        "PostgreSQL Usuário",
        "PostgreSQL Senha",
      ];

      const rows: XlsxCellValue[][] = [headers];

      filteredProjects.forEach((p) => {
        const env = p.stages?.environment;
        const data = getEnvironmentData(p);
        const servers = extractServersAndIps(data)
          .map((s) => `${s.title}${s.ip ? ` (${s.ip})` : ""}`)
          .join(" | ");

        const remotes = data.remoteAccessList
          .map((r) => {
            if (r.system === "VPN") {
              const filesCount = r.vpnFiles?.length || 0;
              return `VPN (${filesCount} arquivo(s))`;
            }
            return `${r.system}: ${r.id}${r.password ? ` (Senha: ${r.password})` : ""}`;
          })
          .join(" | ");

        rows.push([
          p.clientName || "",
          p.ticketNumber || "",
          p.systemType || "",
          p.globalStatus === "done" ? "Finalizado" : p.globalStatus === "blocked" ? "Pausado" : "Ativo",
          env?.status === "done" ? "Concluído" : env?.status === "in-progress" ? "Em Andamento" : "Não Iniciado",
          env?.responsible || "Não Atribuído",
          servers || "-",
          remotes || "-",
          data.postgresHost || "-",
          data.postgresVersion || "-",
          data.postgresUser || "-",
          data.postgresPassword || "-",
        ]);
      });

      const bytes = await buildXlsxWorkbook([
        {
          name: "Ambientes & Conexões",
          rows,
          headerRows: [0],
          frozenRows: 1,
          autoFilter: true,
        },
      ]);

      const blob = new Blob([new Uint8Array(bytes) as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const nowStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `ambientes_implantacao_${nowStr}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Planilha Excel (.xlsx) exportada!",
        description: "O arquivo .xlsx foi baixado com formatação nativa.",
      });
    } catch (err) {
      console.error("Erro ao gerar XLSX:", err);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar a planilha Excel.",
        variant: "destructive",
      });
    }
  };

  // Copiar tabela para colar no Excel / Google Sheets
  const handleCopyTable = () => {
    const headers = [
      "Cliente",
      "Chamado",
      "Sistema",
      "Status Geral",
      "Status Etapa 4",
      "Responsável Ambiente",
      "Servidores e IPs",
      "Acessos Remotos",
      "PostgreSQL Local",
      "PostgreSQL Versão",
      "PostgreSQL Usuário",
    ];

    const lines = [headers.join("\t")];

    filteredProjects.forEach((p) => {
      const env = p.stages?.environment;
      const data = getEnvironmentData(p);
      const servers = extractServersAndIps(data)
        .map((s) => `${s.title}${s.ip ? ` (${s.ip})` : ""}`)
        .join(" | ");

      const remotes = data.remoteAccessList
        .map((r) => {
          if (r.system === "VPN") {
            const filesCount = r.vpnFiles?.length || 0;
            return `VPN (${filesCount} arquivo(s))`;
          }
          return `${r.system}: ${r.id}`;
        })
        .join(" | ");

      lines.push(
        [
          p.clientName || "",
          p.ticketNumber || "",
          p.systemType || "",
          p.globalStatus === "done" ? "Finalizado" : p.globalStatus === "blocked" ? "Pausado" : "Ativo",
          env?.status === "done" ? "Concluído" : env?.status === "in-progress" ? "Em Andamento" : "Não Iniciado",
          env?.responsible || "Não Atribuído",
          servers || "-",
          remotes || "-",
          data.postgresHost || "-",
          data.postgresVersion || "-",
          data.postgresUser || "-",
        ].join("\t")
      );
    });

    navigator.clipboard.writeText(lines.join("\n"));
    toast({
      title: "Tabela copiada!",
      description: "Conteúdo copiado em formato de planilha. Basta colar (Ctrl+V) no Excel ou Google Sheets.",
    });
  };

  // Copiar todas as informações daquela linha/projeto para a área de transferência
  const handleCopyProjectRow = (project: ProjectV2) => {
    const env = project.stages?.environment;
    const data = getEnvironmentData(project);

    const serversList = data.osCredentials.map((c) => {
      const title = c.title || c.serverName || "Servidor";
      const fieldsStr = (c.fields || [])
        .filter((f) => f.value && f.value.trim() !== "")
        .map((f) => `${f.label}: ${f.value}`)
        .join(" | ");
      return `• ${title}${fieldsStr ? `\n  ${fieldsStr}` : ""}`;
    });

    const remotesList = data.remoteAccessList.map((r) => {
      if (r.system === "VPN") {
        const vpnFiles = (r.vpnFiles || []).map((f) => f.name).join(", ");
        return `• VPN: ${r.vpnFiles?.length || 0} arquivo(s)${vpnFiles ? ` (${vpnFiles})` : ""}`;
      }
      return `• ${r.system}: ID ${r.id || "-"}${r.password ? ` | Senha: ${r.password}` : ""}`;
    });

    const text = [
      `📋 DADOS DE AMBIENTE & CONEXÃO`,
      `Cartório / Projeto: ${project.clientName}`,
      `Chamado: #${project.ticketNumber || "N/A"} | Sistema: ${project.systemType || "N/A"}`,
      `Status Geral: ${project.globalStatus === "done" ? "Finalizado" : project.globalStatus === "blocked" ? "Pausado" : "Ativo"} | Etapa 4: ${env?.status === "done" ? "Concluído" : env?.status === "in-progress" ? "Em Andamento" : "Não Iniciado"}`,
      `Responsável Ambiente: ${env?.responsible || "Não Atribuído"}`,
      "",
      `🖥️ SERVIDORES & CREDENCIAIS DE SO:`,
      serversList.length > 0 ? serversList.join("\n") : (data.postgresHost ? `• Host: ${data.postgresHost}` : "• Nenhum servidor cadastrado"),
      "",
      `🌐 ACESSOS REMOTOS:`,
      remotesList.length > 0 ? remotesList.join("\n") : "• Nenhum acesso remoto cadastrado",
      "",
      `🐘 BANCO DE DADOS POSTGRESQL:`,
      `• Local (IP / Porta): ${data.postgresHost || "-"}`,
      `• Versão: ${data.postgresVersion || "-"}`,
      `• Usuário: ${data.postgresUser || "postgres"}`,
      `• Senha: ${data.postgresPassword ? data.postgresPassword : "-"}`,
      data.postgresAccessData ? `• Dados Adicionais: ${data.postgresAccessData}` : "",
    ].filter((line) => line !== "").join("\n");

    navigator.clipboard.writeText(text);
    toast({
      title: "Dados do projeto copiados!",
      description: `As informações de ${project.clientName} foram copiadas para a área de transferência.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        {/* Cabeçalho com padding-right reservado para o botão X não sobrepor botões */}
        <DialogHeader className="border-b pb-3 space-y-1 pr-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/10 text-rose-600">
                  <ServerCog className="h-4 w-4" />
                </div>
                Lista Geral de Ambientes &amp; Conexões
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Visão consolidada em formato de planilha. Clique no nome do projeto para abrir o modal ou nas colunas para ver detalhes expandidos.
              </DialogDescription>
            </div>

            {/* Ações de Exportação */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyTable}
                className="h-8 gap-1.5 text-xs font-semibold"
                title="Copiar todas as linhas em formato TSV para colar no Excel ou Google Sheets"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar Tabela
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-8 gap-1.5 text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100"
                title="Exportar dados filtrados como arquivo .CSV"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportXlsx}
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                title="Exportar dados filtrados como planilha Excel nativa (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Exportar XLSX
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Filtros e Busca Rápida */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 py-3 border-b bg-muted/20 px-1 rounded-md mt-1">
          {/* Busca Textual */}
          <div className="relative sm:col-span-6">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, chamado ou IP..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          {/* Filtro Status Geral */}
          <div className="sm:col-span-3">
            <Select value={globalStatusFilter} onValueChange={setGlobalStatusFilter}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Status Geral..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os Status Gerais</SelectItem>
                <SelectItem value="in-progress" className="text-xs">Ativos / Em Andamento</SelectItem>
                <SelectItem value="done" className="text-xs">Finalizados</SelectItem>
                <SelectItem value="blocked" className="text-xs">Pausados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Status Etapa 4 */}
          <div className="sm:col-span-3">
            <Select value={stageStatusFilter} onValueChange={setStageStatusFilter}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Status Etapa 4..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos Status Etapa 4</SelectItem>
                <SelectItem value="done" className="text-xs">Concluído</SelectItem>
                <SelectItem value="in-progress" className="text-xs">Em Andamento</SelectItem>
                <SelectItem value="todo" className="text-xs">Não Iniciado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Ambientes */}
        <div className="flex-1 min-h-0 mt-2 border rounded-lg bg-card overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 w-full overflow-auto">
            <Table className="text-xs min-w-[1050px]">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[240px] font-bold">Cliente / Projeto</TableHead>
                  <TableHead className="w-[95px] font-bold">Status Geral</TableHead>
                  <TableHead className="w-[110px] font-bold">Etapa 4</TableHead>
                  <TableHead className="w-[125px] font-bold">Responsável</TableHead>
                  <TableHead className="w-[200px] font-bold">Servidores &amp; IPs</TableHead>
                  <TableHead className="w-[180px] font-bold">Acessos Remotos</TableHead>
                  <TableHead className="w-[170px] font-bold">PostgreSQL</TableHead>
                  <TableHead className="w-[130px] text-right font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">
                      Nenhum projeto encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => {
                    const env = project.stages?.environment;
                    const data = getEnvironmentData(project);
                    const servers = extractServersAndIps(data);
                    const remotes = data.remoteAccessList;

                    return (
                      <TableRow
                        key={project.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Cliente / Chamado — Clicável para abrir o modal de ambiente */}
                        <TableCell className="font-semibold align-top py-2.5">
                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProject(project);
                                onOpenChange(false);
                              }}
                              className="text-left font-bold text-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:underline transition-colors block truncate max-w-[220px]"
                              title={`Abrir etapa de ambiente de ${project.clientName}`}
                            >
                              {project.clientName}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {project.ticketNumber && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  #{project.ticketNumber}
                                </span>
                              )}
                              {project.systemType && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-medium text-muted-foreground">
                                  {project.systemType}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Geral */}
                        <TableCell className="align-top py-2.5">
                          {getGlobalBadge(project.globalStatus)}
                        </TableCell>

                        {/* Status da Etapa 4 */}
                        <TableCell className="align-top py-2.5">
                          {getStageBadge(env?.status)}
                        </TableCell>

                        {/* Responsável */}
                        <TableCell className="align-top py-2.5 text-muted-foreground font-medium truncate max-w-[125px]">
                          {env?.responsible || "Não Atribuído"}
                        </TableCell>

                        {/* Servidores & IPs — Clicável com Popover detalhado */}
                        <TableCell className="align-top py-2.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full text-left p-1 rounded-md hover:bg-muted/70 transition-colors group cursor-pointer border border-transparent hover:border-border"
                                title="Clique para ver todos os servidores e credenciais"
                              >
                                {servers.length === 0 ? (
                                  <span className="text-muted-foreground italic text-[11px]">-</span>
                                ) : (
                                  <div className="space-y-1">
                                    {servers.slice(0, 2).map((s, idx) => (
                                      <div key={idx} className="flex items-center gap-1 text-[11px]">
                                        <Server className="h-3 w-3 text-muted-foreground shrink-0 group-hover:text-rose-600" />
                                        <span className="font-semibold text-foreground truncate max-w-[90px]" title={s.title}>
                                          {s.title}
                                        </span>
                                        {s.ip && (
                                          <code className="text-[10px] bg-muted px-1 py-0.2 rounded font-mono font-medium text-foreground">
                                            {s.ip}
                                          </code>
                                        )}
                                      </div>
                                    ))}
                                    {servers.length > 2 && (
                                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                                        <Maximize2 className="h-2.5 w-2.5" />
                                        +{servers.length - 2} servidor(es)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[360px] sm:w-[440px] p-3 text-xs shadow-xl" align="start">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <Server className="h-4 w-4 text-rose-600" />
                                    <span>Servidores &amp; Credenciais de SO</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 gap-1"
                                    onClick={() => {
                                      const text = data.osCredentials
                                        .map((b) => {
                                          const fieldsStr = (b.fields || []).map((f) => `${f.label}: ${f.value}`).join(" | ");
                                          return `${b.title || "Servidor"}:\n${fieldsStr}`;
                                        })
                                        .join("\n\n");
                                      copyToClipboard(text || data.postgresHost, "Servidores");
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copiar
                                  </Button>
                                </div>

                                <div className="text-[11px] text-muted-foreground font-medium">
                                  Cliente: <strong className="text-foreground">{project.clientName}</strong>
                                </div>

                                {data.osCredentials.length === 0 ? (
                                  <div className="text-muted-foreground italic py-3 text-center">
                                    {data.postgresHost ? (
                                      <div className="text-left font-mono text-xs bg-muted/40 p-2 rounded">
                                        Host identificado: {data.postgresHost}
                                      </div>
                                    ) : (
                                      "Nenhum bloco de servidor cadastrado."
                                    )}
                                  </div>
                                ) : (
                                  <ScrollArea className="max-h-72 pr-1 space-y-2">
                                    <div className="space-y-2.5">
                                      {data.osCredentials.map((block, bIdx) => {
                                        const title = block.title || block.serverName || `Servidor ${bIdx + 1}`;
                                        return (
                                          <div key={block.id || bIdx} className="border rounded-md p-2 bg-muted/20 space-y-1.5">
                                            <div className="font-bold text-foreground text-xs flex items-center justify-between">
                                              <span>{title}</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1">
                                              {(block.fields || []).map((f) => {
                                                const isPass = (f.label || "").toLowerCase().includes("senha") || (f.label || "").toLowerCase().includes("password");
                                                const pwdKey = `${block.id}-${f.id}`;
                                                const isRevealed = revealedPasswords[pwdKey];

                                                return (
                                                  <div key={f.id} className="flex items-center justify-between text-[11px] bg-background/80 p-1 rounded border">
                                                    <span className="text-muted-foreground font-medium">{f.label || "Campo"}:</span>
                                                    <div className="flex items-center gap-1">
                                                      <span className="font-mono font-semibold text-foreground">
                                                        {isPass && !isRevealed ? "••••••••" : f.value || "-"}
                                                      </span>
                                                      {isPass && f.value && (
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-4 w-4 text-muted-foreground"
                                                          onClick={() => togglePassword(pwdKey)}
                                                        >
                                                          {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                        </Button>
                                                      )}
                                                      {f.value && (
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                                          onClick={() => copyToClipboard(f.value, f.label)}
                                                        >
                                                          <Copy className="h-3 w-3" />
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Acessos Remotos & VPN — Clicável com Popover detalhado */}
                        <TableCell className="align-top py-2.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full text-left p-1 rounded-md hover:bg-muted/70 transition-colors group cursor-pointer border border-transparent hover:border-border"
                                title="Clique para ver todos os acessos remotos e arquivos de VPN"
                              >
                                {remotes.length === 0 ? (
                                  <span className="text-muted-foreground italic text-[11px]">-</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {remotes.slice(0, 2).map((rem, rIdx) => {
                                      if (rem.system === "VPN") {
                                        const fileCount = rem.vpnFiles?.length || 0;
                                        return (
                                          <Badge
                                            key={rIdx}
                                            variant="outline"
                                            className="border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold gap-1"
                                          >
                                            <Shield className="h-2.5 w-2.5" />
                                            VPN {fileCount > 0 && `(${fileCount})`}
                                          </Badge>
                                        );
                                      }
                                      return (
                                        <Badge
                                          key={rIdx}
                                          variant="secondary"
                                          className="text-[10px] font-mono"
                                        >
                                          {rem.system}: {rem.id || "S/ ID"}
                                        </Badge>
                                      );
                                    })}
                                    {remotes.length > 2 && (
                                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold self-center">
                                        +{remotes.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[340px] sm:w-[400px] p-3 text-xs shadow-xl" align="start">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <Laptop className="h-4 w-4 text-rose-600" />
                                    <span>Acessos Remotos &amp; VPN</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 gap-1"
                                    onClick={() => {
                                      const text = remotes
                                        .map((r) => {
                                          if (r.system === "VPN") {
                                            const files = (r.vpnFiles || []).map((f) => f.name).join(", ");
                                            return `VPN: ${r.vpnFiles?.length || 0} arquivo(s)${files ? ` (${files})` : ""}`;
                                          }
                                          return `${r.system}: ID ${r.id}${r.password ? ` | Senha: ${r.password}` : ""}`;
                                        })
                                        .join("\n");
                                      copyToClipboard(text, "Acessos Remotos");
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copiar
                                  </Button>
                                </div>

                                <div className="text-[11px] text-muted-foreground font-medium">
                                  Cliente: <strong className="text-foreground">{project.clientName}</strong>
                                </div>

                                {remotes.length === 0 ? (
                                  <div className="text-muted-foreground italic py-3 text-center">
                                    Nenhum acesso remoto cadastrado.
                                  </div>
                                ) : (
                                  <ScrollArea className="max-h-72 pr-1 space-y-2">
                                    <div className="space-y-2">
                                      {remotes.map((rem, rIdx) => {
                                        const isVpn = rem.system === "VPN";
                                        const pwdKey = `rem-${project.id}-${rIdx}`;
                                        const isRevealed = revealedPasswords[pwdKey];

                                        return (
                                          <div
                                            key={rIdx}
                                            className={cn(
                                              "border rounded-md p-2 space-y-1.5",
                                              isVpn ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" : "bg-muted/20"
                                            )}
                                          >
                                            <div className="flex items-center justify-between font-bold text-foreground">
                                              <span className="flex items-center gap-1.5">
                                                {isVpn ? <Shield className="h-3.5 w-3.5 text-rose-600" /> : <Laptop className="h-3.5 w-3.5 text-muted-foreground" />}
                                                {rem.system}
                                              </span>
                                              {!isVpn && rem.id && (
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 text-[10px] px-1 gap-1"
                                                  onClick={() => copyToClipboard(`ID: ${rem.id}${rem.password ? ` | Senha: ${rem.password}` : ""}`, rem.system)}
                                                >
                                                  <Copy className="h-2.5 w-2.5" />
                                                  Copiar
                                                </Button>
                                              )}
                                            </div>

                                            {isVpn ? (
                                              <div className="space-y-1 text-[11px]">
                                                <div className="text-muted-foreground">
                                                  Arquivos de Configuração ({rem.vpnFiles?.length || 0}):
                                                </div>
                                                {(!rem.vpnFiles || rem.vpnFiles.length === 0) ? (
                                                  <div className="text-muted-foreground italic text-[10px]">
                                                    Nenhum arquivo anexado ainda.
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1">
                                                    {rem.vpnFiles.map((f) => (
                                                      <div
                                                        key={f.id}
                                                        className="flex items-center justify-between bg-background p-1.5 rounded border text-[10px]"
                                                      >
                                                        <span className="font-mono truncate max-w-[200px]" title={f.name}>
                                                          {f.name}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                          {(f.size / 1024).toFixed(0)} KB
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                                <div className="bg-background p-1 rounded border">
                                                  <span className="text-[10px] text-muted-foreground block">ID / Acesso:</span>
                                                  <span className="font-mono font-semibold text-foreground select-all">
                                                    {rem.id || "-"}
                                                  </span>
                                                </div>
                                                <div className="bg-background p-1 rounded border">
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-muted-foreground">Senha:</span>
                                                    {rem.password && (
                                                      <button
                                                        type="button"
                                                        onClick={() => togglePassword(pwdKey)}
                                                        className="text-muted-foreground hover:text-foreground"
                                                      >
                                                        {isRevealed ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                                                      </button>
                                                    )}
                                                  </div>
                                                  <span className="font-mono font-semibold text-foreground select-all">
                                                    {!rem.password ? "-" : isRevealed ? rem.password : "••••••••"}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* PostgreSQL — Clicável com Popover detalhado */}
                        <TableCell className="align-top py-2.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full text-left p-1 rounded-md hover:bg-muted/70 transition-colors group cursor-pointer border border-transparent hover:border-border"
                                title="Clique para ver detalhes da conexão PostgreSQL"
                              >
                                {data.postgresHost || data.postgresVersion ? (
                                  <div className="space-y-0.5 text-[11px]">
                                    {data.postgresHost && (
                                      <div className="font-mono text-foreground font-semibold flex items-center gap-1 group-hover:text-rose-600">
                                        <Database className="h-3 w-3 text-muted-foreground shrink-0 group-hover:text-rose-600" />
                                        <span className="truncate max-w-[130px]" title={data.postgresHost}>
                                          {data.postgresHost}
                                        </span>
                                      </div>
                                    )}
                                    {data.postgresVersion && (
                                      <span className="text-[10px] text-muted-foreground block">
                                        {data.postgresVersion}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic text-[11px]">-</span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] sm:w-[380px] p-3 text-xs shadow-xl" align="start">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <Database className="h-4 w-4 text-rose-600" />
                                    <span>Banco de Dados PostgreSQL</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5 gap-1"
                                    onClick={() => {
                                      const text = [
                                        `Host: ${data.postgresHost || "-"}`,
                                        `Versão: ${data.postgresVersion || "-"}`,
                                        `Usuário: ${data.postgresUser || "postgres"}`,
                                        `Senha: ${data.postgresPassword || "-"}`,
                                      ].join("\n");
                                      copyToClipboard(text, "Dados PostgreSQL");
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copiar
                                  </Button>
                                </div>

                                <div className="text-[11px] text-muted-foreground font-medium">
                                  Cliente: <strong className="text-foreground">{project.clientName}</strong>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded border text-[11px]">
                                    <span className="text-muted-foreground font-medium">Local (IP / Porta):</span>
                                    <div className="flex items-center gap-1 font-mono font-semibold text-foreground">
                                      <span>{data.postgresHost || "-"}</span>
                                      {data.postgresHost && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                          onClick={() => copyToClipboard(data.postgresHost, "IP/Porta")}
                                        >
                                          <Copy className="h-2.5 w-2.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded border text-[11px]">
                                    <span className="text-muted-foreground font-medium">Versão:</span>
                                    <span className="font-semibold text-foreground">
                                      {data.postgresVersion || "Não especificada"}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded border text-[11px]">
                                    <span className="text-muted-foreground font-medium">Usuário:</span>
                                    <div className="flex items-center gap-1 font-mono font-semibold text-foreground">
                                      <span>{data.postgresUser || "postgres"}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                        onClick={() => copyToClipboard(data.postgresUser || "postgres", "Usuário")}
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded border text-[11px]">
                                    <span className="text-muted-foreground font-medium">Senha:</span>
                                    <div className="flex items-center gap-1 font-mono font-semibold text-foreground">
                                      <span>
                                        {!data.postgresPassword
                                          ? "-"
                                          : revealedPasswords[`pg-${project.id}`]
                                          ? data.postgresPassword
                                          : "••••••••"}
                                      </span>
                                      {data.postgresPassword && (
                                        <>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                            onClick={() => togglePassword(`pg-${project.id}`)}
                                          >
                                            {revealedPasswords[`pg-${project.id}`] ? (
                                              <EyeOff className="h-2.5 w-2.5" />
                                            ) : (
                                              <Eye className="h-2.5 w-2.5" />
                                            )}
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                            onClick={() => copyToClipboard(data.postgresPassword, "Senha")}
                                          >
                                            <Copy className="h-2.5 w-2.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {data.postgresAccessData && (
                                    <div className="bg-muted/30 p-1.5 rounded border text-[11px] space-y-0.5">
                                      <span className="text-muted-foreground font-medium block">Dados Adicionais:</span>
                                      <p className="font-mono text-[10px] text-foreground whitespace-pre-wrap">
                                        {data.postgresAccessData}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Ações: Copiar Dados da Linha e Abrir Projeto em /projects */}
                        <TableCell className="text-right align-top py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {/* Botão Copiar Dados Deste Projeto */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Copiar dados deste projeto para a área de transferência"
                              onClick={() => handleCopyProjectRow(project)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>

                            {/* Botão Abrir Tela do Projeto em /projects */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 font-semibold px-2"
                              title="Abrir a tela completa do projeto em /projects"
                              onClick={() => {
                                onOpenChange(false);
                                navigate(`/projects?id=${project.id}`);
                              }}
                            >
                              Abrir
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Rodapé informativo */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t">
          <span>
            Mostrando <strong>{filteredProjects.length}</strong> de <strong>{eligibleProjects.length}</strong> projetos com dados de ambiente.
          </span>
          <span className="italic hidden sm:inline">
            Clique no nome do projeto para abrir a configuração de ambiente, ou clique nos dados para expandir.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
