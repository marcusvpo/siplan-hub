import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { chromium } from 'playwright';

dotenv.config({ path: 'apps/api/.env' });
const root = process.cwd(), artifacts = path.join(root, '.test-results');
const schema = 'orion_inbox_test_' + randomUUID().replaceAll('-', '');
assert.match(schema, /^orion_inbox_test_[a-f0-9]{32}$/);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL }), api = Fastify();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let created = false, closeDatabase, child, browser, logs = '';
try {
  const portServer = createServer(); portServer.listen(0, '127.0.0.1'); await once(portServer, 'listening');
  const webPort = portServer.address().port; await new Promise(resolve => portServer.close(resolve));
  const web = `http://127.0.0.1:${webPort}`;
  process.env.APP_ORIGIN = web;
  await db.connect(); await db.query(`CREATE SCHEMA ${schema}`); created = true;
  await db.query(`SET search_path TO ${schema},public`);
  for (const file of (await readdir('database/migrations')).filter(name => name.endsWith('.sql')).sort()) await db.query(await readFile('database/migrations/' + file, 'utf8'));
  const connection = new URL(process.env.DATABASE_URL);
  connection.searchParams.set('options', '-c search_path=' + schema + ',public'); process.env.DATABASE_URL = connection.href;
  const { suggestionRoutes } = await import('../apps/api/src/suggestions.ts');
  const { versionRoutes } = await import('../apps/api/src/versions.ts');
  const { postRoutes } = await import('../apps/api/src/posts.ts');
  const { analyticsRoutes } = await import('../apps/api/src/analytics.ts');
  const { createAdminSession } = await import('../apps/api/src/auth/session.ts');
  const { adminAuthRoutes } = await import('../apps/api/src/auth/routes.ts');
  ({ closeDatabase } = await import('../apps/api/src/db/index.ts'));
  await api.register(cookie, { secret: process.env.COOKIE_SECRET });
  for (const routes of [suggestionRoutes, versionRoutes, postRoutes, analyticsRoutes]) await api.register(routes);
  const admin = (await db.query("INSERT INTO ca_admins(email,password_hash) VALUES('inbox@example.test','unused') RETURNING id,email")).rows[0];
  // Disponível apenas no servidor isolado deste teste.
  api.get('/test-login', async (_request, reply) => createAdminSession(admin.id, admin.email, reply));
  await api.register(adminAuthRoutes);
  const login = await api.inject('/test-login'); assert.equal(login.statusCode, 200, login.body);
  const cookieHeader = login.headers['set-cookie'].map(value => value.split(';')[0]).join('; ');
  const cookies = login.headers['set-cookie'].map(value => { const [name, ...parts] = value.split(';')[0].split('='); return { name, value: parts.join('='), domain: '127.0.0.1', path: '/api/v1/admin', sameSite: 'Strict' }; });
  const get = async (query = {}, status = 200, authenticated = true) => {
    const response = await api.inject({ url: '/api/v1/admin/sugestoes?' + new URLSearchParams(query), headers: authenticated ? { cookie: cookieHeader } : {} });
    assert.equal(response.statusCode, status, response.body); assert.equal(response.headers['cache-control'], 'private, no-store');
    return response.json();
  };
  await get({}, 401, false);
  assert.deepEqual(await get(), { data: [], meta: { page: 1, limit: 5, total: 0 } });
  assert.equal((await api.inject('/api/v1/sugestoes')).statusCode, 404);
  assert.equal((await api.inject({ url: '/api/v1/admin/sugestoes', headers: { cookie: 'ca_admin_session=invalida' } })).statusCode, 401);
  for (const query of [{ page: '0' }, { page: '1.2' }, { page: '10001' }, { limit: '500' }, { limit: '0' }, { ordem: 'id;DROP TABLE' }, { busca: 'x'.repeat(201) }, { busca: 'a\u0000b' }]) await get(query, 400);
  await db.query('UPDATE ca_admins SET ativo=FALSE WHERE id=$1', [admin.id]); await get({}, 401);
  await db.query('UPDATE ca_admins SET ativo=TRUE WHERE id=$1', [admin.id]);

  const base = await api.listen({ port: 0, host: '127.0.0.1' });
  child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], { cwd: path.join(root, 'apps/web'), env: { ...process.env, API_PROXY_TARGET: base }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { logs = (logs + data).slice(-5000); });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(web)).ok) { ready = true; break; } } catch {} await pause(200); }
  assert(ready, logs);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL === 'chromium' ? undefined : process.env.TEST_BROWSER_CHANNEL ?? 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce' });
  await context.addCookies(cookies);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(15000);
  await mkdir(artifacts, { recursive: true });
  const loaded = async () => { await page.waitForFunction(() => !!document.querySelector('.suggestions-inbox-count')); };
  const search = page.getByLabel('Buscar sugestão', { exact: true });
  const query = async value => { await search.fill(value); await search.press('Enter'); await loaded(); };
  await page.goto(web + '/gestao', { timeout: 30000 });
  await page.getByRole('button', { name: 'Sugestões', exact: true }).click();
  await page.getByRole('heading', { name: 'Ainda não há sugestões.' }).waitFor();
  assert.equal(await page.locator('.filters,.management-toolbar,.version-required').count(), 0, 'Sugestões não dependem de sistemas, versões ou publicações');
  await page.screenshot({ path: path.join(artifacts, 'suggestions-inbox-empty.png'), fullPage: true });

  // O envio real da home chega à nova aba, sem sessão administrativa do leitor.
  await context.clearCookies(); await page.goto(web + '/inicio');
  await page.getByRole('button', { name: 'Abrir caixa de sugestões', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Caixa de sugestões', exact: true });
  const message = 'Gostaria de um guia de assinatura digital.\nIsso facilitaria o atendimento do nosso cartório.';
  await dialog.getByLabel('Nome', { exact: true }).fill('Ana Lima');
  await dialog.getByLabel('Cartório', { exact: true }).fill('1º Tabelionato de Notas');
  await dialog.getByLabel('Sugestão', { exact: true }).fill(message);
  await dialog.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.getByRole('heading', { name: 'Obrigado pela sugestão :)', exact: true }).waitFor();
  await dialog.waitFor({ state: 'hidden' });
  const received = await get();
  assert.equal(received.meta.total, 1); assert.equal(received.data[0].sugestao, message);
  assert.deepEqual(Object.keys(received.data[0]).sort(), ['cartorio', 'criado_em', 'id', 'nome', 'sugestao']);
  await context.addCookies(cookies); await page.goto(web + '/gestao');
  await page.getByRole('button', { name: 'Sugestões', exact: true }).click(); await loaded();
  const first = page.locator('.suggestion-inbox-item').first();
  await first.locator('summary').focus(); await page.keyboard.press('Enter');
  assert.equal(await first.locator('.suggestion-inbox-message').innerText(), message);
  await page.keyboard.press('Space'); assert.equal(await first.getAttribute('open'), null);
  console.log('OK: consulta privada, validação de parâmetros, estado vazio e envio real da home até a Gestão.');

  const unsafe = "Esclarecimento sobre 100% _teste_ d'água.\n<script>window.__suggestionXss=1</script>";
  for (let i = 0; i < 22; i++) {
    await db.query('INSERT INTO ca_sugestoes(id,nome,cartorio,sugestao,criado_em) VALUES($1,$2,$3,$4,$5)', [randomUUID(), i === 0 ? 'João Souza' : i === 21 ? 'N'.repeat(100) : 'Leitor ' + i, i === 0 ? 'Ofício de Registro Civil' : i === 21 ? 'C'.repeat(180) : 'Tabelionato de teste ' + i, i === 0 ? unsafe : i === 21 ? 'M'.repeat(4000) : 'Sugiro mais exemplos para a rotina ' + i, `2020-01-${String(i === 11 ? 11 : i + 1).padStart(2, '0')}T10:00:00Z`]);
  }
  assert.equal((await get()).meta.total, 23);
  const expected = (await db.query('SELECT id FROM ca_sugestoes ORDER BY criado_em DESC,id DESC')).rows.map(row => row.id);
  const all = [];
  for (let index = 1; index <= 5; index++) { const response = await get({ page: String(index) }); assert(response.data.length <= 5); all.push(...response.data.map(row => row.id)); }
  assert.deepEqual(all, expected); assert.equal(new Set(all).size, 23);
  assert.equal((await get({ page: '999' })).meta.page, 5);
  for (const size of ['5', '10', '20']) assert.equal((await get({ limit: size })).data.length, Number(size));
  assert.deepEqual((await get({ ordem: 'antigas', limit: '20' })).data.map(row => row.id), [...expected].reverse().slice(0, 20));
  for (const term of ['JOAO', 'oficio de registro', 'ESCLARECIMENTO', "d'água", '100%', '_teste_']) assert.equal((await get({ busca: term })).meta.total, 1, term);
  for (const term of ['inexistente', "' OR 1=1 --"]) assert.equal((await get({ busca: term })).meta.total, 0);
  const filteredEmpty = await get({ busca: 'inexistente', page: '3' }); assert.equal(filteredEmpty.meta.page, 1);
  console.log('OK: paginação estável no servidor, limites, datas, busca por nome/cartório/mensagem, acentos e SQL literal.');

  await page.getByRole('button', { name: 'Atualizar sugestões', exact: true }).click(); await loaded();
  assert.equal(await page.locator('.suggestion-inbox-item').count(), 5);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click(); await loaded();
  await page.getByText('Página 2 de 5', { exact: true }).waitFor();
  for (const size of ['10', '20', '5']) {
    await page.getByLabel('Por página', { exact: true }).selectOption(size); await loaded();
    assert.equal(await page.locator('.suggestion-inbox-item').count(), Number(size));
    await page.getByText(`Página 1 de ${Math.ceil(23 / Number(size))}`, { exact: true }).waitFor();
  }
  await page.getByLabel('Ordenar por', { exact: true }).selectOption('antigas'); await loaded();
  assert(await page.locator('.suggestion-inbox-item').first().getByText('João Souza', { exact: true }).isVisible());
  await query('JOAO'); assert.equal(await page.locator('.suggestion-inbox-item').count(), 1);
  await first.locator('summary').click();
  assert.equal(await first.locator('.suggestion-inbox-message').innerText(), unsafe);
  assert.equal(await page.evaluate(() => window.__suggestionXss), undefined);
  await query('inexistente'); await page.getByRole('heading', { name: 'Nenhuma sugestão encontrada.' }).waitFor();
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).first().click(); await loaded();
  let fail = true;
  await page.route('**/api/v1/admin/sugestoes?**', async route => { if (fail) return route.fulfill({ status: 503, json: { message: 'Falha simulada de consulta.' } }); await pause(600); return route.continue(); });
  await page.getByRole('button', { name: 'Atualizar sugestões' }).click(); await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.suggestion-inbox-item').count(), 0);
  fail = false; await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.getByText('Carregando sugestões…', { exact: true }).waitFor(); await loaded();
  await page.unroute('**/api/v1/admin/sugestoes?**');
  await page.route('**/api/v1/admin/sugestoes?**', async route => {
    if (new URL(route.request().url()).searchParams.get('busca') === 'JOAO') { const response = await route.fetch(); await pause(700); return route.fulfill({ response }); }
    return route.continue();
  });
  await search.fill('JOAO'); await search.press('Enter');
  await page.getByText('Carregando sugestões…', { exact: true }).waitFor();
  await query('ANA LIMA'); await pause(900);
  assert.equal(await page.locator('.suggestion-inbox-item').count(), 1);
  assert(await first.getByText('Ana Lima', { exact: true }).isVisible());
  await page.unroute('**/api/v1/admin/sugestoes?**');
  await page.getByRole('button', { name: 'Limpar busca' }).first().click(); await loaded();
  await page.getByLabel('Ordenar por', { exact: true }).selectOption('recentes'); await loaded();
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${width}/${theme}`);
      // A segunda mensagem tem nome/cartório/conteúdo extensos, sem espaços.
      const long = page.locator('.suggestion-inbox-item').nth(1);
      await long.locator('summary').click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Mensagem extensa ${width}/${theme}`);
      assert.equal(await long.locator('.suggestion-inbox-message').textContent(), 'M'.repeat(4000));
      await long.locator('summary').click();
      if ([390, 1366].includes(width)) await page.screenshot({ path: path.join(artifacts, `suggestions-inbox-${width}-${theme}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.getByRole('button', { name: 'Publicações', exact: true }).click();
  assert(await page.locator('.filters').isVisible());
  await page.getByRole('button', { name: 'OrionTN', exact: true }).click();
  await page.getByRole('button', { name: 'Nova versão', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Sugestões', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Acompanhamento', exact: true }).click(); await page.locator('.manager-kpis').waitFor();
  await page.getByRole('button', { name: 'Sugestões', exact: true }).click(); await loaded();
  assert.equal(await page.locator('.filters,.manager-dashboard,.management-toolbar').count(), 0);
  await page.getByText('23 sugestões recebidas', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Publicações', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'OrionTN', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(errors, []);
  assert.equal((await get()).meta.total, 23, 'Consultar não altera nem remove sugestões');
  console.log('OK: leitura integral segura, teclado, busca, ordenação, paginação, erros/retry, respostas atrasadas, abas e 4 larguras nos 2 temas.');
} catch (error) {
  console.error(error); console.error(logs); process.exitCode = 1;
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) await page.screenshot({ path: path.join(artifacts, 'suggestions-inbox-failure.png'), fullPage: true }).catch(() => {});
} finally {
  await browser?.close();
  if (child && child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await Promise.race([closed, pause(3000)]); }
  await api.close(); await closeDatabase?.();
  if (created) { await db.query('SET search_path TO public'); await db.query(`DROP SCHEMA ${schema} CASCADE`); console.log('Schema exclusivo removido; dados reais preservados.'); }
  await db.end();
}
