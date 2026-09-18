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
const schema = 'orion_host_test_' + randomUUID().replaceAll('-', '');
assert.match(schema, /^orion_host_test_[a-f0-9]{32}$/);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const api = Fastify(), withoutAdapter = Fastify();
let created = false, closeDatabase, child, browser, logs = '';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  const portServer = createServer(); portServer.listen(0, '127.0.0.1'); await once(portServer, 'listening');
  const webPort = portServer.address().port; await new Promise(resolve => portServer.close(resolve));
  const web = `http://127.0.0.1:${webPort}`;
  process.env.ADMIN_AUTH_MODE = 'host'; process.env.APP_ORIGIN = web;
  await db.connect(); await db.query(`CREATE SCHEMA ${schema}`); created = true;
  await db.query(`SET search_path TO ${schema},public`);
  for (const file of (await readdir('database/migrations')).filter(name => name.endsWith('.sql')).sort()) await db.query(await readFile('database/migrations/' + file, 'utf8'));
  const connection = new URL(process.env.DATABASE_URL);
  connection.searchParams.set('options', '-c search_path=' + schema + ',public'); process.env.DATABASE_URL = connection.href;
  const { adminAuthRoutes } = await import('../apps/api/src/auth/routes.ts');
  const { versionRoutes } = await import('../apps/api/src/versions.ts');
  const { postRoutes } = await import('../apps/api/src/posts.ts');
  const { analyticsRoutes } = await import('../apps/api/src/analytics.ts');
  const { suggestionRoutes } = await import('../apps/api/src/suggestions.ts');
  const { mediaRoutes } = await import('../apps/api/src/media.ts');
  const { engagementRoutes } = await import('../apps/api/src/engagement.ts');
  const { createAdminSession } = await import('../apps/api/src/auth/session.ts');
  const { resolveHostIdentity } = await import('../apps/api/src/auth/host-adapter.ts');
  ({ closeDatabase } = await import('../apps/api/src/db/index.ts'));
  await api.register(cookie, { secret: process.env.COOKIE_SECRET });
  await withoutAdapter.register(cookie, { secret: process.env.COOKIE_SECRET });
  await withoutAdapter.register(adminAuthRoutes);
  assert.equal((await withoutAdapter.inject('/api/v1/admin/access')).json().canManage, false);
  assert.equal((await withoutAdapter.inject('/api/v1/admin/session')).statusCode, 401);
  assert.equal(await resolveHostIdentity({}), null, 'Adaptador de produção não libera administradores fictícios');
  await assert.rejects(createAdminSession(1, 'fake@example.test', {}), /disabled/);

  // Simulação EXCLUSIVA do teste. Não existe esse repositório de sessões no produto.
  const sessions = new Map();
  const tokenA = randomUUID(), tokenB = randomUUID(), tokenReader = randomUUID();
  const identityA = { subject: 'principal:cartorio-1:admin-a', email: 'admin@example.test', isAdmin: true, sessionId: 'sessao-a-1' };
  const identityB = { subject: 'principal:cartorio-1:admin-b', email: identityA.email, isAdmin: true, sessionId: 'sessao-b-1' };
  sessions.set(tokenA, identityA); sessions.set(tokenB, identityB);
  sessions.set(tokenReader, { subject: 'principal:cartorio-1:leitor', email: 'leitor@example.test', isAdmin: false, sessionId: 'sessao-r-1' });
  let unavailable = false, resolverCalls = 0;
  api.decorate('resolveBlogHostIdentity', async request => {
    resolverCalls++;
    if (unavailable) throw new Error('Host unavailable (simulado)');
    return sessions.get(request.cookies.parent_session) ?? null;
  });
  for (const routes of [adminAuthRoutes, versionRoutes, postRoutes, analyticsRoutes, suggestionRoutes, mediaRoutes, engagementRoutes]) await api.register(routes);

  const call = async (endpoint, { token = '', method = 'GET', payload, csrf, origin = web, expected = 200, headers = {} } = {}) => {
    const response = await api.inject({ url: '/api/v1' + endpoint, method, payload, headers: {
      ...(token ? { cookie: 'parent_session=' + token } : {}),
      ...(origin ? { origin } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}), ...headers,
    } });
    assert.equal(response.statusCode, expected, `${method} ${endpoint}: ${response.body.slice(0, 350)}`);
    return response;
  };
  const anonymous = await call('/admin/access?isAdmin=true', { headers: { 'x-is-admin': 'true', 'x-user-id': identityA.subject, 'x-user-role': 'admin' } });
  assert.deepEqual(anonymous.json(), { mode: 'host', canManage: false, admin: null, csrfToken: null });
  assert.equal(anonymous.headers['cache-control'], 'private, no-store');
  assert.equal((await call('/admin/access', { token: tokenReader })).json().canManage, false);
  for (const endpoint of ['/admin/publicacoes', '/admin/versoes', '/admin/acompanhamento', '/admin/sugestoes', '/admin/publicacoes/1/motivos', '/admin/imagens/' + randomUUID()]) {
    await call(endpoint, { expected: 401 }); await call(endpoint, { token: tokenReader, expected: 401 });
  }
  await call('/admin/versoes', { method: 'POST', payload: { codigo: '1.0', sistema: 'oriontn' }, token: tokenReader, expected: 401 });
  await call('/admin/login', { method: 'POST', payload: { email: identityA.email, password: 'fake' }, expected: 403 });
  await call('/admin/logout', { method: 'POST', token: tokenA, expected: 403 });
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ca_admins')).rows[0].n, 0);
  console.log('OK: sem adaptador, sem sessão, usuário comum, dados de identidade forjados e login local não liberam a Gestão.');

  // Coincidência de e-mail não associa contas locais/externas nem dois subjects externos.
  const localId = (await db.query("INSERT INTO ca_admins(email,password_hash) VALUES($1,'unused') RETURNING id", [identityA.email])).rows[0].id;
  const concurrent = await Promise.all(Array.from({ length: 6 }, () => call('/admin/access', { token: tokenA })));
  const accessA = concurrent[0].json();
  assert(concurrent.every(response => response.json().admin.id === accessA.admin.id));
  assert.equal(accessA.mode, 'host'); assert.equal(accessA.canManage, true); assert(accessA.csrfToken);
  assert.equal(concurrent[0].headers['set-cookie'], undefined, 'Nenhum segundo cookie de sessão');
  assert.notEqual(String(accessA.admin.id), String(localId));
  const accessB = (await call('/admin/access', { token: tokenB })).json();
  assert.notEqual(accessB.admin.id, accessA.admin.id);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ca_admins WHERE host_subject IS NOT NULL')).rows[0].n, 2);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ca_admin_sessoes')).rows[0].n, 0);
  assert.equal((await db.query('SELECT password_hash FROM ca_admins WHERE id=$1', [accessA.admin.id])).rows[0].password_hash, '!host-managed');

  const versionInput = { codigo: '08.01.01', sistema: 'oriontn' };
  await call('/admin/versoes', { token: tokenA, method: 'POST', payload: versionInput, expected: 403 });
  await call('/admin/versoes', { token: tokenA, method: 'POST', csrf: accessB.csrfToken, payload: versionInput, expected: 403 });
  await call('/admin/versoes', { token: tokenA, method: 'POST', csrf: accessA.csrfToken, origin: 'https://fora.example', payload: versionInput, expected: 403 });
  await call('/admin/versoes', { token: tokenA, method: 'POST', csrf: accessA.csrfToken, origin: '', payload: versionInput, expected: 403 });
  const version = (await call('/admin/versoes', { token: tokenA, method: 'POST', csrf: accessA.csrfToken, payload: versionInput, expected: 201 })).json();
  identityA.sessionId = 'sessao-a-2';
  await call('/admin/versoes', { token: tokenA, method: 'POST', csrf: accessA.csrfToken, payload: { ...versionInput, codigo: '08.01.02' }, expected: 403 });
  const refreshed = (await call('/admin/access', { token: tokenA })).json();
  assert.notEqual(refreshed.csrfToken, accessA.csrfToken); assert.equal(refreshed.admin.id, accessA.admin.id);
  console.log('OK: vínculos estáveis e separados por subject, concorrência, ausência de senha/sessão extra, CSRF/origem e rotação da sessão.');

  const imageBuffer = await readFile('apps/web/public/assets/Siplan_logo.png');
  const beforeUpload = resolverCalls;
  const image = (await call('/admin/imagens', { token: tokenA, csrf: refreshed.csrfToken, method: 'POST', payload: imageBuffer, headers: { 'content-type': 'image/png' }, expected: 201 })).json();
  assert.equal(resolverCalls - beforeUpload, 1, 'A mesma requisição valida o adaptador uma única vez');
  const postInput = { titulo: 'Publicação integrada', subtitulo: 'Sem um segundo login', slug: 'publicacao-integrada', corpo: '<p>Conteúdo de teste.</p>', versao_id: version.id, sistema: 'oriontn', tipo: 'novidade', status: 'publicado', capa_imagem_id: image.id };
  await call('/admin/publicacoes', { token: tokenB, csrf: accessB.csrfToken, method: 'POST', payload: postInput, expected: 400 });
  const post = (await call('/admin/publicacoes', { token: tokenA, csrf: refreshed.csrfToken, method: 'POST', payload: postInput, expected: 201 })).json();
  const stored = (await db.query('SELECT autor_id, autor_nome FROM ca_atualizacoes WHERE id=$1', [post.id])).rows[0];
  assert.equal(String(stored.autor_id), String(accessA.admin.id)); assert.equal(stored.autor_nome, identityA.email);
  assert.equal(String((await db.query("SELECT admin_id FROM ca_auditoria WHERE entidade='post' AND entidade_id=$1 AND acao='criar'", [post.id])).rows[0].admin_id), String(accessA.admin.id));
  await call('/admin/imagens/' + image.id, { token: tokenA });
  await call('/admin/imagens/' + image.id, { expected: 401 });
  await call('/admin/acompanhamento', { token: tokenA }); await call('/admin/sugestoes', { token: tokenA });
  await call('/publicacoes/id/' + post.id);
  identityA.email = 'novo-email@example.test';
  assert.equal((await call('/admin/access', { token: tokenA })).json().admin.id, accessA.admin.id);
  assert.equal((await db.query('SELECT host_email FROM ca_admins WHERE id=$1', [accessA.admin.id])).rows[0].host_email, identityA.email);
  identityA.isAdmin = false;
  await call('/admin/publicacoes', { token: tokenA, expected: 401 });
  await call('/admin/publicacoes/' + post.id, { token: tokenA, method: 'DELETE', csrf: refreshed.csrfToken, expected: 401 });
  identityA.isAdmin = true;
  await db.query('UPDATE ca_admins SET ativo=FALSE WHERE id=$1', [accessA.admin.id]);
  assert.equal((await call('/admin/access', { token: tokenA })).json().canManage, false);
  await db.query('UPDATE ca_admins SET ativo=TRUE WHERE id=$1', [accessA.admin.id]);
  unavailable = true; await call('/admin/access', { token: tokenA, expected: 500 }); await call('/admin/publicacoes', { token: tokenA, expected: 500 }); unavailable = false;
  console.log('OK: publicações, autoria/auditoria, imagens privadas e propriedade, revogação e falha do hospedeiro sem fallback.');

  const base = await api.listen({ port: 0, host: '127.0.0.1' });
  child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], { cwd: path.join(root, 'apps/web'), env: { ...process.env, API_PROXY_TARGET: base }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { logs = (logs + data).slice(-5000); });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(web)).ok) { ready = true; break; } } catch {} await pause(200); }
  assert(ready, logs);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL === 'chromium' ? undefined : process.env.TEST_BROWSER_CHANNEL ?? 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 950 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], localAuthCalls = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/admin\/(login|logout)$/.test(new URL(request.url()).pathname)) localAuthCalls.push(request.url()); });
  page.setDefaultTimeout(15000);
  await mkdir(artifacts, { recursive: true });
  const goto = async pathname => {
    const [response] = await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/admin/access'), page.goto(web + pathname)]);
    return response.json();
  };
  await goto('/gestao'); await page.getByRole('heading', { name: 'Acesso restrito', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Senha', { exact: true }).count(), 0);
  await goto('/inicio'); assert.equal(await page.getByRole('button', { name: 'Acessar Gestão', exact: true }).count(), 0);
  // Flags no navegador não concedem permissão.
  await page.evaluate(() => { localStorage.setItem('isAdmin', 'true'); window.isAdmin = true; });
  await goto('/gestao?isAdmin=true'); await page.getByRole('heading', { name: 'Acesso restrito', exact: true }).waitFor();
  await context.addCookies([{ name: 'parent_session', value: tokenReader, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }]);
  await goto('/gestao'); await page.getByRole('heading', { name: 'Acesso restrito', exact: true }).waitFor();
  await context.addCookies([{ name: 'parent_session', value: tokenA, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }]);
  const readerRoute = '/oriontn/novidades?publicacao=' + post.id;
  await goto(readerRoute);
  await page.getByRole('button', { name: 'Acessar Gestão', exact: true }).click();
  await page.waitForURL(web + '/gestao'); await page.locator('.management-entry').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Sair', exact: true }).count(), 0);
  assert.equal(await page.getByLabel('Senha', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Nova publicação', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Visualização do leitor', exact: true }).isDisabled());
  await page.locator('.editor-heading').getByRole('button', { name: 'Cancelar', exact: true }).click();
  // Escrita real pelo navegador: token recebido pelo provider e Origin do próprio fetch.
  await page.getByRole('button', { name: 'Nova versão', exact: true }).click();
  await page.locator('.version-editor').getByLabel('Sistema', { exact: true }).selectOption('oriontn');
  await page.getByLabel('Código da versão').fill('08.01.09');
  await page.getByRole('button', { name: 'Salvar versão', exact: true }).click();
  await page.locator('.version-editor').waitFor({ state: 'detached' });
  assert.equal((await db.query("SELECT count(*)::int AS n FROM ca_versoes WHERE codigo='08.01.09'")).rows[0].n, 1);
  // Troca de conta no hospedeiro não reutiliza um formulário da identidade anterior.
  await page.getByRole('button', { name: 'Nova publicação', exact: true }).click();
  await page.locator('.publication-editor').getByLabel('Título', { exact: true }).fill('Rascunho não salvo da conta anterior');
  await context.addCookies([{ name: 'parent_session', value: tokenB, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }]);
  await page.evaluate(() => window.dispatchEvent(new Event('orion:access-changed')));
  await page.locator('.management-email').filter({ hasText: identityB.email }).waitFor();
  await page.locator('.publication-editor').waitFor({ state: 'detached' });
  await context.addCookies([{ name: 'parent_session', value: tokenA, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }]);
  await page.evaluate(() => window.dispatchEvent(new Event('orion:access-changed')));
  await page.locator('.management-email').filter({ hasText: identityA.email }).waitFor();
  await page.getByRole('button', { name: 'Visualização do leitor', exact: true }).click();
  await page.waitForURL(web + readerRoute); await page.getByRole('button', { name: 'Acessar Gestão', exact: true }).waitFor();
  assert((await context.cookies()).some(item => item.name === 'parent_session' && item.value === tokenA));
  assert.deepEqual(localAuthCalls, [], 'Alternância não autentica nem encerra a sessão do sistema principal');

  for (const width of [320, 390, 768, 1366]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 950 });
    await goto('/inicio'); await page.getByRole('button', { name: 'Acessar Gestão', exact: true }).waitFor();
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro', exact: true }).click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(artifacts, `host-reader-${width}-${theme}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Acessar Gestão', exact: true }).click(); await page.locator('.management-entry').waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const toggle = await page.getByRole('button', { name: 'Visualização do leitor', exact: true }).boundingBox();
    assert(toggle.height >= 44 && toggle.x >= 0 && toggle.x + toggle.width <= width);
    await page.screenshot({ path: path.join(artifacts, `host-management-${width}-${theme}.png`), fullPage: true });
  }
  identityA.isAdmin = false;
  await page.evaluate(() => window.dispatchEvent(new Event('orion:access-changed')));
  await page.getByRole('heading', { name: 'Acesso restrito', exact: true }).waitFor();
  assert.equal(await page.locator('.management-entry,.management-tabs').count(), 0);
  identityA.isAdmin = true;
  await page.getByRole('button', { name: 'Verificar acesso novamente', exact: true }).click(); await page.locator('.management-entry').waitFor();
  unavailable = true;
  await page.evaluate(() => window.dispatchEvent(new Event('orion:access-changed')));
  await page.getByRole('heading', { name: 'Não foi possível verificar seu acesso', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Senha', { exact: true }).count(), 0);
  unavailable = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await page.locator('.management-entry').waitFor();
  sessions.delete(tokenA);
  // A próxima ação administrativa é negada e retira imediatamente a Gestão da tela.
  await page.getByRole('button', { name: 'Acompanhamento', exact: true }).click();
  await page.getByRole('heading', { name: 'Acesso restrito', exact: true }).waitFor();
  assert.deepEqual(errors, []); assert.deepEqual(localAuthCalls, []);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ca_atualizacoes WHERE id=$1', [post.id])).rows[0].n, 1);
  console.log('OK: botão só para administradores, entrada sem outro login, alternância/retorno aos filtros, edição protegida, sessão preservada, revogação e falha segura; 4 larguras nos 2 temas.');
} catch (error) {
  console.error(error); console.error(logs); process.exitCode = 1;
} finally {
  await browser?.close();
  if (child && child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await Promise.race([closed, pause(3000)]); }
  await api.close(); await withoutAdapter.close(); await closeDatabase?.();
  if (created) { await db.query(`DROP SCHEMA ${schema} CASCADE`); console.log('Schema exclusivo removido; dados reais preservados.'); }
  await db.end();
}
