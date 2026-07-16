import { Fragment, ReactNode } from "react";

/**
 * Renderizador do "Markdown leve" que os prompts de IA do worker produzem
 * (**negrito**, __sublinhado__, *italico*, listas "- " e "1."): exibe o texto
 * formatado sem depender do editor Lexical. Usado no Parecer da Analise Pos.
 */

const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_RE).map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    if (parte.startsWith("__") && parte.endsWith("__") && parte.length > 4) {
      return <u key={i}>{parte.slice(2, -2)}</u>;
    }
    if (parte.startsWith("*") && parte.endsWith("*") && parte.length > 2) {
      return <em key={i}>{parte.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

type Bloco =
  | { tipo: "p"; linhas: string[] }
  | { tipo: "ul" | "ol"; itens: string[] };

function parseBlocos(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  for (const linha of texto.split(/\r?\n/)) {
    const t = linha.trim();
    const ultimo = blocos[blocos.length - 1];
    if (!t) {
      // linha em branco fecha o bloco atual
      if (ultimo && ((ultimo.tipo === "p" && ultimo.linhas.length) || ultimo.tipo !== "p")) {
        blocos.push({ tipo: "p", linhas: [] });
      }
      continue;
    }
    if (/^-\s+/.test(t)) {
      if (ultimo?.tipo === "ul") ultimo.itens.push(t.replace(/^-\s+/, ""));
      else blocos.push({ tipo: "ul", itens: [t.replace(/^-\s+/, "")] });
    } else if (/^\d+\.\s+/.test(t)) {
      if (ultimo?.tipo === "ol") ultimo.itens.push(t.replace(/^\d+\.\s+/, ""));
      else blocos.push({ tipo: "ol", itens: [t.replace(/^\d+\.\s+/, "")] });
    } else {
      if (ultimo?.tipo === "p") ultimo.linhas.push(t);
      else blocos.push({ tipo: "p", linhas: [t] });
    }
  }
  return blocos.filter((b) => (b.tipo === "p" ? b.linhas.length > 0 : b.itens.length > 0));
}

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const blocos = parseBlocos(text);
  return (
    <div className={className}>
      {blocos.map((b, i) =>
        b.tipo === "p" ? (
          <p key={i} className="mb-3 last:mb-0 leading-relaxed">
            {renderInline(b.linhas.join(" "))}
          </p>
        ) : b.tipo === "ul" ? (
          <ul key={i} className="mb-3 last:mb-0 pl-5 list-disc space-y-1.5">
            {b.itens.map((item, j) => (
              <li key={j} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="mb-3 last:mb-0 pl-5 list-decimal space-y-1.5">
            {b.itens.map((item, j) => (
              <li key={j} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Mesmo markdown leve em HTML inline (para o PDF gerado via html2canvas). */
export function markdownLiteToHtml(texto: string): string {
  const inline = (t: string): string =>
    escapeHtml(t)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/__([^_]+)__/g, "<u>$1</u>")
      .replace(/\*([^*\n]+)\*/g, "<i>$1</i>");
  return parseBlocos(texto)
    .map((b) => {
      if (b.tipo === "p")
        return `<p style="margin:0 0 10px;line-height:1.55;">${inline(b.linhas.join(" "))}</p>`;
      const tag = b.tipo === "ul" ? "ul" : "ol";
      const itens = b.itens
        .map((i) => `<li style="margin-bottom:4px;line-height:1.5;">${inline(i)}</li>`)
        .join("");
      return `<${tag} style="margin:0 0 10px;padding-left:20px;">${itens}</${tag}>`;
    })
    .join("");
}
