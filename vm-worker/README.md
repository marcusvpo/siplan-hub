# SiplanHUB — VM Worker (geração automática de modelos)

Worker que roda na VM Linux e conecta a aba 5 (Modelos Editor) do SiplanHUB ao gerador de
modelos do Orion (Claude Code + skill `criar-modelo-mesclado`).

Quando o analista sobe um documento do cliente na aba 5 e clica em "Gerar modelo automático",
o SiplanHUB enfileira um job. Este worker puxa o job, roda a skill em modo headless autônomo, e
devolve o `modelo.json` gerado direto para a coluna "Modelos Disponíveis (JSON)" da categoria.

<details>
<summary><b>Fluxo</b></summary>

```
[SiplanHUB / aba 5]  --insere job (pending)-->  [Supabase: model_generation_jobs]
                                                          |  (Realtime + polling, so saida)
                                                          v
                                                 [worker na VM, como 'administrator']
   baixa o doc do cliente -> roda:  claude --dangerously-skip-permissions -p "/criar-modelo-mesclado ..."
   (autonomo, dentro de /opt/Orion.Modelos) -> localiza o modelo.json em modelos_criados
   -> sobe no bucket -> project_files -> append em projects.modelos_editor_available_files -> done
                                                          |
[SiplanHUB] <-- Realtime + refetch --/  (JSON aparece sozinho na coluna "Modelos Disponiveis")
```

- A VM so faz conexoes de saida (Realtime e WebSocket outbound). Sem tunel, sem porta.
- O `claim` usa `FOR UPDATE SKIP LOCKED` -> um worker por job. Processa 1 por vez.
- Jobs travados voltam para a fila pelo reaper, respeitando `MAX_ATTEMPTS`.

</details>

<details>
<summary><b>Decisoes de ambiente (importante)</b></summary>

- Roda como `administrator` (nao-root). Motivos: (1) o Claude Code recusa
  `--dangerously-skip-permissions` como root; (2) o `administrator` tem credencial do Claude em
  `~/.claude`. Como o projeto `/opt/Orion.Modelos` e do root, foi concedida ACL de escrita ao
  `administrator` (a posse continua do root — o uso manual como root segue funcionando):

  ```bash
  sudo setfacl -R -m u:administrator:rwx /opt/Orion.Modelos
  sudo setfacl -R -d -m u:administrator:rwx /opt/Orion.Modelos
  ```

- Confianca do workspace: o `administrator` precisa ter aceitado a confianca do projeto uma vez
  (interativo: `cd /opt/Orion.Modelos && <claude bin>` -> "Yes, I trust this folder").
- Node 22 isolado via nvm (`/home/administrator/.nvm/...`) — o Node 18 do sistema (usado por
  servicos em `/var/www`) nao e tocado.
- **Binario do Claude:** por padrao o worker **descobre sozinho** o binario nativo mais novo da
  extensao do VS Code (`~/.vscode-server/extensions/anthropic.claude-code-*`). Assim, quando a
  extensao atualiza e o numero de versao no caminho muda, **nao quebra** — pega a versao nova
  automaticamente. `CLAUDE_BIN` no `.env` continua sendo um override opcional (se setado e existir,
  tem prioridade); `VSCODE_EXT_DIR` permite apontar outra pasta de extensoes.

</details>

<details>
<summary><b>Requisitos</b></summary>

- Node.js 20+ (aqui: 22 via nvm) na VM.
- Claude Code instalado e autenticado para o `administrator`.
- Ambiente da skill saudavel: `cd /opt/Orion.Modelos && python3 tools/onboard_check.py` deve passar
  (LibreOffice, API Orion `http://10.0.10.61:8702`, tools).
- Chave secreta do Supabase (so no `.env`, nunca commitada). Use a chave nova, revogavel,
  `sb_secret_...` (Project Settings -> API Keys). Serve tambem o service_role legado, mas ele
  nao e revogavel individualmente — prefira a `sb_secret_...`.

</details>

<details>
<summary><b>Setup</b></summary>

```bash
cd vm-worker
cp .env.example .env      # preencha SUPABASE_SECRET_KEY (sb_secret_...) e confira CLAUDE_BIN
npm install               # com o Node 22 (nvm use 22)
```

</details>

<details>
<summary><b>Rodar como servico (systemd)</b></summary>

Unit em `/etc/systemd/system/siplan-model-worker.service` (roda como `administrator`, com o
Node 22 do nvm e o tsx):

```ini
[Unit]
Description=SiplanHUB VM Worker (geracao de modelos)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=administrator
WorkingDirectory=/home/administrator/vm-worker
Environment=PATH=/home/administrator/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin
ExecStart=/home/administrator/.nvm/versions/node/v22.23.1/bin/node /home/administrator/vm-worker/node_modules/tsx/dist/cli.mjs src/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now siplan-model-worker
sudo journalctl -u siplan-model-worker -f
```

</details>

<details>
<summary><b>Runbook de deploy (atualizar o worker)</b></summary>

1. Copiar os arquivos atualizados de `vm-worker/` para `/home/administrator/vm-worker/`.
2. `cd /home/administrator/vm-worker && nvm use 22 && npm install` (se mudaram deps).
3. Conferir o `.env` (SUPABASE_SECRET_KEY, CLAUDE_BIN, ORION_PROJECT_DIR, ENTRADA_DIR).
4. `sudo systemctl restart siplan-model-worker` e acompanhar `journalctl -u siplan-model-worker -f`.
   - No log de saude deve aparecer: `SiplanHUB VM worker iniciado`, `Realtime: SUBSCRIBED`, e 0 erros ocioso.

</details>

<details>
<summary><b>Variaveis de ambiente</b></summary>

| Variavel | Descricao |
|---|---|
| `SUPABASE_URL` | URL do projeto (mesma do frontend). |
| `SUPABASE_SECRET_KEY` | Chave secreta nova, revogavel (`sb_secret_...`). Ignora RLS. So na VM. |
| `SUPABASE_SERVICE_ROLE_KEY` | (Compat) service_role legado; usado se `SUPABASE_SECRET_KEY` estiver ausente. |
| `STORAGE_BUCKET` | Bucket de arquivos (padrao `project-files`). |
| `WORKER_ID` | Identificador deste worker. |
| `POLL_INTERVAL_MS` | Intervalo do polling de fallback (padrao 15000). |
| `JOB_TIMEOUT_MS` | Timeout de uma geracao (padrao 1800000 = 30 min). |
| `MAX_ATTEMPTS` | Tentativas antes de marcar erro definitivo (padrao 3). |
| `HEARTBEAT_INTERVAL_MS` | Intervalo do heartbeat (selo online/offline na tela). Padrao 30000. |
| `CLAUDE_BIN` | (Opcional) Override do binario do Claude Code. Se ausente, auto-descobre o mais novo da extensao. |
| `VSCODE_EXT_DIR` | (Opcional) Pasta de extensoes do VS Code (padrao `~/.vscode-server/extensions`). |
| `ORION_PROJECT_DIR` | Projeto onde a skill roda (padrao `/opt/Orion.Modelos`). |
| `MODELOS_CRIADOS_DIR` | Pasta de saida dos JSONs (padrao `<ORION_PROJECT_DIR>/modelos_criados`). |
| `ENTRADA_DIR` | Onde o worker baixa o doc do cliente (padrao `/home/administrator/siplan_entrada`). |

</details>

<details>
<summary><b>Como o worker acha o JSON gerado</b></summary>

A skill salva em `modelos_criados/<codigo>/<cartorio>/modelo.json` (nome do cartorio derivado do
`client_name` do projeto no SiplanHUB). O worker localiza o arquivo por:

1. a linha `JSON_GERADO=<caminho>` que o prompt pede para o agente imprimir no final; e
2. fallback: o `modelo.json` mais recente em `modelos_criados` criado apos o inicio do job.

</details>

<details>
<summary><b>Andamento ao vivo e saude do worker</b></summary>

- **Andamento ao vivo:** o worker roda o Claude com `--output-format stream-json` e transmite cada
  passo (texto do agente, chamadas de ferramenta) para as colunas `progress` / `progress_log` do
  job. O frontend mostra esse feed ao vivo (via Realtime) ao clicar no badge "Gerando...".
- **Heartbeat:** o worker faz upsert periodico em `model_worker_heartbeat` (a cada
  `HEARTBEAT_INTERVAL_MS`). A tela mostra o selo "Gerador online/offline" a partir disso. Ao receber
  SIGTERM, marca `stopping` para o selo cair na hora.
- **Recuperacao no boot:** ao iniciar, qualquer job preso em `processing` deste worker (orfao de um
  restart) volta para a fila imediatamente, sem esperar o timeout do reaper.
- **Cancelamento:** durante a geracao o worker checa `cancel_requested` do job a cada ~5s; se o
  usuario cancelou pela tela, mata o Claude e marca o job como `cancelled`.
- **Watchdog:** `scripts/worker-watchdog.sh` (cron do root, a cada 2 min) reinicia o servico se ele
  estiver totalmente parado. Complementa o `Restart=always` do systemd (que cobre crashes).
  Instalacao: ver o cabecalho do proprio script.

Requer a migration `20260707160000_model_progress_and_worker_heartbeat.sql` aplicada no Supabase.

</details>

<details>
<summary><b>Qualidade / limites (modo headless)</b></summary>

O modo headless roda a skill de forma autonoma, decidindo sozinho as escolhas que a skill
normalmente pergunta (tipo do modelo, exemplo-base, mapeamentos, nome do cartorio). Isso gera um
rascunho — o analista deve revisar o modelo na aba 5 antes de usar em producao. Se a qualidade nao
for suficiente, da para migrar para o modo semi-automatico (humano no volante).

</details>

<details>
<summary><b>Auto-deploy (atualizacao automatica do worker)</b></summary>

Como a VM nao tem git, o `scripts/auto-deploy.sh` roda no **cron do root** a cada 5 min: baixa
os fontes mais novos de `vm-worker/src` (branch `main`) via API publica do GitHub e reinicia o
servico **somente se algum arquivo mudou**. Assim, todo `push` que chega em `main` vira deploy do
worker sozinho — sem tocar na VM.

Instalacao (uma vez, como root):

```bash
sudo curl -fsSL https://raw.githubusercontent.com/marcusvpo/siplan-hub/main/vm-worker/scripts/auto-deploy.sh -o /usr/local/bin/siplan-worker-autodeploy.sh
sudo chmod +x /usr/local/bin/siplan-worker-autodeploy.sh
( sudo crontab -l 2>/dev/null | grep -v siplan-worker-autodeploy ; echo '*/5 * * * * /usr/local/bin/siplan-worker-autodeploy.sh >> /var/log/siplan-worker-autodeploy.log 2>&1' ) | sudo crontab -
```

- Log das atualizacoes: `/var/log/siplan-worker-autodeploy.log`.
- Usa API publica (sem token); 12 execucoes/h ficam bem dentro do limite de 60/h por IP.
- So mexe em arquivos `.ts` de `vm-worker/src`. Novas migrations do Supabase continuam manuais.

</details>

<details>
<summary><b>Seguranca</b></summary>

- A chave secreta (`SUPABASE_SECRET_KEY` = `sb_secret_...`) so no `.env` da VM (perm `600`, dono
  `administrator`). Ignora RLS. Se vazar, revogue-a e gere outra no painel — sem tocar no resto.
- O frontend usa so a chave publishable/`anon` (enfileira o job e le status via RLS).
- O worker roda um agente com `--dangerously-skip-permissions` — sem supervisao, com escrita no
  projeto. Mantenha a VM e o `.env` restritos.

</details>
