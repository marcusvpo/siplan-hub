import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';

dotenv.config({ path: 'apps/api/.env' });
const schema = 'orion_listing_test_' + randomUUID().replaceAll('-', '');
assert.match(schema, /^orion_listing_test_[a-f0-9]{32}$/);
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
const api = Fastify();
let created = false, closeDatabase;
try {
  await database.connect();
  await database.query(`CREATE SCHEMA ${schema}`);
  created = true;
  await database.query(`SET search_path TO ${schema},public`);
  for (const file of (await readdir('database/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    await database.query(await readFile('database/migrations/' + file, 'utf8'));
  }
  const testUrl = new URL(process.env.DATABASE_URL);
  testUrl.searchParams.set('options', '-c search_path=' + schema + ',public');
  process.env.DATABASE_URL = testUrl.href;
  const { versionRoutes } = await import('../apps/api/src/versions.ts');
  const { postRoutes } = await import('../apps/api/src/posts.ts');
  ({ closeDatabase } = await import('../apps/api/src/db/index.ts'));
  await api.register(cookie, { secret: process.env.COOKIE_SECRET });
  await api.register(versionRoutes);
  await api.register(postRoutes);
  const get = async (path, query = {}, status = 200) => {
    const response = await api.inject({ url: '/api/v1/' + path + '?' + new URLSearchParams(query) });
    assert.equal(response.statusCode, status, response.body);
    return response.json();
  };
  const codes = ['6.9', '06.10', '06.03.03', '7.0', 'experimental-1', '999999999999999999999999999999'];
  const versions = [];
  for (const [index, code] of codes.entries()) {
    const result = await database.query(`INSERT INTO ca_versoes(codigo,produto_id,criado_em)
      SELECT $1,id,$2 FROM ca_produtos WHERE slug='oriontn' RETURNING id`, [code, `2020-01-${String(index + 1).padStart(2, '0')}`]);
    versions.push(Number(result.rows[0].id));
  }
  const other = (await database.query("INSERT INTO ca_versoes(codigo,produto_id) SELECT '06.03.03',id FROM ca_produtos WHERE slug='orionpro' RETURNING id")).rows[0].id;
  const versionQuery = { produto: 'oriontn' };
  const sortedCodes = async ordem => (await get('versoes', { ...versionQuery, ordem })).data.map(v => v.codigo);
  assert.deepEqual(await sortedCodes('versao_desc'), [codes[5], '7.0', '06.10', '6.9', '06.03.03', 'experimental-1']);
  assert.deepEqual(await sortedCodes('versao_asc'), ['06.03.03', '6.9', '06.10', '7.0', codes[5], 'experimental-1']);
  assert.deepEqual(await sortedCodes('criacao_desc'), [...codes].reverse());
  assert.deepEqual(await sortedCodes('criacao_asc'), codes);
  const versionFound = await get('versoes', { ...versionQuery, busca: '06.03' });
  assert.deepEqual(versionFound.data.map(v => v.id), [versions[2]]);
  assert(versionFound.data[0].criado_em);
  assert.equal((await get('versoes', { ...versionQuery, busca: '123.45' })).data.length, 0);
  for (const busca of ['6.3 OR 1=1', 'a', '%', '1'.repeat(31)]) await get('versoes', { busca }, 400);
  await get('versoes', { ordem: 'codigo;DROP TABLE ca_versoes' }, 400);
  console.log('OK: versão numérica asc/desc, números extensos, códigos legados, criação asc/desc, busca parcial e validação.');

  const ids = [];
  const insert = async (values = {}) => {
    const post = { title: 'Comunicado de teste', summary: 'Rotina da serventia', body: '<p>Orientações gerais.</p>', version: versions[2], type: 'novidade', status: 'publicado', date: '2020-06-01T10:00:00Z', format: 'html', ...values };
    const result = await database.query(`INSERT INTO ca_atualizacoes(titulo,resumo,slug,corpo,corpo_formato,versao_id,tipo,status,publicado_em)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [post.title, post.summary, randomUUID(), post.body, post.format, post.version, post.type, post.status, post.date]);
    return Number(result.rows[0].id);
  };
  ids.push(await insert({ title: 'Reconhecimento de firma', summary: 'Segurança na conferência', body: '<p>Trecho <strong>exclusivo</strong> do cartório &amp; atendimento.</p><p>Segunda linha.</p>' }));
  ids.push(await insert({ body: 'Exemplo literal <campo> 100% _teste_', format: 'text', date: '2020-06-02T10:00:00Z' }));
  for (let index = 2; index < 27; index++) ids.push(await insert({ date: `2020-07-${String(index + 1).padStart(2, '0')}T10:00:00Z` }));
  await insert({ body: '<p>Segredo exclusivo privado</p>', status: 'rascunho' });
  await insert({ body: '<p>Segredo exclusivo futuro</p>', status: 'agendado', date: '2099-01-01T10:00:00Z' });
  await insert({ body: '<p>Segredo exclusivo arquivado</p>', status: 'arquivado' });
  await insert({ body: '<p>exclusivo de outro sistema</p>', version: other });
  await insert({ body: '<p>exclusivo de outro tipo</p>', type: 'melhoria' });
  await insert({ body: '<p>exclusivo de outra versão</p>', version: versions[0] });
  const query = { produto: 'oriontn', tipo: 'novidade', versao_id: String(versions[2]) };
  const descending = await get('publicacoes', { ...query, ordem: 'recentes', limit: '50' });
  const ascending = await get('publicacoes', { ...query, ordem: 'antigas', limit: '50' });
  assert.deepEqual(ascending.data.map(p => p.id), ids);
  assert.deepEqual(descending.data.map(p => p.id), [...ids].reverse());
  assert.equal(descending.meta.total, 27);
  for (const busca of ['FIRMA', 'seguranca', 'exclusivo do cartorio & atendimento', 'atendimento. Segunda linha']) {
    const result = await get('publicacoes', { ...query, busca });
    assert.deepEqual(result.data.map(p => p.id), [ids[0]], busca);
    assert.equal(result.meta.total, 1);
    assert(!('corpo' in result.data[0]), 'A busca não expõe o corpo inteiro na listagem');
  }
  assert.deepEqual((await get('publicacoes', { ...query, busca: '<campo>' })).data.map(p => p.id), [ids[1]]);
  assert.deepEqual((await get('publicacoes', { ...query, busca: '%' })).data.map(p => p.id), [ids[1]], 'Termo literal, sem curinga SQL');
  for (const busca of ['<strong>', 'inexistente', "' OR 1=1 --", 'segredo exclusivo']) assert.equal((await get('publicacoes', { ...query, busca })).meta.total, 0);
  const first = await get('publicacoes', { ...query, ordem: 'antigas', page: '1' });
  const second = await get('publicacoes', { ...query, ordem: 'antigas', page: '2' });
  assert.equal(first.data.length, 20); assert.equal(second.data.length, 7);
  assert.deepEqual([...first.data, ...second.data].map(p => p.id), ids);
  const searchFromLastPage = await get('publicacoes', { ...query, ordem: 'recentes', busca: 'firma' });
  assert.equal(searchFromLastPage.data[0].id, ids[0], 'Busca encontra item além da primeira página da listagem');
  await get('publicacoes', { ...query, ordem: 'DROP TABLE ca_atualizacoes' }, 400);
  await get('publicacoes', { ...query, busca: 'a'.repeat(201) }, 400);
  await get('publicacoes', { ...query, page: '0' }, 400);
  console.log('OK: datas, título/subtítulo/conteúdo, acentos, HTML, busca literal, paginação, isolamento dos filtros e visibilidade pública.');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await api.close();
  await closeDatabase?.();
  if (created) await database.query(`DROP SCHEMA ${schema} CASCADE`);
  await database.end();
}
