export const PROJECT_CREDENTIAL_KEYS = [
  "environment_anydesk_id",
  "environment_anydesk_password",
  "environment_so_login",
  "environment_so_password",
  "environment_os_type",
  "environment_os_credentials",
  "environment_remote_access_list",
  "environment_postgres_version",
  "environment_postgres_access_data",
  "environment_postgres_host",
  "environment_postgres_user",
  "environment_postgres_password",
  "environment_orion_admin_config",
  "skills_login_token",
] as const;

export const DTC_SECRET_KEYS = [
  "postgresPassword",
  "soPassword",
  "postgresAccessData",
  "remoteAccessList",
] as const;

const PROJECT_CREDENTIAL_KEY_SET = new Set<string>(PROJECT_CREDENTIAL_KEYS);
const DTC_SECRET_KEY_SET = new Set<string>(DTC_SECRET_KEYS);

export function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Mescla as credenciais descriptografadas do cofre `project_credentials`
 * em uma copia rasa de `custom_fields` para hidratar `ProjectV2`.
 */
export function mergeCredentialsIntoCustomFields(
  customFields: unknown,
  credentialsJsonb?: Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  if (!isPlainObjectRecord(credentialsJsonb) || Object.keys(credentialsJsonb).length === 0) {
    return isPlainObjectRecord(customFields) ? customFields : (customFields as Record<string, unknown> | undefined);
  }

  const base: Record<string, unknown> = isPlainObjectRecord(customFields)
    ? { ...customFields }
    : {};

  for (const key of PROJECT_CREDENTIAL_KEYS) {
    if (credentialsJsonb[key] !== undefined) {
      base[key] = credentialsJsonb[key];
    }
  }

  if (isPlainObjectRecord(credentialsJsonb.dtc_credentials)) {
    const existingDtc = isPlainObjectRecord(base.dtc) ? base.dtc : {};
    base.dtc = {
      ...existingDtc,
      ...credentialsJsonb.dtc_credentials,
    };
  }

  return base;
}

export function mergeCredentialsIntoProjectRow<T extends { custom_fields?: unknown }>(
  row: T,
  credentialsJsonb?: Record<string, unknown> | null,
): T {
  if (!isPlainObjectRecord(credentialsJsonb) || Object.keys(credentialsJsonb).length === 0) {
    return row;
  }

  return {
    ...row,
    custom_fields: mergeCredentialsIntoCustomFields(row.custom_fields, credentialsJsonb),
  };
}

/**
 * Separa metadados operacionais (que ficam em `projects.custom_fields`)
 * das credenciais sensiveis (que devem ir exclusivamente para `project_credentials`).
 */
export function splitCustomFieldsForVault(customFields: unknown): {
  publicCustomFields: unknown;
  credentialsPayload: Record<string, unknown>;
  hasCredentialFields: boolean;
} {
  if (!isPlainObjectRecord(customFields)) {
    return {
      publicCustomFields: customFields,
      credentialsPayload: {},
      hasCredentialFields: false,
    };
  }

  const publicCustomFields: Record<string, unknown> = {};
  const credentialsPayload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(customFields)) {
    if (PROJECT_CREDENTIAL_KEY_SET.has(key)) {
      if (value !== undefined) {
        credentialsPayload[key] = value;
        if (
          key === "environment_orion_admin_config" &&
          typeof value === "string" &&
          value.trim().length > 10 &&
          customFields.environment_orion_admin_configured === undefined
        ) {
          publicCustomFields.environment_orion_admin_configured = true;
        }
      }
      continue;
    }

    if (key === "dtc" && isPlainObjectRecord(value)) {
      const publicDtc: Record<string, unknown> = {};
      const dtcCredentials: Record<string, unknown> = {};

      for (const [dtcKey, dtcVal] of Object.entries(value)) {
        if (DTC_SECRET_KEY_SET.has(dtcKey)) {
          if (dtcVal !== undefined) {
            dtcCredentials[dtcKey] = dtcVal;
          }
        } else {
          publicDtc[dtcKey] = dtcVal;
        }
      }

      publicCustomFields.dtc = publicDtc;
      if (Object.keys(dtcCredentials).length > 0) {
        credentialsPayload.dtc_credentials = dtcCredentials;
      }
      continue;
    }

    publicCustomFields[key] = value;
  }

  return {
    publicCustomFields,
    credentialsPayload,
    hasCredentialFields: Object.keys(credentialsPayload).length > 0,
  };
}

export function mergeVaultCredentialsPayload(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const base = isPlainObjectRecord(existing) ? { ...existing } : {};
  const next: Record<string, unknown> = { ...base, ...incoming };

  if (isPlainObjectRecord(base.dtc_credentials) || isPlainObjectRecord(incoming.dtc_credentials)) {
    next.dtc_credentials = {
      ...(isPlainObjectRecord(base.dtc_credentials) ? base.dtc_credentials : {}),
      ...(isPlainObjectRecord(incoming.dtc_credentials) ? incoming.dtc_credentials : {}),
    };
  }

  return next;
}
