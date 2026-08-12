import { describe, expect, it } from "vitest";
import {
  parsePublicNpsSubmission,
  parsePublicNpsToken,
} from "../../supabase/functions/_shared/cs-cx-nps-public";
import {
  DEFAULT_NPS_QUESTIONS,
  newNpsQuestion,
  validateNpsQuestionnaire,
} from "@/lib/cs-cx-nps-survey";

const token = "4f7bd865-ec4a-4d81-94ac-a81551aac007";

describe("formulário público de NPS", () => {
  it("aceita um token UUID v4 e uma resposta válida", () => {
    expect(parsePublicNpsToken(token)).toBe(token);
    expect(
      parsePublicNpsSubmission({
        token,
        respondent_name: "Maria",
        answers: { score: 10, score_reason: "Excelente" },
        website: "",
      }),
    ).toEqual({
      token,
      respondentName: "Maria",
      answers: { score: 10, score_reason: "Excelente" },
      honeypot: "",
    });
  });

  it("recusa tokens previsíveis e cargas fora dos limites", () => {
    expect(() => parsePublicNpsToken("123")).toThrow(/inválido/i);
    expect(() =>
      parsePublicNpsSubmission({
        token,
        respondent_name: "Maria",
        answers: Object.fromEntries(
          Array.from({ length: 51 }, (_, index) => [`q${index}`, "x"]),
        ),
      }),
    ).toThrow(/quantidade/i);
    expect(() =>
      parsePublicNpsSubmission({
        token,
        respondent_name: "Maria",
        answers: { score: 11 },
      }),
    ).toThrow(/formato/i);
  });

  it("mantém a escala NPS obrigatória no questionário", () => {
    expect(
      validateNpsQuestionnaire({
        title: "Pesquisa padrão",
        questions: DEFAULT_NPS_QUESTIONS,
      }),
    ).toBeNull();
    expect(
      validateNpsQuestionnaire({
        title: "Sem nota",
        questions: DEFAULT_NPS_QUESTIONS.filter(
          (question) => question.type !== "nps",
        ),
      }),
    ).toMatch(/pergunta principal de NPS/i);
  });

  it("permite adicionar uma nota complementar sem alterar o NPS principal", () => {
    const question = newNpsQuestion("rating");
    expect(question.type).toBe("rating");
    expect(question.semantic_key).toBeUndefined();
  });
});
