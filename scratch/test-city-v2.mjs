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
    .replace(/[^A-Z0-9\s\-\u2013\u2014]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCartorio(name) {
  if (!name || name === '—') return { raw: name, city: null, num: null, rawCity: null };
  let norm = normalizeStr(name);
  norm = norm.replace(/^\(WEB\s+RI\)\s*/, '');

  let city = null;
  let num = null;

  // Pattern 1: CITY - OFFICE or CITY – OFFICE
  if (/[\-\u2013\u2014]/.test(norm)) {
    const parts = norm.split(/\s*[\-\u2013\u2014]\s*/);
    if (parts.length >= 2) {
      city = parts[0].trim();
      const office = parts.slice(1).join(' ');
      const nMatch = office.match(/(\d+)[º°]?(?:\s|$|TAB|OFICIAL|REGISTRO)/);
      if (nMatch) num = parseInt(nMatch[1], 10);
    }
  }

  // Pattern 2: "1º TABELIÃO DE NOTAS DE SÃO JOSÉ DOS CAMPOS"
  if (!city) {
    const deMatch = norm.match(/(?:^|\s)(\d+)[º°]?\s+(?:TABELIAO|TABELIONATO|OFICIAL|REGISTRO).*?\s+(?:DE|DO|DA|COMARCA DE)\s+([A-Z\s]+?)(?:-SP|\s+SP|$)/);
    if (deMatch) {
      num = parseInt(deMatch[1], 10);
      city = deMatch[2].trim();
    }
  }

  // Pattern 3: "24TN São Paulo" or "1TN Sumaré" or "Monte Aprazível TNPT"
  if (!city) {
    const tnMatch = norm.match(/^(\d+)TN\s+([A-Z\s]+)/);
    if (tnMatch) {
      num = parseInt(tnMatch[1], 10);
      city = tnMatch[2].trim();
    }
  }

  if (!city) {
    const words = norm.split(' ');
    city = words.slice(0, 2).join(' ');
  }

  // Clean city
  if (city) {
    city = city.replace(/(?:-SP|\s+SP|\s+COMARCA)$/, '').trim();
  }

  return { raw: name, city, num };
}

async function test() {
  const { data: projects } = await supabase.from('projects').select('client_name').eq('is_deleted', false);
  console.log('Project parsed:');
  projects.slice(0, 25).forEach(p => {
    const r = parseCartorio(p.client_name);
    console.log(`[${r.city}] #${r.num}  <=  "${p.client_name}"`);
  });

  console.log('\nTicket client sample:');
  const samples = [
    '1º TABELIÃO DE NOTAS DE SÃO JOSÉ DOS CAMPOS-SP',
    'SÃO JOSÉ DO RIO PRETO - TABELIONATO DE NOTAS 01',
    'OURINHOS - TABELIONATO DE NOTAS E PROTESTO DE TITULOS 02',
    'EMBU DAS ARTES – 1º TABELIONATO DE NOTAS E DE PROTESTO DE TITULOS',
    'SÃO CARLOS - TABELIONATO DE NOTAS E PROTESTO 02',
    'SANTOS - TABELIONATO DE NOTAS 02',
    'BERURI - CARTÓRIO EXTRAJUDICIAL DA COMARCA DE BERURI',
    'MIGUELÓPOLIS - TABELIONATO DE NOTAS E PROTESTO',
    'TIETÊ - REGISTRO DE IMOVEIS E TDPJ',
    'REGISTRO - TABELIONATO DE NOTAS  E PROTESTO DE TITULOS',
    'RIO CLARO - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULO 03',
    'LIMEIRA - TABELIONATO DE NOTAS 01',
    'CAMPINAS(OURO VERDE) - OFICIAL DE RCPN  E TN DO DISTRITO DE',
    'SÃO VICENTE - 1º TABELIÃO DE NOTAS E PROTESTO DE SÃO VICENTE'
  ];

  samples.forEach(s => {
    const r = parseCartorio(s);
    console.log(`[${r.city}] #${r.num}  <=  "${s}"`);
  });
}

test();
