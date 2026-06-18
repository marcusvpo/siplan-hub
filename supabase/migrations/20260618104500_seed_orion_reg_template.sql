-- Seed Orion REG adherence template
INSERT INTO public.form_templates (kind, system_type, version, schema_json, ui_json, is_active, notes)
VALUES (
  'adherence',
  'Orion REG',
  1,
  $S_JSON$
{
  "title": "Análise de Aderência Orion REG",
  "description": "Formulário completo de análise de aderência para implantação do sistema Orion REG.",
  "type": "object",
  "properties": {
    "sec_1": {
      "type": "object",
      "title": "1. Estrutura Física e Organizacional",
      "properties": {
        "q_1_1": {
          "type": "object",
          "title": "Quantos andares possui a serventia?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_2": {
      "type": "object",
      "title": "2. Distribuição por setores",
      "properties": {
        "q_2_1": {
          "type": "object",
          "title": "Quais setores existem no estabelecimento?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_2_2": {
          "type": "object",
          "title": "Como os setores estão distribuídos nos andares?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_3": {
      "type": "object",
      "title": "3. Estrutura de colaboradores",
      "properties": {
        "q_3_1": {
          "type": "object",
          "title": "Quantidade de colaboradores por setor",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_3_2": {
          "type": "object",
          "title": "Quantidade total de colaboradores",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_3_3": {
          "type": "object",
          "title": "Todos os colaboradores estão cientes da mudança do sistema?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_3_4": {
          "type": "object",
          "title": "Como a equipe lida com mudanças ou sistemas novos?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_4": {
      "type": "object",
      "title": "4. Recepção de Título e Certidões",
      "properties": {
        "q_4_1": {
          "type": "object",
          "title": "Como os protocolos são separados?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_2": {
          "type": "object",
          "title": "Quais os outros tipos?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_3": {
          "type": "object",
          "title": "Ainda são gerados protocolos nesse grupos?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_4": {
          "type": "object",
          "title": "Como funciona a sequência dos protocolos",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_5": {
          "type": "object",
          "title": "Como é realizado o controle de prazos?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_6": {
          "type": "object",
          "title": "Qual o formato da impressão do protocolo do título/certidão?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_7": {
          "type": "object",
          "title": "Quantas vias são impressas?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_8": {
          "type": "object",
          "title": "É informado mais de um contato para o apresentante?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_4_9": {
          "type": "object",
          "title": "Como controla a devolução de saldo parado há mais de 60 dias nos protocolos?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_5": {
      "type": "object",
      "title": "5. Custas",
      "properties": {
        "q_5_1": {
          "type": "object",
          "title": "A prévia de custas é realizada antes da impressão do protocolo para a parte?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_5_2": {
          "type": "object",
          "title": "Existem regras de registro que associam custas às naturezas dos títulos?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_6": {
      "type": "object",
      "title": "6. Qualificação das partes",
      "properties": {
        "q_6_1": {
          "type": "object",
          "title": "Em que momento é realizada a qualificação das partes?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_6_2": {
          "type": "object",
          "title": "Lança algum dado específico para as partes?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_6_3": {
          "type": "object",
          "title": "Qual dado especifico lança?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_7": {
      "type": "object",
      "title": "7. Movimentação Financeira",
      "properties": {
        "q_7_1": {
          "type": "object",
          "title": "Como realiza a cobrança de depósito?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_7_2": {
          "type": "object",
          "title": "Como é realizado o envio de solicitação de complemento?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_7_3": {
          "type": "object",
          "title": "Como devolve eventual saldo para o cliente?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_8": {
      "type": "object",
      "title": "8. Devolução",
      "properties": {
        "q_8_1": {
          "type": "object",
          "title": "Como controla a sequência de notas devolutivas/exigências?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_9": {
      "type": "object",
      "title": "9. Registro",
      "properties": {
        "q_9_1": {
          "type": "object",
          "title": "Como realiza o controle de sequência de registros",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_2": {
          "type": "object",
          "title": "Como realiza o controle de sequência dos registros de Guarda e Conservação?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_3": {
          "type": "object",
          "title": "Possui matrículas de PJ no livro B (rádios, jornais, periódicos, etc)?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_4": {
          "type": "object",
          "title": "Como realiza o controle da numeração das averbações?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_5": {
          "type": "object",
          "title": "Como realiza o controle da numeração dos microfilmes",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_6": {
          "type": "object",
          "title": "Lança algum tipo de informação adicional para o registro?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_7": {
          "type": "object",
          "title": "Se 'SIM', qual?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_8": {
          "type": "object",
          "title": "Existe algum controle para os registros fora do sistema?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_9": {
          "type": "object",
          "title": "Se 'SIM', qual?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_10": {
          "type": "object",
          "title": "Utiliza etiqueta?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_11": {
          "type": "object",
          "title": "Realiza registro em lote?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_12": {
          "type": "object",
          "title": "Existem registros RETROATIVOS em grupos diferentes de TD e PJ?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_13": {
          "type": "object",
          "title": "Ainda realiza digitação dos indicadores para registros RETROATIVOS?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_9_14": {
          "type": "object",
          "title": "Possui cadastro de Empresas/PJs preenchido no sistema com o encadeamento das averbações, poderes, representação etc.?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_10": {
      "type": "object",
      "title": "10. Notificações",
      "properties": {
        "q_10_1": {
          "type": "object",
          "title": "Como realiza o controle da sequência das certificações?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_10_2": {
          "type": "object",
          "title": "Realiza impressão da carta de convocação em lote?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_10_3": {
          "type": "object",
          "title": "Como segue o fluxo para notificações?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_10_4": {
          "type": "object",
          "title": "Como seria 'outra' forma?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_10_5": {
          "type": "object",
          "title": "Existe algum tipo de documento específico que realiza impressão para notificações?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_10_6": {
          "type": "object",
          "title": "Se 'SIM' qual?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_11": {
      "type": "object",
      "title": "11. Certidões",
      "properties": {
        "q_11_1": {
          "type": "object",
          "title": "Como realiza o controle de sequência das certidões",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_11_2": {
          "type": "object",
          "title": "Como realiza emissão das certidões?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_11_3": {
          "type": "object",
          "title": "Possui modelos de certidões em alguma ferramenta específica?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_12": {
      "type": "object",
      "title": "12. Imagens",
      "properties": {
        "q_12_1": {
          "type": "object",
          "title": "Em qual momento digitaliza os documentos",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_12_2": {
          "type": "object",
          "title": "Quais pastas são digitalizadas e de que forma os arquivos dentro delas são organizados para facilitar a busca?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_12_3": {
          "type": "object",
          "title": "Informe o caminho do servidor onde as imagens estão armazenadas.",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_12_4": {
          "type": "object",
          "title": "São gerados volumes de imagens mensais ou periódicos para a confecção de microfilmes?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_13": {
      "type": "object",
      "title": "13. Relatórios",
      "properties": {
        "q_13_1": {
          "type": "object",
          "title": "Quais relatórios utiliza diariamente?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_13_2": {
          "type": "object",
          "title": "O Protocolo Oficial (Ainda realiza a impressão)",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_14": {
      "type": "object",
      "title": "14. Central ONRTDPJ",
      "properties": {
        "q_14_1": {
          "type": "object",
          "title": "Como é a divisão das rotinas entre os colaboradores?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_14_2": {
          "type": "object",
          "title": "Quais são os serviços que serventia mais recebe pela central?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_14_3": {
          "type": "object",
          "title": "Descreva como é realizado o tratamento dos protocolos da central: o registro é feito imediatamente ou somente após o pagamento do orçamento?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_15": {
      "type": "object",
      "title": "15. Financeiro",
      "properties": {
        "q_15_1": {
          "type": "object",
          "title": "Como é realizado o fechamento do caixa?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_15_2": {
          "type": "object",
          "title": "Quais relatórios são utilizados para realizar os recolhimentos/repasses?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_15_3": {
          "type": "object",
          "title": "Há algum tipo de controle realizado fora do sistema?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_15_4": {
          "type": "object",
          "title": "Realiza auditoria de selo digital?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_15_5": {
          "type": "object",
          "title": "Como realiza o controle do Livro Caixa?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_15_6": {
          "type": "object",
          "title": "Utiliza o Parcela Express?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_15_7": {
          "type": "object",
          "title": "É gerado RPS para a emissão de nota fiscal?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_16": {
      "type": "object",
      "title": "16. Comunicações",
      "properties": {
        "q_16_1": {
          "type": "object",
          "title": "Como é realizada a comunicação com o COAF?",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_16_2": {
          "type": "object",
          "title": "A serventia dispõe de um site institucional?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        },
        "q_16_3": {
          "type": "object",
          "title": "Caso a serventia possua site, há integração com o sistema para disponibilização de consultas de protocolos ou certidões?",
          "properties": {
            "utiliza": { "type": "boolean", "title": "Utiliza?", "default": false },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
          }
        }
      }
    },
    "sec_17": {
      "type": "object",
      "title": "17. Informações adicionais",
      "properties": {
        "q_17_1": {
          "type": "object",
          "title": "Se houver alguma particularidade dos processos não abordada nas perguntas anteriores, descreva-a abaixo.",
          "properties": {
            "valor": { "type": "string", "title": "Resposta" },
            "impacto": { "type": "boolean", "title": "Possui algum impacto?", "default": false },
            "detalhes": { "type": "string", "title": "Detalhes do Impacto" }
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
        "ui:options": { "placeholder": "Informe a quantidade de andares e observações da estrutura física..." }
      }
    }
  },
  "sec_2": {
    "q_2_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Ex: Balcão de atendimento, Recepção, Registro, etc..." }
      }
    },
    "q_2_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva como os setores estão distribuídos..." }
      }
    }
  },
  "sec_3": {
    "q_3_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva a quantidade de colaboradores por setor..." }
      }
    },
    "q_3_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Informe o número total de colaboradores..." }
      }
    },
    "q_3_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_3_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva a receptividade da equipe a novos sistemas..." }
      }
    }
  },
  "sec_4": {
    "q_4_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva como os protocolos são separados..." }
      }
    },
    "q_4_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva os outros tipos existentes..." }
      }
    },
    "q_4_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_4_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva como funciona a numeração e sequência..." }
      }
    },
    "q_4_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva como controla os prazos..." }
      }
    },
    "q_4_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Ex: A4, bobina térmica, etc..." }
      }
    },
    "q_4_7": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Ex: 1 via, 2 vias..." }
      }
    },
    "q_4_8": {
      "ui:field": "adherenceQuestion"
    },
    "q_4_9": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva como é feito o controle de saldos parados..." }
      }
    }
  },
  "sec_5": {
    "q_5_1": {
      "ui:field": "adherenceQuestion"
    },
    "q_5_2": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_6": {
    "q_6_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Ex: Na recepção, após registro, etc..." }
      }
    },
    "q_6_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_6_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva quais dados são lançados..." }
      }
    }
  },
  "sec_7": {
    "q_7_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva como realiza a cobrança do depósito..." }
      }
    },
    "q_7_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Ex: Telefone, WhatsApp, e-mail..." }
      }
    },
    "q_7_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Ex: PIX, Cheque Cartório, etc..." }
      }
    }
  },
  "sec_8": {
    "q_8_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva a numeração ou controle de devoluções..." }
      }
    }
  },
  "sec_9": {
    "q_9_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva a sequência de registros..." }
      }
    },
    "q_9_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva a sequência de Guarda e Conservação..." }
      }
    },
    "q_9_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o controle da numeração das averbações..." }
      }
    },
    "q_9_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o controle dos microfilmes..." }
      }
    },
    "q_9_6": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_7": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Informe quais informações adicionais são lançadas..." }
      }
    },
    "q_9_8": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_9": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o controle feito fora do sistema..." }
      }
    },
    "q_9_10": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_11": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_12": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_13": {
      "ui:field": "adherenceQuestion"
    },
    "q_9_14": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_10": {
    "q_10_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o controle da sequência das certificações..." }
      }
    },
    "q_10_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o fluxo das notificações..." }
      }
    },
    "q_10_4": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva outra forma de fluxo..." }
      }
    },
    "q_10_5": {
      "ui:field": "adherenceQuestion"
    },
    "q_10_6": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o documento específico..." }
      }
    }
  },
  "sec_11": {
    "q_11_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o controle da sequência de certidões..." }
      }
    },
    "q_11_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o fluxo de emissão..." }
      }
    },
    "q_11_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Ex: Word, ferramentas internas..." }
      }
    }
  },
  "sec_12": {
    "q_12_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o momento da digitalização..." }
      }
    },
    "q_12_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva as pastas digitalizadas e a organização dos arquivos..." }
      }
    },
    "q_12_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Caminho exato no servidor (ex: \\\\servidor\\imagens):" }
      }
    },
    "q_12_4": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_13": {
    "q_13_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva os relatórios utilizados diariamente..." }
      }
    },
    "q_13_2": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_14": {
    "q_14_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva a divisão das rotinas..." }
      }
    },
    "q_14_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva os serviços mais recebidos da central..." }
      }
    },
    "q_14_3": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva o tratamento dos protocolos..." }
      }
    }
  },
  "sec_15": {
    "q_15_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva detalhadamente o fechamento de caixa..." }
      }
    },
    "q_15_2": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva os relatórios para recolhimentos/repasses..." }
      }
    },
    "q_15_3": {
      "ui:field": "adherenceQuestion"
    },
    "q_15_4": {
      "ui:field": "adherenceQuestion"
    },
    "q_15_5": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva como controla o Livro Caixa..." }
      }
    },
    "q_15_6": {
      "ui:field": "adherenceQuestion"
    },
    "q_15_7": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_16": {
    "q_16_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva a comunicação com o COAF..." }
      }
    },
    "q_16_2": {
      "ui:field": "adherenceQuestion"
    },
    "q_16_3": {
      "ui:field": "adherenceQuestion"
    }
  },
  "sec_17": {
    "q_17_1": {
      "ui:field": "adherenceQuestion",
      "valor": {
        "ui:widget": "textarea",
        "ui:options": { "placeholder": "Descreva outras particularidades ou observações..." }
      }
    }
  }
}
  $U_JSON$,
  true,
  'Template oficial padrão semeado para o sistema Orion REG'
)
ON CONFLICT (kind, system_type, version) 
DO UPDATE SET 
  schema_json = EXCLUDED.schema_json,
  ui_json = EXCLUDED.ui_json,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes;
