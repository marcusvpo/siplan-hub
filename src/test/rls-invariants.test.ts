import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Invariantes de RLS verificadas contra o banco de verdade.
 *
 * Existem por causa de dois incidentes em 15/07/2026:
 *  1. Dez tabelas estavam abertas ao role `anon` (TO public + USING true). A
 *     chave anon vai no bundle do site, entao qualquer um na internet lia e
 *     escrevia. Descoberto por acaso, olhando pg_policies.
 *  2. As guardas de rota trancaram o perfil 'user' fora do modulo de
 *     Implantadores, porque recursos novos so foram concedidos ao admin.
 *     Nenhum teste pegou: todos verificavam que o portao FECHA, nenhum
 *     verificava que ele ABRE para quem deve passar.
 *
 * Precisa de SUPABASE_DB_URL no .env. Sem ela os testes sao pulados, entao
 * isto nao quebra CI nem a maquina de quem nao tem acesso ao banco.
 */

function getDbUrl(): string | null {
  try {
    const env = readFileSync(resolve(__dirname, "../../.env"), "utf8");
    const line = env
      .split(/\r?\n/)
      .find((l) => l.startsWith("SUPABASE_DB_URL="));
    return line ? line.slice("SUPABASE_DB_URL=".length).trim() : null;
  } catch {
    return null;
  }
}

const dbUrl = getDbUrl();
const suite = dbUrl ? describe : describe.skip;

suite("invariantes de RLS (banco real)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let client: any;

  beforeAll(async () => {
    // Sem try/catch de proposito: se o pg ou a conexao falharem, o teste tem
    // que EXPLODIR. Na primeira versao isto era um catch silencioso, o client
    // ficava undefined, cada teste caia no early-return e a suite dizia
    // "4 passed" sem ter testado nada. Verde falso e pior que vermelho.
    const { Client } = await import("pg");
    client = new Client({
      connectionString: dbUrl!,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
  }, 30_000);

  afterAll(async () => {
    await client?.end?.().catch(() => {});
  });

  it("nenhuma tabela aceita ESCRITA de usuario anonimo", async () => {
    const { rows } = await client.query(`
      select tablename, cmd, policyname
      from pg_policies
      where schemaname = 'public'
        and 'public' = any(roles)
        and cmd in ('INSERT','UPDATE','DELETE','ALL')
        and coalesce(with_check::text, qual::text) = 'true'
      order by tablename, cmd
    `);
    // Cada linha aqui e uma tabela que um estranho sem conta consegue escrever.
    expect(rows).toEqual([]);
  });

  it("nenhuma tabela expoe LEITURA irrestrita ao anonimo fora das rotas publicas", async () => {
    // Estas tres sustentam /roadmap/:token e /public/checklist/:id.
    const permitidas = ["roadmaps", "commercial_checklists", "form_templates"];
    const { rows } = await client.query(
      `
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and cmd = 'SELECT'
        and ('public' = any(roles) or 'anon' = any(roles))
        and qual::text = 'true'
        and tablename <> all($1::text[])
      order by tablename
    `,
      [permitidas],
    );
    expect(rows).toEqual([]);
  });

  it("todo perfil nao-admin alcanca as telas do menu que enxerga", async () => {
    // O incidente: 'user' tinha menu_implantadores.view e nenhuma tela dentro.
    const { rows } = await client.query(`
      with perms as (
        select r.name as perfil, p.resource, p.action
        from public.app_roles r
        join public.app_role_permissions rp on rp.role_id = r.id
        join public.app_permissions p on p.id = rp.permission_id
        where r.name <> 'admin'
      ),
      menus(menu, telas) as (values
        ('menu_implantadores', array['implantadores_home','implantadores_aderencia',
          'implantadores_aderencia_finalizadas','conversion_homologation',
          'implantadores_treinamento','implantadores_transicao']),
        ('menu_comercial', array['commercial_customers','commercial_blockers',
          'commercial_contacts','commercial_deployment_forms','commercial_checklists']),
        ('menu_conversao', array['conversion_home','conversion_engines']),
        ('menu_orion', array['orion_dashboard','orion_projects','orion_editor']),
        ('menu_calendario', array['calendar_projects','calendar_analysts']),
        ('menu_implantacao', array['projects','reports','deployments_next','deployments_latest'])
      )
      select distinct pm.perfil, m.menu
      from perms pm
      join menus m on m.menu = pm.resource and pm.action = 'view'
      where not exists (
        select 1 from perms t
        where t.perfil = pm.perfil
          and t.action = 'view'
          and t.resource = any(m.telas)
      )
      order by 1, 2
    `);
    // Cada linha = perfil que ve o menu e cai em "Acesso negado" em tudo dentro.
    expect(rows).toEqual([]);
  });

  it("app_roles, app_permissions e app_role_permissions so aceitam escrita de admin", async () => {
    // Se estas abrirem, um usuario se concede admin e todo o RBAC vira enfeite.
    const { rows } = await client.query(`
      select tablename
      from pg_tables
      where schemaname = 'public'
        and tablename in ('app_roles','app_permissions','app_role_permissions')
        and not exists (
          select 1 from pg_policies pol
          where pol.schemaname = 'public'
            and pol.tablename = pg_tables.tablename
            and pol.cmd = 'ALL'
            and pol.qual::text like '%role%admin%'
        )
    `);
    expect(rows).toEqual([]);
  });
});
