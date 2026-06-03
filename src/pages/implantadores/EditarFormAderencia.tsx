import React, { useState, useEffect } from "react";
import { ChecklistEditor } from "@/components/checklist/ChecklistEditor";
import { VisualQuestion } from "@/components/FormRenderer/VisualQuestionBuilder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClipboardCheck, Eye, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
          data,
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

  const extraHeaderButtons = (
    <Button
      variant="outline"
      onClick={() => setIsLibraryOpen(true)}
      className="h-9 gap-1.5 border-muted-foreground/30 bg-card"
    >
      <ClipboardCheck className="h-4 w-4" />
      Formulários Finalizados
    </Button>
  );

  const extraDialogs = (
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
          <div className="border rounded-lg overflow-hidden bg-card text-left">
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
                              ? (form.data?.finalVerdict === "Totalmente Aderente"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : form.data?.finalVerdict === "Aderente com Restrições"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20")
                              : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                          }`}>
                            {form.status === "approved"
                              ? (form.data?.finalVerdict || "Finalizado")
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
  );

  return (
    <ChecklistEditor
      kind="adherence"
      title="Criador de Formulário de Aderência"
      description="Adicione e ordene perguntas de forma visual para estruturar a análise de aderência."
      backPath="/implantadores"
      defaultQuestions={DEFAULT_QUESTIONS}
      schemaTitlePrefix="Aderência do Sistema"
      schemaDescriptionDefault="Verificação inicial de gaps e requisitos"
      extraHeaderButtons={extraHeaderButtons}
      extraDialogs={extraDialogs}
    />
  );
}
