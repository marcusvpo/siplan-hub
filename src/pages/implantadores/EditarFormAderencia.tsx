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
    <div className="mb-2 flex min-w-0 flex-col items-start justify-between gap-3 overflow-hidden rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 animate-in slide-in-from-top-4 duration-300">
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-lg bg-rose-500/15 p-2.5 text-rose-600 dark:text-rose-400">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-foreground">Biblioteca de Respostas</h4>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">Consulte, exporte em PDF ou gerencie as análises de aderência já concluídas dos clientes.</p>
        </div>
      </div>
      <Link to="/implantadores/aderencia/finalizadas" className="w-full sm:w-auto">
        <Button className="h-10 w-full gap-2 bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/95 sm:h-11 sm:w-auto sm:px-6">
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
