// Helpers para o editor Lexical usado nos campos rich-text da Transicao.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LexicalNode = Record<string, any>;

// Bitmask de formato do Lexical (constantes reais do editor):
// bold=1, italic=2, strikethrough=4, underline=8.
const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 8;

const textNode = (text: string, format = 0): LexicalNode => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text,
  type: "text",
  version: 1,
});

/**
 * Tokeniza uma linha em nós de texto com formatação inline (Markdown leve):
 * `**negrito**`, `__sublinhado__`, `*itálico*`. Não trata aninhamento (raro).
 */
function parseInline(line: string): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  // Ordem importa: ** antes de *; __ para sublinhado.
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) nodes.push(textNode(line.slice(last, m.index)));
    if (m[2] !== undefined) nodes.push(textNode(m[2], FORMAT_BOLD));
    else if (m[3] !== undefined) nodes.push(textNode(m[3], FORMAT_UNDERLINE));
    else if (m[4] !== undefined) nodes.push(textNode(m[4], FORMAT_ITALIC));
    last = re.lastIndex;
  }
  if (last < line.length) nodes.push(textNode(line.slice(last)));
  return nodes.length ? nodes : [textNode("")];
}

const paragraphNode = (line: string): LexicalNode => {
  const children = line ? parseInline(line) : [];
  return {
    children,
    direction: line ? "ltr" : null,
    format: "",
    indent: 0,
    type: "paragraph",
    version: 1,
  };
};

const listItemNode = (line: string, value: number): LexicalNode => ({
  children: parseInline(line),
  direction: "ltr",
  format: "",
  indent: 0,
  type: "listitem",
  value,
  version: 1,
});

const listNode = (items: string[], ordered: boolean): LexicalNode => ({
  children: items.map((l, i) => listItemNode(l, i + 1)),
  direction: "ltr",
  format: "",
  indent: 0,
  listType: ordered ? "number" : "bullet",
  start: 1,
  tag: ordered ? "ol" : "ul",
  type: "list",
  version: 1,
});

const BULLET_RE = /^\s*[-*]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;

/**
 * Converte texto Markdown leve (com quebras de linha) em um SerializedEditorState
 * do Lexical (string JSON pronta para o campo `content` do RichTextEditor).
 * Suporta: parágrafos, listas com marcadores (- / *) e numeradas (1.), e
 * formatação inline **negrito**, __sublinhado__ e *itálico*.
 */
export function plainTextToLexicalJson(text: string): string {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const children: LexicalNode[] = [];

  let bucket: string[] | null = null;
  let bucketOrdered = false;
  const flushList = () => {
    if (bucket && bucket.length) children.push(listNode(bucket, bucketOrdered));
    bucket = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(BULLET_RE);
    const ordered = line.match(ORDERED_RE);
    if (bullet) {
      if (bucket && bucketOrdered) flushList();
      bucketOrdered = false;
      bucket = bucket || [];
      bucket.push(bullet[1]);
    } else if (ordered) {
      if (bucket && !bucketOrdered) flushList();
      bucketOrdered = true;
      bucket = bucket || [];
      bucket.push(ordered[1]);
    } else {
      flushList();
      if (line.trim() !== "") children.push(paragraphNode(line));
    }
  }
  flushList();

  if (children.length === 0) children.push(paragraphNode(""));

  return JSON.stringify({
    root: {
      children,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

/**
 * Anexa um texto (Markdown leve) ao conteúdo Lexical existente, preservando os nós
 * já presentes. Usado no preenchimento por voz: o texto ditado entra como novos
 * parágrafos ao fim do campo, sem apagar o que o analista já havia escrito.
 * Se o conteúdo atual estiver vazio/inválido, retorna só o texto convertido.
 */
export function appendPlainTextToLexicalJson(
  existing: string | object | undefined,
  text: string
): string {
  const appended = plainTextToLexicalJson(text);
  if (!existing) return appended;

  try {
    const base = typeof existing === "string" ? JSON.parse(existing) : existing;
    const baseChildren: LexicalNode[] = base?.root?.children;
    if (!Array.isArray(baseChildren) || baseChildren.length === 0) return appended;

    const newChildren: LexicalNode[] = JSON.parse(appended).root.children;
    return JSON.stringify({
      root: {
        children: [...baseChildren, ...newChildren],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    });
  } catch {
    // Conteúdo legado (HTML/blocos) que não é JSON Lexical: não dá para mesclar com
    // segurança; devolve só o texto novo (o chamador decide manter/substituir).
    return appended;
  }
}
