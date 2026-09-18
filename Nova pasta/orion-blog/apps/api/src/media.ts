/*Author: Erik Marques*/
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { z } from 'zod';
import { pool } from './db/index.js';
import { requireAdmin } from './auth/session.js';
import { visiblePost } from './content.js';

export async function mediaRoutes(app: FastifyInstance) {
  app.addContentTypeParser(['image/png','image/jpeg','image/webp'], { parseAs: 'buffer' }, (_request, body, done) => done(null, body));
  app.post('/api/v1/admin/imagens', {
    bodyLimit: 5 * 1024 * 1024,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    onRequest: async (request, reply) => { await requireAdmin(request, reply); },
  }, async (request, reply) => {
    const session = await requireAdmin(request, reply);
    if (!session) return;
    if (!Buffer.isBuffer(request.body)) return reply.code(400).send({ message: 'Selecione uma imagem PNG, JPEG ou WebP.' });
    let data: Buffer;
    try {
      const input = sharp(request.body, { limitInputPixels: 20_000_000, failOn: 'warning' });
      const metadata = await input.metadata();
      if (!['png','jpeg','webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw new Error('invalid_image');
      data = await input.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch {
      return reply.code(400).send({ error: 'invalid_image', message: 'Imagem inválida. Use PNG, JPEG ou WebP estático de até 5 MB e 20 megapixels.' });
    }
    const id = randomUUID();
    await pool.query("INSERT INTO ca_imagens (id, admin_id, dados, mime_type) VALUES ($1,$2,$3,'image/webp')", [id, session.adminId, data]);
    // Uploads abandonados expiram, mas arquivos usados em posts são preservados.
    await pool.query(`DELETE FROM ca_imagens m WHERE criado_em < NOW() - INTERVAL '7 days'
      AND NOT EXISTS (SELECT 1 FROM ca_post_imagens pi WHERE pi.imagem_id=m.id)
      AND NOT EXISTS (SELECT 1 FROM ca_atualizacoes a WHERE a.capa_imagem_id=m.id)`);
    return reply.code(201).send({ id, url: '/api/v1/imagens/' + id, previewUrl: '/api/v1/admin/imagens/' + id });
  });

  app.get('/api/v1/admin/imagens/:id', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_id' });
    const result = await pool.query('SELECT dados FROM ca_imagens WHERE id=$1', [params.data.id]);
    if (!result.rows[0]) return reply.code(404).send({ error: 'not_found' });
    return reply.type('image/webp').header('Cache-Control','private, no-store').header('X-Content-Type-Options','nosniff').send(result.rows[0].dados);
  });

  app.get('/api/v1/imagens/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_id' });
    const result = await pool.query(`SELECT m.dados FROM ca_imagens m WHERE m.id=$1 AND EXISTS (
      SELECT 1 FROM ca_post_imagens pi JOIN ca_atualizacoes a ON a.id=pi.post_id
      JOIN ca_versoes v ON v.id=a.versao_id JOIN ca_produtos p ON p.id=v.produto_id
      WHERE pi.imagem_id=m.id AND p.ativo AND ${visiblePost}
    )`, [params.data.id]);
    if (!result.rows[0]) return reply.code(404).send({ error: 'not_found' });
    return reply.type('image/webp').header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').send(result.rows[0].dados);
  });
}
