const STATUS_BY_KEY: Record<string, string> = {
  naoiniciado: "Não iniciado",
  emandamento: "Em andamento",
  aguardando: "Aguardando",
  concluido: "Concluído",
};

export function normalizeChamadoStatus(status?: string | null): string | null {
  if (!status) return null;

  const key = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return STATUS_BY_KEY[key] ?? null;
}
