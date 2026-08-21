import { describe, expect, it, vi } from "vitest";
import { calculateCsCxReportRowLayout } from "@/lib/cs-cx-experience-pdf";

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
});
