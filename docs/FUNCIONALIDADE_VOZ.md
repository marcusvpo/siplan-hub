# Preenchimento por Voz (ditado com IA)

Permite preencher campos de texto rico **falando** em vez de digitar. O analista grava um
áudio no navegador (PC ou celular), o áudio é transcrito **localmente na VM** com
**whisper.cpp** e a transcrição é elevada a um texto profissional pelo **Claude** (o mesmo
que já roda na VM). Uma **legenda ao vivo** mostra o que está sendo falado durante a gravação.

> **Fato central:** o Claude Code headless **não ingere áudio** — quem "ouve" (transcreve) é o
> whisper.cpp; o Claude apenas reescreve/eleva o texto transcrito. São duas etapas distintas.

Estreou em 2026-07-14. Reusa a fila `dtc_ai_jobs` (mesmo worker das demais IAs de texto) com um
novo `job_type = 'voice_note'`.

---

## 1. Onde aparece na UI

O botão **"Preencher por voz"** aparece no canto superior direito de todo `RichTextEditor` que
receba a prop `enableVoice` (+ `projectId`). Hoje está ligado em:

- **Tela `/implantadores/transicao` → aba Relato Técnico → 1. Processo de Implantação:**
  - Campo **"Relato Geral do Processo de Implantação"** (`RichTextEditor`, campo `implantationProcess`).
  - Cada **"Relato Diário de Atividades"** (campo `implantationProcessLogs[].description`, que é um
    `<Textarea>` puro — o botão de voz é embutido no cabeçalho "Atividades Realizadas").

Para habilitar em outros campos, ver a seção **8. Como estender para outros campos**.

---

## 2. Arquitetura / fluxo

```
[Navegador]                         [Supabase]                     [Worker na VM]
  grava áudio (MediaRecorder)
  + legenda ao vivo (Web Speech) ......(preview local, não sai do navegador)
        |
        | 1. upload do áudio
        v
   Storage: project-files/voice-notes/<projectId>/<uuid>.webm
        |
        | 2. INSERT job
        v
   dtc_ai_jobs (job_type='voice_note', audio_path=...)  --Realtime + poll-->  claim_dtc_ai_job()
                                                                                     |
                                                        3. baixa o áudio do Storage  |
                                                        4. ffmpeg -> WAV 16kHz mono  |
                                                        5. whisper.cpp -> transcrição|
                                                        6. Claude headless -> eleva  |
                                                        7. grava result_text, done   |
        |                                                                            |
        | 8. Realtime (status='done')  <----------------------------------------------
        v
   Preview "manter/substituir/adicionar" -> texto entra no campo
   9. worker remove o áudio do Storage (já transcrito)
```

- **Legenda ao vivo** (Web Speech API do navegador) é só preview visual — roda em paralelo, não
  interfere no áudio gravado nem no resultado final.
- **Resultado final** vem sempre do whisper.cpp + Claude (qualidade), não da legenda.

---

## 3. Banco de dados

Tabela **`dtc_ai_jobs`** (compartilhada com os demais jobs de IA de texto). O que a migration de
voz adicionou — [`supabase/migrations/20260714120000_dtc_ai_jobs_voice_note.sql`](../supabase/migrations/20260714120000_dtc_ai_jobs_voice_note.sql):

| Coluna | Uso no voice_note |
|---|---|
| `job_type` | `'voice_note'` (adicionado ao `CHECK` da coluna) |
| `audio_path` | **coluna nova** — caminho do áudio no Storage (ex.: `voice-notes/<projectId>/<uuid>.webm`) |
| `input_text` | não usado (a entrada é o áudio, não texto) |
| `result_text` | texto profissional final gerado pelo Claude |
| `progress` / `progress_log` | feed de andamento ao vivo (baixando, transcrevendo, gerando…) |
| `cancel_requested` | cancelamento pela tela |
| `status` | `pending` → `processing` → `done` / `error` / `cancelled` |

SQL aplicado (idempotente):

```sql
ALTER TABLE public.dtc_ai_jobs ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE public.dtc_ai_jobs DROP CONSTRAINT IF EXISTS dtc_ai_jobs_job_type_check;
ALTER TABLE public.dtc_ai_jobs
  ADD CONSTRAINT dtc_ai_jobs_job_type_check
  CHECK (job_type IN ('dtc_summary', 'improve_text', 'summary_blocks', 'voice_note'));
```

- **RPC de claim:** reusa `claim_dtc_ai_job(p_worker_id)` — retorna a linha inteira (`RETURNS public.dtc_ai_jobs`)
  e **não filtra por job_type**, então jobs `voice_note` são reivindicados sem mudança na RPC.
- **Storage:** bucket **`project-files`** (o mesmo dos prints/anexos), prefixo `voice-notes/`. Nada
  novo a criar — a política de Storage do bucket já cobre o prefixo.
- **Realtime** na `dtc_ai_jobs` já estava ativo (migration original da fila).
- **RLS:** policy "Permitir tudo em dtc_ai_jobs" (o worker usa a chave secreta e ignora RLS).

> **Nota:** `dtc_ai_jobs` **não** está em `src/integrations/supabase/types.ts` — o acesso no
> frontend é via `any` (padrão do repo para tabelas não tipadas).

---

## 4. Worker (VM)

Arquivo: [`vm-worker/src/processVoiceJob.ts`](../vm-worker/src/processVoiceJob.ts). Roteado em
[`vm-worker/src/index.ts`](../vm-worker/src/index.ts) (`claimOneDtcJob` → se `job_type==='voice_note'`
chama `processVoiceJob`).

Passos do job (já marcado `processing` pelo claim):

1. **Baixa** o áudio do Storage (`config.bucket`, `job.audio_path`) para um diretório temporário isolado.
2. **Converte** com `ffmpeg` para **WAV 16 kHz mono** (formato exigido pelo whisper.cpp).
3. **Transcreve** com `whisper.cpp` (`whisper-cli -m <modelo> -f <wav> -l pt -otxt -of <base> -nt`).
4. **Eleva** a transcrição rodando o Claude headless via `runSkill()` com o prompt `buildVoicePrompt`
   (reescreve como texto profissional, com formatação leve em Markdown; **não inventa fatos**).
5. **Grava** `result_text`, status `done`.
6. **Remove** o áudio do Storage (best-effort — já foi transcrito, não precisa guardar).
7. Limpa o diretório temporário.

Detalhes:
- **Modelo do Claude:** `config.dtcModel` (padrão `sonnet`, override `DTC_MODEL`).
- **Fallback de limite de sessão:** se a assinatura do Claude bater o limite e houver `DTC_FALLBACK_API_KEY`,
  tenta de novo via API (mesma lógica dos outros jobs de texto).
- **Cancelamento:** checa `cancel_requested` durante a geração.
- **Progresso ao vivo:** grava frases curtas em `progress`/`progress_log` (o front pode exibir).

### Variáveis de ambiente do worker (`.env`)

Adicionadas por esta feature (documentadas em [`vm-worker/.env.example`](../vm-worker/.env.example)):

| Variável | Padrão | Uso |
|---|---|---|
| `WHISPER_BIN` | `whisper-cli` | binário do whisper.cpp (recomendado: caminho absoluto, ex.: `/opt/whisper.cpp/build/bin/whisper-cli`) |
| `WHISPER_MODEL` | `/opt/whisper.cpp/models/ggml-large-v3-turbo.bin` | arquivo ggml do modelo |
| `WHISPER_LANGUAGE` | `pt` | idioma forçado (pt-BR) |
| `FFMPEG_BIN` | `ffmpeg` | binário do ffmpeg |

---

## 5. Frontend

| Peça | Arquivo | Papel |
|---|---|---|
| Hook | [`src/hooks/useVoiceNoteJobs.ts`](../src/hooks/useVoiceNoteJobs.ts) | sobe o áudio pro Storage, enfileira o job `voice_note`, observa por Realtime, entrega `onResult` quando `done` |
| Componente | [`src/components/ui/voice-dictation-button.tsx`](../src/components/ui/voice-dictation-button.tsx) | botão + modal de gravação (MediaRecorder), legenda ao vivo (Web Speech API), preview do texto final |
| Editor | [`src/components/ui/rich-text-editor.tsx`](../src/components/ui/rich-text-editor.tsx) | prop `enableVoice`/`projectId`/`requestedBy` — renderiza o botão e aplica o texto |
| Helper | [`src/lib/lexical.ts`](../src/lib/lexical.ts) | `appendPlainTextToLexicalJson` (anexa preservando o conteúdo existente) e `plainTextToLexicalJson` (converte Markdown leve → nós do Lexical, incl. **negrito**/__sublinhado__/*itálico*/listas) |

Comportamento do usuário:
1. Clica **"Preencher por voz"** → abre o **modal de gravação** (timer + legenda ao vivo).
2. **Parar e transcrever** → o áudio é enviado; aparece **"Transcrevendo…"**.
3. Ao concluir, abre o **preview** "Texto gerado a partir do seu áudio" com 3 opções:
   - **Descartar** (cancela)
   - **Substituir tudo** (troca o conteúdo do campo)
   - **Adicionar ao texto** (anexa ao fim, preservando o que já havia)

**Captura de áudio (cross-device):** `getUserMedia` + `MediaRecorder` funcionam em Chrome/Edge/Firefox,
Android Chrome e iOS Safari 14.3+. O mimeType é escolhido por suporte (webm/opus, senão mp4/aac); o
ffmpeg na VM decodifica ambos.

**Legenda ao vivo (Web Speech API):** só Chrome/Edge/Android. No iOS Safari/Firefox a legenda não
aparece, mas a gravação e o resultado final funcionam normalmente (é preview, best-effort).

---

## 6. Instalação / configuração na VM (whisper.cpp + ffmpeg)

A transcrição roda **localmente** (sem chave de API, custo zero por uso, áudio não sai da VM).
Requer whisper.cpp compilado + um modelo ggml + ffmpeg. Passo-a-passo (também em `vm-worker/.env.example`):

```bash
# 1. dependências
sudo apt-get update
sudo apt-get install -y ffmpeg git build-essential cmake

# 2. whisper.cpp
sudo git clone https://github.com/ggerganov/whisper.cpp /opt/whisper.cpp
cd /opt/whisper.cpp
sudo cmake -B build && sudo cmake --build build -j --config Release
# binário resultante: /opt/whisper.cpp/build/bin/whisper-cli

# 3. modelo (pt-BR bom, rápido, ~1.6 GB)
sudo ./models/download-ggml-model.sh large-v3-turbo
# -> /opt/whisper.cpp/models/ggml-large-v3-turbo.bin

# 4. teste (deve imprimir o texto do áudio de exemplo)
./build/bin/whisper-cli -m models/ggml-large-v3-turbo.bin -f samples/jfk.wav -l en -nt

# 5. aponta no .env do worker (idempotente)
cd /home/administrator/vm-worker
grep -q '^WHISPER_BIN='   .env || echo 'WHISPER_BIN=/opt/whisper.cpp/build/bin/whisper-cli' >> .env
grep -q '^WHISPER_MODEL=' .env || echo 'WHISPER_MODEL=/opt/whisper.cpp/models/ggml-large-v3-turbo.bin' >> .env

# 6. reinicia o worker
sudo systemctl restart siplan-model-worker
```

Além disso: **aplicar a migration** `20260714120000_dtc_ai_jobs_voice_note.sql` no Supabase (uma vez).

### Trocar o modelo

Modelos maiores = mais precisão, mais lentos. `large-v3-turbo` é o melhor custo/benefício para pt-BR.
Alternativas: `medium` (mais leve), `large-v3` (mais preciso, mais pesado). Baixe com
`download-ggml-model.sh <nome>` e ajuste `WHISPER_MODEL` no `.env` + restart.

---

## 7. Onde está rodando atualmente (jul/2026)

| Item | Valor |
|---|---|
| VM | Linux, host SSH `10.0.1.63`, usuário `administrator` (hostname `ubuntu-conv`) |
| whisper.cpp | `/opt/whisper.cpp` (binário `build/bin/whisper-cli`) |
| Modelo | `/opt/whisper.cpp/models/ggml-large-v3-turbo.bin` (~1.6 GB) |
| ffmpeg | `/usr/bin/ffmpeg` (via apt) |
| Worker | systemd **`siplan-model-worker`** (roda como `administrator`, Node 22 via nvm, `tsx`) |
| Diretório do worker | `/home/administrator/vm-worker` |
| Deploy do worker | **autodeploy** (cron do root, a cada 5 min): baixa os `.ts` de `vm-worker/src` do branch **`main`** e reinicia o serviço se algo mudou. Ver `vm-worker/README.md`. |
| Frontend | Vercel (`siplanhub.vercel.app`), build do branch **`main`** |
| Supabase | mesmo projeto do app; migration de voz aplicada |

> O worker é o **mesmo processo** que gera modelos, faz os resumos DTC e roda o Copiloto — ele só
> processa filas diferentes. Não há serviço separado para voz.

---

## 8. Como estender para outros campos

O `VoiceDictationButton` é agnóstico (só recebe callback). Duas formas:

**A) Campo `RichTextEditor`** — passe as props:

```tsx
<RichTextEditor
  content={valor}
  onChange={setValor}
  enableVoice
  projectId={projectId}
  requestedBy={nomeDoUsuario}
/>
```

**B) Campo simples (`<Textarea>`/`<Input>`)** — use o componente direto:

```tsx
import { VoiceDictationButton } from "@/components/ui/voice-dictation-button";

<VoiceDictationButton
  projectId={projectId}
  requestedBy={nome}
  onApply={(text, mode) =>
    setValor(mode === "append" && valor ? `${valor}\n\n${text}` : text)
  }
/>
```

> Em campos de texto puro (`Textarea`) o Markdown de formatação (`**negrito**` etc.) fica como
> texto literal — o render de negrito/itálico só ocorre nos campos `RichTextEditor` (Lexical).

---

## 9. Manutenção / troubleshooting

**Ver o log ao vivo:**
```bash
sudo journalctl -u siplan-model-worker -f
```

O `progress_log` do job e o log do worker dizem em qual etapa falhou:

| Sintoma | Causa provável | Ação |
|---|---|---|
| `ffmpeg falhou (...)` | ffmpeg ausente ou áudio corrompido | `which ffmpeg`; conferir `FFMPEG_BIN` |
| `whisper.cpp falhou (...)` | `WHISPER_BIN`/`WHISPER_MODEL` errado, modelo não baixado | testar `whisper-cli` na mão com `samples/jfk.wav` |
| `Nao consegui entender o audio` | áudio silencioso/ruído | gravar de novo em ambiente mais silencioso |
| `Limite de sessao do Claude atingido` | assinatura no limite | aguardar reset ou configurar `DTC_FALLBACK_API_KEY` |
| Job fica em `pending` e não anda | worker parado | `systemctl status siplan-model-worker`; ver reaper `requeue_stuck_dtc_ai_jobs` |
| Botão não aparece na tela | build da Vercel pendente ou campo sem `enableVoice`/`projectId` | recarregar (Ctrl+Shift+R); conferir props |
| Sem legenda ao vivo | navegador sem Web Speech (iOS/Firefox) | esperado — só afeta o preview, não o resultado |

**Teste manual da transcrição na VM:**
```bash
/opt/whisper.cpp/build/bin/whisper-cli \
  -m /opt/whisper.cpp/models/ggml-large-v3-turbo.bin \
  -f /opt/whisper.cpp/samples/jfk.wav -l en -nt
```

---

## 10. Migração de VM (recriar em outra máquina)

1. Provisionar o worker normalmente (ver `vm-worker/README.md`: Node 22 via nvm, `.env` com a chave
   secreta do Supabase, systemd `siplan-model-worker`, autodeploy).
2. Instalar **ffmpeg** + **whisper.cpp** + baixar o **modelo** (seção 6, passos 1-4).
3. Acrescentar `WHISPER_BIN` e `WHISPER_MODEL` no `.env` (seção 6, passo 5).
4. `sudo systemctl restart siplan-model-worker` e conferir o log (`worker iniciado`, `Realtime: SUBSCRIBED`).
5. Nada muda no Supabase nem no frontend — a fila e o Storage são os mesmos.

> Sem whisper.cpp/ffmpeg/modelo na VM nova, **só os jobs de voz** falham; os demais (modelos, DTC,
> copiloto) seguem funcionando.

---

## 11. Segurança

- **Transcrição local:** o áudio é processado na própria VM (whisper.cpp). Nada de áudio é enviado a
  serviços de STT externos.
- **Áudio efêmero:** após transcrever, o worker **apaga** o arquivo do Storage.
- **Legenda ao vivo (Web Speech API):** usa o motor do navegador — no Chrome/Edge isso envia áudio aos
  servidores do Google para reconhecimento. É apenas o **preview** (rascunho); o resultado final não
  depende dele. Se isso for indesejável para dados sensíveis, a legenda pode ser desativada removendo a
  chamada `startLiveCaption()` no `VoiceDictationButton` (a gravação + whisper continuam funcionando).
- **Chave secreta do Supabase:** só no `.env` da VM (perm `600`), ignora RLS.
