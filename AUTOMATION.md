# Automação (deploy + migrations + alerta)

Resumo do que roda sozinho e o que cada parte precisa.

## 1. Frontend
Vercel faz deploy automático a cada push em `main`. Nada a configurar.

## 2. Worker na VM (auto-deploy)
`vm-worker/scripts/auto-deploy.sh` roda no cron do root da VM (a cada 5 min): baixa os
fontes mais novos de `vm-worker/src` (branch `main`) e, se algo mudou, reinicia o serviço.
Agora também sincroniza `package.json`/`package-lock.json` e roda `npm install` quando as
dependências mudam. Instalação: ver `vm-worker/README.md` (seção "Auto-deploy"). Sem secret.

## 3. Migrations do Supabase (GitHub Actions)
Workflow `.github/workflows/supabase-migrations.yml` aplica migrations novas quando um push
em `main` mexe em `supabase/migrations/**`.

**Secrets do repositório** (Settings → Secrets and variables → Actions):
- `SUPABASE_ACCESS_TOKEN` — token pessoal do Supabase (Account → Access Tokens).
- `SUPABASE_PROJECT_ID` — ref do projeto (Project Settings → General → Reference ID).
- `SUPABASE_DB_PASSWORD` — senha do banco (Project Settings → Database).

**Baseline único (obrigatório antes do 1º uso):** migrations já aplicadas na mão não estão
no histórico. Marque-as como aplicadas para o `db push` não tentar re-rodá-las:
```bash
supabase link --project-ref <ref>
supabase migration list
supabase migration repair --status applied <VERSAO>   # para cada uma já aplicada
```

## 4. Alerta se o worker cair (GitHub Actions)
Workflow `.github/workflows/worker-heartbeat-alert.yml` roda a cada 10 min, lê o último
heartbeat no Supabase e avisa no Teams se estiver velho (> 15 min) ou "stopping".

**Secrets do repositório:**
- `SUPABASE_URL` — URL do projeto (mesma do frontend).
- `SUPABASE_ANON_KEY` — chave publishable/anon (a mesma do frontend; leitura via RLS).
- `TEAMS_WEBHOOK` — URL de Incoming Webhook do canal do Teams (opcional; sem ela o alerta
  fica só no log da Action).

## 5. Modelo do resumo / fallback (env na VM, no `.env` do worker)
- `DTC_MODEL` — modelo do resumo (padrão `sonnet`; `haiku` mais rápido, `opus` mais caro/lento).
- `DTC_FALLBACK_API_KEY` — se o Claude bater o limite de sessão da assinatura, o resumo tenta
  de novo cobrando via API com essa chave. Sem ela, o job falha com mensagem clara.
