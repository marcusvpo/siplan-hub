/*Author: Erik Marques*/
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { isIP } from "node:net";
import { z } from "zod";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.string().url(),
  BLOG_BASE_PATH: z.string().default("/").transform(value => value.endsWith("/") ? value : value + "/")
    .pipe(z.string().regex(/^\/(?:[A-Za-z0-9_-]+\/)*$/, "Use / ou um subcaminho como /blog/.")),
  // Somente proxies conhecidos. Nunca aceite todos os X-Forwarded-* indiscriminadamente.
  TRUST_PROXY_CIDRS: z.string().default("").transform(value => value.split(",").map(item => item.trim()).filter(Boolean))
    .refine(values => values.every(value => {
      const [address, mask, extra] = value.split("/");
      const family = isIP(address ?? "");
      return family !== 0 && extra === undefined && (mask === undefined || (/^\d+$/.test(mask) && Number(mask) <= (family === 4 ? 32 : 128)));
    }), "Informe apenas IPs/CIDRs de proxies confiáveis, separados por vírgulas."),
  COOKIE_SECRET: z.string().min(32),
  ADMIN_AUTH_MODE: z.enum(["local", "host"]).default("local"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD_HASH: z.string().startsWith("scrypt$").optional(),
  ADMIN_SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(1),
}).superRefine((value, context) => {
  const origin = URL.canParse(value.APP_ORIGIN) ? new URL(value.APP_ORIGIN) : null;
  if (origin && origin.origin !== value.APP_ORIGIN) context.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "Informe apenas a origem, sem caminho ou barra final." });
  if (value.NODE_ENV === "production" && origin?.protocol !== "https:") context.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "Produção exige HTTPS." });
  if (value.ADMIN_AUTH_MODE === "local") {
    if (!value.ADMIN_EMAIL) context.addIssue({ code: "custom", path: ["ADMIN_EMAIL"], message: "Obrigatório no modo local." });
    if (!value.ADMIN_PASSWORD_HASH) context.addIssue({ code: "custom", path: ["ADMIN_PASSWORD_HASH"], message: "Obrigatório no modo local." });
  }
});

const result = schema.safeParse(process.env);
if (!result.success) {
  console.error("Configuração inválida:", result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
export const isProduction = env.NODE_ENV === "production";
