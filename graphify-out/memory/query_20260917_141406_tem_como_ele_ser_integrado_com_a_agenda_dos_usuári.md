---
type: "query"
date: "2026-09-17T14:14:06.434699+00:00"
question: "Tem como ele ser integrado com a agenda dos usuários? Tipo ele cria automaticamente quando tem algo na agenda, ou não faz sentido?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["MyDay", "MyDayAgenda", "useMyDayBoard"]
---

# Q: Tem como ele ser integrado com a agenda dos usuários? Tipo ele cria automaticamente quando tem algo na agenda, ou não faz sentido?

## Answer

Expansão pelo vocabulário do grafo: [agenda, calendar, board, card, event, events, task, user, day, sync, source, implantation]. O fluxo atual já integra Meu Quadro com Minha agenda no sentido Quadro para Agenda: cartões não arquivados com data geram eventos e são unidos aos compromissos de CS/CX e Implantação. O sentido Agenda para Quadro ainda não existe. A solução recomendada é híbrida e configurável: uma entrada Da agenda mostra automaticamente somente itens acionáveis atribuídos ao usuário, excluindo eventos originados no próprio quadro para evitar ciclos; o usuário pode converter ou arrastar o item para uma coluna normal. Se a criação automática persistente for habilitada, deve ser opt-in, filtrar fontes e janela de datas, manter vínculo único source_type/source_id/source_occurrence_id e sincronização unidirecional da origem para título, data e estado.

## Outcome

- Signal: useful

## Source Nodes

- MyDay
- MyDayAgenda
- useMyDayBoard