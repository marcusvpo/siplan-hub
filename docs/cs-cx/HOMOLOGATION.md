# Gate de homologação CS/CX

O merge em `main` só deve ser proposto depois que os itens técnicos abaixo estiverem
concluídos. O legado continua sendo a fonte oficial até a virada final.

O gate conectado pode ser consultado a qualquer momento com:

```bash
npm run check:cs-cx
```

Ele retorna código `0` somente quando schema/RLS, carga, usuários, anexos,
permissões administrativas, o webhook NPS protegido e o endpoint NPS público
estiverem completos.

## Estado em 12/08/2026

- Schema aplicado no projeto `okvufcwkophaadttmjwa`: 27/27 tabelas com RLS.
- Carga inicial `ba771699-528d-4f58-bacf-73a296fd9518` concluída.
- Reconciliação: 27/27 conjuntos com contagens iguais e zero hashes divergentes.
- Testes automatizados: 149 aprovados; build de produção aprovado.
- Usuários ativos elegíveis: 5/5 vinculados; uma exceção ignorada por decisão do negócio.
- Anexos históricos: 2/2 copiados e aprovados por checksum.
- Webhook NPS: implantado, protegido e retornando HTTP 401 sem token.
- NPS nativo: questionários, convites individuais e endpoint público implantados;
  submissão, snapshot, classificação e idempotência validados ponta a ponta.
- Gate conectado: `READY`; módulo pronto para homologação humana.

### Atualização pré-homologação em 12/08/2026

- Delta final `3334926b-7dcb-473f-aaba-9bc4287f1626` aplicado sem interromper o legado.
- Reconciliação repetida: 27/27 conjuntos com contagens iguais e zero hashes divergentes.
- Anexos históricos: 2/2 relidos do bucket e aprovados novamente por SHA-256.
- Perfil piloto `Bruno Fernandes`: papel `admin`, vínculo legado confirmado e 33/33 permissões CS/CX.
- O migrador incremental passou a preservar `storage_path` de anexos já copiados.

## Antes da validação humana

- [x] Credencial local `SUPABASE_DB_URL` válida, sem envio por chat ou commit.
- [x] `npm run prepare:cs-cx -- --static` aprovado.
- [x] Diagnóstico conectado do schema aprovado.
- [x] Pacote controlado das 14 migrations aplicado e validado.
- [x] Carga inicial concluída sem erro.
- [x] `verify` com todas as contagens em `OK`.
- [x] Relatório de usuários gerado; e-mails únicos vinculados automaticamente.
- [x] Exceções do de/para confirmadas pelo responsável do negócio.
- [x] Perfil piloto administrador confirmado com 33/33 permissões CS/CX.
- [x] Edge Function NPS implantada e rejeitando chamadas sem token.
- [x] Formulário NPS público implantado e validado com convite descartável.
- [x] Build e testes automatizados aprovados; lint do escopo aprovado.
- [x] Anexos históricos copiados e aprovados por checksum.
- [ ] Smoke test das rotas e das ações de escrita com um perfil piloto.

## Roteiro da validação humana

Validar no mínimo: visão geral, solicitações/lista/Kanban, cartórios e produtos,
contatos, agenda/calendário, rotinas e histórico, visitas/checklists/pendências,
NPS, relatórios e administração de rotinas. No NPS, criar/editar um questionário,
gerar um link para um contato piloto, responder sem login e confirmar a entrada
automática da resposta no HUB. Conferir também filtros, criação, edição,
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
