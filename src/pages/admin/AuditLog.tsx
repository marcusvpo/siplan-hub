import { useAuditLogs } from "@/hooks/useAuditLogs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const actionLabels: Record<string, string> = {
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

const formatLogDetails = (log: any) => {
  const details = log.details;
  if (!details) return "Sem detalhes adicionais";

  const parts = [];

  if (details.projectName) parts.push(`Projeto: ${details.projectName}`);
  if (details.roleName) parts.push(`Perfil: ${details.roleName}`);
  if (details.targetUserName) parts.push(`Para: ${details.targetUserName}`);
  
  if (details.field) {
    const fieldMap: Record<string, string> = {
      status: "Status",
      stage: "Etapa",
      role: "Papel",
      team: "Equipe",
      name: "Nome",
      description: "Descrição"
    };
    const fieldLabel = fieldMap[details.field] || details.field;
    parts.push(`${fieldLabel}: de "${details.oldValue || 'vazio'}" para "${details.newValue}"`);
  }

  if (details.additionalInfo?.fileName) parts.push(`Arquivo: ${details.additionalInfo.fileName}`);
  if (details.additionalInfo?.itemLabel) parts.push(`Item: ${details.additionalInfo.itemLabel}`);

  if (parts.length === 0) {
    // If we couldn't parse specific fields, show a simplified JSON or common keys
    const entries = Object.entries(details)
      .filter(([key]) => !['userName', 'timestamp', 'userAgent', 'additionalInfo'].includes(key))
      .map(([key, value]) => `${key}: ${value}`);
    
    if (entries.length > 0) return entries.join(", ");
    return "Ação realizada no sistema";
  }

  return parts.join(" | ");
};

export default function AuditLogPage() {
  const { logs, isLoading } = useAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Log de Auditoria</h2>
        <p className="text-muted-foreground">
          Histórico de atividades importantes no sistema.
        </p>
      </div>

      <div className="border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Data/Hora</TableHead>
              <TableHead className="w-[200px]">Usuário</TableHead>
              <TableHead className="w-[220px]">Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="whitespace-nowrap font-medium">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{log.profile?.full_name || "Sistema"}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{log.user_id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {actionLabels[log.action] || log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLogDetails(log)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
