import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

// Prefere WebSocket nativo do Node 22; ws é uma dependência direta para Node 20.
const WebSocketClient = globalThis.WebSocket ?? (await import("ws")).WebSocket;
const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = path.join(root, "node_modules", ".cache", "browser-regressions");
const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
const widths = [320, 390, 1440];
const maintenanceTitle = "Manutenção simulada do Orion Blog";
const results = [];
const pending = new Map();
let baseUrl;
let apiOrigin;
let storageKey;
let preview;
let chrome;
let socket;
let serial = 0;
let injectionId;
let mode = "anonymous";
let notificationMode = "empty";
let activeCase;
let protocolFailure;
let closing = false;

const user = {
  id: "00000000-0000-4000-8000-000000000099",
  aud: "authenticated",
  role: "authenticated",
  email: "qa@example.invalid",
  email_confirmed_at: "2026-09-28T12:00:00Z",
  created_at: "2026-09-28T12:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Pessoa de teste" },
};
const expiresAt = Math.floor(Date.now() / 1000) + 86400;
const fakeJwt = [
  { alg: "HS256", typ: "JWT" },
  { sub: user.id, exp: expiresAt, role: "authenticated", aud: "authenticated" },
].map((value) => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".") + ".qa";
const fakeSession = {
  access_token: fakeJwt, refresh_token: "qa-not-real", token_type: "bearer",
  expires_in: 86400, expires_at: expiresAt, user,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll(read, description, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (protocolFailure) throw protocolFailure;
    if (activeCase?.runtimeErrors.length) {
      throw new Error(`Exceção JavaScript: ${activeCase.runtimeErrors[0]}`);
    }
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw new Error(`Tempo esgotado: ${description}${lastError ? ` (${lastError.message})` : ""}`);
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function configuredApiUrl() {
  if (process.env.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
  let value;
  const envMode = process.env.QA_BASE_URL ? "development" : "production";
  for (const filename of [".env", ".env.local", `.env.${envMode}`, `.env.${envMode}.local`]) {
    const filenamePath = path.join(root, filename);
    if (!existsSync(filenamePath)) continue;
    // Extrai somente a URL. Nenhuma chave ou credencial é interpretada ou registrada.
    const lines = createInterface({ input: createReadStream(filenamePath), crlfDelay: Infinity });
    for await (const line of lines) {
      const match = line.match(/^\s*(?:export\s+)?VITE_SUPABASE_URL\s*=\s*(.+?)\s*$/);
      if (!match) continue;
      value = match[1].replace(/^['"]|['"]$/g, "").replace(/\s+#.*$/, "").trim();
    }
  }
  assert(value, "Defina VITE_SUPABASE_URL ou sua URL no .env; nenhuma chave é necessária.");
  return value;
}

function chromeExecutable() {
  const candidates = process.env.CHROME_PATH ? [process.env.CHROME_PATH] : [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ...(process.env.PATH ?? "").split(path.delimiter).flatMap((directory) =>
      ["google-chrome", "chromium", "chrome.exe"].map((name) => path.join(directory, name))),
  ];
  const executable = candidates.find((candidate) => candidate && existsSync(candidate));
  assert(executable, "Chrome/Chromium não encontrado. Defina CHROME_PATH com o executável.");
  return executable;
}

function startChild(executable, args) {
  const child = spawn(executable, args, {
    cwd: root, windowsHide: true, stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.on("data", () => {});
  child.on("error", (error) => { protocolFailure = error; });
  return child;
}

function command(method, params = {}) {
  if (!socket || socket.readyState !== WebSocketClient.OPEN) return Promise.reject(new Error("Conexão CDP indisponível."));
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Tempo esgotado no CDP: ${method}`));
    }, 30000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

function mockApi(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const accept = Object.entries(request.headers).find(([name]) => name.toLowerCase() === "accept")?.[1] ?? "";
  const single = accept.includes("vnd.pgrst.object");
  if (request.method === "OPTIONS") return { status: 204, data: null };
  if (endpoint.endsWith("/auth/v1/user")) return { status: 200, data: user };
  if (endpoint.endsWith("/auth/v1/token")) {
    return { status: 400, data: { error: "invalid_grant", error_description: "Invalid login credentials" } };
  }
  if (endpoint.endsWith("/auth/v1/logout")) return { status: 204, data: null };
  if (endpoint.endsWith("/profiles")) {
    if (mode === "profile-error") {
      return { status: 503, data: { code: "QA_PROFILE_UNAVAILABLE", message: "Perfil temporariamente indisponível" } };
    }
    const profile = { ...user, role: "admin", team: null, full_name: "Pessoa de teste", avatar_url: null };
    return { status: 200, data: single ? profile : [profile] };
  }
  if (endpoint.endsWith("/app_roles")) {
    const role = { id: "qa-role", name: "admin", app_role_permissions: [] };
    return { status: 200, data: single ? role : [role] };
  }
  if (endpoint.endsWith("/rpc/has_permission")) return { status: 200, data: true };
  if (endpoint.endsWith("/rpc/orion_updates_get_settings")) {
    return { status: 200, data: [{ public_enabled: false, maintenance_title: maintenanceTitle,
      maintenance_message: "Mensagem de manutenção simulada para a regressão de hooks.", updated_at: new Date().toISOString() }] };
  }
  if (endpoint.endsWith("/notifications") && request.method === "GET" && notificationMode === "long") {
    return { status: 200, data: Array.from({ length: 12 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      user_id: null, team: null, project_id: null, type: "release_fix", category: "changelog",
      title: `Novidade ${index + 1}: ${"TítuloSemEspaços".repeat(14)}`,
      message: `Mensagem longa ${index + 1}. ${"Informações do sistema para o cartório. ".repeat(10)}${"ConteúdoSemEspaços".repeat(12)}`,
      action_url: "/", read: false, read_at: null, created_at: new Date().toISOString(),
      permission_resource: "projects", projects: null,
    })) };
  }
  if (endpoint.includes("/functions/v1/")) return { status: 404, data: { error: "Registro de teste inexistente" } };
  return { status: 200, data: single ? null : [] };
}

async function intercept(params) {
  const { request, requestId } = params;
  const url = new URL(request.url);
  if (url.origin === baseUrl.origin && ["GET", "HEAD"].includes(request.method)) {
    await command("Fetch.continueRequest", { requestId });
    return;
  }
  if (["data:", "blob:"].includes(url.protocol)) {
    await command("Fetch.continueRequest", { requestId });
    return;
  }
  // Todo acesso a APIs, inclusive PATCH/POST/DELETE, recebe resposta local fictícia.
  const response = url.origin === apiOrigin ? mockApi(request) : { status: 403, data: { error: "Rede externa bloqueada pelo teste" } };
  activeCase?.requests.push({ path: url.pathname, method: request.method, status: response.status, mocked: true });
  if (url.pathname.endsWith("/rpc/orion_updates_get_settings")) await sleep(200);
  await command("Fetch.fulfillRequest", {
    requestId, responseCode: response.status,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: baseUrl.origin },
      { name: "Access-Control-Allow-Headers", value: "*" },
      { name: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS, POST, PATCH, DELETE" },
      { name: "Access-Control-Expose-Headers", value: "content-range" },
      { name: "content-range", value: "*/0" },
    ],
    body: response.data === null ? "" : Buffer.from(JSON.stringify(response.data)).toString("base64"),
  });
}

function receive(message) {
  if (message.id) {
    const call = pending.get(message.id);
    if (call) {
      clearTimeout(call.timeout);
      pending.delete(message.id);
      if (message.error) call.reject(new Error(message.error.message));
      else call.resolve(message.result);
    }
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    activeCase?.runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    activeCase?.consoleErrors.push(message.params.args.map((value) => value.value ?? value.description ?? "").join(" ").slice(0, 1600));
  }
  if (message.method === "Fetch.requestPaused") {
    void intercept(message.params).catch((error) => { if (!closing) protocolFailure = error; });
  }
}

async function setMode(nextMode, nextNotifications = "empty") {
  mode = nextMode;
  notificationMode = nextNotifications;
  if (injectionId) await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: injectionId });
  const source = `
    localStorage.clear();
    localStorage.setItem('vite-ui-theme', 'dark');
    sessionStorage.setItem('siplan-pwa-install-later', 'true');
    ${mode === "anonymous" ? "" : `localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(fakeSession))});`}
    window.__qaDocumentId = crypto.randomUUID();
    window.__qaErrors = [];
    window.addEventListener('error', event => window.__qaErrors.push(event.message));
    window.addEventListener('unhandledrejection', event => window.__qaErrors.push(String(event.reason)));
  `;
  injectionId = (await command("Page.addScriptToEvaluateOnNewDocument", { source })).identifier;
}

async function visit(route, width) {
  await command("Emulation.setDeviceMetricsOverride", {
    width, height: width < 600 ? 740 : 900, deviceScaleFactor: 1, mobile: false,
  });
  const previousDocument = await evaluate("window.__qaDocumentId ?? null");
  await command("Page.navigate", { url: new URL(route, baseUrl).href });
  await poll(() => evaluate(`document.readyState === 'complete' && Boolean(window.__qaDocumentId) && window.__qaDocumentId !== ${JSON.stringify(previousDocument)}`), "carregar um novo documento");
}

async function reloadPage() {
  const previousDocument = await evaluate("window.__qaDocumentId ?? null");
  // Hard reload também ignora o service worker; o cache HTTP é desligado separadamente.
  await command("Page.reload");
  await poll(() => evaluate(`document.readyState === 'complete' && Boolean(window.__qaDocumentId) && window.__qaDocumentId !== ${JSON.stringify(previousDocument)}`), "concluir o recarregamento de um novo documento");
}

async function visible(selector) {
  return evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false;
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })()`);
}

async function click(selector) {
  const point = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null;
    const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  assert(point, `Ação ausente: ${selector}`);
  await command("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
}

async function snapshot(selector = "#root") {
  return evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    if (!root) return null;
    const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const visible = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const controls = [...root.querySelectorAll('button, [role="menuitem"]')].filter(visible).map(e => ({
      name: (e.getAttribute('aria-label') || e.innerText || '').slice(0, 90), ...rect(e),
    }));
    const overflow = [...root.querySelectorAll('*')].filter(visible).map(e => ({ tag: e.tagName,
      text: (e.innerText || '').slice(0, 70), ...rect(e),
    })).filter(r => r.x < -1 || r.right > innerWidth + 1).slice(0, 12);
    const scrollArea = root.querySelector('[aria-busy]');
    return { viewport: { width: innerWidth, height: innerHeight }, bounds: rect(root),
      scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      controls, overflow, text: root.innerText.slice(0, 2200),
      scrollArea: scrollArea && { ...rect(scrollArea), contentHeight: scrollArea.scrollHeight, scrollTop: scrollArea.scrollTop },
    };
  })()`);
}

function assertFits(state, label) {
  assert(state, `${label}: elemento ausente.`);
  assert(state.scrollWidth <= state.viewport.width + 1, `${label}: documento excede a largura (${state.scrollWidth}px).`);
  assert(state.bodyWidth <= state.viewport.width + 1, `${label}: body excede a largura.`);
  assert.deepEqual(state.overflow, [], `${label}: conteúdo fora da viewport.`);
}

async function screenshot(name) {
  const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(artifacts, `${name}.png`), Buffer.from(shot.data, "base64"));
}

async function assertRuntimeClean({ allowProfileError = false } = {}) {
  assert.deepEqual(activeCase.runtimeErrors, [], "O navegador apresentou exceções JavaScript.");
  assert.deepEqual(await evaluate("window.__qaErrors ?? []"), [], "A página apresentou erros não tratados.");
  const errors = activeCase.consoleErrors.filter((message) =>
    !(allowProfileError && message.startsWith("Erro ao carregar o acesso do usuário:")));
  assert.deepEqual(errors, [], "O navegador registrou erros inesperados no console.");
}

async function runCase(name, test, options = {}) {
  activeCase = { name, runtimeErrors: [], consoleErrors: [], requests: [], status: "running" };
  const started = Date.now();
  try {
    await test();
    await assertRuntimeClean(options);
    await screenshot(name);
    activeCase.status = "passed";
    console.log(`OK ${name}`);
  } catch (error) {
    activeCase.status = "failed";
    activeCase.error = error.message;
    await screenshot(`${name}-falha`).catch(() => {});
    console.error(`FALHA ${name}: ${error.message}`);
    if (protocolFailure || activeCase.runtimeErrors.length) throw error;
  } finally {
    activeCase.durationMs = Date.now() - started;
    results.push(activeCase);
    activeCase = null;
  }
}

async function checkLogin(width) {
  await setMode("anonymous");
  await visit("/login", width);
  await poll(() => visible('input[type="email"]'), "exibir o login");
  assert(await visible('input[type="password"]'), "Campo de senha ausente.");
  const state = await snapshot("form");
  assertFits(state, "Login");
  activeCase.layout = state;
}

async function checkProfileRetry(width) {
  await setMode("profile-error");
  await visit("/", width);
  await poll(() => evaluate("document.body.innerText.includes('Não foi possível carregar seu acesso')"), "exibir AuthLoadError");
  const state = await snapshot('[role="alert"]');
  assertFits(state, "AuthLoadError");
  const retry = state.controls.find((button) => button.name.includes("Tentar novamente"));
  assert(retry && retry.height >= 43.5 && retry.width >= 43.5, "Retry sem área de toque de 44px.");
  assert(state.bounds.y >= -1 && state.bounds.bottom <= state.viewport.height + 1, "AuthLoadError excede a altura da viewport.");
  assert(activeCase.requests.some((request) => request.path.endsWith("/profiles") && request.status === 503), "A falha de perfil 503 não foi exercitada.");
  activeCase.errorLayout = state;
  await screenshot(`auth-error-${width}`);

  // Troca somente o mock: o botão precisa recuperar a sessão existente sem recarregar a página.
  mode = "admin";
  await click('[role="alert"] button');
  await poll(() => visible('button[aria-label="Abrir notificações"]'), "recuperar acesso pelo retry");
  assert(!(await visible('[role="alert"]')), "AuthLoadError permaneceu após o retry.");
  assert(activeCase.requests.some((request) => request.path.endsWith("/profiles") && request.status === 200), "Retry não consultou novamente o perfil.");
}

async function checkNotifications(width, kind) {
  await setMode("admin", kind);
  await visit("/", width);
  await poll(() => visible('button[aria-label="Abrir notificações"]'), "exibir o botão de notificações");
  await click('button[aria-label="Abrir notificações"]');
  await poll(() => evaluate("Boolean(document.querySelector('[role=menu] [aria-busy=false]'))"), "carregar as notificações");
  await sleep(300); // Aguarda a animação Radix antes de medir áreas de toque.
  let state = await snapshot('[role="menu"]');
  assertFits(state, "Menu de notificações");
  assert(state.bounds.x >= -1 && state.bounds.right <= state.viewport.width + 1, "Menu fora da largura da viewport.");
  assert(state.bounds.y >= -1 && state.bounds.bottom <= state.viewport.height + 1, "Menu fora da altura da viewport.");
  assert(state.bounds.height <= 601, "Menu excede a altura máxima de 600px.");
  for (const control of state.controls) {
    assert(control.height >= 43.5 && control.width >= 43.5, `Ação sem área de toque de 44px: ${control.name}`);
  }
  assert(state.controls.length >= 3, "Os três filtros de notificação não estão disponíveis.");
  activeCase.layout = state;
  if (kind === "empty") {
    assert(state.text.includes("Nenhuma notificação."), "O estado vazio não foi exibido.");
  } else {
    assert(state.text.includes("TítuloSemEspaços"), "As notificações longas não foram exibidas.");
    assert(state.scrollArea.contentHeight > state.scrollArea.height, "Conteúdo longo sem rolagem vertical interna.");
    await evaluate("(() => { const e = document.querySelector('[role=menu] [aria-busy]'); e.scrollTop = e.scrollHeight; })()");
    state = await snapshot('[role="menu"]');
    assertFits(state, "Última notificação");
    assert(state.scrollArea.scrollTop > 0, "A lista não permite alcançar as últimas notificações.");
    activeCase.listEndLayout = state;
    // Uma mensagem pode ser maior que a área: sua ação fica no início do item.
    // Confirma que é possível alcançá-la pela mesma rolagem interna da lista.
    await evaluate(`(() => {
      const actions = document.querySelectorAll('[role=menu] button[aria-label^="Limpar notificação:"]');
      actions[actions.length - 1]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    })()`);
    state = await snapshot('[role="menu"]');
    assertFits(state, "Ação da última notificação");
    const lastAction = state.controls.filter((control) => control.name.startsWith("Limpar notificação:")).at(-1);
    assert(lastAction && lastAction.y >= state.scrollArea.y - 1 && lastAction.bottom <= state.bounds.bottom + 1,
      "A ação da última notificação não está acessível após rolar.");
    activeCase.scrolledLayout = state;
  }
}

async function checkMaintenance(width) {
  await setMode("admin");
  await visit("/atualizacoes/posts/123", width);
  await poll(() => evaluate(`document.body.innerText.includes(${JSON.stringify(maintenanceTitle)})`), "exibir manutenção do Orion Blog");
  assert(activeCase.requests.some((request) => request.path.endsWith("/rpc/orion_updates_get_settings")), "Configurações de manutenção não foram consultadas.");
  assert(!activeCase.requests.some((request) => request.path.endsWith("/rpc/orion_updates_post_detail")), "A publicação foi buscada durante a manutenção.");
  await sleep(250);
  activeCase.layout = await snapshot(".maintenance-page");
  assertFits(activeCase.layout, "Manutenção do Orion Blog");
}

async function checkOffline() {
  await setMode("anonymous");
  await visit("/login", 390);
  await poll(() => visible('input[type="email"]'), "exibir login antes de ficar offline");
  await poll(() => evaluate("navigator.serviceWorker.getRegistrations().then(items => items.some(item => item.active?.state === 'activated'))"), "ativar o service worker do build", 60000);
  activeCase.serviceWorkers = await evaluate("navigator.serviceWorker.getRegistrations().then(items => items.map(item => ({ scope: item.scope, state: item.active?.state })))");
  await reloadPage();
  await poll(() => evaluate("Boolean(navigator.serviceWorker.controller)"), "controlar a página pelo service worker");
  await poll(() => visible('input[type="email"]'), "reabrir login com service worker");
  await command("Network.setCacheDisabled", { cacheDisabled: true });
  await command("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await reloadPage();
    await poll(() => visible('input[type="email"]'), "reabrir login offline pelo precache");
    assert(await evaluate("navigator.onLine === false"), "O navegador não entrou em modo offline.");
    assert(await evaluate("Boolean(navigator.serviceWorker.controller)"), "Login offline sem controle do service worker.");
    activeCase.layout = await snapshot("form");
    assertFits(activeCase.layout, "Login offline");
  } finally {
    await command("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await command("Network.setCacheDisabled", { cacheDisabled: false });
  }
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(5000)]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

async function cleanup() {
  closing = true;
  if (socket?.readyState === WebSocketClient.OPEN) await command("Browser.close").catch(() => {});
  socket?.close();
  for (const call of pending.values()) {
    clearTimeout(call.timeout);
    call.reject(new Error("CDP encerrado pelo teste."));
  }
  pending.clear();
  // Encerra exclusivamente os processos criados por este script.
  await stopChild(chrome);
  await stopChild(preview);
}

process.once("SIGINT", () => { void cleanup().finally(() => { process.exitCode = 130; }); });
process.once("SIGTERM", () => { void cleanup().finally(() => { process.exitCode = 143; }); });

try {
  await mkdir(artifacts, { recursive: true });
  assert(typeof WebSocketClient === "function", "WebSocket indisponível no Node. Verifique as dependências de desenvolvimento.");
  const apiUrl = new URL(await configuredApiUrl());
  apiOrigin = apiUrl.origin;
  storageKey = `sb-${apiUrl.hostname.split(".")[0]}-auth-token`;
  if (process.env.QA_BASE_URL) {
    baseUrl = new URL(process.env.QA_BASE_URL);
    assert(["127.0.0.1", "localhost", "[::1]"].includes(baseUrl.hostname), "QA_BASE_URL precisa apontar para um servidor local.");
  } else {
    assert(existsSync(path.join(root, "dist/index.html")), "Build ausente. Execute npm run build antes do teste.");
    assert(existsSync(path.join(root, "dist/sw.js")), "Service worker ausente no dist; o teste offline exige o build PWA.");
    const port = await unusedPort();
    baseUrl = new URL(`http://127.0.0.1:${port}`);
    preview = startChild(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"]);
  }
  await poll(async () => (await fetch(baseUrl, { signal: AbortSignal.timeout(1500) })).ok, "iniciar o preview");
  const debugPort = await unusedPort();
  chrome = startChild(chromeExecutable(), [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-sync", "--disable-component-update", "--disable-extensions",
    ...(process.platform === "linux" ? ["--no-sandbox"] : []),
    "--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(artifacts, `chrome-${runId}`)}`, "--window-size=1440,900", "about:blank",
  ]);
  const debugUrl = `http://127.0.0.1:${debugPort}`;
  await poll(async () => (await fetch(`${debugUrl}/json/version`, { signal: AbortSignal.timeout(1500) })).ok, "iniciar Chrome");
  const target = await (await fetch(`${debugUrl}/json/new?about:blank`, { method: "PUT" })).json();
  socket = new WebSocketClient(target.webSocketDebuggerUrl);
  socket.addEventListener("message", (event) => {
    try { receive(JSON.parse(String(event.data))); }
    catch (error) { if (!closing) protocolFailure = error; }
  });
  socket.addEventListener("close", () => {
    if (!closing) protocolFailure = new Error("Chrome encerrou a conexão CDP antes de concluir os testes.");
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("Falha ao conectar ao Chrome pelo CDP.")), { once: true });
  });
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Network.enable");
  await command("Network.setBlockedURLs", { urls: ["ws://*", "wss://*"] });
  await command("Fetch.enable", { patterns: [{ urlPattern: "*" }] });

  for (const width of widths) await runCase(`login-${width}`, () => checkLogin(width));
  for (const width of widths) await runCase(`auth-retry-${width}`, () => checkProfileRetry(width), { allowProfileError: true });
  for (const kind of ["empty", "long"]) {
    for (const width of widths) await runCase(`notifications-${kind}-${width}`, () => checkNotifications(width, kind));
  }
  for (const width of widths) await runCase(`orion-maintenance-${width}`, () => checkMaintenance(width));
  await runCase("login-pwa-offline-390", checkOffline);
  const failures = results.filter((result) => result.status === "failed");
  assert.equal(failures.length, 0, `${failures.length} regressão(ões) no navegador.`);
  console.log(`${results.length} cenários passaram. Artefatos: ${artifacts}`);
} catch (error) {
  results.push({ name: "execucao", status: "failed", error: error.message });
  console.error(`Verificação interrompida: ${error.message}`);
  process.exitCode = 1;
} finally {
  await cleanup();
  await writeFile(path.join(artifacts, "results.json"), JSON.stringify({ runId, results }, null, 2)).catch((error) => {
    console.error(`Não foi possível salvar o relatório: ${error.message}`);
    process.exitCode = 1;
  });
}
