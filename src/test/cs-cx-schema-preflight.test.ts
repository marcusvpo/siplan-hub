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
        /["']((?:20260811|20260812)\d+_cs_cx_[^"']+\.sql)["']/g,
      ),
    ].map((match) => match[1]),
  ),
];

describe("preflight do schema CS/CX", () => {
  it("mantém uma lista explícita e existente de migrations", () => {
    expect(migrations).toHaveLength(16);
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
});
