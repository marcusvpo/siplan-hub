# CLAUDE.md — Siplan Hub

Este arquivo é a fonte oficial de instruções e diretrizes para o Claude Code e qualquer instância de IA da Anthropic que opere neste repositório.

---

## 🇧🇷 Idioma Obrigatório

Todas as interações, explicações, resumos, mensagens de commit e comentários de PR devem ser em **Português do Brasil (PT-BR)**. Preserve em inglês identificadores de código, nomes de arquivos, comandos e termos técnicos que perderiam precisão se traduzidos.

---

## 🏛️ Conhecimento Operacional Obrigatório e Auto-Alimentável

O arquivo [`docs/CONHECIMENTO_PROCESSOS_E_OPERACAO_HUB.md`](docs/CONHECIMENTO_PROCESSOS_E_OPERACAO_HUB.md) é a **fonte única da verdade prática e operacional do Siplan HUB**.

- **Consulta Obrigatória Antes de Codar:** Antes de propor alterações, criar regras de negócio, automatizar transições de status ou supor premissas sobre etapas, telas ou analistas, você **deve consultar obrigatoriamente esse documento**.
- **Matriz Real de Responsabilidades:** O documento detalha a Matriz RACI real dos analistas (Alex Silva, Bruno Fernandes, Ademar Souza, Luciane Lima, Hugo Januário, Maria Santos, Lunna Santana, Julio Araujo, Rodrigo Brites, Ricardo Vieira, etc.), as janelas temporais inflexíveis (Sexta-feira limite vs. Segunda-feira Go-Live), o ciclo estrito de 15 dias corridos de Pós-Implantação em grupos de WhatsApp e a transição para o suporte 0800 (Ellevo).
- **Auto-Alimentação Contínua:** Sempre que você criar novas telas, rotas, botões operacionais, alterar formulários de etapas ou redistribuir responsabilidades de processos, você **deve atualizar obrigatoriamente** `docs/CONHECIMENTO_PROCESSOS_E_OPERACAO_HUB.md`.

---

## 🚀 Comandos Principais

```bash
npm run dev          # Inicia servidor Vite local
npm run build        # Build de produção (Vite + verificação de tamanho de chunks)
npm test             # Roda suíte de testes unitários com Vitest
npm test -- --run    # Execução única da suíte de testes
npm run lint         # Linter ESLint
npx tsc --noEmit     # Typecheck rigoroso TypeScript
```

---

## 🧩 Stack e Padrões Arquiteturais

- **Frontend:** React 18, TypeScript strict, Vite, Tailwind CSS v3 e shadcn/ui (Radix UI).
- **Backend / Dados:** Supabase (PostgreSQL 15+, Auth, RLS, Storage e Realtime).
- **Gerenciamento de Estado:** TanStack React Query v5 (server state) + Zustand (UI state / filtros / calendário).
- **Split Query Pattern para Projetos:**
  - Listagens (Dashboards, Grids): Use **apenas** `useProjectsList` (não busque colunas pesadas como `stages` ou `notes`).
  - Detalhes e Edição: Use `useProjectDetails` disparado de forma preguiçosa (`enabled: !!projectId`).
- **Autosave com Debounce:** Em formulários de projetos, utilize `useAutoSave` via `useProjectForm` para evitar excesso de requisições ao Supabase.
- **Relatórios e PDFs:** `@react-pdf/renderer` é a **única ferramenta oficial e obrigatória** no projeto.
  - É **estritamente proibido** o uso de `window.print()`, `html2canvas` ou headless browsers para emissão de relatórios.
  - Toda emissão deve consumir a arquitetura em `@/modules/pdf` (`PdfHeader`, `PdfFooter`, `PdfTable`, `pdfTokens`, `pdfService`).
- **Runtime de IA do Worker:** O motor de IA do worker em segundo plano é o **Codex CLI** (com **Ollama** local como contingência). Não introduza integrações, chaves ou dependências diretas para a API da Anthropic no frontend/worker sem instrução explícita do usuário.

---

## 📋 Checklist Obrigatório para Nova Tela, Rota ou Módulo

Não considere uma implementação concluída antes de verificar os 13 itens:

1. **Rota:** Registre no `src/App.tsx` com `RequirePermission`.
2. **Catálogo de Permissões:** Adicione o recurso em `src/constants/permissions.ts` (`PERMISSION_RESOURCES`).
3. **Migration de Permissão:** Migration em `supabase/migrations/` inserindo a permissão em `app_permissions` e atribuindo ao perfil `admin`.
4. **Menu Lateral:** Adicione o item em `src/constants/menuItems.ts` com o `permissionKey` correto e ajuste `AppSidebar.tsx`.
5. **Tela Inicial:** Garanta que aparece corretamente na `Home.tsx` (derivado de `menuItems.ts`).
6. **Guarda de Rota:** Proteja a rota no `App.tsx` com `RequirePermission`.
7. **Permissão de Ações:** Use `usePermissions().hasPermission(...)` em botões de ação e bloqueie no handler.
8. **RLS:** Políticas RLS com `has_permission(...)`. Nunca use `TO public` para dados sensíveis.
9. **Tipos do Supabase:** Atualize `src/integrations/supabase/types.ts`.
10. **Documentação e Testes:** Testes unitários proporcionais e typecheck sem erros.
11. **Informativo de Ajuda (ⓘ):** Cadastre em `src/constants/pageHelpRegistry.ts`.
12. **Changelog:** Insira na migration registro em `public.notifications` com `category = 'changelog'`.
13. **Conhecimento Operacional:** Atualize `docs/CONHECIMENTO_PROCESSOS_E_OPERACAO_HUB.md`.

---

## 🔒 Git e Identidade

- Não faça commit, push ou merge sem pedido explícito do usuário.
- Commits e pushes devem usar a identidade `BrunoHF04`.
- Não adicione trailers de coautoria de agentes ou de IA.
