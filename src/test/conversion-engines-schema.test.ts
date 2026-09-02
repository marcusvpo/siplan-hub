import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260902111500_conversion_engines_manual_registry.sql",
  ),
  "utf8",
);
const lifecycleMigration = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260902114500_conversion_engines_lifecycle_statuses.sql",
  ),
  "utf8",
);
const specialtyMigration = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260902131500_conversion_engines_specialty_delete.sql",
  ),
  "utf8",
);
const types = readFileSync(
  resolve(root, "src/integrations/supabase/types.ts"),
  "utf8",
);

describe("cadastro manual de motores de conversão", () => {
  it("persiste o trajeto, o link e as observações", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.conversion_engines");
    expect(migration).toContain("source_system TEXT NOT NULL");
    expect(migration).toContain("target_system TEXT NOT NULL");
    expect(migration).toContain("devops_url TEXT");
    expect(migration).toContain("notes TEXT");

    expect(types).toContain("export type ConversionEngineRow");
    expect(types).toContain("source_system: string");
    expect(types).toContain("target_system: string");
    expect(types).toContain("devops_url: string | null");
  });

  it("usa apenas os status do ciclo de vida do motor", () => {
    const statuses = "'in_development', 'maintenance', 'finished'";

    expect(migration).toContain(`CHECK (status IN (${statuses}))`);
    expect(lifecycleMigration).toContain(`CHECK (status IN (${statuses}))`);
    expect(lifecycleMigration).toContain("ALTER COLUMN status SET DEFAULT 'in_development'");
    expect(types).toContain('"in_development" | "maintenance" | "finished"');
  });

  it("restringe a especialidade e protege a exclusão por permissão", () => {
    expect(specialtyMigration).toContain("ADD COLUMN IF NOT EXISTS specialty TEXT");
    expect(specialtyMigration).toContain(
      "specialty IN ('tn_rc', 'protest', 'ri_td')",
    );
    expect(specialtyMigration).toContain("FOR DELETE TO authenticated");
    expect(specialtyMigration).toContain("'conversion_engines', 'delete'");
    expect(specialtyMigration).not.toMatch(/\sTO\s+(public|anon)\b/i);
    expect(types).toContain('specialty: "tn_rc" | "protest" | "ri_td" | null');
  });

  it("protege leitura, cadastro e edição com permissões distintas", () => {
    expect(migration).toContain("ALTER TABLE public.conversion_engines ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FOR SELECT TO authenticated");
    expect(migration).toContain("'conversion_engines', 'view'");
    expect(migration).toContain("FOR INSERT TO authenticated");
    expect(migration).toContain("'conversion_engines', 'create'");
    expect(migration).toContain("FOR UPDATE TO authenticated");
    expect(migration).toContain("'conversion_engines', 'edit'");
    expect(migration).not.toMatch(/\sTO\s+(public|anon)\b/i);
  });
});
