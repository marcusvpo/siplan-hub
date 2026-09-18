import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { crc32, deflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exact = [
  'package.json', 'package-lock.json', 'README.md', '.gitignore', '.dockerignore', '.nvmrc', 'docker-compose.yml',
  'apps/api/package.json', 'apps/api/tsconfig.json', 'apps/api/.env.example',
  'apps/web/package.json', 'apps/web/tsconfig.json', 'apps/web/vite.config.ts', 'apps/web/index.html', 'apps/web/.env.example',
  'apps/web/public/theme.js', 'apps/web/public/assets/Siplan_logo.png', 'apps/web/public/assets/oriontn.ico',
  'apps/web/public/assets/OrionPRO.png', 'apps/web/public/assets/OrionREG.png',
  'deploy/Dockerfile.api', 'deploy/Dockerfile.web', 'deploy/compose.production.yml', 'deploy/nginx.conf.template',
  'deploy/render-nginx.mjs', 'deploy/.env.example',
];
const trees = [
  ['apps/api/src', /\.(ts)$/], ['apps/web/src', /\.(ts|tsx|css)$/],
  ['database/migrations', /^\d+_[a-z_]+\.sql$/], ['docs', /\.md$/], ['scripts', /\.mjs$/],
];
const forbidden = /(^|\/)(node_modules|dist|exports|coverage|\.git|\.test-results|\.env(?:\..*)?)(\/|$)|\.(log|zip|dump|backup|pem|key|tsbuildinfo)$/i;
export const hash = data => createHash('sha256').update(data).digest('hex');

export async function collectFiles(root = projectRoot) {
  const names = [...exact];
  async function walk(dir, pattern) {
    const stat = await lstat(path.join(root, dir));
    if (stat.isSymbolicLink()) throw new Error(`Link simbólico não permitido: ${dir}`);
    for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
      const name = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Link simbólico não permitido: ${name}`);
      if (forbidden.test(name)) continue;
      if (entry.isDirectory()) await walk(name, pattern);
      else if (pattern.test(entry.name)) names.push(name);
    }
  }
  for (const [dir, pattern] of trees) await walk(dir, pattern);
  const files = [];
  for (const name of names.sort()) {
    // Verifica também os diretórios pais dos arquivos explícitos.
    const segments = name.split('/');
    for (let i = 1; i <= segments.length; i++) {
      if ((await lstat(path.join(root, ...segments.slice(0, i)))).isSymbolicLink()) throw new Error(`Link simbólico não permitido: ${name}`);
    }
    files.push({ name, data: await readFile(path.join(root, name)) });
  }
  // Barreiras adicionais; não substituem a revisão humana antes de compartilhar.
  const sensitiveValues = [];
  for (const envFile of ['.env', 'apps/api/.env', 'apps/web/.env', 'deploy/.env']) {
    let contents;
    try { contents = await readFile(path.join(root, envFile), 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const line of contents.split(/\r?\n/)) {
      const match = /^(COOKIE_SECRET|ADMIN_PASSWORD_HASH|DATABASE_URL|MIGRATION_DATABASE_URL)\s*=\s*(.+)$/.exec(line.trim());
      if (!match) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
      if (value.length >= 24 && !value.includes('postgres:postgres@localhost')) sensitiveValues.push([match[1], value]);
    }
  }
  for (const file of files) {
    if (/\.(png|ico)$/.test(file.name)) continue;
    const text = file.data.toString('utf8');
    for (const [key, value] of sensitiveValues) if (text.includes(value)) throw new Error(`Exportação bloqueada: valor de ${key} encontrado em ${file.name}.`);
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) throw new Error(`Chave privada encontrada em ${file.name}.`);
  }
  return files;
}

// ZIP padrão, UTF-8/Deflate, sem dependência de PowerShell, zip ou de um serviço externo.
// Metadados fixos + ordem estável tornam o mesmo código exportável com o mesmo SHA-256.
export function makeZip(files) {
  if (files.length >= 65535) throw new Error('Quantidade de arquivos excede o limite do pacote.');
  const local = [], directory = [];
  let offset = 0;
  for (const file of files) {
    if (!/^[A-Za-z0-9_./-]+$/.test(file.name) || file.name.startsWith('/') || file.name.split('/').includes('..')) throw new Error('Caminho inválido no pacote.');
    const name = Buffer.from(file.name), compressed = deflateRawSync(file.data, { level: 9 });
    const header = Buffer.alloc(30), central = Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12); header.writeUInt32LE(crc32(file.data), 14);
    header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(file.data.length, 22); header.writeUInt16LE(name.length, 26);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4);
    header.copy(central, 6, 4, 30); central.writeUInt32LE(offset, 42);
    local.push(header, name, compressed); directory.push(central, name);
    offset += header.length + name.length + compressed.length;
    if (offset >= 0xffffffff) throw new Error('Pacote excede o limite de 4 GB.');
  }
  const index = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, index, end]);
}

export async function exportProject(root = projectRoot, output = path.join(root, 'exports')) {
  const files = await collectFiles(root);
  const { version } = JSON.parse(files.find(file => file.name === 'package.json').data.toString());
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(version)) throw new Error('Versão inválida.');
  const manifest = { project: 'orion-blog', version, contents: 'source-only', includesReaderData: false,
    files: files.map(file => ({ path: file.name, bytes: file.data.length, sha256: hash(file.data) })) };
  const zip = makeZip([...files, { name: 'RELEASE_MANIFEST.json', data: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') }]
    .map(file => ({ ...file, name: `orion-blog/${file.name}` })));
  const digest = hash(zip), filename = `orion-blog-${version}-${digest.slice(0, 12)}.zip`;
  await mkdir(output, { recursive: true });
  const target = path.join(output, filename);
  // Nunca substitui uma entrega anterior por bytes diferentes.
  try { await writeFile(target, zip, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || hash(await readFile(target)) !== digest) throw error; }
  const checksum = `${digest}  ${filename}\n`;
  try { await writeFile(target + '.sha256', checksum, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || await readFile(target + '.sha256', 'utf8') !== checksum) throw error; }
  return { target, sha256: digest, files: files.length, bytes: zip.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await exportProject();
  console.log(`Pacote: ${result.target}\nSHA-256: ${result.sha256}\n${result.files} arquivos; ${result.bytes} bytes. Sem dados do banco ou arquivos .env reais.`);
}
