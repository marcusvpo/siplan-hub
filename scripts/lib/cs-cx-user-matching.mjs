export function matchLegacyUsers(legacyUsers, profiles) {
  const profilesByEmail = groupBy(profiles, (profile) => normalizeEmail(profile.email));
  const profilesByName = groupBy(profiles, (profile) => normalizeName(profile.full_name));

  return legacyUsers.map((legacy) => {
    const emailMatches = profilesByEmail.get(normalizeEmail(legacy.email)) ?? [];
    const nameMatches = profilesByName.get(normalizeName(legacy.nome_completo)) ?? [];
    let candidates;
    let status;

    if (emailMatches.length === 1) {
      candidates = emailMatches;
      status = 'exact_email';
    } else if (emailMatches.length > 1) {
      candidates = emailMatches;
      status = 'ambiguous';
    } else if (nameMatches.length === 1) {
      candidates = nameMatches;
      status = 'suggested_name';
    } else if (nameMatches.length > 1) {
      candidates = nameMatches;
      status = 'ambiguous';
    } else {
      candidates = [];
      status = 'unmatched';
    }

    return {
      legacy_id: legacy.id,
      legacy_username: legacy.username,
      legacy_email: legacy.email,
      legacy_name: legacy.nome_completo,
      legacy_active: legacy.ativo,
      status,
      profile_id: candidates.map((profile) => profile.id).join('|'),
      profile_email: candidates.map((profile) => profile.email ?? '').join('|'),
      profile_name: candidates.map((profile) => profile.full_name ?? '').join('|'),
    };
  });
}

export function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function groupBy(rows, selector) {
  const groups = new Map();
  for (const row of rows) {
    const value = selector(row);
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return groups;
}

function normalizeEmail(value) {
  return value?.trim().toLocaleLowerCase('pt-BR') ?? '';
}

function normalizeName(value) {
  return value?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR') ?? '';
}
