---
type: "query"
date: "2026-09-17T19:16:04.083376+00:00"
question: "GET my_day_board_columns com is_completion retorna 400 Bad Request e o Meu Quadro nao carrega."
contributor: "graphify"
outcome: "useful"
source_nodes: ["useMyDayBoard.ts", "migration", "supabase"]
---

# Q: GET my_day_board_columns com is_completion retorna 400 Bad Request e o Meu Quadro nao carrega.

## Answer

Expanded from original query via vocab: [board, columns, migration, schema, supabase, error, query, hook, fallback]. O hook useMyDayBoard.ts seleciona is_completion, introduzido pela migration 20260917170000. O preparador confirmou no projeto okvufcwkophaadttmjwa que a coluna e tres RPCs ainda faltavam. A evolucao foi aplicada pelo fluxo transacional prepare:my-day-board com confirmacao do project ref; a verificacao final encontrou 1/1 coluna e 4/4 funcoes. A mesma consulta REST agora chega a validacao de permissao 42501 quando anonima, em vez do erro 400 de coluna ausente.

## Outcome

- Signal: useful

## Source Nodes

- useMyDayBoard.ts
- migration
- supabase