import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260916183000_add_cs_cx_contact_alert.sql",
  ),
  "utf8",
);

describe("persistencia do alerta de contatos CS/CX", () => {
  it("adiciona a coluna booleana com default seguro", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS is_alert BOOLEAN NOT NULL DEFAULT false",
    );
  });

  it("substitui a RPC sem manter overload ambiguo", () => {
    expect(
      migration.match(
        /DROP FUNCTION IF EXISTS public\.cs_cx_save_contact\(/g,
      ),
    ).toHaveLength(2);
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.cs_cx_save_contact(",
    );
    expect(migration).toContain("p_is_alert BOOLEAN DEFAULT false");
  });

  it("preserva validacoes e permissoes de criacao e edicao", () => {
    expect(migration).toContain("IF auth.uid() IS NULL THEN");
    expect(migration).toContain(
      "COALESCE(array_length(p_product_ids, 1), 0) = 0",
    );
    expect(migration).toContain("NULLIF(trim(p_contact_person), '') IS NULL");
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_contatos', 'create')",
    );
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_contatos', 'edit')",
    );
    expect(migration).toContain("RAISE EXCEPTION 'Contato nao encontrado'");
  });

  it("persiste o alerta em inclusoes e edicoes", () => {
    expect(migration).toMatch(
      /INSERT INTO public\.cs_cx_contacts[\s\S]*origin, source_present, is_alert\)[\s\S]*COALESCE\(p_is_alert, false\)/,
    );
    expect(migration).toContain(
      "is_alert = COALESCE(p_is_alert, false)",
    );
  });

  it("mantem a RPC sob RLS e executavel somente por authenticated", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).not.toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public, pg_temp");
    expect(migration).toContain(") FROM PUBLIC, anon;");
    expect(migration).toContain(") TO authenticated;");
    expect(migration.match(/GRANT EXECUTE ON FUNCTION/g)).toHaveLength(1);
    expect(migration).not.toMatch(/(?:CREATE|DROP|ALTER)\s+POLICY/i);
  });

  it("publica changelog idempotente para a tela de contatos", () => {
    expect(migration).toContain("INSERT INTO public.notifications");
    expect(migration).toContain("'changelog'");
    expect(migration).toContain("'release_improvement'");
    expect(migration).toContain("'cs_cx_contatos'");
    expect(migration).toContain("'/cs-cx/contatos'");
    expect(migration).toContain("WHERE NOT EXISTS (");
  });
});
