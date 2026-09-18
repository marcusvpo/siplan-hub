/*Author: Erik Marques*/
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db/index.js';
import { requireAdmin } from './auth/session.js';
import { idSchema, visiblePost } from './content.js';
import { requirePublicAction } from './public-action.js';
import { visitorHash } from './visitor.js';

const paramsSchema = z.object({ id: idSchema });
const reactionSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('like') }).strict(),
  z.object({ tipo: z.literal('dislike'), motivo: z.string().trim().min(1, 'Descreva o motivo.').max(1000, 'Use até 1000 caracteres.').regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f]*$/, 'Remova caracteres de controle.') }).strict(),
  z.object({ tipo: z.null() }).strict(),
]);
const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });
const joinedPosts = 'FROM ca_atualizacoes a JOIN ca_versoes v ON v.id=a.versao_id JOIN ca_produtos p ON p.id=v.produto_id';
const publicPost = `${joinedPosts} WHERE a.id=$1 AND p.ativo AND ${visiblePost}`;

export async function engagementRoutes(app: FastifyInstance) {
  app.get('/api/v1/publicacoes/:id/reacao', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_id' });
    const result = await pool.query(`SELECT r.tipo,r.motivo FROM (SELECT a.id ${publicPost}) post
      LEFT JOIN ca_reacoes r ON r.post_id=post.id AND r.visitante_token_hash=$2`, [params.data.id, visitorHash(request, reply)]);
    if (!result.rowCount) return reply.code(404).send({ error: 'not_found' });
    return result.rows[0];
  });

  app.put('/api/v1/publicacoes/:id/reacao', { bodyLimit: 8192, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (!requirePublicAction(request, reply)) return;
    const params = paramsSchema.safeParse(request.params), body = reactionSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'validation_failed', message: 'Informe uma reação válida e, para dislike, um motivo de até 1000 caracteres.' });
    const hash = visitorHash(request, reply), data = body.data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // A publicação não pode ser retirada/excluída durante a gravação da interação.
      const post = await client.query(`SELECT a.id ${publicPost} FOR SHARE OF a,p`, [params.data.id]);
      if (!post.rowCount) { await client.query('ROLLBACK'); return reply.code(404).send({ error: 'not_found' }); }
      if (data.tipo === null) await client.query('DELETE FROM ca_reacoes WHERE post_id=$1 AND visitante_token_hash=$2', [params.data.id, hash]);
      else await client.query(`INSERT INTO ca_reacoes(post_id,visitante_token_hash,tipo,motivo) VALUES($1,$2,$3,$4)
        ON CONFLICT(post_id,visitante_token_hash) DO UPDATE SET tipo=EXCLUDED.tipo,motivo=EXCLUDED.motivo,atualizado_em=NOW()
        WHERE ca_reacoes.tipo IS DISTINCT FROM EXCLUDED.tipo OR ca_reacoes.motivo IS DISTINCT FROM EXCLUDED.motivo`,
        [params.data.id, hash, data.tipo, data.tipo === 'dislike' ? data.motivo : null]);
      await client.query('COMMIT');
      return { tipo: data.tipo, motivo: data.tipo === 'dislike' ? data.motivo : null };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });

  app.post('/api/v1/publicacoes/:id/compartilhamentos', { bodyLimit: 2048, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (!requirePublicAction(request, reply)) return;
    const params = paramsSchema.safeParse(request.params);
    const body = z.object({ evento_id: z.string().uuid(), canal: z.enum(['copiar','nativo']) }).strict().safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'validation_failed' });
    const hash = visitorHash(request, reply), client = await pool.connect();
    try {
      await client.query('BEGIN');
      const post = await client.query(`SELECT a.id ${publicPost} FOR SHARE OF a,p`, [params.data.id]);
      if (!post.rowCount) { await client.query('ROLLBACK'); return reply.code(404).send({ error: 'not_found' }); }
      const result = await client.query(`INSERT INTO ca_compartilhamentos(evento_id,post_id,visitante_token_hash,canal)
        VALUES($1,$2,$3,$4) ON CONFLICT(evento_id) DO NOTHING RETURNING evento_id`, [body.data.evento_id, params.data.id, hash, body.data.canal]);
      if (!result.rowCount) {
        const existing = await client.query('SELECT 1 FROM ca_compartilhamentos WHERE evento_id=$1 AND post_id=$2 AND visitante_token_hash=$3 AND canal=$4', [body.data.evento_id, params.data.id, hash, body.data.canal]);
        if (!existing.rowCount) { await client.query('ROLLBACK'); return reply.code(409).send({ error: 'event_conflict' }); }
      }
      await client.query('COMMIT'); return { ok: true };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });

  app.get('/api/v1/admin/publicacoes/:id/motivos', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    reply.header('Cache-Control', 'private, no-store');
    const params = paramsSchema.safeParse(request.params), query = pageSchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: 'invalid_query' });
    const exists = await pool.query('SELECT id FROM ca_atualizacoes WHERE id=$1', [params.data.id]);
    if (!exists.rowCount) return reply.code(404).send({ error: 'not_found' });
    const limit = 20, { page } = query.data;
    const result = await pool.query(`SELECT motivo,atualizado_em FROM ca_reacoes WHERE post_id=$1 AND tipo='dislike'
      ORDER BY atualizado_em DESC,visitante_token_hash LIMIT $2 OFFSET $3`, [params.data.id,limit,(page-1)*limit]);
    const total = await pool.query("SELECT COUNT(*)::int AS total FROM ca_reacoes WHERE post_id=$1 AND tipo='dislike'", [params.data.id]);
    return { data: result.rows, meta: {page,limit,total:total.rows[0].total} };
  });
}
