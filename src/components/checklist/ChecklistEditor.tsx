import React, { useState, useEffect } from "react";
import { useFormTemplates, useActiveTemplate, usePublishTemplate, FormTemplate } from "@/hooks/useFormTemplates";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";
import {
  VisualQuestion,
  VisualQuestionBuilder,
  convertVisualToJSONSchema,
  convertVisualToUISchema,
  parseJSONSchemaToVisual,
} from "@/components/FormRenderer/VisualQuestionBuilder";
import { ArrowLeft, Save, History, Settings, Sparkles, FileEdit, Eye, Maximize2, Minimize2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SYSTEM_TYPES = ["Orion TN", "Orion PRO", "Orion REG", "Modelos TN", "WebRI"];

interface ChecklistEditorProps {
  kind: 'adherence' | 'commercial_checklist' | 'homologation_checklist';
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

export function ChecklistEditor({
  kind,
  title,
  description,
  backPath,
  defaultQuestions,
  schemaTitlePrefix,
  schemaDescriptionDefault,
  extraHeaderButtons,
  extraDialogs,
  topBanner,
}: ChecklistEditorProps) {
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
    return convertVisualToJSONSchema(
      questions,
      `${schemaTitlePrefix} (${selectedSystem})`,
      schemaDescriptionDefault
    );
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
    }
  }[kind];

  return (
    <div className="container mx-auto pb-6 px-1 space-y-6 max-w-5xl animate-in fade-in duration-300">
      {topBanner}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3.5 min-w-0 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to={backPath}>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-muted-foreground/20 hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <Select value={selectedSystem} onValueChange={setSelectedSystem}>
            <SelectTrigger className="w-[150px] h-9 border-muted-foreground/30 bg-card font-medium text-xs">
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

          <Button
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="h-9 gap-1.5 border-muted-foreground/30 bg-card hover:bg-muted text-xs px-3"
          >
            <Eye className="h-4 w-4" />
            Visualizar Formulário
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsHistoryOpen(true)}
            className="h-9 gap-1.5 border-muted-foreground/30 bg-card hover:bg-muted text-xs px-3"
          >
            <History className="h-4 w-4" />
            Histórico
          </Button>

          {extraHeaderButtons}
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        {/* Campos do Formulário */}
        <Card className={isFullScreen 
          ? "fixed inset-0 z-50 bg-card flex flex-col p-6 rounded-none border-none animate-in fade-in zoom-in-95 duration-200"
          : "shadow-lg border-muted/50 overflow-hidden bg-card flex flex-col relative pt-1"
        }>
          {!isFullScreen && <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />}
          <CardHeader className="bg-muted/30 pb-3 border-b shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className={`text-sm font-bold uppercase tracking-wider ${theme.text} flex items-center gap-2`}>
                  <FileEdit className="h-4 w-4" />
                  Campos do Formulário
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Defina as perguntas que serão respondidas no formulário.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-full border">
                  Versão Atual: {activeTemplate ? `v${activeTemplate.version}` : "Nenhuma"}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title={isFullScreen ? "Minimizar" : "Tela Cheia"}
                >
                  {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`p-5 overflow-y-auto ${isFullScreen ? 'flex-1' : 'max-h-[650px] min-h-[400px]'}`}>
            <VisualQuestionBuilder questions={questions} onChange={setQuestions} kind={kind} />
          </CardContent>
        </Card>

        {/* Publish Action Panel */}
        <Card className="shadow-lg border-muted/50 relative overflow-hidden pt-1">
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Publicar Novo Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold">Notas da Versão / Alterações Efetuadas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Adicionado novas perguntas específicas."
                className="min-h-[70px] border-muted-foreground/30 focus-visible:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={handlePublish}
                disabled={publishMutation.isPending}
                className={`px-6 gap-2 ${theme.button}`}
              >
                <Save className="h-4 w-4" />
                Publicar Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pop-up de Visualização em Tempo Real (Modal) */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-xl border-muted/50 bg-card overflow-hidden">
          <div className="flex flex-col h-full min-h-0 relative pt-1">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />
            <DialogHeader className={`${theme.bg} p-6 border-b ${theme.border}`}>
              <DialogTitle className={`text-base font-bold uppercase tracking-wider ${theme.text} flex items-center justify-between`}>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Visualização em Tempo Real
                </span>
                <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1 font-semibold">
                  Ao Vivo
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Veja e teste como o formulário ficará para preenchimento.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
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
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 rounded-xl border-muted/50 bg-card overflow-hidden">
          <div className="flex flex-col h-full min-h-0 relative pt-1">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />
            <DialogHeader className="p-6 border-b pb-4">
              <DialogTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Versões
              </DialogTitle>
              <DialogDescription className="text-xs">
                Visualize as versões publicadas anteriormente e carregue suas perguntas no editor se necessário.
              </DialogDescription>
            </DialogHeader>
            <div className="p-0 overflow-y-auto flex-1 min-h-0">
              {isLoadingTemplates ? (
                <div className="text-center p-8 text-xs text-muted-foreground animate-pulse">
                  Carregando histórico...
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center p-8 text-xs text-muted-foreground">
                  Nenhuma versão publicada anteriormente.
                </div>
              ) : (
                <div className="divide-y">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`p-4 flex items-center justify-between gap-4 transition-colors hover:bg-muted/30 ${
                        tpl.is_active ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">Versão v{tpl.version}</span>
                          {tpl.is_active && (
                            <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-500/20">
                              Ativo
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(tpl.created_at).toLocaleDateString()}
                            {tpl.profiles?.full_name && ` por ${tpl.profiles.full_name}`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate italic">
                          "{tpl.notes || "Sem notas de versão."}"
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          loadHistoryVersion(tpl);
                          setIsHistoryOpen(false);
                        }}
                        className="h-8 px-3 text-xs"
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
