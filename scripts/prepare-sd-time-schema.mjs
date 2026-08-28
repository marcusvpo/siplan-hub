import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const MIGRATIONS = [
  "20260828213000_sd_time_tracking.sql",
  "20260828223000_sd_time_rich_description.sql",
  "20260828233000_sd_time_ellevo_import.sql",
  "20260828234500_sd_time_bulk_import.sql",
  "20260828235500_sd_time_management_report.sql",
  "20260828235900_sd_time_report_sources.sql",
  "20260828235930_sd_time_import_detail_refresh.sql",
  "20260828235945_sd_time_group_filters.sql",
  "20260828235955_sd_attendance_bi.sql",
];
const EXPECTED_TABLES = [
  "sd_time_entries",
  "sd_time_intervals",
  "sd_time_import_requests",
  "sd_time_bulk_import_requests",
];
const EXPECTED_FUNCTIONS = [
  "public.save_sd_time_entry(date,text,text,jsonb,uuid)",
  "public.delete_sd_time_entry(uuid)",
  "public.get_sd_time_management(date,date,uuid)",
  "public.request_sd_time_import(date)",
  "public.claim_sd_time_import_request(text)",
  "public.complete_sd_time_import(uuid,jsonb)",
  "public.request_sd_time_bulk_import(date,date)",
  "public.claim_sd_time_bulk_import_request(text)",
  "public.complete_sd_time_bulk_import(uuid,jsonb,integer,integer,integer)",
  "public.get_sd_time_management_report(date,date,uuid,text)",
  "public.get_sd_time_management_page(date,date,uuid,text,integer,integer)",
  "public.refresh_sd_time_import_details(jsonb)",
  "public.get_sd_time_management_report(date,date,uuid,text,text[])",
  "public.get_sd_time_management_page(date,date,uuid,text,text[],integer,integer)",
  "public.get_sd_attendance_bi(date,date,uuid[],text[],text[],text[])",
];
const EXPECTED_PERMISSIONS = [
  ["sd_time_entries", "view"],
  ["sd_time_entries", "create"],
  ["sd_time_entries", "edit"],
  ["sd_time_entries", "delete"],
  ["sd_time_management", "view"],
  ["sd_attendance_bi", "view"],
];

loadDotEnv();
const args = new Set(process.argv.slice(2));
const staticOnly = args.has("--static");
const apply = args.has("--apply");
const confirmation = [...args]
  .find((arg) => arg.startsWith("--confirm-project="))
  ?.split("=")[1];

const migrationSql = validateMigrationFiles();
if (staticOnly) {
  console.log(
    `${MIGRATIONS.length} migrations de horas do SD validadas; nenhuma escrita executada.`,
  );
  process.exit(0);
}

const targetUrl = process.env.SUPABASE_DB_URL;
if (!targetUrl) fail("Defina SUPABASE_DB_URL no ambiente ou .env.");
const projectRef = resolveProjectRef(targetUrl, process.env.VITE_SUPABASE_URL);
if (apply && (!projectRef || confirmation !== projectRef)) {
  fail(`Confirme o projeto com --confirm-project=${projectRef ?? "<project-ref>"}.`);
}

const target = new Client(
  connectionOptions(targetUrl, process.env.SD_TIME_TARGET_SSL !== "false"),
);
await target.connect();
try {
  const before = await inspectReadiness();
  printReadiness(projectRef, before);

  if (!apply) {
    if (!before.ready) process.exitCode = 2;
  } else {
    await assertBaseDependencies();
    await target.query("BEGIN");
    try {
      await target.query("SELECT pg_advisory_xact_lock(hashtext('siplan-hub:sd-time-schema'))");
      await target.query(migrationSql);
      await target.query("COMMIT");
    } catch (error) {
      await target.query("ROLLBACK");
      throw error;
    }

    const after = await inspectReadiness();
    if (!after.ready) {
      throw new Error(`Publicação incompleta: ${after.missing.join(", ")}.`);
    }
    console.log("Schema e permissões de horas do SD publicados e validados com sucesso.");
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
    if (/\b(?:COMMIT|ROLLBACK|VACUUM)\s*;/i.test(sql)) {
      fail(`Migration incompatível com aplicação transacional: ${filename}`);
    }
    combinedSql += `\n${sql}`;
  }

  for (const table of EXPECTED_TABLES) {
    if (!new RegExp(`CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+public\\.${table}\\b`, "i").test(combinedSql)) {
      fail(`Criação da tabela ausente no pacote: ${table}`);
    }
    if (!new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i").test(combinedSql)) {
      fail(`Ativação de RLS ausente no pacote: ${table}`);
    }
  }
  for (const [resource, action] of EXPECTED_PERMISSIONS) {
    if (!combinedSql.includes(`('${resource}', '${action}'`)) {
      fail(`Permissão ausente no pacote: ${resource}.${action}`);
    }
  }
  return combinedSql;
}

async function inspectReadiness() {
  const tableResult = await target.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1::text[])
     ORDER BY tablename`,
    [EXPECTED_TABLES],
  );
  const functionResult = await target.query(
    `SELECT signature
     FROM unnest($1::text[]) AS expected(signature)
     WHERE to_regprocedure(signature) IS NOT NULL`,
    [EXPECTED_FUNCTIONS],
  );
  const permissionResult = await target.query(
    `SELECT resource, action
     FROM public.app_permissions
     WHERE (resource, action) IN (
       ('sd_time_entries', 'view'),
       ('sd_time_entries', 'create'),
       ('sd_time_entries', 'edit'),
       ('sd_time_entries', 'delete'),
       ('sd_time_management', 'view'),
       ('sd_attendance_bi', 'view')
     )`,
  );
  const adminGrantResult = await target.query(
    `SELECT permission.resource, permission.action
     FROM public.app_role_permissions role_permission
     JOIN public.app_permissions permission ON permission.id = role_permission.permission_id
     JOIN public.app_roles role ON role.id = role_permission.role_id
     WHERE role.name = 'admin'
       AND permission.resource IN ('sd_time_entries', 'sd_time_management', 'sd_attendance_bi')`,
  );

  const presentTables = new Set(tableResult.rows.map((row) => row.tablename));
  const presentFunctions = new Set(functionResult.rows.map((row) => row.signature));
  const presentPermissions = new Set(
    permissionResult.rows.map((row) => `${row.resource}.${row.action}`),
  );
  const adminGrants = new Set(
    adminGrantResult.rows.map((row) => `${row.resource}.${row.action}`),
  );
  const missing = [
    ...EXPECTED_TABLES.filter((table) => !presentTables.has(table)).map((table) => `tabela ${table}`),
    ...EXPECTED_FUNCTIONS.filter((signature) => !presentFunctions.has(signature)).map((signature) => `função ${signature}`),
    ...EXPECTED_PERMISSIONS.filter(([resource, action]) => !presentPermissions.has(`${resource}.${action}`)).map(([resource, action]) => `permissão ${resource}.${action}`),
    ...EXPECTED_PERMISSIONS.filter(([resource, action]) => !adminGrants.has(`${resource}.${action}`)).map(([resource, action]) => `acesso admin ${resource}.${action}`),
  ];

  return {
    ready: missing.length === 0,
    missing,
    tableCount: presentTables.size,
    functionCount: presentFunctions.size,
    permissionCount: presentPermissions.size,
    adminGrantCount: adminGrants.size,
  };
}

function printReadiness(projectRef, readiness) {
  console.log(`Projeto: ${projectRef ?? "não identificado"}.`);
  console.log(
    `Horas SD: ${readiness.tableCount}/${EXPECTED_TABLES.length} tabelas, ` +
      `${readiness.functionCount}/${EXPECTED_FUNCTIONS.length} funções, ` +
      `${readiness.permissionCount}/${EXPECTED_PERMISSIONS.length} permissões e ` +
      `${readiness.adminGrantCount}/${EXPECTED_PERMISSIONS.length} acessos administrativos.`,
  );
  if (readiness.missing.length) {
    console.log(`Pendências: ${readiness.missing.join(", ")}.`);
  }
}

async function assertBaseDependencies() {
  const result = await target.query(`
    SELECT
      to_regclass('public.profiles') IS NOT NULL AS profiles,
      to_regclass('public.app_permissions') IS NOT NULL AS permissions,
      to_regclass('public.app_roles') IS NOT NULL AS roles,
      to_regclass('public.app_role_permissions') IS NOT NULL AS role_permissions,
      to_regprocedure('public.has_permission(uuid,text,text)') IS NOT NULL AS has_permission,
      to_regprocedure('public.update_updated_at_column()') IS NOT NULL AS updated_at
  `);
  const missing = Object.entries(result.rows[0])
    .filter(([, present]) => !present)
    .map(([dependency]) => dependency);
  if (missing.length) {
    throw new Error(`Dependências base ausentes: ${missing.join(", ")}.`);
  }
}

function loadDotEnv() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function resolveProjectRef(databaseUrl, publicUrl) {
  if (publicUrl) {
    const host = new URL(publicUrl).hostname;
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    if (match) return match[1];
  }
  const parsed = new URL(databaseUrl);
  const directHost = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (directHost) return directHost[1];
  const pooledUser = decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]+)$/i);
  return pooledUser?.[1] ?? null;
}

function connectionOptions(connectionString, ssl) {
  return {
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
