interface AdherenceAnalysisQuestion {
  title: string;
  utiliza: boolean;
  value: string;
  impact: boolean;
  impactLevel: string;
  details: string;
  imageTitles: string[];
}

interface AdherenceAnalysisSection {
  title: string;
  questions: AdherenceAnalysisQuestion[];
}

interface AdherenceGeneralField {
  title: string;
  value: string;
}

interface AdherenceTechnicalOpinionInput {
  project: {
    id?: string;
    clientName?: string;
    ticketNumber?: string;
    systemType?: string;
    responsibleAdherence?: string;
  };
  finalVerdict?: string;
  sections: AdherenceAnalysisSection[];
  generalFields: AdherenceGeneralField[];
}

const compactText = (value: string | undefined, limit: number) =>
  (value || "").replace(/\s+/g, " ").trim().slice(0, limit);

export const isAdherenceImpactDescriptionTitle = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .startsWith("itens com impacto");

/** Monta o retrato factual completo que o worker usa para gerar o parecer. */
export function buildAdherenceTechnicalOpinionInput({
  project,
  finalVerdict,
  sections,
  generalFields,
}: AdherenceTechnicalOpinionInput): string {
  return JSON.stringify({
    version: 1,
    project: {
      id: project.id || null,
      clientName: compactText(project.clientName, 300) || null,
      ticketNumber: compactText(project.ticketNumber, 100) || null,
      systemType: compactText(project.systemType, 200) || null,
      responsibleAdherence:
        compactText(project.responsibleAdherence, 300) || null,
    },
    finalVerdict: compactText(finalVerdict, 200) || "Nao informado",
    generalFields: generalFields.slice(0, 50).map((field) => ({
      title: compactText(field.title, 500),
      value: compactText(field.value, 8_000),
    })),
    sections: sections.slice(0, 100).map((section) => ({
      title: compactText(section.title, 500),
      questions: section.questions.slice(0, 200).map((question) => ({
        title: compactText(question.title, 500),
        utiliza: question.utiliza,
        value: compactText(question.value, 2_000),
        impact: question.impact,
        impactLevel: compactText(question.impactLevel, 100),
        details: compactText(question.details, 4_000),
        imageTitles: question.imageTitles
          .slice(0, 20)
          .map((title) => compactText(title, 300)),
      })),
    })),
  });
}
