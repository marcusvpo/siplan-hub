import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828213000_sd_time_tracking.sql"),
  "utf8",
);

const richDescriptionMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260828223000_sd_time_rich_description.sql",
  ),
  "utf8",
);

const ellevoImportMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260828233000_sd_time_ellevo_import.sql",
  ),
  "utf8",
);

describe("migration de gerenciamento de horas do SD", () => {
  it("cria lançamentos, intervalos e operações atômicas", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.sd_time_entries");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.sd_time_intervals");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.save_sd_time_entry");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.delete_sd_time_entry");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_sd_time_management");
  });

  it("mantém escrita restrita ao usuário autenticado", () => {
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("'sd_time_entries', 'create'");
    expect(migration).toContain("'sd_time_entries', 'edit'");
    expect(migration).toContain("'sd_time_entries', 'delete'");
  });

  it("exige permissão própria para a consulta da equipe", () => {
    expect(migration).toContain("'sd_time_management', 'view'");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_sd_time_management");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_sd_time_management");
  });

  it("acomoda a serialização do editor rico na descrição", () => {
    expect(richDescriptionMigration).toContain(
      "DROP CONSTRAINT IF EXISTS sd_time_entries_description_length",
    );
    expect(richDescriptionMigration).toContain("char_length(description) <= 20000");
  });

  it("cria uma fila segura e uma importação idempotente do 0800", () => {
    expect(ellevoImportMigration).toContain(
      "CREATE TABLE IF NOT EXISTS public.sd_time_import_requests",
    );
    expect(ellevoImportMigration).toContain("CREATE OR REPLACE FUNCTION public.request_sd_time_import");
    expect(ellevoImportMigration).toContain("CREATE OR REPLACE FUNCTION public.claim_sd_time_import_request");
    expect(ellevoImportMigration).toContain("CREATE OR REPLACE FUNCTION public.complete_sd_time_import");
    expect(ellevoImportMigration).toContain("ON CONFLICT (source, source_external_id)");
    expect(ellevoImportMigration).toContain("'ellevo_0800'");
    expect(ellevoImportMigration).toContain("user_id = auth.uid()");
  });
});
