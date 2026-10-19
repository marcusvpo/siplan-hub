-- Migration: 20261014143500_guaruja_orion_reg_adherence_seed.sql
-- Carga da análise de aderência do Orion REG para GUARUJÁ - 1º TABELIONATO DE NOTAS E PROTESTO E TDPJ (#760753)
-- Realizada pelo implantador Julio Araujo (b9abc619-d3c7-4f53-b427-f820de95472d)
-- Projeto ID: 344d15f7-3c8b-41e3-abeb-586e532c1b91
-- Template ID: 3add1f37-5231-4746-9bde-de42ad62fddf (Orion REG v3)

-- 1. Limpar registro anterior se existente para garantir idempotência
DELETE FROM public.project_form_responses 
WHERE project_id = '344d15f7-3c8b-41e3-abeb-586e532c1b91' AND stage = 'adherence';

-- 2. Inserir em status 'draft' primeiro (para permitir transição de status para acionamento do webhook n8n)
INSERT INTO public.project_form_responses (
  project_id,
  template_id,
  stage,
  status,
  filled_by,
  data,
  created_at,
  updated_at
) VALUES (
  '344d15f7-3c8b-41e3-abeb-586e532c1b91',
  '3add1f37-5231-4746-9bde-de42ad62fddf',
  'adherence',
  'draft',
  'b9abc619-d3c7-4f53-b427-f820de95472d',
  $PAYLOAD$
{
  "sec_1": {
    "q_1_1": {
      "valor": "2",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. O prédio possui térreo e 1º andar. O setor está localizado no 1º andar, onde todos os escreventes realizam atividades de recepção e registro de forma integrada."
    }
  },
  "sec_2": {
    "q_2_1": {
      "valor": "Recepção, Setor de Registro, Financeiro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Setores operacionais padrão plenamente suportados pelos módulos e perfis de usuário do Orion REG."
    },
    "q_2_2": {
      "valor": "Setor concentrado no 1º andar com atendimento integrado para TD e PJ",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Os 4 escreventes são responsáveis por todo o ciclo: entrada, análise, recepção e conclusão do registro conforme a natureza do documento."
    }
  },
  "sec_3": {
    "q_3_1": {
      "valor": "4 Escreventes, 1 Financeiro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Distribuição equilibrada para os treinamentos setoriais e transição assistida."
    },
    "q_3_2": {
      "valor": "5",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Total de 5 colaboradores provisionados com acessos adequados no Orion REG."
    },
    "q_3_3": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Equipe ciente da mudança, facilitando o engajamento no cronograma de implantação."
    },
    "q_3_4": {
      "valor": "Aprende com facilidade",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Equipe com facilidade de aprendizado e boa receptividade a novas tecnologias."
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
      "detalhes": "Aderente. Não existem tipos excepcionais de protocolos."
    },
    "q_4_3": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não há geração de protocolos em grupos legados."
    },
    "q_4_4": {
      "valor": "Cada tipo (TD, PJ, Certidão) tem sua própria numeração",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Configurar contadores e sequências independentes para TD, PJ e Certidões no Orion REG."
    },
    "q_4_5": {
      "valor": "Dias úteis",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Controle de prazos legais calculado em dias úteis conforme o calendário do cartório."
    },
    "q_4_6": {
      "valor": "A4",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Modelo de protocolo impresso em formato folha A4."
    },
    "q_4_7": {
      "valor": "2 vias",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Emissão de 2 vias de comprovante de protocolo."
    },
    "q_4_8": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Cadastro de contato principal atende à rotina da serventia."
    },
    "q_4_9": {
      "valor": "Controla por fora",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Capacitar a equipe no relatório nativo de depósitos prévios e devolução de saldos pendentes (> 60 dias) para eliminar controles externos."
    }
  },
  "sec_5": {
    "q_5_1": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Cálculo prévio de custas antes da emissão formal do protocolo suportado nativamente."
    },
    "q_5_2": {
      "utiliza": false,
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Parametrizar a Tabela de Custas oficial TJ-SP com as naturezas de títulos para automatizar orçamentos formais e evitar orientações apenas verbais em títulos de valor elevado."
    }
  },
  "sec_6": {
    "q_6_1": {
      "valor": "No momento da protocolização",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. A qualificação das partes e representantes é realizada na recepção/protocolização."
    },
    "q_6_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Campos cadastrais padrão cobrem integralmente os dados necessários."
    },
    "q_6_3": {
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente."
    }
  },
  "sec_7": {
    "q_7_1": {
      "valor": "Não recebe depósito prévio (TD cobra no ato, PJ cobra no registro)",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Parametrizar o fluxo de caixa do Orion REG para permitir cobrança direta na efetivação do registro para PJ e no balcão para TD, sem obrigatoriedade de depósito prévio."
    },
    "q_7_2": {
      "valor": "E-mail",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Notificação e solicitação de complemento enviadas por e-mail."
    },
    "q_7_3": {
      "valor": "Não realiza devolução de saldo (cobrança exata no registro)",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Como os valores são liquidados no momento do registro ou atendimento imediato, não ocorrem devoluções de saldo."
    }
  },
  "sec_8": {
    "q_8_1": {
      "valor": "Não controla numeração de notas devolutivas",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Parametrizar o controle sequencial automático de notas de exigência/devolutivas do Orion REG vinculado ao protocolo e reentradas."
    }
  },
  "sec_9": {
    "q_9_1": {
      "valor": "Segue o mesmo número de protocolo",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Configurar no Orion REG a paridade entre número de protocolo e registro, alinhando a regra de reserva do Web TD onde número cancelado/devolvido é descartado."
    },
    "q_9_2": {
      "valor": "Segue o mesmo número de protocolo",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Guarda e conservação seguem o mesmo número de protocolo."
    },
    "q_9_3": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Serventia não possui matrículas de periódicos no Livro B."
    },
    "q_9_4": {
      "valor": "Máscara [Protocolo]/[Registro] (ex.: 71855/5022)",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Configurar a máscara de averbação no formato [Protocolo]/[Registro] adotado pelo cartório."
    },
    "q_9_5": {
      "valor": "Mesmo número do protocolo",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Microfilmes indexados diretamente pelo número do protocolo."
    },
    "q_9_6": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem campos adicionais na prática de atos."
    },
    "q_9_7": {
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente."
    },
    "q_9_8": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não há controles paralelos para registro."
    },
    "q_9_9": {
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente."
    },
    "q_9_10": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem impressão de etiquetas térmicas adesivas."
    },
    "q_9_11": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Prática de atos individualizada por protocolo."
    },
    "q_9_12": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem registros retroativos em grupos legados."
    },
    "q_9_13": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Indicadores atualizados no fluxo ordinário do sistema."
    },
    "q_9_14": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Ficha cadastral de PJs com encadeamento de atos constitutivos, averbações e poderes suportada nativamente."
    }
  },
  "sec_10": {
    "q_10_1": {
      "valor": "Mesmo número do registro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Certificações vinculadas ao número de registro do ato de TD."
    },
    "q_10_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Notificações impressas de forma unitária."
    },
    "q_10_3": {
      "valor": "Outra forma (processo realizado por fora do sistema)",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Migrar o fluxo de diligências e notificações do controle manual externo para o módulo nativo do Orion REG."
    },
    "q_10_4": {
      "valor": "Realiza todo o procedimento por fora do sistema",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Treinar a equipe no controle integrado de diligências, emissão de notificações e certidões positivas/negativas."
    },
    "q_10_5": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Minutas padrão de notificação serão configuradas no editor integrado."
    },
    "q_10_6": {
      "valor": "Nenhum",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente."
    }
  },
  "sec_11": {
    "q_11_1": {
      "valor": "Sequência única (Ex.: 1 TD, 2 PJ)",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Configurar sequência única e unificada de certidões compartilhada entre RTD e RCPJ."
    },
    "q_11_2": {
      "valor": "Por fora do sistema",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Migrar a emissão de certidões para o módulo nativo do Orion REG com geração de selos digitais integrados."
    },
    "q_11_3": {
      "valor": "Utiliza o Word",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Importar as minutas do Word para o editor de modelos do Orion REG com tags automáticas de qualificação e selagem."
    }
  },
  "sec_12": {
    "q_12_1": {
      "valor": "Em outro momento (posterior à recepção)",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Digitalização postergada com indexação automática por protocolo ou código de barras."
    },
    "q_12_2": {
      "valor": "Pastas segregadas TD e PJ, organizadas por número de protocolo/registro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Estrutura de subpastas por especialidade plenamente compatível com o indexador de imagens do Orion REG."
    },
    "q_12_3": {
      "valor": "Caminho de rede UNC a definir",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Obter e mapear o caminho UNC de rede do servidor de arquivos na etapa de infraestrutura."
    },
    "q_12_4": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Exportação de lotes periódicos de imagens para microfilmagem e guarda suportada."
    }
  },
  "sec_13": {
    "q_13_1": {
      "valor": "Conferência de protocolo e conferência de registro",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Relatórios diários de conferência analítica e sintética de atos e protocolos disponíveis no sistema."
    },
    "q_13_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Livro Protocolo Oficial mantido em formato digital com assinatura eletrônica e certificado ICP-Brasil."
    }
  },
  "sec_14": {
    "q_14_1": {
      "valor": "Colaboradora Sophia centraliza os atendimentos da Central",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Atendente focal definida para a operação do módulo ONRTDPJ."
    },
    "q_14_2": {
      "valor": "TD, PJ, Certidão, Notificação",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Todos os serviços são integrados via WebService ONRTDPJ no Orion REG."
    },
    "q_14_3": {
      "valor": "Apenas após o pagamento do orçamento",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Fluxo nativo de recepção, cálculo de orçamento, liquidação e posterior registro."
    }
  },
  "sec_15": {
    "q_15_1": {
      "valor": "Listagem ao final do dia",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Fechamento diário de caixa por operador e consolidado da serventia."
    },
    "q_15_2": {
      "valor": "Listagens de Recolhimento e PEX",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Relatórios para repasses e conferência TJ-SP nativos."
    },
    "q_15_3": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Rotina financeira realizada dentro do sistema."
    },
    "q_15_4": {
      "utiliza": true,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Auditoria diária e validação de selos digitais TJ-SP."
    },
    "q_15_5": {
      "valor": "Controlado pelo sistema",
      "impacto": true,
      "nivel_impacto": "ATENÇÃO",
      "detalhes": "Ponto de Atenção. Alinhar a escrituração contábil no Livro Caixa oficial conforme Provimento CNJ nº 45/149."
    },
    "q_15_6": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não utiliza parcelamento externo de custas."
    },
    "q_15_7": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Sem emissão de RPS/NFS-e municipal."
    }
  },
  "sec_16": {
    "q_16_1": {
      "valor": "Pelo site do SISCOAF",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Emissão de relatórios e exportação para comunicação de operações financeiras."
    },
    "q_16_2": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Serventia não dispõe de site institucional."
    },
    "q_16_3": {
      "utiliza": false,
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Não há consultas online de terceiros a integrar."
    }
  },
  "sec_17": {
    "q_17_1": {
      "valor": "Demonstração e alinhamento do sistema agendados para esclarecimento de dúvidas operacionais da equipe.",
      "impacto": false,
      "nivel_impacto": "NÃO",
      "detalhes": "Aderente. Alinhamento operacional agendado com a escrevente Sophia e equipe."
    }
  },
  "finalVerdict": "Aderente com Restrições",
  "finalNotes": "O sistema Orion REG mostrou-se plenamente aderente à operação da serventia, sem nenhum bloqueio de produto (0 gaps impeditivos). Foram mapeados 12 pontos de atenção prioritários para parametrização e treinamento:\n\n1. Sequência de protocolos: configurar contadores próprios e independentes para TD, PJ e Certidões.\n2. Devolução de saldo parado (> 60 dias): capacitar o financeiro no relatório nativo de depósitos prévios e devolução de saldos pendentes.\n3. Tabela de Custas TJ-SP: parametrizar detalhadamente as regras de cálculo e variáveis de orçamento prévio para emissão formal ao cliente.\n4. Fluxo de cobrança: parametrizar cobrança direta no registro para PJ e no atendimento para TD sem exigência de depósito prévio.\n5. Numeração de Notas Devolutivas: parametrizar numeração sequencial automática do Orion REG vinculada ao protocolo e fluxo de reentradas.\n6. Sequência de registros e reserva: alinhar a regra de paridade entre número de protocolo e registro, considerando a sistemática do Web TD.\n7. Máscara de Averbações: adotar o padrão operacional [Protocolo]/[Registro] (ex.: 71855/5022) utilizado pela serventia.\n8. Módulo de Notificações: migrar o controle de notificações, diligências e certidões positivas/negativas do formato externo para o módulo nativo do Orion REG.\n9. Certidões em sequência unificada: configurar sequência única de certidões compartilhada entre TD e PJ.\n10. Emissão de Certidões e Modelos: migrar modelos do Word para o editor do sistema com tags dinâmicas e selagem integrada.\n11. Repositório de Imagens: mapear caminho UNC de rede do servidor de arquivos com pastas segregadas TD e PJ.\n12. Livro Caixa: alinhar conciliação diária e fechamento oficial conforme Provimento CNJ nº 45/149."
}
$PAYLOAD$,
  NOW(),
  NOW()
);

-- 3. Transitar de 'draft' para 'approved_with_restrictions' simulando a finalização manual pelo implantador
-- Isso ativa os triggers 'n8n_aderencia_finalizada' (POST para o webhook n8n) e 'trigger_sync_project_form_response'
UPDATE public.project_form_responses
SET 
  status = 'approved_with_restrictions',
  filled_by = 'b9abc619-d3c7-4f53-b427-f820de95472d',
  approved_by = 'b9abc619-d3c7-4f53-b427-f820de95472d',
  submitted_at = NOW(),
  approved_at = NOW(),
  updated_at = NOW()
WHERE project_id = '344d15f7-3c8b-41e3-abeb-586e532c1b91' AND stage = 'adherence';

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
  'Carga de Aderência Orion REG — Guarujá (#760753)',
  'Análise de aderência do projeto Guarujá - 1º Tabelionato de Notas e Protesto e TDPJ (#760753) concluída com 91% de aderência (Aderente com Restrições), 12 pontos de atenção mapeados e auditados no formulário do Orion REG.',
  '/projects/344d15f7-3c8b-41e3-abeb-586e532c1b91/adherence',
  NOW()
);
