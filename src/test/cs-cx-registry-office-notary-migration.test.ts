import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isMissingRegistryOfficeNotaryName,
  isMissingSaveRegistryOfficeV5,
} from "@/hooks/useCsCxCore";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const migration = readSource(
  "supabase/migrations/20260930100000_add_cs_cx_registry_office_notary_name.sql",
);
const compatibilityFixChangelog = readSource(
  "supabase/migrations/20260930130000_cs_cx_registry_office_schema_compatibility_fix_changelog.sql",
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
    expect(hook).toContain("p_notary_name: notaryName");
    expect(types).toContain("export type CsCxRegistryOfficeRow");
    expect(types).toContain("notary_name: string | null");
    expect(types).toContain("export type CsCxSaveRegistryOfficeV5Args");
    expect(types).toContain("p_notary_name: string | null");
  });

  it("retries the legacy select only when notary_name is unavailable", () => {
    expect(
      isMissingRegistryOfficeNotaryName({
        code: "PGRST204",
        message:
          "Could not find the 'notary_name' column of 'cs_cx_registry_offices' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingRegistryOfficeNotaryName({
        code: "42703",
        message: "column cs_cx_registry_offices.notary_name does not exist",
      }),
    ).toBe(true);
    expect(
      isMissingRegistryOfficeNotaryName({
        code: "42501",
        message: "permission denied for column notary_name",
      }),
    ).toBe(false);
    expect(
      isMissingRegistryOfficeNotaryName({
        code: "PGRST204",
        message: "Could not find the 'sap_code' column in the schema cache",
      }),
    ).toBe(false);

    expect(hook).toContain(
      'const LEGACY_REGISTRY_OFFICE_SELECT = REGISTRY_OFFICE_SELECT.replace(',
    );
    expect(hook).toContain(
      "officesResult = await fetchRegistryOffices(LEGACY_REGISTRY_OFFICE_SELECT)",
    );
    expect(hook).toContain("if (!isMissingRegistryOfficeNotaryName(officesResult.error))");
    expect(hook).toContain("notary_name: office.notary_name ?? null");
  });

  it("falls back to RPC v4 only for a missing v5 and never discards notary_name", () => {
    expect(
      isMissingSaveRegistryOfficeV5({
        code: "PGRST202",
        message:
          "Could not find the function public.cs_cx_save_registry_office_v5(p_id) in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingSaveRegistryOfficeV5({
        code: "42501",
        message: "permission denied for function cs_cx_save_registry_office_v5",
      }),
    ).toBe(false);
    expect(
      isMissingSaveRegistryOfficeV5({
        code: "PGRST202",
        message: "Could not find the function public.another_function in the schema cache",
      }),
    ).toBe(false);

    expect(hook).toContain("const notaryName = emptyToNull(input.notary_name)");
    expect(hook).toContain("if (!isMissingSaveRegistryOfficeV5(saveResult.error))");
    expect(hook).toMatch(
      /if \(notaryName\) \{[\s\S]*?throw new Error\([\s\S]*?notary_name[\s\S]*?\);[\s\S]*?\}[\s\S]*?db\.rpc\("cs_cx_save_registry_office_v4", payload\)/,
    );
    expect(hook).toContain('db.rpc("cs_cx_save_registry_office_v5", {\n        ...payload,');
    expect(hook).toContain("p_responsible_profile_ids: input.responsible_profile_ids");
    expect(hook).toContain("p_products: input.products.map");
    expect(hook).toContain("p_responsibles: input.products.flatMap");
  });

  it("publishes the idempotent schema compatibility fix changelog", () => {
    expect(compatibilityFixChangelog).toContain("category,");
    expect(compatibilityFixChangelog).toContain("'changelog',");
    expect(compatibilityFixChangelog).toContain("type,");
    expect(compatibilityFixChangelog).toContain("'release_fix',");
    expect(compatibilityFixChangelog).toContain("permission_resource,");
    expect(compatibilityFixChangelog).toContain("'cs_cx_cartorios',");
    expect(compatibilityFixChangelog).toContain(
      "'Compatibilidade no cadastro de cartórios CS/CX',",
    );
    expect(compatibilityFixChangelog).toContain("'/cs-cx/cartorios'");
    expect(compatibilityFixChangelog).toContain("WHERE NOT EXISTS (");
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
