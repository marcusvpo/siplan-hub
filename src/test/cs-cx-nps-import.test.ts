import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseNpsCsv } from "@/lib/cs-cx-nps-import";
import { parseNpsXlsx } from "@/lib/cs-cx-nps-xlsx";

describe("importação CSV de NPS", () => {
  it("mapeia cabeçalhos flexíveis e separa respondente do cartório", () => {
    const result = parseNpsCsv([
      "Hora de início;Por favor, informe seu nome e cartório;Qual é a probabilidade;Motivo;Sugestão",
      "12/08/2026 10:30;Maria - Cartório Central;10;Ótimo atendimento;Manter o retorno",
    ].join("\n"), "Cartório padrão");

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      respondent_name: "Maria",
      respondent_office: "Cartório Central",
      score: 10,
      score_reason: "Ótimo atendimento",
      improvement_suggestion: "Manter o retorno",
    });
  });

  it("preserva vírgulas dentro de campos entre aspas", () => {
    const result = parseNpsCsv([
      "Data,Nome,Nota,Motivo,Melhoria",
      '2026-08-12T12:00:00Z,João,8,"Bom, mas pode melhorar","Mais rapidez, por favor"',
    ].join("\n"), "Cartório Central");

    expect(result.rows[0].score_reason).toBe("Bom, mas pode melhorar");
    expect(result.rows[0].improvement_suggestion).toBe("Mais rapidez, por favor");
  });

  it("isola linhas inválidas sem descartar as respostas válidas", () => {
    const result = parseNpsCsv([
      "Data,Nome,Pontuação",
      "data-invalida,Maria,10",
      "31/02/2026,Carlos,8",
      "2026-08-12,Ana,",
      "2026-08-12,João,9",
    ].join("\n"), "Cartório Central");

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([
      "Linha 2: data inválida",
      "Linha 3: data inválida",
      "Linha 4: nota fora do intervalo 0–10",
    ]);
  });

  it("lê a primeira aba de um XLSX e converte datas do Excel", async () => {
    const zip = new JSZip();
    zip.file("xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Respostas" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`);
    zip.file("xl/sharedStrings.xml", `<?xml version="1.0"?><sst><si><t>Hora de início</t></si><si><t>Nome</t></si><si><t>Nota</t></si><si><t>Maria - Cartório Central</t></si></sst>`);
    zip.file("xl/styles.xml", `<?xml version="1.0"?><styleSheet><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>`);
    zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" s="1"><v>46246.5</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>10</v></c></row></sheetData></worksheet>`);

    const result = await parseNpsXlsx(await zip.generateAsync({ type: "arraybuffer" }), "Cartório padrão");

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      respondent_name: "Maria",
      respondent_office: "Cartório Central",
      score: 10,
    });
    expect(result.rows[0].responded_at).toContain("2026-08-12");
  });
});
