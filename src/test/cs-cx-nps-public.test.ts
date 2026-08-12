import { describe, expect, it } from "vitest";
import {
  parsePublicNpsSubmission,
  parsePublicNpsToken,
} from "../../supabase/functions/_shared/cs-cx-nps-public";
import {
  DEFAULT_NPS_QUESTIONS,
  DEFAULT_NPS_THEME,
  normalizeNpsTheme,
  publicNpsAssetUrl,
  newNpsQuestion,
  validateNpsBackgroundFile,
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

  it("normaliza o tema e aceita somente imagens seguras", () => {
    expect(
      normalizeNpsTheme({
        primary_color: "#123abc",
        background_color: "#ffffff",
        background_image_path:
          "themes/4f7bd865-ec4a-4d81-94ac-a81551aac007.webp",
        background_overlay: 45,
      }),
    ).toEqual({
      primary_color: "#123ABC",
      background_color: "#FFFFFF",
      background_image_path:
        "themes/4f7bd865-ec4a-4d81-94ac-a81551aac007.webp",
      background_overlay: 45,
    });
    expect(
      normalizeNpsTheme({
        primary_color: "red; background:url(javascript:alert(1))",
        background_image_path: "https://site-malicioso.test/fundo.png",
      }),
    ).toEqual(DEFAULT_NPS_THEME);
    expect(
      validateNpsBackgroundFile({ type: "image/webp", size: 1024 }),
    ).toBeNull();
    expect(
      validateNpsBackgroundFile({ type: "image/svg+xml", size: 1024 }),
    ).toMatch(/jpg, png ou webp/i);
  });

  it("gera apenas URLs do bucket público de temas", () => {
    expect(
      publicNpsAssetUrl(
        "themes/4f7bd865-ec4a-4d81-94ac-a81551aac007.png",
        "https://project.supabase.co",
      ),
    ).toContain(
      "/storage/v1/object/public/cs-cx-nps-assets/themes/4f7bd865-ec4a-4d81-94ac-a81551aac007.png",
    );
    expect(publicNpsAssetUrl("https://site-malicioso.test/a.png")).toBeNull();
  });
});
