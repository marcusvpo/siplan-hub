# Módulo: Núcleo — Dashboard e Projetos

Documentação técnica por tela do grupo central do **Siplan HUB** (React 18 + TypeScript + Vite + Supabase). Cobre a página inicial (hub de navegação), o dashboard gerencial, o quadro Kanban, a listagem de projetos, os detalhes de um projeto, o formulário de análise de aderência e a comparação de projetos.

> Observação de acesso: todas as telas deste módulo são registradas em `src/App.tsx` dentro de `/*` sob `<ProtectedRoute>` + `<MainLayout>`. Portanto **todas exigem autenticação**. Restrições adicionais por permissão são detalhadas em cada tela.

## Índice

1. [Home (Hub de Navegação)](#1-home-hub-de-navegação) — `/`
2. [Dashboard (Visão Geral)](#2-dashboard-visão-geral) — `/dashboard`
3. [Quadro Kanban](#3-quadro-kanban) — `/dashboard/kanban`
4. [Projetos Ativos (Listagem)](#4-projetos-ativos-listagem) — `/projects`
5. [Detalhes do Projeto](#5-detalhes-do-projeto) — `/projects/:id`
6. [Análise de Aderência](#6-análise-de-aderência) — `/projects/:id/adherence`
7. [Comparar Projetos](#7-comparar-projetos) — `/compare`

---

## 1. Home (Hub de Navegação)
- **Rota:** `/`
- **Arquivo-fonte:** [../../src/pages/Home.tsx](../../src/pages/Home.tsx)
- **Acesso:** Protegido (autenticado). O conteúdo exibido é filtrado por permissões do usuário.

### Objetivo
Tela de entrada do HUB. Funciona como um lançador central: apresenta as categorias de módulos (cards), oferece busca rápida por telas e permite navegar diretamente para qualquer funcionalidade que o usuário tenha permissão de visualizar. Serve a todos os perfis, mostrando apenas o que cada um pode acessar.

### Dados e Hooks
- `useTheme()` ([src/hooks/use-theme](../../src/hooks/use-theme.tsx)) — determina se o tema é escuro para alternar o logo (`Siplan_logo_branco.png` vs `Siplan_logo.png`), considerando também `system` via `window.matchMedia("(prefers-color-scheme: dark)")`.
- `usePermissions()` ([src/hooks/usePermissions.ts](../../src/hooks/usePermissions.ts)) — expõe `hasPermission(key, action)` e `isAdmin`.
- `menuItems` ([src/constants/menuItems.ts](../../src/constants/menuItems.ts)) — fonte estática das categorias e subitens (título, descrição, ícone, `path`, `permissionKey`).
- Sem chamadas ao Supabase nem React Query nesta tela. Toda a filtragem é local com `useMemo`.

### Componentes principais
- `Input` com ícone `Search` (campo "Encontrar tela...").
- Grid de `Card`/`CardContent` para categorias, animados com `framer-motion` (`motion`, `AnimatePresence`, `layout`).
- Lista de sugestões achatadas (subitens que casam com a busca).
- `Dialog` de submenu (abre ao clicar em categoria que possui `subItems` e não possui `path`).

### Fluxos e Interações
- **Filtragem por permissão** (`allowedMenuItems`): itens sem `permissionKey` sempre aparecem; `isAdmin` vê tudo; senão exige `hasPermission(permissionKey, "view")`.
- **Busca** (`filteredItems`): filtra categorias e subitens por título/descrição. Com termo ≥ 2 caracteres, monta também `searchSuggestions` (lista achatada de subitens).
- **Clique em card** (`handleCardClick`): se o item tem `path`, navega direto; se tem `subItems`, abre o `Dialog` de submenu.
- **Clique em sugestão / subitem**: `navigate(path)` e fecha o diálogo.
- **Estado vazio**: sem resultados e com termo de busca, exibe mensagem "Nenhuma tela encontrada" e botão "Limpar pesquisa".
- Dentro do diálogo, subitens ainda são revalidados por permissão (`sub.permissionKey && !isAdmin && !hasPermission(...)` retorna `null`).

### Regras de Negócio e Estados
- Estados locais: `search`, `selectedCategory`.
- A visibilidade dos módulos é totalmente derivada das permissões — nenhum item proibido é renderizado.

### Pontos de Manutenção
- Acoplamento forte com a estrutura de `menuItems.ts`: adicionar telas exige manter `permissionKey` coerente com o sistema de permissões.
- A checagem de tema lê `window.matchMedia` diretamente no render (não reativa a mudanças de preferência do SO em tempo real).
- Chave de lista das sugestões usa `parentTitle + path`; paths duplicados entre categorias poderiam colidir.

---

## 2. Dashboard (Visão Geral)
- **Rota:** `/dashboard`
- **Arquivo-fonte:** [../../src/pages/DashboardV2.tsx](../../src/pages/DashboardV2.tsx)
- **Acesso:** Protegido. No menu, associado à `permissionKey` `dashboard` / `dashboard_view`.

### Objetivo
Painel gerencial com métricas e status consolidados dos projetos de implantação. Reúne KPIs, gráficos (distribuição, status, carga de trabalho, timeline), indicadores de performance, lista de projetos ativos e alertas críticos. Permite exportar um relatório em PDF. Voltado a gestores e coordenação.

### Dados e Hooks
- `useProjectsV2()` ([src/hooks/useProjectsV2.ts](../../src/hooks/useProjectsV2.ts)) — retorna `projects` (query key `projectsV3_with_dates`, tabela `projects` filtrando `is_deleted = false`, ordenado por `updated_at desc`, transformado por `transformToProjectV3`).
- `useKPIs(projects)` ([src/hooks/useKPIs.ts](../../src/hooks/useKPIs.ts)) — cálculo memoizado de KPIs (ver Regras).
- `useToast()` — feedback da geração de PDF.
- Geração de PDF: `jsPDF` + `html2canvas` sobre o elemento oculto `#dashboard-report` renderizado por `DashboardReport`.

### Componentes principais
- `DashboardKPI` ([src/components/Dashboard/DashboardKPI.tsx](../../src/components/Dashboard/DashboardKPI.tsx)) — grade de `KPICard` (Total, Críticos, Bloqueados, Em Risco, Concluídos, Taxa, Média). Recebe `onCardClick`.
- `ProjectDistributionChart`, `StatusChart`, `WorkloadChart`, `TimelineChart` (bento grid de gráficos).
- Card "Performance": Taxa de Sucesso Geral (barra) e Tempo Médio por Etapa (Infra, Aderência, Conversão, Implantação).
- `DashboardTable` ([src/components/Dashboard/DashboardTable.tsx](../../src/components/Dashboard/DashboardTable.tsx)) — lista paginada (6 por página) de projetos ativos, ordenada por saúde (críticos primeiro). Usa `HealthBadge`, `PipelineStatus`, `useProjectStore`.
- Card "Alertas Críticos" — até 5 projetos críticos não bloqueados, com `ScrollingText`.
- `ProjectDetailsModal` — modal aberto por cliques em KPIs/tabela/alertas.
- `DashboardReport` (oculto fora da tela) — fonte do PDF.

### Fluxos e Interações
- **Clique em KPI** (`handleCardClick`): filtra `projects` por categoria (`total`, `critical`, `blocked`, `at-risk`, `completed`) e abre `ProjectDetailsModal` com título correspondente.
- **Clique em projeto** (tabela/alerta) (`handleProjectClick`): abre o modal com o projeto isolado.
- **"Ver Todos"**: `navigate("/projects")`.
- **Gerar PDF** (`handleDownloadPDF`): toast de progresso, espera 800ms para pintura, captura `#dashboard-report` com `html2canvas` (scale 1.5, `windowWidth: 800`), fatia em páginas A4, adiciona rodapé "Siplan HUB © 2026 - Auditoria e Implantação" + numeração, e faz download `Relatorio_Gestao_Siplan_<ddMMyyyy>.pdf`. Toasts de sucesso/erro.

### Regras de Negócio e Estados
- Estados locais: `isModalOpen`, `modalTitle`, `filteredProjects`, `isGeneratingPDF`.
- **`criticalAlerts`**: `healthScore === "critical"` e `globalStatus !== "blocked"`, limitado a 5.
- **KPIs (useKPIs)**:
  - `criticalProjects`: `healthScore === "critical"` e não bloqueado.
  - `blockedProjects`: `globalStatus === "blocked"`.
  - `atRiskProjects`: `healthScore === "warning"`.
  - `completedProjects`: `globalStatus === "done"`.
  - `completionRate`: `completed / total * 100`.
  - `successRate`: `((ativos com healthScore 'ok') + concluídos) / total`, arredondado e limitado a 100.
  - `avgStageTime`: média de dias entre `startDate` e `endDate` de etapas com `status === "done"` e ambas datas presentes (por Infra/Aderência/Conversão/Implantação).
  - `avgTotalTime`: média de dias entre `createdAt` e `endDateActual` de projetos concluídos.
- Bloco "Storage: Simulado" e "Status: Online" são valores fixos (placeholder).

### Pontos de Manutenção
- **PDF frágil**: depende de timing (delay de 800ms), captura via `html2canvas` de um nó fora da tela e do cálculo manual de fatiamento por página (epsilon de 2mm para evitar página em branco). Sensível a mudanças de layout do `DashboardReport`.
- `DashboardKPI` e `DashboardTable` chamam `useProjectsV2()` internamente novamente — múltiplas instâncias do hook (dedup via React Query, mas cálculo de KPIs repetido).
- Indicadores "Storage/Simulado" são hardcoded — dívida técnica se for esperado dado real.
- A tela não trata estado de `isLoading`/erro explicitamente no corpo (KPIs e tabela tratam internamente); `projects` chega como `[]` durante carregamento.

---

## 3. Quadro Kanban
- **Rota:** `/dashboard/kanban`
- **Arquivo-fonte:** [../../src/pages/ProjectsKanban.tsx](../../src/pages/ProjectsKanban.tsx)
- **Acesso:** Protegido. No menu, `permissionKey` `kanban`.

### Objetivo
Acompanhamento visual do fluxo de projetos por status global, com quatro colunas e reordenação por arrastar-e-soltar. Permite mover projetos entre estados e abrir o modal de projeto para edição.

### Dados e Hooks
- `useProjectsV2()` — `projects`, `isLoading` e a mutation `updateProject`.
- `useToast()` — confirma mudança de status.
- Agrupamento local `groupedProjects` (`useMemo`) por `globalStatus`.

### Componentes principais
- `@hello-pangea/dnd`: `DragDropContext`, `Droppable`, `Draggable`.
- Colunas fixas `COLUMNS`: `todo` (Não Iniciado), `in-progress` (Em Andamento), `done` (Concluído), `blocked` (Bloqueado) — cada uma com ícone e cor.
- `Card` de projeto com `Badge` (ticket, `systemType`), `Progress` (`overallProgress`), líder (`projectLeader`).
- `ProjectModal` ([src/components/ProjectManagement/ProjectModal.tsx](../../src/components/ProjectManagement/ProjectModal.tsx)) — aberto ao clicar no card.

### Fluxos e Interações
- **Drag & drop** (`onDragEnd`): ignora drop nulo ou na mesma posição; deriva `newStatus` do `droppableId` de destino; se diferente do atual, chama `updateProject.mutate({ projectId, updates: { ...project, globalStatus: newStatus } })` e exibe toast traduzindo o status.
- **Clique no card**: `setSelectedProject` abre o `ProjectModal`.
- **Edição no modal** (`onUpdate`): dispara `updateProject.mutate` com o projeto atualizado.
- Estado de carregamento exibe spinner (`Loader2`) centralizado.

### Regras de Negócio e Estados
- Estado local: `selectedProject`.
- **Mapeamento `archived` → `done`**: projetos com `globalStatus === "archived"` são exibidos na coluna "Concluído" (apenas visual; o status real não é reescrito só por exibição).
- Colunas mostram contador (`Badge`) e estado "Vazio" quando não há cards.

### Pontos de Manutenção
- O drag persiste imediatamente via mutation; não há rollback otimista explícito nem tratamento de erro visível no `onDragEnd` (erros dependem do comportamento padrão da mutation).
- O `updates` envia o objeto de projeto inteiro (`...project`) além do `globalStatus`, dependendo de `transformToDB` para montar o payload correto.
- Projetos `archived` são visualmente indistinguíveis de `done` na coluna.

---

## 4. Projetos Ativos (Listagem)
- **Rota:** `/projects`
- **Arquivo-fonte:** [../../src/pages/Index.tsx](../../src/pages/Index.tsx)
- **Acesso:** Protegido. No menu, sob "Implantação" (`menu_implantacao`), item "Gerenciar Projetos".

### Objetivo
Listagem central de todos os projetos de implantação com filtros avançados, ordenação, paginação, criação de novos projetos e seleção para comparação. A página `Index` é um invólucro fino; a lógica vive em `ProjectGrid`.

### Dados e Hooks
- `NewProjectDialog` — criação de projeto (na barra de título).
- `ProjectGrid` ([src/components/ProjectManagement/ProjectGrid.tsx](../../src/components/ProjectManagement/ProjectGrid.tsx)):
  - `useProjectsList(searchQuery, viewPreset)` ([src/hooks/useProjectsList.ts](../../src/hooks/useProjectsList.ts)) — query key `["projectsList", searchQuery, viewPreset]`, seleciona um subconjunto de colunas de `projects` com filtro `is_deleted = false` e filtragem **server-side** por preset; calcula `healthScore` no cliente por dias desde `updated_at` (≥15 crítico, ≥7 warning, senão ok).
  - `useProjectsV2()` — `updateProject`, `deleteProject`.
  - `useConversionQueue()` — `getItemByProjectId`, `removeFromQueue` (status do motor e remoção da fila).
  - `useFilterStore()` (Zustand, [src/stores/filterStore.ts](../../src/stores/filterStore.ts)) — `searchQuery`, `viewPreset`, `healthScore`, `currentStage`, `projectLeader`, `systemType`, `sortOrder`, `dateFrom`, `dateTo`.

### Componentes principais
- `AdvancedFilters` — filtros (líderes e tipos de sistema derivados dos projetos) e botão de comparar.
- `ProjectCardV3` — card por projeto, com seleção, `engineStatus` e menu de ações.
- `ProjectModal` — detalhes/edição; abre também via query param `?id=`.
- Controles de paginação próprios (tamanho de página 3/5/10/50/100).

### Fluxos e Interações
- **Filtragem/ordenação** (`filteredAndSortedProjects`, `useMemo`): combina busca (nome/ticket), preset de status (`active`, `post`, `paused`, `done` — com regra especial de "pós em andamento"), `healthScore`, etapa atual (`in-progress`), líder, tipo de sistema e intervalo de datas de criação; ordena por alfabético/UAT/criação/progresso.
- **Deep-link de projeto**: se `?id=` presente, abre o `ProjectModal` do projeto correspondente; ao fechar remove o param.
- **Seleção para comparar** (`toggleSelection`): máximo de 3 projetos; `handleCompare` (mín. 2) navega para `/compare?ids=...`.
- **Ações do card** (`onAction`): `delete` (confirm + `deleteProject.mutate`) e `removeFromQueue` (confirm + `removeFromQueue`).
- **Paginação**: reseta para página 1 quando qualquer filtro muda.

### Regras de Negócio e Estados
- Estados locais: `selectedProject`, `selectedProjectIds`, `pageSize`, `currentPage`.
- `viewPreset` filtra tanto no servidor (`useProjectsList`) quanto novamente no cliente (redundância defensiva no `useMemo`).
- Limite rígido de 3 projetos selecionáveis; comparação exige ≥ 2.
- Contagem de resultados e selecionados exibida acima da lista.

### Pontos de Manutenção
- `useProjectsList` expõe `fetchNextPage`/`hasNextPage`/`isFetchingNextPage` como stubs vazios (`hasNextPage: false`) — paginação é totalmente client-side sobre o conjunto retornado; nomes sugerem paginação infinita não implementada.
- Filtragem duplicada (servidor + cliente) pode divergir se as regras de preset mudarem em apenas um lugar.
- `uniqueSystemTypes` semeia valores fixos ("Orion TN", "Orion PRO", "Orion REG", "Modelos TN") além dos derivados.
- `deleteProject` é chamado via cast `as any`; exclusão é irreversível (apaga dados relacionados) conforme aviso do `confirm`.

---

## 5. Detalhes do Projeto
- **Rota:** `/projects/:id`
- **Arquivo-fonte:** [../../src/pages/ProjectDetails.tsx](../../src/pages/ProjectDetails.tsx)
- **Acesso:** Protegido. Edição condicionada a `canEditProjects` (permissão `projects:edit`).

### Objetivo
Página completa de gestão de um projeto: cabeçalho com identificação (cliente, ticket, sistema, título do chamado 0800), navegação por abas (Informações Gerais, Chamado 0800, Etapas, Arquivos, Logs, Roadmap) e modo de edição inline.

### Dados e Hooks
- `useParams` — `id` da rota.
- `useProjectDetails(id)` ([src/hooks/useProjectDetails.ts](../../src/hooks/useProjectDetails.ts)) — query key `["projectDetails", id]`, busca `projects` + relação `project_tramites(*)`, `staleTime: 0` (sempre dados frescos), transformado por `transformToProjectV3`. Retorna `project`, `isLoading`, `error`.
- `useProjectsV2()` — mutation `updateProject`.
- `usePermissions()` — `canEditProjects`.
- `useQueryClient()` — usado em `handleUpdate` para `setQueryData(["projectDetails", id], ...)` (atualização otimista do cache) antes da mutation.

### Componentes principais
- `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`.
- Abas: `GeneralInfoTab`, `Chamado0800Tab` (condicional), `StepsTab`, `FilesTab`, `LogsTab`, `RoadmapManager`, e `EditProjectTab` (modo edição).
- `Skeleton` durante carregamento; `Badge`, `motion` para transições de aba.

### Fluxos e Interações
- **Atualização** (`handleUpdate`): grava no cache (`setQueryData`) e dispara `updateProject.mutate({ projectId, updates })`.
- **Modo edição**: botão "Editar Projeto" / "Cancelar Edição" alterna `isEditing` (só aparece se `canEditProjects` e não carregando). Trocar de aba força `setIsEditing(false)`.
- **Navegação cruzada de etapa**: `GeneralInfoTab.onStageClick(id)` define `activeStepId` e muda para a aba "Etapas".
- **Voltar**: botão de seta navega para `/projects`.
- **Erro**: renderiza tela de erro com botão de voltar.

### Regras de Negócio e Estados
- Estados locais: `isEditing`, `activeTab` (default `general`), `activeStepId`.
- **Aba "Chamado 0800" condicional**: só aparece se o projeto tiver ao menos um de `TituloChamado`, `descricaotramite`, `ResponsavelAtividade`, `EtapasProjeto` (dados vindos da integração 0800).
- Em modo edição, todo o conteúdo das abas é substituído por `EditProjectTab`.

### Pontos de Manutenção
- `handleUpdate` faz `setQueryData` otimista sem rollback caso a mutation falhe.
- A condição de exibição da aba 0800 é duplicada (no `TabsTrigger` e no `TabsContent`) — manter sincronizada.
- O conteúdo real (validações, campos) está nos componentes de aba em `src/components/ProjectManagement/Tabs` — mudanças de comportamento geralmente estão lá, não nesta página.

---

## 6. Análise de Aderência
- **Rota:** `/projects/:id/adherence`
- **Arquivo-fonte:** [../../src/pages/ProjectAdherenceForm.tsx](../../src/pages/ProjectAdherenceForm.tsx)
- **Acesso:** Protegido. Edição/autosave condicionados a `canEditProjects`. Modo impressão via query `?print=true`.

### Objetivo
Formulário técnico de análise de aderência do projeto a um template ativo (por tipo de sistema). Suporta preenchimento dinâmico (JSON Schema), autosave em rascunho, finalização com parecer técnico e um modo de impressão que gera o "Relatório de Análise de Aderência" oficial (com assinaturas), acionando o diálogo de impressão do navegador.

### Dados e Hooks
- `useProjectDetails(projectId)` — dados do projeto (cliente, ticket, `systemType`).
- `useActiveTemplate("adherence", systemType)` ([src/hooks/useFormTemplates](../../src/hooks/useFormTemplates.ts)) — template publicado ativo para o sistema; fornece `schema_json`, `ui_json`, `version`, `id`.
- `useProjectFormResponse(projectId, "adherence")` ([src/hooks/useProjectFormResponse.ts](../../src/hooks/useProjectFormResponse.ts)) — resposta existente (tabela `project_form_responses`, `maybeSingle`); `refetch` disponível.
- `useUpsertFormResponse()` — mutation de upsert (insere/atualiza; grava `filled_by`, `submitted_at`, `approved_by`, `approved_at` conforme transição de status; invalida `projectFormResponse`, `projectDetails`, `projects*`, `projectsList`).
- `useDebounce(localFormData, 1200)` — debounce do autosave.
- `usePermissions()` — `isAdmin`, `canEditProjects`; `useToast()`.

### Componentes principais
- `FormRenderer` ([src/components/FormRenderer/FormRenderer.tsx](../../src/components/FormRenderer/FormRenderer.tsx)) — renderiza o formulário a partir de `schema_json`/`ui_json`.
- Bloco "Conclusão da Análise": `Select` de parecer (`finalVerdict`) e `Textarea` de justificativa (`finalNotes`).
- Barra de ações (`Finalizar Formulário` / `Reabrir para Edição`).
- **Modo impressão**: layout dedicado com cabeçalho oficial, seções `getPrintSections`, `getGeneralFields`, `getImpactedItems`, parecer conclusivo e área de assinaturas; estilos `@media print` e `@page A4`.

### Fluxos e Interações
- **Autosave** (efeito sobre `debouncedFormData`): se há diferença em relação a `response.data` e o formulário não está travado, faz `upsertMutation.mutate` preservando o `status` atual, com indicador "Auto-salvando..." e `refetch` no sucesso.
- **Finalizar** (`handleFinalizeForm`): valida `finalVerdict` e `finalNotes` obrigatórios; mapeia veredito → status: "Totalmente Aderente"→`approved`, "Aderente com Restrições"→`approved_with_restrictions`, "Não Aderente / Impeditivo"→`rejected`; upsert e toast de sucesso.
- **Reabrir** (`handleReopenForm`): volta status para `draft`.
- **Imprimir/PDF**: botão abre `/projects/:id/adherence?print=true` em nova aba; no modo print, `useEffect` chama `window.print()` após 1s quando tudo carregado.
- **Sincronização**: `localFormData` espelha `response.data`; alterações locais só são aplicadas se `!isFormLocked`.

### Regras de Negócio e Estados
- Estados locais: `localFormData`, `isAutoSaving`.
- **`isFormLocked`**: `status` ∈ {`approved`, `approved_with_restrictions`, `rejected`} **ou** `!canEditProjects`. **`isFinalized`**: apenas os três status finais.
- **Estados de tela alternativos**: carregando (skeletons); projeto não encontrado; sem template ativo para o `systemType` (card de aviso); resposta não inicializada (orienta voltar às Etapas para gerar).
- **Itens com impacto** (`getImpactedItems`): percorre o schema recursivamente coletando campos com `impacto === true` (nível "SIM"/"ATENÇÃO"). No relatório, "SIM" = "Não Aderente", "ATENÇÃO" = "Ponto de Atenção".
- Badge de status no cabeçalho reflete `finalVerdict` (cor) ou "Rascunho".

### Pontos de Manutenção
- **Parsing de schema acoplado a convenções**: `getPrintSections`/`getGeneralFields` inferem seções/perguntas pela presença da chave `impacto`/`valor` nas propriedades — mudanças na forma do schema quebram o relatório.
- Autosave compara via `JSON.stringify` (custo O(n) e sensível a ordem de chaves) e roda em `useEffect` dependente apenas de `debouncedFormData`.
- Modo impressão lê `window.location.search` diretamente (não via `useSearchParams`).
- `finalVerdict`/`finalNotes` são campos "fora do schema" guardados no mesmo blob `data` — acoplamento implícito entre a lógica de finalização e o `FormRenderer`.
- `isAdmin` é obtido mas não é usado para liberar edição de formulário travado (apenas `canEditProjects` conta em `isFormLocked`).

---

## 7. Comparar Projetos
- **Rota:** `/compare`
- **Arquivo-fonte:** [../../src/pages/CompareProjects.tsx](../../src/pages/CompareProjects.tsx)
- **Acesso:** Protegido. Recebe os IDs a comparar via query string `?ids=a,b,c`.

### Objetivo
Comparação lado a lado (até 3 projetos, conforme limite da tela de origem) em cartões, mostrando metadados, pipeline visual e detalhamento por etapa. Voltado a gestão para avaliar projetos em paralelo.

### Dados e Hooks
- `useSearchParams` — lê `ids` (`split(",")`).
- `useProjectsV2()` — `projects`, `isLoading`; filtra `selectedProjects` por inclusão de `id`.
- Sem mutations; tela somente leitura.

### Componentes principais
- `Card`/`CardHeader`/`CardContent` por projeto, com borda superior colorida por `healthScore`.
- `ScrollArea` para o grid.
- `Badge` (ticket), ícones de status por etapa (`getStageIcon`).

### Fluxos e Interações
- **Voltar**: botão navega para `/projects`.
- **Estado vazio**: se nenhum `id` casa (`selectedProjects.length === 0`), exibe "Nenhum projeto selecionado" e botão de voltar.
- Renderização puramente informativa (sem edição).

### Regras de Negócio e Estados
- **Cor da borda / saúde** (`getHealthColor` e estilo inline): `critical` → rosa (`#f43f5e`), `warning` → âmbar (`#f59e0b`), demais → verde (`#10b981`).
- **Pipeline visual**: itera `Object.entries(project.stages)` e pinta um ponto por etapa conforme status (`done` verde, `in-progress` azul, `blocked` âmbar, senão cinza). Exibe `overallProgress` arredondado.
- **Detalhamento**: lista fixa de 6 etapas — Infraestrutura, Aderência, Conversão, Ambiente, Implantação, Pós-Implantação — com rótulo de status (`getStageLabel`) e responsável, quando houver.
- Metadados: `createdAt` (dd/MM/yyyy), líder, saúde, "UAT" = `lastUpdatedAt` (dd/MM).

### Pontos de Manutenção
- O pipeline visual usa todas as chaves de `stages` (inclui `modelosEditor` quando presente), mas o "Detalhamento" lista apenas 6 etapas fixas — inconsistência potencial se novas etapas forem adicionadas.
- Acesso direto a `project.stages.<etapa>.status` sem guarda de nulo; depende de o transformer sempre popular todas as etapas.
- Estado de loading é um simples texto "Carregando..." (sem skeleton).
- O rótulo "UAT" no cartão na verdade exibe a data da última atualização (`lastUpdatedAt`), não uma data de UAT dedicada.
