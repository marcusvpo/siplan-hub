import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const runner = readFileSync(
  resolve(root, "scripts/prepare-cs-cx-schema.mjs"),
  "utf8",
);
const migrator = readFileSync(
  resolve(root, "scripts/migrate-cs-cx.mjs"),
  "utf8",
);
const fileMigrator = readFileSync(
  resolve(root, "scripts/migrate-cs-cx-files.mjs"),
  "utf8",
);
const readiness = readFileSync(
  resolve(root, "scripts/check-cs-cx-readiness.mjs"),
  "utf8",
);
const workflow = readFileSync(
  resolve(root, ".github/workflows/supabase-migrations.yml"),
  "utf8",
);
const migrations = [
  ...new Set(
    [
      ...runner.matchAll(
        /["']((?:20260811|20260812|20260817|20260818)\d+_cs_cx_[^"']+\.sql)["']/g,
      ),
    ].map((match) => match[1]),
  ),
];

describe("preflight do schema CS/CX", () => {
  it("mantém uma lista explícita e existente de migrations", () => {
    expect(migrations).toHaveLength(21);
    expect(new Set(migrations).size).toBe(migrations.length);
    for (const migration of migrations) {
      expect(
        existsSync(resolve(root, "supabase/migrations", migration)),
        migration,
      ).toBe(true);
    }
  });

  it("exige confirmação do projeto e aplica o pacote em uma transação", () => {
    expect(runner).toContain("--apply");
    expect(runner).toContain("--confirm-project=");
    expect(runner).toContain("pg_advisory_xact_lock");
    expect(runner).toMatch(/target\.query\(["']BEGIN["']\)/);
    expect(runner).toMatch(/target\.query\(["']COMMIT["']\)/);
    expect(runner).toMatch(/target\.query\(["']ROLLBACK["']\)/);
  });

  it("não permite aplicar automaticamente o histórico global no CI", () => {
    expect(workflow).toContain("npm run prepare:cs-cx -- --static");
    expect(workflow).not.toMatch(/run:\s*supabase\s+db\s+push/i);
    expect(workflow).not.toContain("SUPABASE_ACCESS_TOKEN");
    expect(workflow).not.toContain("SUPABASE_DB_PASSWORD");
  });

  it("trava a conexão legada em somente leitura", () => {
    expect(migrator).toContain(
      "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY",
    );
    expect(migrator).toContain("mode === 'source'");
    expect(migrator).toContain("source_preflight LIMIT 0");
  });

  it("protege cargas e o de/para manual com confirmação e transação", () => {
    expect(migrator).toContain("--confirm-project=");
    expect(migrator).toContain("--map=artifacts/cs-cx-user-map.json");
    expect(migrator).toContain("jsonb_to_recordset");
    expect(migrator).toContain("mapping_ignored = input.ignore");
    expect(migrator).toContain("AND NOT mapping_ignored");
    expect(migrator).toContain("await target.query('BEGIN')");
    expect(migrator).toContain("await target.query('ROLLBACK')");
    expect(migrator).toContain("targetHashes(spec)");
    expect(migrator).toContain("source_hash");
  });

  it("copia anexos históricos com confirmação e checksum", () => {
    expect(fileMigrator).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fileMigrator).toContain("--confirm-project=");
    expect(fileMigrator).toContain("createHash('sha256')");
    expect(fileMigrator).toContain("upsert: false");
    expect(fileMigrator).toContain("NoSuchKey");
    expect(fileMigrator).toContain("error?.originalError");
    expect(fileMigrator).toContain("if (apply && !attachment.storage_path)");
    expect(fileMigrator).not.toMatch(/console\.log\([^\n]*serviceRoleKey/);
    expect(migrator).not.toContain("storage_path: null");
    expect(migrator).toMatch(
      /source: 'cartorio_produtos'[\s\S]*?conflict: \['registry_office_id', 'product_id'\]/,
    );
  });

  it("mantém um gate conectado para a homologação", () => {
    expect(readiness).toContain("NOT_READY");
    expect(readiness).toContain(
      "READY - CS/CX pronto para homologação humana.",
    );
    expect(readiness).toContain("schemaRow.with_rls === EXPECTED_TABLES");
    expect(readiness).toContain("userRow.pending === 0");
    expect(readiness).toContain("userRow.ignored");
    expect(readiness).toContain("attachmentRow.copied === attachmentRow.total");
    expect(readiness).toContain("probeNpsWebhook(apiUrl)");
    expect(readiness).toContain("probePublicNps(apiUrl)");
    expect(readiness).toContain("nps_responses_immutable");
    expect(readiness).toContain("nps_questionnaire_themes");
    expect(readiness).toContain("[401, 403].includes(response.status)");
  });

  it("torna as respostas NPS imutaveis para usuarios da aplicacao", () => {
    const migration = readFileSync(
      resolve(
        root,
        "supabase/migrations/20260812109000_cs_cx_nps_response_immutability.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("DROP POLICY IF EXISTS cs_cx_nps_responses_create");
    expect(migration).toContain("DROP POLICY IF EXISTS cs_cx_nps_responses_edit");
    expect(migration).toMatch(/REVOKE INSERT, UPDATE ON public\.cs_cx_nps_responses/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.cs_cx_import_nps/);
  });

  it("versiona a identidade visual das pesquisas NPS", () => {
    const migration = readFileSync(
      resolve(
        root,
        "supabase/migrations/20260812110000_cs_cx_nps_questionnaire_themes.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("ADD COLUMN IF NOT EXISTS theme JSONB");
    expect(migration).toContain("'theme', questionnaire.theme");
    expect(migration).toContain("'cs-cx-nps-assets'");
    expect(migration).toContain("file_size_limit");
    expect(migration).not.toMatch(/FOR (?:UPDATE|DELETE) TO authenticated/);
  });

  it("suporta produtos por contato e responsáveis por cartório/produto", () => {
    const migration = readFileSync(
      resolve(
        root,
        "supabase/migrations/20260817130000_cs_cx_customer_relationships.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.cs_cx_contact_products");
    expect(migration).toContain("public.cs_cx_registry_office_product_responsibles");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_save_contact");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office_v2");
    expect(migration).toMatch(/ALTER TABLE public\.cs_cx_contact_products ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE public\.cs_cx_registry_office_product_responsibles ENABLE ROW LEVEL SECURITY/);
  });

  it("versiona os ajustes da homologação operacional", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260818130000_cs_cx_operational_review.sql"),
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.cs_cx_request_statuses");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.cs_cx_request_updates");
    expect(migration).toContain("'Sustentação'");
    expect(migration).toContain("'FastTrack'");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_save_request_v2");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_save_registry_office_v3");
    expect(migration).toMatch(/ALTER TABLE public\.cs_cx_request_statuses ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE public\.cs_cx_request_updates ENABLE ROW LEVEL SECURITY/);
  });

  it("permite editar observações das solicitações com autorização", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260818200000_cs_cx_request_update_editing.sql"),
      "utf8",
    );

    expect(migration).toContain("ON public.cs_cx_request_updates FOR UPDATE TO authenticated");
    expect(migration).toContain("public.has_permission(auth.uid(), 'cs_cx_registros', 'edit')");
    expect(migration).toContain("GRANT UPDATE ON public.cs_cx_request_updates TO authenticated");
  });

  it("versiona a análise em massa das rotinas do cartório", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260818181000_cs_cx_bulk_routine_analysis.sql"),
      "utf8",
    );

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_set_routine_items_bulk");
    expect(migration).toContain("JOIN public.cs_cx_office_routines");
    expect(migration).toContain("INSERT INTO public.cs_cx_routine_history");
    expect(migration).toContain("public.has_permission(auth.uid(), 'cs_cx_rotinas', 'edit')");
  });

  it("isola usuários e perfis de acesso do CS/CX", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260818190000_cs_cx_scoped_access.sql"),
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.cs_cx_access_profiles");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.cs_cx_user_access");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_get_my_permissions");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cs_cx_save_access_profile");
    expect(migration).toMatch(/permission\.resource LIKE 'cs\\_cx\\_%'/);
    expect(migration).toContain("O perfil contém permissões fora do módulo CS/CX");
    expect(migration).not.toContain("UPDATE public.profiles\n    SET role");
  });
});
