import assert from 'node:assert/strict';

// Complementa os testes reais de acompanhamento/sugestões com acesso, cards e editores.
// Todas as rotas usadas aqui são simuladas; nenhuma publicação ou sessão real é alterada.
export async function checkManagementStyle(page, base, shot) {
  const overflow = async () => {
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Gestão sem rolagem horizontal');
    const outside = await page.locator('.management-page button:visible, .management-page input:visible, .management-page select:visible, .management-login input:visible').evaluateAll(elements => elements.filter(element => {
      // Os filtros horizontais têm sua própria rolagem intencional.
      if (element.closest('.filter-tabs-viewport, .system-tabs, .type-tabs')) return false;
      const box = element.getBoundingClientRect();
      return box.x < -1 || box.right > innerWidth + 1;
    }).map(element => element.textContent || element.getAttribute('aria-label')));
    assert.deepEqual(outside, [], 'Controles não escapam da tela');
  };
  const theme = async value => {
    if (await page.locator('html').getAttribute('data-theme') !== value) {
      await page.getByRole('button', { name: value === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro', exact: true }).click();
    }
  };
  const cancel = () => page.locator('.editor-heading').getByRole('button', { name: 'Cancelar', exact: true }).click();
  if (await page.locator('.publication-editor').count()) await cancel();
  for (const width of [320, 390, 768, 1366]) for (const palette of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(base + '/gestao');
    await page.locator('.management-entry').first().waitFor();
    await theme(palette);
    const nav = await page.locator('.management-tabs').boundingBox(), filters = await page.locator('.filters').boundingBox();
    assert(nav.y + nav.height <= filters.y, 'Navegação estável acima dos filtros');
    assert.equal(await page.getByRole('button', { name: 'Publicações', exact: true }).getAttribute('aria-pressed'), 'true');
    assert(await page.locator('.management-tabs button').evaluateAll(elements => elements.every(element => element.getBoundingClientRect().height >= 44)), 'Abas com alvos de toque adequados');
    await overflow();
    await shot(`management-publications-${width}-${palette}`);

    await page.getByRole('button', { name: 'Nova versão', exact: true }).click();
    await page.locator('.version-editor').waitFor();
    assert(await page.getByRole('button', { name: 'Sugestões', exact: true }).isDisabled());
    await page.locator('.version-editor').getByLabel('Sistema', { exact: true }).selectOption('oriontn');
    await page.getByLabel('Código da versão').fill('06.03.04');
    await overflow();
    await shot(`management-version-editor-${width}-${palette}`);
    await page.locator('.version-editor').getByRole('button', { name: 'Cancelar', exact: true }).click();

    await page.getByRole('button', { name: 'Nova publicação', exact: true }).click();
    await page.getByRole('textbox', { name: 'Conteúdo da publicação' }).waitFor();
    const form = page.locator('.publication-editor');
    await form.getByLabel('Título', { exact: true }).fill('Orientações para o seu cartório');
    await form.getByLabel('Subtítulo', { exact: true }).fill('Mais clareza e praticidade na sua rotina.');
    await form.getByRole('textbox', { name: 'Conteúdo da publicação' }).fill('Confira as orientações para a sua equipe.');
    await form.getByLabel('Sistema', { exact: true }).selectOption('oriontn');
    await form.getByLabel('Versão', { exact: true }).selectOption('101');
    await form.getByLabel('Status', { exact: true }).selectOption('agendado');
    await form.getByLabel('Data e hora de publicação', { exact: true }).fill('2090-01-01T09:00');
    assert(await form.getByText(/1600 × 1000 px/).isVisible(), 'Orientação da capa preservada');
    assert(await form.getByRole('button', { name: 'Salvar publicação', exact: true }).isEnabled());
    await overflow();
    await shot(`management-publication-editor-${width}-${palette}`);
    await cancel();

    await page.locator('.management-entry').first().getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByRole('textbox', { name: 'Conteúdo da publicação' }).waitFor();
    assert.equal(await form.getByLabel('Título', { exact: true }).inputValue(), 'Mais agilidade na assinatura de documentos');
    assert((await form.locator('.post-cover img').getAttribute('src')).includes('/admin/imagens/'));
    await overflow();
    const close = page.locator('.editor-heading').getByRole('button', { name: 'Cancelar', exact: true });
    await page.keyboard.press('Tab');
    await close.focus();
    assert.equal(await close.evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
    await page.keyboard.press('Enter');
    await page.locator('.publication-editor').waitFor({ state: 'detached' });
  }

  let authenticated = false, allowLogin = false;
  const sessionRoute = '**/api/v1/admin/session', loginRoute = '**/api/v1/admin/login', logoutRoute = '**/api/v1/admin/logout', accessRoute = '**/api/v1/admin/access';
  await page.route(accessRoute, route => route.fulfill({ json: { mode: 'local', canManage: authenticated, admin: authenticated ? { id: 1, email: 'gestor@example.test' } : null, csrfToken: authenticated ? 'test-token' : null } }));
  await page.route(sessionRoute, route => route.fulfill(authenticated ? { json: { admin: { id: 1, email: 'gestor@example.test' }, csrfToken: 'test-token' } } : { status: 401, json: { message: 'Sessão necessária.' } }));
  await page.route(loginRoute, route => { authenticated = allowLogin; return route.fulfill(allowLogin ? { json: { admin: { email: 'gestor@example.test' } } } : { status: 401, json: { message: 'Credenciais inválidas.' } }); });
  await page.route(logoutRoute, route => { authenticated = false; return route.fulfill({ json: { ok: true } }); });
  try {
    await page.goto(base + '/gestao');
    await page.getByRole('heading', { name: 'Acesso à Gestão' }).waitFor();
    for (const width of [320, 390, 768, 1366]) for (const palette of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await theme(palette);
      await overflow();
      assert.equal(await page.getByRole('link', { name: /Voltar ao blog/ }).getAttribute('href'), '/inicio');
      await shot(`management-login-${width}-${palette}`);
    }
    await page.getByLabel('E-mail', { exact: true }).fill('gestor@example.test');
    await page.getByLabel('Senha', { exact: true }).fill('SenhaSomenteDoMock');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').textContent(), /Credenciais inválidas/);
    allowLogin = true;
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.locator('.management-entry').first().waitFor();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await page.getByRole('heading', { name: 'Acesso à Gestão' }).waitFor();
  } finally {
    await page.unroute(sessionRoute); await page.unroute(loginRoute); await page.unroute(logoutRoute); await page.unroute(accessRoute);
  }
  console.log('OK: Gestão, acesso/saída, abas, cards, edição/cadastro, agendamento, capa, teclado; 320/390/768/1366 px nos dois temas.');
}
