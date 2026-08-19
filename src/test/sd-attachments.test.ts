import { describe, expect, it } from "vitest";
import {
  formatSdAttachmentSize,
  SD_ATTACHMENT_MAX_BYTES,
  validateSdAttachment,
} from "@/lib/sd-attachments";

describe("anexos de soluções do SD", () => {
  it("formata o tamanho dos arquivos", () => {
    expect(formatSdAttachmentSize(800)).toBe("800 B");
    expect(formatSdAttachmentSize(1536)).toBe("1.5 KB");
    expect(formatSdAttachmentSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("aceita scripts SQL e planilhas", () => {
    expect(validateSdAttachment(new File(["select 1"], "correcao.sql"))).toBeNull();
    expect(validateSdAttachment(new File(["dados"], "levantamento.xlsx"))).toBeNull();
  });

  it("bloqueia executáveis, arquivos vazios e arquivos maiores que 20 MB", () => {
    expect(validateSdAttachment(new File(["binário"], "instalador.exe"))).toContain(
      "não é permitido",
    );
    expect(validateSdAttachment(new File([], "vazio.txt"))).toContain("está vazio");

    const oversized = new File(
      [new Uint8Array(SD_ATTACHMENT_MAX_BYTES + 1)],
      "backup.zip",
    );
    expect(validateSdAttachment(oversized)).toContain("excede o limite de 20 MB");
  });
});
