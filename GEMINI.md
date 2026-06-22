Diretrizes comportamentais e arquiteturais para desenvolvimento assistido por IA no Siplan HUB.
Este guia funde o Método Karpathy (foco em cautela, simplicidade e mudanças cirúrgicas) com as especificidades técnicas do projeto.

---

## 1. Pense Antes de Codar (Think Before Coding)

**Não assuma premissas às cegas. Não oculte complexidade. Exponha os trade-offs arquiteturais antes de escrever qualquer linha de código.**

Antes de iniciar a implementação no Siplan HUB, valide mentalmente e com o usuário:
- **Alinhamento de Módulos:** Identifique claramente se a alteração afeta a Fila de Conversão, o módulo de Modelos Editor OrionTN, Comercial, Analytics, Calendário ou o módulo de Administração.
- **Impacto no Banco/Supabase:** Entenda se a mudança exige novas tabelas, alterações em RLS (Row Level Security) ou novas migrations no Supabase.
- **Complexidade:** Se uma solução puder ser resolvida com as features nativas do Tailwind CSS v3 e componentes existentes do shadcn/ui, recuse a instalação de bibliotecas externas.
- Se houver ambiguidade no fluxo de dados de um card ou modal, pare e pergunte.

---

## 2. Simplicidade e Arquitetura Siplan HUB

**Código mínimo que resolve o problema. Respeito absoluto aos padrões de performance estabelecidos.**

### 2.1. Padrão Estrito de Split Query (Projetos)
Para manter o desempenho e evitar gargalos com objetos JSON grandes, respeite a divisão de carga de dados:
- **Listagem (Dashboards, Tabelas, Grids):** Use **apenas** o hook `useProjectsList`. Nunca force a listagem a buscar colunas pesadas como `stages` ou `notes`. Busque apenas o essencial (`id`, `clientName`, `status`, `healthScore`).
- **Detalhes/Edição (Modais, Páginas Internas):** Use o hook `useProjectDetails`. Garanta que ele só seja disparado de forma preguiçosa (Lazy loading), ex: quando o `ProjectModal` for aberto (`enabled: !!projectId`).

### 2.2. Estado e Cache (React Query v5 + Zustand)
- **Mutações:** Ao criar ou atualizar dados usando funções do `useProjectsV2`, você **deve** invalidar explicitamente as chaves corretas do TanStack React Query (`['projectsList']` e `['projectDetails', id]`) no sucesso da operação para garantir a sincronia da UI.
- **Estado Local de UI Complexa:** Para interações fluidas e layouts complexos (como o arrastar e soltar do Calendário), use ou estenda as fatias do Zustand na `calendarStore` ou `filterStore` em vez de poluir componentes com múltiplos `useState` locais.

### 2.3. Interface, Formulários e Componentização
- **Formulários:** Sempre implemente utilizando a dobradinha **React Hook Form + Zod** para validação.
- **Autosave com Debounce:** Em formulários de edição de projetos dentro de abas/modais, utilize o padrão estabelecido pelo hook `useAutoSave` dentro de `useProjectForm` para mitigar o excesso de requisições de escrita no banco PostgreSQL do Supabase.
- **Virtualização:** Se estiver renderizando listas ou grids que possam crescer exponencialmente (como a `ProjectGrid`), use obrigatoriamente componentes virtualizados via `react-virtuoso` ou `react-window`.
- **Composite Components:** Mantenha modais e telas complexas divididos em abas ou subcomponentes independentes (ex: `GeneralInfoTab`, `StepsTab`) isolando o consumo de contexto para evitar re-renderizações globais na tela.
- **Estilização e Design System:** Use utilitários do Tailwind CSS. Respeite as variáveis do tema Dark/Light (`next-themes`). A cor de destaque primária do sistema é o Vermelho Bordô (`hsl(346, 84%, 45%)`).
- **Rich Text:** O editor de texto rico está encapsulado em um componente wrapper interno (Tiptap/Lexical). Nunca quebre os componentes consumidores ao tentar alterar a biblioteca base diretamente.

---

## 3. Alterações Cirúrgicas (Surgical Changes)

**Modifique estritamente o necessário. Não introduza refatorações paralelas não solicitadas.**

Ao editar arquivos do Siplan HUB:
- Siga rigorosamente o estilo de escrita de TypeScript 5 e React 18 presente no arquivo.
- Não "melhore" códigos de terceiros em componentes adjacentes (ex: não reescreva um componente na pasta `/src/components/ui` do shadcn a menos que a tarefa seja explicitamente essa).
- **Limpeza de Órfãos:** Se a sua alteração em um hook (ex: `useProjectForm`) inutilizar um import, tipo em `/src/types` ou uma função utilitária local, remova-os imediatamente. Não deixe lixo gerado pelo seu próprio diff.
- Se notar código morto antigo e não relacionado à sua task, mencione ao desenvolvedor em um comentário ou log, mas **não delete por conta própria**.

---

## 4. Execução Guiada por Objetivos (Goal-Driven Execution)

**Defina os critérios de aceitação com precisão matemática antes de rodar os scripts de build ou dev.**

Ao receber uma tarefa (Ex: "Adicionar validação de SLA no pipeline de conversão"), quebre-a em passos atômicos verificáveis:

```text
1. Criar/atualizar schema Zod para o novo campo de SLA -> verificar via tipagem TS
2. Implementar a regra visual de alerta no card de conversão correspondente -> verificar renderização com mock
3. Adicionar lógica de invalidação no React Query após a mutação do campo -> verificar chamadas de rede no Supabase