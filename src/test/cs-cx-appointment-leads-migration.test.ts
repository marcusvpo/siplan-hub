import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260824103000_cs_cx_appointment_leads.sql",
  ),
  "utf8",
);

describe("migração de leads nos agendamentos CS/CX", () => {
  it("adiciona os campos próprios do lead", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT false",
    );
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS lead_office_name TEXT");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS lead_contact_name TEXT");
  });

  it("impede misturar lead livre com cadastros vinculados", () => {
    expect(migration).toContain("registry_office_id IS NULL");
    expect(migration).toContain("contact_id IS NULL");
    expect(migration).toContain("NOT is_lead");
  });

  it("exige cartório e contato preenchidos para leads", () => {
    expect(migration).toContain("NULLIF(trim(lead_office_name), '') IS NOT NULL");
    expect(migration).toContain("NULLIF(trim(lead_contact_name), '') IS NOT NULL");
  });
});
