import { describe, expect, it } from 'vitest';
import {
  buildSkillsObservacoes,
  formatSkillsCredentialsForCopy,
  generateSkillsUsernameFromProject,
  getDefaultSkillsExpirationDate,
  getExpectedSkillsProductsForSystems,
  isEligibleSkillsSystemType,
} from '../skills-username-generator';

describe('skills-username-generator', () => {
  it('gera corretamente os exemplos exatos especificados pelo usuário', () => {
    expect(
      generateSkillsUsernameFromProject('02 TABELIÃO DE NOTAS DE SÃO JOSÉ DOS CAMPOS-SP', ['Orion TN']).username
    ).toBe('02tn.sjc');

    expect(
      generateSkillsUsernameFromProject('ARARAQUARA – 1º TABELIONATO DE NOTAS E PROTESTO DE TITULOS', [
        'Orion TN',
        'Orion PRO',
      ]).username
    ).toBe('01tnpt.araraquara');

    expect(
      generateSkillsUsernameFromProject('JANDIRA - REGISTRO CIVIL E TABELIONATO DE NOTAS', ['Orion TN']).username
    ).toBe('rctn.jandira');
  });

  it('mapeia com 100% de precisão todos os padrões reais de projetos ativos do Siplan HUB', () => {
    const cases: Array<{ name: string; systems: string[]; expected: string }> = [
      {
        name: '(WEB RI) MIRANDÓPOLIS - REGISTRO DE IMOVEIS E ANEXOS',
        systems: ['Orion REG'],
        expected: 'ri.mirandopolis',
      },
      {
        name: '(WEB RI) OLÍMPIA - REGISTRO DE IMOVEIS E ANEXOS ',
        systems: ['Orion REG'],
        expected: 'ri.olimpia',
      },
      {
        name: 'ÁGUAS DE LINDÓIA - TABELIÃO DE NOTAS E DE PROTESTO DE LETRAS E TÍTULOS',
        systems: ['Orion TN', 'Orion PRO'],
        expected: 'tnpt.aguasdelindoia',
      },
      {
        name: 'AMERICANA - REGISTRO DE IMOVEIS E TD/PJ',
        systems: ['Orion REG'],
        expected: 'ri.americana',
      },
      {
        name: 'ARARAS - TAB.NOTAS 01',
        systems: ['Orion TN', 'Orion PRO'],
        expected: '01tn.araras',
      },
      {
        name: 'ATIBAIA - REGISTRO DE IMOVEIS E TD/PJ',
        systems: ['Orion REG'],
        expected: 'ri.atibaia',
      },
      {
        name: 'ATIBAIA - TABELIONATO DE NOTAS E PROTESTO 01',
        systems: ['Orion TN'],
        expected: '01tnpt.atibaia',
      },
      {
        name: 'BRAGANÇA PAULISTA – 2º TABELIONATO DE NOTAS E PROTESTO DE TITULOS',
        systems: ['Orion PRO'],
        expected: '02tnpt.braganca',
      },
      {
        name: 'CAÇAPAVA - REGISTRO IMOVEIS E ANEXOS',
        systems: ['Orion REG', 'Orion PRO'],
        expected: 'ri.cacapava',
      },
      {
        name: 'CAMPINAS - 3º TABELIONATO DE PROTESTO',
        systems: ['Orion PRO'],
        expected: '03pt.campinas',
      },
      {
        name: 'CAMPINAS - OFICIAL DE RCPN E TAB.NOTAS DO DISTR.DE CAMPO GRANDE',
        systems: ['Orion TN'],
        expected: 'rctn.campogrande',
      },
      {
        name: 'CAPÃO BONITO - REGISTRO DE IMOVEIS E ANEXOS',
        systems: ['Orion REG', 'Orion PRO'],
        expected: 'ri.capaobonito',
      },
      {
        name: 'CARAPICUÍBA - REGISTRO DE IMOVEIS E TD/PJ',
        systems: ['Orion REG'],
        expected: 'ri.carapicuiba',
      },
      {
        name: 'CATANDUVA - 1º TABELIÃO DE NOTAS E PROTESTO DE LETRAS E TÍTULOS DE CATANDUVA-SP',
        systems: ['Orion TN', 'Orion PRO'],
        expected: '01tnpt.catanduva',
      },
      {
        name: 'CATANDUVA - REGISTRO DE IMOVEIS E ANEXOS 01',
        systems: ['Orion REG'],
        expected: '01ri.catanduva',
      },
      {
        name: 'CATANDUVA - TABELIONATO DE NOTAS E PROTESTO DE TITULOS 02',
        systems: ['Orion PRO'],
        expected: '02tnpt.catanduva',
      },
      {
        name: 'CATANDUVA 2° - TABELIONATO DE NOTAS E PROTESTO DE TITULOS',
        systems: ['Orion TN'],
        expected: '02tnpt.catanduva',
      },
      {
        name: 'COSMÓPOLIS - TABELIONATO DE NOTAS E PROTESTO DE TITULOS',
        systems: ['Orion TN', 'Orion PRO'],
        expected: 'tnpt.cosmopolis',
      },
      {
        name: 'EMBU DAS ARTES – 1º TABELIONATO DE NOTAS E DE PROTESTO DE TITULOS',
        systems: ['Orion TN', 'Orion PRO'],
        expected: '01tnpt.embudasartes',
      },
      {
        name: 'FRANCA - 2º OFICIAL DE REG. DE IMÓVEIS TÍT.DOC.REG. CIVIL DE PESSOA JURÍDICA',
        systems: ['Orion REG'],
        expected: '02ri.franca',
      },
      {
        name: 'FRANCA - REGISTRO DE IMOVEIS E ANEXOS 01',
        systems: ['Orion PRO'],
        expected: '01ri.franca',
      },
      {
        name: 'FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 01',
        systems: ['Orion TN', 'Orion PRO'],
        expected: '01tnpt.franca',
      },
      {
        name: 'GUARUJÁ - 1º TABELIONATO DE NOTAS E PROTESTO E TDPJ',
        systems: ['Orion REG', 'Orion PRO'],
        expected: '01tnpt.guaruja',
      },
      {
        name: 'GUARULHOS - 02 REGISTRO DE IMOVEIS E TD/PJ',
        systems: ['Orion REG'],
        expected: '02ri.guarulhos',
      },
      {
        name: 'GUARULHOS - 1° OFICIAL DE REGISTRO DE IMÓVEIS E ANEXOS',
        systems: ['Orion REG'],
        expected: '01ri.guarulhos',
      },
      {
        name: 'GUARULHOS - 3º TABELIÃO DE NOTAS DA COMARCA DE GUARULHOS',
        systems: ['Orion TN'],
        expected: '03tn.guarulhos',
      },
      {
        name: 'GUARULHOS – 1º TABELIÃO DE PROTESTO',
        systems: ['Orion PRO'],
        expected: '01pt.guarulhos',
      },
      {
        name: 'ITAQUAQUECETUBA -  TABELIAO DE NOTAS E PROT. DE LETRAS E TIT. DA COMARCA DE ITAQUAQUECETUBA',
        systems: ['Orion TN', 'Orion PRO'],
        expected: 'tnpt.itaqua',
      },
      {
        name: 'ITU - TABELIONATO DE NOTAS E PROTESTO 01',
        systems: ['Orion TN', 'Orion PRO'],
        expected: '01tnpt.itu',
      },
      {
        name: 'JUNDIAI - 2º TABELIAO DE NOTAS',
        systems: ['Orion TN'],
        expected: '02tn.jundiai',
      },
      {
        name: 'LIMEIRA – 1º. TABELIONATO DE NOTAS',
        systems: ['Orion PRO'],
        expected: '01tn.limeira',
      },
      {
        name: 'LINS - REGISTRO CIVIL',
        systems: ['Orion TN'],
        expected: 'rc.lins',
      },
      {
        name: 'MOGI DAS CRUZES - 1º TABELIÃO DE NOTAS E PROTESTO',
        systems: ['Orion TN', 'Orion PRO'],
        expected: '01tnpt.mogidascruzes',
      },
      {
        name: 'MOGI-MIRIM - TABELIONATO DE NOTAS E PROTESTO DE TITULOS 01',
        systems: ['Orion TN'],
        expected: '01tnpt.mogimirim',
      },
      {
        name: 'OURO VERDE (CAMPINAS) OFICIAL DE RCPN E TN',
        systems: ['Orion TN'],
        expected: 'rctn.ouroverde',
      },
      {
        name: 'SÃO BERNARDO DO CAMPO - 4° TABELIÃO DE NOTAS',
        systems: ['Orion TN'],
        expected: '04tn.sbc',
      },
      {
        name: 'SÃO CAETANO DO SUL - Tabelionato de Notas e Protesto 04',
        systems: ['Orion TN'],
        expected: '04tnpt.saocaetano',
      },
      {
        name: 'SÃO JOSÉ DO RIO PRETO - OFICIAL DE REG.TIT.E DOC.CIVIL DE PESSOA JURIDICA',
        systems: ['Orion REG'],
        expected: 'ri.sjrp',
      },
      {
        name: 'SÃO JOSÉ DO RIO PRETO - TABELIONATO DE NOTAS 04',
        systems: ['Orion TN'],
        expected: '04tn.sjrp',
      },
      {
        name: 'SÃO JOSÉ DOS CAMPOS - 1º TABELIONATO DE NOTAS',
        systems: ['Orion TN'],
        expected: '01tn.sjc',
      },
      {
        name: 'SÃO PAULO - 26º TABELIONATO DE NOTAS',
        systems: ['Orion TN'],
        expected: '26tn.sp',
      },
      {
        name: 'SÃO PAULO - 4º TABELIÃO DE NOTAS',
        systems: ['Orion TN'],
        expected: '04tn.sp',
      },
      {
        name: 'SERRA - CARTÓRIO DO 1º OFICIO DA 2º ZONA DA SERRA',
        systems: ['Orion REG'],
        expected: 'ri.serra',
      },
      {
        name: 'TAUBATÉ - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 03',
        systems: ['Orion TN', 'Orion PRO'],
        expected: '03tnpt.taubate',
      },
    ];

    for (const c of cases) {
      const parsed = generateSkillsUsernameFromProject(c.name, c.systems);
      expect(parsed.username, `Falha para: ${c.name}`).toBe(c.expected);
    }
  });

  it('inclui variações históricas em candidateUsernames para encontrar cartórios preexistentes', () => {
    const sjc = generateSkillsUsernameFromProject('SÃO JOSÉ DOS CAMPOS - 1º TABELIONATO DE NOTAS', ['Orion TN']);
    expect(sjc.candidateUsernames).toContain('01tn.sjc');
    expect(sjc.candidateUsernames).toContain('1tn.sjc');
    expect(sjc.candidateUsernames).toContain('01tn.saojosedoscampos');

    const sjrp = generateSkillsUsernameFromProject(
      'SÃO JOSÉ DO RIO PRETO - OFICIAL DE REG.TIT.E DOC.CIVIL DE PESSOA JURIDICA',
      ['Orion REG']
    );
    expect(sjrp.candidateUsernames).toContain('ri.sjrp');
    expect(sjrp.candidateUsernames).toContain('rtd.riopreto');
  });

  it('valida elegibilidade restrita a Orion TN, Orion PRO e Orion REG', () => {
    expect(isEligibleSkillsSystemType('Orion TN')).toBe(true);
    expect(isEligibleSkillsSystemType('Orion PRO')).toBe(true);
    expect(isEligibleSkillsSystemType('Orion REG')).toBe(true);
    expect(isEligibleSkillsSystemType('Modelos TN')).toBe(false);
    expect(isEligibleSkillsSystemType('WEB RC')).toBe(false);
    expect(isEligibleSkillsSystemType(null)).toBe(false);
  });

  it('gera a frase padrão de observações conforme os sistemas Orion liberados', () => {
    expect(buildSkillsObservacoes(['Orion TN'])).toBe('Acesso para Demonstração e Treinamento Orion TN');
    expect(buildSkillsObservacoes(['Orion PRO', 'Orion TN'])).toBe(
      'Acesso para Demonstração e Treinamento Orion TN e Orion PRO'
    );
    expect(buildSkillsObservacoes(['Orion REG', 'Orion PRO', 'Orion TN'])).toBe(
      'Acesso para Demonstração e Treinamento Orion TN, Orion PRO e Orion REG'
    );
  });

  it('retorna os produtos exatos de Demonstrações e Orion - Treinamentos e data de expiração 31/12/(ano+1)', () => {
    const products = getExpectedSkillsProductsForSystems(['Orion TN', 'Orion PRO']);
    expect(products.map((p) => p.produto_nome)).toEqual([
      'Orion TN (Demo)',
      'Orion PRO (Demo)',
      'Orion TN - Treinamento de Rotinas',
      'Orion PRO - Treinamento de Rotinas',
    ]);

    expect(getDefaultSkillsExpirationDate(new Date('2026-11-09T12:00:00Z'))).toBe('2027-12-31');
    expect(getDefaultSkillsExpirationDate(new Date('2027-03-15T12:00:00Z'))).toBe('2028-12-31');

    expect(formatSkillsCredentialsForCopy('usuario.teste', 'CART48581952690608', 'Usuário Teste')).toBe(
      'https://skills.siplan.com.br/\n\nUsuário Teste\nUsuário: usuario.teste\nToken de Acesso: CART48581952690608'
    );

    expect(formatSkillsCredentialsForCopy('01tnpt.araraquara', 'CART88394201923214')).toBe(
      'https://skills.siplan.com.br/\n\nUsuário: 01tnpt.araraquara\nToken de Acesso: CART88394201923214'
    );
  });
});
