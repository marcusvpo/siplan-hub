/*Author: Erik Marques*/
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from './config.js';

// Header não simples exige preflight CORS; formulários externos não podem forjá-lo.
export function requirePublicAction(request: FastifyRequest, reply: FastifyReply) {
  const origin = request.headers.origin;
  if (request.headers['x-blog-action'] !== '1' ||
      (origin && origin !== env.APP_ORIGIN) || request.headers['sec-fetch-site'] === 'cross-site') {
    reply.code(403).send({ error: 'forbidden', message: 'Origem da interação não permitida.' });
    return false;
  }
  return true;
}
