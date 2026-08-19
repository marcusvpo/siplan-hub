import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812104000_cs_cx_routine_administration.sql"),
  "utf8",
);

describe("migration de administração de rotinas CS/CX", () => {
  it("mantém as RPCs sob RLS e exige a permissão administrativa", () => {
    expect(migration.match(/SECURITY INVOKER/g)).toHaveLength(5);
    expect(migration).toContain("has_permission(auth.uid(), 'cs_cx_admin', 'manage')");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.cs_cx_save_routine_model");
  });

  it("propaga novos itens sem duplicar configurações", () => {
    expect(migration).toContain("INSERT INTO public.cs_cx_office_routine_items");
    expect(migration).toContain("ON CONFLICT (office_routine_id, model_item_id) DO NOTHING");
    expect(migration).toContain("'ITEM_ADICIONADO'");
  });

  it("protege modelos aplicados e registra a exclusão de itens", () => {
    expect(migration).toContain("o modelo possui % aplicação(ões)");
    expect(migration).toContain("'REMOVIDO_POR_EXCLUSAO_MODELO'");
    expect(migration).toContain("DELETE FROM public.cs_cx_office_routine_items WHERE model_item_id = p_id");
  });
});
