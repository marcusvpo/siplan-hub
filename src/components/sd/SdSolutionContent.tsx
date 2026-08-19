import { useMemo } from "react";
import { toast } from "sonner";
import { sanitizeSdSolutionHtml } from "@/lib/sd-solutions";

interface SdSolutionContentProps {
  value: string;
  className?: string;
}

const SQL_KEYWORDS = new Set([
  "add", "alter", "and", "as", "asc", "begin", "between", "by", "case", "commit",
  "create", "delete", "desc", "distinct", "drop", "else", "end", "exists", "from",
  "group", "having", "in", "index", "inner", "insert", "into", "is", "join", "left",
  "like", "limit", "not", "null", "on", "or", "order", "outer", "primary", "right",
  "rollback", "select", "set", "table", "then", "top", "union", "unique", "update",
  "values", "view", "when", "where", "with",
]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightTechnicalCode(value: string): string {
  const tokenPattern = /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w$]*\b)/g;
  let cursor = 0;
  let result = "";

  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    result += escapeHtml(value.slice(cursor, index));
    let className = "";
    if (token.startsWith("--") || token.startsWith("/*")) className = "sd-code-comment";
    else if (token.startsWith("'") || token.startsWith('"')) className = "sd-code-string";
    else if (/^\d/.test(token)) className = "sd-code-number";
    else if (SQL_KEYWORDS.has(token.toLocaleLowerCase("pt-BR"))) className = "sd-code-keyword";
    result += className
      ? `<span class="${className}">${escapeHtml(token)}</span>`
      : escapeHtml(token);
    cursor = index + token.length;
  }

  return result + escapeHtml(value.slice(cursor));
}

function prepareTechnicalHtml(value: string): string {
  const document = new DOMParser().parseFromString(sanitizeSdSolutionHtml(value), "text/html");
  document.querySelectorAll("pre").forEach((pre) => {
    pre.classList.add("sd-code-block");
    const code = pre.querySelector("code") || document.createElement("code");
    if (!code.parentElement) pre.appendChild(code);
    code.innerHTML = highlightTechnicalCode(code.textContent || "");

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "sd-copy-code";
    copyButton.dataset.sdCopyCode = "true";
    copyButton.setAttribute("aria-label", "Copiar bloco de código");
    copyButton.textContent = "Copiar";
    pre.prepend(copyButton);
  });
  return document.body.innerHTML;
}

export function SdSolutionContent({ value, className = "" }: SdSolutionContentProps) {
  const html = useMemo(() => prepareTechnicalHtml(value), [value]);

  return (
    <div
      className={`sd-solution-content ${className}`}
      onClick={(event) => {
        const button = (event.target as HTMLElement).closest<HTMLElement>("[data-sd-copy-code]");
        if (!button) return;
        const code = button.parentElement?.querySelector("code")?.textContent || "";
        navigator.clipboard.writeText(code)
          .then(() => toast.success("Código copiado."))
          .catch(() => toast.error("Não foi possível copiar o código."));
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
