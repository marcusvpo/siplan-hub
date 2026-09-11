import type { MouseEventHandler, ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildEllevoTicketUrl, normalizeEllevoTicketNumber } from "@/lib/ellevo-ticket";

interface EllevoTicketLinkProps {
  ticketNumber: string | number | null | undefined;
  children?: ReactNode;
  className?: string;
  title?: string;
  showIcon?: boolean;
  stopPropagation?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/** Abre o histórico do chamado no Ellevo em uma nova aba. */
export function EllevoTicketLink({
  ticketNumber,
  children,
  className,
  title,
  showIcon = true,
  stopPropagation = true,
  onClick,
}: EllevoTicketLinkProps) {
  const normalized = normalizeEllevoTicketNumber(ticketNumber);
  const href = buildEllevoTicketUrl(ticketNumber);
  const originalValue = String(ticketNumber ?? "").trim();
  const content = children ?? (normalized ? `#${normalized}` : originalValue || "—");

  if (!href || !normalized) {
    return <span className={className}>{content}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
      title={title ?? `Abrir o chamado #${normalized} no Ellevo`}
      aria-label={title ?? `Abrir o chamado #${normalized} no Ellevo em uma nova aba`}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        onClick?.(event);
      }}
    >
      <span className="min-w-0 truncate">{content}</span>
      {showIcon && <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />}
    </a>
  );
}
