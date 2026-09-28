# Automação (deploy + migrations + alerta)

Resumo do que roda sozinho e o que cada parte precisa.

## 1. Frontend
Vercel faz deploy automático a cada push em `main`. Nada a configurar.
A instalação usa `npm ci` e o `package-lock.json` validado no projeto.
O `buildCommand` em `vercel.json` executa `npm run build:release`: lint, tipos,
testes e build/PWA devem passar antes de a nova versão ser promovida. A
configuração versionada substitui o comando do painel, conforme a
[documentação da Vercel](https://vercel.com/docs/project-configuration/vercel-json#buildcommand).

## 2. Worker na VM (auto-deploy)
`vm-worker/scripts/auto-deploy.sh` roda no cron do root da VM (a cada 5 min): baixa os
fontes mais novos de `vm-worker/src` (branch `main`) e, se algo mudou, reinicia o serviço.
Agora também sincroniza `package.json`/`package-lock.json` e roda `npm install` quando as
dependências mudam. Instalação: ver `vm-worker/README.md` (seção "Auto-deploy"). Sem secret.

## 3. Migrations do Supabase
O workflow `.github/workflows/supabase-migrations.yml` apenas valida os pacotes
de migration. Ele não aplica alterações no banco de produção.

O histórico remoto ainda precisa ser reconciliado com todos os arquivos locais.
Conforme `AGENTS.md`, `supabase db push` permanece proibido até essa reconciliação.
Não marque versões como aplicadas sem comprovar que o SQL correspondente já foi
executado no banco.

Para uma publicação autorizada, revise a migration específica e seu estado
remoto, aplique somente o arquivo necessário e confira o resultado. O script
existente usa `SUPABASE_DB_URL` do ambiente ou do `.env` local:

```bash
node scripts/apply-migration.js supabase/migrations/<arquivo-revisado>.sql
```

Esse script executa o SQL informado e não atualiza `schema_migrations`. Não use
o comando para aplicar indiscriminadamente arquivos pendentes. Registre o arquivo
aplicado, os efeitos e a verificação no relatório da publicação.

## 4. Alerta se o worker cair (GitHub Actions)
Workflow `.github/workflows/worker-heartbeat-alert.yml` roda a cada 10 min, lê o último
heartbeat no Supabase e avisa no Teams se estiver velho (> 15 min) ou "stopping".

**Secrets do repositório:**
- `SUPABASE_URL` — URL do projeto (mesma do frontend).
- `SUPABASE_ANON_KEY` — chave publishable/anon (a mesma do frontend; leitura via RLS).
- `TEAMS_WEBHOOK` — URL de Incoming Webhook do canal do Teams (opcional; sem ela o alerta
  fica só no log da Action).

## 5. Motor de IA / fallback (env na VM, no `.env` do worker)
- Codex é o motor principal fixo do worker; não requer variável de seleção.
- `DTC_CODEX_MODEL` — override opcional; vazio herda `CODEX_MODEL`/configuração da CLI.
- `OLLAMA_HOST` e `OLLAMA_MODEL` — fallback local automático quando o Codex falha ou fica sem cota.
