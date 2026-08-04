import { spawn } from "node:child_process";
import { config, getClaudeBin } from "./config.js";

export interface ProgressStep {
  at: string; // ISO timestamp
  text: string; // frase curta e amigavel
  kind: "system" | "text" | "tool" | "result";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

// Traduz um tool_use do Claude em uma frase curta e legivel para o analista.
function describeTool(name: string, input: AnyObj): string {
  const s = (v: unknown, n = 90) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const base = (p?: string) => (p ? String(p).split(/[\\/]/).pop() : "") || "";
  switch (name) {
    case "Bash": return `Executando comando: ${s(input?.command)}`;
    case "Read": return `Lendo arquivo: ${base(input?.file_path)}`;
    case "Write": return `Escrevendo arquivo: ${base(input?.file_path)}`;
    case "Edit":
    case "MultiEdit": return `Editando arquivo: ${base(input?.file_path)}`;
    case "Grep": return `Procurando por: ${s(input?.pattern, 60)}`;
    case "Glob": return `Buscando arquivos: ${s(input?.pattern, 60)}`;
    case "Skill": return `Rodando skill: ${s(input?.command ?? input?.skill)}`;
    case "Task": return `Subagente: ${s(input?.description, 60)}`;
    case "TodoWrite": return "Atualizando o plano de tarefas";
    case "WebFetch": return `Consultando: ${s(input?.url, 60)}`;
    default: return `Ferramenta: ${name}`;
  }
}

export interface RunSkillOptions {
  model?: string; // override do modelo
  cwd?: string; // override do diretorio de trabalho
  env?: Record<string, string>; // variaveis extras
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

  const rawModel = options.model;
  const modelName = rawModel && !["sonnet", "haiku", "opus"].includes(rawModel.toLowerCase())
    ? rawModel
    : config.ollamaModel;

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
  } catch (err: any) {
    if (cancelTimer) clearInterval(cancelTimer);

    if (cancelled || err?.name === "AbortError") {
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

    const stderrMsg = err?.message || String(err);
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

/**
 * Executa via Claude Code CLI.
 */
function runClaude(
  prompt: string,
  onProgress?: (step: ProgressStep) => void,
  shouldCancel?: () => Promise<boolean>,
  options: RunSkillOptions = {}
): Promise<RunSkillResult> {
  return new Promise((resolve, reject) => {
    const args = ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "stream-json", "--verbose"];
    if (options.model) args.push("--model", options.model);
    const child = spawn(getClaudeBin(), args, {
      cwd: options.cwd || config.orionProjectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env ? { ...process.env, ...options.env } : process.env,
    });

    let stderr = "";
    let transcript = "";
    let resultText = "";
    let buf = "";
    let cancelled = false;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;

    let cancelChecking = false;
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
        }, 5000)
      : undefined;

    const emit = (text: string, kind: ProgressStep["kind"]) => {
      if (!text) return;
      onProgress?.({ at: new Date().toISOString(), text, kind });
    };

    const handleEvent = (evt: AnyObj) => {
      const t = evt?.type;
      if (t === "system") {
        if (evt.subtype === "init") emit("Sessao iniciada - analisando o documento...", "system");
        return;
      }
      if (t === "assistant") {
        const content = evt.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block?.type === "text" && typeof block.text === "string" && block.text.trim()) {
              transcript += block.text + "\n";
              const line = block.text.replace(/\s+/g, " ").trim().slice(0, 140);
              if (line) emit(line, "text");
            } else if (block?.type === "tool_use") {
              emit(describeTool(block.name, block.input), "tool");
            }
          }
        }
        return;
      }
      if (t === "result") {
        if (typeof evt.result === "string") {
          resultText = evt.result;
          transcript += evt.result + "\n";
        }
        const u = evt.usage;
        if (u && typeof u === "object") {
          inputTokens = Number(u.input_tokens) || 0;
          outputTokens = Number(u.output_tokens) || 0;
          cacheReadTokens = Number(u.cache_read_input_tokens) || 0;
          cacheCreationTokens = Number(u.cache_creation_input_tokens) || 0;
        }
        return;
      }
    };

    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try { handleEvent(JSON.parse(line)); } catch { /* ignora */ }
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    const cleanup = () => {
      clearTimeout(timer);
      if (cancelTimer) clearInterval(cancelTimer);
    };

    const timer = setTimeout(() => {
      cleanup();
      child.kill("SIGKILL");
      reject(new Error(`Timeout: a geracao excedeu ${config.jobTimeoutMs} ms`));
    }, config.jobTimeoutMs);

    child.on("error", (err) => { cleanup(); reject(err); });

    child.on("close", (code) => {
      cleanup();
      const rest = buf.trim();
      if (rest) { try { handleEvent(JSON.parse(rest)); } catch { /* ignore */ } }
      resolve({
        transcript,
        resultText,
        code: code ?? -1,
        stderr,
        cancelled,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
      });
    });
  });
}

/**
 * Ponto de entrada unificado para execução de LLM no worker.
 * Suporta Ollama (local e gratuito) e Claude CLI.
 */
export async function runSkill(
  prompt: string,
  onProgress?: (step: ProgressStep) => void,
  shouldCancel?: () => Promise<boolean>,
  options: RunSkillOptions = {}
): Promise<RunSkillResult> {
  if (config.llmProvider === "claude") {
    try {
      const res = await runClaude(prompt, onProgress, shouldCancel, options);
      if (res.code === 0 || res.cancelled) return res;
      console.warn("[runSkill] Claude CLI falhou. Redirecionando para Ollama local...", res.stderr);
    } catch (err) {
      console.warn("[runSkill] Erro ao executar Claude CLI. Redirecionando para Ollama local...", err);
    }
  }

  // Padrão: Ollama local
  return runOllama(prompt, onProgress, shouldCancel, options);
}
