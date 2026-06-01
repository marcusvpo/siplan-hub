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
import { ArrowLeft, Save, History, Settings, Sparkles, HelpCircle, FileEdit, Printer, Eye, ClipboardCheck, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// Predefined systems in Siplan HUB
const SYSTEM_TYPES = ["Orion TN", "Orion PRO", "Orion REG", "WebRI"];

const DEFAULT_QUESTIONS: VisualQuestion[] = [
  {
    id: "adherence_level",
    title: "Nível de Aderência Inicial",
    type: "select",
    required: true,
    options: ["Total", "Parcial", "Crítico", "Não Adere"],
  },
  {
    id: "critical_modules",
    title: "Módulos Críticos a serem Verificados",
    type: "checkboxes",
    required: false,
    options: ["Faturamento", "Financeiro", "Fiscal", "Estoque", "RH", "Integrações"],
  },
  {
    id: "client_has_customizations",
    title: "Cliente exige customizações complexas?",
    type: "boolean",
    required: false,
  },
  {
    id: "customization_notes",
    title: "Notas e Detalhes sobre Customizações",
    type: "textarea",
    required: false,
  },
  {
    id: "printer_photos",
    title: "Fotos e Imagens das Impressoras do Cliente",
    type: "images",
    required: false,
  },
];

export default function EditarFormAderencia() {
  const { toast } = useToast();
  const [selectedSystem, setSelectedSystem] = useState<string>("Orion TN");
  const [questions, setQuestions] = useState<VisualQuestion[]>(DEFAULT_QUESTIONS);
  const [notes, setNotes] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>({});

  // Completed Forms Library state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [completedForms, setCompletedForms] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const loadCompletedForms = async () => {
    setIsLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from("project_form_responses")
        .select(`
          id,
          project_id,
          status,
          updated_at,
          projects (
            client_name,
            ticket_number,
            system_type
          )
        `)
        .eq("stage", "adherence")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setCompletedForms(data || []);
    } catch (err: any) {
      console.error("Error loading completed forms:", err);
      toast({
        title: "Erro ao carregar biblioteca",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (isLibraryOpen) {
      loadCompletedForms();
    }
  }, [isLibraryOpen]);

  // Query templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useFormTemplates("adherence", selectedSystem);
  const { data: activeTemplate, isLoading: isLoadingActive } = useActiveTemplate("adherence", selectedSystem);

  // Mutation to publish
  const publishMutation = usePublishTemplate();

  // Load active template questions when system type changes
  useEffect(() => {
    if (activeTemplate) {
      const parsed = parseJSONSchemaToVisual(activeTemplate.schema_json, activeTemplate.ui_json);
      setQuestions(parsed.length > 0 ? parsed : DEFAULT_QUESTIONS);
    } else if (!isLoadingActive) {
      setQuestions(DEFAULT_QUESTIONS);
    }
  }, [activeTemplate, selectedSystem, isLoadingActive]);

  // Round-trip compilation for live preview
  const currentSchema = React.useMemo(() => {
    return convertVisualToJSONSchema(
      questions,
      `Aderência do Sistema (${selectedSystem})`,
      "Verificação inicial de gaps e requisitos"
    );
  }, [questions, selectedSystem]);

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
        description: "Adicione ao menos uma pergunta ao formulário.",
        variant: "destructive",
      });
      return;
    }

    try {
      await publishMutation.mutateAsync({
        kind: "adherence",
        system_type: selectedSystem,
        schema_json: currentSchema,
        ui_json: currentUiSchema,
        notes: notes || `Questionário de aderência atualizado para ${selectedSystem}`,
      });

      toast({
        title: "Sucesso!",
        description: "Template de Aderência publicado e ativado com sucesso.",
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
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/implantadores">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              Criador de Formulário de Aderência
            </h1>
          </div>
          <p className="text-sm text-muted-foreground pl-10">
            Adicione e ordene perguntas de forma visual para estruturar a análise de aderência.
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

          <div className="flex flex-col gap-1 justify-end pt-5">
            <Button
              variant="outline"
              onClick={() => setIsLibraryOpen(true)}
              className="h-9 gap-1.5 border-muted-foreground/30 bg-card"
            >
              <ClipboardCheck className="h-4 w-4" />
              Formulários Finalizados
            </Button>
          </div>
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
                    Estrutura de Perguntas (Estilo Google Forms)
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Defina as perguntas que serão respondidas pelos implantadores
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
                Publicar Nova Versão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold">Notas da Versão / Alterações Efetuadas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Adicionado perguntas de layout de impressão e upload de fotos da impressora."
                  className="min-h-[70px] border-muted-foreground/30 focus-visible:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={handlePublish}
                  disabled={publishMutation.isPending}
                  className="px-6 gap-2"
                >
                  <Save className="h-4 w-4" />
                  Publicar Nova Versão
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
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Preview do Formulário
                </span>
                <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1 font-semibold">
                  Ao Vivo
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Visualize e interaja com o formulário em tempo real conforme cria as perguntas.
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

      {/* Adherence Forms Library Modal */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <ClipboardCheck className="h-5 w-5" />
              Biblioteca de Formulários Finalizados
            </DialogTitle>
            <DialogDescription className="text-xs">
              Veja e baixe os formulários de análise de aderência preenchidos para cada projeto.
            </DialogDescription>
          </DialogHeader>

          {isLoadingLibrary ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Carregando formulários...</span>
            </div>
          ) : completedForms.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-xl">
              Nenhum formulário finalizado ou preenchido encontrado.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      <th className="p-3">Cliente / Projeto</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Última Atualização</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {completedForms.map((form) => {
                      const proj = form.projects;
                      if (!proj) return null;

                      return (
                        <tr key={form.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-semibold text-foreground/90">
                            {proj.client_name}
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              Ticket: #{proj.ticket_number || "Sem Número"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium bg-slate-700 text-white px-2 py-0.5 rounded text-[10px]">
                              {proj.system_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                              form.status === "approved"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : form.status === "submitted"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}>
                              {form.status === "approved"
                                ? "Aprovado"
                                : form.status === "submitted"
                                ? "Em Análise"
                                : "Rascunho"}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(form.updated_at).toLocaleString()}
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/projects/${form.project_id}/adherence`, "_blank")}
                              className="h-7 px-2.5 text-[11px] gap-1 hover:bg-muted"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/projects/${form.project_id}/adherence?print=true`, "_blank")}
                              className="h-7 px-2.5 text-[11px] gap-1 border-primary/20 text-primary hover:bg-primary/5"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
