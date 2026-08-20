const OBSERVATION_LIST_PREFIX = "siplan-observations:v1:";

export function normalizeRoutineObservations(observations: string[]) {
  return observations.map((observation) => observation.trim()).filter(Boolean);
}

export function encodeRoutineObservations(observations: string[]) {
  const normalized = normalizeRoutineObservations(observations);
  return normalized.length ? `${OBSERVATION_LIST_PREFIX}${JSON.stringify(normalized)}` : "";
}

export function decodeRoutineObservations(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return [];
  if (!normalized.startsWith(OBSERVATION_LIST_PREFIX)) return [normalized];

  try {
    const parsed = JSON.parse(normalized.slice(OBSERVATION_LIST_PREFIX.length));
    return Array.isArray(parsed)
      ? normalizeRoutineObservations(parsed.filter((item): item is string => typeof item === "string"))
      : [normalized];
  } catch {
    return [normalized];
  }
}

export function formatRoutineObservations(value: string | null | undefined) {
  const observations = decodeRoutineObservations(value);
  return observations.map((observation, index) => `${index + 1}. ${observation}`).join("\n");
}
