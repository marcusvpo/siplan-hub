# Módulo Administração

Conjunto de telas voltadas à gestão da plataforma Siplan HUB: usuários, perfis de acesso (RBAC), equipes, férias, auditoria, armazenamento e configurações de saúde de projetos. Todas as rotas ficam sob `/admin` e compartilham o layout [`AdminLayout`](../../src/layouts/AdminLayout.tsx).

## Sumário

- [AdminLayout (navegação/sidebar)](#adminlayout-navegação-e-controle-de-acesso)
- [Modelo RBAC (visão geral)](#modelo-rbac-visão-geral)
- [Dashboard Administrativo](#dashboard-administrativo) — `/admin`
- [Gerenciamento de Usuários](#gerenciamento-de-usuários) — `/admin/users`
- [Perfis de Acesso (Roles)](#perfis-de-acesso-roles) — `/admin/roles`
- [Configurações do Time / Equipes](#configurações-do-time--equipes) — `/admin/teams-config`
- [Log de Auditoria](#log-de-auditoria) — `/admin/audit`
- [Saúde dos Projetos (Configurações)](#saúde-dos-projetos-configurações) — `/admin/settings`
- [Gestão de Férias](#gestão-de-férias) — `/admin/vacations`
- [Armazenamento do Sistema](#armazenamento-do-sistema) — `/admin/storage`
- [Usuários Inativos](#usuários-inativos) — `/admin/inactive-users`
- [TeamManagement (legado/descontinuado)](#teammanagement-legadodescontinuado)
- [TeamAreasManagement (componente auxiliar)](#teamareasmanagement-componente-auxiliar)

---

## AdminLayout (navegação e controle de acesso)

- **Arquivo-fonte:** [src/layouts/AdminLayout.tsx](../../src/layouts/AdminLayout.tsx)
- **Rota base:** `/admin` (envolve todas as telas do módulo via `<Outlet />`)

Layout com sidebar fixa à esquerda (colapsável em telas pequenas) e header superior. Responsabilidades:

- **Guarda de acesso:** usa [`useAuth`](../../src/contexts/AuthContext.tsx) e [`usePermissions`](../../src/hooks/usePermissions.ts). Enquanto `loading` ou `!permissionsLoaded`, exibe "Carregando...". Se não houver `user`, ou se o usuário **não** tiver `canManageUsers` (permissão `users:manage`) **e** o `role` não for `admin`, redireciona para `/dashboard`. Ou seja, o acesso ao módulo exige ser admin **ou** possuir a permissão `users.manage`.
- **Heartbeat de presença:** enquanto o usuário está na área admin, dispara um log de atividade (`activityLogger.log`, action `custom_action`, `type: "heartbeat"`) imediatamente e a cada 10 minutos, mantendo o usuário como "online" nas estatísticas.
- **Navegação (sidebar):** lista fixa `navItems` com os itens: Dashboard (`/admin`), Usuários (`/admin/users`), Perfis de Acesso (`/admin/roles`), Configurações do Time (`/admin/teams-config`), Usuários Inativos (`/admin/inactive-users`), Férias (`/admin/vacations`), Saúde dos Projetos (`/admin/settings`), Armazenamento (`/admin/storage`), Logs (`/admin/audit`). O item ativo é destacado pela comparação de `location.pathname`.
- **Rodapé da sidebar:** avatar/inicial do e-mail, rótulo do papel (`admin` → "Administrador", `user` → "Usuário Padrão", senão o valor bruto), botão "Acessar Sistema" (link para `/`) e botão "Sair" (`signOut`).
- **Logo:** alterna entre versão branca e colorida conforme o tema (`useTheme`).

> Observação: a sidebar exibe rótulos fixos; ela **não** oculta itens individuais por permissão — apenas a entrada no módulo é protegida. Cada tela depende das RLS do Supabase para operações efetivas.

---

## Modelo RBAC (visão geral)

- **Migração:** [supabase/migrations/20260310165500_rbac_schema.sql](../../supabase/migrations/20260310165500_rbac_schema.sql)

Tabelas principais:

| Tabela | Descrição |
| --- | --- |
| `app_roles` | Perfis de acesso (`id`, `name` único, `description`). Seed inicial: `admin` ("acesso total") e `user` ("usuário padrão"). |
| `app_permissions` | Permissões atômicas no formato `resource` + `action` (par único), com `description`. |
| `app_role_permissions` | Associação N:N entre perfis e permissões (`role_id`, `permission_id`, par único, `ON DELETE CASCADE`). |
| `profiles` | Perfil do usuário; campo `role` (texto) referencia o `name` de `app_roles`, além de `team`, `full_name`, `email`. |

Recursos/ações semeados (`app_permissions`) cobrem: `projects` (view/create/edit/delete), `files` (upload/download/delete), menus (`menu_implantacao`, `menu_calendario`, `menu_comercial`, `menu_conversao`, `menu_orion`, `menu_reports`), submenus comercial/conversão/calendário/orion, e o grupo **Administração**: `users:manage`, `teams:manage`, `roles:manage`, `audit_logs:view`, `vacations:manage`, `settings:manage`. Todas as permissões são associadas automaticamente ao perfil `admin` no seed.

**RLS:** leitura das três tabelas RBAC é liberada para qualquer usuário autenticado (`USING (true)`); operações de escrita (`FOR ALL`) só são permitidas a quem tem `profiles.role = 'admin'`.

**Resolução de permissões no cliente:** o [`AuthContext`](../../src/contexts/AuthContext.tsx) carrega o `role` a partir de `profiles` e, via `fetchPermissions(roleName)`, busca em `app_roles → app_role_permissions → app_permissions` a lista de `{resource, action}` do perfil. Expõe:
- `isAdmin` = (`role === "admin"`);
- `hasPermission(resource, action)` = existe permissão correspondente na lista;
- `permissionsLoaded` como flag de carregamento.

O hook [`usePermissions`](../../src/hooks/usePermissions.ts) pré-computa atalhos como `canManageUsers` (`users:manage`), `canCreateProjects`, `canEditProjects`, `canUploadFiles`, etc.

---

## Dashboard Administrativo

- **Rota:** `/admin` (index)
- **Arquivo-fonte:** [src/pages/admin/AdminDashboard.tsx](../../src/pages/admin/AdminDashboard.tsx)
- **Acesso:** admin ou `users:manage` (garantido pelo AdminLayout).

### Objetivo
Painel de visão geral operacional: totais de usuários, atividade em tempo real, projetos ativos, distribuição de status, engajamento de colaboradores e consumo de infraestrutura.

### Dados e Hooks
- [`useAdminStats`](../../src/hooks/useAdminStats.ts) (`queryKey: ["admin-stats"]`), que executa em paralelo:
  - contagem de `profiles` (total de usuários);
  - contagem de `projects` com `global_status` fora de `done`/`archived` (projetos ativos);
  - últimos ~2000 registros de `audit_logs` com join em `profiles` (para ranking "mais ativos");
  - `projects.global_status` (distribuição por status);
  - RPCs `get_db_size` e `get_storage_size` (tamanhos de banco e storage, convertidos para MB).
  - Consulta adicional de `audit_logs` das últimas 2h → deriva "usuários online" (ativo se ação nos últimos 15 min, senão "away") e `activeNowCount`.
- Componentes de gráfico consomem estes dados; `ProjectStatusChart` recebe `projectDistribution`.

### Componentes principais
- Cards de KPI (Total de Usuários, Ativos Agora, Mais Ativo, Projetos Ativos, Status do Sistema — fixo "Operacional", Armazenamento).
- [`OverviewChart`](../../src/components/Admin/OverviewChart.tsx) (Resumo de Atividade), [`RecentActivity`](../../src/components/Admin/RecentActivity.tsx) (Últimas Ações), [`ProjectStatusChart`](../../src/components/Admin/ProjectStatusChart.tsx) (Fases de Projetos).
- Lista "Usuários Online" (avatares via `avatar.vercel.sh`, distância de tempo em pt-BR), ranking "Engajamento de Colaboradores" (barra proporcional ao mais ativo) e card "Recursos Infra" (tamanho de banco e arquivos).

### Fluxos e Interações
Tela majoritariamente somente-leitura. Estados de carregamento (`isLoading`) exibem placeholders/spinners. Não há mutações.

### Regras de Negócio e Estados
- "Ativos Agora" = usuários com log nos últimos 15 min; "Online" = últimos 15 min (badge) apurado a partir da janela de 2h.
- Card "Status do Sistema" é estático ("Operacional").
- Card "Recursos Infra" traz dica fixa: limpar logs se o banco ultrapassar 4,5 GB.

### Pontos de Manutenção
- Depende das RPCs `get_db_size`/`get_storage_size` existirem no banco.
- O ranking "mais ativos" resolve `userId` por correspondência de nome (`activityMap`), o que pode ser impreciso com nomes duplicados.
- Avatares usam serviço externo `avatar.vercel.sh`.

---

## Gerenciamento de Usuários

- **Rota:** `/admin/users`
- **Arquivo-fonte:** [src/pages/admin/UserManagement.tsx](../../src/pages/admin/UserManagement.tsx)
- **Acesso:** admin ou `users:manage`.

### Objetivo
CRUD de contas de usuário da plataforma, incluindo criação (com senha), atribuição de perfil (`role`) e time.

### Dados e Hooks
- Estado local (`useState`) + Supabase direto:
  - `profiles.select("*")` ordenado por `full_name` (lista de usuários);
  - `app_roles.select("id, name")` (opções de perfil nos selects e filtros).
- [`useTeams`](../../src/hooks/useTeams.ts) para opções de time; [`useAuditLogs`](../../src/hooks/useAuditLogs.ts) (`logAction`) para registrar auditoria.
- **Criação:** invoca a Edge Function `create-user` (`supabase.functions.invoke("create-user", { email, password, full_name, team, role })`) — necessária porque o cliente não cria usuários em `auth.users` diretamente.
- **Edição:** `profiles.update({ full_name, role, team }).eq("id", ...)`.
- **Exclusão:** `profiles.delete().eq("id", ...)` (remove apenas a linha de `profiles`; o comentário no código nota que a exclusão em `auth.users` exigiria função de backend/Admin API).
- Após cada operação chama `fetchUsers()` para recarregar.

### Componentes principais
- Barra de busca (nome/e-mail), filtros por Time e por Perfil, botão "Novo Usuário".
- Diálogos de criação e edição (nome, e-mail, senha [`minLength=6`], select de Função e de Time). No diálogo de edição o e-mail é somente-leitura.
- Tabela paginada (6 itens/página) com colunas Nome, Time, E-mail, Função, Perfil de Acesso, Criado em, Ações (editar/excluir). Estado vazio com botão "Limpar todos os filtros".

### Fluxos e Interações
- Filtragem e paginação client-side (`useMemo`); paginação reseta para página 1 ao mudar filtros.
- Exclusão pede `confirm()` nativo antes de remover.
- Toasts de sucesso/erro via `useToast`.

### Regras de Negócio e Estados
- Auditoria: registra `USER_CREATED`, `USER_UPDATED`, `USER_DELETED` (via `logAction.mutate`).
- Rótulos de papel traduzidos na UI (`admin` → "Administrador", `user` → "Usuário Padrão"; outros nomes exibidos como estão).
- `getTeamLabel` resolve o rótulo do time a partir de `useTeams`, com fallback ao valor bruto.

### Pontos de Manutenção
- Depende da Edge Function `create-user` (fora deste diretório).
- Exclusão remove só `profiles`; o registro de autenticação pode permanecer no Supabase Auth (ver aviso na tela de Usuários Inativos).
- As colunas "Função" e "Perfil de Acesso" exibem ambas o `role` (informação redundante).

---

## Perfis de Acesso (Roles)

- **Rota:** `/admin/roles`
- **Arquivo-fonte:** [src/pages/admin/RolesManagement.tsx](../../src/pages/admin/RolesManagement.tsx)
- **Acesso:** admin (escrita RBAC restrita a admin via RLS); em teoria também `roles:manage`.

### Objetivo
Gerenciar perfis (`app_roles`) e suas permissões (`app_permissions` via `app_role_permissions`) — coração da configuração RBAC.

### Dados e Hooks
- Carrega em paralelo (`Promise.all`): `app_roles.select("*")`, `app_permissions.select("*")`, `app_role_permissions.select("*")`. Monta `rolePermissions` = mapa `roleId → [permissionId]`.
- [`useAuditLogs`](../../src/hooks/useAuditLogs.ts) (`logAction`).
- **Salvar perfil:** cria (`insert` em `app_roles`) ou atualiza (`update`); em seguida **sincroniza permissões** apagando todas as `app_role_permissions` do perfil e reinserindo as selecionadas.
- **Excluir perfil:** `app_roles.delete().eq("id", ...)` (bloqueado para `admin`/`user`).

### Componentes principais
- **Visão lista:** tabela de perfis com nome/nível (marca "Default System Admin"/"Default User Role"), descrição, contagem de permissões e ações (editar/excluir). Botão "Novo Perfil".
- **Visão formulário** (`view === "form"`): campos Nome e Descrição; permissões organizadas em `Accordion` por **categoria** → **recurso** → checkboxes de **ação**. Cada categoria mostra badge "Acesso Total"/"Parcial" e botão "Selecionar/Remover Todos".
- Dicionários de tradução: `resourceTranslations`, `actionTranslations`; agrupamento por categoria em `getCategory` (Comercial, Calendário, Conversão, Modelos Editor OrionTN, Administração, Implantação & Projetos, Relatórios & Arquivos, Dashboard, Outros).

### Fluxos e Interações
- Alterna entre lista e formulário por estado `view`.
- `togglePermission` / `toggleCategoryPermissions` gerenciam a seleção; envio salva e volta para a lista, recarregando os dados.

### Regras de Negócio e Estados
- Perfis padrão `admin` e `user` **não** podem ser excluídos nem ter o nome editado (campo `disabled`); tentativa de exclusão gera toast de erro.
- Exclusão pede `confirm()` alertando que usuários vinculados podem perder acesso.
- Auditoria: `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_DELETED`.

### Pontos de Manutenção
- Sincronização de permissões é "delete-all + reinsert"; falha parcial pode deixar o perfil sem permissões momentaneamente.
- Novos recursos precisam ser adicionados aos dicionários de tradução e a `getCategory`, senão caem em "Outros" e aparecem sem rótulo amigável.
- A associação usuário→perfil se dá pelo texto `profiles.role` = `app_roles.name`; renomear um perfil não atualiza `profiles.role` automaticamente.

---

## Configurações do Time / Equipes

- **Rota:** `/admin/teams-config`
- **Arquivo-fonte:** [src/pages/admin/TeamConfiguration.tsx](../../src/pages/admin/TeamConfiguration.tsx)
- **Acesso:** admin ou `users:manage`; em teoria `teams:manage`.

### Objetivo
CRUD das equipes (tabela `teams`) disponíveis para atribuição a usuários (usadas como filtro/atribuição em Gerenciamento de Usuários).

### Dados e Hooks
- [`useTeams`](../../src/hooks/useTeams.ts): query `teams.select("*")` ordenada por `label`; mutações `createTeam`/`updateTeam`/`deleteTeam` (insert/update/delete em `teams`), cada uma invalidando `queryKey ["teams"]` e emitindo toast.
- [`useAuditLogs`](../../src/hooks/useAuditLogs.ts) para registrar `TEAM_CREATED`/`TEAM_UPDATED`/`TEAM_DELETED`.

### Componentes principais
- Busca (label/value/descrição), botão "Nova Equipe", diálogo de criação/edição com campos **Nome** (`label`), **Identificador/Slug** (`value`) e **Descrição**.
- Tabela paginada (6/página) com Nome, Identificador (mono), Descrição e ações (editar/excluir).

### Fluxos e Interações
- `generateValue` gera automaticamente o slug a partir do nome (normaliza acentos, troca não-alfanuméricos por hífen) apenas na criação e se `value` estiver vazio.
- O campo Identificador fica `disabled` na edição (slug imutável após criação).
- Exclusão via `confirm()` nativo.

### Regras de Negócio e Estados
- Filtro e paginação client-side; reset de página ao buscar.
- Auditoria registrada no `onSuccess` de cada mutação.

### Pontos de Manutenção
- Excluir uma equipe não atualiza `profiles.team` dos usuários vinculados (referência por `value`).
- Título da tela é "Equipes" enquanto o item de menu é "Configurações do Time".

---

## Log de Auditoria

- **Rota:** `/admin/audit`
- **Arquivo-fonte:** [src/pages/admin/AuditLog.tsx](../../src/pages/admin/AuditLog.tsx)
- **Acesso:** admin ou `users:manage`; permissão conceitual `audit_logs:view`.

### Objetivo
Exibir o histórico de atividades e alterações do sistema (tabela `audit_logs`), de forma legível e pesquisável.

### Dados e Hooks
- [`useAuditLogs`](../../src/hooks/useAuditLogs.ts): query `audit_logs.select("*, profile:profiles(full_name, email)")` ordenada por `created_at` desc, **limite de 100** registros.
- O mesmo hook expõe `logAction` (mutation de insert em `audit_logs` com `user_id` do usuário atual), usado por outras telas para registrar eventos.

### Componentes principais
- Cabeçalho com busca (usuário/ação/detalhe/`user_id`).
- Tabela com Data/Hora, Usuário (`profile.full_name` ou "Sistema"), Ação (rótulo traduzido) e "Detalhes das Alterações".
- Paginação client-side (6/página).

### Fluxos e Interações
- `actionLabels` traduz códigos de ação para rótulos em pt-BR (projetos, conversão, aderência, deploy, homologação, usuários, configurações, comercial, arquivos, checklist, etc.).
- `formatLogDetails` monta uma frase legível a partir de `details` (projeto, perfil, usuário-alvo, campo alterado de/para, `updates`, nome de arquivo/item), com `translateValue` normalizando valores (`admin`→"Administrador", booleanos, status) e ocultando UUIDs.

### Regras de Negócio e Estados
- Somente leitura; a escrita ocorre indiretamente via `logAction` disparado por outras telas.
- Estado vazio e loading tratados; busca reseta a página.

### Pontos de Manutenção
- Limite fixo de 100 logs — histórico mais antigo não é paginado além disso.
- Novas ações precisam ser adicionadas a `actionLabels` para exibirem rótulo amigável (senão mostram o código bruto).

---

## Saúde dos Projetos (Configurações)

- **Rota:** `/admin/settings`
- **Arquivo-fonte:** [src/components/Admin/Settings/AdminSettings.tsx](../../src/components/Admin/Settings/AdminSettings.tsx)
- **Acesso:** admin ou `users:manage`; permissão conceitual `settings:manage`.

### Objetivo
Definir o tempo máximo (em dias) que um projeto pode permanecer em cada etapa antes de ser considerado "não saudável" — usado para indicadores de saúde de projetos.

### Dados e Hooks
- [`useAdminSettings`](../../src/hooks/useAdminSettings.ts):
  - `fetchSettings`: `settings.select("*").eq("key", "project_health_thresholds").single()` (ignora erro `PGRST116` = sem linha); fallback para `DEFAULT_HEALTH_SETTINGS`.
  - `updateHealthSettings`: `settings.upsert({ key: "project_health_thresholds", value, description, updated_at })`.
- Tabela `settings` criada em [20251219134154_create_settings_table.sql](../../supabase/migrations/20251219134154_create_settings_table.sql) (padrão chave/valor JSON).
- Defaults: infra 7, aderência 7, ambiente 5, conversão 10, implantação 15, pós 30 dias.

### Componentes principais
- Card "Saúde dos Projetos" com um `Input` numérico por etapa (`STAGE_LABELS`: infra, adherence, environment, conversion, implementation, post) e botão "Salvar Alterações".

### Fluxos e Interações
- `handleChange` converte o valor para inteiro e marca `hasChanges`; "Salvar" fica habilitado apenas quando há alterações; salva via upsert e emite toast (sonner).

### Regras de Negócio e Estados
- Configuração única e global (uma linha na `settings` sob a chave `project_health_thresholds`).
- Loading exibe "Carregando configurações...".

### Pontos de Manutenção
- O item de menu chama-se "Saúde dos Projetos" e aponta para `/admin/settings` (não há tela de "configurações" mais ampla — a rota é dedicada a esses thresholds).
- Adicionar nova etapa exige atualizar `STAGE_LABELS` e o consumidor da configuração.

---

## Gestão de Férias

- **Rota:** `/admin/vacations`
- **Arquivo-fonte:** [src/pages/admin/VacationManagement.tsx](../../src/pages/admin/VacationManagement.tsx)
- **Acesso:** admin ou `users:manage`; permissão conceitual `vacations:manage`.

### Objetivo
Cadastrar e gerenciar períodos de férias/ausência dos implantadores, bloqueando agendamentos no calendário durante esses intervalos.

### Dados e Hooks
- [`useVacations`](../../src/hooks/useVacations.ts): query em `implantador_vacations` ordenada por `start_date`; mutações `addVacation` (insert com `created_by` = usuário atual), `updateVacation` (update + `updated_at`), `deleteVacation` (delete). Todas invalidam `queryKey ["vacations"]` e emitem toast.
- O hook também expõe helpers de calendário: `checkVacationConflict`, `getVacationsForDateRange`, `getVacationsForImplantador` (consumidos por outras telas, não por esta).
- Lista de implantadores vem de `CALENDAR_MEMBERS` ([src/types/calendar](../../src/types/calendar.ts)).

### Componentes principais
- Cabeçalho + botão "Cadastrar Férias"; card de alerta explicando o bloqueio no calendário.
- Tabela de férias (Implantador com cor do membro, Período, Descrição, Status, Ações).
- Diálogo de criação/edição (select de implantador, datas início/fim, observações) e `AlertDialog` de confirmação de exclusão.

### Fluxos e Interações
- `handleMemberSelect` preenche `implantador_name`/`implantador_id` a partir de `CALENDAR_MEMBERS`.
- `getVacationStatus` deriva o status por data: "Em andamento" (hoje dentro do intervalo, badge vermelho), "Agendada" (futuro) ou "Concluída" (passado).
- Submit exige implantador, data início e data fim.

### Regras de Negócio e Estados
- Ausências cadastradas bloqueiam agendamentos do implantador no calendário durante o período (integração descrita no alerta e implementada por `checkVacationConflict`).
- Loading com spinner; estado vazio com call-to-action.

### Pontos de Manutenção
- Implantadores são fixos em `CALENDAR_MEMBERS` (não vêm de `profiles`/`teams`).
- Persistência na tabela `implantador_vacations`.

---

## Armazenamento do Sistema

- **Rota:** `/admin/storage`
- **Arquivo-fonte:** [src/pages/admin/SystemStorage.tsx](../../src/pages/admin/SystemStorage.tsx)
- **Acesso:** admin ou `users:manage`.

### Objetivo
Visão de consumo de Storage (arquivos) e Banco de Dados (PostgreSQL) do Supabase, com barras de progresso contra limites de referência.

### Dados e Hooks
- [`useStorageStats`](../../src/hooks/useAdminStats.ts) (`queryKey: ["admin-storage-stats"]`, `refetchInterval` de 5 min): RPCs `get_db_size` e `get_storage_size`, convertidas para MB.

### Componentes principais
- Dois cards: "Uploads (Storage API)" com limite de referência **50 GB** e "Banco de Dados (PostgreSQL)" com limite **5 GB (Plano Pro)**, cada um com `Progress`, valor formatado (MB/GB) e percentual.

### Fluxos e Interações
- Percentuais calculados sobre os limites; acima de 80% no storage, exibe alerta de atenção.
- Loading com spinner.

### Regras de Negócio e Estados
- Limites (50 GB / 5 GB) são constantes fixas no código (referência visual), não vêm de configuração.
- A própria tela descreve os números como visão "simulada".

### Pontos de Manutenção
- Depende das RPCs `get_db_size`/`get_storage_size`.
- Ajustar limites exige alterar constantes `storageLimitMB`/`dbLimitMB`.

---

## Usuários Inativos

- **Rota:** `/admin/inactive-users`
- **Arquivo-fonte:** [src/pages/admin/InactiveUsers.tsx](../../src/pages/admin/InactiveUsers.tsx)
- **Acesso:** admin ou `users:manage`.

### Objetivo
Listar contas sem qualquer atividade (login ou alteração) registrada nos últimos 30 dias.

### Dados e Hooks
- Estado local + Supabase direto (sem hook dedicado):
  - `profiles.select("id, full_name")` (todos os usuários);
  - `audit_logs.select("user_id, created_at")` ordenado desc, **limite 10.000** — mapeia a última atividade por usuário.
- Considera inativo quem não tem log ou cujo último log é anterior a 30 dias; calcula `daysInactive` e ordena do mais inativo para o menos.

### Componentes principais
- Cabeçalho, card "Lista de Inativos" com contagem, itens (avatar, nome, última ação / "Nunca acessou", dias inativo), paginação (4/página).
- Aviso final orientando que bloquear/excluir definitivamente deve ser feito na aba "Usuários" ou no Authentication do Supabase.

### Fluxos e Interações
- Somente leitura; botão "Gerenciar Perfil" existe mas está oculto (`hidden`).

### Regras de Negócio e Estados
- Critério de inatividade: sem registros recentes na `audit_logs` (janela de 30 dias).
- Loading com spinner; estado vazio ("Nenhum usuário inativo... Excelente!").

### Pontos de Manutenção
- O e-mail exibido é um **placeholder mockado** (`email@protegido.mock`) — o código nota que `profiles` normalmente não expõe e-mail sem RPC.
- Aproximação: apura atividade nos últimos 10.000 logs; em bases grandes pode não cobrir usuários muito antigos.

---

## TeamManagement (legado/descontinuado)

- **Rota:** sem rota ativa — o componente é `lazy`-importado em [src/App.tsx](../../src/App.tsx) mas **não** está mapeado em nenhuma `<Route>` do bloco `/admin`.
- **Arquivo-fonte:** [src/pages/admin/TeamManagement.tsx](../../src/pages/admin/TeamManagement.tsx)

### Objetivo
Antiga tela de "Gerenciamento de Equipe" (colaboradores). Exibe um `Alert` destrutivo **"Página Descontinuada"** orientando o uso de [`/admin/users`](#gerenciamento-de-usuários).

### Dados e Hooks
- [`useTeamMembers`](../../src/hooks/useTeamMembers.ts): a query agora lê de `profiles` (não mais de `team_members`). `addMember` lança erro instruindo a usar o Gerenciamento de Usuários; `updateMember` faz update parcial em `profiles`; `deleteMember` faz delete em `profiles`.

### Componentes principais
- Busca, diálogo de colaborador (nome, e-mail, cargo, switch Ativo), tabela e `AlertDialog` de exclusão.

### Regras de Negócio e Estados
- Todos os perfis são considerados `active: true` (o campo não persiste). Adição de membro está efetivamente desabilitada.

### Pontos de Manutenção
- Componente marcado para remoção; a fonte de verdade migrou para `profiles`/UserManagement. Manter apenas como referência histórica.

---

## TeamAreasManagement (componente auxiliar)

- **Rota:** sem rota ativa — `lazy`-importado em [src/App.tsx](../../src/App.tsx) porém **não** mapeado em `<Route>`.
- **Arquivo-fonte:** [src/pages/admin/TeamAreasManagement.tsx](../../src/pages/admin/TeamAreasManagement.tsx)

### Objetivo
"Gerenciamento de Áreas": atribuir membros da equipe a áreas de trabalho (implementation, conversion, commercial, support), com estatísticas por área.

### Dados e Hooks
- [`useTeamAreas`](../../src/hooks/useTeamAreas.ts):
  - `fetchAreas`: lê `team_areas` (ativas) para labels/cores;
  - `fetchMembers`: lê de `profiles` (`id, full_name, email, role, team`) e mapeia `profiles.team` → `TeamArea` via `mapTeamToArea` (ex.: `implementer`→`implementation`, `sd`/`infra`/`management`→`support`);
  - `updateMemberArea`: grava a área de volta em `profiles.team` (`mapAreaToTeam`);
  - `getAreaStats`: contagem por área. `createArea` insere em `team_areas`.
- Labels em `TEAM_AREA_LABELS` ([src/types/conversion](../../src/types/conversion.ts)).

### Componentes principais
- Cards de estatística por área, lista de "Áreas Disponíveis" (badges coloridos), tabela de membros com "Área Atual" e select de "Nova Área".

### Fluxos e Interações
- Alterações ficam pendentes em `pendingChanges` até "Salvar Alterações", que chama `updateMemberArea` para cada mudança e reporta sucesso/falha via toast (sonner).

### Regras de Negócio e Estados
- A "área" é derivada de `profiles.team` — não é um campo próprio; alterar a área reescreve `team`.

### Pontos de Manutenção
- Depende da tabela `team_areas` e do mapeamento `team ↔ area` em `useTeamAreas`. Como o componente não está roteado, é um utilitário/legado não exposto na navegação atual.
