# CLAUDE.md — Siplan Hub

## Idioma (obrigatório)

**Todas as interações são obrigatoriamente em Português do Brasil (PT-BR)** — respostas, explicações, resumos, mensagens de commit e comentários de PR. Termos técnicos, nomes de símbolos, caminhos de arquivo, comandos e trechos de código permanecem em inglês, verbatim. Não traduza identificadores do código.

---

Guia para agentes. Objetivo: acertar de primeira gastando o mínimo de contexto. Leia as regras de eficiência antes de abrir arquivos.

## O que é

App de gestão de projetos de implantação de sistemas para cartórios. Frontend React + TypeScript + Vite + Supabase (Postgres/Auth/RLS/Storage). Um worker separado (`vm-worker/`) roda em VM, consome filas no Supabase e executa Claude headless para gerar modelos e textos com IA. Docs em português; código em inglês.

## Arquitetura em uma frase

Tudo orbita **um tipo de domínio** — `ProjectV2` — cuja propriedade `stages` compõe um pipeline de **7 estágios**, renderizado por **um orquestrador** (`StepsTab.tsx`) e persistido por **um transformador** (`project-transformers.ts`).

### O hub: `src/types/ProjectV2.ts`
- Tipo central (~517 linhas, ~30 tipos exportados), **importado por ~85 módulos**. É a espinha dorsal — mudar um campo repercute em Dashboard, Reports, ProjectManagement, Calendar, Kanban e na engine de previsibilidade.
- `ProjectV2.stages` = `{ infra, adherence, environment, conversion, modelosEditor?, implementation, post }`. Cada estágio é um `*StageV2` próprio e compartilha o formato `{ status, responsible, startDate, endDate, ... }` (`StageStatus`).
- Também define os contratos worker: `ModelGenerationJob`, `DtcAiJob`, `ModelWorkerStatus`.
- **Não leia o arquivo inteiro.** Use `graphify explain "ProjectV2"` ou leia só o intervalo do tipo que interessa.

### O orquestrador: `src/components/ProjectManagement/Tabs/StepsTab.tsx`
Renderiza os 7 estágios como cards colapsáveis; `updateStage(key, u)` muta `ProjectV2.stages[key]`.

| # | Estágio (`stages.key`) | Componente | Tipo · subsistemas |
|---|---|---|---|
| 1 | `infra` | `InfraStageForm` | `InfraStageV2` · `ServerInfo`/`WorkstationInfo` · `infra-validation.ts` · notifyComercial |
| 2 | `adherence` | `AdherenceStageForm` | `AdherenceStageV2` · `FormRenderer` (questionário JSONSchema) |
| 3 | `conversion` | `ConversionStageForm` | `ConversionStageV2` · fila de conversão (Orion TN) · ConversionPostFeed/Drawer · useConversionEngines/Issues (**estágio mais largo**) |
| 4 | `environment` | `EnvironmentStageForm` | `EnvironmentStageV2` · `RemoteAccessItem` |
| 5 | `modelosEditor?` | `ModelosEditorWorkspace` | `ModelosEditorStageV2` · **worker** · opcional |
| 6 | `implementation` | `ImplementationStageForm` | `ImplementationStageV2` · `ImplementationPhaseForm` (phase1/phase2) · "Gerar com IA" · **worker** |
| 7 | `post` | `StageCard` + `PostObservations` | `PostStageV2` · `RichContent` · editor Lexical · melhorar-texto IA · **worker** |

- **Ordem de exibição ≠ ordem de tipo/persistência.** UI mostra conversion (3) antes de environment (4); o tipo e o transformador rodam `environment → conversion`. Rótulos/numeração mudam por tipo de projeto (`isOrionTN`, `isModelosTN`).

### A persistência: `src/utils/project-transformers.ts`
Ponto único onde domínio encontra banco. `mapInfra/Adherence/Environment/Conversion/Implementation/ModelosEditor/Post Stage()` → linha Supabase. Alterou um `*StageV2`? O `mapXStage()` correspondente e `src/integrations/supabase/types.ts` provavelmente também mudam. Coberto por `src/test/project-transformers.test.ts`.

### Fronteira da VM Worker (`vm-worker/src/index.ts`)
Runtime separado — **o front nunca o chama**, comunica só por filas no Supabase:
- `model_generation_jobs` ← `useModelGenerationJobs` (estágio 5)
- `dtc_ai_jobs` ← `useDtcAiJobs` (estágio 6, "Gerar com IA") e melhorar-texto (estágio 7)
- Ciclo: `claimOneJob()` (`FOR UPDATE SKIP LOCKED`) → Claude headless (stream-json) → grava `progress_log` → `sendHeartbeat()` (`model_worker_heartbeat`, selo online/offline).
- **Chamados 0800** (`chamadosSync.ts`, sem Claude): espelha a view `vw_2026_ChamadosTodosStatus` do SQL Server interno (Ellevo) em `chamados_0800` a cada 5 min; pedido em `chamados_sync_requests` (botão do card de Pós) dispara sync imediato via Realtime. Vínculo projeto↔cliente: `projects.ticket_number` = chamado de origem → `IDCliente`. UI: `PostChamados0800` + `useChamados0800` (estágio 7). Ver `vm-worker/README.md` §chamados.
- **Análise do pós** sobre o espelho: `chamadosClassify.ts` gera `tema_ia` por chamado (haiku, fila de menor prioridade) e o job `pos_parecer` (dtc_ai_jobs) escreve parecer qualitativo. Front: aba `PosImplantacaoTab` (por projeto) e página `PosPanorama` (`/dashboard/pos-implantacao`, recurso RBAC `pos_panorama`) para recorrência de temas entre cartórios.

### Cross-cutting
`src/lib/predictability-utils.ts` — `stageReadiness` / `identifyBottleneck` calculados genericamente sobre os 7 estágios (dependem do formato uniforme de estágio).

## Mapa de diretórios

```
src/
  types/ProjectV2.ts        modelo de domínio (hub)
  components/
    ProjectManagement/      formulários de estágio, StepsTab, ModelosEditor, PostObservations
    Dashboard/ Reports/     leem ProjectV2 (tabelas, charts, KPIs)
    ui/                     shadcn/ui (Button, Card, Badge, Dialog...)
  hooks/                    use*.ts — acesso a dados Supabase por feature
  utils/project-transformers.ts   domínio ↔ linha do banco
  integrations/supabase/    client.ts + types.ts (tipos gerados)
  stores/                   zustand (calendarStore, filterStore, projectStore)
  pages/ layouts/ contexts/ constants/ services/
vm-worker/                  worker Node em VM (filas de IA)
supabase/migrations/        migrations SQL + functions (edge)
```

## Stack e convenções

- **React 18 + TS strict + Vite.** Alias `@/*` → `src/*`. UI = **shadcn/ui + Tailwind**; `cn()` (`src/lib/utils`) é o merge de classes (usado em quase tudo — normal ser god node).
- **Dados Supabase por hooks** (`use*.ts`), não fetch solto em componentes. Client em `src/integrations/supabase/client.ts`.
- **Formulários de estágio isolados** em `ProjectManagement/Forms/StageForms/` — edite um sem tocar nos outros.
- Drag-and-drop: `@dnd-kit` / `@hello-pangea/dnd`. Rich text: Lexical. PDF: jspdf/html2canvas.

## Permissões (RBAC) — obrigatório ao criar tela/rotina

Controle de acesso em 5 camadas que precisam concordar: catálogo (`src/constants/permissions.ts`) → menu (`menuItems.ts` + `AppSidebar.tsx`) → guarda de rota (`RequirePermission` no `App.tsx`) → gate de ação (`usePermissions().hasPermission`) → **RLS no banco** (única defesa real; as outras 4 são só UI). Doc completo: **`docs/PERMISSOES_RBAC.md`** — leia antes de mexer.

**Ao adicionar uma TELA nova, faça os 5 passos (pular um deixa buraco silencioso):**
1. Recurso em `permissions.ts` (`PERMISSION_RESOURCES`), só com as `actions` que vai aplicar de fato.
2. Migration em `supabase/migrations/` inserindo em `app_permissions` (`ON CONFLICT DO UPDATE`); conceda ao `admin` **e ao perfil `user`** o que o `user` já podia — senão trava a equipe no deploy. **A tela `/admin/roles` lista o que vem do banco, não do código: sem migration, o checkbox não aparece.**
3. `permissionKey` no `menuItems.ts` + gate no `AppSidebar.tsx` (`can(...)` e lista `primeiraRota`).
4. `<RequirePermission resource="...">` na rota do `App.tsx`.
5. Gate de ação na tela: esconder criar/excluir, desabilitar editar, `if (!canX) return` no handler.

**Regras invioláveis:**
- Só declare uma ação (`create/edit/delete/execute/manage`) se houver enforcement real. Checkbox sem efeito mente para quem configura o perfil.
- Permissão nova nasce **permissiva** (concedida a quem já usava) e é restringida de propósito pelo admin. Nunca restrinja em silêncio no deploy — foi o que trancou 22 pessoas em 15/07.
- RLS: **nunca `TO public`** (inclui `anon`, e a chave anon está no bundle público). Use `TO authenticated`. Escrita sensível: `USING (has_permission(auth.uid(),'<recurso>','<ação>'))`.
- Edge function privilegiada valida com a RPC `has_permission`, não com `role='admin'`.
- Antes de aplicar policy em produção: ensaie em `begin ... rollback` com `set local role` (ver doc §5). E **não rode `supabase db push`** (histórico da CLI vazio; replayaria 60+ migrations).
- Verificação: `npm test` inclui `rls-invariants.test.ts`, que roda contra o banco (precisa `SUPABASE_DB_URL` no `.env`) e pega menu órfão, escrita/leitura anônima e perfil sem tela.

## Regras estritas (economia de tokens e tempo)

1. **Grafo antes de grep.** `graphify-out/graph.json` existe — para "onde/o que/como", rode `graphify query "..."`, `graphify explain "<símbolo>"` ou `graphify path "<A>" "<B>"` antes de varrer fonte. Retorna subgrafo pequeno. `GRAPH_REPORT.md` só para visão macro.
2. **Nunca leia `ProjectV2.ts` inteiro** (nem `project-transformers.ts` inteiro). Peça o símbolo/intervalo específico. São arquivos-hub grandes.
3. **`vite build` NÃO faz typecheck** — passa com erros de tipo. Para validar tipos rode `npx tsc --noEmit`. Antes de concluir mudança não-trivial: `npm run lint` + `npm test` (vitest) + `npx tsc --noEmit`.
4. **Tabela Supabase nova não entra sozinha em `types.ts`.** Ao adicionar/alterar tabela: crie migration em `supabase/migrations/`, e atualize `src/integrations/supabase/types.ts` manualmente (não regenerado no build). Sem isso o front não enxerga a tabela com tipo.
5. **Mudou um `*StageV2`?** Ajuste em conjunto: o `mapXStage()` em `project-transformers.ts`, o `*StageForm`, e `types.ts` se for coluna nova. Rode `project-transformers.test.ts`.
6. **Escopo do grafo = `src` + `vm-worker` + `supabase`.** Docs de skills (`.agent/`, `.claude/`, `.codex/`) ficam fora — não são código do app. Após mudar código: `graphify update .`.
7. **Commits/push só como `BrunoHF04`.** NÃO adicionar trailer `Co-Authored-By: Claude`. Não commitar/pushar sem pedido explícito.

## Comandos

```bash
npm run dev            # Vite dev server
npm run build          # build produção (NÃO typa)
npm run lint           # eslint
npm test               # vitest run
npx tsc --noEmit       # typecheck manual (rode você mesmo)
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
