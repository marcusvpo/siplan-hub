import React, { useState, useEffect } from "react";
import { useFormTemplates, useActiveTemplate, usePublishTemplate, FormTemplate } from "@/hooks/useFormTemplates";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";
import { VisualQuestion, VisualQuestionBuilder, convertVisualToJSONSchema, convertVisualToUISchema, parseJSONSchemaToVisual } from "@/components/FormRenderer/VisualQuestionBuilder";
import { ArrowLeft, Save, History, Settings, Sparkles, FileEdit, Eye, Maximize2, Minimize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SYSTEM_TYPES = ["Orion TN", "Orion PRO", "Orion REG", "Modelos TN", "WebRI"];

interface ChecklistEditorProps {
  kind: "adherence" | "commercial_checklist" | "homologation_checklist";
  title: string;
  description: string;
  backPath: string;
  defaultQuestions: VisualQuestion[];
  schemaTitlePrefix: string;
  schemaDescriptionDefault: string;
  extraHeaderButtons?: React.ReactNode;
  extraDialogs?: React.ReactNode;
  topBanner?: React.ReactNode;
}

export function ChecklistEditor({ kind, title, description, backPath, defaultQuestions, schemaTitlePrefix, schemaDescriptionDefault, extraHeaderButtons, extraDialogs, topBanner }: ChecklistEditorProps) {
  const { toast } = useToast();
  const [selectedSystem, setSelectedSystem] = useState<string>("Orion TN");
  const [questions, setQuestions] = useState<VisualQuestion[]>(defaultQuestions);
  const [notes, setNotes] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Query templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useFormTemplates(kind, selectedSystem);
  const { data: activeTemplate, isLoading: isLoadingActive } = useActiveTemplate(kind, selectedSystem);

  // Mutation to publish
  const publishMutation = usePublishTemplate();

  // O editor é compartilhado por três telas; cada uma tem seu próprio recurso.
  const { hasPermission } = usePermissions();
  const canPublish = kind === "adherence" ? hasPermission("implantadores_aderencia", "edit") : kind === "commercial_checklist" ? hasPermission("commercial_checklist_questions", "manage") : hasPermission("templates", "manage");

  // Load active template questions when system type changes
  useEffect(() => {
    if (activeTemplate) {
      const parsed = parseJSONSchemaToVisual(activeTemplate.schema_json, activeTemplate.ui_json);
      setQuestions(parsed.length > 0 ? parsed : defaultQuestions);
    } else if (!isLoadingActive) {
      setQuestions(defaultQuestions);
    }
  }, [activeTemplate, selectedSystem, isLoadingActive, defaultQuestions]);

  // Round-trip compilation for live preview
  const currentSchema = React.useMemo(() => {
    return convertVisualToJSONSchema(questions, `${schemaTitlePrefix} (${selectedSystem})`, schemaDescriptionDefault);
  }, [questions, selectedSystem, schemaTitlePrefix, schemaDescriptionDefault]);

  const currentUiSchema = React.useMemo(() => {
    return convertVisualToUISchema(questions);
  }, [questions]);

  const loadHistoryVersion = (tpl: FormTemplate) => {
    const parsed = parseJSONSchemaToVisual(tpl.schema_json, tpl.ui_json);
    setQuestions(parsed);
    setNotes(`Restaurando configurações da versão v${tpl.version}`);
    toast({
      title: "Template carregado",
      description: `Perguntas da versão v${tpl.version} carregadas no editor.`,
    });
  };

  const handlePublish = async () => {
    if (!canPublish) return;

    if (questions.length === 0) {
      toast({
        title: "Erro de Validação",
        description: "Adicione ao menos uma pergunta ao checklist.",
        variant: "destructive",
      });
      return;
    }

    try {
      await publishMutation.mutateAsync({
        kind,
        system_type: selectedSystem,
        schema_json: currentSchema,
        ui_json: currentUiSchema,
        notes: notes || `Checklist atualizado para ${selectedSystem}`,
      });

      toast({
        title: "Sucesso!",
        description: "Checklist publicado e ativado com sucesso.",
        className: "bg-green-500 text-white border-green-600",
      });
      setNotes("");
    } catch (err: any) {
      toast({
        title: "Erro ao publicar",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const theme = {
    adherence: {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/5 dark:bg-amber-950/10",
      border: "border-amber-500/20 dark:border-amber-900/40",
      gradient: "from-amber-500 to-orange-600",
      button: "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/10",
    },
    homologation_checklist: {
      text: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/5 dark:bg-indigo-950/10",
      border: "border-indigo-500/20 dark:border-indigo-900/40",
      gradient: "from-indigo-500 to-blue-600",
      button: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10",
    },
    commercial_checklist: {
      text: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/5 dark:bg-violet-950/10",
      border: "border-violet-500/20 dark:border-violet-900/40",
      gradient: "from-violet-500 to-purple-600",
      button: "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/10",
    },
  }[kind];

  return (
    <div className="container mx-auto w-full min-w-0 max-w-5xl space-y-4 overflow-x-hidden px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:space-y-6 animate-in fade-in duration-300" data-testid="checklist-editor-mobile-layout">
      {topBanner}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3.5 min-w-0 flex-wrap">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <Link to={backPath}>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full border-muted-foreground/20 hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="break-words text-lg font-bold leading-6 tracking-tight text-foreground sm:text-xl">{title}</h1>
            <p className="mt-0.5 break-words text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-2 gap-2 md:flex md:w-auto md:shrink-0 md:items-center">
          <Select value={selectedSystem} onValueChange={setSelectedSystem}>
            <SelectTrigger className="col-span-2 h-9 w-full border-muted-foreground/30 bg-card text-xs font-medium md:col-span-1 md:w-[150px]">
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              {SYSTEM_TYPES.map((sys) => (
                <SelectItem key={sys} value={sys} className="text-xs">
                  {sys}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="h-9 min-w-0 gap-1.5 border-muted-foreground/30 bg-card px-2 text-xs hover:bg-muted md:px-3">
            <Eye className="h-4 w-4" />
            Visualizar Formulário
          </Button>

          <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="h-9 min-w-0 gap-1.5 border-muted-foreground/30 bg-card px-2 text-xs hover:bg-muted md:px-3">
            <History className="h-4 w-4" />
            Histórico
          </Button>

          {extraHeaderButtons}
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        {/* Campos do Formulário */}
        <Card
          className={
            isFullScreen
              ? "fixed inset-0 z-50 flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden rounded-none border-none bg-card p-0 pb-[env(safe-area-inset-bottom)] animate-in fade-in zoom-in-95 duration-200 sm:p-6"
              : "shadow-lg border-muted/50 overflow-hidden bg-card flex flex-col relative pt-1"
          }
        >
          {!isFullScreen && <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />}
          <CardHeader className="shrink-0 border-b bg-muted/30 p-3 pb-3 sm:p-6 sm:pb-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className={`text-sm font-bold uppercase tracking-wider ${theme.text} flex min-w-0 items-center gap-2`}>
                  <FileEdit className="h-4 w-4" />
                  Campos do Formulário
                </CardTitle>
                <CardDescription className="text-xs mt-1">Defina as perguntas que serão respondidas no formulário.</CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <div className="hidden rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:block">Versão Atual: {activeTemplate ? `v${activeTemplate.version}` : "Nenhuma"}</div>
                <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" title={isFullScreen ? "Minimizar" : "Tela Cheia"}>
                  {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`min-w-0 overflow-y-auto p-3 sm:p-5 ${isFullScreen ? "flex-1" : "min-h-[300px] sm:max-h-[650px] sm:min-h-[400px]"}`}>
            <VisualQuestionBuilder questions={questions} onChange={setQuestions} kind={kind} />
          </CardContent>
        </Card>

        {/* Publish Action Panel */}
        <Card className="shadow-lg border-muted/50 relative overflow-hidden pt-1">
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />
          <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Publicar Novo Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Notas da Versão / Alterações Efetuadas
              </Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Adicionado novas perguntas específicas." className="min-h-[70px] border-muted-foreground/30 focus-visible:ring-primary" />
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={handlePublish} disabled={publishMutation.isPending || !canPublish} className={`w-full gap-2 px-6 sm:w-auto ${theme.button}`}>
                <Save className="h-4 w-4" />
                Publicar Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pop-up de Visualização em Tempo Real (Modal) */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden rounded-lg border-muted/50 bg-card p-0 sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
          <div className="flex flex-col h-full min-h-0 relative pt-1">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />
            <DialogHeader className={`${theme.bg} border-b p-4 sm:p-6 ${theme.border}`}>
              <DialogTitle className={`text-base font-bold uppercase tracking-wider ${theme.text} flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between`}>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Visualização em Tempo Real
                </span>
                <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1 font-semibold">Ao Vivo</span>
              </DialogTitle>
              <DialogDescription className="text-xs">Veja e teste como o formulário ficará para preenchimento.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
              <FormRenderer
                projectId="preview"
                schema={currentSchema}
                uiSchema={currentUiSchema}
                formData={previewData}
                onChange={({ formData }) => setPreviewData(formData)}
                onSubmit={() => {
                  toast({
                    title: "Valores válidos no Preview",
                    description: "O formulário preencheu os requisitos com sucesso.",
                  });
                }}
                submitLabel="Testar Envio"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up de Histórico de Versões (Modal) */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden rounded-lg border-muted/50 bg-card p-0 sm:h-auto sm:max-h-[85vh] sm:rounded-xl">
          <div className="flex flex-col h-full min-h-0 relative pt-1">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />
            <DialogHeader className="border-b p-4 pb-4 sm:p-6 sm:pb-4">
              <DialogTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Versões
              </DialogTitle>
              <DialogDescription className="text-xs">Visualize as versões publicadas anteriormente e carregue suas perguntas no editor se necessário.</DialogDescription>
            </DialogHeader>
            <div className="p-0 overflow-y-auto flex-1 min-h-0">
              {isLoadingTemplates ? (
                <div className="text-center p-8 text-xs text-muted-foreground animate-pulse">Carregando histórico...</div>
              ) : templates.length === 0 ? (
                <div className="text-center p-8 text-xs text-muted-foreground">Nenhuma versão publicada anteriormente.</div>
              ) : (
                <div className="divide-y">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`flex flex-col items-stretch gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${tpl.is_active ? "bg-primary/5 hover:bg-primary/10" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">Versão v{tpl.version}</span>
                          {tpl.is_active && <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-500/20">Ativo</span>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(tpl.created_at).toLocaleDateString()}
                            {tpl.profiles?.full_name && ` por ${tpl.profiles.full_name}`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate italic">"{tpl.notes || "Sem notas de versão."}"</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          loadHistoryVersion(tpl);
                          setIsHistoryOpen(false);
                        }}
                        className="h-9 w-full px-3 text-xs sm:w-auto"
                      >
                        Carregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {extraDialogs}
    </div>
  );
}
