import assert from 'node:assert/strict';

export const listingVersions = [
  { id: 101, codigo: '06.03.03', sistema: 'oriontn', sistema_nome: 'OrionTN', total_posts: 25, criado_em: '2020-01-03', ultima_publicacao: '2020-07-25' },
  { id: 102, codigo: '6.9', sistema: 'oriontn', sistema_nome: 'OrionTN', total_posts: 2, criado_em: '2020-01-01', ultima_publicacao: '2020-07-24' },
  { id: 103, codigo: '6.10', sistema: 'oriontn', sistema_nome: 'OrionTN', total_posts: 0, criado_em: '2020-01-02', ultima_publicacao: null },
];
export const listingPosts = Array.from({ length: 25 }, (_, index) => ({
  id: 1001 + index, titulo: index === 0 ? 'Assinatura digital' : `Publicação ${index + 1}`, subtitulo: index === 1 ? 'Conferência de documentos' : 'Confira os detalhes desta atualização.',
  slug: `publicacao-${index + 1}`, versao_id: 101, versao: '06.03.03', sistema: 'oriontn', sistema_nome: 'OrionTN', tipo: 'novidade', status: 'publicado',
  corpo: index === 24 ? 'Trecho exclusivo do atendimento' : 'Orientações gerais', corpo_formato: 'text',
  publicado_em: `2020-07-${String(index + 1).padStart(2, '0')}T10:00:00Z`, capa_imagem_id: null, total_itens: 0, produtos: [{ slug: 'oriontn', nome: 'OrionTN' }],
}));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function mockListingVersions(params) {
  let data = listingVersions.filter(version => (!params.get('produto') || params.get('produto') === version.sistema) && version.codigo.includes(params.get('busca') || ''));
  const order = params.get('ordem') || 'criacao_desc';
  data = data.sort((a, b) => order.startsWith('versao') ? a.codigo.localeCompare(b.codigo, undefined, { numeric: true }) : a.criado_em.localeCompare(b.criado_em));
  if (order.endsWith('desc')) data.reverse();
  return { data, meta: { nao_lidas: 0 } };
}
export function mockListingPosts(params) {
  let data = listingPosts.filter(post => normalize(`${post.titulo} ${post.subtitulo} ${post.corpo}`).includes(normalize(params.get('busca') || '')));
  if (params.get('ordem') !== 'antigas') data = data.reverse();
  const page = Number(params.get('page') || 1), limit = Number(params.get('limit') || 20);
  return { data: data.slice((page - 1) * limit, page * limit), meta: { total: data.length, page, limit, nao_lidas: 0 } };
}

export async function checkListingTools(page, base, shot) {
  const tools = page.getByRole('search');
  const codes = () => page.locator('.version-card-content strong').allTextContents();
  const titles = () => page.locator('.feed .publication-title').allTextContents();
  const request = async (path, action) => {
    const [response] = await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/${path}`), action()]);
    assert.equal(response.status(), 200);
    return new URL(response.url()).searchParams;
  };
  const responsive = async name => {
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro' }).click();
        await tools.scrollIntoViewIfNeeded();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Ordenação e busca sem overflow horizontal');
        assert((await tools.boundingBox()).height <= (width <= 700 ? 104 : 48), 'Barra minimalista sem a altura do antigo cartão');
        assert.equal(await tools.evaluate(element => getComputedStyle(element).boxShadow), 'none', 'Sem sombra de cartão externo');
        for (const selector of ['select', 'input']) assert.equal(await tools.locator(selector).evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)', 'Campos integrados à pílula, sem retângulo interno nos dois temas');
        for (const selector of ['select', 'input', 'button[type="submit"]']) assert((await tools.locator(selector).boundingBox()).height >= 44);
        if ([320, 1366].includes(width)) await shot(`listing-${name}-${width}-${theme}`, false);
      }
    }
  };
  await page.goto(base + '/oriontn');
  await page.getByRole('heading', { name: 'Versões disponíveis', exact: true }).waitFor();
  assert.deepEqual(await codes(), ['06.03.03', '6.10', '6.9']);
  for (const [order, expected] of [
    ['versao_desc', ['6.10', '6.9', '06.03.03']], ['versao_asc', ['06.03.03', '6.9', '6.10']],
    ['criacao_asc', ['6.9', '6.10', '06.03.03']], ['criacao_desc', ['06.03.03', '6.10', '6.9']],
  ]) {
    const params = await request('versoes', () => page.getByLabel('Ordenar versões', { exact: true }).selectOption(order));
    assert.equal(params.get('ordem'), order);
    await page.waitForFunction(expected => JSON.stringify([...document.querySelectorAll('.version-card-content strong')].map(e => e.textContent)) === JSON.stringify(expected), expected);
  }
  const versionSearch = page.getByLabel('Buscar versão', { exact: true });
  await versionSearch.fill('A06.B03.x03');
  assert.equal(await versionSearch.inputValue(), '06.03.03', 'Versão permite somente números e pontos');
  assert.equal((await codes()).length, 3, 'Digitar não aplica busca antes da lupa ou Enter');
  let params = await request('versoes', () => tools.getByRole('button', { name: 'Buscar versões', exact: true }).click());
  assert.equal(params.get('busca'), '06.03.03');
  await page.waitForFunction(() => document.querySelectorAll('.version-card').length === 1);
  await versionSearch.fill('999.99');
  await request('versoes', () => versionSearch.press('Enter'));
  await page.getByRole('heading', { name: 'Nenhuma versão encontrada nesta busca.' }).waitFor();
  await request('versoes', () => tools.getByRole('button', { name: 'Limpar busca' }).click());
  await page.getByRole('heading', { name: 'Versões disponíveis', exact: true }).waitFor();
  await responsive('versions');
  await page.getByRole('button', { name: /OrionTN.*06\.03\.03/ }).click();
  await page.getByRole('heading', { name: /OrionTN.*06\.03\.03/ }).waitFor();
  assert.equal((await titles()).length, 20);
  assert.equal((await titles())[0], 'Publicação 25');
  const next = page.getByRole('button', { name: 'Próxima', exact: true });
  params = await request('publicacoes', () => next.click());
  assert.equal(params.get('page'), '2');
  await page.waitForFunction(() => document.querySelectorAll('.feed .reading-card').length === 5);
  const postSearch = page.getByLabel('Buscar publicação', { exact: true });
  for (const [search, title] of [['assinatura', 'Assinatura digital'], ['conferencia', 'Publicação 2'], ['trecho exclusivo', 'Publicação 25']]) {
    await postSearch.fill(search);
    params = await request('publicacoes', () => postSearch.press('Enter'));
    assert.equal(params.get('page'), '1', 'Nova busca volta à primeira página');
    assert.equal(params.get('busca'), search);
    assert.equal(params.get('produto'), 'oriontn');
    assert.equal(params.get('versao_id'), '101');
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.deepEqual(await titles(), [title]);
  }
  await postSearch.fill('Não existe');
  await request('publicacoes', () => tools.getByRole('button', { name: 'Buscar publicações', exact: true }).click());
  await page.getByRole('heading', { name: 'Nenhuma publicação encontrada nesta busca.' }).waitFor();
  await request('publicacoes', () => tools.getByRole('button', { name: 'Limpar busca' }).click());
  params = await request('publicacoes', () => page.getByLabel('Ordenar publicações', { exact: true }).selectOption('antigas'));
  assert.equal(params.get('ordem'), 'antigas');
  await page.getByRole('heading', { name: 'Assinatura digital', exact: true }).waitFor();
  assert.equal((await titles())[0], 'Assinatura digital');
  await responsive('publications');
  const failureRoute = '**/api/v1/publicacoes?*';
  await page.route(failureRoute, route => route.fulfill({ status: 503, json: { message: 'Falha temporária de busca.' } }));
  await postSearch.fill('Não existe');
  await postSearch.press('Enter');
  await page.getByText('Falha temporária de busca.', { exact: true }).waitFor();
  assert.equal(await page.locator('.listing-empty').count(), 0, 'Erro não é mostrado como resultado vazio');
  await page.unroute(failureRoute);
  await request('publicacoes', () => tools.getByRole('button', { name: 'Buscar publicações', exact: true }).click());
  await page.getByRole('heading', { name: 'Nenhuma publicação encontrada nesta busca.' }).waitFor();
  assert.equal(await page.getByText('Falha temporária de busca.', { exact: true }).count(), 0, 'Repetir a mesma busca permite recuperar de erro');
  await page.getByRole('button', { name: 'Todas as versões', exact: true }).click();
  assert(await page.getByLabel('Buscar versão', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'Limpar filtros e voltar ao início', exact: true }).click();
  await page.getByRole('heading', { name: 'Últimas novidades', exact: true }).waitFor();
  assert.equal(await page.locator('.listing-tools').count(), 0, 'Home continua sem os controles das listagens');
  console.log('OK: ordenação, lupa/Enter, restrição numérica, busca em três campos, paginação, limpar, voltar e layout dos controles em quatro larguras/dois temas.');
}
