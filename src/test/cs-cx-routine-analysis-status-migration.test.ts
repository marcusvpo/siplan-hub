import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260930150000_cs_cx_routine_analysis_status_fix.sql"),
  "utf8",
);

describe("CS/CX registry office analysis status migration", () => {
  it("creates the expected secured RPC signature", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.cs_cx_set_registry_office_analysis_status(",
    );
    expect(migration).toContain("p_registry_office_id UUID");
    expect(migration).toContain("p_is_analyzed BOOLEAN");
    expect(migration).toContain("RETURNS UUID");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
    expect(migration).toContain("RETURN updated_id;");
  });

  it("updates only the analysis status fields", () => {
    const assignments = migration.match(
      /UPDATE public\.cs_cx_registry_offices\s+SET([\s\S]*?)\s+WHERE id = p_registry_office_id/,
    )?.[1];
    expect(assignments).toBeDefined();
    expect(
      Array.from(assignments?.matchAll(/^\s*([a-z_]+)\s*=/gm) ?? [], (match) => match[1]),
    ).toEqual(["is_analyzed", "analysis_at", "updated_at"]);
  });

  it("enforces authentication, permission and explicit errors", () => {
    for (const expected of [
      "IF auth.uid() IS NULL THEN",
      "FROM public.cs_cx_office_routines routine",
      "public.cs_cx_can_manage_office_record(",
      "'cs_cx_rotinas'",
      "'edit'",
      "routine.applied_by",
      "routine.registry_office_id",
      "IF NOT EXISTS (",
      "IF updated_id IS NULL THEN",
    ]) {
      expect(migration).toContain(expected);
    }
    expect(migration.match(/RAISE EXCEPTION/g)).toHaveLength(5);
  });

  it("restricts execution to authenticated users", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.cs_cx_set_registry_office_analysis_status(UUID, BOOLEAN)",
    );
    expect(migration).toContain("FROM PUBLIC, anon;");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.cs_cx_set_registry_office_analysis_status(UUID, BOOLEAN)",
    );
    expect(migration).toContain("TO authenticated;");
  });

  it("publishes the idempotent fix changelog", () => {
    for (const expected of [
      "INSERT INTO public.notifications",
      "'changelog'",
      "'release_fix'",
      "'cs_cx_rotinas'",
      "'Correção do status de análise nas rotinas CS/CX'",
      "interruptor de análise e os contadores",
      "'/cs-cx/rotinas'",
      "WHERE NOT EXISTS (",
    ]) {
      expect(migration).toContain(expected);
    }
  });
});
