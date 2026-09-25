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

const COMPOSITE_PREFIXES = ['SAO', 'SANTA', 'SANTO', 'MONTE', 'MOGI', 'RIO', 'EMBU', 'PRAIA', 'OURO', 'CAPAO', 'BRAGANCA'];

export function extractCityAndNumber(name) {
  if (!name || name === '—') return { raw: name, city: null, number: null, specialty: null };
  const norm = normalizeName(name);

  // If format is "CITY - OFFICE"
  let cityPart = norm;
  if (norm.includes(' - ')) {
    cityPart = norm.split(' - ')[0].trim();
  } else if (norm.includes(' – ')) {
    cityPart = norm.split(' – ')[0].trim();
  }

  // Handle prefix like (WEB RI)
  cityPart = cityPart.replace(/^\(WEB\s+RI\)\s*/, '').trim();

  // If format is like "1º TABELIÃO DE NOTAS DE SÃO JOSÉ DOS CAMPOS-SP"
  const deMatch = norm.match(/(?:DE|DO|DA|COMARCA DE)\s+([A-Z\s]+?)(?:-SP|\s+SP|$)/);
  if (deMatch && !norm.includes(' - ')) {
    cityPart = deMatch[1].trim();
  }

  const words = cityPart.split(' ').filter(Boolean);
  let city = words[0] || null;
  if (words.length > 1 && COMPOSITE_PREFIXES.includes(words[0])) {
    city = words.slice(0, 2).join(' ');
    if (words[1] === 'JOSE' && words.length > 3) {
      // SAO JOSE DOS CAMPOS / RIO PRETO
      city = words.slice(0, 4).join(' ');
    } else if (words[1] === 'BERNARDO' && words.length > 3) {
      city = words.slice(0, 4).join(' ');
    } else if (words[1] === 'CRUZ' && words.length > 4) {
      city = words.slice(0, 5).join(' ');
    }
  }

  // Extract number (1, 2, 3, 4, etc.)
  const numMatch = norm.match(/(?:^|\s)(\d+)[º°]?(?:\s|$|TAB|OFICIAL|REGISTRO)/);
  const number = numMatch ? parseInt(numMatch[1], 10) : null;

  return { raw: name, norm, city, number };
}

async function test() {
  const { data: projects } = await supabase
    .from('projects')
    .select('client_name')
    .eq('is_deleted', false);

  console.log('Project cities:');
  projects.forEach(p => {
    const res = extractCityAndNumber(p.client_name);
    console.log(`- "${p.client_name}" -> City: [${res.city}], Num: [${res.number}]`);
  });
}

test();
