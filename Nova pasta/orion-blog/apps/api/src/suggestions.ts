/*Author: Erik Marques*/
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db/index.js';
import { requirePublicAction } from './public-action.js';
import { requireAdmin } from './auth/session.js';
import { publicationSearchSchema } from './listing-search.js';

const shortText = (max: number) => z.string().trim().min(1, 'Campo obrigatório.').max(max, `Use até ${max} caracteres.`)
  .regex(/^[^\u0000-\u001f\u007f]*$/, 'Remova caracteres de controle.');
const suggestionSchema = z.object({
  envio_id: z.string().uuid(),
  nome: shortText(100),
  cartorio: shortText(180),
  sugestao: z.string().trim().min(1, 'Descreva sua sugestão.').max(4000, 'Use até 4000 caracteres.')
    .regex(/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/, 'Remova caracteres de controle.'),
}).strict();

const inboxQuery = z.object({
  busca: publicationSearchSchema,
  ordem: z.enum(['recentes', 'antigas']).default('recentes'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.enum(['5', '10', '20']).default('5').transform(Number),
});

export async function suggestionRoutes(app: FastifyInstance) {
  app.get('/api/v1/admin/sugestoes', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    if (!await requireAdmin(request, reply)) return;
    const query = inboxQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'invalid_query', message: 'Verifique os filtros das sugestões.' });
    const { busca, ordem, page, limit } = query.data;
    const order = ordem === 'antigas' ? 'criado_em ASC, id ASC' : 'criado_em DESC, id DESC';
    const result = await pool.query(`WITH filtered AS (
      SELECT id,nome,cartorio,sugestao,criado_em FROM ca_sugestoes
      WHERE $1='' OR strpos(translate(lower(regexp_replace(concat_ws(' ',nome,cartorio,sugestao),
        '[[:space:]]+',' ','g')),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),$1)>0
    ), pagination AS (
      SELECT COUNT(*)::int AS total, LEAST($2::int,GREATEST(1,CEIL(COUNT(*)/$3::numeric)::int)) AS page FROM filtered
    ), paged AS (
      SELECT * FROM filtered ORDER BY ${order} LIMIT $3 OFFSET ((SELECT page FROM pagination)-1)*$3
    ) SELECT COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY ${order}) FROM paged),'[]'::jsonb) AS data,
      (SELECT jsonb_build_object('page',page,'limit',$3::int,'total',total) FROM pagination) AS meta`, [busca, page, limit]);
    return result.rows[0];
  });

  app.post('/api/v1/sugestoes', {
    bodyLimit: 32768,
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!requirePublicAction(request, reply)) return;
    const body = suggestionSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'validation_failed', details: body.error.flatten() });
    const { envio_id, nome, cartorio, sugestao } = body.data;
    const result = await pool.query(`INSERT INTO ca_sugestoes(id,nome,cartorio,sugestao)
      VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id`, [envio_id, nome, cartorio, sugestao]);
    if (!result.rowCount) {
      // Uma nova tentativa após falha de rede não duplica o mesmo envio.
      const existing = await pool.query('SELECT 1 FROM ca_sugestoes WHERE id=$1 AND nome=$2 AND cartorio=$3 AND sugestao=$4', [envio_id, nome, cartorio, sugestao]);
      if (!existing.rowCount) return reply.code(409).send({ error: 'submission_conflict', message: 'Não foi possível confirmar este envio. Feche o formulário e tente novamente.' });
    }
    return reply.code(result.rowCount ? 201 : 200).send({ ok: true });
  });
}
