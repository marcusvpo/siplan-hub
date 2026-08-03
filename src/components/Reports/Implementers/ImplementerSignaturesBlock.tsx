import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ImplementerSignaturesBlockProps {
  implementerName: string;
  leaderName?: string;
}

export const ImplementerSignaturesBlock: React.FC<ImplementerSignaturesBlockProps> = ({
  implementerName,
  leaderName = "Bruno Fernandes",
}) => {
  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-sm font-bold tracking-tight text-foreground/90">
        5. Aprovação e Homologação do Relatório Global
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Implementador */}
        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Implantador Responsável (Fase 1)
            </div>
            <div className="pt-6 border-t border-border/60 space-y-0.5">
              <div className="text-sm font-black text-foreground">
                {implementerName}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Analista de Implantação — Siplan HUB
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Liderança */}
        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Liderança de Operações e Projetos
            </div>
            <div className="pt-6 border-t border-border/60 space-y-0.5">
              <div className="text-sm font-black text-foreground">
                {leaderName}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Líder de Implantação e Projetos
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
