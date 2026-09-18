import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./index.js";

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../database/migrations");
await pool.query("CREATE TABLE IF NOT EXISTS ca_migrations (id VARCHAR(120) PRIMARY KEY, aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())");
const migrationFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
for (const file of migrationFiles) {
  const id = file.replace(/\.sql$/, "");
  const already = await pool.query("SELECT 1 FROM ca_migrations WHERE id = $1", [id]);
  if (already.rowCount !== 0) {
    console.log(`Migration ${id} já aplicada.`);
    continue;
  }
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO ca_migrations (id) VALUES ($1)", [id]);
    await client.query("COMMIT");
    console.log(`Migration ${id} aplicada.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
await pool.end();
