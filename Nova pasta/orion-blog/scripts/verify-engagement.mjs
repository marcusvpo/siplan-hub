import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { chromium } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
dotenv.config({path:path.join(root,'apps/api/.env')});
const schema='orion_engagement_test_'+randomUUID().replaceAll('-','');
assert.match(schema,/^orion_engagement_test_[a-f0-9]{32}$/);
const db=new pg.Client({connectionString:process.env.DATABASE_URL});
let created=false,browser,logs='',resetAt=0,checks=0;
const children=[],pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(label){console.log('OK '+label);checks++;}
async function port(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const value=server.address().port;await new Promise(resolve=>server.close(resolve));return value;}
function start(args,env,cwd=root){const child=spawn(process.execPath,args,{cwd,env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{logs=(logs+data).slice(-10000);});children.push(child);}
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await pause(200);}throw new Error('Servidor indisponível: '+url);}

try {
  await db.connect();await db.query(`CREATE SCHEMA ${schema}`);created=true;await db.query(`SET search_path TO ${schema},public`);
  const dir=path.join(root,'database/migrations');
  for(const file of (await readdir(dir)).filter(file=>file.endsWith('.sql')).sort())await db.query(await readFile(path.join(dir,file),'utf8'));
  const password='test-'+randomUUID(),email='engagement-test@orion.local';
  const {hashPassword}=await import('../apps/api/src/auth/password.ts');
  await db.query('INSERT INTO ca_admins(email,password_hash) VALUES($1,$2)',[email,await hashPassword(password)]);
  const apiPort=await port(),webPort=await port(),base=`http://127.0.0.1:${apiPort}`,web=`http://127.0.0.1:${webPort}`;
  const connection=new URL(process.env.DATABASE_URL);connection.searchParams.set('options','-c search_path='+schema+',public');
  start(['--import','tsx','apps/api/src/server.ts'],{DATABASE_URL:connection.toString(),PORT:String(apiPort),APP_ORIGIN:web,NODE_ENV:'test'});
  start([path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(webPort),'--strictPort'],{API_PROXY_TARGET:base},path.join(root,'apps/web'));
  await Promise.all([ready(base+'/health'),ready(web)]);
  function client(){const cookies=new Map();let csrf='';return {
    async call(route,{method='GET',body,headers={},expected=200}={}){
      const reqHeaders={origin:web,cookie:[...cookies].map(([key,value])=>key+'='+value).join('; '),'x-csrf-token':csrf,...headers};
      if(body!==undefined)reqHeaders['content-type']='application/json';
      const response=await fetch(base+'/api/v1'+route,{method,headers:reqHeaders,body:body===undefined?undefined:JSON.stringify(body)});
      const reset=Number(response.headers.get('x-ratelimit-reset'));if(Number.isFinite(reset))resetAt=Date.now()+reset*1000;
      for(const cookie of response.headers.getSetCookie()){const [key,...value]=cookie.split(';')[0].split('=');cookies.set(key,value.join('='));}
      const result=await response.json();assert.equal(response.status,expected,`${method} ${route}: ${JSON.stringify(result)}`);
      if(route==='/admin/session'&&result.csrfToken)csrf=result.csrfToken;
      return result;
    },
    cookies,
  };}
  const admin=client(),a=client(),b=client();
  const action={headers:{'x-blog-action':'1'}};
  await admin.call('/admin/login',{method:'POST',body:{email,password}});await admin.call('/admin/session');
  const version=await admin.call('/admin/versoes',{method:'POST',body:{codigo:'9.0.0',sistema:'oriontn'},expected:201});
  const payload={titulo:'Post de engajamento',subtitulo:'Conteúdo para avaliação',slug:'post-de-engajamento',corpo:'<p>Conteúdo do post para o leitor.</p>',versao_id:version.id,sistema:'oriontn',tipo:'novidade',status:'publicado'};
  const post=await admin.call('/admin/publicacoes',{method:'POST',body:payload,expected:201});
  const draft=await admin.call('/admin/publicacoes',{method:'POST',body:{...payload,titulo:'Rascunho',slug:'rascunho',status:'rascunho'},expected:201});
  const scheduled=await admin.call('/admin/publicacoes',{method:'POST',body:{...payload,titulo:'Futuro',slug:'futuro',status:'agendado',publicado_em:new Date(Date.now()+86400000).toISOString()},expected:201});
  const reactions='/publicacoes/'+post.id+'/reacao',shares='/publicacoes/'+post.id+'/compartilhamentos',views='/publicacoes/'+post.id+'/leituras';
  const metrics=async()=>{const result=await admin.call('/admin/acompanhamento');return result.data.find(item=>item.id===post.id);};
  await a.call('/admin/acompanhamento',{expected:401});await a.call('/admin/publicacoes/'+post.id+'/motivos',{expected:401});
  await a.call('/publicacoes/id/'+post.id);assert.equal((await metrics()).visualizacoes,0);
  for(const hidden of [draft,scheduled,{id:999999}]){
    await a.call('/publicacoes/id/'+hidden.id,{expected:404});
    await a.call('/publicacoes/'+hidden.id+'/reacao',{expected:404});
    await a.call('/publicacoes/'+hidden.id+'/reacao',{...action,method:'PUT',body:{tipo:'like'},expected:404});
    await a.call('/publicacoes/'+hidden.id+'/compartilhamentos',{...action,method:'POST',body:{evento_id:randomUUID(),canal:'copiar'},expected:404});
    await a.call('/publicacoes/'+hidden.id+'/leituras',{...action,method:'POST',expected:404});
  }
  await a.call(reactions,{method:'PUT',body:{tipo:'like'},expected:403});
  await a.call(reactions,{method:'PUT',body:{tipo:'like'},headers:{'x-blog-action':'1',origin:'https://externo.invalid'},expected:403});
  await a.call(views,{method:'POST',expected:403});
  for(const body of [{tipo:'dislike',motivo:' '},{tipo:'dislike',motivo:'x'.repeat(1001)},{tipo:'dislike',motivo:'\u0000'},{tipo:'like',motivo:'inesperado'},{tipo:'invalido'}])await a.call(reactions,{...action,method:'PUT',body,expected:400});
  await a.call('/publicacoes/nope/reacao',{expected:400});
  check('painel privado, validações, CSRF/origem e posts não públicos protegidos');

  await a.call(views,{...action,method:'POST'});await a.call(views,{...action,method:'POST'});
  await b.call('/publicacoes/id/'+post.id);await b.call(views,{...action,method:'POST'});
  assert.equal((await metrics()).visualizacoes,2);
  await a.call(reactions,{...action,method:'PUT',body:{tipo:'like'}});await a.call(reactions,{...action,method:'PUT',body:{tipo:'like'}});
  assert.equal((await metrics()).likes,1);assert.equal((await a.call(reactions)).tipo,'like');
  const reason='<script>window.__feedbackXss=1</script> Não ficou claro como usar.';
  await b.call(reactions,{...action,method:'PUT',body:{tipo:'dislike',motivo:reason}});
  await a.call(reactions,{...action,method:'PUT',body:{tipo:'dislike',motivo:'Faltou um exemplo.'}});
  assert.equal((await metrics()).likes,0);assert.equal((await metrics()).dislikes,2);
  const reasons=await admin.call('/admin/publicacoes/'+post.id+'/motivos');assert.equal(reasons.meta.total,2);assert.deepEqual(Object.keys(reasons.data[0]).sort(),['atualizado_em','motivo']);
  await a.call(reactions,{...action,method:'PUT',body:{tipo:null}});assert.equal((await metrics()).dislikes,1);
  await b.call(reactions,{...action,method:'PUT',body:{tipo:'like'}});assert.equal((await admin.call('/admin/publicacoes/'+post.id+'/motivos')).meta.total,0);
  await b.call(reactions,{...action,method:'PUT',body:{tipo:'dislike',motivo:reason}});
  check('leituras únicas por visitante, uma reação por post, troca/remoção e motivos privados');

  const event=randomUUID();
  await a.call(shares,{...action,method:'POST',body:{evento_id:event,canal:'copiar'}});
  await a.call(shares,{...action,method:'POST',body:{evento_id:event,canal:'copiar'}});
  await b.call(shares,{...action,method:'POST',body:{evento_id:event,canal:'copiar'},expected:409});
  await a.call(shares,{...action,method:'POST',body:{evento_id:randomUUID(),canal:'nativo'}});
  assert.equal((await metrics()).compartilhamentos,2);
  await a.call(shares,{...action,method:'POST',body:{evento_id:'invalido',canal:'copiar'},expected:400});
  await admin.call('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,slug:'titulo-editado'}});
  assert.equal((await a.call('/publicacoes/id/'+post.id)).slug,'titulo-editado');
  await admin.call('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,slug:'titulo-editado',status:'rascunho'}});
  await a.call(reactions,{...action,method:'PUT',body:{tipo:'like'},expected:404});
  await admin.call('/admin/publicacoes/'+post.id,{method:'PUT',body:{...payload,slug:'titulo-editado'}});
  await db.query("UPDATE ca_produtos SET ativo=FALSE WHERE slug='oriontn'");
  await a.call('/publicacoes/id/'+post.id,{expected:404});await a.call(reactions,{...action,method:'PUT',body:{tipo:'like'},expected:404});
  await db.query("UPDATE ca_produtos SET ativo=TRUE WHERE slug='oriontn'");
  assert.equal((await admin.call('/admin/acompanhamento?produto=orionpro')).data.length,0);
  assert.equal((await admin.call('/admin/acompanhamento?tipo=correcao')).data.length,0);
  await admin.call('/admin/acompanhamento?page=-1',{expected:400});
  check('compartilhamento idempotente, link por ID estável, sistema inativo e filtros do painel');

  console.log('Aguardando renovação do rate limit antes dos cenários de navegador.');
  while(Date.now()<resetAt+250)await pause(Math.min(10000,resetAt+250-Date.now()));
  browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL==='chromium'?undefined:process.env.TEST_BROWSER_CHANNEL??'msedge',headless:true});
  const errors=[];
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(web+'/posts/'+post.id+'/palavra-chave-antiga');
  await page.getByRole('button',{name:'Gostei',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('button[aria-label="Gostei"]')?.getAttribute('aria-pressed')==='true');
  await page.reload();await page.waitForFunction(()=>document.querySelector('button[aria-label="Gostei"]')?.getAttribute('aria-pressed')==='true');
  assert.equal((await metrics()).visualizacoes,3);
  await page.getByRole('button',{name:'Não Gostei',exact:true}).click();
  assert(await page.getByRole('dialog').isVisible());assert(await page.getByRole('button',{name:'Enviar feedback'}).isDisabled());
  await page.getByLabel('Motivo do dislike').fill('Preciso de um passo a passo.');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Gostei',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Não Gostei',exact:true}).click();await page.getByLabel('Motivo do dislike').fill('Preciso de um passo a passo.');
  await page.getByRole('button',{name:'Enviar feedback'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'Não Gostei',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal((await metrics()).dislikes,2);
  await page.getByRole('button',{name:'Compartilhar publicação'}).click();await page.getByRole('status').filter({hasText:'Link copiado'}).waitFor();
  const shared=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(shared,web+'/posts/'+post.id+'/titulo-editado');
  // Contador pode concluir depois da cópia, aguardar a resposta da gravação.
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="Compartilhar publicação"]')?.disabled);
  assert.equal((await metrics()).compartilhamentos,3);
  const other=await browser.newContext(),recipient=await other.newPage();recipient.on('pageerror',error=>errors.push(error.message));
  await recipient.goto(shared);await recipient.getByRole('button',{name:'Gostei',exact:true}).waitFor();
  await recipient.waitForFunction(()=>!document.querySelector('button[aria-label="Gostei"]')?.disabled);
  assert(await recipient.getByText('Conteúdo do post para o leitor.',{exact:true}).isVisible());
  assert.equal((await metrics()).visualizacoes,4);
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancelado','AbortError');}}));
  await page.getByRole('button',{name:'Compartilhar publicação'}).click();await page.waitForFunction(()=>!document.querySelector('button[aria-label="Compartilhar publicação"]')?.disabled);
  assert.equal((await metrics()).compartilhamentos,3);
  await page.getByRole('button',{name:'Ativar tema escuro'}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const artifacts=path.join(root,'.test-results');await mkdir(artifacts,{recursive:true});
  await page.screenshot({path:path.join(artifacts,'feedback-mobile-dark.png'),fullPage:true});
  await page.getByRole('button',{name:'Não Gostei',exact:true}).click();await page.getByRole('button',{name:'Remover dislike'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal((await metrics()).dislikes,1);
  check('navegador: likes persistem, modal cancela/salva/remove, cópia e acesso direto; cancelamento não conta');

  const adminContext=await browser.newContext({viewport:{width:1366,height:1000}}),management=await adminContext.newPage();management.on('pageerror',error=>errors.push(error.message));
  await management.goto(web+'/gestao');await management.getByLabel('E-mail',{exact:true}).fill(email);await management.getByLabel('Senha',{exact:true}).fill(password);await management.getByRole('button',{name:'Entrar',exact:true}).click();
  await management.getByRole('button',{name:'Acompanhamento',exact:true}).click();
  await management.getByRole('button',{name:/Com feedback negativo/}).click();
  const row=management.locator('tbody tr').filter({hasText:'Post de engajamento'});await row.waitFor();
  const cells=await row.locator('td').allTextContents();assert.deepEqual(cells.slice(0,4),['4','0','1','3']);
  await row.getByRole('button',{name:/Ver motivos/}).click();await management.locator('.dislike-reasons li p').waitFor();
  assert.equal(await management.locator('.dislike-reasons li p').textContent(),reason);assert.equal(await management.evaluate(()=>window.__feedbackXss),undefined);
  await management.screenshot({path:path.join(artifacts,'analytics-desktop.png'),fullPage:true});
  await management.getByRole('button',{name:'Fechar motivos',exact:true}).click();
  await management.getByRole('button',{name:'OrionPRO',exact:true}).click();await management.getByRole('button',{name:'Maximizar resultados por publicação',exact:true}).click();await management.getByText('Nenhuma publicação encontrada para estes filtros.',{exact:true}).waitFor();
  await management.getByRole('button',{name:'OrionTN',exact:true}).click();await management.getByRole('button',{name:'Maximizar resultados por publicação',exact:true}).click();await row.waitFor();
  await management.setViewportSize({width:390,height:844});await management.getByRole('button',{name:'Ativar tema escuro'}).click();
  assert(await management.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await management.screenshot({path:path.join(artifacts,'analytics-mobile-dark.png'),fullPage:true});
  await management.getByRole('button',{name:'Publicações',exact:true}).click();
  await management.locator('article').filter({hasText:'Post de engajamento'}).getByRole('button',{name:/Post de engajamento/}).click();
  await management.getByText('Conteúdo do post para o leitor.',{exact:true}).waitFor();
  assert.equal(await management.locator('.post-feedback').count(),0);assert.equal((await metrics()).visualizacoes,4);
  assert.deepEqual(errors,[]);
  check('Gestão: contadores, motivos escapados contra XSS, filtros, mobile/tema e prévia sem contabilizar leitura');

  // Paginação de motivos e exclusão em cascata, sempre no schema temporário.
  for(let i=0;i<22;i++)await db.query("INSERT INTO ca_reacoes(post_id,visitante_token_hash,tipo,motivo) VALUES($1,$2,'dislike',$3)",[post.id,createHash('sha256').update('pagination-'+i).digest('hex'),'Motivo '+i]);
  assert.equal((await admin.call('/admin/publicacoes/'+post.id+'/motivos?page=1')).data.length,20);
  assert.equal((await admin.call('/admin/publicacoes/'+post.id+'/motivos?page=2')).data.length,3);
  await admin.call('/admin/publicacoes/'+post.id,{method:'DELETE'});
  for(const table of ['ca_reacoes','ca_compartilhamentos'])assert.equal((await db.query(`SELECT COUNT(*)::int AS total FROM ${table} WHERE post_id=$1`,[post.id])).rows[0].total,0);
  await a.call('/publicacoes/id/'+post.id,{expected:404});
  check('paginação de motivos e limpeza das métricas ao excluir o post');
  console.log(`Verificação de engajamento concluída: ${checks} grupos aprovados.`);
} catch(error) {
  console.error(error);console.error(logs);
  if(browser)for(const context of browser.contexts())for(const page of context.pages()){await mkdir(path.join(root,'.test-results'),{recursive:true});await page.screenshot({path:path.join(root,'.test-results','engagement-failure.png'),fullPage:true}).catch(()=>{});}
  process.exitCode=1;
} finally {
  await browser?.close();
  for(const child of children)if(child.exitCode===null){const done=once(child,'exit');child.kill();await Promise.race([done,pause(3000)]);}
  if(created){await db.query('SET search_path TO public');await db.query(`DROP SCHEMA ${schema} CASCADE`);console.log('Schema temporário de engajamento removido; dados reais preservados.');}
  await db.end();
}
