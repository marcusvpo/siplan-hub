import React from "react";
import type { Phase1ProjectDetail } from "@/hooks/useImplementerReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImplementerPhase1ConsolidatedTableProps {
  details: Phase1ProjectDetail[];
}

export const ImplementerPhase1ConsolidatedTable: React.FC<ImplementerPhase1ConsolidatedTableProps> = ({
  details,
}) => {
  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="py-3.5 bg-muted/30 border-b border-border">
        <CardTitle className="text-sm font-bold tracking-tight text-foreground">
          2. Tabela Consolidada das {details.length} Implantações (Fase 1 — Treinamento & Acompanhamento)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900 text-slate-100">
            <TableRow className="hover:bg-slate-900 border-slate-800">
              <TableHead className="text-slate-100 font-bold text-xs w-[100px]">Ticket</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs">Cartório / Cliente</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs w-[110px]">Sistema</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs w-[200px]">Período Fase 1 (Virada)</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs text-center w-[130px]">Status F1</TableHead>
              <TableHead className="text-slate-100 font-bold text-xs text-center w-[120px]">Global</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                  Nenhuma implantação de Fase 1 registrada como responsável titular.
                </TableCell>
              </TableRow>
            ) : (
              details.map((item) => {
                const isF1Done = item.statusF1Text === "Concluído";
                const isGlobalDone = item.globalStatusText === "Concluído";

                return (
                  <TableRow key={item.project.id} className="hover:bg-muted/40 transition-colors border-b border-border/60">
                    <TableCell className="font-semibold text-xs text-muted-foreground">
                      #{item.project.ticketNumber}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-foreground">
                      {item.project.clientName}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground">
                      {item.systemType}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-primary">
                      {item.periodText}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0.5 ${
                          isF1Done
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                        }`}
                      >
                        {item.statusF1Text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2.5 py-0.5 ${
                          isGlobalDone
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {item.globalStatusText}
                      </Badge>
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
};
