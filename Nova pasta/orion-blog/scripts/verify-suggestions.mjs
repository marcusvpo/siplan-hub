import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';

dotenv.config({ path: 'apps/api/.env' });
const schema = 'orion_suggestion_test_' + randomUUID().replaceAll('-', '');
assert.match(schema, /^orion_suggestion_test_[a-f0-9]{32}$/);
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
const api = Fastify();
let created = false, closeDatabase, requestNumber = 0;
try {
  await database.connect();
  await database.query(`CREATE SCHEMA ${schema}`);
  created = true;
  await database.query(`SET search_path TO ${schema},public`);
  await database.query(await readFile('database/migrations/006_suggestions.sql', 'utf8'));
  const testUrl = new URL(process.env.DATABASE_URL);
  testUrl.searchParams.set('options', '-c search_path=' + schema + ',public');
  process.env.DATABASE_URL = testUrl.href;
  const { suggestionRoutes } = await import('../apps/api/src/suggestions.ts');
  ({ closeDatabase } = await import('../apps/api/src/db/index.ts'));
  await api.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await api.register(suggestionRoutes);
  const headers = { 'x-blog-action': '1', origin: process.env.APP_ORIGIN };
  const payload = { envio_id: randomUUID(), nome: '  Ana Souza  ', cartorio: '  1º Cartório de Notas  ', sugestao: '  Sugiro orientações de uso.\nObrigada!  ' };
  const send = (body = payload, extra = {}) => api.inject({ method: 'POST', url: '/api/v1/sugestoes', payload: body, headers, remoteAddress: `127.0.0.${++requestNumber}`, ...extra });
  let result = await send();
  assert.equal(result.statusCode, 201, result.body);
  assert.deepEqual(result.json(), { ok: true });
  assert.equal(result.headers['cache-control'], 'no-store');
  const stored = (await database.query('SELECT * FROM ca_sugestoes WHERE id=$1', [payload.envio_id])).rows[0];
  assert.equal(stored.nome, payload.nome.trim());
  assert.equal(stored.cartorio, payload.cartorio.trim());
  assert.equal(stored.sugestao, payload.sugestao.trim());
  assert(stored.criado_em instanceof Date);
  const retries = await Promise.all([send(), send(), send()]);
  assert(retries.every(response => response.statusCode === 200), 'Novas tentativas idempotentes');
  assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM ca_sugestoes')).rows[0].n, 1);
  assert.equal((await send({ ...payload, nome: 'Outra pessoa' })).statusCode, 409);
  for (const field of ['nome', 'cartorio', 'sugestao']) {
    for (const value of ['', '   ', null, 'a\u0000b']) {
      assert.equal((await send({ ...payload, envio_id: randomUUID(), [field]: value })).statusCode, 400, `${field} inválido`);
    }
    const missing = { ...payload }; delete missing[field];
    assert.equal((await send(missing)).statusCode, 400);
  }
  for (const [field, limit] of [['nome',100], ['cartorio',180], ['sugestao',4000]]) {
    assert.equal((await send({ ...payload, envio_id: randomUUID(), [field]: 'x'.repeat(limit + 1) })).statusCode, 400);
  }
  assert.equal((await send({ ...payload, envio_id: 'invalid' })).statusCode, 400);
  assert.equal((await send({ ...payload, admin: true })).statusCode, 400);
  assert.equal((await send(payload, { headers: {} })).statusCode, 403);
  assert.equal((await send(payload, { headers: { ...headers, origin: 'https://external.invalid' } })).statusCode, 403);
  assert.equal((await send(payload, { headers: { ...headers, 'sec-fetch-site': 'cross-site' } })).statusCode, 403);
  assert.equal((await send({ ...payload, sugestao: 'x'.repeat(40000) })).statusCode, 413);
  const literal = "Sugestão com apóstrofo: d'água; <script>alert(1)</script>";
  const literalId = randomUUID();
  assert.equal((await send({ ...payload, envio_id: literalId, sugestao: literal })).statusCode, 201);
  assert.equal((await database.query('SELECT sugestao FROM ca_sugestoes WHERE id=$1', [literalId])).rows[0].sugestao, literal, 'Texto preservado como dado, não executado');
  for (let index = 0; index < 5; index++) assert.equal((await send(payload, { remoteAddress: '10.0.0.1' })).statusCode, 200);
  assert.equal((await send(payload, { remoteAddress: '10.0.0.1' })).statusCode, 429);
  assert.equal((await api.inject('/api/v1/sugestoes')).statusCode, 404, 'Sugestões não possuem listagem pública');
  console.log('OK: persistência, campos obrigatórios, limites, texto literal, origem, rate limit e reenvio sem duplicação. Banco real preservado.');
} finally {
  await api.close();
  await closeDatabase?.();
  if (created) await database.query(`DROP SCHEMA ${schema} CASCADE`);
  await database.end();
}
