import { useAuditLogs } from "@/hooks/useAuditLogs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, History, Search, FilterX, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 6;

const actionLabels: Record<string, string> = {
  // ... (unchanged labels)
  project_created: "Projeto Criado",
  project_updated: "Projeto Atualizado",
  project_archived: "Projeto Arquivado",
  project_restored: "Projeto Restaurado",
  project_status_changed: "Status do Projeto Alterado",
  project_stage_updated: "Etapa do Projeto Atualizada",
  conversion_queue_assigned: "Fila de Conversão Atribuída",
  conversion_queue_transferred: "Fila de Conversão Transferida",
  conversion_queue_removed: "Removido da Fila de Conversão",
  conversion_queue_completed: "Conversão Concluída",
  conversion_queue_updated: "Fila de Conversão Atualizada",
  conversion_status_changed: "Status da Conversão Alterado",
  conversion_issue_created: "Problema de Conversão Registrado",
  conversion_issue_updated: "Problema de Conversão Atualizado",
  conversion_issue_resolved: "Problema de Conversão Resolvido",
  adherence_updated: "Aderência Atualizada",
  adherence_gap_identified: "Gargalo de Aderência Identificado",
  adherence_completed: "Aderência Concluída",
  deployment_scheduled: "Implantação Agendada",
  deployment_updated: "Implantação Atualizada",
  deployment_completed: "Implantação Concluída",
  homologation_started: "Homologação Iniciada",
  homologation_approved: "Homologação Aprovada",
  homologation_rejected: "Homologação Rejeitada",
  roadmap_created: "Roadmap Criado",
  roadmap_updated: "Roadmap Atualizado",
  roadmap_shared: "Roadmap Compartilhado",
  user_login: "Login de Usuário",
  user_logout: "Logout de Usuário",
  profile_updated: "Perfil Atualizado",
  user_created: "Novo Usuário Criado",
  user_role_changed: "Papel de Usuário Alterado",
  user_team_changed: "Equipe de Usuário Alterada",
  settings_updated: "Configurações Atualizadas",
  client_created: "Novo Cliente Criado",
  client_updated: "Cliente Atualizado",
  contact_added: "Contato Adicionado",
  contact_updated: "Contato Atualizado",
  note_added: "Nota Adicionada",
  file_uploaded: "Arquivo Enviado",
  file_deleted: "Arquivo Excluído",
  checklist_item_completed: "Item de Checklist Concluído",
  checklist_item_uncompleted: "Item de Checklist Desmarcado",
  ROLE_UPDATED: "Perfil de Acesso Atualizado",
  USER_UPDATED: "Usuário Atualizado",
};

const translateValue = (value: any): string => {
  if (value === null || value === undefined) return "vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  
  const translations: Record<string, string> = {
    admin: "Administrador",
    user: "Usuário Padrão",
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente",
    completed: "Concluído",
  };
  
  return translations[String(value).toLowerCase()] || String(value);
};

const isUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && uuidRegex.test(str);
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "vazio";
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !isUUID(key) && key !== 'id')
      .map(([key, val]) => `${key}: ${translateValue(val)}`)
      .join(", ");
  }
  if (isUUID(String(value))) return "atribuído";
  return translateValue(value);
};

const formatLogDetails = (log: any) => {
  const details = log.details;
  if (!details) return "Ação registrada com sucesso";

  const parts: string[] = [];

  if (details.projectName) parts.push(`Projeto: ${details.projectName}`);
  if (details.roleName) parts.push(`Perfil: ${translateValue(details.roleName)}`);
  if (details.targetUserName) parts.push(`Usuário alvo: ${details.targetUserName}`);
  
  if (details.field) {
    const fieldMap: Record<string, string> = {
      status: "Status",
      stage: "Etapa",
      role: "Papel",
      team: "Equipe",
      name: "Nome",
      description: "Descrição",
      email: "E-mail",
      full_name: "Nome Completo"
    };
    const fieldLabel = fieldMap[details.field] || details.field;
    parts.push(`${fieldLabel}: de "${formatValue(details.oldValue)}" para "${formatValue(details.newValue)}"`);
  }

  if (details.updates && typeof details.updates === 'object') {
    const changes = Object.entries(details.updates)
      .map(([key, val]) => `${key}: ${formatValue(val)}`)
      .join(" | ");
    if (changes) parts.push(`Alterações: ${changes}`);
  }

  if (details.additionalInfo?.fileName) parts.push(`Arquivo: ${details.additionalInfo.fileName}`);
  if (details.additionalInfo?.itemLabel) parts.push(`Item: ${details.additionalInfo.itemLabel}`);

  if (parts.length === 0) {
    const entries = Object.entries(details)
      .filter(([key, value]) => 
        !['userName', 'timestamp', 'userAgent', 'additionalInfo', 'userId', 'projectId', 'roleId', 'entityId', 'entityType', 'updates'].includes(key) &&
        !isUUID(String(value)) &&
        typeof value !== 'object'
      )
      .map(([key, value]) => `${key}: ${translateValue(value)}`);
    
    if (entries.length > 0) return entries.join(" | ");
    return "Ação registrada com sucesso";
  }

  return parts.join(" | ");
};

export default function AuditLogPage() {
  const { logs, isLoading } = useAuditLogs();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchTerm.trim()) return logs;

    const term = searchTerm.toLowerCase();
    return logs.filter((log) => {
      const userName = (log.profile?.full_name || "").toLowerCase();
      const actionLabel = (actionLabels[log.action] || log.action).toLowerCase();
      const details = formatLogDetails(log).toLowerCase();
      
      return (
        userName.includes(term) ||
        actionLabel.includes(term) ||
        details.includes(term) ||
        log.user_id.toLowerCase().includes(term)
      );
    });
  }, [logs, searchTerm]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Log de Auditoria</h2>
          <p className="text-muted-foreground">
            Histórico detalhado de atividades e alterações no sistema.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário, ação ou detalhe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm("")}
            >
              <FilterX className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px] font-semibold">Data/Hora</TableHead>
                <TableHead className="w-[200px] font-semibold">Usuário</TableHead>
                <TableHead className="w-[220px] font-semibold">Ação</TableHead>
                <TableHead className="font-semibold">Detalhes das Alterações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <Search className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-base font-medium">Nenhum registro encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {log.profile?.full_name || "Sistema"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary border border-primary/10">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground leading-relaxed py-3">
                      {formatLogDetails(log)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium">{paginatedLogs.length}</span> de{" "}
              <span className="font-medium">{filteredLogs.length}</span> registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <div className="flex items-center justify-center text-sm font-medium min-w-[100px]">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
