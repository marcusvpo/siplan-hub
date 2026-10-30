import React from "react";
import { ProjectV2 } from "@/types/ProjectV2";
import { useDetected0800CommercialData } from "@/hooks/useDetected0800CommercialData";
import { Sparkles, Clock, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectCommercial0800BridgeProps {
  project: ProjectV2;
  onProjectUpdated?: (updatedProject?: Partial<ProjectV2>) => void;
  className?: string;
}

export function ProjectCommercial0800Bridge({
  project,
  onProjectUpdated,
  className,
}: ProjectCommercial0800BridgeProps) {
  const { detectedData, isLoading, applyData, isApplying } =
    useDetected0800CommercialData(project.ticketNumber, project.id);

  // Se for "Modelos TN", horas e legado têm regras distintas do sistema principal normal
  if (project.systemType === "Modelos TN") {
    return null;
  }

  // Verifica se o projeto já possui ambos os campos preenchidos
  const hasHours = project.soldHours !== undefined && project.soldHours !== null;
  const hasLegacy =
    project.legacySystem !== undefined &&
    project.legacySystem !== null &&
    project.legacySystem.trim() !== "" &&
    project.legacySystem !== "-";

  // Se o projeto já tem ambos preenchidos, não precisa poluir a tela
  if (hasHours && hasLegacy) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn("animate-pulse rounded-lg border border-border/50 bg-muted/20 p-2 text-xs", className)}>
        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Verificando trâmites do 0800...</span>
        </div>
      </div>
    );
  }

  // CASO 1: Informações encontradas nos trâmites do 0800
  if (detectedData?.found && !detectedData?.already_applied) {
    const hoursLabel = detectedData.sold_hours ? `${detectedData.sold_hours}h` : "";
    const legacyLabel = detectedData.legacy_system ? detectedData.legacy_system : "";
    const separator = hoursLabel && legacyLabel ? " • " : "";
    const summaryText = `${hoursLabel}${separator}${legacyLabel}`;
    const tramiteNum = detectedData.tramite_numero || 4;

    const handleApply = async () => {
      const res = await applyData();
      if (res?.success) {
        onProjectUpdated?.({
          soldHours: res.applied_hours ?? (detectedData.sold_hours ?? undefined),
          legacySystem: res.applied_legacy ?? (detectedData.legacy_system ?? undefined),
        });
      }
    };

    return (
      <div
        className={cn(
          "rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-2.5 shadow-sm transition-all hover:border-amber-500/60 dark:border-amber-500/30",
          className
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Encontrado no Trâmite {tramiteNum} do 0800:
              </span>
              <span className="font-extrabold text-foreground underline decoration-amber-500 decoration-2 underline-offset-2">
                {summaryText}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Identificado na negociação comercial do Ellevo. Clique para salvar direto no projeto.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={isApplying}
            onClick={handleApply}
            className="h-7 shrink-0 gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm shadow-amber-600/20"
          >
            {isApplying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span>Aplicar</span>
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // CASO 2: Projeto ainda sem Horas ou Legado, e 0800 ainda não tem trâmite comercial (aguardando Trâmite 4)
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground/80",
        className
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span className="truncate">
        Aguardando informações de Legado e Horas nos Trâmites do chamado do 0800
      </span>
    </div>
  );
}
