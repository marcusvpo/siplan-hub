import DOMPurify from "dompurify";
import type { SdFamilia, SdSistema, SdSolucao } from "@/types/sd";

export const SD_UNASSIGNED_FAMILY_ID = "__unassigned__";

export interface SdFamilyGroup {
  id: string;
  nome: string;
  descricao: string | null;
  systems: SdSistema[];
  solutions: SdSolucao[];
}

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
      ...(solution.palavras_chave || []),
    ]
      .filter(Boolean)
      .join(" ");

    return normalizeSdSearch(searchable).includes(normalized);
  });
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
