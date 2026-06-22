-- Seed Orion PRO adherence template
INSERT INTO public.form_templates (kind, system_type, version, schema_json, ui_json, is_active, notes)
VALUES (
  'adherence',
  'Orion PRO',
  1,
  $S_JSON$
{
  "title": "Análise de Aderência Orion PRO",
  "description": "Formulário completo de análise de aderência para implantação do sistema Orion PRO.",
  "type": "object",
  "properties": {
    "sec_1": {
      "type": "object",
      "title": "1. Informações Iniciais e Dados Gerais",
      "properties": {
        "q_1_1": {
          "type": "object",
          "title": "Analista Responsável",
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
        "q_1_2": {
          "type": "object",
          "title": "Cliente / Serventia",
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
          "title": "Data da Análise",
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
        "q_1_5": {
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
        "q_1_6": {
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
        "q_1_7": {
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
        "q_1_8": {
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
        "q_2_2": {
          "type": "object",
          "title": "Qual o sistema ou empresa responsável pela distribuição de títulos?",
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
        "q_2_6": {
          "type": "object",
          "title": "O cartório recebe títulos de portadores particulares (e-formulário / balcão)?",
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
        "q_2_7": {
          "type": "object",
          "title": "O cartório utiliza remessa de retirada via CRA?",
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
        "q_2_8": {
          "type": "object",
          "title": "O cartório utiliza remessa de cancelamento via CRA?",
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
        "q_2_9": {
          "type": "object",
          "title": "O cartório utiliza outros arquivos ou integrações fora do padrão da CRA?",
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
          "title": "O cartório realiza o envio de boletos por e-mail? Se sim, quais boletos?",
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
          "title": "O sistema deve gerar arquivo específico de intimações para a empresa Transmaje?",
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
        "q_7_3": {
          "type": "object",
          "title": "O cartório imprime intimação específica para casos de Pré-Irregularidade?",
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
        "q_7_4": {
          "type": "object",
          "title": "O cartório utiliza a rotina de controle de Pré-Retirada?",
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
          "title": "O cartório utiliza certidão ou relatórios específicos para fins de Microfilme?",
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
        "q_8_9": {
          "type": "object",
          "title": "Utiliza relatório/listagem de controle PEX (Parcela Express / Condução de intimações)?",
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
        "q_8_10": {
          "type": "object",
          "title": "Utiliza relatório/listagem de prestação de contas com portadores/apresentantes?",
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
        "q_8_11": {
          "type": "object",
          "title": "Utiliza relatório/listagem de controle de intimações gerais?",
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
        "q_8_12": {
          "type": "object",
          "title": "Utiliza relatório/listagem de controle de caixa?",
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
        "q_8_15": {
          "type": "object",
          "title": "O cartório utiliza ou exige um recibo específico para o ato de Cancelamento?",
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
        "q_8_18": {
          "type": "object",
          "title": "O cartório utiliza o Requerimento de Retirada padrão fornecido pelo sistema?",
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
        "q_10_8": {
          "type": "object",
          "title": "O cartório utiliza integração com a plataforma Parcela Express (PEX)?",
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
        "q_11_3": {
          "type": "object",
          "title": "O cartório necessita de relatório detalhado de operações de caixa por operador?",
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
        "q_11_4": {
          "type": "object",
          "title": "O cartório exige o mesmo modelo de controle de caixa existente no Orion TN?",
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
        "q_12_2": {
          "type": "object",
          "title": "No módulo de assessoria, é realizada a busca automática em arquivos de procuração?",
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
        "q_12_3": {
          "type": "object",
          "title": "No módulo de assessoria, são ativos os alertas visuais de vencimento de procurações?",
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
        "q_12_4": {
          "type": "object",
          "title": "No módulo de assessoria, há serviço de busca em procurações individual por assessorado?",
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
  }
}
  $S_JSON$,
  $U_JSON$
{
  "sec_1": {
    "q_1_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Digite o nome do analista responsável..."
        }
      }
    },
    "q_1_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Digite o nome do cliente / serventia..."
        }
      }
    },
    "q_1_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: DD/MM/AAAA"
        }
      }
    },
    "q_1_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Nome e cargo do entrevistado..."
        }
      }
    },
    "q_1_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Siplan, Insight, Genesys..."
        }
      }
    },
    "q_1_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: OrionPRO"
        }
      }
    },
    "q_1_7": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe a quantidade de usuários..."
        }
      }
    },
    "q_1_8": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Informe a quantidade média diária..."
        }
      }
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
          "placeholder": "Ex: Siplan SDTP, Insight, Genesys, CRA, etc..."
        }
      }
    },
    "q_2_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Distribuidor, CRA, etc..."
        }
      }
    },
    "q_2_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Diretamente pela CRA, via Distribuidor..."
        }
      }
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
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: remessas de órgãos públicos, arquivos locais..."
        }
      }
    },
    "q_2_11": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_3": {
    "q_3_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Bradesco, Itaú, Santander..."
        }
      }
    },
    "q_3_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_3_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: custas de intimação, cancelamento de protesto..."
        }
      }
    },
    "q_3_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva o envio de boletos por e-mail..."
        }
      }
    }
  },
  "sec_4": {
    "q_4_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Intimador pessoal, Correios AR, Intima Digital..."
        }
      }
    },
    "q_4_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Transmaje, Brugin Express, DT Transport..."
        }
      }
    },
    "q_4_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Correios AR, Carta registrada, Telegrama..."
        }
      }
    },
    "q_4_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Prestadoras de serviços de entrega fora da comarca..."
        }
      }
    },
    "q_4_5": {
      "ui:field": "adherenceQuestion"
    },
    "q_4_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Folha A4 simples, sulfite comum, com ou sem serrilha..."
        }
      }
    },
    "q_4_7": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Intimador Pessoal..."
        }
      }
    },
    "q_4_8": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 3 dias úteis..."
        }
      }
    },
    "q_4_9": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Carta Registrada..."
        }
      }
    },
    "q_4_10": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 10 dias úteis..."
        }
      }
    },
    "q_4_11": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_5": {
    "q_5_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: \"Jornal do Protesto\" do IEPTB, CRA, Diário Oficial..."
        }
      }
    },
    "q_5_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_5_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Relação dos portais ou jornais parceiros para editais..."
        }
      }
    },
    "q_5_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 10 dias úteis..."
        }
      }
    }
  },
  "sec_6": {
    "q_6_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 200..."
        }
      }
    },
    "q_6_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: G..."
        }
      }
    },
    "q_6_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 1..."
        }
      }
    },
    "q_6_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 1..."
        }
      }
    },
    "q_6_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 200..."
        }
      }
    },
    "q_6_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: G..."
        }
      }
    },
    "q_6_7": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 1..."
        }
      }
    },
    "q_6_8": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 1..."
        }
      }
    },
    "q_6_9": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 13..."
        }
      }
    },
    "q_6_10": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 1 cm..."
        }
      }
    },
    "q_6_11": {
      "ui:field": "adherenceQuestion"
    },
    "q_6_12": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: contra-capa de livro, comprovantes..."
        }
      }
    }
  },
  "sec_7": {
    "q_7_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Online em tempo real, Offline em lotes..."
        }
      }
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
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva os relatórios de controle de intimações na comarca..."
        }
      }
    },
    "q_8_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva os relatórios de controle de intimações fora da comarca..."
        }
      }
    },
    "q_8_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva os relatórios de controle de certidões emitidas..."
        }
      }
    },
    "q_8_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva os relatórios de controle de cancelamentos..."
        }
      }
    },
    "q_8_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva os relatórios de controle de apontamento de títulos..."
        }
      }
    },
    "q_8_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva outros relatórios de controle necessários..."
        }
      }
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
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Relatório diário de protocolo, estatísticas..."
        }
      }
    },
    "q_8_14": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_15": {
      "ui:field": "adherenceQuestion"
    },
    "q_8_16": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva outros recibos ou anexe exemplos..."
        }
      }
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
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Sulfite comum, papel de segurança padrão..."
        }
      }
    },
    "q_9_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Sulfite comum, papel de segurança padrão..."
        }
      }
    },
    "q_9_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Sem Certidão, Com Certidão integrada..."
        }
      }
    },
    "q_9_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Intimação, Títulos, Ofícios, Procurações..."
        }
      }
    }
  },
  "sec_10": {
    "q_10_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Consulta de devedores, download de boletos..."
        }
      }
    },
    "q_10_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Autorização eletrônica de cancelamento..."
        }
      }
    },
    "q_10_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Intima Digital..."
        }
      }
    },
    "q_10_5": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Emissor Nacional, ABRASF, Fiorilli, SigCorp, Prescon..."
        }
      }
    },
    "q_10_7": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_8": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_9": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: LCW..."
        }
      }
    },
    "q_10_10": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_11": {
    "q_11_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Caixa unificado, caixa individual..."
        }
      }
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
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Nome, CPF/documento e período de atuação de cada antigo tabelião..."
        }
      }
    },
    "q_13_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_13_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Código CRA da serventia..."
        }
      }
    },
    "q_13_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "CPF e período de atuação das tabeliães do acervo..."
        }
      }
    }
  },
  "sec_14": {
    "q_14_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 5%"
        }
      }
    },
    "q_14_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Para menos, Para mais..."
        }
      }
    },
    "q_14_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Sob a taxa do Tabelião, Emolumentos brutos..."
        }
      }
    },
    "q_14_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Para menos, Para mais..."
        }
      }
    },
    "q_14_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Brasileira"
        }
      }
    },
    "q_14_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: 103"
        }
      }
    },
    "q_14_7": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Modelo Jasper"
        }
      }
    },
    "q_14_8": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Ex: Modelo Jasper"
        }
      }
    }
  },
  "sec_15": {
    "q_15_1": {
      "ui:field": "adherenceQuestion"
    },
    "q_15_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": {
          "placeholder": "Descreva observações, pontos de atenção ou customizações..."
        }
      }
    }
  }
}
  $U_JSON$,
  true,
  'Template oficial padrão semeado para o sistema Orion PRO'
)
ON CONFLICT (kind, system_type, version) 
DO UPDATE SET 
  schema_json = EXCLUDED.schema_json,
  ui_json = EXCLUDED.ui_json,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes;
