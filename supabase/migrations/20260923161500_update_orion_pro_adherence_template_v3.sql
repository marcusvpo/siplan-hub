-- Migration: Atualização do template de Aderência do Orion PRO para a Versão 3
-- Incorpora as validações e reformulações solicitadas pelo PO (Distribuidor, Boletos, Intimadora, Documentos Eletrônicos) e correção ortográfica no Caixa.

-- 1. Desativa a versão 2 atualmente ativa para Orion PRO
UPDATE public.form_templates
SET is_active = false
WHERE kind = 'adherence'
  AND system_type = 'Orion PRO'
  AND is_active = true;

-- 2. Insere a Versão 3 ativa
INSERT INTO public.form_templates (
  kind,
  system_type,
  version,
  schema_json,
  ui_json,
  is_active,
  notes
) VALUES (
  'adherence',
  'Orion PRO',
  3,
  $S_JSON$
{
  "type": "object",
  "title": "Aderência do Sistema (Orion PRO)",
  "properties": {
    "sec_1": {
      "type": "object",
      "title": "1. Informações Iniciais e Dados Gerais",
      "properties": {
        "q_1_1": {
          "type": "object",
          "title": "Data da Análise",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta",
              "format": "date"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_1_2": {
          "type": "object",
          "title": "Entrevistado",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_1_3": {
          "type": "object",
          "title": "Sistema Atual do Cartório",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_1_4": {
          "type": "object",
          "title": "Sistema da Implantação",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_1_5": {
          "type": "object",
          "title": "Quantidade de Usuários do Setor de Protesto",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_1_6": {
          "type": "object",
          "title": "Quantidade Média de Títulos Protocolizados por Dia",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_2": {
      "type": "object",
      "title": "2. Distribuidor de Títulos e Recepção de Remessas",
      "properties": {
        "q_2_1": {
          "type": "object",
          "title": "A comarca possui serviço distribuidor de títulos?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_2": {
          "type": "object",
          "title": "Qual o sistema ou empresa responsável pela distribuição de títulos na comarca? É utilizado sistema/layout diferente do padrão homologado no Orion PRO?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_3": {
          "type": "object",
          "title": "Qual a origem de recepção dos títulos no cartório?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_4": {
          "type": "object",
          "title": "A remessa de títulos é enviada pelo Distribuidor ou diretamente pela CRA?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_5": {
          "type": "object",
          "title": "O cartório recebe títulos de portadores integrados à CRA?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_6": {
          "type": "object",
          "title": "O cartório recebe títulos de portadores particulares (e-formulário / balcão)?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_7": {
          "type": "object",
          "title": "O cartório utiliza remessa de retirada via CRA?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_8": {
          "type": "object",
          "title": "O cartório utiliza remessa de cancelamento via CRA?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_9": {
          "type": "object",
          "title": "O cartório utiliza outros arquivos ou integrações fora do padrão da CRA?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_10": {
          "type": "object",
          "title": "Quais arquivos externos adicionais são utilizados fora da CRA?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_2_11": {
          "type": "object",
          "title": "Utiliza o regime de Protocolização D+1?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_3": {
      "type": "object",
      "title": "3. Boletos e Meios de Pagamento",
      "properties": {
        "q_3_1": {
          "type": "object",
          "title": "Qual(is) banco(s) o cartório utiliza para a geração de boletos de cobrança?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_3_2": {
          "type": "object",
          "title": "O cartório trabalha com mais algum banco além do principal?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_3_3": {
          "type": "object",
          "title": "Para quais serviços ou atos o cartório emite boleto bancário?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_3_4": {
          "type": "object",
          "title": "Quais canais e formas de envio de boletos são utilizados pelo cartório (e-mail, WhatsApp, SMS, portal web ou outros) e para quais tipos de boletos?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_4": {
      "type": "object",
      "title": "4. Fluxo de Intimações e Prazos",
      "properties": {
        "q_4_1": {
          "type": "object",
          "title": "Como é realizado o envio das intimações dentro da comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_2": {
          "type": "object",
          "title": "Quais empresas terceirizadas ou plataformas são utilizadas para envio de intimações dentro da comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_3": {
          "type": "object",
          "title": "Como é realizado o envio das intimações para fora da comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_4": {
          "type": "object",
          "title": "Quais empresas terceirizadas ou plataformas são utilizadas para envio de intimações para fora da comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_5": {
          "type": "object",
          "title": "As intimações utilizam papel pré-impresso?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_6": {
          "type": "object",
          "title": "Qual o layout ou formato do papel de intimação (dentro e fora da comarca)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_7": {
          "type": "object",
          "title": "Qual o tipo/método de envio configurado para intimações dentro da comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_8": {
          "type": "object",
          "title": "Qual o prazo regulamentar para títulos dentro da comarca (em dias úteis)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_9": {
          "type": "object",
          "title": "Qual o tipo/método de envio configurado para intimações fora da comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_10": {
          "type": "object",
          "title": "Qual o prazo regulamentar para títulos fora da comarca (em dias úteis)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_4_11": {
          "type": "object",
          "title": "O sistema deve gerar arquivo de remessa específico de intimações para empresa intimadora terceirizada? Se sim, qual empresa e layout?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_5": {
      "type": "object",
      "title": "5. Editais de Protesto",
      "properties": {
        "q_5_1": {
          "type": "object",
          "title": "Como é realizada a publicação dos editais de protesto?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_5_2": {
          "type": "object",
          "title": "O cartório realiza o envio de editais para outros jornais ou plataformas de terceiros?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_5_3": {
          "type": "object",
          "title": "Quais são as plataformas de terceiros ou jornais utilizados para publicação de editais?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_5_4": {
          "type": "object",
          "title": "Qual o prazo para a publicação do edital (em dias úteis)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_6": {
      "type": "object",
      "title": "6. Livros, Abertura, Encerramento e Impressão",
      "properties": {
        "q_6_1": {
          "type": "object",
          "title": "Qual o total de folhas por livro de Termo de Protesto?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_2": {
          "type": "object",
          "title": "Qual a sigla do livro de Termo de Protesto?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_3": {
          "type": "object",
          "title": "Quantas folhas são reservadas para o Termo de Abertura do livro de Termo de Protesto?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_4": {
          "type": "object",
          "title": "Quantas folhas são reservadas para o Termo de Encerramento do livro de Termo de Protesto?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_5": {
          "type": "object",
          "title": "Qual o total de folhas por livro de Protocolo?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_6": {
          "type": "object",
          "title": "Qual a sigla do livro de Protocolo?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_7": {
          "type": "object",
          "title": "Quantas folhas são reservadas para o Termo de Abertura do livro de Protocolo?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_8": {
          "type": "object",
          "title": "Quantas folhas são reservadas para o Termo de Encerramento do livro de Protocolo?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_9": {
          "type": "object",
          "title": "Qual a quantidade máxima de devedores listados por folha no livro?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_10": {
          "type": "object",
          "title": "Qual a altura reservada para o termo de encerramento diário (linhas/cm)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_11": {
          "type": "object",
          "title": "O cartório utiliza impressão de etiquetas adesivas nos processos de protesto?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_6_12": {
          "type": "object",
          "title": "Quais os processos e circunstâncias em que as etiquetas são aplicadas?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_7": {
      "type": "object",
      "title": "7. Selo Digital e Rotinas de Pré-Validação",
      "properties": {
        "q_7_1": {
          "type": "object",
          "title": "Qual o modo de comunicação do Selo Digital com a Corregedoria/Tribunal?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_7_2": {
          "type": "object",
          "title": "O cartório utiliza a rotina de controle de Pré-Irregularidade?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_7_3": {
          "type": "object",
          "title": "O cartório imprime intimação específica para casos de Pré-Irregularidade?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_7_4": {
          "type": "object",
          "title": "O cartório utiliza a rotina de controle de Pré-Retirada?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_8": {
      "type": "object",
      "title": "8. Relatórios, Recibos e Requerimentos",
      "properties": {
        "q_8_1": {
          "type": "object",
          "title": "Necessita de relatórios de controle de intimações na comarca? Quais?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_2": {
          "type": "object",
          "title": "Necessita de relatórios de controle de intimações fora da comarca? Quais?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_3": {
          "type": "object",
          "title": "Necessita de relatórios para controle de certidões emitidas? Quais?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_4": {
          "type": "object",
          "title": "Necessita de relatórios para controle de cancelamentos? Quais?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_5": {
          "type": "object",
          "title": "Necessita de relatórios para controle de apontamento de títulos? Quais?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_6": {
          "type": "object",
          "title": "Necessita de relatórios de controle para outros serviços específicos? Quais?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_7": {
          "type": "object",
          "title": "O cartório utiliza certidão ou relatórios específicos para fins de Microfilme ou Documentos Eletrônicos / Acervo Digital?",
          "properties": {
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_8": {
          "type": "object",
          "title": "Utiliza relatório/listagem de recolhimento diário de custas?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_9": {
          "type": "object",
          "title": "Utiliza relatório/listagem de controle PEX (Parcela Express / Condução de intimações)?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_10": {
          "type": "object",
          "title": "Utiliza relatório/listagem de prestação de contas com portadores/apresentantes?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_11": {
          "type": "object",
          "title": "Utiliza relatório/listagem de controle de intimações gerais?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_12": {
          "type": "object",
          "title": "Utiliza relatório/listagem de controle de caixa?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_13": {
          "type": "object",
          "title": "Quais relatórios do sistema atual são considerados indispensáveis para a operação do cartório?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_14": {
          "type": "object",
          "title": "Foi explicada ao cartório a política de Recibo Único de Operação de Caixa?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_15": {
          "type": "object",
          "title": "O cartório utiliza ou exige um recibo específico para o ato de Cancelamento?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_16": {
          "type": "object",
          "title": "Quais outros recibos adicionais o cartório emite que precisam ser analisados?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_17": {
          "type": "object",
          "title": "O cartório utiliza o Requerimento de Cancelamento padrão fornecido pelo sistema?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_8_18": {
          "type": "object",
          "title": "O cartório utiliza o Requerimento de Retirada padrão fornecido pelo sistema?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_9": {
      "type": "object",
      "title": "9. Certidões e Fluxo de Digitalização",
      "properties": {
        "q_9_1": {
          "type": "object",
          "title": "A certidão positiva/negativa de protesto utiliza papel pré-impresso?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_9_2": {
          "type": "object",
          "title": "Qual o layout ou papel utilizado para a emissão de Certidão Positiva/Negativa?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_9_3": {
          "type": "object",
          "title": "A certidão de cancelamento de protesto utiliza papel pré-impresso?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_9_4": {
          "type": "object",
          "title": "Qual o layout ou papel utilizado para a emissão de Certidão de Cancelamento?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_9_5": {
          "type": "object",
          "title": "O cancelamento gera certidão automaticamente na mesma operação?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_9_6": {
          "type": "object",
          "title": "Quais as rotinas e documentos que passam por digitalização de imagens no cartório?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_10": {
      "type": "object",
      "title": "10. Integrações de Sistemas e Comunicação Externa",
      "properties": {
        "q_10_1": {
          "type": "object",
          "title": "O cartório possui integração ativa ou planejada com o site institucional da serventia?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_2": {
          "type": "object",
          "title": "O cartório utiliza serviços integrados do WebProtesto (IEPTB)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_3": {
          "type": "object",
          "title": "O cartório utiliza consultas integradas a APIs de terceiros para verificar andamento de títulos?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_4": {
          "type": "object",
          "title": "O cartório possui integrações com outras empresas ou sistemas externos (ex: Intima Digital)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_5": {
          "type": "object",
          "title": "O cartório possui integração com a prefeitura local para emissão de Nota Fiscal de Serviços (NFS-e)?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_6": {
          "type": "object",
          "title": "Qual o emissor de NFS-e ou sistema de ISS da prefeitura da comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_7": {
          "type": "object",
          "title": "O cartório realiza comunicação direta de operações suspeitas com o COAF pelo sistema?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_8": {
          "type": "object",
          "title": "O cartório utiliza integração com a plataforma Parcela Express (PEX)?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_9": {
          "type": "object",
          "title": "O cartório possui integração com o sistema de Livro Caixa? Se sim, qual?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_10_10": {
          "type": "object",
          "title": "O cartório utiliza a integração com o sistema SERB?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_11": {
      "type": "object",
      "title": "11. Controle de Caixa e Estações de Trabalho",
      "properties": {
        "q_11_1": {
          "type": "object",
          "title": "Como é estruturado o fluxo de caixa do cartório (Caixa Unificado ou por Operador)?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_11_2": {
          "type": "object",
          "title": "O cartório exige a abertura de caixa individual por operador/estação?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_11_3": {
          "type": "object",
          "title": "O cartório necessita de relatório detalhado de operações de caixa por operador?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_11_4": {
          "type": "object",
          "title": "O cartório exige o mesmo modelo de controle de caixa existente no Orion TN?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_12": {
      "type": "object",
      "title": "12. Módulo de Assessorias e Procurações",
      "properties": {
        "q_12_1": {
          "type": "object",
          "title": "O cartório utiliza o módulo de Assessoria de Procurações no dia a dia?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_12_2": {
          "type": "object",
          "title": "No módulo de assessoria, é realizada a busca automática em arquivos de procuração?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_12_3": {
          "type": "object",
          "title": "No módulo de assessoria, são ativos os alertas visuais de vencimento de procurações?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_12_4": {
          "type": "object",
          "title": "No módulo de assessoria, há serviço de busca em procurações individual por assessorado?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_13": {
      "type": "object",
      "title": "13. Repasses a Antigos Tabeliães e Acervos",
      "properties": {
        "q_13_1": {
          "type": "object",
          "title": "O cartório realiza repasse de valores referentes a cancelamento de protesto a antigos tabeliães?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_13_2": {
          "type": "object",
          "title": "Qual o nome, CPF/documento e período de atuação de cada antigo tabelião beneficiário do repasse?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_13_3": {
          "type": "object",
          "title": "O cartório recebeu acervo de outra serventia no passado?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_13_4": {
          "type": "object",
          "title": "Qual o Código CRA utilizado pela serventia que enviou o acervo?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_13_5": {
          "type": "object",
          "title": "Qual o CPF e período de atuação das tabeliães do acervo recebido?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_14": {
      "type": "object",
      "title": "14. Parametrizações Gerais e Fiscais",
      "properties": {
        "q_14_1": {
          "type": "object",
          "title": "Valor ISS - Qual a alíquota padrão de ISS cobrada pelo município?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_14_2": {
          "type": "object",
          "title": "Valor ISS - Qual a regra de arredondamento adotada para o ISS?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_14_3": {
          "type": "object",
          "title": "Valor ISS - Como deve ser calculada a incidência de ISS sob a taxa?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_14_4": {
          "type": "object",
          "title": "Qual a regra de arredondamento de Custas adotada pelo cartório?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_14_5": {
          "type": "object",
          "title": "Qual a Nacionalidade Padrão sugerida pelo sistema nos cadastros?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_14_6": {
          "type": "object",
          "title": "Qual o campo ou código de avaliação de custas do CPC utilizado na comarca?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_14_7": {
          "type": "object",
          "title": "Qual o modelo de impressão a ser utilizado para Termo e Instrumento de Protesto?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_14_8": {
          "type": "object",
          "title": "Qual o modelo de impressão a ser utilizado para a emissão de Intimações?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    },
    "sec_15": {
      "type": "object",
      "title": "15. Considerações Finais e Pontos de Atenção",
      "properties": {
        "q_15_1": {
          "type": "object",
          "title": "Foi identificado algum impedimento técnico ou operacional que impeça a implantação do OrionPRO?",
          "properties": {
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "utiliza": {
              "type": "boolean",
              "title": "Utiliza?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        },
        "q_15_2": {
          "type": "object",
          "title": "Quais são as considerações gerais, pontos de atenção ou customizações identificadas?",
          "properties": {
            "valor": {
              "type": "string",
              "title": "Resposta"
            },
            "impacto": {
              "type": "boolean",
              "title": "Possui algum impacto?",
              "default": false
            },
            "detalhes": {
              "type": "string",
              "title": "Detalhes do Impacto"
            }
          }
        }
      }
    }
  },
  "description": "Verificação inicial de gaps e requisitos"
}
  $S_JSON$,
  $U_JSON$
{
  "sec_1": {
    "q_1_1": {
      "valor": {
        "ui:widget": "date",
        "ui:options": {
          "placeholder": "DD/MM/YYYY"
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_1_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_1_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_1_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_1_5": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_1_6": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_2": {
    "q_2_1": {
      "ui:field": "adherenceQuestion"
    },
    "q_2_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Siplan SDTP (nativo), CRA Nacional (direto) ou sistema terceiro (Insight, Genesys, TJ local). Se for sistema terceiro, informe o fornecedor e contato para envio do layout de integração da Siplan..."
        }
      }
    },
    "q_2_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_2_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_2_5": {
      "ui:field": "adherenceQuestion"
    },
    "q_2_6": {
      "ui:field": "adherenceQuestion"
    },
    "q_2_7": {
      "ui:field": "adherenceQuestion"
    },
    "q_2_8": {
      "ui:field": "adherenceQuestion"
    },
    "q_2_9": {
      "ui:field": "adherenceQuestion"
    },
    "q_2_10": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_2_11": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_3": {
    "q_3_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_3_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_3_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_3_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva os canais utilizados pelo cartório para envio de boletos (ex: WhatsApp, e-mail, SMS, portal web ou balcão) e especifique os tipos de cobrança (intimação, cancelamento, certidões)..."
        }
      }
    }
  },
  "sec_4": {
    "q_4_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_5": {
      "ui:field": "adherenceQuestion"
    },
    "q_4_6": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_7": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_8": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_9": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_10": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_4_11": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Não utiliza intimadora externa; Sim, Transmaje (layout homologado); ou Sim, outra empresa intimadora (informe nome, layout e solicite amostra de arquivos para adaptação no Orion PRO)..."
        }
      }
    }
  },
  "sec_5": {
    "q_5_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_5_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_5_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_5_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_6": {
    "q_6_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_5": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_6": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_7": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_8": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_9": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_10": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_6_11": {
      "ui:field": "adherenceQuestion"
    },
    "q_6_12": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_7": {
    "q_7_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_7_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_7_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_7_4": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_8": {
    "q_8_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_5": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_6": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_7": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_8": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_9": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_10": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_11": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_12": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_13": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_14": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_15": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_16": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_8_17": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_18": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_9": {
    "q_9_1": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_9_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_9_5": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_9_6": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_10": {
    "q_10_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_10_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_10_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_10_5": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_6": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_10_7": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_8": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_9": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_10_10": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_11": {
    "q_11_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_11_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_11_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_11_4": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_12": {
    "q_12_1": {
      "ui:field": "adherenceQuestion"
    },
    "q_12_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_12_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_12_4": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_13": {
    "q_13_1": {
      "ui:field": "adherenceQuestion"
    },
    "q_13_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_13_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_13_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_13_5": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_14": {
    "q_14_1": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_14_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_14_3": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_14_4": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_14_5": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_14_6": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_14_7": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    },
    "q_14_8": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_15": {
    "q_15_1": {
      "ui:field": "adherenceQuestion"
    },
    "q_15_2": {
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe o modelo/layout utilizado..."
        }
      },
      "ui:field": "adherenceQuestion"
    }
  }
}
  $U_JSON$,
  true,
  'Template v3 Orion PRO: Reformulação de perguntas (Distribuidor externo, canais de boletos, remessa para intimadora e acervo de documentos eletrônicos) e correção ortográfica no Caixa conforme validação do PO.'
)
ON CONFLICT (kind, system_type, version)
DO UPDATE SET
  schema_json = EXCLUDED.schema_json,
  ui_json = EXCLUDED.ui_json,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes;

-- 3. Registra notificação de changelog (Regra 12 do AGENTS.md)
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
) VALUES (
  'changelog',
  'release_improvement',
  'implantadores_aderencia',
  'Formulário de Aderência Orion PRO Atualizado (v3)',
  'Atualização do formulário de aderência do Orion PRO para a versão 3: aprimoramento das perguntas sobre sistema distribuidor externo, canais omnicanal de boletos (e-mail, WhatsApp, SMS), remessa para intimadoras terceirizadas e certidões/relatórios de documentos eletrônicos, além de correção tipográfica no controle de caixa.',
  '/implantadores/aderencia'
);
