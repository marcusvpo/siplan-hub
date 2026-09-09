import React from "react";

import { cn } from "@/lib/utils";

interface LexicalContentNode {
  children?: LexicalContentNode[];
  checked?: boolean;
  format?: number | string;
  listType?: string;
  root?: LexicalContentNode;
  style?: string;
  tag?: string;
  text?: string;
  type?: string;
}

interface RichTextContentProps {
  content: string | object | null | undefined;
  className?: string;
  emptyText?: string;
}

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;

const parseInlineStyle = (style: string | undefined): React.CSSProperties => {
  if (!style) return {};

  const safeStyle: React.CSSProperties = {};

  style.split(";").forEach((declaration) => {
    const [rawProperty, rawValue] = declaration.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const value = rawValue?.trim();

    if (property === "color" && /^#[0-9a-f]{3,8}$/i.test(value || "")) {
      safeStyle.color = value;
    }

    if (property === "font-size" && /^\d+(?:\.\d+)?(?:px|rem|em)$/i.test(value || "")) {
      safeStyle.fontSize = value;
    }
  });

  return safeStyle;
};

const getAlignmentStyle = (format: LexicalContentNode["format"]): React.CSSProperties => {
  if (format === "center" || format === "right" || format === "justify") {
    return { textAlign: format };
  }

  return {};
};

const renderNodes = (nodes: LexicalContentNode[] | undefined): React.ReactNode =>
  nodes?.map((node, index) => renderNode(node, index));

const renderNode = (node: LexicalContentNode, key: number): React.ReactNode => {
  const children = renderNodes(node.children);

  if (node.type === "text") {
    const format = typeof node.format === "number" ? node.format : 0;
    const isUnderlined = Boolean(format & FORMAT_UNDERLINE);
    const isStruckThrough = Boolean(format & FORMAT_STRIKETHROUGH);
    const textDecoration = [
      isUnderlined ? "underline" : "",
      isStruckThrough ? "line-through" : "",
    ].filter(Boolean).join(" ");

    return (
      <span
        key={key}
        className={cn(
          format & FORMAT_BOLD && "font-bold",
          format & FORMAT_ITALIC && "italic",
          format & FORMAT_CODE && "rounded bg-muted px-1 font-mono text-[0.9em]",
        )}
        style={{
          ...parseInlineStyle(node.style),
          ...(textDecoration ? { textDecoration } : {}),
        }}
      >
        {node.text || ""}
      </span>
    );
  }

  if (node.type === "linebreak") return <br key={key} />;

  if (node.type === "heading") {
    const headingClassName = "break-words font-bold leading-tight";
    const style = getAlignmentStyle(node.format);

    if (node.tag === "h1") return <h1 key={key} className={cn(headingClassName, "text-2xl")} style={style}>{children}</h1>;
    if (node.tag === "h2") return <h2 key={key} className={cn(headingClassName, "text-xl")} style={style}>{children}</h2>;
    return <h3 key={key} className={cn(headingClassName, "text-lg")} style={style}>{children}</h3>;
  }

  if (node.type === "quote") {
    return (
      <blockquote key={key} className="border-l-4 border-muted-foreground/30 pl-3 italic" style={getAlignmentStyle(node.format)}>
        {children}
      </blockquote>
    );
  }

  if (node.type === "list") {
    if (node.listType === "number" || node.tag === "ol") {
      return <ol key={key} className="list-decimal space-y-1 pl-5">{children}</ol>;
    }

    return <ul key={key} className="list-disc space-y-1 pl-5">{children}</ul>;
  }

  if (node.type === "listitem") {
    return (
      <li key={key} className={cn(node.checked && "text-muted-foreground line-through")}>
        {children}
      </li>
    );
  }

  if (node.type === "paragraph") {
    return (
      <p key={key} className="min-h-[1em] whitespace-pre-wrap break-words" style={getAlignmentStyle(node.format)}>
        {children}
      </p>
    );
  }

  return <React.Fragment key={key}>{children}</React.Fragment>;
};

const parseContent = (content: RichTextContentProps["content"]): LexicalContentNode | undefined => {
  if (!content) return undefined;

  if (typeof content === "object") return content as LexicalContentNode;

  try {
    const parsed = JSON.parse(content) as LexicalContentNode;
    return parsed?.type === "root" || parsed?.children || parsed?.type
      ? parsed
      : parsed?.root;
  } catch {
    return undefined;
  }
};

export function RichTextContent({ content, className, emptyText }: RichTextContentProps) {
  const parsed = parseContent(content);
  const root = parsed?.type === "root"
    ? parsed
    : parsed?.root;

  if (!root?.children) {
    const plainText = typeof content === "string" ? content : "";
    return (
      <div className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed", className)}>
        {plainText || emptyText || ""}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-1 break-words text-sm leading-relaxed", className)}>
      {renderNodes(root.children)}
    </div>
  );
}
