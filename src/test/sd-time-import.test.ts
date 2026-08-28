import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  resolve(process.cwd(), "src/pages/sd/TimeManagement.tsx"),
  "utf8",
);
const worker = readFileSync(
  resolve(process.cwd(), "vm-worker/src/sdTimeImport.ts"),
  "utf8",
);
const sqlView = readFileSync(
  resolve(process.cwd(), "vm-worker/sql/horas_analistas_0800.sql"),
  "utf8",
);

describe("importação de horas do 0800", () => {
  it("oferece a ação e identifica visualmente os itens importados", () => {
    expect(page).toContain("Importar do 0800");
    expect(page).toContain("Importado do 0800");
    expect(page).toContain('entry.source === "ellevo_0800"');
  });

  it("usa a view exclusiva e parâmetros para usuário e data", () => {
    expect(worker).toContain("FROM dbo.horas_analistas_0800");
    expect(worker).toContain('.input("login"');
    expect(worker).toContain('.input("workDate"');
    expect(sqlView).toContain("CREATE OR ALTER VIEW dbo.horas_analistas_0800");
    expect(sqlView).not.toContain("vw_2026_PROCESSO_VENDA_FATURAMENTO_ITEM_ATIVIDADES");
  });
});
