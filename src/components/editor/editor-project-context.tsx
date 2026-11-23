import { createContext, useContext } from "react";
import type { ProjectV2 } from "@/types/ProjectV2";

export interface EditorProjectContextValue {
  project?: Partial<ProjectV2>;
  onNavigateToStage?: (stageId: string, route?: string) => void;
}

const EditorProjectContext = createContext<EditorProjectContextValue>({});

export const EditorProjectProvider = EditorProjectContext.Provider;

export function useEditorProjectContext(): EditorProjectContextValue {
  return useContext(EditorProjectContext);
}

export interface HubAnalystOption {
  id: string;
  name: string;
  role: string;
}

export const HUB_ANALYSTS: HubAnalystOption[] = [
  { id: "alex-silva", name: "Alex Silva", role: "Infra & Ambiente (Etapas 1 e 4)" },
  { id: "bruno-fernandes", name: "Bruno Fernandes", role: "Infra, Ambiente & Modelos TN" },
  { id: "ademar-souza", name: "Ademar Souza", role: "Conversão de Dados (Etapa 3)" },
  { id: "luciane-lima", name: "Luciane Lima", role: "Conversão de Dados (Etapa 3)" },
  { id: "hugo-januario", name: "Hugo Januário", role: "Conversão de Dados (Etapa 3)" },
  { id: "maria-santos", name: "Maria Santos", role: "Agendas, Alocação & CS/NPS" },
  { id: "lunna-santana", name: "Lunna Santana", role: "Agendas, Homologação & CS" },
  { id: "julio-araujo", name: "Julio Araujo", role: "Implantador Sênior — Orion REG" },
  { id: "rodrigo-brites", name: "Rodrigo Brites", role: "Implantador Sênior — Orion PRO / TN" },
  { id: "rodrigo-mizuno", name: "Rodrigo Mizuno", role: "Implantador Sênior — Orion PRO" },
  { id: "ricardo-vieira", name: "Ricardo Vieira", role: "Implantador Sênior — Orion TN" },
  { id: "erik-marques", name: "Erik Marques", role: "Modelos TN, Pós TN & Aderência" },
  { id: "bruna-pomini", name: "Bruna Pomini", role: "CS/CX & Pós-Implantação PRO" },
  { id: "henrique-troiano", name: "Henrique Troiano", role: "CS/CX & Pós-Implantação TN" },
  { id: "carlos-neves", name: "Carlos Neves", role: "Líder Técnico SD / Pós TN" },
  { id: "carlos-silva", name: "Carlos Silva", role: "Líder Técnico SD / Pós TN" },
  { id: "marcos-fernandes", name: "Marcos Fernandes", role: "Líder Técnico SD / Pós PRO" },
  { id: "alana-silva", name: "Alana Silva", role: "Analista SD / Pós PRO" },
  { id: "luiz-lucente", name: "Luiz Lucente", role: "Analista SD / Pós REG" },
  { id: "romario-lima", name: "Romario Lima", role: "Analista SD / Pós REG" },
];

export interface HubStageMentionOption {
  id: string;
  label: string;
  stageId: string;
  route?: string;
  routeLabel: string;
  orionTnOnly?: boolean;
}

export const HUB_STAGE_MENTIONS: HubStageMentionOption[] = [
  {
    id: "infra",
    label: "Infraestrutura",
    stageId: "infra",
    routeLabel: "Aba Etapas → 1. Infraestrutura",
  },
  {
    id: "adherence",
    label: "Aderência",
    stageId: "adherence",
    route: "/implantadores/aderencia",
    routeLabel: "Ir para /implantadores/aderencia",
  },
  {
    id: "conversion",
    label: "Conversão",
    stageId: "conversion",
    route: "/conversion/atividades",
    routeLabel: "Ir para /conversion/atividades",
  },
  {
    id: "homologation",
    label: "Homologação",
    stageId: "conversion",
    route: "/conversion/atividades",
    routeLabel: "Ir para Conversão & Homologação",
  },
  {
    id: "environment",
    label: "Ambiente",
    stageId: "environment",
    route: "/deployments/environment-config",
    routeLabel: "Ir para Kanban de Ambiente",
  },
  {
    id: "modelosEditor",
    label: "ModelosTN",
    stageId: "modelosEditor",
    route: "/orion-tn-models",
    routeLabel: "Ir para /orion-tn-models",
    orionTnOnly: true,
  },
  {
    id: "implementation",
    label: "Implantação",
    stageId: "implementation",
    routeLabel: "Aba Etapas → 5. Implantação",
  },
  {
    id: "post",
    label: "Pós-Implantação",
    stageId: "post",
    route: "/dashboard/pos-implantacao",
    routeLabel: "Ir para Pós-Implantação",
  },
];
