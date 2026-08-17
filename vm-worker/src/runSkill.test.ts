import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY ||= "test-secret";

const { buildCodexChildEnv, parseCodexEvent, runSkill } = await import("./runSkill.js");
const { ensureCodexModelSkill } = await import("./codexModelSkill.js");

test("parseia progresso, mensagem final e uso do Codex JSONL", () => {
  assert.equal(
    parseCodexEvent({ type: "thread.started", thread_id: "abc" }).progressKind,
    "system"
  );

  const command = parseCodexEvent({
    type: "item.started",
    item: { type: "command_execution", command: "python3 tools/validar_rtf.py modelo.rtf" },
  });
  assert.match(command.progress || "", /validar_rtf/);
  assert.equal(command.progressKind, "tool");

  const message = parseCodexEvent({
    type: "item.completed",
    item: { type: "agent_message", text: "JSON_GERADO=/tmp/modelo.json" },
  });
  assert.equal(message.resultText, "JSON_GERADO=/tmp/modelo.json");
  assert.match(message.transcriptText || "", /JSON_GERADO/);

  const completed = parseCodexEvent({
    type: "turn.completed",
    usage: { input_tokens: 120, cached_input_tokens: 80, output_tokens: 30 },
  });
  assert.deepEqual(completed.usage, {
    inputTokens: 120,
    outputTokens: 30,
    cacheReadTokens: 80,
  });
});

test("remove segredos operacionais do ambiente do Codex", () => {
  const env = buildCodexChildEnv({
    PATH: "/usr/bin",
    SUPABASE_SECRET_KEY: "supabase-secret",
    MSSQL_PASSWORD: "sql-secret",
    ANTHROPIC_API_KEY: "anthropic-secret",
    CODEX_API_KEY: "codex-auth",
  });
  assert.equal(env.PATH, "/usr/bin");
  assert.equal(env.CODEX_API_KEY, "codex-auth");
  assert.equal(env.SUPABASE_SECRET_KEY, undefined);
  assert.equal(env.MSSQL_PASSWORD, undefined);
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
});

test("instala skill Codex headless ao lado da skill original", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "siplan-codex-skill-"));
  try {
    const originalDir = path.join(
      tempRoot,
      ".claude",
      "skills",
      "criar-modelo-mesclado"
    );
    await mkdir(originalDir, { recursive: true });
    await writeFile(path.join(originalDir, "SKILL.md"), "# Skill original\n", "utf-8");

    const installed = await ensureCodexModelSkill(tempRoot);
    const content = await readFile(installed, "utf-8");
    assert.match(content, /name: criar-modelo-mesclado/);
    assert.match(content, /Nunca pedir entrada, confirmacao ou aprovacao/);

    assert.equal(await ensureCodexModelSkill(tempRoot), installed);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test(
  "executa smoke test real do Codex CLI",
  { skip: process.env.CODEX_SMOKE !== "1" },
  async () => {
    const result = await runSkill(
      "Responda exatamente CODEX_SMOKE_OK e nao execute ferramentas.",
      undefined,
      undefined,
      {
        provider: "codex",
        cwd: process.cwd(),
        allowOllamaFallback: false,
      }
    );
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.resultText, /CODEX_SMOKE_OK/);
    assert.ok(result.inputTokens > 0);
  }
);
