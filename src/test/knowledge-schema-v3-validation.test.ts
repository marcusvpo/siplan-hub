import { describe, it, expect } from "vitest";
import {
  validateRoutineSchemaV3,
  suggestNextArticleId,
  CANONICAL_ROUTINE_BODY_TEMPLATE,
  CANONICAL_ROUTINE_EXAMPLE_METADATA,
  ROUTINE_PREFIX_OPTIONS,
} from "@/services/markdownKnowledgeService";
import type { KnowledgeArticle, KnowledgeArticleMetadata } from "@/types/knowledge";

describe("Schema V3.0 — Validação Canônica & Criação Guiada de Rotinas", () => {
  const mockArticles: KnowledgeArticle[] = [
    {
      id: "R-1.0",
      titulo: "Cadastro Inicial de Firmas",
      sectionIndex: 1,
      sectionName: "Seção 1",
      metadata: {
        id: "R-1.0",
        titulo: "Cadastro Inicial de Firmas",
        objetivo: "Cadastrar novos clientes de firmas",
        tags: ["firmas", "cadastro", "cliente"],
        sinonimos: ["abertura de ficha"],
        perguntas_usuario: ["Como cadastrar firma?", "Onde fica o menu de firmas?", "Como abrir cartão?"],
        sintomas_comuns: ["cliente sem ficha", "erro de biometria", "botão cinza"],
        video: { tem_video: false },
      },
      frontmatterRaw: "",
      body: "#### Descrição:\nTexto conceitual.\n\n#### Passo a passo:\n1. Passo um.",
      startIndex: 0,
      endIndex: 100,
      fullLength: 100,
    },
    {
      id: "C-NOTAS-01",
      titulo: "Erro de Comunicação com Selo Digital",
      sectionIndex: 1,
      sectionName: "Seção 1",
      metadata: {
        id: "C-NOTAS-01",
        titulo: "Erro de Comunicação com Selo Digital",
        objetivo: "Solucionar falha de conexão com o TJ",
        tags: ["selos", "erro", "comunicacao"],
        sinonimos: ["falha de selo"],
        perguntas_usuario: ["Como resolver erro de selo?", "Por que o selo não conecta?", "Onde vejo o log?"],
        sintomas_comuns: ["timeout tj", "selo travado", "erro 500 tj"],
        video: { tem_video: false },
      },
      frontmatterRaw: "",
      body: "#### Descrição:\nTexto conceitual.\n\n#### Passo a passo:\n1. Passo um.",
      startIndex: 101,
      endIndex: 200,
      fullLength: 100,
    },
  ];

  it("aprova com sucesso o template canônico oficial homologado", () => {
    const result = validateRoutineSchemaV3(
      CANONICAL_ROUTINE_EXAMPLE_METADATA,
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejeita ausência de ID e colisão de ID com rotinas existentes", () => {
    // ID vazio
    const resEmpty = validateRoutineSchemaV3(
      { ...CANONICAL_ROUTINE_EXAMPLE_METADATA, id: "" },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );
    expect(resEmpty.isValid).toBe(false);
    expect(resEmpty.errors.some((e) => e.includes("identificador 'id' é obrigatório"))).toBe(true);

    // Colisão com R-1.0
    const resConflict = validateRoutineSchemaV3(
      { ...CANONICAL_ROUTINE_EXAMPLE_METADATA, id: "R-1.0" },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );
    expect(resConflict.isValid).toBe(false);
    expect(resConflict.errors.some((e) => e.includes("já está em uso"))).toBe(true);

    // Edição do próprio ID não é colisão
    const resSelfEdit = validateRoutineSchemaV3(
      { ...CANONICAL_ROUTINE_EXAMPLE_METADATA, id: "R-1.0" },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
      "R-1.0",
    );
    expect(resSelfEdit.isValid).toBe(true);
  });

  it("rejeita títulos que contêm prefixo de ID", () => {
    const res = validateRoutineSchemaV3(
      { ...CANONICAL_ROUTINE_EXAMPLE_METADATA, titulo: "R-39.0 - Título com Prefixo" },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("não deve conter o prefixo do ID"))).toBe(true);
  });

  it("valida quantidade e regras estritas de tags, sinônimos, perguntas e sintomas", () => {
    // Menos de 3 tags
    const resTags = validateRoutineSchemaV3(
      { ...CANONICAL_ROUTINE_EXAMPLE_METADATA, tags: ["tag1", "tag2"] },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );
    expect(resTags.isValid).toBe(false);
    expect(resTags.errors.some((e) => e.includes("tags' deve conter entre 3 e 7"))).toBe(true);

    // Sinônimos vazios
    const resSin = validateRoutineSchemaV3(
      { ...CANONICAL_ROUTINE_EXAMPLE_METADATA, sinonimos: [] },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );
    expect(resSin.isValid).toBe(false);
    expect(resSin.errors.some((e) => e.includes("sinonimos' é obrigatório"))).toBe(true);

    // Sintomas com ponto de interrogação (?)
    const resSintomaQuestion = validateRoutineSchemaV3(
      {
        ...CANONICAL_ROUTINE_EXAMPLE_METADATA,
        sintomas_comuns: ["tela travada", "como faz isso?", "erro no lote"],
      },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );
    expect(resSintomaQuestion.isValid).toBe(false);
    expect(resSintomaQuestion.errors.some((e) => e.includes("ponto de interrogação"))).toBe(true);
  });

  it("PROÍBE ESTRITAMENTE o campo legado video_id conforme ADR-003", () => {
    const invalidVideoMeta: any = {
      ...CANONICAL_ROUTINE_EXAMPLE_METADATA,
      video: {
        tem_video: true,
        video_id: "legacy-guid-123", // PROIBIDO
        video_timestamp: "01:20",
      },
    };

    const res = validateRoutineSchemaV3(
      invalidVideoMeta,
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("PROIBIÇÃO ESTRITA") && e.includes("video_id"))).toBe(true);
  });

  it("valida obrigatoriedade de bunny_video_id e timestamp quando tem_video for true", () => {
    const resMissing = validateRoutineSchemaV3(
      {
        ...CANONICAL_ROUTINE_EXAMPLE_METADATA,
        video: {
          tem_video: true,
          bunny_video_id: "",
          video_timestamp: "",
        },
      },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );

    expect(resMissing.isValid).toBe(false);
    expect(resMissing.errors.some((e) => e.includes("bunny_video_id"))).toBe(true);
    expect(resMissing.errors.some((e) => e.includes("video_timestamp"))).toBe(true);

    // Válido quando preenchido corretamente
    const resValid = validateRoutineSchemaV3(
      {
        ...CANONICAL_ROUTINE_EXAMPLE_METADATA,
        video: {
          tem_video: true,
          bunny_video_id: "guid-456-bunny",
          video_timestamp: "02:15",
        },
      },
      CANONICAL_ROUTINE_BODY_TEMPLATE,
      mockArticles,
    );

    expect(resValid.isValid).toBe(true);
  });

  it("exige cabeçalhos #### Descrição: e #### Passo a passo: no corpo markdown", () => {
    // Sem cabeçalho Descrição
    const resNoDesc = validateRoutineSchemaV3(
      CANONICAL_ROUTINE_EXAMPLE_METADATA,
      "#### Passo a passo:\n1. Primeiro passo.",
      mockArticles,
    );
    expect(resNoDesc.isValid).toBe(false);
    expect(resNoDesc.errors.some((e) => e.includes("#### Descrição:"))).toBe(true);

    // Sem cabeçalho Passo a passo
    const resNoSteps = validateRoutineSchemaV3(
      CANONICAL_ROUTINE_EXAMPLE_METADATA,
      "#### Descrição:\nTexto explicativo.",
      mockArticles,
    );
    expect(resNoSteps.isValid).toBe(false);
    expect(resNoSteps.errors.some((e) => e.includes("#### Passo a passo:"))).toBe(true);

    // Com traços triplos soltos (---)
    const resTripleDash = validateRoutineSchemaV3(
      CANONICAL_ROUTINE_EXAMPLE_METADATA,
      "#### Descrição:\nTexto.\n\n---\n\n#### Passo a passo:\n1. Passo.",
      mockArticles,
    );
    expect(resTripleDash.isValid).toBe(false);
    expect(resTripleDash.errors.some((e) => e.toLowerCase().includes("traço triplo") || e.includes("---"))).toBe(true);
  });

  it("suporta o novo prefixo C (Troubleshooting 0800) em ROUTINE_PREFIX_OPTIONS e suggestNextArticleId", () => {
    const cOption = ROUTINE_PREFIX_OPTIONS.find((p) => p.prefix === "C");
    expect(cOption).toBeDefined();
    expect(cOption?.label).toContain("Troubleshooting");

    const nextCId = suggestNextArticleId(mockArticles, "C");
    expect(nextCId).toBe("C-NOTAS-02");
  });
});
