# PROMPT MESTRE - Siplan Manager
## Especificação Completa para Vibe Coding com IA

**Versão:** 1.0  
**Público-Alvo:** Claude 3.5 Sonnet, GPT-4o, ou modelos equivalentes com capacidade de gerar código React completo  
**Objetivo:** Gerar uma aplicação web React funcional (SPA) que implemente a plataforma de gestão de implantação da Siplan  

---

## ÍNDICE
1. [Contexto e Missão](#1-contexto-e-missão)
2. [Stack Tecnológico Obrigatório](#2-stack-tecnológico-obrigatório)
3. [Arquitetura de Aplicação](#3-arquitetura-de-aplicação)
4. [Data Structure Completa (Mock Data)](#4-data-structure-completa-mock-data)
5. [Especificações do Dashboard](#5-especificações-do-dashboard)
6. [Especificações do Drawer (Formulário Modular)](#6-especificações-do-drawer-formulário-modular)
7. [Especificações da Timeline](#7-especificações-da-timeline)
8. [Lógica de Cálculos (Health Score, Dias Sem Update)](#8-lógica-de-cálculos-health-score-dias-sem-update)
9. [Sistema de Permissões](#9-sistema-de-permissões)
10. [Validações e Regras de Negócio](#10-validações-e-regras-de-negócio)
11. [Guia de Estilo e Visual Design](#11-guia-de-estilo-e-visual-design)
12. [Instruções de Implementação](#12-instruções-de-implementação)

---

## 1. CONTEXTO E MISSÃO

### 1.1 O Cenário
Você está desenvolvendo o **Siplan Manager**, uma aplicação web moderna para substituir um processo manual no Microsoft SharePoint Lists. O objetivo é criar um painel inteligente de gestão de implantações de softwares para cartórios.

**Contexto de Negócio:**
- A Siplan gerencia ~550 cartórios brasileiros.
- O processo de implantação é complexo: Infra → Aderência → Ambiente → Conversão → Implantação → Pós.
- Cada projeto pode ter até 6 etapas ativas simultaneamente (não é um fluxo rigidamente sequencial).
- O principal problema: **o gestor não consegue visualizar gargalos sem abrir 50+ projetos manualmente.**

### 1.2 Princípios de Design Imperativo
1. **Gestão por Exceção:** Destacar APENAS o que precisa de atenção (vermelho/amarelo), não tudo.
2. **Zero Cliques Desnecessários:** Um clique = abre o detalhe. Dois cliques máximo para atualizar um status.
3. **Inteligência Automática:** Cada alteração gera um log automático. Gestor nunca escreve "UAT. 25/11 por Marcus" manualmente.
4. **Limpeza Visual:** Sem campos de "% Conclusão" ou "Datas de Previsão" desnecessárias.

---

## 2. STACK TECNOLÓGICO OBRIGATÓRIO

**Frontend:**
- **React** (Vite ou Next.js, preferência Vite para SPA pura).
- **TypeScript** (obrigatório para type safety).
- **Tailwind CSS** (estilização).
- **Shadcn UI** (componentes base: Card, Button, Select, Input, Sheet, Dialog, Tabs, etc.).
- **Lucide React** (ícones).
- **React Query** (gerenciar estado de dados, fetch).
- **Zustand** (gerenciar estado global: user autenticado, filtros, etc.).
- **date-fns** ou **Day.js** (manipulação de datas).

**Backend (Mockado para MVP):**
- Dados salvos em **localStorage** ou **IndexedDB** para persistência local.
- Funções simuladas de API (ex: `fetchProjects()`, `updateProject()`).
- **Opção:** Se quiser um backend real, usar Supabase + PostgreSQL (recomendado para próximas fases).

**Ferramentas de Desenvolvimento:**
- **ESLint** e **Prettier** (code quality).
- **Vitest** (testes unitários, opcional para MVP).

---

## 3. ARQUITETURA DE APLICAÇÃO

### 3.1 Estrutura de Pastas Recomendada

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── DashboardTable.tsx
│   │   ├── FilterBar.tsx
│   │   └── HealthBadge.tsx
│   ├── ProjectDrawer/
│   │   ├── ProjectDrawer.tsx
│   │   ├── ModuleCard.tsx
│   │   ├── TimelinePanel.tsx
│   │   └── CommentInput.tsx
│   ├── Common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── NotificationCenter.tsx
│   └── Forms/
│       ├── InfraForm.tsx
│       ├── AdherenceForm.tsx
│       ├── EnvironmentForm.tsx
│       ├── ConversionForm.tsx
│       ├── ImplementationForm.tsx
│       └── PostForm.tsx
├── hooks/
│   ├── useProjects.ts
│   ├── useHealthScore.ts
│   ├── usePermissions.ts
│   └── useTimeline.ts
├── stores/
│   ├── projectStore.ts
│   └── userStore.ts
├── types/
│   ├── Project.ts
│   ├── User.ts
│   └── Timeline.ts
├── utils/
│   ├── mockData.ts
│   ├── validators.ts
│   ├── calculations.ts
│   └── dateHelpers.ts
├── App.tsx
└── main.tsx
```

### 3.2 Data Flow

```
User Actions (Click)
       ↓
Component Event Handler
       ↓
Zustand Store Update + localStorage
       ↓
React Query Refetch (simula API call)
       ↓
Component Re-render
       ↓
Timeline Log Auto-generated
```

---

## 4. DATA STRUCTURE COMPLETA (MOCK DATA)

### 4.1 TypeScript Types

```typescript
// types/Project.ts

export enum ProjectStatus {
  TODO = "todo",
  IN_PROGRESS = "in-progress",
  DONE = "done",
  BLOCKED = "blocked",
}

export enum SystemType {
  ORION_PRO = "Orion PRO",
  ORION_TN = "Orion TN",
  ORION_REG = "Orion REG",
}

export enum HealthScore {
  OK = "ok",
  WARNING = "warning",
  CRITICAL = "critical",
}

export interface Stage {
  status: ProjectStatus;
  responsible: string; // user id
  startDate?: Date;
  endDate?: Date;
  observations?: string;
}

export interface InfraStage extends Stage {
  blockingReason?: string; // "Aguardando Compra Servidor", "Upgrade SO Necessário", etc
}

export interface AdherenceStage extends Stage {
  hasProductGap: boolean;
  devTicket?: string;
  devEstimatedDate?: Date;
}

export interface EnvironmentStage extends Stage {
  realDate?: Date;
  osVersion?: string; // "Windows 2016" | "Windows 2019" | "Windows 2022" | "Linux"
  approvedByInfra: boolean;
}

export interface ConversionStage extends Stage {
  sourceSystem?: "Siplan" | "Control-M" | "Argon" | "Alkasoft" | "other";
}

export interface ImplementationStage extends Stage {
  remoteInstallDate?: Date;
  trainingStartDate?: Date;
  trainingEndDate?: Date;
  switchType?: "weekend" | "business-day";
}

export interface PostStage extends Stage {}

export interface TimelineEvent {
  id: string;
  type: "auto" | "comment";
  author: string; // user id
  message: string;
  timestamp: Date;
  metadata?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
  };
}

export interface Project {
  id: string;
  clientName: string;
  ticketNumber: string;
  systemType: SystemType;
  projectLeader: string; // user id
  createdAt: Date;
  updatedAt: Date;
  lastUpdateBy: string; // user id
  nextFollowUpDate?: Date;
  
  // Calculated fields (não armazenar, calcular sob demanda)
  healthScore?: HealthScore;
  daysSinceUpdate?: number;

  stages: {
    infra: InfraStage;
    adherence: AdherenceStage;
    environment: EnvironmentStage;
    conversion: ConversionStage;
    implementation: ImplementationStage;
    post: PostStage;
  };

  timeline: TimelineEvent[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  avatar?: string;
  createdAt: Date;
}
```

### 4.2 Mock Data (5 Projetos Realistas)

```typescript
// utils/mockData.ts

export const MOCK_USERS: User[] = [
  {
    id: "user-bruno",
    name: "Bruno Fernandes",
    email: "bruno@siplan.com.br",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?u=bruno",
    createdAt: new Date("2025-01-01"),
  },
  {
    id: "user-alex",
    name: "Alex Silva",
    email: "alex@siplan.com.br",
    role: "analyst",
    avatar: "https://i.pravatar.cc/150?u=alex",
    createdAt: new Date("2025-01-05"),
  },
  {
    id: "user-joao",
    name: "João Infra",
    email: "joao@siplan.com.br",
    role: "analyst",
    avatar: "https://i.pravatar.cc/150?u=joao",
    createdAt: new Date("2025-01-10"),
  },
  {
    id: "user-maria",
    name: "Maria Conversão",
    email: "maria@siplan.com.br",
    role: "analyst",
    avatar: "https://i.pravatar.cc/150?u=maria",
    createdAt: new Date("2025-01-15"),
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-001",
    clientName: "Mogi-Mirim",
    ticketNumber: "696613",
    systemType: SystemType.ORION_PRO,
    projectLeader: "user-bruno",
    createdAt: new Date("2025-11-01"),
    updatedAt: new Date("2025-11-18"),
    lastUpdateBy: "user-alex",
    nextFollowUpDate: new Date("2025-11-25"),
    stages: {
      infra: {
        status: ProjectStatus.DONE,
        responsible: "user-joao",
        startDate: new Date("2025-11-01"),
        endDate: new Date("2025-11-10"),
        observations: "Servidor configurado, Windows 2022 instalado.",
      },
      adherence: {
        status: ProjectStatus.IN_PROGRESS,
        responsible: "user-alex",
        startDate: new Date("2025-11-15"),
        hasProductGap: true,
        devTicket: "DEV-1234",
        devEstimatedDate: new Date("2025-12-02"),
        observations: "Encontrado gap em módulo de Protesto. Dev em andamento.",
      },
      environment: {
        status: ProjectStatus.TODO,
        responsible: "",
        osVersion: "Windows 2022",
        approvedByInfra: true,
      },
      conversion: {
        status: ProjectStatus.TODO,
        responsible: "user-maria",
        sourceSystem: "Argon",
      },
      implementation: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
      post: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
    },
    timeline: [
      {
        id: "evt-001-1",
        type: "auto",
        author: "system",
        message: "Projeto criado",
        timestamp: new Date("2025-11-01T08:00:00"),
      },
      {
        id: "evt-001-2",
        type: "auto",
        author: "system",
        message: "Status de Infra alterado para Em Andamento",
        timestamp: new Date("2025-11-01T08:30:00"),
        metadata: { field: "infra.status", oldValue: "todo", newValue: "in-progress" },
      },
      {
        id: "evt-001-3",
        type: "auto",
        author: "system",
        message: "Responsável Infra alterado para João Infra",
        timestamp: new Date("2025-11-01T08:30:00"),
        metadata: { field: "infra.responsible", oldValue: "", newValue: "user-joao" },
      },
      {
        id: "evt-001-4",
        type: "auto",
        author: "system",
        message: "Status de Infra alterado para Finalizado",
        timestamp: new Date("2025-11-10T16:45:00"),
        metadata: { field: "infra.status", oldValue: "in-progress", newValue: "done" },
      },
      {
        id: "evt-001-5",
        type: "comment",
        author: "user-joao",
        message: "Infra totalmente validada e em produção. Servidor está respondendo bem em testes de carga.",
        timestamp: new Date("2025-11-10T17:00:00"),
      },
      {
        id: "evt-001-6",
        type: "auto",
        author: "system",
        message: "Status de Aderência alterado para Em Andamento",
        timestamp: new Date("2025-11-15T09:00:00"),
        metadata: { field: "adherence.status", oldValue: "todo", newValue: "in-progress" },
      },
      {
        id: "evt-001-7",
        type: "comment",
        author: "user-alex",
        message: "Análise iniciada. Encontrado gap em módulo de Protesto não presente na versão atual do Orion. Escalado para dev.",
        timestamp: new Date("2025-11-15T14:30:00"),
      },
      {
        id: "evt-001-8",
        type: "auto",
        author: "system",
        message: "Pendência de Produto ativada. Ticket Dev: DEV-1234, Prazo: 2025-12-02",
        timestamp: new Date("2025-11-18T10:00:00"),
        metadata: { field: "adherence.hasProductGap", oldValue: false, newValue: true },
      },
      {
        id: "evt-001-9",
        type: "comment",
        author: "user-bruno",
        message: "Aderência pausada aguardando desenvolvimento. Conversão pode prosseguir em paralelo.",
        timestamp: new Date("2025-11-18T15:00:00"),
      },
    ],
  },

  {
    id: "proj-002",
    clientName: "Itu",
    ticketNumber: "689928",
    systemType: SystemType.ORION_PRO,
    projectLeader: "user-bruno",
    createdAt: new Date("2025-11-05"),
    updatedAt: new Date("2025-11-20"),
    lastUpdateBy: "user-maria",
    nextFollowUpDate: new Date("2025-11-28"),
    stages: {
      infra: {
        status: ProjectStatus.DONE,
        responsible: "user-joao",
        startDate: new Date("2025-11-05"),
        endDate: new Date("2025-11-12"),
      },
      adherence: {
        status: ProjectStatus.DONE,
        responsible: "user-alex",
        startDate: new Date("2025-11-13"),
        endDate: new Date("2025-11-19"),
        hasProductGap: false,
      },
      environment: {
        status: ProjectStatus.DONE,
        responsible: "user-joao",
        realDate: new Date("2025-11-20"),
        osVersion: "Windows 2019",
        approvedByInfra: true,
      },
      conversion: {
        status: ProjectStatus.IN_PROGRESS,
        responsible: "user-maria",
        sourceSystem: "Siplan",
        observations: "Conversão em fase de homologação.",
      },
      implementation: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
      post: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
    },
    timeline: [
      {
        id: "evt-002-1",
        type: "auto",
        author: "system",
        message: "Projeto criado",
        timestamp: new Date("2025-11-05T10:00:00"),
      },
      {
        id: "evt-002-2",
        type: "auto",
        author: "system",
        message: "Status de Infra alterado para Finalizado",
        timestamp: new Date("2025-11-12T15:00:00"),
      },
      {
        id: "evt-002-3",
        type: "auto",
        author: "system",
        message: "Status de Aderência alterado para Finalizado",
        timestamp: new Date("2025-11-19T16:00:00"),
      },
      {
        id: "evt-002-4",
        type: "auto",
        author: "system",
        message: "Status de Ambiente alterado para Finalizado",
        timestamp: new Date("2025-11-20T09:00:00"),
      },
      {
        id: "evt-002-5",
        type: "auto",
        author: "system",
        message: "Status de Conversão alterado para Em Andamento",
        timestamp: new Date("2025-11-20T10:00:00"),
      },
      {
        id: "evt-002-6",
        type: "comment",
        author: "user-maria",
        message: "Conversão de sistema Siplan (conhecida) iniciada. Prazo estimado 2-3 dias.",
        timestamp: new Date("2025-11-20T11:00:00"),
      },
    ],
  },

  {
    id: "proj-003",
    clientName: "Cartório Araçatuba",
    ticketNumber: "701967",
    systemType: SystemType.ORION_PRO,
    projectLeader: "user-bruno",
    createdAt: new Date("2025-11-10"),
    updatedAt: new Date("2025-11-15"),
    lastUpdateBy: "user-joao",
    nextFollowUpDate: new Date("2025-11-22"),
    stages: {
      infra: {
        status: ProjectStatus.BLOCKED,
        responsible: "user-joao",
        startDate: new Date("2025-11-10"),
        blockingReason: "Aguardando Compra de Servidor",
        observations: "Cliente em negociação com fornecedor. Prazo estimado: 3 semanas.",
      },
      adherence: {
        status: ProjectStatus.TODO,
        responsible: "",
        hasProductGap: false,
      },
      environment: {
        status: ProjectStatus.TODO,
        responsible: "",
        approvedByInfra: false,
      },
      conversion: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
      implementation: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
      post: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
    },
    timeline: [
      {
        id: "evt-003-1",
        type: "auto",
        author: "system",
        message: "Projeto criado",
        timestamp: new Date("2025-11-10T08:00:00"),
      },
      {
        id: "evt-003-2",
        type: "auto",
        author: "system",
        message: "Status de Infra alterado para Em Andamento",
        timestamp: new Date("2025-11-10T09:00:00"),
      },
      {
        id: "evt-003-3",
        type: "comment",
        author: "user-joao",
        message: "Levantamento realizado. Cliente precisa fazer upgrade de infraestrutura completo. Servidor atual é 2008 Server (obsoleto).",
        timestamp: new Date("2025-11-12T14:00:00"),
      },
      {
        id: "evt-003-4",
        type: "auto",
        author: "system",
        message: "Status de Infra alterado para Bloqueado",
        timestamp: new Date("2025-11-15T10:00:00"),
        metadata: { field: "infra.status", oldValue: "in-progress", newValue: "blocked" },
      },
      {
        id: "evt-003-5",
        type: "comment",
        author: "user-joao",
        message: "Devolvido ao Comercial. Cliente precisa comprar novo servidor (3 semanas estimado).",
        timestamp: new Date("2025-11-15T10:15:00"),
      },
    ],
  },

  {
    id: "proj-004",
    clientName: "Cartório Taubaté",
    ticketNumber: "687192",
    systemType: SystemType.ORION_REG,
    projectLeader: "user-bruno",
    createdAt: new Date("2025-10-15"),
    updatedAt: new Date("2025-11-18"),
    lastUpdateBy: "user-alex",
    nextFollowUpDate: new Date("2025-11-23"),
    stages: {
      infra: {
        status: ProjectStatus.DONE,
        responsible: "user-joao",
        startDate: new Date("2025-10-15"),
        endDate: new Date("2025-10-22"),
      },
      adherence: {
        status: ProjectStatus.DONE,
        responsible: "user-alex",
        startDate: new Date("2025-10-23"),
        endDate: new Date("2025-11-05"),
        hasProductGap: false,
      },
      environment: {
        status: ProjectStatus.DONE,
        responsible: "user-joao",
        realDate: new Date("2025-11-06"),
        osVersion: "Windows 2022",
        approvedByInfra: true,
      },
      conversion: {
        status: ProjectStatus.DONE,
        responsible: "user-maria",
        sourceSystem: "Control-M",
        observations: "Conversão bem-sucedida. Homologação aprovada.",
      },
      implementation: {
        status: ProjectStatus.IN_PROGRESS,
        responsible: "user-alex",
        remoteInstallDate: new Date("2025-11-18"),
        trainingStartDate: new Date("2025-11-20"),
        trainingEndDate: new Date("2025-11-22"),
        switchType: "weekend",
        observations: "Treinamento iniciado. 2 dias de presencial.",
      },
      post: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
    },
    timeline: [
      {
        id: "evt-004-1",
        type: "auto",
        author: "system",
        message: "Projeto criado",
        timestamp: new Date("2025-10-15T08:00:00"),
      },
      {
        id: "evt-004-2",
        type: "auto",
        author: "system",
        message: "Status de Infra alterado para Finalizado",
        timestamp: new Date("2025-10-22T14:00:00"),
      },
      {
        id: "evt-004-3",
        type: "auto",
        author: "system",
        message: "Status de Aderência alterado para Finalizado",
        timestamp: new Date("2025-11-05T15:00:00"),
      },
      {
        id: "evt-004-4",
        type: "auto",
        author: "system",
        message: "Status de Ambiente alterado para Finalizado",
        timestamp: new Date("2025-11-06T10:00:00"),
      },
      {
        id: "evt-004-5",
        type: "auto",
        author: "system",
        message: "Status de Conversão alterado para Finalizado",
        timestamp: new Date("2025-11-12T16:00:00"),
      },
      {
        id: "evt-004-6",
        type: "comment",
        author: "user-maria",
        message: "Homologação de conversão aprovada. Banco de dados 100% íntegro. Pronto para Implantação.",
        timestamp: new Date("2025-11-12T16:30:00"),
      },
      {
        id: "evt-004-7",
        type: "auto",
        author: "system",
        message: "Status de Implantação alterado para Em Andamento",
        timestamp: new Date("2025-11-18T08:00:00"),
      },
      {
        id: "evt-004-8",
        type: "comment",
        author: "user-alex",
        message: "Instalação remota completada. Treinamento presencial iniciado. Equipe bem receptiva.",
        timestamp: new Date("2025-11-20T14:00:00"),
      },
    ],
  },

  {
    id: "proj-005",
    clientName: "Cartório São José dos Campos",
    ticketNumber: "703028",
    systemType: SystemType.ORION_TN,
    projectLeader: "user-bruno",
    createdAt: new Date("2025-11-12"),
    updatedAt: new Date("2025-11-12"),
    lastUpdateBy: "user-bruno",
    nextFollowUpDate: new Date("2025-11-29"),
    stages: {
      infra: {
        status: ProjectStatus.TODO,
        responsible: "",
        hasProductGap: false,
      },
      adherence: {
        status: ProjectStatus.TODO,
        responsible: "",
        hasProductGap: false,
      },
      environment: {
        status: ProjectStatus.TODO,
        responsible: "",
        approvedByInfra: false,
      },
      conversion: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
      implementation: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
      post: {
        status: ProjectStatus.TODO,
        responsible: "",
      },
    },
    timeline: [
      {
        id: "evt-005-1",
        type: "auto",
        author: "system",
        message: "Projeto criado",
        timestamp: new Date("2025-11-12T09:00:00"),
      },
      {
        id: "evt-005-2",
        type: "comment",
        author: "user-bruno",
        message: "Novo projeto. Cliente confirmou início do processo. Agendando levantamento de infra.",
        timestamp: new Date("2025-11-12T10:00:00"),
      },
    ],
  },
];
```

---

## 5. ESPECIFICAÇÕES DO DASHBOARD

### 5.1 Componente Principal: DashboardTable

**Props:**
```typescript
interface DashboardTableProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
  loading?: boolean;
}
```

**Renderização:**

1. **Tabela Renderizada com Shadcn UI `<Table>` ou `<DataTable>`:**
   - Use a estratégia de "Rich Table" (não tabela HTML simples).
   - Cada linha é clicável e leva ao Drawer.

2. **Colunas:**

| Coluna | Tipo | Conteúdo |
|--------|------|---------|
| **Cliente** | Texto | Ex: "Mogi-Mirim" (bold), "Orion PRO" (cinza, menor) |
| **Pipeline** | Visual | 6 dots coloridos (Infra/Aderência/Amb/Conv/Impl/Pós) com tooltip ao hover |
| **Saúde** | Badge | 🟢 Ok / 🟡 Warning / 🔴 Critical |
| **Próx. Follow-up** | Data | Ex: "25/11 (Hoje)" em laranja se ≤ hoje |
| **Última Ação** | Texto | Ex: "Há 2h por Bruno" |
| **Ação** | Botão | "Ver Detalhes" |

**Filtros (Sticky Top):**
```
[Filtro Status: ▼] [Filtro Sistema: ▼] [Filtro Etapa: ▼] [Buscar: ___________]
```

**Ordem Padrão:**
- Críticos (🔴) no topo.
- Depois Warning (🟡).
- Depois Ok (🟢).

**Responsividade:**
- Desktop: Todas as colunas visíveis.
- Tablet: Ocultar "Última Ação", fazer "Saúde" em ícone pequeno.
- Mobile: Apenas Cliente, Pipeline, Saúde, botão "Detalhes".

---

### 5.2 Lógica de Cálculo de Health Score

```typescript
// utils/calculations.ts

export function calculateHealthScore(project: Project): HealthScore {
  const now = new Date();
  const lastUpdate = new Date(project.updatedAt);
  const daysSince = Math.floor(
    (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Verificar se próximo follow-up venceu
  const followUpVencido =
    project.nextFollowUpDate && new Date(project.nextFollowUpDate) < now;

  // Verificar se há bloqueadores
  const hasBlockers =
    project.stages.infra.status === ProjectStatus.BLOCKED ||
    project.stages.adherence.status === ProjectStatus.BLOCKED ||
    project.stages.environment.status === ProjectStatus.BLOCKED;

  // Regra 1: Crítico se follow-up vencido OU > 5 dias sem update
  if (followUpVencido || daysSince > 5) {
    return HealthScore.CRITICAL;
  }

  // Regra 2: Warning se 2-5 dias sem update OU bloqueadores
  if (daysSince >= 2 || hasBlockers) {
    return HealthScore.WARNING;
  }

  // Regra 3: Ok
  return HealthScore.OK;
}

export function getDaysSinceUpdate(project: Project): number {
  const now = new Date();
  const lastUpdate = new Date(project.updatedAt);
  return Math.floor(
    (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  );
}
```

---

## 6. ESPECIFICAÇÕES DO DRAWER (FORMULÁRIO MODULAR)

### 6.1 Layout Geral

Ao clicar em um projeto, abre um `Sheet` do Shadcn UI (Drawer) da direita, ocupando 85% da tela.

**Estrutura Interna:**
```
┌─────────────────────────────────────────────────────────┐
│ [X] Mogi-Mirim | Orion PRO | #696613 | Líder: Bruno   │ ← Sticky Header
├─────────────────────────┬───────────────────────────────┤
│                         │                               │
│  [Infra Card]           │   Timeline (Lado Direito)    │
│  [Aderência Card]       │                               │
│  [Ambiente Card]        │   ↑ Comentários anteriores   │
│  [Conversão Card]       │                               │
│  [Implantação Card]     │   ↓ Input: Escreva...        │
│  [Pós-Impl Card]        │                               │
│                         │                               │
└─────────────────────────┴───────────────────────────────┘
```

### 6.2 Cards de Formulário (Modular)

Cada card é um `<Accordion>` ou `<Collapsible>` que abre/fecha.

**Padrão para Cada Card:**

```typescript
interface ModuleCardProps {
  title: string; // Ex: "Análise de Infraestrutura"
  stage: Stage;
  stageKey: keyof Project["stages"]; // Ex: "infra"
  onUpdate: (updates: Partial<Stage>) => void;
  userRole: "admin" | "analyst" | "viewer";
  isEditable: boolean;
}
```

**Campos Comuns a TODOS os Cards:**
- Status (Select, dropdown).
- Responsável (Select com busca de usuários).
- Data Início (Date picker).
- Data Fim (Date picker).
- Observações (Textarea).

**Campos Específicos:**

#### Card 1: Análise de Infraestrutura
```typescript
{
  status: "reprovado" | "em-andamento" | "finalizado" | "n/a",
  responsible: string,
  startDate: Date,
  endDate: Date,
  blockingReason: Select (só se status = "reprovado"), // "Aguardando Compra...", "Upgrade SO...", etc
  observations: Textarea
}
```
**Visual:** Se `status = "reprovado"`, borda esquerda **vermelha** (4px).

#### Card 2: Análise de Aderência
```typescript
{
  status: "n/a" | "em-andamento" | "finalizado" | "impedimento",
  responsible: string,
  startDate: Date,
  endDate: Date,
  hasProductGap: Toggle (Sim/Não),
  // Campos condicionais (aparecem se hasProductGap = true):
  devTicket: string,
  devEstimatedDate: Date,
  observations: Textarea
}
```
**Visual:** Se `hasProductGap = true`, borda esquerda **amarela** (4px).

#### Card 3: Criação de Ambiente
```typescript
{
  status: "n/a" | "em-andamento" | "finalizado",
  responsible: string,
  realDate: Date,
  osVersion: Select ("Windows 2016" | "Windows 2019" | "Windows 2022" | "Linux"),
  approvedByInfra: Checkbox,
  observations: Textarea
}
```

#### Card 4: Conversão
```typescript
{
  status: "n/a" | "analise" | "desenvolvendo-conversor" | "homologacao" | "finalizado",
  responsible: string,
  sourceSystem: Select ("Siplan" | "Control-M" | "Argon" | "Alkasoft" | "Outro"),
  observations: Textarea
}
```
**Lógica:** Se `sourceSystem = "Argon"`, mostrar label azul: "⏳ Conversão pode levar 1-2 meses (novo sistema)".

#### Card 5: Implantação
```typescript
{
  status: "n/a" | "em-andamento" | "finalizado",
  responsible: string,
  remoteInstallDate: Date (Data de Instalação Remota),
  trainingStartDate: Date,
  trainingEndDate: Date,
  switchType: Select ("Fim de Semana" | "Dia Útil"),
  observations: Textarea
}
```
**Destacar:** Usar cores diferentes para diferenciar "Instalação Remota" (tech) vs "Treinamento Presencial" (funcional).

#### Card 6: Pós-Implantação
```typescript
{
  status: "n/a" | "em-andamento" | "finalizado",
  responsible: string,
  startDate: Date,
  endDate: Date,
  observations: Textarea
}
```

### 6.3 Validações de Card

**Regra 1:** Se `status = "finalizado"`, `endDate` é obrigatória.
**Regra 2:** Se `status = "bloqueado"` (Infra) ou `status = "impedimento"` (Aderência), `blockingReason` ou `hasProductGap` é obrigatória.
**Regra 3:** Ao tentar salvar com erro, exibir toast vermelho: "Preencha os campos obrigatórios".

---

## 7. ESPECIFICAÇÕES DA TIMELINE

### 7.1 Componente TimelinePanel

**Layout:**
```
┌────────────────────────────────────┐
│ HISTÓRICO DE ATIVIDADES (Sticky)   │
├────────────────────────────────────┤
│ 🤖 Status Infra → Finalizado       │
│    25/11 às 14:30                  │ ← Log automático (cinza)
│                                    │
│ 👤 Bruno Fernandes                 │
│    "Cliente confirmou server para" │
│    "amanhã"                        │ ← Comentário (branco/destaque)
│    25/11 às 14:45                  │
│                                    │
│ 🤖 Responsável Infra → João Infra │
│    25/11 às 14:50                  │
│                                    │
│ ... (scroll)                       │
│                                    │
├────────────────────────────────────┤
│ [Avatar] [Input: Escreva...]  [➤]  │ ← Input de comentário
└────────────────────────────────────┘
```

### 7.2 Estrutura de Evento

```typescript
interface TimelineEvent {
  id: string;
  type: "auto" | "comment";
  author: string; // user id
  message: string;
  timestamp: Date;
  metadata?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
  };
}
```

### 7.3 Comportamento ao Salvar um Card

Quando usuário clica em "Salvar" dentro de um card:

1. **Validação:** Checkup de campos obrigatórios.
2. **Se OK:**
   - Atualizar objeto do projeto em Zustand store.
   - Adicionar log automático à timeline:
     ```
     {
       type: "auto",
       author: "system",
       message: `Status de ${stageName} alterado de ${oldValue} para ${newValue}`,
       timestamp: now,
       metadata: { field: "stages.infra.status", oldValue, newValue }
     }
     ```
   - Recalcular `healthScore`.
   - Re-render do Drawer.
   - Toast verde: "Alterações salvas!".
3. **Se Erro:**
   - Toast vermelho com mensagem de erro.

### 7.4 Input de Comentário

- Textarea multilinhas.
- Placeholder: "Escreva uma atualização...".
- Botão "Enviar" ao lado (ou abaixo).
- Ao clicar:
  - Validar se texto não está vazio.
  - Adicionar novo evento à timeline:
    ```typescript
    {
      type: "comment",
      author: currentUser.id,
      message: commentText,
      timestamp: now,
    }
    ```
  - Limpar input.
  - Toast verde: "Comentário adicionado!".

---

## 8. LÓGICA DE CÁLCULOS (HEALTH SCORE, DIAS SEM UPDATE)

### 8.1 Função: calculateHealthScore

```typescript
export function calculateHealthScore(project: Project): HealthScore {
  const now = new Date();
  const lastUpdate = new Date(project.updatedAt);
  
  // Calcular dias desde última atualização
  const daysSince = Math.floor(
    (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Verificar se próximo follow-up venceu
  const followUpVencido = project.nextFollowUpDate 
    && new Date(project.nextFollowUpDate) < now;

  // Verificar se há bloqueadores não resolvidos
  const hasUnresolvedBlockers =
    (project.stages.infra.status === ProjectStatus.BLOCKED &&
      project.stages.infra.blockingReason === "Aguardando Compra de Servidor") ||
    project.stages.adherence.status === ProjectStatus.BLOCKED;

  // Lógica de decisão
  if (followUpVencido || daysSince > 5) {
    return HealthScore.CRITICAL;
  }

  if ((daysSince >= 2 && daysSince <= 5) || hasUnresolvedBlockers) {
    return HealthScore.WARNING;
  }

  return HealthScore.OK;
}
```

### 8.2 Hook: useHealthScore

```typescript
export function useHealthScore(project: Project) {
  return useMemo(() => {
    const score = calculateHealthScore(project);
    const daysSince = getDaysSinceUpdate(project);
    
    return {
      score,
      daysSince,
      icon: score === "critical" ? "🔴" : score === "warning" ? "🟡" : "🟢",
      label: score === "critical" ? "Crítico" : score === "warning" ? "Atenção" : "Em Dia",
    };
  }, [project.updatedAt, project.nextFollowUpDate]);
}
```

---

## 9. SISTEMA DE PERMISSÕES

### 9.1 Enum de Papéis

```typescript
enum UserRole {
  ADMIN = "admin",
  ANALYST = "analyst",
  VIEWER = "viewer",
}
```

### 9.2 Matriz de Permissões

| Ação | Admin | Analyst | Viewer |
|------|-------|---------|--------|
| Criar Projeto | ✅ | ❌ | ❌ |
| Editar Card | ✅ | ✅ (se assigned) | ❌ |
| Editar Responsável | ✅ | ❌ | ❌ |
| Adicionar Comentário | ✅ | ✅ | ❌ |
| Ver Timeline | ✅ | ✅ | ✅ |
| Deletar Projeto | ✅ | ❌ | ❌ |

### 9.3 Hook: usePermissions

```typescript
export function usePermissions(userRole: UserRole, projectId: string, stageKey: keyof Project["stages"]) {
  const canEdit = (role: UserRole, stage: keyof Project["stages"]) => {
    if (role === "admin") return true;
    if (role === "analyst") return true; // Se assigned a esse stage
    return false;
  };

  return {
    canEdit: canEdit(userRole, stageKey),
    canDelete: userRole === "admin",
    canComment: userRole !== "viewer",
    canChangeResponsible: userRole === "admin",
  };
}
```

---

## 10. VALIDAÇÕES E REGRAS DE NEGÓCIO

### 10.1 Validações em Tempo Real

```typescript
// utils/validators.ts

export function validateStage(stage: Stage, stageKey: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (stage.status === ProjectStatus.DONE && !stage.endDate) {
    errors.push({
      field: "endDate",
      message: "Data de término é obrigatória quando status é Finalizado",
    });
  }

  if (stage.status === ProjectStatus.BLOCKED && !stage.blockingReason) {
    errors.push({
      field: "blockingReason",
      message: "Motivo de bloqueio é obrigatório",
    });
  }

  if (stage.startDate && stage.endDate && stage.startDate > stage.endDate) {
    errors.push({
      field: "endDate",
      message: "Data de término não pode ser anterior à data de início",
    });
  }

  return errors;
}

export function validateProject(project: Partial<Project>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!project.clientName) {
    errors.push({ field: "clientName", message: "Nome do cliente é obrigatório" });
  }

  if (!project.ticketNumber) {
    errors.push({ field: "ticketNumber", message: "Número do ticket é obrigatório" });
  }

  return errors;
}
```

### 10.2 Regras de Negócio

**Regra 1: Próximo Follow-up Automático**
- Ao criar um projeto: `nextFollowUpDate = hoje + 1 dia`.
- Ao bloquear um projeto: `nextFollowUpDate = hoje + 3 dias`.
- Ao marcar como finalizado: `nextFollowUpDate = null`.

**Regra 2: Health Score Dinâmico**
- Recalcular sempre que `updatedAt` ou `nextFollowUpDate` muda.
- Se projeto tem card em "bloqueado", health = warning.

**Regra 3: Geração Automática de Logs**
- Toda mudança de status → log automático.
- Toda mudança de responsável → log automático.
- Toda mudança de data → log automático.

---

## 11. GUIA DE ESTILO E VISUAL DESIGN

### 11.1 Paleta de Cores

```css
/* Primária (Siplan Brand) */
--color-primary: #7C3AED;        /* Roxo */
--color-primary-light: #EDE9FE;

/* Status */
--color-success: #22C55E;        /* Verde */
--color-warning: #EAB308;        /* Amarelo */
--color-critical: #EF4444;       /* Vermelho */
--color-todo: #A3A3A3;           /* Cinza */

/* Neutros */
--color-bg-main: #F8F9FA;        /* Fundo principal */
--color-bg-secondary: #F3F4F6;   /* Fundo secundário */
--color-card: #FFFFFF;           /* Card */
--color-border: #E5E7EB;         /* Borda */
--color-text: #111827;           /* Texto */
--color-text-secondary: #6B7280; /* Texto secundário */
```

### 11.2 Tipografia

- **Font Family:** Inter, sans-serif.
- **Headlines (H1):** Bold, 24px, color-text.
- **Headlines (H2):** Bold, 18px, color-text.
- **Body (Regular):** Regular, 14px, color-text.
- **Labels:** Semibold, 12px, color-text-secondary.
- **Monospace (datas, IDs):** Courier New, 12px.

### 11.3 Componentes Shadcn UI Recomendados

- `<Card>` para containers.
- `<Button>` para ações.
- `<Select>` para dropdowns.
- `<Input>` para inputs.
- `<Textarea>` para campos longos.
- `<Sheet>` para Drawer.
- `<Tabs>` para navegação (se necessário).
- `<Badge>` para status/tags.
- `<Collapsible>` ou `<Accordion>` para cards.
- `<Table>` para dados tabular.
- `<Toast>` para notificações.

### 11.4 Responsividade

- **Desktop (1200px+):** Layout full.
- **Tablet (768px - 1199px):** Drawer reduz tamanho, colunas empilhadas.
- **Mobile (< 768px):** Drawer full screen, tabs (Form vs Timeline).

---

## 12. INSTRUÇÕES DE IMPLEMENTAÇÃO

### 12.1 Passos de Desenvolvimento (Vibe Coding)

1. **Setup Inicial (5 min):**
   ```bash
   npm create vite@latest siplan-manager -- --template react
   npm install -D tailwindcss postcss autoprefixer
   npm install shadcn-ui lucide-react
   npm install zustand date-fns react-query
   ```

2. **Criar Estrutura de Pastas (5 min):**
   - Seguir a estrutura definida na seção 3.1.

3. **Definir Types (10 min):**
   - Copiar os tipos TypeScript da seção 4.1 para `types/`.

4. **Mock Data (5 min):**
   - Copiar `mockData.ts` da seção 4.2.

5. **Implementar Dashboard (30 min):**
   - Componente `DashboardTable.tsx`.
   - Componente `FilterBar.tsx`.
   - Integrar com Zustand store.

6. **Implementar Drawer (40 min):**
   - Componente `ProjectDrawer.tsx` (layout split-view).
   - Componentes de cards: `InfraForm.tsx`, `AdherenceForm.tsx`, etc.
   - Integrar validações.

7. **Implementar Timeline (20 min):**
   - Componente `TimelinePanel.tsx`.
   - Componente `CommentInput.tsx`.
   - Lógica de auto-logs ao salvar.

8. **Testes e Polish (20 min):**
   - Testar fluxos de edição.
   - Responsividade mobile.
   - Toast notifications.

**Tempo Total Estimado:** 2-3 horas para MVP funcional.

### 12.2 Prompt Exato para Copiar/Colar na IA

```
Você é um Especialista Sênior em React Development e UX Design.

Sua tarefa é gerar uma aplicação web React COMPLETA e FUNCIONAL chamada "Siplan Manager".

USE EXATAMENTE ESTAS TECNOLOGIAS:
- React (com Vite)
- TypeScript
- Tailwind CSS
- Shadcn UI (componentes)
- Lucide React (ícones)
- Zustand (estado global)
- date-fns (manipulação de datas)

REQUISITOS FUNCIONAIS:
1. Dashboard (Tabela Rica): Exibir lista de projetos com colunas: Cliente/Sistema, Pipeline Visual (6 dots), Health Score, Próx. Follow-up, Última Ação, Botão "Ver Detalhes".

2. Drawer (Formulário Modular): Ao clicar em um projeto, abrir gaveta lateral (Sheet Shadcn) com:
   - Lado Esquerdo (70%): 6 Cards colapsáveis (Infra, Aderência, Ambiente, Conversão, Implantação, Pós).
   - Lado Direito (30%): Timeline com eventos automáticos + input de comentário.

3. Validações: Se Status = "Finalizado", endDate é obrigatória. Se Status = "Bloqueado", blockingReason é obrigatória.

4. Permissões: Role "admin" pode editar tudo. Role "analyst" pode editar apenas cards de seu módulo. Role "viewer" apenas leitura.

5. Mock Data: Incluir 5 projetos realistas (incluir 1 com health crítico, 1 com bloqueador, 1 com gap de produto, etc).

DATA STRUCTURE (TypeScript):
[COPIAR A ESTRUTURA COMPLETA DA SEÇÃO 4.1 DESTE PROMPT]

MOCK PROJECTS (5 projetos):
[COPIAR OS PROJETOS DA SEÇÃO 4.2 DESTE PROMPT]

DESIGN:
- Cores: Roxo primário (#7C3AED), verde sucesso (#22C55E), amarelo warning (#EAB308), vermelho crítico (#EF4444).
- Fundo: Cinza suave (#F8F9FA).
- Font: Inter, sans-serif.
- Usar Shadcn UI para todos os componentes.

GERE O CÓDIGO COMPLETO (todos os componentes, hooks, stores, types, utils).
O app deve estar FUNCIONANDO AO CARREGAR.
Implemente também o localStorage para persistência.

```

---

**FIM DO PROMPT MESTRE**

---

## OBSERVAÇÕES FINAIS

Este Prompt Mestre é **auto-contido e suficiente** para uma IA gerar a aplicação completa. Ele inclui:
- ✅ Especificações técnicas precisas.
- ✅ Exemplos de mock data realistas.
- ✅ TypeScript types completos.
- ✅ Lógica de negócio detalhada.
- ✅ UX/UI requirements claros.
- ✅ Validações e regras.

**Para usar:**
1. Copie o "Prompt Exato para Copiar/Colar" (seção 12.2).
2. Cole em v0.dev, Cursor com Claude 3.5 Sonnet, ou Replit Agent.
3. Aguarde o código ser gerado.
4. Copie o código gerado e insira em seu editor (VS Code, WebStorm, etc).
5. Execute `npm install && npm run dev`.
6. Veja a magia acontecer! 🚀