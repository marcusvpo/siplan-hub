---
type: "query"
date: "2026-09-08T19:48:11.036760+00:00"
question: "Onde implementar o filtro por Produto nas solicitações NPS e qual o risco arquitetural?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["NpsSurveyManagement.tsx", "useCsCxCore.ts", "Select"]
---

# Q: Onde implementar o filtro por Produto nas solicitações NPS e qual o risco arquitetural?

## Answer

Expansão pelo vocabulário do grafo: [nps, requests, product, filter, survey]. O fluxo relevante concentra-se em NpsSurveyManagement.tsx, que recebe convites por useCsCxNpsSurveys e produtos por useCsCxRegistryOffices. O filtro pode permanecer local antes da paginação, sem mudar hook, Supabase, RLS, RBAC ou worker.

## Outcome

- Signal: useful

## Source Nodes

- NpsSurveyManagement.tsx
- useCsCxCore.ts
- Select