---
type: "query"
date: "2026-09-17T19:28:30.174487+00:00"
question: "Tira esse scroll e transforma toda a area disponivel do quadro em uma superficie para clicar, segurar e arrastar horizontalmente."
contributor: "graphify"
outcome: "useful"
source_nodes: ["MyDayBoard.tsx", "MyDayBoard"]
---

# Q: Tira esse scroll e transforma toda a area disponivel do quadro em uma superficie para clicar, segurar e arrastar horizontalmente.

## Answer

MyDayBoard.tsx oculta a barra nativa, usa toda a superficie desktop com altura disponivel como area de pan por Pointer Events, ignora botoes, links, controles e alcas de cartao, preserva teclado e o fluxo mobile.

## Outcome

- Signal: useful

## Source Nodes

- MyDayBoard.tsx
- MyDayBoard