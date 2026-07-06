# Módulo Comercial — Documentação por Tela

Documentação técnica das telas do grupo **Comercial** do Siplan HUB (React 18 + TypeScript + Vite + Supabase). O grupo concentra a gestão da carteira de clientes, contatos, bloqueios de infraestrutura, passagem de projetos para a Implantação e checklists estruturais enviados aos cartórios.

## Acesso ao grupo

Todas as rotas do grupo estão sob `ProtectedRoute` + `MainLayout` (ver [`src/App.tsx`](../../src/App.tsx), bloco `/*`), portanto exigem usuário autenticado. A entrada do grupo no menu lateral é condicionada à permissão `menu_comercial` / ação `view` (`hasPermission("menu_comercial", "view")` em [`src/components/Layout/AppSidebar.tsx`](../../src/components/Layout/AppSidebar.tsx), `canViewComercial`). As telas individuais não aplicam guarda de permissão adicional além da autenticação.

## Índice

1. [Painel de Clientes](#1-painel-de-clientes) — `/commercial/customers`
2. [Visão 360º do Cliente](#2-visão-360º-do-cliente) — `/commercial/client/:id`
3. [Timeline do Cliente](#3-timeline-do-cliente) — `/commercial/client/:id/timeline`
4. [Central de Bloqueios](#4-central-de-bloqueios) — `/commercial/blockers`
5. [Contatos & Clientes](#5-contatos--clientes) — `/commercial/contacts`
6. [Formulários de Implantação](#6-formulários-de-implantação) — `/commercial/deployment-forms`
7. [Checklists de Implantação](#7-checklists-de-implantação) — `/commercial/checklists`
8. [Editor de Perguntas do Checklist](#8-editor-de-perguntas-do-checklist) — `/commercial/checklists/questions`

### Fontes de dados compartilhadas

Várias telas consomem o hook central [`useCommercial`](../../src/hooks/useCommercial.ts), que expõe estas queries e mutations do Supabase:

| Chave de cache | Tabela / seleção | Observações |
|---|---|---|
| `commercial-clients` | `clients` (`select('*')`, ordenado por `name`) | — |
| `commercial-contacts` | `client_contacts` + join `clients(name)`, ordenado por `name` | — |
| `commercial-notes-all` | `commercial_notes` (`id, client_id, created_at, type, content, author_name`), ordem `created_at` desc | — |
| `commercial-projects` | `projects` + join `clients(id, name)`; filtra `is_deleted=false`, `is_archived=false` e exclui `global_status in ("done","canceled")` | Só projetos ativos |

Mutations do hook: `createClient` / `updateClient` (invalidam `commercial-clients`; `updateClient` também invalida `commercial-projects`), `createContact` / `updateContact` / `deleteContact` (invalidam `commercial-contacts`).

---

## 1. Painel de Clientes

- **Rota:** `/commercial/customers`
- **Arquivo-fonte:** [`src/pages/commercial/CommercialCustomers.tsx`](../../src/pages/commercial/CommercialCustomers.tsx)
- **Acesso:** Protegido (autenticado); grupo condicionado a `menu_comercial:view`.

### Objetivo
Visão geral da saúde da carteira de clientes. Lista clientes com indicador de status (Crítico / Atenção / Saudável), contagem de projetos ativos, quantidade de bloqueios e data da última atualização (UAT), com busca, filtros e paginação.

### Dados e Hooks
- `useCommercial()` → `clients`, `projectsWithClients`, `isLoadingClients`, `allCommercialNotes`.
- Não há mutations nesta tela (somente leitura + navegação).
- `getClientStats(clientId)` deriva por cliente, em memória:
  - `status`: baseado **apenas em recência** — `critical` se algum projeto tem ≥ 15 dias sem `updated_at`, `attention` se ≥ 7 dias, senão `healthy` (comentado como espelhando a lógica de `useProjectsList.ts`).
  - `activeProjects`: total de projetos do cliente.
  - `blockers`: projetos com qualquer `*_status === "blocked"` (`global`, `infra`, `adherence`, `environment`, `conversion`, `implementation`, `post`).
  - `lastUpdateUAT`: maior `updated_at` entre os projetos.
  - `lastAction`: nota comercial mais recente (`allCommercialNotes`) — calculada, mas não exibida como coluna principal.

### Componentes principais
- Tabela desktop (`Table`, componentes `ui/table`) e cards para mobile (`md:hidden`).
- Filtros: busca por nome (`Input`), `Select` de status geral, `Select` de projetos (`critical` / `has-blockers` / `no-projects`), `Select` de última interação (`7days` / `15days` / `30days` / `never`).
- `DropdownMenu` de ações por linha; `Badge` de status e de tag `Key Account` (badge "KA").
- Controles de paginação (`ChevronLeft`/`ChevronRight`) com `Select` de itens por página (5/10/25/50/100).

### Fluxos e Interações
- Clique no nome do cliente ou "Ver Detalhes (360º)" → navega para `/commercial/client/:id`.
- "Ver Timeline" no dropdown → `/commercial/client/:id?tab=timeline` (nota: a tela de destino é `ClientOverview`, que não lê o parâmetro `tab`).
- "Editar Cliente" está desabilitado (`disabled`).
- Card mobile clicável leva à visão 360º.
- Ordenação: prioridade por status (Crítico > Atenção > Saudável) e depois por `lastUpdateUAT` mais recente.
- `useEffect` reseta para a página 1 quando qualquer filtro ou `itemsPerPage` muda.

### Regras de Negócio e Estados
- Estado de carregamento: "Carregando painel de clientes...".
- Saúde do cliente é puramente por recência de atualização (não considera bloqueios diretamente no cálculo de `status`).
- Badge mobile usa rótulo "OL" para o estado saudável (aparente abreviação; desktop usa "Saudável").

### Pontos de Manutenção
- `getClientStats` é reexecutado várias vezes por render (filtro, ordenação, linhas) — potencial custo em carteiras grandes.
- O parâmetro `?tab=timeline` não é consumido pelo destino; para abrir a timeline real, o alvo deveria ser `/commercial/client/:id/timeline`.
- Thresholds de saúde (7/15 dias) estão embutidos (magic numbers).

---

## 2. Visão 360º do Cliente

- **Rota:** `/commercial/client/:id`
- **Arquivo-fonte:** [`src/pages/commercial/ClientOverview.tsx`](../../src/pages/commercial/ClientOverview.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Página de detalhe único do cliente ("360º"): cabeçalho com status e tags, cards de resumo (projetos ativos, bloqueios, em risco, dias sem atualização), contatos principais, projetos ativos com progresso, bloqueios ativos e um painel de notas/timeline com registro de nota comercial.

### Dados e Hooks
- `useCommercial()` → `clients`, `projectsWithClients`, `contacts`, `isLoadingClients`, `allCommercialNotes`, `updateClient`.
- `useParams` para `id`; o cliente é localizado por `clients.find(c => c.id === id)`.
- Derivações filtradas por `client.id`: `clientProjects`, `clientContacts`, `clientBlockers` (projetos com `infra_status === "blocked"` — simplificado), `clientNotes`.
- Status computado a partir de `health_score` dos projetos (`critical` / `warning`).
- **Mutation direta ao Supabase (sem hook):** `handleAddNote` faz `supabase.from("commercial_notes").insert(...)` com `type: "alignment"` e `author_name: "Comercial"`. **Não há invalidação de cache** — o código reconhece isso em comentário; a nova nota só aparece após recarregar/revalidar `commercial-notes-all`.
- `handleAddTag` usa `updateClient.mutateAsync({ id, tags: [...] })` (invalida `commercial-clients` e `commercial-projects`).

### Componentes principais
- Cabeçalho fixo (`sticky`) com `Building`, `Badge` de status, tags editáveis inline (`Input` + confirmação), `DropdownMenu` (Editar Cliente / Arquivar — sem handlers).
- 4 cards de KPI (`Activity`, `AlertTriangle`, `AlertCircle`, `Clock`); "S/ Atualização" usa `differenceInDays` (date-fns).
- Seções: Contatos Principais (até 4, com links `mailto:` e `tel:`), Projetos Ativos (até 3, barra de progresso por estágios concluídos), Bloqueios Ativos (condicional).
- Coluna direita: `Textarea` para nova nota + timeline vertical com notas e "eventos técnicos" (criação de projeto).

### Fluxos e Interações
- **Click-to-call / e-mail:** contatos exibem `<a href="tel:...">` ("Ligar") e `<a href="mailto:...">` ("Email").
- Botões de navegação: "Voltar para Painel" → `/commercial/customers`; "Contatos" → `/commercial/contacts`; "Bloqueios" → `/commercial/blockers`; card de projeto → `/projects?id=<projectId>`; "Resolver" bloqueio → `/commercial/blockers`.
- Progresso do projeto = percentual de estágios `done` entre `infra/adherence/environment/conversion/implementation` (5 estágios).

### Regras de Negócio e Estados
- "Cliente não encontrado" com link de volta caso `id` não exista.
- KPI "Projetos Ativos" exclui `global_status` em `done`/`canceled`.
- Bloqueios considerados apenas via `infra_status === "blocked"` (simplificação assumida no código).
- Eventos técnicos da timeline são apenas "Projeto iniciado" (marcados como mock para completude visual).

### Pontos de Manutenção
- `handleAddNote` não invalida `commercial-notes-all` (bug conhecido, documentado em comentário) — a nota não reflete sem refresh.
- `author_name` é fixo "Comercial" (deveria vir do usuário autenticado, conforme comentário).
- Ações do `DropdownMenu` (Editar/Arquivar) e "Editar Cliente" não têm implementação.

---

## 3. Timeline do Cliente

- **Rota:** `/commercial/client/:id/timeline`
- **Arquivo-fonte:** [`src/pages/commercial/CustomerTimeline.tsx`](../../src/pages/commercial/CustomerTimeline.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Histórico unificado, em ordem cronológica decrescente, de eventos comerciais (notas) e técnicos (criação de projeto, bloqueio ativo, previsão de go-live) de um cliente, com filtro por tipo de evento.

### Dados e Hooks
- `useCommercial()` → `clients`, `projectsWithClients`, `allCommercialNotes`, `isLoadingClients`.
- Constrói uma lista tipada `TimelineEvent[]` mesclando:
  - **Eventos comerciais** a partir de `clientNotes`; título mapeado por `note.type` (`meeting` → "Reunião Comercial", `call` → "Ligação", `email` → "E-mail", senão "Nota Comercial").
  - **Eventos técnicos** a partir de `clientProjects`: "Projeto Iniciado" (`created_at`), "Bloqueio Ativo" (`infra_status === "blocked"`, usando data atual como aproximação), "Previsão de Go-Live" (`go_live_date`).
- Ordenação por `date` desc; filtro por `typeFilter` (`commercial` / `technical` / `blocker`).

### Componentes principais
- Cabeçalho com botão voltar, `Select` de tipo de evento e botão "Nova Nota".
- Linha do tempo com marcadores por ícone/cor e cards (`Card`) por evento (`Badge` de tipo e de projeto, autor).

### Fluxos e Interações
- Botão voltar → `/commercial/client/:id`.
- "Nova Nota" → `/commercial/client/:id?tab=notes` (destino `ClientOverview` não consome `tab`).
- Estado `periodFilter` existe mas **não é aplicado** (apenas `typeFilter` filtra).

### Regras de Negócio e Estados
- "Carregando timeline..." enquanto `isLoadingClients`; "Cliente não encontrado" se `id` inválido.
- A descrição das notas é um placeholder fixo ("Conteúdo da nota (buscar detalhe completo se precisar)") — comentários no código indicam suposição de que o hook não trazia `content`; atualmente `useCommercial` **já seleciona `content`**, mas a tela ainda não o utiliza.
- Data do "Bloqueio Ativo" é `new Date()` (não há coluna de data do bloqueio).

### Pontos de Manutenção
- `periodFilter` está sem efeito — filtro de período incompleto.
- Descrição das notas comerciais deveria usar `note.content` (já disponível no hook).
- `author` das notas é fixo "Comercial".

---

## 4. Central de Bloqueios

- **Rota:** `/commercial/blockers`
- **Arquivo-fonte:** [`src/pages/commercial/CommercialBlockers.tsx`](../../src/pages/commercial/CommercialBlockers.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Priorizar e resolver pendências de **Infraestrutura** que travam os projetos. Exibe cards de projetos bloqueados, permite registrar observações comerciais (rich text) e marcar o bloqueio como resolvido.

### Dados e Hooks
- `useCommercial()` → `projectsWithClients`, `isLoadingProjects`.
- `useQueryClient` para invalidação; `useToast`.
- **Mutations diretas ao Supabase (sem hook dedicado):**
  - `handleSaveNotes`: `supabase.from("projects").update({ commercial_notes })` — não invalida cache (modal permanece aberto).
  - `handleMarkResolved`: adiciona tag "Resolvido por Comercial", seta `infra_status: "concluded"` e `updated_at`; depois `queryClient.invalidateQueries(["commercial-projects"])`.
- `getBlockers(project)` considera **apenas** o estágio `infra`: gera bloqueio quando `infra_status` é `blocked`, `reproved` ou `impediment`, capturando `infra_blocking_reason`, `infra_workstations_status` e `infra_server_status`.

### Componentes principais
- Grid de `Card` (bordas vermelhas) com dados do projeto, badge "NOVO", info de UAT e chamado, lista de bloqueios com detalhes de estações/servidor.
- `Dialog` de detalhe com grid de infos e `RichTextEditor` ([`ui/rich-text-editor`](../../src/components/ui/rich-text-editor.tsx)) para observações comerciais.
- Filtros: busca (`Input`) e `select` nativo de sistema; contador "Total".

### Fluxos e Interações
- Marcar como visto: `markAsViewed` persiste IDs em `localStorage` (`commercial_viewed_projects`); badge "NOVO" some depois.
- Abrir card → `handleOpenDetails` marca como visto e abre o `Dialog` carregando `commercial_notes` no editor.
- "Resolver" (no card ou no modal) → `handleMarkResolved`, com `confirm()` nativo.
- Ordenação por `updated_at` ascendente (mais desatualizados primeiro).

### Regras de Negócio e Estados
- Escopo intencionalmente restrito a Infraestrutura (comentários "User requested ONLY Infrastructure blockers").
- Estado vazio: "Tudo limpo!" com opção de limpar filtros.
- `handleMarkResolved` grava `infra_status: "concluded"` (valor distinto de `"done"` usado em outras telas — atenção a consistência de enum).

### Pontos de Manutenção
- `handleSaveNotes` não invalida `commercial-projects`; alterações de observação só refletem após revalidação.
- Uso de `any` e acesso dinâmico a `project[`${stage.key}_status`]` — frágil a renomeações de coluna.
- Persistência de "visto" é local ao navegador (não compartilhada entre usuários/dispositivos).

---

## 5. Contatos & Clientes

- **Rota:** `/commercial/contacts`
- **Arquivo-fonte:** [`src/pages/commercial/CommercialContacts.tsx`](../../src/pages/commercial/CommercialContacts.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Agenda unificada de contatos por cliente. Sidebar de clientes para filtrar, grid de cards de contato e CRUD completo de contatos via diálogo.

### Dados e Hooks
- `useCommercial()` → `clients`, `contacts`, `isLoadingContacts`, `createContact`, `updateContact`, `deleteContact`.
- Tabela Supabase: `client_contacts` (join com `clients(name)`); mutations invalidam `commercial-contacts`.
- Filtros em memória: busca por nome/email/nome do cliente, `select` de cargo (`roleFilter`), e filtro por cliente selecionado (`selectedClientId`).

### Componentes principais
- Sidebar `Card` com lista de clientes (`ScrollArea`) e efeito marquee em nomes longos via `getMarqueeStyle` ([`src/lib/marquee`](../../src/lib/marquee.ts), `TEXT_AREA_PX = 310`).
- Grid de cards de contato com `Avatar` (iniciais), `DropdownMenu` (Editar/Excluir).
- `Dialog` de formulário (`Select` de cliente, `Input` de nome/cargo/telefone/email, `Textarea` de observações).

### Fluxos e Interações
- "Novo Contato" → abre diálogo; se um cliente está selecionado, pré-preenche `client_id` e trava o `Select` (a menos que esteja editando).
- Editar → `handleOpenEdit` popula o formulário; Excluir → `confirm()` + `deleteContact`.
- Validação mínima: `name` e `client_id` obrigatórios (toast de erro caso ausentes).
- Contato exibe email e telefone (texto), com "Não informado" quando vazio.

### Regras de Negócio e Estados
- Estado vazio contextual: sugere "Criar contato para este cliente" quando há cliente selecionado.
- `uniqueRoles` deriva os cargos existentes para o filtro.

### Pontos de Manutenção
- Não há máscara/validação de telefone ou e-mail além do `type="email"`.
- Diferente da visão 360º, aqui email/telefone não são links clicáveis (sem click-to-call).

---

## 6. Formulários de Implantação

- **Rota:** `/commercial/deployment-forms` (aceita `?view=<formId>`)
- **Arquivo-fonte:** [`src/pages/commercial/DeploymentForms.tsx`](../../src/pages/commercial/DeploymentForms.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Formalizar a passagem de projeto **Comercial → Implantação**. Cria um formulário estruturado por sistema contratado, valida campos obrigatórios e gera um texto padronizado ("tramite de passagem") para colar no chamado do 0800.

### Dados e Hooks
- [`useDeploymentForms`](../../src/hooks/useDeploymentForms.ts) → `forms`, `isLoading`, `createForm`, `deleteForm`. Tabela Supabase `deployment_forms` (cache `deployment-forms`); `createForm` grava `created_by` (usuário) e `filled_at`; ambas mutations invalidam `deployment-forms` e emitem toasts.
- [`useProjectsV2`](../../src/hooks/useProjectsV2.ts) → `projects`, `updateProject` (para vincular a um projeto ativo e sincronizar dados).
- [`useAuth`](../../src/hooks/useAuth.ts) → `fullName` (pré-preenche `filled_by`).
- `useSearchParams` para abrir um formulário via `?view=<id>`.
- Tipo do payload: [`DeploymentFormData`](../../src/utils/deployment-template.ts); geração do texto por `generateDeploymentTemplate`.

### Componentes principais
- Dois modos: **list** (cards com barra de cor por sistema, stats, busca, exclusão) e **create** (formulário completo).
- [`DeploymentFormFields`](../../src/components/commercial/DeploymentFormFields.tsx) — seções: Dados Administrativos, Escopo Contratado, Perfil do Projeto, Datas e Agenda, Contatos do Cartório, Editor de Modelos (só Orion TN), Condições Especiais e Observações.
- Combobox pesquisável (`Popover` + `Command`) para vincular a um projeto ativo.
- `OutputDialog`: exibe o texto gerado em `<pre>` com botão "Copiar Texto".

### Fluxos e Interações
- **Vincular a projeto ativo:** ao selecionar no combobox, autopreenche `client_name`, `ticket_number`, `contracted_system`. Projetos elegíveis: `globalStatus === "in-progress"` e estágio `post` não `done`/`in-progress`.
- **Salvar e gerar** (`handleSave`): valida com `validateForm` (Set de erros), rola até o primeiro erro (`data-field-error`), e ao sucesso:
  - Sincroniza de volta ao projeto vinculado via `updateProject`: `soldHours` (de `hours_presencial`), `products` (mapeando módulos LCW/SGA/On Hand/Website/Editor de Modelos/Outro) e `legacySystem`.
  - Gera o texto (`generateDeploymentTemplate`) e abre `OutputDialog`.
- `?view=<id>` abre o texto de um formulário salvo; `handleView` também seta o query param; fechar limpa o param.
- Copiar → `navigator.clipboard.writeText` + toast "Copiado!".
- Excluir card → `confirm()` + `deleteForm.mutate`.

### Regras de Negócio e Estados
- Regra de negócio destacada na UI: **1 formulário por sistema contratado**.
- Validação obrigatória inclui: identificação, dados administrativos (OP, pedido, data, DocuSign, vendedor), escopo (modalidade, horas presenciais; horas remotas se modalidade Remoto/Misto), custos de deslocamento/hospedagem, perfil (tipo de implantação, sistema legado), urgência e `filled_by`.
- Campos do Editor de Modelos só são obrigatórios/visíveis para `Orion TN`; ao trocar de sistema, `module_editor_modelos` é zerado.
- Sistemas suportados: `Orion TN`, `Orion PRO`, `Orion REG`, `WEB RI`, `Outro` (com campo livre).
- Níveis de urgência: `normal` / `high` / `critical` (com ícones e justificativa).

### Pontos de Manutenção
- `deployment_forms` é acessada com cast `as any` no hook (tabela fora dos tipos gerados do Supabase).
- Revalidação inline dispara a cada mudança somente após a primeira tentativa de submit (`submitted`).
- O texto gerado é sensível à formatação (template ASCII em `deployment-template.ts`); mudanças de campos exigem sincronizar o gerador e o `validateForm`.

---

## 7. Checklists de Implantação

- **Rota:** `/commercial/checklists` (aceita `?view=<checklistId>`)
- **Arquivo-fonte:** [`src/pages/commercial/CommercialChecklists.tsx`](../../src/pages/commercial/CommercialChecklists.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Gerar e gerenciar checklists estruturais (dados da serventia) enviados aos clientes via **link público**, acompanhar status (Aguardando / Respondido) e visualizar as respostas.

### Dados e Hooks
- [`useCommercialChecklists`](../../src/hooks/useCommercialChecklists.ts) → `checklists`, `isLoading`, `createChecklist`, `deleteChecklist` (também expõe `submitChecklist`, usado pela página pública).
  - Tabela `commercial_checklists` (cache `commercial-checklists`) com join `projects:project_id(...)` mapeado para camelCase.
  - `createChecklist(projectId)`: busca `system_type` do projeto, procura template ativo em `form_templates` (`kind="commercial_checklist"`, `system_type`, `is_active=true`), e insere o checklist com `status: "pending"`, `responses: {}`, `template_id`. Invalida `commercial-checklists` e `project-commercial-checklist`.
  - `deleteChecklist(id)`: remove e invalida os mesmos caches.
- [`useProjectsV2`](../../src/hooks/useProjectsV2.ts) → `projects` para o seletor.
- `useQuery` (`viewChecklistTemplate`): busca o template (`form_templates`) do checklist aberto para renderizar as respostas dinâmicas.
- Migrations relacionadas: [`create_commercial_checklists`](../../supabase/migrations/20260602141500_create_commercial_checklists.sql), [`add_template_id_to_checklists`](../../supabase/migrations/20260602165900_add_template_id_to_checklists.sql), [`public_checklist_rls_policies`](../../supabase/migrations/20260602170800_public_checklist_rls_policies.sql), e seeds de template ([Orion TN](../../supabase/migrations/20260601145000_seed_orion_tn_template.sql), [Orion PRO](../../supabase/migrations/20260618111500_seed_orion_pro_template.sql), [Orion REG](../../supabase/migrations/20260618104500_seed_orion_reg_template.sql)).

### Componentes principais
- Header com botão "Editar Perguntas" (→ `/commercial/checklists/questions`) e "Novo Checklist".
- Cards por checklist (barra de status verde/azul), stats (Total / Aguardando / Respondidos), busca.
- `Dialog` de criação com combobox pesquisável (`Popover` + `Command`).
- `Dialog` de visualização: renderiza respostas via [`FormRenderer`](../../src/components/FormRenderer/FormRenderer.tsx) (modo `readonly`) quando há `template_id`; caso contrário, cai num layout estático legado por seções (Identificação, Responsável, Estrutura Física, Setores, Colaboradores).

### Fluxos e Interações
- **Geração de link público:** cada checklist gera `${window.location.origin}/public/checklist/<id>` — botões "Copiar Link" (`navigator.clipboard`) e ícone de abrir em nova aba (`/public/checklist/<id>`).
- Criar: exige projeto selecionado; projetos elegíveis são `in-progress`, sem estágio `post` `done`/`in-progress` e **sem checklist já existente** (`projectsWithChecklist`).
- `?view=<id>` abre o diálogo de respostas; `handleOpenView`/`handleCloseView` sincronizam o query param.
- Excluir → `confirm()` alerta que o cliente não poderá mais responder.

### Regras de Negócio e Estados
- Status: `pending` (Aguardando) / `submitted` (Respondido). Card "Respondido" mostra "Ver Respostas"; "Aguardando" mostra copiar link / abrir formulário.
- Um projeto só pode ter um checklist (a UI filtra os que já têm; o hook alerta em erro sobre duplicidade).
- Se o projeto não tem `system_type`, o hook assume `"Orion TN"` como fallback ao buscar template.

### Pontos de Manutenção
- `commercial_checklists` é acessada com cast `as any` (fora dos tipos gerados).
- Coexistência de renderização dinâmica (`FormRenderer` + template) e layout estático legado por chaves fixas em `responses` (`fullname`, `role`, `floors`, `key_people`, etc.) — manter os dois caminhos alinhados às perguntas ativas.
- RLS pública permite submissão anônima do checklist (ver migration de políticas).

---

## 8. Editor de Perguntas do Checklist

- **Rota:** `/commercial/checklists/questions`
- **Arquivo-fonte:** [`src/pages/commercial/EditarChecklistComercial.tsx`](../../src/pages/commercial/EditarChecklistComercial.tsx)
- **Acesso:** Protegido (autenticado).

### Objetivo
Editor visual das perguntas do checklist comercial por sistema. Permite customizar, pré-visualizar e publicar novas versões do template enviado aos clientes.

### Dados e Hooks
- A tela é um wrapper fino que renderiza [`ChecklistEditor`](../../src/components/checklist/ChecklistEditor.tsx) com `kind="commercial_checklist"` e um conjunto `DEFAULT_QUESTIONS` (14 perguntas: nome, cargo, e-mail, telefones, andares, setores, colaboradores, adaptabilidade, etc.).
- `ChecklistEditor` usa [`useFormTemplates`](../../src/hooks/useFormTemplates.ts): `useFormTemplates(kind, system)`, `useActiveTemplate(kind, system)`, `usePublishTemplate()`.
  - Templates persistem em `form_templates` (com `schema_json`, `ui_json`, `version`, `is_active`, `notes`).
  - Publicar cria uma nova versão ativa via `usePublishTemplate` (compilando as perguntas visuais em JSON Schema / UI Schema).

### Componentes principais
- `ChecklistEditor` (genérico, reutilizado por adesão/homologação/comercial), com tema violeta para `commercial_checklist`.
- [`VisualQuestionBuilder`](../../src/components/FormRenderer/VisualQuestionBuilder.tsx) para montar as perguntas; conversores `convertVisualToJSONSchema` / `convertVisualToUISchema` / `parseJSONSchemaToVisual`.
- `Select` de sistema (`Orion TN`, `Orion PRO`, `Orion REG`, `Modelos TN`, `WebRI`), diálogos de pré-visualização (`FormRenderer` ao vivo) e de histórico de versões.

### Fluxos e Interações
- Trocar de sistema recarrega as perguntas do template ativo (ou `DEFAULT_QUESTIONS` se não houver).
- "Visualizar Formulário" abre preview ao vivo com `FormRenderer` (dados de teste em `previewData`).
- "Histórico" lista versões publicadas; "Carregar" traz as perguntas de uma versão para o editor.
- "Publicar Checklist" valida (mínimo 1 pergunta) e chama `publishMutation` com `notes` de versão; modo tela cheia disponível.
- Botão voltar → `backPath` `/commercial/checklists`.

### Regras de Negócio e Estados
- Templates são versionados por `kind` + `system_type`; a publicação define a nova versão como ativa.
- `DEFAULT_QUESTIONS` é o fallback quando não existe template ativo para o sistema.

### Pontos de Manutenção
- A lista de sistemas no editor (`SYSTEM_TYPES` em `ChecklistEditor`) difere ligeiramente da lista em `DeploymentForms` (`Modelos TN`/`WebRI` vs. `WEB RI`) — atenção a divergências de rótulos entre telas.
- Perguntas padrão vivem no código (`DEFAULT_QUESTIONS`); o schema real ativo vem do banco — alterações precisam ser publicadas para valer no link público.
