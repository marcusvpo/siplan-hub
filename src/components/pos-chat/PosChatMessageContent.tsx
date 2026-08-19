import React, { Fragment, ReactNode } from "react";
import { BunnyVideoPlayer } from "./BunnyVideoPlayer";
import { ExternalLink, Info, AlertCircle, Sparkles, Layers } from "lucide-react";

interface PosChatMessageContentProps {
  content: string;
  className?: string;
}

const BUNNY_NET_DOMAIN = "iframe.mediadelivery.net";

/**
 * Checks if a URL is a Bunny.net stream video embed
 */
export function isBunnyStreamUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes(BUNNY_NET_DOMAIN) ||
    url.includes("mediadelivery.net/embed")
  );
}

/**
 * Renders inline Markdown: links, bold, underline, italic, code
 */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Tokenizes:
  // 1: [label](url) or [[label]](url)
  // 2: `code`
  // 3: **bold**
  // 4: __underline__
  // 5: *italic*
  const tokenRegex = /(\[+([^\]]+)\]+\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined && match[3] !== undefined) {
      // Link [label](url) or [[label]](url)
      const rawLabel = match[2].replace(/^\[+|\]+$/g, "").trim();
      const rawUrl = match[3].trim();

      if (isBunnyStreamUrl(rawUrl)) {
        nodes.push(
          <div key={`video-${key++}`} className="my-2 block w-full">
            <BunnyVideoPlayer url={rawUrl} title={rawLabel || "Videoaula - Orion TN"} />
          </div>
        );
      } else {
        const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
        nodes.push(
          <a
            key={`link-${key++}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 dark:text-rose-400 font-medium underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
          >
            {rawLabel}
            <ExternalLink className="inline h-3 w-3 shrink-0 ml-0.5 opacity-70" />
          </a>
        );
      }
    } else if (match[4] !== undefined) {
      // `code`
      nodes.push(
        <code
          key={`code-${key++}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-muted/80 text-foreground font-mono text-[11px] border border-border/50"
        >
          {match[4]}
        </code>
      );
    } else if (match[5] !== undefined) {
      // **bold**
      nodes.push(<strong key={`b-${key++}`}>{renderInline(match[5])}</strong>);
    } else if (match[6] !== undefined) {
      // __underline__
      nodes.push(<u key={`u-${key++}`}>{renderInline(match[6])}</u>);
    } else if (match[7] !== undefined) {
      // *italic*
      nodes.push(<em key={`i-${key++}`}>{renderInline(match[7])}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export interface StepItem {
  number: number;
  text: string;
  subItems: string[];
}

export type Block =
  | { type: "heading"; level: number; text: string; routineCode?: string }
  | { type: "section"; title: string }
  | { type: "steps"; items: StepItem[] }
  | { type: "ul"; items: string[] }
  | { type: "video"; url: string; title: string; prefixText?: string }
  | { type: "callout"; title?: string; text: string }
  | { type: "quote"; text: string }
  | { type: "hr" }
  | { type: "p"; lines: string[] };

/**
 * Robust extraction of Bunny.net stream video links from a line of text.
 */
function extractBunnyVideoFromLine(line: string): { url: string; title: string; prefixText?: string } | null {
  if (!isBunnyStreamUrl(line)) return null;

  // 1. Markdown link with optional prefix: e.g. "▶️ Assista ao tutorial: [[Título]](https://iframe.mediadelivery.net/...)"
  const mdRegex = /^(.*?)(?:▶️|🎬|🎥)?\s*(\*{0,2}(?:Parte \d+:?|Assista ao tutorial:?|Tutorial:?|Vídeo:?|Videoaula:?)?\*{0,2})?\s*\[+([^\]]+)\]+\s*\((https?:\/\/iframe\.mediadelivery\.net\/[^\s)]+)\)\s*$/i;
  const mdMatch = mdRegex.exec(line);

  if (mdMatch) {
    const prefix = [mdMatch[1], mdMatch[2]].filter(Boolean).join(" ").trim();
    const title = mdMatch[3].replace(/^\[+|\]+$/g, "").trim();
    const url = mdMatch[4].trim();
    return {
      url,
      title: title || "Videoaula - Orion TN",
      prefixText: prefix || undefined,
    };
  }

  // 2. Generic markdown link anywhere in the line: e.g. "... [[Título]](https://iframe.mediadelivery.net/...)"
  const genericMdRegex = /\[+([^\]]+)\]+\s*\((https?:\/\/iframe\.mediadelivery\.net\/[^\s)]+)\)/i;
  const genericMatch = genericMdRegex.exec(line);

  if (genericMatch) {
    const title = genericMatch[1].replace(/^\[+|\]+$/g, "").trim();
    const url = genericMatch[2].trim();
    const prefix = line.replace(genericMatch[0], "").replace(/^[▶️🎬🎥\s*:]+/, "").trim();
    return {
      url,
      title: title || "Videoaula - Orion TN",
      prefixText: prefix || undefined,
    };
  }

  // 3. Bare URL in line: e.g. "https://iframe.mediadelivery.net/embed/467408/..."
  const bareUrlRegex = /(https?:\/\/iframe\.mediadelivery\.net\/[^\s)]+)/i;
  const bareMatch = bareUrlRegex.exec(line);

  if (bareMatch) {
    const url = bareMatch[1].trim();
    const prefix = line.replace(url, "").replace(/^[▶️🎬🎥\s*:]+/, "").trim();
    return {
      url,
      title: prefix || "Videoaula - Orion TN",
      prefixText: prefix || undefined,
    };
  }

  return null;
}

/**
 * Parses markdown lines into structured blocks
 */
function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let currentP: string[] = [];
  let currentSteps: StepItem[] | null = null;
  let currentUl: string[] | null = null;

  const flushP = () => {
    if (currentP.length > 0) {
      blocks.push({ type: "p", lines: [...currentP] });
      currentP = [];
    }
  };

  const flushSteps = () => {
    if (currentSteps && currentSteps.length > 0) {
      blocks.push({ type: "steps", items: currentSteps });
      currentSteps = null;
    }
  };

  const flushUl = () => {
    if (currentUl && currentUl.length > 0) {
      blocks.push({ type: "ul", items: currentUl });
      currentUl = null;
    }
  };

  const flushAll = () => {
    flushP();
    flushSteps();
    flushUl();
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line
    if (!trimmed) {
      flushP();
      // Notice: we do not immediately destroy currentSteps on a single empty line
      // if next line is step 2/3, unless a heading/section appears.
      continue;
    }

    // Horizontal Rule (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      flushAll();
      blocks.push({ type: "hr" });
      continue;
    }

    // Video Link
    const videoData = extractBunnyVideoFromLine(trimmed);
    if (videoData) {
      flushAll();
      blocks.push({
        type: "video",
        url: videoData.url,
        title: videoData.title,
        prefixText: videoData.prefixText,
      });
      continue;
    }

    // Callout: "Observação importante:", "Nota:", "Importante:", "Atenção:", "Dica:"
    const calloutMatch = /^(?:[-*•]\s*)?\*{0,2}(Observação(?: importante)?:?|Nota:?|Importante:?|Atenção:?|Dica:?)\*{0,2}\s*(.*)$/i.exec(trimmed);
    if (calloutMatch && (calloutMatch[2] || trimmed.length > 25)) {
      flushAll();
      blocks.push({
        type: "callout",
        title: calloutMatch[1].replace(/:$/, ""),
        text: calloutMatch[2] || "",
      });
      continue;
    }

    // Markdown Headings: #, ##, ###, ####
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushAll();
      const rawText = headingMatch[2].replace(/^\*{2}|\*{2}$/g, "");
      const routineMatch = /^([RVD]-\d+(?:\.\d+)*)\s*[-–—:]\s*(.*)$/i.exec(rawText);
      if (routineMatch) {
        blocks.push({
          type: "heading",
          level: headingMatch[1].length,
          routineCode: routineMatch[1],
          text: routineMatch[2],
        });
      } else {
        blocks.push({
          type: "heading",
          level: headingMatch[1].length,
          text: rawText,
        });
      }
      continue;
    }

    // Standalone Routine Title without heading markdown: e.g. "R-23.0 - Como Realizar a Distribuição..."
    const standaloneRoutineMatch = /^\*{0,2}([RVD]-\d+(?:\.\d+)*)\s*[-–—:]\s*(.*?)\*{0,2}$/i.exec(trimmed);
    if (standaloneRoutineMatch && standaloneRoutineMatch[2].length > 5) {
      flushAll();
      blocks.push({
        type: "heading",
        level: 2,
        routineCode: standaloneRoutineMatch[1],
        text: standaloneRoutineMatch[2],
      });
      continue;
    }

    // Section Subtitle / Part Header: e.g. "Parte 2: Consultar ou Estornar uma Distribuição", "Etapa 1: ..."
    const sectionMatch = /^\*{0,2}((?:Parte|Etapa|Fase)\s+\d+:?\s*.*?)\*{0,2}$/i.exec(trimmed);
    if (sectionMatch) {
      flushAll();
      blocks.push({
        type: "section",
        title: sectionMatch[1],
      });
      continue;
    }

    // "Passo a passo:" line
    if (/^\*{0,2}Passo a passo:?\*{0,2}$/i.test(trimmed)) {
      flushAll();
      blocks.push({
        type: "section",
        title: "Passo a passo:",
      });
      continue;
    }

    // Blockquote: > ...
    if (trimmed.startsWith(">")) {
      flushAll();
      blocks.push({
        type: "quote",
        text: trimmed.replace(/^>\s*/, ""),
      });
      continue;
    }

    // 1. Check for Numbered Step: e.g. "1) Acesse...", "- 1) Acesse...", "* 1. Acesse...", "1. Acesse...", "- Passo 1: ..."
    const stepMatch = /^(?:[-*+•]\s*)?(?:(\d+)[.)]|(?:Passo|Etapa)\s*(\d+):?)\s+(.*)$/i.exec(trimmed);
    if (stepMatch) {
      flushP();
      flushUl();
      const stepNum = parseInt(stepMatch[1] || stepMatch[2], 10);
      const stepText = stepMatch[3];

      if (!currentSteps) {
        currentSteps = [];
      }

      currentSteps.push({
        number: stepNum || (currentSteps.length + 1),
        text: stepText,
        subItems: [],
      });
      continue;
    }

    // 2. Check for Bullet Item / Sub-item
    const bulletMatch = /^[-*+•]\s+(.*)$/.exec(trimmed);
    if (bulletMatch) {
      flushP();
      const bulletContent = bulletMatch[1];

      // If we are currently inside numbered steps, this is a SUB-ITEM of the active step!
      if (currentSteps && currentSteps.length > 0) {
        const lastStep = currentSteps[currentSteps.length - 1];
        lastStep.subItems.push(bulletContent);
      } else {
        // Standalone unordered list
        if (!currentUl) currentUl = [];
        currentUl.push(bulletContent);
      }
      continue;
    }

    // 3. Indented text under an active step (e.g. "   Vá em Administração > Distribuição")
    if (currentSteps && currentSteps.length > 0 && /^\s{2,}(.*)$/.test(rawLine)) {
      const indentedText = rawLine.trim();
      currentSteps[currentSteps.length - 1].subItems.push(indentedText);
      continue;
    }

    // 4. If currentSteps is active and this line looks like a continuation or unnumbered action (e.g. "Vá em Administração > Distribuição")
    if (currentSteps && currentSteps.length > 0 && currentP.length === 0 && !trimmed.endsWith(":")) {
      // Check if it's a short instruction belonging to previous step
      const lastStep = currentSteps[currentSteps.length - 1];
      if (lastStep.subItems.length === 0 && lastStep.text.length < 100) {
        lastStep.subItems.push(trimmed);
        continue;
      }
    }

    // Otherwise, regular paragraph text (flush any list if we switch back to narrative text)
    if (currentSteps && trimmed.length > 60 && !trimmed.startsWith("-")) {
      flushSteps();
    }
    flushUl();
    currentP.push(rawLine);
  }

  flushAll();

  return blocks;
}

export function PosChatMessageContent({ content, className }: PosChatMessageContentProps) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className={`pos-chat-markdown text-xs sm:text-sm space-y-3.5 leading-relaxed break-words ${className || ""}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            return (
              <div
                key={idx}
                className="mt-3.5 first:mt-0 pb-1.5 border-b border-slate-200/80 dark:border-neutral-800 flex flex-wrap items-center gap-2"
              >
                {block.routineCode && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-mono font-bold text-xs border border-rose-200 dark:border-rose-900/60 shadow-2xs">
                    {block.routineCode}
                  </span>
                )}
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {renderInline(block.text)}
                </span>
              </div>
            );
          }

          case "section": {
            return (
              <div key={idx} className="pt-2 first:pt-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800/90 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-[13px] border border-slate-200/80 dark:border-neutral-700/80 shadow-2xs">
                  <Layers className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  {block.title}
                </span>
              </div>
            );
          }

          case "steps": {
            return (
              <div key={idx} className="space-y-3.5 my-3 pl-0.5 sm:pl-1">
                {block.items.map((step, stepIdx) => (
                  <div key={stepIdx} className="group flex items-start gap-3 leading-relaxed">
                    {/* Badge do Número do Passo */}
                    <div className="flex h-6 w-6 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white font-bold text-xs items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-rose-600/20">
                      {step.number}
                    </div>

                    {/* Conteúdo do Passo */}
                    <div className="flex-1 min-w-0 pt-0.5 text-xs sm:text-sm">
                      {/* Texto Principal do Passo */}
                      <div className="text-slate-900 dark:text-slate-100 font-medium">
                        {renderInline(step.text)}
                      </div>

                      {/* Sub-itens e Tópicos com Recuo */}
                      {step.subItems && step.subItems.length > 0 && (
                        <div className="mt-2 space-y-1.5 border-l-2 border-rose-200 dark:border-rose-950/60 pl-3 py-0.5 ml-1">
                          {step.subItems.map((sub, subIdx) => (
                            <div
                              key={subIdx}
                              className="flex items-start gap-2 text-[12px] sm:text-xs text-slate-700 dark:text-slate-300 leading-normal"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 dark:bg-rose-500 shrink-0 mt-1.5" />
                              <div className="flex-1 min-w-0">
                                {renderInline(sub)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          case "ul": {
            return (
              <ul key={idx} className="space-y-2.5 my-3 pl-2 sm:pl-3 text-foreground">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600 dark:bg-rose-400 shrink-0 mt-2" />
                    <div className="flex-1 min-w-0 text-xs sm:text-sm">
                      {renderInline(item)}
                    </div>
                  </li>
                ))}
              </ul>
            );
          }

          case "callout": {
            return (
              <div
                key={idx}
                className="my-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-transparent dark:from-amber-950/30 dark:via-amber-950/10 dark:to-transparent border-l-4 border-amber-500 text-xs leading-relaxed text-slate-800 dark:text-slate-200 shadow-2xs space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{block.title || "Observação importante"}</span>
                </div>
                {block.text && (
                  <div className="pl-5 text-slate-700 dark:text-slate-300">
                    {renderInline(block.text)}
                  </div>
                )}
              </div>
            );
          }

          case "quote": {
            return (
              <blockquote
                key={idx}
                className="border-l-3 border-rose-500 bg-rose-50/50 dark:bg-rose-950/25 px-3.5 py-2 my-2.5 rounded-r-lg text-muted-foreground italic text-xs leading-relaxed"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          }

          case "hr":
            return <hr key={idx} className="my-3.5 border-slate-200 dark:border-neutral-800" />;

          case "video":
            return (
              <div key={idx} className="my-3.5 p-1 rounded-2xl bg-slate-50 dark:bg-neutral-900/80 border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
                {block.prefixText && (
                  <div className="text-xs font-semibold text-foreground px-2.5 pt-1.5 pb-2 flex items-center gap-1.5">
                    <span className="text-rose-600 font-bold">▶️</span>
                    <span>{renderInline(block.prefixText.replace(/^▶️\s*/, ""))}</span>
                  </div>
                )}
                <BunnyVideoPlayer url={block.url} title={block.title} />
              </div>
            );

          case "p": {
            return (
              <div key={idx} className="my-2.5 leading-relaxed text-foreground space-y-1.5">
                {block.lines.map((line, lineIdx) => (
                  <p key={lineIdx} className="leading-relaxed">
                    {renderInline(line)}
                  </p>
                ))}
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
