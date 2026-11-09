import { describe, it, expect } from "vitest";
import {
  formatSecondsToTimestamp,
  parseTimestampToSeconds,
  parseArticleFrontmatter,
  parseMasterDocument,
  serializeArticleToMarkdown,
  ensureCrlf,
  hasIdPrefixInTitle,
  stripIdPrefixFromTitle,
  validateSintomasComuns,
  validatePerguntasUsuario,
  validateTags,
  validateRoutineBody,
  suggestNextArticleId,
} from "@/services/markdownKnowledgeService";

describe("Video Metadata & Knowledge Base Parsing", () => {
  it("converte timestamps e segundos bidirecionalmente com precisão", () => {
    expect(formatSecondsToTimestamp(0)).toBe("00:00");
    expect(formatSecondsToTimestamp(45)).toBe("00:45");
    expect(formatSecondsToTimestamp(90)).toBe("01:30");
    expect(formatSecondsToTimestamp(3665)).toBe("01:01:05");
    expect(formatSecondsToTimestamp(undefined)).toBe("00:00");
    expect(formatSecondsToTimestamp(null)).toBe("00:00");

    expect(parseTimestampToSeconds("00:00")).toBe(0);
    expect(parseTimestampToSeconds("00:45")).toBe(45);
    expect(parseTimestampToSeconds("01:30")).toBe(90);
    expect(parseTimestampToSeconds("01:01:05")).toBe(3665);
    expect(parseTimestampToSeconds("")).toBe(0);
  });

  it("faz o parse de metadados avançados de vídeo com js-yaml", () => {
    const yamlContent = `
id: ROT-001
titulo: "Cadastro de Firmas"
objetivo: "Explicar como cadastrar firmas no Orion TN"
tags:
  - firmas
  - orion
video:
  tem_video: true
  bunny_library_id: "467408"
  bunny_video_id: "abc-123-guid"
  video_title: "Treinamento Oficial de Firmas"
  video_url: "https://iframe.mediadelivery.net/embed/467408/abc-123-guid?t=135"
  video_timestamp: "02:15"
  video_start_seconds: 135
`;

    const metadata = parseArticleFrontmatter(yamlContent);
    expect(metadata.id).toBe("ROT-001");
    expect(metadata.titulo).toBe("Cadastro de Firmas");
    expect(metadata.video).toBeDefined();
    expect(metadata.video?.tem_video).toBe(true);
    expect(metadata.video?.bunny_library_id).toBe("467408");
    expect(metadata.video?.bunny_video_id).toBe("abc-123-guid");
    expect(metadata.video?.video_title).toBe("Treinamento Oficial de Firmas");
    expect(metadata.video?.video_url).toBe("https://iframe.mediadelivery.net/embed/467408/abc-123-guid?t=135");
    expect(metadata.video?.video_timestamp).toBe("02:15");
    expect(metadata.video?.video_start_seconds).toBe(135);
  });

  it("deriva video_start_seconds a partir de video_timestamp quando ausente", () => {
    const yamlContent = `
id: ROT-002
titulo: "Abertura de Cartão"
video:
  tem_video: true
  bunny_library_id: "467408"
  bunny_video_id: "def-456-guid"
  video_timestamp: "03:40"
`;

    const metadata = parseArticleFrontmatter(yamlContent);
    expect(metadata.video?.video_timestamp).toBe("03:40");
    expect(metadata.video?.video_start_seconds).toBe(220);
    expect(metadata.video?.video_url).toContain("?t=220");
  });

  it("deriva video_timestamp a partir de video_start_seconds quando ausente", () => {
    const yamlContent = `
id: ROT-003
titulo: "Consulta de Pessoas"
video:
  tem_video: true
  bunny_library_id: "467408"
  bunny_video_id: "ghi-789-guid"
  video_start_seconds: 75
`;

    const metadata = parseArticleFrontmatter(yamlContent);
    expect(metadata.video?.video_start_seconds).toBe(75);
    expect(metadata.video?.video_timestamp).toBe("01:15");
    expect(metadata.video?.video_url).toContain("?t=75");
  });

  it("garante que video_url no parse e serialize sempre tenha ?t=${startSec || 0} atualizado", () => {
    const yamlContent = `
id: ROT-004
titulo: "Qualificação no Editor"
video:
  tem_video: true
  video_url: "https://iframe.mediadelivery.net/embed/467408/xyz-999-guid?t=0"
  video_start_seconds: 145
`;

    const parsedMeta = parseArticleFrontmatter(yamlContent);
    expect(parsedMeta.video?.video_start_seconds).toBe(145);
    expect(parsedMeta.video?.video_timestamp).toBe("02:25");
    expect(parsedMeta.video?.video_url).toBe("https://iframe.mediadelivery.net/embed/467408/xyz-999-guid?t=145");

    const yamlWithUrlOnly = `
id: ROT-005
titulo: "Distribuição de Notas"
video:
  tem_video: true
  video_url: "https://iframe.mediadelivery.net/embed/467408/xyz-888-guid?t=180"
`;
    const parsedFromUrl = parseArticleFrontmatter(yamlWithUrlOnly);
    expect(parsedFromUrl.video?.video_start_seconds).toBe(180);
    expect(parsedFromUrl.video?.video_timestamp).toBe("03:00");
    expect(parsedFromUrl.video?.video_url).toContain("?t=180");

    const serialized = serializeArticleToMarkdown(
      {
        id: "ROT-006",
        titulo: "Test Serialize",
        tags: ["video", "treinamento"],
        objetivo: "Reproduzir o vídeo a partir do tempo indicado.",
        sinonimos: ["início do vídeo"],
        perguntas_usuario: ["Como iniciar o vídeo em 01:35?"],
        sintomas_comuns: ["vídeo não inicia", "player travado"],
        video: {
          tem_video: true,
          bunny_library_id: "467408",
          bunny_video_id: "vid-111",
          video_url: "https://iframe.mediadelivery.net/embed/467408/vid-111?t=0",
          video_start_seconds: 95,
          video_timestamp: "01:35",
        },
      },
      "Corpo do artigo de teste",
      true
    );

    const serializedFrontmatter = serialized.split("---")[1];
    const parsedSerialized = parseArticleFrontmatter(serializedFrontmatter);
    expect(serialized).toContain("video_start_seconds: 95");
    expect(serialized).toContain("https://iframe.mediadelivery.net/embed/467408/vid-111?t=95");
    expect(parsedSerialized.video?.video_start_seconds).toBe(95);
    expect(parsedSerialized.video?.video_timestamp).toBe("01:35");
    expect(parsedSerialized.video?.video_url).toBe("https://iframe.mediadelivery.net/embed/467408/vid-111?t=95");
  });
});

describe("Schema V3 & Sintomas Comuns Validation", () => {
  it("faz parse de sintomas_comuns a partir de YAML", () => {
    const yaml = `
id: D-3.80
titulo: "Como Cadastrar Novo Cliente com IA"
tags:
  - firmas
  - cartao-assinatura
  - inteligencia-artificial
objetivo: "Cadastrar ficha do cliente usando OCR e IA no Orion TN"
sinonimos:
  - leitura com IA
  - preenchimento automatico
perguntas_usuario:
  - "Como preencher o cartão de assinatura com IA?"
  - "Onde anexo os documentos da firma usando scanner?"
  - "Como usar o OCR no Orion?"
sintomas_comuns:
  - "não consigo digitar no cartão"
  - "leitura de documento falhou"
  - "foto do autógrafo não carrega"
`;
    const metadata = parseArticleFrontmatter(yaml);
    expect(metadata.id).toBe("D-3.80");
    expect(metadata.titulo).toBe("Como Cadastrar Novo Cliente com IA");
    expect(metadata.sintomas_comuns).toEqual([
      "não consigo digitar no cartão",
      "leitura de documento falhou",
      "foto do autógrafo não carrega",
    ]);
  });

  it("valida sintomas_comuns exigindo de 3 a 5 itens e sem interrogações (?)", () => {
    // Válido: 3 itens sem ?
    const valid3 = validateSintomasComuns([
      "tela travada em cinza",
      "botão salvar não aparece",
      "erro ao validar lote",
    ]);
    expect(valid3.valid).toBe(true);

    // Inválido: menos de 3 itens
    const invalidUnder3 = validateSintomasComuns([
      "tela travada em cinza",
      "botão salvar não aparece",
    ]);
    expect(invalidUnder3.valid).toBe(false);
    expect(invalidUnder3.errors[0]).toContain("pelo menos 3 sintomas");

    // Inválido: mais de 5 itens
    const invalidOver5 = validateSintomasComuns([
      "sintoma 1",
      "sintoma 2",
      "sintoma 3",
      "sintoma 4",
      "sintoma 5",
      "sintoma 6",
    ]);
    expect(invalidOver5.valid).toBe(false);
    expect(invalidOver5.errors[0]).toContain("no máximo 5 sintomas");

    // Inválido: contém interrogação (?)
    const invalidWithQuestion = validateSintomasComuns([
      "como resolver tela cinza?",
      "botão salvar não aparece",
      "erro ao validar lote",
    ]);
    expect(invalidWithQuestion.valid).toBe(false);
    expect(invalidWithQuestion.errors.some((e) => e.includes("interrogação"))).toBe(true);
  });

  it("valida perguntas_usuario exigindo de 3 a 5 perguntas", () => {
    const valid = validatePerguntasUsuario([
      "Como emitir segunda via?",
      "Onde localizo a certidão?",
      "Como cancelar o selo?",
    ]);
    expect(valid.valid).toBe(true);

    const invalid = validatePerguntasUsuario(["Como emitir?"]);
    expect(invalid.valid).toBe(false);
  });

  it("valida tags exigindo de 3 a 7 tags", () => {
    const valid = validateTags(["firmas", "cartao", "balcao"]);
    expect(valid.valid).toBe(true);

    const invalid = validateTags(["firmas"]);
    expect(invalid.valid).toBe(false);
  });
});

describe("Title Validation & ID Prefix Stripping", () => {
  it("detecta prefixos de ID no título", () => {
    expect(hasIdPrefixInTitle("D-3.80 Como Cadastrar Cliente")).toBe(true);
    expect(hasIdPrefixInTitle("D-3.80 - Como Cadastrar Cliente")).toBe(true);
    expect(hasIdPrefixInTitle("[D-3.80] Como Cadastrar Cliente")).toBe(true);
    expect(hasIdPrefixInTitle("R-1.01 Consulta")).toBe(true);
    expect(hasIdPrefixInTitle("Como Cadastrar Cliente")).toBe(false);
  });

  it("remove prefixo de ID do título mantendo o título funcional limpo", () => {
    expect(stripIdPrefixFromTitle("D-3.80 Como Cadastrar Cliente")).toBe("Como Cadastrar Cliente");
    expect(stripIdPrefixFromTitle("D-3.80 - Como Cadastrar Cliente")).toBe("Como Cadastrar Cliente");
    expect(stripIdPrefixFromTitle("[D-3.80] Como Cadastrar Cliente")).toBe("Como Cadastrar Cliente");
    expect(stripIdPrefixFromTitle("R-1.01: Consulta de Atos")).toBe("Consulta de Atos");
    expect(stripIdPrefixFromTitle("Como Cadastrar Cliente")).toBe("Como Cadastrar Cliente");
  });
});

describe("Routine Body & Line Endings Validation", () => {
  it("valida que o corpo da rotina deve começar com #### Descrição: e conter #### Passo a passo:", () => {
    const validBody = `#### Descrição:
Cadastra nova ficha no balcão.

#### Passo a passo:
1. Acesse **Menu > Cadastros**.
2. Preencha os campos.
3. Clique em **Salvar**.`;

    const res = validateRoutineBody(validBody);
    expect(res.valid).toBe(true);

    const missingDesc = `#### Passo a passo:
1. Acesse o menu.`;
    expect(validateRoutineBody(missingDesc).valid).toBe(false);
    expect(validateRoutineBody(missingDesc).errors.some((e) => e.includes("#### Descrição:"))).toBe(true);

    const missingSteps = `#### Descrição:
Apenas explicação sem passos.`;
    expect(validateRoutineBody(missingSteps).valid).toBe(false);
    expect(validateRoutineBody(missingSteps).errors.some((e) => e.includes("#### Passo a passo:"))).toBe(true);
  });

  it("rejeita delimitadores --- no corpo da rotina para não quebrar o YAML", () => {
    const invalidBodyWithDashes = `#### Descrição:
Explicação da rotina.
---
#### Passo a passo:
1. Passo 1.`;

    const res = validateRoutineBody(invalidBodyWithDashes);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("---"))).toBe(true);
  });

  it("ensureCrlf converte quebras LF para CRLF e preserva CRLF existentes", () => {
    const lfText = "linha 1\nlinha 2\nlinha 3";
    const crlfText = ensureCrlf(lfText);
    expect(crlfText).toBe("linha 1\r\nlinha 2\r\nlinha 3");

    // Não duplica CRLF para CRCRLF
    const doubleTest = ensureCrlf(crlfText);
    expect(doubleTest).toBe("linha 1\r\nlinha 2\r\nlinha 3");
  });
});

describe("ID Generation with Prefixes", () => {
  it("sugere próximo ID para cada prefixo (D, R, V, M, S)", () => {
    const mockArticles = [
      { id: "D-1.01", metadata: { id: "D-1.01", titulo: "T1", tags: [], objetivo: "", sinonimos: [], perguntas_usuario: [], sintomas_comuns: [] }, body: "", sectionIndex: 0 },
      { id: "D-1.02", metadata: { id: "D-1.02", titulo: "T2", tags: [], objetivo: "", sinonimos: [], perguntas_usuario: [], sintomas_comuns: [] }, body: "", sectionIndex: 0 },
      { id: "R-2.05", metadata: { id: "R-2.05", titulo: "T3", tags: [], objetivo: "", sinonimos: [], perguntas_usuario: [], sintomas_comuns: [] }, body: "", sectionIndex: 0 },
    ];

    expect(suggestNextArticleId(mockArticles as any, "D")).toBe("D-1.03");
    expect(suggestNextArticleId(mockArticles as any, "R")).toBe("R-2.06");
    expect(suggestNextArticleId(mockArticles as any, "V")).toBe("V-1.01");
    expect(suggestNextArticleId(mockArticles as any, "M")).toBe("M-1.01");
    expect(suggestNextArticleId(mockArticles as any, "S")).toBe("S-5.1");
  });
});

describe("Strict YAML serialization order", () => {
  it("garante que o frontmatter seja serializado estritamente na ordem exigida com CRLF", () => {
    const serialized = serializeArticleToMarkdown(
      {
        id: "D-3.80",
        titulo: "Como Cadastrar Novo Cliente com IA",
        tags: ["firmas", "cartao", "ia"],
        objetivo: "Cadastrar cliente no balcão.",
        sinonimos: ["ficha", "autógrafo"],
        perguntas_usuario: ["Como cadastrar?", "Onde salvar?", "Qual menu?"],
        sintomas_comuns: ["tela cinza", "leitura falhou", "botão sumiu"],
        video: {
          tem_video: true,
          bunny_library_id: "467408",
          bunny_video_id: "guid-123",
          video_title: "Treinamento Balcão",
          video_url: "https://iframe.mediadelivery.net/embed/467408/guid-123?t=0",
          video_timestamp: "00:00",
          video_start_seconds: 0,
        },
      },
      "#### Descrição:\nFicha do cliente.\n\n#### Passo a passo:\n1. Acesse menu.\n2. Salve.",
      true
    );

    // Deve conter CRLF
    expect(serialized).toContain("\r\n");

    // Verificar ordem das chaves
    const idIdx = serialized.indexOf("id: D-3.80");
    const tituloIdx = serialized.indexOf("titulo:");
    const tagsIdx = serialized.indexOf("tags:");
    const objIdx = serialized.indexOf("objetivo:");
    const sinIdx = serialized.indexOf("sinonimos:");
    const pergIdx = serialized.indexOf("perguntas_usuario:");
    const sintIdx = serialized.indexOf("sintomas_comuns:");
    const vidIdx = serialized.indexOf("video:");

    expect(idIdx).toBeLessThan(tituloIdx);
    expect(tituloIdx).toBeLessThan(tagsIdx);
    expect(tagsIdx).toBeLessThan(objIdx);
    expect(objIdx).toBeLessThan(sinIdx);
    expect(sinIdx).toBeLessThan(pergIdx);
    expect(pergIdx).toBeLessThan(sintIdx);
    expect(sintIdx).toBeLessThan(vidIdx);
  });
});
