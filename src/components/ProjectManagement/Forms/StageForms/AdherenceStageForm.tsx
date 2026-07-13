import { AdherenceStageV2 } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useActiveTemplate } from "@/hooks/useFormTemplates";
import { useProjectFormResponse, useUpsertFormResponse } from "@/hooks/useProjectFormResponse";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Link, useNavigate } from "react-router-dom";
import { FileWarning, CheckCircle, ClipboardCheck, ArrowUpRight, AlertTriangle } from "lucide-react";


interface AdherenceStageFormProps {
  projectId: string;
  systemType: string;
  stage: AdherenceStageV2;
  canEditProjects: boolean;
  onUpdate: (updates: Partial<AdherenceStageV2>) => void;
}

export function AdherenceStageForm({
  projectId,
  systemType,
  stage,
  canEditProjects,
  onUpdate,
}: AdherenceStageFormProps) {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  
  // Queries
  const { data: activeTemplate, isLoading: isLoadingTpl } = useActiveTemplate("adherence", systemType);
  const { data: response, isLoading: isLoadingResp } = useProjectFormResponse(projectId, "adherence");

  // Mutation
  const upsertMutation = useUpsertFormResponse();

  const handleGenerateForm = () => {
    if (!activeTemplate) return;
    
    upsertMutation.mutate(
      {
        project_id: projectId,
        template_id: activeTemplate.id,
        stage: "adherence",
        data: {},
        status: "draft",
      },
      {
        onSuccess: () => {
          toast({
            title: "Formulário Gerado!",
            description: `Formulário de Aderência para ${systemType} inicializado.`,
            className: "bg-green-500 text-white border-green-600",
          });
          // Redirect immediately to the full screen page
          navigate(`/projects/${projectId}/adherence`);
        },
      }
    );
  };


  if (isLoadingTpl || isLoadingResp) {
    return (
      <div className="col-span-1 md:col-span-2 lg:col-span-3 py-6 space-y-4">
        <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
        <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const isFinalized = response?.status === "approved" || response?.status === "approved_with_restrictions" || response?.status === "rejected";
  const isFormLocked = isFinalized || !canEditProjects;

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
      {/* 1. Dynamic template form link */}
      {!activeTemplate ? (
        <div className="p-3 border border-amber-300/40 bg-amber-500/5 dark:bg-transparent rounded-lg flex items-start gap-2">
          <FileWarning className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-amber-600">Sem Template de Aderência</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Não há um template de aderência ativo publicado para o sistema <strong>{systemType}</strong>. 
              Entre em contato com um administrador para publicar um template em <strong>Implantadores &gt; Editor de Aderência</strong>.
            </p>
          </div>
        </div>
      ) : !response ? (
        <div className="p-4 border border-dashed rounded-lg flex flex-col items-center justify-center text-center space-y-3 bg-muted/10">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold">Formulário de Aderência Pendente</h4>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Gere o questionário técnico de aderência para o sistema <strong>{systemType}</strong> para verificar gaps operacionais do projeto.
            </p>
          </div>
          <Button 
            onClick={handleGenerateForm} 
            disabled={!canEditProjects || upsertMutation.isPending}
            size="sm"
            className="px-4 h-8 text-xs font-semibold gap-1.5"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Gerar Formulário de Aderência ({systemType})
          </Button>
        </div>
      ) : (
        <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ClipboardCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground">Formulário de Aderência Inicializado</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                O questionário técnico para verificar os gaps operacionais do sistema <strong>{systemType}</strong> está pronto.
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] text-muted-foreground font-semibold">Status:</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  isFinalized 
                    ? (response.data?.finalVerdict === "Totalmente Aderente"
                      ? "bg-green-500/10 text-green-600 border-green-500/20" 
                      : response.data?.finalVerdict === "Aderente com Restrições"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/20")
                    : "bg-neutral-500/10 text-neutral-600 border-neutral-500/20"
                }`}>
                  {isFinalized 
                    ? (response.data?.finalVerdict || "Finalizado") 
                    : "Rascunho"}
                </span>
              </div>
            </div>
          </div>
          <Link to={`/projects/${projectId}/adherence`} className="shrink-0">
            <Button size="sm" className="text-xs font-semibold gap-1.5 h-8 px-3">
              Acessar Formulário
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      <div className="border-t pt-3 space-y-2.5">
        <div className="flex items-center space-x-2 p-2 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Checkbox
            id="has-gap"
            checked={stage.hasProductGap || false}
            onCheckedChange={(checked) =>
              onUpdate({ hasProductGap: checked === true })
            }
            disabled={!canEditProjects || isFinalized}
            className="border-neutral-350 dark:border-neutral-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label
            htmlFor="has-gap"
            className="text-neutral-700 dark:text-neutral-300 font-bold cursor-pointer text-[10px] uppercase tracking-wider flex items-center gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            Existe Gap de Produto?
          </Label>
        </div>
        {stage.hasProductGap && (
          <div className="bg-neutral-50/30 dark:bg-neutral-950/10 p-3 rounded-lg space-y-2 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Descrição do Gap
              </Label>
              <Textarea
                value={stage.gapDescription || ""}
                onChange={(e) => onUpdate({ gapDescription: e.target.value })}
                disabled={!canEditProjects || isFinalized}
                className="min-h-[70px] border border-input bg-background text-foreground hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 focus-visible:ring-1 focus-visible:ring-ring text-xs py-1.5"
                placeholder="Descreva detalhadamente o gap identificado..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
