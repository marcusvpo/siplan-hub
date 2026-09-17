# Resultado — Adicionar botão na rotina de agendamentos

## Status
Concluído localmente e aprovado pelo QA.

## Solicitação
Adicionar na rota /cs-cx/agendamentos um botão de olho para visualizar as observações do agendamento sem abrir a edição.

## Implementação
- Botão Eye disponível nas listas desktop e mobile, fora dos gates de edit/delete.
- Diálogo somente leitura com observações múltiplas, nota legada e estado vazio.
- Conteúdo longo preserva quebras e palavras extensas, com rolagem interna.
- Responsividade validada em desktop e 320 px.
- Safe areas superior e inferior consideradas no PWA, inclusive para notch/status bar.
- Ajuda da tela e documentação de paridade atualizadas.
- Migration local idempotente de changelog criada; sem mudança de schema, RBAC, RLS ou tipos.

## Arquivos da entrega
- src/pages/cs-cx/CsCxAppointments.tsx
- src/test/cs-cx-engagement-permissions.test.tsx
- src/constants/pageHelpRegistry.ts
- docs/cs-cx/MIGRATION_PARITY.md
- supabase/migrations/20260917100000_add_cs_cx_appointment_observations_preview_changelog.sql

Observação: mudanças concorrentes já existentes em Calendar, Meu Dia, graphify-out, .maestri e na migration 20260910120000_fix_sd_time_import_unicode_changelog.sql foram preservadas e não pertencem a esta entrega. src/constants/pageHelpRegistry.ts também contém hunks concorrentes de Meu Dia, preservados sem alteração por esta solicitação.

## Agentes
- Tech Lead: coordenação, análise, integração e revisão final.
- Frontend & PWA: implementação, testes e smoke responsivo.
- Supabase, Banco de Dados & RBAC: migration local de changelog.
- QA & Code Reviewer: revisão independente, achado de safe-area e aprovação após correção.

## Validações
- 3/3 testes novos da visualização de observações: aprovados.
- ESLint focado nos arquivos TypeScript/TSX da entrega: aprovado.
- npx tsc --noEmit: aprovado.
- Portal: desktop 1440x892 e mobile 320x640 aprovados, sem overflow horizontal; botão, diálogo, estado vazio, foco, fechamento e Escape validados.
- Safe-area revalidada pelo QA: top/bottom 8 px com insets zerados, max-height 624 px no viewport 320x640, scroll interno e aprovação final.
- git diff --check dos arquivos rastreados da entrega: aprovado.
- graphify update .: executado; nenhuma mudança de topologia detectada.
- npm run lint global: falhou por 3 erros e 1 aviso preexistentes fora do escopo.
- npm test global: cinco falhas preexistentes (três de changelog e duas de contatos); os três testes novos passaram.
- npm run build: compilou 5.209 módulos; etapa final do PWA falhou por restrição de acesso ao diretório temporário do Windows, sem erro de compilação da mudança.

## Banco, permissões e worker
- Migration local criada somente para notificação changelog.
- Nenhuma alteração de schema, RLS, catálogo de permissões, tipos Supabase ou produção.
- Nenhuma alteração no vm-worker.

## Pendências e limites
- Nenhuma pendência funcional da solicitação.
- A migration não foi aplicada remotamente.
- As falhas globais preexistentes acima permanecem fora do escopo.

## Operações externas
Nenhum commit, push, merge, deploy, db push, migration remota ou alteração de produção foi executado.
