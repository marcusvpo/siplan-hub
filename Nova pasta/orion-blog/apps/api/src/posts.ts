/*Author: Erik Marques*/
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db/index.js';
import { requireAdmin } from './auth/session.js';
import { cleanContent,idSchema,postSchema,slugSchema,systemSchema,typeSchema,visiblePost } from './content.js';
import { visitorHash } from './visitor.js';
import { requirePublicAction } from './public-action.js';
import { publicationSearchSchema, publicationSearchText } from './listing-search.js';

const join = 'FROM ca_atualizacoes a JOIN ca_versoes v ON v.id=a.versao_id JOIN ca_produtos p ON p.id=v.produto_id';
const fields = `a.id,a.titulo,a.resumo,a.resumo AS subtitulo,a.slug,a.versao_id,v.codigo AS versao,
  p.slug AS sistema,p.nome AS sistema_nome,a.tipo,a.publicado_em,a.critico,a.destaque,a.corpo_formato,a.capa_imagem_id,
  CASE WHEN a.status='agendado' AND a.publicado_em<=NOW() THEN 'publicado' ELSE a.status END AS status,
  json_build_array(json_build_object('nome',p.nome,'slug',p.slug)) AS produtos,
  ARRAY[a.tipo] AS tipos,(SELECT COUNT(*)::int FROM ca_itens i WHERE i.atualizacao_id=a.id) AS total_itens`;
const serialize = (row: any) => ({...row,id:Number(row.id),versao_id:Number(row.versao_id)});
const querySchema = z.object({produto:systemSchema.optional(),tipo:typeSchema.optional(),versao_id:idSchema.optional(),
  ordem:z.enum(['destaques','recentes','antigas']).default('destaques'),busca:publicationSearchSchema,
  page:z.coerce.number().int().min(1).max(10000).default(1),limit:z.coerce.number().int().min(1).max(50).default(20)});

async function details(row: any) {
  const items = await pool.query(`SELECT i.*,COALESCE(json_agg(json_build_object('texto',s.texto,'ordem',s.ordem) ORDER BY s.ordem)
    FILTER (WHERE s.id IS NOT NULL),'[]') AS passos FROM ca_itens i LEFT JOIN ca_passos s ON s.item_id=i.id
    WHERE i.atualizacao_id=$1 GROUP BY i.id ORDER BY i.ordem,i.id`,[row.id]);
  return {...serialize(row),itens:items.rows.map(item=>({...item,id:Number(item.id)}))};
}

export async function postRoutes(app: FastifyInstance) {
  app.get('/api/v1/publicacoes',async (request,reply)=>{
    const parsed=querySchema.safeParse(request.query);
    if(!parsed.success) return reply.code(400).send({error:'invalid_query',details:parsed.error.flatten()});
    const {produto='',tipo='',versao_id=0,page,limit,ordem,busca}=parsed.data;
    const args=[visitorHash(request,reply),produto,tipo,versao_id,busca];
    const where=`WHERE p.ativo AND ${visiblePost} AND ($2='' OR p.slug=$2) AND ($3='' OR a.tipo=$3) AND ($4=0 OR a.versao_id=$4)
      AND ($5='' OR strpos(${publicationSearchText},$5)>0)`;
    const orderBy={recentes:'a.publicado_em DESC,a.id DESC',antigas:'a.publicado_em ASC,a.id ASC',destaques:'a.destaque DESC,a.publicado_em DESC,a.id DESC'}[ordem];
    const result=await pool.query(`SELECT ${fields},EXISTS(SELECT 1 FROM ca_leituras l WHERE l.atualizacao_id=a.id AND l.visitante_token_hash=$1) AS ja_lido
      ${join} ${where} ORDER BY ${orderBy} LIMIT $6 OFFSET $7`,[...args,limit,(page-1)*limit]);
    const count=await pool.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM ca_leituras l
      WHERE l.atualizacao_id=a.id AND l.visitante_token_hash=$1))::int AS nao_lidas ${join} ${where}`,args);
    return {data:result.rows.map(serialize),meta:{page,limit,...count.rows[0]}};
  });
  app.get('/api/v1/publicacoes/:slug',async(request,reply)=>{
    const params=z.object({slug:slugSchema}).safeParse(request.params);
    if(!params.success) return reply.code(400).send({error:'invalid_slug'});
    const result=await pool.query(`SELECT ${fields},a.corpo,EXISTS(SELECT 1 FROM ca_leituras l
      WHERE l.atualizacao_id=a.id AND l.visitante_token_hash=$2) AS ja_lido ${join}
      WHERE a.slug=$1 AND p.ativo AND ${visiblePost}`,[params.data.slug,visitorHash(request,reply)]);
    if(!result.rows[0]) return reply.code(404).send({error:'not_found'});
    return details(result.rows[0]);
  });
  app.get('/api/v1/publicacoes/id/:id',async(request,reply)=>{
    reply.header('Cache-Control','private, no-store');
    const params=z.object({id:idSchema}).safeParse(request.params);
    if(!params.success) return reply.code(400).send({error:'invalid_id'});
    const result=await pool.query(`SELECT ${fields},a.corpo,EXISTS(SELECT 1 FROM ca_leituras l
      WHERE l.atualizacao_id=a.id AND l.visitante_token_hash=$2) AS ja_lido ${join}
      WHERE a.id=$1 AND p.ativo AND ${visiblePost}`,[params.data.id,visitorHash(request,reply)]);
    if(!result.rows[0]) return reply.code(404).send({error:'not_found',message:'Publicação não encontrada ou indisponível.'});
    return details(result.rows[0]);
  });
  app.post('/api/v1/publicacoes/:id/leituras',{config:{rateLimit:{max:60,timeWindow:'1 minute'}}},async(request,reply)=>{
    if(!requirePublicAction(request,reply)) return;
    const params=z.object({id:idSchema}).safeParse(request.params);
    if(!params.success) return reply.code(400).send({error:'invalid_id'});
    const result=await pool.query(`INSERT INTO ca_leituras(visitante_token_hash,atualizacao_id)
      SELECT $1,a.id ${join} WHERE a.id=$2 AND p.ativo AND ${visiblePost}
      ON CONFLICT(visitante_token_hash,atualizacao_id) DO NOTHING RETURNING atualizacao_id`,[visitorHash(request,reply),params.data.id]);
    // Marcar novamente um post existente é uma operação idempotente.
    if(!result.rowCount) {
      const exists=await pool.query(`SELECT a.id ${join} WHERE a.id=$1 AND p.ativo AND ${visiblePost}`,[params.data.id]);
      if(!exists.rowCount) return reply.code(404).send({error:'not_found'});
    }
    return {ok:true};
  });
  app.get('/api/v1/admin/publicacoes',async(request,reply)=>{
    if(!await requireAdmin(request,reply)) return;
    const result=await pool.query(`SELECT ${fields} ${join} ORDER BY a.criado_em DESC,a.id DESC`);
    return {data:result.rows.map(serialize)};
  });
  app.get('/api/v1/admin/publicacoes/:id',async(request,reply)=>{
    if(!await requireAdmin(request,reply)) return;
    const params=z.object({id:idSchema}).safeParse(request.params);
    if(!params.success) return reply.code(400).send({error:'invalid_id'});
    const result=await pool.query(`SELECT ${fields},a.corpo ${join} WHERE a.id=$1`,[params.data.id]);
    if(!result.rows[0]) return reply.code(404).send({error:'not_found'});
    return details(result.rows[0]);
  });

  for(const method of ['POST','PUT'] as const) app.route({method,url:'/api/v1/admin/publicacoes'+(method==='PUT'?'/:id':''),handler:async(request,reply)=>{
    const session=await requireAdmin(request,reply);
    if(!session) return;
    const params=z.object({id:idSchema}).safeParse(request.params);
    if(method==='PUT'&&!params.success) return reply.code(400).send({error:'invalid_id'});
    const parsed=postSchema.safeParse(request.body);
    if(!parsed.success) return reply.code(400).send({error:'validation_failed',details:parsed.error.flatten()});
    const data=parsed.data;
    if(data.status==='agendado'&&(!data.publicado_em||Date.parse(data.publicado_em)<=Date.now()))
      return reply.code(400).send({error:'invalid_schedule',message:'Escolha uma data e hora futuras para agendar.'});
    const content=cleanContent(data.corpo);
    if(!content.hasContent) return reply.code(400).send({message:'Inclua texto ou uma imagem no conteúdo.'});
    if(content.imageIds.length>30) return reply.code(400).send({message:'Use no máximo 30 imagens por publicação.'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const version=await client.query(`SELECT v.id FROM ca_versoes v JOIN ca_produtos p ON p.id=v.produto_id WHERE v.id=$1 AND p.slug=$2 AND p.ativo`,[data.versao_id,data.sistema]);
      if(!version.rowCount) {await client.query('ROLLBACK');return reply.code(400).send({error:'invalid_version',message:'A versão precisa pertencer ao sistema selecionado.'});}
      const id=method==='PUT'&&params.success?params.data.id:0;
      let oldDate: Date | null=null;
      let oldCover: string | null=null;
      if(id) {
        const old=await client.query('SELECT status,publicado_em,capa_imagem_id FROM ca_atualizacoes WHERE id=$1 FOR UPDATE',[id]);
        if(!old.rowCount) {await client.query('ROLLBACK');return reply.code(404).send({error:'not_found'});}
        oldCover=old.rows[0].capa_imagem_id;
        if(old.rows[0].status==='publicado'||(old.rows[0].status==='agendado'&&old.rows[0].publicado_em<=new Date())) oldDate=old.rows[0].publicado_em;
      }
      // Omitir o campo preserva a capa; null remove. O vínculo também controla a visibilidade da imagem.
      const coverId=data.capa_imagem_id===undefined?oldCover:data.capa_imagem_id;
      const imageIds=[...new Set([...content.imageIds,...(coverId?[coverId]:[])])];
      const images=await client.query(`SELECT id FROM ca_imagens m WHERE id=ANY($1::uuid[]) AND (admin_id=$2 OR EXISTS
        (SELECT 1 FROM ca_post_imagens pi WHERE pi.imagem_id=m.id AND pi.post_id=$3)) ORDER BY id FOR UPDATE`,[imageIds,session.adminId,id]);
      if(images.rowCount!==imageIds.length) {await client.query('ROLLBACK');return reply.code(400).send({message:'Uma imagem do conteúdo ou da capa está indisponível. Insira-a novamente.'});}
      const publishedAt=data.status==='agendado'?data.publicado_em:data.status==='publicado'?(oldDate??new Date()):null;
      const values=[data.titulo,data.subtitulo,data.slug,content.html,data.versao_id,data.tipo,data.status,publishedAt,coverId];
      const result=id
        ?await client.query(`UPDATE ca_atualizacoes SET titulo=$1,resumo=$2,slug=$3,corpo=$4,versao_id=$5,tipo=$6,status=$7,publicado_em=$8,capa_imagem_id=$9,corpo_formato='html',atualizado_em=NOW() WHERE id=$10 RETURNING id`,[...values,id])
        :await client.query(`INSERT INTO ca_atualizacoes(titulo,resumo,slug,corpo,versao_id,tipo,status,publicado_em,capa_imagem_id,corpo_formato,autor_id,autor_nome)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'html',$10,$11) RETURNING id`,[...values,session.adminId,session.email]);
      const postId=Number(result.rows[0].id);
      await client.query('DELETE FROM ca_post_imagens WHERE post_id=$1',[postId]);
      for(const imageId of imageIds) await client.query('INSERT INTO ca_post_imagens(post_id,imagem_id) VALUES($1,$2)',[postId,imageId]);
      await client.query("INSERT INTO ca_auditoria(admin_id,acao,entidade,entidade_id,ip) VALUES($1,$2,'post',$3,$4)",[session.adminId,id?'editar':'criar',postId,request.ip]);
      await client.query('COMMIT');
      return reply.code(id?200:201).send({ok:true,id:postId,slug:data.slug});
    } catch(error:any) {
      await client.query('ROLLBACK');
      if(error.code==='23505') return reply.code(409).send({error:'slug_already_exists',message:'Já existe uma publicação com essa palavra-chave.'});
      throw error;
    } finally {client.release();}
  }});

  app.post('/api/v1/admin/publicacoes/:id/publicar',async(request,reply)=>{
    const session=await requireAdmin(request,reply);
    if(!session) return;
    const params=z.object({id:idSchema}).safeParse(request.params);
    if(!params.success) return reply.code(400).send({error:'invalid_id'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const result=await client.query("UPDATE ca_atualizacoes SET status='publicado',publicado_em=NOW(),atualizado_em=NOW() WHERE id=$1 AND status IN ('rascunho','agendado') RETURNING id",[params.data.id]);
      if(!result.rowCount) {await client.query('ROLLBACK');return reply.code(404).send({error:'not_found'});}
      await client.query("INSERT INTO ca_auditoria(admin_id,acao,entidade,entidade_id,ip) VALUES($1,'publicar','post',$2,$3)",[session.adminId,params.data.id,request.ip]);
      await client.query('COMMIT');return {ok:true};
    } catch(error){await client.query('ROLLBACK');throw error;} finally {client.release();}
  });
  app.delete('/api/v1/admin/publicacoes/:id',async(request,reply)=>{
    const session=await requireAdmin(request,reply);
    if(!session) return;
    const params=z.object({id:idSchema}).safeParse(request.params);
    if(!params.success) return reply.code(400).send({error:'invalid_id'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const result=await client.query('DELETE FROM ca_atualizacoes WHERE id=$1 RETURNING id',[params.data.id]);
      if(!result.rowCount) {await client.query('ROLLBACK');return reply.code(404).send({error:'not_found'});}
      await client.query("INSERT INTO ca_auditoria(admin_id,acao,entidade,entidade_id,ip) VALUES($1,'excluir','post',$2,$3)",[session.adminId,params.data.id,request.ip]);
      await client.query('COMMIT');return {ok:true};
    } catch(error){await client.query('ROLLBACK');throw error;} finally {client.release();}
  });
}
