export function resolveConversionQueueStatus(
  queueStatus: string | null | undefined,
  projectConversionStatus: string | null | undefined,
): string {
  // O estágio do projeto é a fonte de verdade para a conclusão. Os demais
  // estados continuam vindo da fila, que possui etapas mais específicas.
  if (projectConversionStatus === "done") return "done";

  return queueStatus || "pending";
}
