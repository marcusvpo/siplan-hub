import React from "react";
import type { DetailedInvolvement } from "@/hooks/useImplementerReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ImplementerAllCartoriosTableProps {
  involvements: DetailedInvolvement[];
  implementerName: string;
}

export const ImplementerAllCartoriosTable: React.FC<ImplementerAllCartoriosTableProps> = ({
  involvements,
  implementerName,
}) => {
  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="py-4 bg-muted/30 border-b border-border">
        <CardTitle className="text-sm font-bold tracking-tight text-foreground">
          4. Visão Geral dos {involvements.length} Cartórios com Atuação de {implementerName} no Siplan HUB
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Mapeamento completo de todos os {involvements.length} projetos da base que possuem registro de atuação de {implementerName} (incluindo Aderência, Homologações, Implantação Fase 1 e Pós-Implantação):
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900 text-slate-100">
            <TableRow className="hover:bg-slate-900 border-slate-800">
              <TableHead className="text-slate-100 font-bold text-xs">Cartório / Cliente</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs w-[100px]">Ticket</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs w-[110px]">Sistema</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs">Etapas de Atuação</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs text-center w-[140px]">Fase 1 Lead?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {involvements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                  Nenhum cartório registrado com atuação para este profissional.
                </TableCell>
              </TableRow>
            ) : (
              involvements.map((inv) => (
                <TableRow key={inv.project.id} className="hover:bg-muted/40 transition-colors border-b border-border/60">
                  <TableCell className="font-bold text-xs text-foreground">
                    {inv.project.clientName}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-muted-foreground">
                    #{inv.project.ticketNumber}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-muted-foreground">
                    {inv.project.systemType}
                  </TableCell>
                  <TableCell className="text-xs text-foreground/90 font-medium">
                    {inv.involvedStagesText}
                  </TableCell>
                  <TableCell className="text-center">
                    {inv.isPhase1Lead ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-extrabold bg-green-500/15 text-green-600 border-green-500/30 px-2.5 py-0.5"
                      >
                        SIM (Fase 1)
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">
                        Não
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
