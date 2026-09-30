import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const migration = readSource(
  "supabase/migrations/20260930100000_add_cs_cx_registry_office_notary_name.sql",
);
const hook = readSource("src/hooks/useCsCxCore.ts");
const types = readSource("src/integrations/supabase/types.ts");

describe("CS/CX registry office notary persistence", () => {
  it("adds the nullable column idempotently", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS notary_name TEXT");
  });

  it("persists notary_name in the primary insert and update statements", () => {
    expect(migration).toContain("INSERT INTO public.cs_cx_registry_offices (");
    expect(migration).toContain("name,");
    expect(migration).toContain("notary_name,");
    expect(migration).toContain("sap_code");
    expect(migration).toContain("SET name = trim(p_name),");
    expect(migration).toContain("notary_name = NULLIF(trim(p_notary_name), '')");
    expect(migration).not.toContain("public.cs_cx_save_registry_office_v4(");
  });

  it("enforces granular create and ownership-aware edit permissions", () => {
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_cartorios', 'create')",
    );
    expect(migration).toContain("public.cs_cx_can_manage_office_record(");
    expect(migration).toContain("'cs_cx_cartorios',");
    expect(migration).toContain("'edit',");
    expect(migration).toContain("office.created_by");
    expect(migration).toContain("office.id");
  });

  it("preserves products, product responsibles and multiple office responsibles", () => {
    expect(migration).toContain("public.cs_cx_registry_office_products");
    expect(migration).toContain("public.cs_cx_registry_office_product_responsibles");
    expect(migration).toContain("public.cs_cx_registry_office_responsibles");
    expect(migration).toContain("analyst_profile_id = primary_responsible_id");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain(") TO authenticated;");
    expect(migration).not.toMatch(/(?:CREATE|DROP|ALTER)\s+POLICY/i);
  });

  it("connects the select, input, RPC and Supabase types", () => {
    expect(hook).toContain("notary_name: string | null");
    expect(hook).toContain("notary_name?: string");
    expect(hook).toContain("id, legacy_id, name, notary_name, sap_code");
    expect(hook).toContain('db.rpc("cs_cx_save_registry_office_v5"');
    expect(hook).toContain("p_notary_name: emptyToNull(input.notary_name)");
    expect(types).toContain("export type CsCxRegistryOfficeRow");
    expect(types).toContain("notary_name: string | null");
    expect(types).toContain("export type CsCxSaveRegistryOfficeV5Args");
    expect(types).toContain("p_notary_name: string | null");
  });

  it("publishes the required idempotent changelog", () => {
    expect(migration).toContain("INSERT INTO public.notifications");
    expect(migration).toContain("'changelog'");
    expect(migration).toContain("'release_improvement'");
    expect(migration).toContain("'cs_cx_cartorios'");
    expect(migration).toContain("'/cs-cx/cartorios'");
    expect(migration).toContain("WHERE NOT EXISTS (");
  });
});
