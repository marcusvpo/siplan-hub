/*Author: Erik Marques*/
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env, isProduction } from "./config.js";
import { closeDatabase } from "./db/index.js";
import { adminAuthRoutes } from "./auth/routes.js";
import { resolveHostIdentity } from "./auth/host-adapter.js";

import { versionRoutes } from "./versions.js";
import { postRoutes } from "./posts.js";
import { mediaRoutes } from "./media.js";
import { engagementRoutes } from "./engagement.js";
import { suggestionRoutes } from "./suggestions.js";
import { analyticsRoutes } from "./analytics.js";

const app = Fastify({
  logger: true,
  bodyLimit: 1_048_576,
  trustProxy: env.TRUST_PROXY_CIDRS.length ? env.TRUST_PROXY_CIDRS : false,
});

await app.register(cookie, { secret: env.COOKIE_SECRET });
await app.register(cors, { origin: env.APP_ORIGIN, credentials: true });
await app.register(helmet, {
  contentSecurityPolicy: isProduction
    ? { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", "data:"], styleSrc: ["'self'"] } }
    : false,
});
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

app.get("/health", async () => ({ status: "ok" }));

// O adaptador é registrado no servidor, nunca definido por dados do navegador.
app.decorate("resolveBlogHostIdentity", resolveHostIdentity);
await app.register(adminAuthRoutes);

await app.register(versionRoutes);
await app.register(postRoutes);
await app.register(mediaRoutes);
await app.register(engagementRoutes);
await app.register(analyticsRoutes);
await app.register(suggestionRoutes);

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, "request_failed");
  if (reply.sent) return;
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
  const messages: Record<number,string> = {400:"Requisição inválida. Verifique os campos.",413:"O arquivo excede o limite de 5 MB.",415:"Formato não aceito. Use PNG, JPEG ou WebP.",429:"Muitas tentativas. Aguarde um momento."};
  reply.code(statusCode < 500 ? statusCode : 500).send({ error: statusCode < 500 ? "invalid_request" : "internal_error", message: messages[statusCode] ?? "Não foi possível concluir a operação." });
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
console.log(`API disponível na porta ${env.PORT}`);

const shutdown = async () => { await app.close(); await closeDatabase(); process.exit(0); };
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
