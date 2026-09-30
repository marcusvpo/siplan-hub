import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260930140000_sync_conversion_queue_project_status.sql",
  ),
  "utf8",
);

describe("sincronização do status da fila de conversão", () => {
  it("corrige registros existentes cujo estágio do projeto já foi finalizado", () => {
    expect(migration).toContain("UPDATE public.conversion_queue AS queue_item");
    expect(migration).toContain("project.conversion_status = 'done'");
    expect(migration).toContain("queue_status = 'done'");
  });

  it("mantém futuras finalizações sincronizadas por trigger", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.sync_conversion_queue_project_status()");
    expect(migration).toContain("AFTER INSERT OR UPDATE OF conversion_status ON public.projects");
    expect(migration).toContain("EXECUTE FUNCTION public.sync_conversion_queue_project_status()");
  });

  it("registra a correção no changelog da Gestão de Atividades", () => {
    expect(migration).toContain("'release_fix'");
    expect(migration).toContain("'conversion_home'");
    expect(migration).toContain("'/conversion/atividades'");
  });
});
