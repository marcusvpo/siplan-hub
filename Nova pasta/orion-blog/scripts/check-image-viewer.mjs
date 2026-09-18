import assert from 'node:assert/strict';

// Executado pela suíte visual com imagens/API simuladas, sem alterar publicações reais.
export async function checkImageViewer(page, shot) {
  const cover = page.getByRole('button', { name: 'Ampliar capa da publicação', exact: true }).first();
  const dialog = page.getByRole('dialog', { name: 'Imagem da publicação', exact: true });
  const plus = dialog.getByRole('button', { name: 'Aumentar', exact: true });
  const minus = dialog.getByRole('button', { name: 'Diminuir', exact: true });
  const close = dialog.getByRole('button', { name: 'Fechar imagem', exact: true });
  const stage = dialog.getByRole('region', { name: 'Imagem ampliada' });
  const zoom = dialog.locator('output');
  const waitImage = () => page.waitForFunction(() => {
    const img = document.querySelector('.image-viewer img');
    return img?.naturalWidth > 0 && img.getBoundingClientRect().width > 0;
  });
  const closed = async trigger => {
    await dialog.waitFor({ state: 'detached' });
    assert(await trigger.evaluate(element => element === document.activeElement), 'Foco retorna à imagem que abriu o visualizador');
    assert.notEqual(await page.evaluate(() => document.documentElement.style.overflow), 'hidden', 'Rolagem do blog restaurada');
  };
  const previousUrl = page.url();
  for (const width of [320, 390, 1366]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
      await cover.focus();
      await page.keyboard.press('Enter');
      await waitImage();
      assert(await close.evaluate(element => element === document.activeElement), 'Foco inicial no botão de fechar');
      assert.equal(await zoom.innerText(), '100%', 'Nova abertura começa ajustada à tela');
      await shot(`image-viewer-fit-${width}-${theme}`, false);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
      const initial = await dialog.locator('img').boundingBox();
      const viewport = await stage.boundingBox();
      assert(initial.width <= viewport.width + 1 && initial.height <= viewport.height + 1, 'Imagem inteira cabe no visualizador');
      const bounds = await dialog.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Visualizador não vaza horizontalmente');
      for (const button of [plus, minus, close]) {
        const box = await button.boundingBox();
        assert(box.height >= 44 && box.width >= 44, 'Controles confortáveis para toque');
      }
      await plus.click();
      assert.equal(await zoom.innerText(), '125%');
      assert(Math.abs((await dialog.locator('img').boundingBox()).width / initial.width - 1.25) < .01, 'Aumentar amplia a imagem de fato');
      await minus.click();
      assert.equal(await zoom.innerText(), '100%');
      for (let step = 0; step < 2; step++) await minus.click();
      assert.equal(await zoom.innerText(), '50%');
      assert(await minus.isDisabled(), 'Limite mínimo de zoom');
      for (let step = 0; step < 14; step++) await plus.click();
      assert.equal(await zoom.innerText(), '400%');
      assert(await plus.isDisabled(), 'Limite máximo de zoom');
      assert(await stage.evaluate(element => element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight), 'Imagem ampliada permite alcançar suas bordas');
      const ratio = await dialog.locator('img').evaluate(img => img.width / img.height - img.naturalWidth / img.naturalHeight);
      assert(Math.abs(ratio) < .01, 'Proporção da imagem preservada');
      await stage.evaluate(element => { element.scrollLeft = 0; element.scrollTop = 0; });
      if (width === 1366) {
        await page.mouse.move(viewport.x + 150, viewport.y + 160);
        await page.mouse.down();
        await page.mouse.move(viewport.x + 60, viewport.y + 60, { steps: 8 });
        await page.mouse.up();
        assert(await stage.evaluate(element => element.scrollTop > 50), 'Arrastar com o mouse move a imagem ampliada');
      }
      await shot(`image-viewer-${width}-${theme}`, false);
      // O foco pode chegar ao próprio diálogo em alguns navegadores, mas nunca ao blog ao fundo.
      for (let step = 0; step < 6; step++) {
        await page.keyboard.press('Tab');
        assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Tab permanece no visualizador modal');
      }
      await page.keyboard.press('Escape');
      await closed(cover);
      assert.equal(page.url(), previousUrl, 'Ampliar imagem não muda a rota');
    }
  }

  const inline = page.locator('.publication-content img').first();
  await inline.focus();
  await page.keyboard.press('Space');
  await waitImage();
  assert.equal(await dialog.locator('img').getAttribute('alt'), 'Fluxo de atendimento');
  await close.click();
  await closed(inline);

  // Imagem dentro de link amplia no blog em vez de navegar para o href.
  const linked = page.locator('.publication-content a img');
  await linked.click();
  await waitImage();
  assert.equal(page.url(), previousUrl);
  await close.click();
  await closed(linked);

  // Redimensionar com a janela aberta recalcula o encaixe da imagem.
  await cover.click();
  await waitImage();
  await page.setViewportSize({ width: 700, height: 390 });
  await page.waitForFunction(() => {
    const image = document.querySelector('.image-viewer img').getBoundingClientRect();
    const viewport = document.querySelector('.image-viewer-viewport').getBoundingClientRect();
    return image.width <= viewport.width + 1 && image.height <= viewport.height + 1;
  });
  assert.equal(await zoom.innerText(), '100%');
  await close.click();
  await closed(cover);

  // Uma falha ao carregar a imagem ampliada mostra mensagem e mantém a saída disponível.
  await cover.click();
  await waitImage();
  const brokenUrl = new URL('/api/v1/imagens/00000000-0000-4000-8000-000000000000', page.url()).href;
  await page.route(brokenUrl, route => route.fulfill({ status: 404, body: '' }));
  try {
    await dialog.locator('img').evaluate((image, src) => { image.src = src; }, brokenUrl);
    await dialog.getByRole('alert').waitFor();
    assert(await plus.isDisabled() && await minus.isDisabled());
    await close.click();
    await closed(cover);
  } finally {
    await page.unroute(brokenUrl);
  }

  // Toque e arraste reais via CDP no viewport mobile, não apenas eventos JS sintéticos.
  await page.setViewportSize({ width: 390, height: 844 });
  const touch = await page.context().newCDPSession(page);
  try {
    await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const tap = async locator => {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await tap(inline);
    await waitImage();
    for (let step = 0; step < 8; step++) await tap(plus);
    assert.equal(await zoom.innerText(), '300%', 'Zoom por toque no mobile');
    const box = await stage.boundingBox();
    const before = await stage.evaluate(element => element.scrollTop);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 12 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(initial => document.querySelector('.image-viewer-viewport').scrollTop > initial + 20, before);
    // A rolagem por inércia e o clique de toque são assíncronos no navegador.
    // Aguarda o fim do movimento antes de testar o próximo controle.
    await stage.evaluate(element => new Promise(resolve => {
      let previous = element.scrollTop, stableFrames = 0;
      const settled = () => {
        stableFrames = Math.abs(element.scrollTop - previous) < .5 ? stableFrames + 1 : 0;
        previous = element.scrollTop;
        if (stableFrames >= 6) resolve(undefined);
        else requestAnimationFrame(settled);
      };
      requestAnimationFrame(settled);
    }));
    await tap(minus);
    await page.waitForFunction(() => document.querySelector('.image-viewer output')?.textContent === '275%');
    assert.equal(await zoom.innerText(), '275%');
    await tap(close);
    await closed(inline);
  } finally {
    await touch.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await touch.detach();
  }
  await page.setViewportSize({ width: 1366, height: 1000 });
  console.log('OK: capas e conteúdo ampliam nos dois temas; zoom 50–400%, proporção, teclado/Esc/foco, mouse, toque, arraste, redimensionamento e falha de imagem.');
}
