-- Migration: 20260923160000_orion_reg_adherence_upgrade_and_franca_seed.sql
-- Atualização do template oficial do Orion REG e carga da análise de aderência do 2º RI de Franca (#758315)

-- 1. Assegurar que o template ativo do Orion REG está devidamente catalogado
UPDATE public.form_templates
SET 
  is_active = true,
  notes = 'Template oficial de Aderência do Orion REG (TDPJ) com 17 seções operacionais padronizadas para entrevista guiada pelo implantador'
WHERE id = '530d567e-6f42-4511-a8ae-75d4468ec0db';

-- 2. Inserir ou atualizar a resposta da análise de aderência para o projeto de Franca (#758315)
-- Projeto: FRANCA - 2º OFICIAL DE REG. DE IMÓVEIS TÍT.DOC.REG. CIVIL DE PESSOA JURÍDICA
-- ID: 3cf838a8-cd45-472a-84fc-40992f9b2f7d
-- Implantador: Julio Araujo (b9abc619-d3c7-4f53-b427-f820de95472d)
DELETE FROM public.project_form_responses 
WHERE project_id = '3cf838a8-cd45-472a-84fc-40992f9b2f7d' AND stage = 'adherence';

INSERT INTO public.project_form_responses (
  project_id,
  template_id,
  stage,
  status,
  filled_by,
  approved_by,
  submitted_at,
  approved_at,
  data,
  updated_at
) VALUES (
  '3cf838a8-cd45-472a-84fc-40992f9b2f7d',
  '530d567e-6f42-4511-a8ae-75d4468ec0db',
  'adherence',
  'approved_with_restrictions',
  'b9abc619-d3c7-4f53-b427-f820de95472d',
  'b9abc619-d3c7-4f53-b427-f820de95472d',
  NOW(),
  NOW(),
  $PAYLOAD$
{
  "sec_1": {
    "q_1_1": {
      "valor": "2",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Serventia possui 2 andares conectados por rede estruturada. Operação normal para o Orion REG."
    }
  },
  "sec_2": {
    "q_2_1": {
      "valor": "Balcão de atendimento, Recepção, Setor de Registro, Financeiro, Digitalização, TI",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Setores convencionais suportados pelas permissões e perfis de usuário do Orion REG."
    },
    "q_2_2": {
      "valor": "Térreo - Recepção - Balcão de atendimento - digitalização - Registro\n1º andar - financeiro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Distribuição física padrão. Requer apenas garantir que as impressoras financeiras e de protocolo estejam acessíveis nos respectivos andares."
    }
  },
  "sec_3": {
    "q_3_1": {
      "valor": "Recepção 3, Digitalização 1, Registro 3, Financeiro 1",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Dimensionamento equilibrado para implantação ágil e treinamento modular por setor."
    },
    "q_3_2": {
      "valor": "7",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Total de 7 usuários a serem provisionados no Orion REG com seus respectivos perfis e níveis de acesso."
    },
    "q_3_3": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Equipe ciente da transição, favorecendo o engajamento e a recepção ao novo sistema."
    },
    "q_3_4": {
      "valor": "Aprende com facilidade",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Equipe com facilidade de aprendizagem, com previsão de curva de capacitação curta."
    }
  },
  "sec_4": {
    "q_4_1": {
      "valor": "Separados por tipo (TD, PJ, Certidão)",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O Orion REG gerencia protocolos segregados por especialidade (TD, PJ e Certidões)."
    },
    "q_4_2": {
      "valor": "Não",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não existem tipos adicionais ou exóticos de protocolos."
    },
    "q_4_3": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não são gerados outros grupos de protocolos."
    },
    "q_4_4": {
      "valor": "Cada tipo (TD, PJ, Certidão) tem sua própria numeração",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Cada tipo (TD, PJ, Certidão) possui numeração própria e independente. Parametrizar as sequências e contadores iniciais de cada livro no Orion REG conforme a numeração do último protocolo do legado."
    },
    "q_4_5": {
      "valor": "Dias úteis",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG possui controle de prazos em dias úteis com configuração de feriados municipais/estaduais."
    },
    "q_4_6": {
      "valor": "A4",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG emite comprovantes de protocolo em formato A4."
    },
    "q_4_7": {
      "valor": "1 via",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Parametrizar a impressão do protocolo para 1 via."
    },
    "q_4_8": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Apenas um contato é coletado por apresentante, sem necessidade de campos múltiplos obrigatórios."
    },
    "q_4_9": {
      "valor": "Controla por por fora",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Cartório atualmente controla saldos parados há mais de 60 dias de forma externa ('por fora'). Treinar e parametrizar o módulo financeiro do Orion REG para relatórios de saldos de depósito prévio pendentes e rotina de devolução formal."
    }
  },
  "sec_5": {
    "q_5_1": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG realiza o cálculo prévio de custas/emolumentos antes da emissão definitiva do protocolo."
    },
    "q_5_2": {
      "utiliza": true,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "IMPORTANTE - PONTO DE ATENÇÃO: Verificar e parametrizar detalhadamente a tabela de custas e as variáveis de orçamento para prévia de custas associadas às naturezas dos títulos do Estado de SP (tabela TJ-SP). Deve ser homologado antes do treinamento prático de balcão."
    }
  },
  "sec_6": {
    "q_6_1": {
      "valor": "Em momento posterior",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O fluxo operacional realiza a qualificação no setor de registro/exame (posterior ao balcão), perfeitamente suportado pelo Orion REG."
    },
    "q_6_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Campos padrão de qualificação (Nome, CPF/CNPJ, RG, Estado Civil, Profissão, Endereço)."
    },
    "q_6_3": {
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Nenhum dado específico adicional exigido."
    }
  },
  "sec_7": {
    "q_7_1": {
      "valor": "Recebe valor total do título na recepção",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Entrada integral de depósito prévio gerando recibo provisório vinculado ao protocolo."
    },
    "q_7_2": {
      "valor": "Telefone",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Procedimento operacional do cartório via telefone. Orion REG gera o demonstrativo da complementação necessária."
    },
    "q_7_3": {
      "valor": "PIX",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Registrada devolução com método PIX no fechamento de contas do protocolo."
    }
  },
  "sec_8": {
    "q_8_1": {
      "valor": "Não controla numeração de notas devolutivas",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "IMPORTANTE - PONTO DE ATENÇÃO: Serventia relatou que 'Não controla numeração de notas devolutivas' e a nota do analista registrou: 'IMPORTANTE - Existe 2 sequências de protocolos para quando nota devolutiva - VERIFICAR'. Necessário alinhar na reunião de parametrização o fluxo de reentrada e exigências para que o Orion REG não gere inconsistência na fila de registro e devoluções."
    }
  },
  "sec_9": {
    "q_9_1": {
      "valor": "Numeração sequencial crescente indefinida",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Numeração sequencial contínua direta."
    },
    "q_9_2": {
      "valor": "Numeração sequencial crescente indefinida",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sequência contínua própria configurada no livro de Guarda e Conservação."
    },
    "q_9_3": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não possui matrículas de pessoas jurídicas para periódicos/oficinas impressoras no Livro B."
    },
    "q_9_4": {
      "valor": "Averbação é o número do protocolo onde o ato é praticado: exemplo: 71855/5022, 72694/5022 etc.",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: A numeração de averbação utiliza o formato [Protocolo]/[Registro] (ex: 71855/5022). Parametrizar a máscara de identificação de averbações no Orion REG para manter a conformidade histórica da serventia."
    },
    "q_9_5": {
      "valor": "Outro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Controle próprio/legado. Não afeta a rotina diária digital."
    },
    "q_9_6": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Sem necessidade de campos adicionais."
    },
    "q_9_7": {
      "valor": "Nenhuma",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Nenhuma."
    },
    "q_9_8": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não há livros ou controles paralelos manuais fora do sistema."
    },
    "q_9_9": {
      "valor": "Nenhuma",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Nenhuma."
    },
    "q_9_10": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não utiliza impressora térmica ou etiquetas adesivas para certificar atos."
    },
    "q_9_11": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Registros realizados individualmente."
    },
    "q_9_12": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não existem livros retroativos em grupos diferenciados."
    },
    "q_9_13": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Acervo retroativo já consolidado, sem necessidade de digitação passiva."
    },
    "q_9_14": {
      "utiliza": false,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Cartório atualmente não utiliza encadeamento de poderes e representação de PJs. O Orion REG disponibiliza essa gestão. Recomenda-se capacitar a escrevente responsável (Mira) sobre o cadastro estruturado durante o registro de atos constitutivos e alterações contratuais."
    }
  },
  "sec_10": {
    "q_10_1": {
      "valor": "Outra forma",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Controle integrado ao fluxo de diligências das notificações."
    },
    "q_10_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Impressão individual por notificação."
    },
    "q_10_3": {
      "valor": "impressão da carta de convocação, inclusão das diligências e impressão da certificação positiva/negativa",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Totalmente aderente. O Orion REG contempla exatamente este fluxo: impressão da carta, cadastro de diligências e certidão de desfecho (positiva/negativa)."
    },
    "q_10_4": {
      "valor": "Nenhuma",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Nenhuma variação."
    },
    "q_10_5": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não há documentos atípicos de notificação."
    },
    "q_10_6": {
      "valor": "Nenhuma",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Nenhuma."
    }
  },
  "sec_11": {
    "q_11_1": {
      "valor": "Sequencia única. Ex.: 1 TD, 2 PJ",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: As certidões utilizam numeração sequencial unificada abrangendo TD e PJ conjuntamente. Parametrizar o contador do módulo de certidões do Orion REG com sequência única contínua."
    },
    "q_11_2": {
      "valor": "Pelo sistema",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Emissão direta pelo sistema com controle de selos e custas."
    },
    "q_11_3": {
      "valor": "Não",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Modelos nativos do Orion REG serão utilizados sem necessidade de ferramentas de terceiros."
    }
  },
  "sec_12": {
    "q_12_1": {
      "valor": "Em outro momento",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Digitalização assíncrona efetuada pelo colaborador responsável."
    },
    "q_12_2": {
      "valor": "Digitaliza por número de protocolo",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Indexação por número de protocolo, totalmente aderente à vinculação do Orion REG."
    },
    "q_12_3": {
      "valor": "Verificar",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Caminho do diretório de imagens no servidor ('Verificar') precisa ser validado pelo responsável de Infraestrutura e Conversão para migração e mapeamento do repositório no Orion REG. IMPORTANTE: Existe pasta de acervo unificada por titular que deve ser contemplada na conversão."
    },
    "q_12_4": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não há rotina de microfilmagem de imagens."
    }
  },
  "sec_13": {
    "q_13_1": {
      "valor": "Listagens de recolhimento e protocolo oficial",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG emite relatórios diários de fechamento de protocolo oficial e mapa de recolhimento com os devidos desdobramentos de custas."
    },
    "q_13_2": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG gera a impressão completa do Livro Protocolo Oficial diário com termos de abertura e encerramento."
    }
  },
  "sec_14": {
    "q_14_1": {
      "valor": "TD - Livia - PJ - Mira",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Distribuição das atribuições: Lívia responsável pela Central de TD e Mira responsável pela Central de PJ. Treinamento da integração ONR/ONRTDPJ deve focar nessas duas escreventes."
    },
    "q_14_2": {
      "valor": "TD - PJ - Certidões - Notificações",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Volume distribuído entre TD, PJ, Certidões e Notificações."
    },
    "q_14_3": {
      "valor": "Primeiro envia Orçamento",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O Orion REG atende ao fluxo padrão: recepção pela central, elaboração/envio de orçamento prévio e lavratura do ato após a confirmação do pagamento."
    }
  },
  "sec_15": {
    "q_15_1": {
      "valor": "Cada atendente tem o seu caixa",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG opera com múltiplos caixas individuais por operador e consolidação pelo caixa mestre do financeiro."
    },
    "q_15_2": {
      "valor": "listagem de recolhimento",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Emissão do mapa de recolhimento dos fundos e custas do TJ-SP."
    },
    "q_15_3": {
      "utiliza": true,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Cartório mantém controle externo para apuração financeira e lança no Livro Caixa manualmente apenas o valor total consolidado das receitas. Capacitar o setor financeiro no módulo de Livro Caixa do Orion REG."
    },
    "q_15_4": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O Orion REG audita e monitora os selos digitais transmitidos ao TJ-SP, alinhado à rotina diária do cartório."
    },
    "q_15_5": {
      "valor": "Outro",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Lançamento manual consolidado no Livro Caixa. Alinhar a configuração do Orion REG para permitir lançamentos manuais ou automáticos conforme a preferência da escrevente financeira."
    },
    "q_15_6": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Serventia utiliza Parcela Express para parcelamento de emolumentos, compatível com os registros de forma de pagamento do Orion REG."
    },
    "q_15_7": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Não emite RPS por ato no balcão."
    }
  },
  "sec_16": {
    "q_16_1": {
      "valor": "Pelo site do SISCOAF",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Envio manual via portal SISCOAF, com apoio dos filtros de triagem do Provimento 88/149 do Orion REG."
    },
    "q_16_2": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "A serventia possui site institucional mantido por terceiro."
    },
    "q_16_3": {
      "utiliza": true,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: O site institucional da serventia possui integração para consulta online de protocolos e certidões. Necessário disponibilizar/configurar a API de consulta pública do Orion REG ou banco espelho/webhook para o desenvolvedor do site."
    }
  },
  "sec_17": {
    "q_17_1": {
      "valor": "O site da serventia tem integração com o sistema",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Reitera a dependência da integração do site institucional com o sistema para consulta de protocolos. Alinhar com a TI do cliente e suporte técnico da Siplan."
    }
  },
  "finalVerdict": "Aderente com Restrições",
  "finalNotes": "<p><strong>Análise de Aderência Técnica — Orion REG (TDPJ)</strong></p><p>Serventia: <strong>2º Oficial de Registro de Imóveis, Títulos e Documentos e Civil de Pessoa Jurídica de Franca/SP</strong>.</p><p>A análise concluiu que o sistema <strong>Orion REG é plenamente aderente</strong> à operação do cartório, sem nenhum bloqueio de produto (0 Gaps impeditivos). Foram mapeados <strong>10 Pontos de Atenção</strong> prioritários para a fase de parametrização e treinamento:</p><ol><li><strong>Protocolos com sequências independentes:</strong> Configurar contadores próprios para TD, PJ e Certidões.</li><li><strong>Devolução de saldo parado > 60 dias:</strong> Capacitar o financeiro no relatório nativo de depósitos prévios.</li><li><strong>Tabela de Custas TJ-SP:</strong> Parametrizar detalhadamente as regras de cálculo e variáveis de orçamento prévio.</li><li><strong>Notas Devolutivas:</strong> Ajustar o fluxo de reentrada e 2 sequências apontadas pelo cartório.</li><li><strong>Máscara de Averbações:</strong> Adotar padrão [Protocolo]/[Registro] (ex: 71855/5022).</li><li><strong>Encadeamento de PJ:</strong> Capacitar Mira no histórico de atos constitutivos e representação de PJ.</li><li><strong>Certidões unificadas:</strong> Configurar sequência unificada para TD e PJ.</li><li><strong>Repositório de Imagens:</strong> Mapear caminho UNC no servidor e acervo histórico consolidado por titular.</li><li><strong>Livro Caixa manual:</strong> Alinhar conciliação consolidada no Provimento 45 do CNJ.</li><li><strong>Integração com Site:</strong> Disponibilizar API de consulta pública de andamento de protocolos.</li></ol>"
}
  $PAYLOAD$::jsonb,
  NOW()
);

-- 3. Atualizar o projeto em public.projects com os dados consolidados da aderência
UPDATE public.projects
SET
  adherence_responsible_id = 'b9abc619-d3c7-4f53-b427-f820de95472d',
  adherence_responsible = 'Julio Araujo',
  adherence_status = 'waiting_adjustment',
  adherence_analysis_complete = true,
  adherence_observations = 'Aderente com Restrições (10 pontos de atenção de parametrização/treinamento: sequências de protocolos TD/PJ/Certidão, devolução de depósitos > 60 dias, tabela de custas TJ-SP, reentrada de notas devolutivas, máscara de averbação, encadeamento de PJ, certidões unificadas, acervo de imagens, livro caixa manual e integração com site).'
WHERE id = '3cf838a8-cd45-472a-84fc-40992f9b2f7d';

-- 4. Notificação de novidades no Changelog (Regra 12 do AGENTS.md)
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url,
  created_at
) VALUES (
  'changelog',
  'release_improvement',
  'implantadores_aderencia',
  'Aderência Orion REG e Novo Layout de Entrevista',
  'Módulo de Aderência aprimorado com novos botões ergonômicos de classificação (Aderente, Ponto de Atenção, Não Aderente), padronização das 17 seções do Orion REG e carga automática da análise do 2º RI de Franca (#758315).',
  '/projects/3cf838a8-cd45-472a-84fc-40992f9b2f7d/adherence',
  NOW()
);
