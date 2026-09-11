import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("filtros de grupo e analista na Consulta de Chamados", () => {
  it("envia os filtros pela fila e os aplica na origem Ellevo", () => {
    const hook = readSource("src/hooks/useChamados0800.ts");
    const worker = readSource("vm-worker/src/chamadosSync.ts");

    expect(hook).toContain("groups?: string[] | null");
    expect(hook).toContain("analysts?: string[] | null");
    expect(hook).toContain("groups: filters.groups ?? []");
    expect(hook).toContain("analysts: filters.analysts ?? []");
    expect(worker).toContain("c.EquipeResponsavelChamado");
    expect(worker).toContain("c.ResponsavelChamado AS AnalistaResponsavel");
    expect(worker).toContain("PARTITION BY c.NumeroChamado");
    expect(worker).toContain("r.AnalistaResponsavel?.trim() || null");
    expect(worker).toContain("filters.groups && filters.groups.length > 0");
    expect(worker).toContain("filters.analysts && filters.analysts.length > 0");
  });

  it("filtra o espelho e oferece seletores pesquisaveis nas duas rotas", () => {
    const hook = readSource("src/hooks/useChamados0800.ts");
    const page = readSource("src/pages/DeploymentsTickets.tsx");

    expect(hook).toContain('q = q.in("equipe_responsavel", groups)');
    expect(hook).toContain('q = q.in("analista_responsavel", analysts)');
    expect(hook).toContain('supabase.rpc("get_chamados_assignment_options"');
    expect(page).toContain("Grupo responsável");
    expect(page).toContain("Analista responsável");
    expect(page).toContain('searchPlaceholder="Buscar analista por nome..."');
    expect(page).toContain("groups: selectedGroups.length > 0");
    expect(page).toContain("analysts: selectedAnalysts.length > 0");
  });

  it("migra o schema, preserva RLS e publica o changelog por permissao", () => {
    const migration = readSource(
      "supabase/migrations/20260911120000_chamados_group_analyst_filters.sql",
    );
    const types = readSource("src/integrations/supabase/types.ts");

    expect(migration).toContain("add column if not exists analista_responsavel text");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("grant execute on function public.get_chamados_assignment_options(text) to authenticated");
    expect(migration).toContain("'chamados_query'");
    expect(migration).toContain("'chamados_legacy_query'");
    expect(migration).not.toMatch(/grant execute[^;]+to public/i);
    expect(types).toContain("analista_responsavel: string | null");
  });
});
