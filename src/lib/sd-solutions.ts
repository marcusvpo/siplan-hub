import DOMPurify from "dompurify";
import type {
  SdAnexo,
  SdFamilia,
  SdSistema,
  SdSolucao,
  SdSolutionStatus,
} from "@/types/sd";

export const SD_UNASSIGNED_FAMILY_ID = "__unassigned__";

export interface SdFamilyGroup {
  id: string;
  nome: string;
  descricao: string | null;
  systems: SdSistema[];
  solutions: SdSolucao[];
}

export type SdSolutionSort = "relevancia" | "recentes" | "acessadas" | "uteis";

export const SD_SOLUTION_STATUS: Record<
  SdSolutionStatus,
  { label: string; className: string }
> = {
  rascunho: { label: "Rascunho", className: "border-amber-200 bg-amber-50 text-amber-700" },
  publicado: { label: "Publicado", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  desatualizado: { label: "Desatualizado", className: "border-red-200 bg-red-50 text-red-700" },
};

const sdNameCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

export function normalizeSdSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  const document = new DOMParser().parseFromString(value, "text/html");
  return document.body.textContent || "";
}

export function filterSdSolutions(
  solutions: SdSolucao[],
  search: string,
): SdSolucao[] {
  const normalized = normalizeSdSearch(search);
  if (!normalized) return solutions;

  return solutions.filter((solution) => {
    const searchable = [
      solution.titulo,
      stripHtml(solution.descricao),
      solution.sistema?.nome,
      solution.rotina?.nome,
      solution.responsavel?.full_name,
      ...(solution.palavras_chave || []),
      ...(solution.anexos || []).map((attachment) => attachment.nome_arquivo),
    ]
      .filter(Boolean)
      .join(" ");

    return normalizeSdSearch(searchable).includes(normalized);
  });
}

function sdSolutionRelevance(solution: SdSolucao, search: string): number {
  const query = normalizeSdSearch(search);
  const title = normalizeSdSearch(solution.titulo);
  const description = normalizeSdSearch(stripHtml(solution.descricao));
  const keywords = (solution.palavras_chave || []).map(normalizeSdSearch);
  const system = normalizeSdSearch(solution.sistema?.nome || "");
  const routine = normalizeSdSearch(solution.rotina?.nome || "");
  const attachments = (solution.anexos || []).map((item) => normalizeSdSearch(item.nome_arquivo));

  let score = 0;
  if (query) {
    if (title === query) score += 200;
    else if (title.startsWith(query)) score += 120;
    else if (title.includes(query)) score += 90;
    if (keywords.some((keyword) => keyword === query)) score += 80;
    else if (keywords.some((keyword) => keyword.includes(query))) score += 55;
    if (system.includes(query)) score += 35;
    if (routine.includes(query)) score += 30;
    if (attachments.some((attachment) => attachment.includes(query))) score += 25;
    if (description.includes(query)) score += 20;
  }

  const totalVotes = solution.votos_uteis + solution.votos_nao_uteis;
  const usefulness = totalVotes > 0 ? solution.votos_uteis / totalVotes : 0;
  return score + usefulness * 12 + Math.log10(solution.visualizacoes + 1) * 3;
}

export function sortSdSolutions(
  solutions: SdSolucao[],
  sort: SdSolutionSort,
  search: string,
): SdSolucao[] {
  const items = [...solutions];
  return items.sort((left, right) => {
    if (sort === "acessadas" && right.visualizacoes !== left.visualizacoes) {
      return right.visualizacoes - left.visualizacoes;
    }
    if (sort === "uteis" && right.votos_uteis !== left.votos_uteis) {
      return right.votos_uteis - left.votos_uteis;
    }
    if (sort === "relevancia") {
      const scoreDifference = sdSolutionRelevance(right, search) - sdSolutionRelevance(left, search);
      if (scoreDifference !== 0) return scoreDifference;
    }
    return new Date(right.atualizado_em || right.criado_em).getTime()
      - new Date(left.atualizado_em || left.criado_em).getTime();
  });
}

function normalizedTextMap(value: string): { normalized: string; originalIndexes: number[] } {
  let normalized = "";
  const originalIndexes: number[] = [];
  Array.from(value).forEach((character, originalIndex) => {
    const next = normalizeSdSearch(character);
    normalized += next;
    for (let index = 0; index < next.length; index += 1) originalIndexes.push(originalIndex);
  });
  return { normalized, originalIndexes };
}

export interface SdHighlightedPart {
  text: string;
  match: boolean;
}

export function splitSdHighlightedText(value: string, search: string): SdHighlightedPart[] {
  const query = normalizeSdSearch(search);
  if (!query) return [{ text: value, match: false }];
  const mapped = normalizedTextMap(value);
  const matchIndex = mapped.normalized.indexOf(query);
  if (matchIndex < 0) return [{ text: value, match: false }];
  const start = mapped.originalIndexes[matchIndex] ?? 0;
  const end = (mapped.originalIndexes[matchIndex + query.length - 1] ?? start) + 1;
  return [
    { text: value.slice(0, start), match: false },
    { text: value.slice(start, end), match: true },
    { text: value.slice(end), match: false },
  ].filter((part) => part.text);
}

export function sdSolutionExcerpt(
  description: string | null,
  search: string,
  maxLength = 180,
): string {
  const plainText = stripHtml(description).replace(/\s+/g, " ").trim();
  if (plainText.length <= maxLength) return plainText;
  const query = normalizeSdSearch(search);
  const mapped = normalizedTextMap(plainText);
  const matchIndex = query ? mapped.normalized.indexOf(query) : -1;
  const originalMatchIndex = matchIndex >= 0 ? mapped.originalIndexes[matchIndex] : 0;
  const start = Math.max(0, originalMatchIndex - Math.floor(maxLength / 3));
  const excerpt = plainText.slice(start, start + maxLength).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${start + maxLength < plainText.length ? "…" : ""}`;
}

export function isSdSolutionReviewOverdue(solution: SdSolucao): boolean {
  return Boolean(
    solution.proxima_revisao_em
      && new Date(`${solution.proxima_revisao_em}T23:59:59`).getTime() < Date.now(),
  );
}

export function canPreviewSdAttachment(attachment: SdAnexo): boolean {
  const extension = attachment.nome_arquivo.split(".").pop()?.toLocaleLowerCase("pt-BR") || "";
  return Boolean(
    attachment.tipo_mime?.startsWith("image/")
      || attachment.tipo_mime === "application/pdf"
      || attachment.tipo_mime?.startsWith("text/")
      || ["sql", "txt", "log", "json", "xml", "csv", "md"].includes(extension),
  );
}

export function groupSdSolutionsByFamily(
  families: SdFamilia[],
  systems: SdSistema[],
  solutions: SdSolucao[],
  onlyWithSolutions = false,
): SdFamilyGroup[] {
  const sortedSystems = [...systems].sort((left, right) =>
    sdNameCollator.compare(left.nome, right.nome),
  );
  const solutionsBySystem = new Map<string, SdSolucao[]>();

  solutions.forEach((solution) => {
    const current = solutionsBySystem.get(solution.sistema_id) || [];
    current.push(solution);
    solutionsBySystem.set(solution.sistema_id, current);
  });

  const groups = [...families]
    .sort((left, right) => sdNameCollator.compare(left.nome, right.nome))
    .map((family) => {
      const familySystems = sortedSystems.filter((system) => system.familia_id === family.id);
      return {
        id: family.id,
        nome: family.nome,
        descricao: family.descricao,
        systems: familySystems,
        solutions: familySystems.flatMap((system) => solutionsBySystem.get(system.id) || []),
      };
    })
    .filter((group) => !onlyWithSolutions || group.solutions.length > 0);

  const unassignedSystems = sortedSystems.filter((system) => !system.familia_id);
  const unassignedSolutions = solutions.filter((solution) => {
    const system = systems.find((item) => item.id === solution.sistema_id);
    return !system?.familia_id;
  });

  if (
    (!onlyWithSolutions && unassignedSystems.length > 0) ||
    unassignedSolutions.length > 0
  ) {
    groups.push({
      id: SD_UNASSIGNED_FAMILY_ID,
      nome: "Sem família",
      descricao: "Sistemas que ainda precisam ser vinculados a uma família.",
      systems: unassignedSystems,
      solutions: unassignedSolutions,
    });
  }

  return groups;
}

export function sanitizeSdSolutionHtml(value: string): string {
  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "code",
      "pre",
      "a",
      "img",
      "span",
      "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class"],
    ALLOW_DATA_ATTR: false,
  });

  const document = new DOMParser().parseFromString(sanitized, "text/html");
  document.querySelectorAll(".kw-mark").forEach((element) => {
    element.classList.remove("kw-mark");
    element.classList.add("sd-keyword");
  });
  return document.body.innerHTML;
}
