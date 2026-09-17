import { describe, expect, it, vi } from "vitest";
import type { CsCxNpsResponse } from "@/hooks/useCsCxExperience";
import { buildNpsAnalytics } from "@/lib/cs-cx-nps-analytics";
import {
  buildCsCxNpsAnalysisReportBlocks,
  calculateCsCxReportRowLayout,
} from "@/lib/cs-cx-experience-pdf";

describe("layout das linhas dos relatórios CS/CX", () => {
  it("separa rótulo e valor em colunas sem sobreposição", () => {
    const splitText = vi.fn((text: string) => [text]);

    const layout = calculateCsCxReportRowLayout(
      "Observações antes da análise",
      "Cliente já utiliza consumo automático",
      182,
      splitText,
    );

    expect(layout.labelWidth).toBe(52);
    expect(layout.valueOffset).toBe(56);
    expect(layout.valueWidth).toBe(122);
    expect(layout.labelWidth).toBeLessThan(layout.valueOffset);
    expect(splitText).toHaveBeenNthCalledWith(1, "Observações antes da análise", 52);
    expect(splitText).toHaveBeenNthCalledWith(2, "Cliente já utiliza consumo automático", 122);
  });

  it("usa a maior quantidade de linhas para definir a altura da linha", () => {
    const layout = calculateCsCxReportRowLayout(
      "Observações depois da análise",
      "Texto longo da observação",
      182,
      (text) => text.startsWith("Observações") ? ["Observações depois", "da análise"] : [text],
    );

    expect(layout.labelLines).toHaveLength(2);
    expect(layout.valueLines).toHaveLength(1);
    expect(layout.height).toBeCloseTo(8.8);
  });

  it("posiciona as melhores notas antes da atenção e não mostra NPS zero por cartório", () => {
    const analytics = buildNpsAnalytics([
      response("a-9", "office-a", "Cartório A", "2026-09-01T12:00:00Z", 9, "PROMOTOR", "Muito bom"),
      response("a-10-old", "office-a", "Cartório A", "2026-09-02T12:00:00Z", 10, "PROMOTOR", "Excelente antiga"),
      response("a-10-new", "office-a", "Cartório A", "2026-09-03T12:00:00Z", 10, "PROMOTOR", "Excelente recente"),
      response("b-10", "office-b", "Cartório B", "2026-09-04T12:00:00Z", 10, "PROMOTOR", "Excelente"),
      response("c-9", "office-c", "Cartório C", "2026-09-05T12:00:00Z", 9, "PROMOTOR", ""),
      response("d-8", "office-d", "Cartório D", "2026-09-06T12:00:00Z", 8, "NEUTRO", "Regular"),
    ]);

    const blocks = buildCsCxNpsAnalysisReportBlocks(analytics);
    const bestIndex = blocks.findIndex(
      (block) => block.title === "CLIENTES COM MELHORES NOTAS",
    );
    const attentionIndex = blocks.findIndex(
      (block) => block.title === "CLIENTES QUE PRECISAM DE ATENÇÃO",
    );
    const best = blocks[bestIndex];
    const performance = blocks.find(
      (block) => block.title === "DESEMPENHO POR CARTÓRIO",
    );

    expect(bestIndex).toBeGreaterThan(-1);
    expect(bestIndex).toBeLessThan(attentionIndex);
    expect(best.rows).toEqual([
      ["Cartório B", "Nota 10 · PROMOTOR · Excelente"],
      ["Cartório A", "Nota 10 · PROMOTOR · Excelente recente"],
      ["Cartório C", "Nota 9 · PROMOTOR · Motivo não informado"],
    ]);
    expect(performance).toBeDefined();
    expect(performance?.subtitle).toBe(
      "Maior nota média primeiro; empates pela resposta mais recente",
    );
    expect(performance?.rows.map(([office]) => office)).toEqual([
      "Cartório B",
      "Cartório A",
      "Cartório C",
      "Cartório D",
    ]);
    expect(performance?.rows.every(([, value]) => !value.includes("NPS 0"))).toBe(true);
    expect(performance?.rows.at(-1)?.[1]).toContain("Nota média 8/10");
  });

  it("explicita quando o recorte não possui notas 9 ou 10", () => {
    const analytics = buildNpsAnalytics([
      response("neutral", "office-a", "Cartório A", "2026-09-01T12:00:00Z", 8, "NEUTRO", "Regular"),
    ]);

    const best = buildCsCxNpsAnalysisReportBlocks(analytics).find(
      (block) => block.title === "CLIENTES COM MELHORES NOTAS",
    );

    expect(best?.rows).toEqual([
      ["Nenhum cliente", "Não há respostas com nota 9 ou 10 no recorte."],
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
): CsCxNpsResponse {
  return {
    id,
    legacy_id: null,
    registry_office_id: registryOfficeId,
    product_id: null,
    responded_at: respondedAt,
    respondent_name: "Respondente",
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
    product: null,
  };
}
