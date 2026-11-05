/**
 * Utilitário central de formatação de datas de disparos e carimbos de notificações em PT-BR.
 */

/**
 * Formata a data e hora do disparo de e-mails/notificações de etapas em formato brasileiro:
 * `DD/MM/AAAA às HH:mm`
 * 
 * @param dateInput Objeto Date, string ISO ou timestamp numérico
 * @returns String formatada ou null caso entrada seja nula, vazia ou inválida
 */
export function formatDispatchedDate(dateInput?: string | Date | number | null): string | null {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

/**
 * Alias retrocompatível com o módulo de ambiente
 */
export const formatEnvironmentDispatchedDate = formatDispatchedDate;
