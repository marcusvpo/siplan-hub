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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>{log.profile?.full_name || log.user_id}</TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground font-mono text-xs">
                    {JSON.stringify(log.details)}
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
