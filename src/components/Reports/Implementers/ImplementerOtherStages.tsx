import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ImplementerInvolvement } from "@/hooks/useImplementerReport";
import type { GlobalStatus } from "@/types/ProjectV2";

export interface ImplementerOtherStagesProps {
  involvements: ImplementerInvolvement[];
}

const GLOBAL_STATUS_LABELS: Record<GlobalStatus | string, string> = {
  "in-progress": "Em Andamento",
  done: "Finalizado",
  blocked: "Bloqueado",
  archived: "Arquivado",
};

const GLOBAL_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "critical"
> = {
  "in-progress": "secondary",
  done: "success",
  blocked: "destructive",
  archived: "outline",
};

export function ImplementerOtherStages({ involvements }: ImplementerOtherStagesProps) {
  const otherInvolvements = (involvements || []).filter(
    (inv) => !inv.isPrimaryImplementer
  );

  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Envolvimento em Outras Etapas
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Projetos onde o implantador atuou fora da etapa de implementação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Cliente</TableHead>
              <TableHead className="font-semibold">Papéis</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Sistema</TableHead>
              <TableHead className="font-semibold text-right">Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {otherInvolvements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground italic"
                >
                  Nenhum envolvimento em outras etapas.
                </TableCell>
              </TableRow>
            ) : (
              otherInvolvements.map((inv, index) => {
                const project = inv.project;
                const statusKey = project?.globalStatus || "in-progress";
                const statusLabel = GLOBAL_STATUS_LABELS[statusKey] || statusKey;
                const statusVariant = GLOBAL_STATUS_VARIANTS[statusKey] || "outline";
                const progressValue = Math.min(
                  100,
                  Math.max(0, project?.overallProgress || 0)
                );

                return (
                  <TableRow key={project?.id || index}>
                    {/* Cliente */}
                    <TableCell className="font-medium text-foreground">
                      <div>{project?.clientName || "Cliente não informado"}</div>
                      {project?.ticketNumber && (
                        <div className="text-xs text-muted-foreground font-normal">
                          OS #{project.ticketNumber}
                        </div>
                      )}
                    </TableCell>

                    {/* Papéis */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {inv.roles && inv.roles.length > 0 ? (
                          inv.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs font-normal">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem papel</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={statusVariant} className="text-xs font-medium">
                        {statusLabel}
                      </Badge>
                    </TableCell>

                    {/* Sistema */}
                    <TableCell className="text-sm text-foreground">
                      {project?.systemType || "-"}
                    </TableCell>

                    {/* Progresso */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={progressValue} className="w-16 h-2" />
                        <span className="text-xs font-medium text-foreground w-8 text-right">
                          {progressValue}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default ImplementerOtherStages;
