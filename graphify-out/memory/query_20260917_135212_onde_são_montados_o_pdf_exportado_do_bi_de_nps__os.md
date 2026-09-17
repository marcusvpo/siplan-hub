---
type: "query"
date: "2026-09-17T13:52:12.432005+00:00"
question: "Onde são montados o PDF exportado do BI de NPS, os filtros e as métricas por cartório?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["NpsAnalytics.tsx", "cs-cx-nps-analytics.ts", "cs-cx-experience-pdf.ts"]
---

# Q: Onde são montados o PDF exportado do BI de NPS, os filtros e as métricas por cartório?

## Answer

Expanded from original query via vocab: [nps, pdf, export, report, rating, response, cartorios, performance, neutral, jspdf]. A tela NpsAnalytics.tsx chama a exportação; cs-cx-nps-analytics.ts filtra respostas e monta métricas/agrupamentos; cs-cx-experience-pdf.ts compõe os blocos e renderiza o PDF com jsPDF.

## Outcome

- Signal: useful

## Source Nodes

- NpsAnalytics.tsx
- cs-cx-nps-analytics.ts
- cs-cx-experience-pdf.ts