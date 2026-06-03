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
import { ArrowLeft, Save, History, Settings, Sparkles, FileEdit } from "lucide-react";
import { Link } from "react-router-dom";

const SYSTEM_TYPES = ["Orion TN", "Orion PRO", "Orion REG", "WebRI"];

interface ChecklistEditorProps {
  kind: 'adherence' | 'commercial_checklist';
  title: string;
  description: string;
  backPath: string;
  defaultQuestions: VisualQuestion[];
  schemaTitlePrefix: string;
  schemaDescriptionDefault: string;
  extraHeaderButtons?: React.ReactNode;
  extraDialogs?: React.ReactNode;
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
}: ChecklistEditorProps) {
  const { toast } = useToast();
  const [selectedSystem, setSelectedSystem] = useState<string>("Orion TN");
  const [questions, setQuestions] = useState<VisualQuestion[]>(defaultQuestions);
  const [notes, setNotes] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>({});

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

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={backPath}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground pl-10">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Sistema</Label>
            <Select value={selectedSystem} onValueChange={setSelectedSystem}>
              <SelectTrigger className="w-[180px] h-9 border-muted-foreground/30 bg-card font-medium">
                <SelectValue placeholder="Selecione o Sistema" />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_TYPES.map((sys) => (
                  <SelectItem key={sys} value={sys}>
                    {sys}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {extraHeaderButtons && (
            <div className="flex flex-col gap-1 justify-end pt-5">
              {extraHeaderButtons}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Visual Question Builder (col-span 7) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <Card className="shadow-lg border-muted/50 overflow-hidden bg-card flex-1 flex flex-col">
            <CardHeader className="bg-muted/30 pb-3 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <FileEdit className="h-4 w-4" />
                    Perguntas do Checklist (Estilo Google Forms)
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Defina as perguntas que serão respondidas no formulário.
                  </CardDescription>
                </div>
                <div className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-full border">
                  Versão Atual: {activeTemplate ? `v${activeTemplate.version}` : "Nenhuma"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto max-h-[600px] min-h-[400px]">
              <VisualQuestionBuilder questions={questions} onChange={setQuestions} />
            </CardContent>
          </Card>

          {/* Publish Action Panel */}
          <Card className="shadow-lg border-muted/50">
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
                  className="px-6 gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" />
                  Publicar Checklist
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Interactive Preview and history (col-span 5) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Live Preview Pane */}
          <Card className="shadow-lg border-muted/50 bg-card flex-1 flex flex-col">
            <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Preview do Checklist
                </span>
                <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1 font-semibold">
                  Ao Vivo
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Veja como o formulário ficará para preenchimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto max-h-[500px]">
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
            </CardContent>
          </Card>

          {/* Version History */}
          <Card className="shadow-lg border-muted/50">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Versões
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingTemplates ? (
                <div className="text-center p-6 text-xs text-muted-foreground animate-pulse">
                  Carregando histórico...
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center p-6 text-xs text-muted-foreground">
                  Nenhuma versão publicada anteriormente.
                </div>
              ) : (
                <div className="divide-y max-h-[220px] overflow-y-auto">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`p-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-muted/30 ${
                        tpl.is_active ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs">Versão v{tpl.version}</span>
                          {tpl.is_active && (
                            <span className="text-[9px] bg-green-500/10 text-green-600 px-1.5 py-0.2 rounded-full font-bold border border-green-500/20">
                              Ativo
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
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
                        onClick={() => loadHistoryVersion(tpl)}
                        className="h-7 px-2 text-xs"
                      >
                        Carregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {extraDialogs}
    </div>
  );
}
