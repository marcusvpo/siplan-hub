# Siplan HUB

Sistema interno de gestão operacional desenvolvido para o time da **Siplan**, centralizando o acompanhamento de projetos de conversão de cartórios, gestão comercial, implantação e administração de equipes.

---

## 🚀 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework** | React 18 + TypeScript 5 |
| **Build** | Vite 6 |
| **Roteamento** | React Router DOM v6 |
| **Estado / Cache** | TanStack React Query v5 + Zustand |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Storage) |
| **Estilização** | Tailwind CSS v3 + tailwindcss-animate |
| **Componentes UI** | Radix UI (primitives) + shadcn/ui |
| **Ícones** | Lucide React |
| **Formulários** | React Hook Form + Zod |
| **Gráficos** | Recharts |
| **Editor Rico** | Tiptap v3 + Lexical |
| **Animações** | Framer Motion |
| **Drag & Drop** | @dnd-kit |
| **Virtualização** | react-virtuoso + react-window |
| **Calendário** | react-day-picker |
| **Notificações** | Sonner |
| **Temas** | next-themes (dark/light mode) |

---

## 📦 Módulos e Funcionalidades

### 🏠 Home / Dashboard Principal
- Visão geral de KPIs operacionais
- Cards de SLA Compliance, Tempo Médio de Resolução e Carga de Trabalho por Cartório
- Contatos mensais e últimos contatos da fila
- Métricas de performance em tempo real

### 📋 Conversão de Projetos
Gestão completa do pipeline de conversão de cartórios para os sistemas da Siplan.

#### Fila de Conversão (`/conversion`)
- Tabela completa de projetos em conversão com filtros avançados
- Visualização por status, responsável, produto e tipo de sistema
- Modal de projeto com todas as etapas de conversão
- Auto-save de campos editáveis
- KPIs: projetos ativos, fila própria, % concluídos

#### Homologação (`/conversion-homologation`)
- Controle de projetos na fase de homologação
- Acompanhamento de aceitações e pendências

#### Engines de Conversão (`/conversion-engines`)
- Monitoramento de engines de conversão ativas
- Status e disponibilidade de cada engine

#### Minha Fila Detalhada (`/my-queue`)
- Visão personalizada da fila do usuário logado
- Cards expandidos com detalhes de cada projeto

---

### 📄 Modelos Editor OrionTN

Módulo dedicado à gestão do estágio **Modelos Editor** nos projetos OrionTN.

#### Dashboard (`/orion-tn-models/dashboard`)
- **5 KPI Cards**: Total c/ Editor, Em Andamento, Concluídos, Não Iniciados, Bloqueados
- **Distribuição de Status**: barras de progresso por para cada status
- **Arquivos**: total de arquivos enviados, disponíveis e taxa de conclusão
- **Progresso dos Projetos**: média geral + distribuição por faixas (0–25%, 26–50%, 51–75%, 76–100%) com anel SVG animado
- **Projetos Recentes**: tabela dos 10 projetos mais recentemente atualizados com modal de abertura

#### Gerenciar Projetos (`/orion-tn-models/projects`)
- Tabela paginada de todos os projetos OrionTN
- Filtros por status do estágio Modelos Editor
- Ordenação por múltiplas colunas

#### Editor de Modelos (`/orion-tn-models/:projectId`)
- Sidebar de projetos com busca e animação marquee nos nomes longos (ao hover/selecionado)
- Workspace de edição de modelos do projeto selecionado
- Upload de modelos enviados ao cliente e modelos disponíveis (JSON)
- Editor rico integrado (Tiptap)

---

### 💼 Comercial

#### Contatos (`/commercial-contacts`)
- Gestão de contatos comerciais com cartórios
- Histórico de interações por cartório
- Click-to-call integrado

#### Clientes (`/commercial-customers`)
- Cadastro e visão geral de clientes
- Métricas por cliente

#### Bloqueadores Comerciais (`/commercial-blockers`)
- Rastreamento de bloqueadores que impedem avanço comercial
- Categorização e responsáveis

#### Visão do Cliente (`/client-overview/:id`)
- Timeline completa do relacionamento com o cliente
- Histórico de todas as interações

---

### 🗓️ Calendário (`/calendar`)
- Calendário de eventos e agendamentos
- Integração com projetos e equipes
- Visualizações mensal / semanal

### 📊 Analytics (`/analytics`)
- Relatórios de desempenho operacional
- Gráficos com Recharts
- Filtros por período e responsável

### 🗺️ Roadmap (`/roadmap`)
- Linha do tempo visual de entregas e milestones
- Gestão de épicos e features

### 📅 Próximas Implantações (`/next-deployments`)
- Agenda de próximas implantações
- Status e responsáveis

### 📋 Relatórios (`/reports`)
- Geração de relatórios de rotina
- Export para PDF
- Contagem de rotinas ativas e inativas

### 🔄 Comparar Projetos (`/compare-projects`)
- Comparação lado a lado de múltiplos projetos
- Diferenças de estágio e progresso

---

### ⚙️ Administração

#### Dashboard Admin (`/admin`)
- Estatísticas gerais do sistema
- Visão consolidada de usuários e times

#### Gestão de Usuários (`/admin/users`)
- Cadastro e edição de usuários
- Controle de perfis e permissões
- Ativação / desativação de contas

#### Gestão de Times (`/admin/teams`)
- Criação e edição de times
- Atribuição de membros

#### Áreas de Times (`/admin/team-areas`)
- Organização de times por área funcional

#### Configurações do Time (`/admin/team-config`)
- Parâmetros e configurações por time

#### Gestão de Férias (`/admin/vacations`)
- Registro e aprovação de períodos de férias
- Calendário integrado de ausências

#### Logs de Auditoria (`/admin/audit-log`)
- Rastreamento de ações críticas no sistema
- Filtros por usuário, ação e período

---

## 🏗️ Arquitetura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Admin/           # Componentes do módulo admin
│   ├── Dashboard/       # Cards e widgets do dashboard
│   ├── Layout/          # MainLayout, Sidebar, Header
│   ├── ProjectManagement/  # Modal, forms, tabs de projeto
│   │   ├── Forms/       # StageCard e formulários de etapa
│   │   ├── ModelosEditor/  # ModelosEditorWorkspace
│   │   └── Tabs/        # FilesTab, StepsTab, etc.
│   ├── Reports/         # Componentes de relatórios
│   ├── calendar/        # Componentes de calendário
│   ├── conversion/      # Componentes de conversão
│   ├── editor/          # Editor rico (Tiptap/Lexical)
│   └── ui/              # Primitivos shadcn/ui (Button, Card, etc.)
├── hooks/               # 29 custom hooks
├── layouts/             # AdminLayout
├── lib/                 # Utilitários (supabase client, utils)
├── pages/               # Páginas por módulo
│   ├── admin/           # 7 páginas administrativas
│   ├── commercial/      # 5 páginas comerciais
│   └── conversion/      # 7 páginas de conversão
└── types/               # Tipos TypeScript (ProjectV2, etc.)
```

---

## 🔐 Autenticação

- Login via Supabase Auth
- Rotas protegidas com `ProtectedRoute`
- Contexto de autenticação via `useAuth`

---

## 🎨 Design System

- **Tema**: Light / Dark mode com alternância suave
- **Cor primária**: Vermelho bordô (`hsl(346, 84%, 45%)`)
- **Tipografia**: System font com Inter/Roboto fallback
- **Glassmorphism**, gradientes e micro-animações
- **Responsivo**: Grid adaptativo para mobile, tablet e desktop

---

## ▶️ Executando Localmente

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento (porta padrão 5173)
npm run dev

# Rodar em porta específica
npm run dev -- --port 8080

# Build de produção
npm run build
```

> Requer as variáveis de ambiente do Supabase configuradas (URL + anon key).
