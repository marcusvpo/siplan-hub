/**
 * Utilitário de formatação de mensagens de notificações.
 * Converte datas completas em formato ISO/UTC para o formato brasileiro DD/MM/YYYY.
 */

const ISO_TIMESTAMP_REGEX = /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/g;
const ISO_DATE_REGEX = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

/**
 * Formata um timestamp ou data ISO dentro de uma mensagem de texto,
 * transformando strings como "2026-11-16T15:00:00.000Z" ou "2026-11-16"
 * simplesmente em "16/11/2026".
 */
export function formatNotificationMessage(message: string | null | undefined): string {
  if (!message || typeof message !== "string") {
    return "";
  }

  // 1. Substitui timestamps ISO completos com hora/UTC
  let formatted = message.replace(ISO_TIMESTAMP_REGEX, (match) => {
    try {
      const parsed = new Date(match);
      if (!Number.isNaN(parsed.getTime())) {
        // Formata respeitando o fuso brasileiro América/São Paulo
        return new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "America/Sao_Paulo",
        }).format(parsed);
      }
    } catch {
      // Ignora erro e cai no fallback regex
    }
    const [datePart] = match.split("T");
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  });

  // 2. Substitui datas no formato ISO simples YYYY-MM-DD
  formatted = formatted.replace(ISO_DATE_REGEX, (_match, year, month, day) => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);

    // Valida se parece uma data contemporânea de projeto
    if (y >= 2020 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${day}/${month}/${year}`;
    }
    return _match;
  });

  return formatted;
}
