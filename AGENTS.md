# AGENTS.md — Siplan Hub

Este arquivo é a fonte oficial e permanente de instruções para o Codex e demais agentes que trabalham neste repositório. Ele é obrigatório em todas as tarefas no projeto.

- Quando o usuário definir uma nova orientação que deva valer para trabalhos futuros, registre-a neste arquivo.
- Em caso de conflito entre este arquivo e documentação auxiliar, siga este arquivo e avise o usuário sobre a divergência.

## Idioma

Todas as interações, explicações, resumos, mensagens de commit e comentários de PR devem ser em Português do Brasil (PT-BR). Preserve em inglês os identificadores do código, nomes de arquivos, caminhos, comandos e termos técnicos que perderiam precisão se traduzidos.

## Contexto e arquitetura

O Siplan Hub é um sistema de gestão de projetos de implantação para cartórios. O frontend usa React 18, TypeScript strict, Vite, Tailwind e shadcn/ui. Os dados ficam no Supabase (Postgres, Auth, RLS e Storage).

- `src/types/ProjectV2.ts` é o tipo central do domínio. Sua propriedade `stages` representa os estágios de implantação e afeta Dashboard, Reports, ProjectManagement, Calendar, Kanban e previsibilidade.
- `src/components/ProjectManagement/Tabs/StepsTab.tsx` orquestra a exibição e edição dos estágios.
- `src/utils/project-transformers.ts` é a fronteira entre o domínio `ProjectV2` e as linhas do Supabase.
- `vm-worker/` é um runtime Node separado. O frontend se comunica com ele somente pelas filas do Supabase.
- O motor de IA do worker é o **Codex CLI**, com **Ollama** como contingência local para tarefas de texto. O projeto não depende de Claude, Claude Code, Anthropic SDK ou `ANTHROPIC_API_KEY`.

## Stack e convenções

- Use o alias `@/*` para `src/*` e `cn()` de `src/lib/utils.ts` para combinar classes.
- Acesso ao Supabase deve ficar em hooks `use*.ts`; evite consultas soltas diretamente em componentes de página.
- Mantenha os formulários de estágio isolados em `src/components/ProjectManagement/Forms/StageForms/`.
- Ao trabalhar no worker, preserve a separação entre filas, processamento Codex/Ollama e frontend.
- Não introduza integração, configuração, hook, skill ou fallback para Claude/Anthropic. Novas automações de IA devem seguir o runtime Codex vigente, salvo pedido explícito do usuário.

## Checklist obrigatório para nova tela, rota ou módulo

Antes de considerar uma nova tela, rota ou módulo concluído, verifique todos os itens abaixo. Não trate uma implementação parcial como pronta.

1. **Rota:** registre a rota no `src/App.tsx` e aplique a proteção de autenticação adequada.
2. **Catálogo de permissões:** adicione o recurso em `src/constants/permissions.ts` (`PERMISSION_RESOURCES`), declarando somente ações realmente aplicadas pelo sistema.
3. **Permissão no banco e no Admin:** crie uma migration em `supabase/migrations/` para inserir ou atualizar `app_permissions`. Conceda a nova permissão ao perfil `admin` e preserve para o perfil `user` os acessos que ele já possuía. A tela `/admin/roles` lê as permissões do banco; sem migration, o checkbox não aparece.
4. **Menu lateral:** adicione o item em `src/constants/menuItems.ts`, com o `permissionKey` correto, e ajuste `src/components/Layout/AppSidebar.tsx`, incluindo o gate de acesso e a resolução da primeira rota do grupo.
5. **Tela inicial:** confirme que a nova opção aparece corretamente no dashboard inicial (`Home.tsx`). Como a Home consome `menuItems.ts`, mantenha essa constante como fonte central e não crie uma lista paralela.
6. **Guarda de rota:** proteja a rota no `src/App.tsx` com `RequirePermission`, usando o recurso e a ação apropriados. Esconder o menu não substitui a proteção da URL.
7. **Permissões de ações:** use `usePermissions().hasPermission(...)` na tela para ações de criação, edição, exclusão, execução ou gerenciamento. Além do estado visual, bloqueie a ação no handler.
8. **RLS:** para tabelas novas ou sensíveis, habilite e configure policies RLS com `has_permission(...)`. Nunca use `TO public` para dados autenticados ou sensíveis.
9. **Tipos do Supabase:** ao criar ou alterar tabelas/colunas, atualize também `src/integrations/supabase/types.ts`; o build não regenera esse arquivo automaticamente.
10. **Documentação e testes:** atualize a documentação relevante e rode as validações proporcionais à mudança, incluindo os testes de permissões quando houver alteração de RBAC.

Referência detalhada: `docs/PERMISSOES_RBAC.md`. A sincronização com a tela inicial também está documentada em `docs/MANUAL_DESENVOLVEDOR.md`.

## Estrutura obrigatória para módulos principais

Sempre que for criado um novo módulo principal, como Dashboard, Implantação, Comercial, Conversão ou SD, crie também uma **tela geral do módulo**.

- A tela geral deve funcionar como a central do módulo e reunir cards, atalhos ou uma navegação clara para **todas as telas pertencentes àquele módulo**.
- O item principal do módulo na Home e no menu deve levar para essa tela geral, e não diretamente para uma funcionalidade isolada.
- Toda nova tela adicionada posteriormente ao módulo também deve ser incluída nessa tela geral.
- Os atalhos devem respeitar as mesmas permissões do `menuItems.ts`, ocultando funcionalidades às quais o usuário não tem acesso.
- Evite manter listas independentes e divergentes. Sempre que possível, derive os atalhos da fonte central de menus ou compartilhe a mesma configuração.
- A tela geral deve nascer responsiva para desktop e mobile, sem rolagem horizontal e com cards adequados para toque.
- Um módulo principal não deve ser considerado concluído enquanto sua tela geral, rota, entrada na Home, menu, permissões e telas internas não estiverem integrados.

## Responsividade e compatibilidade com PWA

Toda tela nova e toda alteração funcional em uma tela, rotina ou componente existente devem incluir, no mesmo trabalho, a revisão de responsividade e compatibilidade com o PWA. Não deixe essa validação para uma etapa futura.

- Valide o fluxo afetado em desktop e em larguras reais de celular, incluindo telas estreitas a partir de 320 px.
- A interface não pode exigir zoom manual, redução de escala ou rolagem horizontal para uso normal.
- Textos, títulos, números, gráficos, tabelas, filtros, cards, abas e botões não podem ficar cortados, sobrepostos ou fora da viewport.
- Tabelas e listas largas devem ganhar uma apresentação mobile apropriada, como cards, linhas empilhadas, conteúdo resumido ou outra composição responsiva. Não use a rolagem lateral como solução padrão.
- Modais, drawers, popovers, selects e menus devem respeitar a largura e a altura da viewport, permitir rolagem vertical interna quando necessária e manter cabeçalho, fechamento e ações acessíveis.
- Ações importantes devem funcionar por toque, sem depender de hover, e possuir área de toque adequada.
- No modo PWA instalado (`display: standalone`), considere `safe-area-inset-*`, barras do sistema e elementos fixos. Cabeçalhos, rodapés, botões flutuantes e notificações não podem encobrir o conteúdo.
- Recursos exclusivos do navegador ou do desktop devem possuir comportamento alternativo no mobile/PWA quando necessário.
- Ao alterar um componente compartilhado, confira também as principais telas consumidoras para evitar regressões responsivas.
- Antes de concluir, faça uma verificação visual do estado inicial, carregamento, vazio, erro, conteúdo longo e modal aberto no mobile.
- Uma implementação que funciona apenas no desktop não está concluída.

## Regras de segurança e permissões

- Permissões novas devem nascer permissivas para quem já possuía acesso equivalente e ser restringidas deliberadamente pelo administrador. Nunca bloqueie silenciosamente usuários existentes durante um deploy.
- Só declare ações como `create`, `edit`, `delete`, `execute` ou `manage` quando houver enforcement real no código e, quando aplicável, no banco.
- Edge functions privilegiadas devem validar acesso por `has_permission`, não apenas por `role = 'admin'`.
- Não execute `supabase db push` neste projeto enquanto o histórico remoto de migrations não estiver reparado. Use o fluxo de migrations definido na documentação do projeto.

## Validação antes de concluir

- `npm run build` não substitui o typecheck.
- Para mudanças não triviais, rode `npm run lint`, `npm test` e `npx tsc --noEmit`, registrando com clareza qualquer falha preexistente ou limitação do ambiente.
- Ao alterar um tipo `*StageV2`, revise em conjunto o `mapXStage()` correspondente em `project-transformers.ts`, o `*StageForm`, os tipos do Supabase quando houver coluna nova e os testes dos transformers.
- Não leia `src/types/ProjectV2.ts` nem `src/utils/project-transformers.ts` por inteiro quando uma busca por símbolo ou intervalo específico for suficiente.

Comandos principais:

```bash
npm run dev
npm run build
npm run lint
npm test
npx tsc --noEmit
```

## Git

- Não faça commit, push ou merge sem pedido explícito do usuário.
- Commits e pushes devem usar a identidade `BrunoHF04`.
- Não adicione trailers de coautoria de agentes ou de IA.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Treat `src`, `vm-worker` and `supabase` as the application graph scope. Agent and skill directories are tooling, not application code.
