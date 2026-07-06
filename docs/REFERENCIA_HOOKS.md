# 🪝 Referência de Hooks

Catálogo dos custom hooks em [`src/hooks/`](../src/hooks/). A maioria encapsula acesso ao Supabase via **TanStack React Query v5**, seguindo o padrão de **Split Query** (listagem leve vs. detalhes sob demanda) descrito no [Manual do Desenvolvedor](MANUAL_DESENVOLVEDOR.md) e no [GEMINI.md](../GEMINI.md).

> Regra de ouro: **mutações devem invalidar as query keys corretas** (ex.: `['projectsList']` e `['projectDetails', id]`) no `onSuccess` para manter a UI sincronizada.

---

## Projetos (padrão Split Query)

| Hook | Arquivo | Responsabilidade |
|---|---|---|
| `useProjectsList` | [useProjectsList.ts](../src/hooks/useProjectsList.ts) | Listagem **leve** de projetos (id, cliente, status, healthScore). Usar em grids/dashboards/tabelas. Nunca traz `stages`/`notes`. |
| `useProjectDetails` | [useProjectDetails.ts](../src/hooks/useProjectDetails.ts) | Detalhes **pesados** de um projeto (lazy, `enabled: !!projectId`). Usar em modais/páginas internas. |
| `useProjectsV2` | [useProjectsV2.ts](../src/hooks/useProjectsV2.ts) | Mutações de projeto (criar/atualizar). Fonte das invalidações de cache. |
| `useProjectForm` | [useProjectForm.ts](../src/hooks/useProjectForm.ts) | Estado do formulário de projeto + integração com `useAutoSave`. |
| `useProjectFiles` | [useProjectFiles.ts](../src/hooks/useProjectFiles.ts) | Upload/leitura/remoção de anexos (Storage + `project_files`). |
| `useProjectFormResponse` | [useProjectFormResponse.ts](../src/hooks/useProjectFormResponse.ts) | Respostas de formulário do projeto (aderência/infra), dirige status via verdict. |
| `useAutoSave` | [useAutoSave.ts](../src/hooks/useAutoSave.ts) | Autosave com debounce para campos editáveis. |

## Conversão e Implantação

| Hook | Arquivo | Responsabilidade |
|---|---|---|
| `useConversionQueue` | [useConversionQueue.ts](../src/hooks/useConversionQueue.ts) | Fila de conversão. |
| `useConversionEngines` | [useConversionEngines.ts](../src/hooks/useConversionEngines.ts) | Engines de conversão e disponibilidade. |
| `useConversionPosts` | [useConversionPosts.ts](../src/hooks/useConversionPosts.ts) | Posts/etapas de conversão. |
| `useHomologationEvents` | [useHomologationEvents.ts](../src/hooks/useHomologationEvents.ts) | Eventos de homologação. |
| `useFormTemplates` | [useFormTemplates.ts](../src/hooks/useFormTemplates.ts) | Templates de formulário (aderência, infra, OrionTN/Reg/Pro). |
| `useDeploymentForms` | [useDeploymentForms.ts](../src/hooks/useDeploymentForms.ts) | Formulários de implantação. |

## Comercial

| Hook | Arquivo | Responsabilidade |
|---|---|---|
| `useCommercial` | [useCommercial.ts](../src/hooks/useCommercial.ts) | Contatos, clientes, bloqueadores, notas comerciais. |
| `useCommercialChecklists` | [useCommercialChecklists.ts](../src/hooks/useCommercialChecklists.ts) | Checklists comerciais (inclui link público). |
| `usePublicChecklist` | [usePublicChecklist.ts](../src/hooks/usePublicChecklist.ts) | Acesso público a checklist via id (anon key + RLS). |

## Timeline / Calendário / Roadmap

| Hook | Arquivo | Responsabilidade |
|---|---|---|
| `useTimeline` | [useTimeline.ts](../src/hooks/useTimeline.ts) | Linha do tempo do projeto/cliente. |
| `useTimelineEvents` | [useTimelineEvents.ts](../src/hooks/useTimelineEvents.ts) | Eventos de `timeline_events` (calendário/agenda). |
| `useNotifications` | [useNotifications.ts](../src/hooks/useNotifications.ts) | Notificações do usuário. |

## Administração / Auth / RBAC

| Hook | Arquivo | Responsabilidade |
|---|---|---|
| `useAuth` | [useAuth.ts](../src/hooks/useAuth.ts) | Sessão/usuário (consome `AuthContext`). |
| `usePermissions` | [usePermissions.ts](../src/hooks/usePermissions.ts) | RBAC no front — espelha `has_permission()`. |
| `useAdminStats` | [useAdminStats.ts](../src/hooks/useAdminStats.ts) | Estatísticas do dashboard admin. |
| `useAdminSettings` | [useAdminSettings.ts](../src/hooks/useAdminSettings.ts) | Configurações globais (`settings`). |
| `useAuditLogs` | [useAuditLogs.ts](../src/hooks/useAuditLogs.ts) | Logs de auditoria. |
| `useActivityLog` | [useActivityLog.ts](../src/hooks/useActivityLog.ts) | Registro de atividade (ver `services/activityLogger.ts`). |
| `useTeams` | [useTeams.ts](../src/hooks/useTeams.ts) | Times. |
| `useTeamMembers` | [useTeamMembers.ts](../src/hooks/useTeamMembers.ts) | Membros de time. |
| `useTeamAreas` | [useTeamAreas.ts](../src/hooks/useTeamAreas.ts) | Áreas funcionais de times. |
| `useVacations` | [useVacations.ts](../src/hooks/useVacations.ts) | Gestão de férias/ausências. |

## KPIs e Utilitários

| Hook | Arquivo | Responsabilidade |
|---|---|---|
| `useKPIs` | [useKPIs.ts](../src/hooks/useKPIs.ts) | KPIs operacionais (SLA, tempo médio, carga). |
| `useDebounce` | [use-debounce.ts](../src/hooks/use-debounce.ts) | Debounce de valores. |
| `useIsMobile` | [use-mobile.tsx](../src/hooks/use-mobile.tsx) | Breakpoint mobile. |
| `useTheme` | [use-theme.ts](../src/hooks/use-theme.ts) | Tema dark/light (next-themes). |
| `useToast` | [use-toast.ts](../src/hooks/use-toast.ts) | Toasts (shadcn/Sonner). |

---

## Stores Zustand

| Store | Arquivo | Uso |
|---|---|---|
| `calendarStore` | [calendarStore.ts](../src/stores/calendarStore.ts) | Estado do calendário (drag & drop, camadas). Ver [CalendarContext.md](CalendarContext.md). |
| `filterStore` | [filterStore.ts](../src/stores/filterStore.ts) | Filtros globais de listagens. |
| `projectStore` | [projectStore.ts](../src/stores/projectStore.ts) | Estado de UI de projetos. |

## Contexto

| Contexto | Arquivo | Uso |
|---|---|---|
| `AuthContext` | [AuthContext.tsx](../src/contexts/AuthContext.tsx) | Provider de autenticação, consumido por `useAuth` e `ProtectedRoute`. |
