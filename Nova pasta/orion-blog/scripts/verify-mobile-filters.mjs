import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const portServer = createServer();
portServer.listen(0, '127.0.0.1');
await once(portServer, 'listening');
const port = portServer.address().port;
await new Promise(resolve => portServer.close(resolve));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: path.join(root, 'apps/web'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, logs = '';
child.stdout.on('data', data => { logs = (logs + data).slice(-5000); });
child.stderr.on('data', data => { logs = (logs + data).slice(-5000); });
const versions = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, codigo: `06.03.0${index}`, sistema: 'oriontn', sistema_nome: 'OrionTN', total_posts: 1, nao_lidos: 0 }));

try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* inicialização */ }
    await pause(250);
  }
  assert(ready, logs);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL === 'chromium' ? undefined : process.env.TEST_BROWSER_CHANNEL ?? 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await context.route('**/api/v1/**', route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint.endsWith('/admin/session')) return route.fulfill({ json: { admin: { id: 1, email: 'gestor@example.test' }, csrfToken: 'test-token' } });
    if (endpoint.endsWith('/admin/access')) return route.fulfill({ json: { mode: 'local', canManage: true, admin: { id: 1, email: 'gestor@example.test' }, csrfToken: 'test-token' } });
    if (endpoint.endsWith('/versoes')) return route.fulfill({ json: { data: versions, meta: { nao_lidas: 0 } } });
    return route.fulfill({ json: { data: [], meta: { total: 0, nao_lidas: 0 } } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  async function swipe(x, y, dx, dy = 0) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 12; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 12, y: y + dy * step / 12, id: 1 }] });
      await pause(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pause(250);
  }
  await page.goto(base + '/oriontn/novidades');
  const row = page.locator('.system-tabs');
  await row.waitFor();
  if (process.argv.includes('--baseline')) {
    await row.scrollIntoViewIfNeeded();
    const box = await row.boundingBox();
    await swipe(box.x + 25, box.y + box.height - 2, 120);
    const barDrag = await row.evaluate(element => element.scrollLeft);
    await swipe(box.x + box.width - 25, box.y + box.height / 2, -180);
    const contentDrag = await row.evaluate(element => element.scrollLeft);
    console.log(JSON.stringify({ nativeScrollbarTouchDrag: barDrag, contentTouchSwipe: contentDrag }));
  } else {
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sem rolagem horizontal na página');
    async function checkFilter(selector, label, otherSelector) {
      const group = page.locator(selector);
      const control = page.getByRole('slider', { name: label, exact: true });
      await control.waitFor();
      await control.focus();
      await page.keyboard.press('Home');
      await page.waitForFunction(selector => document.querySelector(selector).scrollLeft === 0, selector);
      const beforeUrl = page.url();
      const selected = await group.locator('[aria-pressed="true"]').innerText();
      const otherScroll = await page.locator(otherSelector).evaluate(element => element.scrollLeft);
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      assert(box.height >= 44, 'Área de toque da barra tem pelo menos 44px');
      const thumb = await control.evaluate(element => parseFloat(getComputedStyle(element).getPropertyValue('--filter-thumb-width')));
      await swipe(box.x + thumb / 2, box.y + box.height / 2, Math.min(100, box.width - thumb - 4));
      await page.waitForFunction(selector => document.querySelector(selector).scrollLeft > 10, selector);
      const forward = await group.evaluate(element => element.scrollLeft);
      assert(Math.abs(Number(await control.inputValue()) - forward) <= 1, 'Barra e lista sincronizadas');
      assert.equal(page.url(), beforeUrl, 'Arrastar a barra não seleciona filtros');
      assert.equal(await group.locator('[aria-pressed="true"]').innerText(), selected);
      assert.equal(await page.locator(otherSelector).evaluate(element => element.scrollLeft), otherScroll, 'As barras são independentes');
      const max = Number(await control.getAttribute('max'));
      const travel = forward / max * (box.width - thumb);
      await swipe(box.x + thumb / 2 + travel, box.y + box.height / 2, -travel);
      await page.waitForFunction(selector => document.querySelector(selector).scrollLeft < 3, selector);
      await group.scrollIntoViewIfNeeded();
      const contentBox = await group.boundingBox();
      await swipe(contentBox.x + contentBox.width - 20, contentBox.y + contentBox.height / 2, -150);
      await page.waitForFunction(selector => document.querySelector(selector).scrollLeft > 10, selector);
      assert.equal(page.url(), beforeUrl, 'Deslizar sobre os botões não dispara seleção');
      assert.equal(await group.locator('[aria-pressed="true"]').innerText(), selected);
      await page.waitForFunction(({ selector, label }) => {
        const control = document.querySelector(`input[aria-label="${label}"]`);
        return Math.abs(Number(control.value) - document.querySelector(selector).scrollLeft) <= 1;
      }, { selector, label });
      await control.focus();
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowRight');
      assert(Number(await control.inputValue()) > 0, 'Barra acessível por teclado');
      await page.keyboard.press('End');
      assert.equal(await control.inputValue(), await control.getAttribute('max'));
      await page.keyboard.press('Home');
      await noOverflow();
    }
    for (const route of ['/oriontn/novidades', '/gestao']) {
      for (const [width, theme] of [[390, 'light'], [320, 'dark']]) {
        await page.setViewportSize({ width, height: 700 });
        await page.goto(base + route);
        await page.getByRole('slider', { name: 'Rolar filtros de sistema', exact: true }).waitFor();
        const currentTheme = await page.locator('html').getAttribute('data-theme');
        if (currentTheme !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
        await checkFilter('.system-tabs', 'Rolar filtros de sistema', '.type-tabs');
        await checkFilter('.type-tabs', 'Rolar filtros de tipo', '.system-tabs');
        // A rolagem vertical continua disponível ao gesticular sobre os filtros.
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => scrollY === 0);
        // O compositor precisa apresentar a nova posição antes do gesto por CDP.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const systemBox = await row.boundingBox();
        await swipe(systemBox.x + systemBox.width / 2, systemBox.y + systemBox.height / 2, 0, -90);
        const verticalScroll = await page.evaluate(() => ({ top: scrollY, max: document.documentElement.scrollHeight - innerHeight }));
        assert(verticalScroll.top > 20, `Gesto vertical sobre filtros continua rolando a página: ${JSON.stringify({ route, width, theme, systemBox, verticalScroll })}`);
        await page.getByRole('slider', { name: 'Rolar filtros de sistema', exact: true }).focus();
        await page.keyboard.press('End');
        await page.getByRole('button', { name: 'OrionREG', exact: true }).tap();
        assert.equal(await page.getByRole('button', { name: 'OrionREG', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.getByRole('slider', { name: 'Rolar filtros de tipo', exact: true }).focus();
        await page.keyboard.press('End');
        await page.getByRole('button', { name: 'Avisos', exact: true }).tap();
        assert.equal(await page.getByRole('button', { name: 'Avisos', exact: true }).getAttribute('aria-pressed'), 'true');
        assert.equal(new URL(page.url()).pathname, route === '/gestao' ? '/gestao' : '/orionreg/avisos');
        const artifacts = path.join(root, '.test-results');
        await mkdir(artifacts, { recursive: true });
        await page.screenshot({ path: path.join(artifacts, `filters-${route === '/gestao' ? 'management' : 'reader'}-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        // Recalcula o controle ao girar o dispositivo: sem barra quando tudo cabe.
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.waitForFunction(() => document.querySelectorAll('.filter-scroll-control').length === 0);
        await noOverflow();
        await page.setViewportSize({ width, height: 700 });
        await page.getByRole('slider', { name: 'Rolar filtros de sistema', exact: true }).waitFor();
        await noOverflow();
      }
    }
    // Também atende ao mouse no modo responsivo do navegador.
    const control = page.getByRole('slider', { name: 'Rolar filtros de sistema', exact: true });
    await control.focus();
    await page.keyboard.press('Home');
    await control.scrollIntoViewIfNeeded();
    const controlBox = await control.boundingBox();
    const thumb = await control.evaluate(element => parseFloat(getComputedStyle(element).getPropertyValue('--filter-thumb-width')));
    await page.mouse.move(controlBox.x + thumb / 2, controlBox.y + controlBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(controlBox.x + thumb / 2 + 90, controlBox.y + controlBox.height / 2, { steps: 10 });
    await page.mouse.up();
    assert(await row.evaluate(element => element.scrollLeft > 10));
    console.log('OK: arraste por toque e mouse, swipe na lista, teclado, rolagem vertical, seleção e rotas; leitura/Gestão, dois temas, 320/390px e redimensionamento.');
  }
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error);
  console.error(logs);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await Promise.race([closed, pause(3000)]); }
}
