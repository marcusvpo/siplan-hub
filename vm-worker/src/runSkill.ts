import { spawn } from "node:child_process";
import { config } from "./config.js";

/**
 * Roda o Claude Code em modo headless (-p) com a skill, de forma autonoma
 * (--dangerously-skip-permissions), dentro do projeto Orion.Modelos.
 * stdin ignorado (equivale a < /dev/null). Retorna o stdout (a saida final
 * do agente, que deve conter a linha JSON_GERADO=<caminho>).
 */
export function runSkill(prompt: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      config.claudeBin,
      ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
      {
        cwd: config.orionProjectDir,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timeout: a geracao excedeu ${config.jobTimeoutMs} ms`));
    }, config.jobTimeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? -1 });
    });
  });
}
