import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { collectFiles, exportProject, hash, makeZip } from './export-project.mjs';

const output = await mkdtemp(path.join(tmpdir(), 'orion-export-check-'));
const result = await exportProject(undefined, output);
const files = await collectFiles();
const names = files.map(file => file.name);
assert(names.includes('deploy/.env.example'));
assert(names.includes('apps/web/src/paths.ts'));
assert.equal(names.filter(name => name.startsWith('database/migrations/')).length, 7);
assert(!names.some(name => /(^|\/)(node_modules|dist|\.git|exports|\.env)$|poc\.jsx|\.dump$/.test(name)));
assert.throws(() => makeZip([{ name: '../escape', data: Buffer.from('test') }]), /Caminho inválido/);
assert.equal((await exportProject(undefined, output)).sha256, result.sha256, 'Exportação reproduzível');
assert.equal(hash(await readFile(result.target)), result.sha256);
// Leitor independente do código que escreveu o ZIP, incluindo validação de CRC.
const unpack = process.platform === 'win32'
  ? spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Expand-Archive -LiteralPath $env:ORION_TEST_ZIP -DestinationPath $env:ORION_TEST_UNPACK'],
    { env: { ...process.env, ORION_TEST_ZIP: result.target, ORION_TEST_UNPACK: path.join(output, 'unpacked') }, encoding: 'utf8', windowsHide: true })
  : spawnSync('unzip', ['-q', result.target, '-d', path.join(output, 'unpacked')], { encoding: 'utf8' });
assert.equal(unpack.status, 0, unpack.stderr);
const extracted = path.join(output, 'unpacked', 'orion-blog');
const manifest = JSON.parse(await readFile(path.join(extracted, 'RELEASE_MANIFEST.json'), 'utf8'));
for (const file of manifest.files) assert.equal(hash(await readFile(path.join(extracted, file.path))), file.sha256, file.path);
// Somente a cópia descartável recebe arquivos falsos; nenhum segredo real é copiado.
const sentinel = randomBytes(32).toString('hex');
await writeFile(path.join(extracted, 'apps/api/.env'), `COOKIE_SECRET=${sentinel}\n`);
await writeFile(path.join(extracted, 'apps/api/src/.env'), 'NUNCA_EXPORTAR=teste\n');
assert(!(await collectFiles(extracted)).some(file => file.name.endsWith('/.env')));
await writeFile(path.join(extracted, 'apps/api/src/export-test.ts'), `export const leaked = '${sentinel}';\n`);
await assert.rejects(collectFiles(extracted), /valor de COOKIE_SECRET encontrado/);
await writeFile(path.join(extracted, 'apps/api/src/export-test.ts'), '// fixture sem segredo\n');
console.log(`OK: ${files.length} arquivos extraídos e verificados, SHA-256, exclusões e exportação reproduzível.\nAmostra isolada: ${extracted}`);
