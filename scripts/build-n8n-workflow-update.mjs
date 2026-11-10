import fs from "node:fs";

const VECTOR_STORE_ID = "vs_6a85e00895f081918844a28887a34a17";
const SUPABASE_CREDENTIAL_ID = "xHsaYah1jaanhiNt";
const OPENAI_CREDENTIAL_ID = "wDDwY8E0NUat6Ia7";

const codeCompilerSource = `// Compilador Granular Dual-Layer RAG V3.2 & Delta Calculator
const crypto = require('crypto');
const yaml = require('js-yaml');

// 1. Obter arquivo consolidado baixado do Supabase Storage
const binaryObj = $node["Baixar Markdown do Supabase Storage"].binary;
const rawBuffer = binaryObj && binaryObj.data ? Buffer.from(binaryObj.data.data, 'base64') : null;
const rawContent = rawBuffer ? rawBuffer.toString('utf8') : '';

if (!rawContent) {
  throw new Error("Arquivo OrionTN pos.md vazio ou não recebido do Storage.");
}

// 2. Obter estado atual do banco Supabase
const dbFilesData = $node["Consultar assistant_knowledge_files"].json;
const dbFileArray = Array.isArray(dbFilesData) ? dbFilesData : (dbFilesData ? [dbFilesData] : []);
const dbFileMap = new Map();
for (const f of dbFileArray) {
  if (f && f.article_id) {
    dbFileMap.set(f.article_id, f);
  }
}

// 3. Mapear arquivos existentes atualmente na Vector Store
const vsFiles = $node["Mapear Arquivos Atuais na Vector Store"].json.data || [];

// 4. Regex ancorada explicitamente em id: para não perder a primeira rotina (R-1.0)
const articleRegex = /(?:^|\\r?\\n)---\\s*\\r?\\n(id:\\s*[\\s\\S]*?)\\r?\\n---\\s*\\r?\\n([\\s\\S]*?)(?=(?:\\r?\\n---\\s*\\r?\\nid:)|$)/g;

const compiledFiles = [];
let match;

while ((match = articleRegex.exec(rawContent)) !== null) {
  const frontmatterRaw = match[1];
  const body = match[2].trim();

  let meta = {};
  try {
    meta = yaml.load(frontmatterRaw) || {};
  } catch (e) {
    continue;
  }

  const id = String(meta.id || '').trim();
  if (!id) continue;

  const titulo = String(meta.titulo || '').trim();
  const tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
  const sinonimos = Array.isArray(meta.sinonimos) ? meta.sinonimos.map(String) : [];
  const temVideo = Boolean(meta.video && meta.video.tem_video);

  const secaoMatch = id.match(/^([A-Z])/i);
  const secao = secaoMatch ? secaoMatch[1].toUpperCase() : 'R';

  // 11 Módulos Homologados
  const combined = \`\${id} \${titulo} \${tags.join(" ")}\`.toLowerCase();
  let modulo = 'geral';
  if (/(cart[aã]o|aut[oó]grafo|reconhecimento|abertura de ficha|ficha|firma)/i.test(combined)) modulo = 'firmas';
  else if (/(dep[oó]sito pr[eé]vio|recibo|fechamento|despesa|receita|emolumento|caixa|financeiro)/i.test(combined)) modulo = 'caixa';
  else if (/(escritura|procura[cç][aã]o|testamento|invent[aá]rio|partilha|div[oó]rcio|ata notarial|notas)/i.test(combined)) modulo = 'notas';
  else if (/(selo|ressarcimento|valida[cç][aã]o de selo|lote de selo)/i.test(combined)) modulo = 'selos';
  else if (/(censec|ccn|srei|onr|e-notariado|censo|sinoreg|central)/i.test(combined)) modulo = 'centrais';
  else if (/(termo de abertura|termo de encerramento|folhas|encaderna[cç][aã]o|traslado|livro)/i.test(combined)) modulo = 'livros';
  else if (/(certid[aã]o|segunda via|pedido de certid[aã]o|busca de ato)/i.test(combined)) modulo = 'certidoes';
  else if (/(login|senha|usu[aá]rio|permiss[aã]o|perfil|operador|acesso)/i.test(combined)) modulo = 'acesso';
  else if (/(par[aâ]metro|modelo|editor|backup|ambiente|configura)/i.test(combined)) modulo = 'config';
  else if (/(whatsapp|e-mail|notifica[cç][aã]o|mensagem|comunica)/i.test(combined)) modulo = 'comunicacao';

  // Categoria
  let categoria = 'procedimento_geral';
  if (temVideo || secao === 'V') categoria = 'videoaula_tutorial';
  else if (secao === 'M') categoria = 'manual_operacional';
  else if (secao === 'D') categoria = 'demonstracao_pratica';
  else if (secao === 'C' || tags.some(t => /0800|suporte|erro/i.test(t))) categoria = 'troubleshooting_0800';

  const slug = titulo.toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);

  const fileName = \`\${id}-\${slug}.md\`;
  const filePath = \`kb/rotinas/\${modulo}/\${fileName}\`;
  const fileContent = \`---\\n\${frontmatterRaw.trim()}\\n---\\n\\n\${body}\\n\`;
  const sha256 = crypto.createHash('sha256').update(fileContent, 'utf8').digest('hex');

  compiledFiles.push({
    article_id: id,
    file_path: filePath,
    file_name: fileName,
    file_content: fileContent,
    sha256_hash: sha256,
    modulo: modulo,
    secao: secao,
    tem_video: temVideo,
    categoria: categoria,
    titulo: titulo,
    sinonimos: sinonimos,
    token_count: Math.ceil(fileContent.length / 3.8),
    attributes: {
      id: id,
      modulo: modulo,
      secao: secao,
      tem_video: temVideo ? "true" : "false",
      categoria: categoria
    }
  });
}

// 5. Inclusão dos Arquivos Estruturais (_indice.md e _glossario.md)
// _indice.md (Catálogo padrão llms.txt)
let indiceMd = \`# ÍNDICE GERAL DE ROTINAS — ORION TN (Dual-Layer RAG V3.2)\\n> Catálogo mestre de roteamento semântico, sinônimos e palavras-chave.\\n\\n\`;
const byMod = {};
for (const r of compiledFiles) {
  if (!byMod[r.modulo]) byMod[r.modulo] = [];
  byMod[r.modulo].push(r);
}
for (const m of Object.keys(byMod).sort()) {
  indiceMd += \`## MÓDULO: \${m.toUpperCase()}\\n\`;
  for (const r of byMod[m]) {
    const s = r.sinonimos.length ? \` | Sinônimos: \${r.sinonimos.slice(0, 3).join(", ")}\` : '';
    indiceMd += \`- [\${r.article_id}] \${r.titulo} (\` + r.file_path + \`)\${s}\\n\`;
  }
  indiceMd += \`\\n\`;
}
const indiceSha = crypto.createHash('sha256').update(indiceMd, 'utf8').digest('hex');
compiledFiles.push({
  article_id: '_indice',
  file_path: 'kb/_indice.md',
  file_name: '_indice.md',
  file_content: indiceMd,
  sha256_hash: indiceSha,
  modulo: 'geral',
  secao: 'SYS',
  tem_video: false,
  categoria: 'indice_mestre',
  token_count: Math.ceil(indiceMd.length / 3.8),
  attributes: {
    id: '_indice',
    modulo: 'geral',
    secao: 'SYS',
    tem_video: 'false',
    categoria: 'indice_mestre'
  }
});

// _glossario.md
const glossarioMd = \`# GLOSSÁRIO TÉCNICO E NOTARIAL — SIPLAN / ORION TN\\n> Vocabulário controlado, termos jurídicos, siglas das centrais e nomenclaturas operacionais.\\n\\n### Abertura de Firma / Ficha de Assinatura\\nRegistro inaugural dos dados pessoais, biométricos e padrão de assinatura do cliente no cartório de notas.\\n\\n### Cartão de Autógrafo\\nFicha física ou registro digital onde se encontra arquivada a assinatura do titular da firma para confronto.\\n\\n### CENSEC\\nCentral Notarial de Serviços Eletrônicos Compartilhados que congrega CESDI, RCTO, CEP e CCN.\\n\\n### CCN (Central de Comunicação de Notas)\\nMódulo integrante da CENSEC para comunicação obrigatória da lavratura de atos notariais.\\n\\n### Selo Digital de Fiscalização\\nCódigo alfanumérico único fiscalizado pela Corregedoria Geral da Justiça do Tribunal de Justiça.\\n\\n### Sinal Público\\nConfirmação e reconhecimento de assinatura de tabelião ou preposto de outra comarca.\\n\\n### Depósito Prévio\\nQuantia adiantada pelo usuário ao cartório para cobrir emolumentos de atos solicitados.\\n\\n### Livro de Notas (Livro 1)\\nLivro oficial obrigatório onde são lavradas escrituras em geral.\\n\\n### Livro de Procurações (Livro 2)\\nLivro destinado exclusivamente ao registro de instrumentos públicos de mandato.\\n\\n### Livro de Testamentos (Livro 3)\\nLivro com guarda restrita para registro de testamentos públicos e revogações.\\n\\n### Traslado\\nPrimeira cópia autêntica e integral do ato notarial entregue às partes.\\n\\n### E-Notariado\\nPlataforma oficial do notariado para prática de atos notariais eletrônicos por videoconferência.\\n\\n### Orion TN\\nSistema corporativo da Siplan Informática para Tabelionatos de Notas e Protestos.\\n\`;
const glossarioSha = crypto.createHash('sha256').update(glossarioMd, 'utf8').digest('hex');
compiledFiles.push({
  article_id: '_glossario',
  file_path: 'kb/_glossario.md',
  file_name: '_glossario.md',
  file_content: glossarioMd,
  sha256_hash: glossarioSha,
  modulo: 'geral',
  secao: 'SYS',
  tem_video: false,
  categoria: 'glossario_termos',
  token_count: Math.ceil(glossarioMd.length / 3.8),
  attributes: {
    id: '_glossario',
    modulo: 'geral',
    secao: 'SYS',
    tem_video: 'false',
    categoria: 'glossario_termos'
  }
});

// 6. Delta Engine
const filesToUpload = [];
const filesToDelete = [];
const activeArticleIds = new Set(compiledFiles.map(f => f.article_id));

// Detectar deletados no banco
for (const [artId, dbRecord] of dbFileMap.entries()) {
  if (!activeArticleIds.has(artId) && dbRecord.openai_file_id) {
    filesToDelete.push({
      old_file_id: dbRecord.openai_file_id,
      article_id: artId,
      reason: 'deleted_from_base'
    });
  }
}

// Expurgo do Monolítico Antigo se ainda estiver na Vector Store
const knownAtomicOpenAiIds = new Set(Array.from(dbFileMap.values()).map(f => f.openai_file_id).filter(Boolean));
for (const vsf of vsFiles) {
  if (!knownAtomicOpenAiIds.has(vsf.id)) {
    filesToDelete.push({
      old_file_id: vsf.id,
      article_id: 'legacy_monolithic',
      reason: 'monolithic_purge'
    });
  }
}

// Detectar novos ou alterados
for (const file of compiledFiles) {
  const existing = dbFileMap.get(file.article_id);
  if (!existing || existing.sha256_hash !== file.sha256_hash) {
    if (existing && existing.openai_file_id) {
      filesToDelete.push({
        old_file_id: existing.openai_file_id,
        article_id: file.article_id,
        reason: 'updated_routine_replace'
      });
    }

    filesToUpload.push({
      json: {
        has_changes: true,
        has_uploads: true,
        has_deletes: filesToDelete.length > 0,
        article_id: file.article_id,
        file_path: file.file_path,
        file_name: file.file_name,
        modulo: file.modulo,
        secao: file.secao,
        tem_video: file.tem_video,
        categoria: file.categoria,
        sha256_hash: file.sha256_hash,
        token_count: file.token_count,
        attributes: file.attributes,
        vector_store_id: '${VECTOR_STORE_ID}',
        files_to_delete: filesToDelete
      },
      binary: {
        data: {
          data: Buffer.from(file.file_content, 'utf8').toString('base64'),
          mimeType: 'text/markdown',
          fileName: file.file_name
        }
      }
    });
  }
}

// Garantia Explícita: Se qualquer rotina entrou em filesToUpload ou filesToDelete,
// força a inclusão de _indice.md em filesToUpload para refletir o novo catálogo imediatamente
const hasRoutineChanges = filesToUpload.some(f => f.json.article_id !== '_indice' && f.json.article_id !== '_glossario') ||
  filesToDelete.some(f => f.article_id !== '_indice' && f.article_id !== '_glossario' && f.article_id !== 'legacy_monolithic');

if (hasRoutineChanges) {
  const indiceAlreadyInUpload = filesToUpload.some(f => f.json.article_id === '_indice');
  if (!indiceAlreadyInUpload) {
    const indiceItem = compiledFiles.find(f => f.article_id === '_indice');
    if (indiceItem) {
      const existingIndice = dbFileMap.get('_indice');
      if (existingIndice && existingIndice.openai_file_id) {
        filesToDelete.push({
          old_file_id: existingIndice.openai_file_id,
          article_id: '_indice',
          reason: 'index_update_with_routine_changes'
        });
      }
      filesToUpload.push({
        json: {
          has_changes: true,
          has_uploads: true,
          has_deletes: filesToDelete.length > 0,
          article_id: indiceItem.article_id,
          file_path: indiceItem.file_path,
          file_name: indiceItem.file_name,
          modulo: indiceItem.modulo,
          secao: indiceItem.secao,
          tem_video: indiceItem.tem_video,
          categoria: indiceItem.categoria,
          sha256_hash: indiceItem.sha256_hash,
          token_count: indiceItem.token_count,
          attributes: indiceItem.attributes,
          vector_store_id: '${VECTOR_STORE_ID}',
          files_to_delete: filesToDelete
        },
        binary: {
          data: {
            data: Buffer.from(indiceItem.file_content, 'utf8').toString('base64'),
            mimeType: 'text/markdown',
            fileName: indiceItem.file_name
          }
        }
      });
    }
  }
}

// Garantir que todos os itens de filesToUpload compartilhem a lista completa e atualizada de filesToDelete
for (const item of filesToUpload) {
  item.json.files_to_delete = filesToDelete;
}

if (filesToUpload.length === 0) {
  if (filesToDelete.length === 0) {
    return [{
      json: {
        has_changes: false,
        has_uploads: false,
        has_deletes: false,
        total_compiled: compiledFiles.length,
        to_upload_count: 0,
        to_delete_count: 0,
        files_to_delete: [],
        message: "Base Orion TN 100% sincronizada. 0 deltas detectados."
      }
    }];
  } else {
    return [{
      json: {
        has_changes: true,
        has_uploads: false,
        has_deletes: true,
        total_compiled: compiledFiles.length,
        to_upload_count: 0,
        to_delete_count: filesToDelete.length,
        files_to_delete: filesToDelete,
        message: \`Expurgo de \${filesToDelete.length} arquivos antigos/monolíticos pendente.\`
      }
    }];
  }
}

return filesToUpload;`;

const codeCollectBatchUpsert = `// Agrupa todos os uploads recém-concluídos para chamada única de RPC no Supabase
const uploadNodes = $node["Upload para OpenAI Files API"].all();
const compilerItems = $node["Compilar Rotinas & Delta Calculator"].all();

const batch = [];
for (let i = 0; i < compilerItems.length; i++) {
  const comp = compilerItems[i].json;
  const up = uploadNodes[i] ? uploadNodes[i].json : null;

  if (comp && comp.article_id && up && up.id) {
    batch.push({
      article_id: comp.article_id,
      file_path: comp.file_path,
      file_name: comp.file_name,
      modulo: comp.modulo,
      secao: comp.secao,
      tem_video: comp.tem_video,
      categoria: comp.categoria,
      sha256_hash: comp.sha256_hash,
      openai_file_id: up.id,
      vector_store_id: comp.vector_store_id || '${VECTOR_STORE_ID}',
      token_count: comp.token_count,
      sync_status: 'synced'
    });
  }
}

return [{
  json: {
    batch_payload: batch,
    total_saved: batch.length
  }
}];`;

const codeCollectObsoleteFiles = `// Isola a lista de arquivos obsoletos e monolíticos para exclusão segura
const compilerItems = $node["Compilar Rotinas & Delta Calculator"].all();
let toDelete = [];

for (const it of compilerItems) {
  if (it.json && Array.isArray(it.json.files_to_delete) && it.json.files_to_delete.length > 0) {
    toDelete = it.json.files_to_delete;
    break;
  }
}

if (!toDelete.length) {
  return [{
    json: {
      has_obsolete: false,
      total_to_delete: 0
    }
  }];
}

return toDelete.map(item => ({
  json: {
    has_obsolete: true,
    old_file_id: item.old_file_id,
    article_id: item.article_id,
    reason: item.reason
  }
}));`;

const codeConsolidateFinal = `// Consolida a conclusão de todos os branches em 1 único item para finalizar o webhook
return [{
  json: {
    success: true,
    vector_store_id: '${VECTOR_STORE_ID}',
    dual_layer_version: 'v3.2',
    timestamp: new Date().toISOString()
  }
}];`;

const nodes = [
  {
    parameters: {
      httpMethod: "POST",
      path: "update-openai-vector-store",
      responseMode: "responseNode",
      options: { rawBody: false }
    },
    id: "fb7857b2-dae9-4a2b-8099-2751bedc2d31",
    name: "Webhook - Atualização Base Orion TN",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [-4600, -600],
    webhookId: "update-openai-vector-store"
  },
  {
    parameters: {
      method: "GET",
      url: `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files?limit=100`,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "OpenAI-Beta", value: "assistants=v2" }]
      },
      options: {}
    },
    id: "e7dc1418-e461-4beb-9ff6-2bee089ce87f",
    name: "Mapear Arquivos Atuais na Vector Store",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-4360, -600],
    credentials: { openAiApi: { id: OPENAI_CREDENTIAL_ID, name: "OpenAI Conta Assistentes" } }
  },
  {
    parameters: {
      method: "GET",
      url: "https://okvufcwkophaadttmjwa.supabase.co/rest/v1/assistant_knowledge_files?select=article_id,file_path,sha256_hash,openai_file_id",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "supabaseApi",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Accept", value: "application/json" }]
      },
      options: {}
    },
    id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    name: "Consultar assistant_knowledge_files",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-4120, -600],
    credentials: { supabaseApi: { id: SUPABASE_CREDENTIAL_ID, name: "Supabase Siplan HUB" } }
  },
  {
    parameters: {
      method: "GET",
      url: "https://okvufcwkophaadttmjwa.supabase.co/storage/v1/object/assistant-oriontn-doc/OrionTN%20pos.md",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "supabaseApi",
      sendHeaders: true,
      headerParameters: { parameters: [{}] },
      options: {
        response: { response: { responseFormat: "file" } }
      }
    },
    id: "3b526937-9bad-4a28-b26d-3fc5d4ed166a",
    name: "Baixar Markdown do Supabase Storage",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-3880, -600],
    credentials: { supabaseApi: { id: SUPABASE_CREDENTIAL_ID, name: "Supabase Siplan HUB" } }
  },
  {
    parameters: { jsCode: codeCompilerSource },
    id: "157bb329-3865-4fde-916d-11f784653905",
    name: "Compilar Rotinas & Delta Calculator",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-3640, -600]
  },
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [
          {
            id: "cond-has-changes",
            leftValue: "={{ $json.has_changes }}",
            rightValue: true,
            operator: { type: "boolean", operation: "equals" }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    id: "b22a7d21-18f8-4b15-a106-4752b2a6d233",
    name: "IF - Há Alguma Alteração?",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [-3400, -600]
  },
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [
          {
            id: "cond-has-uploads",
            leftValue: "={{ $json.has_uploads }}",
            rightValue: true,
            operator: { type: "boolean", operation: "equals" }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    id: "c33b8e32-29f9-5c26-b217-5863c3b7e344",
    name: "IF - Há Novos Uploads?",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [-3160, -750]
  },
  {
    parameters: {
      method: "POST",
      url: "https://api.openai.com/v1/files",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendBody: true,
      contentType: "multipart-form-data",
      bodyParameters: {
        parameters: [
          { name: "purpose", value: "assistants" },
          { parameterType: "formBinaryData", name: "file", inputDataFieldName: "data" }
        ]
      },
      options: {}
    },
    id: "421a9de9-df6e-4a2c-8671-999932c52343",
    name: "Upload para OpenAI Files API",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-2920, -900],
    credentials: { openAiApi: { id: OPENAI_CREDENTIAL_ID, name: "OpenAI Conta Assistentes" } }
  },
  {
    parameters: {
      method: "POST",
      url: `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "OpenAI-Beta", value: "assistants=v2" },
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "file_id": "{{ $json.id }}",
  "chunking_strategy": {
    "type": "static",
    "static": {
      "max_chunk_size_tokens": 1800,
      "chunk_overlap_tokens": 0
    }
  },
  "attributes": {
    "id": "{{ $('Compilar Rotinas & Delta Calculator').item.json.attributes.id }}",
    "modulo": "{{ $('Compilar Rotinas & Delta Calculator').item.json.attributes.modulo }}",
    "secao": "{{ $('Compilar Rotinas & Delta Calculator').item.json.attributes.secao }}",
    "tem_video": "{{ $('Compilar Rotinas & Delta Calculator').item.json.attributes.tem_video }}",
    "categoria": "{{ $('Compilar Rotinas & Delta Calculator').item.json.attributes.categoria }}"
  }
}`,
      options: {}
    },
    id: "4ab6c434-0a2e-426a-a342-397f209b9301",
    name: "Vincular Novo Arquivo à Vector Store",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-2680, -900],
    credentials: { openAiApi: { id: OPENAI_CREDENTIAL_ID, name: "OpenAI Conta Assistentes" } }
  },
  {
    parameters: { jsCode: codeCollectBatchUpsert },
    id: "b510d604-bceb-4b67-9c7d-b8a6ad299d6e",
    name: "Preparar Lote para Gravar no Supabase",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-2440, -900]
  },
  {
    parameters: {
      method: "POST",
      url: "https://okvufcwkophaadttmjwa.supabase.co/rest/v1/rpc/upsert_assistant_knowledge_file_batch",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "supabaseApi",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Content-Type", value: "application/json" }]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "p_files": {{ JSON.stringify($json.batch_payload) }}
}`,
      options: {}
    },
    id: "096664e7-43f9-4fd0-8c14-b6795abc8944",
    name: "Persistir Arquivos no Supabase",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-2200, -900],
    credentials: { supabaseApi: { id: SUPABASE_CREDENTIAL_ID, name: "Supabase Siplan HUB" } }
  },
  {
    parameters: { jsCode: codeCollectObsoleteFiles },
    id: "5967ca05-6b49-4dfb-aaa8-ba174a0b6582",
    name: "Isolar Arquivos Obsoletos e Monolítico",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-1960, -750]
  },
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [
          {
            id: "cond-has-obsolete",
            leftValue: "={{ $json.has_obsolete }}",
            rightValue: true,
            operator: { type: "boolean", operation: "equals" }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    id: "666e2bd0-5bda-41df-9255-d6eb0644dd0e",
    name: "IF - Há Arquivos a Deletar?",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [-1720, -750]
  },
  {
    parameters: {
      method: "DELETE",
      url: `=https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files/{{ $json.old_file_id }}`,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "OpenAI-Beta", value: "assistants=v2" }]
      },
      options: {}
    },
    id: "d1b32fc4-0a16-4e7d-984b-76f86ce579bb",
    name: "Desvincular Arquivo Antigo da Vector Store",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-1480, -850],
    credentials: { openAiApi: { id: OPENAI_CREDENTIAL_ID, name: "OpenAI Conta Assistentes" } },
    onError: "continueRegularOutput"
  },
  {
    parameters: {
      method: "DELETE",
      url: "=https://api.openai.com/v1/files/{{ $json.old_file_id }}",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendHeaders: true,
      headerParameters: { parameters: [{}] },
      options: {}
    },
    id: "ea7114d6-a3cc-47dc-a81f-d2a7f39e6190",
    name: "Deletar Arquivo Físico da Conta OpenAI",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-1240, -850],
    credentials: { openAiApi: { id: OPENAI_CREDENTIAL_ID, name: "OpenAI Conta Assistentes" } },
    onError: "continueRegularOutput"
  },
  {
    parameters: { jsCode: codeConsolidateFinal },
    id: "f8e7d6c5-b4a3-4211-9087-abcdef123456",
    name: "Consolidar Execução Final",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-1000, -600]
  },
  {
    parameters: {
      method: "POST",
      url: "https://okvufcwkophaadttmjwa.supabase.co/rest/v1/rpc/update_knowledge_version_sync_status",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "supabaseApi",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Content-Type", value: "application/json" }]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "p_version_id": "{{ $node["Webhook - Atualização Base Orion TN"].json.body.record.id || $node["Webhook - Atualização Base Orion TN"].json.body.version_id }}",
  "p_status": "synced",
  "p_metadata": {
    "vector_store_id": "${VECTOR_STORE_ID}",
    "indexed_at": "{{ $now.toISO() }}",
    "dual_layer_version": "v3.2",
    "chunking": "static_1800_overlap_0"
  }
}`,
      options: {}
    },
    id: "139bedb0-7458-41d3-91b8-38452bfea85a",
    name: "Atualizar Status Sucesso no Supabase",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-760, -600],
    credentials: { supabaseApi: { id: SUPABASE_CREDENTIAL_ID, name: "Supabase Siplan HUB" } },
    onError: "continueRegularOutput"
  },
  {
    parameters: {
      respondWith: "json",
      responseBody: `={
  "status": "success",
  "message": "Base de conhecimento Orion TN sincronizada granularmente na OpenAI Vector Store com Dual-Layer RAG V3.2!",
  "vector_store_id": "${VECTOR_STORE_ID}",
  "dual_layer_version": "v3.2",
  "chunking": "static_1800_overlap_0",
  "indexed_at": "{{ $now.toISO() }}"
}`,
      options: { responseCode: 200 }
    },
    id: "30683160-fbee-49a0-8a3b-b2455abb0381",
    name: "Responder Sucesso ao Webhook",
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.1,
    position: [-520, -600]
  }
];

const connections = {
  "Webhook - Atualização Base Orion TN": {
    main: [[{ node: "Mapear Arquivos Atuais na Vector Store", type: "main", index: 0 }]]
  },
  "Mapear Arquivos Atuais na Vector Store": {
    main: [[{ node: "Consultar assistant_knowledge_files", type: "main", index: 0 }]]
  },
  "Consultar assistant_knowledge_files": {
    main: [[{ node: "Baixar Markdown do Supabase Storage", type: "main", index: 0 }]]
  },
  "Baixar Markdown do Supabase Storage": {
    main: [[{ node: "Compilar Rotinas & Delta Calculator", type: "main", index: 0 }]]
  },
  "Compilar Rotinas & Delta Calculator": {
    main: [[{ node: "IF - Há Alguma Alteração?", type: "main", index: 0 }]]
  },
  "IF - Há Alguma Alteração?": {
    main: [
      // Branch TRUE (index 0): Há alterações
      [{ node: "IF - Há Novos Uploads?", type: "main", index: 0 }],
      // Branch FALSE (index 1): 0 deltas
      [{ node: "Consolidar Execução Final", type: "main", index: 0 }]
    ]
  },
  "IF - Há Novos Uploads?": {
    main: [
      // Branch TRUE (index 0): Há uploads
      [{ node: "Upload para OpenAI Files API", type: "main", index: 0 }],
      // Branch FALSE (index 1): Apenas deletes
      [{ node: "Isolar Arquivos Obsoletos e Monolítico", type: "main", index: 0 }]
    ]
  },
  "Upload para OpenAI Files API": {
    main: [[{ node: "Vincular Novo Arquivo à Vector Store", type: "main", index: 0 }]]
  },
  "Vincular Novo Arquivo à Vector Store": {
    main: [[{ node: "Preparar Lote para Gravar no Supabase", type: "main", index: 0 }]]
  },
  "Preparar Lote para Gravar no Supabase": {
    main: [[{ node: "Persistir Arquivos no Supabase", type: "main", index: 0 }]]
  },
  "Persistir Arquivos no Supabase": {
    main: [[{ node: "Isolar Arquivos Obsoletos e Monolítico", type: "main", index: 0 }]]
  },
  "Isolar Arquivos Obsoletos e Monolítico": {
    main: [[{ node: "IF - Há Arquivos a Deletar?", type: "main", index: 0 }]]
  },
  "IF - Há Arquivos a Deletar?": {
    main: [
      // Branch TRUE (index 0): Deletar arquivos obsoletos
      [{ node: "Desvincular Arquivo Antigo da Vector Store", type: "main", index: 0 }],
      // Branch FALSE (index 1): Sem arquivos para deletar
      [{ node: "Consolidar Execução Final", type: "main", index: 0 }]
    ]
  },
  "Desvincular Arquivo Antigo da Vector Store": {
    main: [[{ node: "Deletar Arquivo Físico da Conta OpenAI", type: "main", index: 0 }]]
  },
  "Deletar Arquivo Físico da Conta OpenAI": {
    main: [[{ node: "Consolidar Execução Final", type: "main", index: 0 }]]
  },
  "Consolidar Execução Final": {
    main: [[{ node: "Atualizar Status Sucesso no Supabase", type: "main", index: 0 }]]
  },
  "Atualizar Status Sucesso no Supabase": {
    main: [[{ node: "Responder Sucesso ao Webhook", type: "main", index: 0 }]]
  }
};

const payload = {
  id: "mNQ9HfJUls39FIVi",
  name: "Siplan HUB - Sincronização OpenAI Vector Store",
  nodes,
  connections
};

fs.writeFileSync("scripts/refactored-workflow.json", JSON.stringify(payload, null, 2), "utf8");
console.log("Workflow payload successfully generated in scripts/refactored-workflow.json");
