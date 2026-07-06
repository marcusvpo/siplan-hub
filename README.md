# Siplan HUB

Sistema interno de gestão operacional da **Siplan**, centralizando o acompanhamento de projetos de **conversão** e **implantação** de sistemas para cartórios, além de gestão **comercial**, **analytics** e **administração** de equipes.

> 📖 **Documentação completa** em [`docs/`](docs/README.md) — inclui [documentação de todas as 48 telas](docs/telas/README.md), [modelo de dados Supabase](docs/MODELO_DE_DADOS.md), [referência de hooks](docs/REFERENCIA_HOOKS.md) e o [Manual do Desenvolvedor](docs/MANUAL_DESENVOLVEDOR.md).

---

## 🚀 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework** | React 18 + TypeScript 5 |
| **Build / Dev** | Vite 6 (`@vitejs/plugin-react-swc`) |
| **Roteamento** | React Router DOM v6 (com code-splitting via `React.lazy`) |
| **Estado / Cache** | TanStack React Query v5 + Zustand |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **Estilização** | Tailwind CSS v3 + tailwindcss-animate |
| **Componentes UI** | Radix UI (primitives) + shadcn/ui |
| **Ícones** | Lucide React |
| **Formulários** | React Hook Form + Zod |
| **Formulários dinâmicos** | `@rjsf` (JSON Schema Forms) — aderência, infra, checklists |
| **Editor Rico** | Lexical (`@lexical/*`) |
| **Gráficos** | Recharts |
| **Animações** | Framer Motion |
| **Drag & Drop** | @dnd-kit + @hello-pangea/dnd |
| **Virtualização** | react-virtuoso |
| **Exportação / Arquivos** | jsPDF + html2canvas (PDF) · JSZip |
| **Calendário** | react-day-picker |
| **Command palette** | cmdk |
| **Notificações** | Sonner + toaster (shadcn) |
| **Temas** | next-themes (dark/light) |
| **Testes** | Vitest + Testing Library + jsdom |

---

## ▶️ Executando Localmente

**Pré-requisitos:** Node.js 18+ (recomendado 20 LTS). O repositório inclui `bun.lockb` e `package-lock.json` — use o gerenciador de sua preferência.

```bash
# Instalar dependências
npm install            # ou: bun install

# Rodar em desenvolvimento (porta padrão 5173)
npm run dev

# Rodar em porta específica
npm run dev -- --port 8080

# Build de produção
npm run build

# Preview do build
npm run preview

# Lint e testes
npm run lint
npm run test
```

### Variáveis de ambiente

Crie um `.env` na raiz (já ignorado pelo git):

```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-publica>
```

Setup do backend em [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

---

## 📦 Módulos e Rotas

Todas as rotas do app ficam sob `<ProtectedRoute>` + `MainLayout` (exigem login), exceto as rotas públicas e as administrativas (sob `/admin`, que exigem papel de administrador). Documentação detalhada de cada tela em [docs/telas/](docs/telas/README.md).

### 🏠 Núcleo — Dashboard e Projetos
| Rota | Tela |
|---|---|
| `/` | Home (hub de navegação por permissões) |
| `/dashboard` | Dashboard com KPIs, gráficos e exportação PDF |
| `/dashboard/kanban` | Quadro Kanban de projetos (drag & drop por status) |
| `/projects` | Projetos ativos (grid virtualizado, filtros, comparação) |
| `/projects/:id` | Detalhes do projeto (abas, edição inline) |
| `/projects/:id/adherence` | Análise de aderência (JSON Schema + autosave) |
| `/compare` | Comparar projetos lado a lado |

### 📋 Conversão e Modelos OrionTN
| Rota | Tela |
|---|---|
| `/conversion` | Fila de conversão (+ Minha Fila detalhada) |
| `/conversion/engines` | Motores de conversão |
| `/orion-tn-models/dashboard` | Dashboard do estágio Modelos Editor |
| `/orion-tn-models/projects` | Projetos OrionTN |
| `/orion-tn-models/:projectId?` | Workspace de Modelos Editor |

### 🧑‍🔧 Implantadores
| Rota | Tela |
|---|---|
| `/implantadores` | Painel de implantadores |
| `/implantadores/aderencia` · `/:systemType` | Editor de formulário de aderência |
| `/implantadores/aderencia/finalizadas` | Aderências finalizadas |
| `/implantadores/homologation` | Homologação de conversões |
| `/implantadores/treinamento` | Roteiro de treinamento *(placeholder)* |
| `/implantadores/transicao` | DTC — Documento de Transição de Conhecimento (com leitor de voz) |

### 💼 Comercial
| Rota | Tela |
|---|---|
| `/commercial/customers` | Painel de clientes |
| `/commercial/client/:id` · `/timeline` | Visão 360º e timeline do cliente |
| `/commercial/blockers` | Central de bloqueios |
| `/commercial/contacts` | Contatos |
| `/commercial/deployment-forms` | Formulários de implantação |
| `/commercial/checklists` · `/questions` | Checklists e editor de perguntas |

### 🗓️ Calendário, Analytics e Relatórios
| Rota | Tela |
|---|---|
| `/calendar` | Calendário (drag & drop, bloqueio por férias) |
| `/agenda-analistas` | Agenda dos analistas (embed Power BI) |
| `/analytics` | Dashboard executivo (Recharts) |
| `/reports` | Relatórios e análises |
| `/deployments` · `/deployments/latest` | Próximas e últimas implantações |

### ⚙️ Administração (`/admin` — requer papel admin)
Dashboard admin, usuários, perfis (RBAC), equipes, auditoria, saúde dos projetos, férias, armazenamento e usuários inativos.

### 🌐 Rotas Públicas (sem login — anon key + RLS/RPC)
| Rota | Tela |
|---|---|
| `/login` | Login (Supabase Auth) |
| `/roadmap/:token` | Roadmap do cliente compartilhável |
| `/public/checklist/:id` | Checklist comercial público |
| `/public/infra-coleta/:id` | Coleta pública de infraestrutura |

---

## 🏗️ Arquitetura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Admin/           # Módulo admin (Settings, etc.)
│   ├── Dashboard/       # Cards e widgets do dashboard
│   ├── Layout/          # MainLayout, AppSidebar, Header
│   ├── ProjectManagement/  # Modal, forms e abas de projeto
│   │   ├── Forms/       # StageCards e StageForms (Infra, Ambiente, ...)
│   │   ├── ModelosEditor/  # ModelosEditorWorkspace
│   │   └── Tabs/        # StepsTab, FilesTab, etc.
│   ├── FormRenderer/    # Formulários dinâmicos via JSON Schema (@rjsf)
│   ├── checklist/       # Editor e renderização de checklists
│   ├── commercial/      # Componentes comerciais
│   ├── conversion/      # Componentes de conversão
│   ├── calendar/        # Componentes de calendário
│   ├── Reports/         # Componentes de relatórios
│   ├── editor/          # Editor rico (Lexical)
│   ├── public/          # Componentes das telas públicas
│   └── ui/              # Primitivos shadcn/ui
├── hooks/               # 34 custom hooks (ver docs/REFERENCIA_HOOKS.md)
├── stores/              # Zustand: calendarStore, filterStore, projectStore
├── contexts/            # AuthContext (autenticação)
├── services/            # activityLogger
├── integrations/supabase/  # Client e tipos gerados
├── layouts/             # AdminLayout
├── constants/           # menuItems, etc.
├── lib/ · utils/        # Utilitários
├── pages/               # Páginas por módulo (admin, commercial, conversion, implantadores, public)
├── types/               # Tipos (ProjectV2, admin, calendar, conversion, team)
└── test/                # Testes Vitest

supabase/
├── migrations/          # 40 migrations (schema, RLS, RPCs, seeds)
└── functions/create-user/  # Edge Function de criação de usuário
```

Padrões-chave (detalhes no [Manual do Desenvolvedor](docs/MANUAL_DESENVOLVEDOR.md) e no [GEMINI.md](GEMINI.md)):
- **Split Query:** listagens usam `useProjectsList` (leve); detalhes usam `useProjectDetails` (lazy). Nunca busque `stages`/`notes` em listagens.
- **Mutações** via `useProjectsV2` devem invalidar as query keys corretas (`['projectsList']`, `['projectDetails', id]`).
- **Autosave com debounce** (`useAutoSave`) em formulários de edição.

---

## 🔐 Autenticação e Segurança

- Login via **Supabase Auth**; rotas protegidas por `ProtectedRoute` e contexto `useAuth`.
- **RBAC** com tabelas `app_roles` / `app_permissions` / `app_role_permissions` e função `has_permission()`; espelhado no front por `usePermissions`.
- **RLS** habilitado em todas as tabelas; acesso público controlado por RPCs `SECURITY DEFINER` e políticas específicas. Ver [docs/MODELO_DE_DADOS.md](docs/MODELO_DE_DADOS.md).

---

## 🎨 Design System

- **Tema:** dark/light via next-themes (padrão: dark).
- **Cor primária:** vermelho bordô (`hsl(346, 84%, 45%)`).
- **UI:** Radix + shadcn/ui, Tailwind, glassmorphism e micro-animações.
- Diretrizes e checklist visual em [docs/VISUAL_QA.md](docs/VISUAL_QA.md).

---

## 🧪 Testes e Qualidade

- **Testes:** `npm run test` (Vitest). Cobertura atual concentrada em transformadores de projeto e validação de infra.
- **Lint:** `npm run lint` (ESLint + typescript-eslint).

> [!NOTE]
> **Pendência conhecida:** `src/integrations/supabase/types.ts` está vazio, deixando o data-layer sem tipagem e gerando erros de `tsc`. Regenere com `npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts`.
