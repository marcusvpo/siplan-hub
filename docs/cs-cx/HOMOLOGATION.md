# Gate de homologação CS/CX

O merge em `main` só deve ser proposto depois que os itens técnicos abaixo estiverem
concluídos. O legado continua sendo a fonte oficial até a virada final.

## Antes da validação humana

- [ ] Credencial local `SUPABASE_DB_URL` válida, sem envio por chat ou commit.
- [ ] `npm run prepare:cs-cx -- --static` aprovado.
- [ ] Diagnóstico conectado do schema aprovado.
- [ ] Pacote controlado das 12 migrations aplicado e validado.
- [ ] Carga inicial concluída sem erro.
- [ ] `verify` com todas as contagens em `OK`.
- [ ] Relatório de usuários gerado; e-mails únicos vinculados automaticamente.
- [ ] Exceções do de/para confirmadas pelo responsável do negócio.
- [ ] Perfis piloto recebem somente as permissões CS/CX necessárias.
- [ ] Build, lint e testes automatizados aprovados.
- [ ] Anexos históricos copiados e aprovados por checksum.
- [ ] Smoke test das rotas e das ações de escrita com um perfil piloto.

## Roteiro da validação humana

Validar no mínimo: visão geral, solicitações/lista/Kanban, cartórios e produtos,
contatos, agenda/calendário, rotinas e histórico, visitas/checklists/pendências,
NPS, relatórios e administração de rotinas. Conferir filtros, criação, edição,
mudança de estado, exclusão permitida, PDFs/exportações e bloqueios por permissão.

Os anexos históricos exigem uma etapa própria de cópia dos binários para o bucket
privado, com contagem e checksum. Isso não impede validar as telas e novos uploads,
mas precisa estar concluído antes de desligar o sistema legado.

## Virada final

1. Definir uma janela curta de congelamento de escrita no legado.
2. Executar `delta --apply --confirm-project=PROJECT_REF` e repetir `verify`.
3. Copiar e validar os anexos históricos restantes.
4. Registrar a aprovação dos usuários responsáveis.
5. Tornar o HUB a fonte oficial; manter o legado somente leitura durante o período
   de segurança acordado.

O workflow de CI apenas valida o pacote CS/CX. Ele não aplica automaticamente o
histórico global de migrations no Supabase.
