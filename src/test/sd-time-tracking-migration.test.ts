import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828213000_sd_time_tracking.sql"),
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
});
