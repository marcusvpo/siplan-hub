# Permissões e RLS (RBAC) — Siplan Hub

Guia do sistema de controle de acesso: como funciona, como adicionar uma tela/ação nova sem quebrar nada, e como verificar. Refeito de ponta a ponta em 15/07/2026.

> **Regra de ouro:** um checkbox de permissão que não bloqueia nada mente para quem configura o perfil. Só declare uma ação (`create`/`edit`/`delete`/`execute`/`manage`) se existir ponto de aplicação real no código. Toda permissão nova nasce **permissiva** (concedida a quem já usava) e é restringida de propósito pelo admin — nunca restrinja em silêncio no deploy.

---

## 1. As quatro camadas

O acesso é controlado em quatro pontos. Uma tela só está "100% protegida" quando os quatro concordam.

| Camada | Onde | O que faz | Se faltar |
|---|---|---|---|
| **Catálogo** | `src/constants/permissions.ts` | Fonte da verdade dos recursos e ações. Alimenta a tela `/admin/roles`. | Checkbox não aparece para configurar. |
| **Menu** | `src/constants/menuItems.ts` + `AppSidebar.tsx` + `Home.tsx` | `permissionKey` em cada item; grupo some se nenhum subitem é acessível. | Menu mostra link para tela bloqueada. |
| **Guarda de rota** | `src/components/auth/RequirePermission.tsx` no `App.tsx` | Bloqueia a URL. Sem isso, esconder o link não impede digitar o endereço. | Tela abre digitando a URL. |
| **Gate de ação** | `usePermissions().hasPermission(...)` na própria tela | Esconde botão criar/excluir, desabilita editar, early-return no handler. | Botão funciona para quem não deveria. |
| **RLS (banco)** | `supabase/migrations/*.sql` — policies com `has_permission()` | Única defesa **real**: as 4 camadas acima são só UI, contornáveis via API direta. | Qualquer autenticado escreve via API, ignorando a tela. |

O catálogo é espelhado no banco (tabela `app_permissions`) por migration. A tela `/admin/roles` lista **o que vem do banco**, não o que está no código — por isso migration é obrigatória.

---

## 2. Fluxo em runtime

```
Login (GoTrue) → AuthContext lê profiles.role + app_role_permissions
              → hasPermission(resource, action) disponível via usePermissions()
              → admin tem bypass total (has_permission() retorna true p/ role='admin')
```

`has_permission(user_id, resource, action)` é uma função SQL `SECURITY DEFINER` (não dispara RLS, sem risco de recursão). Retorna `true` para `admin` sempre. É a mesma fonte usada pela UI, pelas policies RLS e pelas edge functions.

---

## 3. CHECKLIST — adicionar uma TELA nova

Ao criar uma rota/tela nova, faça **os cinco passos**. Pular qualquer um deixa um buraco silencioso.

1. **Catálogo** — adicione o recurso em `src/constants/permissions.ts` (`PERMISSION_RESOURCES`), com `label`, `category` e só as `actions` que você vai de fato aplicar (`view` no mínimo).
2. **Migration** — crie `supabase/migrations/<timestamp>_<nome>.sql` inserindo as linhas em `app_permissions` (`INSERT ... ON CONFLICT (resource, action) DO UPDATE SET description = EXCLUDED.description`). Conceda ao admin e **ao perfil `user`** as ações que o `user` já podia fazer antes (senão trava a equipe no deploy — foi o incidente de 15/07). Rode a migration no banco.
3. **Menu** — em `src/constants/menuItems.ts`, adicione o `permissionKey` no subitem. Em `AppSidebar.tsx`, gate o link com `can("<recurso>")` e inclua-o na lista `primeiraRota(...)` do grupo.
4. **Guarda de rota** — no `App.tsx`, envolva o elemento com `<RequirePermission resource="<recurso>">...</RequirePermission>` (use `action="manage"` etc. se não for `view`).
5. **Gate de ação** — na tela, para cada botão que muta dados: `const { hasPermission } = usePermissions()`, esconda criar/excluir, desabilite editar, e `if (!canX) return;` no início do handler.
6. **RLS** — se a tela escreve numa tabela nova ou sensível, adicione policy `... USING (has_permission(auth.uid(), '<recurso>', '<ação>'))`. **Ensaie em transação com rollback antes de aplicar** (ver §5).

Depois: `npm test` (os testes de invariante pegam menu órfão e escrita anônima) + `npx tsc --noEmit`.

---

## 4. CHECKLIST — adicionar uma ROTINA / worker / edge function

- **Worker VM (`vm-worker/`)** usa `SUPABASE_SECRET_KEY` (service_role) e **ignora RLS**. Não precisa de permissão; mas por isso mesmo, qualquer tabela que só o worker deveria escrever precisa ter RLS fechado para os demais (ex.: `model_worker_heartbeat`, `dtc_ai_jobs`).
- **Edge function** que faz ação privilegiada: valide dentro dela com a RPC `has_permission`, não com `role = 'admin'`. Modelo em `supabase/functions/create-user/index.ts` (checa `users.create`) e `admin-reset-password/index.ts` (checa `users.execute`). Depois de editar: `npx supabase functions deploy <nome>`.
- **Tabela nova**: habilite RLS (`ENABLE ROW LEVEL SECURITY`) e crie policies **explícitas por operação**. NUNCA use `TO public` — o role `public` inclui `anon`, e a chave anon está no bundle do site (qualquer um na internet). Use `TO authenticated` no mínimo. Atualize `src/integrations/supabase/types.ts` manualmente (o build não regenera).

---

## 5. Como verificar

**Testes automatizados** (`npm test`):
- `src/test/permissions-catalog.test.ts` — todo `permissionKey` de menu e todo `hasPermission("x","y")` literal existe no catálogo.
- `src/test/sidebar-empty-groups.test.tsx` / `require-permission.test.tsx` / `commercial-contacts-permissions.test.tsx` — a UI esconde o que deve e mostra o que deve.
- `src/test/rls-invariants.test.ts` — **roda contra o banco real** (precisa `SUPABASE_DB_URL` no `.env`; sem ela, é pulado). Verifica: zero escrita anônima, zero leitura anônima fora das rotas públicas, nenhum perfil vê menu sem tela dentro, `app_*` só escrevível por admin.

**Ensaio manual de policy** — antes de aplicar RLS em produção, teste numa transação que sempre desfaz:

```sql
begin;
  -- aplica a policy nova aqui (DROP/CREATE/ALTER)
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from public.profiles where role='user' limit 1))::text, true);
  set local role authenticated;
  -- tenta a operação como esse usuário; veja se passa/bloqueia como esperado
rollback;
```

Armadilha: `set local role` **só funciona dentro de `begin`**. Fora de transação roda como `postgres` (superuser, ignora RLS) e dá falso positivo.

---

## 6. Armadilhas do banco (produção: projeto `okvufcwkophaadttmjwa`)

- **Não rode `supabase db push`.** As migrations foram aplicadas colando no SQL Editor; o histórico da CLI (`schema_migrations`) está vazio, e o push tentaria replayar 60+ arquivos. Precisa de `migration repair` antes.
- **Fonte de verdade é `pg_policies`, não os arquivos de migration.** Banco e migrations divergiram no passado (há policies em produção sem migration correspondente).
- **Policy de INSERT** guarda a condição em `with_check`; `qual` é sempre nulo. Filtrar por `qual` esconde INSERTs abertos.
- **`TO public` = acesso anônimo.** Sempre `TO authenticated` (ou role específico). Foi a falha mais grave achada em 15/07: 19 policies expunham dados — incluindo PII de cliente — a qualquer um sem conta.

---

## 7. Estado atual (15/07/2026)

- Catálogo: 49 recursos, ~90 permissões.
- Perfis: `admin` (bypass total), `user` (padrão da equipe), `Teste` (mínimo, não-real).
- RLS: escrita em `projects` exige `has_permission`; todo acesso anônimo fechado; `profiles` e `clients`/`client_contacts` (PII) só legíveis por autenticado.
- Pendente (comandos administrativos, fora do código): deploy de `create-user`/`admin-reset-password`; rotação da senha do banco.

Migrations RBAC de referência: `supabase/migrations/20260715*_rbac_*.sql` e `20260715*_rls_*.sql`.
