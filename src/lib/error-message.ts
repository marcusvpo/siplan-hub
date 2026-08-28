interface ErrorLike {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const candidate = error as ErrorLike;
    const message = typeof candidate.message === "string" ? candidate.message.trim() : "";
    const details = typeof candidate.details === "string" ? candidate.details.trim() : "";
    const hint = typeof candidate.hint === "string" ? candidate.hint.trim() : "";
    const combined = [message, details, hint].filter(Boolean).join(" — ");
    if (combined) return combined;
  }
  return fallback;
}
