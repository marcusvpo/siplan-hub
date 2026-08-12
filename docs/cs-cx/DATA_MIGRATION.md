# Migração de dados CS/CX

Esta etapa migra o núcleo do SistemaRegistro sem interromper a produção:

- usuários (somente identidade e vínculo; nunca o hash de senha);
- produtos, cartórios e produtos implantados;
- registros/solicitações e metadados dos anexos;
- contatos, agendamentos e suas auditorias;
- modelos, itens, aplicações e histórico de rotinas;
- visitas, checklists, pendências, anexos e auditoria;
- respostas, históricos e auditoria de NPS.

Os demais domínios listados em `MIGRATION_PARITY.md` entram nas próximas etapas.

## Garantias

- A origem é acessada apenas com `SELECT`.
- A carga exige `--apply`; sem a flag, o script encerra antes de conectar.
- Toda tabela usa `legacy_id` e upsert, então uma nova execução não duplica dados.
- Cada execução faz reconciliação completa. Registros apagados na origem são marcados
  com `source_present = false`, sem exclusão física no Supabase.
- Cada execução de escrita é transacional e auditada em `cs_cx_migration_runs`.
- Datas legadas sem fuso são interpretadas em UTC nas duas conexões.

## Preparação do schema

O pacote controlado contém, nesta ordem:

1. `20260811100000_cs_cx_module_permissions.sql`
2. `20260811110000_cs_cx_migration_control.sql`
3. `20260811111000_cs_cx_core_schema.sql`
4. `20260811112000_cs_cx_native_records.sql`
5. `20260811113000_cs_cx_contacts_appointments.sql`
6. `20260812100000_cs_cx_routines.sql`
7. `20260812101000_cs_cx_visits_nps.sql`
8. `20260812102000_cs_cx_advanced_operations.sql`
9. `20260812103000_cs_cx_nps_webhook.sql`
10. `20260812104000_cs_cx_routine_administration.sql`
11. `20260812105000_cs_cx_routine_reports.sql`
12. `20260812106000_cs_cx_routine_history_context.sql`

O histórico global de migrations do Supabase ainda não possui baseline confiável.
Por isso, não use `supabase db push`: ele pode tentar reaplicar migrations antigas do
HUB. O preparador abaixo valida e aplica somente a lista explícita acima, dentro de
uma única transação:

```bash
# Validação local sem conectar ao banco
npm run prepare:cs-cx -- --static

# Diagnóstico somente leitura do destino
npm run prepare:cs-cx

# Aplicação controlada, somente após conferir o project ref exibido
npm run prepare:cs-cx -- --apply --confirm-project=PROJECT_REF
```

Se encontrar um schema parcial, o preparador interrompe sem tentar reparar ou
sobrescrever objetos. Nesse caso, a divergência deve ser revisada antes de qualquer
nova escrita.

Configurar as URLs sem commitá-las:

```dotenv
CS_CX_SOURCE_DATABASE_URL=postgresql://usuario:senha@10.0.10.9/banco
SUPABASE_DB_URL=postgresql://postgres:senha@host:5432/postgres
CS_CX_SOURCE_SSL=false
CS_CX_TARGET_SSL=true
```

## Execução

```bash
# Valida tabelas e colunas da origem em sessão somente leitura
npm run migrate:cs-cx -- source

# Relatório local do de/para de usuários, sem alterar o banco
npm run migrate:cs-cx -- users

# Comparação somente leitura
npm run migrate:cs-cx -- verify

# Primeira carga
npm run migrate:cs-cx -- initial --apply --confirm-project=PROJECT_REF

# Reconciliações durante o desenvolvimento e na virada
npm run migrate:cs-cx -- delta --apply --confirm-project=PROJECT_REF
```

O modo `delta` deliberadamente relê o conjunto completo nesta primeira versão. Isso
captura alterações e exclusões até em tabelas legadas que não possuem `updated_at`.
Depois de medir o volume real, a leitura pode ser paginada por marca d'água sem mudar
o contrato idempotente.

## Webhook NPS

A função `cs-cx-nps-webhook` preserva o contrato JSON do legado (`data`,
`nome_cartorio` ou `respondente`, `pontuacao`, `motivo` e `sugestao`). Antes do
deploy, configure um segredo novo e forte, sem reutilizar o token padrão legado:

```bash
supabase secrets set NPS_WEBHOOK_TOKEN="um-segredo-longo-e-aleatorio"
supabase functions deploy cs-cx-nps-webhook
```

Envie o segredo preferencialmente no header `x-nps-webhook-token`. Durante a
transição, a função também aceita `Authorization: Bearer ...` e `?token=...` para
compatibilidade com o Power Automate atual. A RPC interna só pode ser executada
pela `service_role`, deduplica por cartório/respondente/dia e audita a inclusão.

## Anexos

A migration cria o bucket privado `cs-cx-attachments`. Nesta etapa são migrados os
metadados; os binários permanecem no compartilhamento legado até a rotina dedicada
de cópia e checksum ser homologada. O campo `storage_path` fica nulo até essa cópia.

## Usuários

Após criar ou confirmar cada conta no Supabase Auth, execute o modo `users`. Ele
gera `artifacts/cs-cx-user-mapping.csv`, que é ignorado pelo Git por conter dados
de usuários.

A carga vincula automaticamente `cs_cx_user_map.profile_id` quando existe exatamente
um e-mail igual no legado e em `profiles`. E-mails ou nomes duplicados nunca são
escolhidos automaticamente. O relatório classifica o restante como sugestão por nome,
ambíguo ou sem vínculo; somente essas exceções precisam de confirmação manual. O
migrador preserva os vínculos confirmados nas sincronizações seguintes.

Para aplicar as exceções confirmadas, crie localmente (sem commit) o arquivo
`artifacts/cs-cx-user-map.json`:

```json
[
  { "legacy_id": 7, "profile_id": "00000000-0000-4000-8000-000000000000" }
]
```

Depois execute:

```bash
npm run migrate:cs-cx -- users --apply \
  --map=artifacts/cs-cx-user-map.json \
  --confirm-project=PROJECT_REF
```

O script valida todos os IDs antes de atualizar e aplica o arquivo em uma transação.
