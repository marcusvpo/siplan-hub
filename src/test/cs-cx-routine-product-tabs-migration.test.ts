import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260824143000_cs_cx_bulk_routine_analysis_by_product.sql",
  ),
  "utf8",
);

describe("migração da análise de rotinas por produto", () => {
  it("aceita uma lista opcional de modelos no processamento em massa", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.cs_cx_set_routine_items_bulk_v3",
    );
    expect(migration).toContain("p_routine_model_ids UUID[] DEFAULT NULL");
    expect(migration).toContain(
      "routine.routine_model_id = ANY(p_routine_model_ids)",
    );
  });

  it("mantém permissão, histórico e execução restrita a usuários autenticados", () => {
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit')",
    );
    expect(migration).toContain("INSERT INTO public.cs_cx_routine_history");
    expect(migration).toContain(
      "UUID, BOOLEAN, UUID[], TEXT, TEXT, TIMESTAMPTZ",
    );
    expect(migration).toContain("TO authenticated");
  });
});
