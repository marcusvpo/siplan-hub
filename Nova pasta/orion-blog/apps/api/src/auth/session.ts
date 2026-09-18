/*Author: Erik Marques*/
import type { FastifyReply, FastifyRequest } from "fastify";
import { env, isProduction } from "../config.js";
import { pool } from "../db/index.js";
import { equalSecret, randomToken, sha256 } from "../security.js";
import { resolveHostAdmin } from "./host.js";

const SESSION_COOKIE = "ca_admin_session";
const CSRF_COOKIE = "ca_csrf";

export type AdminSession = { adminId: number; email: string; sessionToken: string; csrfTokenHash: string; csrfToken?: string };
const hostSessions = new WeakMap<FastifyRequest, Promise<AdminSession | null>>();
const hostCsrfTokens = new WeakMap<FastifyRequest, string>();

function cookieOptions(httpOnly: boolean) {
  return { path: `${env.BLOG_BASE_PATH}api/v1/admin`, httpOnly, secure: isProduction, sameSite: "strict" as const, signed: true };
}

export async function createAdminSession(adminId: number, email: string, reply: FastifyReply) {
  if (env.ADMIN_AUTH_MODE !== "local") throw new Error("Local sessions are disabled in host mode");
  const sessionToken = randomToken();
  const csrfToken = randomToken(24);
  await pool.query(
    `INSERT INTO ca_admin_sessoes (admin_id, token_hash, csrf_token_hash, expira_em)
     VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 day'))`,
    [adminId, sha256(sessionToken), sha256(csrfToken), env.ADMIN_SESSION_DAYS],
  );
  reply.setCookie(SESSION_COOKIE, sessionToken, cookieOptions(true));
  reply.setCookie(CSRF_COOKIE, csrfToken, cookieOptions(false));
  return { adminId, email };
}

function readSignedCookie(request: FastifyRequest, name: string) {
  const value = request.cookies[name];
  if (!value) return null;
  const unsigned = request.unsignCookie(value);
  return unsigned.valid ? unsigned.value : null;
}

export function getCsrfToken(request: FastifyRequest) {
  if (env.ADMIN_AUTH_MODE === "host") return hostCsrfTokens.get(request) ?? null;
  return readSignedCookie(request, CSRF_COOKIE);
}

export async function getAdminSession(request: FastifyRequest): Promise<AdminSession | null> {
  if (env.ADMIN_AUTH_MODE === "host") {
    let pending = hostSessions.get(request);
    if (!pending) {
      pending = resolveHostAdmin(request).then(session => {
        if (session) hostCsrfTokens.set(request, session.csrfToken);
        return session;
      });
      hostSessions.set(request, pending);
    }
    return pending;
  }
  const sessionToken = readSignedCookie(request, SESSION_COOKIE);
  if (!sessionToken) return null;
  const result = await pool.query<{ admin_id: number; email: string; csrf_token_hash: string }>(
    `SELECT s.admin_id, a.email, s.csrf_token_hash
       FROM ca_admin_sessoes s JOIN ca_admins a ON a.id = s.admin_id
      WHERE s.token_hash = $1 AND s.expira_em > NOW() AND a.ativo = TRUE AND a.host_subject IS NULL`,
    [sha256(sessionToken)],
  );
  const row = result.rows[0];
  return row ? { adminId: row.admin_id, email: row.email, sessionToken, csrfTokenHash: row.csrf_token_hash } : null;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  reply.header("Cache-Control", "private, no-store");
  const session = await getAdminSession(request);
  if (!session) {
    reply.code(401).send({ error: "unauthorized", message: env.ADMIN_AUTH_MODE === "host" ? "Acesso permitido somente a administradores autorizados pelo sistema principal." : "Sessão administrativa necessária." });
    return null;
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.origin;
    if ((env.ADMIN_AUTH_MODE === "host" || origin) && origin !== env.APP_ORIGIN) {
      reply.code(403).send({ error: "forbidden", message: "Origem não permitida." });
      return null;
    }
    const csrfHeader = request.headers["x-csrf-token"];
    const csrfCookie = getCsrfToken(request);
    if (typeof csrfHeader !== "string" || !csrfCookie || !equalSecret(sha256(csrfHeader), session.csrfTokenHash) || csrfHeader !== csrfCookie) {
      reply.code(403).send({ error: "csrf_failed", message: "Token CSRF inválido." });
      return null;
    }
  }
  return session;
}

export async function destroyAdminSession(request: FastifyRequest, reply: FastifyReply) {
  const sessionToken = readSignedCookie(request, SESSION_COOKIE);
  if (sessionToken) await pool.query("DELETE FROM ca_admin_sessoes WHERE token_hash = $1", [sha256(sessionToken)]);
  reply.clearCookie(SESSION_COOKIE, cookieOptions(true));
  reply.clearCookie(CSRF_COOKIE, cookieOptions(false));
}
