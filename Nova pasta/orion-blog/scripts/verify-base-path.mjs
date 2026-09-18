import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
for (const prefix of ['/', '/blog/', '/modules/orion/']) {
  const child = spawn(process.execPath, ['scripts/verify-navigation.mjs'], { cwd: root,
    env: { ...process.env, TEST_BLOG_BASE_PATH: prefix }, stdio: 'inherit', windowsHide: true });
  assert.equal((await once(child, 'exit'))[0], 0, `Navegação em ${prefix}`);
}

// Verifica o rewrite do proxy real de desenvolvimento, sem servidor/banco do usuário.
const api = createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ path: req.url })); });
api.listen(0, '127.0.0.1'); await once(api, 'listening');
const portServer = createServer(); portServer.listen(0, '127.0.0.1'); await once(portServer, 'listening');
const port = portServer.address().port; await new Promise(resolve => portServer.close(resolve));
const web = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: path.join(root, 'apps/web'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, VITE_BLOG_BASE_PATH: '/blog/', API_PROXY_TARGET: `http://127.0.0.1:${api.address().port}` },
});
let logs = ''; web.stdout.on('data', value => { logs += value; }); web.stderr.on('data', value => { logs += value; });
try {
  let response;
  for (let i = 0; i < 60; i++) {
    try { response = await fetch(`http://127.0.0.1:${port}/blog/api/v1/versoes?produto=oriontn`); if (response.ok) break; } catch {}
    await pause(200);
  }
  assert(response?.ok, logs);
  assert.equal((await response.json()).path, '/api/v1/versoes?produto=oriontn');
  console.log('OK: proxy preserva /api/v1 e parâmetros, removendo somente o prefixo público.');
} finally {
  if (web.exitCode === null) { const exit = once(web, 'exit'); web.kill(); await Promise.race([exit, pause(3000)]); }
  await new Promise(resolve => api.close(resolve));
}
