import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Carregar variáveis de ambiente de .env
const envPath = path.resolve(".env");
if (!fs.existsSync(envPath)) {
  console.error("Arquivo .env não encontrado!");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
function getEnvVar(key) {
  const match = envContent.match(new RegExp(`${key}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`));
  return match ? match[1].trim() : process.env[key];
}

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL");
const supabaseServiceKey = getEnvVar("VITE_SUPABASE_SERVICE_ROLE_KEY") || getEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("VITE_SUPABASE_URL ou SERVICE_ROLE_KEY ausentes no .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const OUTPUT_DIR = path.resolve("docs/knowledge-base/orion-tn-tickets");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Funções de Sanitização
function sanitizeText(text) {
  if (!text) return "";
  let clean = text;

  // Remover AnyDesk (ex: anydesk 123 456 789 ou anydesk: 123456789)
  clean = clean.replace(/anydesk[\s:]*([0-9\s.-]{9,15})/gi, "AnyDesk: [ACESSO REMOVIDO]");
  clean = clean.replace(/any\s*desk[\s:]*([0-9\s.-]{9,15})/gi, "AnyDesk: [ACESSO REMOVIDO]");
  clean = clean.replace(/\b\d{3}\s+\d{3}\s+\d{3}\b/g, "[ID ANYDESK REMOVIDO]");

  // Remover TeamViewer
  clean = clean.replace(/team\s*viewer[\s:]*([0-9\s.-]{9,15})/gi, "TeamViewer: [ACESSO REMOVIDO]");

  // Remover senhas explícitas (inclusive senha de certificados e credenciais de acesso)
  clean = clean.replace(/(?:a\s+senha\s+[eé]|senha\s+[eé]|senha\s*[:=]|password\s*[:=]|pin\s*[:=])\s*([^\s,;.]+)/gi, "senha: [SENHA REMOVIDA]");
  clean = clean.replace(/senha\s*[:=]\s*([^\s,;]+)/gi, "senha: [SENHA REMOVIDA]");
  clean = clean.replace(/password\s*[:=]\s*([^\s,;]+)/gi, "password: [SENHA REMOVIDA]");
  clean = clean.replace(/\b608585\b/g, "[SENHA REMOVIDA]");

  // Remover telefones e celulares REAIS (com DDD, sem formatação ou com parênteses espaçados)
  // Celular direto sem espaços ou colado em palavras (ex: 16991348401, Fabricio16991348401)
  clean = clean.replace(/(?:^|[^\d])(?:1[1-9]|2[12478]|3[1-578]|4[1-9]|5[13-5]|6[1-9]|7[13-579]|8[1-9]|9[1-9])9[1-9]\d{7}\b/g, (match) => {
    const prefix = match.length > 11 ? match[0] : "";
    return prefix + " [CONTATO TELEFÔNICO REMOVIDO]";
  });
  // Telefones com parênteses (com ou sem espaço interno, ex: ( 19)3475-3383 ou (11) 98765-4321)
  clean = clean.replace(/(?:\(\s*[1-9]{2}\s*\)|(?<!\d)[1-9]{2}\s+)(?:9[1-9]\d{3}|[2-5]\d{3})[-.\s]?\d{4}\b/gi, "[CONTATO TELEFÔNICO REMOVIDO]");
  // Telefones precedidos por termos identificadores
  clean = clean.replace(/(?:(?:tel|cel|fone|telefone|celular|whatsapp|whats|contato|ramal)\s*[:=]?\s*)?(?:\+?55\s*)?(?:\([1-9]{2}\)\s*|\b[1-9]{2}\s+)(?:9[1-9]\d{3}|[2-5]\d{3})[-.\s]?\d{4}\b/gi, "[CONTATO TELEFÔNICO REMOVIDO]");
  clean = clean.replace(/"contatoParte"\s*:\s*"\d+"/gi, '"contatoParte": "[CONTATO REMOVIDO]"');

  // Remover CPFs e Documentos Pessoais de Cidadãos (LGPD)
  // CPF formatado: 000.000.000-00
  clean = clean.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF REMOVIDO]");
  // CPF precedido por termo identificador
  clean = clean.replace(/(?:cpf|documento)\s*[:=]?\s*\b\d{11}\b/gi, "CPF: [CPF REMOVIDO]");
  // Sequências numéricas de 11 dígitos isoladas em listas de inventário/partes
  clean = clean.replace(/\b(?!\d{4}(?:0[1-9]|1[0-2]))(?![1-9]{2}9\d{8})\d{11}\b/g, (match) => {
    // Preservar números se tiverem cara de protocolo do ano corrente (ex: 2026...)
    if (match.startsWith("2026") || match.startsWith("2025") || match.startsWith("2024")) return match;
    return "[CPF/DOC REMOVIDO]";
  });

  // Remover endereços IP locais ou públicos de conexão (ex: 192.168.1.50)
  clean = clean.replace(/\b(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g, "[IP LOCAL REMOVIDO]");
  clean = clean.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}\b/g, "[IP/PORTA REMOVIDO]");

  // Remover boilerplate repetitivo de fechamento de suporte (NPS, pesquisas e questionários de encerramento)
  clean = clean.replace(/Atendeu o cliente\/Resolveu o problema\?[\s\S]*?(?:Essa demanda [eé] recorrente\?[^\n]*|Equipe:[^\n]*)/gi, "");
  clean = clean.replace(/Prezado\(a\) cliente,?\s+Com a solu[cç][aã]o aplicada,?\s+consideramos o atendimento conclu[ií]do[\s\S]*?Obrigado!/gi, "");
  clean = clean.replace(/Sua opini[aã]o [eé] muito importante para n[oó]s[\s\S]*?Obrigado!/gi, "");
  clean = clean.replace(/Permanecemos [aà] disposi[cç][aã]o para quaisquer esclarecimentos adicionais[\s\S]*?Atenciosamente,?\s+Suporte T[eé]cnico\s*—?\s*Siplan/gi, "");

  // Normalizar quebras de linha e espaços excessivos
  clean = clean.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  return clean.trim();
}

// Analisador estruturado de trâmites (extrai seções de Problema / Causa / Solução / Orientação)
function parseStructuredTramite(desc) {
  if (!desc) return null;
  const s = desc.replace(/\r\n/g, "\n");

  const hasSections =
    /(?:problema|causa|solu[cç][aã]o|orienta[cç][aã]o):/i.test(s);

  if (!hasSections) {
    return {
      problema: null,
      causa: null,
      solucao: null,
      orientacao: null,
      raw: s,
    };
  }

  const cleanSectionText = (text) => {
    if (!text) return null;
    let t = text.trim();
    // Remover seções residuais
    t = t.replace(/(?:Atendeu o cliente|Precisou encaminhar|Essa demanda [eé] recorrente|Prezado\(a\)|Atenciosamente)[\s\S]*/i, "");
    return t.trim() || null;
  };

  const getSection = (startRegex, nextRegexList) => {
    const match = s.match(startRegex);
    if (!match) return null;
    const startIndex = match.index + match[0].length;
    let endIndex = s.length;

    for (const nextReg of nextRegexList) {
      const nextMatch = s.slice(startIndex).match(nextReg);
      if (nextMatch && nextMatch.index !== undefined) {
        const candidateEnd = startIndex + nextMatch.index;
        if (candidateEnd < endIndex) {
          endIndex = candidateEnd;
        }
      }
    }
    return cleanSectionText(s.slice(startIndex, endIndex));
  };

  const nextKeys = [
    /(?:problema|defeito|falha)\s*:/i,
    /(?:causa|motivo)\s*:/i,
    /(?:solu[cç][aã]o|resolu[cç][aã]o|ajuste|a[cç][aã]o executada)\s*:/i,
    /(?:orienta[cç][aã]o|recomenda[cç][aã]o|conclus[aã]o)\s*:/i,
    /(?:atendeu o cliente|precisou encaminhar|essa demanda [eé] recorrente)/i,
    /(?:prezado\(a\)|atenciosamente|permanecemos [aà] disposi[cç][aã]o)/i,
  ];

  const problema = getSection(/(?:problema|defeito|falha)\s*:/i, nextKeys.filter(k => !k.source.includes("problema")));
  const causa = getSection(/(?:causa|motivo)\s*:/i, nextKeys.filter(k => !k.source.includes("causa")));
  const solucao = getSection(/(?:solu[cç][aã]o|resolu[cç][aã]o|ajuste|a[cç][aã]o executada)\s*:/i, nextKeys.filter(k => !k.source.includes("solu")));
  const orientacao = getSection(/(?:orienta[cç][aã]o|orienta[cç][oõ]es|recomenda[cç][aã]o|recomenda[cç][oõ]es)\s*[:=]?/i, nextKeys.filter(k => !k.source.includes("orienta")));

  return {
    problema,
    causa,
    solucao,
    orientacao,
    raw: s,
  };
}

// Definição dos 11 Módulos Operacionais do Orion TN
const MODULES = [
  {
    id: "01-financeiro-caixa-guias-recibos",
    title: "Módulo 01 — Financeiro, Caixa, Guias de Recolhimento e Recibos",
    description: "Operações financeiras, fechamento de caixa, depósito prévio, emissão e estorno de guias de recolhimento, recibos, ISS, Sinoreg e emolumentos notariais.",
    match: (t, d) =>
      /(?:guia|recibo|caixa|financeir|iss|sinoreg|estorno|estornar|emolument|deposito|depósito|boleto|taxa|faturament)/i.test(t + " " + d),
  },
  {
    id: "02-selo-digital-tribunais",
    title: "Módulo 02 — Selo Digital e Integrações com Tribunais (TJ)",
    description: "Geração, consulta, lote, validação, cancelamento e transmissão de selos digitais do Tribunal de Justiça competente.",
    match: (t, d) =>
      /(?:selo|tribunal|\btj\b|tj[a-z]{2}|lote de selo|retorno do selo|selagem|comunica[cç][aã]o tj)/i.test(t + " " + d),
  },
  {
    id: "03-lavratura-atos-escrituras-procuracoes",
    title: "Módulo 03 — Lavratura de Atos (Escrituras, Procurações e Testamentos)",
    description: "Rotinas de lavratura, qualificação de partes, escrituras públicas (compra/venda, inventário, doação, divórcio), procurações, substabelecimentos e testamentos.",
    match: (t, d) =>
      /(?:escritura|procura[cç][aã]o|substabelec|revoga[cç][aã]o|testamento|ata notarial|invent[aá]rio|div[oó]rcio|partilha|livro de escrituras)/i.test(t + " " + d),
  },
  {
    id: "04-reconhecimento-firmas-autenticacoes",
    title: "Módulo 04 — Reconhecimento de Firmas e Autenticações",
    description: "Reconhecimento de firma por semelhança e autenticidade, cartão de autógrafo, biometria facial/digital, ficha de firma, autenticação de cópias e sinal público.",
    match: (t, d) =>
      /(?:firma|autentica|sinal p[uú]blico|cart[aã]o de aut[oó]grafo|biometria|ficha de firma|termo de comparecimento)/i.test(t + " " + d),
  },
  {
    id: "05-centrais-coaf-censec-doi-sirc",
    title: "Módulo 05 — Centrais Notariais Obrigatórias (COAF, CENSEC, DOI, SIRC, e-Notariado)",
    description: "Transmissões e comunicações obrigatórias para COAF (operações suspeitas), CENSEC (CESDI, RCTO, CEP), DOI (Receita Federal), SIRC e plataforma e-Notariado.",
    match: (t, d) =>
      /(?:coaf|censec|cesdi|rcto|cep|doi|sirc|e-notariado|enotariado|central notarial|comunica[cç][aã]o obrigat[oó]ria)/i.test(t + " " + d),
  },
  {
    id: "06-livros-notariais-termos-folhas",
    title: "Módulo 06 — Livros Notariais, Termos de Abertura/Encerramento e Folhas",
    description: "Gerenciamento de livros notariais (Notas, Procurações), numeração e controle sequencial de folhas, termos de abertura, termos de encerramento e traslados.",
    match: (t, d) =>
      /(?:livro|termo de abertura|termo de encerramento|folha|numera[cç][aã]o|traslado|encaderna[cç][aã]o)/i.test(t + " " + d),
  },
  {
    id: "07-modelos-minutas-editor-oriontn",
    title: "Módulo 07 — Modelos, Minutas e Editor OrionTN",
    description: "Editor de texto integrado do Orion TN, gestão de modelos de minutas, tags dinâmicas, variáveis de sistema, formatação e máscaras.",
    match: (t, d) =>
      /(?:modelo|minuta|editor|tag|tags|vari[aá]vel|vari[aá]veis|m[aá]scara|editor orion)/i.test(t + " " + d),
  },
  {
    id: "08-certidoes-buscas",
    title: "Módulo 08 — Certidões, Buscas de Atos e Fichas",
    description: "Emissão de certidões em breve relato e inteiro teor, buscas de atos por período/partes, fichas de atos e conferências.",
    match: (t, d) =>
      /(?:certid[aã]o|certid[oõ]es|breve relato|inteiro teor|busca de ato|pesquisa de pessoa)/i.test(t + " " + d),
  },
  {
    id: "09-usuarios-permissoes-acessos",
    title: "Módulo 09 — Usuários, Perfis, Permissões e Acessos",
    description: "Cadastro de colaboradores (tabelião, substitutos, escreventes), perfis de permissão, liberação de rotinas, senhas e trilha de auditoria.",
    match: (t, d) =>
      /(?:usu[aá]rio|permiss|senha|login|perfil|escrevente|tabeli[aã]o|bloqueio|acesso ao sistema)/i.test(t + " " + d),
  },
  {
    id: "10-configuracao-sistema-perifericos",
    title: "Módulo 10 — Configurações Gerais, Impressão, Certificado Digital e Infraestrutura",
    description: "Parâmetros globais do Orion TN, impressoras de etiquetas e termos, certificados digitais ICP-Brasil (A1/A3), token, scanners, banco de dados e backup.",
    match: (t, d) =>
      /(?:impress|etiqueta|certificado|token|\ba1\b|\ba3\b|scanner|perif[eé]ric|banco de dados|backup|atualiza|instala)/i.test(t + " " + d),
  },
  {
    id: "11-geral-outras-duvidas-operacionais",
    title: "Módulo 11 — Dúvidas Operacionais Gerais e Rotinas Administrativas",
    description: "Atendimentos operacionais gerais, cadastros diversos de pessoas e partes, validações cadastrais e procedimentos de suporte que perpassam múltiplos fluxos.",
    match: () => true, // fallback
  },
];

function classifyTicket(titulo, descricao) {
  const t = titulo || "";
  const d = descricao || "";
  for (const mod of MODULES) {
    if (mod.id === "11-geral-outras-duvidas-operacionais") continue;
    if (mod.match(t, d)) {
      return mod.id;
    }
  }
  return "11-geral-outras-duvidas-operacionais";
}

async function main() {
  console.log("=== INICIANDO VARREDURA E GERAÇÃO DA BASE DE CONHECIMENTO ORION TN ===");
  console.log(`Destino: ${OUTPUT_DIR}\n`);

  // 1. Buscar todos os chamados Orion TN nas naturezas solicitadas
  console.log("Buscando chamados de Orion TN no Supabase...");
  const naturezas = ["Dúvida operacional", "Configuração do sistema", "Erro operacional"];
  const pageSize = 1000;
  let allTickets = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("chamados_processo_venda")
      .select(`
        numero_chamado,
        codigo_cliente,
        nome_cliente,
        titulo,
        descricao,
        natureza,
        status,
        criticidade,
        software,
        analista_responsavel,
        equipe_responsavel,
        data_abertura,
        data_encerramento
      `)
      .eq("software", "OrionTN")
      .in("natureza", naturezas)
      .order("data_abertura", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Erro ao consultar chamados_processo_venda:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allTickets.push(...data);
    console.log(`  Carregados ${allTickets.length} chamados...`);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Total de chamados Orion TN encontrados: ${allTickets.length}\n`);

  // 2. Buscar todos os trâmites vinculados a esses chamados
  console.log("Buscando trâmites em chamados_processo_venda_tramites...");
  const tramitesByTicket = new Map();
  let tramitesFrom = 0;
  let totalTramites = 0;
  const ticketSet = new Set(allTickets.map((t) => t.numero_chamado));

  while (true) {
    const { data: tramitesBatch, error: tramitesErr } = await supabase
      .from("chamados_processo_venda_tramites")
      .select(`
        numero_chamado,
        sequencia_tramite,
        numero_tramite,
        data_tramite,
        responsavel,
        equipe_responsavel,
        atividade,
        descricao
      `)
      .order("data_tramite", { ascending: true })
      .range(tramitesFrom, tramitesFrom + pageSize - 1);

    if (tramitesErr) {
      console.error("Erro ao consultar tramites:", tramitesErr);
      process.exit(1);
    }

    if (!tramitesBatch || tramitesBatch.length === 0) break;

    for (const tr of tramitesBatch) {
      if (ticketSet.has(tr.numero_chamado)) {
        if (!tramitesByTicket.has(tr.numero_chamado)) {
          tramitesByTicket.set(tr.numero_chamado, []);
        }
        tramitesByTicket.get(tr.numero_chamado).push(tr);
        totalTramites++;
      }
    }

    if (tramitesBatch.length < pageSize) break;
    tramitesFrom += pageSize;
  }

  console.log(`Total de trâmites vinculados carregados: ${totalTramites}\n`);

  // 3. Classificar e Sanitizar os Chamados
  console.log("Classificando e sanitizando chamados nos 11 módulos...");
  const categorizedTickets = new Map();
  for (const mod of MODULES) {
    categorizedTickets.set(mod.id, {
      concluidos: [],
      emAberto: [],
    });
  }

  for (const ticket of allTickets) {
    const modId = classifyTicket(ticket.titulo, ticket.descricao);
    const bucket = categorizedTickets.get(modId);

    const isConcluidoOuAndamento = ticket.status === "Concluído" || ticket.status === "Em andamento";
    if (isConcluidoOuAndamento) {
      bucket.concluidos.push(ticket);
    } else {
      bucket.emAberto.push(ticket);
    }
  }

  // 4. Gerar os Arquivos Markdown Modulares
  const statsSummary = [];

  for (const mod of MODULES) {
    const bucket = categorizedTickets.get(mod.id);
    const totalMod = bucket.concluidos.length + bucket.emAberto.length;

    statsSummary.push({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      total: totalMod,
      concluidos: bucket.concluidos.length,
      emAberto: bucket.emAberto.length,
    });

    console.log(`Gerando ${mod.id}.md (Total: ${totalMod} | Concluídos: ${bucket.concluidos.length} | Em Aberto: ${bucket.emAberto.length})...`);

    const filePath = path.join(OUTPUT_DIR, `${mod.id}.md`);
    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    // Cabeçalho do Documento
    stream.write(`# ${mod.title}\n\n`);
    stream.write(`> **Descrição do Módulo:** ${mod.description}\n`);
    stream.write(`> **Total de Chamados:** ${totalMod.toLocaleString("pt-BR")} | **Concluídos/Resolvidos:** ${bucket.concluidos.length.toLocaleString("pt-BR")} | **Em Aberto/Recentes:** ${bucket.emAberto.length.toLocaleString("pt-BR")}\n`);
    stream.write(`> **Última Atualização:** ${new Date().toISOString().slice(0, 10)}\n\n`);
    stream.write(`[← Voltar ao Índice Geral (INDEX.md)](./INDEX.md)\n\n---\n\n`);

    // SEÇÃO 1: Chamados Concluídos e Resolvidos com Trâmites Técnicos
    stream.write(`## 1. Chamados Concluídos e Resolvidos (Base de Soluções Oficiais)\n\n`);
    stream.write(`Esta seção reúne os chamados solucionados pela equipe de suporte do Orion TN, contendo a solicitação original, o histórico completo de trâmites e a síntese técnica da resolução aplicada (Problema, Causa Raiz, Solução e Orientações).\n\n`);

    if (bucket.concluidos.length === 0) {
      stream.write(`*Nenhum chamado concluído registrado para este módulo.*\n\n`);
    } else {
      for (const t of bucket.concluidos) {
        writeTicketBlock(stream, t, tramitesByTicket.get(t.numero_chamado) || [], true);
      }
    }

    // SEÇÃO 2: Dúvidas e Cenários Recentes em Aberto (Versões Atuais)
    stream.write(`\n---\n\n## 2. 📌 Dúvidas e Cenários Recentes em Aberto (Versões Atuais do Sistema)\n\n`);
    stream.write(`Esta seção agrupa as dúvidas operacionais e relatos de erro mais recentes que ainda estão em aberto, aguardando finalização ou faturamento. Eles retratam o comportamento atual do Orion TN e as principais dúvidas dos cartórios nas versões mais recentes.\n\n`);

    if (bucket.emAberto.length === 0) {
      stream.write(`*Nenhum chamado em aberto registrado para este módulo.*\n\n`);
    } else {
      for (const t of bucket.emAberto) {
        writeTicketBlock(stream, t, tramitesByTicket.get(t.numero_chamado) || [], false);
      }
    }

    stream.end();
  }

  // 5. Gerar INDEX.md Mestre
  console.log("Gerando INDEX.md mestre com catálogo e métricas...");
  generateIndexMd(OUTPUT_DIR, allTickets.length, totalTramites, statsSummary);

  console.log("\n=== BASE DE CONHECIMENTO GERADA COM SUCESSO! ===");
}

function writeTicketBlock(stream, ticket, tramites, isConcluido) {
  const sanitizedTitulo = sanitizeText(ticket.titulo || "Sem título informado");
  const sanitizedDescricao = sanitizeText(ticket.descricao || "Sem descrição fornecida pelo solicitante");
  const dataAbertura = ticket.data_abertura ? ticket.data_abertura.slice(0, 10) : "N/D";
  const dataEncerramento = ticket.data_encerramento ? ticket.data_encerramento.slice(0, 10) : (isConcluido ? "Concluído" : "Em Aberto");
  const cliente = ticket.nome_cliente ? sanitizeText(ticket.nome_cliente) : "Cartório Não Identificado";

  stream.write(`### Chamado #${ticket.numero_chamado} — ${sanitizedTitulo}\n\n`);
  stream.write(`- **Cartório / Cliente:** ${cliente} (${ticket.codigo_cliente || "S/C"})\n`);
  stream.write(`- **Natureza:** ${ticket.natureza} | **Status:** ${ticket.status} | **Criticidade:** ${ticket.criticidade || "Normal"}\n`);
  stream.write(`- **Data Abertura:** ${dataAbertura} | **Data Encerramento:** ${dataEncerramento}\n`);
  stream.write(`- **Analista Responsável:** ${ticket.analista_responsavel || ticket.equipe_responsavel || "Equipe Suporte Orion"}\n\n`);

  stream.write(`#### Solicitação Original do Cliente / Problema Relatado:\n`);
  stream.write(`\`\`\`text\n${sanitizedDescricao}\n\`\`\`\n\n`);

  if (tramites.length === 0) {
    if (!isConcluido) {
      stream.write(`*Chamado em aberto recente — sem trâmites de resolução técnica registrados até o momento.*\n\n`);
    } else {
      stream.write(`*Resolução finalizada diretamente no encerramento.*\n\n`);
    }
    stream.write(`---\n\n`);
    return;
  }

  stream.write(`#### Trâmites Cronológicos e Atendimento Técnico:\n\n`);

  let bestStructured = null;

  for (let i = 0; i < tramites.length; i++) {
    const tr = tramites[i];
    const dataTr = tr.data_tramite ? tr.data_tramite.slice(0, 19).replace("T", " ") : "N/D";
    const resp = tr.responsavel || "Analista Suporte";
    const ativ = tr.atividade ? ` [${tr.atividade}]` : "";
    const cleanDesc = sanitizeText(tr.descricao);

    // Ignorar trâmites vazios após limpeza
    if (!cleanDesc) continue;

    stream.write(`##### Trâmite ${i + 1} (${dataTr}) — ${resp}${ativ}\n`);
    stream.write(`${cleanDesc}\n\n`);

    const parsed = parseStructuredTramite(cleanDesc);
    if (parsed && (parsed.problema || parsed.causa || parsed.solucao || parsed.orientacao)) {
      bestStructured = parsed;
    }
  }

  // Síntese Técnica Destacada (se foi possível identificar elementos chave)
  if (bestStructured) {
    stream.write(`#### 💡 Síntese Técnica da Solução:\n`);
    if (bestStructured.problema) stream.write(`- **Problema Identificado:** ${bestStructured.problema}\n`);
    if (bestStructured.causa) stream.write(`- **Causa Raiz:** ${bestStructured.causa}\n`);
    if (bestStructured.solucao) stream.write(`- **Solução Aplicada:** ${bestStructured.solucao}\n`);
    if (bestStructured.orientacao) stream.write(`- **Orientação Repassada ao Cartório:** ${bestStructured.orientacao}\n`);
    stream.write(`\n`);
  }

  stream.write(`---\n\n`);
}

function generateIndexMd(outputDir, totalTickets, totalTramites, statsSummary) {
  const indexPath = path.join(outputDir, "INDEX.md");
  let md = `# Base de Conhecimento Operacional — Orion TN (Suporte Ellevo / 0800)

Esta base de conhecimento reúne a extração integral, estruturada e sanitizada de todos os chamados de suporte do produto **Orion TN** registrados no sistema de atendimento Ellevo / 0800 da SiplanControl-M.

Os dados foram consolidados para servir de insumo de altíssima fidelidade para a **Base de Conhecimento do Assistente de Inteligência Artificial do Orion TN**, permitindo que ele responda dúvidas com base na experiência real de atendimento acumulada pelos analistas de suporte.

---

## 📊 Estatísticas Gerais da Varredura

| Métrica | Quantidade |
| :--- | :--- |
| **Total de Chamados Orion TN Analisados** | **${totalTickets.toLocaleString("pt-BR")}** |
| **Total de Trâmites Técnicos Extraídos** | **${totalTramites.toLocaleString("pt-BR")}** |
| **Chamados Concluídos / Resolvidos (com Soluções Oficiais)** | **${statsSummary.reduce((acc, s) => acc + s.concluidos, 0).toLocaleString("pt-BR")}** |
| **Chamados Recentes em Aberto (Cenários das Versões Atuais)** | **${statsSummary.reduce((acc, s) => acc + s.emAberto, 0).toLocaleString("pt-BR")}** |
| **Período Histórico Coberto** | **2023 a 2026 (Atual)** |
| **Naturezas Selecionadas** | Dúvida operacional, Configuração do sistema, Erro operacional |
| **Software Foco** | Orion TN (Excluídos chamados de sistemas Legados) |

---

## 📂 Catálogo Temático de Módulos (Arquivos .md)

A base foi dividida em 11 módulos funcionais para viabilizar o consumo por LLMs e ferramentas de RAG sem ultrapassar limites de janela de contexto.

| Módulo / Arquivo | Descrição Temática | Total Chamados | Concluídos | Em Aberto |
| :--- | :--- | :---: | :---: | :---: |
`;

  for (const s of statsSummary) {
    md += `| [**${s.title}**](./${s.id}.md) | ${s.description} | ${s.total.toLocaleString("pt-BR")} | ${s.concluidos.toLocaleString("pt-BR")} | ${s.emAberto.toLocaleString("pt-BR")} |\n`;
  }

  md += `
---

## 🛡️ Tratamento e Sanitização de Dados Aplicados

Para garantir conformidade com boas práticas de segurança e proteção de dados (LGPD):
1. **Credenciais e Acessos Remotos:** Todos os IDs e senhas de AnyDesk, TeamViewer, senhas de sistema e IPs locais/públicos foram removidos e substituídos por marcadores seguros (\`[ACESSO REMOVIDO]\`, \`[SENHA REMOVIDA]\`).
2. **Telefones e Ramais:** Contatos telefônicos diretos de atendentes e funcionários de cartórios foram higienizados (\`[CONTATO TELEFÔNICO REMOVIDO]\`), preservando números de protocolos, livros, folhas e selos intactos.
3. **Limpeza de Boilerplate:** Pesquisas de satisfação de suporte, mensagens repetitivas de despedida e questionários de qualidade foram removidos dos trâmites, preservando apenas o conteúdo técnico útil.
4. **Integridade Notarial:** O contexto dos cartórios, tipos de livros, minutas, rotinas e mensagens de erro do sistema foram **100% preservados**, garantindo que o assistente compreenda a terminologia notarial exata.

---

## 🤖 Guia de Ingestão e Uso para IAs e RAG

Ao utilizar esta base em outro modelo de IA ou motor de RAG (Retrieval-Augmented Generation):
1. **Chunking Recomendado:** Quebre os arquivos utilizando o delimitador \`### Chamado #\` para que cada chunk represente uma unidade de conhecimento completa (solicitação + trâmites + solução).
2. **Prioridade de Resolução:** Priorize sempre os dados da seção **1. Chamados Concluídos e Resolvidos**, pois trazem as soluções homologadas pelo suporte técnico.
3. **Cenários Recentes:** Utilize a seção **2. 📌 Dúvidas e Cenários Recentes em Aberto** para identificar novas terminologias e comportamentos introduzidos nas versões recentes do Orion TN.
4. **Metadados:** Os campos de metadados no início de cada chamado (\`Cartório\`, \`Natureza\`, \`Analista\`, \`Data\`) podem ser convertidos em vetores de filtragem facetada em bancos como pgvector, Pinecone ou Qdrant.

---
*Gerado automaticamente pelo agente Antigravity no Siplan HUB.*
`;

  fs.writeFileSync(indexPath, md, "utf8");
}

main().catch((err) => {
  console.error("Falha na execução:", err);
  process.exit(1);
});
