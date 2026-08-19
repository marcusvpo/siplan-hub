import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812106000_cs_cx_routine_history_context.sql"),
  "utf8",
);

describe("contexto do histórico de rotinas CS/CX", () => {
  it("mantém snapshots dos relacionamentos que podem ser excluídos", () => {
    expect(migration).toContain("ADD COLUMN registry_office_name TEXT");
    expect(migration).toContain("ADD COLUMN routine_model_name TEXT");
    expect(migration).toContain("ADD COLUMN model_item_name TEXT");
    expect(migration).toContain("ADD COLUMN actor_name TEXT");
  });

  it("preenche registros existentes e os próximos eventos automaticamente", () => {
    expect(migration.match(/UPDATE public\.cs_cx_routine_history history/g)).toHaveLength(4);
    expect(migration).toContain("BEFORE INSERT OR UPDATE OF office_routine_id, model_item_id, actor_profile_id, legacy_user_id");
    expect(migration).toContain("cs_cx_fill_routine_history_context()");
    expect(migration).toContain("history.legacy_user_id = user_map.legacy_id");
  });

  it("audita o desvínculo antes de remover a aplicação", () => {
    expect(migration).toContain("BEFORE DELETE ON public.cs_cx_office_routines");
    expect(migration).toContain("'DESVINCULADO'");
    expect(migration).toContain("auth.uid(), 'hub', true");
  });
});
