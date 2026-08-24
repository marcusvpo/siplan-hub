const APPOINTMENT_OBSERVATIONS_PREFIX = "siplan-appointment-observations:v1:";

export function normalizeAppointmentObservations(observations: string[]) {
  return observations.map((observation) => observation.trim()).filter(Boolean);
}

export function encodeAppointmentObservations(observations: string[]) {
  const normalized = normalizeAppointmentObservations(observations);
  return normalized.length
    ? `${APPOINTMENT_OBSERVATIONS_PREFIX}${JSON.stringify(normalized)}`
    : "";
}

export function decodeAppointmentObservations(
  value: string | null | undefined,
) {
  const normalized = value?.trim();
  if (!normalized) return [];
  if (!normalized.startsWith(APPOINTMENT_OBSERVATIONS_PREFIX)) {
    return [normalized];
  }

  try {
    const parsed = JSON.parse(
      normalized.slice(APPOINTMENT_OBSERVATIONS_PREFIX.length),
    );
    return Array.isArray(parsed)
      ? normalizeAppointmentObservations(
          parsed.filter((item): item is string => typeof item === "string"),
        )
      : [normalized];
  } catch {
    return [normalized];
  }
}

export function formatAppointmentObservations(
  value: string | null | undefined,
) {
  return decodeAppointmentObservations(value)
    .map((observation, index) => `${index + 1}. ${observation}`)
    .join("\n");
}
