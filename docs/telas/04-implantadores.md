# Módulo Implantadores — Documentação por Tela

Documentação técnica do grupo **Implantadores** do Siplan HUB (React 18 + TS + Vite + Supabase). Este módulo concentra a gestão operacional das implantações: customização de formulários de aderência, consulta de aderências finalizadas, homologação de conversões, roteiro de treinamento e o Documento de Transição de Conhecimento (DTC).

Todas as telas são registradas em [`src/App.tsx`](../../src/App.tsx) via lazy-loading e ficam sob o layout autenticado (`MainLayout`). O item de menu do grupo é controlado pela permissão `menu_implantadores:view` em [`src/components/Layout/AppSidebar.tsx`](../../src/components/Layout/AppSidebar.tsx).

## Índice

1. [Painel de Implantadores (hub)](#1-painel-de-implantadores-hub)
2. [Editor de Formulário de Aderência](#2-editor-de-formulário-de-aderência)
3. [Aderências Finalizadas](#3-aderências-finalizadas)
4. [Homologação de Conversões](#4-homologação-de-conversões)
5. [Roteiro de Treinamento (Placeholder)](#5-roteiro-de-treinamento-placeholder)
6. [Documento de Transição de Conhecimento — DTC](#6-documento-de-transição-de-conhecimento--dtc)
7. [Relação com telas externas ao módulo](#7-relação-com-telas-externas-ao-módulo)

---

## 1. Painel de Implantadores (hub)

- **Rota:** `/implantadores`
- **Arquivo-fonte:** [Implantadores.tsx](../../src/pages/implantadores/Implantadores.tsx)
- **Acesso:** Rota autenticada. A tela sempre renderiza, mas os cards que exigem gestão de templates são desabilitados quando o usuário não tem a permissão `templates:manage`.

### Objetivo
Página inicial (dashboard/hub) do módulo. Apresenta um banner e uma grade de 4 cards que dão acesso às quatro áreas: Análise de Aderência, Homologação de Conversões, Roteiro de Treinamento e Documento de Transição.

### Dados e Hooks
- `usePermissions()` → `hasPermission("templates", "manage")` define `canManageTemplates`.
- Não faz nenhuma query Supabase; é puramente navegacional.

### Componentes principais
- `Card` / `Button` (shadcn/ui) e ícones `lucide-react`.
- Navegação via `Link` (react-router).

### Fluxos e Interações
- Card **Análise de Aderência** possui duas ações: `Editor Form. Aderência` (`/implantadores/aderencia`) e `Aderências Finalizadas` (`/implantadores/aderencia/finalizadas`).
- Card **Homologação de Conversões** → `/implantadores/homologation`.
- Card **Roteiro de Treinamento** → `/implantadores/treinamento` (badge `F4.5`).
- Card **Documento de Transição** → `/implantadores/transicao` (destacado, badge `Importante`).

### Regras de Negócio e Estados
- Cards com `requiresPermission: true` (Aderência e Homologação) ficam com `opacity-60` e exibem "Requer permissão de Admin" quando `canManageTemplates` é falso.
- Cards de Treinamento e Transição não exigem permissão (`requiresPermission: false`).
- O rodapé "Permissões de Gerenciamento Ativas" só aparece quando `canManageTemplates` é verdadeiro.

### Pontos de Manutenção
- A lista de cards é estática (array `cards`) no próprio componente; adicionar/remover áreas exige editar esse array.
- O gate de permissão é apenas visual (UI): as rotas de destino não são protegidas por guarda de rota em `App.tsx`.

---

## 2. Editor de Formulário de Aderência

- **Rotas:** `/implantadores/aderencia` e `/implantadores/aderencia/:systemType`
  (ambas apontam para o componente `ImplantadoresAderencia` = `EditarFormAderencia` no `App.tsx`)
- **Arquivo-fonte:** [EditarFormAderencia.tsx](../../src/pages/implantadores/EditarFormAderencia.tsx)
- **Acesso:** Rota autenticada, sem guarda de rota dedicada. Publicar depende das permissões usadas pelas mutations de template.

### Objetivo
Permite criar/editar o **formulário dinâmico de aderência** (gaps de produto e riscos) por tipo de sistema. É um wrapper fino que configura o componente genérico `ChecklistEditor` com `kind="adherence"`.

### Dados e Hooks
Este arquivo em si define apenas um conjunto de perguntas padrão (`DEFAULT_QUESTIONS`) e delega toda a lógica ao `ChecklistEditor` ([src/components/checklist/ChecklistEditor.tsx](../../src/components/checklist/ChecklistEditor.tsx)), que usa:
- `useFormTemplates(kind, selectedSystem)` — lista de versões publicadas do template.
- `useActiveTemplate(kind, selectedSystem)` — versão ativa (para carregar as perguntas atuais).
- `usePublishTemplate()` — mutation que publica/ativa uma nova versão do template.
- Hooks de conversão de schema: `convertVisualToJSONSchema`, `convertVisualToUISchema`, `parseJSONSchemaToVisual` (de `VisualQuestionBuilder`).

Tabelas/entidades: templates de formulário (`kind = 'adherence'`, chaveados por `system_type`). O par (schema_json, ui_json) é gerado a partir do builder visual e versionado.

### Componentes principais
- `ChecklistEditor` (genérico, reutilizado também por checklists comerciais e de homologação).
- `VisualQuestionBuilder` — editor visual drag-and-drop de perguntas.
- `FormRenderer` — usado no modal "Visualização em Tempo Real" (preview do formulário como será preenchido).
- Banner superior (`topBanner`) com atalho para "Aderências Finalizadas".

### Perguntas padrão (`DEFAULT_QUESTIONS`)
Usadas quando não há template ativo para o sistema selecionado:
- `adherence_level` — select: Total / Parcial / Crítico / Não Adere (obrigatório).
- `critical_modules` — checkboxes: Faturamento, Financeiro, Fiscal, Estoque, RH, Integrações.
- `client_has_customizations` — boolean.
- `customization_notes` — textarea.
- `printer_photos` — images (upload de fotos das impressoras do cliente).

### Fluxos e Interações
1. Seleciona-se o **Sistema** no header (`SYSTEM_TYPES` = Orion TN, Orion PRO, Orion REG, Modelos TN, WebRI).
2. Ao trocar de sistema, o editor carrega as perguntas do template ativo (ou os defaults).
3. Edição visual das perguntas via `VisualQuestionBuilder`.
4. **Visualizar Formulário** → modal com `FormRenderer` ao vivo.
5. **Histórico** → modal lista versões publicadas; botão "Carregar" restaura perguntas de uma versão no editor.
6. **Publicar Checklist** → `publishMutation.mutateAsync` grava nova versão (com `notes` da versão) e a ativa.

### Regras de Negócio e Estados
- Publicar com zero perguntas dispara toast de erro de validação.
- Cada publicação cria uma nova versão ativa (`vN`); a versão atual aparece no header.
- Título do schema: prefixo "Aderência do Sistema (`<sistema>`)"; descrição padrão "Verificação inicial de gaps e requisitos".

### Pontos de Manutenção
- A lista `SYSTEM_TYPES` está fixa dentro do `ChecklistEditor` e difere do array `ALL_SYSTEMS` do DTC — atenção à divergência de catálogos de sistema entre telas.
- O parâmetro de rota `:systemType` existe no `App.tsx`, porém o `EditarFormAderencia` não o lê via `useParams`; a seleção de sistema é feita pelo dropdown interno do `ChecklistEditor` (default "Orion TN").

---

## 3. Aderências Finalizadas

- **Rota:** `/implantadores/aderencia/finalizadas`
- **Arquivo-fonte:** [AderenciasFinalizadas.tsx](../../src/pages/implantadores/AderenciasFinalizadas.tsx)
- **Acesso:** Rota autenticada, sem guarda dedicada.

### Objetivo
Biblioteca/consulta de todas as respostas de formulários de aderência já preenchidas (rascunhos e finalizadas), com busca, visualização, exportação em PDF e exclusão.

### Dados e Hooks
- `useToast()` para feedback.
- Acesso direto ao Supabase (sem React Query):
  - `supabase.from("profiles").select("id, full_name")` → mapa `id → nome` para resolver responsáveis.
  - `supabase.from("project_form_responses").select(...).eq("stage", "adherence").order("updated_at", desc)` — com join aninhado em `projects (client_name, ticket_number, system_type)`.
- Exclusão: `supabase.from("project_form_responses").delete().eq("id", formId)`.
- Tipo consumido: `ProjectFormResponse` de [`useProjectFormResponse`](../../src/hooks/useProjectFormResponse.ts) (estendido localmente como `CompletedFormWithProject`).
- Carga inicial via `useEffect` chamando `loadCompletedForms` (memoizado com `useCallback`). Não há invalidação de cache React Query (recarrega manualmente chamando a função de novo).

### Componentes principais
- Tabela HTML nativa com colunas: Cliente/Projeto, Produto, Responsável, Status/Veredito, Última Atualização, Ações.
- `Input` de busca, `Button` de atualizar, `Card`.

### Fluxos e Interações
- **Busca** (client-side) por cliente, sistema, ticket ou nome do responsável (`filled_by`/`approved_by` resolvidos via `profiles`).
- **Visualizar** → abre `/projects/:projectId/adherence` em nova aba.
- **PDF** → abre `/projects/:projectId/adherence?print=true` em nova aba.
- **Excluir** → `window.confirm` avisando que o status de aderência do projeto será resetado; depois recarrega a lista.

### Regras de Negócio e Estados
- Registro é considerado **finalizado** quando `status` ∈ {`approved`, `approved_with_restrictions`, `rejected`}; caso contrário é exibido como **Rascunho**.
- Badge de veredito (coluna Status/Veredito) usa `form.data.finalVerdict`:
  - `Totalmente Aderente` → verde;
  - `Aderente com Restrições` → âmbar;
  - qualquer outro (ex.: `Não Aderente / Impeditivo`) → vermelho/rosa.
- Rascunhos → badge cinza "Rascunho".
- Responsável exibido: `approved_by` tem prioridade sobre `filled_by`; senão "Não atribuído".

### Pontos de Manutenção
- Os vereditos são strings livres gravadas em `data.finalVerdict` pela tela de preenchimento (`ProjectAdherenceForm`); mudanças nos rótulos precisam ser sincronizadas entre as duas telas.
- A tela busca `profiles` inteiro (todos os perfis) a cada carga — potencial custo com muitos usuários.

---

## 4. Homologação de Conversões

- **Rota:** `/implantadores/homologation`
- **Arquivo-fonte:** [ImplantadoresHomologation.tsx](../../src/pages/implantadores/ImplantadoresHomologation.tsx)
- **Acesso:** Rota autenticada (registrada separadamente em `App.tsx`, sem guarda extra de permissão no arquivo de rotas).

### Objetivo
Fila de trabalho dos implantadores para **validar conversões finalizadas** pelo time de Conversão. Permite assumir itens da fila, revisar o histórico da conversão e emitir um **parecer conclusivo** aprovando ou devolvendo com inconsistências.

### Dados e Hooks
- `useAuth()` → `user.id`/nome do implantador logado.
- `useConversionPosts(projectId)` — posts/notas de conversão do projeto selecionado.
- `useHomologationEvents(projectId)` — eventos de movimentação de homologação.
- Query direta `supabase.from("project_tramites").select("*").eq("project_id", ...)` — trâmites (0800) do projeto.
- Fila principal: `supabase.from("conversion_queue").select("*, projects!inner(client_name, ticket_number, system_type, legacy_system, implementation_phase1)").order("priority").order("sent_at")`.
- Upload de imagens de evidência: `supabase.storage.from("conversion-posts").upload(...)` + `getPublicUrl`.
- Mutations (via `supabase.from(...).update/insert`), sem React Query — recarrega chamando `fetchQueue()`:
  - **Assumir:** `conversion_queue.update({ homologation_analyst, homologation_analyst_name, queue_status: "homologation" })` + insert em `homologation_events`.
  - **Parecer (veredito):** ver "Regras de Negócio".
- Tipo `ProjectTramite` de [`src/types/ProjectV2`](../../src/types/ProjectV2.ts).

### Componentes principais
- **Dashboard/Fila:** cards de estatística (Minhas Homologações, Aguardando Implantador, Total na Fila), busca, filtro por sistema, `Tabs` (Minha Fila / Fila Geral) e cards de item (`renderItemCard`).
- **Drawer de validação** (quando `selectedItem` está setado): coluna esquerda com dados da conversão + timeline combinada; coluna direita com **editor de texto rico estilo LibreOffice** (`contentEditable` + `document.execCommand`) para o parecer.
- **Dialog de confirmação de veredito** (`verdictModalOpen`).

### Fluxos e Interações
1. **Assumir** (item em aberto/sem analista) → passa `queue_status` para `homologation` e registra o analista.
2. **Validar** (item já meu) → abre o drawer com histórico e editor.
3. **Timeline combinada** (`combinedTimeline`): mescla `posts` (notas/atualizações/problemas/resoluções/mudança de etapa), `events` (movimentações de homologação) e `tramites` (0800), ordenados por data desc, cada um com badge de tipo/cor.
4. **Editor de parecer:** barra de formatação (negrito, itálico, sublinhado, tachado, títulos H1–H3, alinhamentos, lista, cor de texto, desfazer/refazer), inserção de imagem por botão e **colar print do clipboard** (`Ctrl+V` → upload inline).
5. **Emitir veredito:** botões "Com Inconsistências" (vermelho) ou "Aprovar Homologação" (verde) → abre o `Dialog` de confirmação → `submitVerdict`.

### Regras de Negócio e Estados
Fila considera ativos os itens com `queueStatus` ∈ {`awaiting_homologation`, `homologation`}.

Cores/estado do card:
- **Em aberto (sem analista):** borda âmbar, botão "Assumir".
- **Meu:** borda primária, botão "Validar".
- **De outro analista:** desabilitado ("Atribuído a …").

Dois caminhos de veredito em `submitVerdict`:
- **Com Inconsistências** (`verdictType === "issues"`) — exige texto no editor:
  - `conversion_queue` → `queue_status: "homologation_issues"`, `homologation_status: "issues_found"`.
  - `projects` → `conversion_homologation_status: "with_issues"`.
  - insert em `homologation_events` (`to_status: "homologation_issues"`, `issues_count: 1`, `notes` = HTML do parecer).
  - notifica o analista de conversão (`notifications`, `type: "homologation_issues"`, `action_url: "/conversion"`); se não houver analista atribuído, direciona ao time `conversion`.
- **Aprovar** (`verdictType === "approve"`):
  - `conversion_queue` → `queue_status: "done"`, `homologation_status: "approved"`, `completed_at`.
  - `projects` → `conversion_status: "done"`, `conversion_homologation_status: "approved"`, `conversion_finished_at`.
  - insert em `homologation_events` (`to_status: "approved"`, `issues_count: 0`).
  - notifica o time `conversion` (`type: "homologation_approved"`).

`deploymentDate` do card é extraído de `projects.implementation_phase1.startDate` (parse defensivo).

### Pontos de Manutenção
- O editor de parecer usa `document.execCommand` (API deprecada) e `contentEditable` cru; o HTML resultante é gravado em `homologation_events.notes` e renderizado com `dangerouslySetInnerHTML` na timeline.
- Sem React Query nesta tela: cada ação faz refetch manual (`fetchQueue`), sem invalidação de cache compartilhado com outras telas (ex.: `/conversion`).
- A atribuição só compara `homologationAnalyst === currentUserId`; não há travamento transacional (dois usuários podem tentar assumir o mesmo item).

---

## 5. Roteiro de Treinamento (Placeholder)

- **Rota:** `/implantadores/treinamento`
- **Arquivo-fonte:** [TreinamentoPlaceholder.tsx](../../src/pages/implantadores/TreinamentoPlaceholder.tsx)
- **Acesso:** Rota autenticada. Sem permissão específica.

### Objetivo
Tela **em construção** (placeholder). Comunica a intenção da futura funcionalidade de capacitação de usuários finais por sistema. Não implementa nenhuma lógica.

### Dados e Hooks
- Nenhum. Componente 100% estático (apenas `Link` de volta ao painel).

### Componentes principais
- Cabeçalho com voltar, título com gradiente, badge "Agendado para F4.5" e três cards ilustrativos (Cronograma Integrado, Verificação de Usuários, Termo de Capacitação).

### Fluxos e Interações
- Único fluxo real: botão de voltar para `/implantadores`.

### Regras de Negócio e Estados
- Sem estado. Rodapé indica que o desenvolvimento faz parte da etapa **F4 (Treinamento e Capacitação)**.

### Pontos de Manutenção
- **Placeholder / incompleto:** todo o conteúdo textual é ilustrativo; nenhuma das funcionalidades descritas (cronograma, presença, atestados) existe ainda. Substituir integralmente quando F4.5 for desenvolvido.

---

## 6. Documento de Transição de Conhecimento — DTC

- **Rota:** `/implantadores/transicao`
- **Arquivo-fonte:** [TransicaoPlaceholder.tsx](../../src/pages/implantadores/TransicaoPlaceholder.tsx)
- **Acesso:** Rota autenticada. Ações de aprovação restritas a admin ou ao analista responsável (ver estados).

> **Atenção:** apesar do nome do arquivo/componente ser `TransicaoPlaceholder`, esta **NÃO é uma tela placeholder** — é a implementação completa e mais extensa do módulo (~4.300 linhas). O nome é um legado; a funcionalidade está pronta.

### Objetivo
Elaborar, revisar, aprovar e emitir (imprimir/exportar PDF) o **Documento de Transição de Conhecimento (DTC)** de um projeto — o handoff da equipe de implantação para o pós-implantação/suporte. Reúne identificação da serventia, infraestrutura/acessos, conversão, relato técnico, pendências/chamados e considerações finais.

### Dados e Hooks
- `useAuth()` → `fullName`, `isAdmin`.
- `useProjectsV2()` → `updateProject` (mutation de persistência).
- `useTimeline()` → `addAutoLog` (log automático na timeline do projeto).
- `useTeamMembers()` → `members` (autocomplete de responsáveis).
- `useProjectDetails(selectedProjectId)` → carrega o projeto selecionado (lazy).
- `useAutoSave<DTCData>(...)` → salvamento automático com debounce de 1s (`useAutoSave`).
- `useQueryClient()` → invalidação de `["projectDetails", selectedProjectId]` após mudanças de status.
- Queries Supabase diretas:
  - Lista de seleção: `supabase.from("projects").select("id, client_name, ticket_number, system_type, post_status").eq("is_deleted", false)` (React Query key `["projectsSelectDtc"]`).
  - Notificações: `supabase.from("profiles").select(...).in("full_name", ...)` + insert em `notifications`.
- Persistência: o DTC é gravado em `projects.customFields.dtc` (objeto `DTCData`). Dados de ambiente (postgres, acessos remotos, SO, login/senha) são **espelhados de/para** `projects.stages.environment`, e o estágio `post` recebe `status` derivado do status do DTC (`dtcStatusToStageStatus`).

### Modelo de dados (`DTCData`)
Objeto rico com, entre outros: `responsible`, `analystResponsible`, `serventia`, `oficial` (Tabelião/Oficial Titular), `clientResponsible` + telefone, `keyUsersList[]`, `systemsInstalled`/`systemVersionsList{}`, `postgres*`, `remoteAccessList[]` (AnyDesk/TeamViewer/RustDesk/Outro), `so*`/`os*`, `hadConversion`/`convertedData`, `implantationProcess` (rich text Lexical), `implantationProcessLogs[]`, `implantationGainsList[]`, `implantationPendingList[]`, `implantationSuggestionsList[]`, `clientSatisfactionScore`, `employeesList[]`, `finalConsiderations`, `tickets[]` e `status`.

### Componentes principais
- Seletor de projeto + cabeçalho com status e ações.
- `Tabs`: **Identificação**, **Infra & Acesso**, **Relato Técnico**, **Chamados pendentes**, **Histórico** (usa `LogsTab`), **Visualizar** (preview A4 para impressão/PDF).
- `RichTextEditor` (Lexical) para campos textuais; `LexicalRenderer` para renderizar no preview; `getLexicalText`/`getLexicalTextLength` para extrair texto puro (usado pelo leitor de voz e progresso).
- Listas editáveis com drag-and-drop (`@dnd-kit`) via `SortableItem`.
- `AutocompleteInput` (responsáveis), máscara de telefone (`formatPhoneNumber`), validação de IP/porta do Postgres (`getIpValidationMessage`, porta padrão 5432).
- Suíte WhatsApp: exportar contatos `.vcf` (`handleExportVcf`), exportar `.zip` de vCards (`handleExportZip`, usa `jszip` dinâmico), copiar telefones e abrir `wa.me`.

### Leitor de voz (Text-to-Speech)
Na aba **Visualizar**, há um leitor de voz baseado na Web Speech API (`window.speechSynthesis` / `SpeechSynthesisUtterance`):
- **Seção de leitura** (`speechSection`): Tudo (Completo) ou seções 1–5 (1. Identificação, 2. Infra & Acessos, 3. Conversão, 4. Relato Técnico, 5. Pendências). O texto de cada seção é montado dinamicamente a partir do `localDtc`.
- **Voz** (`selectedVoiceURI`): filtra vozes com `lang` contendo "pt" (pt-BR); default = voz padrão do SO ou a primeira pt.
- **Velocidade** (`speechRate`): 0.75x / 1.0x / 1.25x / 1.5x / 2.0x.
- Botão **Ouvir/Parar** (`toggleSpeech`); trocar seção, voz ou velocidade durante a leitura reinicia a fala (`useEffect` cancela e reinicia após 100ms). A fala é cancelada no unmount.

### Fluxos e Interações
1. Selecionar projeto → carrega/gera o `DTCData` inicial (`getInitialDtc`), com defaults e migrações on-the-fly de formatos antigos (keyUsers string → lista, remoteAccessData → lista, systemVersions → objeto, employees → lista).
2. Preenchimento com **auto-save** (debounce 1s), que também sincroniza `stages.environment` e `stages.post`.
3. Transições de status via botões (bypass do debounce, `handleStatusChange`): dispara toast, invalida `projectDetails`, grava log na timeline e notifica participantes do projeto.
4. **Imprimir PDF** (`window.print()`) e **Exportar PDF** (`exportToPdf`) a partir do preview A4.

### Regras de Negócio e Estados
Status do DTC (`DTCData.status`) e mapeamento para o estágio `post` (`dtcStatusToStageStatus`):
- `draft` → `post.status = "in-progress"` — rascunho, auto-save ativo; botão **Enviar para Validação**.
- `submitted` → `post.status = "waiting_adjustment"` — "Pendente de Validação"; botões **Retornar a Rascunho** e (somente admin **ou** `fullName === analystResponsible`) **Aprovar Transição**.
- `approved` → `post.status = "done"` — finalizado; formulário fica **bloqueado** (`isFormDisabled = status === "approved"`, propaga `disabled` a todos os campos); botões **Reabrir (Editar)**, **Exportar PDF** e **Imprimir**.
- Timestamps/autores registrados: `submittedAt`/`submittedBy`, `approvedAt`/`approvedBy`.
- Progresso do DTC (`dtcProgress`): conta seções preenchidas sobre 10 checks (serventia, responsável, responsável do cliente, sistemas, acessos remotos, processo de implantação, funcionários, ganhos, pendências/sugestões, considerações finais).
- Notificações de transição (`type: "status_change"`) são enviadas a todos os responsáveis do projeto + analista designado, resolvendo nomes → IDs via `profiles`.

### Pontos de Manutenção
- Nome do arquivo/componente `TransicaoPlaceholder` é enganoso (não é placeholder) — considerar renomear para `DocumentoTransicao`/`DTC`.
- O modelo `DTCData` vive inteiramente dentro de `projects.customFields.dtc` (JSON), sem tabela própria; há bastante lógica de retrocompatibilidade/migração inline no `useEffect` de migração.
- Duplicação de responsabilidade de dados de ambiente entre `stages.environment` e o DTC (espelhamento bidirecional) — mudanças em um lado precisam considerar o outro.
- Uso de `document`/`window` (print, clipboard, speechSynthesis, blobs) — dependente do navegador; sem SSR.
- Catálogo `ALL_SYSTEMS` (11 sistemas) é local e diverge do `SYSTEM_TYPES` (5) do editor de aderência.

---

## 7. Relação com telas externas ao módulo

O módulo Implantadores customiza/consulta artefatos que são **preenchidos e consumidos** por telas fora de `src/pages/implantadores/`:

- **Formulário de aderência (preenchimento):** [`src/pages/ProjectAdherenceForm.tsx`](../../src/pages/ProjectAdherenceForm.tsx) — rota `/projects/:projectId/adherence` (aberta pela tela **Aderências Finalizadas** via "Visualizar" e "PDF"). É aqui que o veredito final é escolhido e o status gravado:
  - Verdito `Totalmente Aderente` → status `approved`.
  - `Aderente com Restrições` → `approved_with_restrictions`.
  - `Não Aderente / Impeditivo` → `rejected`.
  - Após finalizar, o formulário é travado (`isFormLocked`). Os templates que estruturam esse formulário são exatamente os publicados pelo **Editor de Formulário de Aderência** (tela 2).

- **Renderização de formulários dinâmicos:** [`src/components/FormRenderer/`](../../src/components/FormRenderer/) — `FormRenderer.tsx` (render do JSON Schema/UI Schema) e `VisualQuestionBuilder.tsx` (builder visual + conversores schema↔visual). Compartilhados entre o editor de aderência, o preview e o preenchimento.

- **Coleta pública de infraestrutura / `InfraStageForm`:** os dados de ambiente exibidos e editados no **DTC** (PostgreSQL host/versão/credenciais, acessos remotos, SO, login/senha) são os mesmos de `projects.stages.environment`, alimentados pela etapa de infraestrutura do projeto ([`src/components/ProjectManagement/Forms/StageForms/InfraStageForm.tsx`](../../src/components/ProjectManagement/Forms/StageForms/InfraStageForm.tsx) e `EnvironmentStageForm.tsx`). O DTC espelha esses campos, evitando redigitação, e os grava de volta no estágio `environment`.

- **Área de Conversão:** a tela **Homologação de Conversões** (tela 4) consome a fila `conversion_queue` alimentada pela área de Conversão ([`src/pages/conversion/Conversion.tsx`](../../src/pages/conversion/Conversion.tsx)), que envia projetos para "Aguardando Homologação". As notificações de veredito (aprovação/inconsistências) redirecionam para `/conversion`.
