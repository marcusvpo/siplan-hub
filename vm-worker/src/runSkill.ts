import { spawn } from "node:child_process";
import { config, getCodexBin } from "./config.js";

export interface ProgressStep {
  at: string; // ISO timestamp
  text: string; // frase curta e amigavel
  kind: "system" | "text" | "tool" | "result";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

export interface RunSkillOptions {
  model?: string; // override do modelo
  cwd?: string; // override do diretorio de trabalho
  provider?: "codex" | "ollama";
  addDirs?: string[]; // diretorios adicionais liberados para escrita no Codex
  allowOllamaFallback?: boolean;
  sandbox?: string;
  reasoningEffort?: string;
}

export interface RunSkillResult {
  transcript: string;
  resultText: string;
  code: number;
  stderr: string;
  cancelled: boolean;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface CodexEventUpdate {
  progress?: string;
  progressKind?: ProgressStep["kind"];
  transcriptText?: string;
  resultText?: string;
  errorText?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  };
}

const compact = (value: unknown, max = 140): string =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const CODEX_BLOCKED_ENV = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MSSQL_USER",
  "MSSQL_PASSWORD",
  "OPENAI_API_KEY",
  "CODEX_ACCESS_TOKEN",
];

/** Evita expor segredos operacionais do worker aos comandos executados pela skill. */
export function buildCodexChildEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base };
  for (const name of CODEX_BLOCKED_ENV) delete env[name];
  return env;
}

/** Converte um evento JSONL do `codex exec --json` no formato do worker. */
export function parseCodexEvent(evt: AnyObj): CodexEventUpdate {
  const type = evt?.type;
  if (type === "thread.started") {
    return { progress: "Sessao Codex iniciada - analisando o documento...", progressKind: "system" };
  }

  if (type === "item.started" || type === "item.completed") {
    const item = evt?.item || {};
    if (item.type === "command_execution" && type === "item.started") {
      return { progress: `Executando comando: ${compact(item.command, 100)}`, progressKind: "tool" };
    }
    if (item.type === "file_change" && type === "item.completed") {
      const changed = Array.isArray(item.changes)
        ? item.changes.map((change: AnyObj) => change?.path).filter(Boolean).join(", ")
        : item.path;
      return { progress: `Atualizando arquivo: ${compact(changed || "artefato", 90)}`, progressKind: "tool" };
    }
    if (item.type === "mcp_tool_call" && type === "item.started") {
      return { progress: `Executando ferramenta: ${compact(item.tool || item.name, 80)}`, progressKind: "tool" };
    }
    if (item.type === "web_search" && type === "item.started") {
      return { progress: `Consultando: ${compact(item.query, 90)}`, progressKind: "tool" };
    }
    if (item.type === "agent_message" && type === "item.completed" && typeof item.text === "string") {
      const text = item.text.trim();
      if (!text) return {};
      return {
        progress: compact(text),
        progressKind: "text",
        transcriptText: `${text}\n`,
        resultText: text,
      };
    }
    if (item.type === "reasoning" && type === "item.completed" && typeof item.text === "string") {
      const text = compact(item.text);
      return text ? { progress: text, progressKind: "text" } : {};
    }
  }

  if (type === "turn.completed") {
    const usage = evt?.usage || {};
    return {
      usage: {
        inputTokens: Number(usage.input_tokens) || 0,
        outputTokens: Number(usage.output_tokens) || 0,
        cacheReadTokens: Number(usage.cached_input_tokens) || 0,
      },
    };
  }

  if (type === "turn.failed" || type === "error") {
    const message = compact(evt?.error?.message || evt?.message || evt?.error, 1000);
    return message ? { errorText: message } : {};
  }
  return {};
}

/**
 * Executa o prompt localmente usando o Ollama via HTTP streaming API.
 */
async function runOllama(
  prompt: string,
  onProgress?: (step: ProgressStep) => void,
  shouldCancel?: () => Promise<boolean>,
  options: RunSkillOptions = {}
): Promise<RunSkillResult> {
  const emit = (text: string, kind: ProgressStep["kind"]) => {
    if (!text) return;
    onProgress?.({ at: new Date().toISOString(), text, kind });
  };

  const modelName = config.ollamaModel;

  emit(`Sessão iniciada (Ollama - ${modelName}) - processando...`, "system");

  let cancelled = false;
  let cancelChecking = false;

  const controller = new AbortController();

  const cancelTimer = shouldCancel
    ? setInterval(async () => {
        if (cancelChecking || cancelled) return;
        cancelChecking = true;
        try {
          if (await shouldCancel()) {
            cancelled = true;
            controller.abort();
          }
        } catch {
          /* ignora erro de checagem */
        } finally {
          cancelChecking = false;
        }
      }, 2500)
    : undefined;

  let transcript = "";
  let resultText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const res = await fetch(`${config.ollamaHost}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Ollama respondeu com HTTP ${res.status}: ${errText}`);
    }

    if (!res.body) {
      throw new Error("Resposta do Ollama veio sem corpo (stream).");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let progressBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed);
          if (json.response) {
            resultText += json.response;
            transcript += json.response;
            progressBuffer += json.response;

            if (progressBuffer.includes("\n") || progressBuffer.length >= 80) {
              const display = progressBuffer.replace(/\s+/g, " ").trim().slice(0, 140);
              if (display) emit(display, "text");
              progressBuffer = "";
            }
          }
          if (json.done) {
            inputTokens = Number(json.prompt_eval_count) || 0;
            outputTokens = Number(json.eval_count) || 0;
          }
        } catch {
          /* ignora JSON malformado na linha */
        }
      }
    }

    if (progressBuffer.trim()) {
      emit(progressBuffer.replace(/\s+/g, " ").trim().slice(0, 140), "text");
    }

    if (cancelTimer) clearInterval(cancelTimer);

    return {
      transcript,
      resultText,
      code: 0,
      stderr: "",
      cancelled: false,
      inputTokens,
      outputTokens,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    };
  } catch (err: unknown) {
    if (cancelTimer) clearInterval(cancelTimer);

    if (cancelled || (err instanceof Error && err.name === "AbortError")) {
      return {
        transcript,
        resultText,
        code: -1,
        stderr: "Cancelado pelo usuário",
        cancelled: true,
        inputTokens,
        outputTokens,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      };
    }

    const stderrMsg = err instanceof Error ? err.message : String(err);
    return {
      transcript,
      resultText: "",
      code: 1,
      stderr: `Erro Ollama (${config.ollamaHost}): ${stderrMsg}. Certifique-se que o Ollama está rodando e o modelo '${modelName}' baixado (ollama pull ${modelName}).`,
      cancelled: false,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    };
  }
}

/** Executa uma skill com ferramentas via `codex exec --json`. */
function runCodex(
  prompt: string,
  onProgress?: (step: ProgressStep) => void,
  shouldCancel?: () => Promise<boolean>,
  options: RunSkillOptions = {}
): Promise<RunSkillResult> {
  return new Promise((resolve, reject) => {
    const cwd = options.cwd || config.orionProjectDir;
    const args = [
      "exec",
      "--json",
      "--ephemeral",
      "--skip-git-repo-check",
      "--sandbox",
      options.sandbox || config.codexSandbox,
      "-C",
      cwd,
    ];
    for (const dir of options.addDirs || []) args.push("--add-dir", dir);
    if (options.model && !["sonnet", "haiku", "opus"].includes(options.model.toLowerCase())) {
      args.push("--model", options.model);
    }
    if (/^(minimal|low|medium|high|xhigh)$/.test(options.reasoningEffort || "")) {
      args.push("--config", `model_reasoning_effort="${options.reasoningEffort}"`);
    }
    args.push(prompt);

    const child = spawn(getCodexBin(), args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      // A autenticacao vem de `codex login`; segredos do worker nao chegam aos
      // comandos executados pela skill.
      env: buildCodexChildEnv(process.env),
    });

    let stderr = "";
    let transcript = "";
    let resultText = "";
    let buf = "";
    let cancelled = false;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cancelChecking = false;

    const emit = (text: string, kind: ProgressStep["kind"]) => {
      if (text) onProgress?.({ at: new Date().toISOString(), text, kind });
    };

    const handleEvent = (evt: AnyObj) => {
      const update = parseCodexEvent(evt);
      if (update.progress) emit(update.progress, update.progressKind || "text");
      if (update.transcriptText) transcript += update.transcriptText;
      if (update.resultText) resultText = update.resultText;
      if (update.errorText) {
        stderr += `${update.errorText}\n`;
        transcript += `${update.errorText}\n`;
      }
      if (update.usage) {
        inputTokens = update.usage.inputTokens;
        outputTokens = update.usage.outputTokens;
        cacheReadTokens = update.usage.cacheReadTokens;
      }
    };

    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          handleEvent(JSON.parse(line));
        } catch {
          stderr += `Evento Codex invalido: ${line.slice(0, 300)}\n`;
        }
      }
    };

    const cancelTimer = shouldCancel
      ? setInterval(async () => {
          if (cancelChecking || cancelled) return;
          cancelChecking = true;
          try {
            if (await shouldCancel()) {
              cancelled = true;
              child.kill("SIGKILL");
            }
          } catch {
            /* ignora erro de checagem */
          } finally {
            cancelChecking = false;
          }
        }, 2500)
      : undefined;

    const cleanup = () => {
      clearTimeout(timer);
      if (cancelTimer) clearInterval(cancelTimer);
    };

    const timer = setTimeout(() => {
      cleanup();
      child.kill("SIGKILL");
      reject(new Error(`Timeout: a geracao excedeu ${config.jobTimeoutMs} ms`));
    }, config.jobTimeoutMs);

    child.stdout.on("data", onData);
    child.stderr.on("data", (data) => { stderr += data.toString(); });
    child.on("error", (err) => { cleanup(); reject(err); });
    child.on("close", (code) => {
      cleanup();
      const rest = buf.trim();
      if (rest) {
        try { handleEvent(JSON.parse(rest)); } catch { stderr += rest; }
      }
      resolve({
        transcript,
        resultText,
        code: cancelled ? -1 : (code ?? -1),
        stderr: cancelled ? `${stderr}\nCancelado pelo usuario`.trim() : stderr,
        cancelled,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens: 0,
      });
    });
  });
}

/**
 * Ponto de entrada unificado para execução de LLM/agente no worker.
 * Codex e o motor padrao; Ollama e uma alternativa local explicita.
 */
export async function runSkill(
  prompt: string,
  onProgress?: (step: ProgressStep) => void,
  shouldCancel?: () => Promise<boolean>,
  options: RunSkillOptions = {}
): Promise<RunSkillResult> {
  const provider = options.provider || "codex";
  let codexFailure = "";
  const reportFallback = (reason: string) => {
    codexFailure = reason;
    const category = /session|usage|rate|quota|limit/i.test(reason)
      ? "limite ou cota"
      : /auth|login|credential|unauthorized|forbidden|401|403/i.test(reason)
      ? "autenticacao"
      : /enoent|spawn|not found/i.test(reason)
      ? "CLI indisponivel"
      : "falha temporaria";
    onProgress?.({
      at: new Date().toISOString(),
      text: `Codex indisponivel (${category}). Continuando com Ollama local...`,
      kind: "system",
    });
  };

  if (provider === "codex") {
    try {
      const res = await runCodex(prompt, onProgress, shouldCancel, options);
      if (res.code === 0 || res.cancelled || !options.allowOllamaFallback) return res;
      reportFallback(res.stderr || `codigo ${res.code}`);
      console.warn("[runSkill] Codex CLI falhou. Redirecionando para Ollama local...", res.stderr);
    } catch (err) {
      if (!options.allowOllamaFallback) throw err;
      reportFallback(err instanceof Error ? err.message : String(err));
      console.warn("[runSkill] Erro ao executar Codex CLI. Redirecionando para Ollama local...", err);
    }
  }

  // Padrão das tarefas de texto puro.
  const ollamaResult = await runOllama(prompt, onProgress, shouldCancel, {
    ...options,
    model: undefined,
  });
  if (codexFailure && ollamaResult.code !== 0 && !ollamaResult.cancelled) {
    ollamaResult.stderr = `Falha Codex: ${codexFailure}\nFalha Ollama: ${ollamaResult.stderr}`;
  }
  return ollamaResult;
}
