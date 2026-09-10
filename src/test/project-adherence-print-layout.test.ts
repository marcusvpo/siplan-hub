import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { getPrintEvidenceGridClass } from "@/lib/adherence-print-layout";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/ProjectAdherenceForm.tsx"),
  "utf8",
);

describe("relatório impresso da análise de aderência", () => {
  it("distribui as evidências conforme a quantidade de imagens", () => {
    expect(getPrintEvidenceGridClass(1)).toContain("grid-cols-1");
    expect(getPrintEvidenceGridClass(2)).toBe("grid-cols-2");
    expect(getPrintEvidenceGridClass(3)).toContain("print:grid-cols-3");
    expect(getPrintEvidenceGridClass(4)).toContain("print:grid-cols-4");
    expect(getPrintEvidenceGridClass(5)).toContain("print:grid-cols-3");
  });

  it("usa uma folha A4 responsiva com resumo executivo", () => {
    expect(source).toContain('data-testid="adherence-print-report"');
    expect(source).toContain("max-w-[210mm]");
    expect(source).toContain("Itens do checklist");
    expect(source).toContain("Pontos de atenção");
    expect(source).toContain("Evidências");
  });

  it("controla as quebras por item e preserva as imagens sem corte", () => {
    expect(source).toContain(".print-question");
    expect(source).toContain("page-break-inside: avoid !important");
    expect(source).toContain(".print-section");
    expect(source).toContain("page-break-inside: auto !important");
    expect(source).toContain('className="h-full w-full object-contain"');
  });
});
