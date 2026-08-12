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

## Preparação

Aplicar, nesta ordem:

1. `20260811100000_cs_cx_module_permissions.sql`
2. `20260811110000_cs_cx_migration_control.sql`
3. `20260811111000_cs_cx_core_schema.sql`
4. `20260811112000_cs_cx_native_records.sql`
5. `20260811113000_cs_cx_contacts_appointments.sql`
6. `20260812100000_cs_cx_routines.sql`
7. `20260812101000_cs_cx_visits_nps.sql`
8. `20260812102000_cs_cx_advanced_operations.sql`

Configurar as URLs sem commitá-las:

```dotenv
CS_CX_SOURCE_DATABASE_URL=postgresql://usuario:senha@10.0.10.9/banco
SUPABASE_DB_URL=postgresql://postgres:senha@host:5432/postgres
CS_CX_SOURCE_SSL=false
CS_CX_TARGET_SSL=true
```

## Execução

```bash
# Comparação somente leitura
npm run migrate:cs-cx -- verify

# Primeira carga
npm run migrate:cs-cx -- initial --apply

# Reconciliações durante o desenvolvimento e na virada
npm run migrate:cs-cx -- delta --apply
```

O modo `delta` deliberadamente relê o conjunto completo nesta primeira versão. Isso
captura alterações e exclusões até em tabelas legadas que não possuem `updated_at`.
Depois de medir o volume real, a leitura pode ser paginada por marca d'água sem mudar
o contrato idempotente.

## Anexos

A migration cria o bucket privado `cs-cx-attachments`. Nesta etapa são migrados os
metadados; os binários permanecem no compartilhamento legado até a rotina dedicada
de cópia e checksum ser homologada. O campo `storage_path` fica nulo até essa cópia.

## Usuários

Após criar ou confirmar cada conta no Supabase Auth, preencher `profile_id` em
`cs_cx_user_map`. O migrador preserva esse vínculo nas sincronizações seguintes.
