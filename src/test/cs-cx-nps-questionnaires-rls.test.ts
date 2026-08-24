import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260824143000_fix_cs_cx_nps_questionnaires_rls.sql",
  ),
  "utf8",
);

describe("CS/CX NPS questionnaires RLS migration", () => {
  it("remove as políticas com restrição individual de autor para questionários", () => {
    expect(migration).toContain(
      "DROP POLICY IF EXISTS cs_cx_nps_questionnaires_read ON public.cs_cx_nps_questionnaires;",
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS cs_cx_nps_questionnaires_create ON public.cs_cx_nps_questionnaires;",
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS cs_cx_nps_questionnaires_edit ON public.cs_cx_nps_questionnaires;",
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS cs_cx_nps_questionnaires_delete ON public.cs_cx_nps_questionnaires;",
    );
  });

  it("permite leitura de questionários a todos os usuários com permissão de visualização do módulo", () => {
    expect(migration).toContain("CREATE POLICY cs_cx_nps_questionnaires_read");
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_nps', 'view')",
    );
    expect(migration).not.toContain("cs_cx_can_view_owned");
  });

  it("mantém controle de gestão para administradores e editores", () => {
    expect(migration).toContain("CREATE POLICY cs_cx_nps_questionnaires_create");
    expect(migration).toContain("CREATE POLICY cs_cx_nps_questionnaires_edit");
    expect(migration).toContain("CREATE POLICY cs_cx_nps_questionnaires_delete");
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_nps', 'create')",
    );
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_nps', 'edit')",
    );
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_nps', 'delete')",
    );
  });
});
