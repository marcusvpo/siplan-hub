import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
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

// Integração real em schema exclusivo; nenhum registro do blog é utilizado.
dotenv.config({ path: 'apps/api/.env' });
const root = process.cwd(), artifacts = path.join(root, '.test-results');
const schema = 'orion_analytics_test_' + randomUUID().replaceAll('-', '');
assert.match(schema, /^orion_analytics_test_[a-f0-9]{32}$/);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const api = Fastify();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = value => createHash('sha256').update(String(value)).digest('hex');
let created = false, closeDatabase, browser, child, logs = '';
try {
  await db.connect(); await db.query(`CREATE SCHEMA ${schema}`); created = true;
  await db.query(`SET search_path TO ${schema},public`);
  for (const file of (await readdir('database/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    await db.query(await readFile('database/migrations/' + file, 'utf8'));
  }
  const connection = new URL(process.env.DATABASE_URL);
  connection.searchParams.set('options', '-c search_path=' + schema + ',public');
  process.env.DATABASE_URL = connection.href;
  const { analyticsRoutes } = await import('../apps/api/src/analytics.ts');
  const { engagementRoutes } = await import('../apps/api/src/engagement.ts');
  const { versionRoutes } = await import('../apps/api/src/versions.ts');
  const { postRoutes } = await import('../apps/api/src/posts.ts');
  const { createAdminSession } = await import('../apps/api/src/auth/session.ts');
  const { adminAuthRoutes } = await import('../apps/api/src/auth/routes.ts');
  ({ closeDatabase } = await import('../apps/api/src/db/index.ts'));
  await api.register(cookie, { secret: process.env.COOKIE_SECRET });
  for (const routes of [analyticsRoutes, engagementRoutes, versionRoutes, postRoutes]) await api.register(routes);
  const admin = (await db.query("INSERT INTO ca_admins(email,password_hash) VALUES('analytics@example.test','unused') RETURNING id,email")).rows[0];
  // Atalho de autenticação apenas nesta instância de teste, nunca no servidor do blog.
  api.get('/test-login', async (_request, reply) => createAdminSession(admin.id, admin.email, reply));
  await api.register(adminAuthRoutes);
  const login = await api.inject('/test-login');
  assert.equal(login.statusCode, 200, login.body);
  const cookieHeader = login.headers['set-cookie'].map(value => value.split(';')[0]).join('; ');
  const get = async (query = {}, status = 200, auth = true) => {
    const response = await api.inject({ url: '/api/v1/admin/acompanhamento?' + new URLSearchParams(query), headers: auth ? { cookie: cookieHeader } : {} });
    assert.equal(response.statusCode, status, response.body);
    if (status === 200) assert.equal(response.headers['cache-control'], 'private, no-store');
    return response.json();
  };
  await get({}, 401, false);
  const empty = await get();
  assert.deepEqual(empty.data, []); assert.equal(empty.resumo.aprovacao, null);
  assert.equal(empty.resumo.publicacoes, 0); assert.equal(empty.meta.page, 1);
  const versions = {};
  for (const system of ['oriontn', 'orionpro', 'orionreg']) {
    versions[system] = Number((await db.query("INSERT INTO ca_versoes(codigo,produto_id) SELECT '06.03.03',id FROM ca_produtos WHERE slug=$1 RETURNING id", [system])).rows[0].id);
  }
  const posts = [];
  async function insert(overrides = {}) {
    const data = { title: 'Atualização da rotina cartorária', system: 'oriontn', type: 'novidade', status: 'publicado', date: '2020-06-01T12:00:00Z', ...overrides };
    const id = Number((await db.query(`INSERT INTO ca_atualizacoes(titulo,resumo,slug,corpo,corpo_formato,versao_id,tipo,status,publicado_em)
      VALUES($1,'Orientações para o cartório',$2,'<p>Conteúdo de teste isolado.</p>','html',$3,$4,$5,$6) RETURNING id`,
    [data.title, randomUUID(), versions[data.system], data.type, data.status, data.date])).rows[0].id);
    posts.push(id); return id;
  }
  const positive = await insert({ title: 'Assinatura digital de documentos' });
  const negative = await insert({ title: 'Conferência dos atos e emissão de certidões', system: 'orionpro', type: 'melhoria' });
  const mixed = await insert({ title: 'Consulta de registros', system: 'orionreg', type: 'correcao' });
  const noVotes = await insert({ title: 'Comunicado sobre atendimento', type: 'aviso' });
  const unread = [];
  for (let i = 0; i < 22; i++) unread.push(await insert({ title: 'Orientação para a serventia ' + (i + 1) }));
  const draft = await insert({ title: 'Em preparação', status: 'rascunho', date: null });
  const future = await insert({ title: 'Em breve', status: 'agendado', date: '2099-01-01T12:00:00Z' });
  const archived = await insert({ title: 'Conteúdo arquivado', status: 'arquivado' });
  const scheduledPast = await insert({ title: 'Agendamento já disponível', status: 'agendado' });
  async function views(id, visitors) { for (const visitor of visitors) await db.query('INSERT INTO ca_leituras(atualizacao_id,visitante_token_hash) VALUES($1,$2)', [id, hash(visitor)]); }
  async function react(id, visitor, type) { await db.query('INSERT INTO ca_reacoes(post_id,visitante_token_hash,tipo,motivo) VALUES($1,$2,$3,$4)', [id, hash(visitor), type, type === 'dislike' ? 'Preciso de exemplos para compreender esta rotina.' : null]); }
  await views(positive, [1, 2, 3, 4, 5, 6, 7, 8]); await views(negative, [1, 9, 10]); await views(mixed, [2, 3, 9, 10]); await views(noVotes, [1]);
  for (let i = 1; i <= 8; i++) await react(positive, i, 'like');
  await react(negative, 9, 'dislike'); await react(negative, 10, 'dislike');
  await react(mixed, 2, 'like'); await react(mixed, 3, 'dislike');
  for (let i = 0; i < 5; i++) await db.query("INSERT INTO ca_compartilhamentos(evento_id,post_id,visitante_token_hash,canal) VALUES($1,$2,$3,'copiar')", [randomUUID(), positive, hash(1)]);
  const first = await get();
  assert.deepEqual(first.resumo, { publicacoes: 30, disponiveis: 27, visualizacoes: 16, visitantes_unicos: 10, likes: 9, dislikes: 3, compartilhamentos: 5, aprovacao: 75, com_feedback: 2, sem_visualizacoes: 23, sem_avaliacoes: 1 });
  assert.equal(first.data.length, 20); assert.equal(first.meta.total, 30);
  assert.equal(first.data[0].id, negative); assert.equal(first.data[0].aprovacao, 0);
  const second = await get({ page: '2' });
  assert.deepEqual(first.resumo, second.resumo); assert.equal(second.data.length, 10);
  assert.equal(new Set([...first.data, ...second.data].map(post => post.id)).size, 30);
  assert.equal((await get({ page: '999' })).meta.page, 2);
  const summaryOnly = await get({ incluir_publicacoes: 'false', limit: '5' });
  assert.deepEqual(summaryOnly.data, []); assert.deepEqual(summaryOnly.resumo, first.resumo);
  assert.deepEqual(summaryOnly.meta, { page: 1, limit: 5, total: 30 });
  for (const limit of ['5', '10', '20']) {
    const limited = await get({ limit, status: 'publicado' });
    assert.equal(limited.data.length, Number(limit)); assert.equal(limited.meta.total, 27);
    assert.equal((await get({ limit, status: 'publicado', page: '999' })).meta.page, Math.ceil(27 / Number(limit)));
  }
  for (const query of [{ limit: '0' }, { limit: '500' }, { limit: '15' }, { incluir_publicacoes: 'yes' }]) await get(query, 400);
  const onlyFeedback = await get({ foco: 'feedback' });
  assert.deepEqual(onlyFeedback.resumo, first.resumo);
  assert.deepEqual(onlyFeedback.data.map(post => post.id), [negative, mixed]);
  assert.equal((await get({ foco: 'sem_visualizacoes' })).meta.total, 23);
  assert.deepEqual((await get({ foco: 'sem_avaliacoes' })).data.map(post => post.id), [noVotes]);
  assert.equal((await get({ status: 'publicado' })).meta.total, 27);
  assert.deepEqual((await get({ status: 'agendado' })).data.map(post => post.id), [future]);
  for (const [status, id] of [['rascunho', draft], ['arquivado', archived]]) assert.deepEqual((await get({ status })).data.map(post => post.id), [id]);
  assert.equal((await get({ busca: 'AGENDAMENTO JA DISPONIVEL' })).data[0].id, scheduledPast);
  const scoped = await get({ produto: 'orionpro', tipo: 'melhoria', busca: 'CONFerencia DOS ATOS' });
  assert.equal(scoped.meta.total, 1); assert.equal(scoped.resumo.aprovacao, 0);
  assert.equal((await get({ busca: 'Comunicado' })).data[0].aprovacao, null);
  for (const busca of ['inexistente', '%', '_', "' OR 1=1 --"]) assert.equal((await get({ busca })).meta.total, 0);
  assert.equal((await get({ ordem: 'visualizacoes' })).data[0].id, positive);
  assert.equal((await get({ ordem: 'compartilhamentos' })).data[0].id, positive);
  assert.deepEqual((await get({ ordem: 'aprovacao' })).data.slice(0, 3).map(post => post.id), [negative, mixed, positive]);
  assert.equal((await get({ ordem: 'recentes' })).data[0].id, scheduledPast);
  for (const query of [{ page: '0' }, { page: '1.5' }, { page: '10001' }, { ordem: 'DROP TABLE' }, { status: 'invalid' }, { foco: 'invalid' }, { produto: 'invalid' }, { tipo: 'novidades' }, { busca: 'a'.repeat(201) }]) await get(query, 400);
  await db.query("UPDATE ca_produtos SET ativo=FALSE WHERE slug='oriontn'");
  const inactive = await get(); assert.equal(inactive.resumo.disponiveis, 2); assert.equal(inactive.resumo.sem_visualizacoes, 0); assert.equal(inactive.resumo.sem_avaliacoes, 0);
  await db.query("UPDATE ca_produtos SET ativo=TRUE WHERE slug='oriontn'");
  console.log('OK: autenticação, totais globais, visitantes deduplicados, aprovação ponderada, filtros, busca, ordenação, paginação, agendamentos e sistemas inativos.');

  // Navegador real conectado à mesma API e ao banco isolado.
  const base = await api.listen({ port: 0, host: '127.0.0.1' });
  const portServer = createServer(); portServer.listen(0, '127.0.0.1'); await once(portServer, 'listening');
  const webPort = portServer.address().port; await new Promise(resolve => portServer.close(resolve));
  const web = `http://127.0.0.1:${webPort}`;
  child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], { cwd: path.join(root, 'apps/web'), env: { ...process.env, API_PROXY_TARGET: base }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { logs = (logs + data).slice(-5000); });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(web)).ok) { ready = true; break; } } catch {} await pause(200); }
  assert(ready, logs);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL === 'chromium' ? undefined : process.env.TEST_BROWSER_CHANNEL ?? 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce' });
  await context.addCookies(login.headers['set-cookie'].map(value => { const [name, ...parts] = value.split(';')[0].split('='); return { name, value: parts.join('='), domain: '127.0.0.1', path: '/api/v1/admin', sameSite: 'Strict' }; }));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(15000);
  await mkdir(artifacts, { recursive: true });
  const shot = async name => { await page.locator('.manager-dashboard').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(artifacts, name + '.png'), fullPage: true }); };
  const loaded = async () => { await page.waitForFunction(() => document.querySelector('.manager-refresh')?.disabled === false); await page.locator('.manager-kpis').waitFor(); };
  const metricsRequests = [];
  page.on('request', request => { if (request.url().includes('/admin/acompanhamento?')) metricsRequests.push(new URL(request.url()).searchParams); });
  const expand = page.getByRole('button', { name: 'Maximizar resultados por publicação', exact: true });
  const collapse = page.getByRole('button', { name: 'Minimizar resultados por publicação', exact: true });
  const dashboard = page.locator('.manager-dashboard');
  await page.goto(web + '/gestao', { timeout: 30000 });
  await page.getByRole('button', { name: 'Acompanhamento', exact: true }).click(); await loaded();
  assert.equal(await page.locator('.management-toolbar').count(), 0);
  assert.deepEqual(await page.locator('.manager-kpi > strong').allTextContents(), ['30', '16', '75%', '5']);
  assert.equal(await expand.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('.manager-table').count(), 0);
  assert(metricsRequests.every(query => query.get('incluir_publicacoes') === 'false'), 'Entrada não solicita publicações');
  await shot('analytics-results-initial-desktop');
  await expand.focus(); await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'O que você deseja analisar?' }).waitFor();
  assert.equal(await page.locator('.manager-table').count(), 0);
  assert(metricsRequests.every(query => query.get('incluir_publicacoes') === 'false'), 'Expandir sem filtro não carrega a lista geral');
  await collapse.focus(); await page.keyboard.press('Space');
  assert.equal(await expand.getAttribute('aria-expanded'), 'false');
  await page.getByLabel('Status', { exact: true }).selectOption('publicado'); await loaded();
  assert.equal(await page.locator('.manager-table tbody tr').count(), 5);
  assert.equal(metricsRequests.at(-1).get('limit'), '5');
  assert.equal(metricsRequests.at(-1).get('incluir_publicacoes'), 'true');
  await page.getByRole('button', { name: 'Próxima', exact: true }).click(); await loaded();
  await page.getByText('Página 2 de 6', { exact: true }).waitFor();
  await page.getByText('Exibindo 6–10 de 27', { exact: true }).waitFor();
  assert.equal(await page.locator('.manager-table tbody tr').count(), 5);
  assert.deepEqual(await page.locator('.manager-kpi > strong').allTextContents(), ['27', '16', '75%', '5']);
  await collapse.click(); await loaded();
  assert.equal(await page.locator('.manager-table').count(), 0);
  assert.equal(metricsRequests.at(-1).get('incluir_publicacoes'), 'false');
  await expand.click(); await loaded();
  await page.getByText('Página 2 de 6', { exact: true }).waitFor();
  for (const size of ['10', '20', '5']) {
    await page.getByLabel('Por página', { exact: true }).selectOption(size); await loaded();
    assert.equal(await page.locator('.manager-table tbody tr').count(), Number(size));
    assert.equal(metricsRequests.at(-1).get('page'), '1');
  }
  await page.getByRole('button', { name: 'Limpar busca e recortes' }).click(); await loaded();
  assert.equal(await page.locator('.manager-table').count(), 0);
  await page.getByRole('button', { name: /Com feedback negativo/ }).click();
  await page.getByText('2 publicações encontradas neste recorte de atenção', { exact: true }).waitFor();
  assert.equal(await page.locator('.manager-table tbody tr').count(), 2);
  await page.getByRole('button', { name: /Sem visualizações Confira/ }).click();
  await page.getByText('23 publicações encontradas neste recorte de atenção', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Lidas, sem avaliações/ }).click();
  await page.getByText('1 publicação encontrada neste recorte de atenção', { exact: true }).waitFor();
  assert(await page.getByText('Sem avaliações', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'Limpar recorte de atenção' }).click(); await loaded();
  assert.equal(await page.locator('.manager-table').count(), 0, 'Limpar último filtro não expõe todas as publicações');
  await page.getByLabel('Buscar publicação', { exact: true }).fill('conferencia'); await page.getByLabel('Buscar publicação', { exact: true }).press('Enter');
  await page.getByText('1 publicação encontrada nos filtros selecionados', { exact: true }).waitFor();
  assert.deepEqual(await page.locator('.manager-kpi > strong').allTextContents(), ['1', '3', '0%', '0']);
  const trigger = page.getByRole('button', { name: /Ver motivos de Não gostei: Conferência/ });
  await trigger.click();
  const dialog = page.getByRole('dialog'); await dialog.waitFor();
  await dialog.getByText('2 motivos recebidos', { exact: true }).waitFor();
  assert(await page.getByRole('button', { name: 'Fechar motivos' }).evaluate(element => element === document.activeElement));
  await page.keyboard.press('Shift+Tab'); assert(await dialog.getByRole('button', { name: 'Revisar publicação' }).evaluate(element => element === document.activeElement));
  await page.keyboard.press('Tab'); await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert(await trigger.evaluate(element => element === document.activeElement));
  await trigger.click(); await dialog.getByRole('button', { name: 'Revisar publicação' }).click();
  await page.locator('.editor-heading').getByRole('heading', { name: 'Conferência dos atos e emissão de certidões' }).waitFor();
  assert.equal(await page.locator('.manager-dashboard').count(), 0);
  await page.locator('.editor-heading').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Acompanhamento', exact: true }).click(); await loaded();
  for (const [value, title] of [['rascunho', 'Em preparação'], ['agendado', 'Em breve'], ['arquivado', 'Conteúdo arquivado']]) {
    await page.getByLabel('Status', { exact: true }).selectOption(value); await page.getByText(title, { exact: true }).waitFor();
    assert.equal(await page.locator('.manager-table tbody tr').count(), 1);
  }
  await page.getByRole('button', { name: 'Limpar busca e recortes' }).click(); await loaded();
  await page.getByLabel('Status', { exact: true }).selectOption('publicado'); await loaded();
  await page.getByLabel('Ordenar por', { exact: true }).selectOption('visualizacoes');
  await page.waitForFunction(title => document.querySelector('.manager-table tbody th strong')?.textContent === title, 'Assinatura digital de documentos');
  await page.getByLabel('Buscar publicação', { exact: true }).fill('inexistente'); await page.getByRole('button', { name: 'Buscar no acompanhamento' }).click();
  await page.getByText('Nenhuma publicação encontrada para estes filtros.', { exact: true }).waitFor();
  assert.deepEqual(await page.locator('.manager-kpi > strong').allTextContents(), ['0', '0', '—', '0']);
  await page.getByRole('button', { name: 'Ampliar análise' }).click(); await loaded();
  await page.getByRole('button', { name: 'OrionPRO', exact: true }).click();
  await expand.click(); await loaded();
  await page.getByText('1 publicação encontrada nos filtros selecionados', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Novidades', exact: true }).click();
  await expand.click(); await loaded();
  await page.getByText('Nenhuma publicação encontrada para estes filtros.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Todos os sistemas', exact: true }).click(); await loaded();
  await page.getByRole('button', { name: 'Todos', exact: true }).click(); await loaded();
  // Falha e carregamento não mostram zeros falsos nem resultados do filtro anterior.
  let fail = true;
  await page.route('**/api/v1/admin/acompanhamento?**', async route => { if (fail) return route.fulfill({ status: 503, json: { message: 'Falha simulada de conexão.' } }); await pause(650); await route.continue(); });
  await page.getByRole('button', { name: 'Atualizar painel' }).click();
  await page.getByRole('heading', { name: 'Não foi possível carregar o painel' }).waitFor(); assert.equal(await page.locator('.manager-kpis').count(), 0);
  fail = false; await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.manager-refresh')?.disabled === true);
  assert.equal(await page.locator('.manager-table').count(), 0); await loaded();
  await page.unroute('**/api/v1/admin/acompanhamento?**');
  // Menos linhas para capturas, sem mudar os totais dos indicadores.
  await page.getByRole('button', { name: /Com feedback negativo/ }).click(); await loaded();
  await collapse.click(); await loaded();
  let failExpansion = true;
  await page.route('**/api/v1/admin/acompanhamento?**', async route => {
    if (failExpansion && new URL(route.request().url()).searchParams.get('incluir_publicacoes') === 'true') return route.fulfill({ status: 503, json: { message: 'Falha ao expandir resultados.' } });
    return route.continue();
  });
  await expand.click(); await page.getByRole('alert').waitFor();
  await collapse.click(); await loaded();
  failExpansion = false; await expand.click(); await loaded();
  assert.equal(await page.getByRole('alert').count(), 0, 'Falha anterior não persiste ao reabrir a mesma consulta');
  assert.equal(await page.locator('.manager-table tbody tr').count(), 2);
  await page.unroute('**/api/v1/admin/acompanhamento?**');
  for (const width of [320, 390, 768, 820, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${width}/${theme}`);
      assert(await dashboard.evaluate(node => [...node.querySelectorAll('input,select,button')].every(element => element.getBoundingClientRect().right <= innerWidth + 1)), `Controles cortados ${width}/${theme}`);
      if ([390, 1366].includes(width)) await shot(`analytics-manager-${width}-${theme}`);
      await collapse.click(); await loaded();
      assert.equal(await page.locator('.manager-table').count(), 0);
      assert((await expand.boundingBox()).height >= 44, 'Seção pode ser aberta por toque');
      assert.equal(metricsRequests.at(-1).get('incluir_publicacoes'), 'false');
      if ([390, 1366].includes(width)) await shot(`analytics-results-collapsed-${width}-${theme}`);
      await expand.click(); await loaded();
      await trigger.click(); await dialog.getByText('2 motivos recebidos', { exact: true }).waitFor();
      assert(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth), `Modal overflow ${width}/${theme}`);
      if ([390, 1366].includes(width)) await page.screenshot({ path: path.join(artifacts, `analytics-reasons-${width}-${theme}.png`) });
      await page.getByRole('button', { name: 'Fechar motivos' }).click();
    }
  }
  assert.equal((await get()).resumo.visualizacoes, 16, 'Consulta administrativa não registra leitura');
  // Respostas antigas não reabrem a seção nem repõem publicações de outro filtro.
  await page.route('**/api/v1/admin/acompanhamento?**', async route => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get('busca') === 'assinatura' && query.get('incluir_publicacoes') === 'true') {
      const response = await route.fetch(); await pause(700); return route.fulfill({ response });
    }
    return route.continue();
  });
  await page.getByLabel('Buscar publicação', { exact: true }).fill('assinatura');
  await page.getByRole('button', { name: 'Buscar no acompanhamento' }).click();
  await page.getByText('Carregando publicações filtradas…', { exact: true }).waitFor();
  await collapse.click();
  await page.getByLabel('Buscar publicação', { exact: true }).fill('conferencia');
  await page.getByRole('button', { name: 'Buscar no acompanhamento' }).click(); await loaded();
  await pause(900);
  assert.equal(await page.locator('.manager-table tbody tr').count(), 1);
  assert(await page.locator('.manager-table').getByText('Conferência dos atos e emissão de certidões', { exact: true }).isVisible());
  assert.equal(await page.locator('.manager-table').getByText('Assinatura digital de documentos', { exact: true }).count(), 0);
  await page.unroute('**/api/v1/admin/acompanhamento?**');
  // Paginação dos motivos, texto literal e recuperação de erro no modal.
  const unsafe = '<script>window.__analyticsXss=1</script> Preciso de instruções mais claras.';
  await db.query("UPDATE ca_reacoes SET motivo=$1 WHERE post_id=$2 AND tipo='dislike'", [unsafe, negative]);
  for (let i = 0; i < 21; i++) await react(negative, 'extra-feedback-' + i, 'dislike');
  await trigger.click(); await dialog.getByText('23 motivos recebidos', { exact: true }).waitFor();
  assert.equal(await dialog.locator('li').count(), 20);
  await dialog.getByRole('button', { name: 'Próxima', exact: true }).click(); await dialog.getByText('Página 2 de 2', { exact: true }).waitFor();
  assert.equal(await dialog.locator('li').count(), 3);
  assert(await dialog.getByText(unsafe, { exact: true }).first().isVisible());
  assert.equal(await page.evaluate(() => window.__analyticsXss), undefined);
  await page.getByRole('button', { name: 'Fechar motivos' }).click();
  await page.route('**/motivos?**', route => route.fulfill({ status: 503, json: { message: 'Não foi possível consultar os motivos.' } }));
  await trigger.click(); await dialog.getByRole('alert').waitFor();
  await page.unroute('**/motivos?**');
  await dialog.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await dialog.getByText('23 motivos recebidos', { exact: true }).waitFor();
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('OK: seção recolhível, consulta sob demanda e filtrada, 5/10/20 por página, respostas fora de ordem, revisão, motivos, teclado, erro/retry e 7 larguras nos 2 temas.');
} catch (error) {
  console.error(error); console.error(logs); process.exitCode = 1;
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) { console.error(await page.locator('.manager-dashboard').ariaSnapshot().catch(() => 'Painel não disponível')); await page.screenshot({ path: path.join(artifacts, 'analytics-failure.png'), fullPage: true }).catch(() => {}); }
}
finally {
  await browser?.close();
  if (child && child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await Promise.race([closed, pause(3000)]); }
  await api.close(); await closeDatabase?.();
  if (created) { await db.query('SET search_path TO public'); await db.query(`DROP SCHEMA ${schema} CASCADE`); console.log('Schema exclusivo removido; dados reais preservados.'); }
  await db.end();
}
