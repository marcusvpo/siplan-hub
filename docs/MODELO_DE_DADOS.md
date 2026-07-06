# 🗄️ Modelo de Dados (Supabase / PostgreSQL)

Referência das tabelas, funções (RPCs), políticas de segurança (RLS) e buckets de Storage do **Siplan HUB**. O schema é definido pelas migrations em [`supabase/migrations/`](../supabase/migrations/). Este documento é um mapa navegável — a fonte da verdade é sempre o SQL das migrations.

> [!IMPORTANT]
> O arquivo `src/integrations/supabase/types.ts` está **vazio** no momento. Ele deveria conter os tipos TypeScript gerados a partir deste schema (`Database`, `Json`, `Tables`, `TablesInsert`, …). Enquanto estiver vazio, todo o acesso ao banco fica sem tipagem e o `tsc` acusa erros. Regenere com:
> ```bash
> npx supabase gen types typescript --project-id okvufcwkophaadttmjwa > src/integrations/supabase/types.ts
> ```

---

## 📋 Tabelas

| Tabela | Propósito | Migration de origem |
|---|---|---|
| `projects` | Projetos de conversão/implantação — coração do sistema. Guarda `stages` (JSONB), status global, healthScore, cliente, produto, responsável | `20251125145104_*` |
| `timeline_events` | Eventos de linha do tempo por projeto (histórico, agenda, calendário) | `20251125145104_*` / `20260109_fix_roadmap_system` |
| `project_files` | Metadados de arquivos anexados a projetos (Storage) | `20251125145104_*` |
| `project_checklist` | Itens de checklist por projeto | `20251125172107_*` |
| `saved_filters` | Filtros salvos por usuário (grids/dashboards) | `20251125172107_*` |
| `team_members` | Membros de equipe (analistas, implantadores) | `20251202_create_team_members` |
| `profiles` | Perfil do usuário autenticado (vinculado ao `auth.users`), papel/role | `20251202_setup_auth_profiles` |
| `settings` | Configurações globais chave/valor do sistema | `20251219134154_create_settings_table` |
| `roadmaps` | Roadmaps compartilháveis via token público | `20260109_fix_roadmap_system` |
| `commercial_notes` | Anotações/interações comerciais por cliente | `20260114_add_commercial_expansion` |
| `app_roles` | Papéis do RBAC | `20260310165500_rbac_schema` |
| `app_permissions` | Permissões (recurso + ação) do RBAC | `20260310165500_rbac_schema` |
| `app_role_permissions` | Associação N:N papel↔permissão | `20260310165500_rbac_schema` |
| `form_templates` | Templates de formulário (aderência, infra, OrionTN/Reg/Pro) | `20260601141300_implantadores_templates` |
| `project_form_responses` | Respostas de formulário por projeto (dirige status via verdict) | `20260601141300_implantadores_templates` |
| `commercial_checklists` | Checklists comerciais (com link público) | `20260602141500_create_commercial_checklists` |

> Colunas evoluíram em migrations posteriores (ex.: `20251202_add_project_fields`, `20251212_add_stage_dates`, `20260611091500_add_work_hours`, `20260622171000_add_infra_servers_workstations`, `20260617112000_remove_unused_project_fields`). Consulte-as ao investigar um campo específico.

---

## ⚙️ Funções / RPCs

| Função | Papel |
|---|---|
| `update_updated_at_column()` | Trigger genérico que mantém `updated_at` |
| `handle_new_user()` | Cria `profiles` automaticamente ao registrar em `auth.users` |
| `create_new_user(...)` | Criação administrativa de usuário (ver também Edge Function `create-user`) |
| `get_roadmap_data(token_uuid)` | Retorna dados do roadmap para acesso público via token |
| `has_permission(user_id, resource, action)` | Núcleo do RBAC — checa permissão do usuário |
| `sync_project_form_response_status()` | Sincroniza status do projeto a partir do verdict da resposta de formulário |
| `coerce_project_global_status()` | Normaliza/deriva o status global do projeto |
| `get_project_public_info(p_id)` | Info pública do projeto para a tela de coleta de infra (sem login) |
| `update_project_public_infra(...)` | Submissão pública de infra (servidores/estações) via anon key |

---

## 🔐 Segurança (RLS) e Modelo de Acesso

- **RLS habilitado** em todas as tabelas. As políticas evoluíram de permissivas (`USING (true)`) para restritas a `authenticated`, endurecidas em `20260129_security_hardening_rls`.
- **RBAC**: papéis e permissões em `app_roles` / `app_permissions` / `app_role_permissions`, avaliados por `has_permission()`. No front-end, o hook [`usePermissions`](../src/hooks/usePermissions.ts) espelha essa lógica.
- **Acesso público controlado** (sem login, via anon key): roadmaps por token (`get_roadmap_data`), checklists comerciais públicos e coleta pública de infra (`get_project_public_info` / `update_project_public_infra`). O link de infra pode ser **fechado** (`20260623115500_add_infra_public_link_closed`).

---

## 🪣 Buckets de Storage

| Bucket | Uso | Migration |
|---|---|---|
| Arquivos de projeto | Anexos de `project_files` | `20251125174249_*` |
| `form-images` | Imagens enviadas em formulários (aderência/infra) | `20260601142200_form_images_bucket` |

---

## 🔎 Como investigar o schema

1. Liste as migrations em ordem: `ls supabase/migrations/`.
2. Para um campo/tabela específico: `grep -rin "nome_da_coluna" supabase/migrations/`.
3. Migrations são **imutáveis e cumulativas** — nunca edite uma antiga; crie uma nova com timestamp.

Veja também: [SUPABASE_SETUP.md](SUPABASE_SETUP.md) e [Architecture.md](Architecture.md).
