import React from "react";
import type { ImplementerProfile } from "@/hooks/useImplementerReport";

interface ImplementerHeaderBannerProps {
  implementer: ImplementerProfile;
  totalBaseProjects: number;
}

export const ImplementerHeaderBanner: React.FC<ImplementerHeaderBannerProps> = ({
  implementer,
  totalBaseProjects,
}) => {
  return (
    <div className="bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-5 md:p-6 shadow-sm relative overflow-hidden transition-all hover:border-primary/30">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
      <div className="pl-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            Relatório Completo de Implantações —{" "}
            <span className="text-primary">{implementer.name}</span>
          </h2>
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase bg-muted/60 px-2.5 py-1 rounded-md border border-border">
            Equipe: {implementer.team || "Implementação"}
          </span>
        </div>

        <p className="text-xs md:text-sm font-medium text-muted-foreground">
          Varredura Exaustiva em Todos os{" "}
          <strong className="text-foreground">{totalBaseProjects} Projetos</strong> da Base de Dados do Siplan HUB
        </p>

        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Mapeamento Estrito: Responsável pela Fase 1 (Treinamento & Acompanhamento Presencial)
          </span>
        </div>
      </div>
    </div>
  );
};
