import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import sharp from 'sharp';
import { chromium } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
dotenv.config({path:path.join(root,'apps/api/.env')});
const schema='orion_test_'+randomUUID().replaceAll('-','');
assert.match(schema,/^orion_test_[a-f0-9]{32}$/);
const database=new pg.Client({connectionString:process.env.DATABASE_URL});
const children=[];
let createdSchema=false,browser;
let failures='';
let checks=0;
const check=(label)=>{checks++;console.log('OK '+label);};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
function start(args,env,cwd=root){const child=spawn(process.execPath,args,{cwd,env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>{failures=(failures+d).slice(-12000);});child.stderr.on('data',d=>{failures=(failures+d).slice(-12000);});children.push(child);return child;}
async function ready(url){for(let i=0;i<80;i++){try{if((await fetch(url)).ok)return;}catch{}await pause(250);}throw new Error('Servidor não iniciou: '+url);}

try {
  await database.connect();
  await database.query(`CREATE SCHEMA ${schema}`);createdSchema=true;
  await database.query(`SET search_path TO ${schema},public`);
  const migrationDir=path.join(root,'database/migrations');
  const migrations=(await readdir(migrationDir)).filter(f=>f.endsWith('.sql')).sort();
  for(const file of migrations){
    await database.query(await readFile(path.join(migrationDir,file),'utf8'));
    if(file==='001_initial.sql') {
      await database.query("INSERT INTO ca_admins(email,password_hash) VALUES('admin-test@orion.local',$1)",[process.env.ADMIN_PASSWORD_HASH]);
      const old=await database.query("INSERT INTO ca_atualizacoes(titulo,slug,versao,resumo,corpo,status,publicado_em) VALUES('Legado','legado','06.03.03','Subtítulo legado','Conteúdo antigo','publicado',NOW()) RETURNING id");
      await database.query("INSERT INTO ca_atualizacao_produto SELECT $1,id FROM ca_produtos WHERE slug='oriontn'",[old.rows[0].id]);
      await database.query("INSERT INTO ca_itens(atualizacao_id,tipo,titulo) VALUES($1,'novidade','Mudança legada')",[old.rows[0].id]);
    }
  }
  const migrated=await database.query('SELECT v.codigo,p.slug,a.corpo,a.capa_imagem_id FROM ca_atualizacoes a JOIN ca_versoes v ON v.id=a.versao_id JOIN ca_produtos p ON p.id=v.produto_id');
  assert.equal(migrated.rows[0].slug,'oriontn');assert.equal(migrated.rows[0].corpo,'Conteúdo antigo');
  assert.equal(migrated.rows[0].capa_imagem_id,null);
  await assert.rejects(database.query("INSERT INTO ca_versoes(codigo) VALUES('sem-sistema')"));
  await assert.rejects(database.query("INSERT INTO ca_atualizacoes(titulo,slug,tipo) VALUES('Sem versão','sem-versao','aviso')"));
  check('migrações preservam legado e banco exige os vínculos');

  const apiPort=await freePort(),webPort=await freePort();
  const base=`http://127.0.0.1:${apiPort}`,web=`http://127.0.0.1:${webPort}`;
  const url=new URL(process.env.DATABASE_URL);url.searchParams.set('options','-c search_path='+schema+',public');
  const password='test-'+randomUUID();
  // Hash próprio dos testes, sem modificar o administrador real.
  const {hashPassword}=await import('../apps/api/src/auth/password.ts');
  await database.query("UPDATE ca_admins SET password_hash=$1 WHERE email='admin-test@orion.local'",[await hashPassword(password)]);
  start(['--import','tsx','apps/api/src/server.ts'],{DATABASE_URL:url.toString(),PORT:String(apiPort),APP_ORIGIN:web,NODE_ENV:'test'});
  start([path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(webPort),'--strictPort'],{API_PROXY_TARGET:base},path.join(root,'apps/web'));
  await Promise.all([ready(base+'/health'),ready(web)]);
  let csrf='',rateWindowEndsAt=0;const cookies=new Map();
  async function request(route,{method='GET',body,auth=true,headers={}}={}){
    const reqHeaders={...headers};
    if(auth){reqHeaders.cookie=[...cookies].map(([k,v])=>k+'='+v).join('; ');if(method!=='GET')reqHeaders['x-csrf-token']=csrf;}
    let data;
    if(body!==undefined){if(Buffer.isBuffer(body))data=body;else{reqHeaders['content-type']='application/json';data=JSON.stringify(body);}}
    const response=await fetch(base+'/api/v1'+route,{method,headers:reqHeaders,body:data});
    const resetSeconds=Number(response.headers.get('x-ratelimit-reset'));
    if(Number.isFinite(resetSeconds))rateWindowEndsAt=Date.now()+resetSeconds*1000;
    if(auth)for(const cookie of response.headers.getSetCookie()){const [key,...value]=cookie.split(';')[0].split('=');cookies.set(key,value.join('='));}
    const result=response.headers.get('content-type')?.includes('json')?await response.json():Buffer.from(await response.arrayBuffer());
    return {status:response.status,body:result};
  }
  const expectStatus=async(route,options,status)=>{const result=await request(route,options);assert.equal(result.status,status,route+': '+JSON.stringify(result.body));return result.body;};
  await expectStatus('/admin/publicacoes',{auth:false},401);
  await expectStatus('/admin/login',{method:'POST',body:{email:'admin-test@orion.local',password}},200);
  csrf=(await expectStatus('/admin/session',{},200)).csrfToken;
  await expectStatus('/admin/versoes',{method:'POST',auth:false,body:{codigo:'1',sistema:'oriontn'}},401);
  await expectStatus('/admin/versoes',{method:'POST',body:{codigo:'1'}},400);
  await expectStatus('/admin/versoes',{method:'POST',body:{codigo:'1',sistema:'invalido'}},400);
  const versions={};
  for(const sistema of ['oriontn','orionpro','orionreg'])versions[sistema]=await expectStatus('/admin/versoes',{method:'POST',body:{codigo:'2.0.0',sistema}},201);
  await expectStatus('/admin/versoes',{method:'POST',body:{codigo:'2.0.0',sistema:'oriontn'}},409);
  for(const sistema of Object.keys(versions)){
    const list=await expectStatus('/versoes?produto='+sistema,{auth:false},200);
    assert(list.data.every(v=>v.sistema===sistema));assert(list.data.some(v=>v.id===versions[sistema].id&&v.total_posts===0));
  }
  check('versões independentes por sistema, inclusive sem posts; duplicidade limitada ao sistema');

  const png=await sharp({create:{width:32,height:24,channels:3,background:'#d9164a'}}).png().toBuffer();
  await expectStatus('/admin/imagens',{method:'POST',auth:false,body:png,headers:{'content-type':'image/png'}},401);
  await expectStatus('/admin/imagens',{method:'POST',body:Buffer.from('<svg onload="alert(1)"></svg>'),headers:{'content-type':'image/png'}},400);
  await expectStatus('/admin/imagens',{method:'POST',body:Buffer.alloc(6*1024*1024),headers:{'content-type':'image/png'}},413);
  const image=await expectStatus('/admin/imagens',{method:'POST',body:png,headers:{'content-type':'image/png'}},201);
  const cover=await expectStatus('/admin/imagens',{method:'POST',body:png,headers:{'content-type':'image/png'}},201);
  await expectStatus('/imagens/'+image.id,{auth:false},404);
  await expectStatus('/admin/imagens/'+image.id,{auth:false},401);
  const imageData=await expectStatus('/admin/imagens/'+image.id,{},200);
  assert.equal((await sharp(imageData).metadata()).format,'webp');
  let payload={titulo:'Teste de Integração',subtitulo:'Subtítulo do post',slug:'Teste de Integração',corpo:`<p>Olá <strong>Orion</strong></p><script>alert(1)</script><img src="${image.url}" onerror="alert(1)"><iframe src="https://example.com"></iframe>`,versao_id:versions.oriontn.id,sistema:'oriontn',tipo:'novidade',status:'rascunho',publicado_em:null};
  payload={...payload,capa_imagem_id:cover.id};
  await expectStatus('/admin/publicacoes',{method:'POST',body:{...payload,capa_imagem_id:'https://example.com/capa.png'}},400);
  await expectStatus('/admin/publicacoes',{method:'POST',body:{...payload,capa_imagem_id:randomUUID()}},400);
  const otherAdmin=await database.query("INSERT INTO ca_admins(email,password_hash) VALUES('other-test@orion.local',$1) RETURNING id",[process.env.ADMIN_PASSWORD_HASH]);
  const foreignCover=randomUUID();
  await database.query("INSERT INTO ca_imagens(id,admin_id,dados,mime_type) VALUES($1,$2,$3,'image/webp')",[foreignCover,otherAdmin.rows[0].id,await sharp(png).webp().toBuffer()]);
  await expectStatus('/admin/publicacoes',{method:'POST',body:{...payload,capa_imagem_id:foreignCover}},400);
  const remembered=csrf;csrf='incorreto';await expectStatus('/admin/publicacoes',{method:'POST',body:payload},403);csrf=remembered;
  await expectStatus('/admin/publicacoes',{method:'POST',body:{...payload,versao_id:null}},400);
  await expectStatus('/admin/publicacoes',{method:'POST',body:{...payload,sistema:'orionpro'}},400);
  await expectStatus('/admin/publicacoes',{method:'POST',body:{...payload,tipo:'descontinuado'}},400);
  const post=await expectStatus('/admin/publicacoes',{method:'POST',body:payload},201);
  assert.equal(post.slug,'teste-de-integracao');
  const detail=await expectStatus('/admin/publicacoes/'+post.id,{},200);
  assert.equal(detail.capa_imagem_id,cover.id);
  assert.equal((await expectStatus('/admin/publicacoes',{},200)).data.find(p=>p.id===post.id).capa_imagem_id,cover.id);
  assert.equal(detail.subtitulo,payload.subtitulo);assert(!/script|onerror|iframe/.test(detail.corpo));assert(detail.corpo.includes('<strong>Orion</strong>'));
  await expectStatus('/publicacoes/'+post.slug,{auth:false},404);
  await expectStatus('/imagens/'+image.id,{auth:false},404);
  await expectStatus('/imagens/'+cover.id,{auth:false},404);
  await expectStatus('/admin/publicacoes',{method:'POST',body:payload},409);
  check('criação, validação, CSRF, slug, conteúdo seguro e proteção de imagens de rascunho');

  payload={...payload,corpo:detail.corpo};
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,versao_id:versions.orionpro.id}},400);
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'agendado',publicado_em:null}},400);
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'agendado',publicado_em:'2000-01-01T00:00:00Z'}},400);
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'agendado',publicado_em:new Date(Date.now()+1500).toISOString()}},200);
  await expectStatus('/publicacoes/'+post.slug,{auth:false},404);
  await expectStatus('/imagens/'+image.id,{auth:false},404);
  await expectStatus('/imagens/'+cover.id,{auth:false},404);
  await pause(1700);
  const publicDetail=await expectStatus('/publicacoes/'+post.slug,{auth:false},200);
  assert.equal(publicDetail.status,'publicado');
  assert.equal(publicDetail.capa_imagem_id,cover.id);
  await expectStatus('/imagens/'+image.id,{auth:false},200);
  await expectStatus('/imagens/'+cover.id,{auth:false},200);
  const filtered=await expectStatus('/publicacoes?produto=oriontn&tipo=novidade&versao_id='+versions.oriontn.id,{},200);
  assert.equal(filtered.data.length,1);assert.equal(filtered.data[0].id,post.id);
  assert.equal(filtered.data[0].capa_imagem_id,cover.id);
  const empty=await expectStatus('/publicacoes?produto=orionpro&tipo=novidade',{auth:false},200);assert.equal(empty.data.length,0);
  await expectStatus('/publicacoes/'+post.id+'/leituras',{method:'POST',headers:{'x-blog-action':'1'}},200);
  await expectStatus('/publicacoes/'+post.id+'/leituras',{method:'POST',headers:{'x-blog-action':'1'}},200);
  const read=await expectStatus('/versoes?produto=oriontn&tipo=novidade',{},200);assert.equal(read.data.find(v=>v.id===versions.oriontn.id).nao_lidos,0);
  for(const tipo of ['melhoria','correcao','aviso']) {
    await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,tipo,status:'publicado'}},200);
    const filter=await expectStatus('/publicacoes?produto=oriontn&tipo='+tipo,{auth:false},200);assert(filter.data.some(p=>p.id===post.id));
  }
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'agendado',publicado_em:new Date(Date.now()+86400000).toISOString()}},200);
  await expectStatus('/admin/publicacoes/'+post.id+'/publicar',{method:'POST'},200);
  await expectStatus('/publicacoes/'+post.slug,{auth:false},200);
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'publicado',capa_imagem_id:null}},200);
  assert.equal((await expectStatus('/publicacoes/'+post.slug,{auth:false},200)).capa_imagem_id,null);
  await expectStatus('/imagens/'+cover.id,{auth:false},404);
  await expectStatus('/imagens/'+image.id,{auth:false},200);
  // A mesma imagem pode ser capa e conteúdo, sem duplicar o vínculo.
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'publicado',capa_imagem_id:image.id}},200);
  assert.equal((await database.query('SELECT COUNT(*)::int AS total FROM ca_post_imagens WHERE post_id=$1',[post.id])).rows[0].total,1);
  const {capa_imagem_id:ignoredCover,...withoutCover}=payload;
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...withoutCover,status:'publicado'}},200);
  assert.equal((await expectStatus('/admin/publicacoes/'+post.id,{},200)).capa_imagem_id,image.id);
  // Imagens usadas só na capa também sobrevivem à limpeza dos uploads antigos.
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'publicado'}},200);
  await database.query("UPDATE ca_imagens SET criado_em=NOW()-INTERVAL '8 days' WHERE id=$1",[cover.id]);
  await expectStatus('/admin/imagens',{method:'POST',body:png,headers:{'content-type':'image/png'}},201);
  await expectStatus('/imagens/'+cover.id,{auth:false},200);
  await expectStatus('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,status:'rascunho'}},200);
  await expectStatus('/imagens/'+image.id,{auth:false},404);
  await expectStatus('/imagens/'+cover.id,{auth:false},404);
  await expectStatus('/admin/publicacoes/'+post.id,{method:'DELETE'},200);
  await expectStatus('/admin/publicacoes/'+post.id,{},404);
  assert.equal((await database.query('SELECT COUNT(*)::int AS total FROM ca_post_imagens WHERE post_id=$1',[post.id])).rows[0].total,0);
  check('capas opcionais: validação, autorização, visibilidade, troca, remoção, vínculo único e limpeza segura');
  check('agendamento automático, publicação imediata, filtros, leitura idempotente, edição e exclusão');

  // Apenas fixtures do schema temporário: a home ignora destaques antigos e conteúdo não público.
  await database.query("UPDATE ca_atualizacoes SET publicado_em=NOW()-INTERVAL '30 days' WHERE slug='legado'");
  const latestFixtures = [
    ['oriontn', 'novidade', 'publicado', -1, false],
    ['orionpro', 'novidade', 'publicado', -1, false],
    ['orionreg', 'novidade', 'agendado', -2, false],
    ['oriontn', 'novidade', 'publicado', -3, true],
    ['oriontn', 'melhoria', 'publicado', 0, false],
    ['orionpro', 'correcao', 'publicado', 0, false],
    ['orionreg', 'aviso', 'publicado', 0, false],
    ['orionpro', 'novidade', 'agendado', 1440, false],
    ['orionreg', 'novidade', 'rascunho', null, false],
    ['oriontn', 'novidade', 'arquivado', 0, false],
  ];
  const latestIds = [], referenceTime = Date.now();
  for (const [index, [system, type, status, minutes, featured]] of latestFixtures.entries()) {
    const inserted = await database.query(`INSERT INTO ca_atualizacoes(titulo,slug,corpo,versao_id,tipo,status,publicado_em,destaque)
      VALUES($1,$2,'Conteúdo de teste',$3,$4,$5,$6,$7) RETURNING id`,
    ['Novidade home '+index, 'home-fixture-'+index, versions[system].id, type, status, minutes === null ? null : new Date(referenceTime + minutes * 60000), featured]);
    latestIds.push(Number(inserted.rows[0].id));
  }
  const latestRoute = '/publicacoes?tipo=novidade&limit=3&ordem=recentes';
  const latest = await expectStatus(latestRoute, {auth:false}, 200);
  assert.deepEqual(latest.data.map(item=>item.id), [latestIds[1], latestIds[0], latestIds[2]], 'Data decrescente com desempate por ID');
  assert.deepEqual(new Set(latest.data.map(item=>item.sistema)), new Set(['oriontn','orionpro','orionreg']));
  assert(latest.data.every(item=>item.tipo==='novidade'&&item.status==='publicado'));
  assert.equal(latest.meta.limit, 3);
  assert.equal((await expectStatus('/publicacoes?tipo=novidade&limit=3',{auth:false},200)).data[0].id, latestIds[3], 'Feed normal mantém prioridade dos destaques');
  await expectStatus('/publicacoes?ordem='+encodeURIComponent('publicado_em;DROP TABLE ca_atualizacoes'),{auth:false},400);
  await expectStatus('/publicacoes?ordem=recentes&limit=0',{auth:false},400);
  await database.query("UPDATE ca_produtos SET ativo=false WHERE slug='orionreg'");
  assert(!(await expectStatus(latestRoute,{auth:false},200)).data.some(item=>item.sistema==='orionreg'));
  await database.query("UPDATE ca_produtos SET ativo=true WHERE slug='orionreg'");
  await database.query('DELETE FROM ca_atualizacoes WHERE id=ANY($1::bigint[])',[latestIds]);
  check('home: três novidades cronológicas de todos os sistemas; desempate estável, destaque não interfere, conteúdo privado/futuro/inativo excluído');

  // Os cenários de API e de navegador usam o mesmo IP. Respeitar a janela real,
  // sem desativar nem aumentar a proteção de rate limit do sistema.
  console.log('Aguardando a renovação do limite de requisições antes dos testes de navegador.');
  while(Date.now()<rateWindowEndsAt+250)await pause(Math.min(10000,rateWindowEndsAt+250-Date.now()));
  browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL==='chromium'?undefined:process.env.TEST_BROWSER_CHANNEL??'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1366,height:1000},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();page.setDefaultTimeout(15000);const pageErrors=[];page.on('pageerror',e=>{pageErrors.push(e.message);console.error('Browser:',e.message);});
  await page.goto(web+'/gestao');
  await page.getByLabel('E-mail',{exact:true}).fill('admin-test@orion.local');await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('button',{name:'Nova versão',exact:true}).click();
  const versionForm=page.locator('.version-editor');
  await versionForm.getByLabel('Sistema',{exact:true}).selectOption('orionreg');await versionForm.getByLabel('Código da versão').fill('3.0.0');
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/admin/versoes')&&r.request().method()==='POST'&&r.status()===201),versionForm.getByRole('button',{name:'Salvar versão'}).click()]);
  await page.getByRole('button',{name:'Nova publicação',exact:true}).click();
  const form=page.locator('.publication-editor');
  assert.equal(await form.locator('.post-cover-placeholder').count(),1);
  await form.getByLabel('Selecionar imagem de capa').setInputFiles({name:'capa.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg></svg>')});
  assert(await form.getByRole('alert').filter({hasText:'até 5 MB'}).isVisible());
  const coverUpload=page.waitForResponse(r=>r.url().endsWith('/admin/imagens')&&r.status()===201);
  await form.getByLabel('Selecionar imagem de capa').setInputFiles({name:'capa.png',mimeType:'image/png',buffer:png});
  const uiCover=await (await coverUpload).json();
  await page.waitForFunction(()=>document.querySelector('.cover-field img')?.naturalWidth>0);
  await form.getByLabel('Título',{exact:true}).fill('Post com imagem colada');
  await form.getByLabel('Subtítulo',{exact:true}).fill('Texto e imagem no mesmo conteúdo');
  await form.getByLabel('Sistema',{exact:true}).selectOption('oriontn');
  await form.getByLabel('Versão',{exact:true}).selectOption(String(versions.oriontn.id));
  await form.getByLabel('Sistema',{exact:true}).selectOption('orionpro');assert.equal(await form.getByLabel('Versão',{exact:true}).inputValue(),'');
  await form.getByLabel('Sistema',{exact:true}).selectOption('oriontn');await form.getByLabel('Versão',{exact:true}).selectOption(String(versions.oriontn.id));
  await form.getByLabel('Status',{exact:true}).selectOption('agendado');assert(await form.getByLabel('Data e hora de publicação',{exact:true}).isVisible());
  await form.getByLabel('Data e hora de publicação',{exact:true}).fill('2099-12-20T14:30');
  await form.getByLabel('Status',{exact:true}).selectOption('publicado');assert.equal(await form.getByLabel('Data e hora de publicação',{exact:true}).count(),0);
  const textbox=form.getByRole('textbox',{name:'Conteúdo da publicação'});await textbox.fill('Texto antes da imagem.');
  await page.evaluate(async base64=>{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));await navigator.clipboard.write([new ClipboardItem({'image/png':new Blob([bytes],{type:'image/png'})})]);},png.toString('base64'));
  await textbox.focus();await page.keyboard.press('Control+End');
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/admin/imagens')&&r.status()===201),page.keyboard.press('Control+V')]);
  await page.waitForFunction(()=>document.querySelector('.tiptap img')?.naturalWidth>0);
  const uiCreated=page.waitForResponse(r=>r.url().endsWith('/admin/publicacoes')&&r.request().method()==='POST');
  await form.getByRole('button',{name:'Salvar publicação',exact:true}).click();
  const uiResponse=await uiCreated;assert.equal(uiResponse.status(),201,await uiResponse.text());const uiPost=await uiResponse.json();
  assert.equal((await expectStatus('/admin/publicacoes/'+uiPost.id,{},200)).capa_imagem_id,uiCover.id);
  await page.getByRole('button',{name:/Post com imagem colada/}).click();
  await page.waitForFunction(()=>document.querySelector('.rich-content img')?.naturalWidth>0);
  check('navegador: sistema filtra versões, calendário aparece e Ctrl+V insere imagem persistida');

  const readerContext=await browser.newContext({viewport:{width:390,height:844}});
  const reader=await readerContext.newPage();reader.on('pageerror',e=>pageErrors.push(e.message));
  await reader.goto(web+'/oriontn/novidades');
  await reader.getByRole('button',{name:/OrionTN.*2\.0\.0/}).click();await reader.getByRole('button',{name:/Post com imagem colada/}).click();
  await reader.waitForFunction(()=>document.querySelector('.rich-content img')?.naturalWidth>0);
  await reader.waitForFunction(()=>document.querySelector('.post-cover img')?.naturalWidth>0);
  assert.equal(await reader.locator('.post-cover img').getAttribute('src'),uiCover.url);
  assert.equal(await reader.locator('.feed aside strong').count(),0);
  assert(await reader.locator('.version-heading h2').textContent().then(text=>text.includes('2.0.0')));
  assert(await reader.getByText('Texto antes da imagem.',{exact:true}).isVisible());
  assert(await reader.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await reader.getByRole('button',{name:'Ativar tema escuro'}).click();
  const artifacts=path.join(root,'.test-results');await mkdir(artifacts,{recursive:true});
  await reader.screenshot({path:path.join(artifacts,'post-mobile-dark.png'),fullPage:true});
  await page.getByRole('button',{name:'Editar',exact:true}).last().click();
  // Lista ordenada por criação: localizar pelo título para editar o post correto.
  if(!await page.locator('.publication-editor').getByLabel('Título',{exact:true}).inputValue().then(v=>v==='Post com imagem colada')) {
    await page.locator('.publication-editor').getByRole('button',{name:'Cancelar',exact:true}).first().click();
    await page.locator('article').filter({hasText:'Post com imagem colada'}).getByRole('button',{name:'Editar',exact:true}).click();
  }
  await page.waitForFunction(()=>document.querySelector('.tiptap img')?.naturalWidth>0);
  await page.waitForFunction(()=>document.querySelector('.cover-field img')?.naturalWidth>0);
  await page.screenshot({path:path.join(artifacts,'editor-desktop.png'),fullPage:true});
  await form.getByRole('button',{name:'Remover capa',exact:true}).click();
  assert.equal(await form.locator('.post-cover-placeholder').count(),1);
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/admin/publicacoes/'+uiPost.id)&&r.request().method()==='PUT'&&r.status()===200),form.getByRole('button',{name:'Salvar publicação',exact:true}).click()]);
  assert.equal((await expectStatus('/publicacoes/'+uiPost.slug,{auth:false},200)).capa_imagem_id,null);
  await reader.reload();await reader.getByRole('button',{name:/OrionTN.*2\.0\.0/}).click();
  await reader.locator('.post-cover-placeholder').waitFor();
  assert.equal(await reader.locator('.post-cover-placeholder').count(),1);
  await reader.getByRole('button',{name:'Ativar tema claro'}).click();
  await reader.setViewportSize({width:1366,height:1000});
  await reader.screenshot({path:path.join(artifacts,'post-default-cover-desktop.png'),fullPage:true});
  await page.locator('article').filter({hasText:'Post com imagem colada'}).getByRole('button',{name:'Editar',exact:true}).click();
  const replacementUpload=page.waitForResponse(r=>r.url().endsWith('/admin/imagens')&&r.status()===201);
  await form.getByLabel('Selecionar imagem de capa').setInputFiles({name:'nova-capa.png',mimeType:'image/png',buffer:png});
  const replacement=await (await replacementUpload).json();
  await page.waitForFunction(()=>document.querySelector('.cover-field img')?.naturalWidth>0);
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/admin/publicacoes/'+uiPost.id)&&r.request().method()==='PUT'&&r.status()===200),form.getByRole('button',{name:'Salvar publicação',exact:true}).click()]);
  assert.equal((await expectStatus('/publicacoes/'+uiPost.slug,{auth:false},200)).capa_imagem_id,replacement.id);
  await expectStatus('/imagens/'+uiCover.id,{auth:false},404);
  check('navegador: capa importada, persistida, removida e substituída; SVG padrão e versão não repetida nos cards');
  assert.deepEqual(pageErrors,[]);
  await expectStatus('/admin/publicacoes/'+uiPost.id,{method:'DELETE'},200);
  await expectStatus('/imagens/'+replacement.id,{auth:false},404);
  await expectStatus('/admin/logout',{method:'POST'},200);
  await expectStatus('/admin/session',{},401);
  check('leitura pública com imagens, edição com preview, layout móvel, tema e logout');
  console.log(`Verificação concluída: ${checks} grupos de cenários aprovados.`);
} catch(error) {
  if(browser) for(const context of browser.contexts()) for(const page of context.pages()) {
    console.error('Forms:',await page.locator('.version-editor,.publication-editor').allInnerTexts().catch(()=>[]));
    await mkdir(path.join(root,'.test-results'),{recursive:true});
    await page.screenshot({path:path.join(root,'.test-results','failure.png'),fullPage:true}).catch(()=>{});
  }
  console.error(error);console.error(failures.slice(-6000));process.exitCode=1;
} finally {
  await browser?.close();
  for(const child of children){if(child.exitCode===null){const closed=once(child,'exit');child.kill();await Promise.race([closed,pause(3000)]);}}
  if(createdSchema){await database.query('SET search_path TO public');await database.query(`DROP SCHEMA ${schema} CASCADE`);console.log('Schema temporário removido; dados reais preservados.');}
  await database.end();
}
