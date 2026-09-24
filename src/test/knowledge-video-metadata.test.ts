import { describe, it, expect } from "vitest";
import {
  formatSecondsToTimestamp,
  parseTimestampToSeconds,
  parseArticleFrontmatter,
  parseMasterDocument,
  serializeArticleToMarkdown,
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
    // 1. Parse com video_url desatualizada e video_start_seconds diferente
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

    // 2. Extração automática de start_seconds e timestamp a partir da video_url quando não declarados explicitamente
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

    // 3. Serialize atualiza video_url com ?t=${startSecs}
    const serialized = serializeArticleToMarkdown(
      {
        id: "ROT-006",
        titulo: "Test Serialize",
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

    expect(serialized).toContain("video_start_seconds: 95");
    expect(serialized).toContain("video_timestamp: '01:35'");
    expect(serialized).toContain("video_url: https://iframe.mediadelivery.net/embed/467408/vid-111?t=95");
  });
});
