import { describe, expect, it } from "vitest";
import {
  mergeCredentialsIntoCustomFields,
  mergeCredentialsIntoProjectRow,
  mergeVaultCredentialsPayload,
  splitCustomFieldsForVault,
} from "@/utils/project-credentials";
import { extractSkillsBadgeMetadata } from "@/hooks/useSiplanSkillsIntegration";

describe("project-credentials vault helpers", () => {
  it("separa chaves sensiveis para o cofre preservando metadados publicos e dtc nao-sensivel", () => {
    const { publicCustomFields, credentialsPayload, hasCredentialFields } = splitCustomFieldsForVault({
      environment_kanban_status: "in_progress",
      environment_has_pendings: false,
      skills_username: "01tn.teste",
      skills_cartorio_id: "cart-1",
      skills_login_token: "CART999999",
      environment_postgres_password: "secret-pg",
      environment_anydesk_password: "secret-any",
      environment_orion_admin_config: "urlAdminCentral=https://exemplo\nsenhaAdminCentral=abc",
      dtc: {
        status: "approved",
        clientResponsible: "Joao",
        postgresPassword: "dtc-pg-secret",
        remoteAccessList: [{ system: "AnyDesk", id: "123", password: "456" }],
      },
    });

    expect(hasCredentialFields).toBe(true);
    expect(publicCustomFields).toEqual({
      environment_kanban_status: "in_progress",
      environment_has_pendings: false,
      environment_orion_admin_configured: true,
      skills_username: "01tn.teste",
      skills_cartorio_id: "cart-1",
      dtc: {
        status: "approved",
        clientResponsible: "Joao",
      },
    });
    expect(credentialsPayload).toEqual({
      skills_login_token: "CART999999",
      environment_postgres_password: "secret-pg",
      environment_anydesk_password: "secret-any",
      environment_orion_admin_config: "urlAdminCentral=https://exemplo\nsenhaAdminCentral=abc",
      dtc_credentials: {
        postgresPassword: "dtc-pg-secret",
        remoteAccessList: [{ system: "AnyDesk", id: "123", password: "456" }],
      },
    });
  });

  it("hidrata project row com credenciais do cofre sem mutar a linha original", () => {
    const rawRow = {
      id: "proj-1",
      custom_fields: {
        skills_username: "ri.exemplo",
        dtc: { status: "submitted" },
      },
    };
    const merged = mergeCredentialsIntoProjectRow(rawRow, {
      skills_login_token: "CART1234",
      environment_postgres_password: "pg-password",
      dtc_credentials: {
        postgresPassword: "dtc-password",
      },
    });

    expect((merged.custom_fields as Record<string, unknown>).skills_login_token).toBe("CART1234");
    expect((merged.custom_fields as Record<string, unknown>).environment_postgres_password).toBe("pg-password");
    expect(((merged.custom_fields as Record<string, unknown>).dtc as Record<string, unknown>).postgresPassword).toBe("dtc-password");
    expect(((merged.custom_fields as Record<string, unknown>).dtc as Record<string, unknown>).status).toBe("submitted");
    expect((rawRow.custom_fields as Record<string, unknown>).skills_login_token).toBeUndefined();
  });

  it("mescla payload incremental de credenciais mantendo dtc_credentials existente", () => {
    const merged = mergeVaultCredentialsPayload(
      {
        environment_postgres_password: "old",
        dtc_credentials: { soPassword: "so-1" },
      },
      {
        environment_postgres_password: "new",
        dtc_credentials: { postgresPassword: "pg-2" },
      },
    );

    expect(merged).toEqual({
      environment_postgres_password: "new",
      dtc_credentials: {
        soPassword: "so-1",
        postgresPassword: "pg-2",
      },
    });
  });

  it("mantem mergeCredentialsIntoCustomFields compativel quando cofre esta vazio", () => {
    const cf = { skills_username: "02tn.teste" };
    expect(mergeCredentialsIntoCustomFields(cf, null)).toBe(cf);
  });

  it("permite badge do Siplan Skills sem exigir skills_login_token na listagem", () => {
    const meta = extractSkillsBadgeMetadata({
      skills_username: "ri.olimpia",
      skills_cartorio_id: "50168a96-1c3b-4b51-b00b-486b2508272b",
      skills_last_activity: "2026-11-20T12:00:00Z",
      skills_session_is_active: true,
    });

    expect(meta).toEqual({
      cartorioId: "50168a96-1c3b-4b51-b00b-486b2508272b",
      username: "ri.olimpia",
      lastActivity: "2026-11-20T12:00:00Z",
      sessionIsActive: true,
    });
  });
});
