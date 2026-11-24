import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Client } from "pg";

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
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
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
  let client: Client;

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
        and ('public' = any(roles) or 'anon' = any(roles))
        and cmd in ('INSERT','UPDATE','DELETE','ALL')
        and coalesce(with_check::text, qual::text) = 'true'
      order by tablename, cmd
    `);
    // Cada linha aqui e uma tabela que um estranho sem conta consegue escrever.
    expect(rows).toEqual([]);
  });

  it("nenhuma tabela expoe LEITURA irrestrita ao anonimo fora das rotas publicas", async () => {
    // /roadmap/:token, /public/checklist/:id e /public/pos-chat/:id operam via RPCs SECURITY DEFINER dedicadas.
    // Apenas templates de formulario (kind = 'commercial_checklist') e settings de manutencao do blog sao lidos via SELECT.
    const permitidas = ["form_templates"];
    const { rows } = await client.query(
      `
      select tablename, policyname, qual::text as qual
      from pg_policies
      where schemaname = 'public'
        and cmd = 'SELECT'
        and ('public' = any(roles) or 'anon' = any(roles))
        and tablename <> all($1::text[])
        and not (
          tablename = 'orion_update_settings'
          and policyname = 'orion_update_settings_public_select'
        )
        and coalesce(qual::text, '') !~* '(auth\\.uid\\(\\)|auth\\.role\\(\\)|has_permission\\()'
      order by tablename
    `,
      [permitidas],
    );
    expect(rows).toEqual([]);
  });

  it("a RPC pública do blog omite autoria e as policies não liberam escrita anônima", async () => {
    const { rows } = await client.query(`
      select
        has_function_privilege('anon', 'public.orion_updates_get_settings()', 'EXECUTE') as public_read,
        pg_get_function_result('public.orion_updates_get_settings()'::regprocedure) as public_result,
        pg_get_functiondef('public.orion_updates_update_settings(boolean,text,text)'::regprocedure) as update_definition,
        array(
          select column_name::text from information_schema.columns
          where table_schema = 'public' and table_name = 'orion_update_settings'
          order by column_name
        ) as settings_columns,
        exists (
          select 1 from pg_policies
          where schemaname = 'public' and tablename = 'orion_update_settings'
            and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
            and ('public' = any(roles) or 'anon' = any(roles))
            and coalesce(with_check::text, qual::text) = 'true'
        ) as anonymous_write
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ public_read: true, anonymous_write: false });
    expect(rows[0].settings_columns).toEqual([
      "id", "maintenance_message", "maintenance_title", "public_enabled", "updated_at", "updated_by",
    ]);
    expect(rows[0].public_result).toMatch(/public_enabled boolean/);
    expect(rows[0].public_result).toMatch(/maintenance_title/);
    expect(rows[0].public_result).toMatch(/maintenance_message/);
    expect(rows[0].public_result).not.toMatch(/updated_by|uuid/i);
    expect(rows[0].update_definition).toMatch(/IF NOT public\.has_permission\(auth\.uid\(\), 'orion_updates_management', 'edit'\)/i);
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
        ('menu_implantacao', array['projects','calendar_projects','secondary_products','reports','deployments_next','deployments_latest'])
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

  it("respostas NPS nao podem ser incluidas, importadas ou alteradas por usuarios", async () => {
    const { rows } = await client.query(`
      select
        has_table_privilege(
          'authenticated',
          'public.cs_cx_nps_responses',
          'INSERT'
        ) as can_insert,
        has_table_privilege(
          'authenticated',
          'public.cs_cx_nps_responses',
          'UPDATE'
        ) as can_update,
        has_function_privilege(
          'authenticated',
          'public.cs_cx_import_nps(uuid,jsonb)',
          'EXECUTE'
        ) as can_import,
        exists (
          select 1
          from pg_policies
          where schemaname = 'public'
            and tablename = 'cs_cx_nps_responses'
            and cmd in ('INSERT', 'UPDATE', 'ALL')
            and ('authenticated' = any(roles) or 'public' = any(roles))
        ) as has_write_policy
    `);

    expect(rows).toEqual([
      {
        can_insert: false,
        can_update: false,
        can_import: false,
        has_write_policy: false,
      },
    ]);
  });

  it("temas NPS usam imagens publicas imutaveis e entram no snapshot", async () => {
    const { rows } = await client.query(`
      select
        exists (
          select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'cs_cx_nps_questionnaires'
            and column_name = 'theme'
        ) as has_theme,
        exists (
          select 1 from storage.buckets
          where id = 'cs-cx-nps-assets'
            and public
            and file_size_limit = 5242880
            and allowed_mime_types @> array[
              'image/jpeg', 'image/png', 'image/webp'
            ]::text[]
        ) as safe_bucket,
        exists (
          select 1 from pg_policies
          where schemaname = 'storage'
            and tablename = 'objects'
            and policyname = 'cs_cx_nps_assets_insert'
            and cmd = 'INSERT'
        ) as can_upload,
        not exists (
          select 1 from pg_policies
          where schemaname = 'storage'
            and tablename = 'objects'
            and policyname like 'cs_cx_nps_assets_%'
            and cmd in ('UPDATE', 'DELETE', 'ALL')
        ) as assets_immutable,
        pg_get_functiondef(
          coalesce(
            to_regprocedure(
              'public.cs_cx_create_nps_invitation(uuid,uuid,uuid,uuid,text,text,timestamptz)'
            ),
            to_regprocedure(
              'public.cs_cx_create_nps_invitation(uuid,uuid,uuid,text,text,timestamptz)'
            )
          )
        ) as invitation_definition
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      has_theme: true,
      safe_bucket: true,
      can_upload: true,
      assets_immutable: true,
    });
    expect(rows[0].invitation_definition).toMatch(
      /'theme'(?:::text)?,\s*questionnaire\.theme/,
    );
  });

  it("handle_new_user nao aceita role do metadata e profiles bloqueia auto-escalacao", async () => {
    const { rows } = await client.query(`
      select
        pg_get_functiondef('public.handle_new_user()'::regprocedure) as handle_new_user_def,
        exists (
          select 1
          from pg_trigger
          where tgrelid = 'public.profiles'::regclass
            and tgname = 'trg_protect_profile_privileged_fields'
            and not tgisinternal
        ) as has_profile_guard_trigger
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0].has_profile_guard_trigger).toBe(true);
    expect(rows[0].handle_new_user_def).not.toMatch(/raw_user_meta_data\s*->>\s*'role'/i);
  });

  it("cofre project_credentials bloqueia anon e exige permissao RBAC dedicada", async () => {
    const { rows } = await client.query(`
      select
        (
          select relrowsecurity
          from pg_class
          where oid = 'public.project_credentials'::regclass
        ) as rls_enabled,
        has_table_privilege('anon', 'public.project_credentials', 'SELECT') as anon_select,
        has_table_privilege('anon', 'public.project_credentials', 'INSERT') as anon_insert,
        has_table_privilege('anon', 'public.project_credentials', 'UPDATE') as anon_update,
        exists (
          select 1
          from pg_policies
          where schemaname = 'public'
            and tablename = 'project_credentials'
            and cmd = 'SELECT'
            and 'authenticated' = any(roles)
            and qual::text ~* 'has_permission\\(.*project_credentials.*view'
        ) as has_view_policy
    `);

    expect(rows).toEqual([
      {
        rls_enabled: true,
        anon_select: false,
        anon_insert: false,
        anon_update: false,
        has_view_policy: true,
      },
    ]);
  });

  it("buckets sensiveis project-files e assistant-oriontn-doc sao privados", async () => {
    const { rows } = await client.query(`
      select id, public
      from storage.buckets
      where id in ('project-files', 'assistant-oriontn-doc')
      order by id
    `);

    expect(rows).toEqual([
      { id: "assistant-oriontn-doc", public: false },
      { id: "project-files", public: false },
    ]);
  });

  it("funcoes SECURITY DEFINER nao-trigger executaveis por anon ficam restritas a whitelist publica", async () => {
    const whitelist = [
      "delete_pos_chat_visitor_session",
      "get_pos_assistant_project_info",
      "get_pos_chat_session_messages",
      "get_pos_chat_visitor_sessions",
      "get_project_public_info",
      "get_public_commercial_checklist",
      "get_roadmap_data",
      "has_permission",
      "is_pos_chat_link_enabled",
      "orion_updates_get_settings",
      "orion_updates_post_detail",
      "orion_updates_public_posts",
      "orion_updates_public_versions",
      "register_pos_chat_visitor",
      "rename_pos_chat_visitor_session",
      "save_pos_chat_feedback_for_visitor",
      "submit_public_commercial_checklist",
      "update_project_public_infra",
      "verify_pos_chat_visitor_session",
    ];
    const { rows } = await client.query(
      `
      select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and p.prorettype <> 'trigger'::regtype
        and has_function_privilege('anon', p.oid, 'EXECUTE')
        and p.proname <> all($1::text[])
      order by p.proname
    `,
      [whitelist],
    );

    expect(rows).toEqual([]);
  });
});
