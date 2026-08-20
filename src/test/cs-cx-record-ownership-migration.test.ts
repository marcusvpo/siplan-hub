import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260820110000_cs_cx_record_ownership_permissions.sql",
  ),
  "utf8",
);

const ownedResources = [
  "cs_cx_registros",
  "cs_cx_cartorios",
  "cs_cx_contatos",
  "cs_cx_agendamentos",
  "cs_cx_rotinas",
  "cs_cx_visitas",
  "cs_cx_nps",
];

describe("CS/CX record ownership migration", () => {
  it.each(ownedResources)("cria permissões de terceiros para %s", (resource) => {
    expect(migration).toContain(`('${resource}', 'view_others'`);
    expect(migration).toContain(`('${resource}', 'manage_others'`);
  });

  it("protege leitura e alteração com funções de propriedade", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_can_view_owned");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_can_manage_owned");
    expect(migration).toContain("CREATE POLICY cs_cx_requests_read");
    expect(migration).toContain("CREATE POLICY cs_cx_requests_edit");
    expect(migration).toContain("CREATE POLICY cs_cx_nps_responses_delete");
  });

  it("preserva inicialmente o acesso dos perfis existentes", () => {
    expect(migration).toContain("Mantém o acesso que cada perfil já possuía");
    expect(migration).toContain("ON CONFLICT (access_profile_id, permission_id) DO NOTHING");
  });
});
