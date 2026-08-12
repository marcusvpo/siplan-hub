import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const MIGRATIONS = [
  "20260811100000_cs_cx_module_permissions.sql",
  "20260811110000_cs_cx_migration_control.sql",
  "20260811111000_cs_cx_core_schema.sql",
  "20260811112000_cs_cx_native_records.sql",
  "20260811113000_cs_cx_contacts_appointments.sql",
  "20260812100000_cs_cx_routines.sql",
  "20260812101000_cs_cx_visits_nps.sql",
  "20260812102000_cs_cx_advanced_operations.sql",
  "20260812103000_cs_cx_nps_webhook.sql",
  "20260812104000_cs_cx_routine_administration.sql",
  "20260812105000_cs_cx_routine_reports.sql",
  "20260812106000_cs_cx_routine_history_context.sql",
  "20260812107000_cs_cx_user_mapping_exceptions.sql",
  "20260812108000_cs_cx_nps_public_surveys.sql",
  "20260812109000_cs_cx_nps_response_immutability.sql",
  "20260812110000_cs_cx_nps_questionnaire_themes.sql",
];
const FEATURE_MIGRATIONS = new Map([
  ["cs_cx_user_map.mapping_ignored", "20260812107000_cs_cx_user_mapping_exceptions.sql"],
  ["cs_cx_nps_responses public survey columns", "20260812108000_cs_cx_nps_public_surveys.sql"],
  ["cs_cx_nps_responses immutability", "20260812109000_cs_cx_nps_response_immutability.sql"],
  ["cs_cx_nps_questionnaire themes", "20260812110000_cs_cx_nps_questionnaire_themes.sql"],
]);
const EXPECTED_TABLES = [
  "cs_cx_user_map",
  "cs_cx_migration_runs",
  "cs_cx_migration_state",
  "cs_cx_products",
  "cs_cx_registry_offices",
  "cs_cx_registry_office_products",
  "cs_cx_requests",
  "cs_cx_request_attachments",
  "cs_cx_audit_logs",
  "cs_cx_contacts",
  "cs_cx_appointments",
  "cs_cx_routine_categories",
  "cs_cx_routine_types",
  "cs_cx_routine_models",
  "cs_cx_routine_model_products",
  "cs_cx_routine_model_items",
  "cs_cx_office_routines",
  "cs_cx_office_routine_items",
  "cs_cx_routine_history",
  "cs_cx_visits",
  "cs_cx_visit_checklist_items",
  "cs_cx_visit_pending_items",
  "cs_cx_visit_attachments",
  "cs_cx_nps_responses",
  "cs_cx_nps_history",
  "cs_cx_nps_questionnaires",
  "cs_cx_nps_invitations",
];
const BASE_TABLES = EXPECTED_TABLES.slice(0, 25);
const EXPECTED_RESOURCES = [
  "menu_cs_cx",
  "cs_cx_home",
  "cs_cx_registros",
  "cs_cx_cartorios",
  "cs_cx_contatos",
  "cs_cx_agendamentos",
  "cs_cx_rotinas",
  "cs_cx_visitas",
  "cs_cx_nps",
  "cs_cx_reports",
  "cs_cx_admin",
];

loadDotEnv();
const args = new Set(process.argv.slice(2));
const staticOnly = args.has("--static");
const apply = args.has("--apply");
const confirmation = [...args]
  .find((arg) => arg.startsWith("--confirm-project="))
  ?.split("=")[1];

validateMigrationFiles();
if (staticOnly) {
  console.log(
    `${MIGRATIONS.length} migrations CS/CX validadas; nenhuma escrita executada.`,
  );
  process.exit(0);
}

const targetUrl = process.env.SUPABASE_DB_URL;
if (!targetUrl) fail("Defina SUPABASE_DB_URL no ambiente ou .env.");
const projectRef = resolveProjectRef(targetUrl, process.env.VITE_SUPABASE_URL);
if (apply && (!projectRef || confirmation !== projectRef)) {
  fail(
    `Confirme o projeto com --confirm-project=${projectRef ?? "<project-ref>"}.`,
  );
}

const target = new Client(
  connectionOptions(targetUrl, process.env.CS_CX_TARGET_SSL !== "false"),
);
await target.connect();
try {
  const presentTables = await getPresentTables();
  const missingFeatures = BASE_TABLES.every((table) =>
    presentTables.includes(table),
  )
    ? await getMissingFeatures()
    : [];
  console.log(
    `Projeto: ${projectRef ?? "não identificado"}; tabelas CS/CX: ${presentTables.length}/${EXPECTED_TABLES.length}.`,
  );

  if (!apply) {
    await printReadiness(presentTables, missingFeatures);
  } else if (BASE_TABLES.every((table) => presentTables.includes(table))) {
    if (missingFeatures.length) {
      const upgradeMigrations = [
        ...new Set(missingFeatures.map((feature) => FEATURE_MIGRATIONS.get(feature))),
      ].filter(Boolean);
      await applySchema(upgradeMigrations);
      console.log(`Schema CS/CX atualizado: ${missingFeatures.join(", ")}.`);
    } else {
      console.log(
        "Schema CS/CX já está completo; nenhuma migration foi reaplicada.",
      );
    }
    await assertReadiness();
  } else if (presentTables.length > 0) {
    throw new Error(
      `Schema parcial detectado (${presentTables.length}/${EXPECTED_TABLES.length}). Revise antes de aplicar.`,
    );
  } else {
    await assertBaseDependencies();
    await applySchema();
    await assertReadiness();
    console.log("Schema CS/CX aplicado e validado com sucesso.");
  }
} finally {
  await target.end();
}

function validateMigrationFiles() {
  let combinedSql = "";
  for (const filename of MIGRATIONS) {
    const migrationPath = path.resolve("supabase", "migrations", filename);
    if (!fs.existsSync(migrationPath)) fail(`Migration ausente: ${filename}`);
    const sql = fs.readFileSync(migrationPath, "utf8");
    if (!sql.trim()) fail(`Migration vazia: ${filename}`);
    if (
      /\b(?:BEGIN|COMMIT|ROLLBACK|VACUUM)\s*;/i.test(sql) ||
      /\bCREATE\s+INDEX\s+CONCURRENTLY\b/i.test(sql)
    ) {
      fail(`Migration incompatível com aplicação transacional: ${filename}`);
    }
    combinedSql += `\n${sql}`;
  }

  for (const table of EXPECTED_TABLES) {
    const createTable = new RegExp(
      `CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+public\\.${table}\\b`,
      "i",
    );
    const enableRls = new RegExp(
      `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      "i",
    );
    if (!createTable.test(combinedSql))
      fail(`Criação da tabela ausente no pacote: ${table}`);
    if (!enableRls.test(combinedSql))
      fail(`Ativação de RLS ausente no pacote: ${table}`);
  }
  for (const resource of EXPECTED_RESOURCES) {
    if (!combinedSql.includes(`'${resource}'`))
      fail(`Permissão ausente no pacote: ${resource}`);
  }
  if (!combinedSql.includes("'cs-cx-attachments'")) {
    fail("Criação do bucket privado CS/CX ausente no pacote.");
  }
}

async function getPresentTables() {
  const result = await target.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1::text[])
     ORDER BY tablename`,
    [EXPECTED_TABLES],
  );
  return result.rows.map((row) => row.tablename);
}

async function getMissingFeatures() {
  const result = await target.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'cs_cx_user_map'
        AND column_name = 'mapping_ignored'
    ) AS mapping_ignored,
    (
      SELECT count(*)::int FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'cs_cx_nps_responses'
        AND column_name IN ('invitation_id', 'questionnaire_id', 'questionnaire_snapshot', 'answers')
    ) AS nps_response_columns,
    NOT has_table_privilege(
      'authenticated',
      'public.cs_cx_nps_responses',
      'INSERT'
    ) AND NOT has_table_privilege(
      'authenticated',
      'public.cs_cx_nps_responses',
      'UPDATE'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'cs_cx_nps_responses'
        AND cmd IN ('INSERT', 'UPDATE')
        AND ('authenticated' = ANY(roles) OR 'public' = ANY(roles))
    ) AND COALESCE(NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.cs_cx_import_nps(uuid,jsonb)'),
      'EXECUTE'
    ), true) AS nps_responses_immutable,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'cs_cx_nps_questionnaires'
        AND column_name = 'theme'
    ) AND EXISTS (
      SELECT 1 FROM storage.buckets
      WHERE id = 'cs-cx-nps-assets'
        AND public
        AND file_size_limit = 5242880
    ) AS nps_questionnaire_themes
  `);
  const missing = [];
  if (!result.rows[0].mapping_ignored)
    missing.push("cs_cx_user_map.mapping_ignored");
  if (result.rows[0].nps_response_columns !== 4)
    missing.push("cs_cx_nps_responses public survey columns");
  if (!result.rows[0].nps_responses_immutable)
    missing.push("cs_cx_nps_responses immutability");
  if (!result.rows[0].nps_questionnaire_themes)
    missing.push("cs_cx_nps_questionnaire themes");
  return missing;
}

async function printReadiness(presentTables, missingFeatures) {
  if (presentTables.length === 0) {
    console.log(
      "Schema ausente. Use --apply com a confirmação do projeto para instalá-lo.",
    );
    process.exitCode = 2;
    return;
  }
  if (presentTables.length < EXPECTED_TABLES.length) {
    console.log(
      `Schema parcial. Ausentes: ${EXPECTED_TABLES.filter((table) => !presentTables.includes(table)).join(", ")}.`,
    );
    process.exitCode = 2;
    return;
  }
  if (missingFeatures.length) {
    console.log(
      `Schema desatualizado. Recursos ausentes: ${missingFeatures.join(", ")}.`,
    );
    process.exitCode = 2;
    return;
  }
  await assertReadiness();
  console.log("Schema CS/CX pronto para a carga de homologação.");
}

async function assertBaseDependencies() {
  const result = await target.query(`
    SELECT to_regclass('public.app_permissions') IS NOT NULL AS permissions,
           to_regclass('public.app_roles') IS NOT NULL AS roles,
           to_regclass('public.profiles') IS NOT NULL AS profiles,
           to_regclass('storage.buckets') IS NOT NULL AS storage,
           to_regprocedure('public.has_permission(uuid,text,text)') IS NOT NULL AS has_permission
  `);
  const missing = Object.entries(result.rows[0])
    .filter(([, present]) => !present)
    .map(([name]) => name);
  if (missing.length)
    throw new Error(`Dependências do HUB ausentes: ${missing.join(", ")}.`);
}

async function applySchema(migrations = MIGRATIONS) {
  await target.query("BEGIN");
  try {
    await target.query(
      `SELECT pg_advisory_xact_lock(hashtext('siplan-hub:cs-cx-schema'))`,
    );
    for (const filename of migrations) {
      const sql = fs.readFileSync(
        path.resolve("supabase", "migrations", filename),
        "utf8",
      );
      console.log(`Aplicando ${filename}...`);
      await target.query(sql);
    }
    await target.query("COMMIT");
  } catch (error) {
    await target.query("ROLLBACK");
    throw error;
  }
}

async function assertReadiness() {
  const tables = await getPresentTables();
  if (tables.length !== EXPECTED_TABLES.length) {
    throw new Error(
      `Tabelas CS/CX incompletas: ${tables.length}/${EXPECTED_TABLES.length}.`,
    );
  }

  // node-postgres serializa uma conexão; consultas paralelas no mesmo Client
  // geram aviso e deixarão de ser aceitas no pg 9.
  const permissionResult = await target.query(
    `SELECT count(DISTINCT resource)::int AS count FROM public.app_permissions
     WHERE resource = ANY($1::text[])`,
    [EXPECTED_RESOURCES],
  );
  const snapshotResult = await target.query(`
    SELECT count(*)::int AS count FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_cx_routine_history'
      AND column_name IN ('registry_office_name', 'routine_model_name', 'model_item_name', 'actor_name')
  `);
  const missingFeatures = await getMissingFeatures();
  const bucketResult = await target.query(
    `SELECT count(*)::int AS count FROM storage.buckets WHERE id = 'cs-cx-attachments'`,
  );
  const rlsResult = await target.query(
    `SELECT count(*)::int AS count FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1::text[]) AND rowsecurity`,
    [EXPECTED_TABLES],
  );

  if (permissionResult.rows[0].count !== EXPECTED_RESOURCES.length)
    throw new Error("Catálogo de permissões CS/CX incompleto.");
  if (snapshotResult.rows[0].count !== 4)
    throw new Error("Snapshots do histórico de rotinas incompletos.");
  if (missingFeatures.length)
    throw new Error(
      `Recursos do schema ausentes: ${missingFeatures.join(", ")}.`,
    );
  if (bucketResult.rows[0].count !== 1)
    throw new Error("Bucket privado de anexos CS/CX ausente.");
  if (rlsResult.rows[0].count !== EXPECTED_TABLES.length)
    throw new Error("RLS não está ativa em todas as tabelas CS/CX.");
}

function resolveProjectRef(databaseUrl, apiUrl) {
  try {
    const apiHost = apiUrl ? new URL(apiUrl).hostname : "";
    if (apiHost.endsWith(".supabase.co")) return apiHost.split(".")[0];
    const username = decodeURIComponent(new URL(databaseUrl).username);
    return username.includes(".") ? username.split(".").at(-1) : null;
  } catch {
    return null;
  }
}

function connectionOptions(connectionString, ssl) {
  return {
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
  };
}

function loadDotEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
