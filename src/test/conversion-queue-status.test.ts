import { describe, expect, it } from "vitest";
import { resolveConversionQueueStatus } from "@/utils/conversion-queue-status";

describe("status da fila de conversão", () => {
  it.each(["pending", "in_progress", "awaiting_homologation", "homologation_issues"])(
    "trata a etapa finalizada como concluída mesmo com a fila em %s",
    (queueStatus) => {
      expect(resolveConversionQueueStatus(queueStatus, "done")).toBe("done");
    },
  );

  it.each([
    ["pending", "in-progress"],
    ["in_progress", "in-progress"],
    ["awaiting_homologation", "in-progress"],
    ["homologation_issues", "blocked"],
  ])("preserva o estado específico %s enquanto o projeto está %s", (queueStatus, projectStatus) => {
    expect(resolveConversionQueueStatus(queueStatus, projectStatus)).toBe(queueStatus);
  });

  it("usa pendente como fallback para registros antigos sem status de fila", () => {
    expect(resolveConversionQueueStatus(null, "in-progress")).toBe("pending");
  });
});
