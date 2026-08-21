import { format } from "date-fns";
import type { VersionDiffSummary } from "@/types/knowledge";

/**
 * Calcula estatísticas e resumo de diff entre dois textos (Markdown).
 */
export function computeTextDiff(oldText: string, newText: string): VersionDiffSummary {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let addedLinesCount = 0;
  let removedLinesCount = 0;

  for (const line of newLines) {
    if (!oldSet.has(line) && line.trim() !== "") {
      addedLinesCount++;
    }
  }

  for (const line of oldLines) {
    if (!newSet.has(line) && line.trim() !== "") {
      removedLinesCount++;
    }
  }

  const charDiffCount = newText.length - oldText.length;

  // Gerar resumo textual curto
  let changeSummary = "Modificações textuais no passo a passo";
  if (addedLinesCount > 0 && removedLinesCount === 0) {
    changeSummary = `Adicionadas ${addedLinesCount} novas linhas de instrução`;
  } else if (removedLinesCount > 0 && addedLinesCount === 0) {
    changeSummary = `Removidas ${removedLinesCount} linhas do procedimento`;
  } else if (addedLinesCount > 0 && removedLinesCount > 0) {
    changeSummary = `Atualizadas ${addedLinesCount} linhas (${removedLinesCount} anteriores removidas)`;
  } else if (charDiffCount !== 0) {
    changeSummary = `Ajustes finos de formatação e pontuação (${charDiffCount > 0 ? `+${charDiffCount}` : charDiffCount} caracteres)`;
  }

  // Snippets antes e depois
  const oldSnippet = oldText.length > 500 ? oldText.slice(0, 500) + "..." : oldText;
  const newSnippet = newText.length > 500 ? newText.slice(0, 500) + "..." : newText;

  return {
    addedLinesCount,
    removedLinesCount,
    charDiffCount,
    oldSnippet,
    newSnippet,
    changeSummary,
  };
}

/**
 * Formata o caminho isolado do arquivo de backup no Storage.
 * Exemplo: `backup/OrionTN pos_v1_20260821_130522.md`
 */
export function formatBackupFilePath(
  versionNumber: number,
  baseFileName: string = "OrionTN pos",
  date: Date = new Date(),
): string {
  const dateStr = format(date, "yyyyMMdd_HHmmss");
  const sanitizedName = baseFileName.replace(/\.md$/i, "");
  return `backup/${sanitizedName}_v${versionNumber}_${dateStr}.md`;
}
