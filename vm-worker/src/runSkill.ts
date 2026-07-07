import { spawn } from "node:child_process";
import { config } from "./config.js";

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

/**
 * Roda o Claude Code headless com --output-format stream-json --verbose, emitindo
 * cada passo (texto do agente e chamadas de ferramenta) via onProgress em tempo real.
 * Retorna o transcript acumulado (para localizar JSON_GERADO=) e o texto do result.
 */
export function runSkill(
  prompt: string,
  onProgress?: (step: ProgressStep) => void,
  shouldCancel?: () => Promise<boolean>
): Promise<{ transcript: string; resultText: string; code: number; stderr: string; cancelled: boolean }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      config.claudeBin,
      ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "stream-json", "--verbose"],
      {
        cwd: config.orionProjectDir,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stderr = "";
    let transcript = "";
    let resultText = "";
    let buf = "";
    let cancelled = false;

    // Poll de cancelamento: se o usuario pediu cancelar, mata o Claude.
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
        return;
      }
    };

    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      let idx: number;
      // stream-json emite um objeto JSON por linha (NDJSON)
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try { handleEvent(JSON.parse(line)); } catch { /* linha nao-JSON: ignora */ }
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
      resolve({ transcript, resultText, code: code ?? -1, stderr, cancelled });
    });
  });
}
