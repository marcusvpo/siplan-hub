import { ReactNode } from "react";

/**
 * Renderizador de Markdown minimo e seguro (sem dangerouslySetInnerHTML) para o
 * subconjunto que o modelo emite: paragrafos, listas (- / *), listas numeradas,
 * titulos (#) e enfase inline (**negrito**, __sublinhado__, *italico*).
 * Nao interpreta HTML, entao nao ha risco de injecao.
 */

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*)/;
  let rest = text;
  let key = 0;
  for (;;) {
    const m = re.exec(rest);
    if (!m) {
      if (rest) nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    if (m[2] != null) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] != null) nodes.push(<u key={key++}>{m[3]}</u>);
    else if (m[4] != null) nodes.push(<em key={key++}>{m[4]}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{renderInline(it)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key++} className="list-decimal pl-5 space-y-0.5 my-1">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="list-disc pl-5 space-y-0.5 my-1">
          {items}
        </ul>
      )
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^(#{1,3})\s+(.*)$/);

    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
    } else if (heading) {
      flushList();
      blocks.push(
        <p key={key++} className="font-semibold mt-2 first:mt-0">
          {renderInline(heading[2])}
        </p>
      );
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="whitespace-pre-wrap">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();

  return <div className="space-y-1 leading-relaxed">{blocks}</div>;
}
