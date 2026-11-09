export type OrionSkillsSystemType = 'Orion TN' | 'Orion PRO' | 'Orion REG';

export const ELIGIBLE_SKILLS_SYSTEM_TYPES: readonly OrionSkillsSystemType[] = [
  'Orion TN',
  'Orion PRO',
  'Orion REG',
] as const;

export interface SkillsProductDescriptor {
  produto_id: string;
  produto_nome: string;
  sistema_id: string;
  sistema_nome: string;
  orion_system: OrionSkillsSystemType;
}

export const SKILLS_ORION_PRODUCTS_CATALOG: Record<OrionSkillsSystemType, SkillsProductDescriptor[]> = {
  'Orion TN': [
    {
      produto_id: '1be8b29a-4adb-4742-837a-5e12865a8990',
      produto_nome: 'Orion TN (Demo)',
      sistema_id: 'ebe1c5af-f567-4d04-86c5-d22219154556',
      sistema_nome: 'Demonstrações',
      orion_system: 'Orion TN',
    },
    {
      produto_id: '98e9fc7b-6e57-4411-87ca-d8534383ff23',
      produto_nome: 'Orion TN - Treinamento de Rotinas',
      sistema_id: 'e577ae65-27c0-44b7-8cf5-ce7c7284b811',
      sistema_nome: 'Orion - Treinamentos',
      orion_system: 'Orion TN',
    },
  ],
  'Orion PRO': [
    {
      produto_id: '64473e95-7259-4090-9f72-1ad0b0e20180',
      produto_nome: 'Orion PRO (Demo)',
      sistema_id: 'ebe1c5af-f567-4d04-86c5-d22219154556',
      sistema_nome: 'Demonstrações',
      orion_system: 'Orion PRO',
    },
    {
      produto_id: '20d1315a-8c38-476d-83cf-ba119cdb8326',
      produto_nome: 'Orion PRO - Treinamento de Rotinas',
      sistema_id: 'e577ae65-27c0-44b7-8cf5-ce7c7284b811',
      sistema_nome: 'Orion - Treinamentos',
      orion_system: 'Orion PRO',
    },
  ],
  'Orion REG': [
    {
      produto_id: 'd5c884dd-8bb3-4ca5-8fc5-e6097f1cfa87',
      produto_nome: 'Orion REG TDPJ (Demo)',
      sistema_id: 'ebe1c5af-f567-4d04-86c5-d22219154556',
      sistema_nome: 'Demonstrações',
      orion_system: 'Orion REG',
    },
    {
      produto_id: '42d97a8b-555a-429c-9fa8-1f5ee75a7d7a',
      produto_nome: 'Orion REG TDPJ - Treinamento de Rotinas',
      sistema_id: 'e577ae65-27c0-44b7-8cf5-ce7c7284b811',
      sistema_nome: 'Orion - Treinamentos',
      orion_system: 'Orion REG',
    },
  ],
};

/**
 * Dicionário oficial de abreviações de cidades utilizado no Siplan Skills.
 * A chave é o nome da cidade sem acentos e apenas letras/números.
 */
const CITY_ABBREVIATIONS: Record<string, string> = {
  saojosedoscampos: 'sjc',
  sjc: 'sjc',
  saojosedoriopreto: 'sjrp',
  sjrp: 'sjrp',
  saobernardodocampo: 'sbc',
  saobernardo: 'sbc',
  sbc: 'sbc',
  santabarbaradoeste: 'sbo',
  santabarbara: 'sbo',
  sbo: 'sbo',
  saopaulo: 'sp',
  capital: 'sp',
  sp: 'sp',
  caraguatatuba: 'caragua',
  caragua: 'caragua',
  itaquaquecetuba: 'itaqua',
  itaqua: 'itaqua',
  espiritosantodopinhal: 'pinhal',
  pinhal: 'pinhal',
  vargemgrandepaulista: 'vargemgrande',
  vargemgrandedosul: 'vargemgrande',
  vargemgrande: 'vargemgrande',
  bragancapaulista: 'braganca',
  braganca: 'braganca',
  saocaetanodosul: 'saocaetano',
  saocaetano: 'saocaetano',
};

/**
 * Variantes históricas de cidades já encontradas nos 349 usuários do banco do Siplan Skills,
 * usadas para encontrar cadastros preexistentes sem criar duplicatas.
 */
const CITY_HISTORICAL_ALIASES: Record<string, string[]> = {
  sjc: ['sjc', 'saojosedoscampos'],
  sjrp: ['sjrp', 'riopreto', 'saojosedoriopreto'],
  sbc: ['sbc', 'saobernardo', 'saobernardodocampo'],
  sbo: ['sbo', 'santabarbara', 'santabarbaradoeste'],
  sp: ['sp', 'saopaulo'],
  caragua: ['caragua', 'caraguatatuba'],
  itaqua: ['itaqua', 'itaquaquecetuba'],
  pinhal: ['pinhal', 'espiritosantodopinhal'],
  vargemgrande: ['vargemgrande', 'vargemgrandepaulista', 'vargemgrandedosul'],
  braganca: ['braganca', 'bragancapaulista'],
  saocaetano: ['saocaetano', 'saocaetanodosul'],
  saomiguelarcanjo: ['saomiguelarcanjo', 'smarcanjo'],
  saojoaquimdabarra: ['saojoaquimdabarra', 'saojoaquimbarra'],
};

export interface ParsedCartorioSkillsUsername {
  cleanCartorioName: string;
  cartorioNumber: string;
  serviceType: string;
  citySlug: string;
  username: string;
  candidateUsernames: string[];
}

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function sanitizeSkillsUsername(value: string): string {
  return stripAccents(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

export function isEligibleSkillsSystemType(systemType?: string | null): systemType is OrionSkillsSystemType {
  if (!systemType) return false;
  return (ELIGIBLE_SKILLS_SYSTEM_TYPES as readonly string[]).includes(systemType.trim());
}

export function normalizeEligibleOrionSystems(systems: Array<string | null | undefined>): OrionSkillsSystemType[] {
  const set = new Set<OrionSkillsSystemType>();
  for (const raw of systems) {
    if (isEligibleSkillsSystemType(raw)) {
      set.add(raw.trim() as OrionSkillsSystemType);
    }
  }
  return ELIGIBLE_SKILLS_SYSTEM_TYPES.filter((s) => set.has(s));
}

export function buildSkillsObservacoes(systems: Array<string | null | undefined>): string {
  const ordered = normalizeEligibleOrionSystems(systems);
  if (ordered.length === 0) {
    return 'Acesso para Demonstração e Treinamento Orion';
  }
  if (ordered.length === 1) {
    return `Acesso para Demonstração e Treinamento ${ordered[0]}`;
  }
  if (ordered.length === 2) {
    return `Acesso para Demonstração e Treinamento ${ordered[0]} e ${ordered[1]}`;
  }
  return `Acesso para Demonstração e Treinamento ${ordered[0]}, ${ordered[1]} e ${ordered[2]}`;
}

export function getExpectedSkillsProductsForSystems(
  systems: Array<string | null | undefined>
): SkillsProductDescriptor[] {
  const ordered = normalizeEligibleOrionSystems(systems);
  const demoProducts: SkillsProductDescriptor[] = [];
  const trainingProducts: SkillsProductDescriptor[] = [];

  for (const sys of ordered) {
    const [demo, training] = SKILLS_ORION_PRODUCTS_CATALOG[sys];
    if (demo) demoProducts.push(demo);
    if (training) trainingProducts.push(training);
  }

  return [...demoProducts, ...trainingProducts];
}

export function getDefaultSkillsExpirationDate(referenceDate: Date = new Date()): string {
  const nextYear = referenceDate.getFullYear() + 1;
  return `${nextYear}-12-31`;
}

export function formatSkillsCredentialsForCopy(
  username: string,
  loginToken: string,
  clientName?: string | null,
  portalUrl = 'https://skills.siplan.com.br/'
): string {
  const normalizedUrl = portalUrl.endsWith('/') ? portalUrl : `${portalUrl}/`;
  const cleanClientName = (clientName || '').trim();
  if (cleanClientName) {
    return `${normalizedUrl}\n\n${cleanClientName}\nUsuário: ${username}\nToken de Acesso: ${loginToken}`;
  }
  return `${normalizedUrl}\n\nUsuário: ${username}\nToken de Acesso: ${loginToken}`;
}

/**
 * Extrai a sigla da serventia a partir do nome do cliente/projeto e sistemas contratados.
 */
function extractServiceType(normalizedUpper: string, fallbackSystems: OrionSkillsSystemType[]): string {
  // Remove menções a "REGISTRO CIVIL DE PESSOA(S) JURIDICA(S)" ou "CIVIL DE P.JURIDICA"
  // para não confundir RCPJ (que faz parte de TDPJ/RI) com RCPN (Registro Civil das Pessoas Naturais).
  const cleanedForCivil = normalizedUpper
    .replace(/REG(?:ISTRO|\.)?\s*CIVIL\s*(?:DE|DAS?)?\s*P(?:ESSOA|ESS\.?|\.)?\s*JUR[IÍA-Z.]*/g, ' TDPJ ')
    .replace(/CIVIL\s*(?:DE|E|DAS?)?\s*P(?:ESSOA|ESS\.?|\.)?\s*JUR[IÍA-Z.]*/g, ' TDPJ ');

  const hasImoveis =
    /\b(?:REG(?:ISTRO|\.)?\s*(?:DE\s*)?IM[OÓ]V(?:EIS|\.?)|R\.?\s*I\.?)\b/.test(cleanedForCivil);

  const hasNotas =
    /\b(?:TAB(?:ELIONATO|ELI[AÃ]O|\.)?\s*(?:DE\s*)?NOTAS|NOTAS|T\.?\s*N\.?|TABNOT|TNPT|TNTP|RCTN)\b/.test(
      cleanedForCivil
    ) || /\b\d+\s*TN\b/.test(cleanedForCivil);

  const hasProtesto =
    /\b(?:PROT(?:ESTO|\.)?\s*(?:DE\s*(?:LETRAS\s*E\s*)?T[IÍ]T(?:ULOS|\.)?)?|TAB(?:ELIONATO|ELI[AÃ]O|\.)?\s*(?:DE\s*)?PROTESTO|P\.?\s*T\.?|TNPT|TNTP)\b/.test(
      cleanedForCivil
    );

  const hasCivilNatural =
    /\b(?:RCPN|REG(?:ISTRO|\.)?\s*CIVIL(?:\s*DAS\s*PESSOAS\s*NATURAIS)?|R\.?\s*C\.?|RCTN)\b/.test(cleanedForCivil) &&
    !hasImoveis;

  const hasTdpjOnly =
    !hasImoveis &&
    !hasNotas &&
    !hasProtesto &&
    /\b(?:TDPJ|TD\/PJ|RTD|REG(?:ISTRO|\.)?\s*(?:DE\s*)?T[IÍ]T(?:ULOS|\.)?\s*E\s*DOC(?:UMENTOS|\.)?)\b/.test(
      cleanedForCivil
    );

  if (hasCivilNatural && hasNotas && hasProtesto) {
    return 'rctnpt';
  }
  if (hasCivilNatural && hasNotas) {
    return 'rctn';
  }
  if (hasNotas && hasProtesto) {
    return 'tnpt';
  }
  if (hasImoveis) {
    return 'ri';
  }
  if (hasNotas) {
    return 'tn';
  }
  if (hasProtesto) {
    return 'pt';
  }
  if (hasCivilNatural) {
    return 'rc';
  }
  if (hasTdpjOnly) {
    return 'ri';
  }

  // Fallback pelos sistemas contratados no HUB
  const hasSysTN = fallbackSystems.includes('Orion TN');
  const hasSysPRO = fallbackSystems.includes('Orion PRO');
  const hasSysREG = fallbackSystems.includes('Orion REG');

  if (hasSysTN && hasSysPRO) return 'tnpt';
  if (hasSysREG) return 'ri';
  if (hasSysTN) return 'tn';
  if (hasSysPRO) return 'pt';
  return 'tn';
}

/**
 * Extrai o número da serventia (padronizando 1..9 para '01'..'09', >=10 para '10'..),
 * ou string vazia quando o cartório é único na cidade.
 */
function extractCartorioNumber(normalizedUpper: string): string {
  // Caso especial: "CARTORIO DO 1º OFICIO DA 2º ZONA DA SERRA" -> no Skills é "ri.serra" sem número
  if (/\bOFICIO\s+DA\s+\d+.*ZONA\b/.test(normalizedUpper)) {
    return '';
  }

  // 1. Ordinais explícitos: "1º", "1º.", "2°", "1o.", "26º"
  const ordinalMatch = normalizedUpper.match(/(?:^|\s|-|–)(\d{1,2})\s*(?:º\.?|°\.?|ª\.?|O\.?)(?:\s|-|$)/i);
  if (ordinalMatch) {
    const n = parseInt(ordinalMatch[1], 10);
    if (n > 0) return n < 10 ? `0${n}` : `${n}`;
  }

  // 2. Número colado na sigla da serventia: "1TN", "02TN", "24TN", "1º PT"
  const attachedMatch = normalizedUpper.match(/(?:^|\s)(\d{1,2})\s*(?:º|°)?\s*(?:TNPT|TNTP|TN|PT|RI|RC|RCTN)\b/);
  if (attachedMatch) {
    const n = parseInt(attachedMatch[1], 10);
    if (n > 0) return n < 10 ? `0${n}` : `${n}`;
  }

  // 3. Número no início antes de TABELIAO / TABELIONATO / OFICIAL / REGISTRO / CARTORIO
  const leadingMatch = normalizedUpper.match(
    /^\s*(\d{1,2})\s+(?:TABELI[AÃ]O|TABELIONATO|OFICIAL|REGISTRO|REG\.|CART[OÓ]RIO)\b/
  );
  if (leadingMatch) {
    const n = parseInt(leadingMatch[1], 10);
    if (n > 0) return n < 10 ? `0${n}` : `${n}`;
  }

  // 4. Número após o hífen antes da serventia: "GUARULHOS - 02 REGISTRO DE IMOVEIS" ou "TAUBATE - 03 TABELIONATO"
  const afterDashMatch = normalizedUpper.match(
    /[-–]\s*(\d{1,2})\s+(?:TABELI[AÃ]O|TABELIONATO|OFICIAL|REGISTRO|REG\.|CART[OÓ]RIO)\b/
  );
  if (afterDashMatch) {
    const n = parseInt(afterDashMatch[1], 10);
    if (n > 0) return n < 10 ? `0${n}` : `${n}`;
  }

  // 5. Número ao final do nome: "TABELIONATO DE NOTAS E PROTESTO 01", "TAB.NOTAS 01", "ANEXOS 01"
  const trailingMatch = normalizedUpper.match(/\b(\d{1,2})\s*$/);
  if (trailingMatch) {
    const n = parseInt(trailingMatch[1], 10);
    if (n > 0) return n < 10 ? `0${n}` : `${n}`;
  }

  // 6. Número logo antes do hífen: "CATANDUVA 2 - TABELIONATO..." ou "Santo André 2 TN"
  const beforeDashMatch = normalizedUpper.match(/\b(\d{1,2})\s*[-–]/);
  if (beforeDashMatch) {
    const n = parseInt(beforeDashMatch[1], 10);
    if (n > 0) return n < 10 ? `0${n}` : `${n}`;
  }

  return '';
}

function normalizeCityToken(rawCity: string): string {
  const cleaned = stripAccents(rawCity)
    .toUpperCase()
    // Remove UF no final como "-SP", "/SP", " SP"
    .replace(/(?:\s*[-/]\s*|\s+)(?:SP|RJ|MG|ES|PR|SC|RS|BA|GO|DF|MS|MT|PE|CE|PA|AM|MA|PB|RN|AL|SE|PI|TO|RO|AC|AP|RR)\s*$/i, '')
    // Remove números ou ordinais residuais do nome da cidade (ex: "CATANDUVA 2°")
    .replace(/\b\d{1,2}\s*(?:º|°|ª|O\.?)?\b/g, ' ')
    // Remove siglas de serventia caso estivessem grudadas
    .replace(/\b(?:TNPT|TNTP|TNP|RCTNPT|RCTN|TABELIONATO|TABELIAO|CARTORIO|COMARCA|SEDE)\b/g, ' ')
    .replace(/[^A-Z0-9]/g, '')
    .toLowerCase();

  if (!cleaned) return 'cartorio';
  return CITY_ABBREVIATIONS[cleaned] || cleaned;
}

/**
 * Extrai a cidade ou distrito a partir do nome do cliente/projeto.
 */
function extractCitySlug(rawNormalizedUpper: string): string {
  // Remove sufixo de UF no final (ex: "-SP", "/SP", " - SP") antes de separar por hífen
  const normalizedUpper = rawNormalizedUpper.replace(
    /(?:\s*[-–/]\s*|\s+)(?:SP|RJ|MG|ES|PR|SC|RS|BA|GO|DF|MS|MT|PE|CE|PA|AM|MA|PB|RN|AL|SE|PI|TO|RO|AC|AP|RR)\s*$/i,
    ''
  );

  // 1. Distrito explícito: "DO DISTR.DE CAMPO GRANDE" / "DO DISTRITO DE ERMELINO MATARAZZO"
  const districtMatch = normalizedUpper.match(/DISTR(?:ITO|\.)?\s*(?:DE\s+)?([A-Z\s]+?)$/);
  if (districtMatch && districtMatch[1]) {
    return normalizeCityToken(districtMatch[1]);
  }

  // 2. Localidade seguida de cidade entre parênteses no início: "OURO VERDE (CAMPINAS) OFICIAL DE RCPN E TN"
  const parenStartMatch = normalizedUpper.match(
    /^([A-Z\s]+?)\s*\([A-Z\s]+\)\s*(?:[-–]|\bOFICIAL|\bREGISTRO|\bTABELIONATO)/
  );
  if (parenStartMatch && parenStartMatch[1]) {
    return normalizeCityToken(parenStartMatch[1]);
  }

  // 3. Caso "DA CAPITAL" -> São Paulo ('sp')
  if (/\bDA\s+CAPITAL\b/.test(normalizedUpper)) {
    return 'sp';
  }

  // 4. Formato padrão do HUB: "<CIDADE> - <SERVENTIA>" ou "<CIDADE> – <SERVENTIA>" (com espaço em torno do traço)
  const dashParts = normalizedUpper.split(/\s+[-–]\s+/);
  if (dashParts.length >= 2) {
    const firstPart = dashParts[0].trim();
    const isFirstPartServentia =
      /\b(?:TABELI[AÃ]O|TABELIONATO|TAB\.|REGISTRO|REG\.|OFICIAL|PROTESTO|IM[OÓ]VEIS|NOTAS)\b/.test(firstPart);

    if (!isFirstPartServentia && firstPart.length >= 2) {
      return normalizeCityToken(firstPart);
    }
  }

  // 5. Formato Siplan Skills / Ellevo: "<SERVENTIA> DE <CIDADE>" ou "DA COMARCA DE <CIDADE>"
  const deCidadeMatch = normalizedUpper.match(
    /^.*\b(?:NOTAS|PROTESTO|PROTESTOS|TITULOS|TIT\.|LETRAS|IMOVEIS|DOCUMENTOS|DOC\.|PESSOA|PESSOAS|JURIDICA|JURIDICAS|NATURAIS|ANEXOS|CIVIL|TDPJ|TD\/PJ)\s+(?:DA\s+COMARCA\s+DE|DA\s+SEDE\s+DE|DE)\s+([A-Z][A-Z\s'-]+?)(?:\s+\d{1,2})?\s*$/
  );
  if (deCidadeMatch && deCidadeMatch[1]) {
    return normalizeCityToken(deCidadeMatch[1].trim());
  }

  // 6. Formato curto: "1TN São José dos Campos", "2° RI Franca", "RI Amparo", "RC Lins", "TNTP ÁGUAS DE LINDÓIA"
  const shortPrefixMatch = normalizedUpper.match(
    /^\s*(?:\d{1,2}\s*(?:º|°|O\.?)?\s*)?(?:TNPT|TNTP|TNP|RCTN|TN|PT|RI|RC)\s+(.+)$/
  );
  if (shortPrefixMatch && shortPrefixMatch[1]) {
    return normalizeCityToken(shortPrefixMatch[1]);
  }

  // 7. Formato curto invertido: "Santo André 2 TN", "CORDEIRÓPOLIS TNPT"
  const shortSuffixMatch = normalizedUpper.match(
    /^(.+?)\s+(?:\d{1,2}\s*(?:º|°)?\s*)?(?:TNPT|TNTP|TNP|RCTN|TN|PT|RI|RC)\s*$/
  );
  if (shortSuffixMatch && shortSuffixMatch[1]) {
    return normalizeCityToken(shortSuffixMatch[1]);
  }

  return normalizeCityToken(dashParts[0] || normalizedUpper);
}

/**
 * Analisa o nome do projeto/cliente do HUB e gera o username canônico do Siplan Skills
 * junto com as variações candidatas para pareamento com cartórios já existentes no banco do Skills.
 */
export function generateSkillsUsernameFromProject(
  rawClientName: string,
  orionSystems: Array<string | null | undefined> = []
): ParsedCartorioSkillsUsername {
  const cleanCartorioName = (rawClientName || '')
    .replace(/^\s*\(\s*web\s*ri\s*\)\s*/i, '')
    .replace(/\s*-\s*Chamado:\s*\d+\s*$/i, '')
    .trim();

  const normalizedUpper = stripAccents(cleanCartorioName)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  const eligibleSystems = normalizeEligibleOrionSystems(orionSystems);
  const cartorioNumber = extractCartorioNumber(normalizedUpper);
  const serviceType = extractServiceType(normalizedUpper, eligibleSystems);
  const citySlug = extractCitySlug(normalizedUpper);

  const username = sanitizeSkillsUsername(`${cartorioNumber}${serviceType}.${citySlug}`);

  // Gera variações históricas para busca no banco do Skills (evitando duplicar cartório já cadastrado)
  const candidates = new Set<string>([username]);
  const numberVariants = cartorioNumber
    ? [cartorioNumber, String(parseInt(cartorioNumber, 10))]
    : [''];

  const typeVariants = new Set<string>([serviceType]);
  if (serviceType === 'tnpt') {
    typeVariants.add('tntp');
    typeVariants.add('tnp');
    typeVariants.add('tn');
  } else if (serviceType === 'rctnpt') {
    typeVariants.add('tnpt');
    typeVariants.add('rctn');
  } else if (serviceType === 'ri') {
    typeVariants.add('ritdpj');
    typeVariants.add('rtd');
  }

  const cityVariants = CITY_HISTORICAL_ALIASES[citySlug] || [citySlug];

  for (const num of numberVariants) {
    for (const t of typeVariants) {
      for (const c of cityVariants) {
        candidates.add(sanitizeSkillsUsername(`${num}${t}.${c}`));
      }
    }
  }

  return {
    cleanCartorioName,
    cartorioNumber,
    serviceType,
    citySlug,
    username,
    candidateUsernames: Array.from(candidates).filter(Boolean),
  };
}
