# Central de Trabalho / Meu Dia

## Rota e acesso

- **Rota:** `/meu-dia`
- **Arquivo-fonte:** `src/pages/MyDay.tsx`
- **Hook agregador:** `src/hooks/useMyDay.ts`
- **Workspace pessoal:** `src/hooks/useMyDayWorkspace.ts`
- **Permissões:** `work_center:view|create|edit|delete`
- **Acesso:** autenticado, protegido por `RequirePermission`

## Objetivo

A Central de Trabalho é a entrada operacional personalizada do Siplan HUB. Ela reúne, em uma composição compacta e responsiva, os itens que exigem atenção do usuário sem substituir as telas de origem.

## Dados apresentados

- Projetos ativos em que o usuário aparece como líder ou responsável por uma etapa.
- Bloqueios, projetos críticos, etapas atrasadas e projetos sem atualização recente.
- Pendências abertas de conversão atribuídas ao usuário.
- Compromissos de CS/CX dos últimos 30 dias até os próximos sete dias, destacando os vencidos.
- Resumo diário do Copiloto, quando o usuário possui acesso.
- Tarefas pessoais com prazo, prioridade, recorrência, lembrete, adiamento, observação e vínculo opcional com uma tela.
- Fila unificada com projetos, tarefas, compromissos e pendências de conversão prioritários.
- Gráficos de situação dos projetos e distribuição pelas próximas etapas.
- Atalhos escolhidos pelo usuário entre as telas que seu perfil pode acessar.

## Interação e filtros

Os quatro indicadores superiores são botões de filtro. Eles alternam entre projetos, prioridades críticas, pendências de conversão e agenda de hoje. Os gráficos também refinam a lista por situação ou próxima etapa. Todos os filtros exibem seu estado ativo e podem ser limpos em uma única ação.

## Agenda pessoal

`public.my_day_tasks` armazena tarefas privadas do usuário. Cada tarefa possui prazo, prioridade, status, recorrência, lembrete, adiamento, observação e um caminho opcional para outra tela do HUB. O bloco **Minha agenda** combina essas tarefas com compromissos de CS/CX, permite filtrar por status, informa quantos itens estão visíveis e expande a lista sob demanda.

Ao concluir uma tarefa recorrente, `complete_my_day_task(...)` encerra a ocorrência atual e cria a próxima em uma única transação. A operação usa `SECURITY INVOKER`, mantém RLS ativa e ignora repetições acidentais da mesma conclusão.

Os lembretes usam a API local de notificações do navegador. Eles funcionam enquanto o HUB ou o PWA estiver aberto; notificações confiáveis com o aplicativo encerrado exigiriam uma infraestrutura de Web Push no servidor.

## Personalização

`public.my_day_preferences` persiste por usuário:

- densidade compacta ou confortável;
- ordem e visibilidade dos blocos;
- largura de cada bloco em meia linha ou linha inteira no desktop;
- modelos Operacional, Gestão e Foco na agenda;
- reordenação por arrastar e soltar no desktop ou botões acessíveis por toque;
- prévia da composição antes de salvar;
- até oito acessos rápidos;
- preferência de lembretes locais;
- restauração da configuração padrão.

As opções de atalhos são derivadas de `menuItems.ts` e filtradas pelas permissões atuais. Uma permissão removida faz a opção desaparecer mesmo que o caminho ainda esteja salvo na preferência.

## Permissões e segurança

`work_center:view` controla o acesso à rota. As ações `create`, `edit` e `delete` são aplicadas tanto na interface quanto nas policies das tarefas. Cada bloco também verifica a permissão do módulo de origem e as consultas continuam submetidas às policies RLS existentes.

As tabelas `my_day_tasks` e `my_day_preferences` usam RLS com `user_id = auth.uid()` e `has_permission(...)`. Nenhum usuário pode consultar ou alterar tarefas e preferências de outra pessoa.

As migrations `20260916100000_my_day_work_center.sql`, `20260916110000_my_day_responsive_widget_layout.sql` e `20260916120000_my_day_operational_improvements.sql` mantêm o catálogo, as preferências, as tarefas, a função de recorrência e as notificações de changelog.

## Regras de priorização

Os projetos são ordenados por bloqueio, saúde crítica, etapa vencida, saúde em atenção e ausência de atualização por sete dias ou mais. Em caso de empate, a atualização mais recente aparece primeiro.

Administradores podem alternar entre **Meu trabalho** e **Portfólio**. A visão pessoal continua sendo o padrão.

A tela atualiza o relógio continuamente, consulta fontes leves em intervalos regulares e executa uma sincronização completa a cada cinco minutos ou ao voltar para a aba. Falhas e carregamentos ficam restritos ao bloco afetado, preservando o restante da central.

## Responsividade e PWA

- Cards em duas colunas no mobile e quatro no desktop para os indicadores.
- A área de widgets usa duas colunas no desktop, permitindo combinar dois blocos em uma linha ou reservar uma linha inteira para um bloco.
- Conteúdo operacional e gráficos são sempre empilhados em largura total no mobile, sem tabelas ou rolagem horizontal.
- Textos longos quebram dentro dos cards.
- Rodapé considera `safe-area-inset-bottom` no modo PWA instalado.
- Diálogos respeitam `100dvh`, possuem rolagem interna e mantêm as ações acessíveis.
- Todos os filtros, atalhos e controles possuem interação por toque.
