---
name: cavecrew
description: >
  Guia nativo do Codex para delegar tarefas delimitadas a subagentes com respostas
  compactas. Use quando o usuário pedir subagentes, delegação, investigação,
  implementação ou revisão paralela com economia de contexto.
---

# Cavecrew para Codex

Use as ferramentas de colaboração do Codex somente quando a solicitação do usuário ou as instruções ativas autorizarem subagentes. Cavecrew define papéis e contratos de saída; não depende de presets externos.

## Papéis

| Papel | Quando usar | Nome de tarefa sugerido |
|---|---|---|
| Investigador | Localizar definições, usos, fluxos ou testes sem editar | `investigator` |
| Construtor | Alteração cirúrgica de 1–2 arquivos com escopo conhecido | `builder` |
| Revisor | Revisar diff, branch ou arquivos em busca de defeitos | `reviewer` |

Crie cada papel com `spawn_agent`, descrevendo explicitamente escopo, arquivos permitidos, se pode editar e o contrato de saída. Os nomes acima são apenas `task_name`; não existem arquivos de preset separados.

## Contratos compactos

Investigador:

```text
<assunto>:
- caminho:linha — símbolo — achado
totais: <contagens>
```

Construtor:

```text
caminho:linha — alteração curta
verificado: <comando/resultado>
```

Revisor:

```text
caminho:linha — severidade — problema — correção
totais: <contagens>
```

## Regras

- Prefira o agente principal para respostas simples, mudanças amplas e decisões que dependam de contexto compartilhado.
- Delegue somente subtarefas concretas, independentes e delimitadas.
- Não use o construtor antes de saber exatamente onde editar.
- Não delegue leituras obrigatórias de skills; o agente principal deve ler as instruções aplicáveis.
- Preserve o modelo herdado. Só use override de modelo quando o usuário ou uma instrução ativa exigir.
- O agente principal continua responsável por integrar, validar e explicar o resultado.
