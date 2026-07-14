# Funcionalidade: Copiloto Operacional

Documento técnico para quem vai dar manutenção. Descreve o chat de IA sobre o portfólio de projetos do SiplanHUB: front, fila, worker, banco, deploy e segurança. Todos os fatos aqui vêm do código referenciado — caminhos reais estão citados em cada seção.

---

## 1. Visão geral

O **Copiloto Operacional** é um chat de IA sobre o **portfólio inteiro de projetos**. O usuário digita uma pergunta em linguagem natural (ex.: *"Quais cartórios estão com a conversão pendente?"*), o worker da VM monta um contexto compacto com o status de cada etapa de cada projeto e roda o Claude para responder. A resposta volta em tempo real para a tela.

Não é um assistente genérico: ele responde **apenas** com base nos dados do portfólio (projetos + pendências de conversão em aberto), com regras de negócio embutidas no prompt (o que conta como "atrasado", "travado", "concluído").

### Onde aparece na UI

| Local | Arquivo | Descrição |
|---|---|---|
| Página dedicada `/copilot` | `src/pages/Copilot.tsx` | Chat em coluna centralizada (`max-w-3xl`). |
| Widget flutuante (FAB) | `src/components/Copilot/FloatingCopilot.tsx` | Botão fixo (canto inferior direito) presente em todas as telas; abre um painel lateral redimensionável. Some na própria `/copilot`. |
| Item no menu lateral | `src/components/Layout/AppSidebar.tsx` | Link "Copiloto" — só aparece para usuários habilitados (`hasCopilotAccess`). |
| Admin: acesso/cota | `src/pages/admin/CopilotAccess.tsx` (rota `/admin/copilot`) | Liga/desliga por usuário e define a cota diária de tokens. |
| Admin: uso | `src/pages/admin/CopilotUsage.tsx` (rota `/admin/copilot-usage`) | Painel de consumo: perguntas, tokens cobrados, usuários ativos, satisfação (👍/👎), perguntas mais feitas. |

O corpo do chat é o componente reutilizável `src/components/Copilot/CopilotChat.tsx`, usado tanto pela página quanto pelo widget flutuante.

### Quem tem acesso (gate + cota)

O acesso é **por usuário**, controlado pela tabela `copilot_access`:

- **Gate** (`enabled`): um admin habilita/desabilita cada usuário na tela **Painel Admin → Copiloto**. Sem linha habilitada, o usuário não vê o Copiloto e a RLS barra o envio de perguntas.
- **Cota diária** (`daily_token_limit`): teto de tokens/dia por pessoa (padrão atual **200000**; `0 = ilimitado`). O consumo real (`tokens_used_today`) zera automaticamente a cada dia (`period_reset_at`).

A cota é checada em três camadas: na RLS do `INSERT`, reforçada no início do worker, e contabilizada após cada resposta.

---

## 2. Arquitetura / fluxo

O front **nunca chama o worker diretamente**. Toda comunicação passa por tabelas no Supabase (fila + Realtime), exatamente como as outras filas de IA do projeto (`model_generation_jobs`, `dtc_ai_jobs`).

```
┌─────────────────────────┐
│  Front (React / Vercel) │   useCopilot()  →  INSERT em copilot_jobs (status 'pending')
│  CopilotChat.tsx        │   (RLS: só passa se habilitado + dentro da cota)
└────────────┬────────────┘
             │  Realtime (INSERT) acorda o worker
             ▼
┌─────────────────────────────────────────────────────────────┐
│  Worker na VM Linux (systemd 'siplan-model-worker')          │
│  index.ts → claimOneCopilotJob() → RPC claim_copilot_job     │
│            (FOR UPDATE SKIP LOCKED, 1 job por vez)            │
│                          │                                   │
│                          ▼                                   │
│  processCopilotJob.ts                                        │
│   1. valida cota (copilot_access)                            │
│   2. lê 'projects' → 1 linha compacta por projeto            │
│      (+ escopo 'ativos'/'todos') + conversion_issues abertas │
│   3. monta histórico das últimas trocas (chat multi-turno)   │
│   4. runSkill(prompt, model=haiku, cwd=copilotCwd NEUTRO)    │
│      → Claude Code headless (stream-json, --verbose)         │
│   5. grava result_text + followups + tokens cobrados → 'done'│
└────────────┬────────────────────────────────────────────────┘
             │  Realtime (UPDATE) empurra progresso e resposta
             ▼
┌─────────────────────────┐
│  Front mostra a resposta │   (linkifica nomes de cartório → /projects/ID)
└─────────────────────────┘
```

Pontos-chave:

- **Atômico e serial:** o `claim` usa `FOR UPDATE SKIP LOCKED` → um worker por job. O worker processa **um Claude por vez** (flag `busy` em `index.ts`), intercalando as três filas (modelo → DTC → copiloto) até esvaziarem.
- **Modelo leve:** o copiloto roda em **Haiku** por padrão (`config.copilotModel`) — é uma tarefa de Q&A, não precisa do modelo pesado.
- **Diretório neutro:** o Claude roda em `config.copilotCwd` (pasta vazia), **não** em `/opt/Orion.Modelos`, para não carregar o `CLAUDE.md` e as skills do Orion no contexto (irrelevantes e caros).
- **Sem chave de API:** usa a **assinatura** da CLI do Claude Code (mesma credencial do gerador de modelos), não `ANTHROPIC_API_KEY`.

---

## 3. Banco de dados

As tabelas são criadas pela migration base `supabase/migrations/20260710120000_create_copilot.sql` e evoluídas por migrations seguintes (`20260710150000`…`20260710200000`).

### `copilot_access` — gate + cota por usuário

| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | UUID (PK) | FK → `profiles(id)`, `ON DELETE CASCADE`. |
| `enabled` | BOOLEAN | Gate. Padrão `FALSE`. |
| `daily_token_limit` | INTEGER | Teto de tokens/dia. Padrão **200000** (era 50000 na base; subido em `20260710150000_copilot_raise_quota.sql`). `0 = ilimitado`. |
| `tokens_used_today` | INTEGER | Consumo do dia corrente. |
| `period_reset_at` | DATE | Dia de referência; quando fica no passado, a contagem zera. |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auditoria (trigger `update_updated_at_column`). |

### `copilot_jobs` — fila de perguntas

Clone do padrão `dtc_ai_jobs`. Colunas relevantes:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID | FK → `profiles(id)`. |
| `question` | TEXT | Pergunta do usuário. |
| `status` | TEXT | `pending` / `processing` / `done` / `error` / `cancelled`. |
| `result_text` | TEXT | Resposta final. |
| `error_message` | TEXT | Mensagem de erro (se `error`). |
| `attempts`, `worker_id` | | Controle de fila/reaper. |
| `cancel_requested` | BOOLEAN | Sinaliza cancelamento durante o processing. |
| `progress`, `progress_log`, `progress_updated_at` | | Feed ao vivo (última frase + últimos passos). |
| `retry_after` | TIMESTAMPTZ | Reenfileiramento por limite de sessão (quota). |
| `tokens_in`, `tokens_out` | INTEGER | Uso bruto reportado. |
| `tokens_charged` | INTEGER | Tokens **cobrados** na cota, ponderados (add. em `20260710180000_copilot_tokens_charged.sql`). |
| `scope` | TEXT | `ativos` ou vazio/`todos` (add. em `20260710170000_copilot_multiturn_scope.sql`). |
| `feedback` | SMALLINT | `1` (👍), `-1` (👎), `NULL` (add. em `20260710190000_copilot_feedback_followups.sql`). |
| `followups` | TEXT | Follow-ups sugeridos pelo modelo, separados por `|` (mesma migration). |
| `created_at` / `updated_at` / `started_at` / `finished_at` | TIMESTAMPTZ | |

Índices: por `user_id`, por `status`, parcial em `created_at WHERE status='pending'`, e `(user_id, created_at DESC)` para montar o histórico multi-turno barato.

### `copilot_digests` — resumo diário

Criada em `20260710200000_copilot_digests.sql`. Uma linha por dia:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | |
| `for_date` | DATE (UNIQUE) | Dia do resumo — garante idempotência (1 por dia). |
| `content` | TEXT | Resumo executivo em markdown. |
| `created_at` | TIMESTAMPTZ | |

### RPCs

| Função | Onde | O que faz |
|---|---|---|
| `claim_copilot_job(p_worker_id)` | `20260710120000` | Reivindica atomicamente 1 job `pending` elegível (respeita `retry_after`), marca `processing`, incrementa `attempts`. `FOR UPDATE SKIP LOCKED`. Retorna a linha (ou NULL). |
| `requeue_stuck_copilot_jobs(p_timeout_seconds, p_max_attempts)` | `20260710120000` | Reaper: devolve jobs presos em `processing` para a fila; marca `error` os que estouraram `MAX_ATTEMPTS`. |
| `add_copilot_tokens(p_user_id, p_tokens)` | `20260710120000` | Soma tokens cobrados em `tokens_used_today`; zera se `period_reset_at` já passou. Chamada pelo worker após cada resposta. |

### RLS

- **`copilot_access`**: o usuário lê a própria linha; admin (`profiles.role='admin'`) lê e gerencia todas.
- **`copilot_jobs`**:
  - `SELECT` / `UPDATE` / `DELETE`: só os próprios jobs (ou admin). O `DELETE` (usado no "Limpar conversa") foi adicionado em `20260710160000_copilot_jobs_delete_policy.sql`.
  - `INSERT` **gated**: só passa se existe `copilot_access` com `enabled=TRUE` **e** dentro da cota (`daily_token_limit=0` OR `period_reset_at < CURRENT_DATE` OR `tokens_used_today < daily_token_limit`). É a primeira barreira de cota.
- **`copilot_digests`**: qualquer usuário autenticado lê; o worker escreve via chave secreta (ignora RLS).

### Realtime

`copilot_jobs` está na publicação `supabase_realtime` (`ALTER PUBLICATION supabase_realtime ADD TABLE public.copilot_jobs`). O worker também escuta INSERTs nessa tabela para acordar na hora.

> **Lembrete de manutenção:** ao mexer nessas tabelas, atualize `src/integrations/supabase/types.ts` manualmente — o build não regenera os tipos.

---

## 4. Worker

Runtime separado em `vm-worker/`. O roteamento está em `vm-worker/src/index.ts`; a lógica do copiloto em `vm-worker/src/processCopilotJob.ts` (chat) e `vm-worker/src/processCopilotDigest.ts` (resumo diário). A execução do Claude é comum a tudo: `vm-worker/src/runSkill.ts`.

### `processCopilotJob.ts` — pipeline de uma pergunta

1. **Cota (2ª barreira):** lê `copilot_access`. Lança erro se `!enabled` ou se `tokens_used_today >= daily_token_limit` no dia corrente.
2. **Contexto do portfólio (retrieval ESTRUTURADO, sem embeddings):**
   - Lê `projects` (até `MAX_PROJECTS = 800`, ordenado por `client_name`).
   - `projectLine()` gera **uma linha compacta por projeto** com o status de cada etapa. As etapas mapeadas (prefixo de coluna → rótulo) são: `infra`→infra, `adherence`→aderencia, `conversion`→conversao, `environment`→ambiente, `modelos_editor`→modelos, `implementation`→implantacao, `post`→pos. Formato de cada etapa: `etapa=status(responsavel)[inicio-fim]` (datas `dd/mm`). Também inclui `status_geral`.
   - **Não envia o `id`** do projeto — o front reconstrói o link `/projects/ID` casando o nome do cartório (economia de ~36 chars/linha).
   - **Escopo:** se `job.scope === 'ativos'`, filtra por `isActiveProject()` (tem ao menos uma etapa não concluída; regex `CONCLUIDO_RE = /conclu|finaliz|adequ|entregue|ok\b/i`). Caso contrário, portfólio inteiro.
   - Corta em `MAX_CONTEXT_CHARS = 130000` (avisa "lista truncada").
3. **Pendências de conversão:** lê `conversion_issues` com `status IN ('open','in_progress')` (até 100, por prioridade). `issueLine()` gera uma linha compacta por pendência, casando `project_id` com o nome do cartório.
4. **Histórico multi-turno:** últimas `HISTORY_TURNS = 5` trocas `done` do próprio usuário (teto `MAX_HISTORY_CHARS = 8000`), para entender perguntas de acompanhamento ("e desses, quais atrasados?").
5. **Roda o Claude:** `buildPrompt()` monta um único prompt (instruções + portfólio + pendências + histórico + pergunta). Chama `runSkill(prompt, onProgress, shouldCancel, { model: config.copilotModel, cwd: config.copilotCwd })`. O prompt embute as regras de negócio: definição de "atrasado" (data-fim no passado + status não concluído usando a data de hoje), "travado/pendente", citar o nome do cartório **exatamente** (para virar link), e emitir na última linha `[[FOLLOWUPS]] a | b | c`.
6. **Progresso ao vivo:** cada passo do Claude é gravado em `progress`/`progress_log` (flush a cada `PROGRESS_FLUSH_MS = 2500`, mantendo os últimos `MAX_LOG_STEPS = 80`), empurrado por Realtime.
7. **Cancelamento:** a cada ~5s checa `cancel_requested`; se marcado, mata o Claude e grava `cancelled`.
8. **Tokens cobrados:** converte o uso real em cota ponderada — `input + cache_write*1.25 + cache_read*0.1 + output`. Chama `add_copilot_tokens`. O `cache_read` (barato) pesa só 10%, para não drenar a cota indevidamente.
9. **Conclusão:** extrai os follow-ups do marcador `[[FOLLOWUPS]]`, remove-o do texto exibido, e grava `status='done'`, `result_text`, `followups`, `tokens_in/out/charged`.

### Modelo e diretório neutro (`config.ts`)

Em `vm-worker/src/config.ts`:

```
copilotModel: process.env.COPILOT_MODEL || "haiku"
copilotCwd:   ensureCopilotCwd()  // COPILOT_CWD || <os.tmpdir()>/siplan-copilot
```

- **`copilotModel`** — Haiku por padrão (Q&A leve → mais rápido/barato). Override por `COPILOT_MODEL`.
- **`copilotCwd`** — diretório **neutro/vazio**, criado no boot (`ensureCopilotCwd`). Motivo explícito no código: rodar a CLI aqui evita que o Claude Code carregue no contexto o `CLAUDE.md` e as skills de `/opt/Orion.Modelos`, que são irrelevantes para o Q&A e caros em tokens. Contraste com `runSkill`, cujo default de `cwd` é `config.orionProjectDir` — o copiloto **sobrescreve** isso de propósito.

### `runSkill.ts` — Claude headless

Comum a todas as filas. Faz `spawn` de `claude --dangerously-skip-permissions -p <prompt> --output-format stream-json --verbose` (adiciona `--model` se passado). Lê NDJSON linha a linha, emite cada passo (texto/tool_use) via `onProgress`, acumula o `result` e o uso de tokens (`input`, `output`, `cache_read`, `cache_creation`). Respeita timeout (`config.jobTimeoutMs`) e cancelamento (poll de `shouldCancel` a cada 5s → `SIGKILL`).

### `processCopilotDigest.ts` — resumo diário

- **O que faz:** gera um **resumo executivo do portfólio do dia** (5–8 bullets em markdown, cobrindo projetos em risco/atrasados, gargalos por etapa, pendências críticas e destaques) e grava em `copilot_digests`.
- **Idempotente:** se já existe linha para `for_date = hoje`, não faz nada. O `upsert` usa `onConflict: 'for_date', ignoreDuplicates: true`.
- **Fonte:** mesma montagem de contexto do chat (`projectLine`/`issueLine` importadas de `processCopilotJob.ts`), mesmo modelo/cwd neutro.
- **Quando roda:** disparado por `maybeDailyDigest()` em `index.ts`, dentro do tick de polling — **só quando o worker está ocioso** (`!busy`) e **a partir das 6h** (`new Date().getHours() >= 6`, evita gerar de madrugada). Como é idempotente, roda de fato uma vez por dia; nos ticks seguintes retorna cedo. É **best-effort** (erros só logam).
- **Onde aparece:** o hook `useCopilot` lê o digest mais recente (`copilot_digests`) e `CopilotChat` mostra o bloco "Resumo do dia" quando o chat está vazio.

---

## 5. Frontend

### Hook `src/hooks/useCopilot.ts`

Centraliza todo o acesso a dados do copiloto:

- **`access`** — query em `copilot_access` do usuário (cota/permissão). `hasAccess = !!access?.enabled`.
- **`jobs`** — query em `copilot_jobs` do usuário (ordem crescente). `refetchInterval` de 4s enquanto houver job `pending`/`processing`; caso contrário, desliga.
- **`enqueue`** — mutation que faz `INSERT { user_id, question, scope }`. Trata o erro de RLS (traduz para "Sem acesso ao copiloto ou cota diária atingida").
- **`cancelJob`** — `pending` → grava `cancelled` direto; `processing` → seta `cancel_requested=true` (o worker mata o Claude).
- **`clearConversation`** — `DELETE` de todos os jobs do usuário (depende da policy de DELETE).
- **`setFeedback`** — grava `feedback` (1/-1, com toggle otimista).
- **`digest`** — resumo do dia mais recente.
- **Realtime:** canal `copilot-jobs-<userId>-<sufixo>` (o sufixo aleatório evita colisão quando a página `/copilot` e o widget montam o hook ao mesmo tempo). Faz **merge** parcial das linhas — updates do Postgres omitem colunas TOAST inalteradas (ex.: `result_text` ao curtir), que chegam `undefined`; o merge preserva o valor anterior. Ao concluir um job, invalida a query de `access` para atualizar a cota.

### Componentes

- **`CopilotChat.tsx`** — corpo do chat (histórico + entrada), reutilizado pela página e pelo widget. Recursos: badge de cota, seletor de escopo (`Todos os projetos` / `Somente ativos`), sugestões e perguntas salvas (`localStorage`), fronteira de sessão + histórico sob demanda, exportar `.txt`, copiar/reperguntar, feedback 👍/👎, follow-ups clicáveis, e **`linkifyProjects()`** que transforma nomes de cartório citados na resposta em links markdown `/projects/ID` (casando com `useProjectsV2`). Se `!hasAccess`, mostra o card "Copiloto não habilitado".
- **`FloatingCopilot.tsx`** — FAB global + painel lateral (`Sheet`) redimensionável (largura persistida em `localStorage`). Só renderiza para `hasAccess` e some na rota `/copilot`.
- **`Copilot.tsx`** (página) e **`CopilotAccess.tsx` / `CopilotUsage.tsx`** (admin) — ver seção 1.

### Controle de acesso/cota no front

- O menu e o FAB só aparecem com `hasAccess`.
- A caixa de entrada trava (`disabled`) quando há job ativo **ou** `overQuota` (cota do dia atingida).
- A barreira real é a RLS de `INSERT` — o front só reflete o estado.

---

## 6. Instalação / configuração

**Nenhuma infra nova** além do worker já existente — o Copiloto reaproveita o mesmo processo systemd, a mesma credencial do Claude e o mesmo Supabase das outras filas.

Passos:

1. Aplicar as migrations `supabase/migrations/20260710120000_create_copilot.sql` … `20260710200000_copilot_digests.sql` no Supabase.
2. Atualizar `src/integrations/supabase/types.ts` (manual) para o front enxergar as tabelas com tipo.
3. Habilitar usuários em **Painel Admin → Copiloto** (`/admin/copilot`).

### Variáveis de ambiente (`.env` do worker)

Além das já existentes (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CLAUDE_BIN`/auto-descoberta, etc. — ver `vm-worker/README.md`), o Copiloto adiciona **duas opcionais**:

| Variável | Padrão | Descrição |
|---|---|---|
| `COPILOT_MODEL` | `haiku` | Modelo usado no chat e no digest. |
| `COPILOT_CWD` | `<os.tmpdir()>/siplan-copilot` | Diretório neutro onde a CLI roda (sem `CLAUDE.md`/skills do Orion). Criado no boot. |

Ambas têm default seguro — **não é obrigatório setar nada** para o Copiloto funcionar.

---

## 7. Onde está rodando atualmente

- **Worker:** VM Linux, como serviço systemd **`siplan-model-worker`** (unit em `/etc/systemd/system/siplan-model-worker.service`), rodando como o usuário **`administrator`** (não-root — o Claude recusa `--dangerously-skip-permissions` como root e a credencial da assinatura fica em `~/.claude` do `administrator`). Node **22** isolado via **nvm**, executando `src/index.ts` via **tsx**. `Restart=always` + watchdog cron (`scripts/worker-watchdog.sh`, a cada 2 min).
- **Autodeploy:** `scripts/auto-deploy.sh` roda no **cron do root a cada 5 min**, baixa os `.ts` mais novos de `vm-worker/src` do branch **`main`** (API pública do GitHub) e **só reinicia o serviço se algum arquivo mudou**. Logo, todo `push` em `main` vira deploy do worker sozinho. **Novas migrations do Supabase continuam manuais.**
- **Frontend:** Vercel, branch **`main`**.
- **Digest diário:** **não usa cron externo.** É agendado **dentro do próprio worker** — `maybeDailyDigest()` roda no loop de polling (`index.ts`), gera uma vez por dia a partir das 6h quando o worker está ocioso, com idempotência garantida pela coluna `for_date` de `copilot_digests`.

Comandos úteis de deploy/health estão em `vm-worker/README.md` (seções "Rodar como serviço" e "Runbook de deploy"). No log de saúde devem aparecer: `SiplanHUB VM worker iniciado`, `Realtime: SUBSCRIBED` e 0 erros ociosos.

---

## 8. Manutenção / troubleshooting

### Logs

```bash
sudo journalctl -u siplan-model-worker -f
```

Linhas do copiloto têm o prefixo `[copilot <id>]` (início, conclusão, erro, cancelamento) e o digest, `[digest <data>]`. Log do autodeploy: `/var/log/siplan-worker-autodeploy.log`.

### Conceder / revogar acesso e ajustar cota

Pela UI: **Painel Admin → Copiloto** (`/admin/copilot`) — o switch "Habilitado" e o campo "Cota diária". Consumo por usuário e satisfação em **Uso do Copiloto** (`/admin/copilot-usage`).

Direto no banco (equivalente ao que a tela faz):

```sql
-- habilitar + definir cota
INSERT INTO public.copilot_access (user_id, enabled, daily_token_limit)
VALUES ('<uuid-do-usuario>', TRUE, 200000)
ON CONFLICT (user_id) DO UPDATE
  SET enabled = EXCLUDED.enabled, daily_token_limit = EXCLUDED.daily_token_limit;

-- revogar
UPDATE public.copilot_access SET enabled = FALSE WHERE user_id = '<uuid>';

-- zerar consumo do dia manualmente
UPDATE public.copilot_access SET tokens_used_today = 0 WHERE user_id = '<uuid>';
```

### Erros comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| "Sem acesso ao copiloto ou cota diária atingida" ao enviar | RLS de `INSERT` barrou (`enabled=FALSE` ou cota estourada) | Habilitar/ajustar cota em `/admin/copilot`. |
| Job vira `error` com "Copiloto nao habilitado" | 2ª checagem no worker (acesso desligado entre o INSERT e o processing) | Verificar `copilot_access`. |
| Job fica "na fila" e retoma sozinho depois | Limite de sessão do Claude (tokens da assinatura acabaram) → reenfileirado com `retry_after` (~15 min), **sem** consumir tentativa | Aguardar; é comportamento esperado (`isQuotaExhausted` em `index.ts`). |
| "Claude encerrou com codigo N" | Falha do CLI / binário | Conferir `CLAUDE_BIN`/auto-descoberta e a autenticação da assinatura do `administrator`. |
| Sem resposta / "spawn ENOENT" após update da extensão | Caminho do binário do Claude mudou | `config.ts` já revalida e re-descobre o mais novo (`getClaudeBin`); se persistir, checar `~/.vscode-server/extensions`. |
| Resumo do dia não aparece | Digest ainda não gerado (antes das 6h ou worker ocupado) ou já existe para hoje | Verificar `copilot_digests`; é best-effort. |
| Job travado em `processing` | Worker morreu no meio | Reaper (`requeue_stuck_copilot_jobs`) e recuperação no boot devolvem à fila respeitando `MAX_ATTEMPTS`. |

### Cancelar / limpar

- Botão "Parar" no chat → `cancel_requested` (worker mata o Claude em ~5s).
- "Limpar conversa" → `DELETE` dos próprios jobs (depende da policy de DELETE).

---

## 9. Migração de VM

Não requer nada específico do Copiloto. Basta o **setup padrão do worker** descrito em `vm-worker/README.md`:

1. Node 22 (via nvm), Claude Code instalado e **autenticado** para o `administrator` (assinatura em `~/.claude`; aceitar a confiança do workspace uma vez).
2. Copiar `vm-worker/` para `/home/administrator/vm-worker/`, `npm install`, preencher `.env` (`SUPABASE_SECRET_KEY` etc.). `COPILOT_MODEL`/`COPILOT_CWD` são opcionais (têm default).
3. Instalar a unit systemd `siplan-model-worker`, o autodeploy (cron root, 5 min) e o watchdog.
4. Garantir que as migrations do copiloto já foram aplicadas no Supabase (isso é do banco, não da VM).

Como o `copilotCwd` default fica em `os.tmpdir()`, ele é recriado sozinho no boot — nada a copiar. O digest volta a rodar automaticamente assim que o worker sobe.

---

## 10. Segurança

- **Gate + cota por usuário:** duas camadas de contenção de custo/abuso — RLS de `INSERT` (gate + cota no banco) e revalidação no worker antes de rodar o Claude. A cota é ponderada por custo real (`cache_read` pesa 0.1, `cache_write` 1.25) para refletir o gasto verdadeiro.
- **Chave secreta só no `.env` da VM:** o worker usa `SUPABASE_SECRET_KEY` (`sb_secret_...`, revogável), que ignora RLS — arquivo `600`, dono `administrator`, nunca commitado. Se vazar, revogar e gerar outra no painel. O **front usa apenas a chave `anon`/publishable**, sujeita à RLS.
- **Diretório neutro evita vazamento de contexto:** rodar em `copilotCwd` (pasta vazia) garante que o `CLAUDE.md` e as skills internas de `/opt/Orion.Modelos` **não** entram no contexto do modelo — além de economizar tokens, evita expor instruções/estrutura do gerador de modelos numa resposta de Q&A.
- **Isolamento de dados por usuário:** RLS restringe leitura/escrita de `copilot_jobs` ao dono (ou admin); o histórico multi-turno só puxa trocas `done` do próprio `user_id`.
- **Sem porta aberta na VM:** o worker faz só conexões de **saída** (Realtime/WebSocket outbound) — sem túnel, sem porta de entrada.
- **Agente autônomo:** o Claude roda com `--dangerously-skip-permissions`, mas num diretório vazio e sem tarefas de escrita — ainda assim, mantenha VM e `.env` restritos (mesma recomendação das outras filas).
