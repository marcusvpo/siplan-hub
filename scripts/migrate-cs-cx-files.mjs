import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const confirmation = [...args].find((arg) => arg.startsWith('--confirm-project='))?.split('=')[1];

loadDotEnv();
const targetUrl = process.env.SUPABASE_DB_URL;
const apiUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const legacyRoot = path.resolve(process.env.CS_CX_LEGACY_UPLOADS_PATH
  ?? '\\\\10.0.10.9\\Siplan\\SistemaRegistro\\uploads');

if (!targetUrl || !apiUrl || !serviceRoleKey) {
  fail('Defina SUPABASE_DB_URL, VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou .env.');
}
const projectRef = resolveProjectRef(targetUrl, apiUrl);
if (apply && (!projectRef || confirmation !== projectRef)) {
  fail(`Confirme o projeto com --confirm-project=${projectRef ?? '<project-ref>'}.`);
}

const target = new Client(connectionOptions(targetUrl, process.env.CS_CX_TARGET_SSL !== 'false'));
const storage = createClient(apiUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = storage.storage.from('cs-cx-attachments');

await target.connect();
try {
  const attachments = await loadLegacyAttachments();
  let copied = 0;
  let verified = 0;

  for (const attachment of attachments) {
    const sourcePath = resolveSourcePath(attachment);
    const content = fs.readFileSync(sourcePath);
    if (attachment.size_bytes != null && Number(attachment.size_bytes) !== content.length) {
      throw new Error(`Tamanho divergente no anexo ${attachment.kind}/${attachment.legacy_id}.`);
    }
    const expectedPath = storagePath(attachment);
    const remotePath = attachment.storage_path ?? expectedPath;
    let remote = await download(remotePath);

    if (!remote && !apply) {
      throw new Error(`Anexo ainda não copiado: ${attachment.kind}/${attachment.legacy_id}.`);
    }
    if (!remote) {
      const { error } = await bucket.upload(expectedPath, content, {
        contentType: attachment.mime_type ?? undefined,
        upsert: false,
      });
      if (error) throw error;
      remote = await download(expectedPath);
      if (!remote) throw new Error(`Upload não pôde ser relido: ${attachment.kind}/${attachment.legacy_id}.`);
      copied += 1;
    }

    if (sha256(remote) !== sha256(content)) {
      throw new Error(`Checksum divergente no anexo ${attachment.kind}/${attachment.legacy_id}.`);
    }
    if (apply && !attachment.storage_path) {
      await target.query(
        `UPDATE public.${attachment.table_name}
         SET storage_path = $1
         WHERE id = $2 AND legacy_id = $3 AND origin = 'legacy'`,
        [expectedPath, attachment.id, attachment.legacy_id],
      );
    }
    verified += 1;
  }

  console.log(`Anexos legados: ${attachments.length}; copiados: ${copied}; checksums válidos: ${verified}.`);
} finally {
  await target.end();
}

async function loadLegacyAttachments() {
  const result = await target.query(`
    SELECT 'request' AS kind, 'cs_cx_request_attachments' AS table_name,
           id, legacy_id, stored_name, mime_type, size_bytes, storage_path
    FROM public.cs_cx_request_attachments
    WHERE origin = 'legacy' AND source_present
    UNION ALL
    SELECT 'visit' AS kind, 'cs_cx_visit_attachments' AS table_name,
           id, legacy_id, stored_name, mime_type, size_bytes, storage_path
    FROM public.cs_cx_visit_attachments
    WHERE origin = 'legacy' AND source_present
    ORDER BY kind, legacy_id
  `);
  return result.rows;
}

function resolveSourcePath(attachment) {
  const directory = attachment.kind === 'visit' ? 'visitas' : '';
  const safeName = path.basename(attachment.stored_name);
  if (!safeName || safeName !== attachment.stored_name) {
    throw new Error(`Nome de arquivo legado inválido: ${attachment.legacy_id}.`);
  }
  const sourcePath = path.resolve(legacyRoot, directory, safeName);
  const expectedRoot = path.resolve(legacyRoot, directory);
  if (!sourcePath.startsWith(`${expectedRoot}${path.sep}`) || !fs.existsSync(sourcePath)) {
    throw new Error(`Arquivo legado ausente: ${attachment.kind}/${attachment.legacy_id}.`);
  }
  return sourcePath;
}

function storagePath(attachment) {
  const directory = attachment.kind === 'visit' ? 'visits' : 'requests';
  return `legacy/${directory}/${attachment.legacy_id}/${attachment.stored_name}`;
}

async function download(storagePathValue) {
  try {
    const { data, error } = await bucket.download(storagePathValue);
    if (error) {
      if (await isMissingObjectError(error)) return null;
      throw error;
    }
    return Buffer.from(await data.arrayBuffer());
  } catch (error) {
    if (await isMissingObjectError(error)) return null;
    throw error;
  }
}

async function isMissingObjectError(error) {
  if (/not found|does not exist|404|NoSuchKey/i.test(error?.message ?? '')) return true;
  const response = error?.originalError;
  if (!(response instanceof Response)) return false;
  try {
    const payload = await response.clone().json();
    return String(payload?.statusCode) === '404'
      || /not found|NoSuchKey/i.test(`${payload?.error ?? ''} ${payload?.message ?? ''} ${payload?.code ?? ''}`);
  } catch {
    return response.status === 404;
  }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function resolveProjectRef(databaseUrl, publicUrl) {
  try {
    const apiHost = new URL(publicUrl).hostname;
    if (apiHost.endsWith('.supabase.co')) return apiHost.split('.')[0];
    const username = decodeURIComponent(new URL(databaseUrl).username);
    return username.includes('.') ? username.split('.').at(-1) : null;
  } catch {
    return null;
  }
}

function connectionOptions(connectionString, ssl) {
  return { connectionString, ssl: ssl ? { rejectUnauthorized: false } : undefined };
}

function loadDotEnv() {
  if (!fs.existsSync('.env')) return;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
