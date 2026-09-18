/*Author: Erik Marques*/
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../config.js';
import { pool } from '../db/index.js';
import { normalizeEmail } from '../security.js';
import { verifyPassword } from './password.js';
import { createAdminSession, destroyAdminSession, getAdminSession, getCsrfToken, requireAdmin } from './session.js';

export async function adminAuthRoutes(app: FastifyInstance) {
  // Consulta de capacidade: não autentica por parâmetros enviados pelo navegador.
  app.get('/api/v1/admin/access', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store').header('Vary', 'Cookie');
    const session = await getAdminSession(request);
    return {
      mode: env.ADMIN_AUTH_MODE,
      canManage: Boolean(session),
      admin: session ? { id: session.adminId, email: session.email } : null,
      csrfToken: session ? getCsrfToken(request) : null,
    };
  });

  app.post('/api/v1/admin/login', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    if (env.ADMIN_AUTH_MODE === 'host') return reply.code(403).send({ error: 'host_managed', message: 'O acesso é gerenciado pelo sistema principal. Não há login próprio no blog.' });
    if (request.headers.origin && request.headers.origin !== env.APP_ORIGIN) return reply.code(403).send({ error: 'forbidden' });
    const body = z.object({ email: z.string().email(), password: z.string().min(1).max(200) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_credentials' });
    const email = normalizeEmail(body.data.email);
    const result = await pool.query<{ id: number; email: string; password_hash: string }>('SELECT id, email, password_hash FROM ca_admins WHERE email=$1 AND ativo=TRUE AND host_subject IS NULL', [email]);
    const row = result.rows[0];
    const valid = await verifyPassword(body.data.password, row?.password_hash ?? env.ADMIN_PASSWORD_HASH ?? '').catch(() => false);
    if (!row || !valid) return reply.code(401).send({ error: 'invalid_credentials', message: 'Credenciais inválidas.' });
    const admin = await createAdminSession(row.id, row.email, reply);
    await pool.query("INSERT INTO ca_auditoria(admin_id,acao,entidade,ip) VALUES($1,'login','sessao',$2)", [row.id, request.ip]);
    return { admin };
  });

  app.get('/api/v1/admin/session', async (request, reply) => {
    const session = await requireAdmin(request, reply);
    if (!session) return;
    return { admin: { id: session.adminId, email: session.email }, csrfToken: getCsrfToken(request) };
  });

  app.post('/api/v1/admin/logout', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    if (env.ADMIN_AUTH_MODE === 'host') return reply.code(403).send({ error: 'host_managed', message: 'A saída da conta é feita pelo sistema principal. Alterne para a visualização do leitor para sair da Gestão.' });
    const session = await requireAdmin(request, reply);
    if (!session) return;
    await destroyAdminSession(request, reply);
    return { ok: true };
  });
}
