import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, randomBytes } from 'node:crypto';
import { chromium } from 'playwright';

// Requer as imagens :export-check. Não utiliza .env, dados reais ou PostgreSQL.
const run = promisify(execFile), pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const suffix = randomUUID().slice(0, 8), network = `orion-export-${suffix}`;
const api = `${network}-api`, web = `${network}-web`;
const created = [];
const docker = async (...args) => (await run('docker', args, { windowsHide: true, maxBuffer: 1024 * 1024 })).stdout.trim();
let browser, hasNetwork = false;
try {
  await run('docker', ['compose', '--env-file', 'deploy/.env.example', '-f', 'deploy/compose.production.yml', 'config', '--quiet'], {
    windowsHide: true, env: { ...process.env, DATABASE_URL: 'postgres://fixture:fixture@db.invalid/blog',
      MIGRATION_DATABASE_URL: 'postgres://fixture:fixture@db.invalid/blog', COOKIE_SECRET: randomBytes(48).toString('hex') },
  });
  await docker('network', 'create', network); hasNetwork = true;
  await docker('run', '-d', '--name', api, '--network', network, '--network-alias', 'api',
    '--read-only', '--tmpfs', '/tmp', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '-e', 'NODE_ENV=production', '-e', 'ADMIN_AUTH_MODE=host', '-e', 'BLOG_BASE_PATH=/blog/',
    '-e', 'APP_ORIGIN=https://sistema.example.test', '-e', `COOKIE_SECRET=${randomBytes(48).toString('hex')}`,
    '-e', 'DATABASE_URL=postgres://unavailable:unavailable@127.0.0.1:1/unavailable', 'orion-blog-api:export-check');
  created.push(api);
  await docker('run', '-d', '--name', web, '--network', network, '--read-only', '--tmpfs', '/tmp',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '-p', '127.0.0.1::8080', 'orion-blog-web:export-check');
  created.push(web);
  const binding = await docker('port', web, '8080/tcp');
  assert.match(binding, /^127\.0\.0\.1:\d+$/);
  const origin = 'http://' + binding;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(origin + '/healthz')).ok && (await fetch(origin + '/blog/api/v1/admin/access')).ok) { ready = true; break; }
    } catch {}
    await pause(200);
  }
  assert(ready, await docker('logs', web));
  for (const pathname of ['/blog/', '/blog/inicio', '/blog/gestao', '/blog/posts/1/exemplo', '/blog/oriontn/novidades']) {
    const response = await fetch(origin + pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), /id="root"/);
    assert.match(response.headers.get('cache-control'), /no-cache/);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  }
  const redirect = await fetch(origin + '/blog?teste=1', { redirect: 'manual' });
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get('location'), '/blog/?teste=1');
  for (const pathname of ['/blog/assets/ausente.js', '/fora-do-blog']) assert.equal((await fetch(origin + pathname)).status, 404);
  const theme = await fetch(origin + '/blog/theme.js'); assert.equal(theme.status, 200); assert.match(await theme.text(), /savedTheme/);
  assert.equal((await fetch(origin + '/blog/api/v1/admin/access')).status, 200);
  assert.equal((await (await fetch(origin + '/blog/api/v1/admin/access')).json()).canManage, false);
  assert.equal((await fetch(origin + '/blog/api/v1/admin/publicacoes')).status, 401);
  await docker('exec', web, 'nginx', '-t');
  assert.notEqual(await docker('exec', api, 'id', '-u'), '0');
  assert.notEqual(await docker('exec', web, 'id', '-u'), '0');
  await docker('exec', api, 'node', '--input-type=module', '-e',
    "import sharp from 'sharp'; import fs from 'node:fs'; if(!fs.existsSync('/app/database/migrations/007_host_admin_identity.sql')) throw Error('Migração ausente'); await sharp({create:{width:1,height:1,channels:3,background:'white'}}).webp().toBuffer();");
  // Cookies reais da API, sem consultar banco: sessão local com pool.query simulado só neste processo de teste.
  await docker('exec', '-e', 'ADMIN_AUTH_MODE=local', '-e', 'ADMIN_EMAIL=test@example.test', '-e', 'ADMIN_PASSWORD_HASH=scrypt$test-only',
    api, 'node', '--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { pool } from './apps/api/dist/db/index.js';
      import { createAdminSession } from './apps/api/dist/auth/session.js';
      import { visitorHash } from './apps/api/dist/visitor.js';
      const cookies=[]; const reply={setCookie:(name,value,options)=>cookies.push({name,options})};
      pool.query=async()=>({rows:[]});
      await createAdminSession(1,'test@example.test',reply);
      visitorHash({cookies:{}},reply);
      assert.equal(cookies[0].options.path,'/blog/api/v1/admin');
      assert.equal(cookies[0].options.httpOnly,true); assert.equal(cookies[0].options.secure,true);
      assert.equal(cookies[2].options.path,'/blog/'); assert.equal(cookies[2].options.secure,true);
      await pool.end();
    `);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL === 'chromium' ? undefined : process.env.TEST_BROWSER_CHANNEL ?? 'msedge', headless: true });
  for (const width of [390, 1366]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(event.violatedDirective));
    });
    await page.goto(origin + '/blog/gestao');
    await page.getByRole('heading', { name: 'Acesso restrito' }).waitFor();
    await page.getByRole('link', { name: 'Voltar ao blog' }).click();
    await page.getByRole('heading', { name: 'Últimas novidades', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/blog/inicio');
    await page.waitForFunction(() => document.querySelector('.brand-title img')?.naturalWidth > 0);
    assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);
    assert.deepEqual(errors, []);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.close();
  }
  console.log('OK: imagens de produção sem root/read-only, proxy real, fallback SPA, CSP, assets, dependência Sharp, migrações, cookies prefixados, Gestão bloqueada e navegador desktop/mobile. Banco real não acessado.');
} finally {
  await browser?.close();
  // Apenas os containers descartáveis criados por este teste; não remove volumes ou imagens.
  for (const name of created.reverse()) await docker('rm', '-f', name);
  if (hasNetwork) await docker('network', 'rm', network);
}
