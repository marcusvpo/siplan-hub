# SiplanHUB — VM Worker (geração automática de modelos)

Worker que roda na VM Linux e conecta a aba 5 (Modelos Editor) do SiplanHUB ao gerador de
modelos do Orion (Codex CLI + skill `criar-modelo-mesclado`).

Quando o analista sobe um documento do cliente na aba 5 e clica em "Gerar modelo automático",
o SiplanHUB enfileira um job. Este worker puxa o job, roda a skill em modo headless autônomo, e
devolve o `modelo.json` gerado direto para a coluna "Modelos Disponíveis (JSON)" da categoria.

> **Este é o único worker da VM** e processa **várias filas** (não só a de modelos). Cada
> funcionalidade de IA do app enfileira em uma tabela do Supabase e este processo reivindica e
> executa. Documentação por funcionalidade em [`../docs/`](../docs/README.md).

<details>
<summary><b>Filas processadas por este worker</b></summary>

| Fila (tabela) | O que faz | Job types | Doc |
|---|---|---|---|
| `model_generation_jobs` | Geração automática de modelos (aba 5) | — | este README |
| `dtc_ai_jobs` | IA de texto: "Gerar com IA" (Considerações Finais), "Melhorar texto", "Resumo geral" | `dtc_summary`, `improve_text`, `summary_blocks` | [FUNCIONALIDADE_GERAR_COM_IA.md](../docs/FUNCIONALIDADE_GERAR_COM_IA.md) |
| `dtc_ai_jobs` | **Preencher por voz** (ditado → transcrição → texto profissional) | `voice_note` | [FUNCIONALIDADE_VOZ.md](../docs/FUNCIONALIDADE_VOZ.md) |
| `copilot_jobs` | Copiloto Operacional (chat sobre o portfólio) + digest diário | — | [FUNCIONALIDADE_COPILOTO.md](../docs/FUNCIONALIDADE_COPILOTO.md) |

Os jobs de modelos rodam o Codex dentro de `/opt/Orion.Modelos` (com a skill). Texto, voz,
classificacao e copiloto tambem usam Codex; nessas tarefas, o Ollama local assume automaticamente
se a CLI falhar ou ficar sem cota. **Voz** depende
adicionalmente de `whisper.cpp` + `ffmpeg` na VM
(ver seção própria abaixo).

</details>

<details>
<summary><b>Fluxo</b></summary>

```
[SiplanHUB / aba 5]  --insere job (pending)-->  [Supabase: model_generation_jobs]
                                                          |  (Realtime + polling, so saida)
                                                          v
                                                 [worker na VM, como 'administrator']
   baixa o doc do cliente -> roda: codex exec --json --ephemeral "$criar-modelo-mesclado ..."
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

- Roda como `administrator` (nao-root), que possui a autenticacao do Codex em `~/.codex`.
  Como o projeto `/opt/Orion.Modelos` e do root, foi concedida ACL de escrita ao
  `administrator` (a posse continua do root — o uso manual como root segue funcionando):

  ```bash
  sudo setfacl -R -m u:administrator:rwx /opt/Orion.Modelos
  sudo setfacl -R -d -m u:administrator:rwx /opt/Orion.Modelos
  ```

- Node 22 isolado via nvm (`/home/administrator/.nvm/...`) — o Node 18 do sistema (usado por
  servicos em `/var/www`) nao e tocado.
- **Binario do Codex:** instalado como dependencia fixa do `vm-worker`, em
  `node_modules/.bin/codex`; `CODEX_BIN` permite override.
- **Skill Codex:** no inicio de cada job o worker instala/atualiza automaticamente
  `.agents/skills/criar-modelo-mesclado/SKILL.md` dentro do Orion.Modelos. O wrapper carrega a skill
  nativa de `.codex/skills` (com fallback para a instalacao legada em `.claude/skills`), aplica as
  regras headless e elimina perguntas/confirmacoes.

</details>

<details>
<summary><b>Requisitos</b></summary>

- Node.js 22 via nvm na VM.
- Codex autenticado para o `administrator` (`codex login`). Para conta de API, execute uma vez
  `printf '%s' "$OPENAI_API_KEY" | codex login --with-api-key` e depois remova a chave do ambiente.
- Ollama ativo com o modelo de contingencia baixado (`ollama pull llama3.1`). Sem Ollama, apenas o
  fallback fica indisponivel; o Codex continua sendo o motor principal.
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
cp .env.example .env      # preencha SUPABASE_SECRET_KEY e autentique o Codex
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
<summary><b>Dois workers na mesma assinatura (split por funcao, custo zero)</b></summary>

A geracao de modelo pode levar ate 30 min e, com **um worker unico**, trava as demais
funcoes de IA (melhorar-texto, voz, copiloto) enquanto roda. Para evitar isso **sem gastar
alem da assinatura**, rode **dois** servicos na mesma VM/assinatura, separados por funcao via
`WORKER_ROLES` (ver a variavel no `.env.example`):

- **`siplan-model-worker`** — `WORKER_ROLES=models` (so `model_generation_jobs`).
- **`siplan-ai-worker`** — `WORKER_ROLES=ai` (so `dtc_ai_jobs` — texto/voz — + `copilot_jobs`).

Assim um modelo gerando **nunca** bloqueia texto/voz/copiloto. Tradeoff (gratis): os dois
consomem a **mesma cota** da assinatura; se estourar o limite de sessao, os jobs voltam pra
fila e esperam o reset (nao viram erro, nao cobram a mais).

1. Adicione ao unit `siplan-model-worker.service` (secao `[Service]`):
   ```ini
   Environment=WORKER_ROLES=models
   Environment=WORKER_ID=vm-models
   ```
   (o `Environment=` do systemd tem prioridade sobre o `.env`, pois o dotenv nao sobrescreve
   variaveis ja definidas.)

2. Crie `/etc/systemd/system/siplan-ai-worker.service` (identico ao de modelos, trocando a
   Description e adicionando os dois `Environment` abaixo):
   ```ini
   [Unit]
   Description=SiplanHUB VM Worker (IA rapida: texto/voz/copiloto)
   After=network-online.target
   Wants=network-online.target

   [Service]
   Type=simple
   User=administrator
   WorkingDirectory=/home/administrator/vm-worker
   Environment=PATH=/home/administrator/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin
   Environment=WORKER_ROLES=ai
   Environment=WORKER_ID=vm-ai
   ExecStart=/home/administrator/.nvm/versions/node/v22.23.1/bin/node /home/administrator/vm-worker/node_modules/tsx/dist/cli.mjs src/index.ts
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. Ative os dois:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart siplan-model-worker      # agora so com papel 'models'
   sudo systemctl enable --now siplan-ai-worker    # novo worker de IA rapida
   ```

Compartilham o mesmo codigo (`/home/administrator/vm-worker`) e `.env`; so mudam `WORKER_ROLES`
e `WORKER_ID`. O `auto-deploy.sh` ja reinicia os dois quando o codigo muda. No boot pelo log deve
aparecer `papeis=models` num e `papeis=ai` no outro, ambos com `Realtime: SUBSCRIBED`.

</details>

<details>
<summary><b>Runbook de deploy (atualizar o worker)</b></summary>

1. Copiar os arquivos atualizados de `vm-worker/` para `/home/administrator/vm-worker/`.
2. `cd /home/administrator/vm-worker && nvm use 22 && npm install` (se mudaram deps).
3. Conferir o `.env` (SUPABASE_SECRET_KEY, CODEX_BIN, ORION_PROJECT_DIR, ENTRADA_DIR e Ollama).
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
| `CODEX_BIN` | (Opcional) Override do Codex CLI; padrao `node_modules/.bin/codex`. |
| `CODEX_MODEL` | (Opcional) Modelo Codex comum; vazio usa o padrao da conta/configuracao. |
| `MODEL_CODEX_MODEL` | (Opcional) Modelo Codex; vazio usa o padrao da conta/configuracao. |
| `CODEX_SANDBOX` | Sandbox de texto/copiloto; padrao `read-only`. |
| `MODEL_CODEX_SANDBOX` | Sandbox da geracao de modelos; padrao `danger-full-access` na VM dedicada. |
| `ORION_PROJECT_DIR` | Projeto onde a skill roda (padrao `/opt/Orion.Modelos`). |
| `MODELOS_CRIADOS_DIR` | Pasta de saida dos JSONs (padrao `<ORION_PROJECT_DIR>/modelos_criados`). |
| `ENTRADA_DIR` | Onde o worker baixa o doc do cliente (padrao `/home/administrator/siplan_entrada`). |
| `DTC_CODEX_MODEL` | (Opcional) Override Codex para DTC, melhorar texto e voz. |
| `COPILOT_CODEX_MODEL` | (Opcional) Override Codex para chat e digest do Copiloto. |
| `COPILOT_CODEX_REASONING_EFFORT` | Esforco do chat (`low` por padrao para reduzir latencia). |
| `CHAMADOS_TEMA_CODEX_MODEL` | (Opcional) Override Codex para classificacao de chamados. |
| `COPILOT_CWD` | Diretorio neutro onde o copiloto roda a CLI (padrao `<tmp>/siplan-copilot`). |
| `OLLAMA_HOST` / `OLLAMA_MODEL` | Servico e modelo local usados no fallback automatico de texto. |
| `WHISPER_BIN` | (Voz) Binario do whisper.cpp (ex.: `/opt/whisper.cpp/build/bin/whisper-cli`). |
| `WHISPER_MODEL` | (Voz) Arquivo ggml do modelo (ex.: `.../ggml-large-v3-turbo.bin`). |
| `WHISPER_LANGUAGE` | (Voz) Idioma forcado (padrao `pt`). |
| `FFMPEG_BIN` | (Voz) Binario do ffmpeg (padrao `ffmpeg`). |
| `MSSQL_HOST` | (Chamados 0800) IP do SQL Server interno (ex.: `10.0.10.59`). Vazio = sync desligado. |
| `MSSQL_PORT` | (Chamados 0800) Porta (padrao 1433). |
| `MSSQL_DATABASE` | (Chamados 0800) Banco (padrao `Siplan_AcessoIA`). |
| `MSSQL_USER` / `MSSQL_PASSWORD` | (Chamados 0800) Credencial de leitura da view. So no `.env` da VM. |
| `CHAMADOS_SYNC_INTERVAL_MS` | (Chamados 0800) Intervalo do sync (padrao 300000 = 5 min). |
| `PROCESSO_VENDA_REQUEST_TIMEOUT_MS` | Timeout exclusivo da view de processo de venda (padrao 300000 = 5 min). |
| `PROCESSO_VENDA_SYNC_INTERVAL_MS` | Intervalo de fundo exclusivo da Consulta de Chamados (padrao 3600000 = 1 hora; filtros continuam sincronizando sob demanda). |
| `PROCESSO_VENDA_SYNC_DAYS` | Janela padrao do espelho de processo de venda (padrao 30 dias). |
| `CHAMADOS_SYNC_GRACE_DAYS` | (Chamados 0800) Dias apos o fim do pos em que o cliente segue no escopo (padrao 60). |

</details>

<details>
<summary><b>Espelho de chamados 0800 (Ellevo -> chamados_0800)</b></summary>

`src/chamadosSync.ts` consulta a view `vw_2026_ChamadosTodosStatus` no SQL Server interno
(`MSSQL_HOST`) e upserta o resultado deduplicado em `public.chamados_0800` no Supabase. Nao usa
IA nem entra nas filas: e um timer proprio (5 min) + atendimento imediato quando o front
insere um pedido em `chamados_sync_requests` (botao "sincronizar agora" do card de Pos, via
Realtime). Escopo: chamados de origem dos projetos (`projects.ticket_number`) + chamados dos
clientes com pos-implantacao ativa (janela = menor `post_start_date`; sai do escopo
`CHAMADOS_SYNC_GRACE_DAYS` dias apos o fim do pos).

**Rode o sync em UM worker so.** Os dois servicos compartilham o `.env`; para desligar no de
modelos existe o drop-in `/etc/systemd/system/siplan-model-worker.service.d/no-chamados-sync.conf`
com `Environment=MSSQL_HOST=` (vazio). Hoje o dono do sync e o `siplan-ai-worker`. No log do dono
deve aparecer `[chamados-sync] ativo: ... (+ sync sob demanda via Realtime)` e, no outro,
`[chamados-sync] desligado`.

**Classificacao de temas (IA).** `src/chamadosClassify.ts` roda como a fila de MENOR prioridade do
worker dono do sync: pega lotes de chamados com `tema_ia` null e pede ao Codex (com fallback Ollama,
`CHAMADOS_TEMA_CODEX_MODEL`) um tema curto por chamado ("selo digital", "livro caixa"...), reusando os
temas ja existentes para agrupar recorrencia entre cartorios (tela Panorama Pos-Implantacao).
Naturezas internas (nova implantacao/negociacao comercial) recebem `tema_ia='interno'` sem gastar
IA. Log: `[chamados-tema] lote ok: N/M classificados`.

**Parecer da Analise Pos (IA).** Job `pos_parecer` na fila `dtc_ai_jobs` (mesmo pipeline de texto
do improve/summary): o front manda um JSON com os chamados do periodo e o worker devolve um parecer
qualitativo em `result_text`.

</details>

<details>
<summary><b>Transcricao de voz (whisper.cpp) — dependencia do "Preencher por voz"</b></summary>

Os jobs `voice_note` (fila `dtc_ai_jobs`) transcrevem o audio **localmente** com `whisper.cpp` e
depois elevam o texto com Codex/Ollama. Requer, **so nesta VM**, `ffmpeg` + `whisper.cpp` + um modelo ggml.
Neste fluxo o agente **nao ingere audio** — quem transcreve e o whisper.cpp.

Instalar (uma vez, como root):

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg git build-essential cmake
sudo git clone https://github.com/ggerganov/whisper.cpp /opt/whisper.cpp
cd /opt/whisper.cpp && sudo cmake -B build && sudo cmake --build build -j --config Release
sudo ./models/download-ggml-model.sh large-v3-turbo   # ~1.6 GB, bom pt-BR
# aponta no .env:
cd /home/administrator/vm-worker
grep -q '^WHISPER_BIN='   .env || echo 'WHISPER_BIN=/opt/whisper.cpp/build/bin/whisper-cli' >> .env
grep -q '^WHISPER_MODEL=' .env || echo 'WHISPER_MODEL=/opt/whisper.cpp/models/ggml-large-v3-turbo.bin' >> .env
sudo systemctl restart siplan-model-worker
```

Teste: `./build/bin/whisper-cli -m models/ggml-large-v3-turbo.bin -f samples/jfk.wav -l en -nt`.
Detalhes completos (fluxo, banco, frontend, troubleshooting, migracao) em
[../docs/FUNCIONALIDADE_VOZ.md](../docs/FUNCIONALIDADE_VOZ.md).

**Sem whisper.cpp/ffmpeg/modelo, apenas os jobs de voz falham** — modelos, DTC e copiloto seguem normais.

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

- **Andamento ao vivo:** o worker roda o Codex com `codex exec --json` e transmite cada
  passo (texto do agente, chamadas de ferramenta) para as colunas `progress` / `progress_log` do
  job. O frontend mostra esse feed ao vivo (via Realtime) ao clicar no badge "Gerando...".
- **Heartbeat:** o worker faz upsert periodico em `model_worker_heartbeat` (a cada
  `HEARTBEAT_INTERVAL_MS`). A tela mostra o selo "Gerador online/offline" a partir disso. Ao receber
  SIGTERM, marca `stopping` para o selo cair na hora.
- **Recuperacao no boot:** ao iniciar, qualquer job preso em `processing` deste worker (orfao de um
  restart) volta para a fila imediatamente, sem esperar o timeout do reaper.
- **Cancelamento:** durante a geracao o worker checa `cancel_requested` do job a cada ~2,5s; se o
  usuario cancelou pela tela, encerra o Codex e marca o job como `cancelled`.
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
