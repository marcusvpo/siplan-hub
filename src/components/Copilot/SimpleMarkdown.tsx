import { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Renderizador de Markdown minimo e seguro (sem dangerouslySetInnerHTML) para o
 * subconjunto que o modelo emite: paragrafos, listas (- / *), listas numeradas,
 * titulos (#) e enfase inline (**negrito**, __sublinhado__, *italico*).
 * Nao interpreta HTML, entao nao ha risco de injecao.
 */

function renderLink(label: string, url: string, key: number): ReactNode {
  const cls = "text-primary underline underline-offset-2 hover:text-primary/80";
  // Link interno (SPA) para rotas que comecam com "/"; externo abre em nova aba.
  if (url.startsWith("/")) {
    return (
      <Link key={key} to={url} className={cls}>
        {label}
      </Link>
    );
  }
  const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <a key={key} href={safe} target="_blank" rel="noopener noreferrer" className={cls}>
      {label}
    </a>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Ordem importa: link antes das enfases. Grupos: 2=linkText 3=linkUrl,
  // 4=negrito, 5=sublinhado, 6=italico.
  const re = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*)/;
  let rest = text;
  let key = 0;
  for (;;) {
    const m = re.exec(rest);
    if (!m) {
      if (rest) nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    if (m[2] != null && m[3] != null) nodes.push(renderLink(m[2], m[3], key++));
    else if (m[4] != null) nodes.push(<strong key={key++}>{m[4]}</strong>);
    else if (m[5] != null) nodes.push(<u key={key++}>{m[5]}</u>);
    else if (m[6] != null) nodes.push(<em key={key++}>{m[6]}</em>);
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
