import fs from "node:fs";
import pg from "pg";

const { Client } = pg;
const EXPECTED_TABLES = 27;

loadDotEnv();
const targetUrl = process.env.SUPABASE_DB_URL;
const apiUrl = process.env.VITE_SUPABASE_URL;
if (!targetUrl || !apiUrl)
  fail("Defina SUPABASE_DB_URL e VITE_SUPABASE_URL no ambiente ou .env.");

const target = new Client(
  connectionOptions(targetUrl, process.env.CS_CX_TARGET_SSL !== "false"),
);
await target.connect();
try {
  const schema = await target.query(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE rowsecurity)::int AS with_rls,
           EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'cs_cx_user_map'
               AND column_name = 'mapping_ignored'
           ) AS mapping_exceptions,
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
           ), true) AS nps_responses_immutable
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'cs_cx_%'
  `);
  const migration = await target.query(`
    SELECT id, mode, status, started_at, completed_at
    FROM public.cs_cx_migration_runs
    ORDER BY started_at DESC
    LIMIT 1
  `);
  const users = await target.query(`
    SELECT count(*) FILTER (WHERE source_present AND active AND NOT mapping_ignored)::int AS eligible,
           count(*) FILTER (WHERE source_present AND active AND NOT mapping_ignored AND profile_id IS NOT NULL)::int AS linked,
           count(*) FILTER (WHERE source_present AND active AND NOT mapping_ignored AND profile_id IS NULL)::int AS pending,
           count(*) FILTER (WHERE source_present AND active AND mapping_ignored)::int AS ignored
    FROM public.cs_cx_user_map
  `);
  const attachments = await target.query(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE storage_path IS NOT NULL)::int AS copied
    FROM (
      SELECT storage_path FROM public.cs_cx_request_attachments
      WHERE origin = 'legacy' AND source_present
      UNION ALL
      SELECT storage_path FROM public.cs_cx_visit_attachments
      WHERE origin = 'legacy' AND source_present
    ) files
  `);
  const permissions = await target.query(`
    SELECT count(*)::int AS total, count(role_permission.id)::int AS admin_linked
    FROM public.app_permissions permission
    LEFT JOIN public.app_roles role ON role.name = 'admin'
    LEFT JOIN public.app_role_permissions role_permission
      ON role_permission.role_id = role.id AND role_permission.permission_id = permission.id
    WHERE permission.resource = 'menu_cs_cx' OR permission.resource LIKE 'cs_cx_%'
  `);
  const webhook = await probeNpsWebhook(apiUrl);
  const publicNps = await probePublicNps(apiUrl);

  const schemaRow = schema.rows[0];
  const runRow = migration.rows[0];
  const userRow = users.rows[0];
  const attachmentRow = attachments.rows[0];
  const permissionRow = permissions.rows[0];
  const checks = [
    [
      "Schema",
      schemaRow.total === EXPECTED_TABLES &&
        schemaRow.with_rls === EXPECTED_TABLES &&
        schemaRow.mapping_exceptions,
      `${schemaRow.total}/${EXPECTED_TABLES} tabelas; RLS ${schemaRow.with_rls}/${EXPECTED_TABLES}; exceções de usuário ${schemaRow.mapping_exceptions ? "OK" : "ausentes"}`,
    ],
    [
      "Integridade NPS",
      schemaRow.nps_responses_immutable,
      schemaRow.nps_responses_immutable
        ? "respostas sem INSERT/UPDATE autenticado; importação desativada"
        : "respostas ainda permitem criação, edição ou importação autenticada",
    ],
    [
      "Carga",
      runRow?.status === "completed" &&
        ["initial", "delta"].includes(runRow.mode),
      runRow
        ? `${runRow.mode}/${runRow.status}; ${runRow.completed_at?.toISOString() ?? "sem conclusão"}`
        : "ausente",
    ],
    [
      "Usuários",
      userRow.pending === 0,
      `${userRow.linked}/${userRow.eligible} ativos elegíveis vinculados; ${userRow.ignored} ignorado(s); ${userRow.pending} pendente(s)`,
    ],
    [
      "Anexos",
      attachmentRow.copied === attachmentRow.total,
      `${attachmentRow.copied}/${attachmentRow.total} copiado(s)`,
    ],
    [
      "Permissões admin",
      permissionRow.total > 0 &&
        permissionRow.admin_linked === permissionRow.total,
      `${permissionRow.admin_linked}/${permissionRow.total}`,
    ],
    [
      "Webhook NPS",
      webhook.deployed && webhook.protected,
      `HTTP ${webhook.status}; ${webhook.deployed ? "implantado" : "ausente"}; ${webhook.protected ? "protegido" : "proteção não confirmada"}`,
    ],
    [
      "NPS publico",
      publicNps.deployed && publicNps.cors,
      `HTTP ${publicNps.status}; ${publicNps.deployed ? "implantado" : "ausente"}; CORS ${publicNps.cors ? "OK" : "pendente"}`,
    ],
  ];

  for (const [label, ok, detail] of checks)
    console.log(`${ok ? "OK" : "PENDENTE"} - ${label}: ${detail}`);
  const pending = checks.filter(([, ok]) => !ok).length;
  console.log(
    pending === 0
      ? "READY - CS/CX pronto para homologação humana."
      : `NOT_READY - ${pending} gate(s) pendente(s).`,
  );
  process.exitCode = pending === 0 ? 0 : 2;
} finally {
  await target.end();
}

async function probeNpsWebhook(publicUrl) {
  try {
    const response = await fetch(
      `${publicUrl.replace(/\/$/, "")}/functions/v1/cs-cx-nps-webhook`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
    return {
      status: response.status,
      deployed: response.status !== 404,
      protected: [401, 403].includes(response.status),
    };
  } catch {
    return { status: 0, deployed: false, protected: false };
  }
}

async function probePublicNps(publicUrl) {
  try {
    const response = await fetch(
      `${publicUrl.replace(/\/$/, "")}/functions/v1/cs-cx-nps-public`,
      {
        method: "OPTIONS",
      },
    );
    return {
      status: response.status,
      deployed: response.status !== 404,
      cors:
        response.status === 204 &&
        response.headers.get("access-control-allow-origin") === "*",
    };
  } catch {
    return { status: 0, deployed: false, cors: false };
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
