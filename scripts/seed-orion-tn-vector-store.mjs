import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as yaml from "js-yaml";
import { createClient } from "@supabase/supabase-js";

/**
 * Script de Seed & Sincronização Granular da Base de Conhecimento Orion TN
 * Dual-Layer RAG V3.2 — Siplan HUB
 *
 * Execução:
 *   node scripts/seed-orion-tn-vector-store.mjs [--dry-run] [--purge-old] [--file=caminho.md]
 */

const VECTOR_STORE_ID = "vs_6a85e00895f081918844a28887a34a17";
const SUPABASE_BUCKET = "assistant-oriontn-doc";
const SUPABASE_FILE_PATH = "OrionTN pos.md";

// 1. Carregar variáveis de ambiente de .env ou .env.local
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  const env = {};
  for (const f of envFiles) {
    const fullPath = path.resolve(f);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, "utf8").split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
        if (match && !env[match[1]]) {
          env[match[1]] = match[2].trim();
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || "https://okvufcwkophaadttmjwa.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;

const isDryRun = process.argv.includes("--dry-run");
const shouldPurgeOld = process.argv.includes("--purge-old") || true;

console.log("================================================================================");
console.log("🚀 INICIANDO SEED GRANULAR DUAL-LAYER RAG V3.2 — BASE ORION TN");
console.log("================================================================================");
console.log(`Vector Store ID:  ${VECTOR_STORE_ID}`);
console.log(`Supabase URL:     ${SUPABASE_URL}`);
console.log(`Modo Dry-Run:     ${isDryRun ? "SIM (Nenhuma alteração remota)" : "NÃO (Execução real)"}`);
console.log("--------------------------------------------------------------------------------");

// 2. Classificador de Módulos (11 módulos homologados)
function resolveModulo(id, tags, titulo) {
  const combined = `${id} ${titulo} ${tags.join(" ")}`.toLowerCase();

  if (/(cart[aã]o|aut[oó]grafo|reconhecimento|abertura de ficha|ficha|firma)/i.test(combined)) return "firmas";
  if (/(dep[oó]sito pr[eé]vio|recibo|fechamento|despesa|receita|emolumento|caixa|financeiro)/i.test(combined)) return "caixa";
  if (/(escritura|procura[cç][aã]o|testamento|invent[aá]rio|partilha|div[oó]rcio|ata notarial|notas)/i.test(combined)) return "notas";
  if (/(selo|ressarcimento|valida[cç][aã]o de selo|lote de selo)/i.test(combined)) return "selos";
  if (/(censec|ccn|srei|onr|e-notariado|censo|sinoreg|central)/i.test(combined)) return "centrais";
  if (/(termo de abertura|termo de encerramento|folhas|encaderna[cç][aã]o|traslado|livro)/i.test(combined)) return "livros";
  if (/(certid[aã]o|segunda via|pedido de certid[aã]o|busca de ato)/i.test(combined)) return "certidoes";
  if (/(login|senha|usu[aá]rio|permiss[aã]o|perfil|operador|acesso)/i.test(combined)) return "acesso";
  if (/(par[aâ]metro|modelo|editor|backup|ambiente|configura)/i.test(combined)) return "config";
  if (/(whatsapp|e-mail|notifica[cç][aã]o|mensagem|comunica)/i.test(combined)) return "comunicacao";

  return "geral";
}

function resolveCategoria(secao, temVideo, tags) {
  if (temVideo || secao === "V") return "videoaula_tutorial";
  if (secao === "M") return "manual_operacional";
  if (secao === "D") return "demonstracao_pratica";
  if (secao === "C" || tags.some((t) => /0800|suporte|erro|troubleshoot/i.test(t))) return "troubleshooting_0800";
  return "procedimento_geral";
}

// 3. Obter conteúdo do arquivo mestre
async function getMasterContent() {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  if (fileArg) {
    const localPath = fileArg.split("=")[1];
    console.log(`Lendo arquivo local: ${localPath}`);
    return fs.readFileSync(path.resolve(localPath), "utf8");
  }

  console.log(`Baixando ${SUPABASE_FILE_PATH} do Supabase Storage (${SUPABASE_BUCKET})...`);
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.storage.from(SUPABASE_BUCKET).download(SUPABASE_FILE_PATH);
  if (error) {
    throw new Error(`Erro ao baixar arquivo do Storage: ${error.message}`);
  }
  return await data.text();
}

// 4. Glossário Mestre Homologado
function generateGlossarioContent() {
  return `# GLOSSÁRIO TÉCNICO E NOTARIAL — SIPLAN / ORION TN
> Vocabulário controlado, termos jurídicos, siglas das centrais e nomenclaturas operacionais do sistema.

### Abertura de Firma / Ficha de Assinatura
Registro inaugural dos dados pessoais, biométricos e padrão de assinatura do cliente no cartório de notas.

### Cartão de Autógrafo
Ficha física ou registro digital onde se encontra arquivada a assinatura do titular da firma para confronto visual ou biométrico.

### CENSEC (Central Notarial de Serviços Eletrônicos Compartilhados)
Plataforma gerida pelo CNB-CF que congrega os módulos CESDI, RCTO, CEP e CCN para busca nacional de atos notariais.

### CCN (Central de Comunicação de Notas)
Módulo integrante da CENSEC para comunicação obrigatória da lavratura de escrituras, procurações e testamentos.

### Selo Digital de Fiscalização
Código alfanumérico único e seguro vinculado a cada ato notarial praticado, fiscalizado pela Corregedoria Geral da Justiça do Tribunal de Justiça estadual.

### Sinal Público
Confirmação e reconhecimento de assinatura de tabelião ou preposto de outra comarca para validação de ato fora de sua jurisdição de origem.

### Depósito Prévio
Quantia adiantada pelo usuário ao cartório para cobrir os emolumentos de atos e certidões solicitadas, sujeito a prestação de contas no encerramento.

### Livro de Notas (Livro 1)
Livro oficial obrigatório onde são lavradas escrituras de compra e venda, doações, permutas, divisões e negócios jurídicos em geral.

### Livro de Procurações (Livro 2)
Livro destinado exclusivamente ao registro de instrumentos públicos de mandato (procurações e substabelecimentos).

### Livro de Testamentos (Livro 3)
Livro de guarda restrita e sigilosa destinado ao registro de testamentos públicos e revogações testamentárias.

### Traslado
Primeira cópia autêntica e integral do ato lavrado no livro de notas, entregue às partes com valor de documento original.

### E-Notariado
Plataforma oficial do notariado brasileiro para prática de atos notariais eletrônicos com videoconferência e certificado digital notarizado.

### Orion TN
Sistema de gestão notarial corporativo desenvolvido pela Siplan Informática para Tabelionatos de Notas e Protestos de Títulos.
`;
}

// 5. Compilar 471 rotinas + _indice.md + _glossario.md
function compileKnowledgeBase(rawContent) {
  // Regex corrigida com ancoragem em id: para não perder R-1.0
  const articleRegex = /(?:^|\r?\n)---\s*\r?\n(id:\s*[\s\S]*?)\r?\n---\s*\r?\n([\s\S]*?)(?=(?:\r?\n---\s*\r?\nid:)|$)/g;

  const routines = [];
  let match;

  while ((match = articleRegex.exec(rawContent)) !== null) {
    const frontmatterRaw = match[1];
    const body = match[2].trim();

    let meta = {};
    try {
      meta = yaml.load(frontmatterRaw) || {};
    } catch {
      continue;
    }

    const id = String(meta.id || "").trim();
    if (!id) continue;

    const titulo = String(meta.titulo || "").trim();
    const objetivo = String(meta.objetivo || "").trim();
    const tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
    const sinonimos = Array.isArray(meta.sinonimos) ? meta.sinonimos.map(String) : [];
    const perguntas = Array.isArray(meta.perguntas_usuario) ? meta.perguntas_usuario.map(String) : [];
    const sintomas = Array.isArray(meta.sintomas_comuns) ? meta.sintomas_comuns.map(String) : [];
    const temVideo = Boolean(meta.video && meta.video.tem_video);

    const secaoMatch = id.match(/^([A-Z])/i);
    const secao = secaoMatch ? secaoMatch[1].toUpperCase() : "R";

    const modulo = resolveModulo(id, tags, titulo);
    const categoria = resolveCategoria(secao, temVideo, tags);

    const slug = titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45);

    const fileName = `${id}-${slug}.md`;
    const filePath = `kb/rotinas/${modulo}/${fileName}`;
    const fileContent = `---\n${frontmatterRaw.trim()}\n---\n\n${body}\n`;
    const sha256 = crypto.createHash("sha256").update(fileContent, "utf8").digest("hex");
    const approxTokens = Math.ceil(fileContent.length / 3.8);

    routines.push({
      article_id: id,
      file_path: filePath,
      file_name: fileName,
      file_content: fileContent,
      sha256_hash: sha256,
      token_count: approxTokens,
      modulo,
      secao,
      tem_video: temVideo,
      categoria,
      titulo,
      objetivo,
      sinonimos,
      attributes: {
        id,
        modulo,
        secao,
        tem_video: temVideo ? "true" : "false",
        categoria,
      },
    });
  }

  // Gerar _indice.md (Catálogo mestre padrão llms.txt)
  let indiceMarkdown = `# ÍNDICE GERAL DE ROTINAS — ORION TN (Dual-Layer RAG V3.2)\n`;
  indiceMarkdown += `> Catálogo consolidado de roteamento semântico, sinônimos e palavras-chave operacionais.\n\n`;

  const routinesByModule = {};
  for (const r of routines) {
    if (!routinesByModule[r.modulo]) routinesByModule[r.modulo] = [];
    routinesByModule[r.modulo].push(r);
  }

  for (const mod of Object.keys(routinesByModule).sort()) {
    indiceMarkdown += `## MÓDULO: ${mod.toUpperCase()}\n`;
    for (const r of routinesByModule[mod]) {
      const sinText = r.sinonimos.length > 0 ? ` | Sinônimos: ${r.sinonimos.slice(0, 4).join(", ")}` : "";
      indiceMarkdown += `- [${r.article_id}] ${r.titulo} (Arquivo: \`${r.file_path}\`)${sinText}\n`;
    }
    indiceMarkdown += `\n`;
  }

  const indiceSha256 = crypto.createHash("sha256").update(indiceMarkdown, "utf8").digest("hex");
  const indiceFile = {
    article_id: "_indice",
    file_path: "kb/_indice.md",
    file_name: "_indice.md",
    file_content: indiceMarkdown,
    sha256_hash: indiceSha256,
    token_count: Math.ceil(indiceMarkdown.length / 3.8),
    modulo: "geral",
    secao: "SYS",
    tem_video: false,
    categoria: "indice_mestre",
    titulo: "Índice Mestre de Rotinas Orion TN",
    attributes: {
      id: "_indice",
      modulo: "geral",
      secao: "SYS",
      tem_video: "false",
      categoria: "indice_mestre",
    },
  };

  // Gerar _glossario.md
  const glossarioMarkdown = generateGlossarioContent();
  const glossarioSha256 = crypto.createHash("sha256").update(glossarioMarkdown, "utf8").digest("hex");
  const glossarioFile = {
    article_id: "_glossario",
    file_path: "kb/_glossario.md",
    file_name: "_glossario.md",
    file_content: glossarioMarkdown,
    sha256_hash: glossarioSha256,
    token_count: Math.ceil(glossarioMarkdown.length / 3.8),
    modulo: "geral",
    secao: "SYS",
    tem_video: false,
    categoria: "glossario_termos",
    titulo: "Glossário Notarial e Termos Técnicos Siplan",
    attributes: {
      id: "_glossario",
      modulo: "geral",
      secao: "SYS",
      tem_video: "false",
      categoria: "glossario_termos",
    },
  };

  const allFiles = [...routines, indiceFile, glossarioFile];
  return { routines, allFiles };
}

// 6. Chamadas à API da OpenAI
async function uploadFileToOpenAI(apiKey, fileName, fileContent) {
  const boundary = "----WebKitFormBoundary" + crypto.randomBytes(16).toString("hex");
  let body = "";
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="purpose"\r\n\r\n`;
  body += `assistants\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
  body += `Content-Type: text/markdown\r\n\r\n`;

  const headerBuffer = Buffer.from(body, "utf8");
  const contentBuffer = Buffer.from(fileContent, "utf8");
  const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const fullPayload = Buffer.concat([headerBuffer, contentBuffer, footerBuffer]);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: fullPayload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha no upload para /v1/files (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return json.id; // Retorna file-xyz
}

async function attachFileToVectorStore(apiKey, vectorStoreId, fileId, attributes) {
  const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
      file_id: fileId,
      chunking_strategy: {
        type: "static",
        static: {
          max_chunk_size_tokens: 1800,
          chunk_overlap_tokens: 0,
        },
      },
      attributes,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Falha ao vincular à Vector Store (${response.status}): ${err}`);
  }

  return await response.json();
}

async function purgeOldVectorStoreFiles(apiKey, vectorStoreId) {
  console.log("🔍 Mapeando arquivos antigos na Vector Store para expurgo...");
  const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files?limit=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2",
    },
  });

  if (!response.ok) {
    console.warn("Aviso ao mapear Vector Store:", await response.text());
    return;
  }

  const list = await response.json();
  const files = list.data || [];
  console.log(`Encontrados ${files.length} arquivo(s) na Vector Store.`);

  for (const f of files) {
    console.log(`🗑️ Removendo arquivo antigo da Vector Store: ${f.id}`);
    try {
      await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${f.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      });
      // Deletar da Files API
      await fetch(`https://api.openai.com/v1/files/${f.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } catch (e) {
      console.warn(`Erro ao deletar ${f.id}:`, e.message);
    }
  }
}

// 7. Função Principal de Execução
async function run() {
  const rawContent = await getMasterContent();
  const { routines, allFiles } = compileKnowledgeBase(rawContent);

  console.log(`✅ Fatiamento Concluído com Sucesso!`);
  console.log(`- Total de Rotinas:     ${routines.length}`);
  console.log(`- Arquivos de Suporte:  2 (_indice.md e _glossario.md)`);
  console.log(`- Total de Arquivos:    ${allFiles.length}`);

  if (routines.length < 350) {
    console.error(`❌ Alerta: apenas ${routines.length} rotinas detectadas. Abortando.`);
    process.exit(1);
  }

  console.log(`\nPrimeira Rotina Capturada:  [${routines[0].article_id}] ${routines[0].titulo}`);
  console.log(`Última Rotina Capturada:    [${routines[routines.length - 1].article_id}] ${routines[routines.length - 1].titulo}`);

  if (isDryRun) {
    console.log("\n[Dry-Run] Simulação finalizada. Nenhum arquivo enviado para OpenAI ou Supabase.");
    return;
  }

  if (!OPENAI_API_KEY) {
    console.error("\n❌ OPENAI_API_KEY não localizada no ambiente ou .env!");
    console.log("Para rodar o seed real, defina a chave via:");
    console.log("  $env:OPENAI_API_KEY='sk-...' ou adicione em .env.local");
    return;
  }

  // Expurgo inicial de arquivos legados
  if (shouldPurgeOld) {
    await purgeOldVectorStoreFiles(OPENAI_API_KEY, VECTOR_STORE_ID);
  }

  // Upload Concorrente dos Arquivos (Pool de 10 streams simultâneos)
  console.log(`\n📤 Iniciando upload de ${allFiles.length} arquivos para a OpenAI Files API...`);
  const concurrency = 10;
  const uploadedRecords = [];

  for (let i = 0; i < allFiles.length; i += concurrency) {
    const chunk = allFiles.slice(i, i + concurrency);
    const promises = chunk.map(async (file) => {
      try {
        const fileId = await uploadFileToOpenAI(OPENAI_API_KEY, file.file_name, file.file_content);
        await attachFileToVectorStore(OPENAI_API_KEY, VECTOR_STORE_ID, fileId, file.attributes);
        console.log(`[${file.article_id}] Upload & Vínculo OK -> File ID: ${fileId} (${file.modulo})`);
        return {
          ...file,
          openai_file_id: fileId,
          sync_status: "synced",
        };
      } catch (err) {
        console.error(`[${file.article_id}] Erro:`, err.message);
        return {
          ...file,
          openai_file_id: null,
          sync_status: "error",
        };
      }
    });

    const results = await Promise.all(promises);
    uploadedRecords.push(...results);
  }

  // 8. Gravar dados na tabela assistant_knowledge_files do Supabase
  console.log("\n💾 Gravando registros na tabela assistant_knowledge_files no Supabase...");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const batchPayload = uploadedRecords.map((r) => ({
    article_id: r.article_id,
    file_path: r.file_path,
    file_name: r.file_name,
    modulo: r.modulo,
    secao: r.secao,
    tem_video: r.tem_video,
    categoria: r.categoria,
    sha256_hash: r.sha256_hash,
    openai_file_id: r.openai_file_id,
    vector_store_id: VECTOR_STORE_ID,
    token_count: r.token_count,
    sync_status: r.sync_status,
  }));

  const { data: rpcRes, error: rpcErr } = await sb.rpc("upsert_assistant_knowledge_file_batch", {
    p_files: batchPayload,
  });

  if (rpcErr) {
    console.error("Erro ao registrar arquivos no Supabase:", rpcErr.message);
  } else {
    console.log(`✅ ${rpcRes.count} registros salvos no Supabase com sucesso!`);
  }

  console.log("\n🎉 SEED DUAL-LAYER V3.2 CONCLUÍDO COM SUCESSO!");
}

run().catch((e) => {
  console.error("Erro fatal na execução:", e);
  process.exit(1);
});
