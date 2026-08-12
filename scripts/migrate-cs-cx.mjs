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
  {
    source: 'agendamentos',
    target: 'cs_cx_appointments',
    query: `SELECT id, titulo, data_hora, duracao_minutos, tipo::text AS tipo,
      status::text AS status, cartorio_id, contato_id, responsavel_id,
      usuario_criador_id, descricao, local, observacoes, resultado,
      data_criacao, data_atualizacao, data_realizacao, data_cancelamento
      FROM agendamentos ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      title: row.titulo,
      starts_at: row.data_hora,
      duration_minutes: row.duracao_minutos,
      appointment_type: row.tipo,
      status: row.status,
      registry_office_id: maps.offices.get(key(row.cartorio_id)) ?? null,
      contact_id: maps.contacts.get(key(row.contato_id)) ?? null,
      legacy_responsible_user_id: row.responsavel_id,
      responsible_profile_id: maps.profiles.get(key(row.responsavel_id)) ?? null,
      legacy_creator_user_id: row.usuario_criador_id,
      created_by: maps.profiles.get(key(row.usuario_criador_id)) ?? null,
      description: row.descricao,
      location: row.local,
      notes: row.observacoes,
      result: row.resultado,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao,
      realized_at: row.data_realizacao,
      canceled_at: row.data_cancelamento,
    }),
  },
  {
    source: 'categorias_rotina',
    target: 'cs_cx_routine_categories',
    query: `SELECT id, nome, descricao, cor_display, ativo, data_criacao
      FROM categorias_rotina ORDER BY id`,
    map: (row) => ({
      legacy_id: row.id,
      name: row.nome,
      description: row.descricao,
      display_color: row.cor_display ?? '#6c757d',
      active: row.ativo ?? true,
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'tipos_rotina',
    target: 'cs_cx_routine_types',
    query: `SELECT id, nome, descricao, ativo, data_criacao
      FROM tipos_rotina ORDER BY id`,
    map: (row) => ({
      legacy_id: row.id,
      name: row.nome,
      description: row.descricao,
      active: row.ativo ?? true,
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'modelos_rotina',
    target: 'cs_cx_routine_models',
    query: `SELECT id, nome, descricao, ativo, usuario_criador_id,
      data_criacao, data_atualizacao FROM modelos_rotina ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      name: row.nome,
      description: row.descricao,
      active: row.ativo ?? true,
      legacy_creator_user_id: row.usuario_criador_id,
      created_by: maps.profiles.get(key(row.usuario_criador_id)) ?? null,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao ?? row.data_criacao,
    }),
  },
  {
    source: 'modelo_rotina_produtos',
    target: 'cs_cx_routine_model_products',
    query: `SELECT id, modelo_rotina_id, produto_id, data_criacao
      FROM modelo_rotina_produtos ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      routine_model_id: requiredMap(maps.routineModels, row.modelo_rotina_id, 'modelo de rotina'),
      product_id: requiredMap(maps.products, row.produto_id, 'produto'),
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'itens_modelo_rotina',
    target: 'cs_cx_routine_model_items',
    query: `SELECT id, modelo_rotina_id, nome, descricao, categoria_id,
      tipo_rotina_id, ordem, obrigatorio, ativo_padrao, data_criacao
      FROM itens_modelo_rotina ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      routine_model_id: requiredMap(maps.routineModels, row.modelo_rotina_id, 'modelo de rotina'),
      name: row.nome,
      description: row.descricao,
      category_id: requiredMap(maps.routineCategories, row.categoria_id, 'categoria de rotina'),
      routine_type_id: requiredMap(maps.routineTypes, row.tipo_rotina_id, 'tipo de rotina'),
      sort_order: row.ordem ?? 0,
      required: row.obrigatorio ?? false,
      default_active: row.ativo_padrao,
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'rotinas_cartorio',
    target: 'cs_cx_office_routines',
    query: `SELECT id, cartorio_id, modelo_rotina_id, usuario_id, ativo,
      data_aplicacao, observacao FROM rotinas_cartorio ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      registry_office_id: requiredMap(maps.offices, row.cartorio_id, 'cartorio'),
      routine_model_id: requiredMap(maps.routineModels, row.modelo_rotina_id, 'modelo de rotina'),
      legacy_user_id: row.usuario_id,
      applied_by: maps.profiles.get(key(row.usuario_id)) ?? null,
      active: row.ativo ?? true,
      applied_at: row.data_aplicacao,
      notes: row.observacao,
      updated_at: row.data_aplicacao,
    }),
  },
  {
    source: 'config_item_cartorio',
    target: 'cs_cx_office_routine_items',
    query: `SELECT id, rotina_cartorio_id, item_modelo_id, ativo, observacao,
      observacao_analise, data_configuracao, usuario_configuracao_id, data_analise
      FROM config_item_cartorio ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      office_routine_id: requiredMap(maps.officeRoutines, row.rotina_cartorio_id, 'rotina do cartorio'),
      model_item_id: requiredMap(maps.routineItems, row.item_modelo_id, 'item de rotina'),
      active: row.ativo,
      notes: row.observacao,
      analysis_notes: row.observacao_analise,
      configured_at: row.data_configuracao,
      legacy_configured_by_user_id: row.usuario_configuracao_id,
      configured_by: maps.profiles.get(key(row.usuario_configuracao_id)) ?? null,
      analyzed_at: row.data_analise,
      updated_at: row.data_analise ?? row.data_configuracao,
    }),
  },
  {
    source: 'historico_rotina_cartorio',
    target: 'cs_cx_routine_history',
    query: `SELECT id, rotina_cartorio_id, item_modelo_id, acao, status_anterior,
      status_novo, observacao, usuario_id, data_acao, ip_address
      FROM historico_rotina_cartorio ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      office_routine_id: maps.officeRoutines.get(key(row.rotina_cartorio_id)) ?? null,
      model_item_id: maps.routineItems.get(key(row.item_modelo_id)) ?? null,
      action: row.acao,
      previous_status: row.status_anterior,
      new_status: row.status_novo,
      notes: row.observacao,
      legacy_user_id: row.usuario_id,
      actor_profile_id: maps.profiles.get(key(row.usuario_id)) ?? null,
      occurred_at: row.data_acao,
      ip_address: net.isIP(row.ip_address ?? '') ? row.ip_address : null,
    }),
  },
  {
    source: 'visitas_cartorio',
    target: 'cs_cx_visits',
    query: `SELECT id, cartorio_id, usuario_visitante_id, data_visita,
      hora_inicio, hora_fim, status, objetivo_visita, observacoes_gerais,
      data_criacao, data_atualizacao FROM visitas_cartorio ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      registry_office_id: requiredMap(maps.offices, row.cartorio_id, 'cartorio'),
      legacy_visitor_user_id: row.usuario_visitante_id,
      visitor_profile_id: maps.profiles.get(key(row.usuario_visitante_id)) ?? null,
      visit_date: row.data_visita,
      start_time: row.hora_inicio,
      end_time: row.hora_fim,
      status: row.status ?? 'aberto',
      objective: row.objetivo_visita,
      general_notes: row.observacoes_gerais,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao ?? row.data_criacao,
    }),
  },
  {
    source: 'itens_checklist_visita',
    target: 'cs_cx_visit_checklist_items',
    query: `SELECT id, visita_id, nome_item, descricao, verificado, observacao,
      ordem, data_criacao FROM itens_checklist_visita ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      visit_id: requiredMap(maps.visits, row.visita_id, 'visita'),
      name: row.nome_item,
      description: row.descricao,
      checked: row.verificado ?? false,
      notes: row.observacao,
      sort_order: row.ordem ?? 0,
      created_at: row.data_criacao,
    }),
  },
  {
    source: 'pendencias_visita',
    target: 'cs_cx_visit_pending_items',
    query: `SELECT id, visita_id, titulo, descricao, prioridade, categoria,
      observacao, data_limite, status, registro_id, data_criacao, data_atualizacao
      FROM pendencias_visita ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      visit_id: requiredMap(maps.visits, row.visita_id, 'visita'),
      title: row.titulo,
      description: row.descricao,
      priority: row.prioridade ?? 'media',
      category: row.categoria,
      notes: row.observacao,
      due_date: row.data_limite,
      status: row.status ?? 'pendente',
      request_id: maps.requests.get(key(row.registro_id)) ?? null,
      legacy_request_id: row.registro_id,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao ?? row.data_criacao,
    }),
  },
  {
    source: 'anexos_visita',
    target: 'cs_cx_visit_attachments',
    query: `SELECT id, visita_id, nome_arquivo, nome_original, tipo_mime,
      tamanho, descricao, usuario_id, data_upload FROM anexos_visita ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      visit_id: requiredMap(maps.visits, row.visita_id, 'visita'),
      stored_name: row.nome_arquivo,
      original_name: row.nome_original,
      mime_type: row.tipo_mime,
      size_bytes: row.tamanho,
      description: row.descricao,
      storage_path: null,
      legacy_user_id: row.usuario_id,
      uploaded_by: maps.profiles.get(key(row.usuario_id)) ?? null,
      uploaded_at: row.data_upload,
    }),
  },
  {
    source: 'respostas_nps',
    target: 'cs_cx_nps_responses',
    query: `SELECT id, cartorio_id, usuario_id, data_resposta, nome_respondente,
      cartorio_respondente, pontuacao, motivo_nota, sugestao_melhoria,
      classificacao, data_criacao, data_atualizacao FROM respostas_nps ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      registry_office_id: requiredMap(maps.offices, row.cartorio_id, 'cartorio'),
      legacy_user_id: row.usuario_id,
      author_profile_id: maps.profiles.get(key(row.usuario_id)) ?? null,
      responded_at: row.data_resposta,
      respondent_name: row.nome_respondente,
      respondent_office: row.cartorio_respondente,
      score: row.pontuacao,
      score_reason: row.motivo_nota,
      improvement_suggestion: row.sugestao_melhoria,
      classification: row.classificacao,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao ?? row.data_criacao,
    }),
  },
  {
    source: 'historico_nps',
    target: 'cs_cx_nps_history',
    query: `SELECT id, cartorio_id, usuario_id, data_inicio, data_fim,
      total_respostas, total_promotores, total_neutros, total_detratores,
      percentual_promotores, percentual_detratores, nps_score, observacoes,
      data_criacao, data_atualizacao FROM historico_nps ORDER BY id`,
    map: (row, maps) => ({
      legacy_id: row.id,
      registry_office_id: requiredMap(maps.offices, row.cartorio_id, 'cartorio'),
      legacy_user_id: row.usuario_id,
      generated_by: maps.profiles.get(key(row.usuario_id)) ?? null,
      period_start: row.data_inicio,
      period_end: row.data_fim,
      total_responses: row.total_respostas,
      total_promoters: row.total_promotores,
      total_neutrals: row.total_neutros,
      total_detractors: row.total_detratores,
      promoter_percentage: row.percentual_promotores,
      detractor_percentage: row.percentual_detratores,
      nps_score: row.nps_score,
      notes: row.observacoes,
      created_at: row.data_criacao,
      updated_at: row.data_atualizacao ?? row.data_criacao,
    }),
  },
  auditSpec('logs_auditoria', 'registro', 'registro_id'),
  auditSpec('logs_auditoria_contatos', 'contato', 'contato_id'),
  auditSpec('logs_auditoria_agendamentos', 'agendamento', 'agendamento_id'),
  auditSpec('logs_auditoria_visita', 'visita', 'visita_id'),
  auditSpec('logs_auditoria_nps', 'resposta_nps', 'resposta_nps_id', 'detalhes_importacao'),
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
            to_regclass('public.cs_cx_registry_offices') AS core,
            to_regclass('public.cs_cx_appointments') AS appointments,
            to_regclass('public.cs_cx_office_routine_items') AS routines,
            to_regclass('public.cs_cx_visits') AS visits,
            to_regclass('public.cs_cx_nps_responses') AS nps`,
  );
  if (!result.rows[0].control || !result.rows[0].core || !result.rows[0].appointments
      || !result.rows[0].routines || !result.rows[0].visits || !result.rows[0].nps) {
    throw new Error('Aplique todas as migrations CS/CX antes de executar a carga.');
  }
}

async function loadMaps() {
  const maps = {
    profiles: new Map(),
    products: new Map(),
    offices: new Map(),
    requests: new Map(),
    contacts: new Map(),
    routineCategories: new Map(),
    routineTypes: new Map(),
    routineModels: new Map(),
    routineItems: new Map(),
    officeRoutines: new Map(),
    visits: new Map(),
  };
  await refreshMaps('cs_cx_user_map', maps);
  await refreshMaps('cs_cx_products', maps);
  await refreshMaps('cs_cx_registry_offices', maps);
  await refreshMaps('cs_cx_requests', maps);
  await refreshMaps('cs_cx_contacts', maps);
  await refreshMaps('cs_cx_routine_categories', maps);
  await refreshMaps('cs_cx_routine_types', maps);
  await refreshMaps('cs_cx_routine_models', maps);
  await refreshMaps('cs_cx_routine_model_items', maps);
  await refreshMaps('cs_cx_office_routines', maps);
  await refreshMaps('cs_cx_visits', maps);
  return maps;
}

async function refreshMaps(table, maps) {
  const destinations = {
    cs_cx_user_map: ['profiles', 'profile_id'],
    cs_cx_products: ['products', 'id'],
    cs_cx_registry_offices: ['offices', 'id'],
    cs_cx_requests: ['requests', 'id'],
    cs_cx_contacts: ['contacts', 'id'],
    cs_cx_routine_categories: ['routineCategories', 'id'],
    cs_cx_routine_types: ['routineTypes', 'id'],
    cs_cx_routine_models: ['routineModels', 'id'],
    cs_cx_routine_model_items: ['routineItems', 'id'],
    cs_cx_office_routines: ['officeRoutines', 'id'],
    cs_cx_visits: ['visits', 'id'],
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

function auditSpec(sourceTable, entityType, entityColumn, importDetailsColumn = null) {
  return {
    source: sourceTable,
    target: 'cs_cx_audit_logs',
    auditSource: sourceTable,
    conflict: ['source_table', 'legacy_id'],
    query: `SELECT id, acao, ${entityColumn} AS entity_id, dados_anteriores,
      dados_novos, usuario_id, data_acao, ip_address, user_agent
      ${importDetailsColumn ? `, ${importDetailsColumn} AS import_details` : ''}
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
      ...(importDetailsColumn ? { import_details: row.import_details } : {}),
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
