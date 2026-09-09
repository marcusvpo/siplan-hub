import { describe, expect, it } from "vitest";

import {
  buildAdherenceTechnicalOpinionInput,
  isAdherenceImpactDescriptionTitle,
} from "@/lib/adherence-technical-opinion";

describe("contexto do parecer técnico de aderência", () => {
  it("envia todas as respostas e observações sem depender de texto prévio", () => {
    const input = buildAdherenceTechnicalOpinionInput({
      project: {
        id: "project-1",
        clientName: "Cartório Exemplo",
        ticketNumber: "755241",
        systemType: "Orion TN",
      },
      finalVerdict: "Aderente com Restrições",
      generalFields: [
        {
          title: "Itens com impacto: descreva os itens",
          value: "Adequar uma impressora",
        },
      ],
      sections: [
        {
          title: "Setor de Firmas",
          questions: [
            {
              title: "Impressora compatível?",
              utiliza: true,
              value: "",
              impact: true,
              impactLevel: "ATENÇÃO",
              details: "Comprar um modelo homologado antes da implantação.",
              imageTitles: ["Impressora atual"],
            },
            {
              title: "Scanner compatível?",
              utiliza: true,
              value: "",
              impact: false,
              impactLevel: "NÃO",
              details: "Modelo validado.",
              imageTitles: [],
            },
          ],
        },
      ],
    });
    const payload = JSON.parse(input);

    expect(payload.sections[0].questions).toHaveLength(2);
    expect(payload.sections[0].questions[0]).toMatchObject({
      impact: true,
      details: "Comprar um modelo homologado antes da implantação.",
      imageTitles: ["Impressora atual"],
    });
    expect(payload).not.toHaveProperty("existingTechnicalOpinion");
  });

  it("reconhece o campo de itens com impacto mesmo com complemento no título", () => {
    expect(
      isAdherenceImpactDescriptionTitle(
        "Itens com impacto: (descreva os itens que podem ter impacto na implantação)",
      ),
    ).toBe(true);
  });
});
