export const CHAMADO_STATUS_OPTIONS = [
  "Não iniciado",
  "Em andamento",
  "Aguardando",
  "Concluído",
] as const;

export type ChamadoStatus = (typeof CHAMADO_STATUS_OPTIONS)[number];

const STATUS_BY_KEY: Record<string, ChamadoStatus> = {
  naoiniciado: "Não iniciado",
  emandamento: "Em andamento",
  aguardando: "Aguardando",
  concluido: "Concluído",
};

export function normalizeChamadoStatus(status?: string | null): ChamadoStatus | null {
  if (!status) return null;

  const key = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return STATUS_BY_KEY[key] ?? null;
}

export function isChamadoStatus(status: string): status is ChamadoStatus {
  return normalizeChamadoStatus(status) === status;
}
