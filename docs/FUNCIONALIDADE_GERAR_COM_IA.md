# Funcionalidade de IA de texto — fila `dtc_ai_jobs`

> Documento técnico para manutenção. Cobre os 3 tipos de job de **texto** da fila
> `dtc_ai_jobs`: `dtc_summary`, `improve_text` e `summary_blocks`.
> O job `voice_note` (transcrição de áudio) **não** é coberto aqui — tem documentação própria.

Todos os três botões usam a mesma fila (`dtc_ai_jobs`), o mesmo worker da VM
(systemd `siplan-model-worker`) e o mesmo executor Codex, com fallback Ollama. O que muda
entre eles é o `job_type`, o prompt e a origem do texto de entrada.

---

## 1. Visão geral

| Botão (UI) | `job_type` | Onde aparece | Para que serve |
|---|---|---|---|
| **Gerar com IA** | `dtc_summary` | Tela `/implantadores/transicao`, aba **Relato Técnico**, campo **Considerações Finais** | Redige as "Considerações finais" do relatório de Transição de Conhecimento (DTC), lendo automaticamente as etapas 1 a 6 do projeto. |
| **Melhorar texto com IA** | `improve_text` | Campo **Observações & Detalhes** — etapa 7 (Pós-Implantação) e etapas 1-6 via `ObservationsWithAI` | Reescreve o texto que o analista digitou deixando-o mais claro, coeso e com português correto, **sem** inventar ou remover fatos. |
| **Gerar resumo com IA** | `summary_blocks` | Módulo **Resumo Geral** da etapa 7 (Pós-Implantação) | Sintetiza **todos** os blocos de "Observações & Detalhes" registrados na etapa 7 em um texto único, rico e estruturado. |

Características comuns aos três:

- **Assíncrono via fila.** O frontend apenas insere uma linha em `dtc_ai_jobs`; quem
  processa é o worker da VM. Nada roda no navegador nem na Vercel.
- **Revisão obrigatória.** O texto gerado **nunca** substitui o conteúdo do analista
  automaticamente. A UI abre um diálogo **manter / substituir** e só aplica se o
  usuário confirmar.
- **Progresso ao vivo** e **cancelamento**, ambos via colunas da própria linha do job.

---

## 2. Arquitetura / fluxo

O front nunca chama o worker diretamente — a comunicação é **só pela tabela** no
Supabase (o worker faz apenas conexões de saída: Realtime/WebSocket outbound).

```
[Frontend]                          [Supabase: dtc_ai_jobs]              [VM worker: siplan-model-worker]
   |                                        |                                        |
   |-- INSERT (status 'pending',            |                                        |
   |   job_type, target_field, input_text) -+--------------------------------------->| (Realtime INSERT acorda o worker)
   |                                        |                                        |
   |                                        |<-- RPC claim_dtc_ai_job (FOR UPDATE ----|  reivindica 1 job:
   |                                        |    SKIP LOCKED) -> status 'processing'  |  status='processing', attempts+1
   |                                        |                                        |
   |                                        |                                        |-- roda Codex CLI (JSONL)
   |                                        |                                        |   ou Ollama no fallback
   |                                        |                                        |
   |<-- Realtime (progress / progress_log) -+<---------------------------------------|  grava progresso a cada ~2,5s
   |   [feed ao vivo no badge "Gerando..."] |                                        |
   |                                        |                                        |
   |                                        |<-- UPDATE status='done',----------------|  grava o texto final
   |                                        |    result_text = <texto>                |
   |<-- Realtime (status 'done' + result) --+                                        |
   |                                        |                                        |
   |-- diálogo "manter / substituir" -> aplica no editor Lexical (se confirmado)     |
```

Pontos-chave:
- **Único worker, um agente por vez.** O worker drena as filas sob um flag `busy`
  (`claimAndProcess` em `vm-worker/src/index.ts`); prioriza modelos e intercala com
  os jobs DTC e do Copiloto.
- **Claim atômico.** `claim_dtc_ai_job` usa `FOR UPDATE SKIP LOCKED` — garante um
  worker por job mesmo se houvesse concorrência.
- **Realtime dos dois lados.** O worker escuta `INSERT` para acordar; o frontend
  escuta `*` filtrado por `project_id` para atualizar status/progresso/resultado.

---

## 3. Banco de dados

Tabela **`public.dtc_ai_jobs`** (criada em
`supabase/migrations/20260707200000_create_dtc_ai_jobs.sql`).

### Colunas relevantes

| Coluna | Tipo | Papel |
|---|---|---|
| `id` | UUID PK | Identificador do job. |
| `project_id` | UUID FK → `projects(id)` | Projeto alvo (`ON DELETE CASCADE`). |
| `job_type` | TEXT (default `dtc_summary`) | Distingue os tipos. **CHECK** restringe aos valores conhecidos. |
| `target_field` | TEXT (default `finalConsiderations`) | Campo alvo na UI: `finalConsiderations` (dtc_summary), `observations` (improve_text) ou `summary` (summary_blocks). |
| `input_text` | TEXT | Texto de entrada dos jobs `improve_text`/`summary_blocks` (JSON Lexical ou texto puro). `dtc_summary` **não** usa (lê o DTC do projeto). |
| `result_text` | TEXT | Texto gerado pela IA, gravado ao concluir (`done`). |
| `status` | TEXT | `pending` / `processing` / `done` / `error` / `cancelled` (via CHECK). |
| `attempts` | INTEGER | Incrementado a cada claim. Comparado com `MAX_ATTEMPTS`. |
| `cancel_requested` | BOOLEAN | Pedido de cancelamento durante `processing` (o worker verifica a cada ~5s). |
| `progress` | TEXT | Última frase/parcial do andamento (feed ao vivo). |
| `progress_log` | JSONB (default `[]`) | Últimos ~80 passos (texto do agente e ferramentas). |
| `progress_updated_at` | TIMESTAMPTZ | Carimbo do último flush de progresso. |
| `retry_after` | TIMESTAMPTZ | Agenda a próxima tentativa após limite de sessão (NULL = elegível já). |
| `requested_by` | TEXT | Quem disparou. |
| `worker_id` | TEXT | Worker que reivindicou. |
| `started_at` / `finished_at` / `created_at` / `updated_at` | TIMESTAMPTZ | Ciclo de vida. |

### CHECK de `job_type`

Constraint `dtc_ai_jobs_job_type_check`. Foi crescendo por migration:

- `20260707200000_create_dtc_ai_jobs.sql` — cria a tabela (ainda sem `job_type`;
  o único tipo era, implicitamente, o resumo do DTC).
- `20260707210000_dtc_ai_jobs_improve_text.sql` — adiciona as colunas `job_type`
  (default `dtc_summary`) e `input_text`, e cria o CHECK `('dtc_summary', 'improve_text')`.
- `20260707220000_dtc_ai_jobs_summary_blocks.sql` — dropa e recria o CHECK como
  `('dtc_summary', 'improve_text', 'summary_blocks')`.

> **Nota:** `voice_note` (fora deste doc) é aceito na prática pelo roteamento do
> worker; se for adicionar/validar via CHECK, confira a migration correspondente.

### RPCs (funções Postgres)

- **`claim_dtc_ai_job(p_worker_id TEXT) RETURNS dtc_ai_jobs`** — reivindica o job
  `pending` mais antigo cujo `retry_after` já passou, com `FOR UPDATE SKIP LOCKED`,
  marcando `status='processing'`, `worker_id`, `started_at=NOW()`, `attempts+1` e
  `retry_after=NULL`. Retorna a **linha inteira** — por isso colunas novas
  (`job_type`, `input_text`) acompanham o job sem alterar a assinatura da RPC.
  Redefinida em `20260708120000_auto_retry_on_session_limit.sql` para respeitar
  `retry_after`.
- **`requeue_stuck_dtc_ai_jobs(p_timeout_seconds, p_max_attempts) RETURNS INTEGER`**
  — o **reaper**: devolve para a fila (`pending`) jobs presos em `processing` há mais
  que o timeout e com `attempts < max`; os que já estouraram tentativas viram `error`.

### RLS e Realtime

- **RLS habilitado** com policy permissiva `"Permitir tudo em dtc_ai_jobs"`
  (`FOR ALL USING (true) WITH CHECK (true)`). O worker usa a chave secreta
  (service_role / `sb_secret_...`), que ignora RLS; o frontend usa a chave
  publishable/`anon`.
- **Realtime:** a tabela entra em `supabase_realtime` (`ALTER PUBLICATION ... ADD TABLE`).
  Front observa status/progresso; worker observa `INSERT`.
- Índices: `project_id`, `status`, e um parcial em `created_at WHERE status='pending'`.
- Trigger `update_updated_at_column()` mantém `updated_at`.

---

## 4. Worker

Roteamento em `vm-worker/src/index.ts` → `claimOneDtcJob()`:

```
job_type == 'voice_note'                       -> processVoiceJob   (fora deste doc)
job_type == 'improve_text' | 'summary_blocks'  -> processImproveJob
qualquer outro (inclui 'dtc_summary')          -> processDtcJob
```

### `processDtcJob` (`dtc_summary`) — `vm-worker/src/processDtcJob.ts`

1. Lê a linha inteira do projeto (`projects`), incluindo `custom_fields.dtc` e as
   colunas das etapas 1-6 (`<prefixo>_status/_responsible/_start_date/_end_date/_observations`
   + campos específicos). Falha se não houver DTC preenchido.
2. **Monta o contexto** (`buildContext` / `buildStagesSection`): descreve etapas 1 a 6
   (infra, aderência, conversão, ambiente, modelos_editor, implementação), sub-fases
   `implementation_phase1`/`phase2`, sistemas instalados, versões, conversão, ganhos,
   pendências, sugestões, colaboradores, chamados, NPS. Extrai texto puro de campos
   Lexical (`lexToText`). **Filtra dados sensíveis** (`SENSITIVE`: senha/login/chave/host/
   IP/porta etc.) — nunca vazam no resumo. O analista da implantação vem da etapa 6
   (`implementation_phase1.responsible`), nunca da etapa 7.
3. Roda o Codex (`runSkill`) com o prompt de "Considerações finais" (3 a 7 parágrafos,
   Markdown leve, validando explicitamente etapas não concluídas como pendência).
4. Grava `result_text`, `status='done'`.

### `processImproveJob` (`improve_text` + `summary_blocks`) — `vm-worker/src/processImproveJob.ts`

Compartilham o mesmo pipeline de "texto avulso"; a flag `isSummary = job_type === 'summary_blocks'`
escolhe o prompt:

1. Lê `input_text` (JSON Lexical ou texto puro, normalizado por `lexToText`). Rejeita
   se muito curto.
2. Prompt:
   - `improve_text` → `buildImprovePrompt`: reescreve preservando **integralmente**
     sentido, fatos, nomes, datas e números; não inventa nem remove nada.
   - `summary_blocks` → `buildSummaryPrompt`: consolida **todos** os blocos de
     Observações & Detalhes da etapa 7 em um resumo, destacando resolvido vs. pendente.
   - Ambos pedem Markdown leve (`**negrito**`, `__sublinhado__`, `*itálico*`, listas
     `- `/`1.`) — espelhando o conversor `plainTextToLexicalJson` do frontend.
3. Grava `result_text`, `status='done'`.

### Modelo, execução e fallback

- **Modelo Codex:** `config.dtcCodexModel`; vazio usa a configuração atual da CLI. Override
  via `DTC_CODEX_MODEL` ou `CODEX_MODEL`.
- **Execução:** `codex exec --json --ephemeral`, sandbox `read-only`, com progresso JSONL.
  A autenticação vem de `codex login` e não de uma chave exposta ao processo do job.
- **Fallback automático:** saída não zero, limite, indisponibilidade ou falha de spawn do
  Codex acionam `runOllama()` com `OLLAMA_MODEL`. A troca é registrada no progresso.
- **Falha dupla:** somente se Codex e Ollama falharem o erro sobe ao `index.ts`; limites
  reconhecidos ainda podem ser reenfileirados por `requeueForQuota`.
- **Cancelamento:** `runSkill` verifica `cancel_requested` a cada ~2,5s; se pedido, encerra
  o processo, o job vira `cancelled` e `cancel_requested` volta a `false`.
- **Progresso ao vivo:** flush em `progress`/`progress_log`/`progress_updated_at` a
  cada ~2,5s (`PROGRESS_FLUSH_MS`), mantendo só os últimos 80 passos (`MAX_LOG_STEPS`)
  para não estourar o payload do Realtime.
- **Timeout:** `JOB_TIMEOUT_MS` (padrão 30 min) mata a geração.
- **Recuperação no boot:** ao (re)iniciar, jobs deste worker presos em `processing`
  voltam para `pending` (se `attempts < max`) ou viram `error`.

---

## 5. Frontend

### Hooks

- **`src/hooks/useDtcAiJobs.ts`** — cuida **só** de `dtc_summary`. A query filtra
  `job_type = 'dtc_summary'`. `enqueueJob` insere `{ project_id, target_field:
  'finalConsiderations', requested_by }`. Escuta Realtime filtrado por `project_id`
  (ignora outros `job_type`), faz polling leve de 4s enquanto há job ativo, e quando o
  job disparado fica `done` chama `onResult(job)`. Expõe `enqueueJob`, `cancelJob`,
  `activeJob`.
- **`src/hooks/useImproveTextJobs.ts`** — cuida de `improve_text` **e** `summary_blocks`
  (`TEXT_JOB_TYPES`). `enqueueJob` recebe `{ inputText, requestedBy, jobType }` e insere
  `job_type`, `target_field` (`summary` para `summary_blocks`, senão `observations`) e
  `input_text`. Mesma mecânica de Realtime + polling + `onResult`.

Ambos os hooks cancelam assim: se `pending`, marcam direto `status='cancelled'`; se
`processing`, setam `cancel_requested=true` (o worker encerra o motor de IA).

### Componente `ObservationsWithAI` — `src/components/ProjectManagement/Forms/ObservationsWithAI.tsx`

Campo "Observações & Detalhes" reutilizável (etapas 1-6 e 7) com o botão **"Melhorar
texto com IA"** (`job_type='improve_text'`). Usa `useImproveTextJobs` e
`useModelWorkerStatus` (o botão só habilita se o worker estiver **online** e houver
texto ≥ 3 chars). Enquanto roda, mostra "Melhorando…" com spinner.

### Revisão manter/substituir → editor Lexical

Quando `onResult` chega com o texto:

1. O componente guarda o texto em `pending` e abre um `AlertDialog` ("Texto melhorado
   pela IA") com **"Manter meu texto"** vs. **"Substituir pelo gerado"**.
2. Se o usuário confirmar, `applyGenerated` converte o texto (Markdown leve) para JSON
   Lexical via **`plainTextToLexicalJson`** (`src/lib/lexical`), chama `onChange` e força
   o remount do `RichTextEditor` (bump de `editorKey`) para carregar o novo conteúdo.
3. Se cancelar, nada muda.

O mesmo padrão manter/substituir vale para `dtc_summary` (Considerações Finais) e
`summary_blocks` (Resumo Geral) nas respectivas telas, sempre via `plainTextToLexicalJson`.

---

## 6. Instalação / configuração

**Não há infraestrutura nova além do worker de modelos** — é o mesmo processo, a mesma
VM, o mesmo Codex/Ollama e a mesma chave do Supabase. Variáveis relevantes no `.env`
do worker (`vm-worker/`):

| Variável | Padrão | Papel nesta funcionalidade |
|---|---|---|
| Motor principal | `codex` | Fixo no executor do worker. |
| `DTC_CODEX_MODEL` | vazio | Modelo Codex dos jobs de texto; herda `CODEX_MODEL`/CLI. |
| `OLLAMA_HOST` / `OLLAMA_MODEL` | local / `llama3.1` | Contingência automática para falhas do Codex. |
| `QUOTA_RETRY_MS` | `900000` (15 min) | Intervalo do reenfileiramento automático por cota. |
| `JOB_TIMEOUT_MS` | `1800000` (30 min) | Timeout de uma geração. |
| `MAX_ATTEMPTS` | `3` | Tentativas antes de erro definitivo. |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | — | Conexão do worker (mesmas do worker de modelos). |

As demais variáveis (`CODEX_BIN`, `CODEX_SANDBOX`, `POLL_INTERVAL_MS`,
`HEARTBEAT_INTERVAL_MS`, `WORKER_ID`, `ORION_PROJECT_DIR` etc.) são as mesmas descritas
em `vm-worker/README.md`. Nenhuma dependência extra (whisper/ffmpeg são só do
`voice_note`).

---

## 7. Onde está rodando atualmente

- **Worker:** VM Linux, serviço **systemd `siplan-model-worker`**, rodando como usuário
  **`administrator`**, que mantém a credencial do Codex em `~/.codex`. **Node 22 via nvm** +
  **tsx** executando `src/index.ts`. `WorkingDirectory=/home/administrator/vm-worker`.
- **Autodeploy:** `scripts/auto-deploy.sh` no cron do root, **a cada 5 min**, baixa os
  fontes mais novos de `vm-worker/src` do branch **`main`** (API pública do GitHub) e
  reinicia o serviço **só se algum `.ts` mudou**. Todo push em `main` vira deploy do
  worker sozinho. Migrations do Supabase continuam manuais.
- **Frontend:** Vercel, branch **`main`**.
- **Rede:** a VM faz **só conexões de saída** (Realtime/WebSocket outbound). Sem túnel,
  sem porta aberta.
- **Heartbeat:** o worker faz upsert em `model_worker_heartbeat`; a tela mostra o selo
  "Gerador online/offline" a partir disso (é o mesmo que habilita os botões de IA).

---

## 8. Manutenção / troubleshooting

**Logs:**
```bash
sudo journalctl -u siplan-model-worker -f
```
Linhas úteis: `[dtc <id>]`, `[improve <id>]`, `[summary <id>]` (início/concluído/erro),
`Realtime: SUBSCRIBED`, `SiplanHUB VM worker iniciado`.

**Erros comuns:**

| Sintoma | Causa provável | Ação |
|---|---|---|
| Progresso mostra `Continuando com Ollama local` | Codex falhou, ficou sem cota ou inacessível. | O job continua; revisar `codex login status` se recorrente. |
| Job vira `error` depois do fallback | Codex e Ollama falharam. | Conferir autenticação Codex, `ollama serve` e `ollama list`. |
| Job preso em `processing` (worker morreu) | Crash/restart no meio da geração. | O **reaper** (`requeue_stuck_dtc_ai_jobs`) devolve para a fila após `JOB_TIMEOUT_MS`; no boot, a recuperação faz isso na hora. |
| Botão de IA desabilitado | Worker offline (heartbeat) ou texto curto demais. | Conferir `journalctl`/selo "Gerador offline"; garantir texto mínimo. |
| `spawn ... ENOENT` do Codex | Dependência ausente ou `CODEX_BIN` inválido. | Rodar `npm install` no worker e conferir `CODEX_BIN`. |
| "Este projeto ainda não possui dados de transição (DTC)" (dtc_summary) | `custom_fields.dtc` vazio. | Preencher o Relato Técnico antes de gerar. |

**Como cancelar:** pela própria tela. Job `pending` → marcado `cancelled` direto;
job `processing` → seta `cancel_requested=true` e o worker encerra o motor em até ~2,5s.

---

## 9. Migração de VM

**Não requer nada específico além do setup do worker de modelos.** Estes jobs usam a
**mesma CLI do Codex** e a **mesma infra** do gerador de modelos — sem dependências
extras (whisper.cpp/ffmpeg são exclusivos do `voice_note`). Para migrar, basta seguir o
`vm-worker/README.md`:

1. Node 22 via nvm; Codex instalado pelo `npm install` e autenticado com `codex login` para o
   `administrator`; Ollama ativo com o modelo de contingência baixado.
2. `.env` com `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (`sb_secret_...`, perm `600`,
   dono `administrator`). Opcionalmente `DTC_CODEX_MODEL`/`CODEX_MODEL`.
3. Unit systemd `siplan-model-worker` (User=administrator, Node 22 + tsx).
4. Autodeploy (cron do root) para acompanhar o branch `main`.

Aplicar as migrations `20260707200000`, `20260707210000`, `20260707220000` e
`20260708120000` no Supabase (uma vez, não é por VM).

---

## 10. Segurança

- **Chave secreta do Supabase** (`SUPABASE_SECRET_KEY` = `sb_secret_...`, ou o
  service_role legado) só no `.env` da VM (perm `600`, dono `administrator`). **Ignora
  RLS.** Se vazar, revogar e gerar outra no painel — sem tocar no resto.
- **Frontend** usa só a chave publishable/`anon` (enfileira o job e lê status via RLS).
- **Filtro de dados sensíveis** no `dtc_summary`: `buildContext` remove senhas, logins,
  chaves, host/IP/porta etc. do contexto enviado ao motor — dados de conexão não vazam
  no resumo.
- **Texto roda em sandbox `read-only`**. Apenas a geração de modelos usa
  `MODEL_CODEX_SANDBOX=danger-full-access`, com escrita no projeto Orion.
