export type XlsxCellValue = string | number | boolean | null | undefined;

export type XlsxChartType = "bar" | "column" | "line" | "pie";

export interface XlsxChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface XlsxChart {
  type: XlsxChartType;
  title: string;
  categories: string[];
  series: XlsxChartSeries[];
  from: { column: number; row: number };
  to: { column: number; row: number };
  showLegend?: boolean;
}

export interface XlsxSheet {
  name: string;
  rows: XlsxCellValue[][];
  /** Linhas congeladas no topo. O padrão continua sendo uma linha. */
  frozenRows?: number;
  /** Linhas com o estilo visual de cabeçalho, usando índices iniciados em zero. */
  headerRows?: number[];
  /** Desative em planilhas compostas por vários blocos de dados. */
  autoFilter?: boolean;
  /** Gráficos editáveis nativos do Excel, posicionados por célula. */
  charts?: XlsxChart[];
}

export async function buildXlsxWorkbook(sheets: XlsxSheet[]): Promise<Uint8Array> {
  if (!sheets.length) throw new Error("O arquivo precisa ter ao menos uma planilha.");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const normalized = sheets.map((sheet, index) => ({
    ...sheet,
    name: uniqueSheetName(sheet.name, index, sheets),
  }));
  let drawingCount = 0;
  let chartCount = 0;
  const packageSheets = normalized.map((sheet, sheetIndex) => {
    const charts = sheet.charts ?? [];
    if (!charts.length) return { sheet, sheetIndex, drawingIndex: null, chartIndexes: [] };
    drawingCount += 1;
    const chartIndexes = charts.map(() => {
      chartCount += 1;
      return chartCount;
    });
    return { sheet, sheetIndex, drawingIndex: drawingCount, chartIndexes };
  });

  zip.file("[Content_Types].xml", contentTypes(normalized.length, drawingCount, chartCount));
  zip.folder("_rels")?.file(".rels", rootRelationships());
  zip.folder("docProps")?.file("app.xml", appProperties(normalized.map((sheet) => sheet.name)));
  zip.folder("docProps")?.file("core.xml", coreProperties());
  const workbook = zip.folder("xl");
  workbook?.file("workbook.xml", workbookXml(normalized.map((sheet) => sheet.name)));
  workbook?.folder("_rels")?.file("workbook.xml.rels", workbookRelationships(normalized.length));
  workbook?.file("styles.xml", stylesXml());
  const worksheets = workbook?.folder("worksheets");
  const worksheetRelationships = worksheets?.folder("_rels");
  const drawings = workbook?.folder("drawings");
  const drawingRelationships = drawings?.folder("_rels");
  const charts = workbook?.folder("charts");

  packageSheets.forEach(({ sheet, sheetIndex, drawingIndex, chartIndexes }) => {
    worksheets?.file(
      `sheet${sheetIndex + 1}.xml`,
      worksheetXml(sheet, drawingIndex !== null),
    );
    if (drawingIndex === null) return;

    worksheetRelationships?.file(
      `sheet${sheetIndex + 1}.xml.rels`,
      worksheetDrawingRelationships(drawingIndex),
    );
    drawings?.file(
      `drawing${drawingIndex}.xml`,
      drawingXml(sheet.charts ?? []),
    );
    drawingRelationships?.file(
      `drawing${drawingIndex}.xml.rels`,
      drawingChartRelationships(chartIndexes),
    );
    (sheet.charts ?? []).forEach((chart, index) => {
      charts?.file(`chart${chartIndexes[index]}.xml`, chartXml(chart, chartIndexes[index]));
    });
  });

  return zip.generateAsync({
    type: "uint8array",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
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

function worksheetXml(sheet: XlsxSheet, hasDrawing: boolean) {
  const { rows } = sheet;
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnWidths = Array.from({ length: maxColumns }, (_, column) => {
    const longest = rows.reduce((max, row) => {
      const value = String(row[column] ?? "");
      const longestLine = value.split(/\r?\n/).reduce((lineMax, line) => Math.max(lineMax, line.length), 0);
      return Math.max(max, longestLine);
    }, 0);
    return Math.min(Math.max(longest + 2, 10), 45);
  });
  const headerRows = new Set(sheet.headerRows ?? [0]);
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => (
      cellXml(value, rowIndex, columnIndex, headerRows.has(rowIndex))
    )).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const dimensions = maxColumns ? `A1:${columnName(maxColumns - 1)}${Math.max(rows.length, 1)}` : "A1";
  const frozenRows = Math.max(0, sheet.frozenRows ?? 1);
  const pane = frozenRows > 0
    ? `<pane ySplit="${frozenRows}" topLeftCell="A${frozenRows + 1}" activePane="bottomLeft" state="frozen"/>`
    : "";
  const autoFilter = sheet.autoFilter === false || rows.length === 0 || maxColumns === 0
    ? ""
    : `<autoFilter ref="${dimensions}"/>`;
  return xml(`
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <dimension ref="${dimensions}"/>
      <sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>
      <cols>${columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>
      <sheetData>${rowXml}</sheetData>
      ${autoFilter}
      ${hasDrawing ? '<drawing r:id="rId1"/>' : ""}
    </worksheet>
  `);
}

function cellXml(
  value: XlsxCellValue,
  rowIndex: number,
  columnIndex: number,
  isHeader: boolean,
) {
  const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
  const textValue = sanitizeCellText(String(value ?? ""));
  const styleIndex = isHeader ? 1 : /\r?\n/.test(textValue) || textValue.length > 80 ? 2 : 0;
  const style = styleIndex ? ` s="${styleIndex}"` : "";
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${reference}"${style}><v>${value}</v></c>`;
  if (typeof value === "boolean") return `<c r="${reference}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(textValue)}</t></is></c>`;
}

function contentTypes(sheetCount: number, drawingCount: number, chartCount: number) {
  return xml(`
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      ${Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
      ${Array.from({ length: drawingCount }, (_, index) => `<Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("")}
      ${Array.from({ length: chartCount }, (_, index) => `<Override PartName="/xl/charts/chart${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join("")}
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
      <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>
  `);
}

function worksheetDrawingRelationships(drawingIndex: number) {
  return xml(`
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingIndex}.xml"/>
    </Relationships>
  `);
}

function drawingChartRelationships(chartIndexes: number[]) {
  return xml(`
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${chartIndexes.map((chartIndex, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartIndex}.xml"/>`).join("")}
    </Relationships>
  `);
}

function drawingXml(charts: XlsxChart[]) {
  return xml(`
    <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      ${charts.map((chart, index) => `
        <xdr:twoCellAnchor editAs="oneCell">
          ${drawingMarker("from", chart.from)}
          ${drawingMarker("to", chart.to)}
          <xdr:graphicFrame macro="">
            <xdr:nvGraphicFramePr><xdr:cNvPr id="${index + 2}" name="Gráfico ${index + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
            <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
            <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId${index + 1}"/></a:graphicData></a:graphic>
          </xdr:graphicFrame>
          <xdr:clientData/>
        </xdr:twoCellAnchor>
      `).join("")}
    </xdr:wsDr>
  `);
}

function drawingMarker(kind: "from" | "to", position: XlsxChart["from"]) {
  return `<xdr:${kind}><xdr:col>${Math.max(0, position.column)}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${Math.max(0, position.row)}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:${kind}>`;
}

function chartXml(chart: XlsxChart, chartIndex: number) {
  const categories = chart.categories.map(sanitizeCellText);
  const maxPoints = Math.max(
    categories.length,
    ...chart.series.map((series) => series.values.length),
    0,
  );
  const normalizedCategories = Array.from(
    { length: maxPoints },
    (_, index) => categories[index] ?? "",
  );
  const series = chart.series.map((item, index) => chartSeriesXml(
    item,
    normalizedCategories,
    index,
    chart.type,
  )).join("");
  const axisBase = 100_000 + chartIndex * 10;
  const plot = chart.type === "pie"
    ? `<c:pieChart><c:varyColors val="1"/>${series}<c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showPercent val="1"/><c:showLeaderLines val="1"/></c:dLbls><c:firstSliceAng val="0"/></c:pieChart>`
    : chart.type === "line"
      ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:marker val="1"/><c:smooth val="0"/><c:axId val="${axisBase}"/><c:axId val="${axisBase + 1}"/></c:lineChart>${chartAxesXml(axisBase, axisBase + 1, false)}`
      : `<c:barChart><c:barDir val="${chart.type === "bar" ? "bar" : "col"}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls><c:gapWidth val="70"/><c:overlap val="0"/><c:axId val="${axisBase}"/><c:axId val="${axisBase + 1}"/></c:barChart>${chartAxesXml(axisBase, axisBase + 1, chart.type === "bar")}`;

  return xml(`
    <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <c:date1904 val="0"/><c:lang val="pt-BR"/><c:roundedCorners val="0"/>
      <c:chart>
        ${chartTitleXml(chart.title)}
        <c:autoTitleDeleted val="0"/>
        <c:plotArea><c:layout/>${plot}</c:plotArea>
        ${chart.showLegend === false ? "" : '<c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend>'}
        <c:plotVisOnly val="1"/><c:dispBlanksAs val="zero"/><c:showDLblsOverMax val="0"/>
      </c:chart>
      <c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
    </c:chartSpace>
  `);
}

function chartSeriesXml(
  series: XlsxChartSeries,
  categories: string[],
  index: number,
  chartType: XlsxChartType,
) {
  const values = Array.from(
    { length: categories.length },
    (_, valueIndex) => Number.isFinite(series.values[valueIndex]) ? series.values[valueIndex] : 0,
  );
  const color = normalizeChartColor(series.color);
  const shape = color
    ? `<c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>`
    : "";
  const marker = chartType === "line"
    ? `<c:marker><c:symbol val="circle"/><c:size val="5"/>${shape}</c:marker>`
    : "";
  return `
    <c:ser>
      <c:idx val="${index}"/><c:order val="${index}"/>
      <c:tx><c:v>${escapeXml(sanitizeCellText(series.name))}</c:v></c:tx>
      ${shape}${marker}
      <c:cat><c:strLit><c:ptCount val="${categories.length}"/>${categories.map((category, categoryIndex) => `<c:pt idx="${categoryIndex}"><c:v>${escapeXml(category)}</c:v></c:pt>`).join("")}</c:strLit></c:cat>
      <c:val><c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${values.map((value, valueIndex) => `<c:pt idx="${valueIndex}"><c:v>${value}</c:v></c:pt>`).join("")}</c:numLit></c:val>
      ${chartType === "line" ? '<c:smooth val="0"/>' : ""}
    </c:ser>
  `;
}

function chartTitleXml(title: string) {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1200" b="1"/><a:t>${escapeXml(sanitizeCellText(title))}</a:t></a:r><a:endParaRPr lang="pt-BR"/></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title>`;
}

function chartAxesXml(categoryAxisId: number, valueAxisId: number, horizontal: boolean) {
  const categoryPosition = horizontal ? "l" : "b";
  const valuePosition = horizontal ? "b" : "l";
  return `
    <c:catAx><c:axId val="${categoryAxisId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${categoryPosition}"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${valueAxisId}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>
    <c:valAx><c:axId val="${valueAxisId}"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="${valuePosition}"/><c:majorGridlines/><c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${categoryAxisId}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>
  `;
}

function normalizeChartColor(value?: string) {
  const normalized = value?.replace(/^#/, "").toUpperCase();
  return normalized && /^[0-9A-F]{6}$/.test(normalized) ? normalized : null;
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

function sanitizeCellText(value: string) {
  const maxLength = 32_767;
  const truncatedMarker = "\n[Conteúdo truncado no limite da célula do Excel]";
  let sanitized = "";
  let truncated = false;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const validXmlCharacter = codePoint === 9 || codePoint === 10 || codePoint === 13 || (
      codePoint >= 0x20 && codePoint <= 0xD7FF
    ) || (
      codePoint >= 0xE000 && codePoint <= 0xFFFD
    ) || (
      codePoint >= 0x10000 && codePoint <= 0x10FFFF
    );
    if (validXmlCharacter) {
      if (sanitized.length + character.length > maxLength) {
        truncated = true;
        break;
      }
      sanitized += character;
    }
  }
  if (!truncated) return sanitized;

  let prefix = sanitized.slice(0, maxLength - truncatedMarker.length);
  const lastCode = prefix.charCodeAt(prefix.length - 1);
  if (lastCode >= 0xD800 && lastCode <= 0xDBFF) prefix = prefix.slice(0, -1);
  return `${prefix}${truncatedMarker}`;
}

function xml(body: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body.replace(/>\s+</g, "><").trim()}`;
}
