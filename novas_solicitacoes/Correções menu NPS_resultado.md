# Resultado — Correções menu NPS

- **Status:** implementação local concluída e QA aprovado sem achados.
- **Solicitado:** no PDF exportado de `/cs-cx/nps`, listar clientes com notas 9/10 no recorte e corrigir NPS 0 enganoso por cartório.
- **Implementado:** `bestClients` usa somente respostas filtradas, um registro por cartório pela maior nota, empate pela resposta mais recente, ordem 10 → 9/recência/nome; novo bloco antes de clientes em atenção com vazio explícito; desempenho por cartório usa nota média e não exibe NPS individual, mantendo NPS global/mensal; ajuda atualizada; migration de changelog idempotente criada.
- **Arquivos da entrega:** `src/lib/cs-cx-nps-analytics.ts`; `src/lib/cs-cx-experience-pdf.ts`; `src/test/cs-cx-nps-analytics.test.ts`; `src/test/cs-cx-experience-pdf-layout.test.ts`; bloco `/cs-cx/nps` de `src/constants/pageHelpRegistry.ts`; linha NPS de `docs/cs-cx/MIGRATION_PARITY.md`; `supabase/migrations/20260917150000_fix_nps_report_best_clients_changelog.sql`.
- **Agentes:** Tech Lead, Frontend & PWA, Supabase Banco de Dados & RBAC, QA & Code Reviewer.
- **Validações:** Vitest focado 12/12; ESLint focado aprovado; `npx tsc --noEmit` aprovado; `git diff --check` focado aprovado; QA no portal 1440x900 e 320x640 com `scrollWidth=clientWidth`, conteúdo percorrido e exportação sem erro de console; QA da migration/documentação aprovado; `graphify update .` executado sem mudança de topologia.
- **Globais:** `npm test -- --run` 615/620, com cinco falhas preexistentes fora do escopo (três de changelog e duas de contatos/agendamentos); `npm run lint` global com 3 erros e 1 aviso preexistentes fora do escopo; `npm run build` compilou 5.217 módulos e falhou apenas no estágio final PWA por `EPERM` no temporário do Windows.
- **Banco/permissões:** migration local somente `INSERT` em `public.notifications`, `category='changelog'`, `type='release_fix'`, `permission_resource='cs_cx_nps'`, `action_url='/cs-cx/nps'`; sem schema, catálogo RBAC, grants, RLS, tipos Supabase, worker ou produção.
- **Riscos/pendências:** nenhuma pendência funcional; falhas globais/`EPERM` ambientais registradas.
- **Operações externas:** nenhum commit, push, merge, deploy, `db push`, aplicação remota ou alteração de produção.
