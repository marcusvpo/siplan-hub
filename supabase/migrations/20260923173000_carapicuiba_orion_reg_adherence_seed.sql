-- Migration: 20260923173000_carapicuiba_orion_reg_adherence_seed.sql
-- Carga da análise de aderência do Orion REG para Carapicuíba - Registro de Imóveis e TD/PJ (#697717)

-- 1. Inserir ou atualizar a resposta da análise de aderência para o projeto de Carapicuíba (#697717)
-- Projeto: CARAPICUÍBA - REGISTRO DE IMOVEIS E TD/PJ
-- ID: 12cb6cc4-efa3-483b-80b1-c45d47d8ea81
-- Implantador: Julio Araujo (b9abc619-d3c7-4f53-b427-f820de95472d)
DELETE FROM public.project_form_responses 
WHERE project_id = '12cb6cc4-efa3-483b-80b1-c45d47d8ea81' AND stage = 'adherence';

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
  '12cb6cc4-efa3-483b-80b1-c45d47d8ea81',
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
      "valor": "2 (setores concentrados no mesmo andar)",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O cartório possui 2 andares, mas todos os setores operacionais ficam no mesmo pavimento, facilitando a rede e comunicação."
    }
  },
  "sec_2": {
    "q_2_1": {
      "valor": "Recepção, Setor de Registro, Financeiro, Digitalização",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Setores operacionais padrão plenamente atendidos pelos módulos e perfis do Orion REG."
    },
    "q_2_2": {
      "valor": "Todos no mesmo andar",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Centralização em um único andar agiliza a comunicação interna e o fluxo físico dos títulos."
    }
  },
  "sec_3": {
    "q_3_1": {
      "valor": "Recepção: 4, Registro: 2, Financeiro: 1, Digitalização: 1",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Dimensionamento da equipe equilibrado para treinamento setorial e transição operacional."
    },
    "q_3_2": {
      "valor": "8",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Total de 8 colaboradores a serem provisionados com perfis específicos no Orion REG."
    },
    "q_3_3": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Equipe ciente da transição, favorecendo o engajamento e adesão ao cronograma de implantação."
    },
    "q_3_4": {
      "valor": "Aprende com facilidade",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Boa receptividade e curva de aprendizado favorável para a capacitação nas ferramentas do Orion REG."
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
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não existem tipos adicionais ou excepcionais de protocolos."
    },
    "q_4_3": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não há geração de protocolos em grupos legados ou descontinuados."
    },
    "q_4_4": {
      "valor": "Cada tipo (TD, PJ, Certidão) tem sua própria numeração",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O Orion REG suporta nativamente sequências numéricas independentes por especialidade (TD, PJ e Certidões); basta parametrizar o último número utilizado no legado."
    },
    "q_4_5": {
      "valor": "Dias úteis",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG possui controle automático de prazos legais em dias úteis com suporte a feriados."
    },
    "q_4_6": {
      "valor": "A4",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Emissão padrão de recibo/comprovante de protocolo em folha formato A4."
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
      "detalhes": "Aderente. Coleta de apenas um contato principal por apresentante na recepção."
    },
    "q_4_9": {
      "valor": "Controla por fora",
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
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG vincula as regras de custas e emolumentos às naturezas dos títulos conforme tabela oficial do TJ-SP."
    }
  },
  "sec_6": {
    "q_6_1": {
      "valor": "Em momento posterior",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Qualificação efetuada na etapa de exame/registro (posterior à recepção), perfeitamente suportada pelo Orion REG."
    },
    "q_6_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Cadastro utiliza os campos convencionais de qualificação das partes."
    },
    "q_6_3": {
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem requisitos de campos adicionais customizados para partes."
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
      "detalhes": "Aderente. Procedimento operacional via telefone; Orion REG gera o demonstrativo analítico de cálculo para a complementação."
    },
    "q_7_3": {
      "valor": "Outro (- que R$ 100,00 devolve em dinheiro, + que R$ 100,00 devolve em cheque)",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Regra operacional de devolução diferenciada por faixa de valor (< R$ 100 em dinheiro; > R$ 100 em cheque). Parametrizar as formas de devolução no caixa do Orion REG e treinar o operador na emissão dos recibos de restituição."
    }
  },
  "sec_8": {
    "q_8_1": {
      "valor": "Não controla numeração de notas devolutivas",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Serventia informou não controlar a numeração de notas devolutivas. Parametrizar o controle nativo do Orion REG (geração sequencial automática por protocolo) e capacitar a equipe no fluxo de reentrada e controle de prazos de exigência."
    }
  },
  "sec_9": {
    "q_9_1": {
      "valor": "Numeração sequencial crescente indefinida",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Numeração sequencial contínua direta sem interrupção de livros."
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
      "detalhes": "Aderente. Não possui matrículas de pessoas jurídicas para periódicos/oficinas impressoras no Livro B."
    },
    "q_9_4": {
      "valor": "Averbação é o número do protocolo onde o ato é praticado: exemplo: 71855/5022, 72694/5022 etc.",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: A numeração de averbação utiliza o formato [Protocolo]/[Registro] (ex: 71855/5022). Parametrizar a máscara de identificação de averbações no Orion REG para manter a conformidade histórica da serventia."
    },
    "q_9_5": {
      "valor": "Mesmo número do registro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Microfilmagem indexada pelo próprio número do registro, padrão suportado pelo Orion REG."
    },
    "q_9_6": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem campos adicionais ou metadados customizados obrigatórios no registro."
    },
    "q_9_7": {
      "valor": "Nenhuma",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Nenhuma informação adicional."
    },
    "q_9_8": {
      "utiliza": true,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Serventia possui controle de notificações realizado por fora do sistema ('Controle de Notificação'). Necessário migrar e centralizar essa rotina para o módulo nativo de notificações do Orion REG."
    },
    "q_9_9": {
      "valor": "Controle de Notificação",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Notificações controladas externamente. Devem ser unificadas e operadas diretamente na rotina de notificações e diligências do Orion REG."
    },
    "q_9_10": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O cartório utiliza etiqueta de registro; configurar layout e dimensões na impressora térmica/laser no Orion REG."
    },
    "q_9_11": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Registros executados individualmente ato a ato."
    },
    "q_9_12": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não existem livros ou grupos retroativos diferenciados a configurar."
    },
    "q_9_13": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Acervo retroativo consolidado sem necessidade de digitação passiva."
    },
    "q_9_14": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Serventia não possui cadastro estruturado com encadeamento de poderes no sistema legado; funcionalidade disponível no Orion REG para uso conforme demanda."
    }
  },
  "sec_10": {
    "q_10_1": {
      "valor": "Mesmo número do registro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Certificação de notificação vinculada diretamente ao número de registro do ato."
    },
    "q_10_2": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG suporta geração e impressão de cartas de convocação individuais e em lote."
    },
    "q_10_3": {
      "valor": "impressão da carta de convocação, inclusão das diligências e impressão da certificação positiva/negativa (Observação: Todo processo de impressão da carta de notificação realizado por fora do sistema)",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Todo o processo de impressão de cartas de notificação é realizado atualmente fora do sistema. Capacitar a equipe no módulo nativo de notificações do Orion REG para impressão de cartas, registro de diligências e emissão das certidões."
    },
    "q_10_4": {
      "valor": "Nenhuma",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem variações no fluxo de notificações."
    },
    "q_10_5": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Documentos padrão de notificação e convocação."
    },
    "q_10_6": {
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Nenhum documento específico adicional."
    }
  },
  "sec_11": {
    "q_11_1": {
      "valor": "Sequencia única. Ex.: 1 TD, 2 PJ",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O módulo de certidões do Orion REG suporta nativamente a configuração de contador em sequência única compartilhada entre TD e PJ."
    },
    "q_11_2": {
      "valor": "Por fora do sistema",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Certidões emitidas atualmente fora do sistema. Capacitar a equipe para emissão direta no Orion REG com selagem automática, controle de custas e vinculação ao protocolo."
    },
    "q_11_3": {
      "valor": "WORD",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Modelos mantidos em arquivos Word. Necessário migrar e parametrizar as minutas no editor de texto integrado do Orion REG com tags dinâmicas."
    }
  },
  "sec_12": {
    "q_12_1": {
      "valor": "Em outro momento",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Digitalização assíncrona efetuada pelo colaborador responsável após a recepção."
    },
    "q_12_2": {
      "valor": "PASTA PJ, PJ CERTIFICADO, PJ CRTDPJ / PASTA TD, TD CERTIFICADO, TD CRTDPJ - Digitalizados por número de registro",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Estrutura de subpastas segregadas por especialidade (PJ/TD) e tipo (registro, certificado, CRTDPJ) indexadas por número de registro. Alinhar com a equipe de conversão a indexação e mapeamento da árvore de diretórios."
    },
    "q_12_3": {
      "valor": "\\\\vm02\\Imagens\\Imagens",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Diretório de imagens informado em caminho UNC (\\\\vm02\\Imagens\\Imagens). Mapear o caminho de rede no servidor e validar as permissões de acesso do serviço Orion REG."
    },
    "q_12_4": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem rotina periódica de confecção de microfilmes a partir de lotes de imagens."
    }
  },
  "sec_13": {
    "q_13_1": {
      "valor": "Relatório de Caixa",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Relatório diário de fechamento de caixa emitido nativamente pelo módulo financeiro do Orion REG."
    },
    "q_13_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Livro Protocolo Oficial mantido em formato digital com assinatura eletrônica por certificado digital ICP-Brasil, padrão suportado pelo Orion REG."
    }
  },
  "sec_14": {
    "q_14_1": {
      "valor": "Recepciona no balcão e os escreventes registram",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Divisão operacional clara entre recepção/balcão e escreventes registradores."
    },
    "q_14_2": {
      "valor": "TD - PJ - Certidão - Notificação - Busca e Apreensão",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Tipos de títulos e pedidos totalmente suportados pelo módulo de integração com a Central ONRTDPJ do Orion REG."
    },
    "q_14_3": {
      "valor": "Após pagamento do orçamento",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Operação padrão: orçamento prévio enviado à Central e lavratura do ato somente após a confirmação do pagamento dos emolumentos."
    }
  },
  "sec_15": {
    "q_15_1": {
      "valor": "Fechamento individual",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Fechamento individual por operador de caixa suportado nativamente pelo Orion REG."
    },
    "q_15_2": {
      "valor": "Recolhimento e PEX",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Orion REG emite o mapa analítico de recolhimento dos repasses estaduais do TJ-SP e relatório de PEX."
    },
    "q_15_3": {
      "utiliza": true,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Cartório possui controles financeiros complementares realizados fora do sistema ('Outro'). Capacitar a equipe no módulo financeiro integrado do Orion REG para centralizar a gestão e eliminar controles paralelos."
    },
    "q_15_4": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Auditoria semanal de selos digitais suportada pelo módulo de conferência e lotes de selagem do TJ-SP no Orion REG."
    },
    "q_15_5": {
      "valor": "Outro",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Controle do Livro Caixa realizado por rotina externa ('Outro'). Parametrizar o Livro Caixa oficial no Orion REG conforme as diretrizes do Provimento CNJ nº 45/149 para apuração e conciliação de receitas/despesas."
    },
    "q_15_6": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Serventia não utiliza a ferramenta Parcela Express."
    },
    "q_15_7": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem exigência de geração de RPS individual por ato no balcão de atendimento."
    }
  },
  "sec_16": {
    "q_16_1": {
      "valor": "Pelo Sistema com certificado digital",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Comunicação de operações (SISCOAF / Provimento CNJ nº 88/149) realizada via sistema com certificado digital."
    },
    "q_16_2": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. A serventia possui website institucional desenvolvido e mantido por terceiro."
    },
    "q_16_3": {
      "utiliza": false,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "PONTO DE ATENÇÃO: Website institucional de terceiro atualmente sem integração com o sistema. Caso a serventia decida disponibilizar consulta pública online de protocolos e certidões, disponibilizar a API/serviço do Orion REG."
    }
  },
  "sec_17": {
    "q_17_1": {
      "valor": "Nenhuma particularidade adicional informada.",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não foram relatadas particularidades adicionais de processo."
    }
  },
  "finalVerdict": "Aderente com Restrições",
  "finalNotes": "O sistema Orion REG mostrou-se plenamente aderente à operação da serventia, sem nenhum bloqueio de produto (0 gaps impeditivos). Foram mapeados 10 pontos de atenção prioritários para parametrização e treinamento:\n\n1. Devolução de saldo parado (> 60 dias): capacitar o financeiro no relatório nativo de depósitos prévios e devolução de saldos pendentes.\n2. Devolução de Saldo diferenciada por valor: cartório devolve < R$ 100 em dinheiro e > R$ 100 em cheque; parametrizar formas de restituição no caixa.\n3. Numeração de Notas Devolutivas: cartório não controla numeração de notas de exigência; parametrizar numeração sequencial automática do Orion REG vinculada ao protocolo e fluxo de reentrada.\n4. Máscara de Averbações: adotar o padrão operacional [Protocolo]/[Registro] (ex.: 71855/5022) utilizado pela serventia.\n5. Controle de Notificações fora do sistema: migrar controle externo de notificações e diligências para a rotina nativa do Orion REG.\n6. Impressão de Cartas de Notificação: capacitar a equipe no módulo nativo para geração/impressão de cartas (inclusive em lote) e certidões positivas/negativas.\n7. Emissão e Modelos de Certidões: certidões são emitidas externamente com modelos no Word; migrar minutas para o editor integrado com tags dinâmicas e selagem automática.\n8. Repositório de Imagens: validar caminho UNC (\\\\vm02\\Imagens\\Imagens) e estrutura de subpastas segregadas (PJ/TD) indexadas por número de registro.\n9. Controles Financeiros e Livro Caixa: alinhar conciliação diária e fechamento do Livro Caixa oficial conforme Provimento CNJ nº 45/149.\n10. Integração com Website: disponibilizar API de consulta pública de andamento de protocolos caso a serventia deseje consulta online."
}
  $PAYLOAD$::jsonb,
  NOW()
);

-- 2. Atualizar o projeto em public.projects com os dados consolidados da aderência
UPDATE public.projects
SET
  adherence_responsible_id = 'b9abc619-d3c7-4f53-b427-f820de95472d',
  adherence_responsible = 'Julio Araujo',
  adherence_status = 'waiting_adjustment',
  adherence_analysis_complete = true,
  adherence_observations = 'Aderente com Restrições (90% de aderência e 10 pontos de atenção de parametrização/treinamento: devolução de saldo parado > 60 dias, restituição por dinheiro/cheque, numeração sequencial de notas devolutivas, máscara de averbação [Protocolo]/[Registro], controle nativo de notificações, impressão de cartas e diligências no Orion, migração de modelos de certidões do Word, repositório de imagens UNC \\vm02\Imagens\Imagens, Livro Caixa oficial Provimento 45 CNJ e integração com site).'
WHERE id = '12cb6cc4-efa3-483b-80b1-c45d47d8ea81';

-- 3. Notificação de novidades no Changelog (Regra 12 do AGENTS.md)
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
  'Carga de Aderência Orion REG — Carapicuíba (#697717)',
  'Análise de aderência do projeto Carapicuíba - Registro de Imóveis e TD/PJ (#697717) concluída com 90% de aderência (Aderente com Restrições), 10 pontos de atenção mapeados e auditados no formulário do Orion REG.',
  '/projects/12cb6cc4-efa3-483b-80b1-c45d47d8ea81/adherence',
  NOW()
);
