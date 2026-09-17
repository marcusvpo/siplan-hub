---
type: "query"
date: "2026-09-17T13:06:01.862972+00:00"
question: "Tinha pensado em criar um novo modulo/card para o menu Meu dia, tipo trello que é um sistema kanban com notas e personalizável por usuário, teria como fazer isso?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PersonalizeMyDayDialog", "MY_DAY_WIDGETS", "MyDayAgenda", "my_day_tasks"]
---

# Q: Tinha pensado em criar um novo modulo/card para o menu Meu dia, tipo trello que é um sistema kanban com notas e personalizável por usuário, teria como fazer isso?

## Answer

Expanded from original query via vocab: [kanban, board, card, column, custom, layout, menu, note, personalize, task, widget, widgets]. É viável criar um widget Meu quadro no Meu Dia e uma tela completa /meu-dia/quadro. A base existente já tem MY_DAY_WIDGETS, PersonalizeMyDayDialog com drag-and-drop, preferências persistidas por usuário e my_day_tasks com RLS. Recomenda-se manter cartões do quadro em tabelas próprias, com colunas personalizáveis e prazo opcional; cartões com prazo entram na agenda e prioridades sem duplicação. Reutilizar work_center e aplicar RLS por auth.uid().

## Outcome

- Signal: useful

## Source Nodes

- PersonalizeMyDayDialog
- MY_DAY_WIDGETS
- MyDayAgenda
- my_day_tasks