# Módulo: Calendário, Agenda, Analytics, Relatórios, Roadmap e Implantações

Documentação técnica por tela do agrupamento de telas de planejamento visual, indicadores e acompanhamento de implantações do **Siplan HUB** (React 18 + TypeScript + Vite + Supabase).

> Referência técnica complementar do renderizador de calendário: [../CalendarContext.md](../CalendarContext.md) (arquitetura de 3 camadas do `CalendarGrid`, prevenção de _event clipping_).

## Índice

1. [Calendário (Planejamento Visual)](#calendário-planejamento-visual)
2. [Agenda dos Analistas](#agenda-dos-analistas)
3. [Dashboard Executivo (Analytics)](#dashboard-executivo-analytics)
4. [Relatórios & Análises](#relatórios--análises)
5. [Roadmap do Cliente (Portal Público)](#roadmap-do-cliente-portal-público)
6. [Próximas Implantações](#próximas-implantações)
7. [Últimas Implantações](#últimas-implantações)

---

## Calendário (Planejamento Visual)

- **Rota:** `/calendar`
- **Arquivo-fonte:** [src/pages/Calendar.tsx](../../src/pages/Calendar.tsx)
- **Acesso:** Protegido (dentro de `ProtectedRoute` + `MainLayout` em [src/App.tsx](../../src/App.tsx)).

### Objetivo
Exibir, em um calendário mensal/semanal/diário, os eventos derivados das etapas dos projetos (Implantação, Treinamento, Aderência, Homologação) e as Férias dos implantadores. Possui dois modos: **Real** (somente leitura, derivado dos dados) e **Playground** (sandbox interativo com _drag & drop_ para simular alocações sem persistir no banco).

### Dados e Hooks
- **Hooks de dados:**
  - `useProjectsV2()` — [src/hooks/useProjectsV2.ts](../../src/hooks/useProjectsV2.ts) — fonte dos projetos.
  - `useVacations()` — [src/hooks/useVacations.ts](../../src/hooks/useVacations.ts) — férias (tabela `implantador_vacations`) e função `checkVacationConflict(implantadorId, date)`.
  - `useToast()` — feedback de ações.
- **Store Zustand:** `useCalendarStore` — [src/stores/calendarStore.ts](../../src/stores/calendarStore.ts). Estado: `currentDate`, `viewMode` (`day`/`week`/`month`), `isInteractiveMode`, `interactiveEvents`, `realEvents`, `hiddenResourceIds`. Ações: `setCurrentDate`, `setViewMode`, `setInteractiveMode`, `add/update/removeInteractiveEvent`, `setRealEvents`, `toggleResourceVisibility`, `importRealDataToSandbox`.
- **Transformação:** `realEvents` é calculado via `useMemo` a partir de `projects` + `vacations`. Cada projeto pode gerar até 4 eventos: Implantação (Fase 1), Treinamento (Fase 2), Aderência e Homologação (`conversion.finishedAt`). Datas de string `yyyy-mm-dd` recebem `T12:00:00` para evitar _shift_ de fuso. As férias viram eventos `type: "vacation"`.
- **Sincronização com o store:** `useEffect` compara `realEvents` com o estado atual via `JSON.stringify` (deep-equality) antes de chamar `setRealEvents`, evitando loop infinito de renderização.
- **Membros:** `CALENDAR_MEMBERS` e tipo `CalendarEvent` de [src/types/calendar.ts](../../src/types/calendar.ts). O responsável do projeto é casado por nome (`findMember`, comparação case-insensitive/substring); sem correspondência recebe cor de _fallback_ por hash do nome.
- **Sem mutations Supabase nesta tela** — não persiste eventos; o Playground é volátil (memória do store).

### Componentes principais
- `CalendarControls` — [src/components/calendar/CalendarControls.tsx](../../src/components/calendar/CalendarControls.tsx) — navegação (anterior/hoje/próximo), seletor de visualização, _toggle_ Real/Playground e botão **Copiar** (importa dados reais para o sandbox).
- `CalendarGrid` — [src/components/calendar/CalendarGrid.tsx](../../src/components/calendar/CalendarGrid.tsx) — grade renderizada em camadas (ver [../CalendarContext.md](../CalendarContext.md)); recebe `onEventClick`.
- `DraggableTeamMember` — [src/components/calendar/DraggableTeamMember.tsx](../../src/components/calendar/DraggableTeamMember.tsx) — “dock” da equipe (fonte de _drag_ / legenda).
- `TrashDroppable` (interno) — zona de descarte para remover eventos no Playground.
- `DeploymentDetailsDialog` — [src/components/ProjectManagement/DeploymentDetailsDialog.tsx](../../src/components/ProjectManagement/DeploymentDetailsDialog.tsx) — abre ao clicar num evento com `projectId`; eventos sem projeto abrem um `Dialog` simples com as notas.
- **DnD:** `@dnd-kit/core` (`DndContext`, `DragOverlay`, `PointerSensor` com `activationConstraint.distance = 5`).

### Fluxos e Interações
- **Legenda dinâmica:** no modo Real, `activeMembersInLegend` calcula o intervalo da visualização atual e mostra apenas membros com eventos nesse período; no Playground mostra todos (para permitir arrastar).
- **Drag & drop (Playground):** o `id` do _droppable_ é a data (`yyyy-MM-dd`); em `handleDragEnd`:
  - Soltar sobre `trash` → `removeInteractiveEvent` + toast.
  - Arrastar membro novo (`isNew`) → cria `CalendarEvent` de 1 dia via `addInteractiveEvent`, checando `checkVacationConflict` (bloqueia com toast destrutivo se houver férias).
  - Mover evento existente → preserva a duração (delta start/end) e chama `updateInteractiveEvent`, também validando conflito de férias.
- **Copiar dados reais:** `importRealDataToSandbox` clona `realEvents` em `interactiveEvents`.

### Regras de Negócio e Estados
- Um evento de fase só é gerado se **início, fim e responsável** existirem (Homologação exige `finishedAt` + `homologationResponsible`).
- Cores fixas por tipo: Aderência `bg-amber-500`, Homologação `bg-violet-500`, Férias `bg-red-500`; demais herdam a cor do membro ou _fallback_.
- Não é possível agendar/mover para data em que o implantador está de férias (bloqueio via `checkVacationConflict`).
- O Playground **não persiste**: fechar/atualizar perde as simulações.

### Pontos de Manutenção
- O casamento de responsável por nome (`findMember` por substring) é frágil a homônimos/variações; `resourceId` cai em `"unknown"` quando não casa.
- A sincronização via `JSON.stringify` em cada render pode ficar cara com muitos eventos.
- Regras de datas assumem strings de 10 caracteres do Supabase; mudança de formato quebra o `toLocalDate`.

---

## Agenda dos Analistas

- **Rota:** `/agenda-analistas`
- **Arquivo-fonte:** [src/pages/AgendaAnalistas.tsx](../../src/pages/AgendaAnalistas.tsx)
- **Acesso:** Protegido.

### Objetivo
Exibir um dashboard externo de **Power BI** (agenda/alocações dos analistas) embutido, com opção de visualização em tela cheia.

### Dados e Hooks
- Sem hooks de dados nem chamadas a Supabase. A URL do relatório Power BI está **hard-coded** na constante `powerBiUrl` (report embed com `autoAuth=true`).
- Estado local: `isFullscreen` (`useState`).

### Componentes principais
- `<iframe>` do Power BI (inline no card e replicado dentro do `Dialog` de tela cheia).
- `Dialog` (shadcn) para o modo tela cheia; `Button` “Ver em Tela Cheia”; título/descrição acessíveis via `sr-only`.

### Fluxos e Interações
- Botão **Ver em Tela Cheia** abre um `Dialog` quase full-viewport com o mesmo iframe; fecha pelo “X” padrão do `DialogContent`.

### Regras de Negócio e Estados
- Nenhuma regra de negócio própria; toda a lógica vive no relatório Power BI externo.

### Pontos de Manutenção
- A `powerBiUrl` (reportId/tenant) está embutida no código — trocar o relatório exige editar o componente.
- Depende de disponibilidade/autenticação do serviço Power BI; falhas do embed não são tratadas na UI.

---

## Dashboard Executivo (Analytics)

- **Rota:** `/analytics`
- **Arquivo-fonte:** [src/pages/Analytics.tsx](../../src/pages/Analytics.tsx)
- **Acesso:** Protegido.

### Objetivo
Apresentar KPIs estratégicos e dois gráficos (entregas por mês e distribuição de status) para uma visão executiva do portfólio.

### Dados e Hooks
- `useProjectsList()` — [src/hooks/useProjectsList.ts](../../src/hooks/useProjectsList.ts) — lista de projetos (visão de lista). Estado de carregamento com `Loader2`.
- Métricas calculadas em linha (sem `useMemo`): `totalProjects`, `completedProjects` (`globalStatus === "done"`), `inProgressProjects`, `blockedProjects`, `completionRate`.
- **Lead Time médio:** média de `differenceInDays(phase1.endDate, startDateActual || createdAt)` para projetos `done` que tenham `implementation.phase1.endDate`.
- Sem mutations/RPCs.

### Componentes principais
- Cards de KPI (`Card` shadcn): Taxa de Conclusão, Lead Time Médio, Projetos Ativos, Bloqueios.
- **Recharts:** `BarChart` (Entregas por Mês) e `PieChart`/`Pie` com `Cell` (Distribuição de Status), dentro de `ResponsiveContainer`.

### Fluxos e Interações
- Página estática (sem filtros nem interação além dos _tooltips_ dos gráficos).
- Entregas por mês agrupam projetos `done` por `format(endDate, "MMM/yy")`.

### Regras de Negócio e Estados
- Marco de conclusão = **data de fim da Fase 1 de Implantação** (regra explícita no código).
- Cores fixas no Pie: Concluído `#10b981`, Em Andamento `#3b82f6`, A Fazer `#f59e0b`, Bloqueado `#ef4444`; fatias com valor 0 são filtradas.

### Pontos de Manutenção
- Comentários no código indicam que o Pie usa distribuição de status como _proxy_ (não há coluna de “motivo de bloqueio”).
- Métricas recalculadas a cada render (sem memoização) — aceitável no volume atual.

---

## Relatórios & Análises

- **Rota:** `/reports`
- **Arquivo-fonte:** [src/pages/Reports.tsx](../../src/pages/Reports.tsx)
- **Acesso:** Protegido.

### Objetivo
Central de _business intelligence_ operacional com duas abas: **Visão Geral** (métricas globais, distribuições e tempo por etapa) e **Análise Individual** (drill-down por projeto).

### Dados e Hooks
- `useProjectsV2()` — fonte dos projetos.
- Estado local: `systemFilter` (padrão `all`), `dateFilter` (`Date | undefined`), `activeTab`.
- `systems` — lista dinâmica de `systemType` únicos extraída dos projetos.
- `filteredProjects` — aplica filtro por sistema e por data (`createdAt >= dateFilter`). Os componentes de agregação recebem `filteredProjects`; a aba Individual recebe `projects` completo.
- Sem mutations/RPCs (tudo derivado no cliente).

### Componentes principais
- `ReportsFilters` — [src/components/Reports/ReportsFilters.tsx](../../src/components/Reports/ReportsFilters.tsx) — callbacks `onSystemChange`, `onDateChange` + lista de `systems`.
- `GlobalMetrics` — [src/components/Reports/GlobalMetrics.tsx](../../src/components/Reports/GlobalMetrics.tsx).
- `StatusDistribution` — [src/components/Reports/StatusDistribution.tsx](../../src/components/Reports/StatusDistribution.tsx).
- `HealthDistribution` — [src/components/Reports/HealthDistribution.tsx](../../src/components/Reports/HealthDistribution.tsx).
- `AdherenceGapCard` — [src/components/Reports/AdherenceGapCard.tsx](../../src/components/Reports/AdherenceGapCard.tsx) — conta projetos com `stages.adherence.hasProductGap === true`.
- `TimePerStageChart` — [src/components/Reports/TimePerStageChart.tsx](../../src/components/Reports/TimePerStageChart.tsx) — Recharts `BarChart`; para `conversion` usa `sentAt`/`finishedAt`.
- `IndividualProjectReport` — [src/components/Reports/Individual/IndividualProjectReport.tsx](../../src/components/Reports/Individual/IndividualProjectReport.tsx) (com `ProjectSelector`, `ProjectHeaderStats`, `StageAnalysisTimeline`).
- `Tabs` (shadcn) para alternância Visão Geral / Análise Individual.

### Fluxos e Interações
- **Filtros por período/sistema:** alteram `systemFilter`/`dateFilter`, recomputando `filteredProjects` in-memory.
- **Troca de aba:** `onValueChange={setActiveTab}`.
- **Exportação PDF:** não há exportação PDF implementada nesta tela nem nos subcomponentes de Reports (nenhuma dependência `jsPDF`/`html2canvas`/`window.print` foi encontrada).

### Regras de Negócio e Estados
- GAP de aderência definido por `hasProductGap`.
- Filtro de data é um limiar simples (projeto criado em/depois da data selecionada).

### Pontos de Manutenção
- A aba Individual usa `projects` (não filtrado) — divergência intencional em relação à Visão Geral.
- Adicionar exportação (PDF/print) seria um novo desenvolvimento; hoje inexistente.

---

## Roadmap do Cliente (Portal Público)

- **Rota:** `/roadmap/:token`
- **Arquivo-fonte:** [src/pages/RoadmapPage.tsx](../../src/pages/RoadmapPage.tsx)
- **Acesso:** **Público** (declarado fora de `ProtectedRoute`, em “Public Routes” de [src/App.tsx](../../src/App.tsx)). Geração/gestão do link é interna via `RoadmapManager`.

### Objetivo
Portal externo, sem login, para o cliente acompanhar em tempo real o progresso da implantação: hero com progresso global, fase atual, horas contratadas, última atualização e um cronograma (timeline) das 6 etapas.

### Dados e Hooks
- **RPC Supabase:** `supabase.rpc("get_roadmap_data", { token_uuid: token })` — busca via `useEffect` com base no `:token` da URL (`useParams`).
- **Função no banco:** `get_roadmap_data(token_uuid uuid)` — `SECURITY DEFINER`, definida/ajustada em:
  - [supabase/migrations/20260109_fix_roadmap_system.sql](../../supabase/migrations/20260109_fix_roadmap_system.sql) — cria tabela `roadmaps` (RLS: SELECT público; ALL para `authenticated`) e a função.
  - [supabase/migrations/20260202_fix_roadmap_rpc_parameter.sql](../../supabase/migrations/20260202_fix_roadmap_rpc_parameter.sql) — renomeia o parâmetro para `token_uuid` (casando com o front) e remove o `EXCEPTION WHEN OTHERS` que silenciava erros; passa a incluir `work_hours`.
  - Lógica da RPC: busca `roadmaps` por `share_token`; retorna `NULL` se não achar ou se `is_active = false`; **incrementa `view_count`**; monta JSON com `roadmap` (id, welcome_message, custom_theme, config) e `project` (client_name, system_type, sold_hours, overall_progress, global_status, `stages` das 6 etapas: infra/adherence/environment/conversion/implementation/post).
- Estado local: `loading`, `data`, `error`, `showScrollTop`, `scrollProgress` (+ `containerRef`).
- **Progresso:** `calculatedProgress` (`useMemo`) recalcula no front sobre `STAGES_CONFIG` (5 etapas visíveis): `done` = 1 ponto, `waiting_adjustment`/`in-progress` = 0,5; usa `Math.max` com `overall_progress` do banco.

### Componentes principais
- Subcomponentes internos: `TimelineItem`, `RoadmapStatusBadge`, `ButtonScrollDown`, `RealtimeFooter` (exportado).
- `STAGES_CONFIG` — array fixo de 5 etapas (infra, adherence, conversion, environment, implementation) com ícones (lucide) e sub-itens descritivos.
- `framer-motion` (animações, `AnimatePresence`, orbs, timeline beam) e `canvas-confetti` (celebração a 100%).
- **Gestão do link (interno):** `RoadmapManager` — [src/components/ProjectManagement/RoadmapManager.tsx](../../src/components/ProjectManagement/RoadmapManager.tsx) — usado em `ProjectDetails`; lê/grava direto na tabela `roadmaps` (`welcome_message`, `custom_theme.primary`, `is_active`), monta a URL `${origin}/roadmap/${share_token}`, copia link, abre “Visualizar como Cliente” e exibe `view_count`. Edição condicionada a `usePermissions().canEditProjects`.

### Fluxos e Interações
- **Geração do link público:** feita no `RoadmapManager` (não nesta página). Ativar o _switch_ cria/atualiza o registro `roadmaps` (define `is_active`); o `share_token` (UUID default do banco) compõe a URL; botão copia para a área de transferência.
- **Carregamento:** loader animado; erro/token inválido → tela “Ops! Link Inválido”.
- **Barra de progresso de leitura** e botão **Voltar ao topo** ligados ao scroll do container.
- **Confete** dispara quando `calculatedProgress === 100` e não está carregando.
- **Tema:** cor primária (`custom_theme.primary`, default `#800000`) aplicada em barra, orbs, nós e badges.

### Regras de Negócio e Estados
- Só renderiza se o roadmap existir **e** estiver ativo (RPC retorna `NULL` caso contrário).
- Cada acesso incrementa `view_count` no banco.
- `currentPhaseLabel`: prioriza etapas `in-progress`; depois `waiting_adjustment` (“Desenvolvendo Adequações”); senão “Projeto Concluído” (100%) / “Iniciando Jornada” (0%) / “Aguardando Próxima Etapa”.
- Status de etapa reconhecidos: `todo`, `in-progress`, `done`, `blocked`, `paused`, `waiting_adjustment` (badges/estilos distintos; nenhum item é “riscado”, `done` fica verde).

### Pontos de Manutenção
- Chamada da RPC usa `(supabase.rpc as any)` — sem tipagem; alterações no shape do JSON não são checadas em compilação.
- `STAGES_CONFIG` tem 5 etapas visíveis, mas a RPC retorna 6 (inclui `post`); a etapa `post` não aparece na timeline nem no cálculo de progresso.
- Textos das etapas/sub-itens são fixos no front (não vêm do banco).
- RLS de SELECT é `USING (true)` na tabela `roadmaps`; o controle de exposição depende de `is_active` e da RPC.

---

## Próximas Implantações

- **Rota:** `/deployments`
- **Arquivo-fonte:** [src/pages/NextDeployments.tsx](../../src/pages/NextDeployments.tsx)
- **Acesso:** Protegido.

### Objetivo
Listar, em ordem cronológica, os projetos que entram em fase de Implantação (Fase 1) ou Treinamento (Fase 2) com data futura/vigente, com filtros por implantador e por sistema.

### Dados e Hooks
- `useProjectsV2()` — fonte dos projetos; `isLoading` mostra loader.
- Estado local: `selectedProject`, `filterDeployer` (`all`), `filterSystem` (`all`).
- `uniqueDeployers` (`useMemo`) — responsáveis de phase1/phase2. `uniqueSystems` (`useMemo`) — `systemType` únicos.
- `sortedDeployments` (`useMemo`) — para cada projeto avalia phase1 e phase2: inclui se `endDate >= hoje` e casa filtros; ordena por `startDate` ascendente. Cada item é `{ project, phase, startDate }`.
- Sem mutations/RPCs.

### Componentes principais
- `DeploymentCard` — [src/components/ProjectManagement/DeploymentCard.tsx](../../src/components/ProjectManagement/DeploymentCard.tsx) — recebe `project`, `phaseType`, `onClick`.
- `DeploymentDetailsDialog` — detalhes ao clicar.
- `Select`/`Button`/`Badge` (shadcn), `framer-motion` para animação de entrada; ícone `Rocket`.

### Fluxos e Interações
- **Filtros por responsável/sistema:** atualizam os estados e recomputam `sortedDeployments`; badges de filtro ativo com “X” individual e botão **Limpar Filtros**.
- Contador “N Projetos Agendados” no cabeçalho.
- Empty state diferenciado para “sem resultados por filtro” vs. “nenhuma implantação agendada”.
- Clique no card abre `DeploymentDetailsDialog`.

### Regras de Negócio e Estados
- Só entram fases com `startDate` **e** `endDate` definidas e `endDate >= hoje` (comparação normalizada a 00:00).
- Um mesmo projeto pode gerar dois cards (Fase 1 e Fase 2); `key` combina `project.id` + `phase`.

### Pontos de Manutenção
- Elegibilidade baseada em `endDate` (não `startDate`); projetos com datas ausentes são omitidos silenciosamente.

---

## Últimas Implantações

- **Rota:** `/deployments/latest`
- **Arquivo-fonte:** [src/pages/LatestDeployments.tsx](../../src/pages/LatestDeployments.tsx)
- **Acesso:** Protegido.

### Objetivo
Histórico cronológico (timeline agrupada por mês/ano, mais recentes primeiro) de projetos finalizados ou em pós-implantação, com KPIs e filtros avançados.

### Dados e Hooks
- `useProjectsV2()` — fonte; `isLoading` mostra loader.
- Estado local de filtros: `searchTerm`, `filterSystem`, `filterPeriod`, `filterYear`, `filterMonth`, `dateRange` (`from`/`to`) e seleção/abertura do dialog.
- `getDeploymentDate(p)` — usa **estritamente** `stages.implementation.phase1.endDate` como data da virada.
- `baseDeployments` (`useMemo`) — projetos com `implementation.status === "done"` **ou** `post.status in {in-progress, done}` e com data válida.
- `filteredProjects` (`useMemo`) — aplica busca (cliente/`ticketNumber`), sistema, ano, mês, presets de período (`30days`/`3months`/`6months`/`thisyear`, via `date-fns`) e intervalo custom.
- `groupedDeployments` (`useMemo`) — agrupa por `ano-mês`, ordena grupos e itens desc.
- `kpis` (`useMemo`) — total, finalizadas, em pós-implantação e **taxa de satisfação** (positivas / avaliadas, sobre `stages.post.clientSatisfaction`).
- Sem mutations/RPCs.

### Componentes principais
- Cards de KPI (`Card`): Total no Período, Finalizadas, Em Pós-Implantação, Satisfação.
- Barra de filtros: `Input` (busca), `Select` (sistema/período/ano/mês), `Popover` + `Calendar` (range custom).
- Timeline: cabeçalho de mês _sticky_, nós coloridos por status, cards clicáveis com badges (sistema, tipo de implantação, chamado, status), grid de detalhes (líder, analistas, horas) e bloco extra (tipo de virada, satisfação com emoji).
- `DeploymentDetailsDialog` (com props `custom*` de título/datas/responsável).

### Fluxos e Interações
- **Filtros por período/responsável/sistema/texto:** todos client-side; selecionar “Período Personalizado” habilita o `Calendar` em modo `range` (e limpa o range ao trocar de preset).
- `hasActiveFilters` controla o botão **Limpar** e a mensagem do empty state.
- Clique no card → `handleCardClick` abre o dialog de detalhes.

### Regras de Negócio e Estados
- Data-base da virada = **fim da Fase 1** (`getDeploymentDate`); projetos sem essa data são excluídos.
- Elegibilidade: implantação concluída **ou** pós em andamento/concluída.
- Satisfação positiva = `very_satisfied` ou `satisfied`; taxa `null` (exibe “N/A”) quando não há avaliações.
- Exibição de horas alterna: `Modelos TN` → `workHours`; demais → `soldHours`.
- Badge/cores de sistema por substring (`premium`, `enterprise`, default azul).

### Pontos de Manutenção
- Vários filtros sobrepostos (preset + ano + mês + range custom) podem se combinar de forma restritiva; sem indicação de precedência na UI.
- Depende de campos opcionais de `stages.post` (satisfação/responsável) que podem estar ausentes.
