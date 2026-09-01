# cavecrew

Guia de delegação compacta para os subagentes do Codex.

Ele organiza três papéis — investigador, construtor e revisor — usando diretamente `spawn_agent`. Não exige presets, hooks, frontmatter de modelo ou arquivos externos de agentes.

## Quando usar

- Investigador: localizar código e relações sem editar.
- Construtor: editar 1–2 arquivos com escopo já definido.
- Revisor: revisar um diff e retornar apenas achados acionáveis.

O agente principal sempre integra e valida os resultados. Consulte [SKILL.md](./SKILL.md) para os contratos de saída.
