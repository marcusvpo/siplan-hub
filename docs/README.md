# Documentação do Siplan Hub

Central de documentações do **Siplan Hub** — manuais operacionais e guias técnicos para o uso,
desenvolvimento e manutenção da plataforma.

<details>
<summary><b>1. Manual do Desenvolvedor (Guia Técnico)</b></summary>

Destinado a programadores e engenheiros de software que vão atuar no código da plataforma.

- **Conteúdo:** setup local de desenvolvimento, arquitetura do front-end (Split Query, virtualização),
  modelagem de dados no Supabase PostgreSQL, controle de estado com TanStack React Query e Zustand,
  passo a passo para novos campos, guias de layout e qualidade.
- **Acesse:** [MANUAL_DESENVOLVEDOR.md](MANUAL_DESENVOLVEDOR.md)

</details>

<details>
<summary><b>2. Guia Completo: Área de Conversão (Manual Operacional)</b></summary>

Destinado a analistas de implantação, membros da equipe de conversão e administradores do sistema.

- **Conteúdo:** fluxo de trabalho operacional para envio de projetos, uso do dashboard de conversão,
  gerenciamento de mapeamentos legados, reporte de problemas, controle de notificações e rotinas
  de trabalho recomendadas.
- **Acesse:** [GUIA_AREA_CONVERSAO.md](GUIA_AREA_CONVERSAO.md)

</details>

<details>
<summary><b>3. Documentação por Tela</b></summary>

Referência técnica de **todas as telas** do sistema, agrupadas por módulo. Cada tela documenta rota,
arquivo-fonte, acesso, dados/hooks, componentes, fluxos, regras de negócio e pontos de manutenção.

- **Acesse:** [telas/README.md](telas/README.md)

</details>

<details>
<summary><b>4. Modelo de Dados (Supabase)</b></summary>

Mapa das tabelas, funções/RPCs, RLS/RBAC e buckets de Storage, derivado das migrations.

- **Acesse:** [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md)

</details>

<details>
<summary><b>5. Referência de Hooks</b></summary>

Catálogo dos custom hooks, stores Zustand e contexto de autenticação, organizados por domínio.

- **Acesse:** [REFERENCIA_HOOKS.md](REFERENCIA_HOOKS.md)

</details>

<details>
<summary><b>6. Geração automática de modelos (worker na VM)</b></summary>

Worker na VM Linux que conecta a aba 5 (Modelos Editor) ao gerador de modelos do Orion
(Claude Code + skill `criar-modelo-mesclado`). Setup, systemd e segurança.

- **Acesse:** [../vm-worker/README.md](../vm-worker/README.md)

</details>

<details>
<summary><b>Outras referências úteis</b></summary>

- [../README.md](../README.md) — visão geral do repositório, stack de tecnologias, portas e comandos locais.
- [Architecture.md](Architecture.md) — mapa visual do fluxo de dados em projetos e calendário.
- [CalendarContext.md](CalendarContext.md) — as três camadas do calendário para prevenir clipping de eventos.
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — setup do backend Supabase (migrations, variáveis, auth).
- [VISUAL_QA.md](VISUAL_QA.md) — diretrizes e checklist de design system (cores, bordas, botões, tipografia).

</details>
