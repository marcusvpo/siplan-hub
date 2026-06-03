import React from "react";

/**
 * Generates marquee animation CSS styles for text that overflows its container.
 * 
 * @param text The text content
 * @param active Whether the element is currently selected/hovered to trigger marquee
 * @param textAreaPx The available width in pixels of the text container
 * @param charWidthPx The estimated pixel width of a single character
 */
export function getMarqueeStyle(
  text: string,
  active: boolean,
  textAreaPx: number,
  charWidthPx: number = 6.2
): React.CSSProperties {
  if (!active) return {};
  const estimatedWidth = text.length * charWidthPx;
  const overflow = estimatedWidth - textAreaPx;
  if (overflow <= 4) return {};
  const dist = Math.round(overflow + 4);
  const dur = Math.max(2.5, dist / 30);
  return {
    "--scroll-dist": `-${dist}px`,
    "--scroll-dur": `${dur}s`,
    animation: `scroll-text ${dur}s ease-in-out infinite`,
  } as React.CSSProperties;
}
