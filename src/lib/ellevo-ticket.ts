const ELLEVO_TICKET_URL_PREFIX =
  "https://sac.siplancontrolm.com.br/indexAtendente.html#/main/paginaurl/Historico.asp/Sol=";

export function normalizeEllevoTicketNumber(
  ticketNumber: string | number | null | undefined,
): string | null {
  const normalized = String(ticketNumber ?? "")
    .trim()
    .replace(/^#\s*/, "");

  return /^\d+$/.test(normalized) ? normalized : null;
}

export function buildEllevoTicketUrl(
  ticketNumber: string | number | null | undefined,
): string | null {
  const normalized = normalizeEllevoTicketNumber(ticketNumber);
  return normalized
    ? `${ELLEVO_TICKET_URL_PREFIX}${encodeURIComponent(normalized)}`
    : null;
}
