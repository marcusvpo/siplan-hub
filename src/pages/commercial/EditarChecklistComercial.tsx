import { ChecklistEditor } from "@/components/checklist/ChecklistEditor";
import { VisualQuestion } from "@/components/FormRenderer/VisualQuestionBuilder";

const DEFAULT_QUESTIONS: VisualQuestion[] = [
  {
    id: "fullname",
    title: "Nome Completo do Responsável pelo Preenchimento",
    type: "text",
    required: true,
  },
  {
    id: "role",
    title: "Cargo / Função na Serventia",
    type: "text",
    required: true,
  },
  {
    id: "email",
    title: "E-mail de Contato",
    type: "text",
    required: true,
  },
  {
    id: "phones",
    title: "Telefone / WhatsApp (coloque vírgula se mais de um)",
    type: "text",
    required: true,
  },
  {
    id: "floors",
    title: "Quantos andares possui a serventia?",
    type: "number",
    required: true,
  },
  {
    id: "structure_obs",
    title: "Observações adicionais sobre o local/estrutura física",
    type: "textarea",
    required: false,
  },
  {
    id: "sectors",
    title: "Quais setores existem no estabelecimento?",
    type: "text",
    required: true,
  },
  {
    id: "sectors_distribution",
    title: "Como os setores estão distribuídos nos andares?",
    type: "textarea",
    required: true,
  },
  {
    id: "sectors_obs",
    title: "Observações adicionais sobre os setores",
    type: "textarea",
    required: false,
  },
  {
    id: "employees_by_sector",
    title: "Quantidade de colaboradores por setor",
    type: "textarea",
    required: false,
  },
  {
    id: "total_employees",
    title: "Quantidade total de colaboradores da serventia",
    type: "number",
    required: true,
  },
  {
    id: "aware_of_change",
    title: "Todos os colaboradores estão cientes da mudança do sistema?",
    type: "select",
    required: true,
    options: ["Sim", "Não", "Parcialmente"],
  },
  {
    id: "team_adaptability",
    title: "Como a equipe lida com mudanças ou sistemas novos?",
    type: "textarea",
    required: true,
  },
  {
    id: "employees_obs",
    title: "Observações adicionais sobre equipe/comunicação",
    type: "textarea",
    required: false,
  },
];

export default function EditarChecklistComercial() {
  return (
    <ChecklistEditor
      kind="commercial_checklist"
      title="Criador de Checklist Comercial"
      description="Customize de forma visual as perguntas do checklist enviadas para os clientes do Comercial."
      backPath="/commercial/checklists"
      defaultQuestions={DEFAULT_QUESTIONS}
      schemaTitlePrefix="Checklist Estrutural da Serventia"
      schemaDescriptionDefault="Coleta de informações básicas sobre estrutura, pessoas e setores"
    />
  );
}
