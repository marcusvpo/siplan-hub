import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// API totalmente simulada: não acessa nem altera o banco do usuário.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const portServer = createServer();
portServer.listen(0, '127.0.0.1');
await once(portServer, 'listening');
const port = portServer.address().port;
await new Promise(resolve => portServer.close(resolve));
const prefix = (process.env.TEST_BLOG_BASE_PATH ?? '/').replace(/\/$/, '');
const base = `http://127.0.0.1:${port}${prefix}`;
const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: path.join(root, 'apps/web'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, VITE_BLOG_BASE_PATH: prefix + '/' },
});
let browser, logs = '';
child.stdout.on('data', data => { logs = (logs + data).slice(-4000); });
child.stderr.on('data', data => { logs = (logs + data).slice(-4000); });
const systems = ['oriontn', 'orionpro', 'orionreg'];
const names = ['OrionTN', 'OrionPRO', 'OrionREG'];
const versions = systems.map((sistema, i) => ({ id: i + 1, sistema, sistema_nome: names[i], codigo: `06.03.0${i + 1}`, total_posts: 2, criado_em: '2026-09-17T12:00:00Z' }));
const posts = versions.map(v => ({ id: v.id + 100, titulo: `Novidade ${v.sistema_nome}`, subtitulo: 'Novidades para a rotina do cartório.', resumo: '', slug: `novidade-${v.sistema}`, versao_id: v.id, versao: v.codigo,
  sistema: v.sistema, sistema_nome: v.sistema_nome, tipo: 'novidade', corpo_formato: 'html', corpo: '<p>Conteúdo da publicação de teste.</p>', publicado_em: v.criado_em,
  capa_imagem_id: null, produtos: [{ slug: v.sistema, nome: v.sistema_nome }], tipos: ['novidade'], status: 'publicado', total_itens: 0, itens: [] }));

try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/')).ok) { ready = true; break; } } catch {} await pause(250); }
  assert(ready, logs);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL === 'chromium' ? undefined : process.env.TEST_BROWSER_CHANNEL ?? 'msedge', headless: true });
  await mkdir(path.join(root, '.test-results'), { recursive: true });
  for (const [width, theme, motion] of [[1366, 'light', 'no-preference'], [390, 'dark', 'no-preference'], [320, 'light', 'reduce']]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, colorScheme: theme, reducedMotion: motion });
    let denied = false, failVersions = false, slowPro = false, documents = 0;
    let versionsGate = null, postsGate = null;
    const errors = [], unexpected = [];
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.resourceType() === 'document') documents++; });
    await context.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url()), endpoint = url.pathname.replace(prefix + '/api/v1', '');
      const json = data => route.fulfill({ json: data });
      if (/^\/(?:admin\/)?imagens\/[a-f0-9-]{36}$/.test(endpoint)) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCNcAAAAASUVORK5CYII=', 'base64') });
      if (endpoint === '/admin/access') return json({ mode: 'host', canManage: !denied, admin: denied ? null : { id: 1, email: 'teste@example.test' }, csrfToken: denied ? null : 'test-csrf' });
      if (endpoint === '/versoes') {
        const system = url.searchParams.get('produto');
        const fail = failVersions;
        const gate = versionsGate;
        await pause(slowPro && system === 'orionpro' ? 800 : 300);
        if (gate) await gate;
        if (fail) return route.fulfill({ status: 503, json: { message: 'Falha de teste.' } });
        return json({ data: versions.filter(v => !system || v.sistema === system), meta: { nao_lidas: 0 } });
      }
      if (endpoint === '/publicacoes') {
        const gate = postsGate;
        await pause(300);
        if (gate) await gate;
        const version = Number(url.searchParams.get('versao_id'));
        const data = version ? posts.filter(p => p.versao_id === version) : posts;
        return json({ data, meta: { page: 1, limit: 20, total: data.length, nao_lidas: 0 } });
      }
      if (/\/reacao$/.test(endpoint)) return json({ tipo: null, motivo: null });
      if (/\/leituras$/.test(endpoint)) return json({ ok: true });
      if (endpoint.startsWith('/publicacoes/')) { await pause(300); return json(posts[0]); }
      if (endpoint === '/admin/publicacoes') { await pause(300); return json({ data: posts }); }
      if (endpoint === '/admin/versoes') return json({ data: versions });
      if (endpoint === '/admin/sugestoes') { await pause(300); return json({ data: [{ id: 'test', nome: 'Leitor de teste', cartorio: 'Cartório de teste', sugestao: 'Mais exemplos.', criado_em: versions[0].criado_em }], meta: { page: 1, limit: 5, total: 1 } }); }
      if (endpoint === '/admin/acompanhamento') {
        await pause(300);
        return json({ data: [], meta: { page: 1, limit: 5, total: 0 }, atualizado_em: versions[0].criado_em,
          resumo: { publicacoes: 3, disponiveis: 3, visualizacoes: 1, visitantes_unicos: 1, likes: 0, dislikes: 0, compartilhamentos: 0, aprovacao: null, com_feedback: 0, sem_visualizacoes: 2, sem_avaliacoes: 1 } });
      }
      unexpected.push(endpoint);
      return route.fulfill({ status: 404, json: {} });
    });
    const settled = () => page.waitForFunction(() => !document.querySelector('.content-transition[data-pending="true"]'));
    const filter = name => page.getByRole('button', { name, exact: true });
    await page.goto(base + '/inicio');
    await page.locator('.home-news-card').first().waitFor(); await settled();
    await page.evaluate(() => { window.__navigationSentinel = 'same-document'; });
    await page.locator('.home-news-card').first().click();
    await page.getByText('Este conteúdo foi útil para você?', { exact: true }).waitFor();
    await settled();
    assert.equal(documents, 1, 'Abrir novidade não recarrega o documento');
    assert.equal(await page.evaluate(() => window.__navigationSentinel), 'same-document');
    await filter('Todas as versões').click(); await page.locator('.version-card').waitFor(); await settled();
    // O conteúdo anterior e sua altura permanecem durante a troca, sem permitir clicar em dados antigos.
    const region = page.locator('.content-transition').filter({ has: page.locator('.version-cards') }).last();
    const before = await region.boundingBox();
    let releaseVersions;
    versionsGate = new Promise(resolve => { releaseVersions = resolve; });
    await filter('OrionPRO').click();
    const pending = page.locator('.content-transition[data-pending="true"]').last();
    await pending.waitFor();
    try {
      assert.equal(await pending.locator('.version-card').count(), 1);
      assert(await pending.locator('.content-transition-body').first().evaluate(el => el.inert));
      assert(Math.abs((await pending.boundingBox()).height - before.height) < 2, 'Altura preservada durante a consulta');
      const indicator = await pending.locator('.content-transition-status').boundingBox();
      const heading = await pending.locator('.section-heading h2').boundingBox();
      assert(indicator.y + indicator.height <= heading.y, 'Indicador não sobrepõe o título');
      await page.screenshot({ path: path.join(root, '.test-results', `navigation-pending-${width}.png`) });
    } finally { versionsGate = null; releaseVersions(); }
    await settled();
    assert.match(await page.locator('.version-card').innerText(), /06\.03\.02/);
    await filter('OrionTN').click(); await settled();
    slowPro = true;
    await filter('OrionPRO').click();
    // Elemento visível pela rolagem dos filtros, inclusive no mobile.
    await filter('OrionREG').click(); await settled(); await pause(850);
    assert.match(await page.locator('.version-card').innerText(), /06\.03\.03/);
    slowPro = false;
    await page.locator('.version-card').click(); await settled();
    await page.locator('.reading-card').waitFor();
    let releasePosts;
    postsGate = new Promise(resolve => { releasePosts = resolve; });
    await page.getByLabel('Ordenar publicações', { exact: true }).selectOption('antigas');
    try { await page.locator('.content-transition[data-pending="true"] .reading-card').waitFor(); }
    finally { postsGate = null; releasePosts(); }
    await settled();
    await filter('Todas as versões').click(); await settled();
    failVersions = true;
    await filter('OrionTN').click(); await page.getByText('Falha de teste.', { exact: true }).waitFor(); await settled();
    assert.equal(await page.locator('.version-card').count(), 0, 'Erro não reapresenta os resultados antigos');
    failVersions = false;
    await filter('OrionTN').click(); await settled();
    assert.match(await page.locator('.version-card').innerText(), /06\.03\.01/, 'O mesmo filtro permite tentar novamente após falha');
    await filter('OrionPRO').click(); await settled();
    await filter('Limpar filtros e voltar ao início').click(); await page.locator('.home-news-card').first().waitFor();
    await page.goBack(); await page.locator('.version-card').waitFor(); await settled();
    assert.equal(new URL(page.url()).pathname, prefix + '/orionpro/novidades');
    await page.goForward(); await page.locator('.home-news-card').first().waitFor(); await settled();
    assert.equal(documents, 1, 'Voltar/avançar não recarrega a página');
    await filter('Acessar Gestão').click(); await page.locator('.management-entry').first().waitFor(); await settled();
    assert.equal(documents, 1, 'Alternância Gestão/leitor sem recarga');
    await filter('Acompanhamento').click(); await page.locator('.manager-kpis').waitFor(); await settled();
    await filter('OrionTN').click(); await settled();
    await filter('Sugestões').click(); await page.locator('.suggestion-inbox-item').waitFor(); await settled();
    await filter('Atualizar sugestões').click(); await settled();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sem overflow');
    if (motion === 'reduce') assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0, 'Movimento reduzido respeitado');
    await filter('Visualização do leitor').click(); await page.locator('.home-news-card').first().waitFor(); await settled();
    assert.equal(documents, 1);
    await filter('Acessar Gestão').click(); await page.locator('.management-entry').first().waitFor();
    denied = true;
    await page.evaluate(() => window.dispatchEvent(new Event('orion:access-changed')));
    await page.getByRole('heading', { name: 'Acesso restrito' }).waitFor();
    assert.equal(await page.locator('.management-entry,.suggestion-inbox-item,.manager-kpis').count(), 0, 'Conteúdo administrativo descartado ao revogar acesso');
    // Prefixo também cobre links diretos, URLs de mídia e a serialização do editor.
    denied = false;
    await page.goto(base + '/posts/101/palavra-antiga');
    await page.getByText('Este conteúdo foi útil para você?', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, prefix + '/posts/101/novidade-oriontn');
    assert.equal(await page.locator('.brand-title img').evaluate(img => img.complete && img.naturalWidth > 0), true);
    const media = await page.evaluate(async prefix => {
      const { safePostHtml, postHtmlForStorage } = await import(prefix + '/src/content.ts');
      const id = '11111111-1111-4111-8111-111111111111';
      const html = `<p>Imagem</p><img src="/api/v1/imagens/${id}" alt="Teste">`;
      const preview = safePostHtml(html, true);
      return { preview, publicHtml: safePostHtml(preview), saved: postHtmlForStorage(preview),
        foreign: safePostHtml('<img src="https://externo.example/imagem.png">') };
    }, prefix);
    assert(media.preview.includes(`src="${prefix}/api/v1/admin/imagens/`));
    assert(media.publicHtml.includes(`src="${prefix}/api/v1/imagens/`));
    assert(media.saved.includes('src="/api/v1/imagens/'));
    assert(!media.saved.includes('/admin/')); assert.equal(media.foreign, '');
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    await context.close();
    console.log(`OK: ${prefix || '/'} em ${width}px/${theme}/${motion}, transições, histórico, revogação, links diretos e mídia.`);
  }
} catch (error) { console.error(error); console.error(logs); process.exitCode = 1; }
finally {
  await browser?.close();
  if (child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await Promise.race([closed, pause(3000)]); }
}
