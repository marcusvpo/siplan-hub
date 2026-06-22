import React from "react";
import { Link } from "react-router-dom";
import { ChecklistEditor } from "@/components/checklist/ChecklistEditor";
import { VisualQuestion } from "@/components/FormRenderer/VisualQuestionBuilder";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";

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
  const topBanner = (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20 p-4 rounded-xl gap-4 mb-2 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-rose-500/15 text-rose-600 rounded-lg dark:text-rose-400">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground">Biblioteca de Respostas</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Consulte, exporte em PDF ou gerencie as análises de aderência já concluídas dos clientes.</p>
        </div>
      </div>
      <Link to="/implantadores/aderencia/finalizadas" className="w-full sm:w-auto">
        <Button 
          className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-bold h-11 px-6 text-xs gap-2 shadow-md shadow-primary/20 uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5"
        >
          <ClipboardCheck className="h-4.5 w-4.5" />
          Aderências Finalizadas
        </Button>
      </Link>
    </div>
  );

  return (
    <ChecklistEditor
      kind="adherence"
      title="Criar/Editar Formulários de Aderência"
      description="Adicione e ordene perguntas de forma visual para estruturar a análise de aderência."
      backPath="/implantadores"
      defaultQuestions={DEFAULT_QUESTIONS}
      schemaTitlePrefix="Aderência do Sistema"
      schemaDescriptionDefault="Verificação inicial de gaps e requisitos"
      topBanner={topBanner}
    />
  );
}
