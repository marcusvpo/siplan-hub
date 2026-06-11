# Arquitetura do Projeto Siplan Hub

Este documento serve como um mapa mental da estrutura, fluxo de dados e decisões arquiteturais do projeto.

## 1. Organização de Pastas (Map)

```text
/src
  /components
    /calendar         # Lógica complexa do Calendário (Grid, Eventos, Drag&Drop)
    /editor           # Editor de Texto Rico (Lexical/Tiptap wrapper)
    /Layout           # Layouts globais (Sidebar, Header, MainLayout)
    /ProjectManagement
      /Forms          # Componentes de formulário (StageCard, ProjectHeaderForm)
      /Tabs           # Abas do Modal de Projeto (General, Steps, Files)
      ProjectGrid.tsx # Grid principal de projetos (Virtualizado)
      ProjectModal.tsx # Modal de detalhes (Lazy loading com Hooks)
    /Reports          # Gráficos e componentes de relatórios
    /ui               # Biblioteca de componentes base (Shadcn/UI)
  /hooks
    useProjectsList.ts    # Fetch leve para Dashboard/Grid
    useProjectDetails.ts  # Fetch pesado para Modal/Edição
    useProjectForm.ts     # Gerenciamento de estado de formulário + Autosave
    useProjectsV2.ts      # (Legado/Actions) Mutações de create/update/delete
  /pages
    Analytics.tsx     # Dashboard Executivo (KPIs, Gráficos)
    Calendar.tsx      # Página do Calendário
    DashboardV2.tsx   # Página inicial (Visão geral)
    Reports.tsx       # Página de Relatórios operacionais
  /stores             # Zustand Stores (ex: calendarStore, filterStore)
  /types              # Definições TS (ProjectV2, Stage types)
```

## 2. Fluxo de Dados (Data Flow)

### Projetos (Projects)

O gerenciamento de dados de projetos segue uma estratégia de **Split Query** para performance:

1. **Lista (Dashboard/Grid):**
   * **Hook:** `useProjectsList`
   * **Dados:** Apenas colunas essenciais (`id`, `clientName`, `status`, `healthScore`).
   * **Objetivo:** Renderização rápida da grid virtualizada, sem carregar JSONs pesados.

2. **Detalhes (Modal/Edição):**
   * **Hook:** `useProjectDetails`
   * **Dados:** Todas as colunas, incluindo JSONs (`stages`, `notes`), `timeline_events`, etc.
   * **Trigger:** Disparado apenas quando o `ProjectModal` é aberto (`enabled: !!projectId`).

3. **Mutações (Updates):**
   * **Hook:** `useProjectsV2` (funções `updateProject`, `createProject`).
   * **Efeito:** Ao sucesso, invalida as chaves `['projectsList']` e `['projectDetails', id]` para garantir sincronia.

### Calendário (Calendar)

O estado do calendário é híbrido (Local + Server):

* **Server State:** Eventos reais vindos do Supabase (`useProjectsList` ou query específica).
* **Local UI State:** `calendarStore` (Zustand) gerencia:
  * `interactiveEvents`: Eventos sendo arrastados/redimensionados (Ghost events).
  * `currentDate`: Mês/Semana atual da visualização.

## 3. Padrões de Interface (UI Patterns)

* **Virtualização:** A `ProjectGrid` usa `react-virtuoso` para renderizar apenas os cards visíveis, permitindo listas com milhares de projetos sem travar.
* **Layered Rendering (Calendário):** Separação estrita de visualização (CSS Grid) e lógica de interação.
* **Composite Components:** Componentes complexos (ex: `ProjectModal`) são compostos por abas independentes (`GeneralInfoTab`, `StepsTab`) que consomem o contexto do projeto, evitando re-renders globais.

## 4. Decisões Técnicas Importantes

* **Autosave:** Implementado via hook customizado (`useAutoSave` dentro de `useProjectForm`) com debounce para evitar excesso de writes no banco.
* **Rich Text:** Encapsulado em componente próprio para permitir troca futura da library (atualmente Lexical/Tiptap) sem quebrar os consumidores.
* **Supabase Realtime:** Utilizado no `NotificationBell` para feedback instantâneo de alterações por outros usuários.
