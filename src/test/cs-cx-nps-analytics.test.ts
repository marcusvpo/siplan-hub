import { describe, expect, it } from "vitest";
import type { CsCxNpsResponse } from "@/hooks/useCsCxExperience";
import {
  buildNpsAiSource,
  buildNpsAnalytics,
  filterNpsResponses,
} from "@/lib/cs-cx-nps-analytics";

const responses: CsCxNpsResponse[] = [
  response("1", "office-a", "Cartório A", "2026-01-10T12:00:00Z", 10, "PROMOTOR", "Excelente", "Maria"),
  response("2", "office-a", "Cartório A", "2026-01-20T12:00:00Z", 0, "DETRATOR", "Demora no retorno", "João"),
  response("3", "office-b", "Cartório B", "2026-02-05T12:00:00Z", 8, "NEUTRO", "Pode melhorar", "Ana"),
];

describe("BI de NPS", () => {
  it("calcula os indicadores, evolução e ranking do recorte", () => {
    const analytics = buildNpsAnalytics(responses);

    expect(analytics).toMatchObject({
      total: 3,
      promoters: 1,
      neutrals: 1,
      detractors: 1,
      nps: 0,
      averageScore: 6,
      officesCount: 2,
      trendDelta: 0,
    });
    expect(analytics.monthly.map((month) => month.responses)).toEqual([2, 1]);
    expect(analytics.byOffice[0]).toMatchObject({
      name: "Cartório A",
      responses: 2,
      nps: 0,
    });
    expect(analytics.feedback[0].classification).toBe("DETRATOR");
    expect(analytics.attentionClients.map((client) => [client.name, client.score])).toEqual([
      ["Cartório A", 0],
      ["Cartório B", 8],
    ]);
    expect(analytics.scoreDistribution.find((item) => item.score === 0)?.responses).toBe(1);
    expect(analytics.scoreDistribution.find((item) => item.score === 8)?.responses).toBe(1);
    expect(analytics.scoreDistribution.find((item) => item.score === 10)?.responses).toBe(1);
  });

  it("filtra por período e cartório", () => {
    const filtered = filterNpsResponses(responses, {
      startDate: "2026-02-01",
      endDate: "2026-02-28",
      officeId: "office-b",
    });

    expect(filtered.map((item) => item.id)).toEqual(["3"]);
  });

  it("ordena o ranking de cartórios do maior NPS para o menor", () => {
    const ranking = buildNpsAnalytics([
      response("high", "office-high", "Cartório Promotor", "2026-02-03T12:00:00Z", 10, "PROMOTOR", "Excelente", "Maria"),
      response("neutral", "office-neutral", "Cartório Neutro", "2026-02-02T12:00:00Z", 8, "NEUTRO", "Regular", "Ana"),
      response("low", "office-low", "Cartório Detrator", "2026-02-01T12:00:00Z", 2, "DETRATOR", "Ruim", "João"),
    ]).byOffice;

    expect(ranking.map((office) => [office.name, office.nps])).toEqual([
      ["Cartório Promotor", 100],
      ["Cartório Neutro", 0],
      ["Cartório Detrator", -100],
    ]);
  });

  it("prepara evidências para a IA sem expor o nome do respondente", () => {
    const source = buildNpsAiSource(buildNpsAnalytics(responses), "Todo o período");

    expect(source).toContain("Demora no retorno");
    expect(source).toContain("Cartório A");
    expect(source).toContain("Clientes com as menores notas");
    expect(source).not.toContain("Maria");
    expect(source).not.toContain("João");
  });

  it("consolida notas e escolhas das perguntas adicionais", () => {
    const customized: CsCxNpsResponse = {
      ...responses[2],
      questionnaire_snapshot: {
        title: "Pesquisa completa",
        description: null,
        questions: [
          { id: "rating", type: "rating", title: "Nota do atendimento", required: true },
          {
            id: "channel",
            type: "single_choice",
            title: "Canal preferido",
            required: true,
            options: ["Telefone", "WhatsApp"],
          },
        ],
      },
      answers: { rating: 9, channel: "WhatsApp" },
    };

    const analytics = buildNpsAnalytics([...responses.slice(0, 2), customized]);

    expect(analytics.additionalQuestions[0]).toMatchObject({
      title: "Nota do atendimento",
      answers: 1,
      averageScore: 9,
    });
    expect(analytics.additionalQuestions[1].options).toEqual([
      { label: "WhatsApp", total: 1 },
    ]);
  });
});

function response(
  id: string,
  registryOfficeId: string,
  office: string,
  respondedAt: string,
  score: number,
  classification: CsCxNpsResponse["classification"],
  reason: string,
  respondent: string,
): CsCxNpsResponse {
  return {
    id,
    legacy_id: null,
    registry_office_id: registryOfficeId,
    responded_at: respondedAt,
    respondent_name: respondent,
    respondent_office: office,
    score,
    score_reason: reason,
    improvement_suggestion: null,
    classification,
    origin: "hub",
    invitation_id: null,
    questionnaire_id: null,
    questionnaire_snapshot: null,
    answers: {},
    registry_office: { id: registryOfficeId, name: office },
  };
}
