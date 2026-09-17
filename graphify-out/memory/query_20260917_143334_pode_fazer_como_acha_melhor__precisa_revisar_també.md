---
type: "query"
date: "2026-09-17T14:33:34.781619+00:00"
question: "Pode fazer como acha melhor, precisa revisar também porque não consigo arrastar aparentemente, e o correto é poder arrastar os itens ne"
contributor: "graphify"
outcome: "useful"
source_nodes: ["MyDayBoard", "useMyDayBoardInbox", "buildMyDayBoardInboxItems"]
---

# Q: Pode fazer como acha melhor, precisa revisar também porque não consigo arrastar aparentemente, e o correto é poder arrastar os itens ne

## Answer

Expansão pelo vocabulário do grafo: [board, card, agenda, event, drag, drop, dnd, sortable, calendar, task, source, sync]. Implementada a Entrada da agenda no Meu Quadro com tarefas pessoais e compromissos de CS/CX e Implantação atribuídos ao usuário. Os itens podem ser filtrados, adicionados ou arrastados para uma coluna e recebem uma referência estável na URL para evitar duplicação e impedir que o cartão importado gere outra ocorrência na agenda. Corrigido o drag ao retirar o manipulador do botão interativo e criar uma alça dedicada. No mobile, cada botão de coluna também é um alvo de soltura e a lista ativa permite reordenação por toque. Testes direcionados, TypeScript, lint dos arquivos alterados e build passaram; a suíte global manteve cinco falhas não relacionadas em testes de CS/CX e notificações.

## Outcome

- Signal: useful

## Source Nodes

- MyDayBoard
- useMyDayBoardInbox
- buildMyDayBoardInboxItems