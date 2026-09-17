---
type: "query"
date: "2026-09-17T18:37:19.273767+00:00"
question: "Aqui na tela do meu quadro eu queria que os cards ficassem sempre na horizontal igual no Trello e nao um em baixo do outro. Deixa mais compacto o hero da tela tambem."
contributor: "graphify"
outcome: "useful"
source_nodes: ["MyDayBoard.tsx", "MyDayBoard"]
---

# Q: Aqui na tela do meu quadro eu queria que os cards ficassem sempre na horizontal igual no Trello e nao um em baixo do outro. Deixa mais compacto o hero da tela tambem.

## Answer

Expanded from original query via vocab: [board, cards, column, columns, compact, kanban, layout, mobile, trello, agenda]. MyDayBoard.tsx concentra o layout: o grid desktop foi substituido por uma faixa flexivel com colunas fixas, shrink-0 e overflow-x-auto interno; o mobile permanece em coluna unica e o hero recebeu menos padding, tipografia menor e acoes compactas. Testes de MyDayBoard e my-day-screen cobrem o resultado.

## Outcome

- Signal: useful

## Source Nodes

- MyDayBoard.tsx
- MyDayBoard