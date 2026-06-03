# Relatório Técnico — Siplan HUB

**Repo:** `marcusvpo/siplan-hub` · **Stack:** Vite + React 18 + TS + shadcn/ui + Supabase + TanStack Query + Zustand + React Router DOM
**Base Fallow:** 249 arquivos · 48.777 LOC · MI 88,2 (bom) · **142 issues** de dead code · **51 grupos de duplicação** (2.937 linhas, 6,1%)

> Cada item abaixo foi **cruzado com `grep` no código real** do repositório clonado para garantir que a remoção/refactor é segura. Itens marcados ✅ SAFE foram confirmados como sem referência. Itens ⚠️ exigem revisão manual antes de tocar.

---

## 1. EXCLUIR — Arquivos mortos (25) ✅ SAFE

Todos confirmados via `grep -rn` no `src/` — **nenhum** importador encontrado. Pode deletar com segurança.

### 1.1 CSS órfão
- `src/App.css` — não importado em lugar nenhum (o app usa `src/index.css`). **DELETAR.**

### 1.2 Componentes legados / duplicados
- `src/components/NavLink.tsx` — nenhum import. **DELETAR.**
- `src/components/Dashboard/TrendChart.tsx` e `src/components/Reports/TrendChart.tsx` — duas cópias do mesmo TrendChart, nenhuma usada. **DELETAR ambos.**
- `src/components/ProjectManagement/ProjectTable.tsx` — substituído por `ProjectGrid` (`Virtuoso`). **DELETAR.**
- `src/components/ProjectManagement/Tabs/AuditTab.tsx` — não está montado em nenhum `<Tabs>`. **DELETAR.**
- `src/components/ProjectManagement/Tabs/TimelineTab.tsx` — idem. **DELETAR.**

### 1.3 Páginas órfãs
- `src/pages/implantadores/EditarChecklistHomologacao.tsx` ⚠️ **ATENÇÃO**
  Está em `App.tsx`? **NÃO está sendo `lazy()`-importado** — confirmei no `App.tsx`. Mas observe que existe uma rota equivalente: `EditarChecklistComercial` (rota `/commercial/...`) e o conteúdo é quase idêntico (3 grupos de duplicação grandes entre os dois). **Antes de deletar**, confirmar com o time se a rota de homologação não está sendo planejada — se sim, refatorar para um único componente parametrizável (ver §4.2). Caso contrário, **DELETAR**.

### 1.4 Hooks órfãos
- `src/hooks/useActivityLog.ts` ⚠️ — só aparece num comentário JSDoc dentro dele mesmo. Validar com o time se há intenção de auditoria; se não, **DELETAR**.
- `src/hooks/useProjectTramites.ts` — não importado. **DELETAR.**
- `src/hooks/useResponsibleMapping.ts` — não importado. **DELETAR.**

### 1.5 Stores / utils órfãos
- `src/stores/teamStore.ts` — zero referências. **DELETAR.**
- `src/utils/formatBytes.ts` — não importado. **DELETAR** (ou mover para `lib/utils.ts` se quiser manter como utilitário disponível).

### 1.6 Componentes shadcn/ui não usados (10) ✅ SAFE
Cada um confirmadamente sem consumer interno. **DELETAR todos**, junto com a dependência Radix correspondente (ver §3):

| Arquivo | Dependência Radix a remover junto |
|---|---|
| `src/components/ui/aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` |
| `src/components/ui/breadcrumb.tsx` | (nenhuma) |
| `src/components/ui/carousel.tsx` | `embla-carousel-react` |
| `src/components/ui/context-menu.tsx` | `@radix-ui/react-context-menu` |
| `src/components/ui/drawer.tsx` | `vaul` |
| `src/components/ui/form.tsx` ⚠️ | **CUIDADO** — alguns projetos usam `react-hook-form` direto sem o wrapper Form. Confirmei: `react-hook-form` é usado, mas o wrapper `<Form>` shadcn não. OK deletar `form.tsx`, **manter `react-hook-form`**. |
| `src/components/ui/input-otp.tsx` | `input-otp` |
| `src/components/ui/menubar.tsx` | `@radix-ui/react-menubar` |
| `src/components/ui/navigation-menu.tsx` | `@radix-ui/react-navigation-menu` |
| `src/components/ui/resizable.tsx` | `react-resizable-panels` |
| `src/components/ui/slider.tsx` | `@radix-ui/react-slider` |
| `src/components/ui/toggle-group.tsx` | `@radix-ui/react-toggle-group` |

> **Dica de bundle:** removendo só esses 10 componentes + suas deps Radix, o JS final cai bem (estimativa ~80–120 kB minificado).

---

## 2. EXCLUIR — Exports/Types não usados (94)

Em sua maioria, são re-exports automáticos do shadcn que nunca foram consumidos. O risco é mínimo — basta remover o `export` da linha (ou o bloco `export { ... }` no fim do arquivo).

### 2.1 Em arquivos UI **que VOCÊ vai manter** (limpar exports, não deletar o arquivo)

Faça `fallow fix --dry-run` ou edite manualmente:

- `src/components/ui/sidebar.tsx` (20 exports mortos) — esses são MUITOS. Manter o arquivo (é usado), mas remover os exports listados (SidebarContent, SidebarFooter, SidebarGroup, etc.). ⚠️ **Confirmar com `grep` por cada nome antes** — sidebar é granular e novas páginas podem importar peças.
  → **Recomendação:** **NÃO REMOVER AGORA**. Sidebar shadcn é pensado como "kit"; remover peças e depois precisar delas gera retrabalho. Custo de manter é zero (tree-shaking elimina do bundle).
- `src/components/ui/dropdown-menu.tsx` (9 exports) — **mesma recomendação: manter**, tree-shaking resolve.
- `src/components/ui/select.tsx`, `chart.tsx`, `command.tsx`, `dialog.tsx`, `hover-card.tsx`, `sheet.tsx`, `alert-dialog.tsx` — **idem, manter**.

> **Regra prática:** em arquivos `src/components/ui/*` que você vai manter, **deixe os exports**. Tree-shaking do Vite/Rollup já remove código morto do bundle final. Removê-los só polui diffs e gera regressões quando alguém precisar.

### 2.2 Em código próprio do projeto (REMOVER)
- `src/components/theme-context.ts:10` — `initialState` não usado. **REMOVER export** (manter a variável só se for usada internamente; senão deletar).
- `src/types/conversion.ts` — **10 constantes** mortas (`QUEUE_STATUS_LABELS`, `QUEUE_STATUS_COLORS`, `ISSUE_*`, etc.) + 5 type exports. Confirmar com `grep -rn "QUEUE_STATUS_LABELS"` antes — se de fato zero refs, **REMOVER**. Provavelmente sobra de um Kanban antigo.
- `src/types/ProjectV2.ts` — 4 types (`ProjectStatus`, `SavedFilter`, `ChecklistItem`, `ViewMode`). **`SavedFilter` é duplicado** com `src/stores/filterStore.ts` (ver §5.1). Manter um único.
- `src/hooks/useProjectFormResponse.ts:4,19` — `ProjectFormResponse`, `UpsertResponseInput` não consumidos externamente. **REMOVER export** (deixar como tipo interno).
- `src/contexts/AuthContextValue.ts:11` — `AuthContextType` não usado fora. **REMOVER export.**
- `src/hooks/useAutoSave.ts:8` — `SaveState`. **REMOVER export.**
- `src/hooks/useCommercial.ts:5` — `Client`. **REMOVER export** (provável conflito de nome — preferir definir um único `Client` em `src/types/`).
- `src/hooks/useConversionQueue.ts:32` — `ConversionKPIs` duplicado (já existe em `types/conversion.ts:144`). **MANTER um só** em `types/conversion.ts` e importar.
- `src/hooks/useFormTemplates.ts:20` — `NewTemplateInput`. **REMOVER export.**
- `src/components/calendar/EventCard.tsx:11` — `EventSegment`. **REMOVER export.**
- `src/components/ui/textarea.tsx:5` — `TextareaProps`. **MANTER** (padrão shadcn, util quando alguém quiser estender).

---

## 3. EXCLUIR — Dependências (18)

### 3.1 Remover com `bun remove ...` (ou npm/pnpm) ✅ SAFE

Cruzei cada uma com `grep -rn "<pkg>" src/`. **Nenhum import encontrado:**

```
@dnd-kit/sortable          (mas mantenha @dnd-kit/core e @dnd-kit/utilities — usados)
@hookform/resolvers        (não usa zod resolver com RHF)
@monaco-editor/react       (substituído por @lexical/* ou nenhum editor de código)
@tiptap/extension-color
@tiptap/extension-font-family
@tiptap/extension-highlight
@tiptap/extension-task-item
@tiptap/extension-task-list
@tiptap/extension-text-align
@tiptap/extension-text-style
@tiptap/extension-underline
@tiptap/pm
@tiptap/react
@tiptap/starter-kit
react-virtualized-auto-sizer
react-window
@types/react-window        (mover para devDeps ou remover)
```

> **Observação importante:** todo o **stack TipTap está morto** — o editor real usado no projeto é **Lexical** (`src/components/editor/editor.tsx`). Remover tudo de `@tiptap/*` corta uma fatia gorda do bundle (~150–250 kB).
> Lista para um único comando:
> ```bash
> bun remove @dnd-kit/sortable @hookform/resolvers @monaco-editor/react \
>   @tiptap/extension-color @tiptap/extension-font-family @tiptap/extension-highlight \
>   @tiptap/extension-task-item @tiptap/extension-task-list @tiptap/extension-text-align \
>   @tiptap/extension-text-style @tiptap/extension-underline @tiptap/pm @tiptap/react \
>   @tiptap/starter-kit react-virtualized-auto-sizer react-window @types/react-window
> ```

Adicionando os pacotes Radix dos componentes shadcn deletados (§1.6):
```bash
bun remove @radix-ui/react-aspect-ratio @radix-ui/react-context-menu \
  @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-slider \
  @radix-ui/react-toggle-group embla-carousel-react vaul input-otp react-resizable-panels
```

### 3.2 Dependência **não listada** (ADICIONAR)
- `@rjsf/utils` → importado em `src/components/FormRenderer/FormRenderer.tsx:10` mas não está no `package.json`. Hoje funciona por **acidente** (vem como peer de `@rjsf/core`). **Adicione explicitamente:**
  ```bash
  bun add @rjsf/utils
  ```

### 3.3 Mover de prod para dev
- `tailwindcss-animate` — só é usado em `tailwind.config.ts`. Mover para `devDependencies` (não muda runtime).
- `@tailwindcss/typography` (devDep não usado) — se não está no `tailwind.config.ts` como plugin, **remover**. Confirmar antes.

---

## 4. REFATORAR — Duplicações (51 grupos, 2.937 linhas)

Prioridade por **dor x benefício**. Veja os top hotspots:

### 4.1 🔥 PRIORIDADE MÁXIMA — `CommercialContacts` vs `OrionTNModels` (560 linhas duplicadas, dup:9a80434e)
- `src/pages/commercial/CommercialContacts.tsx:47-606`
- `src/pages/conversion/OrionTNModels.tsx:13-201`

Essas 560 linhas (!) são quase certamente uma **estrutura CRUD genérica** copiada. **Ação:** extrair um componente `<EntityCrudTable>` ou hook `useEntityCrud<T>` em `src/components/shared/` parametrizado por:
- colunas
- queryKey / endpoint
- schema do form de criação/edição

Ganho: ~500 linhas a menos e uma única fonte de bug.

### 4.2 🔥 ALTA — Família "Checklist editor" (208 + 68 linhas, 3 arquivos)
- `src/pages/commercial/EditarChecklistComercial.tsx`
- `src/pages/implantadores/EditarChecklistHomologacao.tsx`
- `src/pages/implantadores/EditarFormAderencia.tsx`

5 grupos só entre os dois primeiros. **Ação:** criar `src/components/checklist/ChecklistEditor.tsx` recebendo prop `variant: 'comercial' | 'homologacao' | 'aderencia'` ou, melhor, configs (título, tipos de pergunta, action handlers). Resolve §1.3 também — `EditarChecklistHomologacao` provavelmente pode ser excluído depois.

### 4.3 ALTA — Família `StageForm*` (~134 linhas)
- `ConversionStageForm.tsx`, `InfraStageForm.tsx`, `ImplementationStageForm.tsx`, `AdherenceStageForm.tsx` (+ uso em `MyQueueDetailedCard.tsx`)

**Ação:** extrair `<StageFormShell>` com slots para campos específicos. As 4 stage forms só variam nos campos do meio. Eliminaria também a complexidade CRÍTICA de `ImplementationStageForm` (CRAP 1122).

### 4.4 MÉDIA — `NewProjectDialog` ↔ `EditProjectTab` (73 linhas, 3 grupos)
- Extrair `<ProjectFormFields>` compartilhado. Ambos hoje editam o mesmo modelo.

### 4.5 MÉDIA — `Conversion` ↔ `ConversionHomologation` (47 linhas, 3 grupos)
- Extrair hooks `useConversionListFilters`, `useConversionActions`.

### 4.6 MÉDIA — `LatestDeployments` ↔ `NextDeployments` (30 linhas, 2 grupos)
- Extrair `<DeploymentList>` parametrizado por `range: 'past' | 'future'`.

### 4.7 BAIXA — `FormRenderer.tsx` self-dup (15 linhas) + `VisualQuestionBuilder.tsx` self-dup (45 linhas)
- Extrair funções privadas no próprio arquivo (`renderTextField`, `renderEnumField`, etc.).

### 4.8 BAIXA — `UserManagement.tsx` self-dup (45 linhas em 3 grupos)
- Extrair `renderUserRow`/`renderRoleSelect` privados.

> **NÃO refatorar** os grupos abaixo agora — risco > benefício:
> - `ProjectModal.tsx ↔ ProjectDetails.tsx (33 linhas)`: parecem ser headers/cabeçalhos quase iguais mas com contextos diferentes — mexer pode quebrar layout.
> - `TeamConfiguration ↔ UserManagement (31 linhas)`: provavelmente formulários de usuário/role — risco médio, baixo ganho.

---

## 5. REFATORAR — Estrutura

### 5.1 Exports duplicados (3) — RESOLVER JÁ
1. **`SavedFilter`** em `src/stores/filterStore.ts` **e** `src/types/ProjectV2.ts`
   → Manter **apenas** em `src/types/ProjectV2.ts` e importar no store. Mesmo nome em dois lugares é fonte clássica de bug "import resolvendo no arquivo errado".
2. **`Sidebar`** em `src/components/Layout/Sidebar.tsx` **e** `src/components/ui/sidebar.tsx`
   → ⚠️ `Layout/Sidebar` **não é importado em lugar nenhum** (`grep` confirmou). É a função-mor de 750 linhas com CRAP 6480 listada no audit. **Recomendação:** ou ela é usada via lazy/string-import que o Fallow não vê (verificar `App.tsx` rotas dinâmicas) — **se for, MANTER** e renomear para `AppSidebar`. Se não, **DELETAR** (vai virar mais um arquivo morto). Pelo `App.tsx` não detectei import — confirme via build.
3. **`Toaster`** em `src/components/ui/sonner.tsx` **e** `src/components/ui/toaster.tsx`
   → Em `App.tsx` ambos são importados com aliases (`Toaster` e `Sonner as Toaster`). **OK funcionalmente**, mas confuso. **Sugestão:** renomear o export de `sonner.tsx` para `SonnerToaster` e ajustar `App.tsx`.

---

## 6. REFATORAR — Funções "monstros" (complexidade CRÍTICA)

São candidatas a quebrar em componentes/hooks menores. **Não é necessário fazer tudo agora** — atacar quando o arquivo precisar de manutenção. Top 10 mais urgentes:

| Arquivo | Função | LOC | CRAP | Ação sugerida |
|---|---|---:|---:|---|
| `src/utils/project-transformers.ts:206` | `transformToDB` | 316 | **13110** | Quebrar por seção (header, stages, files). Adicionar testes unitários **antes** de mexer. |
| `src/components/Layout/Sidebar.tsx:44` | `Sidebar` | 750 | 6480 | Ver §5.1 (talvez deletar). Se manter, extrair items por módulo. |
| `src/hooks/useProjectsV2.ts:41` | `mutationFn` | 144 | 4970 | Separar em `createProject`/`updateProject`/`deleteProject` services em `src/services/`. |
| `src/pages/conversion/MyQueueDetailedCard.tsx:91` | `MyQueueDetailedCard` | 728 | 3080 | Quebrar em sub-componentes (`<QueueHeader>`, `<QueueIssues>`, `<QueueActions>`). |
| `src/pages/public/PublicChecklist.tsx:27` | `PublicChecklist` | 675 | 2970 | Quebrar em steps; mover lógica para hook `usePublicChecklist`. |
| `src/components/commercial/DeploymentFormFields.tsx:90` | `DeploymentFormFields` | 292 | 2352 | Dividir por seções do form. |
| `src/pages/commercial/CommercialChecklists.tsx:29` | `CommercialChecklists` | 601 | 2256 | Pós-refactor de §4.2 já melhora. |
| `src/pages/ProjectAdherenceForm.tsx:202` | `ProjectAdherenceForm` | 769 | 1722 | Adotar `<ChecklistEditor>` de §4.2. |
| `src/components/FormRenderer/FormRenderer.tsx:515` | `AdherenceQuestionField` | 219 | 1640 | Quebrar por tipo de pergunta (`<TextQuestion>`, `<EnumQuestion>` ...). |
| `src/components/ProjectManagement/ProjectModal.tsx:35` | `ProjectModal` | 290 | 1560 | Extrair tabs em arquivos próprios. |

---

## 7. MANTER (como está)

- Toda a stack **Lexical** — é o editor de texto real do projeto.
- `react-virtuoso` — em uso no `ProjectGrid` para virtualização.
- `recharts`, `framer-motion`, `react-hook-form`, `zod`, `zustand`, `@tanstack/react-query` — todos ativos.
- `@dnd-kit/core` + `@dnd-kit/utilities` + `@hello-pangea/dnd` — em uso (só `@dnd-kit/sortable` é morto).
- `canvas-confetti`, `html2canvas`, `jspdf` — em uso (efeitos/PDF).
- `react-day-picker`, `date-fns` — em uso no calendário.
- Todos os arquivos shadcn/ui **não listados** em §1.6 — em uso.

---

## 8. PLANO DE EXECUÇÃO RECOMENDADO (4 PRs)

**PR #1 — Limpeza segura (1 dia)** — risco baixíssimo
1. Adicionar `@rjsf/utils` ao package.json.
2. Deletar os 25 arquivos da §1 (exceto os 2 ⚠️ — confirmar com time antes).
3. Remover dependências da §3.1.
4. Mover `tailwindcss-animate` → devDeps.
5. `bun install` + `bun run build` + smoke test em todas as rotas principais.

**PR #2 — Estrutura (meio dia)**
1. Resolver os 3 duplicate exports (§5.1).
2. Remover exports/types órfãos do código próprio (§2.2).
3. Não tocar nos exports shadcn (§2.1).

**PR #3 — Refactor de duplicações grandes (3–5 dias)**
1. Extrair `<EntityCrudTable>` (§4.1).
2. Extrair `<ChecklistEditor>` (§4.2) — depois disso, validar se `EditarChecklistHomologacao` pode ir embora.
3. Extrair `<StageFormShell>` (§4.3).
4. Cobrir com testes (Vitest/RTL) **antes** de mexer.

**PR #4 — Quebra das funções gigantes (contínuo)**
- Atacar `project-transformers.ts:transformToDB` primeiro (top CRAP, alto risco se tocado sem testes).
- Cada função >300 LOC, **escrever testes primeiro**, depois quebrar.

---

## 9. CHECKLIST RÁPIDO ANTES DE DELETAR QUALQUER COISA

Para cada arquivo na §1, rodar:
```bash
grep -rn "<NomeDoArquivoSemExt>" src/ public/ index.html
```
e checar se há:
- import dinâmico (`import()` com string template)
- referência por nome em router de strings
- referência via `React.lazy` com expressão computada
- uso em testes (`__tests__/`)

Já cruzei os 25 arquivos — todos estão limpos hoje. Mesmo assim, **um `bun run build` + navegação manual em cada rota** após o PR #1 é obrigatório.

---

## 10. MÉTRICAS ALVO PÓS-LIMPEZA

| Métrica | Hoje | Meta pós PR#1 | Meta pós PR#3 |
|---|---:|---:|---:|
| Arquivos | 249 | ~224 | ~210 |
| Dead files % | 10,0% | <2% | <1% |
| Dead exports % | 16,2% | ~12% | <5% |
| Linhas duplicadas | 2.937 (6,1%) | 2.937 | <800 (<2%) |
| Dependencies | ~95 | ~77 | ~77 |
| Bundle JS (estim.) | — | **−250 a −400 kB** | idem |

---

**Resumo executivo:** o repo está **saudável (MI 88,2)** mas carregando ~250 kB de dependências mortas (Tiptap inteiro!) e 25 arquivos sem dono. A limpeza do PR#1 é segura, rápida e dá ganho imediato de bundle. As duplicações concentram-se em **três famílias de telas** (CRUDs, Checklists, StageForms) — atacando essas três, você elimina 70%+ da duplicação.
