// Helpers para o editor Lexical usado nos campos rich-text da Transicao.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LexicalNode = Record<string, any>;

const textNode = (text: string): LexicalNode => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text,
  type: "text",
  version: 1,
});

const paragraphNode = (text: string): LexicalNode => ({
  children: text ? [textNode(text)] : [],
  direction: text ? "ltr" : null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});

/**
 * Converte texto puro (com quebras de linha) em um SerializedEditorState do Lexical
 * (string JSON pronta para o campo `content` do RichTextEditor). Cada linha vira um
 * paragrafo; marcadores "- " sao mantidos como texto (simples e sempre valido).
 */
export function plainTextToLexicalJson(text: string): string {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const children = lines.length ? lines.map((l) => paragraphNode(l.trim())) : [paragraphNode("")];
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
