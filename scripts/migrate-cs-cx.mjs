import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import pg from 'pg';

const { Client } = pg;
const VALID_MODES = new Set(['initial', 'delta', 'verify']);
const args = new Set(process.argv.slice(2));
const mode = [...args].find((arg) => VALID_MODES.has(arg)) ?? 'verify';
const apply = args.has('--apply');

loadDotEnv();

if (!VALID_MODES.has(mode)) {
  fail('Modo invalido. Use initial, delta ou verify.');
}
if (mode !== 'verify' && !apply) {
  fail('Carga bloqueada: acrescente --apply. Sem essa flag nenhuma escrita e feita.');
}

const sourceUrl = process.env.CS_CX_SOURCE_DATABASE_URL;
const targetUrl = process.env.SUPABASE_DB_URL;
if (!sourceUrl || !targetUrl) {
  fail('Defina CS_CX_SOURCE_DATABASE_URL e SUPABASE_DB_URL no ambiente ou .env.');
}

const source = new Client(connectionOptions(sourceUrl, process.env.CS_CX_SOURCE_SSL === 'true'));
const target = new Client(connectionOptions(targetUrl, process.env.CS_CX_TARGET_SSL !== 'false'));

const TABLES = [
  {
    source: 'users',
    target: 'cs_cx_user_map',
    hasNoOrigin: true,
    query: `SELECT id, username, email, nome_completo, role::text AS role, ativo,
      pode_ver_todos_lancamentos, perfil_acesso_id, data_criacao, ultimo_login, ultimo_acesso
      FROM users ORDER BY id`,
    map: (row) => ({
      legacy_id: row.id,
      username: row.username,
      email: row.email,
      full_name: row.nome_completo,
      legacy_role: row.role,
      legacy_access_profile_id: row.perfil_acesso_id,
      active: row.ativo,
      can_view_all_entries: row.pode_ver_todos_lancamentos,
      created_at: row.data_criacao,
      last_login_at: row.ultimo_login,
      last_access_at: row.ultimo_acesso,
    }),
  },
  {
    source: 'produtos',
    target: 'cs_cx_products',
    query: `SELECT id, cod_produto, nome, descricao, ativo, data_criacao
      FROM produtos ORDER BY id`,
    map: (row) => ({
      legacy_id: row.id,
      product_code: row.cod_produto,
      name: row.nome,
      description: row.descricao,
      active: row.ativo,
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'cartorios',
    target: 'cs_cx_registry_offices',
    query: `SELECT id, nome, codigo_sap, ativo, data_criacao, data_analise,
      observacao_analise, observacoes, contato, analista_responsavel_id
      FROM cartorios ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      name: row.nome,
      sap_code: row.codigo_sap,
      active: row.ativo,
      analysis_at: row.data_analise,
      analysis_notes: row.observacao_analise,
      notes: row.observacoes,
      contact_details: row.contato,
      legacy_analyst_user_id: row.analista_responsavel_id,
      analyst_profile_id: maps.profiles.get(key(row.analista_responsavel_id)) ?? null,
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'cartorio_produtos',
    target: 'cs_cx_registry_office_products',
    query: `SELECT id, cartorio_id, produto_id, data_implantacao, data_criacao
      FROM cartorio_produtos ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      registry_office_id: requiredMap(maps.offices, row.cartorio_id, 'cartorio'),
      product_id: requiredMap(maps.products, row.produto_id, 'produto'),
      implementation_date: row.data_implantacao,
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'registros',
    target: 'cs_cx_requests',
    query: `SELECT id, chamado, descricao, modulo, solicitante, responsavel,
      data_solicitacao, previsao_entrega, data_entrega, status, observacao,
      cartorio_id, usuario_id, data_criacao, data_atualizacao
      FROM registros ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      ticket_number: row.chamado,
      description: row.descricao,
      module: row.modulo,
      requester: row.solicitante,
      responsible: row.responsavel,
      requested_on: row.data_solicitacao,
      expected_delivery_on: row.previsao_entrega,
      delivered_on: row.data_entrega,
      status: row.status,
      notes: row.observacao,
      registry_office_id: requiredMap(maps.offices, row.cartorio_id, 'cartorio'),
      legacy_user_id: row.usuario_id,
      author_profile_id: maps.profiles.get(key(row.usuario_id)) ?? null,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao,
    }),
  },
  {
    source: 'anexos',
    target: 'cs_cx_request_attachments',
    query: `SELECT id, nome_arquivo, nome_original, tipo_mime, tamanho,
      registro_id, usuario_id, data_upload FROM anexos ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      request_id: requiredMap(maps.requests, row.registro_id, 'registro'),
      stored_name: row.nome_arquivo,
      original_name: row.nome_original,
      mime_type: row.tipo_mime,
      size_bytes: row.tamanho,
      storage_path: null,
      legacy_user_id: row.usuario_id,
      uploaded_by: maps.profiles.get(key(row.usuario_id)) ?? null,
      uploaded_at: row.data_upload,
    }),
  },
  {
    source: 'contatos',
    target: 'cs_cx_contacts',
    query: `SELECT id, data_contato, anotacoes, pendencias, produto_id,
      pessoa_contato, contato, cartorio_id, chamado, usuario_id,
      data_criacao, data_atualizacao FROM contatos ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      contact_date: row.data_contato,
      notes: row.anotacoes,
      pending_items: row.pendencias,
      product_id: requiredMap(maps.products, row.produto_id, 'produto'),
      contact_person: row.pessoa_contato,
      contact_details: row.contato,
      registry_office_id: requiredMap(maps.offices, row.cartorio_id, 'cartorio'),
      ticket_number: row.chamado,
      legacy_user_id: row.usuario_id,
      author_profile_id: maps.profiles.get(key(row.usuario_id)) ?? null,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao,
    }),
  },
  auditSpec('logs_auditoria', 'registro', 'registro_id'),
  auditSpec('logs_auditoria_contatos', 'contato', 'contato_id'),
];

async function main() {
  await source.connect();
  await target.connect();
  await source.query(`SET TIME ZONE 'UTC'`);
  await target.query(`SET TIME ZONE 'UTC'`);

  try {
    await assertTargetReady();
    if (mode === 'verify') {
      const ok = await verify();
      process.exitCode = ok ? 0 : 2;
      return;
    }
    await migrate();
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

async function migrate() {
  const runResult = await target.query(
    `INSERT INTO public.cs_cx_migration_runs (mode, status)
     VALUES ($1, 'running') RETURNING id`,
    [mode],
  );
  const runId = runResult.rows[0].id;
  const stats = {};

  try {
    await target.query('BEGIN');
    const maps = await loadMaps();

    for (const spec of TABLES) {
      const sourceResult = await source.query(spec.query);
      await markSourceMissing(spec);

      const rows = sourceResult.rows.map((row) =>
        withSyncFields(spec.map(row, maps), !spec.hasNoOrigin),
      );
      await bulkUpsert(spec, rows);
      stats[spec.source] = { scanned: rows.length };

      await refreshMaps(spec.target, maps);
      const activeCount = await targetCount(spec);
      await target.query(
        `INSERT INTO public.cs_cx_migration_state
          (table_name, source_row_count, target_row_count, source_max_legacy_id, last_run_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (table_name) DO UPDATE SET
           source_row_count = EXCLUDED.source_row_count,
           target_row_count = EXCLUDED.target_row_count,
           source_max_legacy_id = EXCLUDED.source_max_legacy_id,
           last_full_scan_at = now(), last_run_id = EXCLUDED.last_run_id, updated_at = now()`,
        [spec.source, rows.length, activeCount, maxLegacyId(rows), runId],
      );
      console.log(`${spec.source}: ${rows.length} linhas reconciliadas`);
    }

    await target.query('COMMIT');
    await target.query(
      `UPDATE public.cs_cx_migration_runs
       SET status = 'completed', completed_at = now(), table_stats = $2::jsonb
       WHERE id = $1`,
      [runId, JSON.stringify(stats)],
    );
    console.log(`Migracao ${mode} concluida. Run ID: ${runId}`);
  } catch (error) {
    await target.query('ROLLBACK').catch(() => undefined);
    await target.query(
      `UPDATE public.cs_cx_migration_runs
       SET status = 'failed', completed_at = now(), error_message = $2
       WHERE id = $1`,
      [runId, String(error.message ?? error).slice(0, 4000)],
    ).catch(() => undefined);
    throw error;
  }
}

async function verify() {
  let valid = true;
  console.log('Tabela origem -> destino ativo');
  for (const spec of TABLES) {
    const sourceResult = await source.query(`SELECT count(*)::bigint AS count FROM ${spec.source}`);
    const sourceCount = Number(sourceResult.rows[0].count);
    const activeCount = await targetCount(spec);
    const status = sourceCount === activeCount ? 'OK' : 'DIVERGENTE';
    console.log(`${spec.source}: ${sourceCount} -> ${activeCount} [${status}]`);
    valid &&= sourceCount === activeCount;
  }
  return valid;
}

async function assertTargetReady() {
  const result = await target.query(
    `SELECT to_regclass('public.cs_cx_migration_runs') AS control,
            to_regclass('public.cs_cx_registry_offices') AS core`,
  );
  if (!result.rows[0].control || !result.rows[0].core) {
    throw new Error('Aplique primeiro as migrations 20260811110000 e 20260811111000.');
  }
}

async function loadMaps() {
  const maps = { profiles: new Map(), products: new Map(), offices: new Map(), requests: new Map() };
  await refreshMaps('cs_cx_user_map', maps);
  await refreshMaps('cs_cx_products', maps);
  await refreshMaps('cs_cx_registry_offices', maps);
  await refreshMaps('cs_cx_requests', maps);
  return maps;
}

async function refreshMaps(table, maps) {
  const destinations = {
    cs_cx_user_map: ['profiles', 'profile_id'],
    cs_cx_products: ['products', 'id'],
    cs_cx_registry_offices: ['offices', 'id'],
    cs_cx_requests: ['requests', 'id'],
  };
  const destination = destinations[table];
  if (!destination) return;
  const [mapName, valueColumn] = destination;
  const result = await target.query(
    `SELECT legacy_id, ${valueColumn} AS value FROM public.${table}`,
  );
  maps[mapName] = new Map(result.rows.map((row) => [key(row.legacy_id), row.value]));
}

async function markSourceMissing(spec) {
  if (spec.auditSource) {
    await target.query(
      `UPDATE public.${spec.target} SET source_present = false
       WHERE source_table = $1`,
      [spec.auditSource],
    );
    return;
  }
  if (spec.hasNoOrigin) {
    await target.query(`UPDATE public.${spec.target} SET source_present = false`);
    return;
  }
  await target.query(
    `UPDATE public.${spec.target} SET source_present = false WHERE origin = 'legacy'`,
  );
}

async function targetCount(spec) {
  const result = spec.auditSource
    ? await target.query(
      `SELECT count(*)::bigint AS count FROM public.${spec.target}
       WHERE source_present AND source_table = $1`,
      [spec.auditSource],
    )
    : spec.hasNoOrigin
      ? await target.query(
          `SELECT count(*)::bigint AS count FROM public.${spec.target} WHERE source_present`,
        )
      : await target.query(
          `SELECT count(*)::bigint AS count FROM public.${spec.target}
           WHERE source_present AND origin = 'legacy'`,
        );
  return Number(result.rows[0].count);
}

async function bulkUpsert(spec, rows) {
  if (rows.length === 0) return;
  const batchSize = 250;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const columns = Object.keys(batch[0]);
    const values = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    const conflict = spec.conflict ?? ['legacy_id'];
    const updates = columns
      .filter((column) => !conflict.includes(column))
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(', ');
    await target.query(
      `INSERT INTO public.${spec.target} (${columns.join(', ')})
       VALUES ${tuples.join(', ')}
       ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${updates}`,
      values,
    );
  }
}

function auditSpec(sourceTable, entityType, entityColumn) {
  return {
    source: sourceTable,
    target: 'cs_cx_audit_logs',
    auditSource: sourceTable,
    conflict: ['source_table', 'legacy_id'],
    query: `SELECT id, acao, ${entityColumn} AS entity_id, dados_anteriores,
      dados_novos, usuario_id, data_acao, ip_address, user_agent
      FROM ${sourceTable} ORDER BY id`,
    map: (row, maps) => ({
      source_table: sourceTable,
      legacy_id: row.id,
      action: row.acao,
      entity_type: entityType,
      legacy_entity_id: row.entity_id,
      old_data: parseLegacyJson(row.dados_anteriores),
      new_data: parseLegacyJson(row.dados_novos),
      legacy_user_id: row.usuario_id,
      actor_profile_id: maps.profiles.get(key(row.usuario_id)) ?? null,
      occurred_at: row.data_acao,
      ip_address: net.isIP(row.ip_address ?? '') ? row.ip_address : null,
      user_agent: row.user_agent,
    }),
  };
}

function withSyncFields(row, includeOrigin) {
  const normalized = normalize(row);
  return {
    ...row,
    source_hash: crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
    ...(includeOrigin ? { origin: 'legacy' } : {}),
    source_present: true,
    last_synced_at: new Date(),
  };
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseLegacyJson(value) {
  if (value == null || value === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

function requiredMap(map, legacyId, entity) {
  const value = map.get(key(legacyId));
  if (!value) throw new Error(`${entity} legado ${legacyId} nao foi encontrado no destino.`);
  return value;
}

function maxLegacyId(rows) {
  if (rows.length === 0) return null;
  return Math.max(...rows.map((row) => Number(row.legacy_id)));
}

function key(value) {
  return value == null ? '' : String(value);
}

function connectionOptions(connectionString, ssl) {
  return { connectionString, ssl: ssl ? { rejectUnauthorized: false } : undefined };
}

function loadDotEnv() {
  if (!fs.existsSync('.env')) return;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main().catch((error) => {
  console.error('Falha na migracao CS/CX:', error.message ?? error);
  process.exitCode = 1;
});
