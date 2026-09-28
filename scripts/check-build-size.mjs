import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const assets = resolve("dist/assets");
const limit = 500_000;
const scripts = (await readdir(assets)).filter((file) => file.endsWith(".js"));
if (!scripts.length) throw new Error("O build não gerou os arquivos JavaScript esperados.");
const sizes = await Promise.all(scripts.map(async (file) => ({
  file, bytes: (await stat(resolve(assets, file))).size,
})));
const excessive = sizes.filter(({ bytes }) => bytes > limit);
if (excessive.length) {
  console.error("Chunks acima de 500 kB: revise as fronteiras de carregamento.");
  for (const { file, bytes } of excessive) console.error(`${file}: ${(bytes / 1000).toFixed(2)} kB`);
  process.exitCode = 1;
} else {
  console.log(`${sizes.length} chunks verificados; maior arquivo: ${(Math.max(...sizes.map(({ bytes }) => bytes)) / 1000).toFixed(2)} kB.`);
}
