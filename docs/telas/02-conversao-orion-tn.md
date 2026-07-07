# Módulo: Conversão e Modelos OrionTN

Documentação técnica por tela do grupo **Conversão e Modelos OrionTN** do Siplan HUB (React 18 + TypeScript + Vite + Supabase).

Este módulo cobre dois fluxos complementares:

1. **Esteira de Conversão** — fila operacional de migração de dados legados dos clientes, incluindo o controle dos "motores"/conversores e a homologação da conversão.
2. **Modelos OrionTN** — gestão e produção dos modelos (documentos) no ecossistema OrionTN / Modelos TN, com dashboard, listagem de projetos e o editor de modelos (Modelos Editor).

Todas as telas ficam sob `ProtectedRoute` + `MainLayout` em [`src/App.tsx`](../../src/App.tsx), portanto exigem usuário autenticado. Algumas ações são adicionalmente restritas por equipe (`team`) ou por permissões.

## Índice das telas

| Tela | Rota | Arquivo-fonte |
|------|------|---------------|
| [Gestão de Atividades (Fila de Conversão)](#1-gestão-de-atividades--fila-de-conversão) | `/conversion` | [Conversion.tsx](../../src/pages/conversion/Conversion.tsx) |
| ↳ [Cartão detalhado da Minha Fila](#11-subseção-cartão-detalhado-da-minha-fila-myqueuedetailedcard) | (componente) | [MyQueueDetailedCard.tsx](../../src/pages/conversion/MyQueueDetailedCard.tsx) |
| [Motores de Conversão](#2-motores-de-conversão) | `/conversion/engines` | [ConversionEngines.tsx](../../src/pages/conversion/ConversionEngines.tsx) |
| [Dashboard — Modelos Editor](#3-dashboard--modelos-editor) | `/orion-tn-models/dashboard` | [OrionTNDashboard.tsx](../../src/pages/conversion/OrionTNDashboard.tsx) |
| [Projetos OrionTN](#4-projetos-oriontn) | `/orion-tn-models/projects` | [OrionTNProjects.tsx](../../src/pages/conversion/OrionTNProjects.tsx) |
| [Modelos Editor (Workspace)](#5-modelos-editor-workspace) | `/orion-tn-models/:projectId?` | [OrionTNModels.tsx](../../src/pages/conversion/OrionTNModels.tsx) |

---

## 1. Gestão de Atividades — Fila de Conversão
- **Rota:** `/conversion`
- **Arquivo-fonte:** [src/pages/conversion/Conversion.tsx](../../src/pages/conversion/Conversion.tsx)
- **Acesso:** Protegido (autenticado). Ações de escrita (Assumir, Transferir, Remover da Fila, Enviar para criação do Conversor) só aparecem para membros da **equipe de conversão** (`team === "conversion"`, variável `isConversionTeam`). A leitura da fila é liberada a todas as equipes.

### Objetivo
Gerenciar a fila de migração de dados (conversão) dos clientes. Centraliza o ciclo de vida de cada conversão: entrada como pendente, atribuição a um analista, acompanhamento em andamento, envio para homologação pelos implantadores e conclusão. Também oferece a solicitação de criação do "motor"/conversor e o histórico de publicações (trâmites) por projeto.

### Dados e Hooks
- **`useConversionQueue({ userId })`** — [src/hooks/useConversionQueue.ts](../../src/hooks/useConversionQueue.ts). Hook central da tela.
  - **Query:** `supabase.from("conversion_queue").select("*, projects!inner(client_name, ticket_number, system_type, legacy_system, implementation_phase1)")`, ordenado por `priority` (asc) e `sent_at` (asc). O `deploymentDate` é derivado de `projects.implementation_phase1.startDate`.
  - **Coleções derivadas (memoizadas):**
    - `myQueue` — itens `assigned_to === userId` que não estejam em `done`, `cancelled`, `awaiting_homologation` nem `homologation`.
    - `generalQueue` — todos os itens ativos (exclui `done`, `cancelled`, `awaiting_homologation`, `homologation`).
    - `homologationQueue` — itens em `homologation`, `awaiting_homologation`, `homologation_issues` ou (`done` com `homologationStatus === "approved"`).
    - `kpis` — `{ totalInQueue, pending, inProgress, completed, myQueueCount }`.
  - **Mutations (todas re-executam `fetchQueue` ao final):**
    - `assignToMe(queueId, userId, userName, projectId)` — atualiza `conversion_queue` (`assigned_to`, `assigned_to_name`, `assigned_at`, `queue_status="in_progress"`, `started_at`) **e** `projects` (`conversion_responsible`, `conversion_start_date`, `conversion_status="in-progress"`). Registra `activityLogger.logConversionAction("conversion_queue_assigned", ...)`.
    - `transferTo(queueId, newUserId, newUserName, projectId?)` — reatribui na fila e, se `projectId` informado, atualiza `conversion_responsible` no projeto. Log `conversion_queue_transferred`.
    - `updateQueueStatus(queueId, status)` — atualiza `queue_status` (grava `completed_at` quando `done`).
    - `sendToHomologation(queueId, projectId, analystId, analystName, sentByName)` — marca `queue_status="awaiting_homologation"`, grava `homologation_analyst[_name]`, `homologation_sent_at`, `homologation_status="pending"` e insere registro em **`homologation_events`** (`from_status`/`to_status`, `performed_by`, `notes`, `issues_count=0`).
    - `approveHomologation(queueId)` — atalho para `updateQueueStatus(queueId, "done")`.
    - `removeFromQueue(queueId, projectId)` — deleta a linha de `conversion_queue` e reseta o projeto (`conversion_sent_at=null`, `conversion_status="todo"`, `conversion_responsible=null`, `conversion_start_date=null`). Log `conversion_queue_removed`. Emite toast de sucesso/erro.
    - `refetch` — recarrega a fila (botão "Atualizar").
- **`useTeamAreas()`** — fornece `members`; a tela filtra em `conversionMembers` (`area === "conversion"`) e `implementationMembers` (`area === "implementation"`) para os seletores de transferência e de vínculo de implantador.
- **`useConversionEngines()`** — usado apenas para `requestEngine(queueId, notes, userName)` no diálogo "Enviar para Criação do Conversor" (grava `engine_status="pending_engine"` e metadados na `conversion_queue`).
- **`useAuth()`** — `user`, `team`. Deriva `currentUserId` e `currentUserName` (`full_name` → `email` → "Usuário").
- **Notificações:** o envio inicial à fila (`sendToConversion`, disparado em outra tela) insere em `notifications` (team "conversion"). O envio à homologação atualmente **não** cria notificação (comentado no código).

### Componentes principais
- **KPIs (5 cards clicáveis):** Minha Fila, Pendentes, Em Andamento, Finalizados, Total na Fila. Cada card abre um **modal de detalhe do KPI** (`kpiModal`) listando os projetos daquela categoria.
- **Filtros:** busca por cliente/ticket (`searchQuery`), filtro de status (`statusFilter`) e filtro de sistema (`systemFilter`, opções derivadas dinamicamente de `queue`). A função `filterItems` aplica os três em conjunto.
- **Tabs (`Tabs`):** `general` (Fila Geral), `homologations` (Homologações) e `my-queue` (Minha Fila — só aparece via botão "Minha Fila" para a equipe de conversão).
- **`renderQueueItem`** — card padrão da Fila Geral (indicador de motor/engine, badges de status/prioridade/dias na fila, responsável, previsão de implantação, e painel de ações).
- **`renderHomologationitem`** — card dedicado da esteira de homologação (mostra Conversor responsável e Implantador vinculado ou "Fila em Aberto / Pendente").
- **`MyQueueDetailedCard`** — usado na aba Minha Fila (ver subseção 1.1).
- **`ConversionPostDrawer`** ([src/components/conversion/ConversionPostDrawer.tsx](../../src/components/conversion/ConversionPostDrawer.tsx)) — drawer de histórico de publicações/pareceres, abre em `defaultTab` "posts" ou "homologations".
- **Diálogos:** Transferir Projeto, Enviar para Homologação (com vínculo opcional de implantador), Enviar para Criação do Conversor (com observações) e Detalhe de KPI.

### Fluxos e Interações
- **Assumir:** em itens sem responsável (`!item.assignedTo`) e para a equipe de conversão → `assignToMe` → item passa a "Em Andamento" e entra na Minha Fila.
- **Enviar p/ Homologação:** disponível quando `queueStatus === "in_progress"`. Abre diálogo; permite vincular um implantador ou "Deixar em Aberto (Fila Geral)" (`unassigned_open`). Confirma via `sendToHomologation`.
- **Ver Inconsistências / Ver Parecer Final:** abrem o `ConversionPostDrawer` na aba "homologations" (vermelho para `homologation_issues`, verde para `done` + `approved`).
- **Ver Publicações:** abre o drawer na aba "posts".
- **Ver Detalhes:** navega para `/projects?id={projectId}` (via `window.location.href`).
- **Menu de ações secundárias (`DropdownMenu`, equipe de conversão):** "Enviar para criação do Conversor" (só se `!item.engineStatus`), "Transferir" e "Remover da Fila" (com `confirm`).
- **Transferir:** seleciona novo responsável entre `conversionMembers` (exceto o usuário atual), campo de observações opcional; também permite remover da fila.
- Feedback ao usuário via `toast` (sonner) em todas as ações.

### Regras de Negócio e Estados
- **Status da fila (`queue_status`)** — labels em `STATUS_LABELS`: `pending` (Pendente), `in_progress` (Em Andamento), `awaiting_homologation` (Aguard. Homologação), `homologation` (Em Homologação), `homologation_issues` (Com Inconsistências), `done` (Concluído). Cores em `STATUS_COLORS` (borda esquerda do card muda por status).
- **Prioridade (`priority`)** — badge "P{n}": `<=2` vermelho (alta), `<=4` laranja (média), caso contrário cinza.
- **Dias na fila** — calculado a partir de `sentAt`; destaca laranja (>3d) e vermelho (>5d).
- **Engine/motor (`engine_status`)** — indicador visual com engrenagem: `pending_engine` (Aguard. Extração da Base, laranja), `engine_in_development` (Motor em Dev, azul, girando), `engine_ready` (Motor Pronto, verde).
- **Homologação em aberto** — na aba Homologações, ausência de `homologationAnalystName` exibe "Fila em Aberto / Pendente" (badge pulsante).
- **Previsão de Implantação** — vem de `implementation_phase1.startDate`; exibe "Ainda Sem Previsão" quando ausente.
- **Estados de UI:** `loading` (Carregando...), estados vazios específicos por aba (fila vazia, nenhuma conversão, nenhuma homologação).

### Pontos de Manutenção
- Toda a lógica de dados está em `useConversionQueue`; alterações de schema (`conversion_queue`, `projects`, `homologation_events`) exigem ajuste do mapeamento em `fetchQueue` e das mutations.
- `STATUS_LABELS`/`STATUS_COLORS` são duplicados entre `Conversion.tsx` e `MyQueueDetailedCard.tsx` (atenção a divergências — ex.: `pending` é cinza aqui e âmbar no card detalhado).
- Navegação "Ver Detalhes" usa `window.location.href` (recarrega a página) em vez do router — ponto de possível refatoração.
- A criação de notificação no envio à homologação está desativada (comentada) em `sendToHomologation`.
- O filtro de status no seletor não inclui `homologation_issues` como opção explícita (apesar de existir como estado).

### 1.1. Subseção: Cartão detalhado da Minha Fila (`MyQueueDetailedCard`)
- **Arquivo-fonte:** [src/pages/conversion/MyQueueDetailedCard.tsx](../../src/pages/conversion/MyQueueDetailedCard.tsx)
- **Uso:** renderizado para cada item de `myQueue` na aba "Minha Fila" de `/conversion`.

**Objetivo.** Exibir um cartão compacto (`CompactQueueCard`) que, ao clicar, abre um **modal detalhado** para editar a etapa de Conversão de Dados do projeto diretamente e gerenciar publicações/trâmites.

**Dados e Hooks.**
- Ao abrir o modal (`isOpen`), busca o projeto: `supabase.from("projects").select("*").eq("id", item.projectId).single()`. Mapeia campos de conversão (`conversion_status`, `conversion_responsible`, `conversion_start_date`, `conversion_end_date`, `conversion_homologation_status`, `conversion_homologation_responsible`, `conversion_sent_at`, `conversion_finished_at`, `conversion_observations`) e de contexto do projeto (`project_leader`, `implantation_type`, `legacy_system`, `sold_hours`, `work_hours`, `description`).
- **`useConversionPosts(projectId)`** — `posts`, `createPost`, `deletePost`, `uploadImage` (só ativo com o modal aberto).
- **`useAuth()`** — identifica autor das publicações.
- **`updateField(dbField, value)`** — grava diretamente em `projects` (`update` + `updated_at`) com auto-save por campo (estado `saving`, spinner no header). `handleFieldChange` atualiza estado local e persiste.

**Componentes principais.** `CompactQueueCard`, `ProjectInfoSection` (dados do projeto), `RichTextEditor` (observações — converte blocos legados via `convertBlocksToTiptap`), `NewPostForm` + `ConversionPostFeed` (feed de publicações), seletores de Status e Status de Homologação.

**Regras/estados.**
- **Status da etapa** (`statusOptions`): `todo` (Não Iniciado), `in-progress` (Em Andamento), `done` (Finalizado), `blocked` (Bloqueado).
- **Status de Homologação:** Adequado / Parcialmente Adequado / Inadequado / Aguardando Adequação (cores por opção).
- Campos **somente leitura:** "Responsável" (auto preenchido ao assumir) e "Enviado em" (`conversion_sent_at`, editável apenas em `/projects` → Etapas). "Finalizado em" é editável (grava `conversion_finished_at` com hora fixa `T12:00:00Z`).
- Badges de status/engine/prioridade replicados no header do modal.
- **Ações:** "Transferir" (callback `onTransfer`) e "Enviar p/ Homologação" (só se `queueStatus === "in_progress"`; fecha modal e chama `onSendToHomologation`).

**Pontos de manutenção.** Persistência é **campo a campo** direto na tabela `projects` (sem passar por `useProjectsV2`), então mudanças de nomes de coluna impactam aqui; os `STATUS_*` locais divergem levemente dos de `Conversion.tsx`.

---

## 2. Motores de Conversão
- **Rota:** `/conversion/engines`
- **Arquivo-fonte:** [src/pages/conversion/ConversionEngines.tsx](../../src/pages/conversion/ConversionEngines.tsx)
- **Acesso:** Protegido (autenticado). Não há gate por equipe no componente; qualquer botão de atualização de status fica disponível ao usuário logado.

### Objetivo
Acompanhar as conversões que dependem da criação/desenvolvimento de um "motor"/conversor. Lista apenas itens da fila cujo `engine_status` não é nulo e permite avançar o estágio do motor.

### Dados e Hooks
- **`useConversionEngines()`** — [src/hooks/useConversionEngines.ts](../../src/hooks/useConversionEngines.ts).
  - **Query:** `supabase.from("conversion_queue").select("id, project_id, queue_status, assigned_to_name, priority, engine_status, engine_requested_at, engine_requested_by_name, engine_notes, projects:project_id(client_name, ticket_number, system_type, legacy_system)")` com filtro `.not("engine_status", "is", null)`, ordenado por `engine_requested_at` desc.
  - **`kpis`:** `{ pendingEngine, inDevelopment, ready, total }`.
  - **Mutations:** `requestEngine(queueId, notes, userName)` (marca `pending_engine`) e `updateEngineStatus(queueId, newStatus, notes?)` (atualiza `engine_status` e opcionalmente `engine_notes`). Ambas emitem toast e re-executam `fetchEngines`.
- Tipo `EngineStatus = "pending_engine" | "engine_in_development" | "engine_ready"`.

### Componentes principais
- **4 KPIs:** Aguard. Extração da Base, Em Desenvolvimento, Prontos, Total (cards com borda colorida).
- **Filtros:** busca por cliente/ticket/sistema legado (`search`) e filtro por status (`statusFilter`).
- **Lista de motores:** cards clicáveis (abrem `ConversionPostDrawer` do projeto). Cada card mostra cliente, ticket, badge de status (`ENGINE_STATUS_CONFIG`), sistema, legado, responsável, data de solicitação e observações (`engineNotes`).
- **Diálogo "Atualizar Status do Motor":** `Select` com as três opções → `handleSaveStatus` → `updateEngineStatus`.
- **`ConversionPostDrawer`** — histórico de publicações do motor selecionado.

### Fluxos e Interações
- Clicar no card → abre o drawer de publicações.
- Botão "Atualizar" (para em `stopPropagation`) → abre diálogo de edição de status → salvar persiste e recarrega.

### Regras de Negócio e Estados
- **`ENGINE_STATUS_CONFIG`** define label/cor/ícone por status: `pending_engine` (Aguardando Extração da Base, laranja, ícone Database), `engine_in_development` (Motor em Desenvolvimento, azul, Loader2 girando), `engine_ready` (Motor Pronto, verde, CheckCircle2).
- Estados de UI: `loading` (spinner central) e vazio ("Nenhum motor encontrado").
- O ciclo do motor é a origem do indicador de engine visto nos cards de `/conversion`.

### Pontos de Manutenção
- A query usa cast `(supabase as any)` porque colunas de engine podem não estar nos tipos gerados — regenerar tipos do Supabase reduz esse acoplamento.
- `requestEngine` existe no hook mas é acionado a partir de `/conversion`; nesta tela usa-se `updateEngineStatus`.
- Não há atualização em tempo real: depende do `refetch`/reabertura.

---

## 3. Dashboard — Modelos Editor
- **Rota:** `/orion-tn-models/dashboard`
- **Arquivo-fonte:** [src/pages/conversion/OrionTNDashboard.tsx](../../src/pages/conversion/OrionTNDashboard.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Visão gerencial do estágio **Modelos Editor** dentro dos projetos OrionTN. Consolida indicadores de status, contagem de arquivos, distribuição de progresso e uma tabela dos projetos em andamento no editor.

### Dados e Hooks
- **`useProjectsV2()`** — [src/hooks/useProjectsV2.ts](../../src/hooks/useProjectsV2.ts). Fornece `projects` (React Query, key `projectsV3_with_dates`, lê `projects` com `is_deleted=false` via `transformToProjectV3`), `isLoading` e `updateProject` (mutation).
- **Filtros/derivações locais (memoizados):**
  - `orionProjects` — `systemType` em `"Orion TN" | "OrionTN" | "Modelos TN"`.
  - `withEditor` — subconjunto com estágio `stages.modelosEditor` presente.
  - `stats` — agrega por status (`todo`, `in-progress`, `done`, `blocked`, `waiting_adjustment`), soma `sentFiles`/`availableFiles`, calcula distribuição de progresso (faixas 0-25/26-50/51-75/76-100), `avgProgress` (média de `overallProgress`) e `recentProjects` (status `todo`/`in-progress`, ordenados por `lastUpdatedAt` desc, top 10).
- **Persistência:** apenas ao abrir um projeto no `ProjectModal` e salvar → `updateProject.mutate({ projectId, updates })` (que invalida `projects`, `projectsV3`, `projectsV3_with_dates`, `projectsList` e `projectDetails/{id}` e gera auto-log via `useTimeline`).

### Componentes principais
- **5 KPI Cards** (`KPICard` interno): Total c/ Editor, Em Andamento, Concluídos, Não Iniciados, Bloqueados (`blocked` + `waiting_adjustment`).
- **Card "Distribuição de Status"** — barras por `STATUS_CONFIG`.
- **Card "Arquivos"** — Arquivos Enviados (modelos p/ cliente), Arquivos Disponíveis (prontos p/ envio) e Taxa de Conclusão.
- **Card "Progresso dos Projetos"** — anel SVG de progresso médio + barras por faixa.
- **Tabela "Projetos em Andamento — Modelos Editor"** — cliente/ticket, status do editor, responsável, contagem de arquivos (enviados/disponíveis), data de atualização e ação "Abrir".
- **`ProjectModal`** ([src/components/ProjectManagement/ProjectModal.tsx](../../src/components/ProjectManagement/ProjectModal.tsx)) — abre o projeto selecionado.

### Fluxos e Interações
- "Abrir" na tabela → define `selectedProjectForModal` → abre `ProjectModal`; ao salvar dispara `updateProject.mutate`.
- Todos os números são recalculados client-side a partir de `projects`.

### Regras de Negócio e Estados
- Só entram no dashboard projetos OrionTN **que possuem** o estágio `modelosEditor` (`withEditor`).
- **`StageStatus`** e `STATUS_CONFIG` definem os 5 estados (label/cor/ícone/badge): Não Iniciado, Em Andamento, Concluído, Bloqueado, Aguard. Ajuste.
- Taxa de conclusão = `done / total` de `withEditor`.
- Estado de carregamento: spinner central. Estados vazios em cada card/tabela.

### Pontos de Manutenção
- O reconhecimento de projetos OrionTN é por string de `systemType` (três variações) — manter sincronizado com `OrionTNProjects.tsx` e `OrionTNModels.tsx` (que também considera `products`).
- As métricas dependem de `overallProgress`, `sentFiles`, `availableFiles` e `lastUpdatedAt` vindos de `transformToProjectV3`.

---

## 4. Projetos OrionTN
- **Rota:** `/orion-tn-models/projects`
- **Arquivo-fonte:** [src/pages/conversion/OrionTNProjects.tsx](../../src/pages/conversion/OrionTNProjects.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Listagem geral e gestão dos projetos do ecossistema OrionTN/Modelos TN, com KPIs por status global, busca, paginação e atalho para o Modelos Editor de cada projeto.

### Dados e Hooks
- **`useProjectsV2()`** — `projects`, `isLoading`, `updateProject`.
- **Filtro local:** `orionTNProjects` = `systemType` em `"Orion TN" | "OrionTN" | "Modelos TN"`.
- **Métricas por `globalStatus`:** `total`, `inProgressList` (`in-progress`), `doneList` (`done`), `blockedList` (`blocked`).
- **Busca/paginação (estado local):** `searchQuery` (cliente ou ticket), `pageSize` (5/10/25/50), `currentPage`; `filteredProjects` e `paginatedProjects` derivam disso.
- **Persistência:** `ProjectModal` → `updateProject.mutate`.

### Componentes principais
- **4 KPI Cards clicáveis:** Total OrionTN, Andamento, Finalizados, Bloqueios. Cada um abre um `Dialog` (`selectedMetric`) com a `ProjectTable` daquela categoria (títulos em `metricTitles`).
- **Card "Listagem de Projetos":** seletor de tamanho de página, busca e a `ProjectTable` paginada, com controles de paginação (primeira/última/vizinhas + reticências).
- **`ProjectTable`** (componente local) — colunas Cliente, Status (`statusMap`: done/blocked/in-progress/todo/archived), Progresso (barra + `overallProgress`) e Ações.
- **`ProjectModal`** — abrir projeto para edição.

### Fluxos e Interações
- **"Abrir"** (`ExternalLink`) → abre o `ProjectModal` do projeto.
- **Ícone `LayoutPanelTop`** → `Link` para `/orion-tn-models/{project.id}` (abre o Modelos Editor da tela 5).
- Clique num KPI → abre diálogo com a listagem detalhada; a partir dele "Abrir" fecha o diálogo e abre o modal.
- Busca e mudança de tamanho de página **resetam** para a página 1.

### Regras de Negócio e Estados
- Classificação por `globalStatus` (não pelo status do estágio) para os KPIs.
- Cores de status: `done` verde, `blocked` rosa, demais azul.
- Paginação só é exibida quando `totalPages > 1`.
- Estado de carregamento (spinner) e vazio ("Nenhum projeto OrionTN encontrado.").

### Pontos de Manutenção
- `useProjectsV2()` é chamado duas vezes (uma para `projects`/`isLoading`, outra só para `updateProject`) — ponto de simplificação.
- Reconhecimento OrionTN por `systemType` (sem considerar `products`, diferente da tela 5).
- `ProjectTable` é reutilizada tanto na listagem quanto nos diálogos de métrica (parâmetro `hideActionsOnMobile`).

---

## 5. Modelos Editor (Workspace)
- **Rota:** `/orion-tn-models/:projectId?` (o `projectId` é opcional; sem ele, mostra tela de seleção)
- **Arquivo-fonte:** [src/pages/conversion/OrionTNModels.tsx](../../src/pages/conversion/OrionTNModels.tsx)
- **Acesso:** Protegido (autenticado). Ações de arquivo dependem de **permissões** do usuário (`usePermissions`: `canUploadFiles`, `canDeleteFiles`, `canEditProjects`) dentro do `ModelosEditorWorkspace`.

### Objetivo
Espaço de trabalho para produzir e gerenciar os **modelos** (documentos) de um projeto OrionTN: recebe os modelos do cliente ("Enviados") e disponibiliza os modelos convertidos em JSON ("Disponíveis"), com controle de progresso, filtros, ações em lote e download compactado.

### Dados e Hooks
- **`useProjectsV2()`** — `projects`, `isLoading`, `updateProject`.
- **`useParams()` / `useNavigate()`** (react-router) — `projectId` da URL; `handleSelectProject(id)` navega para `/orion-tn-models/{id}`.
- **`orionProjects`** (memo) — inclui projetos com `systemType` `"Orion TN"`/`"Modelos TN"` **ou** `products` contendo `"Orion TN"`/`"OrionTN"` (critério mais amplo que as telas 3 e 4). `filteredProjects` aplica busca e ordena por `clientName` (`pt-BR`).
- **`updateStage(proj, "modelosEditor", updates)`** — helper que faz `updateProject.mutateAsync` mesclando `stages.modelosEditor` (persistência do estágio).
- **`ModelosEditorWorkspace`** consome:
  - **`useProjectFiles(project.id)`** — `uploadFile`, `getDownloadUrl`, `deleteFile` (Supabase Storage).
  - **`usePermissions()`** — gate de upload/delete/edição.
  - **`useModelGenerationJobs(project.id)`** ([src/hooks/useModelGenerationJobs.ts](../../src/hooks/useModelGenerationJobs.ts)) — fila de geração automática de modelos: `enqueueJob` (insere um job `pending`), `getLatestJobFor(sourcePath)` (status por arquivo) e assinatura **Realtime** que atualiza os badges e, ao concluir, recarrega os `availableFiles`.

### Componentes principais
- **Sidebar de projetos** (colapsável — `isSidebarOpen`) com busca, contador (`Badge`) e itens com efeito marquee (`getMarqueeStyle`).
- **Header** — nome do cliente selecionado e "Central de Modelos - {systemType}".
- **`ModelosEditorWorkspace`** ([src/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace.tsx](../../src/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace.tsx)):
  - Duas colunas fixas: **Modelos Enviados (Cliente)** (`sentFiles`) e **Modelos Disponíveis (JSON)** (`availableFiles`, `accept=".json"`).
  - Barra de **progresso** dos modelos (baseada em `sentFiles` marcados como `isDone`).
  - Busca por coluna, "Selecionar Todos", ações em lote (**Baixar Selecionados** em `.zip` via `jszip`, com subpasta nomeada pelo cliente; **Excluir Selecionados**), visualizar/baixar/excluir por arquivo e visualizador em tela cheia (`Dialog`).
  - `ModelosMetrics` — calcula "Média Necessária" (modelos/dia) comparando prazo (`startDate`/`endDate`) e progresso, sinalizando on-track/atrasado.
- Estado vazio ("Nenhum projeto selecionado").

### Fluxos e Interações
- Selecionar projeto na sidebar → atualiza a URL → `selectedProject` é resolvido de `projects`.
- Upload → `uploadFile.mutateAsync` → adiciona ao array (`sentFiles`/`availableFiles`) via `onUpdate`/`updateStage` → persiste no projeto.
- Marcar arquivo como concluído (`isDone`) → atualiza array e recalcula progresso.
- Download individual (fetch + blob) com fallback para nova aba; download em lote gera `.zip`.
- Exclusão remove do Storage e do array do estágio (com `confirm`).

### Geração automática de modelos (worker na VM)

Cada modelo do cliente na coluna **"Enviados"** que tenha uma **categoria** definida (`modelType`) exibe o botão **"Gerar modelo automático"** (`Wand2`). Ao clicar, o SiplanHUB **enfileira um job** — não gera na hora, pois o processamento leva **10 a 20 min**.

- **Categorias (`MODEL_TYPES` em [ProjectV2.ts](../../src/types/ProjectV2.ts)):** Minutas, Traslado, Livro, Qualificação de Partes, Qualificação de Imóvel, Cláusulas.
- **Arquitetura (fila de trabalho):** o botão faz `INSERT` em `model_generation_jobs` (status `pending`). Um **worker na VM Linux da empresa** ([vm-worker/](../../vm-worker/README.md)) puxa o job por **conexão de saída** (Realtime + polling — sem túnel nem porta aberta), roda a skill `criar-modelo-mesclado` do Claude Code em modo headless autônomo dentro de `/opt/Orion.Modelos`, e devolve o `modelo.json` para o bucket `project-files` + `project_files` + `modelos_editor_available_files`. O JSON **aparece sozinho** na coluna "Disponíveis" da mesma categoria (via Realtime).
- **Badges de status** (por arquivo, via `getLatestJobFor`): **Na fila** (`Clock`) → **Gerando…** (`Loader2` girando) → **Pronto** ou **Erro** (`AlertCircle`) com **"Tentar novamente"** (`RotateCw`, que enfileira um novo job). Clicar no badge abre o **modal de andamento ao vivo** — um feed com cada passo que a IA está executando na VM (colunas `progress`/`progress_log` do job + Realtime).
- **Selo do gerador** (`useModelWorkerStatus`): "Gerador online/offline" no topo da coluna de enviados, lido do heartbeat `model_worker_heartbeat`. Offline = as gerações ficam na fila até o worker voltar. Um **watchdog** (cron) na VM reinicia o serviço se ele cair.
- **Concorrência/robustez:** `claim_model_generation_job` usa `FOR UPDATE SKIP LOCKED` (um worker por job); um **reaper** (`requeue_stuck_model_jobs`) devolve à fila jobs travados respeitando `MAX_ATTEMPTS`; o append usa a RPC atômica `append_available_model` (evita lost-update com o auto-save da tela).
- **Observação de qualidade:** o modo headless decide sozinho as escolhas que a skill normalmente pergunta — o resultado é um **rascunho**; o analista deve revisar o JSON antes de usar em produção.

> **Backend/infra:** migration `supabase/migrations/20260707120000_create_model_generation_jobs.sql` (tabela + RLS + Realtime + as 3 RPCs) e `20260707140000_add_model_types_traslado_livro.sql` (categorias Traslado/Livro). Setup do worker, systemd e segurança em [vm-worker/README.md](../../vm-worker/README.md).

### Regras de Negócio e Estados

> **Fluxo simplificado de 2 etapas do "Modelos TN".** O tipo de sistema **"Modelos TN"** possui um fluxo enxuto, definido em [src/components/ProjectManagement/Tabs/StepsTab.tsx](../../src/components/ProjectManagement/Tabs/StepsTab.tsx) (`isModelosTN = project.systemType === "Modelos TN"`). Quando verdadeiro, as etapas iniciais (Infraestrutura, Aderência, Ambiente, Conversão e Pós-Implantação) ficam **ocultas** (`{!isModelosTN && ...}`) e o projeto exibe apenas **duas etapas**:
> 1. **"1. Modelos Editor"** — exatamente o `ModelosEditorWorkspace` desta tela (mesma etapa `modelosEditor`, aqui em tela cheia dedicada). Em projetos OrionTN completos, esta é a etapa **5** ("5. Modelos Editor").
> 2. **"2. Implantação & Treinamento"** — a etapa `implementation` (fases `phase1`/`phase2`, com dados de implantação/treinamento), cujas datas de `phase1` são sincronizadas automaticamente com as datas do estágio principal. Em projetos OrionTN completos, é a etapa **6**.
>
> Ou seja, "Modelos TN" reaproveita as mesmas estruturas de estágio (`modelosEditor` + `implementation`) do projeto padrão, apenas renderizando um subconjunto rotulado como 1 e 2. Esta tela (`/orion-tn-models/:projectId?`) é o ponto de trabalho da **etapa 1**; a etapa 2 é gerida pelo módulo de Implantação/Projetos.

- **Tipo de arquivo:** coluna "Disponíveis" aceita apenas `.json`; "Enviados" aceita qualquer arquivo (modelos do cliente).
- **Progresso** = `sentFiles` com `isDone` / total de `sentFiles`; 100% pinta a barra de verde.
- **Estrutura do estágio** (`ModelosEditorStageV2`): `status`, `responsible`, `startDate`, `endDate`, `observations`, `sentFiles`, `availableFiles`, `lastUpdatedAt`, `lastUpdatedBy`.
- **Permissões:** upload/exclusão/marcação dependem de `canUploadFiles`/`canDeleteFiles`/`canEditProjects`.
- Loading só bloqueia a tela quando `isLoading && projects.length === 0`.

### Pontos de Manutenção
- O critério de "projeto OrionTN" aqui é **mais amplo** (inclui `products`) que nas telas 3 e 4 — divergência a observar ao filtrar.
- Persistência do estágio é feita por merge em `stages.modelosEditor` via `updateStage`; qualquer mudança na forma de `stages` exige ajuste.
- Downloads dependem de URLs assinadas do Supabase Storage (`getDownloadUrl`) e do carregamento dinâmico de `jszip`.
- A mesma `ModelosEditorWorkspace` é reutilizada dentro de `StepsTab` (etapa do projeto), então mudanças no componente afetam ambos os contextos.
