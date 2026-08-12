import { describe, expect, it } from "vitest";
import { parseNpsCsv } from "@/lib/cs-cx-nps-import";

describe("importação CSV de NPS", () => {
  it("mapeia cabeçalhos flexíveis e separa respondente do cartório", () => {
    const result = parseNpsCsv([
      "Hora de início;Por favor, informe seu nome e cartório;Qual é a probabilidade;Motivo;Sugestão",
      "12/08/2026 10:30;Maria - Cartório Central;10;Ótimo atendimento;Manter o retorno",
    ].join("\n"), "Cartório padrão");

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      respondent_name: "Maria",
      respondent_office: "Cartório Central",
      score: 10,
      score_reason: "Ótimo atendimento",
      improvement_suggestion: "Manter o retorno",
    });
  });

  it("preserva vírgulas dentro de campos entre aspas", () => {
    const result = parseNpsCsv([
      "Data,Nome,Nota,Motivo,Melhoria",
      '2026-08-12T12:00:00Z,João,8,"Bom, mas pode melhorar","Mais rapidez, por favor"',
    ].join("\n"), "Cartório Central");

    expect(result.rows[0].score_reason).toBe("Bom, mas pode melhorar");
    expect(result.rows[0].improvement_suggestion).toBe("Mais rapidez, por favor");
  });

  it("isola linhas inválidas sem descartar as respostas válidas", () => {
    const result = parseNpsCsv([
      "Data,Nome,Pontuação",
      "data-invalida,Maria,10",
      "31/02/2026,Carlos,8",
      "2026-08-12,Ana,",
      "2026-08-12,João,9",
    ].join("\n"), "Cartório Central");

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([
      "Linha 2: data inválida",
      "Linha 3: data inválida",
      "Linha 4: nota fora do intervalo 0–10",
    ]);
  });
});
