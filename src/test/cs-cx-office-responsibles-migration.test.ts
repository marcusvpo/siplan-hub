import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260824130000_cs_cx_multiple_office_responsibles.sql",
  ),
  "utf8",
);

describe("CS/CX multiple office responsibles migration", () => {
  it("creates and backfills the many-to-many relationship", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.cs_cx_registry_office_responsibles",
    );
    expect(migration).toContain("office.analyst_profile_id IS NOT NULL");
    expect(migration).toContain("UNIQUE (registry_office_id, profile_id)");
  });

  it("saves all selected profiles while preserving the legacy primary analyst", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office_v4",
    );
    expect(migration).toContain("p_responsible_profile_ids UUID[]");
    expect(migration).toContain("primary_responsible_id");
    expect(migration).toContain("public.cs_cx_save_registry_office_v3");
  });

  it("scopes office-related records by any assigned responsible", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.cs_cx_can_view_office_record",
    );
    expect(migration).toContain(
      "public.cs_cx_is_office_responsible(p_registry_office_id, auth.uid())",
    );
    for (const table of [
      "cs_cx_registry_offices",
      "cs_cx_requests",
      "cs_cx_contacts",
      "cs_cx_appointments",
      "cs_cx_office_routines",
      "cs_cx_visits",
      "cs_cx_nps_invitations",
    ]) {
      expect(migration).toContain(`ON public.${table}`);
    }
  });
});
