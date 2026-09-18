import { env } from "../config.js";
import { pool } from "./index.js";
import { normalizeEmail } from "../security.js";

if (env.ADMIN_AUTH_MODE !== "local" || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) {
  console.log("Modo integrado: administrador e senha são gerenciados pelo sistema hospedeiro. Nenhuma conta local criada.");
  await pool.end();
  process.exit(0);
}

await pool.query(
  `INSERT INTO ca_admins (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, atualizado_em = NOW()`,
  [normalizeEmail(env.ADMIN_EMAIL), env.ADMIN_PASSWORD_HASH],
);
console.log(`Administrador ${env.ADMIN_EMAIL} configurado.`);
await pool.end();
