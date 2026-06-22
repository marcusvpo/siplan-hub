/**
 * Formats a phone number string to Brazilian standard format:
 * (XX) XXXX-XXXX or (XX) XXXXX-XXXX
 */
export function formatBrazilianPhone(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");
  
  // Limit to maximum 11 digits
  const limited = digits.substring(0, 11);
  
  if (limited.length <= 2) {
    return limited.length > 0 ? `(${limited}` : "";
  }
  if (limited.length <= 6) {
    return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
  }
  if (limited.length <= 10) {
    return `(${limited.substring(0, 2)}) ${limited.substring(2, 6)}-${limited.substring(6)}`;
  }
  return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`;
}

/**
 * Validates if the phone number has exactly 10 or 11 digits
 */
export function validateBrazilianPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}
