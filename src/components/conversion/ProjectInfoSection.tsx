import { Building } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConversionQueueItem } from "@/hooks/useConversionQueue";

interface ProjectInfo {
  projectLeader: string | null;
  implantationType: string | null;
  legacySystem: string | null;
  soldHours: number | null;
  description: string | null;
}

interface ProjectInfoSectionProps {
  projectInfo: ProjectInfo;
  item: ConversionQueueItem;
}

export function ProjectInfoSection({ projectInfo, item }: ProjectInfoSectionProps) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 border">
      <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
        <Building className="h-4 w-4" />
        Informações do Projeto
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-xs text-muted-foreground block">
            Líder do Projeto
          </span>
          <span className="font-medium">
            {projectInfo.projectLeader || "—"}
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">
            Data Prevista para Implantação
          </span>
          <span className="font-medium">
            {item.deploymentDate
              ? format(new Date(item.deploymentDate), "dd/MM/yyyy", {
                  locale: ptBR,
                })
              : "Ainda Sem Previsão"}
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">
            Sistema Legado
          </span>
          <span className="font-medium">
            {projectInfo.legacySystem || "—"}
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">
            Horas Vendidas
          </span>
          <span className="font-medium">
            {projectInfo.soldHours || "—"}
          </span>
        </div>
        {projectInfo.description && (
          <div className="col-span-full">
            <span className="text-xs text-muted-foreground block">
              Descrição
            </span>
            <span className="font-medium">
              {projectInfo.description}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
