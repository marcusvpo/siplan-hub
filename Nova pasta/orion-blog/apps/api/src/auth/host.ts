/*Author: Erik Marques*/
import { createHmac } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../config.js';
import { pool } from '../db/index.js';
import { sha256 } from '../security.js';

/** Dados obtidos APENAS depois de validar a sessão e as permissões no servidor hospedeiro. */
export type HostIdentity = {
  /** Identificador imutável e único, incluindo sistema/tenant se necessário. Nunca use o e-mail como ID. */
  subject: string;
  email: string;
  isAdmin: boolean;
  /** Identificador da sessão validada (ou seu hash). Deve mudar a cada novo login. Não envie ao frontend. */
  sessionId: string;
};
export type HostIdentityResolver = (request: FastifyRequest) => Promise<HostIdentity | null>;

declare module 'fastify' {
  interface FastifyInstance { resolveBlogHostIdentity?: HostIdentityResolver; }
}

const identitySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  isAdmin: z.boolean(),
  sessionId: z.string().min(1).max(512),
});

export async function resolveHostAdmin(request: FastifyRequest) {
  const resolve = request.server.resolveBlogHostIdentity;
  if (!resolve) return null; // Sem integração configurada, nunca concede acesso.
  const identity = identitySchema.safeParse(await resolve(request));
  if (!identity.success || !identity.data.isAdmin) return null;
  const { subject, email, sessionId } = identity.data;
  // Chave técnica reservada: identidades externas nunca são associadas por coincidência de e-mail.
  const technicalEmail = `host+${sha256(subject)}@blog.invalid`;
  type Actor = { id: number; ativo: boolean; host_email: string };
  let actor = (await pool.query<Actor>('SELECT id, ativo, host_email FROM ca_admins WHERE host_subject=$1', [subject])).rows[0];
  if (!actor) {
    await pool.query(`INSERT INTO ca_admins(email, password_hash, host_subject, host_email)
      VALUES($1, '!host-managed', $2, $3)
      ON CONFLICT(host_subject) WHERE host_subject IS NOT NULL DO NOTHING`, [technicalEmail, subject, email]);
    actor = (await pool.query<Actor>('SELECT id, ativo, host_email FROM ca_admins WHERE host_subject=$1', [subject])).rows[0];
  }
  if (!actor?.ativo) return null;
  if (actor.host_email !== email) await pool.query('UPDATE ca_admins SET host_email=$1, atualizado_em=NOW() WHERE id=$2', [email, actor.id]);
  // Token anti-CSRF vinculado à identidade E à sessão atual do hospedeiro, sem novo login/cookie de sessão.
  const csrfToken = createHmac('sha256', env.COOKIE_SECRET).update(JSON.stringify(['orion-blog:host-csrf:v1', subject, sessionId])).digest('base64url');
  return { adminId: actor.id, email, sessionToken: '', csrfTokenHash: sha256(csrfToken), csrfToken };
}
