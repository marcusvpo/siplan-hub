import assert from 'node:assert/strict';

export async function checkSuggestionPosition(page) {
  const results = await page.locator('.home-news-results').boundingBox();
  const footer = await page.locator('.home-suggestions-footer').boundingBox();
  const gift = await page.locator('.suggestion-box').boundingBox();
  const heading = await page.locator('.home-latest-heading').boundingBox();
  const width = page.viewportSize().width;
  assert.equal(await page.locator('.suggestion-box').count(), 1, 'Uma única caixa/formulário em qualquer largura');
  assert(results.y >= heading.y + heading.height, 'Novidades logo após o título');
  if (width <= 900) {
    assert(footer.y >= results.y + results.height + 24, 'Sugestões no rodapé, após todas as novidades');
    assert(Math.abs(gift.x + gift.width / 2 - (results.x + results.width / 2)) < 1, 'Caixa centralizada no rodapé mobile');
    assert(await page.locator('.home-latest-content > :last-child').evaluate(el => el.classList.contains('home-suggestions-footer')), 'Rodapé também vem por último na ordem de leitura e teclado');
  } else {
    assert(gift.x >= results.x + results.width + 20, 'Caixa à direita dos cartões no desktop');
    assert(Math.abs(gift.y + gift.height / 2 - (results.y + results.height / 2)) < 1, 'Caixa alinhada ao centro da linha de novidades');
    if (width >= 1580) assert.equal(Math.round(results.width), 1080, 'Cartões preservam a largura original em telas amplas');
  }
  assert(gift.x >= 0 && gift.x + gift.width <= width - 14, 'Caixa cabe na tela sem corte');
}

export async function checkSuggestionBox(page, base, shot) {
  const requests = [];
  let fail = false, delay = 0;
  await page.route('**/api/v1/sugestoes', async route => {
    requests.push(route.request().postDataJSON());
    assert.equal(route.request().headers()['x-blog-action'], '1');
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    await route.fulfill({ status: fail ? 503 : 201, json: fail ? { message: 'Falha simulada. Tente novamente.' } : { ok: true } });
  });
  await page.goto(base + '/inicio');
  const gift = page.getByRole('button', { name: 'Abrir caixa de sugestões', exact: true });
  const invite = page.getByRole('button', { name: 'Deixe aqui sua sugestão' });
  const modal = page.getByRole('dialog', { name: 'Caixa de sugestões', exact: true });
  const assertClosed = async () => {
    await page.locator('.suggestion-dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('.suggestion-box')?.dataset.expanded === 'false'
      && getComputedStyle(document.querySelector('.suggestion-gift-lid')).transform === 'none');
    assert(await invite.isHidden(), 'Convite recolhido ao fechar o formulário');
    assert.equal(await gift.getAttribute('aria-expanded'), 'false');
    assert(await gift.evaluate(el => el === document.activeElement), 'Retorno de foco preservado sem reabrir a tampa');
  };
  await gift.waitFor();
  await page.mouse.move(0, 0);
  assert(await invite.isHidden());
  await gift.hover();
  await invite.waitFor();
  assert.equal(await page.locator('.suggestion-box').getAttribute('data-expanded'), 'true');
  assert.equal(await gift.getAttribute('aria-expanded'), 'false', 'Hover abre a tampa, não o formulário');
  assert.notEqual(await page.locator('.suggestion-gift-lid').evaluate(el => getComputedStyle(el).transform), 'none');
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.querySelector('.suggestion-box').dataset.expanded === 'false');
  await gift.focus();
  await page.keyboard.press('Tab');
  assert(await invite.evaluate(el => el === document.activeElement));
  await page.keyboard.press('Enter');
  await modal.waitFor();
  assert(await modal.getByLabel('Nome', { exact: true }).evaluate(el => el === document.activeElement));
  await page.keyboard.press('Shift+Tab');
  assert(await modal.getByRole('button', { name: 'Enviar', exact: true }).evaluate(el => el === document.activeElement));
  await page.keyboard.press('Tab');
  assert(await modal.getByLabel('Nome', { exact: true }).evaluate(el => el === document.activeElement));
  await modal.getByRole('button', { name: 'Enviar', exact: true }).click();
  assert.equal(requests.length, 0, 'Campos obrigatórios impedem envio vazio');
  await modal.getByLabel('Nome', { exact: true }).fill('   ');
  await modal.getByLabel('Cartório', { exact: true }).fill('   ');
  await modal.getByLabel('Sugestão', { exact: true }).fill('   ');
  await modal.getByRole('button', { name: 'Enviar', exact: true }).click();
  await modal.getByRole('alert').waitFor();
  assert.equal(requests.length, 0, 'Espaços não são conteúdo válido');
  await page.keyboard.press('Escape');
  await assertClosed();

  // Clique direto abre o formulário; Esc fecha mesmo com o mouse parado sobre o presente.
  await gift.click();
  await modal.waitFor();
  assert.equal(await gift.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  await assertClosed();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.suggestion-box').getAttribute('data-expanded'), 'false', 'Caixa não reabre sem uma nova interação');
  for (const key of ['Enter', 'Space']) {
    await page.keyboard.press(key);
    await modal.waitFor();
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await assertClosed();
  }

  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
      await page.mouse.move(0, 0);
      await gift.hover();
      await invite.waitFor();
      const triggerBox = await gift.boundingBox();
      assert(triggerBox.width <= 112 && triggerBox.height <= 90, 'Presente menor e discreto');
      assert(triggerBox.width >= 44 && triggerBox.height >= 44, 'Área de toque preservada');
      assert((await invite.boundingBox()).height >= 44, 'Texto mantém área de toque confortável');
      const titleStyle = await page.locator('.suggestion-box h3').evaluate(el => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: Number(getComputedStyle(el).fontWeight) }));
      assert(titleStyle.size >= 13 && titleStyle.size <= 14 && titleStyle.weight <= 500, 'Título menor, legível e sem negrito pesado');
      assert.equal(await page.locator('.suggestion-box h3').evaluate(el => getComputedStyle(el).fontStyle), 'italic', 'Título da caixa em itálico');
      assert.equal(await gift.evaluate(el => getComputedStyle(el).marginTop), '-10px', 'SVG mais próximo do título');
      const labelBounds = await page.locator('.suggestion-box h3').boundingBox();
      const lidBounds = await page.locator('.suggestion-gift-lid').boundingBox();
      assert(lidBounds.y >= labelBounds.y + labelBounds.height - 1, 'Tampa aberta sem sobrepor o título');
      assert.equal(await invite.evaluate(el => getComputedStyle(el).boxShadow), 'none', 'Convite sem sombra ou efeito de cartão');
      await shot(`suggestion-box-${width}-${theme}`, false);
      if (theme === 'light') await invite.click();
      else await gift.click();
      await modal.waitFor();
      const box = await modal.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width, 'Modal dentro da tela');
      assert(await modal.evaluate(el => el.scrollWidth <= el.clientWidth), 'Sem overflow horizontal no modal');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      for (const button of await modal.getByRole('button').all()) assert((await button.boundingBox()).height >= 44);
      await shot(`suggestion-dialog-${width}-${theme}`, false);
      await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await assertClosed();
    }
  }
  assert.equal(requests.length, 0, 'Cancelar não envia dados');
  await gift.click();
  await modal.getByLabel('Nome', { exact: true }).fill('  Ana Souza  ');
  await modal.getByLabel('Cartório', { exact: true }).fill('  Cartório de Notas  ');
  await modal.getByLabel('Sugestão', { exact: true }).fill('  Mais guias de uso.  ');
  fail = true;
  await modal.getByRole('button', { name: 'Enviar', exact: true }).click();
  await modal.getByRole('alert').waitFor();
  assert.equal(await modal.getByLabel('Nome', { exact: true }).inputValue(), '  Ana Souza  ', 'Falha preserva o formulário');
  assert.equal(await page.getByText('Obrigado pela sugestão :)', { exact: true }).count(), 0, 'Sem confirmação falsa');
  fail = false; delay = 500;
  await modal.getByRole('button', { name: 'Enviar', exact: true }).click();
  assert(await modal.getByRole('button', { name: 'Enviando…', exact: true }).isDisabled());
  await page.keyboard.press('Escape');
  assert(await modal.isVisible(), 'Envio em andamento não é interrompido pelo Escape');
  await page.getByRole('heading', { name: 'Obrigado pela sugestão :)', exact: true }).waitFor();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].envio_id, requests[1].envio_id, 'Tentativa repetida usa o mesmo identificador');
  assert.equal(requests[1].nome, 'Ana Souza');
  await shot('suggestion-success', false);
  await page.locator('.suggestion-dialog').waitFor({ state: 'hidden' });
  await assertClosed();
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
  assert(await gift.evaluate(el => el === document.activeElement));
  await gift.click();
  assert.equal(await modal.getByLabel('Nome', { exact: true }).inputValue(), '', 'Novo formulário limpo');
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await assertClosed();

  // Toque real via CDP no contexto atual; sem depender de hover no dispositivo.
  await page.setViewportSize({ width: 390, height: 844 });
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const tap = async locator => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox(), point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await page.reload(); await gift.waitFor();
  await tap(gift); await modal.waitFor();
  await tap(modal.getByRole('button', { name: 'Cancelar', exact: true }));
  await assertClosed();
  await tap(gift); await modal.waitFor();
  await tap(modal.getByRole('button', { name: 'Cancelar', exact: true }));
  await assertClosed();
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await touch.detach();
  for (const route of ['/oriontn/novidades', '/posts/201/assinatura-de-documentos', '/gestao']) {
    await page.goto(base + route);
    await page.locator('.topbar').waitFor();
    assert.equal(await page.locator('.suggestion-box,.suggestion-dialog').count(), 0, 'Caixa somente na home');
  }
  await page.unroute('**/api/v1/sugestoes');
  await page.goto(base + '/inicio');
  console.log('OK: sugestões na home, clique/toque direto no presente e no convite, teclado, tampa recolhida em todos os fechamentos, modal responsivo, validação, erro/reenvio e confirmação.');
}
