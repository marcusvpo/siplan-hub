import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://okvufcwkophaadttmjwa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnVmY3drb3BoYWFkdHRtandhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDMyODgwMywiZXhwIjoyMDc5OTA0ODAzfQ.vBW6rUTeTXrzFa6AcYTv-ysw5m0A9YiNK4F3z5w8aP8'
);

function normalizeName(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'DE', 'DO', 'DA', 'DOS', 'DAS', 'E', 'EM', 'SP', 'CARTORIO', 'OFICIAL', 'OFICIO',
  'TABELIAO', 'TABELIONATO', 'NOTAS', 'PROTESTO', 'PROTESTOS', 'REGISTRO', 'CIVIL',
  'IMOVEIS', 'TITULOS', 'DOCUMENTOS', 'PESSOAS', 'JURIDICAS', 'JURIDICA', 'LETRAS',
  'ANEXOS', 'COMARCA', 'MUNICIPIO', 'DISTRITO', 'SUBDISTRITO', 'RCPN', 'RI', 'RTD', 'TAB',
  'PESSOA', '1', '2', '3', '4', '01', '02', '03', '04', '1O', '2O', '3O', '4O', '1º', '2º', '3º', '4º'
]);

function extractCoreTokens(name) {
  if (!name || name === '—') return { raw: name || '', norm: '', tokens: [], city: null };
  const norm = normalizeName(name);
  const rawTokens = norm.split(' ').filter(Boolean);
  const tokens = rawTokens.filter(t => t.length > 2 && !STOP_WORDS.has(t));
  return { raw: name, norm, tokens, city: tokens[0] || null };
}

function matchClientToProject(clientName, projects) {
  if (!clientName || clientName === '—') return null;
  const c = extractCoreTokens(clientName);
  if (c.tokens.length === 0) return null;

  let bestMatch = null;
  let maxScore = 0;

  for (const p of projects) {
    const pTokens = extractCoreTokens(p.client_name);
    if (pTokens.tokens.length === 0) continue;

    // Direct exact normalized string
    if (c.norm === pTokens.norm) {
      return { project: p, score: 1.0, matchType: 'exact' };
    }

    // Significant substring (at least 6 chars)
    if (c.norm.length >= 6 && pTokens.norm.length >= 6) {
      if (c.norm.includes(pTokens.norm) || pTokens.norm.includes(c.norm)) {
        const score = 0.9;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = { project: p, score, matchType: 'contains' };
        }
      }
    }

    // Token overlap: how many significant tokens match?
    const commonTokens = c.tokens.filter(t => pTokens.tokens.includes(t));
    if (commonTokens.length > 0) {
      // First token in Brazilian notary naming is almost always the City / District
      const firstTokenMatch = c.tokens[0] === pTokens.tokens[0];
      const matchRatio = (commonTokens.length * 2) / (c.tokens.length + pTokens.tokens.length);

      if (firstTokenMatch || commonTokens.length >= 2 || (commonTokens.length === 1 && commonTokens[0].length >= 6)) {
        const score = (firstTokenMatch ? 0.4 : 0.2) + matchRatio * 0.5;
        if (score > maxScore && score >= 0.5) {
          maxScore = score;
          bestMatch = { project: p, score, matchType: 'token_overlap', commonTokens };
        }
      }
    }
  }

  return bestMatch;
}

async function parseXlsx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const workbookXml = await zip.file('xl/workbook.xml').async('text');
  const sheetMatches = [...workbookXml.matchAll(/<sheet\s+name="([^"]+)"\s+sheetId="([^"]+)"\s+r:id="([^"]+)"/g)];
  
  let sharedStrings = [];
  const sharedStringsFile = zip.file('xl/sharedStrings.xml');
  if (sharedStringsFile) {
    const ssXml = await sharedStringsFile.async('text');
    const siMatches = [...ssXml.matchAll(/<si>(.*?)<\/si>/gs)];
    sharedStrings = siMatches.map(m => {
      const tMatches = [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)];
      return tMatches.map(t => decodeXml(t[1])).join('');
    });
  }

  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('text');
  const relMatches = [...relsXml.matchAll(/<Relationship\s+Id="([^"]+)"\s+Type="[^"]*worksheet"\s+Target="([^"]+)"/g)];
  const relMap = new Map(relMatches.map(m => [m[1], m[2]]));

  const result = { fileName: path.basename(filePath), sheets: {} };

  for (const match of sheetMatches) {
    const sheetName = decodeXml(match[1]);
    const rId = match[3];
    const target = relMap.get(rId) || `worksheets/sheet${match[2]}.xml`;
    const targetPath = target.startsWith('xl/') ? target : `xl/${target.replace(/^\//, '')}`;
    const sheetFile = zip.file(targetPath);
    if (!sheetFile) continue;

    const sheetXml = await sheetFile.async('text');
    const rows = parseSheetXml(sheetXml, sharedStrings);
    result.sheets[sheetName] = rows;
  }

  return result;
}

function parseSheetXml(xml, sharedStrings) {
  const rows = [];
  const rowMatches = [...xml.matchAll(/<row\s+r="(\d+)"[^>]*>(.*?)<\/row>/gs)];

  for (const rMatch of rowMatches) {
    const rowContent = rMatch[2];
    const cellMatches = [...rowContent.matchAll(/<c\s+r="([A-Z]+)(\d+)"(?:\s+s="[^"]*")?(?:\s+t="([^"]*)")?[^>]*>(.*?)<\/c>/gs)];
    
    const rowData = {};
    for (const cMatch of cellMatches) {
      const colLetter = cMatch[1];
      const colIndex = colLetterToIndex(colLetter);
      const cellType = cMatch[3];
      const cellBody = cMatch[4];

      let val = null;
      if (cellType === 'inlineStr') {
        const isMatch = cellBody.match(/<is>.*?<t[^>]*>(.*?)<\/t>.*?<\/is>/s);
        val = isMatch ? decodeXml(isMatch[1]) : '';
      } else if (cellType === 's') {
        const vMatch = cellBody.match(/<v>(.*?)<\/v>/);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          val = sharedStrings[idx] ?? '';
        }
      } else if (cellType === 'b') {
        const vMatch = cellBody.match(/<v>(.*?)<\/v>/);
        val = vMatch && vMatch[1] === '1';
      } else {
        const vMatch = cellBody.match(/<v>(.*?)<\/v>/);
        if (vMatch) {
          const num = Number(vMatch[1]);
          val = isNaN(num) ? vMatch[1] : num;
        } else {
          const tMatch = cellBody.match(/<t[^>]*>(.*?)<\/t>/s);
          if (tMatch) val = decodeXml(tMatch[1]);
        }
      }
      rowData[colIndex] = val;
    }

    const maxCol = Math.max(-1, ...Object.keys(rowData).map(Number));
    const rowArr = [];
    for (let c = 0; c <= maxCol; c++) {
      rowArr.push(rowData[c] ?? '');
    }
    rows.push(rowArr);
  }

  return rows;
}

function colLetterToIndex(letters) {
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
}

function decodeXml(str) {
  if (!str) return '';
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

async function main() {
  console.log('Fetching projects from Supabase...');
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id, client_name, ticket_number, system_type, specialty, global_status,
      infra_status, adherence_status, environment_status, conversion_status,
      modelos_editor_status, implementation_status, post_status
    `)
    .eq('is_deleted', false);

  if (error) {
    console.error('Projects fetch error:', error);
    return;
  }
  console.log(`Loaded ${projects.length} projects.`);

  const dir = 'docs/export. 0800';
  const fileConfigs = [
    { file: 'chamados-levantamento-orion-inicio-2026-09-25-2026-09-25 - SGA.xlsx', module: 'SGA' },
    { file: 'chamados-levantamento-orion-inicio-2026-09-25-2026-09-25 - LCW.xlsx', module: 'LCW' },
    { file: 'chamados-levantamento-orion-inicio-2026-09-25-2026-09-25 - Orion GED.xlsx', module: 'Orion GED' },
    { file: 'chamados-levantamento-orion-inicio-2026-09-25-2026-09-25 - Conversao.xlsx', module: 'Conversão' },
  ];

  const fullAnalysis = [];

  for (const cfg of fileConfigs) {
    const filePath = path.join(dir, cfg.file);
    console.log(`\nParsing ${cfg.module}...`);
    const parsed = await parseXlsx(filePath);
    
    const detailedSheet = parsed.sheets['Chamados Detalhados'] || [];
    const tramitesSheet = parsed.sheets['Histórico de Trâmites'] || [];
    const summarySheet = parsed.sheets['Resumo e Filtros'] || [];

    const headers = detailedSheet[0] || [];
    const colMap = new Map(headers.map((h, i) => [String(h).trim(), i]));

    const tramitesHeaders = tramitesSheet[0] || [];
    const tColMap = new Map(tramitesHeaders.map((h, i) => [String(h).trim(), i]));

    // Group tramites by ticket
    const tramitesByTicket = new Map();
    for (let r = 1; r < tramitesSheet.length; r++) {
      const row = tramitesSheet[r];
      const ticketNum = String(row[tColMap.get('Chamado')] ?? '').trim();
      if (!ticketNum) continue;
      if (!tramitesByTicket.has(ticketNum)) tramitesByTicket.set(ticketNum, []);
      tramitesByTicket.get(ticketNum).push({
        numeroChamado: ticketNum,
        cliente: row[tColMap.get('Cliente / Serventia')] ?? '',
        titulo: row[tColMap.get('Título do Chamado')] ?? '',
        statusAtual: row[tColMap.get('Status Atual')] ?? '',
        software: row[tColMap.get('Módulo / Software')] ?? '',
        numeroTramite: row[tColMap.get('Nº do Trâmite')] ?? '',
        sequencia: row[tColMap.get('Sequência')] ?? '',
        dataTramite: row[tColMap.get('Data/Hora do Trâmite')] ?? '',
        responsavel: row[tColMap.get('Responsável')] ?? '',
        equipe: row[tColMap.get('Equipe Responsável')] ?? '',
        atividade: row[tColMap.get('Atividade')] ?? '',
        descricao: row[tColMap.get('Descrição do Trâmite')] ?? row[11] ?? '',
      });
    }

    // Process tickets
    const tickets = [];
    for (let r = 1; r < detailedSheet.length; r++) {
      const row = detailedSheet[r];
      const ticketNum = String(row[colMap.get('Chamado')] ?? '').trim();
      if (!ticketNum) continue;

      const clientName = String(row[colMap.get('Cliente / Serventia')] ?? '').trim();
      const match = matchClientToProject(clientName, projects);

      const isConversion = cfg.module === 'Conversão';
      let exclusionReason = null;
      let shouldExclude = false;
      let hubClassification = 'Sem vínculo / Cliente antigo';

      if (match) {
        if (match.project.global_status === 'in-progress') {
          hubClassification = `Projeto em Andamento (${match.project.system_type})`;
          if (!isConversion) {
            shouldExclude = true;
            exclusionReason = `Projeto ativo no HUB com implantação 'Em Andamento' (${match.project.client_name} - ${match.project.system_type})`;
          }
        } else if (match.project.global_status === 'done' || match.project.global_status === 'archived') {
          hubClassification = `Implantação Concluída no HUB (${match.project.system_type})`;
        } else {
          hubClassification = `Projeto no HUB (${match.project.global_status})`;
        }
      }

      tickets.push({
        module: cfg.module,
        numeroChamado: ticketNum,
        cliente: clientName,
        codigoCliente: row[colMap.get('Código do Cliente')] ?? '',
        titulo: row[colMap.get('Título do Chamado')] ?? '',
        status: row[colMap.get('Status')] ?? '',
        natureza: row[colMap.get('Natureza')] ?? '',
        criticidade: row[colMap.get('Criticidade')] ?? '',
        tema: row[colMap.get('Tema (IA)')] ?? '',
        produto: row[colMap.get('Produto')] ?? '',
        software: row[colMap.get('Software / Módulo')] ?? '',
        equipe: row[colMap.get('Equipe Responsável')] ?? '',
        analista: row[colMap.get('Analista Responsável')] ?? '',
        solicitante: row[colMap.get('Solicitante')] ?? '',
        dataAbertura: row[colMap.get('Data de Abertura')] ?? '',
        abertoEm: row[colMap.get('Abertura (Data/Hora)')] ?? '',
        diasAberto: row[colMap.get('Dias em Aberto / Resolução')] ?? '',
        situacaoSla: row[colMap.get('Situação Geral do SLA')] ?? '',
        tempoPrimeiraResposta: row[colMap.get('Tempo 1ª Resposta Previsto (min)')] ?? '',
        vencimentoSla: row[colMap.get('Vencimento do SLA')] ?? '',
        tempoRestante: row[colMap.get('Tempo Restante (min)')] ?? '',
        ultimoTramiteData: row[colMap.get('Último Trâmite - Data/Hora')] ?? '',
        ultimoTramiteResponsavel: row[colMap.get('Último Trâmite - Responsável')] ?? '',
        ultimoTramiteEquipe: row[colMap.get('Último Trâmite - Equipe')] ?? '',
        ultimoTramiteAtividade: row[colMap.get('Último Trâmite - Atividade')] ?? '',
        ultimoTramiteDescricao: row[colMap.get('Último Trâmite - Descrição')] ?? '',
        descricaoAbertura: row[colMap.get('Descrição de Abertura')] ?? row[37] ?? '',
        tramites: tramitesByTicket.get(ticketNum) || [],
        match,
        hubClassification,
        shouldExclude,
        exclusionReason,
      });
    }

    fullAnalysis.push({
      module: cfg.module,
      fileName: cfg.file,
      totalTickets: tickets.length,
      excludedTickets: tickets.filter(t => t.shouldExclude).length,
      includedTickets: tickets.filter(t => !t.shouldExclude).length,
      tickets,
      summarySheet,
    });
  }

  console.log('\n================ RESUMO DETALHADO ================');
  for (const m of fullAnalysis) {
    console.log(`\nMódulo: ${m.module}`);
    console.log(`  Total de Chamados na Planilha: ${m.totalTickets}`);
    console.log(`  Desconsiderados (Projeto Ativo 'Em Andamento'): ${m.excludedTickets}`);
    console.log(`  MANTIDOS no Levantamento: ${m.includedTickets}`);

    const included = m.tickets.filter(t => !t.shouldExclude);
    const withHubDone = included.filter(t => t.hubClassification.includes('Concluída'));
    const withoutHub = included.filter(t => t.hubClassification.includes('Sem vínculo'));
    console.log(`    - Com implantação principal Concluída no HUB: ${withHubDone.length}`);
    console.log(`    - Sem cadastro no HUB (clientes legados / antigos / avulsos): ${withoutHub.length}`);
    if (m.module === 'Conversão') {
      const inProg = included.filter(t => t.hubClassification.includes('em Andamento'));
      console.log(`    - Da equipe Conversão em projetos em andamento: ${inProg.length}`);
    }

    if (m.excludedTickets > 0) {
      console.log('  Lista dos Desconsiderados:');
      m.tickets.filter(t => t.shouldExclude).forEach(t => {
        console.log(`    * [Chamado ${t.numeroChamado}] ${t.cliente} -> ${t.exclusionReason}`);
      });
    }
  }

  fs.writeFileSync('scratch/full-analysis-v2.json', JSON.stringify(fullAnalysis, null, 2));
  console.log('\nDados salvos em scratch/full-analysis-v2.json');
}

main();
