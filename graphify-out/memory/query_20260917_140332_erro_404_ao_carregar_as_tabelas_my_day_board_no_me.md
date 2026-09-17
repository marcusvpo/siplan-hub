---
type: "query"
date: "2026-09-17T14:03:32.325102+00:00"
question: "Erro 404 ao carregar as tabelas my_day_board no Meu Dia"
contributor: "graphify"
outcome: "useful"
source_nodes: ["useMyDayBoard", "supabase", "migration"]
---

# Q: Erro 404 ao carregar as tabelas my_day_board no Meu Dia

## Answer

Expanded from original query via vocab: [board, boards, card, columns, migration, schema, supabase, query]. Os tres 404 vinham da ausencia total da migration 20260917130000 no projeto Supabase okvufcwkophaadttmjwa. Foi criado um preparador transacional com confirmacao de project-ref, validacao contra schema parcial e verificacao de RLS/RBAC; a migration foi aplicada e o banco ficou com 3/3 tabelas, 2/2 funcoes, 4/4 permissoes, 4/4 grants admin e 12/12 policies. O PostgREST passou de 404 para 401 sem sessao, confirmando que o schema esta publicado e protegido.

## Outcome

- Signal: useful

## Source Nodes

- useMyDayBoard
- supabase
- migration