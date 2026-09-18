/*Author: Erik Marques*/
import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomToken, sha256 } from './security.js';
import { env, isProduction } from './config.js';

const hashes = new WeakMap<FastifyRequest, string>();
export function visitorHash(request: FastifyRequest, reply: FastifyReply) {
  const cached = hashes.get(request);
  if (cached) return cached;
  const existing = request.cookies.ca_visitor;
  const signed = existing ? request.unsignCookie(existing) : null;
  const validToken = (value: string | null | undefined): value is string => Boolean(value && /^[A-Za-z0-9_-]{43}$/.test(value));
  // Migra o cookie antigo sem perder as leituras já registradas.
  const token = signed?.valid && validToken(signed.value) ? signed.value : validToken(existing) ? existing : randomToken(32);
  if (!signed?.valid) reply.setCookie('ca_visitor',token,{path:env.BLOG_BASE_PATH,signed:true,httpOnly:true,secure:isProduction,sameSite:'lax',maxAge:60*60*24*365});
  const hash = sha256(token);
  hashes.set(request,hash);
  return hash;
}
