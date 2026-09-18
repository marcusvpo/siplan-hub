import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { checkImageViewer } from './check-image-viewer.mjs';
import { checkManagementStyle } from './check-management-style.mjs';
import { checkSuggestionBox, checkSuggestionPosition } from './check-suggestion-box.mjs';
import { checkListingTools, mockListingVersions, mockListingPosts } from './check-listing-tools.mjs';

// Dados simulados: esta verificação visual não lê nem altera o banco real.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, '.test-results');
const coverId = 'a5be4110-44ee-4a84-a7e4-1412c6a40e12';
const coverImage = await readFile(path.join(root, 'apps/web/public/assets/Siplan_logo.png'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const portServer = createServer();
portServer.listen(0, '127.0.0.1');
await once(portServer, 'listening');
const port = portServer.address().port;
await new Promise(resolve => portServer.close(resolve));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: path.join(root, 'apps/web'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '', browser;
child.stdout.on('data', data => { logs = (logs + data).slice(-5000); });
child.stderr.on('data', data => { logs = (logs + data).slice(-5000); });

const version = { id: 101, codigo: '06.03.03', sistema: 'oriontn', sistema_nome: 'OrionTN', total_posts: 2, nao_lidos: 1, ultima_publicacao: '2026-09-16T12:00:00Z' };
const posts = [{
  id: 201, titulo: 'Mais agilidade na assinatura de documentos',
  subtitulo: 'Conheça as novidades que simplificam a conferência e a assinatura dos atos na rotina da serventia.',
  slug: 'assinatura-de-documentos', versao: version.codigo, versao_id: version.id,
  sistema: version.sistema, sistema_nome: version.sistema_nome, tipo: 'novidade',
  publicado_em: '2026-09-16T12:00:00Z', status: 'publicado', corpo_formato: 'html',
  corpo: `<p>Uma rotina mais simples começa com informações claras e organizadas.</p><h2>O que mudou?</h2><p>Consulte as orientações para acompanhar a atualização do sistema.</p><ul><li>Confira os documentos selecionados.</li><li>Revise as informações antes de concluir.</li></ul><blockquote>Compartilhe esta publicação com a equipe do seu cartório.</blockquote><p><img src="/api/v1/imagens/${coverId}" alt="Fluxo de atendimento"></p><p><a href="/inicio"><img src="/api/v1/imagens/${coverId}" alt="Imagem vinculada"></a></p>`,
  ja_lido: false, critico: false, destaque: false, capa_imagem_id: coverId,
  produtos: [{ slug: 'oriontn', nome: 'OrionTN' }], total_itens: 0, itens: [], tipos: ['novidade'],
}, {
  id: 202, titulo: 'Consulta de atos com informações mais claras',
  subtitulo: 'Veja como localizar os detalhes que você precisa para o atendimento.',
  slug: 'consulta-de-atos', versao: version.codigo, versao_id: version.id,
  sistema: version.sistema, sistema_nome: version.sistema_nome, tipo: 'melhoria',
  publicado_em: '2026-09-15T12:00:00Z', status: 'publicado', corpo_formato: 'text', corpo: 'Orientações para consultar os atos.',
  ja_lido: true, critico: false, destaque: false, capa_imagem_id: null,
  produtos: [{ slug: 'oriontn', nome: 'OrionTN' }], total_itens: 0, itens: [], tipos: ['melhoria'],
}];

const homeNews = [
  { ...posts[0], id: 301, titulo: 'Mais agilidade para os atos notariais', sistema: 'oriontn', sistema_nome: 'OrionTN' },
  { ...posts[0], id: 302, titulo: 'Uma nova forma de acompanhar os protestos', sistema: 'orionpro', sistema_nome: 'OrionPRO', publicado_em: '2026-09-15T12:00:00Z' },
  { ...posts[0], id: 303, titulo: 'Informações reunidas para os seus registros', sistema: 'orionreg', sistema_nome: 'OrionREG', publicado_em: '2026-09-14T12:00:00Z' },
];

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* servidor iniciando */ }
    await pause(250);
  }
  assert(ready, logs);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL === 'chromium' ? undefined : process.env.TEST_BROWSER_CHANNEL ?? 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' });
  let mode = 'populated', detailDelay = 0;
  const errors = [];
  const versionRequests = [];
  const homeRequests = [];
  const readRequests = [];
  const unexpectedRequests = [];
  await context.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.replace('/api/v1', '');
    const json = value => route.fulfill({ json: value });
    if (endpoint === `/imagens/${coverId}` || endpoint === `/admin/imagens/${coverId}`) return route.fulfill({ contentType: 'image/png', body: coverImage });
    if (endpoint === '/admin/session') return json({ admin: { id: 1, email: 'gestor@example.test' }, csrfToken: 'test-token' });
    if (endpoint === '/admin/access') return json({ mode: 'local', canManage: true, admin: { id: 1, email: 'gestor@example.test' }, csrfToken: 'test-token' });
    if (endpoint === '/admin/versoes') return json({ data: [version] });
    if (endpoint === '/admin/publicacoes') return json({ data: posts });
    if (endpoint.startsWith('/admin/publicacoes/')) return json(posts[0]);
    if (endpoint === '/versoes') {
      versionRequests.push(url.href);
      if (mode === 'listing') return json(mockListingVersions(url.searchParams));
      if (mode === 'loading') await pause(500);
      if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Falha simulada de conexão.' } });
      const empty = mode === 'empty' || url.searchParams.get('tipo') === 'aviso' || url.searchParams.get('produto') === 'orionreg';
      return json({ data: [{ ...version, total_posts: empty ? 0 : 2 }], meta: { nao_lidas: empty ? 0 : 1 } });
    }
    if (endpoint === '/publicacoes') {
      if (url.searchParams.get('ordem') === 'recentes' && !url.searchParams.has('versao_id')) {
        homeRequests.push(url.href);
        if (mode === 'home-loading') await pause(700);
        if (mode === 'home-error') return route.fulfill({ status: 503, json: { message: 'Falha simulada.' } });
        const data = mode === 'home-empty' ? [] : mode === 'home-single' ? homeNews.slice(0, 1) : homeNews;
        return json({ data, meta: { total: data.length, nao_lidas: data.length, page: 1, limit: 3 } });
      }
      if (detailDelay) await pause(detailDelay);
      if (mode === 'listing') return json(mockListingPosts(url.searchParams));
      const data = mode === 'empty-version' ? [] : posts;
      return json({ data, meta: { total: data.length, nao_lidas: 1, page: 1, limit: 20 } });
    }
    if (/\/reacao$/.test(endpoint)) return json({ tipo: null, motivo: null });
    if (/\/(leituras|compartilhamentos)$/.test(endpoint)) {
      if (endpoint.endsWith('/leituras')) readRequests.push(endpoint);
      return json({ ok: true });
    }
    if (endpoint.startsWith('/publicacoes/id/')) {
      const post = [...homeNews, ...posts].find(post => String(post.id) === endpoint.split('/').at(-1));
      return post ? json(post) : route.fulfill({ status: 404, json: { message: 'Publicação não encontrada ou indisponível.' } });
    }
    if (endpoint.startsWith('/publicacoes/')) return json(posts[0]);
    unexpectedRequests.push(endpoint);
    return route.fulfill({ status: 404, json: { error: 'unexpected_test_request' } });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(10000);
  await mkdir(artifacts, { recursive: true });
  const noOverflow = async () => {
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Página sem rolagem horizontal');
    assert.equal(await page.locator('.unread,.version-unread,.publication-read-state,.publication-unread-dot').count(), 0, 'Indicadores de leitura não são exibidos ao leitor');
    assert.equal(await page.getByText('Tudo lido', { exact: true }).count(), 0);
  };
  const shot = (name, fullPage = true) => page.screenshot({ path: path.join(artifacts, name + '.png'), fullPage, animations: 'disabled' });
  const supportLabel = 'Clique aqui para registrar um chamado e nossa equipe de suporte entrará em contato.';
  const verifySupport = async () => {
    assert(await page.getByText('Surgiram dúvidas?', { exact: true }).isVisible());
    const support = page.getByRole('link', { name: supportLabel, exact: true });
    assert.equal(await support.getAttribute('href'), 'https://sac.siplancontrolm.com.br/');
    assert.equal(await support.getAttribute('target'), '_blank');
    assert.equal(await support.getAttribute('rel'), 'noopener noreferrer');
    const actionsBox = await page.locator('.feedback-actions').boundingBox();
    const supportBox = await page.locator('.publication-support').boundingBox();
    assert(supportBox.y >= actionsBox.y + actionsBox.height, 'Suporte fica abaixo das reações e do compartilhamento');
    assert.match(await support.evaluate(element => getComputedStyle(element).textDecorationLine), /underline/, 'Link reconhecível visualmente');
    await noOverflow();
  };
  const verifyPublicationHover = async (selector, label) => {
    const card = page.locator(selector).first();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.mouse.move(0, 0);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(selector => getComputedStyle(document.querySelector(selector)).transform === 'none', selector);
    const resting = await card.boundingBox();
    const originalShadow = await card.evaluate(element => getComputedStyle(element).boxShadow);
    const originalButtonFill = selector === '.home-news-card' ? await card.locator('.home-news-read').evaluate(element => getComputedStyle(element).backgroundColor) : null;
    const originalFlowPosition = await card.evaluate(element => element.offsetTop);
    await card.hover();
    await page.waitForFunction(selector => getComputedStyle(document.querySelector(selector)).transform === 'matrix(1, 0, 0, 1, 0, -2)', selector);
    const raised = await card.boundingBox();
    assert(Math.abs(raised.y - resting.y + 2) < .1, 'Cartão sobe suavemente 2 px');
    assert.equal(await card.evaluate(element => element.offsetTop), originalFlowPosition, 'Hover não desloca a listagem');
    const shadow = await card.evaluate(element => getComputedStyle(element).boxShadow);
    assert.notEqual(shadow, originalShadow);
    assert.match(shadow, /0px 0px 5px 1px/, 'Contorno difuso ao redor do cartão');
    assert.match(shadow, /0px 8px 20px 0px/, 'Sombra suave acompanha a elevação');
    if (selector === '.home-news-card') {
      const dark = await page.locator('html').getAttribute('data-theme') === 'dark';
      assert.match(shadow, dark ? /228, 197, 116/ : /174, 130, 34/, 'Hover da última novidade continua dourado');
      assert.equal(await card.locator('.home-news-read').evaluate(element => getComputedStyle(element).backgroundColor), dark ? 'rgb(183, 157, 99)' : 'rgb(223, 199, 137)', 'Botão da mais recente escurece ao passar o mouse pelo cartão');
    }
    await shot(`publication-hover-${label}`);
    await page.mouse.move(0, 0);
    await page.waitForFunction(({ selector, originalShadow }) => {
      const style = getComputedStyle(document.querySelector(selector));
      return style.transform === 'none' && style.boxShadow === originalShadow;
    }, { selector, originalShadow });
    if (originalButtonFill !== null) {
      await page.waitForFunction(fill => getComputedStyle(document.querySelector('.home-news-card--latest .home-news-read')).backgroundColor === fill, originalButtonFill);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await card.hover();
    assert.equal(await card.evaluate(element => getComputedStyle(element).transform), 'none', 'Movimento reduzido mantém o cartão parado');
    assert.equal(await card.evaluate(element => getComputedStyle(element).boxShadow), shadow, 'Movimento reduzido preserva o destaque visual');
    await page.mouse.move(0, 0);
  };
  const clearFilters = page.getByRole('button', { name: 'Limpar filtros e voltar ao início', exact: true });
  const verifyClearFiltersStyle = async () => {
    const button = await clearFilters.boundingBox();
    const row = await page.locator('.filter-home-action').boundingBox();
    if (page.viewportSize().width <= 700) {
      const order = await page.locator('.listing-order').boundingBox();
      assert(Math.abs(button.x - order.x) < 1, 'Borda esquerda de Limpar filtros alinhada à ordenação no mobile');
    }
    else assert(Math.abs(button.x + button.width - row.x - row.width) < 1, 'Alinhamento à direita preservado no desktop');
    assert(button.height >= 44, 'Limpar filtros mantém área de toque acessível');
    assert.equal(await clearFilters.evaluate(element => getComputedStyle(element).borderRadius), '999px', 'Botão segue o formato arredondado do blog');
    const icon = clearFilters.locator('.back-versions-icon');
    const iconBox = await icon.boundingBox();
    assert.equal(iconBox.width, 30);
    assert.equal(iconBox.height, 30);
    assert.equal(await icon.evaluate(element => getComputedStyle(element).borderRadius), '50%', 'Ícone em destaque circular');
    await noOverflow();
  };
  const verifyHome = async () => {
    await page.waitForURL(base + '/inicio');
    await page.getByRole('heading', { name: 'Últimas novidades', exact: true }).waitFor();
    // Após retry, aguarda a nova renderização, não o aria-busy=false do erro anterior.
    await page.waitForFunction(() => document.querySelector('.home-latest')?.getAttribute('aria-busy') === 'false' && document.querySelectorAll('.home-news-card').length === 3);
    assert.equal(await page.locator('.home-news-card').count(), 3);
    assert.equal(await page.getByText('OrionTN · OrionPRO · OrionREG', { exact: true }).count(), 0, 'Lista fixa redundante de sistemas removida da home');
    assert.equal(await page.locator('.home-welcome').count(), 0, 'Bloco de boas-vindas removido');
    assert(await page.locator('main > :first-child').evaluate(element => element.classList.contains('filters')), 'Filtros são o primeiro conteúdo da página');
    assert.equal(await page.locator('.topbar .blog-signature-illustration').count(), 1, 'Cartório reaproveitado no cabeçalho');
    assert.equal(await page.locator('.blog-signature-text').count(), 1);
    for (const line of await page.locator('.blog-signature-text > span,.blog-signature-text > strong').all()) {
      assert((await line.innerText()).trim().length > 0, 'Texto configurado no cabeçalho preservado');
    }
    assert.equal(await page.locator('.home-news-card--latest').count(), 1, 'Apenas a mais recente recebe destaque adicional');
    assert.equal(await page.locator('.versions-view,.version-card,.reading-card').count(), 0, 'Home apresenta apenas atalhos, sem versões ou publicações completas');
    assert.equal(await page.getByRole('button', { name: 'Todos os sistemas', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: 'Todos', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await clearFilters.count(), 0, 'Home não oferece limpar filtros inexistentes');
    assert.equal(await page.locator('.version-posts,.post-feedback').count(), 0, 'Home limpa a versão e a publicação abertas');
    assert.deepEqual(Object.fromEntries(new URL(homeRequests.at(-1)).searchParams), { tipo: 'novidade', limit: '3', ordem: 'recentes' }, 'Novidades recentes de todos os sistemas');
    await noOverflow();
  };
  const verifyLatestGold = async theme => {
    const colors = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.home-news-card')];
      const latest = cards[0], button = getComputedStyle(latest.querySelector('.home-news-read')), badge = getComputedStyle(latest.querySelector('.home-news-badge'));
      return {
        accent: getComputedStyle(latest).getPropertyValue('--publication-accent').trim(),
        rootAccent: getComputedStyle(document.documentElement).getPropertyValue('--publication-accent').trim(),
        otherAccents: cards.slice(1).map(card => getComputedStyle(card).getPropertyValue('--publication-accent').trim()),
        otherCards: cards.slice(1).map(card => ({
          tint: getComputedStyle(card).getPropertyValue('--publication-tint').trim(),
          line: getComputedStyle(card).getPropertyValue('--publication-tint-line').trim(),
          fill: getComputedStyle(card.querySelector('.home-news-read')).backgroundColor,
          ink: getComputedStyle(card.querySelector('.home-news-read')).color,
        })),
        fill: button.backgroundColor, ink: button.color, badgeInk: badge.color, badgeFill: badge.backgroundColor,
      };
    });
    assert.equal(colors.accent, theme === 'dark' ? '#e4c574' : '#866011', 'Somente a novidade mais recente usa dourado');
    assert.equal(colors.fill, theme === 'dark' ? 'rgb(200, 184, 142)' : 'rgb(243, 230, 199)');
    assert.equal(colors.rootAccent, theme === 'dark' ? '#ff8cab' : '#c91243', 'Identidade vermelha do blog preservada');
    assert(colors.otherAccents.every(color => color === colors.rootAccent), 'Demais novidades permanecem na paleta original');
    const luminance = rgb => rgb.match(/\d+/g).slice(0, 3).map(Number).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const contrast = (foreground, background) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
      return (values[1] + .05) / (values[0] + .05);
    };
    assert(contrast(colors.ink, colors.fill) >= 4.5, 'Texto da chamada dourada mantém contraste legível');
    assert(contrast(colors.badgeInk, colors.badgeFill) >= 4.5, 'Selo Mais recente mantém contraste legível');
    for (const card of colors.otherCards) {
      assert.equal(card.tint, theme === 'dark' ? '#33222b' : '#fff0f1');
      assert.equal(card.line, theme === 'dark' ? '#874957' : '#e6aeb5', 'Bordas vermelhas mais presentes somente nas novidades anteriores');
      assert.equal(card.fill, theme === 'dark' ? 'rgb(72, 41, 54)' : 'rgb(248, 224, 227)');
      assert(contrast(card.ink, card.fill) >= 4.5, 'Botões vermelhos preservam contraste legível');
    }
  };
  // A primeira navegação também aguarda a transformação inicial dos módulos pelo Vite.
  await page.goto(base + '/', { timeout: 30000 });
  await verifyHome();
  await page.reload();
  await verifyHome();
  assert.equal(versionRequests.length, 0, 'Home não consulta versões');
  assert.equal(readRequests.length, 0, 'Os atalhos da home não contam como leituras');
  for (const width of [320, 360, 375, 390, 414, 480, 600, 700, 768, 900, 901, 1024, 1100, 1101, 1366, 1579, 1580, 1789]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
      await verifyLatestGold(theme);
      await noOverflow();
      const art = await page.locator('.blog-signature-illustration').boundingBox();
      const brand = await page.locator('.brand-title').boundingBox();
      const header = await page.locator('.topbar').boundingBox();
      if (width > 700) {
        assert(await page.locator('.blog-signature').isVisible(), 'Assinatura preservada fora do mobile');
        assert(art.y >= header.y && art.y + art.height <= header.y + header.height, 'Ilustração contida no cabeçalho');
      }
      if (width > 1100) assert(art.x > brand.x + brand.width, 'Cartório e frase ao lado do título no desktop');
      if (width <= 700) {
        assert.equal(art, null, 'SVG do cartório não ocupa espaço no mobile');
        assert(await page.locator('.blog-signature').isHidden(), 'Assinatura oculta apenas no mobile');
        assert(await page.locator('.blog-signature-text').isHidden(), 'Frases da assinatura ocultas no mobile');
        assert.equal(await page.locator('.brand-title h1').evaluate(element => getComputedStyle(element).textAlign), 'center');
        assert.equal(await page.locator('.brand-title p').evaluate(element => getComputedStyle(element).textAlign), 'center');
        assert(await page.locator('.brand-title h1').evaluate(element => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getClientRects().length === 1 && element.scrollWidth <= element.clientWidth;
        }), 'Título completo em uma única linha, sem corte ou overflow');
        assert(await page.locator('.brand-title').evaluate(element => element.scrollWidth <= element.clientWidth), 'Sem texto cortado no cabeçalho');
        const toggle = await page.locator('.theme-toggle').boundingBox();
        assert(toggle.width >= 44 && toggle.height >= 44, 'Tema mantém área de toque acessível');
        assert(toggle.x >= brand.x + brand.width + 8, 'Botão de tema ao lado do título, sem sobreposição');
        assert(Math.abs(toggle.y + toggle.height / 2 - brand.y - brand.height / 2) < 2, 'Título e tema alinhados na mesma linha');
        assert(Math.abs(width - toggle.x - toggle.width - 10) < 1, 'Botão de tema alinhado à direita com margem de 10px no mobile');
        assert(header.height < 100, 'Cabeçalho mobile compacto, sem linha exclusiva para o tema');
      }
      const filters = await page.locator('.filters').boundingBox();
      const news = await page.locator('.home-latest').boundingBox();
      assert(news.y >= filters.y + filters.height, 'Novidades logo abaixo dos filtros');
      await checkSuggestionPosition(page);
      for (const action of await page.locator('.home-news-read').all()) assert((await action.boundingBox()).height >= 44, 'Chamada de leitura evidente e confortável para toque');
      if ([320, 390, 700, 1366, 1789].includes(width)) await shot(`home-${width}-${theme}`);
      if (width === 1366 && theme === 'dark') await verifyPublicationHover('.home-news-card', 'home-dark');
    }
  }
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await verifyPublicationHover('.home-news-card', 'home-light');
  for (const post of homeNews) {
    const shortcut = page.getByRole('link', { name: `Ler novidade: ${post.titulo} — ${post.sistema_nome}` });
    assert.equal(await shortcut.getAttribute('href'), `/${post.sistema}/novidades?publicacao=${post.id}`);
    await shortcut.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.notEqual(await shortcut.evaluate(element => getComputedStyle(element).outlineStyle), 'none');
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: post.titulo, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Gostei', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, `/${post.sistema}/novidades`);
    assert.equal(await page.getByRole('button', { name: post.sistema_nome, exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: 'Novidades', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.home-welcome,.version-card').count(), 0);
    await page.reload();
    await page.getByRole('heading', { name: post.titulo, exact: true }).waitFor();
    await page.goBack();
    await verifyHome();
    await page.goForward();
    await page.getByRole('heading', { name: post.titulo, exact: true }).waitFor();
    await clearFilters.click();
    await verifyHome();
  }
  await page.goto(base + '/oriontn/novidades?publicacao=301');
  await page.getByRole('heading', { name: homeNews[0].titulo, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Todas as versões', exact: true }).click();
  await page.waitForURL(base + '/oriontn/novidades');
  await page.getByRole('heading', { name: 'Versões disponíveis', exact: true }).waitFor();
  for (const id of ['999999', 'invalid', '']) {
    await page.goto(base + '/oriontn/novidades?publicacao=' + id);
    await page.getByText('Publicação não encontrada ou indisponível.', { exact: true }).waitFor();
    assert.equal(await page.locator('.reading-card').count(), 0);
    await clearFilters.click();
    await verifyHome();
  }
  // Um atalho antigo continua válido se a publicação mudar de sistema ou tipo.
  await page.goto(base + '/orionpro/melhorias?publicacao=301');
  await page.waitForURL(base + '/oriontn/novidades?publicacao=301');
  await clearFilters.click();
  await verifyHome();
  mode = 'home-empty';
  await page.reload();
  await page.getByText('As próximas novidades têm lugar aqui.', { exact: true }).waitFor();
  assert.equal(await page.locator('.home-news-card,.version-card,.reading-card').count(), 0);
  await checkSuggestionPosition(page);
  assert(await page.locator('.blog-signature').isVisible());
  mode = 'home-single';
  await page.reload();
  await page.locator('.home-news-card').waitFor();
  assert.equal(await page.locator('.home-news-card').count(), 1, 'Menos de três novidades não gera cartões artificiais');
  await checkSuggestionPosition(page);
  mode = 'home-error';
  await page.reload();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor();
  assert.equal(await page.locator('.home-news-card').count(), 0);
  await checkSuggestionPosition(page);
  mode = 'populated';
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await verifyHome();
  mode = 'home-loading';
  await page.reload();
  await page.getByText('Preparando as últimas novidades para você…', { exact: true }).waitFor();
  assert.equal(await page.getByText('As próximas novidades têm lugar aqui.', { exact: true }).count(), 0);
  await verifyHome();
  mode = 'populated';
  console.log('OK: cabeçalho responsivo; sugestões ao lado dos cartões no desktop e no rodapé mobile; 18 larguras nos dois temas; links, recarga, histórico, teclado, hover, movimento reduzido e estados vazio/parcial/carregando/erro.');
  await page.getByRole('button', { name: 'OrionTN', exact: true }).click();
  await page.waitForURL(base + '/oriontn');
  await page.getByRole('button', { name: 'Novidades', exact: true }).click();
  await page.waitForURL(base + '/oriontn/novidades');
  await verifyClearFiltersStyle();
  await clearFilters.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.notEqual(await clearFilters.evaluate(element => getComputedStyle(element).outlineStyle), 'none', 'Limpar filtros tem foco visível por teclado');
  await clearFilters.hover();
  assert.match(await clearFilters.evaluate(element => getComputedStyle(element).boxShadow), /0px 0px 5px 1px/, 'Hover acompanha o contorno vermelho esfumaçado do blog');
  await shot('clear-filters-desktop-hover');
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: /OrionTN.*06\.03\.03/ }).click();
  await page.getByRole('button', { name: 'Ler publicação: ' + posts[0].titulo }).click();
  await page.getByRole('button', { name: 'Gostei', exact: true }).waitFor();
  await clearFilters.click();
  await verifyHome();
  await page.goBack();
  await page.waitForURL(base + '/oriontn/novidades');
  assert.equal(await page.getByRole('button', { name: 'OrionTN', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('button', { name: 'Novidades', exact: true }).getAttribute('aria-pressed'), 'true');
  assert(await clearFilters.isVisible());
  await page.goForward();
  await verifyHome();
  await page.goto(base + '/orionpro/correcoes');
  await clearFilters.waitFor();
  await page.reload();
  assert.equal(await page.getByRole('button', { name: 'OrionPRO', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('button', { name: 'Correções', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Todos os sistemas', exact: true }).click();
  await page.waitForURL(base + '/correcoes');
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await verifyHome();
  await page.setViewportSize({ width: 320, height: 844 });
  for (const filterPath of ['/avisos', '/orionreg']) {
    await page.goto(base + filterPath);
    await page.locator('.empty-posts').waitFor();
    await noOverflow();
    await clearFilters.click();
    await verifyHome();
  }
  await page.setViewportSize({ width: 1366, height: 1000 });
  console.log('OK: / redireciona para /inicio; acesso direto, filtros, limpeza, versão aberta, estado vazio, mobile e Voltar/Avançar.');
  mode = 'listing';
  await checkListingTools(page, base, shot);
  mode = 'populated';
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.goto(base + '/oriontn');
  await page.getByRole('button', { name: /OrionTN.*06\.03\.03/ }).click();
  await page.getByRole('heading', { name: /OrionTN.*06\.03\.03/ }).waitFor();
  assert.equal(await page.locator('.reading-card').count(), 2);
  assert.equal(await page.locator('.feed aside strong').count(), 0, 'Versão não repetida nos cartões');
  assert.equal(await page.locator('.publication-count').innerText(), '2 publicações\nTodos os tipos');
  assert(!/\bposts?\b/i.test(await page.locator('body').innerText()), 'Terminologia visível padronizada');
  await page.waitForFunction(() => document.querySelector('.post-cover img')?.naturalWidth > 0);
  assert.equal(await page.locator('.post-cover:has(.post-cover-placeholder) button').count(), 0, 'Capa SVG padrão não oferece ampliação de uma imagem inexistente');
  await noOverflow();
  await shot('publications-desktop-light');
  await verifyPublicationHover('.feed .reading-card', 'light');
  const read = page.getByRole('button', { name: 'Ler publicação: ' + posts[0].titulo });
  await read.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert(await read.evaluate(element => element === document.activeElement));
  assert.notEqual(await read.evaluate(element => getComputedStyle(element).outlineStyle), 'none');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Gostei', exact: true }).waitFor();
  await verifySupport();
  assert(readRequests.some(endpoint => endpoint === `/publicacoes/${posts[0].id}/leituras`), 'Abrir uma publicação ainda registra visualização para a Gestão');
  assert.equal(await page.locator('.rich-content li').first().evaluate(element => getComputedStyle(element).display), 'list-item');
  await shot('publication-expanded-desktop');
  await checkImageViewer(page, shot);
  await page.getByRole('button', { name: 'Recolher detalhes: ' + posts[0].titulo }).click();
  assert.equal(await page.locator('.post-feedback').count(), 0, 'Conteúdo fechado não monta ações de leitura');
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    for (const theme of ['light', 'dark']) {
      const current = await page.locator('html').getAttribute('data-theme');
      if (current !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
      await noOverflow();
      await verifyClearFiltersStyle();
      for (const coverElement of await page.locator('.post-cover').all()) {
        const cover = await coverElement.boundingBox();
        assert(Math.abs(cover.width / cover.height - 1.6) < .02, 'Capa mantém proporção 8:5');
        const expectedWidth = width <= 700 ? 112 : width <= 900 ? 128 : 144;
        assert(Math.abs(cover.width - expectedWidth) < 1, 'Capas menores em cada breakpoint, sem virar banner no celular');
        const frame = await coverElement.evaluate(element => {
          const style = getComputedStyle(element);
          return { color: style.borderTopColor, width: style.borderTopWidth, radius: style.borderTopLeftRadius };
        });
        assert.deepEqual(frame, { color: 'rgba(0, 0, 0, 0)', width: '1px', radius: '8px' }, 'Sem linha rígida; dimensões e cantos preservados');
        const shadow = await coverElement.evaluate(element => getComputedStyle(element).boxShadow);
        const shadowColor = theme === 'dark' ? '199, 114, 126' : '178, 78, 78';
        assert.equal(shadow, `rgba(${shadowColor}, 0.22) 0px 0px 4px 1px, rgba(${shadowColor}, 0.1) 0px 0px 12px 2px`, 'Contorno vermelho fosco difuso nos dois temas');
        assert.equal(await coverElement.evaluate(element => getComputedStyle(element).filter), 'none', 'Moldura não desfoca o conteúdo');
      }
      const imageStyles = await page.locator('.post-cover img').evaluate(element => ({ opacity: getComputedStyle(element).opacity, filter: getComputedStyle(element).filter }));
      assert.deepEqual(imageStyles, { opacity: '1', filter: 'none' }, 'Imagem preserva suas cores e nitidez');
      const placeholder = await page.locator('.post-cover-placeholder').boundingBox();
      assert(placeholder.width <= 96 && placeholder.height <= 60, 'Ícone padrão discreto');
      if (width === 390 || (width === 1366 && theme === 'dark')) await shot(`publications-${width}-${theme}`);
      if (width === 1366 && theme === 'dark') await verifyPublicationHover('.feed .reading-card', 'dark');
    }
  }
  await page.getByRole('button', { name: 'Todas as versões', exact: true }).click();
  await page.getByRole('heading', { name: 'Versões disponíveis' }).waitFor();
  await noOverflow();
  await shot('versions-refined-dark');
  await page.getByRole('button', { name: 'Avisos', exact: true }).click();
  await page.locator('.empty-posts').waitFor();
  assert.equal(await page.locator('.publication-overview').count(), 0);
  await page.getByRole('button', { name: 'OrionREG', exact: true }).click();
  await page.locator('.empty-posts').waitFor();
  mode = 'empty-version';
  await page.goto(base + '/oriontn');
  detailDelay = 400;
  await page.getByRole('button', { name: /OrionTN.*06\.03\.03/ }).click();
  assert.equal(await page.locator('.empty-posts').count(), 0, 'Carregamento não mostra estado vazio');
  await page.locator('.empty-posts').waitFor();
  assert.equal(await page.locator('.publication-overview').count(), 0, 'Versão sem publicação não mostra cabeçalho');
  assert(await page.getByRole('button', { name: 'Todas as versões' }).isVisible());
  mode = 'error';
  await page.reload();
  await page.getByText('Falha simulada de conexão.').waitFor();
  assert.equal(await page.locator('.empty-posts').count(), 0, 'Erro não é ausência de conteúdo');
  mode = 'populated';
  await page.goto(base + '/posts/201/assinatura-de-documentos');
  await page.getByRole('button', { name: 'Compartilhar publicação' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Todas as versões' }).getAttribute('href'), '/oriontn/novidades');
  await page.setViewportSize({ width: 320, height: 844 });
  await noOverflow();
  await verifySupport();
  await shot('publication-support-mobile-dark');
  await page.getByRole('button', { name: 'Ampliar capa da publicação', exact: true }).click();
  await page.getByRole('dialog', { name: 'Imagem da publicação', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Fechar imagem', exact: true }).click();
  await page.getByRole('button', { name: 'Ampliar imagem: Fluxo de atendimento', exact: true }).click();
  await page.getByRole('dialog', { name: 'Imagem da publicação', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Fechar imagem', exact: true }).click();
  assert((await page.locator('.post-cover').boundingBox()).width <= 112, 'Capa compartilhada também compacta');
  // Intercepta também a primeira navegação da nova guia, sem acessar o SAC real.
  await context.route('https://sac.siplancontrolm.com.br/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Destino de suporte simulado</title>' }));
  const blogUrl = page.url();
  const [supportPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: supportLabel, exact: true }).click(),
  ]);
  await supportPage.waitForURL('https://sac.siplancontrolm.com.br/');
  await supportPage.waitForLoadState('domcontentloaded');
  assert.equal(page.url(), blogUrl, 'Blog continua na guia original');
  assert(await supportPage.evaluate(() => window.opener === null), 'Nova guia não pode controlar o blog');
  await supportPage.close();
  await page.goto(base + '/gestao');
  await page.locator('.management-entry .post-cover').first().waitFor();
  await page.waitForFunction(() => document.querySelector('.management-entry .post-cover img')?.naturalWidth > 0);
  await page.getByRole('button', { name: 'Ampliar capa da publicação', exact: true }).first().click();
  const previewImage = page.locator('.image-viewer img');
  await previewImage.waitFor();
  assert((await previewImage.getAttribute('src')).includes('/api/v1/admin/imagens/'), 'Prévia continua utilizando a rota privada da imagem');
  await page.getByRole('button', { name: 'Fechar imagem', exact: true }).click();
  assert((await page.locator('.management-entry .post-cover').first().boundingBox()).width <= 112, 'Miniatura compacta também na Gestão');
  await page.setViewportSize({ width: 1366, height: 1000 });
  await verifyPublicationHover('.feed .management-entry', 'management-dark');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole('button', { name: 'Nova publicação', exact: true }).click();
  await page.getByRole('heading', { name: 'Crie uma publicação' }).waitFor();
  assert(await page.getByText('Capa da publicação (opcional)').isVisible());
  assert(!/\bposts?\b/i.test(await page.locator('body').innerText()));
  await page.getByRole('textbox', { name: 'Conteúdo da publicação' }).waitFor();
  await noOverflow();
  assert.deepEqual(errors, []);
  await checkManagementStyle(page, base, shot);
  await checkSuggestionBox(page, base, shot);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, []);
  console.log('OK: cartões, conteúdo, teclado, retorno, links, Gestão e terminologia; 4 larguras nos 2 temas; estados vazio/carregando/erro preservados.');
  console.log('Capturas em .test-results/publications-*.png');
} catch (error) {
  console.error(error);
  console.error(logs);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (child.exitCode === null) {
    const closed = once(child, 'exit');
    child.kill();
    await Promise.race([closed, pause(3000)]);
  }
}
