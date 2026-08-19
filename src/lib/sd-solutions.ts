import DOMPurify from "dompurify";
import type { SdSolucao } from "@/types/sd";

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
