import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useActiveTemplate } from "@/hooks/useFormTemplates";
import { useProjectFormResponse, useUpsertFormResponse } from "@/hooks/useProjectFormResponse";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  RefreshCw, 
  Send, 
  ShieldCheck, 
  Undo, 
  FileWarning, 
  CheckCircle, 
  ClipboardCheck, 
  AlertCircle,
  Printer
} from "lucide-react";

import { getImpactedItems, ImpactedItem } from "@/utils/adherence-helpers";


interface PrintQuestion {
  id: string;
  title: string;
  isText: boolean;
  utiliza: boolean;
  valor: string;
  detalhes: string;
  nivel_impacto: string;
  impacto: boolean;
}

interface PrintSection {
  title: string;
  questions: PrintQuestion[];
}

const getPrintSections = (schema: any, formData: any): PrintSection[] => {
  const sections: PrintSection[] = [];
  if (!schema || !schema.properties) return sections;
  
  const data = formData || {};

  Object.keys(schema.properties).forEach((sectionKey) => {
    const sectionSchema = schema.properties[sectionKey];
    if (!sectionSchema || typeof sectionSchema !== "object" || sectionSchema.type !== "object") return;
    
    const sectionProperties = sectionSchema.properties || {};
    const hasImpactoInProps = "impacto" in sectionProperties;
    
    if (hasImpactoInProps) {
      const qData = data[sectionKey] || {};
      const isText = "valor" in sectionProperties;
      const utiliza = qData.utiliza ?? false;
      const valor = qData.valor ?? "";
      const detalhes = qData.detalhes ?? "";
      const nivel_impacto = qData.nivel_impacto ?? (qData.impacto ? "SIM" : "NÃO");
      const impacto = nivel_impacto === "SIM" || nivel_impacto === "ATENÇÃO";
      
      let generalSection = sections.find(s => s.title === "Geral");
      if (!generalSection) {
        generalSection = { title: "Geral", questions: [] };
        sections.push(generalSection);
      }
      generalSection.questions.push({
        id: sectionKey,
        title: sectionSchema.title || "Pergunta",
        isText,
        utiliza,
        valor,
        detalhes,
        nivel_impacto,
        impacto,
      });
    } else {
      const questions: PrintQuestion[] = [];
      const secData = data[sectionKey] || {};
      
      Object.keys(sectionProperties).forEach((questionKey) => {
        const questionSchema = sectionProperties[questionKey];
        if (!questionSchema || typeof questionSchema !== "object") return;
        
        const qData = secData[questionKey] || {};
        const qProps = (questionSchema as any).properties || {};
        const isText = "valor" in qProps;
        const utiliza = qData.utiliza ?? false;
        const valor = qData.valor ?? "";
        const detalhes = qData.detalhes ?? "";
        const nivel_impacto = qData.nivel_impacto ?? (qData.impacto ? "SIM" : "NÃO");
        const impacto = nivel_impacto === "SIM" || nivel_impacto === "ATENÇÃO";
        
        questions.push({
          id: questionKey,
          title: (questionSchema as any).title || "Pergunta",
          isText,
          utiliza,
          valor,
          detalhes,
          nivel_impacto,
          impacto,
        });
      });
      
      if (questions.length > 0) {
        sections.push({
          title: sectionSchema.title || "Sem Título",
          questions,
        });
      }
    }
  });
  
  return sections;
};

interface PrintGeneralField {
  key: string;
  title: string;
  type: string;
  value: any;
  options?: string[];
}

const isImageUrl = (val: any): boolean => {
  if (typeof val !== "string") return false;
  const lower = val.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.includes("/storage/v1/object/public/")
  );
};

export const extractUrlsFromValue = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.filter((item) => isImageUrl(item));
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => isImageUrl(item));
      }
    } catch {
      // not JSON
    }
    if (isImageUrl(val)) {
      return val.split(",").map((s) => s.trim()).filter((s) => isImageUrl(s));
    }
  }
  return [];
};

const getGeneralFields = (schema: any, formData: any, uiSchema?: any): PrintGeneralField[] => {
  const fields: PrintGeneralField[] = [];
  if (!schema || !schema.properties) return fields;
  
  const data = formData || {};
  
  Object.keys(schema.properties).forEach((key) => {
    const propSchema = schema.properties[key];
    if (!propSchema || typeof propSchema !== "object") return;
    
    const isSection = propSchema.type === "object" && 
      Object.values((propSchema as any).properties || {}).some((p: any) => p.type === "object" && "impacto" in (p.properties || {}));
      
    if (!isSection) {
      let type = propSchema.type;
      const uiWidget = uiSchema?.[key]?.["ui:widget"];
      const valUrls = extractUrlsFromValue(data[key]);

      if (uiWidget === "imageUpload" || valUrls.length > 0 || (propSchema.type === "array" && (propSchema as any).items?.type === "object")) {
        type = "images";
      } else if (propSchema.type === "array" && (propSchema as any).items?.type === "string") {
        type = "checkboxes";
      }
      
      fields.push({
        key,
        title: (propSchema as any).title || key,
        type: type || "string",
        value: data[key],
        options: (propSchema as any).enum || (propSchema as any).items?.enum || (propSchema as any).items?.options || undefined
      });
    }
  });
  
  return fields;
};

export default function ProjectAdherenceForm() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const { canEditProjects } = usePermissions();

  // Queries
  const { project, isLoading: isLoadingProj } = useProjectDetails(projectId || null);
  const { data: response, isLoading: isLoadingResp, refetch: refetchResp } = useProjectFormResponse(projectId || "", "adherence");
  
  // Get active template based on project system type
  const systemType = project?.systemType || "";
  const { data: activeTemplate, isLoading: isLoadingTpl } = useActiveTemplate("adherence", systemType);

  // Mutation
  const upsertMutation = useUpsertFormResponse();

  // Local state for auto-saving form data
  const [localFormData, setLocalFormData] = useState<any>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const isPrintMode = new URLSearchParams(window.location.search).get("print") === "true";

  const getAnalysisDate = () => {
    const isFinalized = response?.status === "approved" || response?.status === "approved_with_restrictions" || response?.status === "rejected";
    if (isFinalized && response?.approved_at) {
      return new Date(response.approved_at).toLocaleDateString("pt-BR");
    }
    return new Date().toLocaleDateString("pt-BR");
  };

  // Trigger browser print dialog when in print mode and fully loaded
  useEffect(() => {
    if (isPrintMode && !isLoadingProj && !isLoadingResp && !isLoadingTpl && project && response) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPrintMode, isLoadingProj, isLoadingResp, isLoadingTpl, project, response]);

  // Sync local data with fetched response
  useEffect(() => {
    if (response?.data) {
      setLocalFormData(response.data);
    } else {
      setLocalFormData({});
    }
  }, [response?.data]);

  // Debounce form data updates (1.2 seconds)
  const debouncedFormData = useDebounce(localFormData, 1200);

  // Auto-save changes
  useEffect(() => {
    if (!response || !activeTemplate || !projectId) return;

    // Check if there are differences before saving
    const hasChanges = JSON.stringify(debouncedFormData) !== JSON.stringify(response.data);
    
    // Only auto-save if form is editable (draft state)
    const isFormLocked = response.status === "approved" || response.status === "approved_with_restrictions" || response.status === "rejected" || !canEditProjects;

    if (hasChanges && !isFormLocked) {
      setIsAutoSaving(true);
      upsertMutation.mutate(
        {
          project_id: projectId,
          template_id: activeTemplate.id,
          stage: "adherence",
          data: debouncedFormData,
          status: response.status, // preserve current status during autosave
        },
        {
          onSuccess: () => {
            setIsAutoSaving(false);
            // Refetch to align data state
            refetchResp();
          },
          onError: () => {
            setIsAutoSaving(false);
            toast({
              title: "Erro de salvamento",
              description: "Falha ao salvar rascunho automaticamente.",
              variant: "destructive",
            });
          },
        }
      );
    }
  }, [debouncedFormData]);

  const handleFinalizeForm = () => {
    if (!response || !activeTemplate || !projectId) return;

    // Validate that the final verdict and notes are filled
    const verdict = localFormData.finalVerdict;
    const notes = localFormData.finalNotes;

    if (!verdict) {
      toast({
        title: "Parecer obrigatório",
        description: "Selecione o Parecer Técnico Final antes de concluir o formulário.",
        variant: "destructive",
      });
      return;
    }

    if (!notes || !notes.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Descreva a justificativa/parecer técnico antes de concluir o formulário.",
        variant: "destructive",
      });
      return;
    }

    // Determine the status to submit based on verdict
    let statusToSubmit: "approved" | "approved_with_restrictions" | "rejected" = "approved";
    if (verdict === "Aderente com Restrições") {
      statusToSubmit = "approved_with_restrictions";
    } else if (verdict === "Não Aderente / Impeditivo") {
      statusToSubmit = "rejected";
    }

    upsertMutation.mutate(
      {
        project_id: projectId,
        template_id: activeTemplate.id,
        stage: "adherence",
        data: localFormData,
        status: statusToSubmit,
      },
      {
        onSuccess: () => {
          toast({
            title: "Análise Concluída",
            description: "Formulário de aderência finalizado com sucesso.",
            className: "bg-green-500 text-white border-green-600",
          });
          refetchResp();
        },
      }
    );
  };

  const handleReopenForm = () => {
    if (!response || !activeTemplate || !projectId) return;

    upsertMutation.mutate(
      {
        project_id: projectId,
        template_id: activeTemplate.id,
        stage: "adherence",
        data: localFormData,
        status: "draft", // Return to draft
      },
      {
        onSuccess: () => {
          toast({
            title: "Formulário Reaberto",
            description: "Formulário retornado para rascunho de edição.",
          });
          refetchResp();
        },
      }
    );
  };

  if (isLoadingProj || isLoadingResp || isLoadingTpl) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-5xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-destructive">Projeto não encontrado</h2>
        <Button onClick={() => navigate("/projects")}>Voltar para Projetos</Button>
      </div>
    );
  }

  if (!activeTemplate) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para o Projeto
        </Button>
        <Card className="border-amber-200 dark:border-amber-500/40 bg-amber-500/5 dark:bg-transparent">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <FileWarning className="h-5 w-5" /> Sem Template de Aderência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Não há um template de aderência ativo publicado para o sistema <strong>{systemType}</strong>.
            </p>
            <Button onClick={() => navigate(`/projects/${projectId}`)}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If response doesn't exist, we must generate it (or redirect back to project page to generate it)
  if (!response) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para o Projeto
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" /> Formulário Não Inicializado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O formulário de aderência para este projeto ainda não foi gerado.
            </p>
            <Button onClick={() => navigate(`/projects/${projectId}`)}>Voltar para Etapas</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFormLocked = response.status === "approved" || response.status === "approved_with_restrictions" || response.status === "rejected" || !canEditProjects;
  const isFinalized = response.status === "approved" || response.status === "approved_with_restrictions" || response.status === "rejected";

  if (isPrintMode) {
    const printSections = getPrintSections(activeTemplate.schema_json, localFormData);
    const generalFields = getGeneralFields(activeTemplate.schema_json, localFormData, activeTemplate.ui_json);
    const impactedItems = getImpactedItems(activeTemplate.schema_json, localFormData);

    return (
      <div className="bg-white text-black min-h-screen font-sans p-6 md:p-10 max-w-4xl mx-auto space-y-8 select-none">
        <style>{`
          @media print {
            body {
              background-color: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .print-card {
              border: 1px solid #e2e8f0 !important;
              background: white !important;
              break-inside: avoid;
            }
            .print-break-inside-avoid {
              break-inside: avoid !important;
            }
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        `}</style>

        {/* Screen Toolbar (no-print) */}
        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-lg no-print mb-6">
          <div className="flex items-center gap-2">
            <Printer className="h-4.5 w-4.5 text-primary animate-pulse" />
            <div className="space-y-0.5 text-left">
              <span className="text-xs font-bold block">Visualização do Relatório Oficial</span>
              <p className="text-[10px] text-slate-400">O diálogo de impressão do navegador foi acionado automaticamente.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => window.print()}
              className="h-8 text-xs font-bold px-4 bg-primary hover:bg-primary/90 text-white"
            >
              Imprimir Novamente
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => window.close()}
              className="h-8 text-xs font-bold text-white hover:bg-slate-800 border border-slate-700"
            >
              Fechar Aba
            </Button>
          </div>
        </div>

        {/* Official Header */}
        <div className="border-b-4 border-slate-800 pb-5 space-y-4 text-left">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold tracking-wider uppercase text-slate-900">
                Relatório de Análise de Aderência
              </h1>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                Siplan HUB &bull; Engenharia de Implantação
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold bg-slate-100 border border-slate-200 px-3 py-1.5 rounded uppercase tracking-wider">
                Versão {activeTemplate.version}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs bg-slate-50 p-4 rounded-lg border">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Cliente / Projeto</span>
              <strong className="text-slate-800 text-[13px]">{project.clientName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Ticket</span>
              <strong className="text-slate-800 text-[13px]">#{project.ticketNumber}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Sistema / Produto</span>
              <strong className="text-slate-800 text-[13px]">{project.systemType}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Implantador</span>
              <strong className="text-slate-800 text-[13px]">{project.responsibleAdherence || "Não definido"}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Data da Análise</span>
              <strong className="text-slate-800 text-[13px]">{getAnalysisDate()}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Status Homologação</span>
              <div className="mt-0.5">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded border uppercase tracking-wider ${
                  isFinalized 
                    ? (localFormData.finalVerdict === "Totalmente Aderente"
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : localFormData.finalVerdict === "Aderente com Restrições"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-rose-100 text-rose-800 border-rose-200")
                    : "bg-slate-100 text-slate-800 border-slate-200"
                }`}>
                  {isFinalized 
                    ? (localFormData.finalVerdict || "Finalizado") 
                    : "Rascunho"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Informações Gerais */}
        {generalFields.length > 0 && (
          <div className="space-y-3 print-break-inside-avoid print-card p-5 border rounded-xl bg-slate-50/50 text-left">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b pb-1.5">
              1. Informações Gerais de Aderência
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
              {generalFields.map((field) => {
                const urls = extractUrlsFromValue(field.value);
                if (field.type === "images" || urls.length > 0) {
                  const displayUrls = urls.length > 0 ? urls : (Array.isArray(field.value) ? field.value : []);
                  if (displayUrls.length === 0) return null;
                  return (
                    <div key={field.key} className="col-span-1 md:col-span-2 space-y-2 mt-2">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">{field.title}</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {displayUrls.map((url, idx) => (
                          <div key={idx} className="border rounded-md overflow-hidden aspect-square bg-slate-100 shadow-sm">
                            <img src={url} alt={`${field.title} ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                let displayVal = "";
                if (field.type === "boolean") {
                  displayVal = field.value ? "Sim" : "Não";
                } else if (Array.isArray(field.value)) {
                  displayVal = field.value.join(", ");
                } else {
                  displayVal = String(field.value || "Não informado");
                }

                return (
                  <div key={field.key} className={field.type === "textarea" ? "col-span-1 md:col-span-2" : "col-span-1"}>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">{field.title}</span>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap mt-0.5">{displayVal}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Itens com impacto Summary Block */}
        <div className="print-break-inside-avoid text-left">
          {impactedItems.length === 0 ? (
            <div className="p-4 border border-dashed border-emerald-300 bg-emerald-50/30 rounded-xl flex items-start gap-3">
              <div className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</div>
              <span className="text-xs font-semibold text-emerald-800">
                Nenhum gap técnico ou impacto identificado no checklist de aderência.
              </span>
            </div>
          ) : (
            <div className="p-5 border-2 border-rose-300 bg-rose-50 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2 border-b border-rose-200 pb-2">
                <span className="text-xs font-black text-rose-800 uppercase tracking-widest">
                  Itens com impacto na implantação:
                </span>
                <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                  {impactedItems.length}
                </span>
              </div>
              <div className="space-y-3">
                {impactedItems.map((item, idx) => {
                  const isAttention = item.nivel_impacto === "ATENÇÃO";
                  return (
                    <div key={idx} className="text-xs space-y-1 pb-2 border-b border-rose-100 last:border-0 last:pb-0">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase flex-wrap">
                        <span>{item.sectionTitle}</span>
                        <span>&bull;</span>
                        <span className={isAttention ? "text-amber-700" : "text-rose-700"}>
                          {item.questionTitle}
                        </span>
                        <span>&bull;</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                          isAttention 
                            ? "bg-amber-100 text-amber-800 border-amber-200" 
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        }`}>
                          {isAttention ? "Ponto de Atenção" : "Não Aderente"}
                        </span>
                      </div>
                      <div className={`border-l-4 pl-3 py-1 font-semibold italic rounded-r-md text-xs ${
                        isAttention 
                          ? "border-amber-500 bg-amber-500/5 text-amber-700" 
                          : "border-rose-500 bg-rose-500/5 text-rose-700"
                      }`}>
                        Impacto: {item.detalhes}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detalhamento das Seções */}
        <div className="space-y-6 text-left">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b pb-1.5">
            2. Detalhamento Técnico por Seção
          </h2>

          {printSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-3 print-break-inside-avoid">
              <h3 className="text-sm font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-slate-700 uppercase tracking-wider">
                {section.title}
              </h3>

              <div className="divide-y border rounded-lg overflow-hidden bg-white">
                {section.questions.map((q) => (
                  <div 
                    key={q.id} 
                    className={`p-4 text-xs transition-colors space-y-2.5 ${
                      q.nivel_impacto === "SIM" 
                        ? "bg-rose-50/20" 
                        : q.nivel_impacto === "ATENÇÃO"
                          ? "bg-amber-50/20"
                          : (q.utiliza || (q.isText && q.valor))
                            ? "bg-emerald-50/10"
                            : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-bold text-slate-800 leading-snug">
                        {q.title}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shrink-0 border ${
                        q.nivel_impacto === "SIM" 
                          ? "bg-rose-100 text-rose-800 border-rose-200" 
                          : q.nivel_impacto === "ATENÇÃO"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}>
                        {q.nivel_impacto === "SIM" 
                          ? "Não Aderente" 
                          : q.nivel_impacto === "ATENÇÃO"
                            ? "Ponto de Atenção"
                            : "Aderente"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Resposta:</span>
                        {q.isText ? (
                          <p className="text-slate-700 font-medium mt-0.5">{q.valor || "Não respondida"}</p>
                        ) : (
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            q.utiliza 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {q.utiliza ? "Sim (Utiliza)" : "Não utiliza"}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Possui Impacto?</span>
                        <div className="mt-1 flex flex-col gap-1">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border w-fit ${
                            q.nivel_impacto === "SIM"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : q.nivel_impacto === "ATENÇÃO"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {q.nivel_impacto || "NÃO"}
                          </span>
                          {q.detalhes && (
                            <p className="text-slate-600 font-medium italic mt-0.5 leading-relaxed">
                              {q.detalhes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Parecer Técnico Conclusivo */}
        <div className="space-y-4 print-break-inside-avoid text-left border-t pt-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b pb-1.5">
            3. Parecer Técnico Conclusivo
          </h2>

          <div className="p-5 border rounded-xl bg-slate-50 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Resultado da Homologação:</span>
              <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
                localFormData.finalVerdict === "Totalmente Aderente"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : localFormData.finalVerdict === "Aderente com Restrições"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : localFormData.finalVerdict === "Não Aderente / Impeditivo"
                  ? "bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {localFormData.finalVerdict || "Não Informado"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Justificativa e Considerações Finais:</span>
              <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap bg-white p-3 rounded-lg border italic">
                {localFormData.finalNotes || "Nenhuma consideração registrada."}
              </p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="pt-12 mt-12 border-t border-dashed print-break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-16">
              <div className="border-b border-slate-400 mx-auto w-3/4"></div>
              <div>
                <strong className="text-slate-800 block">Implantador Responsável</strong>
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Siplan HUB</span>
              </div>
            </div>
            <div className="space-y-16">
              <div className="border-b border-slate-400 mx-auto w-3/4"></div>
              <div>
                <strong className="text-slate-800 block">Responsável Técnico / Cliente</strong>
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Homologação</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/projects/${projectId}`)} 
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o Projeto
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                Análise de Aderência
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/projects/${projectId}/adherence?print=true`, "_blank")}
              className="h-8 gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/5 mr-2"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir / PDF
            </Button>

            {isAutoSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Auto-salvando...
              </span>
            )}
          </div>
        </div>

        {/* Informações de Cabeçalho */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 rounded-xl border bg-muted/20 text-xs text-left mt-2">
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Cliente / Projeto</span>
            <strong className="text-foreground text-[13px]">{project.clientName}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Ticket</span>
            <strong className="text-foreground text-[13px]">#{project.ticketNumber}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Sistema / Produto</span>
            <strong className="text-foreground text-[13px]">{project.systemType}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Implantador</span>
            <strong className="text-foreground text-[13px]">{project.responsibleAdherence || "Não definido"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Data da Análise</span>
            <strong className="text-foreground text-[13px]">{getAnalysisDate()}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Status Homologação</span>
            <div className="mt-0.5">
              <Badge className={`text-[10px] font-bold px-2 py-0.2 border uppercase tracking-wider rounded ${
                isFinalized 
                  ? (localFormData.finalVerdict === "Totalmente Aderente"
                    ? "bg-green-500/10 text-green-600 border-green-500/20" 
                    : localFormData.finalVerdict === "Aderente com Restrições"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20")
                  : "bg-slate-500/10 text-slate-600 border-slate-500/20"
              }`}>
                {isFinalized 
                  ? (localFormData.finalVerdict || "Finalizado") 
                  : "Rascunho"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <Card className="shadow-lg border-muted/50 overflow-hidden bg-card">
        <CardHeader className="bg-muted/20 pb-4 border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <ClipboardCheck className="h-4.5 w-4.5" />
            Especificação Técnica de Aderência
          </CardTitle>
          <CardDescription className="text-xs">
            Preencha todos os campos e descreva observações detalhadas para itens que possuam impacto.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <FormRenderer
            projectId={projectId}
            schema={activeTemplate.schema_json}
            uiSchema={activeTemplate.ui_json}
            formData={localFormData}
            onChange={({ formData }) => {
              if (!isFormLocked) {
                setLocalFormData(formData);
              }
            }}
            readonly={isFormLocked}
            disabled={isFormLocked}
            showSubmit={false}
          />

          {/* Conclusão da Análise Section */}
          <div className="mt-8 pt-6 border-t border-dashed space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-left">
              Conclusão da Análise de Aderência
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="verdict" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Parecer Técnico Final
                </Label>
                <Select
                  value={localFormData.finalVerdict || ""}
                  onValueChange={(val) => {
                    if (!isFormLocked) {
                      setLocalFormData(prev => ({ ...prev, finalVerdict: val }));
                    }
                  }}
                  disabled={isFormLocked}
                >
                  <SelectTrigger id="verdict" className="bg-background text-xs h-9 border-muted-foreground/20 font-medium">
                    <SelectValue placeholder="Selecione o veredito..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Totalmente Aderente" className="text-xs font-semibold text-emerald-600">
                      Totalmente Aderente
                    </SelectItem>
                    <SelectItem value="Aderente com Restrições" className="text-xs font-semibold text-amber-600">
                      Aderente com Restrições
                    </SelectItem>
                    <SelectItem value="Não Aderente / Impeditivo" className="text-xs font-semibold text-rose-600">
                      Não Aderente / Impeditivo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="concludingNotes" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Justificativa / Parecer Técnico
                </Label>
                <Textarea
                  id="concludingNotes"
                  value={localFormData.finalNotes || ""}
                  onChange={(e) => {
                    if (!isFormLocked) {
                      setLocalFormData(prev => ({ ...prev, finalNotes: e.target.value }));
                    }
                  }}
                  disabled={isFormLocked}
                  className="bg-background text-xs min-h-[70px] border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder="Resuma os gaps identificados e a justificativa técnica para o parecer..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {canEditProjects && (
        <Card className="shadow-md border-muted/50">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground italic">
              {response.status === "draft" && "As alterações são salvas automaticamente no rascunho."}
              {isFinalized && `Formulário concluído com parecer: ${response.data?.finalVerdict || ""}. Alterações travadas.`}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {/* Draft actions: Finalize */}
              {response.status === "draft" && (
                <Button 
                  onClick={handleFinalizeForm} 
                  disabled={upsertMutation.isPending}
                  className="text-xs font-semibold gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  Finalizar Formulário
                </Button>
              )}

              {/* Approved actions: Reopen */}
              {isFinalized && (
                <Button 
                  onClick={handleReopenForm} 
                  variant="outline"
                  disabled={upsertMutation.isPending}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Undo className="h-3.5 w-3.5" />
                  Reabrir para Edição
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
