/*Author: Erik Marques*/
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db/index.js';
import { requireAdmin } from './auth/session.js';
import { systemSchema, typeSchema, versionSchema, visiblePost } from './content.js';
import { visitorHash } from './visitor.js';

const numericVersion = `CASE WHEN v.codigo ~ '^[0-9]+([.][0-9]+)*$' THEN string_to_array(v.codigo,'.')::numeric[] END`;
const versionOrders = {
  versao_desc: `${numericVersion} DESC NULLS LAST,v.codigo DESC,v.id DESC`,
  versao_asc: `${numericVersion} ASC NULLS LAST,v.codigo ASC,v.id ASC`,
  criacao_desc: 'v.criado_em DESC,v.id DESC',
  criacao_asc: 'v.criado_em ASC,v.id ASC',
};
const versionQuery = z.object({
  produto: systemSchema.optional(), tipo: typeSchema.optional(),
  ordem: z.enum(['versao_desc','versao_asc','criacao_desc','criacao_asc']).default('criacao_desc'),
  busca: z.string().trim().max(30).regex(/^[0-9.]*$/, 'Use somente números e pontos para buscar uma versão.').default(''),
});

export async function versionRoutes(app: FastifyInstance) {
  app.get('/api/v1/versoes', async (request, reply) => {
    const parsed = versionQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_query', details: parsed.error.flatten() });
    const { produto = '', tipo = '', ordem, busca } = parsed.data;
    const result = await pool.query(`SELECT v.id,v.codigo,v.criado_em,p.slug AS sistema,p.nome AS sistema_nome,
      MAX(a.publicado_em) AS ultima_publicacao,COUNT(a.id)::int AS total_posts,
      COUNT(a.id) FILTER (WHERE l.atualizacao_id IS NULL)::int AS nao_lidos
      FROM ca_versoes v JOIN ca_produtos p ON p.id=v.produto_id
      LEFT JOIN ca_atualizacoes a ON a.versao_id=v.id AND ${visiblePost} AND ($3='' OR a.tipo=$3)
      LEFT JOIN ca_leituras l ON l.atualizacao_id=a.id AND l.visitante_token_hash=$1
      WHERE p.ativo AND ($2='' OR p.slug=$2) AND ($4='' OR strpos(v.codigo,$4)>0)
      GROUP BY v.id,p.id ORDER BY ${versionOrders[ordem]}`, [visitorHash(request, reply),produto,tipo,busca]);
    return { data: result.rows.map(row => ({ ...row,id:Number(row.id) })), meta: { nao_lidas: result.rows.reduce((n,row) => n+row.nao_lidos,0) } };
  });
  app.get('/api/v1/admin/versoes', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const result = await pool.query(`SELECT v.id,v.codigo,v.criado_em,p.slug AS sistema,p.nome AS sistema_nome,COUNT(a.id)::int AS total_posts
      FROM ca_versoes v JOIN ca_produtos p ON p.id=v.produto_id LEFT JOIN ca_atualizacoes a ON a.versao_id=v.id
      WHERE p.ativo GROUP BY v.id,p.id ORDER BY v.criado_em DESC,v.id DESC`);
    return { data: result.rows.map(row => ({ ...row,id:Number(row.id) })) };
  });
  app.post('/api/v1/admin/versoes', async (request, reply) => {
    const session = await requireAdmin(request, reply);
    if (!session) return;
    const parsed = versionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error:'validation_failed',details:parsed.error.flatten() });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`INSERT INTO ca_versoes(codigo,produto_id)
        SELECT $1,id FROM ca_produtos WHERE slug=$2 AND ativo RETURNING id,codigo`, [parsed.data.codigo,parsed.data.sistema]);
      if (!result.rows[0]) { await client.query('ROLLBACK'); return reply.code(400).send({message:'Sistema indisponível.'}); }
      const row = result.rows[0];
      await client.query("INSERT INTO ca_auditoria(admin_id,acao,entidade,entidade_id,ip) VALUES ($1,'criar','versao',$2,$3)",[session.adminId,row.id,request.ip]);
      await client.query('COMMIT');
      return reply.code(201).send({id:Number(row.id),codigo:row.codigo,sistema:parsed.data.sistema});
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.code==='23505') return reply.code(409).send({error:'version_already_exists',message:'Esta versão já existe neste sistema.'});
      throw error;
    } finally { client.release(); }
  });
}
