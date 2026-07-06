# Módulo: Telas Públicas e Autenticação

Este módulo cobre as telas de acesso ao Siplan HUB que **não fazem parte do layout autenticado** (`MainLayout`): a tela de login, as duas telas públicas acessadas por clientes/técnicos de cartório via link temporário e a rota de erro 404. Também documenta o mecanismo central de autenticação (`AuthContext` / `useAuth`) e a proteção de rotas (`ProtectedRoute`).

Stack: React 18 + TypeScript + Vite + Supabase (`@supabase/supabase-js`). O cliente Supabase é único e usa a **anon/publishable key** (`VITE_SUPABASE_PUBLISHABLE_KEY`), com sessão persistida em `localStorage` e refresh automático de token — ver [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

---

## Autenticação e Rotas Protegidas

### AuthProvider / AuthContext / useAuth
- **Arquivos-fonte:**
  - [src/contexts/AuthContext.tsx](../../src/contexts/AuthContext.tsx) (`AuthProvider`)
  - [src/contexts/AuthContextValue.ts](../../src/contexts/AuthContextValue.ts) (contexto e tipos)
  - [src/hooks/useAuth.ts](../../src/hooks/useAuth.ts) (`useAuth`)

O `AuthProvider` envolve toda a aplicação (montado em [src/App.tsx](../../src/App.tsx), acima do `BrowserRouter`) e mantém o estado global de sessão. O hook `useAuth()` expõe esse estado e lança erro se usado fora do provider.

**Estado exposto pelo contexto (`AuthContextType`):**

| Campo | Tipo | Origem |
|-------|------|--------|
| `session` | `Session \| null` | `supabase.auth.getSession()` / `onAuthStateChange` |
| `user` | `User \| null` | `session.user` |
| `fullName` | `string \| null` | `profiles.full_name` |
| `role` | `string \| null` (`UserRole`) | `profiles.role` |
| `team` | `string \| null` | `profiles.team` |
| `permissions` | `Permission[]` (`{ resource, action }`) | `app_roles → app_role_permissions → app_permissions` |
| `permissionsLoaded` | `boolean` | flag de conclusão da carga de permissões |
| `loading` | `boolean` | flag de inicialização da sessão |
| `isAdmin` | `boolean` | `role === "admin"` |
| `signOut` | `() => Promise<void>` | encerra a sessão |
| `hasPermission` | `(resource, action) => boolean` | consulta RBAC |

**Fluxo de inicialização (`initializeAuth`):**
1. `supabase.auth.getSession()` é disputado (`Promise.race`) contra um timeout de **5s** para evitar travamento na carga inicial.
2. Em timeout, faz **uma retentativa** com timeout de **8s**. Se ainda falhar, executa `signOut()` e limpa manualmente todas as chaves `sb-*` do `localStorage`.
3. Havendo sessão, `fetchUserRole(userId)` é disparado **sem `await`** (não bloqueia a UI) e `loading` é liberado.
4. `supabase.auth.onAuthStateChange` mantém o estado sincronizado com login/logout.
5. Um `setTimeout` de segurança de **10s** força `loading = false` para nunca deixar a aplicação presa em carregamento.

**`fetchUserRole`** consulta `profiles` (`role, team, full_name`) por `id`, também protegido por timeout de **15s** com uma retentativa. Em falha definitiva, assume `role = "user"`. Se houver `role`, chama `fetchPermissions`.

**`fetchPermissions`** monta a lista de permissões a partir de `app_roles` (join aninhado com `app_role_permissions` → `app_permissions`) filtrando pelo nome do papel.

**`hasPermission(resource, action)`** retorna `true` incondicionalmente para `role === "admin"` (superadmin); caso contrário verifica se existe a permissão correspondente na lista carregada.

**`signOut`** chama `supabase.auth.signOut()` e, no bloco `finally`, força a limpeza do estado local e remove todas as chaves `sb-*` do `localStorage` — garantindo logout mesmo se a chamada de rede falhar.

### ProtectedRoute
- **Arquivo-fonte:** [src/components/ProtectedRoute.tsx](../../src/components/ProtectedRoute.tsx)
- **Objetivo:** Bloquear o acesso ao conjunto de rotas autenticadas do app.

Lógica:
1. Enquanto `loading || !permissionsLoaded`, renderiza um placeholder `Carregando...` em tela cheia.
2. Se não houver `user`, redireciona para `/login` com `<Navigate replace />`, guardando a origem em `state.from` (para retorno pós-login).
3. Caso contrário, renderiza os filhos.

**Wiring das rotas** (em [src/App.tsx](../../src/App.tsx)):
- **Públicas (fora do `ProtectedRoute`):** `/login`, `/roadmap/:token`, `/public/checklist/:id`, `/public/infra-coleta/:id`.
- **Admin:** `/admin/*` é renderizada via `AdminLayout` (a proteção/controle de acesso admin fica a cargo desse layout, não do `ProtectedRoute`).
- **App autenticado:** o splat `/*` é envolvido por `ProtectedRoute → MainLayout` e contém todas as rotas internas, incluindo o **404 interno** (`<Route path="*" element={<NotFound />} />`).

---

## Login
- **Rota:** `/login`
- **Arquivo-fonte:** [src/pages/Login.tsx](../../src/pages/Login.tsx)
- **Acesso:** público sem login (importado de forma síncrona, sem `Suspense`).

### Objetivo
Autenticar usuários por e-mail e senha. Suporta um modo alternativo de **login administrativo** que valida o papel do usuário antes de liberar a área `/admin`.

### Dados e Hooks
- **Auth:** `supabase.auth.signInWithPassword({ email, password })`.
- **Verificação de papel (modo admin):** após login com sessão, consulta `profiles.role` por `id` do usuário; se `role !== "admin"`, executa `supabase.auth.signOut()` e lança erro de acesso negado.
- **Hooks locais:** `useState` (email, password, loading, `isAdminLogin`), `useNavigate`, `useToast`, `useTheme` (para escolher o logo claro/escuro).
- **Tabelas Supabase:** `auth` (autenticação) e `profiles` (leitura de `role`).

### Componentes principais
- `Card` (Header/Content/Footer) com formulário de e-mail/senha (`Input`, `Label`, `Button`).
- Fundo animado com blobs orgânicos e overlay de textura via `framer-motion` (`motion`/`AnimatePresence`), reagindo ao tema claro/escuro.
- Botão fantasma no canto superior direito que alterna entre "Login de Usuário" e "Admin".
- Logo dinâmico (`Siplan_logo.png` / `Siplan_logo_branco.png`) conforme o tema; badge "ADMIN" quando em modo administrativo.
- Botão de submit com estado de carregamento (`Loader2` animado, "Entrando...").

### Fluxos e Interações
1. Usuário preenche e-mail/senha e envia (`handleLogin`).
2. Em caso de sucesso e sessão válida:
   - **Modo usuário:** navega para `/`.
   - **Modo admin:** valida `profiles.role === "admin"`; se ok, navega para `/admin`; senão, desloga e exibe erro.
3. Erros são exibidos via toast destrutivo. Status HTTP `400` é traduzido para "Email ou senha inválidos."; demais erros usam a mensagem do `Error`.
4. `finally` sempre restaura `loading = false`.

### Regras de Negócio e Estados
- **Modo admin (`isAdminLogin`)** altera títulos, descrições, badge e o destino de navegação, além de impor a checagem de papel.
- Um login admin bem-sucedido de um não-admin é **revertido** (logout imediato).
- Campos são `required` e ficam desabilitados durante o carregamento.
- Estados: idle / enviando (`loading`) / erro (toast).

### Segurança / Pontos de Manutenção
- A checagem de admin ocorre **no cliente**; a autorização efetiva das telas admin depende das políticas RLS do backend e do `AdminLayout`. Não tratar a navegação client-side como controle de segurança.
- Há `console.log` de depuração (inclusive do objeto de resposta do login) que deveria ser removido em produção.
- O acesso a `profiles` usa cast `(supabase as any)` — não tipado; atenção ao renomear colunas.
- A verificação de admin usa `.single()`; um perfil ausente/duplicado lançaria erro tratado no `catch`.

---

## Checklist Público (Comercial)
- **Rota:** `/public/checklist/:id`
- **Arquivo-fonte:** [src/pages/public/PublicChecklist.tsx](../../src/pages/public/PublicChecklist.tsx)
- **Acesso:** público sem login (lazy-loaded, sem `ProtectedRoute`). O `:id` é o UUID do registro em `commercial_checklists`.

### Objetivo
Permitir que o cliente/serventia preencha, via link temporário gerado pelo time Comercial, um checklist estrutural sobre o cartório (estrutura física, setores e colaboradores). As respostas alimentam a preparação do ambiente de implantação.

### Dados e Hooks
Orquestrado por [src/hooks/usePublicChecklist.ts](../../src/hooks/usePublicChecklist.ts):
- **Checklist:** `useSingleCommercialChecklist(id)` → `SELECT * , projects:project_id(...)` em `commercial_checklists` por `id` (`.single()`). Ver [src/hooks/useCommercialChecklists.ts](../../src/hooks/useCommercialChecklists.ts).
- **Template do formulário:** `useQuery` sobre `form_templates`:
  - Se `checklist.template_id` existir, busca por `id`;
  - Senão, faz fallback para o template ativo de `kind = 'commercial_checklist'`, `system_type` do projeto e `is_active = true` (`.maybeSingle()`).
- **Submissão:** `submitChecklist` (mutation em `useCommercialChecklists`) → `UPDATE commercial_checklists SET responses, status='submitted', submitted_at=now() WHERE id=...`.
- **Tabelas Supabase:** `commercial_checklists`, `projects` (relação), `form_templates`.
- **RLS aplicada** (ver [migration public_checklist_rls_policies](../../supabase/migrations/20260602170800_public_checklist_rls_policies.sql) e [migration create_commercial_checklists](../../supabase/migrations/20260602141500_create_commercial_checklists.sql)):
  - `commercial_checklists`: `SELECT USING (true)` — leitura pública por qualquer papel (inclusive anon).
  - `commercial_checklists`: `UPDATE USING (auth.role() = 'authenticated' OR status = 'pending')` — o público anônimo só consegue atualizar/submeter **enquanto o status for `pending`**. Após virar `submitted`, o anon perde a permissão de update.
  - `projects`: `SELECT` público permitido apenas para projetos que possuem checklist comercial ou roadmap vinculado.
  - `form_templates`: `SELECT` público permitido apenas para `kind = 'commercial_checklist'`.

### Componentes principais
- Renderização condicional por estado (loading / erro / submetido / formulário).
- **Card de Identificação (read-only):** sistema a implantar, nome do cartório e responsável Siplan (`checklist.projects` + `created_by_name`).
- **Formulário dinâmico:** [`FormRenderer`](../../src/components/FormRenderer/FormRenderer.tsx) quando há `template` (usa `schema_json` / `ui_json`); repassa `project_id`, `formData` e handlers.
- **Fallback:** [`FallbackChecklistForm`](../../src/components/public/FallbackChecklistForm.tsx) quando não há template — formulário estático com campos de responsável, telefones, estrutura (andares), setores, pessoas-chave e colaboradores.
- Header fixo com logo e badge "Cliente"; cartão de introdução.

### Fluxos e Interações
1. Ao montar, o componente **força o modo claro** no `<html>` (remove `dark`, adiciona `light`) e restaura ao desmontar.
2. Carrega checklist + template. Enquanto carrega, exibe spinner.
3. Preenchimento:
   - **Dinâmico:** `FormRenderer` chama `onSubmit → handleDynamicSubmit(dynamicResponses)`.
   - **Fallback:** `handleSubmit` valida campos obrigatórios (nome, cargo, e-mail, telefones válidos via `validateBrazilianPhone`, andares, setores, distribuição, total de colaboradores, ciência da mudança, adaptabilidade) e a consistência das pessoas-chave (tudo ou nada). Erros destacam campos (`formErrors`) e rolam até o primeiro `[data-error]`.
4. Rascunho: se `checklist.responses` já tiver dados, os estados do formulário são pré-preenchidos (telefones reformatados com `formatBrazilianPhone`).
5. Na submissão bem-sucedida, `submittedSuccess = true` exibe a tela de conclusão.

### Regras de Negócio e Estados
- **Não encontrado / inválido:** `state.error || !state.checklist` → card "Checklist não encontrado" (link inválido, expirado ou removido).
- **Já submetido / desativado:** `checklist.status === "submitted"` **ou** `submittedSuccess` → card "Checklist Finalizado!", informando que o link temporário foi desativado e não aceita novos envios. Essa desativação é reforçada pela RLS de update (`status = 'pending'`).
- **Loading:** `isLoading` (checklist ou template).
- Submissão anônima é possível somente para checklists ainda `pending`.

### Segurança / Pontos de Manutenção
- Leitura pública total de `commercial_checklists` (`USING (true)`): o link é o UUID do registro; **conhecer/adivinhar o UUID = ler o checklist**. Não há token adicional. Tratar o `:id` como segredo de baixa entropia (UUID v4).
- A "desativação" do link após envio é **efetiva no backend** via política de update (`pending`), não apenas na UI.
- Tipagem: acessos a `commercial_checklists` usam cast `as any` no hook (tabela não tipada em `Database`).
- O template pode não existir; o fluxo degrada para o formulário de fallback.

---

## Coleta Pública de Infraestrutura
- **Rota:** `/public/infra-coleta/:id`
- **Arquivo-fonte:** [src/pages/public/PublicInfraCollection.tsx](../../src/pages/public/PublicInfraCollection.tsx)
- **Acesso:** público sem login (lazy-loaded, sem `ProtectedRoute`). O `:id` é o UUID do projeto (`projects.id`).

### Objetivo
Permitir que o técnico/responsável do cartório envie diretamente à Siplan o inventário de hardware (servidores e estações de trabalho), a partir de arquivos `.txt` gerados por scripts coletores, com validação dinâmica de requisitos antes do envio.

### Dados e Hooks
Ao contrário do checklist (que usa RLS direta), esta tela usa **RPCs `SECURITY DEFINER`** que encapsulam o acesso à tabela `projects`:
- **Leitura:** `useQuery` → `supabase.rpc("get_project_public_info", { p_id: id })`.
  - A função busca `projects WHERE id = p_id AND is_deleted = false`; retorna `NULL` se não encontrado.
  - Retorna JSONB com: `client_name`, `system_type`, `ticket_number`, `infra_servers`, `infra_workstations`, `infra_workstations_count`, `infra_status`, `workstations_status`, `server_status` e **`infra_public_link_closed`**.
- **Escrita:** `supabase.rpc("update_project_public_infra", { p_id, p_workstations, p_servers, p_workstations_count, p_workstations_status, p_server_status })`.
  - Retorna `FALSE` se o projeto não existir/estiver deletado **ou se `infra_public_link_closed = true`** (bloqueio de link encerrado).
  - Atualiza os campos de infra, define `last_update_by = 'Coleta Pública (Técnico)'` e **registra um evento** em `timeline_events` (`type='auto'`, autor "Técnico (Link Público)").
- **Migrations relevantes:**
  - [public_infra_collection_rpc](../../supabase/migrations/20260622182500_public_infra_collection_rpc.sql) (criação das RPCs)
  - [update_public_infra_collection_rpc](../../supabase/migrations/20260623114500_update_public_infra_collection_rpc.sql) (nova assinatura com status de estações/servidor)
  - [add_infra_public_link_closed](../../supabase/migrations/20260623115500_add_infra_public_link_closed.sql) (coluna `infra_public_link_closed` + bloqueio no update e exposição no get)
- **Validação (client-side):** utilitários de [src/utils/infra-validation.ts](../../src/utils/infra-validation.ts) — `parseMachineInfo`, `checkWorkstationRequirements`, `checkServerRequirements`, `extractGeneration`. Tipos em [src/types/ProjectV2.ts](../../src/types/ProjectV2.ts) (`ServerInfo`, `WorkstationInfo`).

### Componentes principais
- Estado local: `workstations`, `servers`, `workstationsCount`, `isSubmitting`, `submittedSuccess`, `dragOver`; sincronizados a partir do `project` retornado.
- **Zona de coleta:** botões de download dos coletores (`/info-system.bat` Windows, `/info-linux.bat` Linux SSH) e área de **arrastar-e-soltar / seleção** de arquivos `.txt` (inputs ocultos com refs).
- **Tabela de estações:** componente local `EditableCell` (célula editável inline, Enter confirma / Esc cancela), com colunas hostname, setor, usuário, processador+geração, RAM, disco, S.O. e "Atende?".
- **Cards de servidores:** múltiplos campos editáveis (hostname, marca/modelo, virtualizado, processador, núcleos, memória, disco, espaço Orion, S.O., antivírus, rede, backup, ambiente Local/Nuvem, failover, observações) com selos de validação e avisos.
- Botões: "Adicionar Estação", "Recalcular Requisitos", "Adicionar Servidor", e o CTA final "Confirmar e Enviar para Siplan HUB".
- Toasts de feedback (`useToast`) e ícones `lucide-react`.

### Fluxos e Interações
1. Ao montar, força modo claro e injeta CSS de scrollbars claras (removidos no unmount).
2. Import de arquivos `.txt` (via clique ou drag-and-drop):
   - Servidor: preenche/atualiza o primeiro servidor com `parseMachineInfo`.
   - Estações: cada arquivo vira uma `WorkstationInfo`; `checkWorkstationRequirements` define `meetsRequirements` ("Sim"/"Não"). Drag-and-drop filtra apenas `.txt` e alerta se o formato for incorreto.
3. Edição manual inline de qualquer campo; `extractGeneration` deriva a geração ao editar o processador.
4. "Recalcular Requisitos" (`runAutoValidateAll`) reprocessa todas as estações.
5. Envio (`handleSubmitData`):
   - Bloqueia se não houver nenhuma estação nem servidor (toast "Formulário Vazio").
   - Calcula `workstations_status` e `server_status` agregados: `Adequado` / `Inadequado` / `Parcialmente Adequado`.
   - Chama a RPC de update; se retornar sucesso, exibe a tela de conclusão; senão, toast de erro.

### Regras de Negócio e Estados
- **Carregando:** `isLoading` → painel de carregamento.
- **Expirado/Inválido:** `error || !project` (RPC retornou `NULL`) → card "Link de Coleta Expirado ou Inválido" (projeto inexistente ou arquivado/`is_deleted`).
- **Link encerrado:** `project.infra_public_link_closed === true` → card "Link de Coleta Encerrado" (bloqueado pelo implantador; nem exibe nem aceita dados). O bloqueio é reforçado no backend: a RPC de update retorna `FALSE` nesse estado.
- **Concluído:** `submittedSuccess` → card "Coleta de Infraestrutura Concluída!".
- Métricas de estações OK/Incompatíveis exibidas no cabeçalho da seção.
- Status agregados só são calculados quando há itens da respectiva categoria (senão ficam `null` e a RPC preserva o valor existente via `COALESCE`).

### Segurança / Pontos de Manutenção
- Modelo de segurança baseado em **RPC `SECURITY DEFINER`**: o anon **não** tem acesso direto à tabela `projects` por essa via — apenas ao subconjunto de campos exposto pelo `get_project_public_info` e à escrita controlada pelo `update_project_public_infra`. Ambas filtram `is_deleted = false`.
- O link é o **UUID do projeto** (`projects.id`), sem token adicional. Quem conhece o UUID pode ler os campos de infra e (se o link não estiver encerrado) sobrescrever `infra_workstations`/`infra_servers`. Não há autenticação nem verificação de autoria no envio.
- O envio é **anônimo** e registra rastro em `timeline_events` como "Técnico (Link Público)".
- O "encerramento" do link (`infra_public_link_closed`) é o mecanismo de revogação — controlado no HUB pelo implantador; efetivo tanto na UI quanto na RPC de escrita.
- Chamadas RPC usam cast `(supabase.rpc as any)` — não tipadas; alterar assinatura da função exige atualizar os parâmetros no cliente.
- Coletores servidos como assets estáticos públicos (`/info-system.bat`, `/info-linux.bat`).

---

## Página 404 (Not Found)
- **Rota:** catch-all `*` (renderizada dentro do app autenticado; ver wiring abaixo)
- **Arquivo-fonte:** [src/pages/NotFound.tsx](../../src/pages/NotFound.tsx)
- **Acesso:** depende do contexto — a instância registrada em [src/App.tsx](../../src/App.tsx) fica **dentro** do `ProtectedRoute`/`MainLayout` (splat `/*`), portanto só é alcançada por usuários autenticados. Rotas públicas desconhecidas não têm catch-all próprio.

### Objetivo
Exibir uma mensagem de rota inexistente e oferecer retorno à Home.

### Dados e Hooks
- `useLocation` (react-router) para capturar o `pathname` acessado.
- `useEffect` que emite `console.error("404 Error: ...")` com o caminho — útil para diagnóstico.

### Componentes principais
- Bloco central com "404", texto "Oops! Page not found" e link `<a href="/">Return to Home</a>`.

### Fluxos e Interações
- Puramente informativo; o único caminho é voltar para `/`.

### Regras de Negócio e Estados
- Sem estados. O texto está em inglês (divergente do restante da aplicação em pt-BR) — candidato a localização.

### Segurança / Pontos de Manutenção
- Sem dados sensíveis. Ponto de atenção: não há página 404 dedicada para o escopo público; URLs públicas inválidas seguem o roteamento existente (ex.: um `/public/checklist/:id` inexistente cai no estado "não encontrado" da própria tela, não neste componente).
