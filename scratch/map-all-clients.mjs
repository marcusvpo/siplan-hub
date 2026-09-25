import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://okvufcwkophaadttmjwa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnVmY3drb3BoYWFkdHRtandhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDMyODgwMywiZXhwIjoyMDc5OTA0ODAzfQ.vBW6rUTeTXrzFa6AcYTv-ysw5m0A9YiNK4F3z5w8aP8'
);

function normalizeStr(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const allUniqueClients = [
  // SGA
  "1º TABELIÃO DE NOTAS DE SÃO JOSÉ DOS CAMPOS-SP",
  "SÃO JOSÉ DO RIO PRETO - TABELIONATO DE NOTAS 01",
  "OURINHOS - TABELIONATO DE NOTAS E PROTESTO DE TITULOS 02",
  "EMBU DAS ARTES – 1º TABELIONATO DE NOTAS E DE PROTESTO DE TITULOS",
  // LCW
  "JANDIRA - REGISTRO CIVIL E TABELIONATO DE NOTAS",
  "OFC DE RCPN E TN DO DIST.DE CAMPO GRANDE COMARCA DE CAMPINAS",
  "FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 01",
  "CARAPICUÍBA - REGISTRO DE IMOVEIS E TD/PJ",
  "GUARULHOS-TAB.PROTESTO 01",
  "BERURI - CARTÓRIO EXTRAJUDICIAL DA COMARCA DE BERURI",
  "MIGUELÓPOLIS - TABELIONATO DE NOTAS E PROTESTO",
  "CAMPINAS - 3º TABELIONATO DE PROTESTO",
  "TIETÊ - REGISTRO DE IMOVEIS E TDPJ",
  // Orion GED
  "SANTOS - TABELIONATO DE NOTAS 02",
  "REGISTRO - TABELIONATO DE NOTAS  E PROTESTO DE TITULOS",
  "SÃO CARLOS - TABELIONATO DE NOTAS E PROTESTO 02",
  "RIO CLARO - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULO 03",
  // Conversão
  "LIMEIRA - TABELIONATO DE NOTAS 01",
  "CAMPINAS(OURO VERDE) - OFICIAL DE RCPN  E TN DO DISTRITO DE",
  "SÃO VICENTE - 1º TABELIÃO DE NOTAS E PROTESTO DE SÃO VICENTE",
  "SÃO PAULO - 26º TABELIONATO DE NOTAS",
  "SÃO CAETANO DO SUL - TABELIONATO DE NOTAS E PROTESTO 04",
  "PORTO FELIZ - 1º TABELIONATO DE NOTAS E DE PROTESTO",
  "CATANDUVA - TABELIONATO DE NOTAS E PROTESTO DE TITULOS 01",
  "SUMARÉ - TABELIONATO DE NOTAS E PROTESTO 01",
  "VOTUPORANGA - TABELIONATO DE NOTAS E  PROTESTO DE TITULOS 02",
  "GUARULHOS - REGISTRO DE IMOVEIS E TD/PJ 02",
  "PRAIA GRANDE - TABELIONATO DE NOTAS E PROTESTO 01",
  "PAULÍNIA - REGISTRO CIVIL E TABELIONATO DE NOTAS",
  "PERUÍBE -  TABELIONATO DE NOTAS E PROTESTO",
  "MOGI DAS CRUZES - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 01",
  "SALTO - TABELIONATO DE NOTAS E PROTESTO 02",
  "SÃO BERNARDO DO CAMPO - TABELIÃO DE NOTAS 04",
  "SANTO ANDRÉ - TABELIONATO DE NOTAS 02",
  "SÃO MIGUEL ARCANJO - TABELIONATO DE NOTAS E PROTESTO",
  "BEBEDOURO - TABELIONATO DE NOTAS E DE PROTESTO DE TITULOS 01",
  "SÃO PAULO - TABELIONATO DE NOTAS 16",
  "PATROCÍNIO PAULISTA -  TABELIÃO DE NOTAS E DE PROTESTO"
];

async function checkAll() {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, client_name, system_type, global_status, implementation_status, post_status, ticket_number')
    .eq('is_deleted', false);

  console.log(`Analyzing ${allUniqueClients.length} unique client names against ${projects.length} HUB projects...\n`);

  for (const clientName of allUniqueClients) {
    const cNorm = normalizeStr(clientName);
    
    // Find project candidates
    const matches = [];
    for (const p of projects) {
      const pNorm = normalizeStr(p.client_name);
      
      // Exact normalized
      if (cNorm === pNorm) {
        matches.push({ p, score: 1.0, type: 'EXACT' });
        continue;
      }

      // Check key city words
      const getCity = (s) => {
        if (s.includes('SAO JOSE DOS CAMPOS')) return 'SAO JOSE DOS CAMPOS';
        if (s.includes('SAO JOSE DO RIO PRETO')) return 'SAO JOSE DO RIO PRETO';
        if (s.includes('SAO CAETANO')) return 'SAO CAETANO';
        if (s.includes('SAO BERNARDO')) return 'SAO BERNARDO';
        if (s.includes('SAO PAULO')) return 'SAO PAULO';
        if (s.includes('SAO VICENTE')) return 'SAO VICENTE';
        if (s.includes('SAO CARLOS')) return 'SAO CARLOS';
        if (s.includes('SAO MIGUEL ARCANJO')) return 'SAO MIGUEL ARCANJO';
        if (s.includes('SANTA CRUZ DO RIO PARDO')) return 'SANTA CRUZ DO RIO PARDO';
        if (s.includes('SANTO ANDRE')) return 'SANTO ANDRE';
        if (s.includes('MOGI DAS CRUZES')) return 'MOGI DAS CRUZES';
        if (s.includes('MOGI MIRIM')) return 'MOGI MIRIM';
        if (s.includes('MONTE ALTO')) return 'MONTE ALTO';
        if (s.includes('MONTE APRAZIVEL')) return 'MONTE APRAZIVEL';
        if (s.includes('EMBU DAS ARTES')) return 'EMBU DAS ARTES';
        if (s.includes('PRAIA GRANDE')) return 'PRAIA GRANDE';
        if (s.includes('CAPAO BONITO')) return 'CAPAO BONITO';
        if (s.includes('OURO VERDE')) return 'OURO VERDE';
        if (s.includes('BRAGANCA PAULISTA')) return 'BRAGANCA PAULISTA';
        if (s.includes('PATROCINIO PAULISTA')) return 'PATROCINIO PAULISTA';
        if (s.includes('PORTO FELIZ')) return 'PORTO FELIZ';
        if (s.includes('RIO CLARO')) return 'RIO CLARO';
        if (s.includes('CAMPINAS')) return 'CAMPINAS';
        if (s.includes('JANDIRA')) return 'JANDIRA';
        if (s.includes('FRANCA')) return 'FRANCA';
        if (s.includes('CARAPICUIBA')) return 'CARAPICUIBA';
        if (s.includes('GUARULHOS')) return 'GUARULHOS';
        if (s.includes('BERURI')) return 'BERURI';
        if (s.includes('MIGUELOPOLIS')) return 'MIGUELOPOLIS';
        if (s.includes('TIETE')) return 'TIETE';
        if (s.includes('SANTOS')) return 'SANTOS';
        if (s.includes('REGISTRO')) return 'REGISTRO';
        if (s.includes('LIMEIRA')) return 'LIMEIRA';
        if (s.includes('CATANDUVA')) return 'CATANDUVA';
        if (s.includes('SUMARE')) return 'SUMARE';
        if (s.includes('VOTUPORANGA')) return 'VOTUPORANGA';
        if (s.includes('PAULINIA')) return 'PAULINIA';
        if (s.includes('PERUIBE')) return 'PERUIBE';
        if (s.includes('SALTO')) return 'SALTO';
        if (s.includes('BEBEDOURO')) return 'BEBEDOURO';
        if (s.includes('OURINHOS')) return 'OURINHOS';
        if (s.includes('ARARAQUARA')) return 'ARARAQUARA';
        if (s.includes('ARARAS')) return 'ARARAS';
        if (s.includes('ITU')) return 'ITU';
        if (s.includes('OSASCO')) return 'OSASCO';
        if (s.includes('LINS')) return 'LINS';
        if (s.includes('SOROCABA')) return 'SOROCABA';
        if (s.includes('TAUBATE')) return 'TAUBATE';
        if (s.includes('UBATUBA')) return 'UBATUBA';
        if (s.includes('JUNDIAI')) return 'JUNDIAI';
        if (s.includes('OLIMPIA')) return 'OLIMPIA';
        if (s.includes('ATIBAIA')) return 'ATIBAIA';
        return null;
      };

      const cityC = getCity(cNorm);
      const cityP = getCity(pNorm);

      if (cityC && cityP && cityC === cityP) {
        // Compare cartório number/type if applicable
        const numC = cNorm.match(/(?:^|\s)(\d+)[º°]?/)?.[1];
        const numP = pNorm.match(/(?:^|\s)(\d+)[º°]?/)?.[1];

        // Also check specialty (Notas, Imoveis, Protesto, Civil)
        const isNotasC = cNorm.includes('NOTA');
        const isNotasP = pNorm.includes('NOTA');
        const isImovC = cNorm.includes('IMOVEI') || cNorm.includes('RI');
        const isImovP = pNorm.includes('IMOVEI') || pNorm.includes('REG');
        const isProtC = cNorm.includes('PROTESTO') && !isNotasC;
        const isProtP = pNorm.includes('PROTESTO') && !isNotasP;

        const specMatch = (isNotasC && isNotasP) || (isImovC && isImovP) || (isProtC && isProtP);

        if (numC && numP) {
          if (numC === numP) {
            matches.push({ p, score: specMatch ? 0.95 : 0.8, type: 'CITY_NUM_MATCH' });
          }
        } else {
          matches.push({ p, score: specMatch ? 0.85 : 0.6, type: 'CITY_MATCH' });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const top = matches[0];

    if (top && top.score >= 0.7) {
      console.log(`[MATCH] "${clientName}"`);
      console.log(`        -> HUB: "${top.p.client_name}" (${top.p.system_type})`);
      console.log(`        -> Status: ${top.p.global_status.toUpperCase()} (Impl: ${top.p.implementation_status}, Post: ${top.p.post_status})`);
      console.log(`        -> Score: ${top.score} [${top.type}]\n`);
    } else {
      console.log(`[NO MATCH] "${clientName}"`);
      console.log(`        -> (Cliente legado / antigo / sem projeto cadastrado no HUB)\n`);
    }
  }
}

checkAll();
