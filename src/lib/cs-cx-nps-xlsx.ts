import JSZip from "jszip";
import { parseNpsRows, type NpsCsvResult } from "@/lib/cs-cx-nps-import";

const BUILT_IN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

export async function parseNpsXlsx(buffer: ArrayBuffer, fallbackOffice: string): Promise<NpsCsvResult> {
  const zip = await JSZip.loadAsync(buffer);
  const workbook = await readXml(zip, "xl/workbook.xml");
  const relationships = await readXml(zip, "xl/_rels/workbook.xml.rels");
  const firstSheet = workbook.getElementsByTagName("sheet")[0];
  if (!firstSheet) throw new Error("A planilha não possui abas.");

  const relationshipId = firstSheet.getAttribute("r:id")
    ?? firstSheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  const relationship = Array.from(relationships.getElementsByTagName("Relationship"))
    .find((item) => item.getAttribute("Id") === relationshipId);
  const target = relationship?.getAttribute("Target");
  if (!target) throw new Error("Não foi possível localizar a primeira aba da planilha.");

  const sharedStrings = zip.file("xl/sharedStrings.xml")
    ? parseSharedStrings(await readXml(zip, "xl/sharedStrings.xml"))
    : [];
  const dateStyles = zip.file("xl/styles.xml")
    ? parseDateStyles(await readXml(zip, "xl/styles.xml"))
    : new Set<number>();
  const worksheetPath = normalizeWorksheetPath(target);
  const worksheet = await readXml(zip, worksheetPath);
  const rows = parseWorksheet(worksheet, sharedStrings, dateStyles);
  return parseNpsRows(rows, fallbackOffice);
}

async function readXml(zip: JSZip, path: string) {
  const entry = zip.file(path);
  if (!entry) throw new Error(`Arquivo interno ausente no XLSX: ${path}`);
  const document = new DOMParser().parseFromString(await entry.async("string"), "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("O arquivo XLSX contém XML inválido.");
  return document;
}

function normalizeWorksheetPath(target: string) {
  const normalized = target.replace(/^\//, "").replace(/^\.\.\//, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

function parseSharedStrings(document: Document) {
  return Array.from(document.getElementsByTagName("si"))
    .map((item) => Array.from(item.getElementsByTagName("t")).map((text) => text.textContent ?? "").join(""));
}

function parseDateStyles(document: Document) {
  const customFormats = new Map<number, string>();
  Array.from(document.getElementsByTagName("numFmt")).forEach((item) => {
    const id = Number(item.getAttribute("numFmtId"));
    const code = item.getAttribute("formatCode") ?? "";
    if (Number.isFinite(id)) customFormats.set(id, code);
  });

  const dateStyles = new Set<number>();
  const cellFormats = document.getElementsByTagName("cellXfs")[0];
  Array.from(cellFormats?.getElementsByTagName("xf") ?? []).forEach((item, index) => {
    const formatId = Number(item.getAttribute("numFmtId") ?? 0);
    const custom = customFormats.get(formatId)?.replace(/"[^"]*"|\\./g, "").toLocaleLowerCase("pt-BR");
    if (BUILT_IN_DATE_FORMATS.has(formatId) || Boolean(custom?.match(/[dmyhs]/))) dateStyles.add(index);
  });
  return dateStyles;
}

function parseWorksheet(document: Document, sharedStrings: string[], dateStyles: Set<number>) {
  return Array.from(document.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];
    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const reference = cell.getAttribute("r") ?? "A1";
      const column = columnIndex(reference.replace(/\d+/g, ""));
      const type = cell.getAttribute("t");
      const rawValue = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      let value = rawValue;
      if (type === "s") value = sharedStrings[Number(rawValue)] ?? "";
      else if (type === "inlineStr") value = Array.from(cell.getElementsByTagName("t")).map((item) => item.textContent ?? "").join("");
      else if (dateStyles.has(Number(cell.getAttribute("s"))) && rawValue) value = excelDateToIso(Number(rawValue));
      values[column] = value;
    });
    return Array.from({ length: values.length }, (_, index) => values[index] ?? "");
  }).filter((row) => row.some((value) => value.trim()));
}

function columnIndex(reference: string) {
  return reference.toUpperCase().split("").reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function excelDateToIso(serial: number) {
  if (!Number.isFinite(serial)) return "";
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86_400_000)).toISOString();
}
