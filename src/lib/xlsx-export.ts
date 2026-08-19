export type XlsxCellValue = string | number | boolean | null | undefined;

export interface XlsxSheet {
  name: string;
  rows: XlsxCellValue[][];
}

export async function buildXlsxWorkbook(sheets: XlsxSheet[]): Promise<Uint8Array> {
  if (!sheets.length) throw new Error("O arquivo precisa ter ao menos uma planilha.");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const normalized = sheets.map((sheet, index) => ({
    name: uniqueSheetName(sheet.name, index, sheets),
    rows: sheet.rows,
  }));

  zip.file("[Content_Types].xml", contentTypes(normalized.length));
  zip.folder("_rels")?.file(".rels", rootRelationships());
  zip.folder("docProps")?.file("app.xml", appProperties(normalized.map((sheet) => sheet.name)));
  zip.folder("docProps")?.file("core.xml", coreProperties());
  const workbook = zip.folder("xl");
  workbook?.file("workbook.xml", workbookXml(normalized.map((sheet) => sheet.name)));
  workbook?.folder("_rels")?.file("workbook.xml.rels", workbookRelationships(normalized.length));
  workbook?.file("styles.xml", stylesXml());
  const worksheets = workbook?.folder("worksheets");
  normalized.forEach((sheet, index) => worksheets?.file(`sheet${index + 1}.xml`, worksheetXml(sheet.rows)));

  return zip.generateAsync({ type: "uint8array", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function downloadXlsxWorkbook(filename: string, sheets: XlsxSheet[]) {
  const bytes = await buildXlsxWorkbook(sheets);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function worksheetXml(rows: XlsxCellValue[][]) {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnWidths = Array.from({ length: maxColumns }, (_, column) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[column] ?? "").length), 0);
    return Math.min(Math.max(longest + 2, 10), 45);
  });
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cellXml(value, rowIndex, columnIndex)).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const dimensions = maxColumns ? `A1:${columnName(maxColumns - 1)}${Math.max(rows.length, 1)}` : "A1";
  return xml(`
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <dimension ref="${dimensions}"/>
      <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
      <cols>${columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>
      <sheetData>${rowXml}</sheetData>
      <autoFilter ref="${dimensions}"/>
    </worksheet>
  `);
}

function cellXml(value: XlsxCellValue, rowIndex: number, columnIndex: number) {
  const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
  const style = rowIndex === 0 ? " s=\"1\"" : "";
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${reference}"${style}><v>${value}</v></c>`;
  if (typeof value === "boolean") return `<c r="${reference}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(String(value ?? ""))}</t></is></c>`;
}

function contentTypes(sheetCount: number) {
  return xml(`
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      ${Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
      <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
      <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    </Types>
  `);
}

function rootRelationships() {
  return xml(`
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
      <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
    </Relationships>
  `);
}

function workbookXml(sheetNames: string[]) {
  return xml(`
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>${sheetNames.map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets>
    </workbook>
  `);
}

function workbookRelationships(sheetCount: number) {
  return xml(`
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${Array.from({ length: sheetCount }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
      <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    </Relationships>
  `);
}

function stylesXml() {
  return xml(`
    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>
      <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD20037"/><bgColor indexed="64"/></patternFill></fill></fills>
      <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>
  `);
}

function appProperties(sheetNames: string[]) {
  return xml(`
    <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
      <Application>Siplan HUB</Application><TitlesOfParts><vt:vector size="${sheetNames.length}" baseType="lpstr">${sheetNames.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts>
    </Properties>
  `);
}

function coreProperties() {
  const now = new Date().toISOString();
  return xml(`
    <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <dc:creator>Siplan HUB</dc:creator><cp:lastModifiedBy>Siplan HUB</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
    </cp:coreProperties>
  `);
}

function uniqueSheetName(name: string, index: number, sheets: XlsxSheet[]) {
  const base = (name.replace(/[\\/*?:[\]]/g, " ").trim() || `Planilha ${index + 1}`).slice(0, 31);
  const preceding = sheets.slice(0, index).map((sheet) => sheet.name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31));
  if (!preceding.includes(base)) return base;
  const suffix = ` ${index + 1}`;
  return `${base.slice(0, 31 - suffix.length)}${suffix}`;
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function xml(body: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body.replace(/>\s+</g, "><").trim()}`;
}
