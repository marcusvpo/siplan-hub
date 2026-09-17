import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const BASE_MIGRATION = "20260917130000_my_day_personal_board.sql";
const UPGRADE_MIGRATIONS = [
  "20260917170000_my_day_reliability_improvements.sql",
];
const EXPECTED_TABLES = [
  "my_day_boards",
  "my_day_board_columns",
  "my_day_board_cards",
];
const EXPECTED_FUNCTIONS = [
  "public.create_my_day_board(text,text,text)",
  "public.set_default_my_day_board(uuid)",
];
const EXPECTED_UPGRADE_FUNCTIONS = [
  "public.update_my_day_board_column(uuid,text,text,boolean)",
  "public.sync_my_day_board_cards(jsonb)",
  "public.reorder_my_day_board_columns(uuid,uuid[])",
  "public.complete_my_day_task(uuid)",
];
const EXPECTED_PERMISSIONS = ["view", "create", "edit", "delete"];
const EXPECTED_POLICIES = [
  "Users can view their own My Day boards",
  "Users can create their own My Day boards",
  "Users can edit their own My Day boards",
  "Users can delete their own My Day boards",
  "Users can view their own My Day board columns",
  "Users can create their own My Day board columns",
  "Users can edit their own My Day board columns",
  "Users can delete their own My Day board columns",
  "Users can view their own My Day board cards",
  "Users can create their own My Day board cards",
  "Users can edit their own My Day board cards",
  "Users can delete their own My Day board cards",
];

loadDotEnv();
const args = new Set(process.argv.slice(2));
const staticOnly = args.has("--static");
const apply = args.has("--apply");
const confirmation = [...args]
  .find((arg) => arg.startsWith("--confirm-project="))
  ?.split("=")[1];

const { baseSql, upgradeSql } = validateMigrationFiles();
if (staticOnly) {
  console.log("Migration do Meu Quadro validada; nenhuma conexao ou escrita executada.");
  process.exit(0);
}

const targetUrl = process.env.SUPABASE_DB_URL;
if (!targetUrl) fail("Defina SUPABASE_DB_URL no ambiente ou .env.");
const projectRef = resolveProjectRef(targetUrl, process.env.VITE_SUPABASE_URL);
if (apply && (!projectRef || confirmation !== projectRef)) {
  fail(`Confirme o projeto com --confirm-project=${projectRef ?? "<project-ref>"}.`);
}

const target = new Client({
  connectionString: targetUrl,
  ssl: { rejectUnauthorized: false },
});

await target.connect();
try {
  const before = await inspectReadiness();
  printReadiness(projectRef, before);

  if (!apply) {
    if (!before.ready) process.exitCode = 2;
  } else if (before.ready) {
    console.log("O schema do Meu Quadro ja esta publicado; nenhuma escrita foi necessaria.");
  } else {
    if (!before.baseReady && before.basePresentCount > 0) {
      throw new Error(
        `Schema base parcial detectado (${before.basePresentCount} itens presentes). Revise antes de aplicar: ${before.baseMissing.join(", ")}.`,
      );
    }

    await assertBaseDependencies();
    const sqlToApply = before.baseReady
      ? upgradeSql
      : `${baseSql}\n${upgradeSql}`;
    await target.query("BEGIN");
    try {
      await target.query(
        "SELECT pg_advisory_xact_lock(hashtext('siplan-hub:my-day-board-schema'))",
      );
      await target.query(sqlToApply);
      await target.query("COMMIT");
    } catch (error) {
      await target.query("ROLLBACK");
      throw error;
    }

    await target.query("NOTIFY pgrst, 'reload schema'");
    const after = await inspectReadiness();
    if (!after.ready) {
      throw new Error(`Publicacao incompleta: ${after.missing.join(", ")}.`);
    }
    console.log("Schema, RLS e permissoes do Meu Quadro publicados e validados com sucesso.");
  }
} finally {
  await target.end();
}

function validateMigrationFiles() {
  const readMigration = (migration) => {
    const migrationPath = path.resolve("supabase", "migrations", migration);
    if (!fs.existsSync(migrationPath)) fail(`Migration ausente: ${migration}`);
    const sql = fs.readFileSync(migrationPath, "utf8");
    if (!sql.trim()) fail(`Migration vazia: ${migration}`);
    if (/\b(?:COMMIT|ROLLBACK|VACUUM)\s*;/i.test(sql)) {
      fail(`Migration incompativel com aplicacao transacional: ${migration}`);
    }
    return sql;
  };

  const baseSql = readMigration(BASE_MIGRATION);
  const upgradeSql = UPGRADE_MIGRATIONS.map(readMigration).join("\n");

  for (const requiredToken of [
    "is_completion BOOLEAN",
    "update_my_day_board_column",
    "sync_my_day_board_cards",
    "reorder_my_day_board_columns",
    "complete_my_day_task",
  ]) {
    if (!upgradeSql.includes(requiredToken)) {
      fail(`Evolucao do Meu Quadro incompleta: ${requiredToken}`);
    }
  }

  for (const table of EXPECTED_TABLES) {
    if (!new RegExp(`CREATE\\s+TABLE\\s+public\\.${table}\\b`, "i").test(baseSql)) {
      fail(`Criacao da tabela ausente no pacote: ${table}`);
    }
    if (!new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i").test(baseSql)) {
      fail(`Ativacao de RLS ausente no pacote: ${table}`);
    }
  }
  for (const action of EXPECTED_PERMISSIONS) {
    if (!baseSql.includes(`('work_board', '${action}'`)) {
      fail(`Permissao ausente no pacote: work_board.${action}`);
    }
  }
  return { baseSql, upgradeSql };
}

async function inspectReadiness() {
  const tableResult = await target.query(
    `SELECT tablename
     FROM pg_tables
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
  const upgradeFunctionResult = await target.query(
    `SELECT signature
     FROM unnest($1::text[]) AS expected(signature)
     WHERE to_regprocedure(signature) IS NOT NULL`,
    [EXPECTED_UPGRADE_FUNCTIONS],
  );
  const upgradeColumnResult = await target.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'my_day_board_columns'
       AND column_name = 'is_completion'`,
  );
  const permissionResult = await target.query(
    `SELECT action
     FROM public.app_permissions
     WHERE resource = 'work_board' AND action = ANY($1::text[])`,
    [EXPECTED_PERMISSIONS],
  );
  const adminGrantResult = await target.query(
    `SELECT permission.action
     FROM public.app_role_permissions role_permission
     JOIN public.app_permissions permission ON permission.id = role_permission.permission_id
     JOIN public.app_roles role ON role.id = role_permission.role_id
     WHERE role.name = 'admin'
       AND permission.resource = 'work_board'
       AND permission.action = ANY($1::text[])`,
    [EXPECTED_PERMISSIONS],
  );
  const policyResult = await target.query(
    `SELECT policyname
     FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = ANY($1::text[])
       AND policyname = ANY($2::text[])`,
    [EXPECTED_TABLES, EXPECTED_POLICIES],
  );

  const tables = new Set(tableResult.rows.map((row) => row.tablename));
  const functions = new Set(functionResult.rows.map((row) => row.signature));
  const upgradeFunctions = new Set(upgradeFunctionResult.rows.map((row) => row.signature));
  const permissions = new Set(permissionResult.rows.map((row) => row.action));
  const adminGrants = new Set(adminGrantResult.rows.map((row) => row.action));
  const policies = new Set(policyResult.rows.map((row) => row.policyname));
  const baseMissing = [
    ...EXPECTED_TABLES.filter((item) => !tables.has(item)).map((item) => `tabela ${item}`),
    ...EXPECTED_FUNCTIONS.filter((item) => !functions.has(item)).map((item) => `funcao ${item}`),
    ...EXPECTED_PERMISSIONS.filter((item) => !permissions.has(item)).map((item) => `permissao work_board.${item}`),
    ...EXPECTED_PERMISSIONS.filter((item) => !adminGrants.has(item)).map((item) => `acesso admin work_board.${item}`),
    ...EXPECTED_POLICIES.filter((item) => !policies.has(item)).map((item) => `policy ${item}`),
  ];
  const upgradeMissing = [
    ...(upgradeColumnResult.rowCount === 1 ? [] : ["coluna my_day_board_columns.is_completion"]),
    ...EXPECTED_UPGRADE_FUNCTIONS
      .filter((item) => !upgradeFunctions.has(item))
      .map((item) => `funcao ${item}`),
  ];
  const basePresentCount = tables.size + functions.size + permissions.size + adminGrants.size + policies.size;

  return {
    ready: baseMissing.length === 0 && upgradeMissing.length === 0,
    baseReady: baseMissing.length === 0,
    baseMissing,
    upgradeMissing,
    missing: [...baseMissing, ...upgradeMissing],
    basePresentCount,
    tableCount: tables.size,
    functionCount: functions.size,
    upgradeFunctionCount: upgradeFunctions.size,
    upgradeColumnCount: upgradeColumnResult.rowCount,
    permissionCount: permissions.size,
    adminGrantCount: adminGrants.size,
    policyCount: policies.size,
  };
}

function printReadiness(projectRef, readiness) {
  console.log(`Projeto: ${projectRef ?? "nao identificado"}.`);
  console.log(
    `Meu Quadro: ${readiness.tableCount}/${EXPECTED_TABLES.length} tabelas, ` +
      `${readiness.functionCount}/${EXPECTED_FUNCTIONS.length} funcoes, ` +
      `${readiness.permissionCount}/${EXPECTED_PERMISSIONS.length} permissoes, ` +
      `${readiness.adminGrantCount}/${EXPECTED_PERMISSIONS.length} acessos administrativos e ` +
      `${readiness.policyCount}/${EXPECTED_POLICIES.length} policies.`,
  );
  console.log(
    `Evolucoes: ${readiness.upgradeColumnCount}/1 coluna e ` +
      `${readiness.upgradeFunctionCount}/${EXPECTED_UPGRADE_FUNCTIONS.length} funcoes.`,
  );
  if (readiness.missing.length) console.log(`Pendencias: ${readiness.missing.join(", ")}.`);
}

async function assertBaseDependencies() {
  const result = await target.query(`
    SELECT
      to_regclass('public.app_permissions') IS NOT NULL AS permissions,
      to_regclass('public.app_roles') IS NOT NULL AS roles,
      to_regclass('public.app_role_permissions') IS NOT NULL AS role_permissions,
      to_regclass('public.my_day_preferences') IS NOT NULL AS preferences,
      to_regclass('public.my_day_tasks') IS NOT NULL AS tasks,
      to_regclass('public.notifications') IS NOT NULL AS notifications,
      to_regprocedure('public.has_permission(uuid,text,text)') IS NOT NULL AS has_permission,
      to_regprocedure('public.update_updated_at_column()') IS NOT NULL AS updated_at
  `);
  const missing = Object.entries(result.rows[0])
    .filter(([, present]) => !present)
    .map(([dependency]) => dependency);
  if (missing.length) throw new Error(`Dependencias base ausentes: ${missing.join(", ")}.`);

  const columns = await target.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'my_day_preferences' AND column_name IN ('widget_order', 'widget_layout'))
        OR
        (table_name = 'notifications' AND column_name IN ('category', 'type', 'permission_resource', 'title', 'message', 'action_url'))
      )
  `);
  if (columns.rowCount !== 8) {
    throw new Error("Colunas base de preferencias ou notificacoes estao incompletas.");
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

function fail(message) {
  console.error(message);
  process.exit(1);
}
