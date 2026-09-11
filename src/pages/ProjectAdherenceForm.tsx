import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useActiveTemplate } from "@/hooks/useFormTemplates";
import { useProjectFormResponse, useUpsertFormResponse } from "@/hooks/useProjectFormResponse";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { AiRichTextField } from "@/components/ui/ai-rich-text-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Printer,
  Save
} from "lucide-react";

import { getImpactedItems } from "@/utils/adherence-helpers";
import { richTextToPlainText } from "@/lib/lexical";
import {
  buildAdherenceTechnicalOpinionInput,
  isAdherenceImpactDescriptionTitle,
} from "@/lib/adherence-technical-opinion";
import {
  countIncompleteTitledImageAttachments,
  getCompletedTitledImageAttachments,
  TitledImageAttachment,
} from "@/lib/form-image-attachments";
import { getPrintEvidenceGridClass } from "@/lib/adherence-print-layout";
import { cn } from "@/lib/utils";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";


interface PrintQuestion {
  id: string;
  title: string;
  isText: boolean;
  utiliza: boolean;
  valor: string;
  detalhes: string;
  nivel_impacto: string;
  impacto: boolean;
  images: TitledImageAttachment[];
}

interface PrintSection {
  title: string;
  questions: PrintQuestion[];
}

type DraftSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const serializeFormData = (formData: unknown) => JSON.stringify(formData ?? {});

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
        images: getCompletedTitledImageAttachments(qData.imagens),
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
          images: getCompletedTitledImageAttachments(qData.imagens),
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
  const { user } = useAuth();
  const { canEditProjects } = usePermissions();

  // Queries
  const { project, isLoading: isLoadingProj } = useProjectDetails(projectId || null);
  const { data: response, isLoading: isLoadingResp, refetch: refetchResp } = useProjectFormResponse(projectId || "", "adherence");
  
  // Get active template based on project system type
  const systemType = project?.systemType || "";
  const { data: activeTemplate, isLoading: isLoadingTpl } = useActiveTemplate("adherence", systemType);

  // Mutation
  const { mutateAsync: upsertFormResponse, isPending: isUpserting } = useUpsertFormResponse();

  // Local state and refs used to persist draft changes without racing finalization.
  const [localFormData, setLocalFormData] = useState<any>({});
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hydratedResponseIdRef = useRef<string | null>(null);
  const latestFormDataRef = useRef(localFormData);
  const lastSavedDataRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const isTransitioningRef = useRef(false);

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

  // Sync server data only when there are no pending local edits. This prevents
  // query invalidation after a save from restoring an older form snapshot.
  useEffect(() => {
    if (!response) return;

    const serverData = response.data ?? {};
    const serverSerialized = serializeFormData(serverData);
    const hasLocalChanges =
      lastSavedDataRef.current !== null &&
      serializeFormData(latestFormDataRef.current) !== lastSavedDataRef.current;
    const isNewResponse = hydratedResponseIdRef.current !== response.id;

    if (isNewResponse || !hasLocalChanges) {
      latestFormDataRef.current = serverData;
      setLocalFormData(serverData);
      setDraftSaveStatus("saved");
    }

    hydratedResponseIdRef.current = response.id;
    lastSavedDataRef.current = serverSerialized;
    const serverSavedAt = new Date(response.updated_at);
    setLastSavedAt(Number.isNaN(serverSavedAt.getTime()) ? null : serverSavedAt);
  }, [response]);

  useEffect(() => {
    latestFormDataRef.current = localFormData;

    if (lastSavedDataRef.current === null || isTransitioningRef.current) return;

    if (serializeFormData(localFormData) !== lastSavedDataRef.current) {
      setDraftSaveStatus((current) => current === "saving" ? current : "dirty");
    } else {
      setDraftSaveStatus((current) =>
        current === "idle" || current === "dirty" ? "saved" : current,
      );
    }
  }, [localFormData]);

  // Debounce form data updates (1.2 seconds)
  const debouncedFormData = useDebounce(localFormData, 1200);

  const queueDraftSave = useCallback((formData: unknown, showSuccessToast = false) => {
    if (
      !response ||
      response.status !== "draft" ||
      !activeTemplate ||
      !projectId ||
      !canEditProjects
    ) {
      return Promise.resolve(false);
    }

    const serializedSnapshot = serializeFormData(formData);
    const snapshot = JSON.parse(serializedSnapshot);

    const persistSnapshot = async () => {
      if (isTransitioningRef.current) return false;

      if (serializedSnapshot === lastSavedDataRef.current) {
        setDraftSaveStatus("saved");
        if (showSuccessToast) {
          toast({
            title: "Rascunho já está salvo",
            description: "Não há novas alterações pendentes.",
          });
        }
        return true;
      }

      setDraftSaveStatus("saving");

      try {
        const savedResponse = await upsertFormResponse({
          project_id: projectId,
          template_id: activeTemplate.id,
          stage: "adherence",
          data: snapshot,
          status: "draft",
        });

        lastSavedDataRef.current = serializedSnapshot;
        const savedAt = new Date(savedResponse.updated_at);
        setLastSavedAt(Number.isNaN(savedAt.getTime()) ? new Date() : savedAt);
        setDraftSaveStatus(
          serializeFormData(latestFormDataRef.current) === serializedSnapshot
            ? "saved"
            : "dirty",
        );

        if (showSuccessToast) {
          toast({
            title: "Rascunho salvo",
            description: "Você pode sair e continuar o preenchimento depois.",
            className: "bg-green-500 text-white border-green-600",
          });
        }

        return true;
      } catch {
        setDraftSaveStatus("error");
        toast({
          title: "Erro de salvamento",
          description: showSuccessToast
            ? "Não foi possível salvar o rascunho. Tente novamente."
            : "Falha ao salvar rascunho automaticamente. Use o botão Salvar rascunho para tentar novamente.",
          variant: "destructive",
        });
        return false;
      }
    };

    const queuedSave = saveQueueRef.current.then(persistSnapshot, persistSnapshot);
    saveQueueRef.current = queuedSave;
    return queuedSave;
  }, [activeTemplate, canEditProjects, projectId, response, toast, upsertFormResponse]);

  // Auto-save changes after the user pauses editing for 1.2 seconds.
  useEffect(() => {
    if (
      response?.status !== "draft" ||
      !activeTemplate ||
      !projectId ||
      !canEditProjects ||
      isTransitioningRef.current ||
      lastSavedDataRef.current === null ||
      serializeFormData(debouncedFormData) !== serializeFormData(latestFormDataRef.current)
    ) {
      return;
    }

    if (serializeFormData(debouncedFormData) !== lastSavedDataRef.current) {
      void queueDraftSave(debouncedFormData);
    }
  }, [activeTemplate, canEditProjects, debouncedFormData, projectId, queueDraftSave, response?.status]);

  const hasUnsavedChanges =
    lastSavedDataRef.current !== null &&
    serializeFormData(localFormData) !== lastSavedDataRef.current;

  useEffect(() => {
    if (!hasUnsavedChanges || response?.status !== "draft" || !canEditProjects) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [canEditProjects, hasUnsavedChanges, response?.status]);

  const handleSaveDraft = async () => {
    await queueDraftSave(latestFormDataRef.current, true);
  };

  const handleBackToProject = async () => {
    if (response?.status === "draft" && canEditProjects && hasUnsavedChanges) {
      const saved = await queueDraftSave(latestFormDataRef.current);
      if (!saved) return;
    }
    navigate(`/projects/${projectId}`);
  };

  const handleFinalizeForm = async () => {
    if (!response || !activeTemplate || !projectId) return;

    const incompleteImages = countIncompleteTitledImageAttachments(localFormData);
    if (incompleteImages > 0) {
      toast({
        title: "Imagens incompletas",
        description: `Complete o título e o arquivo de ${incompleteImages} ${incompleteImages === 1 ? "imagem" : "imagens"} antes de finalizar.`,
        variant: "destructive",
      });
      return;
    }

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

    if (!notes || !richTextToPlainText(notes).trim()) {
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

    isTransitioningRef.current = true;
    setIsTransitioning(true);

    try {
      // Wait for any autosave already in flight so it cannot restore draft status
      // after the final response is persisted.
      await saveQueueRef.current;
      const finalizedData = latestFormDataRef.current;
      const finalizedResponse = await upsertFormResponse({
        project_id: projectId,
        template_id: activeTemplate.id,
        stage: "adherence",
        data: finalizedData,
        status: statusToSubmit,
      });
      lastSavedDataRef.current = serializeFormData(finalizedData);
      setLastSavedAt(new Date(finalizedResponse.updated_at));
      setDraftSaveStatus("saved");
      toast({
        title: "Análise Concluída",
        description: "Formulário de aderência finalizado com sucesso.",
        className: "bg-green-500 text-white border-green-600",
      });
      await refetchResp();
    } catch {
      toast({
        title: "Erro ao finalizar",
        description: "Não foi possível finalizar o formulário. O rascunho permanece disponível.",
        variant: "destructive",
      });
    } finally {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }
  };

  const handleReopenForm = async () => {
    if (!response || !activeTemplate || !projectId) return;

    isTransitioningRef.current = true;
    setIsTransitioning(true);

    try {
      const reopenedResponse = await upsertFormResponse({
        project_id: projectId,
        template_id: activeTemplate.id,
        stage: "adherence",
        data: latestFormDataRef.current,
        status: "draft",
      });
      lastSavedDataRef.current = serializeFormData(latestFormDataRef.current);
      setLastSavedAt(new Date(reopenedResponse.updated_at));
      setDraftSaveStatus("saved");
      toast({
        title: "Formulário Reaberto",
        description: "Formulário retornado para rascunho de edição.",
      });
      await refetchResp();
    } catch {
      toast({
        title: "Erro ao reabrir",
        description: "Não foi possível reabrir o formulário.",
        variant: "destructive",
      });
    } finally {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }
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

  const isFormLocked = response.status === "approved" || response.status === "approved_with_restrictions" || response.status === "rejected" || !canEditProjects || isTransitioning;
  const isFinalized = response.status === "approved" || response.status === "approved_with_restrictions" || response.status === "rejected";
  const lastSavedTime = lastSavedAt?.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const draftSaveMessage = draftSaveStatus === "saving"
    ? "Salvando rascunho"
    : draftSaveStatus === "dirty"
      ? "Alterações pendentes"
      : draftSaveStatus === "error"
        ? "Falha ao salvar"
        : lastSavedTime
          ? `Rascunho salvo às ${lastSavedTime}`
          : "Rascunho salvo";
  const printSections = getPrintSections(activeTemplate.schema_json, localFormData);
  const printQuestions = printSections.flatMap((section) => section.questions);
  const printSummary = {
    questions: printQuestions.length,
    impacts: printQuestions.filter((question) => question.nivel_impacto === "SIM").length,
    warnings: printQuestions.filter((question) => question.nivel_impacto === "ATENÇÃO").length,
    evidences: printQuestions.reduce((total, question) => total + question.images.length, 0),
  };
  const generalFields = getGeneralFields(
    activeTemplate.schema_json,
    localFormData,
    activeTemplate.ui_json,
  );
  const impactedItems = getImpactedItems(activeTemplate.schema_json, localFormData);
  const technicalOpinionAiInput = buildAdherenceTechnicalOpinionInput({
    project: {
      id: project.id,
      clientName: project.clientName,
      ticketNumber: project.ticketNumber,
      systemType: project.systemType,
      responsibleAdherence: project.responsibleAdherence,
    },
    finalVerdict: localFormData.finalVerdict,
    generalFields: generalFields
      .filter(
        (field) => field.type !== "images" && field.type !== "object",
      )
      .map((field) => ({
        title: field.title,
        value: Array.isArray(field.value)
          ? field.value.join(", ")
          : typeof field.value === "boolean"
            ? field.value
              ? "Sim"
              : "Nao"
            : richTextToPlainText(String(field.value || "")),
      }))
      .filter((field) => field.value.trim()),
    sections: printSections.map((section) => ({
      title: section.title,
      questions: section.questions.map((question) => ({
        title: question.title,
        utiliza: question.utiliza,
        value: question.valor,
        impact: question.impacto,
        impactLevel: question.nivel_impacto,
        details: richTextToPlainText(question.detalhes),
        imageTitles: question.images.map((image) => image.title),
      })),
    })),
  });

  if (isPrintMode) {
    return (
      <div className="min-h-screen bg-slate-100 px-3 py-5 font-sans text-black sm:px-6 sm:py-8 print:bg-white print:p-0">
        <style>{`
          @media print {
            html,
            body {
              background-color: white !important;
              color: black !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .print-report {
              width: auto !important;
              max-width: none !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: 0 !important;
            }
            .print-keep-together,
            .print-question,
            .print-evidence,
            .print-signatures {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .print-section {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            .print-section-heading {
              break-after: avoid !important;
              page-break-after: avoid !important;
            }
            .print-question-title,
            .print-rich-text {
              orphans: 3;
              widows: 3;
            }
            .print-evidence img {
              max-height: 42mm !important;
            }
          }
          @page {
            size: A4;
            margin: 12mm 14mm 14mm;
          }
        `}</style>

        {/* Screen Toolbar (no-print) */}
        <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-col gap-3 rounded-xl bg-slate-900 p-3.5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-4.5 w-4.5 text-primary animate-pulse" />
            <div className="space-y-0.5 text-left">
              <span className="text-xs font-bold block">Visualização do Relatório Oficial</span>
              <p className="text-[10px] text-slate-400">O diálogo de impressão do navegador foi acionado automaticamente.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button 
              size="sm" 
              onClick={() => window.print()}
              className="h-9 px-3 text-xs font-bold text-white sm:h-8 sm:px-4"
            >
              Imprimir Novamente
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => window.close()}
              className="h-9 border border-slate-700 text-xs font-bold text-white hover:bg-slate-800 sm:h-8"
            >
              Fechar Aba
            </Button>
          </div>
        </div>

        <article
          className="print-report mx-auto max-w-[210mm] space-y-5 border border-slate-200 bg-white p-4 shadow-xl sm:p-7 print:space-y-4"
          data-testid="adherence-print-report"
        >
          {/* Official Header */}
          <header className="print-keep-together space-y-3 border-b-2 border-slate-800 pb-4 text-left">
            <div className="flex items-start justify-between gap-4 border-l-4 border-rose-600 pl-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-rose-700">
                  Siplan Hub &bull; Engenharia de Implantação
                </p>
                <h1 className="text-lg font-black uppercase leading-tight tracking-wide text-slate-900 sm:text-xl">
                  Relatório de Análise de Aderência
                </h1>
              </div>
              <span className="shrink-0 rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-700">
                Versão {activeTemplate.version}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-slate-200 text-xs sm:grid-cols-6 print:grid-cols-6">
              <div className="col-span-2 bg-slate-50 px-3 py-2 sm:col-span-3">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Cliente / Projeto</span>
                <strong className="mt-0.5 block break-words text-[11px] leading-snug text-slate-900">{project.clientName}</strong>
              </div>
              <div className="bg-slate-50 px-3 py-2 sm:col-span-1">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Ticket</span>
                <strong className="mt-0.5 block text-[11px] text-slate-900">#{project.ticketNumber}</strong>
              </div>
              <div className="bg-slate-50 px-3 py-2 sm:col-span-2">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Sistema / Produto</span>
                <strong className="mt-0.5 block break-words text-[11px] text-slate-900">{project.systemType}</strong>
              </div>
              <div className="col-span-2 bg-slate-50 px-3 py-2 sm:col-span-3">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Implantador responsável</span>
                <strong className="mt-0.5 block break-words text-[11px] text-slate-900">{project.responsibleAdherence || "Não definido"}</strong>
              </div>
              <div className="bg-slate-50 px-3 py-2 sm:col-span-1">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Data</span>
                <strong className="mt-0.5 block text-[11px] text-slate-900">{getAnalysisDate()}</strong>
              </div>
              <div className="bg-slate-50 px-3 py-2 sm:col-span-2">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Status da análise</span>
                <span className={cn(
                  "mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider",
                  isFinalized
                    ? localFormData.finalVerdict === "Totalmente Aderente"
                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                      : localFormData.finalVerdict === "Aderente com Restrições"
                        ? "border-amber-200 bg-amber-100 text-amber-800"
                        : "border-rose-200 bg-rose-100 text-rose-800"
                    : "border-slate-200 bg-slate-100 text-slate-700",
                )}>
                  {isFinalized ? localFormData.finalVerdict || "Finalizado" : "Rascunho"}
                </span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
              {[
                ["Itens do checklist", printSummary.questions],
                ["Não aderentes", printSummary.impacts],
                ["Pontos de atenção", printSummary.warnings],
                ["Evidências", printSummary.evidences],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-200 px-2.5 py-1.5">
                  <dt className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-base font-black leading-none text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </header>

          {/* Visão Geral */}
          <section className="print-section space-y-3 text-left">
            <div className="print-section-heading flex items-end justify-between gap-3 border-b border-slate-300 pb-1.5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                1. Visão Geral da Análise
              </h2>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Resumo executivo
              </span>
            </div>

            {generalFields.length > 0 && (
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 print:grid-cols-2">
                {generalFields.map((field) => {
                  const urls = extractUrlsFromValue(field.value);
                  if (field.type === "images" || urls.length > 0) {
                    const displayUrls = urls.length > 0
                      ? urls
                      : Array.isArray(field.value)
                        ? field.value
                        : [];
                    if (displayUrls.length === 0) return null;
                    return (
                      <div key={field.key} className="print-keep-together col-span-full space-y-1.5 border-l-2 border-slate-300 pl-2.5">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">{field.title}</span>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
                          {displayUrls.map((url, idx) => (
                            <div key={idx} className="aspect-video overflow-hidden rounded border bg-white">
                              <img src={url} alt={`${field.title} ${idx + 1}`} className="h-full w-full object-contain" />
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

                  const isWideField = field.type === "textarea"
                    || isAdherenceImpactDescriptionTitle(field.title)
                    || displayVal.length > 90;

                  return (
                    <div
                      key={field.key}
                      className={cn(
                        "print-keep-together min-w-0 border-l-2 border-slate-300 pl-2.5",
                        isWideField && "sm:col-span-2 print:col-span-2",
                      )}
                    >
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">{field.title}</span>
                      {isAdherenceImpactDescriptionTitle(field.title) ? (
                        <RichTextContent
                          content={field.value}
                          emptyText="Não informado"
                          className="print-rich-text mt-0.5 text-[10px] font-medium leading-relaxed text-slate-800"
                        />
                      ) : (
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[10px] font-medium leading-relaxed text-slate-800">{displayVal}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className={impactedItems.length === 0 ? "print-keep-together" : "print-section"}>
              {impactedItems.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 px-3 py-2.5">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">✓</div>
                  <span className="text-[10px] font-semibold text-emerald-800">
                    Nenhum gap técnico ou impacto identificado no checklist de aderência.
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5 rounded-lg border border-rose-300 bg-rose-50/70 p-3">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-200 pb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                      Impactos identificados
                    </span>
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[8px] font-bold text-white">
                      {impactedItems.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {impactedItems.map((item, idx) => {
                      const isAttention = item.nivel_impacto === "ATENÇÃO";
                      return (
                        <div key={idx} className="print-question space-y-1 border-b border-rose-100 pb-2 text-[10px] last:border-0 last:pb-0">
                          <div className="flex flex-wrap items-center gap-1.5 font-bold uppercase text-slate-600">
                            <span>{item.sectionTitle}</span>
                            <span className="text-slate-300">/</span>
                            <span className={isAttention ? "text-amber-700" : "text-rose-700"}>{item.questionTitle}</span>
                            <span className={cn(
                              "rounded border px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wider",
                              isAttention
                                ? "border-amber-200 bg-amber-100 text-amber-800"
                                : "border-rose-200 bg-rose-100 text-rose-800",
                            )}>
                              {isAttention ? "Ponto de atenção" : "Não aderente"}
                            </span>
                          </div>
                          <RichTextContent
                            content={item.detalhes}
                            emptyText="Sem justificativa registrada."
                            className={cn(
                              "print-rich-text border-l-2 py-0.5 pl-2 text-[10px] font-medium leading-relaxed",
                              isAttention ? "border-amber-500 text-amber-800" : "border-rose-500 text-rose-800",
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Detalhamento das Seções */}
          <section className="print-section space-y-4 text-left">
            <div className="print-section-heading flex items-end justify-between gap-3 border-b border-slate-300 pb-1.5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                2. Detalhamento Técnico por Seção
              </h2>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                {printSummary.questions} itens
              </span>
            </div>

            {printSections.map((section, sIdx) => (
              <section key={sIdx} className="print-section space-y-2.5">
                <div className="print-section-heading flex items-center justify-between gap-3 rounded-md border-l-4 border-slate-700 bg-slate-100 px-3 py-1.5">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    {section.title}
                  </h3>
                  <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                    {section.questions.length} {section.questions.length === 1 ? "item" : "itens"}
                  </span>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {section.questions.map((q, questionIndex) => (
                    <article
                      key={q.id}
                      className={cn(
                        "print-question space-y-2 border-b border-slate-200 px-3 py-2.5 text-[10px] last:border-b-0",
                        q.nivel_impacto === "SIM"
                          ? "bg-rose-50/50"
                          : q.nivel_impacto === "ATENÇÃO"
                            ? "bg-amber-50/50"
                            : "bg-white",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-px flex h-4 min-w-4 shrink-0 items-center justify-center rounded bg-slate-100 px-1 text-[7px] font-black text-slate-500">
                            {questionIndex + 1}
                          </span>
                          <h4 className="print-question-title min-w-0 break-words text-[10px] font-bold leading-snug text-slate-900">
                            {q.title}
                          </h4>
                        </div>
                        <span className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[7px] font-extrabold uppercase tracking-wider",
                          q.nivel_impacto === "SIM"
                            ? "border-rose-200 bg-rose-100 text-rose-800"
                            : q.nivel_impacto === "ATENÇÃO"
                              ? "border-amber-200 bg-amber-100 text-amber-800"
                              : "border-emerald-200 bg-emerald-100 text-emerald-800",
                        )}>
                          {q.nivel_impacto === "SIM"
                            ? "Não aderente"
                            : q.nivel_impacto === "ATENÇÃO"
                              ? "Ponto de atenção"
                              : "Aderente"}
                        </span>
                      </div>

                      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-l-2 border-slate-200 pl-2.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <dt className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Resposta</dt>
                          <dd>
                            {q.isText ? (
                              <span className="break-words font-semibold text-slate-800">{q.valor || "Não respondida"}</span>
                            ) : (
                              <span className={cn(
                                "inline-block rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                                q.utiliza
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700",
                              )}>
                                {q.utiliza ? "Sim, utiliza" : "Não utiliza"}
                              </span>
                            )}
                          </dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Impacto</dt>
                          <dd>
                            <span className={cn(
                              "inline-block rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                              q.nivel_impacto === "SIM"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : q.nivel_impacto === "ATENÇÃO"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
                            )}>
                              {q.nivel_impacto || "Não"}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      {q.detalhes && (
                        <div className="rounded-r-md border-l-2 border-slate-400 bg-slate-50 px-2.5 py-1.5">
                          <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                            Observações / Justificativa
                          </span>
                          <RichTextContent
                            content={q.detalhes}
                            className="print-rich-text mt-0.5 text-[10px] font-medium leading-relaxed text-slate-700"
                          />
                        </div>
                      )}

                      {q.images.length > 0 && (
                        <div className="print-evidence space-y-1.5 border-t border-slate-200 pt-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                              Evidências do item
                            </span>
                            <span className="text-[8px] font-semibold text-slate-500">
                              {q.images.length} {q.images.length === 1 ? "imagem" : "imagens"}
                            </span>
                          </div>
                          <div className={cn("grid gap-2", getPrintEvidenceGridClass(q.images.length))}>
                            {q.images.map((image, imageIndex) => (
                              <figure key={`${image.url}-${imageIndex}`} className="overflow-hidden rounded border border-slate-200 bg-white">
                                <div className="flex aspect-video items-center justify-center bg-slate-100">
                                  <img
                                    src={image.url}
                                    alt={image.title || `Imagem ${imageIndex + 1}`}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <figcaption className="break-words border-t border-slate-200 px-1.5 py-1 text-[8px] font-semibold leading-snug text-slate-700">
                                  {image.title || "Sem título"}
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </section>

          {/* Parecer Técnico Conclusivo */}
          <section className="print-section space-y-3 text-left">
            <div className="print-section-heading flex items-end justify-between gap-3 border-b border-slate-300 pb-1.5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                3. Parecer Técnico Conclusivo
              </h2>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Homologação
              </span>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Resultado</span>
                <span className={cn(
                  "rounded border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                  localFormData.finalVerdict === "Totalmente Aderente"
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                    : localFormData.finalVerdict === "Aderente com Restrições"
                      ? "border-amber-200 bg-amber-100 text-amber-800"
                      : localFormData.finalVerdict === "Não Aderente / Impeditivo"
                        ? "border-rose-200 bg-rose-100 text-rose-800"
                        : "border-slate-200 bg-slate-100 text-slate-500",
                )}>
                  {localFormData.finalVerdict || "Não informado"}
                </span>
              </div>

              <div className="border-l-2 border-slate-400 bg-white px-3 py-2">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                  Justificativa e considerações finais
                </span>
                <RichTextContent
                  content={localFormData.finalNotes}
                  emptyText="Nenhuma consideração registrada."
                  className="print-rich-text mt-1 text-[10px] font-medium leading-relaxed text-slate-800"
                />
              </div>
            </div>
          </section>

          {/* Signature Section */}
          <section className="print-signatures border-t border-dashed border-slate-300 pt-3">
            <div className="grid grid-cols-1 gap-5 text-center sm:grid-cols-2 sm:gap-10 print:grid-cols-2">
              <div className="pt-10">
                <div className="border-t border-slate-500 pt-2">
                  <strong className="block text-[10px] text-slate-800">Implantador responsável</strong>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Siplan Hub</span>
                </div>
              </div>
              <div className="pt-10">
                <div className="border-t border-slate-500 pt-2">
                  <strong className="block text-[10px] text-slate-800">Responsável técnico / cliente</strong>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Homologação</span>
                </div>
              </div>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[7px] font-bold uppercase tracking-wider text-slate-400">
            <span>Documento gerado pelo Siplan Hub</span>
            <span>Projeto #{project.ticketNumber} &bull; Versão {activeTemplate.version}</span>
          </footer>
        </article>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-4 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 md:py-4">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToProject}
            disabled={isTransitioning}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o Projeto
          </Button>
        </div>

        <div className="flex flex-col justify-between gap-2 border-b pb-2.5 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-xl font-black tracking-tight text-transparent">
                Análise de Aderência
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/projects/${projectId}/adherence?print=true`, "_blank")}
              className="h-9 gap-1.5 border-primary/20 text-xs text-primary hover:bg-primary/5 sm:h-8"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir / PDF
            </Button>

            {response.status === "draft" && canEditProjects && (
              <span
                data-testid="adherence-draft-save-status"
                role="status"
                aria-live="polite"
                className={`flex items-center gap-1.5 text-xs ${
                  draftSaveStatus === "error"
                    ? "text-destructive"
                    : draftSaveStatus === "dirty"
                      ? "text-amber-600 dark:text-amber-400"
                      : draftSaveStatus === "saved"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                }`}
              >
                {draftSaveStatus === "saving" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : draftSaveStatus === "saved" ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : draftSaveStatus === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {draftSaveMessage}
              </span>
            )}
          </div>
        </div>

        {/* Informações de Cabeçalho */}
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border bg-muted/20 p-3 text-left text-xs md:grid-cols-3 lg:grid-cols-[minmax(180px,2fr)_repeat(5,minmax(90px,1fr))]">
          <div className="col-span-2 min-w-0 md:col-span-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Cliente / Projeto</span>
            <strong className="block break-words text-xs leading-4 text-foreground">{project.clientName}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Ticket</span>
            <EllevoTicketLink
              ticketNumber={project.ticketNumber}
              className="text-xs font-bold text-foreground"
              showIcon={false}
            />
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Sistema / Produto</span>
            <strong className="text-xs text-foreground">{project.systemType}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Implantador</span>
            <strong className="block break-words text-xs leading-4 text-foreground">{project.responsibleAdherence || "Não definido"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">Data da Análise</span>
            <strong className="text-xs text-foreground">{getAnalysisDate()}</strong>
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
      <Card className="overflow-hidden border-muted/50 bg-card shadow-md">
        <CardHeader className="space-y-1 border-b bg-muted/20 px-4 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <ClipboardCheck className="h-4.5 w-4.5" />
            Especificação Técnica de Aderência
          </CardTitle>
          <CardDescription className="text-xs">
            Preencha todos os campos e descreva observações detalhadas para itens que possuam impacto.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
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
            compact
          />

          {/* Conclusão da Análise Section */}
          <div className="mt-5 space-y-3 border-t border-dashed pt-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-left">
              Conclusão da Análise de Aderência
            </h3>
            
            <div className="grid grid-cols-1 gap-3 text-left md:grid-cols-3">
              <div className="space-y-1 md:col-span-1">
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

              <div className="space-y-1 md:col-span-2">
                <AiRichTextField
                  label="Justificativa / Parecer Técnico"
                  content={localFormData.finalNotes || ""}
                  onChange={(finalNotes) => {
                    if (!isFormLocked) {
                      setLocalFormData((previous) => ({
                        ...previous,
                        finalNotes,
                      }));
                    }
                  }}
                  placeholder="Gere com IA a partir da análise completa ou escreva o parecer técnico..."
                  requestedBy={user?.id}
                  targetField={`adherence_technical_opinion:${projectId}:finalNotes`}
                  projectId={projectId}
                  mode="generate"
                  aiInput={
                    localFormData.finalVerdict
                      ? technicalOpinionAiInput
                      : ""
                  }
                  editable={!isFormLocked}
                  compact
                />
                {!isFormLocked && (
                  <p className="text-[10px] leading-4 text-muted-foreground">
                    A IA considera todas as seções, respostas, impactos e observações. Revise a sugestão antes de aplicá-la.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {canEditProjects && (
        <Card className="border-muted/50 shadow-sm">
          <CardContent className="flex flex-col items-stretch justify-between gap-2 p-3 sm:flex-row sm:items-center">
            <div className="text-xs text-muted-foreground">
              {response.status === "draft" && (
                <>
                  <span className="font-medium text-foreground">{draftSaveMessage}.</span>{" "}
                  {draftSaveStatus === "error"
                    ? "Use Salvar rascunho para tentar novamente antes de sair."
                    : "O preenchimento pode ser continuado depois sem finalizar o formulário."}
                </>
              )}
              {isFinalized && `Formulário concluído com parecer: ${response.data?.finalVerdict || ""}. Alterações travadas.`}
            </div>

            <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:ml-auto sm:flex sm:w-auto">
              {/* Draft actions: Save and finalize */}
              {response.status === "draft" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isUpserting || isTransitioning}
                    className="h-10 w-full gap-1.5 text-xs font-semibold sm:h-8 sm:w-auto"
                  >
                    {draftSaveStatus === "saving" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {draftSaveStatus === "saving" ? "Salvando..." : "Salvar rascunho"}
                  </Button>
                  <Button
                    onClick={handleFinalizeForm}
                    disabled={isUpserting || isTransitioning}
                    className="h-10 w-full gap-1.5 bg-green-600 text-xs font-semibold text-white hover:bg-green-700 sm:h-8 sm:w-auto"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Finalizar Formulário
                  </Button>
                </>
              )}

              {/* Approved actions: Reopen */}
              {isFinalized && (
                <Button 
                  onClick={handleReopenForm} 
                  variant="outline"
                  disabled={isUpserting || isTransitioning}
                  className="h-10 w-full gap-1.5 text-xs font-semibold sm:h-8 sm:w-auto"
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
