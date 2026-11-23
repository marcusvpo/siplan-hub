import { richTextToPlainText } from "@/lib/lexical";
import { normalizeText } from "@/lib/utils";

export type NoteSectionKey =
  | "general"
  | "infra"
  | "adherence"
  | "conversion"
  | "environment"
  | "modelosEditor"
  | "implementation"
  | "post";

export interface ProjectNotesSearchRow {
  id: string;
  client_name: string;
  ticket_number?: string | null;
  system_type?: string | null;
  global_status?: string | null;
  post_status?: string | null;
  project_leader?: string | null;
  updated_at?: string | null;
  notes?: unknown;
  description?: string | null;
  special_considerations?: string | null;
  commercial_notes?: string | null;
  infra_observations?: string | null;
  infra_technical_notes?: string | null;
  infra_blocking_reason?: string | null;
  infra_servers?: unknown;
  adherence_observations?: string | null;
  adherence_gap_description?: string | null;
  adherence_conformity_standards?: string | null;
  conversion_observations?: string | null;
  conversion_deviations?: string | null;
  environment_observations?: string | null;
  environment_preparation_checklist?: string | null;
  modelos_editor_observations?: string | null;
  implementation_observations?: string | null;
  implementation_phase1?: unknown;
  implementation_phase2?: unknown;
  implementation_client_feedback?: string | null;
  post_observations?: string | null;
  post_benefits_delivered?: string | null;
  post_challenges_found?: string | null;
  post_recommendations?: string | null;
  adherence_final_notes?: string | null;
}

export interface ProjectFreeTextField {
  fieldKey: string;
  sectionKey: NoteSectionKey;
  sectionLabel: string;
  fieldLabel: string;
  targetTab: "general" | "steps";
  targetStepId?: string;
  plainText: string;
  normalizedText: string;
}

export interface IndexedProjectNotes {
  projectId: string;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  globalStatus: string;
  postStatus: string;
  projectLeader: string;
  updatedAt: string;
  fields: ProjectFreeTextField[];
}

export interface SnippetSegment {
  text: string;
  highlight: boolean;
}

export interface TextFieldMatch {
  fieldKey: string;
  sectionKey: NoteSectionKey;
  sectionLabel: string;
  fieldLabel: string;
  targetTab: "general" | "steps";
  targetStepId?: string;
  snippetSegments: SnippetSegment[];
  hasLeadingEllipsis: boolean;
  hasTrailingEllipsis: boolean;
  matchCount: number;
  isExactPhraseMatch: boolean;
}

export interface ProjectNotesSearchResult {
  projectId: string;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  globalStatus: string;
  postStatus: string;
  projectLeader: string;
  updatedAt: string;
  totalMatches: number;
  matches: TextFieldMatch[];
}

export type ProjectStatusFilter = "all" | "active" | "post" | "paused" | "done";

export const NOTE_SECTION_OPTIONS: Array<{
  value: NoteSectionKey | "all";
  label: string;
}> = [
  { value: "all", label: "Todas as seções" },
  { value: "general", label: "Observações Gerais" },
  { value: "infra", label: "1. Infraestrutura" },
  { value: "adherence", label: "2. Aderência" },
  { value: "conversion", label: "3. Conversão" },
  { value: "environment", label: "4. Ambiente" },
  { value: "modelosEditor", label: "Modelos Editor" },
  { value: "implementation", label: "5. Implantação" },
  { value: "post", label: "6. Pós-Implantação" },
];

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractRichText(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    return cleanExtractedText(richTextToPlainText(raw));
  }
  if (typeof raw === "object") {
    return cleanExtractedText(richTextToPlainText(raw));
  }
  return "";
}

function extractGeneralNotesText(notes: unknown): string {
  if (!notes) return "";
  let parsed: unknown = notes;
  if (typeof notes === "string") {
    try {
      parsed = JSON.parse(notes);
    } catch {
      return extractRichText(notes);
    }
  }

  if (parsed && typeof parsed === "object") {
    const obj = parsed as { blocks?: Array<{ content?: unknown }>; root?: unknown };
    if (Array.isArray(obj.blocks)) {
      const parts = obj.blocks
        .map((block) => extractRichText(block?.content))
        .filter(Boolean);
      return cleanExtractedText(parts.join("\n\n"));
    }
    if (obj.root) {
      return extractRichText(obj);
    }
  }

  return "";
}

function extractPostObservationsParts(
  raw: string | null | undefined,
): Array<{ keySuffix: string; label: string; text: string }> {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as {
      v?: number;
      blocks?: Array<{ id?: string; content?: unknown }>;
      summary?: unknown;
    };
    if (parsed && parsed.v === 2 && Array.isArray(parsed.blocks)) {
      const results: Array<{ keySuffix: string; label: string; text: string }> = [];
      const summaryText = extractRichText(parsed.summary);
      if (summaryText) {
        results.push({
          keySuffix: "summary",
          label: "Resumo Geral do Pós",
          text: summaryText,
        });
      }

      const validBlocks = parsed.blocks
        .map((block, index) => ({
          index,
          text: extractRichText(block?.content),
        }))
        .filter((b) => b.text.length > 0);

      validBlocks.forEach((block, idx) => {
        results.push({
          keySuffix: `block_${block.index}`,
          label:
            validBlocks.length > 1
              ? `Observações (Bloco ${idx + 1})`
              : "Observações do Pós",
          text: block.text,
        });
      });

      return results;
    }
  } catch {
    // fallback para Lexical simples ou texto puro
  }

  const plain = extractRichText(raw);
  return plain
    ? [{ keySuffix: "legacy", label: "Observações do Pós", text: plain }]
    : [];
}

function extractPhaseObservations(phase: unknown): string {
  if (!phase || typeof phase !== "object") return "";
  const obs = (phase as { observations?: unknown }).observations;
  return extractRichText(obs);
}

function extractInfraServersObservations(
  servers: unknown,
): Array<{ index: number; serverName: string; text: string }> {
  if (!Array.isArray(servers)) return [];
  const results: Array<{ index: number; serverName: string; text: string }> = [];
  servers.forEach((srv, index) => {
    if (!srv || typeof srv !== "object") return;
    const record = srv as { hostname?: unknown; name?: unknown; observations?: unknown };
    const text = extractRichText(record.observations);
    if (!text) return;
    const name =
      (typeof record.hostname === "string" && record.hostname.trim()) ||
      (typeof record.name === "string" && record.name.trim()) ||
      `Servidor ${index + 1}`;
    results.push({ index, serverName: name, text });
  });
  return results;
}

/**
 * Extrai exclusivamente os campos de anotação e texto livre de um projeto,
 * ignorando campos estáticos (status, responsáveis, datas, contatos, etc.).
 */
export function indexProjectFreeTextFields(
  row: ProjectNotesSearchRow,
): IndexedProjectNotes {
  const fields: ProjectFreeTextField[] = [];

  const pushField = (
    fieldKey: string,
    sectionKey: NoteSectionKey,
    sectionLabel: string,
    fieldLabel: string,
    targetTab: "general" | "steps",
    plainText: string,
    targetStepId?: string,
  ) => {
    const cleaned = cleanExtractedText(plainText);
    if (!cleaned) return;
    fields.push({
      fieldKey,
      sectionKey,
      sectionLabel,
      fieldLabel,
      targetTab,
      targetStepId,
      plainText: cleaned,
      normalizedText: normalizeText(cleaned),
    });
  };

  // Observações Gerais (Aba Geral)
  const generalNotes = extractGeneralNotesText(row.notes);
  pushField(
    "general_notes",
    "general",
    "Observações Gerais",
    "Observações Gerais",
    "general",
    generalNotes,
  );

  // Evita duplicar description se for idêntica ao conteúdo de notes
  const descriptionText = extractRichText(row.description);
  if (descriptionText && descriptionText !== generalNotes) {
    pushField(
      "general_description",
      "general",
      "Observações Gerais",
      "Descrição do Projeto",
      "general",
      descriptionText,
    );
  }

  pushField(
    "general_special_considerations",
    "general",
    "Observações Gerais",
    "Considerações Especiais",
    "general",
    extractRichText(row.special_considerations),
  );

  pushField(
    "general_commercial_notes",
    "general",
    "Observações Gerais",
    "Notas Comerciais",
    "general",
    extractRichText(row.commercial_notes),
  );

  // 1. Infraestrutura
  pushField(
    "infra_observations",
    "infra",
    "1. Análise de Infraestrutura",
    "Observações",
    "steps",
    extractRichText(row.infra_observations),
    "infra",
  );
  pushField(
    "infra_technical_notes",
    "infra",
    "1. Análise de Infraestrutura",
    "Notas Técnicas",
    "steps",
    extractRichText(row.infra_technical_notes),
    "infra",
  );
  pushField(
    "infra_blocking_reason",
    "infra",
    "1. Análise de Infraestrutura",
    "Motivo de Bloqueio",
    "steps",
    extractRichText(row.infra_blocking_reason),
    "infra",
  );
  extractInfraServersObservations(row.infra_servers).forEach((srv) => {
    pushField(
      `infra_server_${srv.index}_observations`,
      "infra",
      "1. Análise de Infraestrutura",
      `Observações (${srv.serverName})`,
      "steps",
      srv.text,
      "infra",
    );
  });

  // 2. Aderência
  pushField(
    "adherence_observations",
    "adherence",
    "2. Análise de Aderência",
    "Observações",
    "steps",
    extractRichText(row.adherence_observations),
    "adherence",
  );
  pushField(
    "adherence_gap_description",
    "adherence",
    "2. Análise de Aderência",
    "Descrição do Gap de Produto",
    "steps",
    extractRichText(row.adherence_gap_description),
    "adherence",
  );
  pushField(
    "adherence_conformity_standards",
    "adherence",
    "2. Análise de Aderência",
    "Padrões de Conformidade",
    "steps",
    extractRichText(row.adherence_conformity_standards),
    "adherence",
  );
  pushField(
    "adherence_final_notes",
    "adherence",
    "2. Análise de Aderência",
    "Parecer / Notas Finais de Aderência",
    "steps",
    extractRichText(row.adherence_final_notes),
    "adherence",
  );

  // 3. Conversão
  pushField(
    "conversion_observations",
    "conversion",
    "3. Conversão de Dados",
    "Observações",
    "steps",
    extractRichText(row.conversion_observations),
    "conversion",
  );
  pushField(
    "conversion_deviations",
    "conversion",
    "3. Conversão de Dados",
    "Desvios de Conversão",
    "steps",
    extractRichText(row.conversion_deviations),
    "conversion",
  );

  // 4. Preparação de Ambiente
  pushField(
    "environment_observations",
    "environment",
    "4. Preparação de Ambiente",
    "Observações",
    "steps",
    extractRichText(row.environment_observations),
    "environment",
  );
  pushField(
    "environment_preparation_checklist",
    "environment",
    "4. Preparação de Ambiente",
    "Anotações de Preparação",
    "steps",
    extractRichText(row.environment_preparation_checklist),
    "environment",
  );

  // Modelos Editor
  pushField(
    "modelos_editor_observations",
    "modelosEditor",
    "Modelos Editor (Orion TN)",
    "Observações",
    "steps",
    extractRichText(row.modelos_editor_observations),
    "modelosEditor",
  );

  // 5. Implantação & Treinamento
  pushField(
    "implementation_observations",
    "implementation",
    "5. Implantação & Treinamento",
    "Observações Gerais",
    "steps",
    extractRichText(row.implementation_observations),
    "implementation",
  );
  pushField(
    "implementation_phase1_observations",
    "implementation",
    "5. Implantação & Treinamento",
    "Observações da Fase 1",
    "steps",
    extractPhaseObservations(row.implementation_phase1),
    "implementation",
  );
  pushField(
    "implementation_phase2_observations",
    "implementation",
    "5. Implantação & Treinamento",
    "Observações da Fase 2",
    "steps",
    extractPhaseObservations(row.implementation_phase2),
    "implementation",
  );
  pushField(
    "implementation_client_feedback",
    "implementation",
    "5. Implantação & Treinamento",
    "Feedback do Cliente",
    "steps",
    extractRichText(row.implementation_client_feedback),
    "implementation",
  );

  // 6. Pós-Implantação
  extractPostObservationsParts(row.post_observations).forEach((part) => {
    pushField(
      `post_observations_${part.keySuffix}`,
      "post",
      "6. Pós-Implantação",
      part.label,
      "steps",
      part.text,
      "post",
    );
  });
  pushField(
    "post_benefits_delivered",
    "post",
    "6. Pós-Implantação",
    "Benefícios Entregues",
    "steps",
    extractRichText(row.post_benefits_delivered),
    "post",
  );
  pushField(
    "post_challenges_found",
    "post",
    "6. Pós-Implantação",
    "Desafios Encontrados",
    "steps",
    extractRichText(row.post_challenges_found),
    "post",
  );
  pushField(
    "post_recommendations",
    "post",
    "6. Pós-Implantação",
    "Recomendações",
    "steps",
    extractRichText(row.post_recommendations),
    "post",
  );

  return {
    projectId: row.id,
    clientName: row.client_name || "Projeto sem nome",
    ticketNumber: row.ticket_number || "",
    systemType: row.system_type || "",
    globalStatus: row.global_status || "in-progress",
    postStatus: row.post_status || "todo",
    projectLeader: row.project_leader || "",
    updatedAt: row.updated_at || "",
    fields,
  };
}

/**
 * Mapeia índices do texto normalizado (sem acentos, minúsculas) de volta para
 * o texto original para preservar acentuação e capitalização no preview.
 */
function buildNormalizedWithIndexMap(original: string): {
  normalized: string;
  toOriginalIndex: number[];
} {
  let normalized = "";
  const toOriginalIndex: number[] = [];

  for (let i = 0; i < original.length; i++) {
    const base = original[i]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    for (let j = 0; j < base.length; j++) {
      normalized += base[j];
      toOriginalIndex.push(i);
    }
  }

  return { normalized, toOriginalIndex };
}

interface TextRange {
  start: number;
  end: number;
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

function findAllOccurrences(
  normalizedText: string,
  needle: string,
): TextRange[] {
  if (!needle) return [];
  const ranges: TextRange[] = [];
  let pos = 0;
  while (pos < normalizedText.length) {
    const idx = normalizedText.indexOf(needle, pos);
    if (idx === -1) break;
    ranges.push({ start: idx, end: idx + needle.length });
    pos = idx + needle.length;
  }
  return ranges;
}

function buildSnippetFromOriginal(
  originalText: string,
  normalizedPhrase: string,
  tokens: string[],
  contextRadius = 90,
): {
  segments: SnippetSegment[];
  hasLeadingEllipsis: boolean;
  hasTrailingEllipsis: boolean;
  matchCount: number;
  isExactPhraseMatch: boolean;
} {
  const { normalized, toOriginalIndex } =
    buildNormalizedWithIndexMap(originalText);

  const phraseRanges = findAllOccurrences(normalized, normalizedPhrase);
  const isExactPhraseMatch = phraseRanges.length > 0;

  let normRanges: TextRange[];
  if (isExactPhraseMatch) {
    normRanges = phraseRanges;
  } else {
    const tokenRanges: TextRange[] = [];
    for (const token of tokens) {
      tokenRanges.push(...findAllOccurrences(normalized, token));
    }
    normRanges = mergeRanges(tokenRanges);
  }

  if (normRanges.length === 0) {
    const fallbackEnd = Math.min(originalText.length, contextRadius * 2);
    return {
      segments: [{ text: originalText.slice(0, fallbackEnd), highlight: false }],
      hasLeadingEllipsis: false,
      hasTrailingEllipsis: fallbackEnd < originalText.length,
      matchCount: 0,
      isExactPhraseMatch: false,
    };
  }

  // Converte ranges normalizados para índices no texto original
  const originalRanges = mergeRanges(
    normRanges.map((r) => {
      const origStart = toOriginalIndex[r.start] ?? 0;
      const lastCharIdx = toOriginalIndex[Math.max(r.start, r.end - 1)] ?? origStart;
      return { start: origStart, end: Math.min(originalText.length, lastCharIdx + 1) };
    }),
  );

  // Define janela de preview centrada na primeira ocorrência (expandindo se houver outra próxima)
  const anchor = originalRanges[0];
  let windowStart = Math.max(0, anchor.start - contextRadius);
  let windowEnd = Math.min(originalText.length, anchor.end + contextRadius);

  // Se houver uma segunda ocorrência próxima (ex: outros termos da busca), expande até 320 chars
  if (originalRanges.length > 1) {
    const maxWindow = 320;
    const lastVisible = originalRanges.find(
      (r) => r.end - windowStart <= maxWindow && r.start > anchor.end,
    );
    if (lastVisible) {
      windowEnd = Math.min(
        originalText.length,
        Math.max(windowEnd, lastVisible.end + 45),
      );
    }
  }

  // Ajusta início e fim para não cortar palavras no meio quando possível
  if (windowStart > 0) {
    const spaceAfter = originalText.indexOf(" ", windowStart);
    if (spaceAfter !== -1 && spaceAfter < anchor.start && spaceAfter - windowStart <= 20) {
      windowStart = spaceAfter + 1;
    }
  }
  if (windowEnd < originalText.length) {
    const spaceBefore = originalText.lastIndexOf(" ", windowEnd);
    if (spaceBefore > anchor.end && windowEnd - spaceBefore <= 20) {
      windowEnd = spaceBefore;
    }
  }

  const segments: SnippetSegment[] = [];
  let cursor = windowStart;

  for (const range of originalRanges) {
    if (range.end <= windowStart || range.start >= windowEnd) continue;
    const clampedStart = Math.max(range.start, windowStart);
    const clampedEnd = Math.min(range.end, windowEnd);

    if (clampedStart > cursor) {
      segments.push({
        text: originalText.slice(cursor, clampedStart),
        highlight: false,
      });
    }
    segments.push({
      text: originalText.slice(clampedStart, clampedEnd),
      highlight: true,
    });
    cursor = clampedEnd;
  }

  if (cursor < windowEnd) {
    segments.push({
      text: originalText.slice(cursor, windowEnd),
      highlight: false,
    });
  }

  return {
    segments,
    hasLeadingEllipsis: windowStart > 0,
    hasTrailingEllipsis: windowEnd < originalText.length,
    matchCount: originalRanges.length,
    isExactPhraseMatch,
  };
}

export function matchesProjectStatusFilter(
  project: Pick<IndexedProjectNotes, "globalStatus" | "postStatus">,
  statusFilter: ProjectStatusFilter,
): boolean {
  if (statusFilter === "all") return true;
  const isPostInProgress = project.postStatus === "in-progress";

  if (statusFilter === "post") return isPostInProgress;
  if (statusFilter === "active") {
    return project.globalStatus === "in-progress" && !isPostInProgress;
  }
  if (statusFilter === "paused") {
    return project.globalStatus === "blocked" && !isPostInProgress;
  }
  if (statusFilter === "done") {
    return (
      (project.globalStatus === "done" || project.globalStatus === "archived") &&
      !isPostInProgress
    );
  }
  return true;
}

export interface SearchProjectNotesOptions {
  sectionFilter?: NoteSectionKey | "all";
  statusFilter?: ProjectStatusFilter;
}

/**
 * Pesquisa nos campos de texto livre indexados de todos os projetos.
 * Exige que todos os termos da consulta existam no mesmo campo (AND por campo),
 * priorizando correspondência exata da frase e projetos com mais ocorrências.
 */
export function searchIndexedProjectNotes(
  indexedProjects: IndexedProjectNotes[],
  rawQuery: string,
  options: SearchProjectNotesOptions = {},
): ProjectNotesSearchResult[] {
  const normalizedQuery = normalizeText(rawQuery).replace(/\s+/g, " ").trim();
  if (!normalizedQuery) return [];

  const tokens = Array.from(
    new Set(normalizedQuery.split(" ").filter((t) => t.length > 0)),
  );
  if (tokens.length === 0) return [];

  const { sectionFilter = "all", statusFilter = "all" } = options;
  const results: ProjectNotesSearchResult[] = [];

  for (const project of indexedProjects) {
    if (!matchesProjectStatusFilter(project, statusFilter)) continue;

    const fieldMatches: TextFieldMatch[] = [];

    for (const field of project.fields) {
      if (sectionFilter !== "all" && field.sectionKey !== sectionFilter) {
        continue;
      }

      const matchesAllTokens = tokens.every((token) =>
        field.normalizedText.includes(token),
      );
      if (!matchesAllTokens) continue;

      const snippet = buildSnippetFromOriginal(
        field.plainText,
        normalizedQuery,
        tokens,
      );

      if (snippet.matchCount === 0) continue;

      fieldMatches.push({
        fieldKey: field.fieldKey,
        sectionKey: field.sectionKey,
        sectionLabel: field.sectionLabel,
        fieldLabel: field.fieldLabel,
        targetTab: field.targetTab,
        targetStepId: field.targetStepId,
        snippetSegments: snippet.segments,
        hasLeadingEllipsis: snippet.hasLeadingEllipsis,
        hasTrailingEllipsis: snippet.hasTrailingEllipsis,
        matchCount: snippet.matchCount,
        isExactPhraseMatch: snippet.isExactPhraseMatch,
      });
    }

    if (fieldMatches.length > 0) {
      // Ordena matches dentro do projeto: frase exata primeiro, depois mais ocorrências
      fieldMatches.sort((a, b) => {
        if (a.isExactPhraseMatch !== b.isExactPhraseMatch) {
          return a.isExactPhraseMatch ? -1 : 1;
        }
        return b.matchCount - a.matchCount;
      });

      const totalMatches = fieldMatches.reduce(
        (sum, m) => sum + m.matchCount,
        0,
      );

      results.push({
        projectId: project.projectId,
        clientName: project.clientName,
        ticketNumber: project.ticketNumber,
        systemType: project.systemType,
        globalStatus: project.globalStatus,
        postStatus: project.postStatus,
        projectLeader: project.projectLeader,
        updatedAt: project.updatedAt,
        totalMatches,
        matches: fieldMatches,
      });
    }
  }

  // Ordena projetos: quem tem frase exata primeiro, depois mais campos/ocorrências, depois mais recente
  results.sort((a, b) => {
    const aHasExact = a.matches.some((m) => m.isExactPhraseMatch);
    const bHasExact = b.matches.some((m) => m.isExactPhraseMatch);
    if (aHasExact !== bHasExact) return aHasExact ? -1 : 1;
    if (b.matches.length !== a.matches.length) {
      return b.matches.length - a.matches.length;
    }
    if (b.totalMatches !== a.totalMatches) {
      return b.totalMatches - a.totalMatches;
    }
    return a.clientName.localeCompare(b.clientName);
  });

  return results;
}
