import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260818170000_canonicalize_chamados_clients_by_code.sql",
  ),
  "utf8",
);
const optimizationMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260818172000_optimize_chamados_client_options.sql",
  ),
  "utf8",
);

describe("opcoes de clientes da Consulta de Chamados", () => {
  it("consolida nomes historicos pelo codigo estavel do cliente", () => {
    expect(migration).toContain("nullif(btrim(cpv.codigo_cliente), '')");
    expect(migration).toContain("row_number() over");
    expect(migration).toContain("where ranked_clients.position = 1");
  });

  it("prefere o nome mais recentemente sincronizado", () => {
    expect(migration).toContain("cpv.synced_at desc nulls last");
    expect(migration).toContain("cpv.data_abertura desc nulls last");
  });

  it("continua restrita aos chamados Orion e a usuarios autenticados", () => {
    expect(migration).toContain("lower(btrim(cpv.software)) like 'orion%'");
    expect(migration).toContain(
      "grant execute on function public.get_distinct_chamados_clientes() to authenticated",
    );
  });

  it("expoe codigo e aliases para corrigir selecoes antigas na tela", () => {
    expect(migration).toContain("get_chamados_client_options()");
    expect(migration).toContain("codigo_cliente text");
    expect(migration).toContain("aliases text[]");
    expect(migration).toContain("array_agg(distinct source_rows.source_name");
  });

  it("usa um catalogo incremental para responder dentro do timeout da API", () => {
    expect(optimizationMigration).toContain("create table if not exists public.chamados_cliente_aliases");
    expect(optimizationMigration).toContain("track_chamados_cliente_alias_trigger");
    expect(optimizationMigration).toContain("from public.chamados_cliente_aliases as catalog");
    expect(optimizationMigration).toContain("notify pgrst, 'reload schema'");
  });
});
