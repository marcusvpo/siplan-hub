/*Author: Erik Marques*/
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db/index.js';
import { requireAdmin } from './auth/session.js';
import { systemSchema, typeSchema, visiblePost } from './content.js';
import { publicationSearchSchema } from './listing-search.js';

const orders = {
  feedback: 'dislikes DESC, visualizacoes DESC, id DESC',
  visualizacoes: 'visualizacoes DESC, id DESC',
  compartilhamentos: 'compartilhamentos DESC, id DESC',
  aprovacao: 'aprovacao ASC NULLS LAST, (likes + dislikes) DESC, id DESC',
  recentes: 'criado_em DESC, id DESC',
} as const;
const querySchema = z.object({
  produto: systemSchema.optional(), tipo: typeSchema.optional(), busca: publicationSearchSchema,
  status: z.enum(['todos', 'publicado', 'rascunho', 'agendado', 'arquivado']).default('todos'),
  foco: z.enum(['todos', 'feedback', 'sem_visualizacoes', 'sem_avaliacoes']).default('todos'),
  ordem: z.enum(['feedback', 'visualizacoes', 'compartilhamentos', 'aprovacao', 'recentes']).default('feedback'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.enum(['5', '10', '20']).default('20').transform(Number),
  incluir_publicacoes: z.enum(['true', 'false']).default('true').transform(value => value === 'true'),
});

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/api/v1/admin/acompanhamento', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    reply.header('Cache-Control', 'private, no-store');
    const query = querySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'invalid_query', message: 'Verifique os filtros do acompanhamento.' });
    const { produto = '', tipo = '', busca, status, foco, ordem, page, limit, incluir_publicacoes } = query.data;
    // Uma única consulta garante o mesmo retrato para resumo, contadores e página.
    // Agregações separadas evitam multiplicar leituras por reações/compartilhamentos.
    const result = await pool.query(`WITH posts AS (
      SELECT a.id,a.titulo,a.slug,a.tipo,a.criado_em,a.publicado_em,v.codigo AS versao,
        p.slug AS sistema,p.nome AS sistema_nome,
        (p.ativo AND ${visiblePost}) AS disponivel,
        CASE WHEN a.status='agendado' AND a.publicado_em<=NOW() THEN 'publicado' ELSE a.status END AS status
      FROM ca_atualizacoes a JOIN ca_versoes v ON v.id=a.versao_id JOIN ca_produtos p ON p.id=v.produto_id
      WHERE ($1='' OR p.slug=$1) AND ($2='' OR a.tipo=$2)
        AND ($3='' OR strpos(translate(lower(regexp_replace(a.titulo,'[[:space:]]+',' ','g')),
          'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),$3)>0)
    ), scoped AS (SELECT * FROM posts WHERE $4='todos' OR status=$4),
    views AS (SELECT l.atualizacao_id,COUNT(*)::int AS total FROM ca_leituras l JOIN scoped s ON s.id=l.atualizacao_id GROUP BY l.atualizacao_id),
    reactions AS (SELECT r.post_id,COUNT(*) FILTER(WHERE r.tipo='like')::int AS likes,
      COUNT(*) FILTER(WHERE r.tipo='dislike')::int AS dislikes FROM ca_reacoes r JOIN scoped s ON s.id=r.post_id GROUP BY r.post_id),
    shares AS (SELECT c.post_id,COUNT(*)::int AS total FROM ca_compartilhamentos c JOIN scoped s ON s.id=c.post_id GROUP BY c.post_id),
    metrics AS (SELECT s.*,COALESCE(v.total,0) AS visualizacoes,COALESCE(r.likes,0) AS likes,
      COALESCE(r.dislikes,0) AS dislikes,COALESCE(c.total,0) AS compartilhamentos,
      ROUND(100.0*r.likes/NULLIF(r.likes+r.dislikes,0),1) AS aprovacao
      FROM scoped s LEFT JOIN views v ON v.atualizacao_id=s.id LEFT JOIN reactions r ON r.post_id=s.id LEFT JOIN shares c ON c.post_id=s.id),
    filtered AS (SELECT * FROM metrics WHERE $5='todos' OR ($5='feedback' AND dislikes>0)
      OR ($5='sem_visualizacoes' AND disponivel AND visualizacoes=0)
      OR ($5='sem_avaliacoes' AND disponivel AND visualizacoes>0 AND likes+dislikes=0)),
    pagination AS (SELECT COUNT(*)::int AS total,LEAST($6::int,GREATEST(1,CEIL(COUNT(*)/$7::numeric)::int)) AS page FROM filtered),
    paged AS (SELECT * FROM filtered WHERE $8::boolean ORDER BY ${orders[ordem]} LIMIT $7 OFFSET ((SELECT page FROM pagination)-1)*$7),
    summary AS (SELECT COUNT(*)::int AS publicacoes,COUNT(*) FILTER(WHERE disponivel)::int AS disponiveis,
      COALESCE(SUM(visualizacoes),0)::bigint AS visualizacoes,COALESCE(SUM(likes),0)::bigint AS likes,
      COALESCE(SUM(dislikes),0)::bigint AS dislikes,COALESCE(SUM(compartilhamentos),0)::bigint AS compartilhamentos,
      ROUND(100.0*SUM(likes)/NULLIF(SUM(likes+dislikes),0),1) AS aprovacao,
      COUNT(*) FILTER(WHERE dislikes>0)::int AS com_feedback,
      COUNT(*) FILTER(WHERE disponivel AND visualizacoes=0)::int AS sem_visualizacoes,
      COUNT(*) FILTER(WHERE disponivel AND visualizacoes>0 AND likes+dislikes=0)::int AS sem_avaliacoes,
      (SELECT COUNT(DISTINCT l.visitante_token_hash)::int FROM ca_leituras l JOIN scoped s ON s.id=l.atualizacao_id) AS visitantes_unicos
      FROM metrics)
    SELECT COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY ${orders[ordem]}) FROM paged),'[]'::jsonb) AS data,
      (SELECT to_jsonb(summary) FROM summary) AS resumo,
      (SELECT jsonb_build_object('page',page,'limit',$7::int,'total',total) FROM pagination) AS meta,
      NOW() AS atualizado_em`, [produto, tipo, busca, status, foco, page, limit, incluir_publicacoes]);
    return result.rows[0];
  });
}
